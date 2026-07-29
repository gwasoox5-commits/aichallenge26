import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { getBspDataDir } from "@/lib/bsp/data-dir";
import type {
  DraftStoreSnapshot,
  EventAcknowledgement,
  EventScenarioDraft,
  NewsPublication,
} from "./types";

const DATA_DIR = getBspDataDir();
const DATA_FILE = join(DATA_DIR, "v2-drafts.json");

function emptySnapshot(): DraftStoreSnapshot {
  return { drafts: [], news: [], acknowledgements: [], pendingNewsByEventId: {} };
}

function loadSnapshot(): DraftStoreSnapshot {
  if (!existsSync(DATA_FILE)) return emptySnapshot();
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as DraftStoreSnapshot;
    return {
      drafts: parsed.drafts ?? [],
      news: parsed.news ?? [],
      acknowledgements: parsed.acknowledgements ?? [],
      pendingNewsByEventId: parsed.pendingNewsByEventId ?? {},
    };
  } catch {
    return emptySnapshot();
  }
}

function persistSnapshot(snapshot: DraftStoreSnapshot) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
}

export class DraftStore {
  private snapshot: DraftStoreSnapshot;
  private readonly persist: boolean;

  constructor(options?: { persist?: boolean; initial?: DraftStoreSnapshot }) {
    this.persist = options?.persist ?? process.env.BSP_USE_MEMORY !== "1";
    this.snapshot = options?.initial ?? (this.persist ? loadSnapshot() : emptySnapshot());
  }

  reset() {
    this.snapshot = emptySnapshot();
    if (this.persist) persistSnapshot(this.snapshot);
  }

  reload() {
    if (this.persist) this.snapshot = loadSnapshot();
  }

  private save() {
    if (this.persist) persistSnapshot(this.snapshot);
  }

  getDraft(draftId: string): EventScenarioDraft | undefined {
    return this.snapshot.drafts.find((d) => d.draftId === draftId);
  }

  listDraftsBySession(sessionId: string): EventScenarioDraft[] {
    return this.snapshot.drafts.filter((d) => d.sessionId === sessionId);
  }

  saveDraft(draft: EventScenarioDraft) {
    const idx = this.snapshot.drafts.findIndex((d) => d.draftId === draft.draftId);
    if (idx >= 0) this.snapshot.drafts[idx] = draft;
    else this.snapshot.drafts.push(draft);
    this.save();
  }

  saveNews(news: NewsPublication) {
    const idx = this.snapshot.news.findIndex((n) => n.newsId === news.newsId);
    if (idx >= 0) this.snapshot.news[idx] = news;
    else this.snapshot.news.push(news);
    this.save();
  }

  getNews(newsId: string): NewsPublication | undefined {
    return this.snapshot.news.find((n) => n.newsId === newsId);
  }

  listNewsBySession(sessionId: string): NewsPublication[] {
    return this.snapshot.news
      .filter((n) => n.sessionId === sessionId && n.publishedAt != null)
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  }

  listAllNewsBySession(sessionId: string): NewsPublication[] {
    return this.snapshot.news.filter((n) => n.sessionId === sessionId);
  }

  registerPendingNews(eventId: string, newsId: string) {
    this.snapshot.pendingNewsByEventId[eventId] = newsId;
    this.save();
  }

  consumePendingNews(eventId: string): NewsPublication | undefined {
    const newsId = this.snapshot.pendingNewsByEventId[eventId];
    if (!newsId) return undefined;
    delete this.snapshot.pendingNewsByEventId[eventId];
    this.save();
    return this.getNews(newsId);
  }

  findDraftBySimulationEventId(eventId: string): EventScenarioDraft | undefined {
    return this.snapshot.drafts.find((d) => d.simulationEventId === eventId);
  }

  saveAcknowledgement(ack: EventAcknowledgement) {
    const exists = this.snapshot.acknowledgements.some(
      (a) => a.newsId === ack.newsId && a.companyId === ack.companyId
    );
    if (!exists) {
      this.snapshot.acknowledgements.push(ack);
      this.save();
    }
  }

  listAcknowledgements(sessionId: string, companyId?: string): EventAcknowledgement[] {
    return this.snapshot.acknowledgements.filter(
      (a) => a.sessionId === sessionId && (!companyId || a.companyId === companyId)
    );
  }

  isNewsAcknowledged(newsId: string, companyId: string): boolean {
    return this.snapshot.acknowledgements.some((a) => a.newsId === newsId && a.companyId === companyId);
  }

  getSnapshot(): DraftStoreSnapshot {
    return structuredClone(this.snapshot);
  }

  restoreSnapshot(snapshot: DraftStoreSnapshot) {
    this.snapshot = structuredClone(snapshot);
    this.save();
  }

  purgeSession(sessionId: string) {
    const eventIds = new Set(
      this.snapshot.drafts
        .filter((d) => d.sessionId === sessionId)
        .map((d) => d.simulationEventId)
        .filter((id): id is string => Boolean(id))
    );
    this.snapshot.drafts = this.snapshot.drafts.filter((d) => d.sessionId !== sessionId);
    this.snapshot.news = this.snapshot.news.filter((n) => n.sessionId !== sessionId);
    this.snapshot.acknowledgements = this.snapshot.acknowledgements.filter((a) => a.sessionId !== sessionId);
    for (const eventId of Object.keys(this.snapshot.pendingNewsByEventId)) {
      if (eventIds.has(eventId)) delete this.snapshot.pendingNewsByEventId[eventId];
    }
    this.save();
  }
}

const globalStore = globalThis as unknown as { v2DraftStore?: DraftStore };

export function getDraftStore(): DraftStore {
  if (!globalStore.v2DraftStore) {
    globalStore.v2DraftStore = new DraftStore();
  }
  return globalStore.v2DraftStore;
}

export function resetDraftStore(options?: { persist?: boolean }) {
  globalStore.v2DraftStore = new DraftStore({ persist: options?.persist ?? false });
}
