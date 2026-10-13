## 1.4.4

- Use the existing 180px Truthlocks brand icon and validate Marketplace dimensions before packaging.

- Align agent scopes, trust factors/history and delegation arrays with the deployed API.
- Support canonical MAIP IDs in hovers and decorations; restrict hover command links.
- Export a bounded, read-only agent evidence snapshot instead of an invalid audit-report request.
- Remove the invented 100-request billing counter and show unavailable trust scores honestly.

- Store credentials only in endpoint-bound VS Code SecretStorage; never save new API keys to settings.
- Remove the incorrect tenant-ID requirement for sandbox setup.
- Make automatic commit receipts opt-in and correct credential setup prompts.
- Refresh authenticated clients when secrets change and clear legacy credentials on sign-out.
- Preserve the receipt route, signature verification and read-only retry repairs from 1.4.3.

# Changelog

All notable changes to the MAIP VS Code extension will be documented in this file.

## 1.0.2 (2026-05-11)

### Breaking Changes

- **API path corrections**: All API calls now hit the correct backend routes. Users upgrading from 1.0.0/1.0.1 must ensure `maip.apiUrl` is set to `https://api.truthlocks.com/v1` (remove any `/machine-identity` suffix if present).

### Features

- **Configure Credentials command** (`MAIP: Configure Credentials`): Guided 4-step wizard for setting up API URL, API Key, Tenant ID, and Agent ID directly from the command palette — no manual settings editing required.
- **Test Connection command** (`MAIP: Test Connection`): Verify credentials are valid and the API is reachable with a single command.
- **Live key support**: Extensions now work correctly with `tl_live_` API keys without requiring a separate Tenant ID (tenant is derived from the key).

### Bug Fixes

- Fixed agent registration sending wrong field names (`type` → `agent_type`, `name` → `display_name`) causing backend to default all agents to "worker" type. Agent type picker now correctly registers as service, pipeline, model, or tool.
- Fixed receipts API path (`/receipts` → `/agent-receipts`) — create, get, verify, and list operations now route correctly.
- Fixed trust score API path (`/trust/{id}/score` → `/agents/{id}/trust-score`).
- Fixed trust history API path (`/trust/{id}/history` → `/agents/{id}/trust-history`).
- Fixed delegations API path (`/delegations` → `/agents/{id}/delegations`).
- Fixed delegation chain verification path (`/delegations/{id}/chain/verify` → `/agents/{id}/delegation-tree`).
- Fixed audit report API path and method (`GET /audit/report` → `POST /compliance/reports`).
- Fixed `X-Tenant-ID` header now always sent when configured (previously skipped for `tl_live_` prefixed keys).
- Fixed `isConfigured()` check allowing live keys to proceed without explicit tenant ID.
- Fixed default API URL stripping `/machine-identity` suffix for compatibility with gateway routing.

## 1.0.1 (2026-05-10)

### Bug Fixes

- Fixed `registerAgent` API call sending incorrect request body structure (field mismatch with backend schema).
- Published to VS Code Marketplace.
- Synced standalone repo at `truthlocks/maip-vscode`.

## 1.0.0 (2026-04-07)

### Features

- Agent registration and management via command palette (service, pipeline, model, tool types).
- Cryptographic action receipt creation and verification.
- Real-time trust score display with score component breakdown.
- Delegation chain inspection and visualization.
- Activity bar panel with Agents, Receipts, and Delegations tree views.
- Auto-receipt generation on file save (`maip.autoReceiptOnSave`).
- Auto-receipt generation on git commit (`maip.autoReceiptOnCommit`).
- Inline trust score badges via editor decorations.
- Audit report export with date range selection.
- Editor context menu and SCM title integration for quick receipt creation.
- Hover provider showing receipt details on decorated files.
- Status bar item showing current agent trust score.
