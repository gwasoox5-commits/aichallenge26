import {
  DEFAULT_ECONOMY_VALUES,
  DEFAULT_STEP_DURATION_SEC,
  type BspGameStep,
  type BspStepPhase,
  type CompanyOperationalState,
  type EconomyValues,
} from "../../domain/types";
import { getPeriodDescriptor } from "../../domain/period/period-calendar";
import { DEMO_JOIN_CODE } from "../../domain/auth/demo-constants";
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
import { createMemoryAuditRepository, resetAuditState } from "./memory-audit-repository";
import {
  MemorySimulationEventRepository,
  ensureSessionPeriodOpen,
  resetSimulationEventState,
} from "./memory-simulation-event-repository";

interface MemoryState {
  sessions: Map<string, SessionAggregate>;
  joinCodes: Map<string, string>;
  demoSessionId: string | null;
  companies: Map<string, CompanyAggregate>;
  events: DomainEventRecord[];
  sessionMeta: Map<string, { createdAt: Date; startedAt?: Date; archivedAt?: Date }>;
}

const globalForBsp = globalThis as unknown as { bspMemoryState?: MemoryState };

function state(): MemoryState {
  if (!globalForBsp.bspMemoryState) {
    globalForBsp.bspMemoryState = {
      sessions: new Map(),
      joinCodes: new Map(),
      demoSessionId: null,
      companies: new Map(),
      events: [],
      sessionMeta: new Map(),
    };
  }
  return globalForBsp.bspMemoryState;
}

function uuid() {
  return crypto.randomUUID();
}

class MemorySessionRepository implements SessionRepository {
  async ensureDemoSession(): Promise<SessionAggregate> {
    const s = state();
    if (!s.demoSessionId || !s.sessions.has(s.demoSessionId)) {
      const periodId = uuid();
      const p1 = getPeriodDescriptor(1);
      const session: SessionAggregate = {
        id: uuid(),
        joinCode: DEMO_JOIN_CODE,
        name: "Sprint Demo (Memory)",
        sessionPhase: "RUNNING",
        periodId,
        periodIndex: p1.periodIndex,
        year: p1.year,
        half: p1.half,
        periodLabel: p1.label,
        stepPhase: "STEP1_FINANCE",
        stepLocked: false,
        stepStartedAt: new Date(),
        stepDurationSec: DEFAULT_STEP_DURATION_SEC,
        maxPeriodIndex: 6,
        economy: { ...DEFAULT_ECONOMY_VALUES },
      };
      s.sessions.set(session.id, session);
      s.joinCodes.set(session.joinCode, session.id);
      s.demoSessionId = session.id;
      s.sessionMeta.set(session.id, { createdAt: new Date(), startedAt: new Date() });
      ensureSessionPeriodOpen(session.id, session.economy);
    }
    return s.sessions.get(s.demoSessionId!)!;
  }

  async create(input: {
    name: string;
    joinCode: string;
    stepDurationSec?: number;
    maxPeriodIndex?: number;
    economyPresetId?: string;
    wizardMeta?: import("../../application/ports/repositories").SessionWizardMeta;
  }): Promise<SessionAggregate> {
    const s = state();
    if (s.joinCodes.has(input.joinCode)) {
      throw new Error("Join code already exists");
    }
    const periodId = uuid();
    const p1 = getPeriodDescriptor(1);
    const session: SessionAggregate = {
      id: uuid(),
      joinCode: input.joinCode,
      name: input.name,
      sessionPhase: "RUNNING",
      periodId,
      periodIndex: p1.periodIndex,
      year: p1.year,
      half: p1.half,
      periodLabel: p1.label,
      stepPhase: "STEP1_FINANCE",
      stepLocked: false,
      stepStartedAt: new Date(),
      stepDurationSec: input.stepDurationSec ?? DEFAULT_STEP_DURATION_SEC,
      maxPeriodIndex: input.maxPeriodIndex ?? 6,
      economyPresetId: input.economyPresetId,
      wizardMeta: input.wizardMeta,
      economy: { ...DEFAULT_ECONOMY_VALUES },
    };
    s.sessions.set(session.id, session);
    s.joinCodes.set(session.joinCode, session.id);
    s.sessionMeta.set(session.id, { createdAt: new Date(), startedAt: new Date() });
    ensureSessionPeriodOpen(session.id, session.economy);
    return session;
  }

