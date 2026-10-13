/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Extension configuration loaded from VS Code workspace settings.
 */

import * as vscode from "vscode";
import { storedConnection } from "./credentials";
import type { MAIPConfig } from "./types";

const SECTION = "maip";

export function getConfig(): MAIPConfig {
  const cfg = vscode.workspace.getConfiguration(SECTION);

  let connection = { apiKey: "", apiUrl: "https://sandbox-api.truthlocks.com/v1" };
  try {
    connection = storedConnection(cfg.get<string>("apiUrl", connection.apiUrl));
  } catch {
    // Keep setup commands available after an invalid legacy/workspace setting.
    // Never attach a saved key to the fallback endpoint.
  }
  const { apiKey, apiUrl } = connection;

  return {
    apiUrl,
    apiKey,
    tenantId: cfg.get<string>("tenantId", ""),
    timeoutMs: 30_000,
    maxRetries: 3,
  };
}

export function getAgentId(): string {
  return vscode.workspace.getConfiguration(SECTION).get<string>("agentId", "");
}

export type SigningAlgorithm =
  | "ES256"
  | "ES384"
  | "ES512"
  | "RS256"
  | "RS384"
  | "RS512"
  | "PS256"
  | "PS384"
  | "PS512"
  | "Ed25519";

export function getSigningAlgorithm(): SigningAlgorithm {
  return vscode.workspace
    .getConfiguration(SECTION)
    .get<SigningAlgorithm>("signingAlgorithm", "Ed25519");
}

export function isAutoReceiptOnSaveEnabled(): boolean {
  return vscode.workspace
    .getConfiguration(SECTION)
    .get<boolean>("autoReceiptOnSave", false);
}

export function isAutoReceiptOnCommitEnabled(): boolean {
  return vscode.workspace
    .getConfiguration(SECTION)
    .get<boolean>("autoReceiptOnCommit", false);
}

export function isShowTrustBadgesEnabled(): boolean {
  return vscode.workspace
    .getConfiguration(SECTION)
    .get<boolean>("showTrustBadges", true);
}

export function isConfigured(): boolean {
  const cfg = getConfig();
  if (cfg.apiKey.length === 0) {
    return false;
  }
  if (cfg.apiKey.startsWith("tl_live_") || cfg.apiKey.startsWith("tl_test_")) {
    return true;
  }
  return cfg.tenantId.length > 0;
}
