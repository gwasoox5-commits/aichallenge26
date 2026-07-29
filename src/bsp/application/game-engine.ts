import type { BspGameStep, BspStepPhase, GmDeskDto } from "../domain/types";
import { ALL_GAME_STEPS, NEXT_STEP_PHASE, PHASE_TO_STEP, PREV_STEP_PHASE, STEP_TO_PHASE } from "../domain/types";
import { getNextPeriod, isSessionFinalPeriod } from "../domain/period/period-calendar";
import type { CreateSessionOptions } from "@/lib/bsp/session-create-options";
import { mapWizardPresetId, normalizeMaxPeriodIndex, normalizeStepDurationSec } from "@/lib/bsp/session-create-options";
import { purgeAuxiliarySessionData } from "@/lib/bsp/purge-auxiliary-session-data";
import { prepareOperationalForNextHalf } from "../domain/period/carry-forward";
import type {
  BspRepositories,
  CompanyAggregate,
  DecisionRecord,
  JournalRecord,
  SessionAggregate,
  SubmitDecisionResult,
} from "./ports/repositories";
import { StepHandlerRegistry } from "../domain/steps/step-handler-registry";
import { StepNotImplementedError } from "../domain/steps/step-handler";
import { AccountingEngine } from "../domain/accounting/accounting-engine";
import { runSettlementPipeline } from "../domain/accounting/settlement-pipeline";
import { DashboardService } from "./dashboard-service";
import { EventStoreService } from "./event-store-service";
import { EventEngineService } from "./event-engine-service";
import { applyPresetValues, listPresets } from "../domain/economy/presets";
import { GAME_CONSTANTS } from "../domain/types";
import { getZeroPayload } from "../domain/gm/zero-payloads";
import { GM_AUDIT_ACTIONS, type GmActor } from "../domain/gm/audit-types";
import { GmAuditService } from "./gm-audit-service";
import {
  notifyForceSubmit,
  notifyGameEnd,
  notifyNextHalfStarted,
  notifyPause,
  notifyResume,
  notifySettlementComplete,
  notifyStepAdvanced,
  notifyStepLock,
  notifyStepReopened,
  notifySubmitStats,
  notifyTeamSubmitted,
  notifyZeroSubmit,
} from "../infrastructure/realtime/realtime-broadcaster";

export class BspError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "BspError";
  }
}

import { generateJoinCode, normalizeJoinCode } from "../infrastructure/auth/join-code";
import {
  hasWorldSession,
  onWorldHalfEnd,
  onWorldPeriodStart,
} from "@/lib/v3/world/world-lifecycle-hook";
import { buildAccountingAuditPayload } from "../domain/accounting/accounting-audit";
import { capturePeriodFinancialSnapshot } from "../domain/accounting/period-financial-snapshot";
import { validateBalanceSheet, validateTrialBalance } from "../domain/accounting/balance-sheet-validation";
import { buildOperationalParityReport } from "../domain/accounting/operational-parity-report";
import { computePeriodChanges } from "../domain/accounting/period-financial-snapshot";

function isJoinCodeCollision(e: unknown): boolean {
  if (e instanceof Error && e.message === "Join code already exists") return true;
  if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") return true;
  return false;
}

export class GameEngine {
  private readonly audit: GmAuditService;
  private readonly eventEngine: EventEngineService;

  constructor(
    private readonly repos: BspRepositories,
    private readonly registry: StepHandlerRegistry,
    private readonly accounting: AccountingEngine,
    private readonly dashboard: DashboardService,
    private readonly events: EventStoreService
  ) {
    this.audit = new GmAuditService(repos.audit);
    this.eventEngine = new EventEngineService(
      repos.simulationEvents,
      this.audit,
      this.events,
      (sessionId, values) => this.repos.session.updateEconomy(sessionId, values),
      (sessionId) => this.repos.session.findById(sessionId)
    );
  }

  async ensureDemoSession() {
    return this.repos.session.ensureDemoSession();
  }

  async createSession(name: string, options?: CreateSessionOptions) {
    const stepDurationSec = normalizeStepDurationSec(options?.stepDurationSec);
    const maxPeriodIndex = normalizeMaxPeriodIndex(options?.maxPeriodIndex);
    for (let attempt = 0; attempt < 30; attempt++) {
      const joinCode = generateJoinCode();
      try {
        const presetId = options?.economyPresetId ? mapWizardPresetId(options.economyPresetId) : undefined;
        const session = await this.repos.session.create({
          name,
          joinCode,
          stepDurationSec,
          maxPeriodIndex,
          economyPresetId: presetId,
          wizardMeta: {
            ...options?.wizardMeta,
            economyPresetId: presetId,
          },
        });
        if (presetId) {
          await this.applyEconomyPreset(session.id, presetId);
        }
        if (options?.teamNames?.length) {
          for (const teamName of options.teamNames) {
            const trimmed = teamName.trim();
            if (trimmed) await this.createCompany(trimmed, session.id);
          }
        }
        return session;
      } catch (e) {
        if (isJoinCodeCollision(e)) continue;
        throw e;
      }
    }
    throw new BspError("ERR_JOIN_CODE", "Could not allocate unique join code", 500);
  }

  async findSessionByJoinCode(joinCode: string) {
    const session = await this.repos.session.findByJoinCode(normalizeJoinCode(joinCode));
    if (!session) throw new BspError("ERR_NOT_FOUND", "Invalid join code", 404);
    return session;
  }

  async createCompany(teamName: string, sessionId?: string) {
    const session = sessionId
      ? await this.repos.session.findById(sessionId)
      : await this.repos.session.ensureDemoSession();
    if (!session) throw new BspError("ERR_NOT_FOUND", "Session not found", 404);
    const company = await this.repos.company.create(teamName, session);
    await this.capturePeriodOpenSnapshot(company, session);
    return { company, session };
  }

