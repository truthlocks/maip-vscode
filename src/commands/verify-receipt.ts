/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.verifyReceipt
 * Verifies a receipt by ID and displays the result in a webview.
 */

import * as vscode from "vscode";
import type { MAIPClient } from "../client";
import { isConfigured } from "../config";
import { ReceiptDetailPanel } from "../views/receipt-detail";

const RECEIPT_ID_PATTERN =
  /^(maip-receipt:[0-9a-z]+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function registerVerifyReceiptCommand(
  client: MAIPClient,
  extensionUri: vscode.Uri,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "maip.verifyReceipt",
    async (receiptIdArg?: string) => {
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

      let receiptId = receiptIdArg;

      if (!receiptId) {
        receiptId = await vscode.window.showInputBox({
          title: "Receipt ID",
          prompt: "Enter the receipt ID to verify",
          placeHolder: "e.g., maip-receipt:01abc123...",
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return "Receipt ID is required";
            }
            if (!RECEIPT_ID_PATTERN.test(value.trim())) {
              return "Receipt ID must be maip-receipt:... or UUID format";
            }
            return undefined;
          },
        });
      }

      if (!receiptId) {
        return;
      }

      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "MAIP: Verifying receipt...",
            cancellable: false,
          },
          async () => {
            const [receipt, verification] = await Promise.all([
              client.getReceipt(receiptId),
              client.verifyReceipt(receiptId),
            ]);

            ReceiptDetailPanel.createOrShow(
              extensionUri,
              receipt,
              verification,
            );
          },
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(
          `MAIP: Failed to verify receipt: ${message}`,
        );
      }
    },
  );
}
