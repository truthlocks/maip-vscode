"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * TreeDataProvider for the agent list sidebar.
 * Groups agents by status (active, suspended, revoked) with trust score badges.
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
exports.AgentTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const config_1 = require("../config");
class AgentStatusGroup {
    status;
    agents;
    constructor(status, agents) {
        this.status = status;
        this.agents = agents;
    }
}
class AgentItem {
    data;
    constructor(data) {
        this.data = data;
    }
}
const STATUS_ORDER = ["active", "suspended", "revoked"];
class AgentTreeProvider {
    client;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    agents = [];
    isLoading = false;
    constructor(client) {
        this.client = client;
    }
    refresh() {
        this.agents = [];
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        if (element instanceof AgentStatusGroup) {
            const item = new vscode.TreeItem(capitalize(element.status), element.status === "active"
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.Collapsed);
            item.description = `${element.agents.length} agent${element.agents.length === 1 ? "" : "s"}`;
            item.iconPath = statusGroupIcon(element.status);
            item.contextValue = "agentStatusGroup";
            return item;
        }
        const { agent, trustScore } = element.data;
        const item = new vscode.TreeItem(agent.display_name, vscode.TreeItemCollapsibleState.None);
        item.description = `${agent.agent_id.substring(0, 8)} | Trust: ${trustScore.toFixed(2)}`;
        item.tooltip = new vscode.MarkdownString(`**${agent.display_name}**\n\n` +
            `- **ID:** \`${agent.agent_id}\`\n` +
            `- **Type:** ${agent.trust_level}\n` +
            `- **Status:** ${agent.status}\n` +
            `- **Trust Score:** ${trustScore.toFixed(4)}\n` +
            `- **Capabilities:** ${agent.capabilities.length > 0 ? agent.capabilities.join(", ") : "none"}\n` +
            `- **Delegation Depth:** ${agent.max_delegation_depth}\n` +
            `- **Created:** ${agent.created_at}\n`);
        item.iconPath = trustScoreIcon(trustScore);
        item.contextValue = agent.status === "active" ? "agentActive" : "agent";
        item.command = {
            command: "maip.showTrustScore",
            title: "Show Trust Score",
            arguments: [agent.agent_id],
        };
        return item;
    }
    async getChildren(element) {
        if (!(0, config_1.isConfigured)()) {
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
    async getStatusGroups() {
        if (this.agents.length === 0 && !this.isLoading) {
            await this.loadAgents();
        }
        const grouped = new Map();
        for (const status of STATUS_ORDER) {
            grouped.set(status, []);
        }
        for (const agent of this.agents) {
            const list = grouped.get(agent.agent.status);
            if (list) {
                list.push(agent);
            }
        }
        return STATUS_ORDER
            .map((status) => new AgentStatusGroup(status, grouped.get(status) ?? []))
            .filter((g) => g.agents.length > 0);
    }
    async loadAgents() {
        this.isLoading = true;
        try {
            const result = await this.client.listAgents({ limit: 200 });
            const agentsWithTrust = [];
            const trustPromises = result.data.map(async (agent) => {
                try {
                    const trust = await this.client.getTrustScore(agent.agent_id);
                    return { agent, trustScore: trust.trust_score };
                }
                catch {
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
        }
        catch {
            this.agents = [];
        }
        finally {
            this.isLoading = false;
        }
    }
}
exports.AgentTreeProvider = AgentTreeProvider;
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function statusGroupIcon(status) {
    switch (status) {
        case "active":
            return new vscode.ThemeIcon("check-all", new vscode.ThemeColor("testing.iconPassed"));
        case "suspended":
            return new vscode.ThemeIcon("warning", new vscode.ThemeColor("editorWarning.foreground"));
        case "revoked":
            return new vscode.ThemeIcon("circle-slash", new vscode.ThemeColor("testing.iconFailed"));
    }
}
function trustScoreIcon(score) {
    if (score >= 0.8) {
        return new vscode.ThemeIcon("verified-filled", new vscode.ThemeColor("testing.iconPassed"));
    }
    if (score >= 0.5) {
        return new vscode.ThemeIcon("unverified", new vscode.ThemeColor("editorWarning.foreground"));
    }
    return new vscode.ThemeIcon("circle-slash", new vscode.ThemeColor("testing.iconFailed"));
}
//# sourceMappingURL=agent-tree.js.map