  async joinGame(joinCode: string, teamName: string) {
    const session = await this.findSessionByJoinCode(joinCode);
    const trimmed = teamName.trim();
    const existing = (await this.repos.company.listBySession(session.id)).find(
      (c) => c.teamName === trimmed,
    );
    const result = existing
      ? { company: existing, session }
      : await this.createCompany(trimmed, session.id);
    await this.audit.log(
      session.id,
      { userId: result.company.id, role: "CEO" },
      GM_AUDIT_ACTIONS.JOIN,
      { teamName: result.company.teamName, joinCode },
      { companyId: result.company.id, teamName: result.company.teamName }
    );
    return result;
  }

  async listSessionCompanies(sessionId: string) {
    return this.repos.company.listBySession(sessionId);
  }

  async getDashboard(companyId: string) {
    const company = await this.requireCompany(companyId);
    const session = await this.requireSession(company.sessionId);
    const companies = await this.repos.company.listBySession(company.sessionId);
    const stats = this.computeSessionSubmitStats(session, companies);
    return {
      ...this.dashboard.build(company, session),
      ...stats,
    };
  }

  private computeSessionSubmitStats(session: SessionAggregate, companies: CompanyAggregate[]) {
    const currentStep = PHASE_TO_STEP[session.stepPhase];
    let submittedTeamCount = 0;
    for (const company of companies) {
      const periodDecisions = company.decisions.filter(
        (d) => d.periodId === session.periodId && d.status === "POSTED"
      );
      const submittedSteps = periodDecisions.map((d) => d.step);
      const currentStepSubmitted = currentStep ? submittedSteps.includes(currentStep) : true;
      if (currentStepSubmitted) submittedTeamCount += 1;
    }
    const totalTeamCount = companies.length;
    const submitRatePercent =
      totalTeamCount === 0 ? 100 : Math.round((submittedTeamCount / totalTeamCount) * 100);
    return { totalTeamCount, submittedTeamCount, submitRatePercent };
  }

  async getFinancialStatements(companyId: string) {
    const company = await this.requireCompany(companyId);
    const session = await this.requireSession(company.sessionId);
    const fs = this.accounting.getFinancialStatements(
      companyId,
      company.periodLabel,
      company.ledger,
      company.operational,
      session.economy
    );
    const balanceSheetValidation = validateBalanceSheet(fs);
    const trialBalanceValidation = validateTrialBalance(fs);
    const periodChanges = computePeriodChanges(company.operational.periodOpenFinancials, fs);
    return {
      ...fs,
      balanceSheetValidation,
      trialBalanceValidation,
      periodChanges,
    };
  }

  async getAccountingAudit(companyId: string) {
    const company = await this.requireCompany(companyId);
    const session = await this.requireSession(company.sessionId);
    const dashboard = this.dashboard.build(company, session);
    const financialStatements = this.accounting.getFinancialStatements(
      companyId,
      company.periodLabel,
      company.ledger,
      company.operational,
      session.economy
    );
    return buildAccountingAuditPayload({
      company,
      session,
      financialStatements,
      dashboard: {
        cashManwon: dashboard.cashManwon,
        inventoryTotalUnits: dashboard.inventoryTotalUnits,
        halfYearProductionQty: dashboard.halfYearProductionQty,
        halfYearSalesQty: dashboard.halfYearSalesQty,
        purchaseCapacity: dashboard.purchaseCapacity,
        productionCapacity: dashboard.productionCapacity,
        salesCapacity: dashboard.salesCapacity,
      },
    });
  }

  private async capturePeriodOpenSnapshot(company: CompanyAggregate, session: SessionAggregate) {
    const fs = this.accounting.getFinancialStatements(
      company.id,
      company.periodLabel,
      company.ledger,
      company.operational,
      session.economy
    );
    company.operational.periodOpenFinancials = capturePeriodFinancialSnapshot(fs);
    await this.repos.company.updateOperational(company.id, company.operational);
  }

  async getJournals(companyId: string) {
    const company = await this.requireCompany(companyId);
    return company.journals;
  }

  async getJournalsForDisplay(companyId: string) {
    const company = await this.requireCompany(companyId);
    const decisionByJournal = new Map<string, DecisionRecord>();
    for (const d of company.decisions) {
      for (const jid of d.journalEntryIds) decisionByJournal.set(jid, d);
    }
    return company.journals.map((j) => {
      const d = decisionByJournal.get(j.id);
      return {
        ...j,
        step: d?.step,
        postedAt: j.postedAt.toISOString(),
      };
    });
  }

  async getGmDesk(sessionId: string): Promise<GmDeskDto> {
    const session = await this.requireSession(sessionId);
    const companies = await this.repos.company.listBySession(sessionId);
    const currentStep = PHASE_TO_STEP[session.stepPhase];
    const now = Date.now();
    const elapsedSec = Math.floor((now - session.stepStartedAt.getTime()) / 1000);
    const remainingTimeSec = Math.max(0, session.stepDurationSec - elapsedSec);

    const teams = companies.map((c) => {
      const periodDecisions = c.decisions.filter(
        (d) => d.periodId === session.periodId && d.status === "POSTED"
      );
      const submitted = periodDecisions.map((d) => d.step);
      const currentStepSubmitted = currentStep ? submitted.includes(currentStep) : true;

      const missingSteps = ALL_GAME_STEPS.filter(
        (s) => s !== "SETTLEMENT" && s !== currentStep && !submitted.includes(s)
      );
      const lastDecision = periodDecisions
        .slice()
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0];

      const warningStatus = !currentStep
        ? ("OK" as const)
        : currentStepSubmitted
          ? ("OK" as const)
          : ("NOT_SUBMITTED" as const);

      return {
        companyId: c.id,
        teamName: c.teamName,
        statusVersion: c.statusVersion,
        submittedSteps: submitted,
        missingSteps:
          currentStep && !submitted.includes(currentStep)
            ? [...missingSteps, currentStep].filter((s) => !submitted.includes(s))
            : missingSteps,
        currentStepSubmitted,
        lastSubmitAt: lastDecision?.submittedAt.toISOString(),
        cashManwon: c.operational.cashManwon,
        halfYearProductionQty: c.operational.halfYearProductionQty,
        halfYearSalesQty: c.operational.halfYearSalesQty,
        warningStatus,
      };
    });

    const { totalTeamCount, submittedTeamCount, submitRatePercent } = this.computeSessionSubmitStats(
      session,
      companies
    );
    const unsubmittedTeamCount = totalTeamCount - submittedTeamCount;

