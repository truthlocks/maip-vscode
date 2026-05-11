/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Extension configuration loaded from VS Code workspace settings.
 */

import * as vscode from "vscode";
import type { MAIPConfig } from "./types";

const SECTION = "maip";

export function getConfig(): MAIPConfig {
  const cfg = vscode.workspace.getConfiguration(SECTION);

  return {
    apiUrl: cfg
      .get<string>("apiUrl", "https://api.truthlocks.com/v1/machine-identity")
      .replace(/\/+$/, ""),
    apiKey: cfg.get<string>("apiKey", ""),
    tenantId: cfg.get<string>("tenantId", ""),
    timeoutMs: 30_000,
    maxRetries: 3,
  };
}

export function getAgentId(): string {
  return vscode.workspace.getConfiguration(SECTION).get<string>("agentId", "");
}

export function isAutoReceiptOnSaveEnabled(): boolean {
  return vscode.workspace
    .getConfiguration(SECTION)
    .get<boolean>("autoReceiptOnSave", false);
}

export function isAutoReceiptOnCommitEnabled(): boolean {
  return vscode.workspace
    .getConfiguration(SECTION)
    .get<boolean>("autoReceiptOnCommit", true);
}

export function isShowTrustBadgesEnabled(): boolean {
  return vscode.workspace
    .getConfiguration(SECTION)
    .get<boolean>("showTrustBadges", true);
}

export function isConfigured(): boolean {
  const cfg = getConfig();
  return cfg.apiKey.length > 0 && cfg.tenantId.length > 0;
}
