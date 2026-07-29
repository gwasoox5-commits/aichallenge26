import type { BspGameStep } from "../domain/types";
import { STEP_TO_PHASE } from "../domain/types";
import type { MaterialPayload, SalesPayload } from "../domain/types";
import {
  buildAwardedMaterialPayload,
  buildAwardedSalesPayload,
  clearMaterialBids,
  clearSalesBids,
  collectMaterialBids,
  collectSalesBids,
} from "../domain/market/market-clearing";
import { getZeroPayload } from "../domain/gm/zero-payloads";
import type {
  BspRepositories,
  CompanyAggregate,
  DecisionRecord,
  JournalRecord,
  SessionAggregate,
} from "./ports/repositories";
import { StepHandlerRegistry } from "../domain/steps/step-handler-registry";
import { AccountingEngine } from "../domain/accounting/accounting-engine";

function isActiveDecision(d: DecisionRecord, periodId: string, step: BspGameStep) {
  return d.periodId === periodId && d.step === step && (d.status === "SUBMITTED" || d.status === "POSTED");
}

export class MarketClearingService {
  constructor(
    private readonly repos: BspRepositories,
    private readonly registry: StepHandlerRegistry,
    private readonly accounting: AccountingEngine
  ) {}

  async ensureZeroBids(session: SessionAggregate, step: "MATERIAL" | "SALES") {
    const companies = await this.repos.company.listBySession(session.id);
    for (const company of companies) {
      const hasBid = company.decisions.some(
        (d) => d.periodId === session.periodId && d.step === step && d.status === "SUBMITTED"
      );
      if (hasBid) continue;
      const payload = getZeroPayload(step, company.operational);
      await this.saveBidDecision(company, session, step, payload, company.statusVersion, "GM_ZERO");
    }
  }

  async clearMaterialStep(session: SessionAggregate) {
    await this.ensureZeroBids(session, "MATERIAL");
    const companies = await this.repos.company.listBySession(session.id);
    const allBids = [];
    for (const company of companies) {
      const decision = company.decisions.find(
        (d) => d.periodId === session.periodId && d.step === "MATERIAL" && isActiveDecision(d, session.periodId, "MATERIAL")
      );
      if (!decision) continue;
      allBids.push(...collectMaterialBids(company.id, decision.payload as MaterialPayload, session.economy));
    }
    const awardsByCompany = clearMaterialBids(allBids, session.economy);
    for (const company of companies) {
      const decision = company.decisions.find(
        (d) => d.periodId === session.periodId && d.step === "MATERIAL" && d.status === "SUBMITTED"
      );
      if (!decision) continue;
      const awards = awardsByCompany.get(company.id) ?? [];
      const awardedPayload = buildAwardedMaterialPayload(decision.payload as MaterialPayload, awards);
      await this.postClearedDecision(company, session, "MATERIAL", decision, awardedPayload, awards);
    }
  }

  async clearSalesStep(session: SessionAggregate) {
    await this.ensureZeroBids(session, "SALES");
    const companies = await this.repos.company.listBySession(session.id);
    const allBids = [];
    for (const company of companies) {
      const decision = company.decisions.find(
        (d) => d.periodId === session.periodId && d.step === "SALES" && isActiveDecision(d, session.periodId, "SALES")
      );
      if (!decision) continue;
      allBids.push(...collectSalesBids(company.id, decision.payload as SalesPayload));
    }
    const awardsByCompany = clearSalesBids(allBids, session.economy);
    for (const company of companies) {
      const decision = company.decisions.find(
        (d) => d.periodId === session.periodId && d.step === "SALES" && d.status === "SUBMITTED"
      );
      if (!decision) continue;
      const awards = awardsByCompany.get(company.id) ?? [];
      const awardedPayload = buildAwardedSalesPayload(decision.payload as SalesPayload, awards);
      await this.postClearedDecision(company, session, "SALES", decision, awardedPayload, awards);
    }
  }

  async saveBidDecision(
    company: CompanyAggregate,
    session: SessionAggregate,
    step: "MATERIAL" | "SALES",
    payload: unknown,
    companyStatusVersion: number,
    source: DecisionRecord["source"] = "CEO"
  ) {
    const handler = this.registry.get(step);
    const outcome = handler.validate({ company, session, payload });
    if (!outcome.validation.ok) {
      throw new Error(outcome.validation.rules.find((r) => !r.passed)?.message ?? "Bid validation failed");
    }

    const decision: DecisionRecord = {
      id: crypto.randomUUID(),
      companyId: company.id,
      periodId: company.periodId,
      step,
      status: "SUBMITTED",
      source,
      payload,
      validation: outcome.validation,
      computed: { ...outcome.computed, bidPhase: true },
      companyStatusVersion,
      journalEntryIds: [],
      submittedAt: new Date(),
    };

    company.decisions.push(decision);
    await this.repos.company.saveDecision(decision);
    const newVersion = await this.repos.company.incrementStatusVersion(company.id, companyStatusVersion);
    company.statusVersion = newVersion;
    return { decision, statusVersion: newVersion };
  }

  private async postClearedDecision(
    company: CompanyAggregate,
    session: SessionAggregate,
    step: "MATERIAL" | "SALES",
    existingDecision: DecisionRecord,
    awardedPayload: MaterialPayload | SalesPayload,
    marketAwards: unknown
  ) {
    const handler = this.registry.get(step);
    const outcome = handler.validate({ company, session, payload: awardedPayload });
    if (!outcome.validation.ok) {
      throw new Error(
        `Clearing post failed for ${company.teamName}: ${outcome.validation.rules.find((r) => !r.passed)?.message}`
      );
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

    const journal: JournalRecord = {
      id: posted.journalId,
      companyId: company.id,
      periodId: company.periodId,
      decisionId: existingDecision.id,
      transactionType: outcome.journalInput.transactionType,
      description: outcome.journalInput.description,
      lines: outcome.journalInput.lines,
      postedAt: new Date(),
    };

    existingDecision.status = "POSTED";
    existingDecision.computed = { ...outcome.computed, marketAwards };
    existingDecision.validation = outcome.validation;
    existingDecision.journalEntryIds = [journal.id];

    company.operational = outcome.nextOperational;
    company.ledger = posted.ledger;
    company.journals.push(journal);

    await this.repos.company.updateOperational(company.id, outcome.nextOperational);
    await this.repos.company.saveLedger(company.id, posted.ledger);
    await this.repos.company.saveJournal(journal);
    await this.repos.company.saveDecision(existingDecision);
  }
}
