/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Tests for the MAIP API client.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock vscode for config.ts dependency chain (not directly used in client)
vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(() => ""),
    })),
  },
}));

import { MAIPClient, MAIPApiError, MAIPNetworkError } from "../src/client";
import type { MAIPConfig } from "../src/types";

function createConfig(overrides?: Partial<MAIPConfig>): MAIPConfig {
  return {
    apiUrl: "https://api.test.com/v1/machine-identity",
    apiKey: "test-key",
    tenantId: "test-tenant",
    timeoutMs: 5_000,
    maxRetries: 2,
    ...overrides,
  };
}

function makeResponse(
  status: number,
  body: unknown,
  headers?: Record<string, string>,
): Response {
  const headersObj = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headersObj,
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
  } as Response;
}

describe("MAIPClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("request execution", () => {
    it("should make GET requests with correct headers", async () => {
      const config = createConfig();
      const client = new MAIPClient(config);

      fetchMock.mockResolvedValueOnce(makeResponse(200, { data: [], total: 0, limit: 10, offset: 0 }));

      await client.listAgents();

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.test.com/v1/machine-identity/agents",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "X-API-Key": "test-key",
            "X-Tenant-ID": "test-tenant",
            "Content-Type": "application/json",
            Accept: "application/json",
          }),
        }),
      );
    });

    it("should make POST requests with body", async () => {
      const config = createConfig();
      const client = new MAIPClient(config);

      const responseAgent = {
        agent: {
          id: "1",
          agent_id: "agent-1",
          display_name: "Test Agent",
          status: "active",
        },
        trust_score: 0.95,
      };

      fetchMock.mockResolvedValueOnce(makeResponse(200, responseAgent));

      const result = await client.registerAgent({
        name: "Test Agent",
        type: "service",
        capabilities: ["read"],
      });

      expect(result.agent.display_name).toBe("Test Agent");
      expect(result.trust_score).toBe(0.95);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.test.com/v1/machine-identity/agents",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Test Agent",
            type: "service",
            capabilities: ["read"],
          }),
        }),
      );
    });

    it("should append query parameters", async () => {
      const config = createConfig();
      const client = new MAIPClient(config);

      fetchMock.mockResolvedValueOnce(makeResponse(200, { data: [], total: 0, limit: 10, offset: 0 }));

      await client.listAgents({ status: "active", limit: 50 });

      const calledUrl = fetchMock.mock.calls[0]![0] as string;
      expect(calledUrl).toContain("status=active");
      expect(calledUrl).toContain("limit=50");
    });
  });

  describe("error handling", () => {
    it("should throw MAIPApiError for non-retryable errors", async () => {
      const config = createConfig();
      const client = new MAIPClient(config);

      fetchMock.mockResolvedValue(makeResponse(400, {
        code: "BAD_REQUEST",
        message: "Invalid input",
      }));

      await expect(client.listAgents()).rejects.toThrow(MAIPApiError);
    });

    it("should throw MAIPApiError with correct fields", async () => {
      const config = createConfig();
      const client = new MAIPClient(config);

      fetchMock.mockResolvedValue(makeResponse(404, {
        code: "NOT_FOUND",
        message: "Agent not found",
        details: { agent_id: "missing" },
      }));

      try {
        await client.getAgent("missing");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(MAIPApiError);
        const apiError = error as MAIPApiError;
        expect(apiError.statusCode).toBe(404);
        expect(apiError.errorCode).toBe("NOT_FOUND");
        expect(apiError.message).toBe("Agent not found");
        expect(apiError.details).toEqual({ agent_id: "missing" });
      }
    });
  });

  describe("retry behavior", () => {
    it("should retry on 429 status", async () => {
      const config = createConfig({ maxRetries: 1 });
      const client = new MAIPClient(config);

      fetchMock
        .mockResolvedValueOnce(makeResponse(429, { code: "RATE_LIMITED", message: "Too many requests" }))
        .mockResolvedValueOnce(makeResponse(200, { data: [], total: 0, limit: 10, offset: 0 }));

      const result = await client.listAgents();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.total).toBe(0);
    });

    it("should retry on 503 status", async () => {
      const config = createConfig({ maxRetries: 1 });
      const client = new MAIPClient(config);

      fetchMock
        .mockResolvedValueOnce(makeResponse(503, { code: "UNAVAILABLE", message: "Service unavailable" }))
        .mockResolvedValueOnce(makeResponse(200, { agent_id: "a1", trust_score: 0.9 }));

      const result = await client.getTrustScore("a1");

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.trust_score).toBe(0.9);
    });

    it("should exhaust retries and throw on persistent 502", async () => {
      const config = createConfig({ maxRetries: 1 });
      const client = new MAIPClient(config);

      fetchMock.mockResolvedValue(makeResponse(502, { code: "BAD_GATEWAY", message: "Bad gateway" }));

      await expect(client.listAgents()).rejects.toThrow(MAIPApiError);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("should respect Retry-After header", async () => {
      const config = createConfig({ maxRetries: 1 });
      const client = new MAIPClient(config);

      fetchMock
        .mockResolvedValueOnce(makeResponse(429, { code: "RATE_LIMITED", message: "Wait" }, { "Retry-After": "1" }))
        .mockResolvedValueOnce(makeResponse(200, { data: [], total: 0, limit: 10, offset: 0 }));

      const start = Date.now();
      await client.listAgents();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(900);
    });
  });

  describe("specific API methods", () => {
    it("should call correct endpoint for verifyReceipt", async () => {
      const config = createConfig();
      const client = new MAIPClient(config);

      fetchMock.mockResolvedValueOnce(makeResponse(200, {
        valid: true,
        verdict: "OK",
        details: "All checks passed",
        warnings: [],
      }));

      const result = await client.verifyReceipt("receipt-123");

      expect(result.valid).toBe(true);
      expect(result.verdict).toBe("OK");

      const calledUrl = fetchMock.mock.calls[0]![0] as string;
      expect(calledUrl).toContain("/receipts/receipt-123/verify");
    });

    it("should call correct endpoint for getTrustHistory", async () => {
      const config = createConfig();
      const client = new MAIPClient(config);

      fetchMock.mockResolvedValueOnce(makeResponse(200, [{ trust_score: 0.9, computed_at: "2026-01-01" }]));

      const result = await client.getTrustHistory("agent-1", 10);

      expect(result).toHaveLength(1);

      const calledUrl = fetchMock.mock.calls[0]![0] as string;
      expect(calledUrl).toContain("/trust/agent-1/history");
      expect(calledUrl).toContain("limit=10");
    });

    it("should call correct endpoint for exportAuditReport", async () => {
      const config = createConfig();
      const client = new MAIPClient(config);

      fetchMock.mockResolvedValueOnce(makeResponse(200, {
        report_id: "rpt-1",
        total_agents: 5,
        total_receipts: 100,
        anomalies: [],
      }));

      const result = await client.exportAuditReport({
        from: "2026-01-01T00:00:00Z",
        to: "2026-12-31T23:59:59Z",
        include_anomalies: true,
      });

      expect(result.report_id).toBe("rpt-1");

      const calledUrl = fetchMock.mock.calls[0]![0] as string;
      expect(calledUrl).toContain("/audit/report");
    });
  });
});
