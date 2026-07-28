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
import { StepEducationPanel } from "@/components/bsp/StepEducationPanel";
import { FinancialStatementsPanel } from "@/components/bsp/FinancialStatementsPanel";
import { JournalSummaryPanel, type JournalView } from "@/components/bsp/JournalSummaryPanel";
import { StepFacilityForm } from "@/components/bsp/StepFacilityForm";
import { StepFinanceForm } from "@/components/bsp/StepFinanceForm";
import { StepHRForm } from "@/components/bsp/StepHRForm";
import { StepMaterialForm, type MaterialFormState } from "@/components/bsp/StepMaterialForm";
import { StepProductionForm } from "@/components/bsp/StepProductionForm";
import { StepSalesForm, type SalesLineForm } from "@/components/bsp/StepSalesForm";
import { StepProgressStepper } from "@/components/bsp/StepProgressStepper";
import { ValidationPanel } from "@/components/bsp/ValidationPanel";
import { effectiveMaterialUnitPriceManwon, logisticsCostManwon } from "@/src/bsp/domain/economy/material-pricing";
import { getRegion, REGION_CATALOG } from "@/src/bsp/domain/regions/region-catalog";
import {
  computeHiring,
  computeProduction,
  computeSales,
} from "@/src/bsp/domain/validation/step-validators";
import { DEFAULT_ECONOMY_VALUES, GAME_CONSTANTS, PHASE_TO_STEP, type BspGameStep, type BspStepPhase } from "@/src/bsp/domain/types";

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
  stepLocked?: boolean;
  currentStepSubmitted?: boolean;
  stepDurationSec?: number;
  economyLabel?: string;
  openBranches?: string[];
  settlementComplete?: boolean;
  journalsLocked?: boolean;
  economy?: typeof DEFAULT_ECONOMY_VALUES;
};

type ValidationResult = { ok: boolean; rules: Array<{ ruleId: string; passed: boolean; message: string }> };

