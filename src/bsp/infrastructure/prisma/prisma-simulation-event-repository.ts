import { Prisma } from ".prisma/bsp-client";
import { DEFAULT_ECONOMY_VALUES, type EconomyValues } from "../../domain/types";
import type {
  EconomicPatchRecord,
  EventHistoryEntry,
  PendingManualPatch,
  SimulationEvent,
} from "../../domain/events/event-types";
import type { SimulationEventRepository } from "../../application/ports/repositories";
import { bspPrisma } from "./client";
import {
  MemorySimulationEventRepository,
  resetSimulationEventState,
} from "../memory/memory-simulation-event-repository";

/** PostgreSQL-backed patches; events/history remain in-memory until P8 full persistence. */
export class PrismaSimulationEventRepository implements SimulationEventRepository {
  private readonly memory = new MemorySimulationEventRepository();

  async save(event: SimulationEvent): Promise<void> {
    return this.memory.save(event);
  }

  async findById(sessionId: string, eventId: string): Promise<SimulationEvent | null> {
    return this.memory.findById(sessionId, eventId);
  }

  async listBySession(sessionId: string): Promise<SimulationEvent[]> {
    return this.memory.listBySession(sessionId);
  }

  async savePatch(patch: EconomicPatchRecord): Promise<void> {
    await bspPrisma.bspEconomicPatch.create({
      data: {
        id: patch.id,
        sessionId: patch.sessionId,
        sequence: patch.sequence,
        source: patch.source,
        effects: patch.effects as unknown as Prisma.InputJsonValue,
        valuesBefore: patch.valuesBefore as unknown as Prisma.InputJsonValue,
        valuesAfter: patch.valuesAfter as unknown as Prisma.InputJsonValue,
        occurredAt: patch.occurredAt,
      },
    });
    await this.memory.savePatch(patch);
  }

  async listPatches(sessionId: string): Promise<EconomicPatchRecord[]> {
    const rows = await bspPrisma.bspEconomicPatch.findMany({
      where: { sessionId },
      orderBy: { sequence: "asc" },
    });
    if (rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        sequence: r.sequence,
        source: r.source as EconomicPatchRecord["source"],
        effects: r.effects as unknown as EconomicPatchRecord["effects"],
        valuesBefore: r.valuesBefore as unknown as EconomyValues,
        valuesAfter: r.valuesAfter as unknown as EconomyValues,
        occurredAt: r.occurredAt,
      }));
    }
    return this.memory.listPatches(sessionId);
  }

  async nextPatchSequence(sessionId: string): Promise<number> {
    const last = await bspPrisma.bspEconomicPatch.findFirst({
      where: { sessionId },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    if (last) return last.sequence + 1;
    return this.memory.nextPatchSequence(sessionId);
  }

  async appendHistory(entry: EventHistoryEntry): Promise<void> {
    return this.memory.appendHistory(entry);
  }

  async listHistory(sessionId: string, limit?: number): Promise<EventHistoryEntry[]> {
    return this.memory.listHistory(sessionId, limit);
  }

  async getPeriodOpenEconomy(sessionId: string): Promise<EconomyValues | null> {
    return this.memory.getPeriodOpenEconomy(sessionId);
  }

  async setPeriodOpenEconomy(sessionId: string, values: EconomyValues): Promise<void> {
    return this.memory.setPeriodOpenEconomy(sessionId, values);
  }

  async getCeoBadge(sessionId: string): Promise<boolean> {
    return this.memory.getCeoBadge(sessionId);
  }

  async setCeoBadge(sessionId: string, value: boolean): Promise<void> {
    return this.memory.setCeoBadge(sessionId, value);
  }

  async clearCeoBadge(sessionId: string): Promise<void> {
    return this.memory.clearCeoBadge(sessionId);
  }

  async savePendingPatch(patch: PendingManualPatch): Promise<void> {
    return this.memory.savePendingPatch(patch);
  }

  async listPendingPatches(sessionId: string): Promise<PendingManualPatch[]> {
    return this.memory.listPendingPatches(sessionId);
  }

  async removePendingPatch(sessionId: string, patchId: string): Promise<void> {
    return this.memory.removePendingPatch(sessionId, patchId);
  }

  async clearPendingPatches(sessionId: string): Promise<void> {
    return this.memory.clearPendingPatches(sessionId);
  }
}

export function createPrismaSimulationEventRepository(): SimulationEventRepository {
  return new PrismaSimulationEventRepository();
}

export { resetSimulationEventState };
