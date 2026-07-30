import { Prisma } from ".prisma/bsp-client";
import { DEMO_JOIN_CODE } from "../../domain/auth/demo-constants";
import { bspPrisma } from "../prisma/client";
import {
  DEFAULT_ECONOMY_VALUES,
  DEFAULT_ORG_ID,
  type BspGameStep,
  type BspStepPhase,
  type CompanyOperationalState,
  type EconomyValues,
} from "../../domain/types";
import { createInitialOperationalState } from "../../domain/validation/step-validators";
import { buildInitialLedgerBalances } from "../../domain/accounting/journal-builders";
import { createLedgerFromInitial } from "../../domain/accounting/ledger";
import type {
  BspRepositories,
  CompanyAggregate,
  CompanyRepository,
  DecisionRecord,
  DomainEventRecord,
  EventStoreRepository,
  JournalRecord,
  SessionAggregate,
  SessionRepository,
} from "../../application/ports/repositories";
import type { SessionListItem } from "../../application/ports/repositories";
import { createPrismaAuditRepository } from "./prisma-audit-repository";
import { createPrismaSimulationEventRepository } from "./prisma-simulation-event-repository";
import { DEFAULT_STEP_DURATION_SEC } from "../../domain/types";
import { getPeriodDescriptor } from "../../domain/period/period-calendar";

