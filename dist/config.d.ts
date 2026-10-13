/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Extension configuration loaded from VS Code workspace settings.
 */
import type { MAIPConfig } from "./types";
export declare function getConfig(): MAIPConfig;
export declare function getAgentId(): string;
export type SigningAlgorithm = "ES256" | "ES384" | "ES512" | "RS256" | "RS384" | "RS512" | "PS256" | "PS384" | "PS512" | "Ed25519";
export declare function getSigningAlgorithm(): SigningAlgorithm;
export declare function isAutoReceiptOnSaveEnabled(): boolean;
export declare function isAutoReceiptOnCommitEnabled(): boolean;
export declare function isShowTrustBadgesEnabled(): boolean;
export declare function isConfigured(): boolean;
//# sourceMappingURL=config.d.ts.map