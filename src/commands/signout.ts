/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.signOut
 * Clears all stored credentials and resets configuration.
 */

import * as vscode from "vscode";

import { clearCredentials, clearLegacySettings } from "../credentials";

export function registerSignOutCommand(
  _context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand("maip.signOut", async () => {
    const confirm = await vscode.window.showWarningMessage(
      "Sign out of Truthlocks? This will remove your API key and credentials.",
      { modal: true },
      "Sign Out",
    );

    if (confirm !== "Sign Out") {
      return;
    }

    // Clear SecretStorage
    await clearCredentials();
    await clearLegacySettings();

    // Clear VS Code settings
    const cfg = vscode.workspace.getConfiguration("maip");
    await cfg.update("tenantId", "", vscode.ConfigurationTarget.Global);
    await cfg.update("agentId", "", vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage(
      "Signed out. Run 'MAIP: Register Developer' to connect again.",
    );
  });
}
