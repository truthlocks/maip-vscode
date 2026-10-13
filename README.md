# Truthlocks MAIP for Visual Studio Code

Inspect machine identities and receipt metadata from your editor, with commands for
agent management, receipt workflows and trust information.

**Publisher:** Truthlocks · **VS Code:** 1.85+ · **License:** Apache-2.0

## Installation

Install the Truthlocks extension from its verified publisher listing, or install a
reviewed VSIX from the Extensions menu. To install a local artifact:

```sh
code --install-extension ./maip-vscode-1.4.4.vsix
```

The command assumes that the reviewed VSIX already exists at that path. It does not
build the extension or imply this source version is already on Marketplace.

## Configure your workspace

Start with automatic submission disabled while checking your account and environment:

```json
{
  "maip.apiUrl": "https://sandbox-api.truthlocks.com/v1",
  "maip.autoReceiptOnSave": false,
  "maip.autoReceiptOnCommit": false,
  "maip.showTrustBadges": false
}
```

Run **MAIP: Configure Credentials**, enter your API endpoint and key, then choose
where the non-secret endpoint and agent settings belong. The key is stored in
VS Code's encrypted SecretStorage, not `.vscode/settings.json`. Tenant ID is
optional for both sandbox and production keys; authorization comes from the key.

Keys are bound to the configured endpoint. Changing a workspace setting to another
host does not forward the saved key there. Reconfigure explicitly when changing
providers or endpoints. Truthlocks test keys select `sandbox-api.truthlocks.com`;
live keys select `api.truthlocks.com`.

**Upgrading from older versions:** run Configure Credentials once to move your key
into the new storage format. This explicit action removes old `maip.apiKey` settings
from user/workspace configuration. Old plaintext settings are no longer read.
Copies in Git history or previous settings-sync versions are not removed by this
migration. Sign Out clears the saved secret and refreshes the connection.

Automatic save and commit receipts are disabled by default. Enable them only after
confirming the selected workspace, agent and environment. Creating a receipt can
submit file-related metadata to Truthlocks and consume your account allowance.

## Commands

Open the Command Palette and search for MAIP. The command IDs below match the extension manifest.

| Command ID | Palette entry |
| --- | --- |
| `maip.register` | MAIP: Register Developer |
| `maip.registerAgent` | MAIP: Register Agent |
| `maip.createReceipt` | MAIP: Create Receipt |
| `maip.verifyReceipt` | MAIP: Verify Receipt |
| `maip.showTrustScore` | MAIP: Show Trust Score |
| `maip.listReceipts` | MAIP: List Receipts |
| `maip.exportAudit` | MAIP: Export Agent Evidence |
| `maip.refreshReceipts` | MAIP: Refresh |
| `maip.configure` | MAIP: Configure Credentials |
| `maip.testConnection` | MAIP: Test Connection |
| `maip.signOut` | MAIP: Sign Out |

## Understand the status

Receipt creation, retrieval and server signature verification have passed live QA checks.
Search now supports workspace receipts, metadata, status, dates and pagination.
Agent trust views use the service's actual factors and history. Missing factors or
metadata are labeled as unavailable. Delegation views show relationships directly
involving the selected agent, not a verified full chain. The status bar displays
trust information; account usage and billing remain in Console.

**Export Agent Evidence** saves the agent, its trust response, direct delegations,
and at most 100 recent receipts as JSON. The file lists its limitations. It is not
a complete audit log, a SOC 2 report or an ISO certificate, and does not perform
signature verification. Use **Verify Receipt** for an individual receipt.

Marketplace publication and full IDE workflow validation are tracked separately.
A displayed algorithm option does not establish that the server used that algorithm,
and a receipt ID or trust badge alone is not cryptographic verification.

Registration can create an account and trigger account communication; it is not a
local setup operation. Use an existing authorized test workspace for evaluation.

## Build and test

From this package directory:

```sh
npm install --ignore-scripts
npm run build
npm test -- --pool=forks --maxWorkers=1 --minWorkers=1
```

## Troubleshooting

If commands are missing, confirm the installed version, activation errors and VS Code
version. If requests fail, check the API host, credential and route compatibility;
changing settings does not repair obsolete endpoint paths. Disable automatic receipts
while diagnosing failures. Include a sanitized error and extension version in support
requests; never include API keys or sensitive file contents.
