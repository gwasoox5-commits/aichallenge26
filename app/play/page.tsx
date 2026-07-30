"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/bsp/auth-client";
import { useRealtime } from "@/lib/bsp/use-realtime";
import { SubmitChecklistGate } from "@/components/bsp/SubmitChecklistGate";
import { PlayHeader } from "@/components/play/PlayHeader";
import { SubmittedWaitingPanel } from "@/components/play/SubmittedWaitingPanel";
import { BreakingNewsBanner, CeoNewsFeed, NewsDrawer, type CeoNewsItem } from "@/components/v2/news/CeoNewsPanel";
import { REALTIME_EVENT_TYPES } from "@/src/bsp/domain/realtime/realtime-event-types";
import { CeoCommandDashboard } from "@/components/bsp/CeoCommandDashboard";
import { CeoEventFeed } from "@/components/bsp/CeoEventFeed";
import { DashboardPanel } from "@/components/bsp/DashboardPanel";
import { StepEducationPanel, getStepEducation } from "@/components/bsp/StepEducationPanel";
import { BalanceSheetPanel, ProfitLossPanel } from "@/components/bsp/FinancialStatementsPanel";
import { JournalSummaryPanel, type JournalView } from "@/components/bsp/JournalSummaryPanel";
import { StepFacilityForm } from "@/components/bsp/StepFacilityForm";
import { StepFinanceForm } from "@/components/bsp/StepFinanceForm";
import { StepHRForm } from "@/components/bsp/StepHRForm";
import { StepMaterialForm, type MaterialLineForm } from "@/components/bsp/StepMaterialForm";
import { RegionSelectionPanel } from "@/components/bsp/RegionSelectionPanel";
import { StepProductionForm } from "@/components/bsp/StepProductionForm";
import { StepSalesForm, type SalesLineForm } from "@/components/bsp/StepSalesForm";
import { StepProgressStepper } from "@/components/bsp/StepProgressStepper";
import { MarketClearingResultsPanel } from "@/components/bsp/MarketClearingResultsPanel";
import { BranchMapPanel } from "@/components/bsp/BranchMapPanel";
import { ValidationPanel } from "@/components/bsp/ValidationPanel";
import { buildMaterialPayload, buildSalesPayload } from "@/lib/bsp/material-form-payload";
import { effectiveMaterialUnitPriceManwon } from "@/src/bsp/domain/economy/material-pricing";
import { getRegion, REGION_CATALOG, type RegionCode } from "@/src/bsp/domain/regions/region-catalog";
import {
  computeHiring,
  computeMaterial,
  computeProduction,
  computeSales,
} from "@/src/bsp/domain/validation/step-validators";
import { DEFAULT_ECONOMY_VALUES, GAME_CONSTANTS, PHASE_TO_STEP, type BspGameStep, type BspStepPhase, type HiringDepartment, type MarketResultsDto } from "@/src/bsp/domain/types";
import { formatPeriodLabel, formatStepPhaseLabel, parseYearFromPeriodLabel } from "@/src/bsp/domain/period/display-labels";

type Dashboard = {
  companyId: string;
  teamName: string;
  periodLabel: string;
  stepPhase: BspStepPhase;
  cashManwon: number;
  debtManwon: number;
  depositManwon: number;
  equityManwon: number;
  landPlots: number;
  machineBig: number;
  machineSmall: number;
  capacityMachine: number;
  maxMaterials: number;
  headPurchase: number;
  headProduction: number;
  headSales: number;
  purchaseCapacity: number;
  productionCapacity: number;
  salesCapacity: number;
  inventoryTotalUnits: number;
  finishedGoodsQty: number;
  statusVersion: number;
  completedSteps: BspGameStep[];
  sessionPhase?: "RUNNING" | "PREPARE" | "PAUSED" | "FINISHED";
  periodIndex?: number;
  year?: number;
  half?: string;
  remainingTimeSec?: number;
  stepStartedAt?: string;
  stepLocked?: boolean;
  currentStepSubmitted?: boolean;
  stepDurationSec?: number;
  economyLabel?: string;
  totalTeamCount?: number;
  submittedTeamCount?: number;
  submitRatePercent?: number;
  openBranches?: string[];
  openSalesBranches?: string[];
  selectedRegions?: string[];
  regionsToSelect?: number;
  regionSelectionRequired?: boolean;
  regionExpansionCap?: number;
  operatingRegionCount?: number;
  settlementComplete?: boolean;
  journalsLocked?: boolean;
  economy?: typeof DEFAULT_ECONOMY_VALUES;
  marketResults?: MarketResultsDto | null;
};

