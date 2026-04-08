"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.createReceipt
 * Creates a receipt for the current file or selection in the editor.
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
exports.registerCreateReceiptCommand = registerCreateReceiptCommand;
const vscode = __importStar(require("vscode"));
const crypto = __importStar(require("crypto"));
const config_1 = require("../config");
const RECEIPT_TYPES = [
    { label: "Action", value: "action" },
    { label: "ML Pipeline", value: "ml_pipeline" },
    { label: "Data Versioning", value: "data_versioning" },
    { label: "Delegation", value: "delegation" },
    { label: "Audit", value: "audit" },
];
function registerCreateReceiptCommand(client, refreshCallback) {
    return vscode.commands.registerCommand("maip.createReceipt", async () => {
        if (!(0, config_1.isConfigured)()) {
            const action = await vscode.window.showErrorMessage("MAIP is not configured. Set your API key and Tenant ID in settings.", "Open Settings");
            if (action === "Open Settings") {
                await vscode.commands.executeCommand("workbench.action.openSettings", "maip");
            }
            return;
        }
        const agentId = (0, config_1.getAgentId)();
        if (!agentId) {
            const action = await vscode.window.showErrorMessage("No agent ID configured for this workspace. Register an agent or set one in settings.", "Register Agent", "Open Settings");
            if (action === "Register Agent") {
                await vscode.commands.executeCommand("maip.registerAgent");
            }
            else if (action === "Open Settings") {
                await vscode.commands.executeCommand("workbench.action.openSettings", "maip.agentId");
            }
            return;
        }
        const editor = vscode.window.activeTextEditor;
        const fileName = editor?.document.fileName ?? "unknown";
        const selection = editor?.selection;
        const hasSelection = selection && !selection.isEmpty;
        const content = hasSelection
            ? editor.document.getText(selection)
            : editor?.document.getText() ?? "";
        const action = await vscode.window.showInputBox({
            title: "Receipt Action",
            prompt: "Describe the action being receipted",
            placeHolder: "e.g., code-review, file-edit, deployment",
            value: hasSelection ? "code-selection" : "file-edit",
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return "Action description is required";
                }
                return undefined;
            },
        });
        if (action === undefined) {
            return;
        }
        const typeItem = await vscode.window.showQuickPick(RECEIPT_TYPES.map((t) => ({ label: t.label, value: t.value })), { title: "Receipt Type", placeHolder: "Select the receipt type" });
        if (!typeItem) {
            return;
        }
        const contentHash = crypto.createHash("sha256").update(content, "utf8").digest("hex");
        const payload = {
            file: fileName,
            content_hash: contentHash,
            content_length: content.length,
            timestamp: new Date().toISOString(),
        };
        if (hasSelection) {
            payload["selection_start_line"] = selection.start.line + 1;
            payload["selection_end_line"] = selection.end.line + 1;
        }
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "MAIP: Creating receipt...",
                cancellable: false,
            }, async () => {
                const receipt = await client.createReceipt({
                    action: action.trim(),
                    agent_id: agentId,
                    payload,
                    receipt_type: typeItem.value,
                });
                const userAction = await vscode.window.showInformationMessage(`Receipt created: ${receipt.id} (${receipt.status})`, "View Details", "Copy ID");
                if (userAction === "View Details") {
                    await vscode.commands.executeCommand("maip.verifyReceipt", receipt.id);
                }
                else if (userAction === "Copy ID") {
                    await vscode.env.clipboard.writeText(receipt.id);
                }
                refreshCallback();
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showErrorMessage(`MAIP: Failed to create receipt: ${message}`);
        }
    });
}
//# sourceMappingURL=create-receipt.js.map