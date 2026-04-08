/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * WebviewPanel for receipt detail view.
 * Shows receipt fields, payload, chain hash, and verification status.
 */

import * as vscode from "vscode";
import * as crypto from "crypto";
import type { Receipt, VerifyReceiptResponse } from "../types";

export class ReceiptDetailPanel {
  private static currentPanel: ReceiptDetailPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    _extensionUri: vscode.Uri,
    receipt: Receipt,
    verification: VerifyReceiptResponse,
  ) {
    this.panel = panel;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.html = this.getHtml(receipt, verification);
  }

  static createOrShow(
    extensionUri: vscode.Uri,
    receipt: Receipt,
    verification: VerifyReceiptResponse,
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ReceiptDetailPanel.currentPanel) {
      ReceiptDetailPanel.currentPanel.panel.reveal(column);
      ReceiptDetailPanel.currentPanel.panel.webview.html =
        ReceiptDetailPanel.currentPanel.getHtml(receipt, verification);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "maip.receiptDetail",
      `Receipt: ${receipt.id.substring(0, 8)}`,
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    ReceiptDetailPanel.currentPanel = new ReceiptDetailPanel(
      panel,
      extensionUri,
      receipt,
      verification,
    );
  }

  private dispose(): void {
    ReceiptDetailPanel.currentPanel = undefined;
    this.panel.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }

  private getHtml(receipt: Receipt, verification: VerifyReceiptResponse): string {
    const nonce = crypto.randomBytes(16).toString("hex");

    const verifyClass = verification.valid ? "verify-valid" : "verify-invalid";
    const verifyIcon = verification.valid ? "&#10003;" : "&#10007;";

    const payloadJson = JSON.stringify(receipt.payload, null, 2);

    const warnings =
      verification.warnings.length > 0
        ? verification.warnings
            .map((w) => `<li class="warning-item">${escapeHtml(w)}</li>`)
            .join("")
        : '<li class="no-warnings">No warnings</li>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt Detail</title>
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
    h2 { font-size: 1.1em; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 4px; }
    .subtitle { color: var(--vscode-descriptionForeground); margin-bottom: 20px; font-size: 0.9em; }
    .verify-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 1em;
      margin-bottom: 20px;
    }
    .verify-valid { background: #1a3a1a; color: #4ec94e; border: 1px solid #2d6b2d; }
    .verify-invalid { background: #3a1a1a; color: #c94e4e; border: 1px solid #6b2d2d; }
    .field-grid {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 6px 16px;
    }
    .field-label { font-weight: 600; color: var(--vscode-descriptionForeground); }
    .field-value { font-family: var(--vscode-editor-font-family); word-break: break-all; }
    .mono { font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
    pre {
      background: var(--vscode-textCodeBlock-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 12px;
      overflow-x: auto;
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em;
      line-height: 1.4;
    }
    .status { font-weight: 600; }
    .status-complete { color: var(--vscode-testing-iconPassed); }
    .status-pending { color: var(--vscode-editorWarning-foreground); }
    .status-failed { color: var(--vscode-testing-iconFailed); }
    ul { padding-left: 20px; margin: 8px 0; }
    .warning-item { color: var(--vscode-editorWarning-foreground); }
    .no-warnings { color: var(--vscode-descriptionForeground); list-style: none; }
    .verdict { padding: 8px 12px; background: var(--vscode-textCodeBlock-background); border-radius: 4px; }
    .btn {
      padding: 6px 14px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.9em;
      margin-right: 8px;
    }
    .btn:hover { background: var(--vscode-button-hoverBackground); }
  </style>
</head>
<body>
  <h1>Receipt Detail</h1>
  <div class="subtitle">${escapeHtml(receipt.id)}</div>

  <div class="verify-badge ${verifyClass}">
    <span>${verifyIcon}</span>
    <span>${verification.valid ? "Verified" : "Verification Failed"}</span>
  </div>

  <h2>Receipt Fields</h2>
  <div class="field-grid">
    <span class="field-label">ID</span>
    <span class="field-value mono">${escapeHtml(receipt.id)}</span>

    <span class="field-label">Action</span>
    <span class="field-value">${escapeHtml(receipt.action)}</span>

    <span class="field-label">Type</span>
    <span class="field-value">${escapeHtml(receipt.receipt_type)}</span>

    <span class="field-label">Status</span>
    <span class="field-value status status-${receipt.status.toLowerCase()}">${escapeHtml(receipt.status)}</span>

    <span class="field-label">Agent ID</span>
    <span class="field-value mono">${escapeHtml(receipt.agent_id)}</span>

    <span class="field-label">Tenant ID</span>
    <span class="field-value mono">${escapeHtml(receipt.tenant_id)}</span>

    <span class="field-label">Attestation ID</span>
    <span class="field-value mono">${escapeHtml(receipt.attestation_id)}</span>

    <span class="field-label">Inputs Hash</span>
    <span class="field-value mono">${escapeHtml(receipt.inputs_hash)}</span>

    <span class="field-label">Outputs Hash</span>
    <span class="field-value mono">${escapeHtml(receipt.outputs_hash)}</span>

    <span class="field-label">Chain Hash</span>
    <span class="field-value mono">${escapeHtml(receipt.delegation_chain_hash)}</span>

    <span class="field-label">Previous Receipt</span>
    <span class="field-value mono">${receipt.previous_receipt_id ? escapeHtml(receipt.previous_receipt_id) : "none"}</span>

    <span class="field-label">Duration</span>
    <span class="field-value">${receipt.duration_ms !== null ? `${receipt.duration_ms}ms` : "N/A"}</span>

    <span class="field-label">Error Code</span>
    <span class="field-value">${receipt.error_code ? escapeHtml(receipt.error_code) : "none"}</span>

    <span class="field-label">Created</span>
    <span class="field-value">${escapeHtml(receipt.created_at)}</span>

    <span class="field-label">Updated</span>
    <span class="field-value">${escapeHtml(receipt.updated_at)}</span>
  </div>

  <h2>Payload</h2>
  <pre>${escapeHtml(payloadJson)}</pre>

  <h2>Verification</h2>
  <div class="field-grid">
    <span class="field-label">Verdict</span>
    <span class="field-value">${escapeHtml(verification.verdict)}</span>

    <span class="field-label">Details</span>
    <span class="field-value">${escapeHtml(verification.details)}</span>
  </div>

  <h2>Warnings</h2>
  <ul>${warnings}</ul>

  <div style="margin-top: 24px;">
    <button class="btn" onclick="copyId()">Copy Receipt ID</button>
    <button class="btn" onclick="copyJson()">Copy as JSON</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const receiptId = ${JSON.stringify(receipt.id)};
    const receiptJson = ${JSON.stringify(JSON.stringify(receipt, null, 2))};

    function copyId() {
      vscode.postMessage({ command: 'copy', text: receiptId });
    }
    function copyJson() {
      vscode.postMessage({ command: 'copy', text: receiptJson });
    }
  </script>
</body>
</html>`;
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
