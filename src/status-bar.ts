/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Status bar item showing MAIP connection status and trust score.
 * Left-aligned. Click opens the trust dashboard webview.
 */

import * as vscode from "vscode";
import type { MAIPClient } from "./client";
import { isConfigured, getAgentId } from "./config";

const POLL_INTERVAL_MS = 60_000;

export class MAIPStatusBar implements vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];
  private pollTimer: ReturnType<typeof setInterval> | undefined;
  private _lastTrustScore: number | undefined;

  get lastTrustScore(): number | undefined {
    return this._lastTrustScore;
  }

  constructor(private readonly client: MAIPClient) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.statusBarItem.command = "maip.showTrustScore";

    this.disposables.push(this.statusBarItem);

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (
          event.affectsConfiguration("maip.apiKey") ||
          event.affectsConfiguration("maip.tenantId") ||
          event.affectsConfiguration("maip.agentId")
        ) {
          this.updateStatus();
        }
      }),
    );

    this.updateStatus();
    this.startPolling();
    this.statusBarItem.show();
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      this.updateStatus();
    }, POLL_INTERVAL_MS);
  }

  private updateStatus(): void {
    if (!isConfigured()) {
      this.statusBarItem.text = "$(shield) MAIP: Not Configured";
      this.statusBarItem.tooltip = "Click to configure MAIP settings";
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.command = {
        command: "workbench.action.openSettings",
        title: "Open MAIP Settings",
        arguments: ["maip"],
      };
      return;
    }

    const agentId = getAgentId();
    if (!agentId) {
      this.statusBarItem.text = "$(shield) MAIP: No Agent";
      this.statusBarItem.tooltip = "No agent configured. Register one or set an agent ID.";
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.command = "maip.registerAgent";
      return;
    }

    this.statusBarItem.command = "maip.showTrustScore";

    this.fetchTrustScore(agentId).catch(() => {
      this.statusBarItem.text = "$(shield) MAIP: Disconnected";
      this.statusBarItem.tooltip = "Unable to connect to MAIP API";
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
    });
  }

  private async fetchTrustScore(agentId: string): Promise<void> {
    try {
      const trustScore = await this.client.getTrustScore(agentId);
      this._lastTrustScore = trustScore.trust_score;

      const score = trustScore.trust_score;
      const scoreDisplay = (score * 100).toFixed(0);

      let icon: string;
      if (score >= 0.8) {
        icon = "$(verified-filled)";
        this.statusBarItem.backgroundColor = undefined;
      } else if (score >= 0.5) {
        icon = "$(unverified)";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground",
        );
      } else {
        icon = "$(circle-slash)";
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground",
        );
      }

      this.statusBarItem.text = `${icon} MAIP: ${scoreDisplay}`;
      this.statusBarItem.tooltip = new vscode.MarkdownString(
        `**MAIP Connected**\n\n` +
          `- Agent: \`${agentId.substring(0, 8)}...\`\n` +
          `- Trust Score: ${score.toFixed(4)}\n` +
          `- Level: ${trustScore.trust_level}\n` +
          `- Computed: ${trustScore.computed_at}\n\n` +
          `Click to open Trust Dashboard`,
      );
    } catch {
      this.statusBarItem.text = "$(shield) MAIP: Disconnected";
      this.statusBarItem.tooltip = "Unable to connect to MAIP API. Check your settings.";
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
    }
  }

  dispose(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
