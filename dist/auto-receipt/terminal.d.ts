/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Monitor terminal for CI/CD commands and generate receipts.
 * Detects common CI/CD patterns (npm publish, docker push, deploy commands)
 * and auto-generates receipts for them.
 */
import * as vscode from "vscode";
import type { MAIPClient } from "../client";
export declare class TerminalAutoReceipt implements vscode.Disposable {
    private readonly client;
    private readonly disposables;
    constructor(client: MAIPClient);
    private onTerminalExecution;
    dispose(): void;
}
//# sourceMappingURL=terminal.d.ts.map