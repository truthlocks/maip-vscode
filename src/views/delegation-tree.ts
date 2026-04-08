/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * WebviewPanel for delegation chain visualization.
 * Renders a tree diagram of the delegation hierarchy using SVG.
 */

import * as vscode from "vscode";
import * as crypto from "crypto";
import type { MAIPClient } from "../client";
import type { Delegation } from "../types";
import { isConfigured, getAgentId } from "../config";

interface DelegationNode {
  readonly agentId: string;
  readonly displayName: string;
  readonly depth: number;
  readonly children: DelegationNode[];
}

export class DelegationTreePanel {
  private static currentPanel: DelegationTreePanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    delegations: readonly Delegation[],
    rootAgentId: string,
  ) {
    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.html = this.getHtml(delegations, rootAgentId);
  }

  static async createOrShow(
    _extensionUri: vscode.Uri,
    client: MAIPClient,
  ): Promise<void> {
    if (!isConfigured()) {
      vscode.window.showErrorMessage("MAIP is not configured.");
      return;
    }

    const agentId = getAgentId();
    if (!agentId) {
      vscode.window.showErrorMessage("No agent ID configured for this workspace.");
      return;
    }

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    try {
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "MAIP: Loading delegation tree...",
          cancellable: false,
        },
        async () => client.listDelegations({ limit: 200 }),
      );

      if (DelegationTreePanel.currentPanel) {
        DelegationTreePanel.currentPanel.panel.reveal(column);
        DelegationTreePanel.currentPanel.panel.webview.html =
          DelegationTreePanel.currentPanel.getHtml(result.data, agentId);
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        "maip.delegationTree",
        "MAIP Delegation Tree",
        column ?? vscode.ViewColumn.One,
        {
          enableScripts: false,
          retainContextWhenHidden: true,
        },
      );

      DelegationTreePanel.currentPanel = new DelegationTreePanel(panel, result.data, agentId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`MAIP: Failed to load delegations: ${message}`);
    }
  }

  private dispose(): void {
    DelegationTreePanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }

  private getHtml(delegations: readonly Delegation[], rootAgentId: string): string {
    const nonce = crypto.randomBytes(16).toString("hex");
    const tree = buildTree(delegations, rootAgentId);
    const treeSvg = renderTreeSvg(tree);
    const tableHtml = renderDelegationTable(delegations);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}'; img-src data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delegation Tree</title>
  <style nonce="${nonce}">
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px;
      margin: 0;
      line-height: 1.5;
    }
    h1 { font-size: 1.4em; margin-bottom: 4px; }
    h2 {
      font-size: 1.1em;
      margin-top: 24px;
      margin-bottom: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 4px;
    }
    .subtitle { color: var(--vscode-descriptionForeground); margin-bottom: 20px; font-size: 0.9em; }
    .tree-container {
      overflow-x: auto;
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 24px;
    }
    svg text { font-family: var(--vscode-font-family); }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-panel-border);
      font-size: 0.9em;
    }
    th { font-weight: 600; color: var(--vscode-descriptionForeground); }
    .mono { font-family: var(--vscode-editor-font-family); font-size: 0.85em; }
    .status { font-weight: 500; }
    .status-active { color: var(--vscode-testing-iconPassed); }
    .status-expired { color: var(--vscode-editorWarning-foreground); }
    .status-revoked { color: var(--vscode-testing-iconFailed); }
    .empty { text-align: center; padding: 40px; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h1>Delegation Tree</h1>
  <div class="subtitle">Root agent: ${escapeHtml(rootAgentId)}</div>

  <div class="tree-container">${treeSvg}</div>

  <h2>All Delegations (${delegations.length})</h2>
  ${tableHtml}
</body>
</html>`;
  }
}

function buildTree(delegations: readonly Delegation[], rootAgentId: string): DelegationNode {
  const childMap = new Map<string, Delegation[]>();

  for (const d of delegations) {
    const existing = childMap.get(d.parent_agent_id);
    if (existing) {
      existing.push(d);
    } else {
      childMap.set(d.parent_agent_id, [d]);
    }
  }

  function buildNode(agentId: string, depth: number): DelegationNode {
    const children = (childMap.get(agentId) ?? []).map((d) =>
      buildNode(d.child_agent_id, depth + 1),
    );
    return {
      agentId,
      displayName: agentId.substring(0, 8),
      depth,
      children,
    };
  }

  return buildNode(rootAgentId, 0);
}

function renderTreeSvg(root: DelegationNode): string {
  const nodeWidth = 120;
  const nodeHeight = 36;
  const horizontalSpacing = 40;
  const verticalSpacing = 60;

  interface PositionedNode {
    node: DelegationNode;
    x: number;
    y: number;
    children: PositionedNode[];
  }

  let nextX = 0;

  function layout(node: DelegationNode, depth: number): PositionedNode {
    const children = node.children.map((child) => layout(child, depth + 1));

    let x: number;
    if (children.length === 0) {
      x = nextX;
      nextX += nodeWidth + horizontalSpacing;
    } else {
      const firstChild = children[0]!;
      const lastChild = children[children.length - 1]!;
      x = (firstChild.x + lastChild.x) / 2;
    }

    return { node, x, y: depth * (nodeHeight + verticalSpacing), children };
  }

  const positioned = layout(root, 0);

  const svgElements: string[] = [];

  function renderNode(pNode: PositionedNode): void {
    const cx = pNode.x + nodeWidth / 2;
    const cy = pNode.y + nodeHeight / 2;

    for (const child of pNode.children) {
      const childCx = child.x + nodeWidth / 2;
      const childCy = child.y;
      svgElements.push(
        `<line x1="${cx}" y1="${pNode.y + nodeHeight}" x2="${childCx}" y2="${childCy}" stroke="var(--vscode-panel-border)" stroke-width="1.5"/>`,
      );
    }

    const isRoot = pNode.node.depth === 0;
    const fill = isRoot ? "#2d5a27" : "var(--vscode-textCodeBlock-background)";
    const strokeColor = isRoot ? "#4ec94e" : "var(--vscode-panel-border)";

    svgElements.push(
      `<rect x="${pNode.x}" y="${pNode.y}" width="${nodeWidth}" height="${nodeHeight}" rx="4" fill="${fill}" stroke="${strokeColor}" stroke-width="1.5"/>`,
      `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="var(--vscode-foreground)" font-size="11">${escapeHtml(pNode.node.displayName)}...</text>`,
    );

    for (const child of pNode.children) {
      renderNode(child);
    }
  }

  renderNode(positioned);

  const totalWidth = Math.max(nextX, nodeWidth + 40);
  const maxDepth = getMaxDepth(root);
  const totalHeight = (maxDepth + 1) * (nodeHeight + verticalSpacing);

  return `<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
    ${svgElements.join("\n    ")}
  </svg>`;
}

function getMaxDepth(node: DelegationNode): number {
  if (node.children.length === 0) {
    return node.depth;
  }
  return Math.max(...node.children.map(getMaxDepth));
}

function renderDelegationTable(delegations: readonly Delegation[]): string {
  if (delegations.length === 0) {
    return '<div class="empty">No delegations found.</div>';
  }

  const rows = delegations
    .map(
      (d) => `<tr>
      <td class="mono">${escapeHtml(d.id.substring(0, 8))}...</td>
      <td class="mono">${escapeHtml(d.parent_agent_id.substring(0, 8))}...</td>
      <td class="mono">${escapeHtml(d.child_agent_id.substring(0, 8))}...</td>
      <td>${d.depth}</td>
      <td>${escapeHtml(d.scopes.join(", "))}</td>
      <td><span class="status status-${d.status}">${escapeHtml(d.status)}</span></td>
      <td class="mono">${formatDate(d.created_at)}</td>
    </tr>`,
    )
    .join("");

  return `<table>
    <thead><tr>
      <th>ID</th><th>Parent</th><th>Child</th><th>Depth</th><th>Scopes</th><th>Status</th><th>Created</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
