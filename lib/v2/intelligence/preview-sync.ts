import { getIntelligenceSessionStore } from "./session-store";
import type { IntelligencePreview } from "./types";

/** Rehydrate preview on server when Railway /tmp or another instance lost session store state. */
export function restorePreviewFromClient(input: {
  previewId: string;
  sessionId: string;
  preview?: IntelligencePreview | null;
}): void {
  if (!input.preview || input.preview.previewId !== input.previewId) return;

  const store = getIntelligenceSessionStore();
  const merged: IntelligencePreview = {
    ...input.preview,
    sessionId: input.sessionId,
    status: input.preview.status === "PREVIEW" || input.preview.status === "SAVED"
      ? input.preview.status
      : "PREVIEW",
  };

  store.savePreview(merged);
  if (merged.articles.length > 0) {
    store.cacheArticles(input.sessionId, merged.articles);
  }
}

export { buildClientPreviewSnapshot } from "./preview-snapshot";
