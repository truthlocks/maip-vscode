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
import { registerRegisterAgentCommand } from "./commands/register-agent";
import { registerCreateReceiptCommand } from "./commands/create-receipt";
import { registerVerifyReceiptCommand } from "./commands/verify-receipt";
import { registerShowTrustCommand } from "./commands/show-trust";
import { registerListReceiptsCommand } from "./commands/list-receipts";
import { registerExportAuditCommand } from "./commands/export-audit";
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

export function activate(context: vscode.ExtensionContext): void {
  client = new MAIPClient(getConfig());

  const receiptTree = new ReceiptTreeProvider(client);
  const agentTree = new AgentTreeProvider(client);

  const refreshAll = (): void => {
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
        client = new MAIPClient(getConfig());
        refreshAll();
      }
    }),
  );

  // Tree views
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("maip.receipts", receiptTree),
    vscode.window.registerTreeDataProvider("maip.agents", agentTree),
  );

  // Commands
  context.subscriptions.push(
    registerRegisterAgentCommand(client, refreshAll),
    registerCreateReceiptCommand(client, refreshAll),
    registerVerifyReceiptCommand(client, context.extensionUri),
    registerShowTrustCommand(client, context.extensionUri),
    registerListReceiptsCommand(client, context.extensionUri),
    registerExportAuditCommand(client),
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
  const trustDecoration = new TrustDecorationProvider(client);
  context.subscriptions.push(trustDecoration);

  const hoverProvider = new MAIPHoverProvider(client);
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

  // Status bar
  const statusBar = new MAIPStatusBar(client);
  context.subscriptions.push(statusBar);

  // Output channel for diagnostics
  const outputChannel = vscode.window.createOutputChannel("MAIP");
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine("MAIP extension activated");
}

export function deactivate(): void {
  /* All disposables are cleaned up via context.subscriptions */
}
