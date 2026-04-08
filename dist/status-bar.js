"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Status bar item showing MAIP connection status and trust score.
 * Left-aligned. Click opens the trust dashboard webview.
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
exports.MAIPStatusBar = void 0;
const vscode = __importStar(require("vscode"));
const config_1 = require("./config");
const POLL_INTERVAL_MS = 60_000;
class MAIPStatusBar {
    client;
    statusBarItem;
    disposables = [];
    pollTimer;
    _lastTrustScore;
    get lastTrustScore() {
        return this._lastTrustScore;
    }
    constructor(client) {
        this.client = client;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = "maip.showTrustScore";
        this.disposables.push(this.statusBarItem);
        this.disposables.push(vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("maip.apiKey") ||
                event.affectsConfiguration("maip.tenantId") ||
                event.affectsConfiguration("maip.agentId")) {
                this.updateStatus();
            }
        }));
        this.updateStatus();
        this.startPolling();
        this.statusBarItem.show();
    }
    startPolling() {
        this.pollTimer = setInterval(() => {
            this.updateStatus();
        }, POLL_INTERVAL_MS);
    }
    updateStatus() {
        if (!(0, config_1.isConfigured)()) {
            this.statusBarItem.text = "$(shield) MAIP: Not Configured";
            this.statusBarItem.tooltip = "Click to configure MAIP settings";
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.command = {
                command: "workbench.action.openSettings",
                title: "Open MAIP Settings",
                arguments: ["maip"],
            };
            return;
        }
        const agentId = (0, config_1.getAgentId)();
        if (!agentId) {
            this.statusBarItem.text = "$(shield) MAIP: No Agent";
            this.statusBarItem.tooltip = "No agent configured. Register one or set an agent ID.";
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.command = "maip.registerAgent";
            return;
        }
        this.statusBarItem.command = "maip.showTrustScore";
        this.fetchTrustScore(agentId).catch(() => {
            this.statusBarItem.text = "$(shield) MAIP: Disconnected";
            this.statusBarItem.tooltip = "Unable to connect to MAIP API";
            this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        });
    }
    async fetchTrustScore(agentId) {
        try {
            const trustScore = await this.client.getTrustScore(agentId);
            this._lastTrustScore = trustScore.trust_score;
            const score = trustScore.trust_score;
            const scoreDisplay = (score * 100).toFixed(0);
            let icon;
            if (score >= 0.8) {
                icon = "$(verified-filled)";
                this.statusBarItem.backgroundColor = undefined;
            }
            else if (score >= 0.5) {
                icon = "$(unverified)";
                this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
            }
            else {
                icon = "$(circle-slash)";
                this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
            }
            this.statusBarItem.text = `${icon} MAIP: ${scoreDisplay}`;
            this.statusBarItem.tooltip = new vscode.MarkdownString(`**MAIP Connected**\n\n` +
                `- Agent: \`${agentId.substring(0, 8)}...\`\n` +
                `- Trust Score: ${score.toFixed(4)}\n` +
                `- Level: ${trustScore.trust_level}\n` +
                `- Computed: ${trustScore.computed_at}\n\n` +
                `Click to open Trust Dashboard`);
        }
        catch {
            this.statusBarItem.text = "$(shield) MAIP: Disconnected";
            this.statusBarItem.tooltip = "Unable to connect to MAIP API. Check your settings.";
            this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        }
    }
    dispose() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
exports.MAIPStatusBar = MAIPStatusBar;
//# sourceMappingURL=status-bar.js.map