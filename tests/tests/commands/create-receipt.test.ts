/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Tests for the create-receipt command.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("vscode", () => {
  const disposable = { dispose: vi.fn() };

  return {
    commands: {
      registerCommand: vi.fn((_cmd: string, handler: Function) => {
        (vi.mocked as any).__lastHandler = handler;
        return disposable;
      }),
      executeCommand: vi.fn(),
    },
    window: {
      showInputBox: vi.fn(),
      showQuickPick: vi.fn(),
      showInformationMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      withProgress: vi.fn(async (_opts: unknown, task: Function) => task()),
      activeTextEditor: undefined,
    },
    workspace: {
      getConfiguration: vi.fn(() => ({
        get: vi.fn((key: string, defaultValue: unknown) => {
          const vals: Record<string, unknown> = {
            apiUrl: "https://api.test.com/v1/machine-identity",
            apiKey: "test-key",
            tenantId: "test-tenant",
            agentId: "test-agent-id",
            autoReceiptOnSave: false,
            autoReceiptOnCommit: true,
            showTrustBadges: true,
          };
          return vals[key] ?? defaultValue;
        }),
      })),
    },
    ProgressLocation: { Notification: 15 },
    env: {
      clipboard: { writeText: vi.fn() },
    },
  };
});

vi.mock("crypto", () => ({
  randomBytes: vi.fn(() => ({ toString: () => "testnonce123" })),
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => "sha256hashvalue"),
  })),
}));

import * as vscode from "vscode";
import { registerCreateReceiptCommand } from "../../src/commands/create-receipt";
import type { MAIPClient } from "../../src/client";

function createMockClient(): MAIPClient {
  return {
    createReceipt: vi.fn().mockResolvedValue({
      id: "receipt-uuid-1234",
      action: "code-selection",
      status: "COMPLETE",
      receipt_type: "action",
      agent_id: "test-agent-id",
      created_at: "2026-04-07T00:00:00Z",
    }),
  } as unknown as MAIPClient;
}

describe("maip.createReceipt command", () => {
  let mockClient: MAIPClient;
  let refreshCallback: ReturnType<typeof vi.fn>;
  let handler: Function;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = createMockClient();
    refreshCallback = vi.fn();
    registerCreateReceiptCommand(mockClient, refreshCallback);

    const calls = vi.mocked(vscode.commands.registerCommand).mock.calls;
    const createReceiptCall = calls.find(
      ([cmd]) => cmd === "maip.createReceipt",
    );
    expect(createReceiptCall).toBeDefined();
    handler = createReceiptCall![1]!;
  });

  it("should register the command", () => {
    expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
      "maip.createReceipt",
      expect.any(Function),
    );
  });

  it("should prompt for action and type", async () => {
    vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce("file-edit");
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      label: "Action",
      value: "action",
    } as any);
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce(
      undefined,
    );

    await handler();

    expect(vscode.window.showInputBox).toHaveBeenCalled();
    expect(vscode.window.showQuickPick).toHaveBeenCalled();
    expect(mockClient.createReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "file-edit",
        agent_id: "test-agent-id",
        receipt_type: "action",
        payload: expect.objectContaining({
          content_hash: "sha256hashvalue",
        }),
      }),
    );
  });

  it("should call refresh callback after successful creation", async () => {
    vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce("test-action");
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      label: "Audit",
      value: "audit",
    } as any);
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce(
      undefined,
    );

    await handler();

    expect(refreshCallback).toHaveBeenCalled();
  });

  it("should abort when user cancels action input", async () => {
    vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce(undefined);

    await handler();

    expect(mockClient.createReceipt).not.toHaveBeenCalled();
    expect(refreshCallback).not.toHaveBeenCalled();
  });

  it("should abort when user cancels type selection", async () => {
    vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce("test-action");
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce(undefined);

    await handler();

    expect(mockClient.createReceipt).not.toHaveBeenCalled();
  });

  it("should show error notification on API failure", async () => {
    vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce("test-action");
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      label: "Action",
      value: "action",
    } as any);
    vi.mocked(mockClient.createReceipt as any).mockRejectedValueOnce(
      new Error("Network timeout"),
    );

    await handler();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      expect.stringContaining("Network timeout"),
    );
  });

  it("should offer to copy receipt ID after creation", async () => {
    vi.mocked(vscode.window.showInputBox).mockResolvedValueOnce("test-action");
    vi.mocked(vscode.window.showQuickPick).mockResolvedValueOnce({
      label: "Action",
      value: "action",
    } as any);
    vi.mocked(vscode.window.showInformationMessage).mockResolvedValueOnce(
      "Copy ID" as any,
    );

    await handler();

    expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
      "receipt-uuid-1234",
    );
  });
});
