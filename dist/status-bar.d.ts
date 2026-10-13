/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Status bar item showing MAIP connection status and server trust score.
 * Left-aligned. Click opens the trust dashboard webview.
 */
import * as vscode from "vscode";
import type { MAIPClient } from "./client";
export declare class MAIPStatusBar implements vscode.Disposable {
    private readonly client;
    private readonly statusBarItem;
    private readonly disposables;
    private pollTimer;
    private _lastTrustScore;
    get lastTrustScore(): number | undefined;
    constructor(client: MAIPClient);
    private startPolling;
    refresh(): void;
    private updateStatus;
    private fetchTrustScore;
    dispose(): void;
}
//# sourceMappingURL=status-bar.d.ts.map