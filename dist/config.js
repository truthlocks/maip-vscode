"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Extension configuration loaded from VS Code workspace settings.
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
exports.getConfig = getConfig;
exports.getAgentId = getAgentId;
exports.getSigningAlgorithm = getSigningAlgorithm;
exports.isAutoReceiptOnSaveEnabled = isAutoReceiptOnSaveEnabled;
exports.isAutoReceiptOnCommitEnabled = isAutoReceiptOnCommitEnabled;
exports.isShowTrustBadgesEnabled = isShowTrustBadgesEnabled;
exports.isConfigured = isConfigured;
const vscode = __importStar(require("vscode"));
const credentials_1 = require("./credentials");
const SECTION = "maip";
function getConfig() {
    const cfg = vscode.workspace.getConfiguration(SECTION);
    let connection = { apiKey: "", apiUrl: "https://sandbox-api.truthlocks.com/v1" };
    try {
        connection = (0, credentials_1.storedConnection)(cfg.get("apiUrl", connection.apiUrl));
    }
    catch {
        // Keep setup commands available after an invalid legacy/workspace setting.
        // Never attach a saved key to the fallback endpoint.
    }
    const { apiKey, apiUrl } = connection;
    return {
        apiUrl,
        apiKey,
        tenantId: cfg.get("tenantId", ""),
        timeoutMs: 30_000,
        maxRetries: 3,
    };
}
function getAgentId() {
    return vscode.workspace.getConfiguration(SECTION).get("agentId", "");
}
function getSigningAlgorithm() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get("signingAlgorithm", "Ed25519");
}
function isAutoReceiptOnSaveEnabled() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get("autoReceiptOnSave", false);
}
function isAutoReceiptOnCommitEnabled() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get("autoReceiptOnCommit", false);
}
function isShowTrustBadgesEnabled() {
    return vscode.workspace
        .getConfiguration(SECTION)
        .get("showTrustBadges", true);
}
function isConfigured() {
    const cfg = getConfig();
    if (cfg.apiKey.length === 0) {
        return false;
    }
    if (cfg.apiKey.startsWith("tl_live_") || cfg.apiKey.startsWith("tl_test_")) {
        return true;
    }
    return cfg.tenantId.length > 0;
}
//# sourceMappingURL=config.js.map