    const ranking = companies
      .map((c) => ({
        companyId: c.id,
        teamName: c.teamName,
        cashManwon: c.operational.cashManwon,
        netIncomeManwon: c.operational.netIncomeManwon,
        halfYearRevenueManwon: c.operational.halfYearRevenueManwon,
      }))
      .sort((a, b) => b.cashManwon - a.cashManwon)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const events = await this.repos.events.listBySession(sessionId);
    const recentEvents = events.slice(-5).map((e) => e.eventType);
    const lastEvent = events[events.length - 1];
    const currentEventState = lastEvent
      ? `${lastEvent.eventType}${lastEvent.payload.presetId ? `: ${lastEvent.payload.presetId}` : ""}`
      : "없음";

    const economyLabel = `수요 ${session.economy.marketDemandIndex} · 공급 ${session.economy.marketSupplyIndex} · 금리 ${session.economy.interestRateLoan}%`;

    return {
      sessionId: session.id,
      joinCode: session.joinCode,
      name: session.name,
      sessionPhase: session.sessionPhase,
      periodIndex: session.periodIndex,
      year: session.year,
      half: session.half,
      periodLabel: session.periodLabel,
      stepPhase: session.stepPhase,
      stepLocked: session.stepLocked,
      stepStartedAt: session.stepStartedAt.toISOString(),
      stepDurationSec: session.stepDurationSec,
      remainingTimeSec,
      submitRatePercent,
      unsubmittedTeamCount,
      totalTeamCount,
      canStartNextHalf:
        session.stepPhase === "HALF_YEAR_END" && !isSessionFinalPeriod(session),
      canEndGame: session.stepPhase === "HALF_YEAR_END" && isSessionFinalPeriod(session),
      economy: session.economy,
      economyLabel,
      currentEventState,
      teams,
      ranking,
      recentEvents,
    };
  }

  async getGmAuditLog(sessionId: string, limit = 50) {
    await this.requireSession(sessionId);
    const entries = await this.audit.listSessionAudit(sessionId, limit);
    return entries.map((e) => ({
      ...e,
      occurredAt: e.occurredAt.toISOString(),
    }));
  }

  async validateDecision(companyId: string, step: BspGameStep, payload: unknown) {
    const company = await this.requireCompany(companyId);
    const session = await this.requireSession(company.sessionId);
    this.assertStepGate(session, step);
    if (step === "SETTLEMENT") {
      throw new BspError("ERR_SETTLEMENT_CEO", "Settlement is GM-triggered only", 403, { ruleId: "G07" });
    }
    const handler = this.registry.get(step);
    return handler.validate({ company, session, payload });
  }

  async submitDecision(
    companyId: string,
    step: BspGameStep,
    payload: unknown,
    companyStatusVersion: number
  ): Promise<SubmitDecisionResult> {
    const company = await this.requireCompany(companyId);
    const session = await this.requireSession(company.sessionId);

    if (step === "SETTLEMENT") {
      throw new BspError("ERR_SETTLEMENT_CEO", "Settlement is GM-triggered only", 403, { ruleId: "G07" });
    }
    if (company.operational.journalsLocked) {
      throw new BspError("ERR_JOURNAL_LOCKED", "Journals are locked after settlement", 423);
    }

    if (session.sessionPhase === "PAUSED") {
      throw new BspError("ERR_SESSION_PAUSED", "Session is paused", 423, { ruleId: "G03" });
    }
    if (session.sessionPhase !== "RUNNING") {
      throw new BspError("ERR_SESSION_NOT_RUNNING", "Session is not running", 423, { ruleId: "G01" });
    }
    if (company.statusVersion !== companyStatusVersion) {
      throw new BspError("ERR_STALE_VERSION", "Company status version mismatch", 409, {
        ruleId: "G06",
        expected: company.statusVersion,
        received: companyStatusVersion,
      });
    }
    if (await this.repos.company.hasPostedDecision(company.id, company.periodId, step)) {
      throw new BspError("ERR_DECISION_DUPLICATE", "Decision already posted", 409, { ruleId: "G05" });
    }

    this.assertStepGate(session, step);

    const handler = this.registry.get(step);
    let outcome;
    try {
      outcome = handler.validate({ company, session, payload });
    } catch (e) {
      if (e instanceof StepNotImplementedError) {
        throw new BspError("ERR_STEP_NOT_IMPLEMENTED", e.message, 501);
      }
      throw e;
    }

    if (!outcome.validation.ok) {
      const firstFail = outcome.validation.rules.find((r) => !r.passed);
      await this.audit.log(
        session.id,
        { userId: company.id, role: "CEO" },
        GM_AUDIT_ACTIONS.VALIDATION_ERROR,
        {
          step,
          errorCode: firstFail?.errorCode,
          message: firstFail?.message,
        },
        { companyId: company.id, teamName: company.teamName }
      );
      throw new BspError(firstFail?.errorCode ?? "ERR_VALIDATION", firstFail?.message ?? "Validation failed", 422, {
        validation: outcome.validation,
      });
    }

    const posted = this.accounting.postJournal({
      companyId: company.id,
      periodId: company.periodId,
      periodLabel: company.periodLabel,
      journal: outcome.journalInput,
      currentLedger: company.ledger,
      operational: outcome.nextOperational,
      economy: session.economy,
    });

    const decisionId = crypto.randomUUID();
    const journal: JournalRecord = {
      id: posted.journalId,
      companyId: company.id,
      periodId: company.periodId,
      decisionId,
      transactionType: outcome.journalInput.transactionType,
      description: outcome.journalInput.description,
      lines: outcome.journalInput.lines,
      postedAt: new Date(),
    };

    const decision: DecisionRecord = {
      id: decisionId,
      companyId: company.id,
      periodId: company.periodId,
      step,
      status: "POSTED",
      source: "CEO",
      payload,
      validation: outcome.validation,
      computed: outcome.computed,
      companyStatusVersion,
      journalEntryIds: [journal.id],
      submittedAt: new Date(),
    };

    company.operational = outcome.nextOperational;
    company.ledger = posted.ledger;
    company.decisions.push(decision);
    company.journals.push(journal);

    await this.repos.company.updateOperational(company.id, outcome.nextOperational);
    await this.repos.company.saveLedger(company.id, posted.ledger);
    await this.repos.company.saveJournal(journal);
    await this.repos.company.saveDecision(decision);
    const newVersion = await this.repos.company.incrementStatusVersion(company.id, companyStatusVersion);

    await this.events.recordDecisionPosted({
      sessionId: session.id,
      companyId: company.id,
      step,
      periodId: company.periodId,
      decisionId,
    });
    if (outcome.journalInput.lines.length > 0) {
      await this.events.recordJournalPosted({
        sessionId: session.id,
        companyId: company.id,
        journalId: journal.id,
        transactionType: journal.transactionType,
      });
    }

    company.statusVersion = newVersion;
    await this.audit.log(
      session.id,
      { userId: company.id, role: "CEO" },
      GM_AUDIT_ACTIONS.DECISION_SUBMIT,
      { step, decisionId, source: "CEO" },
      { companyId: company.id, teamName: company.teamName }
    );
    notifyTeamSubmitted(session.id, company.id, step, company.teamName);
    const companies = await this.repos.company.listBySession(session.id);
    const submitStats = this.computeSessionSubmitStats(session, companies);
    notifySubmitStats(session.id, submitStats);
    return {
      decision,
      journal,
      statusVersion: newVersion,
      dashboard: {
        ...this.dashboard.build(company, session),
        ...submitStats,
      },
    };
  }

  async gmAdvanceStep(sessionId: string, actor?: GmActor) {
    const session = await this.requireSession(sessionId);
    this.assertSessionRunning(session);
    if (session.stepPhase === "HALF_YEAR_END" || session.stepPhase === "GAME_END") {
      throw new BspError("ERR_INVALID_TRANSITION", "Cannot advance step after half-year close", 422);
    }
    if (session.stepPhase === "STEP7_SETTLEMENT") {
      throw new BspError("ERR_USE_CLOSE_PERIOD", "Use closePeriod at settlement step", 422);
    }
    const next = NEXT_STEP_PHASE[session.stepPhase];
    if (!next) throw new BspError("ERR_NO_NEXT_STEP", "No next step", 422);
    const fromPhase = session.stepPhase;
    await this.repos.session.advanceStepPhase(sessionId, next);
    session.stepPhase = next;
    await this.events.recordStepAdvanced({ sessionId, fromPhase, toPhase: next });
    await this.eventEngine.processPendingOnStepAdvance(sessionId, actor);
    await this.processStudioNewsPublications(sessionId);
    if (actor) {
      await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.STEP_ADVANCE, { fromPhase, toPhase: next });
    }
    notifyStepAdvanced(sessionId, fromPhase, next);
    return { stepPhase: next, step: PHASE_TO_STEP[next] };
  }

  async gmPauseSession(sessionId: string, actor: GmActor) {
    const session = await this.requireSession(sessionId);
    if (session.sessionPhase === "FINISHED") {
      throw new BspError("ERR_SESSION_FINISHED", "Session is finished", 422);
    }
    if (session.sessionPhase === "PAUSED") {
      throw new BspError("ERR_ALREADY_PAUSED", "Session is already paused", 422);
    }
    await this.repos.session.setSessionPhase(sessionId, "PAUSED");
    session.sessionPhase = "PAUSED";
    await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.PAUSE, {});
    notifyPause(sessionId);
    return { sessionPhase: "PAUSED" as const };
  }

  async gmResumeSession(sessionId: string, actor: GmActor) {
    const session = await this.requireSession(sessionId);
    if (session.sessionPhase !== "PAUSED") {
      throw new BspError("ERR_NOT_PAUSED", "Session is not paused", 422);
    }
    await this.repos.session.setSessionPhase(sessionId, "RUNNING");
    session.sessionPhase = "RUNNING";
    await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.RESUME, {});
    notifyResume(sessionId);
    return { sessionPhase: "RUNNING" as const };
  }

  async gmForceSubmit(sessionId: string, actor: GmActor, companyId?: string) {
    return this.gmSubmitOnBehalf(sessionId, actor, "GM_FORCE", GM_AUDIT_ACTIONS.FORCE_SUBMIT, companyId);
  }

  async gmZeroSubmit(sessionId: string, actor: GmActor, companyId?: string) {
    return this.gmSubmitOnBehalf(sessionId, actor, "GM_ZERO", GM_AUDIT_ACTIONS.ZERO_SUBMIT, companyId);
  }

  async gmReopenStep(sessionId: string, actor: GmActor) {
    const session = await this.requireSession(sessionId);
    this.assertSessionRunning(session);
    const prev = PREV_STEP_PHASE[session.stepPhase];
    if (!prev) {
      throw new BspError("ERR_NO_PREV_STEP", "Cannot reopen — already at first step", 422);
    }
    const reopenedStep = PHASE_TO_STEP[prev];
    if (!reopenedStep) {
      throw new BspError("ERR_NO_PREV_STEP", "No game step for previous phase", 422);
    }

    const companies = await this.repos.company.listBySession(sessionId);
    for (const company of companies) {
      await this.repos.company.removeDecision(company.id, session.periodId, reopenedStep);
      company.decisions = company.decisions.filter(
        (d) => !(d.periodId === session.periodId && d.step === reopenedStep)
      );
    }

    const fromPhase = session.stepPhase;
    await this.repos.session.advanceStepPhase(sessionId, prev);
    session.stepPhase = prev;
    await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.REOPEN_STEP, {
      fromPhase,
      toPhase: prev,
      reopenedStep,
    });
    notifyStepReopened(sessionId, fromPhase, prev);
    return { stepPhase: prev, step: reopenedStep };
  }

  async gmLockStep(sessionId: string, actor: GmActor) {
    const session = await this.requireSession(sessionId);
    if (session.stepLocked) {
      throw new BspError("ERR_ALREADY_LOCKED", "Step is already locked", 422);
    }
    await this.repos.session.setStepLocked(sessionId, true);
    session.stepLocked = true;
    await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.LOCK_STEP, { stepPhase: session.stepPhase });
    notifyStepLock(sessionId, true);
    return { stepLocked: true };
  }

  async gmUnlockStep(sessionId: string, actor: GmActor) {
    const session = await this.requireSession(sessionId);
    if (!session.stepLocked) {
      throw new BspError("ERR_NOT_LOCKED", "Step is not locked", 422);
    }
    await this.repos.session.setStepLocked(sessionId, false);
    session.stepLocked = false;
    await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.UNLOCK_STEP, { stepPhase: session.stepPhase });
    notifyStepLock(sessionId, false);
    return { stepLocked: false };
  }

  private async gmSubmitOnBehalf(
    sessionId: string,
    actor: GmActor,
    source: "GM_FORCE" | "GM_ZERO",
    auditAction: typeof GM_AUDIT_ACTIONS.FORCE_SUBMIT | typeof GM_AUDIT_ACTIONS.ZERO_SUBMIT,
    companyId?: string
  ) {
    const session = await this.requireSession(sessionId);
    if (session.sessionPhase === "FINISHED") {
      throw new BspError("ERR_SESSION_FINISHED", "Session is finished", 422);
    }
    const currentStep = PHASE_TO_STEP[session.stepPhase];
    if (!currentStep || currentStep === "SETTLEMENT") {
      throw new BspError("ERR_NO_GAME_STEP", "No submitable step at current phase", 422);
    }

    const companies = await this.repos.company.listBySession(sessionId);
    const targets = companyId
      ? companies.filter((c) => c.id === companyId)
      : companies.filter(
          (c) =>
            !c.decisions.some(
              (d) => d.periodId === session.periodId && d.step === currentStep && d.status === "POSTED"
            )
        );

    if (companyId && targets.length === 0) {
      throw new BspError("ERR_NOT_FOUND", "Company not found in session", 404);
    }
    if (targets.length === 0) {
      throw new BspError("ERR_ALL_SUBMITTED", "All teams have submitted for current step", 422);
    }

    const results = [];
    for (const company of targets) {
      const alreadyPosted = await this.repos.company.hasPostedDecision(
        company.id,
        session.periodId,
        currentStep
      );
      if (alreadyPosted) continue;

      const payload = getZeroPayload(currentStep, company.operational);
      const dash = await this.getDashboard(company.id);
      await this.submitDecisionInternal(
        company,
        session,
        currentStep,
        payload,
        dash.statusVersion,
        source
      );
      await this.audit.log(
        sessionId,
        actor,
        auditAction,
        { step: currentStep, source },
        { companyId: company.id, teamName: company.teamName }
      );
      results.push({ companyId: company.id, teamName: company.teamName, step: currentStep });
    }

    if (auditAction === GM_AUDIT_ACTIONS.FORCE_SUBMIT) {
      notifyForceSubmit(sessionId, results.map((r) => r.companyId));
    } else {
      notifyZeroSubmit(sessionId, results.map((r) => r.companyId));
    }
    const refreshedCompanies = await this.repos.company.listBySession(sessionId);
    notifySubmitStats(sessionId, this.computeSessionSubmitStats(session, refreshedCompanies));

    return { submitted: results, step: currentStep };
  }

  private async submitDecisionInternal(
    company: CompanyAggregate,
    session: SessionAggregate,
    step: BspGameStep,
    payload: unknown,
    companyStatusVersion: number,
    source: "CEO" | "GM_FORCE" | "GM_ZERO"
  ): Promise<SubmitDecisionResult> {
    const handler = this.registry.get(step);
    let outcome;
    try {
      outcome = handler.validate({ company, session, payload });
    } catch (e) {
      if (e instanceof StepNotImplementedError) {
        throw new BspError("ERR_STEP_NOT_IMPLEMENTED", e.message, 501);
      }
      throw e;
    }

    if (!outcome.validation.ok) {
      const firstFail = outcome.validation.rules.find((r) => !r.passed);
      throw new BspError(firstFail?.errorCode ?? "ERR_VALIDATION", firstFail?.message ?? "Validation failed", 422, {
        validation: outcome.validation,
      });
    }

    const posted = this.accounting.postJournal({
      companyId: company.id,
      periodId: company.periodId,
      periodLabel: company.periodLabel,
      journal: outcome.journalInput,
      currentLedger: company.ledger,
      operational: outcome.nextOperational,
      economy: session.economy,
    });

    const decisionId = crypto.randomUUID();
    const journal: JournalRecord = {
      id: posted.journalId,
      companyId: company.id,
      periodId: company.periodId,
      decisionId,
      transactionType: outcome.journalInput.transactionType,
      description: outcome.journalInput.description,
      lines: outcome.journalInput.lines,
      postedAt: new Date(),
    };

    const decision: DecisionRecord = {
      id: decisionId,
      companyId: company.id,
      periodId: company.periodId,
      step,
      status: "POSTED",
      source,
      payload,
      validation: outcome.validation,
      computed: outcome.computed,
      companyStatusVersion,
      journalEntryIds: [journal.id],
      submittedAt: new Date(),
    };

    company.operational = outcome.nextOperational;
    company.ledger = posted.ledger;
    company.decisions.push(decision);
    company.journals.push(journal);

    await this.repos.company.updateOperational(company.id, outcome.nextOperational);
    await this.repos.company.saveLedger(company.id, posted.ledger);
    await this.repos.company.saveJournal(journal);
    await this.repos.company.saveDecision(decision);
    const newVersion = await this.repos.company.incrementStatusVersion(company.id, companyStatusVersion);

    await this.events.recordDecisionPosted({
      sessionId: session.id,
      companyId: company.id,
      step,
      periodId: company.periodId,
      decisionId,
    });

    company.statusVersion = newVersion;
    return {
      decision,
      journal,
      statusVersion: newVersion,
      dashboard: this.dashboard.build(company, session),
    };
  }

  async closePeriod(sessionId: string, miscIncomeByCompany: Record<string, number> = {}, actor?: GmActor) {
    const session = await this.requireSession(sessionId);
    this.assertSessionRunning(session);
    if (session.stepPhase !== "STEP7_SETTLEMENT") {
      throw new BspError("ERR_NOT_SETTLEMENT", "Session must be at SETTLEMENT step", 422);
    }
    const companies = await this.repos.company.listBySession(sessionId);
    const results = [];

    for (const company of companies) {
      if (company.operational.settlementComplete) continue;
      const misc = miscIncomeByCompany[company.id] ?? 0;
      company.operational.miscIncomeManwon = misc;

      const settlement = runSettlementPipeline({
        operational: company.operational,
        ledger: company.ledger,
        economy: session.economy,
        miscIncomeManwon: misc,
      });

      company.ledger = settlement.ledger;
      company.operational = {
        ...settlement.operational,
        netIncomeManwon: settlement.computed.netIncomeManwon,
      };

      const settlementJournalIds: string[] = [];
      for (const journalInput of settlement.journals) {
        const journal: JournalRecord = {
          id: crypto.randomUUID(),
          companyId: company.id,
          periodId: company.periodId,
          transactionType: journalInput.transactionType,
          description: journalInput.description,
          lines: journalInput.lines,
          postedAt: new Date(),
        };
        settlementJournalIds.push(journal.id);
        company.journals.push(journal);
        await this.repos.company.saveJournal(journal);
      }

      await this.repos.company.updateOperational(company.id, company.operational);
      await this.repos.company.saveLedger(company.id, company.ledger);

      const fs = this.accounting.getFinancialStatements(
        company.id,
        company.periodLabel,
        company.ledger,
        company.operational,
        session.economy
      );
      const balanceSheetValidation = validateBalanceSheet(fs);
      const trialBalanceValidation = validateTrialBalance(fs);
      const dashboard = this.dashboard.build(company, session);
      const diffReport = buildOperationalParityReport(company, session, {
        cashManwon: dashboard.cashManwon,
        inventoryTotalUnits: dashboard.inventoryTotalUnits,
        halfYearProductionQty: dashboard.halfYearProductionQty,
        halfYearSalesQty: dashboard.halfYearSalesQty,
        purchaseCapacity: dashboard.purchaseCapacity,
        productionCapacity: dashboard.productionCapacity,
        salesCapacity: dashboard.salesCapacity,
      }, fs);

      company.operational.lastBalanceSheetValidation = balanceSheetValidation;
      company.operational.lastTrialBalanceValidation = trialBalanceValidation;
      company.operational.lastExcelDiffReport = diffReport;
      await this.repos.company.updateOperational(company.id, company.operational);

      if (actor) {
        await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.BALANCE_SHEET_VALIDATION, {
          companyId: company.id,
          teamName: company.teamName,
          ok: balanceSheetValidation.ok,
          deltaManwon: balanceSheetValidation.deltaManwon,
          trialBalanceOk: trialBalanceValidation.ok,
          diffPass: diffReport.pass,
        }, { companyId: company.id, teamName: company.teamName });
      }

      const decision: DecisionRecord = {
        id: crypto.randomUUID(),
        companyId: company.id,
        periodId: company.periodId,
        step: "SETTLEMENT",
        status: "POSTED",
        payload: { system: true },
        validation: { ok: true, rules: [] },
        computed: settlement.computed,
        companyStatusVersion: company.statusVersion,
        journalEntryIds: settlementJournalIds,
        submittedAt: new Date(),
      };
      company.decisions.push(decision);
      await this.repos.company.saveDecision(decision);

      results.push({
        companyId: company.id,
        netIncomeManwon: settlement.computed.netIncomeManwon,
        dashboard: this.dashboard.build(company, session),
      });
    }

    await this.repos.session.advanceStepPhase(sessionId, "HALF_YEAR_END");
    session.stepPhase = "HALF_YEAR_END";
    await this.events.recordHalfClosed({
      sessionId,
      periodLabel: session.periodLabel,
      periodIndex: session.periodIndex,
    });
    if (actor) {
      await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.SETTLEMENT, {
        periodIndex: session.periodIndex,
        periodLabel: session.periodLabel,
        teamCount: results.length,
      });
      await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.CLOSE_PERIOD, {
        periodIndex: session.periodIndex,
        periodLabel: session.periodLabel,
        teamCount: results.length,
      });
    }
    notifySettlementComplete(sessionId, session.periodIndex);
    await this.processWorldEvolution(sessionId, session.periodLabel, session.periodIndex, "HALF_END");
    return {
      results,
      sessionId,
      stepPhase: "HALF_YEAR_END" as const,
      periodIndex: session.periodIndex,
      canStartNextHalf: !isSessionFinalPeriod(session),
      canEndGame: isSessionFinalPeriod(session),
    };
  }

  async startNextHalf(sessionId: string, actor?: GmActor) {
    const session = await this.requireSession(sessionId);
    this.assertSessionRunning(session);
    if (session.stepPhase !== "HALF_YEAR_END") {
      throw new BspError("ERR_NOT_HALF_YEAR_END", "Session must be at HALF_YEAR_END", 422);
    }
    if (isSessionFinalPeriod(session)) {
      throw new BspError("ERR_FINAL_PERIOD", "Use gameEnd after period 6", 422);
    }
    const next = getNextPeriod(session.periodIndex);
    if (!next) throw new BspError("ERR_NO_NEXT_PERIOD", "No next period", 422);

    const newPeriodId = crypto.randomUUID();
    await this.repos.session.advancePeriod(sessionId, {
      periodId: newPeriodId,
      periodIndex: next.periodIndex,
      year: next.year,
      half: next.half,
      periodLabel: next.label,
      stepPhase: "STEP1_FINANCE",
    });

    const companies = await this.repos.company.listBySession(sessionId);
    for (const company of companies) {
      const operational = prepareOperationalForNextHalf(
        company.operational,
        company.ledger,
        session.economy.payrollCostMultiplier
      );
      await this.repos.company.beginNewPeriod(company.id, {
        periodId: newPeriodId,
        periodLabel: next.label,
        stepPhase: "STEP1_FINANCE",
        sessionPhase: session.sessionPhase,
        operational,
      });
      const refreshed = await this.requireCompany(company.id);
      await this.capturePeriodOpenSnapshot(refreshed, session);
      company.periodId = newPeriodId;
      company.periodLabel = next.label;
      company.operational = operational;
    }

    session.periodId = newPeriodId;
    session.periodIndex = next.periodIndex;
    session.year = next.year;
    session.half = next.half;
    session.periodLabel = next.label;
    session.stepPhase = "STEP1_FINANCE";

    await this.eventEngine.processPendingOnPeriodStart(sessionId, actor);
    await this.processStudioNewsPublications(sessionId);
    await this.processWorldEvolution(sessionId, next.label, next.periodIndex, "PERIOD_START");
    await this.events.recordPeriodStarted({
      sessionId,
      periodIndex: next.periodIndex,
      periodLabel: next.label,
    });
    if (actor) {
      await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.START_NEXT_HALF, {
        periodIndex: next.periodIndex,
        periodLabel: next.label,
      });
    }

    notifyNextHalfStarted(sessionId, next.label, next.periodIndex);

    return {
      periodIndex: next.periodIndex,
      periodLabel: next.label,
      stepPhase: "STEP1_FINANCE" as const,
    };
  }

  async gameEnd(sessionId: string, actor?: GmActor) {
    const session = await this.requireSession(sessionId);
    if (session.stepPhase !== "HALF_YEAR_END") {
      throw new BspError("ERR_NOT_HALF_YEAR_END", "Close final half-year before ending game", 422);
    }
    if (!isSessionFinalPeriod(session)) {
      throw new BspError("ERR_NOT_FINAL_PERIOD", "Game end only after period 6", 422);
    }

    await this.repos.session.advanceStepPhase(sessionId, "GAME_END");
    await this.repos.session.setSessionPhase(sessionId, "FINISHED");
    session.stepPhase = "GAME_END";
    session.sessionPhase = "FINISHED";

    const companies = await this.repos.company.listBySession(sessionId);
    for (const company of companies) {
      await this.repos.company.beginNewPeriod(company.id, {
        periodId: company.periodId,
        periodLabel: company.periodLabel,
        stepPhase: "GAME_END",
        sessionPhase: "FINISHED",
        operational: company.operational,
      });
    }

    await this.events.recordGameEnded({ sessionId });
    if (actor) {
      await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.GAME_END, {});
    }
    notifyGameEnd(sessionId);
    return { sessionPhase: "FINISHED" as const, stepPhase: "GAME_END" as const };
  }

  async applyEconomyPreset(sessionId: string, presetId: string, actor?: GmActor) {
    const session = await this.repos.session.findById(sessionId);
    if (!session) throw new BspError("ERR_NOT_FOUND", "Session not found", 404);
    const values = applyPresetValues(presetId, session.economy);
    const result = await this.eventEngine.applyEconomyPresetPatch(sessionId, presetId, values, actor);
    await this.repos.session.recordPresetApply(sessionId, presetId);
    await this.events.recordEconomyPresetApplied({ sessionId, presetId, values });
    return result;
  }

  previewEconomy(
    sessionId: string,
    input: { effects?: import("../domain/events/event-types").EconomyPatchEffect[]; patch?: Partial<import("../domain/types").EconomyValues> }
  ) {
    return this.eventEngine.previewEconomy(sessionId, input);
  }

  patchEconomy(
    sessionId: string,
    input: {
      effects?: import("../domain/events/event-types").EconomyPatchEffect[];
      patch?: Partial<import("../domain/types").EconomyValues>;
      applyTiming?: import("../domain/events/event-types").EventApplyTiming;
      reason?: string;
    },
    actor: GmActor
  ) {
    return this.eventEngine.patchEconomy(sessionId, input, actor);
  }

  rollbackEconomyPatch(sessionId: string, patchSequence: number | undefined, actor: GmActor) {
    return this.eventEngine.rollbackEconomyPatch(sessionId, patchSequence, actor);
  }

  listPresets() {
    return listPresets();
  }

  listEventCatalog(filter?: { search?: string; category?: string }) {
    return this.eventEngine.listCatalog(filter);
  }

  getEventTemplate(eventId: string) {
    return this.eventEngine.getTemplate(eventId);
  }

  previewEvent(sessionId: string, templateId: string) {
    return this.eventEngine.previewEvent(sessionId, templateId);
  }

  listSessionEvents(sessionId: string) {
    return this.eventEngine.listSessionEvents(sessionId);
  }

  getEventHistory(sessionId: string, limit?: number) {
    return this.eventEngine.getEventHistory(sessionId, limit);
  }

  fireEvent(
    sessionId: string,
    templateId: string,
    applyTiming: import("../domain/events/event-types").EventApplyTiming,
    actor: GmActor,
    options?: { allowDuplicate?: boolean }
  ) {
    return this.eventEngine.fireEvent(sessionId, templateId, applyTiming, actor, options);
  }

  fireCustomFromDraft(
    sessionId: string,
    params: {
      draftId: string;
      template: import("../domain/events/event-types").EventTemplate;
      applyTiming: import("../domain/events/event-types").EventApplyTiming;
      scheduledFor?: import("../domain/events/event-types").EventScheduleTarget;
      sourcePromptHash?: string;
    },
    actor: GmActor
  ) {
    return this.eventEngine.fireCustomFromDraft(sessionId, params, actor);
  }

  scheduleEvent(
    sessionId: string,
    templateId: string,
    target: import("../domain/events/event-types").EventScheduleTarget,
    actor: GmActor
  ) {
    return this.eventEngine.scheduleEvent(sessionId, templateId, target, actor);
  }

  endEvent(sessionId: string, eventId: string, actor: GmActor) {
    return this.eventEngine.endEvent(sessionId, eventId, actor);
  }

  getCeoEnvironment(sessionId: string) {
    return this.eventEngine.getCeoEnvironment(sessionId);
  }

  getSessionEconomy(sessionId: string) {
    return this.eventEngine.getEconomyState(sessionId);
  }

  async getCompany(companyId: string) {
    return this.requireCompany(companyId);
  }

  acknowledgeCeoEnvironmentBadge(sessionId: string) {
    return this.eventEngine.acknowledgeCeoBadge(sessionId);
  }

  private async processWorldEvolution(
    sessionId: string,
    periodLabel: string,
    periodIndex: number,
    hook: "HALF_END" | "PERIOD_START"
  ) {
    try {
      if (!hasWorldSession(sessionId)) return;
      if (hook === "HALF_END") {
        await onWorldHalfEnd(sessionId, periodLabel, periodIndex);
      } else {
        await onWorldPeriodStart(sessionId, periodLabel, periodIndex);
      }
    } catch {
      /* V3 world engine optional */
    }
  }

  private async processStudioNewsPublications(sessionId: string) {
    try {
      const { getScenarioStudioService } = await import("@/lib/v2/event-studio/scenario-studio-service");
      const { getDraftStore } = await import("@/lib/v2/event-studio/draft-store");
      const store = getDraftStore();
      const pending = store.getSnapshot().pendingNewsByEventId;
      const events = await this.listSessionEvents(sessionId);
      for (const eventId of Object.keys(pending)) {
        const event = events.all.find((e) => e.id === eventId);
        if (event?.status === "ACTIVE") {
          getScenarioStudioService(() => this).completeScheduledPublication(sessionId, eventId);
        }
      }
    } catch {
      /* V2 studio optional in minimal builds */
    }
  }

  async listAdminSessions(includeArchived = false) {
    return this.repos.session.listAll({ includeArchived });
  }

  async archiveAdminSession(sessionId: string) {
    await this.requireSession(sessionId);
    await this.repos.session.archiveSession(sessionId);
    return { sessionId, archived: true };
  }

  async deleteAdminSession(sessionId: string, actor: GmActor) {
    const session = await this.requireSession(sessionId);
    await this.logPlatformAudit(actor, GM_AUDIT_ACTIONS.SESSION_DELETE, {
      deletedSessionId: sessionId,
      sessionName: session.name,
      joinCode: session.joinCode,
      reason: actor.reason,
    });
    await this.repos.simulationEvents.purgeSession(sessionId);
    await this.repos.events.purgeSession(sessionId);
    purgeAuxiliarySessionData(sessionId);
    await this.repos.audit.purgeSession(sessionId);
    await this.repos.session.deleteSession(sessionId);
    return { sessionId, deleted: true, sessionName: session.name };
  }

  async endAdminSession(sessionId: string, actor: GmActor) {
    const session = await this.requireSession(sessionId);
    if (session.sessionPhase === "FINISHED") {
      return { sessionId, sessionPhase: "FINISHED" as const };
    }
    if (session.stepPhase === "HALF_YEAR_END" && isSessionFinalPeriod(session)) {
      return this.gameEnd(sessionId, actor);
    }
    await this.repos.session.setSessionPhase(sessionId, "FINISHED");
    await this.repos.session.advanceStepPhase(sessionId, "GAME_END");
    await this.audit.log(sessionId, actor, GM_AUDIT_ACTIONS.GAME_END, { source: "admin_end" });
    notifyGameEnd(sessionId);
    return { sessionId, sessionPhase: "FINISHED" as const };
  }

  async searchAdminAudit(query: import("./ports/repositories").AuditSearchQuery) {
    const result = await this.audit.searchAudit(query);
    return {
      total: result.total,
      entries: result.entries.map((e) => ({
        ...e,
        occurredAt: e.occurredAt.toISOString(),
      })),
    };
  }

  async getEconomyChangeHistory(sessionId: string) {
    await this.requireSession(sessionId);
    const patches = await this.repos.simulationEvents.listPatches(sessionId);
    return patches.map((p) => ({
      ...p,
      occurredAt: p.occurredAt.toISOString(),
    }));
  }

  async getErrorLog(sessionId: string, limit = 50) {
    await this.requireSession(sessionId);
    const result = await this.audit.searchAudit({
      sessionId,
      action: GM_AUDIT_ACTIONS.VALIDATION_ERROR,
      limit,
    });
    return result.entries.map((e) => ({
      ...e,
      occurredAt: e.occurredAt.toISOString(),
    }));
  }

  async logPlatformAudit(
    actor: GmActor,
    action: (typeof GM_AUDIT_ACTIONS)[keyof typeof GM_AUDIT_ACTIONS],
    payload: Record<string, unknown> = {}
  ) {
    return this.audit.log(undefined, actor, action, payload);
  }

  private assertStepGate(session: { stepPhase: BspStepPhase; sessionPhase: string; stepLocked?: boolean }, step: BspGameStep) {
    if (session.sessionPhase === "PAUSED") {
      throw new BspError("ERR_SESSION_PAUSED", "Session is paused", 423, { ruleId: "G03" });
    }
    if (session.stepLocked) {
      throw new BspError("ERR_STEP_LOCKED", "Step is locked by GM", 423, { ruleId: "G04" });
    }
    if (session.sessionPhase !== "RUNNING") {
      throw new BspError("ERR_SESSION_NOT_RUNNING", "Session is not running", 422);
    }
    if (session.stepPhase === "HALF_YEAR_END" || session.stepPhase === "GAME_END") {
      throw new BspError("ERR_STEP_GATE", "No decisions during half-year end", 422);
    }
    const expected = STEP_TO_PHASE[step];
    if (session.stepPhase !== expected) {
      throw new BspError("ERR_STEP_GATE", `Current step is ${session.stepPhase}`, 422, { ruleId: "G02" });
    }
  }

  private assertSessionRunning(session: { sessionPhase: string }) {
    if (session.sessionPhase === "PAUSED") {
      throw new BspError("ERR_SESSION_PAUSED", "Session is paused", 423, { ruleId: "G03" });
    }
    if (session.sessionPhase !== "RUNNING") {
      throw new BspError("ERR_SESSION_NOT_RUNNING", "Session is not running", 422);
    }
  }

  private async requireCompany(companyId: string): Promise<CompanyAggregate> {
    const company = await this.repos.company.findById(companyId);
    if (!company) throw new BspError("ERR_NOT_FOUND", "Company not found", 404);
    return company;
  }

  private async requireSession(sessionId: string) {
    const session = await this.repos.session.findById(sessionId);
    if (!session) throw new BspError("ERR_NOT_FOUND", "Session not found", 404);
    return session;
  }
}

export { GAME_CONSTANTS, listPresets };
