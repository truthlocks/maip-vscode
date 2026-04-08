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
    // ---------------------------------------------------------------------------
    // Agents
    // ---------------------------------------------------------------------------
    async registerAgent(request) {
        return this.request("POST", "/agents", request);
    }
    async getAgent(agentId) {
        return this.request("GET", `/agents/${encodeURIComponent(agentId)}`);
    }
    async listAgents(params) {
        return this.request("GET", "/agents", undefined, params);
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
        return this.request("POST", "/receipts", request);
    }
    async getReceipt(receiptId) {
        return this.request("GET", `/receipts/${encodeURIComponent(receiptId)}`);
    }
    async verifyReceipt(receiptId) {
        return this.request("GET", `/receipts/${encodeURIComponent(receiptId)}/verify`);
    }
    async listReceipts(params) {
        return this.request("GET", "/receipts", undefined, params);
    }
    // ---------------------------------------------------------------------------
    // Trust
    // ---------------------------------------------------------------------------
    async getTrustScore(agentId) {
        return this.request("GET", `/trust/${encodeURIComponent(agentId)}/score`);
    }
    async getTrustHistory(agentId, limit) {
        return this.request("GET", `/trust/${encodeURIComponent(agentId)}/history`, undefined, limit !== undefined ? { limit } : undefined);
    }
    // ---------------------------------------------------------------------------
    // Delegations
    // ---------------------------------------------------------------------------
    async createDelegation(request) {
        return this.request("POST", "/delegations", request);
    }
    async listDelegations(params) {
        return this.request("GET", "/delegations", undefined, params);
    }
    async verifyDelegationChain(agentId) {
        return this.request("GET", `/delegations/${encodeURIComponent(agentId)}/chain/verify`);
    }
    // ---------------------------------------------------------------------------
    // Audit
    // ---------------------------------------------------------------------------
    async exportAuditReport(params) {
        return this.request("GET", "/audit/report", undefined, params);
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
            "X-Tenant-ID": this.config.tenantId,
        };
        let lastError;
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
                        return undefined;
                    }
                    return JSON.parse(text);
                }
                if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < this.maxRetries) {
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
                    if (attempt < this.maxRetries) {
                        continue;
                    }
                }
                if (attempt < this.maxRetries) {
                    lastError = new MAIPNetworkError(`Network error on ${method} ${path}`, error);
                    continue;
                }
                throw new MAIPNetworkError(`Request to ${method} ${path} failed after ${this.maxRetries + 1} attempts`, error);
            }
        }
        throw lastError ?? new MAIPNetworkError("Request failed with unknown error", undefined);
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