export default function PlayPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [financials, setFinancials] = useState<Parameters<typeof FinancialStatementsPanel>[0]["financials"]>(null);
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

  const [materialForm, setMaterialForm] = useState<MaterialFormState>({
    regionCode: "ASIA",
    materials: { A: 15, B: 15, C: 15, D: 15 },
    openBranch: false,
  });

  const [productionQty, setProductionQty] = useState(3);
  const [machineBigRun, setMachineBigRun] = useState(1);
  const [machineSmallRun, setMachineSmallRun] = useState(0);

  const [salesLines, setSalesLines] = useState<SalesLineForm[]>([
    { regionCode: "ASIA", unitPriceManwon: 100, qty: 3, openBranch: false },
  ]);

  const step = dashboard?.stepPhase ?? "STEP1_FINANCE";
  const currentGameStep = PHASE_TO_STEP[step];
  const completed = dashboard?.completedSteps ?? [];
  const economy = dashboard?.economy ?? DEFAULT_ECONOMY_VALUES;

  useEffect(() => {
    setChecklistReady(false);
  }, [step]);

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
    const region = getRegion(materialForm.regionCode as Parameters<typeof getRegion>[0]);
    const unitPrice = effectiveMaterialUnitPriceManwon(region, economy);
    const totalUnits =
      materialForm.materials.A +
      materialForm.materials.B +
      materialForm.materials.C +
      materialForm.materials.D;
    const materialCost = totalUnits * unitPrice;
    const logistics = logisticsCostManwon(totalUnits, economy);
    const branchFee =
      materialForm.openBranch && !(dashboard?.openBranches ?? []).includes(materialForm.regionCode)
        ? region.branchSetupFeeManwon
        : 0;
    const totalCost = materialCost + logistics + branchFee;
    const cashAfter = (dashboard?.cashManwon ?? GAME_CONSTANTS.initialCashManwon) - totalCost;
    return { unitPrice, totalUnits, materialCost, logisticsCost: logistics, branchFee, totalCost, cashAfter };
  }, [materialForm, dashboard, economy]);

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
      inventory: { A: 15, B: 15, C: 15, D: 15 },
      inventoryCostManwon: 720,
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
    const payload = {
      lines: salesLines.map((l) => ({
        regionCode: l.regionCode,
        unitPriceManwon: l.unitPriceManwon,
        qty: l.qty,
      })),
      branchesNew: salesLines.filter((l) => l.openBranch).map((l) => ({ regionCode: l.regionCode })),
    };
    const mockState = {
      cashManwon: dashboard.cashManwon,
      finishedGoodsQty: dashboard.finishedGoodsQty ?? 15,
      unitFinishedGoodsCostManwon: 48,
      salesCapacity: dashboard.salesCapacity ?? 20,
      openSalesBranches: [] as string[],
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
      payload = { headPurchase, headProduction, headSales };
    } else if (targetStep === "MATERIAL") {
      payload = {
        branches: materialForm.openBranch ? [{ regionCode: materialForm.regionCode }] : [],
        lines: [{ regionCode: materialForm.regionCode, materials: materialForm.materials }],
      };
    } else if (targetStep === "PRODUCTION") {
      payload = { productionQty, machineBigRun, machineSmallRun };
    } else if (targetStep === "SALES") {
      payload = {
        lines: salesLines.map((l) => ({
          regionCode: l.regionCode,
          unitPriceManwon: l.unitPriceManwon,
          qty: l.qty,
        })),
        branchesNew: salesLines.filter((l) => l.openBranch).map((l) => ({ regionCode: l.regionCode })),
      };
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
  const stepLabel = step.replace("STEP", "Step ").replace(/_/g, " ");

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
        periodLabel={dashboard?.periodLabel}
        stepLabel={stepLabel}
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

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1fr_340px]">
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
                  periodLabel={dashboard.periodLabel}
                  stepLabel={stepLabel}
                  newsItems={newsItems}
                  cashManwon={dashboard.cashManwon}
                />
              )}

              {companyId && dashboard && !isSubmitted && (
                <CeoCommandDashboard companyId={companyId} dashboard={dashboard} />
              )}

              <StepProgressStepper stepPhase={step} completedSteps={completed} />

              {!isSubmitted && (
                <SubmitChecklistGate validation={validation} checklistReady={checklistReady} alreadySubmitted={isSubmitted} />
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
                  headPurchase={headPurchase}
                  headProduction={headProduction}
                  headSales={headSales}
                  preview={hrPreview}
                  loading={loading}
                  onChange={(field, value) => {
                    if (field === "headPurchase") setHeadPurchase(value);
                    if (field === "headProduction") setHeadProduction(value);
                    if (field === "headSales") setHeadSales(value);
                  }}
                  onValidate={() => postDecision("HIRING", true)}
                  onSubmit={() => postDecision("HIRING", false)}
                />
              )}

              {dashboard && step === "STEP4_PURCHASE" && !completed.includes("MATERIAL") && !isSubmitted && (
                <StepMaterialForm
                  form={materialForm}
                  purchaseCapacity={dashboard.purchaseCapacity ?? hrPreview.purchaseCapacity}
                  preview={materialPreview}
                  loading={loading}
                  checklistReady={checklistReady}
                  onChange={setMaterialForm}
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
                  inventoryTotalUnits={dashboard.inventoryTotalUnits ?? 60}
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

              <ValidationPanel validation={validation} mode={validationMode} />
              <JournalSummaryPanel journals={journals} />
              {message && <p className="text-sm text-sky-700">{message}</p>}
            </>
          )}
        </section>

        <aside className="space-y-4">
          {sessionId && (
            <CeoNewsFeed
              items={newsItems}
              activeNewsId={activeNews?.newsId}
              onSelect={openNews}
            />
          )}
          {companyId && <CeoEventFeed companyId={companyId} syncToken={envSyncToken} />}
          <DashboardPanel dashboard={dashboard} />
          <FinancialStatementsPanel financials={financials} />
        </aside>
      </main>
    </div>
  );
}
