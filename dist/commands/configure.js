"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.configure
 * Guided credential setup wizard for MAIP extension.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConfigureCommand = registerConfigureCommand;
exports.registerTestConnectionCommand = registerTestConnectionCommand;
const vscode = __importStar(require("vscode"));
const credentials_1 = require("../credentials");
function registerConfigureCommand(_client) {
    return vscode.commands.registerCommand("maip.configure", async () => {
        const cfg = vscode.workspace.getConfiguration("maip");
        const apiUrl = await vscode.window.showInputBox({
            title: "MAIP API URL (Step 1/4)",
            prompt: "Enter the MAIP API base URL",
            value: cfg.get("apiUrl", "https://sandbox-api.truthlocks.com/v1"),
            validateInput: (value) => {
                try {
                    (0, credentials_1.normalizeEndpoint)(value);
                }
                catch {
                    return "Use HTTPS (or localhost HTTP) without URL credentials or query parameters";
                }
                return undefined;
            },
        });
        if (apiUrl === undefined) {
            return;
        }
        const apiKey = await vscode.window.showInputBox({
            title: "MAIP API Key (Step 2/4)",
            prompt: "Enter your MAIP API key (starts with tl_live_ or tl_test_)",
            value: "",
            password: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return "API key is required";
                }
                return undefined;
            },
        });
        if (apiKey === undefined) {
            return;
        }
        const tenantId = await vscode.window.showInputBox({
            title: "Tenant ID (Step 3/4)",
            prompt: "Optional workspace identifier. Authorization is derived from your API key in both environments.",
            value: cfg.get("tenantId", ""),
        });
        if (tenantId === undefined) {
            return;
        }
        const agentId = await vscode.window.showInputBox({
            title: "Agent ID (Step 4/4)",
            prompt: "Enter your Agent ID (optional — you can register one later via MAIP: Register Agent)",
            value: cfg.get("agentId", ""),
            placeHolder: "e.g., maip:a0000000:01kn...",
        });
        if (agentId === undefined) {
            return;
        }
        const target = await vscode.window.showQuickPick([
            {
                label: "Workspace",
                description: "Save to this workspace only",
                target: vscode.ConfigurationTarget.Workspace,
            },
            {
                label: "User (Global)",
                description: "Save for all workspaces",
                target: vscode.ConfigurationTarget.Global,
            },
        ], { title: "Where should non-secret connection settings be saved? API keys use encrypted SecretStorage." });
        if (!target) {
            return;
        }
        const endpoint = await (0, credentials_1.saveCredentials)(apiUrl, apiKey);
        await (0, credentials_1.clearLegacySettings)();
        await cfg.update("apiUrl", endpoint, target.target);
        await cfg.update("tenantId", tenantId.trim(), target.target);
        if (agentId.trim().length > 0) {
            await cfg.update("agentId", agentId.trim(), target.target);
        }
        vscode.window.showInformationMessage("MAIP credentials configured successfully. Use 'MAIP: Test Connection' to verify.");
    });
}
function registerTestConnectionCommand(getClient) {
    return vscode.commands.registerCommand("maip.testConnection", async () => {
        const client = getClient();
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "MAIP: Testing connection...",
                cancellable: false,
            }, async () => {
                const result = await client.listAgents({ limit: 1 });
                vscode.window.showInformationMessage(`MAIP connection successful! Found ${result.total} agent(s) in your tenant.`);
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showErrorMessage(`MAIP connection failed: ${message}. Check your API URL, key permissions and environment.`);
        }
    });
}
//# sourceMappingURL=configure.js.map