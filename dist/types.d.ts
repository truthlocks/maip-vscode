/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Shared TypeScript types for the MAIP VS Code extension.
 * Mirrors the canonical MAIP API types from packages/maip-mcp-server/src/types.ts.
 */
export type AgentType = "service" | "pipeline" | "model" | "tool";
export type AgentStatus = "active" | "suspended" | "revoked";
export type TrustLevel = "system" | "delegated" | "ephemeral";
export interface AgentIdentity {
    readonly id: string;
    readonly tenant_id: string;
    readonly agent_id: string;
    readonly display_name: string;
    readonly trust_level: TrustLevel;
    readonly parent_agent_id: string | null;
    readonly genesis_attestation_id: string;
    readonly genesis_public_key: string;
    readonly status: AgentStatus;
    readonly capabilities: readonly string[];
    readonly max_delegation_depth: number;
    readonly metadata?: Record<string, unknown>;
    readonly created_at: string;
    readonly updated_at: string;
    readonly revoked_at: string | null;
}
export interface RegisterAgentRequest {
    readonly name: string;
    readonly type: AgentType;
    readonly capabilities?: readonly string[];
    readonly metadata?: Record<string, unknown>;
}
export interface RegisterAgentResponse {
    readonly agent: AgentIdentity;
    readonly trust_score: number;
}
export interface ListAgentsParams {
    readonly status?: AgentStatus;
    readonly type?: AgentType;
    readonly trust_score_min?: number;
    readonly trust_score_max?: number;
    readonly limit?: number;
    readonly offset?: number;
}
export type ReceiptType = "action" | "ml_pipeline" | "data_versioning" | "delegation" | "audit";
export type ReceiptStatus = "PENDING" | "COMPLETE" | "FAILED";
export interface Receipt {
    readonly id: string;
    readonly tenant_id: string;
    readonly agent_id: string;
    readonly action: string;
    readonly receipt_type: ReceiptType;
    readonly payload: Record<string, unknown>;
    readonly inputs_hash: string;
    readonly outputs_hash: string;
    readonly delegation_chain_hash: string;
    readonly attestation_id: string;
    readonly previous_receipt_id: string | null;
    readonly status: ReceiptStatus;
    readonly duration_ms: number | null;
    readonly error_code: string | null;
    readonly created_at: string;
    readonly updated_at: string;
}
export interface CreateReceiptRequest {
    readonly action: string;
    readonly agent_id: string;
    readonly payload: Record<string, unknown>;
    readonly receipt_type?: ReceiptType;
}
export interface VerifyReceiptResponse {
    readonly valid: boolean;
    readonly verdict: string;
    readonly details: string;
    readonly warnings: readonly string[];
}
export interface ListReceiptsParams {
    readonly agent_id?: string;
    readonly receipt_type?: ReceiptType;
    readonly status?: ReceiptStatus;
    readonly from?: string;
    readonly to?: string;
    readonly limit?: number;
    readonly offset?: number;
}
export interface TrustScoreComponents {
    readonly reputation: number;
    readonly key_health: number;
    readonly delegation_depth: number;
    readonly verification_history: number;
    readonly multi_witness: number;
    readonly anomaly_penalty: number;
}
export interface TrustScore {
    readonly agent_id: string;
    readonly trust_level: string;
    readonly trust_score: number;
    readonly score_components: TrustScoreComponents;
    readonly trust_ceiling: number;
    readonly delegation_depth: number;
    readonly computed_at: string;
    readonly valid_until: string;
}
export interface TrustHistoryEntry {
    readonly trust_score: number;
    readonly score_components: TrustScoreComponents;
    readonly computed_at: string;
    readonly event_type: string;
    readonly event_detail: string;
}
export type DelegationStatus = "active" | "expired" | "revoked";
export interface Delegation {
    readonly id: string;
    readonly tenant_id: string;
    readonly parent_agent_id: string;
    readonly child_agent_id: string;
    readonly depth: number;
    readonly scopes: readonly string[];
    readonly max_depth: number;
    readonly expires_at: string | null;
    readonly constraints: Record<string, unknown>;
    readonly delegation_attestation_id: string;
    readonly status: DelegationStatus;
    readonly created_at: string;
    readonly updated_at: string;
    readonly revoked_at: string | null;
}
export interface CreateDelegationRequest {
    readonly parent_agent_id: string;
    readonly child_agent_id: string;
    readonly scopes: readonly string[];
    readonly max_depth?: number;
    readonly expires_at?: string;
    readonly constraints?: Record<string, unknown>;
}
export interface VerifyDelegationChainResponse {
    readonly valid: boolean;
    readonly verdict: string;
    readonly chain_depth: number;
    readonly chain: readonly Delegation[];
    readonly warnings: readonly string[];
}
export interface ListDelegationsParams {
    readonly parent_agent_id?: string;
    readonly child_agent_id?: string;
    readonly status?: DelegationStatus;
    readonly limit?: number;
    readonly offset?: number;
}
export interface AuditLogEntry {
    readonly id: string;
    readonly tenant_id: string;
    readonly event_type: string;
    readonly agent_id: string;
    readonly resource_type: string;
    readonly resource_id: string;
    readonly details: Record<string, unknown>;
    readonly created_at: string;
}
export interface AuditReport {
    readonly report_id: string;
    readonly tenant_id: string;
    readonly generated_at: string;
    readonly period_start: string;
    readonly period_end: string;
    readonly total_agents: number;
    readonly total_receipts: number;
    readonly total_delegations: number;
    readonly agents_by_status: Record<AgentStatus, number>;
    readonly receipts_by_type: Record<string, number>;
    readonly trust_distribution: readonly {
        range: string;
        count: number;
    }[];
    readonly anomalies: readonly AuditLogEntry[];
}
export interface ExportAuditReportParams {
    readonly from: string;
    readonly to: string;
    readonly include_anomalies?: boolean;
}
export interface MAIPConfig {
    readonly apiUrl: string;
    readonly apiKey: string;
    readonly tenantId: string;
    readonly timeoutMs?: number;
    readonly maxRetries?: number;
}
export interface PaginatedResponse<T> {
    readonly data: readonly T[];
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
}
export interface ApiError {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, unknown>;
}
export interface ReceiptGroupByDate {
    readonly date: string;
    readonly receipts: readonly Receipt[];
}
export interface AgentGroupByStatus {
    readonly status: AgentStatus;
    readonly agents: readonly AgentWithTrust[];
}
export interface AgentWithTrust {
    readonly agent: AgentIdentity;
    readonly trustScore: number;
}
export interface AutoReceiptMetadata {
    readonly source: "git-commit" | "file-save" | "terminal";
    readonly workspaceFolder: string;
    readonly timestamp: string;
}
//# sourceMappingURL=types.d.ts.map