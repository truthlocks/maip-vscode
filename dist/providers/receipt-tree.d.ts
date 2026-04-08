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
type TreeElement = ReceiptDateGroup | ReceiptTypeGroup | ReceiptItem;
declare class ReceiptDateGroup {
    readonly date: string;
    readonly receipts: readonly Receipt[];
    constructor(date: string, receipts: readonly Receipt[]);
}
declare class ReceiptTypeGroup {
    readonly receiptType: string;
    readonly receipts: readonly Receipt[];
    constructor(receiptType: string, receipts: readonly Receipt[]);
}
declare class ReceiptItem {
    readonly receipt: Receipt;
    constructor(receipt: Receipt);
}
export declare class ReceiptTreeProvider implements vscode.TreeDataProvider<TreeElement> {
    private readonly client;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<TreeElement | null | undefined>;
    private receipts;
    private isLoading;
    private loadError;
    constructor(client: MAIPClient);
    refresh(): void;
    getTreeItem(element: TreeElement): vscode.TreeItem;
    getChildren(element?: TreeElement): Promise<TreeElement[]>;
    private getDateGroups;
    private getTypeGroups;
    private loadReceipts;
}
export {};
//# sourceMappingURL=receipt-tree.d.ts.map