"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * MAIP API client for the VS Code extension.
 * Uses native fetch (Node 18+ built into VS Code runtime).
 * Implements retry with exponential backoff on 429/5xx.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAIPClient = exports.MAIPNetworkError = exports.MAIPApiError = void 0;
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 30_000;
class MAIPApiError extends Error {
    statusCode;
    errorCode;
    details;
    constructor(statusCode, apiError) {
        super(apiError.message);
        this.name = "MAIPApiError";
        this.statusCode = statusCode;
        this.errorCode = apiError.code;
        this.details = apiError.details;
    }
}
exports.MAIPApiError = MAIPApiError;
class MAIPNetworkError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.name = "MAIPNetworkError";
        this.cause = cause;
    }
}
exports.MAIPNetworkError = MAIPNetworkError;
class MAIPClient {
    config;
    maxRetries;
    timeoutMs;
    constructor(config) {
        this.config = config;
        this.maxRetries = config.maxRetries ?? 3;
        this.timeoutMs = config.timeoutMs ?? 30_000;
    }
    updateConfig(config) {
        this.config = config;
        this.maxRetries = config.maxRetries ?? 3;
        this.timeoutMs = config.timeoutMs ?? 30_000;
    }
    // ---------------------------------------------------------------------------
    // Agents
    // ---------------------------------------------------------------------------
    async registerAgent(request) {
        const body = {
            display_name: request.name,
            agent_type: request.type,
            scopes: request.capabilities ?? [],
            metadata: request.metadata,
        };
        const agent = await this.request("POST", "/agents", body);
        return {
            agent,
            trust_score: agent.trust_score,
        };
    }
    async getAgent(agentId) {
        return this.request("GET", `/agents/${encodeURIComponent(agentId)}`);
    }
    async listAgents(params) {
        const raw = await this.request("GET", "/agents", undefined, params);
        const agents = (Array.isArray(raw)
            ? raw
            : (raw.agents ??
                raw.data ??
                []));
        const total = typeof raw.total === "number"
            ? raw.total
            : agents.length;
        return {
            data: agents,
            total,
            limit: params?.limit ?? 200,
            offset: params?.offset ?? 0,
        };
    }
    async suspendAgent(agentId) {
        return this.request("POST", `/agents/${encodeURIComponent(agentId)}/suspend`);
    }
    async revokeAgent(agentId) {
        return this.request("POST", `/agents/${encodeURIComponent(agentId)}/revoke`);
    }
    // ---------------------------------------------------------------------------
    // Receipts
    // ---------------------------------------------------------------------------
    async createReceipt(request) {
        return this.request("POST", "/agent-receipts", { ...request, receipt_type: request.receipt_type ?? "action", metadata: request.payload });
    }
    async getReceipt(receiptId) {
        return this.request("GET", `/agent-receipts/${encodeURIComponent(receiptId)}`);
    }
    async verifyReceipt(receiptId) {
        const result = await this.request("GET", `/agent-receipts/verify/${encodeURIComponent(receiptId)}`);
        const valid = result.valid === true && result.verdict === "VALID" && result.signature_verified === true;
        return {
            valid,
            verdict: valid ? "PASS" : "FAIL",
            details: result.reason || result.verdict,
            warnings: result.transparency_verified ? [] : ["Transparency-log inclusion was not verified"],
        };
    }
    resolveReceiptId(receipt) {
        return receipt.receipt_id || receipt.id;
    }
    async listReceipts(params) {
        const agentId = params?.agent_id;
        const path = agentId
            ? `/agent-receipts/agent/${encodeURIComponent(String(agentId))}`
            : "/agent-receipts/filter";
        const queryParams = { ...params };
        if (agentId) {
            delete queryParams.agent_id;
        }
        const raw = await this.request("GET", path, undefined, queryParams);
        let receipts;
        if (Array.isArray(raw)) {
            receipts = raw;
        }
        else {
            receipts = (raw?.receipts ??
                raw?.data ??
                []);
        }
        const rawObj = raw;
        const total = typeof rawObj?.total === "number" ? rawObj.total : receipts.length;
        return {
            data: receipts,
            total,
            limit: params?.limit ?? 200,
            offset: (params?.offset ?? 0),
        };
    }
    // ---------------------------------------------------------------------------
    // Trust
    // ---------------------------------------------------------------------------
    async getTrustScore(agentId) {
        return this.request("GET", `/agents/${encodeURIComponent(agentId)}/trust-score`);
    }
    async getTrustHistory(agentId, limit) {
        const result = await this.request("GET", `/agents/${encodeURIComponent(agentId)}/trust-history`, undefined, limit !== undefined ? { limit } : undefined);
        return (result.history ?? []).map((entry) => ({
            trust_score: entry.score,
            computed_at: entry.created_at,
            event_type: entry.trigger_type,
            event_detail: entry.triggered_by ?? "",
        }));
    }
    // ---------------------------------------------------------------------------
    // Delegations
    // ---------------------------------------------------------------------------
    async createDelegation(request) {
        return this.request("POST", `/agents/${encodeURIComponent(request.parent_agent_id)}/delegations`, {
            child_agent_id: request.child_agent_id,
            scopes: request.scopes,
            purpose: request.purpose,
            constraints: request.constraints,
            expires_at: request.expires_at,
        });
    }
    async listDelegations(params) {
        const agentId = params?.parent_agent_id ?? params?.child_agent_id;
        if (!agentId)
            throw new Error("An agent ID is required to list delegations");
        const raw = await this.request("GET", `/agents/${encodeURIComponent(agentId)}/delegations`, undefined);
        const rows = (raw ?? []).filter((d) => !params?.status || d.status === params.status);
        const offset = params?.offset ?? 0;
        const limit = params?.limit ?? rows.length;
        return { data: rows.slice(offset, offset + limit), total: rows.length, limit, offset };
    }
    async verifyDelegationChain(agentId) {
        throw new Error(`Cryptographic delegation-chain verification is not available for ${agentId}. A delegation listing is not proof of validity.`);
    }
    // ---------------------------------------------------------------------------
    // Audit
    // ---------------------------------------------------------------------------
    async exportAuditReport(agentId) {
        if (!agentId)
            throw new Error("Select an agent before exporting evidence");
        const [agent, trust, delegations, receipts] = await Promise.all([
            this.getAgent(agentId), this.getTrustScore(agentId),
            this.listDelegations({ parent_agent_id: agentId }),
            this.listReceipts({ agent_id: agentId, limit: 100 }),
        ]);
        return {
            format: "truthlocks-agent-evidence-v1", generated_at: new Date().toISOString(),
            agent, trust, delegations: delegations.data, receipts: receipts.data, receipt_limit: 100,
            limitations: [
                "Point-in-time agent evidence, not a SOC 2 audit report or ISO certification.",
                "Includes at most the 100 most recent receipts; this is not a complete audit-log export.",
                "Receipt signatures and delegation chains are not verified by this export. Use Verify Receipt to check an individual receipt.",
                "Delegations include only records directly involving this agent, not its entire descendant tree.",
            ],
        };
    }
    // ---------------------------------------------------------------------------
    // HTTP Engine
    // ---------------------------------------------------------------------------
    async request(method, path, body, queryParams) {
        const url = this.buildUrl(path, queryParams);
        const headers = {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-API-Key": this.config.apiKey,
        };
        if (this.config.bearerToken) {
            if (this.config.apiKey)
                throw new Error("Use one API key or bearer token, not both");
            delete headers["X-API-Key"];
            headers["Authorization"] = `Bearer ${this.config.bearerToken}`;
        }
        const retries = method === "GET" || method === "HEAD" ? this.maxRetries : 0;
        let lastError;
        for (let attempt = 0; attempt <= retries; attempt++) {
            if (attempt > 0) {
                const delay = this.calculateDelay(attempt);
                await this.sleep(delay);
            }
            try {
                const response = await fetch(url, {
                    method,
                    headers,
                    body: body !== undefined ? JSON.stringify(body) : undefined,
                    signal: AbortSignal.timeout(this.timeoutMs),
                    redirect: "error",
                });
                if (response.ok) {
                    const text = await response.text();
                    if (text.length === 0) {
                        return undefined;
                    }
                    return JSON.parse(text);
                }
                if (RETRYABLE_STATUS_CODES.has(response.status) &&
                    attempt < retries) {
                    const retryAfter = response.headers.get("Retry-After");
                    if (retryAfter) {
                        const retryDelaySeconds = parseInt(retryAfter, 10);
                        if (!isNaN(retryDelaySeconds)) {
                            await this.sleep(Math.min(Math.max(retryDelaySeconds, 0) * 1000, MAX_DELAY_MS));
                        }
                    }
                    lastError = new MAIPApiError(response.status, {
                        code: `HTTP_${response.status}`,
                        message: `Request failed with status ${response.status}`,
                    });
                    continue;
                }
                const errorBody = await response.text();
                let apiError;
                try {
                    apiError = JSON.parse(errorBody);
                }
                catch {
                    apiError = {
                        code: `HTTP_${response.status}`,
                        message: errorBody || `Request failed with status ${response.status}`,
                    };
                }
                throw new MAIPApiError(response.status, apiError);
            }
            catch (error) {
                if (error instanceof MAIPApiError) {
                    throw error;
                }
                if (error instanceof DOMException && error.name === "AbortError") {
                    lastError = new MAIPNetworkError(`Request to ${method} ${path} timed out after ${this.timeoutMs}ms`, error);
                    if (attempt < retries) {
                        continue;
                    }
                }
                if (attempt < retries) {
                    lastError = new MAIPNetworkError(`Network error on ${method} ${path}`, error);
                    continue;
                }
                throw new MAIPNetworkError(`Request to ${method} ${path} failed after ${this.maxRetries + 1} attempts`, error);
            }
        }
        throw (lastError ??
            new MAIPNetworkError("Request failed with unknown error", undefined));
    }
    buildUrl(path, queryParams) {
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
    calculateDelay(attempt) {
        const exponentialDelay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        const jitter = Math.random() * BASE_DELAY_MS;
        return Math.min(exponentialDelay + jitter, MAX_DELAY_MS);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.MAIPClient = MAIPClient;
//# sourceMappingURL=client.js.map