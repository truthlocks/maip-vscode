import { afterEach, describe, expect, it, vi } from "vitest";
import { MAIPClient } from "../src/client";

const agentID = "maip:12345678:01m4nx75rxvg56e890anryj6wn";
const client = () => new MAIPClient({ apiUrl: "https://example.test/v1", apiKey: "fixture", tenantId: "", maxRetries: 0 });
const reply = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
afterEach(() => vi.unstubAllGlobals());

describe("deployed API response contracts", () => {
  it("maps the trust history envelope and server field names", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ history: [{ score: 0.75, created_at: "2026-10-13T00:00:00Z", trigger_type: "rotation", triggered_by: "reviewer" }], total: 1 })));
    expect(await client().getTrustHistory(agentID)).toEqual([{ trust_score: 0.75, computed_at: "2026-10-13T00:00:00Z", event_type: "rotation", event_detail: "reviewer" }]);
  });

  it("handles empty history and null agent receipt collections", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(reply({ history: null })).mockResolvedValueOnce(reply(null)));
    expect(await client().getTrustHistory(agentID)).toEqual([]);
    expect((await client().listReceipts({ agent_id: agentID })).data).toEqual([]);
  });

  it("requires an agent for delegations and applies supported local filtering", async () => {
    const fetch = vi.fn().mockResolvedValue(reply([{ id: "1", status: "active" }, { id: "2", status: "revoked" }]));
    vi.stubGlobal("fetch", fetch);
    await expect(client().listDelegations()).rejects.toThrow("agent ID");
    expect(fetch).not.toHaveBeenCalled();
    const result = await client().listDelegations({ parent_agent_id: agentID, status: "active", limit: 10 });
    expect(result.data).toEqual([{ id: "1", status: "active" }]);
    expect(fetch.mock.calls[0][0]).toBe(`https://example.test/v1/agents/${encodeURIComponent(agentID)}/delegations`);
  });

  it("never presents a delegation tree read as cryptographic verification", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(client().verifyDelegationChain(agentID)).rejects.toThrow("not available");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("exports actual agent evidence with explicit coverage and no compliance mutation", async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("trust-score")) return reply({ agent_id: agentID, trust_score: 0.6, factors: null });
      if (url.includes("delegations")) return reply([]);
      if (url.includes("agent-receipts")) return reply([{ receipt_id: "receipt-1" }]);
      return reply({ agent_id: agentID, scopes: ["test"] });
    });
    vi.stubGlobal("fetch", fetch);
    const result = await client().exportAuditReport(agentID);
    expect(result.receipts).toHaveLength(1);
    expect(result.receipt_limit).toBe(100);
    expect(result.limitations.join(" ")).toContain("not a SOC 2 audit report");
    expect(fetch).toHaveBeenCalledTimes(4);
    for (const [, options] of fetch.mock.calls as unknown as [string, RequestInit][]) expect(options.method).toBe("GET");
  });

  it("does not invent a registration trust score", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ agent_id: agentID })));
    expect((await client().registerAgent({ name: "fixture", type: "tool" })).trust_score).toBeUndefined();
  });
});
