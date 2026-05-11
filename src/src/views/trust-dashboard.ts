/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * WebviewPanel for the trust dashboard.
 * Shows trust score gauge, history chart (SVG), and recent activity.
 */

import * as vscode from "vscode";
import * as crypto from "crypto";
import type { TrustScore, TrustHistoryEntry } from "../types";

export class TrustDashboardPanel {
  private static currentPanel: TrustDashboardPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    _extensionUri: vscode.Uri,
    trustScore: TrustScore,
    history: readonly TrustHistoryEntry[],
  ) {
    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.html = this.getHtml(trustScore, history);
  }

  static createOrShow(
    extensionUri: vscode.Uri,
    trustScore: TrustScore,
    history: readonly TrustHistoryEntry[],
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (TrustDashboardPanel.currentPanel) {
      TrustDashboardPanel.currentPanel.panel.reveal(column);
      TrustDashboardPanel.currentPanel.panel.webview.html =
        TrustDashboardPanel.currentPanel.getHtml(trustScore, history);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "maip.trustDashboard",
      `Trust: ${trustScore.agent_id.substring(0, 8)}`,
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: false,
        retainContextWhenHidden: true,
      },
    );

    TrustDashboardPanel.currentPanel = new TrustDashboardPanel(
      panel,
      extensionUri,
      trustScore,
      history,
    );
  }

  private dispose(): void {
    TrustDashboardPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }

  private getHtml(
    trustScore: TrustScore,
    history: readonly TrustHistoryEntry[],
  ): string {
    const nonce = crypto.randomBytes(16).toString("hex");
    const score = trustScore.trust_score;
    const scoreColor =
      score >= 0.8 ? "#4ec94e" : score >= 0.5 ? "#e6b422" : "#c94e4e";

    const gaugeSvg = renderGaugeSvg(score, scoreColor);
    const historyChartSvg = renderHistoryChart(history);
    const componentsHtml = renderComponents(trustScore);
    const historyTableHtml = renderHistoryTable(history);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}'; img-src data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trust Dashboard</title>
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
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 16px;
    }
    .card-title {
      font-weight: 600;
      margin-bottom: 12px;
      font-size: 0.95em;
      color: var(--vscode-descriptionForeground);
    }
    .gauge-container { display: flex; justify-content: center; align-items: center; }
    svg text { font-family: var(--vscode-font-family); }
    .component-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 6px 16px;
    }
    .component-label { font-size: 0.9em; }
    .component-value { font-family: var(--vscode-editor-font-family); font-size: 0.9em; text-align: right; }
    .component-bar {
      grid-column: 1 / -1;
      height: 4px;
      background: var(--vscode-panel-border);
      border-radius: 2px;
      margin-bottom: 8px;
    }
    .component-bar-fill { height: 100%; border-radius: 2px; }
    .chart-container { width: 100%; }
    .chart-container svg { width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-panel-border);
      font-size: 0.9em;
    }
    th { font-weight: 600; color: var(--vscode-descriptionForeground); }
    .mono { font-family: var(--vscode-editor-font-family); font-size: 0.85em; }
    .meta-grid {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 4px 12px;
      font-size: 0.9em;
    }
    .meta-label { font-weight: 600; color: var(--vscode-descriptionForeground); }
    .meta-value { font-family: var(--vscode-editor-font-family); }
  </style>
</head>
<body>
  <h1>Trust Dashboard</h1>
  <div class="subtitle">Agent: ${escapeHtml(trustScore.agent_id)}</div>

  <div class="dashboard-grid">
    <div class="card">
      <div class="card-title">Trust Score</div>
      <div class="gauge-container">${gaugeSvg}</div>
    </div>
    <div class="card">
      <div class="card-title">Score Components</div>
      ${componentsHtml}
    </div>
  </div>

  <div class="card" style="margin-bottom: 24px;">
    <div class="card-title">Trust History (last ${history.length} entries)</div>
    <div class="chart-container">${historyChartSvg}</div>
  </div>

  <h2>Agent Metadata</h2>
  <div class="meta-grid">
    <span class="meta-label">Agent ID</span>
    <span class="meta-value">${escapeHtml(trustScore.agent_id)}</span>
    <span class="meta-label">Trust Level</span>
    <span class="meta-value">${escapeHtml(trustScore.trust_level)}</span>
    <span class="meta-label">Trust Ceiling</span>
    <span class="meta-value">${trustScore.trust_ceiling.toFixed(4)}</span>
    <span class="meta-label">Delegation Depth</span>
    <span class="meta-value">${trustScore.delegation_depth}</span>
    <span class="meta-label">Computed At</span>
    <span class="meta-value">${escapeHtml(trustScore.computed_at)}</span>
    <span class="meta-label">Valid Until</span>
    <span class="meta-value">${escapeHtml(trustScore.valid_until)}</span>
  </div>

  <h2>Recent History</h2>
  ${historyTableHtml}
