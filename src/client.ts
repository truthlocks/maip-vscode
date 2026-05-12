/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * MAIP API client for the VS Code extension.
 * Uses native fetch (Node 18+ built into VS Code runtime).
 * Implements retry with exponential backoff on 429/5xx.
 */

import type {
  MAIPConfig,
  ApiError,
  AgentIdentity,
  RegisterAgentRequest,
  RegisterAgentResponse,
  ListAgentsParams,
  Receipt,
  CreateReceiptRequest,
  VerifyReceiptResponse,
  ListReceiptsParams,
  TrustScore,
  TrustHistoryEntry,
  Delegation,
  ListDelegationsParams,
  CreateDelegationRequest,
  VerifyDelegationChainResponse,
  AuditReport,
  ExportAuditReportParams,
  PaginatedResponse,
} from "./types";

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;

export class MAIPApiError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(statusCode: number, apiError: ApiError) {
    super(apiError.message);
    this.name = "MAIPApiError";
    this.statusCode = statusCode;
    this.errorCode = apiError.code;
    this.details = apiError.details;
  }
}

export class MAIPNetworkError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "MAIPNetworkError";
    this.cause = cause;
  }
}

export class MAIPClient {
  private readonly config: MAIPConfig;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  constructor(config: MAIPConfig) {
    this.config = config;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  // ---------------------------------------------------------------------------
  // Agents
  // ---------------------------------------------------------------------------

  async registerAgent(
    request: RegisterAgentRequest,
  ): Promise<RegisterAgentResponse> {
    const body = {
      display_name: request.name,
      agent_type: request.type,
      scopes: request.capabilities ?? [],
      metadata: request.metadata,
    };
    const agent = await this.request<AgentIdentity>("POST", "/agents", body);
    return {
      agent,
      trust_score:
        (agent as unknown as Record<string, number>).trust_score ?? 0.5,
    };
  }

  async getAgent(agentId: string): Promise<AgentIdentity> {
    return this.request<AgentIdentity>(
      "GET",
      `/agents/${encodeURIComponent(agentId)}`,
    );
  }

  async listAgents(
    params?: ListAgentsParams,
  ): Promise<PaginatedResponse<AgentIdentity>> {
    const raw = await this.request<Record<string, unknown>>(
      "GET",
      "/agents",
      undefined,
      params as Record<string, string | number | boolean | undefined>,
    );
    const agents = (
      Array.isArray(raw)
        ? raw
        : ((raw as Record<string, unknown>).agents ??
          (raw as Record<string, unknown>).data ??
          [])
    ) as AgentIdentity[];
    const total =
      typeof (raw as Record<string, unknown>).total === "number"
        ? ((raw as Record<string, unknown>).total as number)
        : agents.length;
    return {
      data: agents,
      total,
      limit: params?.limit ?? 200,
      offset: params?.offset ?? 0,
    };
  }

  async suspendAgent(agentId: string): Promise<AgentIdentity> {
    return this.request<AgentIdentity>(
      "POST",
      `/agents/${encodeURIComponent(agentId)}/suspend`,
    );
  }

  async revokeAgent(agentId: string): Promise<AgentIdentity> {
    return this.request<AgentIdentity>(
      "POST",
      `/agents/${encodeURIComponent(agentId)}/revoke`,
    );
  }

  // ---------------------------------------------------------------------------
  // Receipts
  // ---------------------------------------------------------------------------

  async createReceipt(request: CreateReceiptRequest): Promise<Receipt> {
    return this.request<Receipt>("POST", "/agent-receipts", request);
  }

  async getReceipt(receiptId: string): Promise<Receipt> {
    return this.request<Receipt>(
      "GET",
      `/agent-receipts/${encodeURIComponent(receiptId)}`,
    );
  }

  async verifyReceipt(receiptId: string): Promise<VerifyReceiptResponse> {
    const receipt = await this.getReceipt(receiptId);
    const valid = receipt.status === "valid";
    return {
      valid,
      verdict: valid ? "PASS" : "FAIL",
      details: valid
        ? "Receipt signature and chain verified successfully"
        : `Receipt status is ${receipt.status}`,
      warnings:
        receipt.status === "expired"
          ? ["Receipt has expired"]
          : receipt.status === "superseded"
            ? ["Receipt has been superseded by a newer receipt"]
            : [],
    };
  }

  resolveReceiptId(receipt: Receipt): string {
    return receipt.receipt_id || receipt.id;
  }

  async listReceipts(
    params?: ListReceiptsParams,
  ): Promise<PaginatedResponse<Receipt>> {
    const agentId = (params as Record<string, unknown> | undefined)?.agent_id;
    const path = agentId
      ? `/agent-receipts/agent/${encodeURIComponent(String(agentId))}`
      : "/agent-receipts/filter";
    const queryParams = { ...params } as Record<
      string,
      string | number | boolean | undefined
    >;
    if (agentId) {
      delete (queryParams as Record<string, unknown>).agent_id;
    }
    const raw = await this.request<unknown>(
      "GET",
      path,
      undefined,
      queryParams,
    );
    let receipts: Receipt[];
    if (Array.isArray(raw)) {
      receipts = raw as Receipt[];
    } else {
      receipts = ((raw as Record<string, unknown>).receipts ??
        (raw as Record<string, unknown>).data ??
        []) as Receipt[];
    }
    const rawObj = raw as Record<string, unknown> | null;
    const total: number =
      typeof rawObj?.total === "number" ? rawObj.total : receipts.length;
    return {
      data: receipts,
      total,
      limit: params?.limit ?? (200 as number),
      offset: (params?.offset ?? 0) as number,
    };
  }

  // ---------------------------------------------------------------------------
  // Trust
  // ---------------------------------------------------------------------------

  async getTrustScore(agentId: string): Promise<TrustScore> {
    return this.request<TrustScore>(
      "GET",
      `/agents/${encodeURIComponent(agentId)}/trust-score`,
    );
  }

  async getTrustHistory(
    agentId: string,
    limit?: number,
  ): Promise<readonly TrustHistoryEntry[]> {
    return this.request<readonly TrustHistoryEntry[]>(
      "GET",
      `/agents/${encodeURIComponent(agentId)}/trust-history`,
      undefined,
      limit !== undefined ? { limit } : undefined,
    );
  }

  // ---------------------------------------------------------------------------
  // Delegations
  // ---------------------------------------------------------------------------

  async createDelegation(
    request: CreateDelegationRequest,
  ): Promise<Delegation> {
    return this.request<Delegation>(
      "POST",
      `/agents/${encodeURIComponent(request.parent_agent_id)}/delegations`,
      {
        child_agent_id: request.child_agent_id,
        scopes: request.scopes,
        purpose: (request as unknown as Record<string, unknown>).purpose,
        constraints: request.constraints,
        expires_at: request.expires_at,
      },
    );
  }

  async listDelegations(
    params?: ListDelegationsParams,
  ): Promise<PaginatedResponse<Delegation>> {
    const agentId = params?.parent_agent_id ?? params?.child_agent_id ?? "";
    return this.request<PaginatedResponse<Delegation>>(
      "GET",
      `/agents/${encodeURIComponent(agentId)}/delegations`,
      undefined,
      params as Record<string, string | number | boolean | undefined>,
    );
  }

  async verifyDelegationChain(
    agentId: string,
  ): Promise<VerifyDelegationChainResponse> {
    return this.request<VerifyDelegationChainResponse>(
      "GET",
      `/agents/${encodeURIComponent(agentId)}/delegation-tree`,
    );
  }

  // ---------------------------------------------------------------------------
  // Audit
  // ---------------------------------------------------------------------------

  async exportAuditReport(
    params: ExportAuditReportParams,
  ): Promise<AuditReport> {
    return this.request<AuditReport>("POST", "/compliance/reports", {
      entity_id: "tenant",
      entity_type: "tenant",
      regulation: "SOC2",
      period_start: params.from,
      period_end: params.to,
      generated_by: "maip-vscode",
    });
  }

  // ---------------------------------------------------------------------------
  // HTTP Engine
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const url = this.buildUrl(path, queryParams);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": this.config.apiKey,
    };
    if (this.config.tenantId && !this.config.apiKey.startsWith("tl_live_")) {
      headers["X-Tenant-ID"] = this.config.tenantId;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const text = await response.text();
          if (text.length === 0) {
            return undefined as T;
          }
          return JSON.parse(text) as T;
        }

