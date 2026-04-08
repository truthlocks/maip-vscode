"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * TreeDataProvider for the receipt explorer sidebar.
 * Groups receipts by date, then by type within each date group.
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
exports.ReceiptTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const config_1 = require("../config");
class ReceiptDateGroup {
    date;
    receipts;
    constructor(date, receipts) {
        this.date = date;
        this.receipts = receipts;
    }
}
class ReceiptTypeGroup {
    receiptType;
    receipts;
    constructor(receiptType, receipts) {
        this.receiptType = receiptType;
        this.receipts = receipts;
    }
}
class ReceiptItem {
    receipt;
    constructor(receipt) {
        this.receipt = receipt;
    }
}
class ReceiptTreeProvider {
    client;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    receipts = [];
    isLoading = false;
    loadError = null;
    constructor(client) {
        this.client = client;
    }
    refresh() {
        this.receipts = [];
        this.loadError = null;
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        if (element instanceof ReceiptDateGroup) {
            const item = new vscode.TreeItem(element.date, vscode.TreeItemCollapsibleState.Expanded);
            item.description = `${element.receipts.length} receipt${element.receipts.length === 1 ? "" : "s"}`;
            item.iconPath = new vscode.ThemeIcon("calendar");
            item.contextValue = "receiptDateGroup";
            return item;
        }
        if (element instanceof ReceiptTypeGroup) {
            const item = new vscode.TreeItem(element.receiptType, vscode.TreeItemCollapsibleState.Collapsed);
            item.description = `${element.receipts.length}`;
            item.iconPath = typeIcon(element.receiptType);
            item.contextValue = "receiptTypeGroup";
            return item;
        }
        const r = element.receipt;
        const item = new vscode.TreeItem(r.action, vscode.TreeItemCollapsibleState.None);
        item.description = `${r.id.substring(0, 8)} - ${r.status}`;
        item.tooltip = new vscode.MarkdownString(`**Receipt** \`${r.id}\`\n\n` +
            `- **Action:** ${r.action}\n` +
            `- **Type:** ${r.receipt_type}\n` +
            `- **Status:** ${r.status}\n` +
            `- **Agent:** \`${r.agent_id}\`\n` +
            `- **Created:** ${r.created_at}\n`);
        item.iconPath = statusIcon(r.status);
        item.contextValue = "receipt";
        item.command = {
            command: "maip.verifyReceipt",
            title: "Verify Receipt",
            arguments: [r.id],
        };
        return item;
    }
    async getChildren(element) {
        if (!(0, config_1.isConfigured)()) {
            return [];
        }
        if (!element) {
            return this.getDateGroups();
        }
        if (element instanceof ReceiptDateGroup) {
            return this.getTypeGroups(element.receipts);
        }
        if (element instanceof ReceiptTypeGroup) {
            return element.receipts.map((r) => new ReceiptItem(r));
        }
        return [];
    }
    async getDateGroups() {
        if (this.receipts.length === 0 && !this.isLoading && !this.loadError) {
            await this.loadReceipts();
        }
        const grouped = new Map();
        for (const receipt of this.receipts) {
            const date = formatDateKey(receipt.created_at);
            const existing = grouped.get(date);
            if (existing) {
                existing.push(receipt);
            }
            else {
                grouped.set(date, [receipt]);
            }
        }
        return Array.from(grouped.entries())
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, receipts]) => new ReceiptDateGroup(date, receipts));
    }
    getTypeGroups(receipts) {
        const grouped = new Map();
        for (const receipt of receipts) {
            const existing = grouped.get(receipt.receipt_type);
            if (existing) {
                existing.push(receipt);
            }
            else {
                grouped.set(receipt.receipt_type, [receipt]);
            }
        }
        return Array.from(grouped.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([type, typeReceipts]) => new ReceiptTypeGroup(type, typeReceipts));
    }
    async loadReceipts() {
        this.isLoading = true;
        try {
            const agentId = (0, config_1.getAgentId)();
            const result = await this.client.listReceipts({
                agent_id: agentId || undefined,
                limit: 200,
            });
            this.receipts = result.data;
            this.loadError = null;
        }
        catch (error) {
            this.loadError = error instanceof Error ? error.message : "Unknown error";
            this.receipts = [];
        }
        finally {
            this.isLoading = false;
        }
    }
}
exports.ReceiptTreeProvider = ReceiptTreeProvider;
function formatDateKey(iso) {
    try {
        const date = new Date(iso);
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }
    catch {
        return "Unknown";
    }
}
function typeIcon(receiptType) {
    switch (receiptType) {
        case "action":
            return new vscode.ThemeIcon("play");
        case "ml_pipeline":
            return new vscode.ThemeIcon("beaker");
        case "data_versioning":
            return new vscode.ThemeIcon("database");
        case "delegation":
            return new vscode.ThemeIcon("organization");
        case "audit":
            return new vscode.ThemeIcon("shield");
        default:
            return new vscode.ThemeIcon("file");
    }
}
function statusIcon(status) {
    switch (status) {
        case "COMPLETE":
            return new vscode.ThemeIcon("check", new vscode.ThemeColor("testing.iconPassed"));
        case "PENDING":
            return new vscode.ThemeIcon("clock", new vscode.ThemeColor("editorWarning.foreground"));
        case "FAILED":
            return new vscode.ThemeIcon("error", new vscode.ThemeColor("testing.iconFailed"));
        default:
            return new vscode.ThemeIcon("question");
    }
}
//# sourceMappingURL=receipt-tree.js.map