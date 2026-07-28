import type { AuditLogRepository, AuditSearchQuery } from "./ports/repositories";
import type { GmActor, GmAuditAction, GmAuditLogEntry } from "../domain/gm/audit-types";
export class GmAuditService {
  constructor(private readonly audit: AuditLogRepository) {}

  async log(
    sessionId: string | undefined,
    actor: GmActor,
    action: GmAuditAction,
    payload: Record<string, unknown> = {},
    target?: { companyId?: string; teamName?: string }
  ): Promise<GmAuditLogEntry> {
    return this.audit.append({
      sessionId,
      actorId: actor.userId,
      actorRole: actor.role,
      action,
      reason: actor.reason,
      targetCompanyId: target?.companyId,
      targetTeamName: target?.teamName,
      payload,
      occurredAt: new Date(),
    });
  }

  async listSessionAudit(sessionId: string, limit = 50): Promise<GmAuditLogEntry[]> {
    return this.audit.listBySession(sessionId, limit);
  }

  async searchAudit(query: AuditSearchQuery) {
    return this.audit.search(query);
  }
}