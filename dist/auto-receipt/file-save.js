"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Auto-generate receipt on file save (configurable).
 * When enabled, listens to workspace onDidSaveTextDocument events
 * and creates a MAIP receipt with content hash.
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
exports.FileSaveAutoReceipt = void 0;
const vscode = __importStar(require("vscode"));
const crypto = __importStar(require("crypto"));
const config_1 = require("../config");
const DEBOUNCE_MS = 2_000;
class FileSaveAutoReceipt {
    client;
    disposables = [];
    pendingSaves = new Map();
    constructor(client) {
        this.client = client;
        this.disposables.push(vscode.workspace.onDidSaveTextDocument((document) => {
            this.onDocumentSaved(document);
        }));
        this.disposables.push(vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("maip.autoReceiptOnSave")) {
                if (!(0, config_1.isAutoReceiptOnSaveEnabled)()) {
                    for (const timeout of this.pendingSaves.values()) {
                        clearTimeout(timeout);
                    }
                    this.pendingSaves.clear();
                }
            }
        }));
    }
    onDocumentSaved(document) {
        if (!(0, config_1.isConfigured)() || !(0, config_1.isAutoReceiptOnSaveEnabled)()) {
            return;
        }
        const agentId = (0, config_1.getAgentId)();
        if (!agentId) {
            return;
        }
        if (document.uri.scheme !== "file") {
            return;
        }
        const filePath = document.uri.fsPath;
        const existing = this.pendingSaves.get(filePath);
        if (existing) {
            clearTimeout(existing);
        }
        const timeout = setTimeout(() => {
            this.pendingSaves.delete(filePath);
            this.createSaveReceipt(document, agentId).catch(() => {
                /* best-effort */
            });
        }, DEBOUNCE_MS);
        this.pendingSaves.set(filePath, timeout);
    }
    async createSaveReceipt(document, agentId) {
        const content = document.getText();
        const contentHash = crypto.createHash("sha256").update(content, "utf8").digest("hex");
        const languageId = document.languageId;
        const lineCount = document.lineCount;
        const fileName = document.fileName;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        try {
            await this.client.createReceipt({
                action: "file-save",
                agent_id: agentId,
                receipt_type: "action",
                payload: {
                    file: fileName,
                    content_hash: contentHash,
                    language: languageId,
                    line_count: lineCount,
                    byte_size: Buffer.byteLength(content, "utf8"),
                    workspace_folder: workspaceFolder?.uri.fsPath ?? null,
                    source: "vscode-auto-receipt",
                    timestamp: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showWarningMessage(`MAIP: Auto-receipt failed for ${fileName}: ${message}`);
        }
    }
    dispose() {
        for (const timeout of this.pendingSaves.values()) {
            clearTimeout(timeout);
        }
        this.pendingSaves.clear();
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
exports.FileSaveAutoReceipt = FileSaveAutoReceipt;
//# sourceMappingURL=file-save.js.map