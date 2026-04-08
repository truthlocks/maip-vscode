"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.verifyReceipt
 * Verifies a receipt by ID and displays the result in a webview.
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
exports.registerVerifyReceiptCommand = registerVerifyReceiptCommand;
const vscode = __importStar(require("vscode"));
const config_1 = require("../config");
const receipt_detail_1 = require("../views/receipt-detail");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function registerVerifyReceiptCommand(client, extensionUri) {
    return vscode.commands.registerCommand("maip.verifyReceipt", async (receiptIdArg) => {
        if (!(0, config_1.isConfigured)()) {
            const action = await vscode.window.showErrorMessage("MAIP is not configured. Set your API key and Tenant ID in settings.", "Open Settings");
            if (action === "Open Settings") {
                await vscode.commands.executeCommand("workbench.action.openSettings", "maip");
            }
            return;
        }
        let receiptId = receiptIdArg;
        if (!receiptId) {
            receiptId = await vscode.window.showInputBox({
                title: "Receipt ID",
                prompt: "Enter the receipt ID to verify",
                placeHolder: "e.g., a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return "Receipt ID is required";
                    }
                    if (!UUID_PATTERN.test(value.trim())) {
                        return "Receipt ID must be a valid UUID";
                    }
                    return undefined;
                },
            });
        }
        if (!receiptId) {
            return;
        }
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "MAIP: Verifying receipt...",
                cancellable: false,
            }, async () => {
                const [receipt, verification] = await Promise.all([
                    client.getReceipt(receiptId),
                    client.verifyReceipt(receiptId),
                ]);
                receipt_detail_1.ReceiptDetailPanel.createOrShow(extensionUri, receipt, verification);
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showErrorMessage(`MAIP: Failed to verify receipt: ${message}`);
        }
    });
}
//# sourceMappingURL=verify-receipt.js.map