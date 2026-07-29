import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { getBspDataDir } from "@/lib/bsp/data-dir";
import type {
  EventTimelineEntry,
  IntelligencePublishRecord,
  PublishAuditEntry,
  PublishStoreSnapshot,
  EventChainGraph,
} from "./publish-types";

const DATA_DIR = getBspDataDir();
const DATA_FILE = join(DATA_DIR, "v2-intelligence-publish.json");

function emptySnapshot(): PublishStoreSnapshot {
  return { records: [], audits: [], timelines: [], eventChains: [] };
}

function loadSnapshot(): PublishStoreSnapshot {
  if (!existsSync(DATA_FILE)) return emptySnapshot();
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as PublishStoreSnapshot;
    return {
      records: parsed.records ?? [],
      audits: parsed.audits ?? [],
      timelines: parsed.timelines ?? [],
      eventChains: parsed.eventChains ?? [],
    };
  } catch {
    return emptySnapshot();
  }
}

function persistSnapshot(snapshot: PublishStoreSnapshot) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
}

export class IntelligencePublishStore {
  private snapshot: PublishStoreSnapshot;
  private readonly persist: boolean;

  constructor(options?: { persist?: boolean; initial?: PublishStoreSnapshot }) {
    this.persist = options?.persist ?? process.env.BSP_USE_MEMORY !== "1";
    this.snapshot = options?.initial ?? (this.persist ? loadSnapshot() : emptySnapshot());
  }

  reset() {
    this.snapshot = emptySnapshot();
    if (this.persist) persistSnapshot(this.snapshot);
  }

  private save() {
    if (this.persist) persistSnapshot(this.snapshot);
  }

  getRecord(publishId: string): IntelligencePublishRecord | undefined {
    return this.snapshot.records.find((r) => r.publishId === publishId);
  }

  listBySession(sessionId: string): IntelligencePublishRecord[] {
    return this.snapshot.records
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listActiveBySession(sessionId: string): IntelligencePublishRecord[] {
    return this.listBySession(sessionId).filter((r) =>
      ["PUBLISHED", "ACTIVE", "EXPIRING", "SCHEDULED"].includes(r.status)
    );
  }

  saveRecord(record: IntelligencePublishRecord) {
    const idx = this.snapshot.records.findIndex((r) => r.publishId === record.publishId);
    if (idx >= 0) this.snapshot.records[idx] = record;
    else this.snapshot.records.push(record);
    this.save();
  }

  saveAudit(entry: PublishAuditEntry) {
    this.snapshot.audits.push(entry);
    this.save();
  }

  listAudits(publishId: string): PublishAuditEntry[] {
    return this.snapshot.audits
      .filter((a) => a.publishId === publishId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  saveTimelineEntry(entry: EventTimelineEntry) {
    this.snapshot.timelines.push(entry);
    this.save();
  }

  getTimeline(publishId: string): EventTimelineEntry[] {
    return this.snapshot.timelines
      .filter((t) => t.publishId === publishId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  saveEventChain(chain: EventChainGraph) {
    const idx = this.snapshot.eventChains.findIndex((c) => c.chainId === chain.chainId);
    if (idx >= 0) this.snapshot.eventChains[idx] = chain;
    else this.snapshot.eventChains.push(chain);
    this.save();
  }

  getEventChain(chainId: string): EventChainGraph | undefined {
    return this.snapshot.eventChains.find((c) => c.chainId === chainId);
  }

  findByPreviewId(previewId: string): IntelligencePublishRecord | undefined {
    return this.snapshot.records.find((r) => r.previewId === previewId);
  }

  findByDraftId(draftId: string): IntelligencePublishRecord | undefined {
    return this.snapshot.records.find((r) => r.draftId === draftId);
  }

  getSnapshot(): PublishStoreSnapshot {
    return structuredClone(this.snapshot);
  }

  restoreSnapshot(snapshot: PublishStoreSnapshot) {
    this.snapshot = snapshot;
    this.save();
  }

  purgeSession(sessionId: string) {
    const publishIds = new Set(
      this.snapshot.records.filter((r) => r.sessionId === sessionId).map((r) => r.publishId)
    );
    this.snapshot.records = this.snapshot.records.filter((r) => r.sessionId !== sessionId);
    this.snapshot.audits = this.snapshot.audits.filter((a) => !publishIds.has(a.publishId));
    this.snapshot.timelines = this.snapshot.timelines.filter((t) => !publishIds.has(t.publishId));
    this.snapshot.eventChains = this.snapshot.eventChains.filter((c) => c.sessionId !== sessionId);
    this.save();
  }
}

const globalRef = globalThis as unknown as { v2IntelligencePublishStore?: IntelligencePublishStore };

export function getIntelligencePublishStore(): IntelligencePublishStore {
  if (!globalRef.v2IntelligencePublishStore) {
    globalRef.v2IntelligencePublishStore = new IntelligencePublishStore();
  }
  return globalRef.v2IntelligencePublishStore;
}

export function resetIntelligencePublishStore(options?: { persist?: boolean }) {
  globalRef.v2IntelligencePublishStore = new IntelligencePublishStore({
    persist: options?.persist ?? false,
  });
}
