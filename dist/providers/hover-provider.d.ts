/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * HoverProvider for showing receipt and agent info when hovering
 * over agent ID patterns (UUID format) in the editor.
 */
import * as vscode from "vscode";
import type { MAIPClient } from "../client";
export declare class MAIPHoverProvider implements vscode.HoverProvider {
    private readonly client;
    private readonly hoverCache;
    constructor(client: MAIPClient);
    provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): Promise<vscode.Hover | undefined>;
}
//# sourceMappingURL=hover-provider.d.ts.map