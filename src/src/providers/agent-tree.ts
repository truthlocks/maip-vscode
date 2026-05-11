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
import { isConfigured } from "../config";

type TreeElement = AgentStatusGroup | AgentItem;

class AgentStatusGroup {
  constructor(
    readonly status: AgentStatus,
    readonly agents: readonly AgentWithTrust[],
  ) {}
}

class AgentItem {
  constructor(readonly data: AgentWithTrust) {}
}

const STATUS_ORDER: readonly AgentStatus[] = ["active", "suspended", "revoked"];

export class AgentTreeProvider implements vscode.TreeDataProvider<TreeElement> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    TreeElement | undefined | null
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private agents: readonly AgentWithTrust[] = [];
  private isLoading = false;

  constructor(private readonly client: MAIPClient) {}

  refresh(): void {
    this.agents = [];
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeElement): vscode.TreeItem {
    if (element instanceof AgentStatusGroup) {
      const item = new vscode.TreeItem(
        capitalize(element.status),
        element.status === "active"
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.description = `${element.agents.length} agent${element.agents.length === 1 ? "" : "s"}`;
      item.iconPath = statusGroupIcon(element.status);
      item.contextValue = "agentStatusGroup";
      return item;
    }

    const { agent, trustScore } = element.data;
    const item = new vscode.TreeItem(
      agent.display_name,
      vscode.TreeItemCollapsibleState.None,
    );
    item.description = `${agent.agent_id.substring(0, 8)} | Trust: ${trustScore.toFixed(2)}`;
    item.tooltip = new vscode.MarkdownString(
      `**${agent.display_name}**\n\n` +
        `- **ID:** \`${agent.agent_id}\`\n` +
        `- **Type:** ${agent.trust_level}\n` +
        `- **Status:** ${agent.status}\n` +
        `- **Trust Score:** ${trustScore.toFixed(4)}\n` +
        `- **Capabilities:** ${agent.capabilities.length > 0 ? agent.capabilities.join(", ") : "none"}\n` +
        `- **Delegation Depth:** ${agent.max_delegation_depth}\n` +
        `- **Created:** ${agent.created_at}\n`,
    );
    item.iconPath = trustScoreIcon(trustScore);
    item.contextValue = agent.status === "active" ? "agentActive" : "agent";
    item.command = {
      command: "maip.showTrustScore",
      title: "Show Trust Score",
      arguments: [agent.agent_id],
    };
    return item;
  }

  async getChildren(element?: TreeElement): Promise<TreeElement[]> {
    if (!isConfigured()) {
      return [];
    }

    if (!element) {
      return this.getStatusGroups();
    }

    if (element instanceof AgentStatusGroup) {
      return element.agents.map((a) => new AgentItem(a));
    }

    return [];
  }

  private async getStatusGroups(): Promise<AgentStatusGroup[]> {
    if (this.agents.length === 0 && !this.isLoading) {
      await this.loadAgents();
    }

    const grouped = new Map<AgentStatus, AgentWithTrust[]>();

    for (const status of STATUS_ORDER) {
      grouped.set(status, []);
    }

    for (const agent of this.agents) {
      const list = grouped.get(agent.agent.status);
      if (list) {
        list.push(agent);
      }
    }

    return STATUS_ORDER.map(
      (status) => new AgentStatusGroup(status, grouped.get(status) ?? []),
    ).filter((g) => g.agents.length > 0);
  }

  private async loadAgents(): Promise<void> {
    this.isLoading = true;
    try {
      const result = await this.client.listAgents({ limit: 200 });
      const agentsWithTrust: AgentWithTrust[] = [];

      const trustPromises = result.data.map(async (agent) => {
        try {
          const trust = await this.client.getTrustScore(agent.agent_id);
          return { agent, trustScore: trust.trust_score };
        } catch {
          return { agent, trustScore: 0 };
        }
      });

      const settled = await Promise.allSettled(trustPromises);
      for (const result of settled) {
        if (result.status === "fulfilled") {
          agentsWithTrust.push(result.value);
        }
      }

      this.agents = agentsWithTrust;
    } catch {
      this.agents = [];
    } finally {
      this.isLoading = false;
    }
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusGroupIcon(status: AgentStatus): vscode.ThemeIcon {
  switch (status) {
    case "active":
      return new vscode.ThemeIcon(
        "check-all",
        new vscode.ThemeColor("testing.iconPassed"),
      );
    case "suspended":
      return new vscode.ThemeIcon(
        "warning",
        new vscode.ThemeColor("editorWarning.foreground"),
      );
    case "revoked":
      return new vscode.ThemeIcon(
        "circle-slash",
        new vscode.ThemeColor("testing.iconFailed"),
      );
  }
}

function trustScoreIcon(score: number): vscode.ThemeIcon {
  if (score >= 0.8) {
    return new vscode.ThemeIcon(
      "verified-filled",
      new vscode.ThemeColor("testing.iconPassed"),
    );
  }
  if (score >= 0.5) {
    return new vscode.ThemeIcon(
      "unverified",
      new vscode.ThemeColor("editorWarning.foreground"),
    );
  }
  return new vscode.ThemeIcon(
    "circle-slash",
    new vscode.ThemeColor("testing.iconFailed"),
  );
}
