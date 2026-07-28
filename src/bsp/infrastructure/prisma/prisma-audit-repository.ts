import { Prisma } from ".prisma/bsp-client";
import type { GmAuditAction, GmAuditLogEntry } from "../../domain/gm/audit-types";
import type { AuditLogRepository, AuditSearchQuery } from "../../application/ports/repositories";
import { bspPrisma } from "./client";

function toEntry(row: {
  id: string;
  sessionId: string | null;
  actorId: string;
  actorRole: string;
  action: string;
  reason: string | null;
  targetCompanyId: string | null;
  targetTeamName: string | null;
  payload: unknown;
  occurredAt: Date;
}): GmAuditLogEntry {
  return {
    id: row.id,
    sessionId: row.sessionId ?? undefined,
    actorId: row.actorId,
    actorRole: row.actorRole as GmAuditLogEntry["actorRole"],
    action: row.action as GmAuditAction,
    reason: row.reason ?? undefined,
    targetCompanyId: row.targetCompanyId ?? undefined,
    targetTeamName: row.targetTeamName ?? undefined,
    payload: (row.payload as Record<string, unknown>) ?? {},
    occurredAt: row.occurredAt,
  };
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  async append(entry: Omit<GmAuditLogEntry, "id">): Promise<GmAuditLogEntry> {
    const row = await bspPrisma.bspAuditLog.create({
      data: {
        sessionId: entry.sessionId ?? null,
        actorId: entry.actorId,
        actorRole: entry.actorRole,
        action: entry.action,
        reason: entry.reason,
        targetCompanyId: entry.targetCompanyId,
        targetTeamName: entry.targetTeamName,
        payload: entry.payload as Prisma.InputJsonValue,
        occurredAt: entry.occurredAt,
      },
    });
    return toEntry(row);
  }

  async listBySession(sessionId: string, limit = 50): Promise<GmAuditLogEntry[]> {
    const rows = await bspPrisma.bspAuditLog.findMany({
      where: { sessionId },
      orderBy: { occurredAt: "desc" },
      take: limit,
    });
    return rows.map(toEntry);
  }

  async search(query: AuditSearchQuery): Promise<{ entries: GmAuditLogEntry[]; total: number }> {
    const where: Prisma.BspAuditLogWhereInput = {};
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.action) where.action = query.action;
    if (query.actorRole) where.actorRole = query.actorRole;
    if (query.from || query.to) {
      where.occurredAt = {};
      if (query.from) where.occurredAt.gte = query.from;
      if (query.to) where.occurredAt.lte = query.to;
    }

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [rows, total] = await Promise.all([
      bspPrisma.bspAuditLog.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        take: limit,
        skip: offset,
      }),
      bspPrisma.bspAuditLog.count({ where }),
    ]);

    return { entries: rows.map(toEntry), total };
  }
}

export function createPrismaAuditRepository(): AuditLogRepository {
  return new PrismaAuditLogRepository();
}
