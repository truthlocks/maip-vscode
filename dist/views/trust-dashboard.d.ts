/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * WebviewPanel for the trust dashboard.
 * Shows trust score gauge, history chart (SVG), and recent activity.
 */
import * as vscode from "vscode";
import type { TrustScore, TrustHistoryEntry } from "../types";
export declare class TrustDashboardPanel {
    private static currentPanel;
    private readonly panel;
    private disposables;
    private constructor();
    static createOrShow(extensionUri: vscode.Uri, trustScore: TrustScore, history: readonly TrustHistoryEntry[]): void;
    private dispose;
    private getHtml;
}
//# sourceMappingURL=trust-dashboard.d.ts.map