/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Developer registration command.
 * Registers a developer account via the sandbox API, stores the API key
 * in VS Code SecretStorage, and shows onboarding notifications.
 */
import * as vscode from "vscode";
export declare function registerRegisterCommand(_context: vscode.ExtensionContext): vscode.Disposable;
/**
 * Checks if an API key exists in SecretStorage and prompts
 * the user to register if not found.
 */
export declare function promptRegistrationIfNeeded(_context: vscode.ExtensionContext): Promise<void>;
/**
 * Retrieves the stored API key from SecretStorage.
 */
export declare function getStoredApiKey(_context: vscode.ExtensionContext): Promise<string | undefined>;
//# sourceMappingURL=register.d.ts.map