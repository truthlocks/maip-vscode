import * as vscode from "vscode";
export declare function normalizeEndpoint(value: string): string;
export declare function endpointForKey(endpoint: string, key: string): string;
export declare function storedConnection(endpoint: string): {
    apiUrl: string;
    apiKey: string;
};
export declare function loadCredentials(secrets: vscode.SecretStorage): Promise<void>;
export declare function saveCredentials(endpoint: string, apiKey: string): Promise<string>;
export declare function clearCredentials(): Promise<void>;
export declare function credentialsChanged(event: vscode.SecretStorageChangeEvent): boolean;
export declare function clearLegacySettings(): Promise<void>;
//# sourceMappingURL=credentials.d.ts.map