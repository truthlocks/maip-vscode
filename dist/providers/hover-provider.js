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
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const CACHE_TTL_MS = 60_000;
class MAIPHoverProvider {
    client;
    hoverCache = new Map();
    constructor(client) {
        this.client = client;
    }
    async provideHover(document, position, _token) {
        if (!(0, config_1.isConfigured)()) {
            return undefined;
        }
        const range = document.getWordRangeAtPosition(position, UUID_REGEX);
        if (!range) {
            return undefined;
        }
        const uuid = document.getText(range).toLowerCase();
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
                parts.push(`### MAIP Agent: ${a.display_name}\n`, `| Field | Value |`, `|---|---|`, `| **ID** | \`${a.agent_id}\` |`, `| **Status** | ${a.status} |`, `| **Trust Level** | ${a.trust_level} |`, `| **Capabilities** | ${a.capabilities.length > 0 ? a.capabilities.join(", ") : "none"} |`, `| **Max Delegation** | ${a.max_delegation_depth} |`, `| **Created** | ${a.created_at} |`);
            }
            if (trustScore.status === "fulfilled") {
                const t = trustScore.value;
                const scoreBar = renderScoreBar(t.trust_score);
                parts.push(`\n### Trust Score\n`, `${scoreBar} **${t.trust_score.toFixed(4)}** / ${t.trust_ceiling.toFixed(2)}\n`, `| Component | Score |`, `|---|---|`, `| Reputation | ${t.score_components.reputation.toFixed(3)} |`, `| Key Health | ${t.score_components.key_health.toFixed(3)} |`, `| Delegation Depth | ${t.score_components.delegation_depth.toFixed(3)} |`, `| Verification History | ${t.score_components.verification_history.toFixed(3)} |`, `| Multi-Witness | ${t.score_components.multi_witness.toFixed(3)} |`, `| Anomaly Penalty | ${t.score_components.anomaly_penalty.toFixed(3)} |`);
            }
            if (parts.length === 0) {
                return undefined;
            }
            parts.push(`\n---\n`, `[View Trust Dashboard](command:maip.showTrustScore?${encodeURIComponent(JSON.stringify(uuid))})`);
            const markdown = new vscode.MarkdownString(parts.join("\n"));
            markdown.isTrusted = true;
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
    const filled = Math.round(score * 10);
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
//# sourceMappingURL=hover-provider.js.map