"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeEndpoint = normalizeEndpoint;
exports.endpointForKey = endpointForKey;
exports.storedConnection = storedConnection;
exports.loadCredentials = loadCredentials;
exports.saveCredentials = saveCredentials;
exports.clearCredentials = clearCredentials;
exports.credentialsChanged = credentialsChanged;
exports.clearLegacySettings = clearLegacySettings;
const vscode = __importStar(require("vscode"));
const SECRET = "truthlocks-connection-v2";
const LEGACY_SECRET = "truthlocks-api-key";
let connection;
let storage;
function normalizeEndpoint(value) {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash ||
        (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
        throw new Error("Use HTTPS, or HTTP on localhost, without credentials, query parameters or fragments.");
    }
    return url.toString().replace(/\/+$/, "").replace(/\/machine-identity$/, "");
}
function endpointForKey(endpoint, key) {
    const url = new URL(normalizeEndpoint(endpoint));
    if (["api.truthlocks.com", "sandbox-api.truthlocks.com"].includes(url.hostname)) {
        if (key.startsWith("tl_test_"))
            url.hostname = "sandbox-api.truthlocks.com";
        if (key.startsWith("tl_live_"))
            url.hostname = "api.truthlocks.com";
    }
    return normalizeEndpoint(url.toString());
}
function storedConnection(endpoint) {
    const apiUrl = normalizeEndpoint(endpoint);
    // Workspace settings cannot redirect a saved credential to another host.
    if (connection && (connection.apiUrl === apiUrl || connection.apiUrl === endpointForKey(apiUrl, connection.apiKey))) {
        return { ...connection };
    }
    return { apiUrl, apiKey: "" };
}
async function loadCredentials(secrets) {
    storage = secrets;
    connection = undefined;
    const raw = await secrets.get(SECRET);
    if (!raw)
        return;
    const value = JSON.parse(raw);
    if (typeof value.apiUrl !== "string" || typeof value.apiKey !== "string")
        throw new Error("Stored connection is invalid; configure credentials again.");
    connection = { apiUrl: normalizeEndpoint(value.apiUrl), apiKey: value.apiKey };
}
async function saveCredentials(endpoint, apiKey) {
    if (!storage)
        throw new Error("Secret storage is not ready");
    if (!apiKey.trim() || /[\r\n]/.test(apiKey))
        throw new Error("Enter a valid API key");
    const value = { apiUrl: endpointForKey(endpoint, apiKey.trim()), apiKey: apiKey.trim() };
    await storage.store(SECRET, JSON.stringify(value));
    connection = value;
    return value.apiUrl;
}
async function clearCredentials() {
    connection = undefined;
    if (storage) {
        await storage.delete(SECRET);
        await storage.delete(LEGACY_SECRET);
    }
}
function credentialsChanged(event) { return event.key === SECRET; }
async function clearLegacySettings() {
    const cfg = vscode.workspace.getConfiguration("maip");
    const inspected = cfg.inspect("apiKey");
    if (inspected?.globalValue !== undefined)
        await cfg.update("apiKey", undefined, vscode.ConfigurationTarget.Global);
    if (inspected?.workspaceValue !== undefined)
        await cfg.update("apiKey", undefined, vscode.ConfigurationTarget.Workspace);
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
        const scoped = vscode.workspace.getConfiguration("maip", folder.uri);
        if (scoped.inspect("apiKey")?.workspaceFolderValue !== undefined)
            await scoped.update("apiKey", undefined, vscode.ConfigurationTarget.WorkspaceFolder);
    }
}
//# sourceMappingURL=credentials.js.map