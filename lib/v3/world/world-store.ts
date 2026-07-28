import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import type { WorldSessionRecord, WorldStoreSnapshot } from "./types";

const DATA_DIR = join(process.cwd(), ".bsp-data");
const DATA_FILE = join(DATA_DIR, "v3-world.json");

function emptySnapshot(): WorldStoreSnapshot {
  return { sessions: [] };
}

function loadSnapshot(): WorldStoreSnapshot {
  if (!existsSync(DATA_FILE)) return emptySnapshot();
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as WorldStoreSnapshot;
    return { sessions: parsed.sessions ?? [] };
  } catch {
    return emptySnapshot();
  }
}

function persistSnapshot(snapshot: WorldStoreSnapshot) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
}

export class WorldStore {
  private snapshot: WorldStoreSnapshot;
  private readonly persist: boolean;

  constructor(options?: { persist?: boolean; initial?: WorldStoreSnapshot }) {
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

  getSession(sessionId: string): WorldSessionRecord | undefined {
    return this.snapshot.sessions.find((s) => s.sessionId === sessionId);
  }

  saveSession(record: WorldSessionRecord) {
    const idx = this.snapshot.sessions.findIndex((s) => s.sessionId === record.sessionId);
    if (idx >= 0) this.snapshot.sessions[idx] = record;
    else this.snapshot.sessions.push(record);
    this.save();
  }

  listSessions(): WorldSessionRecord[] {
    return [...this.snapshot.sessions];
  }

  getSnapshot(): WorldStoreSnapshot {
    return structuredClone(this.snapshot);
  }

  restoreSnapshot(snapshot: WorldStoreSnapshot) {
    this.snapshot = snapshot;
    this.save();
  }
}

const globalRef = globalThis as unknown as { v3WorldStore?: WorldStore };

export function getWorldStore(): WorldStore {
  if (!globalRef.v3WorldStore) {
    globalRef.v3WorldStore = new WorldStore();
  }
  return globalRef.v3WorldStore;
}

export function resetWorldStore(options?: { persist?: boolean }) {
  globalRef.v3WorldStore = new WorldStore({ persist: options?.persist ?? false });
}
