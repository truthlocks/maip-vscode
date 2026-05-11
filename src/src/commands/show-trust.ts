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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerShowTrustCommand(
  client: MAIPClient,
  extensionUri: vscode.Uri,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "maip.showTrustScore",
    async (agentIdArg?: string) => {
      if (!isConfigured()) {
        const action = await vscode.window.showErrorMessage(
          "MAIP is not configured. Set your API key and Tenant ID in settings.",
          "Open Settings",
        );
        if (action === "Open Settings") {
          await vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "maip",
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
          placeHolder: "e.g., a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return "Agent ID is required";
            }
            if (!UUID_PATTERN.test(value.trim())) {
              return "Agent ID must be a valid UUID";
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
