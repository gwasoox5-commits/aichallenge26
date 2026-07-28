import type {
  BspGameStep,
  BspHalf,
  BspStepPhase,
  CompanyOperationalState,
  DashboardDto,
  EconomyValues,
  FacilityPayload,
  FinancialStatementsDto,
  JournalEntryInput,
  LoanPayload,
  ValidationResult,
} from "../../domain/types";
import type { GmAuditAction, GmAuditLogEntry } from "../../domain/gm/audit-types";

export interface DecisionRecord {
  id: string;
  companyId: string;
  periodId: string;
  step: BspGameStep;
  status: "POSTED";
  source?: "CEO" | "GM_FORCE" | "GM_ZERO";
  payload: unknown;
  validation: ValidationResult;
  computed: unknown;
  companyStatusVersion: number;
  journalEntryIds: string[];
  submittedAt: Date;
}

export interface JournalRecord {
  id: string;
  companyId: string;
  periodId: string;
  decisionId?: string;
  transactionType: string;
  description: string;
  lines: Array<{
    accountCode: string;
    debitManwon: number;
    creditManwon: number;
    memo?: string;
  }>;
  postedAt: Date;
}

export interface LedgerBalanceRecord {
  accountCode: string;
  balanceManwon: number;
}

export interface CompanyAggregate {
  id: string;
  sessionId: string;
  teamName: string;
  statusVersion: number;
  periodId: string;
  periodLabel: string;
  sessionPhase: "RUNNING" | "PREPARE" | "PAUSED" | "FINISHED";
  stepPhase: BspStepPhase;
  operational: CompanyOperationalState;
  ledger: Map<string, number>;
  decisions: DecisionRecord[];
  journals: JournalRecord[];
}

export interface SessionAggregate {
  id: string;
  joinCode: string;
  name: string;
  sessionPhase: "RUNNING" | "PREPARE" | "PAUSED" | "FINISHED";
  periodId: string;
  periodIndex: number;
  year: number;
  half: BspHalf;
  periodLabel: string;
  stepPhase: BspStepPhase;
  stepLocked: boolean;
  stepStartedAt: Date;
  stepDurationSec: number;
  maxPeriodIndex: number;
  economyPresetId?: string;
  wizardMeta?: SessionWizardMeta;
  economy: EconomyValues;
}

export interface SessionWizardMeta {
  courseName?: string;
  instructorName?: string;
  pilotMemo?: string;
  expectedTeams?: number;
  autoAdvance?: boolean;
  newsEnabled?: boolean;
  worldEngine?: boolean;
  aiIntelligence?: boolean;
  economyPresetId?: string;
  teamNames?: string[];
}

export interface SessionListItem {
  id: string;
  name: string;
  joinCode: string;
  sessionPhase: SessionAggregate["sessionPhase"];
  createdAt: Date;
  startedAt?: Date;
  archivedAt?: Date;
  teamCount: number;
  periodLabel: string;
  stepPhase: BspStepPhase;
}

