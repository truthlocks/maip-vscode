"use strict";
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
exports.registerExportAuditCommand = registerExportAuditCommand;
/** @license Apache-2.0 */
const vscode = __importStar(require("vscode"));
const config_1 = require("../config");
/** Retains the existing command ID for saved keybindings. */
function registerExportAuditCommand(client) {
    return vscode.commands.registerCommand("maip.exportAudit", async () => {
        if (!(0, config_1.isConfigured)()) {
            await vscode.commands.executeCommand("maip.configure");
            return;
        }
        const agentId = (0, config_1.getAgentId)() || await vscode.window.showInputBox({
            title: "Export Agent Evidence", prompt: "Agent ID to export (maximum 100 recent receipts)",
            validateInput: (value) => value.trim() ? undefined : "Agent ID is required",
        });
        if (!agentId)
            return;
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`maip-evidence-${Date.now()}.json`),
            filters: { "JSON Files": ["json"] }, title: "Save Agent Evidence Snapshot",
        });
        if (!saveUri)
            return;
        try {
            const report = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "MAIP: Exporting agent evidence...", cancellable: false,
            }, () => client.exportAuditReport(agentId.trim()));
            await vscode.workspace.fs.writeFile(saveUri, Buffer.from(JSON.stringify(report, null, 2), "utf-8"));
            const action = await vscode.window.showInformationMessage(`Agent evidence saved: ${report.receipts.length} recent receipts and ${report.delegations.length} direct delegations. This is a snapshot, not an audit report or certification.`, "Open Export");
            if (action === "Open Export")
                await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(saveUri));
        }
        catch (error) {
            void vscode.window.showErrorMessage(`MAIP: Evidence export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    });
}
//# sourceMappingURL=export-audit.js.map