/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * TreeDataProvider for the receipt explorer sidebar.
 * Groups receipts by date, then by type within each date group.
 */

import * as vscode from "vscode";
import type { MAIPClient } from "../client";
import type { Receipt } from "../types";
import { isConfigured, getAgentId } from "../config";

type TreeElement = ReceiptDateGroup | ReceiptTypeGroup | ReceiptItem;

class ReceiptDateGroup {
  constructor(
    readonly date: string,
    readonly receipts: readonly Receipt[],
  ) {}
}

class ReceiptTypeGroup {
  constructor(
    readonly receiptType: string,
    readonly receipts: readonly Receipt[],
  ) {}
}

class ReceiptItem {
  constructor(readonly receipt: Receipt) {}
}

export class ReceiptTreeProvider implements vscode.TreeDataProvider<TreeElement> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeElement | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private receipts: readonly Receipt[] = [];
  private isLoading = false;
  private loadError: string | null = null;

  constructor(private readonly client: MAIPClient) {}

  refresh(): void {
    this.receipts = [];
    this.loadError = null;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeElement): vscode.TreeItem {
    if (element instanceof ReceiptDateGroup) {
      const item = new vscode.TreeItem(
        element.date,
        vscode.TreeItemCollapsibleState.Expanded,
      );
      item.description = `${element.receipts.length} receipt${element.receipts.length === 1 ? "" : "s"}`;
      item.iconPath = new vscode.ThemeIcon("calendar");
      item.contextValue = "receiptDateGroup";
      return item;
    }

    if (element instanceof ReceiptTypeGroup) {
      const item = new vscode.TreeItem(
        element.receiptType,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.description = `${element.receipts.length}`;
      item.iconPath = typeIcon(element.receiptType);
      item.contextValue = "receiptTypeGroup";
      return item;
    }

    const r = element.receipt;
    const item = new vscode.TreeItem(r.action, vscode.TreeItemCollapsibleState.None);
    item.description = `${r.id.substring(0, 8)} - ${r.status}`;
    item.tooltip = new vscode.MarkdownString(
      `**Receipt** \`${r.id}\`\n\n` +
        `- **Action:** ${r.action}\n` +
        `- **Type:** ${r.receipt_type}\n` +
        `- **Status:** ${r.status}\n` +
        `- **Agent:** \`${r.agent_id}\`\n` +
        `- **Created:** ${r.created_at}\n`,
    );
    item.iconPath = statusIcon(r.status);
    item.contextValue = "receipt";
    item.command = {
      command: "maip.verifyReceipt",
      title: "Verify Receipt",
      arguments: [r.id],
    };
    return item;
  }

  async getChildren(element?: TreeElement): Promise<TreeElement[]> {
    if (!isConfigured()) {
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

  private async getDateGroups(): Promise<ReceiptDateGroup[]> {
    if (this.receipts.length === 0 && !this.isLoading && !this.loadError) {
      await this.loadReceipts();
    }

    const grouped = new Map<string, Receipt[]>();

    for (const receipt of this.receipts) {
      const date = formatDateKey(receipt.created_at);
      const existing = grouped.get(date);
      if (existing) {
        existing.push(receipt);
      } else {
        grouped.set(date, [receipt]);
      }
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, receipts]) => new ReceiptDateGroup(date, receipts));
  }

  private getTypeGroups(receipts: readonly Receipt[]): ReceiptTypeGroup[] {
    const grouped = new Map<string, Receipt[]>();

    for (const receipt of receipts) {
      const existing = grouped.get(receipt.receipt_type);
      if (existing) {
        existing.push(receipt);
      } else {
        grouped.set(receipt.receipt_type, [receipt]);
      }
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, typeReceipts]) => new ReceiptTypeGroup(type, typeReceipts));
  }

  private async loadReceipts(): Promise<void> {
    this.isLoading = true;
    try {
      const agentId = getAgentId();
      const result = await this.client.listReceipts({
        agent_id: agentId || undefined,
        limit: 200,
      });
      this.receipts = result.data;
      this.loadError = null;
    } catch (error: unknown) {
      this.loadError = error instanceof Error ? error.message : "Unknown error";
      this.receipts = [];
    } finally {
      this.isLoading = false;
    }
  }
}

function formatDateKey(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Unknown";
  }
}

function typeIcon(receiptType: string): vscode.ThemeIcon {
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

function statusIcon(status: string): vscode.ThemeIcon {
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
