/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.configure
 * Guided credential setup wizard for MAIP extension.
 */
import * as vscode from "vscode";
import type { MAIPClient } from "../client";
export declare function registerConfigureCommand(_client: MAIPClient): vscode.Disposable;
export declare function registerTestConnectionCommand(getClient: () => MAIPClient): vscode.Disposable;
//# sourceMappingURL=configure.d.ts.map