/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * WebviewPanel for receipt detail view.
 * Shows receipt fields, payload, chain hash, and verification status.
 */
import * as vscode from "vscode";
import type { Receipt, VerifyReceiptResponse } from "../types";
export declare class ReceiptDetailPanel {
    private static currentPanel;
    private readonly panel;
    private disposables;
    private constructor();
    static createOrShow(extensionUri: vscode.Uri, receipt: Receipt, verification: VerifyReceiptResponse): void;
    private dispose;
    private getHtml;
}
//# sourceMappingURL=receipt-detail.d.ts.map