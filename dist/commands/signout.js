"use strict";
/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * Command: maip.signOut
 * Clears all stored credentials and resets configuration.
 */
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
exports.registerSignOutCommand = registerSignOutCommand;
const vscode = __importStar(require("vscode"));
const credentials_1 = require("../credentials");
function registerSignOutCommand(_context) {
    return vscode.commands.registerCommand("maip.signOut", async () => {
        const confirm = await vscode.window.showWarningMessage("Sign out of Truthlocks? This will remove your API key and credentials.", { modal: true }, "Sign Out");
        if (confirm !== "Sign Out") {
            return;
        }
        // Clear SecretStorage
        await (0, credentials_1.clearCredentials)();
        await (0, credentials_1.clearLegacySettings)();
        // Clear VS Code settings
        const cfg = vscode.workspace.getConfiguration("maip");
        await cfg.update("tenantId", "", vscode.ConfigurationTarget.Global);
        await cfg.update("agentId", "", vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage("Signed out. Run 'MAIP: Register Developer' to connect again.");
    });
}
//# sourceMappingURL=signout.js.map