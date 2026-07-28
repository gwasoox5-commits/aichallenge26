import type { GmAuditLogEntry } from "../../domain/gm/audit-types";
import type { AuditLogRepository, AuditSearchQuery } from "../../application/ports/repositories";

interface AuditState {
  logs: GmAuditLogEntry[];
}

const globalForAudit = globalThis as unknown as { bspAuditState?: AuditState };

function auditState(): AuditState {
  if (!globalForAudit.bspAuditState) {
    globalForAudit.bspAuditState = { logs: [] };
  }
  return globalForAudit.bspAuditState;
}

export class MemoryAuditLogRepository implements AuditLogRepository {
  async append(entry: Omit<GmAuditLogEntry, "id">): Promise<GmAuditLogEntry> {
    const record: GmAuditLogEntry = { ...entry, id: crypto.randomUUID() };
    auditState().logs.push(record);
    return record;
  }

  async listBySession(sessionId: string, limit = 50): Promise<GmAuditLogEntry[]> {
    return auditState()
      .logs.filter((l) => l.sessionId === sessionId)
      .slice(-limit)
      .reverse();
  }

  async search(query: AuditSearchQuery): Promise<{ entries: GmAuditLogEntry[]; total: number }> {
    let filtered = auditState().logs;
    if (query.sessionId) filtered = filtered.filter((l) => l.sessionId === query.sessionId);
    if (query.action) filtered = filtered.filter((l) => l.action === query.action);
    if (query.actorRole) filtered = filtered.filter((l) => l.actorRole === query.actorRole);
    if (query.from) filtered = filtered.filter((l) => l.occurredAt >= query.from!);
    if (query.to) filtered = filtered.filter((l) => l.occurredAt <= query.to!);
    filtered = filtered.slice().sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    const total = filtered.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    return { entries: filtered.slice(offset, offset + limit), total };
  }
}

export function resetAuditState() {
  globalForAudit.bspAuditState = { logs: [] };
}

export function createMemoryAuditRepository(): AuditLogRepository {
  return new MemoryAuditLogRepository();
}
