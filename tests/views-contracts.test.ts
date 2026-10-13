import { describe, it, expect, vi } from "vitest";
vi.mock("../src/config", () => ({ isConfigured: () => true, getAgentId: () => "maip:12345678:01m4nx75rxvg56e890anryj6wn" }));
vi.mock("vscode", () => ({
  window: {
    createWebviewPanel: vi.fn(() => ({ webview: { html: "" }, onDidDispose: vi.fn(), reveal: vi.fn(), dispose: vi.fn() })),
    withProgress: vi.fn((_options, task) => task()), showErrorMessage: vi.fn(),
  },
  MarkdownString: class { constructor(public value: string) {} },
  Hover: class { constructor(public contents: unknown, public range: unknown) {} },
  EventEmitter: class { event = vi.fn(); fire = vi.fn(); },
  TreeItem: class { constructor(public label: string) {} },
  ThemeIcon: class {}, ThemeColor: class {},
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
  ViewColumn: { One: 1 }, ProgressLocation: { Notification: 1 },
}));
import * as vscode from "vscode";
import { TrustDashboardPanel } from "../src/views/trust-dashboard";
import { DelegationTreePanel } from "../src/views/delegation-tree";
import { MAIPHoverProvider } from "../src/providers/hover-provider";
import { AgentTreeProvider } from "../src/providers/agent-tree";
import type { MAIPClient } from "../src/client";

const id = "maip:12345678:01m4nx75rxvg56e890anryj6wn";
const trust = { agent_id: id, trust_level: "authenticated", trust_score: 0.7, factors: null };

describe("views using deployed response shapes", () => {
  it("renders trust without obsolete components, ceilings or timestamps", () => {
    TrustDashboardPanel.createOrShow({} as vscode.Uri, trust, []);
    const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results.at(-1)!.value;
    expect(panel.webview.html).toContain("No score factors");
    expect(panel.webview.html).toContain("Not provided");
    expect(panel.webview.html).not.toContain("undefined");
    TrustDashboardPanel.createOrShow({} as vscode.Uri, { ...trust, factors: { "<img src=x>": 0.6 } }, [{ trust_score: 0.7, computed_at: "2026-10-13T00:00:00Z", event_type: "rotation", event_detail: "<script>" }]);
    expect(panel.webview.html).toContain("&lt;img src=x&gt;");
    expect(panel.webview.html).not.toContain("<script>");
  });

  it("uses canonical IDs and escapes attacker-controlled hover links", async () => {
    const client = { getAgent: vi.fn().mockResolvedValue({ agent_id: id, display_name: "[click](command:evil.run)", scopes: ["read"], status: "active" }), getTrustScore: vi.fn().mockResolvedValue(trust) };
    const provider = new MAIPHoverProvider(client as unknown as MAIPClient);
    const document = { getWordRangeAtPosition: (_position: unknown, regex: RegExp) => regex.test(id) ? {} : undefined, getText: () => id };
    const hover = await provider.provideHover(document as unknown as vscode.TextDocument, {} as vscode.Position, {} as vscode.CancellationToken);
    const markdown = (hover as unknown as { contents: vscode.MarkdownString }).contents;
    expect(client.getAgent).toHaveBeenCalledWith(id);
    expect(markdown.isTrusted).toEqual({ enabledCommands: ["maip.showTrustScore"] });
    expect(markdown.value).toContain("\\[click\\]\\(command:evil\\.run\\)");
    expect(markdown.value).not.toContain("undefined");
    provider.clearCache();
    await provider.provideHover(document as unknown as vscode.TextDocument, {} as vscode.Position, {} as vscode.CancellationToken);
    expect(client.getAgent).toHaveBeenCalledTimes(2);
  });

  it("does not turn a trust request failure into a zero score", async () => {
    const client = { listAgents: vi.fn().mockResolvedValue({ data: [{ agent_id: id, display_name: "Fixture", status: "active", scopes: ["read"] }] }), getTrustScore: vi.fn().mockRejectedValue(new Error("unavailable")) };
    const tree = new AgentTreeProvider(client as unknown as MAIPClient);
    const groups = await tree.getChildren();
    const rows = await tree.getChildren(groups[0]);
    expect(tree.getTreeItem(rows[0]).description).toContain("Unavailable");
  });

  it("selects the configured agent and tolerates cyclic delegation input", async () => {
    const client = { listDelegations: vi.fn().mockResolvedValue({ data: [
      { id: "1", parent_agent_id: id, child_agent_id: "child", scopes: [], status: "active", depth: 1 },
      { id: "2", parent_agent_id: "child", child_agent_id: id, scopes: [], status: "active", depth: 2 },
    ] }) };
    await DelegationTreePanel.createOrShow({} as vscode.Uri, client as unknown as MAIPClient);
    expect(client.listDelegations).toHaveBeenCalledWith({ parent_agent_id: id });
    const panel = vi.mocked(vscode.window.createWebviewPanel).mock.results.at(-1)!.value;
    expect(panel.webview.html).toContain("direct relationships only");
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
  });
});
