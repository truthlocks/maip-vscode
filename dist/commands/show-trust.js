"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.showTrustScore
 * Shows the trust score for an agent in the trust dashboard webview.
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
exports.registerShowTrustCommand = registerShowTrustCommand;
const vscode = __importStar(require("vscode"));
const config_1 = require("../config");
const trust_dashboard_1 = require("../views/trust-dashboard");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function registerShowTrustCommand(client, extensionUri) {
    return vscode.commands.registerCommand("maip.showTrustScore", async (agentIdArg) => {
        if (!(0, config_1.isConfigured)()) {
            const action = await vscode.window.showErrorMessage("MAIP is not configured. Set your API key and Tenant ID in settings.", "Open Settings");
            if (action === "Open Settings") {
                await vscode.commands.executeCommand("workbench.action.openSettings", "maip");
            }
            return;
        }
        let agentId = agentIdArg ?? ((0, config_1.getAgentId)() || undefined);
        if (!agentId) {
            agentId = await vscode.window.showInputBox({
                title: "Agent ID",
                prompt: "Enter the agent ID to view trust score",
                placeHolder: "e.g., a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return "Agent ID is required";
                    }
                    if (!UUID_PATTERN.test(value.trim())) {
                        return "Agent ID must be a valid UUID";
                    }
                    return undefined;
                },
            });
        }
        if (!agentId) {
            return;
        }
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "MAIP: Loading trust score...",
                cancellable: false,
            }, async () => {
                const [trustScore, history] = await Promise.all([
                    client.getTrustScore(agentId),
                    client.getTrustHistory(agentId, 30),
                ]);
                trust_dashboard_1.TrustDashboardPanel.createOrShow(extensionUri, trustScore, history);
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showErrorMessage(`MAIP: Failed to load trust score: ${message}`);
        }
    });
}
//# sourceMappingURL=show-trust.js.map