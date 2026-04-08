"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * DecorationProvider for inline trust score badges.
 * Scans documents for agent ID patterns (UUID format) and displays
 * color-coded trust score decorations inline.
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
exports.TrustDecorationProvider = void 0;
const vscode = __importStar(require("vscode"));
const config_1 = require("../config");
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const TRUST_HIGH_DECORATION = vscode.window.createTextEditorDecorationType({
    after: {
        contentText: " [trusted]",
        color: new vscode.ThemeColor("testing.iconPassed"),
        fontStyle: "italic",
        fontWeight: "normal",
    },
});
const TRUST_MEDIUM_DECORATION = vscode.window.createTextEditorDecorationType({
    after: {
        contentText: " [caution]",
        color: new vscode.ThemeColor("editorWarning.foreground"),
        fontStyle: "italic",
        fontWeight: "normal",
    },
});
const TRUST_LOW_DECORATION = vscode.window.createTextEditorDecorationType({
    after: {
        contentText: " [untrusted]",
        color: new vscode.ThemeColor("testing.iconFailed"),
        fontStyle: "italic",
        fontWeight: "normal",
    },
});
const CACHE_TTL_MS = 60_000;
class TrustDecorationProvider {
    client;
    disposables = [];
    scoreCache = new Map();
    decorationTimeout;
    constructor(client) {
        this.client = client;
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) {
                this.triggerUpdateDecorations(editor);
            }
        }), vscode.workspace.onDidChangeTextDocument((event) => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document) {
                this.triggerUpdateDecorations(editor);
            }
        }), vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("maip.showTrustBadges")) {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    this.triggerUpdateDecorations(editor);
                }
            }
        }));
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            this.triggerUpdateDecorations(editor);
        }
    }
    triggerUpdateDecorations(editor) {
        if (this.decorationTimeout) {
            clearTimeout(this.decorationTimeout);
        }
        this.decorationTimeout = setTimeout(() => {
            this.updateDecorations(editor).catch(() => {
                /* swallow — decorations are best-effort */
            });
        }, 500);
    }
    async updateDecorations(editor) {
        if (!(0, config_1.isConfigured)() || !(0, config_1.isShowTrustBadgesEnabled)()) {
            editor.setDecorations(TRUST_HIGH_DECORATION, []);
            editor.setDecorations(TRUST_MEDIUM_DECORATION, []);
            editor.setDecorations(TRUST_LOW_DECORATION, []);
            return;
        }
        const text = editor.document.getText();
        const uuidMatches = [];
        const seenUuids = new Set();
        let match;
        UUID_REGEX.lastIndex = 0;
        while ((match = UUID_REGEX.exec(text)) !== null) {
            const uuid = match[0].toLowerCase();
            if (!seenUuids.has(uuid)) {
                seenUuids.add(uuid);
            }
            const startPos = editor.document.positionAt(match.index);
            const endPos = editor.document.positionAt(match.index + match[0].length);
            uuidMatches.push({ uuid, range: new vscode.Range(startPos, endPos) });
        }
        if (uuidMatches.length === 0) {
            editor.setDecorations(TRUST_HIGH_DECORATION, []);
            editor.setDecorations(TRUST_MEDIUM_DECORATION, []);
            editor.setDecorations(TRUST_LOW_DECORATION, []);
            return;
        }
        const scores = new Map();
        const now = Date.now();
        for (const uuid of seenUuids) {
            const cached = this.scoreCache.get(uuid);
            if (cached && cached.expiresAt > now) {
                scores.set(uuid, cached.score);
                continue;
            }
            try {
                const trustScore = await this.client.getTrustScore(uuid);
                scores.set(uuid, trustScore.trust_score);
                this.scoreCache.set(uuid, {
                    score: trustScore.trust_score,
                    expiresAt: now + CACHE_TTL_MS,
                });
            }
            catch {
                scores.set(uuid, -1);
                this.scoreCache.set(uuid, { score: -1, expiresAt: now + CACHE_TTL_MS });
            }
        }
        const highRanges = [];
        const mediumRanges = [];
        const lowRanges = [];
        for (const { uuid, range } of uuidMatches) {
            const score = scores.get(uuid);
            if (score === undefined || score < 0) {
                continue;
            }
            const decoration = {
                range,
                hoverMessage: new vscode.MarkdownString(`**MAIP Trust Score:** ${score.toFixed(4)}\n\nAgent: \`${uuid}\``),
            };
            if (score >= 0.8) {
                highRanges.push(decoration);
            }
            else if (score >= 0.5) {
                mediumRanges.push(decoration);
            }
            else {
                lowRanges.push(decoration);
            }
        }
        editor.setDecorations(TRUST_HIGH_DECORATION, highRanges);
        editor.setDecorations(TRUST_MEDIUM_DECORATION, mediumRanges);
        editor.setDecorations(TRUST_LOW_DECORATION, lowRanges);
    }
    dispose() {
        if (this.decorationTimeout) {
            clearTimeout(this.decorationTimeout);
        }
        TRUST_HIGH_DECORATION.dispose();
        TRUST_MEDIUM_DECORATION.dispose();
        TRUST_LOW_DECORATION.dispose();
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
exports.TrustDecorationProvider = TrustDecorationProvider;
//# sourceMappingURL=trust-decoration.js.map