/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Auto-generate receipt on file save (configurable).
 * When enabled, listens to workspace onDidSaveTextDocument events
 * and creates a MAIP receipt with content hash.
 */
import * as vscode from "vscode";
import type { MAIPClient } from "../client";
export declare class FileSaveAutoReceipt implements vscode.Disposable {
    private readonly client;
    private readonly disposables;
    private readonly pendingSaves;
    constructor(client: MAIPClient);
    private onDocumentSaved;
    private createSaveReceipt;
    dispose(): void;
}
//# sourceMappingURL=file-save.d.ts.map