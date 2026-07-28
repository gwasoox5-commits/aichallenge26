import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { getBspDataDir } from "@/lib/bsp/data-dir";
import type { IntelligencePreview, IntelligenceSessionSnapshot, NewsArticle } from "./types";

const DATA_DIR = getBspDataDir();
const SESSION_FILE = join(DATA_DIR, "v2-intelligence-sessions.json");

function emptySessionSnapshot(): IntelligenceSessionSnapshot {
  return { previews: [], articleCache: {} };
}

function loadSessions(): IntelligenceSessionSnapshot {
  if (!existsSync(SESSION_FILE)) return emptySessionSnapshot();
  try {
    const parsed = JSON.parse(readFileSync(SESSION_FILE, "utf-8")) as IntelligenceSessionSnapshot;
    return { previews: parsed.previews ?? [], articleCache: parsed.articleCache ?? {} };
  } catch {
    return emptySessionSnapshot();
  }
}

function persistSessions(snapshot: IntelligenceSessionSnapshot) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(SESSION_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
}

export class IntelligenceSessionStore {
  private snapshot: IntelligenceSessionSnapshot;
  private readonly persist: boolean;

  constructor(options?: { persist?: boolean; initial?: IntelligenceSessionSnapshot }) {
    this.persist = options?.persist ?? process.env.BSP_USE_MEMORY !== "1";
    this.snapshot = options?.initial ?? (this.persist ? loadSessions() : emptySessionSnapshot());
  }

  reset() {
    this.snapshot = emptySessionSnapshot();
    if (this.persist) persistSessions(this.snapshot);
  }

  getPreview(previewId: string): IntelligencePreview | undefined {
    return this.snapshot.previews.find((p) => p.previewId === previewId);
  }

  listBySession(sessionId: string): IntelligencePreview[] {
    return this.snapshot.previews.filter((p) => p.sessionId === sessionId);
  }

  savePreview(preview: IntelligencePreview) {
    const idx = this.snapshot.previews.findIndex((p) => p.previewId === preview.previewId);
    if (idx >= 0) this.snapshot.previews[idx] = preview;
    else this.snapshot.previews.push(preview);
    if (this.persist) persistSessions(this.snapshot);
  }

  deletePreview(previewId: string): boolean {
    const before = this.snapshot.previews.length;
    this.snapshot.previews = this.snapshot.previews.filter((p) => p.previewId !== previewId);
    if (this.persist) persistSessions(this.snapshot);
    return this.snapshot.previews.length < before;
  }

  getSnapshot(): IntelligenceSessionSnapshot {
    return structuredClone(this.snapshot);
  }

  cacheArticles(sessionId: string, articles: NewsArticle[]) {
    if (!this.snapshot.articleCache) this.snapshot.articleCache = {};
    const bucket = { ...(this.snapshot.articleCache[sessionId] ?? {}) };
    for (const article of articles) {
      bucket[article.id] = article;
    }
    this.snapshot.articleCache[sessionId] = bucket;
    if (this.persist) persistSessions(this.snapshot);
  }

  getCachedArticle(sessionId: string, articleId: string): NewsArticle | undefined {
    return this.snapshot.articleCache?.[sessionId]?.[articleId];
  }
}

const globalRef = globalThis as unknown as { v2IntelligenceSessionStore?: IntelligenceSessionStore };

export function getIntelligenceSessionStore(): IntelligenceSessionStore {
  if (!globalRef.v2IntelligenceSessionStore) {
    globalRef.v2IntelligenceSessionStore = new IntelligenceSessionStore();
  }
  return globalRef.v2IntelligenceSessionStore;
}

export function resetIntelligenceSessionStore(options?: { persist?: boolean }) {
  globalRef.v2IntelligenceSessionStore = new IntelligenceSessionStore({
    persist: options?.persist ?? false,
  });
}