export interface DomainEventRecord {
  id: string;
  sessionId: string;
  sequence: number;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface CreateCompanyResult {
  company: CompanyAggregate;
  session: SessionAggregate;
}

export interface SubmitDecisionResult {
  decision: DecisionRecord;
  journal: JournalRecord;
  statusVersion: number;
  dashboard: DashboardDto;
}

export interface CompanyRepository {
  findById(companyId: string): Promise<CompanyAggregate | null>;
  listBySession(sessionId: string): Promise<CompanyAggregate[]>;
  create(teamName: string, session: SessionAggregate): Promise<CompanyAggregate>;
  updateOperational(companyId: string, operational: CompanyOperationalState): Promise<void>;
  incrementStatusVersion(companyId: string, expectedVersion: number): Promise<number>;
  saveDecision(decision: DecisionRecord): Promise<void>;
  saveJournal(journal: JournalRecord): Promise<void>;
  saveLedger(companyId: string, ledger: Map<string, number>): Promise<void>;
  hasPostedDecision(companyId: string, periodId: string, step: BspGameStep): Promise<boolean>;
  removeDecision(companyId: string, periodId: string, step: BspGameStep): Promise<void>;
  beginNewPeriod(
    companyId: string,
    input: {
      periodId: string;
      periodLabel: string;
      stepPhase: BspStepPhase;
      sessionPhase: CompanyAggregate["sessionPhase"];
      operational: CompanyOperationalState;
    }
  ): Promise<void>;
}

export interface SessionRepository {
  ensureDemoSession(): Promise<SessionAggregate>;
  create(input: {
    name: string;
    joinCode: string;
    stepDurationSec?: number;
    maxPeriodIndex?: number;
    economyPresetId?: string;
    wizardMeta?: SessionWizardMeta;
  }): Promise<SessionAggregate>;
  findById(sessionId: string): Promise<SessionAggregate | null>;
  findByJoinCode(joinCode: string): Promise<SessionAggregate | null>;
  listAll(options?: { includeArchived?: boolean }): Promise<SessionListItem[]>;
  archiveSession(sessionId: string): Promise<void>;
  advanceStepPhase(sessionId: string, stepPhase: BspStepPhase): Promise<void>;
  advancePeriod(
    sessionId: string,
    next: {
      periodId: string;
      periodIndex: number;
      year: number;
      half: BspHalf;
      periodLabel: string;
      stepPhase: BspStepPhase;
    }
  ): Promise<void>;
  setSessionPhase(sessionId: string, sessionPhase: SessionAggregate["sessionPhase"]): Promise<void>;
  setStepLocked(sessionId: string, locked: boolean): Promise<void>;
  resetStepTimer(sessionId: string): Promise<void>;
  updateEconomy(sessionId: string, values: EconomyValues): Promise<void>;
  recordPresetApply(sessionId: string, presetId: string): Promise<void>;
}

export interface AuditSearchQuery {
  sessionId?: string;
  action?: GmAuditAction;
  actorRole?: import("../../domain/auth/types").AuthRole;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogRepository {
  append(entry: Omit<GmAuditLogEntry, "id">): Promise<GmAuditLogEntry>;
  listBySession(sessionId: string, limit?: number): Promise<GmAuditLogEntry[]>;
  search(query: AuditSearchQuery): Promise<{ entries: GmAuditLogEntry[]; total: number }>;
}

export interface EventStoreRepository {
  append(event: Omit<DomainEventRecord, "id" | "sequence">): Promise<DomainEventRecord>;
  listBySession(sessionId: string): Promise<DomainEventRecord[]>;
}

export interface SimulationEventRepository {
  save(event: import("../../domain/events/event-types").SimulationEvent): Promise<void>;
  findById(sessionId: string, eventId: string): Promise<import("../../domain/events/event-types").SimulationEvent | null>;
  listBySession(sessionId: string): Promise<import("../../domain/events/event-types").SimulationEvent[]>;
  savePatch(patch: import("../../domain/events/event-types").EconomicPatchRecord): Promise<void>;
  listPatches(sessionId: string): Promise<import("../../domain/events/event-types").EconomicPatchRecord[]>;
  nextPatchSequence(sessionId: string): Promise<number>;
  appendHistory(entry: import("../../domain/events/event-types").EventHistoryEntry): Promise<void>;
  listHistory(sessionId: string, limit?: number): Promise<import("../../domain/events/event-types").EventHistoryEntry[]>;
  getPeriodOpenEconomy(sessionId: string): Promise<EconomyValues | null>;
  setPeriodOpenEconomy(sessionId: string, values: EconomyValues): Promise<void>;
  getCeoBadge(sessionId: string): Promise<boolean>;
  setCeoBadge(sessionId: string, value: boolean): Promise<void>;
  clearCeoBadge(sessionId: string): Promise<void>;
  savePendingPatch(patch: import("../../domain/events/event-types").PendingManualPatch): Promise<void>;
  listPendingPatches(sessionId: string): Promise<import("../../domain/events/event-types").PendingManualPatch[]>;
  removePendingPatch(sessionId: string, patchId: string): Promise<void>;
  clearPendingPatches(sessionId: string): Promise<void>;
}

export interface BspRepositories {
  company: CompanyRepository;
  session: SessionRepository;
  events: EventStoreRepository;
  simulationEvents: SimulationEventRepository;
  audit: AuditLogRepository;
}

export type DecisionPayload = LoanPayload | FacilityPayload;

export interface StepValidationOutcome {
  validation: ValidationResult;
  computed: unknown;
  journalInput: JournalEntryInput;
  nextOperational: CompanyOperationalState;
  nextStepPhase?: BspStepPhase;
}

export interface StepContext {
  company: CompanyAggregate;
  session: SessionAggregate;
  payload: unknown;
}

export interface FinancialStatementQuery {
  companyId: string;
  periodLabel: string;
  ledger: Map<string, number>;
}
