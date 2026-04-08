"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.listReceipts
 * Shows receipts in a webview panel with filtering and detail views.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerListReceiptsCommand = registerListReceiptsCommand;
const vscode = __importStar(require("vscode"));
const crypto = __importStar(require("crypto"));
const config_1 = require("../config");
function registerListReceiptsCommand(client, _extensionUri) {
    return vscode.commands.registerCommand("maip.listReceipts", async () => {
        if (!(0, config_1.isConfigured)()) {
            const action = await vscode.window.showErrorMessage("MAIP is not configured. Set your API key and Tenant ID in settings.", "Open Settings");
            if (action === "Open Settings") {
                await vscode.commands.executeCommand("workbench.action.openSettings", "maip");
            }
            return;
        }
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "MAIP: Loading receipts...",
                cancellable: false,
            }, async () => {
                const agentId = (0, config_1.getAgentId)();
                const result = await client.listReceipts({
                    agent_id: agentId || undefined,
                    limit: 100,
                });
                showReceiptsWebview(result.data);
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showErrorMessage(`MAIP: Failed to list receipts: ${message}`);
        }
    });
}
function showReceiptsWebview(receipts) {
    const panel = vscode.window.createWebviewPanel("maip.receiptsList", "MAIP Receipts", vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
    });
    const nonce = crypto.randomBytes(16).toString("hex");
    const receiptRows = receipts
        .map((r) => `
    <tr>
      <td class="mono">${escapeHtml(r.id.substring(0, 8))}...</td>
      <td>${escapeHtml(r.action)}</td>
      <td><span class="badge badge-${r.receipt_type}">${escapeHtml(r.receipt_type)}</span></td>
      <td><span class="status status-${r.status.toLowerCase()}">${escapeHtml(r.status)}</span></td>
      <td class="mono">${escapeHtml(r.agent_id.substring(0, 8))}...</td>
      <td>${formatDate(r.created_at)}</td>
      <td>
        <button class="btn-small" onclick="verifyReceipt('${escapeHtml(r.id)}')">Verify</button>
      </td>
    </tr>`)
        .join("");
    panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MAIP Receipts</title>
  <style nonce="${nonce}">
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
      margin: 0;
    }
    h1 { font-size: 1.4em; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    th {
      font-weight: 600;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      position: sticky;
      top: 0;
    }
    tr:hover { background: var(--vscode-list-hoverBackground); }
    .mono { font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.85em;
      font-weight: 500;
    }
    .badge-action { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    .badge-ml_pipeline { background: #2d5a27; color: #c6e6c2; }
    .badge-data_versioning { background: #5a4327; color: #e6d5c2; }
    .badge-delegation { background: #27405a; color: #c2d5e6; }
    .badge-audit { background: #5a2727; color: #e6c2c2; }
    .status { font-weight: 500; }
    .status-complete { color: var(--vscode-testing-iconPassed); }
    .status-pending { color: var(--vscode-editorWarning-foreground); }
    .status-failed { color: var(--vscode-testing-iconFailed); }
    .btn-small {
      padding: 3px 8px;
      border: 1px solid var(--vscode-button-border, var(--vscode-button-background));
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.85em;
    }
    .btn-small:hover { background: var(--vscode-button-hoverBackground); }
    .empty { text-align: center; padding: 40px; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h1>MAIP Receipts (${receipts.length})</h1>
  ${receipts.length === 0
        ? '<div class="empty">No receipts found. Create one using the command palette.</div>'
        : `<table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Action</th>
        <th>Type</th>
        <th>Status</th>
        <th>Agent</th>
        <th>Created</th>
        <th></th>
      </tr>
    </thead>
    <tbody>${receiptRows}</tbody>
  </table>`}
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    function verifyReceipt(id) {
      vscode.postMessage({ command: 'verify', receiptId: id });
    }
  </script>
</body>
</html>`;
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "verify" && message.receiptId) {
            await vscode.commands.executeCommand("maip.verifyReceipt", message.receiptId);
        }
    });
}
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function formatDate(iso) {
    try {
        const date = new Date(iso);
        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
    catch {
        return iso;
    }
}
//# sourceMappingURL=list-receipts.js.map