  async listAll(options?: { includeArchived?: boolean }): Promise<SessionListItem[]> {
    const s = state();
    const items: SessionListItem[] = [];
    for (const session of s.sessions.values()) {
      const meta = s.sessionMeta.get(session.id) ?? { createdAt: new Date() };
      if (!options?.includeArchived && meta.archivedAt) continue;
      items.push({
        id: session.id,
        name: session.name,
        joinCode: session.joinCode,
        sessionPhase: session.sessionPhase,
        createdAt: meta.createdAt,
        startedAt: meta.startedAt,
        archivedAt: meta.archivedAt,
        teamCount: [...s.companies.values()].filter((c) => c.sessionId === session.id).length,
        periodLabel: session.periodLabel,
        stepPhase: session.stepPhase,
      });
    }
    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async archiveSession(sessionId: string): Promise<void> {
    const s = state();
    const meta = s.sessionMeta.get(sessionId) ?? { createdAt: new Date() };
    meta.archivedAt = new Date();
    s.sessionMeta.set(sessionId, meta);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const s = state();
    const session = s.sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    s.sessions.delete(sessionId);
    s.joinCodes.delete(session.joinCode);
    if (s.demoSessionId === sessionId) s.demoSessionId = null;
    for (const [companyId, company] of s.companies) {
      if (company.sessionId === sessionId) s.companies.delete(companyId);
    }
    s.events = s.events.filter((e) => e.sessionId !== sessionId);
    s.sessionMeta.delete(sessionId);
  }

  async findById(sessionId: string): Promise<SessionAggregate | null> {
    return state().sessions.get(sessionId) ?? null;
  }

  async findByJoinCode(joinCode: string): Promise<SessionAggregate | null> {
    const id = state().joinCodes.get(joinCode.toUpperCase());
    if (!id) return null;
    return state().sessions.get(id) ?? null;
  }

  async advanceStepPhase(sessionId: string, stepPhase: BspStepPhase): Promise<void> {
    const session = state().sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    session.stepPhase = stepPhase;
    session.stepStartedAt = new Date();
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
    const session = state().sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    session.periodId = next.periodId;
    session.periodIndex = next.periodIndex;
    session.year = next.year;
    session.half = next.half;
    session.periodLabel = next.periodLabel;
    session.stepPhase = next.stepPhase;
    session.stepStartedAt = new Date();
  }

  async setStepLocked(sessionId: string, locked: boolean): Promise<void> {
    const session = state().sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    session.stepLocked = locked;
  }

  async resetStepTimer(sessionId: string): Promise<void> {
    const session = state().sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    session.stepStartedAt = new Date();
  }

  async setSessionPhase(
    sessionId: string,
    sessionPhase: SessionAggregate["sessionPhase"]
  ): Promise<void> {
    const session = state().sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    session.sessionPhase = sessionPhase;
  }

  async updateEconomy(sessionId: string, values: EconomyValues): Promise<void> {
    const session = state().sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    session.economy = values;
  }

  async recordPresetApply(_sessionId: string, _presetId: string): Promise<void> {}
}

class MemoryCompanyRepository implements CompanyRepository {
  async findById(companyId: string): Promise<CompanyAggregate | null> {
    return state().companies.get(companyId) ?? null;
  }

  async listBySession(sessionId: string): Promise<CompanyAggregate[]> {
    return [...state().companies.values()].filter((c) => c.sessionId === sessionId);
  }

  async create(teamName: string, session: SessionAggregate): Promise<CompanyAggregate> {
    const initial = createInitialOperationalState();
    const company: CompanyAggregate = {
      id: uuid(),
      sessionId: session.id,
      teamName,
      statusVersion: 0,
      periodId: session.periodId,
      periodLabel: session.periodLabel,
      sessionPhase: session.sessionPhase,
      stepPhase: session.stepPhase,
      operational: initial,
      ledger: createLedgerFromInitial(buildInitialLedgerBalances()),
      decisions: [],
      journals: [],
    };
    state().companies.set(company.id, company);
    return company;
  }

