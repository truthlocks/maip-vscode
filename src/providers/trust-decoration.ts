/**
 * @license Apache-2.0
 * Copyright 2026 Truthlocks Inc.
 *
 * DecorationProvider for inline trust score badges.
 * Scans documents for agent ID patterns (UUID format) and displays
 * color-coded trust score decorations inline.
 */

import * as vscode from "vscode";
import type { MAIPClient } from "../client";
import { isConfigured, isShowTrustBadgesEnabled } from "../config";

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const TRUST_HIGH_DECORATION = vscode.window.createTextEditorDecorationType({
  after: {
    contentText: " [trusted]",
    color: new vscode.ThemeColor("testing.iconPassed"),
    fontStyle: "italic",
    fontWeight: "normal",
  },
});

const TRUST_MEDIUM_DECORATION = vscode.window.createTextEditorDecorationType({
  after: {
    contentText: " [caution]",
    color: new vscode.ThemeColor("editorWarning.foreground"),
    fontStyle: "italic",
    fontWeight: "normal",
  },
});

const TRUST_LOW_DECORATION = vscode.window.createTextEditorDecorationType({
  after: {
    contentText: " [untrusted]",
    color: new vscode.ThemeColor("testing.iconFailed"),
    fontStyle: "italic",
    fontWeight: "normal",
  },
});

interface CachedScore {
  readonly score: number;
  readonly expiresAt: number;
}

const CACHE_TTL_MS = 60_000;

export class TrustDecorationProvider implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly scoreCache = new Map<string, CachedScore>();
  private decorationTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly client: MAIPClient) {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.triggerUpdateDecorations(editor);
        }
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
          this.triggerUpdateDecorations(editor);
        }
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("maip.showTrustBadges")) {
          const editor = vscode.window.activeTextEditor;
          if (editor) {
            this.triggerUpdateDecorations(editor);
          }
        }
      }),
    );

    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.triggerUpdateDecorations(editor);
    }
  }

  private triggerUpdateDecorations(editor: vscode.TextEditor): void {
    if (this.decorationTimeout) {
      clearTimeout(this.decorationTimeout);
    }
    this.decorationTimeout = setTimeout(() => {
      this.updateDecorations(editor).catch(() => {
        /* swallow — decorations are best-effort */
      });
    }, 500);
  }

  private async updateDecorations(editor: vscode.TextEditor): Promise<void> {
    if (!isConfigured() || !isShowTrustBadgesEnabled()) {
      editor.setDecorations(TRUST_HIGH_DECORATION, []);
      editor.setDecorations(TRUST_MEDIUM_DECORATION, []);
      editor.setDecorations(TRUST_LOW_DECORATION, []);
      return;
    }

    const text = editor.document.getText();
    const uuidMatches: { uuid: string; range: vscode.Range }[] = [];
    const seenUuids = new Set<string>();

    let match: RegExpExecArray | null;
    UUID_REGEX.lastIndex = 0;

    while ((match = UUID_REGEX.exec(text)) !== null) {
      const uuid = match[0].toLowerCase();
      if (!seenUuids.has(uuid)) {
        seenUuids.add(uuid);
      }
      const startPos = editor.document.positionAt(match.index);
      const endPos = editor.document.positionAt(match.index + match[0].length);
      uuidMatches.push({ uuid, range: new vscode.Range(startPos, endPos) });
    }

    if (uuidMatches.length === 0) {
      editor.setDecorations(TRUST_HIGH_DECORATION, []);
      editor.setDecorations(TRUST_MEDIUM_DECORATION, []);
      editor.setDecorations(TRUST_LOW_DECORATION, []);
      return;
    }

    const scores = new Map<string, number>();
    const now = Date.now();

    for (const uuid of seenUuids) {
      const cached = this.scoreCache.get(uuid);
      if (cached && cached.expiresAt > now) {
        scores.set(uuid, cached.score);
        continue;
      }

      try {
        const trustScore = await this.client.getTrustScore(uuid);
        scores.set(uuid, trustScore.trust_score);
        this.scoreCache.set(uuid, {
          score: trustScore.trust_score,
          expiresAt: now + CACHE_TTL_MS,
        });
      } catch {
        scores.set(uuid, -1);
        this.scoreCache.set(uuid, { score: -1, expiresAt: now + CACHE_TTL_MS });
      }
    }

    const highRanges: vscode.DecorationOptions[] = [];
    const mediumRanges: vscode.DecorationOptions[] = [];
    const lowRanges: vscode.DecorationOptions[] = [];

    for (const { uuid, range } of uuidMatches) {
      const score = scores.get(uuid);
      if (score === undefined || score < 0) {
        continue;
      }

      const decoration: vscode.DecorationOptions = {
        range,
        hoverMessage: new vscode.MarkdownString(
          `**MAIP Trust Score:** ${score.toFixed(4)}\n\nAgent: \`${uuid}\``,
        ),
      };

      if (score >= 0.8) {
        highRanges.push(decoration);
      } else if (score >= 0.5) {
        mediumRanges.push(decoration);
      } else {
        lowRanges.push(decoration);
      }
    }

    editor.setDecorations(TRUST_HIGH_DECORATION, highRanges);
    editor.setDecorations(TRUST_MEDIUM_DECORATION, mediumRanges);
    editor.setDecorations(TRUST_LOW_DECORATION, lowRanges);
  }

  dispose(): void {
    if (this.decorationTimeout) {
      clearTimeout(this.decorationTimeout);
    }
    TRUST_HIGH_DECORATION.dispose();
    TRUST_MEDIUM_DECORATION.dispose();
    TRUST_LOW_DECORATION.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
