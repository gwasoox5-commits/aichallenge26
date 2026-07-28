-- CreateEnum
CREATE TYPE "BspGameStep" AS ENUM ('LOAN', 'FACILITY', 'HIRING', 'MATERIAL', 'PRODUCTION', 'SALES', 'SETTLEMENT');
CREATE TYPE "BspDecisionStatus" AS ENUM ('DRAFT', 'EDITING', 'SUBMITTED', 'VALIDATED', 'POSTED', 'LOCKED', 'SETTLED', 'FAILED');
CREATE TYPE "BspSessionPhase" AS ENUM ('PREPARE', 'RUNNING', 'PAUSED', 'FINISHED');
CREATE TYPE "BspStepPhase" AS ENUM ('STEP1_FINANCE', 'STEP2_INVESTMENT', 'STEP3_HR', 'STEP4_PURCHASE', 'STEP5_PRODUCTION', 'STEP6_SALES', 'STEP7_SETTLEMENT', 'HALF_YEAR_END', 'GAME_END');

-- CreateTable
CREATE TABLE "BspOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BspOrganization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BspGameSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "sessionPhase" "BspSessionPhase" NOT NULL DEFAULT 'PREPARE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    CONSTRAINT "BspGameSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BspGameProgress" (
    "sessionId" TEXT NOT NULL,
    "sessionPhase" "BspSessionPhase" NOT NULL,
    "periodId" TEXT NOT NULL,
    "stepPhase" "BspStepPhase" NOT NULL DEFAULT 'STEP1_FINANCE',
    "stepStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BspGameProgress_pkey" PRIMARY KEY ("sessionId")
);

CREATE TABLE "BspFiscalPeriod" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "half" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BspFiscalPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BspCompany" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "statusVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BspCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BspCompanyOperational" (
    "companyId" TEXT NOT NULL,
    "cashManwon" INTEGER NOT NULL,
    "debtManwon" INTEGER NOT NULL,
    "depositManwon" INTEGER NOT NULL,
    "equityManwon" INTEGER NOT NULL,
    "landPlots" INTEGER NOT NULL DEFAULT 0,
    "machineBig" INTEGER NOT NULL DEFAULT 0,
    "machineSmall" INTEGER NOT NULL DEFAULT 0,
    "capacityMachine" INTEGER NOT NULL DEFAULT 0,
    "maxMaterials" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BspCompanyOperational_pkey" PRIMARY KEY ("companyId")
);

CREATE TABLE "BspDecision" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "step" "BspGameStep" NOT NULL,
    "status" "BspDecisionStatus" NOT NULL DEFAULT 'POSTED',
    "source" TEXT NOT NULL DEFAULT 'CEO',
    "payload" JSONB NOT NULL,
    "validation" JSONB NOT NULL,
    "computed" JSONB NOT NULL,
    "companyStatusVersion" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "journalEntryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    CONSTRAINT "BspDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BspJournalEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "decisionId" TEXT,
    "transactionType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BspJournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BspJournalLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "debitManwon" INTEGER NOT NULL DEFAULT 0,
    "creditManwon" INTEGER NOT NULL DEFAULT 0,
    "memo" TEXT,
    CONSTRAINT "BspJournalLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BspLedgerBalance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "balanceManwon" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BspLedgerBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BspEconomicLiveState" (
    "sessionId" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BspEconomicLiveState_pkey" PRIMARY KEY ("sessionId")
);

CREATE TABLE "BspEconomicPatch" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "effects" JSONB NOT NULL,
    "valuesBefore" JSONB NOT NULL,
    "valuesAfter" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BspEconomicPatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BspDomainEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BspDomainEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BspEconomyPresetApply" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BspEconomyPresetApply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BspGameSession_joinCode_key" ON "BspGameSession"("joinCode");
CREATE INDEX "BspGameSession_organizationId_idx" ON "BspGameSession"("organizationId");
CREATE UNIQUE INDEX "BspFiscalPeriod_sessionId_periodIndex_key" ON "BspFiscalPeriod"("sessionId", "periodIndex");
CREATE UNIQUE INDEX "BspCompany_sessionId_teamName_key" ON "BspCompany"("sessionId", "teamName");
CREATE INDEX "BspDecision_companyId_idx" ON "BspDecision"("companyId");
CREATE UNIQUE INDEX "BspDecision_companyId_periodId_step_key" ON "BspDecision"("companyId", "periodId", "step");
CREATE INDEX "BspJournalEntry_companyId_periodId_idx" ON "BspJournalEntry"("companyId", "periodId");
CREATE INDEX "BspJournalLine_journalEntryId_idx" ON "BspJournalLine"("journalEntryId");
CREATE UNIQUE INDEX "BspLedgerBalance_companyId_accountCode_key" ON "BspLedgerBalance"("companyId", "accountCode");
CREATE UNIQUE INDEX "BspEconomicPatch_sessionId_sequence_key" ON "BspEconomicPatch"("sessionId", "sequence");
CREATE UNIQUE INDEX "BspDomainEvent_sessionId_sequence_key" ON "BspDomainEvent"("sessionId", "sequence");
CREATE INDEX "BspDomainEvent_sessionId_idx" ON "BspDomainEvent"("sessionId");

-- AddForeignKey
ALTER TABLE "BspGameSession" ADD CONSTRAINT "BspGameSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "BspOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BspGameProgress" ADD CONSTRAINT "BspGameProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BspGameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BspGameProgress" ADD CONSTRAINT "BspGameProgress_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "BspFiscalPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BspFiscalPeriod" ADD CONSTRAINT "BspFiscalPeriod_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BspGameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BspCompany" ADD CONSTRAINT "BspCompany_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BspGameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BspCompanyOperational" ADD CONSTRAINT "BspCompanyOperational_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "BspCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BspDecision" ADD CONSTRAINT "BspDecision_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "BspCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BspDecision" ADD CONSTRAINT "BspDecision_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "BspFiscalPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BspJournalEntry" ADD CONSTRAINT "BspJournalEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "BspCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BspJournalLine" ADD CONSTRAINT "BspJournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "BspJournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BspLedgerBalance" ADD CONSTRAINT "BspLedgerBalance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "BspCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BspEconomicLiveState" ADD CONSTRAINT "BspEconomicLiveState_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BspGameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BspEconomicPatch" ADD CONSTRAINT "BspEconomicPatch_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BspGameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BspEconomyPresetApply" ADD CONSTRAINT "BspEconomyPresetApply_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BspGameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
