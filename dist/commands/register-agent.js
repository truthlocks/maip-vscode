"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.registerAgent
 * Prompts the user to register a new machine agent via the MAIP API.
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
exports.registerRegisterAgentCommand = registerRegisterAgentCommand;
const vscode = __importStar(require("vscode"));
const config_1 = require("../config");
const AGENT_TYPES = [
    { label: "Service", value: "service" },
    { label: "Pipeline", value: "pipeline" },
    { label: "Model", value: "model" },
    { label: "Tool", value: "tool" },
];
function registerRegisterAgentCommand(client, refreshCallback) {
    return vscode.commands.registerCommand("maip.registerAgent", async () => {
        if (!(0, config_1.isConfigured)()) {
            const action = await vscode.window.showErrorMessage("MAIP is not configured. Set your API key and Tenant ID in settings.", "Open Settings");
            if (action === "Open Settings") {
                await vscode.commands.executeCommand("workbench.action.openSettings", "maip");
            }
            return;
        }
        const name = await vscode.window.showInputBox({
            title: "Agent Name",
            prompt: "Enter a display name for the agent",
            placeHolder: "e.g., ci-pipeline-main",
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return "Agent name is required";
                }
                if (value.length > 128) {
                    return "Agent name must be 128 characters or fewer";
                }
                return undefined;
            },
        });
        if (name === undefined) {
            return;
        }
        const typeItem = await vscode.window.showQuickPick(AGENT_TYPES.map((t) => ({ label: t.label, value: t.value })), { title: "Agent Type", placeHolder: "Select the type of agent" });
        if (!typeItem) {
            return;
        }
        const capabilitiesInput = await vscode.window.showInputBox({
            title: "Capabilities",
            prompt: "Comma-separated list of capabilities (optional)",
            placeHolder: "e.g., read, write, deploy",
        });
        const capabilities = capabilitiesInput && capabilitiesInput.trim().length > 0
            ? capabilitiesInput.split(",").map((c) => c.trim()).filter((c) => c.length > 0)
            : undefined;
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "MAIP: Registering agent...",
                cancellable: false,
            }, async () => {
                const result = await client.registerAgent({
                    name: name.trim(),
                    type: typeItem.value,
                    capabilities,
                });
                const agentId = result.agent.agent_id;
                const setAsDefault = await vscode.window.showInformationMessage(`Agent registered: ${result.agent.display_name} (trust: ${result.trust_score.toFixed(2)}). Agent ID: ${agentId}`, "Set as Workspace Agent", "Copy ID");
                if (setAsDefault === "Set as Workspace Agent") {
                    await vscode.workspace
                        .getConfiguration("maip")
                        .update("agentId", agentId, vscode.ConfigurationTarget.Workspace);
                }
                else if (setAsDefault === "Copy ID") {
                    await vscode.env.clipboard.writeText(agentId);
                }
                refreshCallback();
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showErrorMessage(`MAIP: Failed to register agent: ${message}`);
        }
    });
}
//# sourceMappingURL=register-agent.js.map