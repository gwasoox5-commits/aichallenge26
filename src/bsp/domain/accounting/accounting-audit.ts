import type { CompanyAggregate, DecisionRecord, JournalRecord, SessionAggregate } from "../../application/ports/repositories";
import type { FinancialStatementsDto } from "../types";
import { validateBalanceSheet, validateTrialBalance, type BalanceSheetValidationResult, type TrialBalanceValidationResult } from "./balance-sheet-validation";
import { computePeriodChanges, type PeriodFinancialChange } from "./period-financial-snapshot";
import { buildOperationalParityReport, type ExcelDiffReport } from "./operational-parity-report";

export interface AuditJournalRow extends JournalRecord {
  step?: string;
  source?: string;
}

export interface AccountingAuditPayload {
  companyId: string;
  teamName: string;
  periodId: string;
  periodLabel: string;
  journals: AuditJournalRow[];
  decisions: DecisionRecord[];
  trialBalance: FinancialStatementsDto["trialBalance"];
  financialStatements: FinancialStatementsDto;
  balanceSheetValidation: BalanceSheetValidationResult;
  trialBalanceValidation: TrialBalanceValidationResult;
  periodChanges: PeriodFinancialChange[];
  diffReport: ExcelDiffReport;
}

export function buildAccountingAuditPayload(input: {
  company: CompanyAggregate;
  session: SessionAggregate;
  financialStatements: FinancialStatementsDto;
  dashboard: Parameters<typeof buildOperationalParityReport>[2];
}): AccountingAuditPayload {
  const { company, session, financialStatements, dashboard } = input;
  const decisionByJournal = new Map<string, DecisionRecord>();
  for (const d of company.decisions) {
    for (const jid of d.journalEntryIds) decisionByJournal.set(jid, d);
  }

  const periodJournals = company.journals
    .filter((j) => j.periodId === company.periodId)
    .map((j) => {
      const d = decisionByJournal.get(j.id);
      return {
        ...j,
        step: d?.step,
        source: d?.source ?? (j.transactionType.includes("SETTLEMENT") ? "SETTLEMENT" : undefined),
      };
    });

  const balanceSheetValidation = validateBalanceSheet(financialStatements);
  const trialBalanceValidation = validateTrialBalance(financialStatements);
  const periodChanges = computePeriodChanges(company.operational.periodOpenFinancials, financialStatements);
  const diffReport = buildOperationalParityReport(company, session, dashboard, financialStatements);

  return {
    companyId: company.id,
    teamName: company.teamName,
    periodId: company.periodId,
    periodLabel: company.periodLabel,
    journals: periodJournals,
    decisions: company.decisions.filter((d) => d.periodId === company.periodId),
    trialBalance: financialStatements.trialBalance,
    financialStatements,
    balanceSheetValidation,
    trialBalanceValidation,
    periodChanges,
    diffReport,
  };
}
