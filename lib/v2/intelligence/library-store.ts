import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { getBspDataDir } from "@/lib/bsp/data-dir";
import type { IntelligencePreview, LibraryEntry, LibraryStoreSnapshot } from "./types";

const DATA_DIR = getBspDataDir();
const LIBRARY_FILE = join(DATA_DIR, "v2-intelligence-library.json");

function emptyLibrary(): LibraryStoreSnapshot {
  return { entries: [] };
}

function loadLibrary(): LibraryStoreSnapshot {
  if (!existsSync(LIBRARY_FILE)) return emptyLibrary();
  try {
    const parsed = JSON.parse(readFileSync(LIBRARY_FILE, "utf-8")) as LibraryStoreSnapshot;
    return { entries: parsed.entries ?? [] };
  } catch {
    return emptyLibrary();
  }
}

function persistLibrary(snapshot: LibraryStoreSnapshot) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(LIBRARY_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
}

export class IntelligenceLibraryStore {
  private snapshot: LibraryStoreSnapshot;
  private readonly persist: boolean;

  constructor(options?: { persist?: boolean; initial?: LibraryStoreSnapshot }) {
    this.persist = options?.persist ?? process.env.BSP_USE_MEMORY !== "1";
    this.snapshot = options?.initial ?? (this.persist ? loadLibrary() : emptyLibrary());
  }

  reset() {
    this.snapshot = emptyLibrary();
    if (this.persist) persistLibrary(this.snapshot);
  }

  listEntries(): LibraryEntry[] {
    return [...this.snapshot.entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  listFavorites(): LibraryEntry[] {
    return this.listEntries().filter((e) => e.favorite);
  }

  getEntry(libraryId: string): LibraryEntry | undefined {
    return this.snapshot.entries.find((e) => e.libraryId === libraryId);
  }

  saveFromPreview(preview: IntelligencePreview, title?: string, tags: string[] = []): LibraryEntry {
    const now = new Date().toISOString();
    const existing = this.snapshot.entries.find((e) => e.preview.previewId === preview.previewId);
    if (existing) {
      existing.preview = preview;
      existing.title = title ?? existing.title;
      existing.tags = tags.length ? tags : existing.tags;
      existing.updatedAt = now;
      if (this.persist) persistLibrary(this.snapshot);
      return existing;
    }
    const entry: LibraryEntry = {
      libraryId: `lib-${preview.previewId}`,
      preview: { ...preview, status: "SAVED" },
      title: title ?? preview.analysis?.eventSummary.slice(0, 80) ?? "Untitled scenario",
      favorite: false,
      tags,
      createdAt: now,
      updatedAt: now,
    };
    this.snapshot.entries.push(entry);
    if (this.persist) persistLibrary(this.snapshot);
    return entry;
  }

  setFavorite(libraryId: string, favorite: boolean): LibraryEntry | undefined {
    const entry = this.getEntry(libraryId);
    if (!entry) return undefined;
    entry.favorite = favorite;
    entry.updatedAt = new Date().toISOString();
    if (this.persist) persistLibrary(this.snapshot);
    return entry;
  }

  duplicate(libraryId: string): LibraryEntry | undefined {
    const source = this.getEntry(libraryId);
    if (!source) return undefined;
    const now = new Date().toISOString();
    const newPreviewId = `prev-dup-${Date.now()}`;
    const copy: LibraryEntry = {
      libraryId: `lib-${newPreviewId}`,
      preview: {
        ...structuredClone(source.preview),
        previewId: newPreviewId,
        status: "SAVED",
        createdAt: now,
        updatedAt: now,
      },
      title: `${source.title} (복사)`,
      favorite: false,
      tags: [...source.tags],
      createdAt: now,
      updatedAt: now,
    };
    this.snapshot.entries.push(copy);
    if (this.persist) persistLibrary(this.snapshot);
    return copy;
  }

  deleteEntry(libraryId: string): boolean {
    const before = this.snapshot.entries.length;
    this.snapshot.entries = this.snapshot.entries.filter((e) => e.libraryId !== libraryId);
    if (this.persist) persistLibrary(this.snapshot);
    return this.snapshot.entries.length < before;
  }

  exportJson(libraryId: string): string | undefined {
    const entry = this.getEntry(libraryId);
    if (!entry) return undefined;
    return JSON.stringify(entry, null, 2);
  }

  importJson(raw: string): LibraryEntry {
    const parsed = JSON.parse(raw) as LibraryEntry;
    const now = new Date().toISOString();
    const newPreviewId = `prev-imp-${Date.now()}`;
    const entry: LibraryEntry = {
      ...parsed,
      libraryId: `lib-${newPreviewId}`,
      preview: {
        ...parsed.preview,
        previewId: newPreviewId,
        status: "SAVED",
        createdAt: now,
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };
    this.snapshot.entries.push(entry);
    if (this.persist) persistLibrary(this.snapshot);
    return entry;
  }

  getSnapshot(): LibraryStoreSnapshot {
    return structuredClone(this.snapshot);
  }
}

const globalRef = globalThis as unknown as { v2IntelligenceLibraryStore?: IntelligenceLibraryStore };

export function getIntelligenceLibraryStore(): IntelligenceLibraryStore {
  if (!globalRef.v2IntelligenceLibraryStore) {
    globalRef.v2IntelligenceLibraryStore = new IntelligenceLibraryStore();
  }
  return globalRef.v2IntelligenceLibraryStore;
}

export function resetIntelligenceLibraryStore(options?: { persist?: boolean }) {
  globalRef.v2IntelligenceLibraryStore = new IntelligenceLibraryStore({
    persist: options?.persist ?? false,
  });
}