type ValidationResult = { ok: boolean; rules: Array<{ ruleId: string; passed: boolean; message: string }> };

export default function PlayPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [financials, setFinancials] = useState<Parameters<typeof ProfitLossPanel>[0]["financials"]>(null);
  const [journals, setJournals] = useState<JournalView[]>([]);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validationMode, setValidationMode] = useState<"default" | "post-submit">("default");
  const [checklistReady, setChecklistReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newsItems, setNewsItems] = useState<CeoNewsItem[]>([]);
  const [newsDrawerOpen, setNewsDrawerOpen] = useState(false);
  const [activeNews, setActiveNews] = useState<CeoNewsItem | null>(null);
  const [envSyncToken, setEnvSyncToken] = useState(0);

  const [loanEarly, setLoanEarly] = useState(2);
  const [loanMid, setLoanMid] = useState(0);
  const [deposit, setDeposit] = useState(1);
  const [loanRepayment, setLoanRepayment] = useState(0);
  const [landPlots, setLandPlots] = useState(1);
  const [machineBig, setMachineBig] = useState(1);
  const [machineSmall, setMachineSmall] = useState(0);

  const [headPurchase, setHeadPurchase] = useState(2);
  const [headProduction, setHeadProduction] = useState(3);
  const [headSales, setHeadSales] = useState(2);
  const [resignPurchase, setResignPurchase] = useState(0);
  const [resignProduction, setResignProduction] = useState(0);
  const [resignSales, setResignSales] = useState(0);
  const [transferFrom, setTransferFrom] = useState<HiringDepartment>("PURCHASE");
  const [transferTo, setTransferTo] = useState<HiringDepartment>("PRODUCTION");
  const [transferHeadcount, setTransferHeadcount] = useState(0);

  const [materialLines, setMaterialLines] = useState<MaterialLineForm[]>([]);

  const [productionQty, setProductionQty] = useState(3);
  const [machineBigRun, setMachineBigRun] = useState(1);
  const [machineSmallRun, setMachineSmallRun] = useState(0);

  const [salesLines, setSalesLines] = useState<SalesLineForm[]>([
    { regionCode: "ASIA", unitPriceManwon: 100, qty: 3, openBranch: false },
  ]);

  const step = dashboard?.stepPhase ?? "STEP1_FINANCE";
  const currentGameStep = PHASE_TO_STEP[step];
  const requiresManualChecklist = Boolean(currentGameStep && getStepEducation(currentGameStep));
  const completed = dashboard?.completedSteps ?? [];
  const economy = dashboard?.economy ?? DEFAULT_ECONOMY_VALUES;

  useEffect(() => {
    if (!dashboard) return;
    setHeadPurchase(dashboard.headPurchase);
    setHeadProduction(dashboard.headProduction);
    setHeadSales(dashboard.headSales);
    setResignPurchase(0);
    setResignProduction(0);
    setResignSales(0);
    setTransferFrom("PURCHASE");
    setTransferTo("PRODUCTION");
    setTransferHeadcount(0);
  }, [dashboard?.companyId, dashboard?.periodLabel, dashboard?.statusVersion]);

  useEffect(() => {
    if (!dashboard?.selectedRegions?.length) return;
    setMaterialLines((prev) => {
      const byCode = new Map(prev.map((line) => [line.regionCode, line]));
      return dashboard.selectedRegions!.map((code) => {
        const existing = byCode.get(code);
        const region = getRegion(code as RegionCode);
        return (
          existing ?? {
            regionCode: code,
            qty: 0,
            unitPriceBidManwon: effectiveMaterialUnitPriceManwon(region, economy),
            openBranch: false,
          }
        );
      });
    });
    setSalesLines((prev) => {
      if (prev.some((line) => dashboard.selectedRegions!.includes(line.regionCode))) return prev;
      return dashboard.selectedRegions!.map((code, index) => ({
        regionCode: code,
        unitPriceManwon: index === 0 ? 100 : 80,
        qty: 0,
        openBranch: false,
      }));
    });
  }, [dashboard?.companyId, dashboard?.periodLabel, dashboard?.selectedRegions, economy]);

  const periodYear = dashboard?.year ?? parseYearFromPeriodLabel(dashboard?.periodLabel);

  useEffect(() => {
    if (!requiresManualChecklist) {
      setChecklistReady(true);
      if (step === "STEP7_SETTLEMENT") setValidation(null);
      return;
    }
    setChecklistReady(false);
  }, [step, requiresManualChecklist]);

  useEffect(() => {
    setValidation(null);
    setValidationMode("default");
  }, [step, dashboard?.companyId, dashboard?.periodLabel]);

  const facilityPreview = useMemo(() => {
    const landCost = landPlots * 3000;
    const machineCost = machineBig * 600 + machineSmall * 300;
    const capBig = (dashboard?.machineBig ?? 0) + machineBig;
    const capSmall = (dashboard?.machineSmall ?? 0) + machineSmall;
    const capacity = capBig * 30 + capSmall * 10;
    return { landCost, machineCost, total: landCost + machineCost, capacity, maxMaterials: capacity * 4 };
  }, [landPlots, machineBig, machineSmall, dashboard]);

  const hrPreview = useMemo(() => {
    const computed = computeHiring({ headPurchase, headProduction, headSales });
    return {
      purchaseCapacity: computed.purchaseCapacity,
      productionCapacity: computed.productionCapacity,
      salesCapacity: computed.salesCapacity,
      payrollForecastHalfManwon: computed.payrollForecastHalfManwon,
      welfareForecastHalfManwon: computed.welfareForecastHalfManwon,
    };
  }, [headPurchase, headProduction, headSales]);

  const materialPreview = useMemo(() => {
    if (!dashboard) {
      return {
        totalUnits: 0,
        materialCost: 0,
        logisticsCost: 0,
        branchFee: 0,
        totalCost: 0,
        cashAfter: GAME_CONSTANTS.initialCashManwon,
      };
    }
    const payload = buildMaterialPayload(materialLines, dashboard.openBranches ?? []);
    const mockState = {
      cashManwon: dashboard.cashManwon,
      rawMaterialQty: dashboard.inventoryTotalUnits ?? 0,
      headPurchase: dashboard.headPurchase,
      purchaseCapacity: dashboard.purchaseCapacity ?? 0,
      openBranches: dashboard.openBranches ?? [],
      openSalesBranches: dashboard.openSalesBranches ?? [],
      selectedRegions: dashboard.selectedRegions ?? [],
    } as Parameters<typeof computeMaterial>[1];
    const c = computeMaterial(payload, mockState, economy);
    return {
      totalUnits: c.lines.reduce((sum, line) => sum + line.totalUnits, 0),
      materialCost: c.materialCostManwon,
      logisticsCost: c.logisticsCostManwon,
      branchFee: c.branchFeesManwon,
      totalCost: c.totalCostManwon,
      cashAfter: c.cashAfterManwon,
    };
  }, [materialLines, dashboard, economy]);

  const productionPreview = useMemo(() => {
    if (!dashboard) {
      return {
        maxProduction: 0,
        maxByMaterial: 0,
        maxByMachine: 0,
        maxByLabor: 0,
        machineOpCostManwon: 0,
        materialCostConsumedManwon: 0,
        cashAfterManwon: 0,
        finishedGoodsQtyAfter: 0,
      };
    }
    const mockState = {
      cashManwon: dashboard.cashManwon,
      rawMaterialQty: dashboard.inventoryTotalUnits ?? 0,
      inventoryCostManwon: (dashboard.inventoryTotalUnits ?? 0) * 12,
      headProduction: dashboard.headProduction,
      machineBig: dashboard.machineBig,
      machineSmall: dashboard.machineSmall,
      finishedGoodsQty: dashboard.finishedGoodsQty ?? 0,
      finishedGoodsCostManwon: 0,
    } as Parameters<typeof computeProduction>[1];
    const c = computeProduction(
      { productionQty, machineBigRun, machineSmallRun },
      mockState,
      economy
    );
    return {
      maxProduction: c.maxProduction,
      maxByMaterial: c.maxByMaterial,
      maxByMachine: c.maxByMachine,
      maxByLabor: c.maxByLabor,
      machineOpCostManwon: c.machineOpCostManwon,
      materialCostConsumedManwon: c.materialCostConsumedManwon,
      cashAfterManwon: c.cashAfterManwon,
      finishedGoodsQtyAfter: c.finishedGoodsQtyAfter,
    };
  }, [dashboard, productionQty, machineBigRun, machineSmallRun, economy]);

  const salesPreview = useMemo(() => {
    if (!dashboard) {
      return {
        totalRevenueManwon: 0,
        totalSoldQty: 0,
        cogsManwon: 0,
        logisticsSalesManwon: 0,
        branchFeesManwon: 0,
        cashAfterManwon: 0,
      };
    }
    const payload = buildSalesPayload(
      salesLines,
      dashboard.openBranches ?? [],
      dashboard.openSalesBranches ?? []
    );
    const mockState = {
      cashManwon: dashboard.cashManwon,
      finishedGoodsQty: dashboard.finishedGoodsQty ?? 15,
      unitFinishedGoodsCostManwon: 48,
      salesCapacity: dashboard.salesCapacity ?? 20,
      openBranches: dashboard.openBranches ?? [],
      openSalesBranches: dashboard.openSalesBranches ?? [],
      selectedRegions: dashboard.selectedRegions ?? [],
    } as Parameters<typeof computeSales>[1];
    const c = computeSales(payload, mockState, economy);
    return {
      totalRevenueManwon: c.totalRevenueManwon,
      totalSoldQty: c.totalSoldQty,
      cogsManwon: c.cogsManwon,
      logisticsSalesManwon: c.logisticsSalesManwon,
      branchFeesManwon: c.branchFeesManwon,
      cashAfterManwon: c.cashAfterManwon,
    };
  }, [dashboard, salesLines, economy]);

  const refresh = useCallback(async (id: string) => {
    const [dashRes, finRes, journalRes] = await Promise.all([
      authFetch(`/api/v1/play/companies/${id}/dashboard`),
      authFetch(`/api/v1/play/companies/${id}/financials`),
      authFetch(`/api/v1/play/companies/${id}/journals`),
    ]);
    const dash = await dashRes.json();
    const fin = await finRes.json();
    const journalData = await journalRes.json();
    if (dash.companyId) setDashboard(dash);
    if (fin.balanceSheet) setFinancials(fin);
    if (journalData.journals) {
      setJournals(
        journalData.journals.map((j: JournalView & { postedAt: string | Date }) => ({
          ...j,
          postedAt: String(j.postedAt),
        }))
      );
    }
  }, []);

  const fetchNews = useCallback(async (sid: string, opts?: { openDrawer?: boolean; preferNewsId?: string }) => {
    const res = await authFetch(`/api/v2/sessions/${sid}/news`);
    if (!res.ok) return;
    const data = await res.json();
    const items = (data.news ?? []) as CeoNewsItem[];
    setNewsItems(items);
    if (items.length === 0) return;

    const byId = opts?.preferNewsId ? items.find((n) => n.newsId === opts.preferNewsId) : undefined;
    const unread = items.find((n) => n.unread);
    const next = byId ?? unread ?? items[0];
    setActiveNews(next);
    if (opts?.openDrawer) setNewsDrawerOpen(true);
  }, []);

  const openNews = useCallback((item: CeoNewsItem) => {
    setActiveNews(item);
    setNewsDrawerOpen(true);
  }, []);

  const acknowledgeNews = useCallback(async (newsId: string) => {
    await authFetch(`/api/v2/news/${newsId}/acknowledge`, { method: "POST" });
    if (sessionId) await fetchNews(sessionId);
    setNewsDrawerOpen(false);
  }, [sessionId, fetchNews]);

  useEffect(() => {
    authFetch("/api/v1/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.role === "GM" || d?.role === "PLATFORM_ADMIN") {
          window.location.href = "/admin";
          return;
        }
        if (d?.sessionId) setSessionId(d.sessionId);
        if (d?.companyId && !companyId) setCompanyId(d.companyId);
      })
      .catch(() => undefined);
  }, [companyId]);

  const { connectionState, flash } = useRealtime({
    sessionId,
    enabled: !!sessionId && !!companyId,
    onSync: () => {
      if (companyId) refresh(companyId);
      setEnvSyncToken((t) => t + 1);
    },
    onEvent: (event) => {
      if (event.type === REALTIME_EVENT_TYPES.NEWS_PUBLISHED && sessionId) {
        const payload = event.payload as { newsId?: string } | undefined;
        fetchNews(sessionId, { openDrawer: true, preferNewsId: payload?.newsId });
      }
      if (companyId) refresh(companyId);
      setEnvSyncToken((t) => t + 1);
    },
  });

  useEffect(() => {
    if (sessionId) fetchNews(sessionId);
  }, [sessionId, fetchNews]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("companyId");
    if (id) {
      setCompanyId(id);
      refresh(id);
      window.history.replaceState({}, "", "/play");
    }
  }, [refresh]);

  useEffect(() => {
    if (companyId) refresh(companyId);
  }, [companyId, refresh]);

  const postRegionSelection = async (regionCodes: RegionCode[]) => {
    if (!companyId || !dashboard) return;
    setLoading(true);
    setMessage("");
    const res = await authFetch(`/api/v1/play/companies/${companyId}/regions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        regionCodes,
        companyStatusVersion: dashboard.statusVersion,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setValidation(data.details?.validation ?? null);
      setMessage(data.error ?? "지역 선택 실패");
    } else {
      setDashboard(data.dashboard);
      setMessage("운영 지역이 확정되었습니다.");
      await refresh(companyId);
    }
    setLoading(false);
  };

  const postDecision = async (targetStep: BspGameStep, validateOnly: boolean) => {
    if (!companyId || !dashboard) return;
    setLoading(true);
    setMessage("");

    let payload: unknown;
    if (targetStep === "LOAN") {
      payload = { loanEarly, loanMid, deposit, loanRepayment, step1UiPhase: "COMPLETE" as const };
    } else if (targetStep === "FACILITY") {
      payload = { landPlotsPurchased: landPlots, machineBigPurchased: machineBig, machineSmallPurchased: machineSmall };
    } else if (targetStep === "HIRING") {
      const transfers =
        periodYear >= 2 && transferHeadcount > 0 && transferFrom !== transferTo
          ? [{ from: transferFrom, to: transferTo, headcount: transferHeadcount }]
          : [];
      payload = {
        headPurchase,
        headProduction,
        headSales,
        transfers,
        resignations: {
          purchase: resignPurchase,
          production: resignProduction,
          sales: resignSales,
        },
      };
    } else if (targetStep === "MATERIAL") {
      payload = buildMaterialPayload(materialLines, dashboard.openBranches ?? []);
    } else if (targetStep === "PRODUCTION") {
      payload = { productionQty, machineBigRun, machineSmallRun };
    } else if (targetStep === "SALES") {
      payload = buildSalesPayload(
        salesLines,
        dashboard.openBranches ?? [],
        dashboard.openSalesBranches ?? []
      );
    } else {
      payload = {};
    }

    const res = await authFetch(`/api/v1/play/companies/${companyId}/decisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: targetStep,
        payload,
        companyStatusVersion: dashboard.statusVersion,
        validateOnly,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setValidationMode("default");
      setValidation(data.details?.validation ?? null);
      setMessage(data.error ?? "요청 실패");
    } else if (validateOnly) {
      setValidationMode("default");
      setValidation(data.validation);
      setMessage(data.validation?.ok ? "검증 통과" : "검증 실패 — 아래 항목을 확인하세요");
    } else {
      setDashboard(data.dashboard);
      setValidationMode("post-submit");
      setValidation(data.validation);
      setMessage(`${targetStep} 제출 완료 — GM이 다음 Step을 진행할 때까지 대기하세요.`);
      await refresh(companyId);
    }
    setLoading(false);
  };

  const unreadNewsCount = newsItems.filter((n) => n.unread).length;

  const isSubmitted = dashboard?.currentStepSubmitted ?? false;
  const stepLabel = formatStepPhaseLabel(step);
  const periodLabelKo = formatPeriodLabel(dashboard?.periodLabel);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <BreakingNewsBanner
        news={activeNews}
        unreadCount={unreadNewsCount}
        onOpen={() => {
          if (activeNews) openNews(activeNews);
        }}
      />
      <NewsDrawer
        open={newsDrawerOpen}
        news={activeNews}
        onClose={() => setNewsDrawerOpen(false)}
        onAcknowledge={acknowledgeNews}
      />
      <PlayHeader
        teamName={dashboard?.teamName}
        periodLabel={periodLabelKo}
        stepLabel={stepLabel}
        stepStartedAt={dashboard?.stepStartedAt}
        stepDurationSec={dashboard?.stepDurationSec}
        remainingTimeSec={dashboard?.remainingTimeSec}
        connectionState={connectionState}
        flash={flash ?? null}
        submitted={isSubmitted}
        unreadNewsCount={unreadNewsCount}
        onNewsClick={() => {
          const target = newsItems.find((n) => n.unread) ?? activeNews ?? newsItems[0];
          if (target) openNews(target);
        }}
        sessionPhase={dashboard?.sessionPhase}
      />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          {!companyId ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="mb-4 text-slate-700">참가 코드로 입장하거나 강사에게 팀 배정을 요청하세요.</p>
              <a href="/join" className="inline-block rounded-lg bg-sky-600 px-6 py-2 font-medium text-white hover:bg-sky-500">
                참가 코드 입력
              </a>
            </div>
          ) : (
            <>
              {isSubmitted && dashboard && (
                <SubmittedWaitingPanel
                  teamName={dashboard.teamName}
                  periodLabel={periodLabelKo}
                  stepLabel={stepLabel}
                  newsItems={newsItems}
                  cashManwon={dashboard.cashManwon}
                  submittedTeams={dashboard.submittedTeamCount}
                  totalTeams={dashboard.totalTeamCount}
                  submitRatePercent={dashboard.submitRatePercent}
                />
              )}

              {companyId && dashboard && !isSubmitted && (
                <CeoCommandDashboard companyId={companyId} dashboard={dashboard} />
              )}

              <StepProgressStepper stepPhase={step} completedSteps={completed} />

              {dashboard?.marketResults && (
                <MarketClearingResultsPanel marketResults={dashboard.marketResults} variant="ceo" />
              )}

              {!isSubmitted && requiresManualChecklist && (
                <SubmitChecklistGate
                  validation={validation}
                  checklistReady={checklistReady}
                  requireManualChecklist={requiresManualChecklist}
                  alreadySubmitted={isSubmitted}
                />
              )}

              {currentGameStep && step.startsWith("STEP") && !completed.includes(currentGameStep) && !isSubmitted && (
                <StepEducationPanel
                  key={step}
                  step={currentGameStep}
                  onAllCheckedChange={setChecklistReady}
                />
              )}

              {step === "STEP1_FINANCE" && !completed.includes("LOAN") && !isSubmitted && (
                <StepFinanceForm
                  loanEarly={loanEarly}
                  loanMid={loanMid}
                  deposit={deposit}
                  loanRepayment={loanRepayment}
                  loading={loading}
                  checklistReady={checklistReady}
                  onChange={(field, value) => {
                    if (field === "loanEarly") setLoanEarly(value);
                    if (field === "loanMid") setLoanMid(value);
                    if (field === "deposit") setDeposit(value);
                    if (field === "loanRepayment") setLoanRepayment(value);
                  }}
                  onValidate={() => postDecision("LOAN", true)}
                  onSubmit={() => postDecision("LOAN", false)}
                />
              )}

              {step === "STEP2_INVESTMENT" && !completed.includes("FACILITY") && !isSubmitted && (
                <StepFacilityForm
                  landPlots={landPlots}
                  machineBig={machineBig}
                  machineSmall={machineSmall}
                  preview={facilityPreview}
                  loading={loading}
                  onChange={(field, value) => {
                    if (field === "landPlots") setLandPlots(value);
                    if (field === "machineBig") setMachineBig(value);
                    if (field === "machineSmall") setMachineSmall(value);
                  }}
                  onValidate={() => postDecision("FACILITY", true)}
                  onSubmit={() => postDecision("FACILITY", false)}
                />
              )}

              {step === "STEP3_HR" && !completed.includes("HIRING") && !isSubmitted && (
                <StepHRForm
                  periodYear={periodYear}
                  currentHeads={{
                    headPurchase: dashboard?.headPurchase ?? headPurchase,
                    headProduction: dashboard?.headProduction ?? headProduction,
                    headSales: dashboard?.headSales ?? headSales,
                  }}
                  headPurchase={headPurchase}
                  headProduction={headProduction}
                  headSales={headSales}
                  resignations={{
                    purchase: resignPurchase,
                    production: resignProduction,
                    sales: resignSales,
                  }}
                  transferFrom={transferFrom}
                  transferTo={transferTo}
                  transferHeadcount={transferHeadcount}
                  preview={hrPreview}
                  loading={loading}
                  onChange={(field, value) => {
                    if (field === "headPurchase") setHeadPurchase(value);
                    if (field === "headProduction") setHeadProduction(value);
                    if (field === "headSales") setHeadSales(value);
                  }}
                  onResignChange={(field, value) => {
                    if (field === "purchase") setResignPurchase(value);
                    if (field === "production") setResignProduction(value);
                    if (field === "sales") setResignSales(value);
                  }}
                  onTransferChange={(field, value) => {
                    if (field === "transferFrom") setTransferFrom(value as HiringDepartment);
                    if (field === "transferTo") setTransferTo(value as HiringDepartment);
                    if (field === "transferHeadcount") setTransferHeadcount(value as number);
                  }}
                  onValidate={() => postDecision("HIRING", true)}
                  onSubmit={() => postDecision("HIRING", false)}
                />
              )}

              {dashboard && step === "STEP4_PURCHASE" && dashboard.regionSelectionRequired && !isSubmitted && (
                <RegionSelectionPanel
                  year={dashboard.year ?? periodYear}
                  regionsToSelect={dashboard.regionsToSelect ?? 0}
                  selectedRegions={dashboard.selectedRegions ?? []}
                  loading={loading}
                  onSubmit={postRegionSelection}
                />
              )}

              {dashboard && step === "STEP4_PURCHASE" && !dashboard.regionSelectionRequired && !completed.includes("MATERIAL") && !isSubmitted && (
                <StepMaterialForm
                  lines={materialLines}
                  selectedRegions={dashboard.selectedRegions ?? []}
                  purchaseCapacity={dashboard.purchaseCapacity ?? hrPreview.purchaseCapacity}
                  openBranches={dashboard.openBranches ?? []}
                  openSalesBranches={dashboard.openSalesBranches ?? []}
                  regionExpansionCap={dashboard.regionExpansionCap ?? 3}
                  preview={materialPreview}
                  loading={loading}
                  checklistReady={checklistReady}
                  onChange={setMaterialLines}
                  onValidate={() => postDecision("MATERIAL", true)}
                  onSubmit={() => postDecision("MATERIAL", false)}
                />
              )}

              {dashboard && step === "STEP5_PRODUCTION" && !completed.includes("PRODUCTION") && !isSubmitted && (
                <StepProductionForm
                  productionQty={productionQty}
                  machineBigRun={machineBigRun}
                  machineSmallRun={machineSmallRun}
                  machineBig={dashboard.machineBig}
                  machineSmall={dashboard.machineSmall}
                  productionCapacity={dashboard.productionCapacity ?? 30}
                  inventoryTotalUnits={dashboard.inventoryTotalUnits ?? 0}
                  preview={productionPreview}
                  loading={loading}
                  onChange={(field, value) => {
                    if (field === "productionQty") setProductionQty(value);
                    if (field === "machineBigRun") setMachineBigRun(value);
                    if (field === "machineSmallRun") setMachineSmallRun(value);
                  }}
                  onValidate={() => postDecision("PRODUCTION", true)}
                  onSubmit={() => postDecision("PRODUCTION", false)}
                />
              )}

              {dashboard && step === "STEP6_SALES" && !completed.includes("SALES") && !isSubmitted && (
                <>
                  <StepSalesForm
                    lines={salesLines}
                    finishedGoodsQty={dashboard.finishedGoodsQty ?? 0}
                    salesCapacity={dashboard.salesCapacity ?? 20}
                    openBranches={dashboard.openBranches ?? []}
                    openSalesBranches={dashboard.openSalesBranches ?? []}
                    regionExpansionCap={dashboard.regionExpansionCap ?? 3}
                    preview={salesPreview}
                    loading={loading}
                    checklistReady={checklistReady}
                    onChange={setSalesLines}
                    onValidate={() => postDecision("SALES", true)}
                    onSubmit={() => postDecision("SALES", false)}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSalesLines((prev) => [
                        ...prev,
                        {
                          regionCode: REGION_CATALOG[(prev.length + 1) % REGION_CATALOG.length].code,
                          unitPriceManwon: 80,
                          qty: 0,
                          openBranch: false,
                        },
                      ])
                    }
                    className="text-sm text-sky-400 hover:underline"
                  >
                    + 지역 추가
                  </button>
                </>
              )}

              {dashboard && step === "STEP7_SETTLEMENT" && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-6">
                  <h2 className="text-lg font-semibold text-violet-700">Step 7 — 반기 결산</h2>
                  <p className="mt-2 text-sm text-slate-700">
                    CEO는 결산을 실행할 수 없습니다. GM Desk에서 &quot;반기 종료 (결산)&quot;를 실행하세요.
                  </p>
                  {dashboard.settlementComplete && (
                    <p className="mt-2 text-emerald-700">결산 완료 · Journal Locked · P/L · B/S 확정</p>
                  )}
                </div>
              )}

              <ValidationPanel
                validation={
                  step === "STEP7_SETTLEMENT" || (validationMode === "post-submit" && !isSubmitted)
                    ? null
                    : validation
                }
                mode={validationMode}
              />
              <JournalSummaryPanel journals={journals} />
              {message && <p className="text-sm text-sky-700">{message}</p>}
            </>
          )}
        </section>

        <aside className="space-y-4">
          {dashboard && companyId && (
            <BranchMapPanel
              year={dashboard.year ?? periodYear}
              openBranches={dashboard.openBranches ?? []}
              openSalesBranches={dashboard.openSalesBranches ?? []}
              compact
            />
          )}
          {sessionId && (
            <CeoNewsFeed
              items={newsItems}
              activeNewsId={activeNews?.newsId}
              onSelect={openNews}
            />
          )}
          {companyId && <CeoEventFeed companyId={companyId} syncToken={envSyncToken} />}
        </aside>
        </div>

        {companyId && (
          <div
            className="mt-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3"
            data-testid="ceo-metrics-row"
          >
            <DashboardPanel dashboard={dashboard} />
            <ProfitLossPanel financials={financials} />
            <BalanceSheetPanel financials={financials} />
          </div>
        )}
      </main>
    </div>
  );
}