</body>
</html>`;
  }
}

function renderGaugeSvg(score: number, color: string): string {
  const angle = score * 180;
  const radians = (angle * Math.PI) / 180;
  const endX = 100 + 70 * Math.cos(Math.PI - radians);
  const endY = 100 - 70 * Math.sin(Math.PI - radians);
  const largeArc = angle > 180 ? 1 : 0;

  return `<svg width="200" height="120" viewBox="0 0 200 120">
    <path d="M 30 100 A 70 70 0 0 1 170 100" fill="none" stroke="#333" stroke-width="12" stroke-linecap="round"/>
    <path d="M 30 100 A 70 70 0 ${largeArc} 1 ${endX.toFixed(1)} ${endY.toFixed(1)}"
      fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"/>
    <text x="100" y="95" text-anchor="middle" fill="${color}" font-size="28" font-weight="bold">
      ${(score * 100).toFixed(1)}
    </text>
    <text x="100" y="115" text-anchor="middle" fill="var(--vscode-descriptionForeground)" font-size="11">
      / 100
    </text>
  </svg>`;
}

function renderHistoryChart(history: readonly TrustHistoryEntry[]): string {
  if (history.length === 0) {
    return `<svg width="400" height="100" viewBox="0 0 400 100">
      <text x="200" y="55" text-anchor="middle" fill="var(--vscode-descriptionForeground)" font-size="12">
        No history data available
      </text>
    </svg>`;
  }

  const width = 400;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 25, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const sorted = [...history].sort(
    (a, b) =>
      new Date(a.computed_at).getTime() - new Date(b.computed_at).getTime(),
  );

  const points = sorted.map((entry, i) => {
    const x = padding.left + (i / Math.max(sorted.length - 1, 1)) * chartW;
    const y = padding.top + (1 - entry.trust_score) * chartH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyline = points.join(" ");

  const gridLines: string[] = [];
  for (let val = 0; val <= 1; val += 0.25) {
    const y = padding.top + (1 - val) * chartH;
    gridLines.push(
      `<line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width - padding.right}" y2="${y.toFixed(1)}" stroke="var(--vscode-panel-border)" stroke-width="0.5"/>`,
      `<text x="${padding.left - 5}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="var(--vscode-descriptionForeground)" font-size="9">${(val * 100).toFixed(0)}</text>`,
    );
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${gridLines.join("\n    ")}
    <polyline points="${polyline}" fill="none" stroke="#4ec94e" stroke-width="2"/>
    ${sorted
      .map((entry, i) => {
        const x = padding.left + (i / Math.max(sorted.length - 1, 1)) * chartW;
        const y = padding.top + (1 - entry.trust_score) * chartH;
        const color =
          entry.trust_score >= 0.8
            ? "#4ec94e"
            : entry.trust_score >= 0.5
              ? "#e6b422"
              : "#c94e4e";
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}"/>`;
      })
      .join("\n    ")}
  </svg>`;
}

function renderComponents(trustScore: TrustScore): string {
  const components = [
    { label: "Reputation", value: trustScore.score_components.reputation },
    { label: "Key Health", value: trustScore.score_components.key_health },
    {
      label: "Delegation Depth",
      value: trustScore.score_components.delegation_depth,
    },
    {
      label: "Verification History",
      value: trustScore.score_components.verification_history,
    },
    {
      label: "Multi-Witness",
      value: trustScore.score_components.multi_witness,
    },
    {
      label: "Anomaly Penalty",
      value: trustScore.score_components.anomaly_penalty,
    },
  ];

  return components
    .map((c) => {
      const pct = Math.max(0, Math.min(1, c.value)) * 100;
      const color =
        c.label === "Anomaly Penalty"
          ? c.value > 0
            ? "#c94e4e"
            : "#4ec94e"
          : c.value >= 0.7
            ? "#4ec94e"
            : c.value >= 0.4
              ? "#e6b422"
              : "#c94e4e";

      return `<div class="component-grid">
        <span class="component-label">${escapeHtml(c.label)}</span>
        <span class="component-value">${c.value.toFixed(3)}</span>
        <div class="component-bar"><div class="component-bar-fill" style="width:${pct}%;background:${color};"></div></div>
      </div>`;
    })
    .join("");
}

function renderHistoryTable(history: readonly TrustHistoryEntry[]): string {
  if (history.length === 0) {
    return `<p style="color: var(--vscode-descriptionForeground);">No history entries.</p>`;
  }

  const rows = [...history]
    .sort(
      (a, b) =>
        new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime(),
    )
    .slice(0, 20)
    .map(
      (entry) => `<tr>
      <td class="mono">${formatDate(entry.computed_at)}</td>
      <td>${entry.trust_score.toFixed(4)}</td>
      <td>${escapeHtml(entry.event_type)}</td>
      <td>${escapeHtml(entry.event_detail)}</td>
    </tr>`,
    )
    .join("");

  return `<table>
    <thead><tr><th>Time</th><th>Score</th><th>Event</th><th>Detail</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
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
