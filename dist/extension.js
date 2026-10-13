"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * VS Code extension entry point for MAIP - Machine Identity & Integrity.
 * Registers all commands, tree views, providers, auto-receipt handlers,
 * and the status bar item.
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const client_1 = require("./client");
const config_1 = require("./config");
const credentials_1 = require("./credentials");
const register_agent_1 = require("./commands/register-agent");
const register_1 = require("./commands/register");
const create_receipt_1 = require("./commands/create-receipt");
const verify_receipt_1 = require("./commands/verify-receipt");
const show_trust_1 = require("./commands/show-trust");
const list_receipts_1 = require("./commands/list-receipts");
const export_audit_1 = require("./commands/export-audit");
const signout_1 = require("./commands/signout");
const configure_1 = require("./commands/configure");
const receipt_tree_1 = require("./providers/receipt-tree");
const agent_tree_1 = require("./providers/agent-tree");
const trust_decoration_1 = require("./providers/trust-decoration");
const hover_provider_1 = require("./providers/hover-provider");
const delegation_tree_1 = require("./views/delegation-tree");
const git_hook_1 = require("./auto-receipt/git-hook");
const file_save_1 = require("./auto-receipt/file-save");
const terminal_1 = require("./auto-receipt/terminal");
const status_bar_1 = require("./status-bar");
let client;
async function activate(context) {
    const reloadCredentials = async () => {
        try {
            await (0, credentials_1.loadCredentials)(context.secrets);
        }
        catch {
            void vscode.window.showErrorMessage("MAIP could not load its saved connection. Run MAIP: Configure Credentials to reconnect.");
        }
    };
    await reloadCredentials();
    client = new client_1.MAIPClient((0, config_1.getConfig)());
    const receiptTree = new receipt_tree_1.ReceiptTreeProvider(client);
    const agentTree = new agent_tree_1.AgentTreeProvider(client);
    let statusBar;
    let trustDecoration;
    let hoverProvider;
    const refreshAll = () => {
        statusBar?.refresh();
        hoverProvider?.clearCache();
        trustDecoration?.refresh();
        receiptTree.refresh();
        agentTree.refresh();
    };
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("maip.apiUrl") ||
            event.affectsConfiguration("maip.apiKey") ||
            event.affectsConfiguration("maip.tenantId")) {
            client.updateConfig((0, config_1.getConfig)());
            refreshAll();
        }
    }));
    context.subscriptions.push(context.secrets.onDidChange(async (event) => {
        if ((0, credentials_1.credentialsChanged)(event)) {
            await reloadCredentials();
            client.updateConfig((0, config_1.getConfig)());
            refreshAll();
        }
    }));
    // Tree views
    context.subscriptions.push(vscode.window.registerTreeDataProvider("maip.receipts", receiptTree), vscode.window.registerTreeDataProvider("maip.agents", agentTree));
    // Commands
    context.subscriptions.push((0, register_1.registerRegisterCommand)(context), (0, signout_1.registerSignOutCommand)(context), (0, register_agent_1.registerRegisterAgentCommand)(client, refreshAll), (0, create_receipt_1.registerCreateReceiptCommand)(client, refreshAll), (0, verify_receipt_1.registerVerifyReceiptCommand)(client, context.extensionUri), (0, show_trust_1.registerShowTrustCommand)(client, context.extensionUri), (0, list_receipts_1.registerListReceiptsCommand)(client, context.extensionUri), (0, export_audit_1.registerExportAuditCommand)(client), (0, configure_1.registerConfigureCommand)(client), (0, configure_1.registerTestConnectionCommand)(() => client));
    // Refresh command
    context.subscriptions.push(vscode.commands.registerCommand("maip.refreshReceipts", () => {
        refreshAll();
    }));
    // Delegation tree view (shown in the maip.delegations view)
    context.subscriptions.push(vscode.commands.registerCommand("maip.showDelegationTree", async () => {
        await delegation_tree_1.DelegationTreePanel.createOrShow(context.extensionUri, client);
    }));
    // Providers
    trustDecoration = new trust_decoration_1.TrustDecorationProvider(client);
    context.subscriptions.push(trustDecoration);
    hoverProvider = new hover_provider_1.MAIPHoverProvider(client);
    context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: "file" }, hoverProvider), vscode.languages.registerHoverProvider({ scheme: "untitled" }, hoverProvider));
    // Auto-receipt handlers
    const gitHook = new git_hook_1.GitHookAutoReceipt(client);
    const fileSave = new file_save_1.FileSaveAutoReceipt(client);
    const terminal = new terminal_1.TerminalAutoReceipt(client);
    context.subscriptions.push(gitHook, fileSave, terminal);
    // Status bar — trust score + usage counter
    statusBar = new status_bar_1.MAIPStatusBar(client);
    context.subscriptions.push(statusBar);
    // Output channel for diagnostics
    const outputChannel = vscode.window.createOutputChannel("MAIP");
    context.subscriptions.push(outputChannel);
    outputChannel.appendLine("MAIP extension activated");
    // Prompt registration if no API key stored
    (0, register_1.promptRegistrationIfNeeded)(context);
}
function deactivate() {
    /* All disposables are cleaned up via context.subscriptions */
}
//# sourceMappingURL=extension.js.map