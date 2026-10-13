import * as vscode from "vscode";

const SECRET = "truthlocks-connection-v2";
const LEGACY_SECRET = "truthlocks-api-key";
let connection: { apiUrl: string; apiKey: string } | undefined;
let storage: vscode.SecretStorage | undefined;

export function normalizeEndpoint(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
    throw new Error("Use HTTPS, or HTTP on localhost, without credentials, query parameters or fragments.");
  }
  return url.toString().replace(/\/+$/, "").replace(/\/machine-identity$/, "");
}

export function endpointForKey(endpoint: string, key: string): string {
  const url = new URL(normalizeEndpoint(endpoint));
  if (["api.truthlocks.com", "sandbox-api.truthlocks.com"].includes(url.hostname)) {
    if (key.startsWith("tl_test_")) url.hostname = "sandbox-api.truthlocks.com";
    if (key.startsWith("tl_live_")) url.hostname = "api.truthlocks.com";
  }
  return normalizeEndpoint(url.toString());
}

export function storedConnection(endpoint: string): {apiUrl: string; apiKey: string} {
  const apiUrl = normalizeEndpoint(endpoint);
  // Workspace settings cannot redirect a saved credential to another host.
  if (connection && (connection.apiUrl === apiUrl || connection.apiUrl === endpointForKey(apiUrl, connection.apiKey))) {
    return {...connection};
  }
  return {apiUrl, apiKey: ""};
}

export async function loadCredentials(secrets: vscode.SecretStorage): Promise<void> {
  storage = secrets;
  connection = undefined;
  const raw = await secrets.get(SECRET);
  if (!raw) return;
  const value = JSON.parse(raw) as {apiUrl?: unknown; apiKey?: unknown};
  if (typeof value.apiUrl !== "string" || typeof value.apiKey !== "string") throw new Error("Stored connection is invalid; configure credentials again.");
  connection = {apiUrl: normalizeEndpoint(value.apiUrl), apiKey: value.apiKey};
}

export async function saveCredentials(endpoint: string, apiKey: string): Promise<string> {
  if (!storage) throw new Error("Secret storage is not ready");
  if (!apiKey.trim() || /[\r\n]/.test(apiKey)) throw new Error("Enter a valid API key");
  const value = {apiUrl: endpointForKey(endpoint, apiKey.trim()), apiKey: apiKey.trim()};
  await storage.store(SECRET, JSON.stringify(value));
  connection = value;
  return value.apiUrl;
}

export async function clearCredentials(): Promise<void> {
  connection = undefined;
  if (storage) { await storage.delete(SECRET); await storage.delete(LEGACY_SECRET); }
}

export function credentialsChanged(event: vscode.SecretStorageChangeEvent): boolean { return event.key === SECRET; }

export async function clearLegacySettings(): Promise<void> {
  const cfg = vscode.workspace.getConfiguration("maip");
  const inspected = cfg.inspect<string>("apiKey");
  if (inspected?.globalValue !== undefined) await cfg.update("apiKey", undefined, vscode.ConfigurationTarget.Global);
  if (inspected?.workspaceValue !== undefined) await cfg.update("apiKey", undefined, vscode.ConfigurationTarget.Workspace);
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const scoped = vscode.workspace.getConfiguration("maip", folder.uri);
    if (scoped.inspect<string>("apiKey")?.workspaceFolderValue !== undefined) await scoped.update("apiKey", undefined, vscode.ConfigurationTarget.WorkspaceFolder);
  }
}
