/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.showTrustScore
 * Shows the trust score for an agent in the trust dashboard webview.
 */

import * as vscode from "vscode";
import type { MAIPClient } from "../client";
import { isConfigured, getAgentId } from "../config";
import { TrustDashboardPanel } from "../views/trust-dashboard";

export function registerShowTrustCommand(
  client: MAIPClient,
  extensionUri: vscode.Uri,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "maip.showTrustScore",
    async (agentIdArg?: string) => {
      if (!isConfigured()) {
        const action = await vscode.window.showErrorMessage(
          "MAIP is not configured. Run MAIP: Configure Credentials to connect securely.",
          "Configure Credentials",
        );
        if (action === "Configure Credentials") {
          await vscode.commands.executeCommand(
            "maip.configure",
          );
        }
        return;
      }

      let agentId: string | undefined =
        agentIdArg ?? (getAgentId() || undefined);

      if (!agentId) {
        agentId = await vscode.window.showInputBox({
          title: "Agent ID",
          prompt: "Enter the agent ID to view trust score",
          placeHolder: "e.g., maip:t1234567:01HYX3KPZQ...",
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return "Agent ID is required";
            }
            return undefined;
          },
        });
      }

      if (!agentId) {
        return;
      }

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "MAIP: Loading trust score...",
            cancellable: false,
          },
          async () => {
            const [trustScore, history] = await Promise.all([
              client.getTrustScore(agentId),
              client.getTrustHistory(agentId, 30),
            ]);

            TrustDashboardPanel.createOrShow(extensionUri, trustScore, history);
          },
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(
          `MAIP: Failed to load trust score: ${message}`,
        );
      }
    },
  );
}
