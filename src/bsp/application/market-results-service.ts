import type {
  BspGameStep,
  BspStepPhase,
  EconomyValues,
  MaterialPayload,
  MarketResultsDto,
  MarketRegionResultDto,
  MarketStepResultDto,
  MarketTeamRowDto,
  SalesPayload,
} from "../domain/types";
import { OPERATIONAL_STEP_PHASES } from "../domain/types";
import type { MaterialAward, SalesAward } from "../domain/market/market-clearing";
import { effectiveMaterialLimit, effectiveMaterialUnitPriceManwon } from "../domain/economy/material-pricing";
import { effectiveSaleLimit } from "../domain/economy/sales-pricing";
import { getRegion, REGION_CATALOG, type RegionCode } from "../domain/regions/region-catalog";
import type { CompanyAggregate, SessionAggregate } from "./ports/repositories";

function phaseIndex(phase: BspStepPhase): number {
  const idx = OPERATIONAL_STEP_PHASES.indexOf(phase);
  return idx >= 0 ? idx : OPERATIONAL_STEP_PHASES.length;
}

function sumMaterials(m: { A: number; B: number; C: number; D: number }) {
  return m.A + m.B + m.C + m.D;
}

function readMarketAwards(computed: unknown): Array<MaterialAward | SalesAward> {
  if (typeof computed !== "object" || computed === null) return [];
  const awards = (computed as Record<string, unknown>).marketAwards;
  return Array.isArray(awards) ? (awards as Array<MaterialAward | SalesAward>) : [];
}

function findPostedDecision(company: CompanyAggregate, periodId: string, step: BspGameStep) {
  return company.decisions.find((d) => d.periodId === periodId && d.step === step && d.status === "POSTED");
}

export class MarketResultsService {
  build(session: SessionAggregate, companies: CompanyAggregate[], viewerCompanyId: string): MarketResultsDto {
    return {
      periodLabel: session.periodLabel,
      material: this.buildStepResult(session, companies, viewerCompanyId, "MATERIAL"),
      sales: this.buildStepResult(session, companies, viewerCompanyId, "SALES"),
    };
  }

  private buildStepResult(
    session: SessionAggregate,
    companies: CompanyAggregate[],
    viewerCompanyId: string,
    step: "MATERIAL" | "SALES"
  ): MarketStepResultDto | null {
    const revealAfterPhase: BspStepPhase = step === "MATERIAL" ? "STEP5_PRODUCTION" : "STEP7_SETTLEMENT";
    const visible = phaseIndex(session.stepPhase) >= phaseIndex(revealAfterPhase);
    if (!visible) return null;

    const posted = companies
      .map((company) => ({ company, decision: findPostedDecision(company, session.periodId, step) }))
      .filter((row): row is { company: CompanyAggregate; decision: NonNullable<typeof row.decision> } => !!row.decision);

    const cleared = posted.length > 0;
    const regions = this.buildRegions(session.economy, companies, viewerCompanyId, step, posted);

    return {
      step,
      stepLabel: step === "MATERIAL" ? "Step 4 · 원재료 구매" : "Step 6 · 판매",
      visible,
      cleared: posted.length > 0,
      sortRule: step === "MATERIAL" ? "HIGHER_PRICE_WINS" : "LOWER_PRICE_WINS",
      regions,
    };
  }

  private buildRegions(
    economy: EconomyValues,
    companies: CompanyAggregate[],
    viewerCompanyId: string,
    step: "MATERIAL" | "SALES",
    posted: Array<{ company: CompanyAggregate; decision: NonNullable<ReturnType<typeof findPostedDecision>> }>
  ): MarketRegionResultDto[] {
    const regionCodes = new Set<RegionCode>();

    for (const { decision } of posted) {
      if (step === "MATERIAL") {
        const payload = decision.payload as MaterialPayload;
        for (const line of payload.lines ?? []) {
          if (sumMaterials(line.materials) > 0) regionCodes.add(line.regionCode as RegionCode);
        }
        for (const award of readMarketAwards(decision.computed) as MaterialAward[]) {
          if (award.requestedUnits > 0 || award.awardedUnits > 0) regionCodes.add(award.regionCode);
        }
      } else {
        const payload = decision.payload as SalesPayload;
        for (const line of payload.lines ?? []) {
          if (line.qty > 0) regionCodes.add(line.regionCode as RegionCode);
        }
        for (const award of readMarketAwards(decision.computed) as SalesAward[]) {
          if (award.requestedQty > 0 || award.awardedQty > 0) regionCodes.add(award.regionCode);
        }
      }
    }

    const orderedRegions = REGION_CATALOG.filter((r) => regionCodes.has(r.code));
    return orderedRegions.map((region) =>
      step === "MATERIAL"
        ? this.buildMaterialRegion(region.code, economy, posted, viewerCompanyId)
        : this.buildSalesRegion(region.code, economy, posted, viewerCompanyId)
    );
  }

