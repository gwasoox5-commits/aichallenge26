import { DEFAULT_ECONOMY_VALUES, type EconomyValues } from "../../domain/types";
import type {
  EconomicPatchRecord,
  EventHistoryEntry,
  PendingManualPatch,
  SimulationEvent,
} from "../../domain/events/event-types";
import type { SimulationEventRepository } from "../../application/ports/repositories";

interface SimulationEventState {
  events: SimulationEvent[];
  patches: EconomicPatchRecord[];
  pendingPatches: PendingManualPatch[];
  history: EventHistoryEntry[];
  periodOpenEconomy: Map<string, EconomyValues>;
  ceoBadge: Map<string, boolean>;
  patchSequence: Map<string, number>;
}

const globalForSim = globalThis as unknown as { bspSimulationEventState?: SimulationEventState };

function state(): SimulationEventState {
  if (!globalForSim.bspSimulationEventState) {
    globalForSim.bspSimulationEventState = {
      events: [],
      patches: [],
      pendingPatches: [],
      history: [],
      periodOpenEconomy: new Map(),
      ceoBadge: new Map(),
      patchSequence: new Map(),
    };
  }
  return globalForSim.bspSimulationEventState;
}

export function resetSimulationEventState() {
  globalForSim.bspSimulationEventState = {
    events: [],
    patches: [],
    pendingPatches: [],
    history: [],
    periodOpenEconomy: new Map(),
    ceoBadge: new Map(),
    patchSequence: new Map(),
  };
}

export class MemorySimulationEventRepository implements SimulationEventRepository {
  async save(event: SimulationEvent): Promise<void> {
    const s = state();
    const idx = s.events.findIndex((e) => e.id === event.id);
    if (idx >= 0) s.events[idx] = event;
    else s.events.push(event);
  }

  async findById(sessionId: string, eventId: string): Promise<SimulationEvent | null> {
    return state().events.find((e) => e.sessionId === sessionId && e.id === eventId) ?? null;
  }

  async listBySession(sessionId: string): Promise<SimulationEvent[]> {
    return state().events.filter((e) => e.sessionId === sessionId);
  }

  async savePatch(patch: EconomicPatchRecord): Promise<void> {
    state().patches.push(patch);
    state().patchSequence.set(patch.sessionId, patch.sequence);
  }

  async listPatches(sessionId: string): Promise<EconomicPatchRecord[]> {
    return state()
      .patches.filter((p) => p.sessionId === sessionId)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async nextPatchSequence(sessionId: string): Promise<number> {
    const current = state().patchSequence.get(sessionId) ?? 0;
    return current + 1;
  }

  async appendHistory(entry: EventHistoryEntry): Promise<void> {
    state().history.push(entry);
  }

  async listHistory(sessionId: string, limit = 100): Promise<EventHistoryEntry[]> {
    return state()
      .history.filter((h) => h.sessionId === sessionId)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, limit);
  }

  async getPeriodOpenEconomy(sessionId: string): Promise<EconomyValues | null> {
    return state().periodOpenEconomy.get(sessionId) ?? null;
  }

  async setPeriodOpenEconomy(sessionId: string, values: EconomyValues): Promise<void> {
    state().periodOpenEconomy.set(sessionId, { ...values });
  }

  async getCeoBadge(sessionId: string): Promise<boolean> {
    return state().ceoBadge.get(sessionId) ?? false;
  }

  async setCeoBadge(sessionId: string, value: boolean): Promise<void> {
    state().ceoBadge.set(sessionId, value);
  }

  async clearCeoBadge(sessionId: string): Promise<void> {
    state().ceoBadge.set(sessionId, false);
  }

  async savePendingPatch(patch: PendingManualPatch): Promise<void> {
    state().pendingPatches.push(patch);
  }

  async listPendingPatches(sessionId: string): Promise<PendingManualPatch[]> {
    return state().pendingPatches.filter((p) => p.sessionId === sessionId);
  }

  async removePendingPatch(sessionId: string, patchId: string): Promise<void> {
    const s = state();
    s.pendingPatches = s.pendingPatches.filter((p) => !(p.sessionId === sessionId && p.id === patchId));
  }

  async clearPendingPatches(sessionId: string): Promise<void> {
    const s = state();
    s.pendingPatches = s.pendingPatches.filter((p) => p.sessionId !== sessionId);
  }
}

export function ensureSessionPeriodOpen(sessionId: string, values?: EconomyValues) {
  const s = state();
  if (!s.periodOpenEconomy.has(sessionId)) {
    s.periodOpenEconomy.set(sessionId, { ...(values ?? DEFAULT_ECONOMY_VALUES) });
  }
}
