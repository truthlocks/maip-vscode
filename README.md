# MAIP VS Code Extension

Machine identity, cryptographic receipts, and trust scoring for VS Code.

## Install

Search **MAIP Truthlocks** in Extensions, or: `code --install-extension truthlocks.maip-vscode`

## Get Started (10 Seconds)

1. Command Palette > **MAIP: Register Developer**
2. Enter email > instant API key stored securely
3. Right-click file > **Protect with Truthlocks**

No website needed. Free: 100 protections/month.

## Features

- Protect files with cryptographic proof
- Auto-receipts on git commit and file save
- 10 algorithms (Ed25519, ES256, ES384, ES512, RS256-PS512)
- Usage meter in status bar
- MAIP agent identity management

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| maip.signingAlgorithm | Ed25519 | Signing algorithm |
| maip.autoReceipt.onSave | false | Auto-receipt on save |
| maip.autoReceipt.onCommit | true | Auto-receipt on commit |

## Docs

https://docs.truthlocks.com

## License

MIT
