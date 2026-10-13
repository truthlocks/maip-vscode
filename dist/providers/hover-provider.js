"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * HoverProvider for showing receipt and agent info when hovering
 * over agent ID patterns (UUID format) in the editor.
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
exports.MAIPHoverProvider = void 0;
const vscode = __importStar(require("vscode"));
const config_1 = require("../config");
const AGENT_REGEX = /maip:[a-z0-9]{8}:[a-z0-9]{26}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const CACHE_TTL_MS = 60_000;
class MAIPHoverProvider {
    client;
    hoverCache = new Map();
    constructor(client) {
        this.client = client;
    }
    clearCache() { this.hoverCache.clear(); }
    async provideHover(document, position, _token) {
        if (!(0, config_1.isConfigured)()) {
            return undefined;
        }
        const range = document.getWordRangeAtPosition(position, AGENT_REGEX);
        if (!range) {
            return undefined;
        }
        const uuid = document.getText(range);
        const now = Date.now();
        const cached = this.hoverCache.get(uuid);
        if (cached && cached.expiresAt > now) {
            return new vscode.Hover(cached.markdown, range);
        }
        try {
            const [agent, trustScore] = await Promise.allSettled([
                this.client.getAgent(uuid),
                this.client.getTrustScore(uuid),
            ]);
            const parts = [];
            if (agent.status === "fulfilled") {
                const a = agent.value;
                parts.push(`### MAIP Agent: ${escapeMarkdown(a.display_name)}\n`, `- ID: ${escapeMarkdown(a.agent_id)}`, `- Status: ${escapeMarkdown(a.status)}`, `- Trust level: ${escapeMarkdown(a.trust_level)}`, `- Scopes: ${escapeMarkdown((a.scopes ?? a.capabilities ?? []).join(", ") || "none")}`, `- Delegation depth: ${a.delegation_depth ?? a.max_delegation_depth ?? "Not provided"}`, `- Created: ${escapeMarkdown(a.created_at)}`);
            }
            if (trustScore.status === "fulfilled") {
                const t = trustScore.value;
                parts.push(`\n### Trust Score\n`, `${renderScoreBar(t.trust_score)} **${t.trust_score.toFixed(4)}** / 1`);
                const factors = Object.entries(t.factors ?? t.score_components ?? {});
                for (const [name, value] of factors) {
                    parts.push(`- ${escapeMarkdown(name)}: ${escapeMarkdown(typeof value === "number" ? value.toFixed(3) : JSON.stringify(value))}`);
                }
                if (!factors.length)
                    parts.push("No score factors were provided by the service.");
            }
            if (parts.length === 0) {
                return undefined;
            }
            parts.push(`\n---\n`, `[View Trust Dashboard](command:maip.showTrustScore?${encodeURIComponent(JSON.stringify(uuid))})`);
            const markdown = new vscode.MarkdownString(parts.join("\n"));
            markdown.isTrusted = { enabledCommands: ["maip.showTrustScore"] };
            markdown.supportHtml = false;
            this.hoverCache.set(uuid, { markdown, expiresAt: now + CACHE_TTL_MS });
            return new vscode.Hover(markdown, range);
        }
        catch {
            return undefined;
        }
    }
}
exports.MAIPHoverProvider = MAIPHoverProvider;
function renderScoreBar(score) {
    const filled = Math.round(Math.max(0, Math.min(1, Number.isFinite(score) ? score : 0)) * 10);
    const empty = 10 - filled;
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
    if (score >= 0.8) {
        return bar;
    }
    if (score >= 0.5) {
        return bar;
    }
    return bar;
}
function escapeMarkdown(value) {
    return String(value ?? "").replace(/[\\`*_{}[\]()<>#+.!|~]/g, "\\$&").replace(/[\r\n]/g, " ");
}
//# sourceMappingURL=hover-provider.js.map