# MAIP - Machine Identity & Integrity for VS Code

The **Machine-Actionable Integrity Protocol (MAIP)** extension brings machine identity management, cryptographic action receipts, trust scoring, and agent delegation directly into your VS Code workflow.

## Features

- **Agent Registration** -- Register and manage machine identities (agents) from the command palette.
- **Action Receipts** -- Create cryptographic receipts for file changes, git commits, and arbitrary actions.
- **Receipt Verification** -- Verify the integrity and authenticity of any MAIP receipt.
- **Trust Scores** -- View real-time trust scores for agents in your workspace.
- **Delegation Chains** -- Inspect and manage agent delegation hierarchies.
- **Auto-Receipt on Save/Commit** -- Optionally generate receipts automatically when you save files or commit to git.
- **Inline Trust Badges** -- See trust score indicators directly in your editor.
- **Audit Export** -- Export a full audit report of all receipts and agent activity.

## Activity Bar

The extension adds a **MAIP** panel to the Activity Bar with three tree views:

| View          | Description                        |
|---------------|------------------------------------|
| Agents        | Registered machine identities      |
| Receipts      | Cryptographic action receipts      |
| Delegations   | Agent delegation chains            |

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type **MAIP** to see all available commands:

| Command                  | Description                        |
|--------------------------|------------------------------------|
| MAIP: Register Agent     | Register a new machine identity    |
| MAIP: Create Receipt     | Create a receipt for an action     |
| MAIP: Verify Receipt     | Verify a receipt's integrity       |
| MAIP: Show Trust Score   | Display an agent's trust score     |
| MAIP: List Receipts      | Show all receipts                  |
| MAIP: Export Audit Report | Export audit data                 |
| MAIP: Refresh            | Refresh all MAIP views             |

## Configuration

| Setting                      | Default                                              | Description                          |
|------------------------------|------------------------------------------------------|--------------------------------------|
| `maip.apiUrl`                | `https://api.truthlocks.com/v1/machine-identity`     | MAIP API endpoint                    |
| `maip.apiKey`                |                                                      | Your MAIP API key                    |
| `maip.tenantId`              |                                                      | Tenant ID                            |
| `maip.agentId`               |                                                      | Agent ID for this workspace          |
| `maip.autoReceiptOnSave`     | `false`                                              | Auto-generate receipt on file save   |
| `maip.autoReceiptOnCommit`   | `true`                                               | Auto-generate receipt on git commit  |
| `maip.showTrustBadges`       | `true`                                               | Show inline trust score badges       |

## Installation

### From VSIX (GitHub Releases)

1. Download the latest `.vsix` from [GitHub Releases](https://github.com/truthlocks/maip-vscode/releases).
2. In VS Code, open the Command Palette and run **Extensions: Install from VSIX...**.
3. Select the downloaded `.vsix` file.

### From VS Code Marketplace

Search for **MAIP** in the Extensions view (`Ctrl+Shift+X`), or install directly:

```
ext install truthlocks.maip-vscode
```

## Requirements

- VS Code 1.85.0 or later
- A Truthlocks account with MAIP API access

## License

Apache-2.0
