import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ update: vi.fn(), inspect: vi.fn(() => ({})) }));
vi.mock("vscode", () => ({
  workspace: {getConfiguration: () => fixtures, workspaceFolders: []},
  ConfigurationTarget: {Global: 1, Workspace: 2, WorkspaceFolder: 3},
}));
import {loadCredentials, saveCredentials, storedConnection, clearCredentials, clearLegacySettings, normalizeEndpoint} from "../src/credentials";

describe("endpoint-bound secret storage", () => {
  let values: Map<string,string>;
  const secrets = {get: vi.fn(), store: vi.fn(), delete: vi.fn(), onDidChange: vi.fn(), keys: vi.fn()};
  beforeEach(async () => {
    values = new Map();vi.clearAllMocks();fixtures.inspect.mockReturnValue({});
    secrets.get.mockImplementation(async key => values.get(key));
    secrets.store.mockImplementation(async (key,value) => {values.set(key,value);});
    secrets.delete.mockImplementation(async key => {values.delete(key);});
    await loadCredentials(secrets);
  });
  it("saves the key only in SecretStorage and reloads it", async () => {
    await saveCredentials("https://sandbox-api.truthlocks.com/v1", "tl_test_fixture");
    expect(fixtures.update).not.toHaveBeenCalled();
    await loadCredentials(secrets);
    expect(storedConnection("https://sandbox-api.truthlocks.com/v1").apiKey).toBe("tl_test_fixture");
  });
  it("does not forward keys to a changed host or path", async () => {
    await saveCredentials("https://sandbox-api.truthlocks.com/v1", "tl_test_fixture");
    for (const endpoint of ["https://other.example/v1","https://sandbox-api.truthlocks.com.evil.example/v1","https://sandbox-api.truthlocks.com/other"]) {
      expect(storedConnection(endpoint).apiKey).toBe("");
    }
  });
  it("selects the known sandbox hostname for test keys without substring matching", async () => {
    expect(await saveCredentials("https://api.truthlocks.com/v1", "tl_test_fixture")).toBe("https://sandbox-api.truthlocks.com/v1");
    expect(storedConnection("https://api.truthlocks.com/v1").apiUrl).toBe("https://sandbox-api.truthlocks.com/v1");
    expect(await saveCredentials("https://api.truthlocks.com.other.example/v1", "tl_test_fixture")).toBe("https://api.truthlocks.com.other.example/v1");
  });
  it.each(["http://api.truthlocks.com/v1","https://user:password@example.test/v1","https://api.truthlocks.com/v1?key=secret","https://api.truthlocks.com/v1#fragment","file:///tmp/key"])("rejects unsafe endpoint %s", endpoint => {
    expect(() => normalizeEndpoint(endpoint)).toThrow();
  });
  it("allows local HTTP for explicit local development", () => {expect(normalizeEndpoint("http://127.0.0.1:8080/v1/")).toBe("http://127.0.0.1:8080/v1");});
  it("clears in-memory and persisted credentials on sign out", async () => {
    await saveCredentials("https://sandbox-api.truthlocks.com/v1", "tl_test_fixture");
    await clearCredentials();expect(values.size).toBe(0);expect(storedConnection("https://sandbox-api.truthlocks.com/v1").apiKey).toBe("");
  });
  it("does not silently import repository settings or an unbound legacy secret", async () => {
    values.set("truthlocks-api-key", "old-fixture");await loadCredentials(secrets);
    expect(storedConnection("https://sandbox-api.truthlocks.com/v1").apiKey).toBe("");
  });
  it("removes legacy plaintext settings after explicit configuration", async () => {
    fixtures.inspect.mockReturnValue({globalValue:"legacy",workspaceValue:"legacy"});
    await clearLegacySettings();expect(fixtures.update.mock.calls).toEqual([["apiKey",undefined,1],["apiKey",undefined,2]]);
  });
  it("does not update the cached key when secret persistence fails", async () => {
    secrets.store.mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(saveCredentials("https://sandbox-api.truthlocks.com/v1", "tl_test_fixture")).rejects.toThrow();
    expect(storedConnection("https://sandbox-api.truthlocks.com/v1").apiKey).toBe("");
  });
});
