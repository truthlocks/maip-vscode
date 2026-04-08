/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * TreeDataProvider for the agent list sidebar.
 * Groups agents by status (active, suspended, revoked) with trust score badges.
 */
import * as vscode from "vscode";
import type { MAIPClient } from "../client";
import type { AgentStatus, AgentWithTrust } from "../types";
type TreeElement = AgentStatusGroup | AgentItem;
declare class AgentStatusGroup {
    readonly status: AgentStatus;
    readonly agents: readonly AgentWithTrust[];
    constructor(status: AgentStatus, agents: readonly AgentWithTrust[]);
}
declare class AgentItem {
    readonly data: AgentWithTrust;
    constructor(data: AgentWithTrust);
}
export declare class AgentTreeProvider implements vscode.TreeDataProvider<TreeElement> {
    private readonly client;
    private readonly _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<TreeElement | null | undefined>;
    private agents;
    private isLoading;
    constructor(client: MAIPClient);
    refresh(): void;
    getTreeItem(element: TreeElement): vscode.TreeItem;
    getChildren(element?: TreeElement): Promise<TreeElement[]>;
    private getStatusGroups;
    private loadAgents;
}
export {};
//# sourceMappingURL=agent-tree.d.ts.map