  private buildMaterialRegion(
    regionCode: RegionCode,
    economy: EconomyValues,
    posted: Array<{ company: CompanyAggregate; decision: NonNullable<ReturnType<typeof findPostedDecision>> }>,
    viewerCompanyId: string
  ): MarketRegionResultDto {
    const region = getRegion(regionCode);
    const regionalLimit = effectiveMaterialLimit(region, economy);
    const teams: MarketTeamRowDto[] = [];

    for (const { company, decision } of posted) {
      const payload = decision.payload as MaterialPayload;
      const line = (payload.lines ?? []).find((l) => l.regionCode === regionCode);
      const requestedQty = line ? sumMaterials(line.materials) : 0;
      const effectivePrice = effectiveMaterialUnitPriceManwon(region, economy);
      const unitPriceManwon = line?.unitPriceBidManwon ?? effectivePrice;
      const awards = readMarketAwards(decision.computed) as MaterialAward[];
      const award = awards.find((a) => a.regionCode === regionCode);
      const awardedQty = award?.awardedUnits ?? 0;
      if (requestedQty <= 0 && awardedQty <= 0) continue;

      teams.push({
        companyId: company.id,
        teamName: company.teamName,
        isSelf: company.id === viewerCompanyId,
        unitPriceManwon: award?.clearingPriceManwon ?? unitPriceManwon,
        requestedQty: award?.requestedUnits ?? requestedQty,
        awardedQty,
        fillRatePercent: requestedQty > 0 ? Math.round((awardedQty / requestedQty) * 1000) / 10 : 0,
      });
    }

    teams.sort((a, b) => b.unitPriceManwon - a.unitPriceManwon || b.awardedQty - a.awardedQty || a.teamName.localeCompare(b.teamName));

    return {
      regionCode,
      regionName: region.displayName,
      regionalLimit,
      totalRequested: teams.reduce((sum, t) => sum + t.requestedQty, 0),
      totalAwarded: teams.reduce((sum, t) => sum + t.awardedQty, 0),
      sortRule: "HIGHER_PRICE_WINS",
      teams,
    };
  }

  private buildSalesRegion(
    regionCode: RegionCode,
    economy: EconomyValues,
    posted: Array<{ company: CompanyAggregate; decision: NonNullable<ReturnType<typeof findPostedDecision>> }>,
    viewerCompanyId: string
  ): MarketRegionResultDto {
    const region = getRegion(regionCode);
    const regionalLimit = effectiveSaleLimit(region, economy);
    const teams: MarketTeamRowDto[] = [];

    for (const { company, decision } of posted) {
      const payload = decision.payload as SalesPayload;
      const line = (payload.lines ?? []).find((l) => l.regionCode === regionCode);
      const requestedQty = line?.qty ?? 0;
      const unitPriceManwon = line?.unitPriceManwon ?? 0;
      const awards = readMarketAwards(decision.computed) as SalesAward[];
      const award = awards.find((a) => a.regionCode === regionCode);
      const awardedQty = award?.awardedQty ?? 0;
      if (requestedQty <= 0 && awardedQty <= 0) continue;

      teams.push({
        companyId: company.id,
        teamName: company.teamName,
        isSelf: company.id === viewerCompanyId,
        unitPriceManwon: award?.clearingPriceManwon ?? unitPriceManwon,
        requestedQty: award?.requestedQty ?? requestedQty,
        awardedQty,
        fillRatePercent: requestedQty > 0 ? Math.round((awardedQty / requestedQty) * 1000) / 10 : 0,
      });
    }

    teams.sort((a, b) => a.unitPriceManwon - b.unitPriceManwon || b.awardedQty - a.awardedQty || a.teamName.localeCompare(b.teamName));

    return {
      regionCode,
      regionName: region.displayName,
      regionalLimit,
      totalRequested: teams.reduce((sum, t) => sum + t.requestedQty, 0),
      totalAwarded: teams.reduce((sum, t) => sum + t.awardedQty, 0),
      sortRule: "LOWER_PRICE_WINS",
      teams,
    };
  }
}

export const marketResultsService = new MarketResultsService();
