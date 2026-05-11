/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Auto-generate receipt on git commit.
 * Listens to the VS Code Git extension's repository state changes
 * and creates a MAIP receipt for each detected commit.
 */

import * as vscode from "vscode";
import * as crypto from "crypto";
import type { MAIPClient } from "../client";
import {
  isConfigured,
  getAgentId,
  isAutoReceiptOnCommitEnabled,
} from "../config";

interface GitExtension {
  readonly getAPI: (version: number) => GitAPI;
}

interface GitAPI {
  readonly repositories: readonly GitRepository[];
  readonly onDidOpenRepository: vscode.Event<GitRepository>;
}

interface GitRepository {
  readonly state: GitRepositoryState;
  readonly rootUri: vscode.Uri;
  readonly onDidChangeState: vscode.Event<void>;
}

interface GitRepositoryState {
  readonly HEAD:
    | { readonly commit?: string; readonly name?: string }
    | undefined;
  readonly workingTreeChanges: readonly GitChange[];
  readonly indexChanges: readonly GitChange[];
}

interface GitChange {
  readonly uri: vscode.Uri;
  readonly status: number;
}

export class GitHookAutoReceipt implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private lastKnownCommit: string | undefined;

  constructor(private readonly client: MAIPClient) {
    this.initializeGitWatcher();
  }

  private initializeGitWatcher(): void {
    const gitExtension =
      vscode.extensions.getExtension<GitExtension>("vscode.git");
    if (!gitExtension) {
      return;
    }

    const activate = async (): Promise<void> => {
      if (!gitExtension.isActive) {
        await gitExtension.activate();
      }

      const git = gitExtension.exports.getAPI(1);

      for (const repo of git.repositories) {
        this.watchRepository(repo);
      }

      this.disposables.push(
        git.onDidOpenRepository((repo) => {
          this.watchRepository(repo);
        }),
      );
    };

    activate().catch(() => {
      /* Git extension may not be available; fail silently */
    });
  }

  private watchRepository(repo: GitRepository): void {
    this.lastKnownCommit = repo.state.HEAD?.commit;

    this.disposables.push(
      repo.onDidChangeState(() => {
        this.onRepositoryStateChange(repo).catch(() => {
          /* best-effort */
        });
      }),
    );
  }

  private async onRepositoryStateChange(repo: GitRepository): Promise<void> {
    if (!isConfigured() || !isAutoReceiptOnCommitEnabled()) {
      return;
    }

    const agentId = getAgentId();
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

    const commitHash = crypto
      .createHash("sha256")
      .update(currentCommit, "utf8")
      .digest("hex");

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

      vscode.window.showInformationMessage(
        `MAIP: Receipt created for commit ${currentCommit.substring(0, 8)} (${receipt.id.substring(0, 8)})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showWarningMessage(
        `MAIP: Failed to create auto-receipt for commit: ${message}`,
      );
    }
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
