-- P7 Production Readiness: audit persistence + session archive

ALTER TABLE "BspGameSession" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE TABLE "BspAuditLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "targetCompanyId" TEXT,
    "targetTeamName" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BspAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BspGameSession_sessionPhase_idx" ON "BspGameSession"("sessionPhase");
CREATE INDEX "BspGameSession_archivedAt_idx" ON "BspGameSession"("archivedAt");
CREATE INDEX "BspGameSession_createdAt_idx" ON "BspGameSession"("createdAt" DESC);

CREATE INDEX "BspAuditLog_sessionId_occurredAt_idx" ON "BspAuditLog"("sessionId", "occurredAt" DESC);
CREATE INDEX "BspAuditLog_action_occurredAt_idx" ON "BspAuditLog"("action", "occurredAt" DESC);
CREATE INDEX "BspAuditLog_actorRole_idx" ON "BspAuditLog"("actorRole");
CREATE INDEX "BspAuditLog_occurredAt_idx" ON "BspAuditLog"("occurredAt" DESC);

CREATE INDEX "BspEconomyPresetApply_sessionId_appliedAt_idx" ON "BspEconomyPresetApply"("sessionId", "appliedAt" DESC);

ALTER TABLE "BspAuditLog" ADD CONSTRAINT "BspAuditLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BspGameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
