/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Auto-generate receipt on git commit.
 * Listens to the VS Code Git extension's repository state changes
 * and creates a MAIP receipt for each detected commit.
 */
import * as vscode from "vscode";
import type { MAIPClient } from "../client";
export declare class GitHookAutoReceipt implements vscode.Disposable {
    private readonly client;
    private readonly disposables;
    private lastKnownCommit;
    constructor(client: MAIPClient);
    private initializeGitWatcher;
    private watchRepository;
    private onRepositoryStateChange;
    dispose(): void;
}
//# sourceMappingURL=git-hook.d.ts.map