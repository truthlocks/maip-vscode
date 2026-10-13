/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * VS Code extension entry point for MAIP - Machine Identity & Integrity.
 * Registers all commands, tree views, providers, auto-receipt handlers,
 * and the status bar item.
 */

import * as vscode from "vscode";
import { MAIPClient } from "./client";
import { getConfig } from "./config";
import { loadCredentials, credentialsChanged } from "./credentials";
import { registerRegisterAgentCommand } from "./commands/register-agent";
import {
  registerRegisterCommand,
  promptRegistrationIfNeeded,
} from "./commands/register";
import { registerCreateReceiptCommand } from "./commands/create-receipt";
import { registerVerifyReceiptCommand } from "./commands/verify-receipt";
import { registerShowTrustCommand } from "./commands/show-trust";
import { registerListReceiptsCommand } from "./commands/list-receipts";
import { registerExportAuditCommand } from "./commands/export-audit";
import { registerSignOutCommand } from "./commands/signout";
import {
  registerConfigureCommand,
  registerTestConnectionCommand,
} from "./commands/configure";
import { ReceiptTreeProvider } from "./providers/receipt-tree";
import { AgentTreeProvider } from "./providers/agent-tree";
import { TrustDecorationProvider } from "./providers/trust-decoration";
import { MAIPHoverProvider } from "./providers/hover-provider";
import { DelegationTreePanel } from "./views/delegation-tree";
import { GitHookAutoReceipt } from "./auto-receipt/git-hook";
import { FileSaveAutoReceipt } from "./auto-receipt/file-save";
import { TerminalAutoReceipt } from "./auto-receipt/terminal";
import { MAIPStatusBar } from "./status-bar";

let client: MAIPClient;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const reloadCredentials = async (): Promise<void> => {
    try {
      await loadCredentials(context.secrets);
    } catch {
      void vscode.window.showErrorMessage("MAIP could not load its saved connection. Run MAIP: Configure Credentials to reconnect.");
    }
  };
  await reloadCredentials();
  client = new MAIPClient(getConfig());

  const receiptTree = new ReceiptTreeProvider(client);
  const agentTree = new AgentTreeProvider(client);

  let statusBar: MAIPStatusBar | undefined;
  let trustDecoration: TrustDecorationProvider | undefined;
  let hoverProvider: MAIPHoverProvider | undefined;
  const refreshAll = (): void => {
    statusBar?.refresh();
    hoverProvider?.clearCache();
    trustDecoration?.refresh();
    receiptTree.refresh();
    agentTree.refresh();
  };

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("maip.apiUrl") ||
        event.affectsConfiguration("maip.apiKey") ||
        event.affectsConfiguration("maip.tenantId")
      ) {
        client.updateConfig(getConfig());
        refreshAll();
      }
    }),
  );

  context.subscriptions.push(context.secrets.onDidChange(async (event) => {
    if (credentialsChanged(event)) {
      await reloadCredentials();
      client.updateConfig(getConfig());
      refreshAll();
    }
  }));

  // Tree views
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("maip.receipts", receiptTree),
    vscode.window.registerTreeDataProvider("maip.agents", agentTree),
  );

  // Commands
  context.subscriptions.push(
    registerRegisterCommand(context),
    registerSignOutCommand(context),
    registerRegisterAgentCommand(client, refreshAll),
    registerCreateReceiptCommand(client, refreshAll),
    registerVerifyReceiptCommand(client, context.extensionUri),
    registerShowTrustCommand(client, context.extensionUri),
    registerListReceiptsCommand(client, context.extensionUri),
    registerExportAuditCommand(client),
    registerConfigureCommand(client),
    registerTestConnectionCommand(() => client),
  );

  // Refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand("maip.refreshReceipts", () => {
      refreshAll();
    }),
  );

  // Delegation tree view (shown in the maip.delegations view)
  context.subscriptions.push(
    vscode.commands.registerCommand("maip.showDelegationTree", async () => {
      await DelegationTreePanel.createOrShow(context.extensionUri, client);
    }),
  );

  // Providers
  trustDecoration = new TrustDecorationProvider(client);
  context.subscriptions.push(trustDecoration);

  hoverProvider = new MAIPHoverProvider(client);
  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ scheme: "file" }, hoverProvider),
    vscode.languages.registerHoverProvider(
      { scheme: "untitled" },
      hoverProvider,
    ),
  );

  // Auto-receipt handlers
  const gitHook = new GitHookAutoReceipt(client);
  const fileSave = new FileSaveAutoReceipt(client);
  const terminal = new TerminalAutoReceipt(client);
  context.subscriptions.push(gitHook, fileSave, terminal);

  // Status bar — trust score + usage counter
  statusBar = new MAIPStatusBar(client);
  context.subscriptions.push(statusBar);

  // Output channel for diagnostics
  const outputChannel = vscode.window.createOutputChannel("MAIP");
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine("MAIP extension activated");

  // Prompt registration if no API key stored
  promptRegistrationIfNeeded(context);
}

export function deactivate(): void {
  /* All disposables are cleaned up via context.subscriptions */
}
