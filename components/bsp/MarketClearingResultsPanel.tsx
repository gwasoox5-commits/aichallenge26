"use client";

import type { MarketResultsDto, MarketRegionResultDto, MarketStepResultDto } from "@/src/bsp/domain/types";

function fmtQty(n: number) {
  return n.toLocaleString("ko-KR");
}

function sortLabel(rule: MarketStepResultDto["sortRule"]) {
  return rule === "HIGHER_PRICE_WINS" ? "입찰 단가 ↑ 우선" : "입찰가 ↓ 우선";
}

function RegionTable({ region, showAwards }: { region: MarketRegionResultDto; showAwards: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-slate-900">{region.regionName}</h4>
        <p className="text-xs text-slate-600">
          지역 한도 {fmtQty(region.regionalLimit)} · 요청 {fmtQty(region.totalRequested)}
          {showAwards && (
            <>
              {" "}
              · 낙찰 {fmtQty(region.totalAwarded)}
            </>
          )}{" "}
          · {sortLabel(region.sortRule)}
        </p>
      </div>
      {region.teams.length === 0 ? (
        <p className="text-sm text-slate-500">이 지역 입찰 없음</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="py-2 pr-3 font-medium">팀</th>
                <th className="py-2 pr-3 font-medium">입찰 단가</th>
                <th className="py-2 pr-3 font-medium">요청</th>
                {showAwards && <th className="py-2 pr-3 font-medium">낙찰</th>}
                {showAwards && <th className="py-2 font-medium">충족률</th>}
              </tr>
            </thead>
            <tbody>
              {region.teams.map((team) => (
                <tr
                  key={team.companyId}
                  className={`border-b border-slate-100 ${team.isSelf ? "bg-sky-50 font-medium text-sky-900" : "text-slate-800"}`}
                >
                  <td className="py-2 pr-3">
                    {team.teamName}
                    {team.isSelf ? " (우리)" : ""}
                  </td>
                  <td className="py-2 pr-3">{fmtQty(team.unitPriceManwon)}만</td>
                  <td className="py-2 pr-3">{fmtQty(team.requestedQty)}</td>
                  {showAwards && <td className="py-2 pr-3">{fmtQty(team.awardedQty)}</td>}
                  {showAwards && <td className="py-2">{team.fillRatePercent}%</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StepSection({ result }: { result: MarketStepResultDto }) {
  const isBidding = result.phase === "BIDDING";
  const showAwards = result.cleared || isBidding;

  if (!showAwards && result.regions.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {result.stepLabel} 낙찰 결과가 아직 없습니다. GM이 해당 Step을 종료하면 표시됩니다.
      </p>
    );
  }

  if (result.regions.length === 0) {
    return <p className="text-sm text-slate-500">{result.stepLabel} 입찰 내역이 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {isBidding && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          전 팀 제출 완료 · 아래 낙찰 수량은 시장 정산 시뮬레이션 결과입니다. 「다음 Step」 진행 시 확정됩니다.
        </p>
      )}
      <p className="text-sm text-slate-600">
        {result.stepLabel} · {sortLabel(result.sortRule)} · {result.regions.length}개 지역
        {isBidding ? " · 입찰 현황 + 예상 낙찰" : " · 확정 낙찰"}
      </p>
      {result.regions.map((region) => (
        <RegionTable key={region.regionCode} region={region} showAwards={showAwards} />
      ))}
    </div>
  );
}

type Props = {
  marketResults?: MarketResultsDto | null;
  variant?: "ceo" | "gm" | "admin";
};

export function MarketClearingResultsPanel({ marketResults, variant = "ceo" }: Props) {
  if (!marketResults) return null;

  const sections = [marketResults.material, marketResults.sales].filter(
    (section): section is MarketStepResultDto => !!section?.visible
  );

  if (sections.length === 0) return null;

  const hasBidding = sections.some((section) => section.phase === "BIDDING");
  const title = hasBidding ? "입찰·낙찰 현황" : "시장 낙찰 결과";
  const subtitle = hasBidding
    ? `${marketResults.periodLabel} · 전 팀 제출 완료 후 입찰 및 예상 낙찰`
    : `${marketResults.periodLabel} · GM Step 종료 후 확정된 입찰·낙찰 현황`;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {subtitle}
          {variant === "ceo" ? " (우리 팀 행 강조)" : variant === "admin" ? " (운영 개요)" : " (전체 팀)"}
        </p>
      </div>

      <div className="space-y-6">
        {marketResults.material?.visible && (
          <div>
            <h3 className="mb-2 text-base font-semibold text-slate-800">원재료 구매 (Step 4)</h3>
            <StepSection result={marketResults.material} />
          </div>
        )}
        {marketResults.sales?.visible && (
          <div>
            <h3 className="mb-2 text-base font-semibold text-slate-800">판매 (Step 6)</h3>
            <StepSection result={marketResults.sales} />
          </div>
        )}
      </div>
    </div>
  );
}
