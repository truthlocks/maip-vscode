/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * DecorationProvider for inline trust score badges.
 * Scans documents for agent ID patterns (UUID format) and displays
 * color-coded trust score decorations inline.
 */
import * as vscode from "vscode";
import type { MAIPClient } from "../client";
export declare class TrustDecorationProvider implements vscode.Disposable {
    private readonly client;
    private readonly disposables;
    private readonly scoreCache;
    private decorationTimeout;
    constructor(client: MAIPClient);
    private triggerUpdateDecorations;
    private updateDecorations;
    dispose(): void;
}
//# sourceMappingURL=trust-decoration.d.ts.map