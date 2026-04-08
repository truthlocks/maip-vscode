"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Auto-generate receipt on git commit.
 * Listens to the VS Code Git extension's repository state changes
 * and creates a MAIP receipt for each detected commit.
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
exports.GitHookAutoReceipt = void 0;
const vscode = __importStar(require("vscode"));
const crypto = __importStar(require("crypto"));
const config_1 = require("../config");
class GitHookAutoReceipt {
    client;
    disposables = [];
    lastKnownCommit;
    constructor(client) {
        this.client = client;
        this.initializeGitWatcher();
    }
    initializeGitWatcher() {
        const gitExtension = vscode.extensions.getExtension("vscode.git");
        if (!gitExtension) {
            return;
        }
        const activate = async () => {
            if (!gitExtension.isActive) {
                await gitExtension.activate();
            }
            const git = gitExtension.exports.getAPI(1);
            for (const repo of git.repositories) {
                this.watchRepository(repo);
            }
            this.disposables.push(git.onDidOpenRepository((repo) => {
                this.watchRepository(repo);
            }));
        };
        activate().catch(() => {
            /* Git extension may not be available; fail silently */
        });
    }
    watchRepository(repo) {
        this.lastKnownCommit = repo.state.HEAD?.commit;
        this.disposables.push(repo.onDidChangeState(() => {
            this.onRepositoryStateChange(repo).catch(() => {
                /* best-effort */
            });
        }));
    }
    async onRepositoryStateChange(repo) {
        if (!(0, config_1.isConfigured)() || !(0, config_1.isAutoReceiptOnCommitEnabled)()) {
            return;
        }
        const agentId = (0, config_1.getAgentId)();
        if (!agentId) {
            return;
        }
        const currentCommit = repo.state.HEAD?.commit;
        if (!currentCommit || currentCommit === this.lastKnownCommit) {
            return;
        }
        const previousCommit = this.lastKnownCommit;
        this.lastKnownCommit = currentCommit;
        const branchName = repo.state.HEAD?.name ?? "unknown";
        const workspaceFolder = repo.rootUri.fsPath;
        const commitHash = crypto.createHash("sha256").update(currentCommit, "utf8").digest("hex");
        try {
            const receipt = await this.client.createReceipt({
                action: "git-commit",
                agent_id: agentId,
                receipt_type: "action",
                payload: {
                    commit_hash: currentCommit,
                    commit_hash_sha256: commitHash,
                    branch: branchName,
                    previous_commit: previousCommit ?? null,
                    workspace_folder: workspaceFolder,
                    source: "vscode-auto-receipt",
                    timestamp: new Date().toISOString(),
                },
            });
            vscode.window.showInformationMessage(`MAIP: Receipt created for commit ${currentCommit.substring(0, 8)} (${receipt.id.substring(0, 8)})`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            vscode.window.showWarningMessage(`MAIP: Failed to create auto-receipt for commit: ${message}`);
        }
    }
    dispose() {
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
exports.GitHookAutoReceipt = GitHookAutoReceipt;
//# sourceMappingURL=git-hook.js.map