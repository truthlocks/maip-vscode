/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Monitor terminal for CI/CD commands and generate receipts.
 * Detects common CI/CD patterns (npm publish, docker push, deploy commands)
 * and auto-generates receipts for them.
 */

import * as vscode from "vscode";
import * as crypto from "crypto";
import type { MAIPClient } from "../client";
import { isConfigured, getAgentId } from "../config";

const CI_CD_PATTERNS: readonly { pattern: RegExp; action: string }[] = [
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
] as const;

export class TerminalAutoReceipt implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly client: MAIPClient) {
    this.disposables.push(
      vscode.window.onDidStartTerminalShellExecution((event) => {
        this.onTerminalExecution(event).catch(() => {
          /* best-effort */
        });
      }),
    );
  }

  private async onTerminalExecution(
    event: vscode.TerminalShellExecutionStartEvent,
  ): Promise<void> {
    if (!isConfigured()) {
      return;
    }

    const agentId = getAgentId();
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

      vscode.window.showInformationMessage(
        `MAIP: Receipt created for ${matchedPattern.action} (${receipt.id.substring(0, 8)})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showWarningMessage(
        `MAIP: Failed to create terminal receipt: ${message}`,
      );
    }
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