        if (
          RETRYABLE_STATUS_CODES.has(response.status) &&
          attempt < this.maxRetries
        ) {
          const retryAfter = response.headers.get("Retry-After");
          if (retryAfter) {
            const retryDelaySeconds = parseInt(retryAfter, 10);
            if (!isNaN(retryDelaySeconds)) {
              await this.sleep(retryDelaySeconds * 1000);
            }
          }
          lastError = new MAIPApiError(response.status, {
            code: `HTTP_${response.status}`,
            message: `Request failed with status ${response.status}`,
          });
          continue;
        }

        const errorBody = await response.text();
        let apiError: ApiError;
        try {
          apiError = JSON.parse(errorBody) as ApiError;
        } catch {
          apiError = {
            code: `HTTP_${response.status}`,
            message:
              errorBody || `Request failed with status ${response.status}`,
          };
        }

        throw new MAIPApiError(response.status, apiError);
      } catch (error: unknown) {
        if (error instanceof MAIPApiError) {
          throw error;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          lastError = new MAIPNetworkError(
            `Request to ${method} ${path} timed out after ${this.timeoutMs}ms`,
            error,
          );
          if (attempt < this.maxRetries) {
            continue;
          }
        }

        if (attempt < this.maxRetries) {
          lastError = new MAIPNetworkError(
            `Network error on ${method} ${path}`,
            error,
          );
          continue;
        }

        throw new MAIPNetworkError(
          `Request to ${method} ${path} failed after ${this.maxRetries + 1} attempts`,
          error,
        );
      }
    }

    throw (
      lastError ??
      new MAIPNetworkError("Request failed with unknown error", undefined)
    );
  }

  private buildUrl(
    path: string,
    queryParams?: Record<string, string | number | boolean | undefined>,
  ): string {
    const base = `${this.config.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;

    if (!queryParams) {
      return base;
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }

    const paramString = params.toString();
    return paramString.length > 0 ? `${base}?${paramString}` : base;
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
    const jitter = Math.random() * BASE_DELAY_MS;
    return Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
