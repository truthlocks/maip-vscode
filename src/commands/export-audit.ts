/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.exportAudit
 * Exports an audit report for the configured tenant.
 */

import * as vscode from "vscode";
import type { MAIPClient } from "../client";
import { isConfigured } from "../config";

export function registerExportAuditCommand(client: MAIPClient): vscode.Disposable {
  return vscode.commands.registerCommand("maip.exportAudit", async () => {
    if (!isConfigured()) {
      const action = await vscode.window.showErrorMessage(
        "MAIP is not configured. Set your API key and Tenant ID in settings.",
        "Open Settings",
      );
      if (action === "Open Settings") {
        await vscode.commands.executeCommand("workbench.action.openSettings", "maip");
      }
      return;
    }

    const periodOptions: readonly vscode.QuickPickItem[] = [
      { label: "Last 24 Hours", description: "1 day" },
      { label: "Last 7 Days", description: "7 days" },
      { label: "Last 30 Days", description: "30 days" },
      { label: "Last 90 Days", description: "90 days" },
      { label: "Custom Range", description: "Enter custom dates" },
    ];

    const period = await vscode.window.showQuickPick(periodOptions, {
      title: "Audit Report Period",
      placeHolder: "Select the time period for the audit report",
    });

    if (!period) {
      return;
    }

    let fromDate: string;
    let toDate: string;
    const now = new Date();
    toDate = now.toISOString();

    if (period.label === "Custom Range") {
      const fromInput = await vscode.window.showInputBox({
        title: "Start Date",
        prompt: "Enter start date (YYYY-MM-DD)",
        placeHolder: "2026-01-01",
        validateInput: (value) => {
          if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return "Enter a valid date in YYYY-MM-DD format";
          }
          if (isNaN(Date.parse(value))) {
            return "Enter a valid calendar date";
          }
          return undefined;
        },
      });

      if (!fromInput) {
        return;
      }

      const toInput = await vscode.window.showInputBox({
        title: "End Date",
        prompt: "Enter end date (YYYY-MM-DD)",
        placeHolder: "2026-12-31",
        validateInput: (value) => {
          if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return "Enter a valid date in YYYY-MM-DD format";
          }
          if (isNaN(Date.parse(value))) {
            return "Enter a valid calendar date";
          }
          return undefined;
        },
      });

      if (!toInput) {
        return;
      }

      fromDate = new Date(fromInput).toISOString();
      toDate = new Date(toInput + "T23:59:59.999Z").toISOString();
    } else {
      const daysMap: Record<string, number> = {
        "Last 24 Hours": 1,
        "Last 7 Days": 7,
        "Last 30 Days": 30,
        "Last 90 Days": 90,
      };
      const days = daysMap[period.label] ?? 30;
      const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      fromDate = from.toISOString();
    }

    try {
      const report = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "MAIP: Generating audit report...",
          cancellable: false,
        },
        async () => {
          return client.exportAuditReport({
            from: fromDate,
            to: toDate,
            include_anomalies: true,
          });
        },
      );

      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`maip-audit-${report.report_id}.json`),
        filters: { "JSON Files": ["json"] },
        title: "Save Audit Report",
      });

      if (!saveUri) {
        return;
      }

      const reportJson = JSON.stringify(report, null, 2);
      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(reportJson, "utf-8"));

      const openAction = await vscode.window.showInformationMessage(
        `Audit report saved: ${report.total_agents} agents, ${report.total_receipts} receipts, ${report.anomalies.length} anomalies`,
        "Open Report",
      );

      if (openAction === "Open Report") {
        const doc = await vscode.workspace.openTextDocument(saveUri);
        await vscode.window.showTextDocument(doc);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`MAIP: Failed to export audit report: ${message}`);
    }
  });
}
