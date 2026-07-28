import type { KpiId } from "@/types/kpi";

export function formatKpiValue(id: KpiId, value: number): string {
  return Math.round(value).toString();
}

export function formatDelta(id: KpiId, delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}
