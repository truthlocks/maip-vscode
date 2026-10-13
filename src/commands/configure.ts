/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.configure
 * Guided credential setup wizard for MAIP extension.
 */

import * as vscode from "vscode";
import { normalizeEndpoint, saveCredentials, clearLegacySettings } from "../credentials";
import type { MAIPClient } from "../client";

export function registerConfigureCommand(
  _client: MAIPClient,
): vscode.Disposable {
  return vscode.commands.registerCommand("maip.configure", async () => {
    const cfg = vscode.workspace.getConfiguration("maip");

    const apiUrl = await vscode.window.showInputBox({
      title: "MAIP API URL (Step 1/4)",
      prompt: "Enter the MAIP API base URL",
      value: cfg.get<string>("apiUrl", "https://sandbox-api.truthlocks.com/v1"),
      validateInput: (value) => {
        try { normalizeEndpoint(value); } catch { return "Use HTTPS (or localhost HTTP) without URL credentials or query parameters"; }
        return undefined;
      },
    });

    if (apiUrl === undefined) {
      return;
    }

    const apiKey = await vscode.window.showInputBox({
      title: "MAIP API Key (Step 2/4)",
      prompt: "Enter your MAIP API key (starts with tl_live_ or tl_test_)",
      value: "",
      password: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "API key is required";
        }
        return undefined;
      },
    });

    if (apiKey === undefined) {
      return;
    }

    const tenantId = await vscode.window.showInputBox({
      title: "Tenant ID (Step 3/4)",
      prompt: "Optional workspace identifier. Authorization is derived from your API key in both environments.",
      value: cfg.get<string>("tenantId", ""),
    });

    if (tenantId === undefined) {
      return;
    }

    const agentId = await vscode.window.showInputBox({
      title: "Agent ID (Step 4/4)",
      prompt:
        "Enter your Agent ID (optional — you can register one later via MAIP: Register Agent)",
      value: cfg.get<string>("agentId", ""),
      placeHolder: "e.g., maip:a0000000:01kn...",
    });

    if (agentId === undefined) {
      return;
    }

    const target = await vscode.window.showQuickPick(
      [
        {
          label: "Workspace",
          description: "Save to this workspace only",
          target: vscode.ConfigurationTarget.Workspace,
        },
        {
          label: "User (Global)",
          description: "Save for all workspaces",
          target: vscode.ConfigurationTarget.Global,
        },
      ],
      { title: "Where should non-secret connection settings be saved? API keys use encrypted SecretStorage." },
    );

    if (!target) {
      return;
    }

    const endpoint = await saveCredentials(apiUrl, apiKey);
    await clearLegacySettings();
    await cfg.update("apiUrl", endpoint, target.target);
    await cfg.update("tenantId", tenantId.trim(), target.target);
    if (agentId.trim().length > 0) {
      await cfg.update("agentId", agentId.trim(), target.target);
    }

    vscode.window.showInformationMessage(
      "MAIP credentials configured successfully. Use 'MAIP: Test Connection' to verify.",
    );
  });
}

export function registerTestConnectionCommand(
  getClient: () => MAIPClient,
): vscode.Disposable {
  return vscode.commands.registerCommand("maip.testConnection", async () => {
    const client = getClient();

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "MAIP: Testing connection...",
          cancellable: false,
        },
        async () => {
          const result = await client.listAgents({ limit: 1 });
          vscode.window.showInformationMessage(
            `MAIP connection successful! Found ${result.total} agent(s) in your tenant.`,
          );
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(
        `MAIP connection failed: ${message}. Check your API URL, key permissions and environment.`,
      );
    }
  });
}
