/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Developer registration command.
 * Registers a developer account via the sandbox API, stores the API key
 * in VS Code SecretStorage, and shows onboarding notifications.
 */

import * as vscode from "vscode";

const REGISTER_ENDPOINT =
  "https://sandbox-api.truthlocks.com/v1/developers/register";
import { saveCredentials, clearLegacySettings } from "../credentials";
import { getConfig } from "../config";

interface RegisterResponse {
  api_key: string;
  tenant_id?: string;
  developer_id?: string;
  plan?: string;
  message?: string;
}

export function registerRegisterCommand(
  _context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand("maip.register", async () => {
    const email = await vscode.window.showInputBox({
      prompt: "Enter your email to register with Truthlocks",
      placeHolder: "you@example.com",
      validateInput: (value) => {
        if (!value || !value.includes("@") || !value.includes(".")) {
          return "Please enter a valid email address";
        }
        return undefined;
      },
    });

    if (!email) {
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      const response = await fetch(REGISTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, source: "vscode" }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        let errorJson: Record<string, unknown> = {};
        try {
          errorJson = JSON.parse(errorText);
        } catch { /* ignore */ }

        // Handle 409 — account already exists
        if (response.status === 409) {
          // Try to get existing key info from the response
          const existingApiKey = errorJson.api_key as string | undefined;
          const existingTenantId = errorJson.tenant_id as string | undefined;

          if (existingApiKey) {
            // Backend returned the existing key — store it
            await saveCredentials("https://sandbox-api.truthlocks.com/v1", existingApiKey);
            await clearLegacySettings();
            const cfg = vscode.workspace.getConfiguration("maip");
            await cfg.update("apiUrl", "https://sandbox-api.truthlocks.com/v1", vscode.ConfigurationTarget.Global);
            if (existingTenantId) {
              await cfg.update("tenantId", existingTenantId, vscode.ConfigurationTarget.Global);
            }
            vscode.window.showInformationMessage("Truthlocks connected! Existing account configured.");
            return;
          }

          // No key in response — let user paste their key or request a new one
          const action = await vscode.window.showWarningMessage(
            `Account ${email} already exists. You can enter your API key or request a new one via email.`,
            "Enter API Key",
            "Open Console",
            "Cancel",
          );
          if (action === "Enter API Key") {
            const key = await vscode.window.showInputBox({
              prompt: "Paste your Truthlocks API key",
              placeHolder: "tl_test_...",
              password: true,
            });
            if (key && key.startsWith("tl_")) {
              await saveCredentials("https://sandbox-api.truthlocks.com/v1", key);
            await clearLegacySettings();
              const cfg = vscode.workspace.getConfiguration("maip");
              await cfg.update("apiUrl", "https://sandbox-api.truthlocks.com/v1", vscode.ConfigurationTarget.Global);
              vscode.window.showInformationMessage("API key configured. MAIP is ready.");
            }
          } else if (action === "Open Console") {
            vscode.env.openExternal(vscode.Uri.parse("https://console.truthlocks.com/auth/sign-in"));
          }
          return;
        }

        const errorMessage = (errorJson.message as string) ?? `HTTP ${response.status}`;
        vscode.window.showErrorMessage(`Registration failed: ${errorMessage}`);
        return;
      }

      const data = (await response.json()) as RegisterResponse;

      if (!data.api_key) {
        vscode.window.showErrorMessage(
          "Registration succeeded but no API key was returned.",
        );
        return;
      }

      await saveCredentials("https://sandbox-api.truthlocks.com/v1", data.api_key);
            await clearLegacySettings();

      // Store only non-secret connection settings in user configuration
      const cfg = vscode.workspace.getConfiguration("maip");
      await cfg.update("apiUrl", "https://sandbox-api.truthlocks.com/v1", vscode.ConfigurationTarget.Global);
      if (data.tenant_id) {
        await cfg.update("tenantId", data.tenant_id, vscode.ConfigurationTarget.Global);
      }

      vscode.window.showInformationMessage(
        "Truthlocks registered! API key and credentials configured.",
      );
      vscode.window.showInformationMessage(
        "Check your email to verify within 7 days. You can now use all MAIP commands.",
      );
    } catch (error: unknown) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        vscode.window.showErrorMessage(
          "Registration request timed out. Please try again.",
        );
        return;
      }
      const message =
        error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(
        `Registration failed: ${message}`,
      );
    }
  });
}

/**
 * Checks if an API key exists in SecretStorage and prompts
 * the user to register if not found.
 */
export async function promptRegistrationIfNeeded(
  _context: vscode.ExtensionContext,
): Promise<void> {
  const existingKey = getConfig().apiKey;
  if (existingKey) {
    return;
  }

  const action = await vscode.window.showInformationMessage(
    "Get started with Truthlocks",
    "Configure Credentials",
    "Open Console",
  );

  if (action === "Configure Credentials") {
    await vscode.commands.executeCommand("maip.configure");
  } else if (action === "Open Console") {
    await vscode.env.openExternal(vscode.Uri.parse("https://console.truthlocks.com"));
  }
}

/**
 * Retrieves the stored API key from SecretStorage.
 */
export async function getStoredApiKey(
  _context: vscode.ExtensionContext,
): Promise<string | undefined> {
  return getConfig().apiKey || undefined;
}
