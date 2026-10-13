/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * MAIP API client for the VS Code extension.
 * Uses native fetch (Node 18+ built into VS Code runtime).
 * Implements retry with exponential backoff on 429/5xx.
 */
import type { MAIPConfig, ApiError, AgentIdentity, RegisterAgentRequest, RegisterAgentResponse, ListAgentsParams, Receipt, CreateReceiptRequest, VerifyReceiptResponse, ListReceiptsParams, TrustScore, TrustHistoryEntry, Delegation, ListDelegationsParams, CreateDelegationRequest, VerifyDelegationChainResponse, AgentEvidenceSnapshot, PaginatedResponse } from "./types";
export declare class MAIPApiError extends Error {
    readonly statusCode: number;
    readonly errorCode: string;
    readonly details: Record<string, unknown> | undefined;
    constructor(statusCode: number, apiError: ApiError);
}
export declare class MAIPNetworkError extends Error {
    readonly cause: unknown;
    constructor(message: string, cause: unknown);
}
export declare class MAIPClient {
    private config;
    private maxRetries;
    private timeoutMs;
    constructor(config: MAIPConfig);
    updateConfig(config: MAIPConfig): void;
    registerAgent(request: RegisterAgentRequest): Promise<RegisterAgentResponse>;
    getAgent(agentId: string): Promise<AgentIdentity>;
    listAgents(params?: ListAgentsParams): Promise<PaginatedResponse<AgentIdentity>>;
    suspendAgent(agentId: string): Promise<AgentIdentity>;
    revokeAgent(agentId: string): Promise<AgentIdentity>;
    createReceipt(request: CreateReceiptRequest): Promise<Receipt>;
    getReceipt(receiptId: string): Promise<Receipt>;
    verifyReceipt(receiptId: string): Promise<VerifyReceiptResponse>;
    resolveReceiptId(receipt: Receipt): string;
    listReceipts(params?: ListReceiptsParams): Promise<PaginatedResponse<Receipt>>;
    getTrustScore(agentId: string): Promise<TrustScore>;
    getTrustHistory(agentId: string, limit?: number): Promise<readonly TrustHistoryEntry[]>;
    createDelegation(request: CreateDelegationRequest): Promise<Delegation>;
    listDelegations(params?: ListDelegationsParams): Promise<PaginatedResponse<Delegation>>;
    verifyDelegationChain(agentId: string): Promise<VerifyDelegationChainResponse>;
    exportAuditReport(agentId: string): Promise<AgentEvidenceSnapshot>;
    private request;
    private buildUrl;
    private calculateDelay;
    private sleep;
}
//# sourceMappingURL=client.d.ts.map