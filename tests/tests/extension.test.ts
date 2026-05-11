/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Tests for the MAIP VS Code extension activation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock vscode module before any imports that depend on it
vi.mock("vscode", () => {
  const disposable = { dispose: vi.fn() };

  const commands = {
    registerCommand: vi.fn(() => disposable),
    executeCommand: vi.fn(),
  };

  const window = {
    registerTreeDataProvider: vi.fn(() => disposable),
    createStatusBarItem: vi.fn(() => ({
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
      text: "",
      tooltip: "",
      command: undefined,
      backgroundColor: undefined,
    })),
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      dispose: vi.fn(),
    })),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInputBox: vi.fn(),
    showQuickPick: vi.fn(),
    onDidChangeActiveTextEditor: vi.fn(() => disposable),
    onDidStartTerminalShellExecution: vi.fn(() => disposable),
    activeTextEditor: undefined,
    createTextEditorDecorationType: vi.fn(() => ({
      dispose: vi.fn(),
    })),
    createWebviewPanel: vi.fn(() => ({
      webview: { html: "", onDidReceiveMessage: vi.fn() },
      reveal: vi.fn(),
      dispose: vi.fn(),
      onDidDispose: vi.fn(),
    })),
  };

  const workspace = {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string, defaultValue: unknown) => {
        const values: Record<string, unknown> = {
          apiUrl: "https://api.test.com/v1/machine-identity",
          apiKey: "test-api-key",
          tenantId: "test-tenant",
          agentId: "test-agent-id",
          autoReceiptOnSave: false,
          autoReceiptOnCommit: true,
          showTrustBadges: true,
        };
        return values[key] ?? defaultValue;
      }),
      update: vi.fn(),
    })),
    onDidChangeConfiguration: vi.fn(() => disposable),
    onDidChangeTextDocument: vi.fn(() => disposable),
    onDidSaveTextDocument: vi.fn(() => disposable),
    getWorkspaceFolder: vi.fn(),
  };

  const languages = {
    registerHoverProvider: vi.fn(() => disposable),
  };

  const extensions = {
    getExtension: vi.fn(() => undefined),
  };

  const env = {
    clipboard: { writeText: vi.fn() },
  };

  const Uri = {
    file: vi.fn((path: string) => ({ fsPath: path, scheme: "file" })),
  };

  const TreeItem = vi.fn();
  const EventEmitter = vi.fn(() => ({
    event: vi.fn(),
    fire: vi.fn(),
    dispose: vi.fn(),
  }));

  const ThemeIcon = vi.fn();
  const ThemeColor = vi.fn();
  const MarkdownString = vi.fn();
  const TreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
  const StatusBarAlignment = { Left: 1, Right: 2 };
  const ViewColumn = { One: 1, Two: 2 };
  const ProgressLocation = { Notification: 15 };
  const ConfigurationTarget = { Global: 1, Workspace: 2, WorkspaceFolder: 3 };
  const Range = vi.fn();

  return {
    commands,
    window,
    workspace,
    languages,
    extensions,
    env,
    Uri,
    TreeItem,
    EventEmitter,
    ThemeIcon,
    ThemeColor,
    MarkdownString,
    TreeItemCollapsibleState,
    StatusBarAlignment,
    ViewColumn,
    ProgressLocation,
    ConfigurationTarget,
    Range,
  };
});

vi.mock("crypto", () => ({
  randomBytes: vi.fn(() => ({ toString: () => "abc123def456" })),
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => "sha256hash"),
  })),
}));

import * as vscode from "vscode";
import { activate, deactivate } from "../src/extension";

describe("MAIP Extension", () => {
  let context: vscode.ExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context = {
      subscriptions: [],
      extensionUri: vscode.Uri.file("/test/extension"),
      extensionPath: "/test/extension",
      globalState: {
        get: vi.fn(),
        update: vi.fn(),
        keys: vi.fn(() => []),
        setKeysForSync: vi.fn(),
      },
      workspaceState: { get: vi.fn(), update: vi.fn(), keys: vi.fn(() => []) },
      secrets: {
        get: vi.fn(),
        store: vi.fn(),
        delete: vi.fn(),
        onDidChange: vi.fn(),
      },
      storageUri: undefined,
      globalStorageUri: vscode.Uri.file("/test/global"),
      logUri: vscode.Uri.file("/test/log"),
      storagePath: undefined,
      globalStoragePath: "/test/global",
      logPath: "/test/log",
      asAbsolutePath: vi.fn((p: string) => `/test/extension/${p}`),
      environmentVariableCollection:
        {} as unknown as vscode.GlobalEnvironmentVariableCollection,
      extensionMode: 3,
      extension: {} as unknown as vscode.Extension<unknown>,
      languageModelAccessInformation:
        {} as unknown as vscode.LanguageModelAccessInformation,
    } as unknown as vscode.ExtensionContext;
  });

  it("should activate and register all commands", () => {
    activate(context);

    // 6 commands from individual modules + 2 from extension.ts (refresh + delegation)
    const registerCommandCalls = vi.mocked(vscode.commands.registerCommand).mock
      .calls;
    expect(registerCommandCalls.length).toBe(8);

    // Check that specific commands were registered
    const registeredCommands = registerCommandCalls.map(([cmd]) => cmd);
    expect(registeredCommands).toContain("maip.registerAgent");
    expect(registeredCommands).toContain("maip.createReceipt");
    expect(registeredCommands).toContain("maip.verifyReceipt");
    expect(registeredCommands).toContain("maip.showTrustScore");
    expect(registeredCommands).toContain("maip.listReceipts");
    expect(registeredCommands).toContain("maip.exportAudit");
    expect(registeredCommands).toContain("maip.refreshReceipts");
    expect(registeredCommands).toContain("maip.showDelegationTree");
  });

  it("should register tree data providers", () => {
    activate(context);

    const treeProviderCalls = vi.mocked(vscode.window.registerTreeDataProvider)
      .mock.calls;
    expect(treeProviderCalls.length).toBe(2);

    const registeredViews = treeProviderCalls.map(([viewId]) => viewId);
    expect(registeredViews).toContain("maip.receipts");
    expect(registeredViews).toContain("maip.agents");
  });

  it("should register hover providers", () => {
    activate(context);

    const hoverCalls = vi.mocked(vscode.languages.registerHoverProvider).mock
      .calls;
    expect(hoverCalls.length).toBe(2);

    const schemes = hoverCalls.map(
      ([selector]) => (selector as { scheme: string }).scheme,
    );
    expect(schemes).toContain("file");
    expect(schemes).toContain("untitled");
  });

  it("should create status bar item", () => {
    activate(context);
    expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
  });

  it("should create output channel", () => {
    activate(context);
    expect(vscode.window.createOutputChannel).toHaveBeenCalledWith("MAIP");
  });

  it("should add disposables to subscriptions", () => {
    activate(context);
    expect(context.subscriptions.length).toBeGreaterThan(0);
  });

  it("should deactivate cleanly", () => {
    expect(() => deactivate()).not.toThrow();
  });
});
