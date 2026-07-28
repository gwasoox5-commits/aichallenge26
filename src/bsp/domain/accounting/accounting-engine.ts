import type { JournalEntryInput } from "../types";
import type { LoanComputed, FacilityComputed, MaterialComputed, ProductionComputed, SalesComputed } from "../types";
import {
  buildFacilityJournal,
  buildHiringJournal,
  buildInitialLedgerBalances,
  buildLoanJournal,
  buildMaterialJournal,
  buildProductionJournal,
  buildSalesJournal,
} from "./journal-builders";
import {
  applyJournalToBalances,
  createLedgerFromInitial,
  normalizeLiabilityBalance,
  type LedgerMap,
} from "./ledger";
import { buildFinancialStatements } from "./financial-statements";
import { buildTrialBalance, trialBalanceTotals } from "./trial-balance";
import type { CompanyOperationalState, EconomyValues } from "../types";

export interface PostJournalInput {
  companyId: string;
  periodId: string;
  periodLabel: string;
  decisionId?: string;
  journal: JournalEntryInput;
  currentLedger: LedgerMap;
  operational: CompanyOperationalState;
  economy: EconomyValues;
}

export interface PostJournalResult {
  journalId: string;
  ledger: LedgerMap;
  financialStatements: ReturnType<typeof buildFinancialStatements>;
  trialBalance: ReturnType<typeof buildTrialBalance>;
}

export class AccountingEngine {
  createInitialLedger(): LedgerMap {
    return createLedgerFromInitial(buildInitialLedgerBalances());
  }

  buildLoanJournal(computed: LoanComputed): JournalEntryInput {
    return buildLoanJournal(computed);
  }

  buildFacilityJournal(computed: FacilityComputed): JournalEntryInput {
    return buildFacilityJournal(computed);
  }

  buildHiringJournal(): JournalEntryInput {
    return buildHiringJournal();
  }

  buildMaterialJournal(computed: MaterialComputed): JournalEntryInput {
    return buildMaterialJournal(computed);
  }

  buildProductionJournal(computed: ProductionComputed): JournalEntryInput {
    return buildProductionJournal(computed);
  }

  buildSalesJournal(computed: SalesComputed): JournalEntryInput {
    return buildSalesJournal(computed);
  }

  postJournal(input: PostJournalInput): PostJournalResult {
    const ledger =
      input.journal.lines.length > 0
        ? applyJournalToBalances(input.currentLedger, input.journal)
        : new Map(input.currentLedger);
    const normalized = this.normalizeLedger(ledger);
    const financialStatements = buildFinancialStatements(
      normalized,
      input.periodLabel,
      input.companyId,
      input.operational,
      input.economy
    );
    const trialBalance = buildTrialBalance(normalized);
    return {
      journalId: crypto.randomUUID(),
      ledger: normalized,
      financialStatements,
      trialBalance,
    };
  }

  getFinancialStatements(
    companyId: string,
    periodLabel: string,
    ledger: LedgerMap,
    operational: CompanyOperationalState,
    economy: EconomyValues
  ) {
    return buildFinancialStatements(
      this.normalizeLedger(ledger),
      periodLabel,
      companyId,
      operational,
      economy
    );
  }

  getTrialBalance(ledger: LedgerMap) {
    const lines = buildTrialBalance(this.normalizeLedger(ledger));
    return { lines, totals: trialBalanceTotals(lines) };
  }

  private normalizeLedger(ledger: LedgerMap): LedgerMap {
    const next = new Map(ledger);
    for (const key of ["2100", "2120"] as const) {
      if (next.has(key)) {
        next.set(key, normalizeLiabilityBalance(next.get(key) ?? 0));
      }
    }
    return next;
  }
}

export const accountingEngine = new AccountingEngine();