  async delete(companyId: string): Promise<void> {
    state().companies.delete(companyId);
  }

  async updateOperational(companyId: string, operational: CompanyOperationalState): Promise<void> {
    const c = state().companies.get(companyId);
    if (!c) throw new Error("Company not found");
    c.operational = operational;
  }

  async incrementStatusVersion(companyId: string, expectedVersion: number): Promise<number> {
    const c = state().companies.get(companyId);
    if (!c) throw new Error("Company not found");
    if (c.statusVersion !== expectedVersion) throw new Error("Stale version");
    c.statusVersion += 1;
    return c.statusVersion;
  }

  async saveDecision(decision: DecisionRecord): Promise<void> {
    const c = state().companies.get(decision.companyId);
    if (!c) throw new Error("Company not found");
    const idx = c.decisions.findIndex((d) => d.id === decision.id);
    if (idx >= 0) {
      c.decisions[idx] = decision;
    } else {
      c.decisions.push(decision);
    }
  }

  async saveJournal(journal: JournalRecord): Promise<void> {
    const c = state().companies.get(journal.companyId);
    if (!c) throw new Error("Company not found");
    if (!c.journals.some((j) => j.id === journal.id)) {
      c.journals.push(journal);
    }
  }

  async saveLedger(companyId: string, ledger: Map<string, number>): Promise<void> {
    const c = state().companies.get(companyId);
    if (!c) throw new Error("Company not found");
    c.ledger = new Map(ledger);
  }

  async hasPostedDecision(companyId: string, periodId: string, step: BspGameStep): Promise<boolean> {
    const c = state().companies.get(companyId);
    if (!c) return false;
    return c.decisions.some((d) => d.periodId === periodId && d.step === step && d.status === "POSTED");
  }

  async hasStepDecision(companyId: string, periodId: string, step: BspGameStep): Promise<boolean> {
    const c = state().companies.get(companyId);
    if (!c) return false;
    return c.decisions.some(
      (d) =>
        d.periodId === periodId &&
        d.step === step &&
        (d.status === "POSTED" || d.status === "SUBMITTED")
    );
  }

  async removeDecision(companyId: string, periodId: string, step: BspGameStep): Promise<void> {
    const c = state().companies.get(companyId);
    if (!c) throw new Error("Company not found");
    c.decisions = c.decisions.filter((d) => !(d.periodId === periodId && d.step === step));
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
    const c = state().companies.get(companyId);
    if (!c) throw new Error("Company not found");
    c.periodId = input.periodId;
    c.periodLabel = input.periodLabel;
    c.stepPhase = input.stepPhase;
    c.sessionPhase = input.sessionPhase;
    c.operational = input.operational;
    c.statusVersion += 1;
  }
}

class MemoryEventStoreRepository implements EventStoreRepository {
  async append(event: Omit<DomainEventRecord, "id" | "sequence">): Promise<DomainEventRecord> {
    const s = state();
    const record: DomainEventRecord = {
      ...event,
      id: uuid(),
      sequence: s.events.filter((e) => e.sessionId === event.sessionId).length + 1,
    };
    s.events.push(record);
    return record;
  }

  async listBySession(sessionId: string): Promise<DomainEventRecord[]> {
    return state().events.filter((e) => e.sessionId === sessionId);
  }

  async purgeSession(sessionId: string): Promise<void> {
    const s = state();
    s.events = s.events.filter((e) => e.sessionId !== sessionId);
  }
}

export function createMemoryRepositories(): BspRepositories {
  return {
    session: new MemorySessionRepository(),
    company: new MemoryCompanyRepository(),
    events: new MemoryEventStoreRepository(),
    simulationEvents: new MemorySimulationEventRepository(),
    audit: createMemoryAuditRepository(),
  };
}

export function resetMemoryState() {
  globalForBsp.bspMemoryState = {
    sessions: new Map(),
    joinCodes: new Map(),
    demoSessionId: null,
    companies: new Map(),
    events: [],
    sessionMeta: new Map(),
  };
  resetAuditState();
  resetSimulationEventState();
}