function toOperationalPrismaData(
  state: CompanyOperationalState,
): Prisma.BspCompanyOperationalCreateWithoutCompanyInput {
  const {
    periodOpenFinancials,
    lastBalanceSheetValidation,
    lastTrialBalanceValidation,
    lastExcelDiffReport,
    inventory,
    ...rest
  } = state;
  return {
    ...rest,
    inventory: inventory as unknown as Prisma.InputJsonValue,
    periodOpenFinancials: (periodOpenFinancials ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
    lastBalanceSheetValidation: (lastBalanceSheetValidation ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
    lastTrialBalanceValidation: (lastTrialBalanceValidation ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
    lastExcelDiffReport: (lastExcelDiffReport ?? Prisma.JsonNull) as unknown as Prisma.InputJsonValue,
  };
}

class PrismaSessionRepository implements SessionRepository {
  private async ensureDefaultOrganization(): Promise<void> {
    await bspPrisma.bspOrganization.upsert({
      where: { id: DEFAULT_ORG_ID },
      create: { id: DEFAULT_ORG_ID, name: "BSP Organization" },
      update: {},
    });
  }

  async ensureDemoSession(): Promise<SessionAggregate> {
    await this.ensureDefaultOrganization();

    let session = await bspPrisma.bspGameSession.findFirst({
      where: { organizationId: DEFAULT_ORG_ID, name: "Sprint 1 Demo" },
      include: { progress: true, periods: true, economy: true },
    });

    if (!session) {
      const p1 = getPeriodDescriptor(1);
      const created = await bspPrisma.bspGameSession.create({
        data: {
          organizationId: DEFAULT_ORG_ID,
          name: "Sprint 1 Demo",
          joinCode: DEMO_JOIN_CODE,
          sessionPhase: "RUNNING",
          startedAt: new Date(),
          periods: {
            create: {
              periodIndex: p1.periodIndex,
              year: p1.year,
              half: p1.half,
              label: p1.label,
              status: "OPEN",
            },
          },
          economy: {
            create: {
              values: DEFAULT_ECONOMY_VALUES as unknown as Prisma.InputJsonValue,
              version: 0,
            },
          },
        },
        include: { periods: true, economy: true },
      });
      const period = created.periods[0];
      await bspPrisma.bspGameProgress.create({
        data: {
          sessionId: created.id,
          sessionPhase: "RUNNING",
          periodId: period.id,
          stepPhase: "STEP1_FINANCE",
        },
      });
      session = await bspPrisma.bspGameSession.findUniqueOrThrow({
        where: { id: created.id },
        include: { progress: true, periods: true, economy: true },
      });
    }

    return this.toAggregate(session);
  }

  async findById(sessionId: string): Promise<SessionAggregate | null> {
    const session = await bspPrisma.bspGameSession.findUnique({
      where: { id: sessionId },
      include: { progress: true, periods: true, economy: true },
    });
    return session ? this.toAggregate(session) : null;
  }

  async create(input: {
    name: string;
    joinCode: string;
    stepDurationSec?: number;
    maxPeriodIndex?: number;
    economyPresetId?: string;
    wizardMeta?: import("../../application/ports/repositories").SessionWizardMeta;
  }): Promise<SessionAggregate> {
    await this.ensureDefaultOrganization();

    const p1 = getPeriodDescriptor(1);
    const session = await bspPrisma.bspGameSession.create({
      data: {
        organizationId: DEFAULT_ORG_ID,
        name: input.name,
        joinCode: input.joinCode,
        sessionPhase: "RUNNING",
        startedAt: new Date(),
        stepDurationSec: input.stepDurationSec ?? DEFAULT_STEP_DURATION_SEC,
        maxPeriodIndex: input.maxPeriodIndex ?? 6,
        economyPresetId: input.economyPresetId ?? null,
        wizardMeta: input.wizardMeta ? (input.wizardMeta as Prisma.InputJsonValue) : Prisma.JsonNull,
        periods: {
          create: {
            periodIndex: p1.periodIndex,
            year: p1.year,
            half: p1.half,
            label: p1.label,
            status: "OPEN",
          },
        },
        economy: {
          create: {
            values: DEFAULT_ECONOMY_VALUES as unknown as Prisma.InputJsonValue,
            version: 0,
          },
        },
      },
      include: { progress: true, periods: true, economy: true },
    });
    const period = session.periods[0];
    await bspPrisma.bspGameProgress.create({
      data: {
        sessionId: session.id,
        sessionPhase: "RUNNING",
        periodId: period.id,
        stepPhase: "STEP1_FINANCE",
      },
    });
    const full = await bspPrisma.bspGameSession.findUniqueOrThrow({
      where: { id: session.id },
      include: { progress: true, periods: true, economy: true },
    });
    return this.toAggregate(full);
  }

  async findByJoinCode(joinCode: string): Promise<SessionAggregate | null> {
    const session = await bspPrisma.bspGameSession.findUnique({
      where: { joinCode: joinCode.toUpperCase() },
      include: { progress: true, periods: true, economy: true },
    });
    return session ? this.toAggregate(session) : null;
  }

  async listAll(options?: { includeArchived?: boolean }): Promise<SessionListItem[]> {
    const rows = await bspPrisma.bspGameSession.findMany({
      where: options?.includeArchived ? undefined : { archivedAt: null },
      include: {
        progress: { include: { period: true } },
        _count: { select: { companies: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      joinCode: r.joinCode,
      sessionPhase: r.sessionPhase as SessionListItem["sessionPhase"],
      createdAt: r.createdAt,
      startedAt: r.startedAt ?? undefined,
      archivedAt: r.archivedAt ?? undefined,
      teamCount: r._count.companies,
      periodLabel: r.progress?.period?.label ?? "—",
      stepPhase: (r.progress?.stepPhase ?? "STEP1_FINANCE") as BspStepPhase,
    }));
  }

  async archiveSession(sessionId: string): Promise<void> {
    await bspPrisma.bspGameSession.update({
      where: { id: sessionId },
      data: { archivedAt: new Date() },
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await bspPrisma.$transaction(async (tx) => {
      const companyIds = (
        await tx.bspCompany.findMany({ where: { sessionId }, select: { id: true } })
      ).map((c) => c.id);

      if (companyIds.length > 0) {
        const journalIds = (
          await tx.bspJournalEntry.findMany({
            where: { companyId: { in: companyIds } },
            select: { id: true },
          })
        ).map((j) => j.id);
        if (journalIds.length > 0) {
          await tx.bspJournalLine.deleteMany({ where: { journalEntryId: { in: journalIds } } });
        }
        await tx.bspJournalEntry.deleteMany({ where: { companyId: { in: companyIds } } });
        await tx.bspDecision.deleteMany({ where: { companyId: { in: companyIds } } });
        await tx.bspLedgerBalance.deleteMany({ where: { companyId: { in: companyIds } } });
        await tx.bspCompanyOperational.deleteMany({ where: { companyId: { in: companyIds } } });
        await tx.bspCompany.deleteMany({ where: { sessionId } });
      }

      await tx.bspGameProgress.deleteMany({ where: { sessionId } });
      await tx.bspFiscalPeriod.deleteMany({ where: { sessionId } });
      await tx.bspDomainEvent.deleteMany({ where: { sessionId } });
      await tx.bspEconomicLiveState.deleteMany({ where: { sessionId } });
      await tx.bspEconomicPatch.deleteMany({ where: { sessionId } });
      await tx.bspEconomyPresetApply.deleteMany({ where: { sessionId } });
      await tx.bspAuditLog.deleteMany({ where: { sessionId } });
      await tx.bspGameSession.delete({ where: { id: sessionId } });
    });
  }

  async advanceStepPhase(sessionId: string, stepPhase: BspStepPhase): Promise<void> {
    await bspPrisma.bspGameProgress.update({
      where: { sessionId },
      data: { stepPhase, stepStartedAt: new Date() },
    });
  }

  async updateEconomy(sessionId: string, values: EconomyValues): Promise<void> {
    await bspPrisma.bspEconomicLiveState.upsert({
      where: { sessionId },
      create: { sessionId, values: values as unknown as Prisma.InputJsonValue, version: 1 },
      update: { values: values as unknown as Prisma.InputJsonValue, version: { increment: 1 } },
    });
  }

  async recordPresetApply(sessionId: string, presetId: string): Promise<void> {
    await bspPrisma.bspEconomyPresetApply.create({ data: { sessionId, presetId } });
  }

  private toAggregate(session: {
    id: string;
    joinCode: string;
    name: string;
    sessionPhase: string;
    stepDurationSec?: number;
    maxPeriodIndex?: number;
    economyPresetId?: string | null;
    wizardMeta?: unknown;
    progress: { periodId: string; stepPhase: string; stepStartedAt?: Date } | null;
    periods: Array<{ id: string; label: string; periodIndex: number; year: number; half: string }>;
    economy: { values: unknown } | null;
  }): SessionAggregate {
    const progress = session.progress!;
    const period = session.periods.find((p) => p.id === progress.periodId) ?? session.periods[0];
    const wizardMeta = session.wizardMeta as SessionAggregate["wizardMeta"] | null | undefined;
    return {
      id: session.id,
      joinCode: session.joinCode,
      name: session.name,
      sessionPhase: session.sessionPhase as SessionAggregate["sessionPhase"],
      periodId: period.id,
      periodIndex: period.periodIndex,
      year: period.year,
      half: period.half as SessionAggregate["half"],
      periodLabel: period.label,
      stepPhase: progress.stepPhase as BspStepPhase,
      stepLocked: false,
      stepStartedAt: progress.stepStartedAt ?? new Date(),
      stepDurationSec: session.stepDurationSec ?? DEFAULT_STEP_DURATION_SEC,
      maxPeriodIndex: session.maxPeriodIndex ?? 6,
      economyPresetId: session.economyPresetId ?? wizardMeta?.economyPresetId,
      wizardMeta: wizardMeta ?? undefined,
      economy: (session.economy?.values as EconomyValues) ?? DEFAULT_ECONOMY_VALUES,
    };
  }

  async setStepLocked(_sessionId: string, _locked: boolean): Promise<void> {}

  async resetStepTimer(sessionId: string): Promise<void> {
    await bspPrisma.bspGameProgress.update({
      where: { sessionId },
      data: { stepStartedAt: new Date() },
    });
  }

  async advancePeriod(
    sessionId: string,
    next: {
      periodId: string;
      periodIndex: number;
      year: number;
      half: SessionAggregate["half"];
      periodLabel: string;
      stepPhase: BspStepPhase;
    }
  ): Promise<void> {
    await bspPrisma.bspFiscalPeriod.create({
      data: {
        id: next.periodId,
        sessionId,
        periodIndex: next.periodIndex,
        year: next.year,
        half: next.half,
        label: next.periodLabel,
        status: "OPEN",
      },
    });
    await bspPrisma.bspGameProgress.update({
      where: { sessionId },
      data: {
        periodId: next.periodId,
        stepPhase: next.stepPhase,
        stepStartedAt: new Date(),
      },
    });
  }

  async setSessionPhase(
    sessionId: string,
    sessionPhase: SessionAggregate["sessionPhase"]
  ): Promise<void> {
    await bspPrisma.bspGameSession.update({
      where: { id: sessionId },
      data: { sessionPhase },
    });
    await bspPrisma.bspGameProgress.update({
      where: { sessionId },
      data: { sessionPhase },
    });
  }
}

class PrismaCompanyRepository implements CompanyRepository {
  async findById(companyId: string): Promise<CompanyAggregate | null> {
    const row = await bspPrisma.bspCompany.findUnique({
      where: { id: companyId },
      include: {
        operational: true,
        session: { include: { progress: true, periods: true } },
        decisions: true,
        ledger: true,
        journals: { include: { lines: true } },
      },
    });
    if (!row || !row.operational) return null;
    const progress = row.session.progress!;
    const period = row.session.periods.find((p) => p.id === progress.periodId)!;
    return {
      id: row.id,
      sessionId: row.sessionId,
      teamName: row.teamName,
      statusVersion: row.statusVersion,
      periodId: period.id,
      periodLabel: period.label,
      sessionPhase: row.session.sessionPhase as CompanyAggregate["sessionPhase"],
      stepPhase: progress.stepPhase as BspStepPhase,
      operational: row.operational as unknown as CompanyOperationalState,
      ledger: new Map(row.ledger.map((l) => [l.accountCode, l.balanceManwon])),
      decisions: row.decisions.map((d) => ({
        id: d.id,
        companyId: d.companyId,
        periodId: d.periodId,
        step: d.step as BspGameStep,
        status: d.status === "SUBMITTED" ? "SUBMITTED" : "POSTED",
        source: (d.source as DecisionRecord["source"]) ?? "CEO",
        payload: d.payload,
        validation: d.validation as unknown as DecisionRecord["validation"],
        computed: d.computed as unknown as DecisionRecord["computed"],
        companyStatusVersion: d.companyStatusVersion,
        journalEntryIds: d.journalEntryIds,
        submittedAt: d.submittedAt,
      })),
      journals: row.journals.map((j) => ({
        id: j.id,
        companyId: j.companyId,
        periodId: j.periodId,
        decisionId: j.decisionId ?? undefined,
        transactionType: j.transactionType,
        description: j.description,
        lines: j.lines.map((l) => ({
          accountCode: l.accountCode,
          debitManwon: l.debitManwon,
          creditManwon: l.creditManwon,
          memo: l.memo ?? undefined,
        })),
        postedAt: j.postedAt,
      })),
    };
  }

  async listBySession(sessionId: string): Promise<CompanyAggregate[]> {
    const rows = await bspPrisma.bspCompany.findMany({
      where: { sessionId },
      include: {
        operational: true,
        session: { include: { progress: true, periods: true } },
        decisions: true,
        ledger: true,
        journals: { include: { lines: true } },
      },
    });
    const results: CompanyAggregate[] = [];
    for (const row of rows) {
      const agg = await this.findById(row.id);
      if (agg) results.push(agg);
    }
    return results;
  }

  async create(teamName: string, session: SessionAggregate): Promise<CompanyAggregate> {
    const initial = createInitialOperationalState();
    const row = await bspPrisma.bspCompany.create({
      data: {
        sessionId: session.id,
        teamName,
        statusVersion: 0,
        operational: {
          create: toOperationalPrismaData(initial),
        },
        ledger: {
          create: buildInitialLedgerBalances().map((b) => ({
            accountCode: b.accountCode,
            balanceManwon: b.balanceManwon,
          })),
        },
      },
      include: { operational: true },
    });
    return {
      id: row.id,
      sessionId: session.id,
      teamName: row.teamName,
      statusVersion: 0,
      periodId: session.periodId,
      periodLabel: session.periodLabel,
      sessionPhase: session.sessionPhase,
      stepPhase: session.stepPhase,
      operational: row.operational! as unknown as CompanyOperationalState,
      ledger: createLedgerFromInitial(buildInitialLedgerBalances()),
      decisions: [],
      journals: [],
    };
  }

  async delete(companyId: string): Promise<void> {
    await bspPrisma.$transaction(async (tx) => {
      const journalIds = (
        await tx.bspJournalEntry.findMany({ where: { companyId }, select: { id: true } })
      ).map((j) => j.id);
      if (journalIds.length > 0) {
        await tx.bspJournalLine.deleteMany({ where: { journalEntryId: { in: journalIds } } });
      }
      await tx.bspJournalEntry.deleteMany({ where: { companyId } });
      await tx.bspDecision.deleteMany({ where: { companyId } });
      await tx.bspLedgerBalance.deleteMany({ where: { companyId } });
      await tx.bspCompanyOperational.deleteMany({ where: { companyId } });
      await tx.bspCompany.delete({ where: { id: companyId } });
    });
  }

  async updateOperational(companyId: string, operational: CompanyOperationalState): Promise<void> {
    await bspPrisma.bspCompanyOperational.update({
      where: { companyId },
      data: toOperationalPrismaData(operational),
    });
  }

  async incrementStatusVersion(companyId: string, expectedVersion: number): Promise<number> {
    const updated = await bspPrisma.bspCompany.updateMany({
      where: { id: companyId, statusVersion: expectedVersion },
      data: { statusVersion: expectedVersion + 1 },
    });
    if (updated.count === 0) throw new Error("Stale version");
    return expectedVersion + 1;
  }

  async saveDecision(decision: DecisionRecord): Promise<void> {
    const data = {
      status: decision.status,
      source: decision.source ?? "CEO",
      payload: decision.payload as object,
      validation: decision.validation as object,
      computed: decision.computed as object,
      companyStatusVersion: decision.companyStatusVersion,
      journalEntryIds: decision.journalEntryIds,
      submittedAt: decision.submittedAt,
    };
    const updated = await bspPrisma.bspDecision.updateMany({
      where: {
        companyId: decision.companyId,
        periodId: decision.periodId,
        step: decision.step,
      },
      data,
    });
    if (updated.count === 0) {
      await bspPrisma.bspDecision.create({
        data: {
          id: decision.id,
          companyId: decision.companyId,
          periodId: decision.periodId,
          step: decision.step,
          ...data,
        },
      });
    }
  }

  async saveJournal(journal: JournalRecord): Promise<void> {
    await bspPrisma.bspJournalEntry.create({
      data: {
        id: journal.id,
        companyId: journal.companyId,
        periodId: journal.periodId,
        decisionId: journal.decisionId,
        transactionType: journal.transactionType,
        description: journal.description,
        postedAt: journal.postedAt,
        lines: {
          create: journal.lines.map((l) => ({
            accountCode: l.accountCode,
            debitManwon: l.debitManwon,
            creditManwon: l.creditManwon,
            memo: l.memo,
          })),
        },
      },
    });
  }

  async saveLedger(companyId: string, ledger: Map<string, number>): Promise<void> {
    for (const [accountCode, balanceManwon] of ledger.entries()) {
      await bspPrisma.bspLedgerBalance.upsert({
        where: { companyId_accountCode: { companyId, accountCode } },
        create: { companyId, accountCode, balanceManwon },
        update: { balanceManwon },
      });
    }
  }

  async hasPostedDecision(companyId: string, periodId: string, step: BspGameStep): Promise<boolean> {
    const count = await bspPrisma.bspDecision.count({
      where: { companyId, periodId, step, status: "POSTED" },
    });
    return count > 0;
  }

  async hasStepDecision(companyId: string, periodId: string, step: BspGameStep): Promise<boolean> {
    const count = await bspPrisma.bspDecision.count({
      where: {
        companyId,
        periodId,
        step,
        status: { in: ["POSTED", "SUBMITTED"] },
      },
    });
    return count > 0;
  }

  async removeDecision(companyId: string, periodId: string, step: BspGameStep): Promise<void> {
    await bspPrisma.bspDecision.deleteMany({
      where: { companyId, periodId, step },
    });
  }

  async beginNewPeriod(
    companyId: string,
    input: {
      periodId: string;
      periodLabel: string;
      stepPhase: BspStepPhase;
      sessionPhase: CompanyAggregate["sessionPhase"];
      operational: CompanyOperationalState;
    }
  ): Promise<void> {
    await this.updateOperational(companyId, input.operational);
    await bspPrisma.bspCompany.update({
      where: { id: companyId },
      data: { statusVersion: { increment: 1 } },
    });
  }
}

class PrismaEventStoreRepository implements EventStoreRepository {
  async append(event: Omit<DomainEventRecord, "id" | "sequence">): Promise<DomainEventRecord> {
    const seq =
      (await bspPrisma.bspDomainEvent.count({ where: { sessionId: event.sessionId } })) + 1;
    const row = await bspPrisma.bspDomainEvent.create({
      data: {
        sessionId: event.sessionId,
        sequence: seq,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload as unknown as Prisma.InputJsonValue,
        occurredAt: event.occurredAt,
      },
    });
    return {
      id: row.id,
      sessionId: row.sessionId,
      sequence: row.sequence,
      eventType: row.eventType,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      payload: row.payload as Record<string, unknown>,
      occurredAt: row.occurredAt,
    };
  }

  async listBySession(sessionId: string): Promise<DomainEventRecord[]> {
    const rows = await bspPrisma.bspDomainEvent.findMany({
      where: { sessionId },
      orderBy: { sequence: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      sequence: r.sequence,
      eventType: r.eventType,
      aggregateType: r.aggregateType,
      aggregateId: r.aggregateId,
      payload: r.payload as Record<string, unknown>,
      occurredAt: r.occurredAt,
    }));
  }

  async purgeSession(sessionId: string): Promise<void> {
    await bspPrisma.bspDomainEvent.deleteMany({ where: { sessionId } });
  }
}

export function createPrismaRepositories(): BspRepositories {
  return {
    session: new PrismaSessionRepository(),
    company: new PrismaCompanyRepository(),
    events: new PrismaEventStoreRepository(),
    simulationEvents: createPrismaSimulationEventRepository(),
    audit: createPrismaAuditRepository(),
  };
}
