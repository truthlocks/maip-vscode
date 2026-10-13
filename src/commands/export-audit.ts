/** @license Apache-2.0 */
import * as vscode from "vscode";
import type { MAIPClient } from "../client";
import { isConfigured, getAgentId } from "../config";

/** Retains the existing command ID for saved keybindings. */
export function registerExportAuditCommand(client: MAIPClient): vscode.Disposable {
  return vscode.commands.registerCommand("maip.exportAudit", async () => {
    if (!isConfigured()) {
      await vscode.commands.executeCommand("maip.configure");
      return;
    }
    const agentId = getAgentId() || await vscode.window.showInputBox({
      title: "Export Agent Evidence", prompt: "Agent ID to export (maximum 100 recent receipts)",
      validateInput: (value) => value.trim() ? undefined : "Agent ID is required",
    });
    if (!agentId) return;
    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`maip-evidence-${Date.now()}.json`),
      filters: { "JSON Files": ["json"] }, title: "Save Agent Evidence Snapshot",
    });
    if (!saveUri) return;
    try {
      const report = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "MAIP: Exporting agent evidence...", cancellable: false,
      }, () => client.exportAuditReport(agentId.trim()));
      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(JSON.stringify(report, null, 2), "utf-8"));
      const action = await vscode.window.showInformationMessage(
        `Agent evidence saved: ${report.receipts.length} recent receipts and ${report.delegations.length} direct delegations. This is a snapshot, not an audit report or certification.`, "Open Export",
      );
      if (action === "Open Export") await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(saveUri));
    } catch (error: unknown) {
      void vscode.window.showErrorMessage(`MAIP: Evidence export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });
}
