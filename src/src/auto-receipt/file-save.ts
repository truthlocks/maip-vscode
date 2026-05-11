/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Auto-generate receipt on file save (configurable).
 * When enabled, listens to workspace onDidSaveTextDocument events
 * and creates a MAIP receipt with content hash.
 */

import * as vscode from "vscode";
import * as crypto from "crypto";
import type { MAIPClient } from "../client";
import {
  isConfigured,
  getAgentId,
  isAutoReceiptOnSaveEnabled,
} from "../config";

const DEBOUNCE_MS = 2_000;

export class FileSaveAutoReceipt implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly pendingSaves = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  constructor(private readonly client: MAIPClient) {
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        this.onDocumentSaved(document);
      }),
    );

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("maip.autoReceiptOnSave")) {
          if (!isAutoReceiptOnSaveEnabled()) {
            for (const timeout of this.pendingSaves.values()) {
              clearTimeout(timeout);
            }
            this.pendingSaves.clear();
          }
        }
      }),
    );
  }

  private onDocumentSaved(document: vscode.TextDocument): void {
    if (!isConfigured() || !isAutoReceiptOnSaveEnabled()) {
      return;
    }

    const agentId = getAgentId();
    if (!agentId) {
      return;
    }

    if (document.uri.scheme !== "file") {
      return;
    }

    const filePath = document.uri.fsPath;
    const existing = this.pendingSaves.get(filePath);
    if (existing) {
      clearTimeout(existing);
    }

    const timeout = setTimeout(() => {
      this.pendingSaves.delete(filePath);
      this.createSaveReceipt(document, agentId).catch(() => {
        /* best-effort */
      });
    }, DEBOUNCE_MS);

    this.pendingSaves.set(filePath, timeout);
  }

  private async createSaveReceipt(
    document: vscode.TextDocument,
    agentId: string,
  ): Promise<void> {
    const content = document.getText();
    const contentHash = crypto
      .createHash("sha256")
      .update(content, "utf8")
      .digest("hex");
    const languageId = document.languageId;
    const lineCount = document.lineCount;
    const fileName = document.fileName;

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    try {
      await this.client.createReceipt({
        action: "file-save",
        agent_id: agentId,
        receipt_type: "action",
        payload: {
          file: fileName,
          content_hash: contentHash,
          language: languageId,
          line_count: lineCount,
          byte_size: Buffer.byteLength(content, "utf8"),
          workspace_folder: workspaceFolder?.uri.fsPath ?? null,
          source: "vscode-auto-receipt",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showWarningMessage(
        `MAIP: Auto-receipt failed for ${fileName}: ${message}`,
      );
    }
  }

  dispose(): void {
    for (const timeout of this.pendingSaves.values()) {
      clearTimeout(timeout);
    }
    this.pendingSaves.clear();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
