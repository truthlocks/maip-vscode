/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * WebviewPanel for delegation chain visualization.
 * Renders a tree diagram of the delegation hierarchy using SVG.
 */
import * as vscode from "vscode";
import type { MAIPClient } from "../client";
export declare class DelegationTreePanel {
    private static currentPanel;
    private readonly panel;
    private disposables;
    private constructor();
    static createOrShow(_extensionUri: vscode.Uri, client: MAIPClient): Promise<void>;
    private dispose;
    private getHtml;
}
//# sourceMappingURL=delegation-tree.d.ts.map