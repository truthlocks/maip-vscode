"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Monitor terminal for CI/CD commands and generate receipts.
 * Detects common CI/CD patterns (npm publish, docker push, deploy commands)
 * and auto-generates receipts for them.
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
exports.TerminalAutoReceipt = void 0;
const vscode = __importStar(require("vscode"));
const crypto = __importStar(require("crypto"));
const config_1 = require("../config");
const CI_CD_PATTERNS = [
    { pattern: /npm\s+publish/, action: "npm-publish" },
    { pattern: /yarn\s+publish/, action: "yarn-publish" },
    { pattern: /docker\s+push/, action: "docker-push" },
    { pattern: /docker\s+build/, action: "docker-build" },
    { pattern: /kubectl\s+apply/, action: "k8s-apply" },
    { pattern: /kubectl\s+deploy/, action: "k8s-deploy" },
    { pattern: /terraform\s+apply/, action: "terraform-apply" },
    { pattern: /terraform\s+plan/, action: "terraform-plan" },
    { pattern: /aws\s+deploy/, action: "aws-deploy" },
    { pattern: /aws\s+ecs\s+update-service/, action: "ecs-update" },
    { pattern: /cdk\s+deploy/, action: "cdk-deploy" },
    { pattern: /sam\s+deploy/, action: "sam-deploy" },
    { pattern: /gh\s+release\s+create/, action: "gh-release" },
    { pattern: /git\s+push/, action: "git-push" },
    { pattern: /make\s+deploy/, action: "make-deploy" },
];
class TerminalAutoReceipt {
    client;
    disposables = [];
    constructor(client) {
        this.client = client;
        this.disposables.push(vscode.window.onDidStartTerminalShellExecution((event) => {
            this.onTerminalExecution(event).catch(() => {
                /* best-effort */
            });
        }));
    }
    async onTerminalExecution(event) {
        if (!(0, config_1.isConfigured)()) {
            return;
        }
        const agentId = (0, config_1.getAgentId)();
        if (!agentId) {
            return;
        }
        const commandLine = event.execution.commandLine.value;
        if (!commandLine) {
            return;
        }
        const matchedPattern = CI_CD_PATTERNS.find((p) => p.pattern.test(commandLine));
        if (!matchedPattern) {
            return;
        }
        const commandHash = crypto
            .createHash("sha256")
            .update(commandLine, "utf8")
            .digest("hex");
        try {
            const receipt = await this.client.createReceipt({
                action: matchedPattern.action,
                agent_id: agentId,
                receipt_type: "action",
                payload: {
                    command_hash: commandHash,
                    command_pattern: matchedPattern.action,
                    terminal_name: event.terminal.name,
                    source: "vscode-terminal-auto-receipt",
                    timestamp: new Date().toISOString(),
                },
            });
            vscode.window.showInformationMessage(`MAIP: Receipt created for ${matchedPattern.action} (${receipt.id.substring(0, 8)})`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showWarningMessage(`MAIP: Failed to create terminal receipt: ${message}`);
        }
    }
    dispose() {
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
exports.TerminalAutoReceipt = TerminalAutoReceipt;
//# sourceMappingURL=terminal.js.map