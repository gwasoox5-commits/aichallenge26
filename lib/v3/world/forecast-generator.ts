/** V3.0 — AI Forecast (GM-only, fixture-based) */

import type { WorldDimensionKey, WorldDimensionValues, WorldForecast } from "./types";
import { WORLD_DIMENSION_LABELS } from "./world-profiles";

const PROMPT_VERSION = "v3.0";

function trendFromValue(value: number, threshold = 55): "UP" | "DOWN" | "STABLE" {
  if (value >= threshold + 10) return "UP";
  if (value <= threshold - 10) return "DOWN";
  return "STABLE";
}

function forecastProbability(current: number, direction: "UP" | "DOWN" | "STABLE", horizon: number): number {
  const momentum = Math.abs(current - 50) / 50;
  const base = direction === "STABLE" ? 0.5 : 0.55 + momentum * 0.25;
  return Math.min(0.95, Math.max(0.2, base - (horizon - 1) * 0.08));
}

const KEY_DIMENSIONS: WorldDimensionKey[] = [
  "globalGrowth",
  "inflation",
  "interestRateTrend",
  "supplyStability",
  "energyPrice",
  "technologyInnovation",
];

export function generateWorldForecast(
  sessionId: string,
  dimensions: WorldDimensionValues
): WorldForecast {
  const horizons = ([1, 2, 3] as const).map((periodsAhead) => ({
    periodsAhead,
    label: `${periodsAhead}반기 후`,
    predictions: KEY_DIMENSIONS.map((dimension) => {
      const value = dimensions[dimension];
      const direction = trendFromValue(value);
      const probability = forecastProbability(value, direction, periodsAhead);
      const label = WORLD_DIMENSION_LABELS[dimension];
      const summary =
        direction === "UP"
          ? `${label} 상승 가능성 ${Math.round(probability * 100)}% (현재 ${value})`
          : direction === "DOWN"
            ? `${label} 하락 가능성 ${Math.round(probability * 100)}% (현재 ${value})`
            : `${label} 안정 가능성 ${Math.round(probability * 100)}% (현재 ${value})`;
      return { dimension, direction, probability, summary };
    }),
  }));

  return {
    sessionId,
    generatedAt: new Date().toISOString(),
    horizons,
    gmOnly: true,
    promptVersion: PROMPT_VERSION,
  };
}

export function highlightTopRisks(forecast: WorldForecast): string[] {
  const h1 = forecast.horizons.find((h) => h.periodsAhead === 1);
  if (!h1) return [];
  return h1.predictions
    .filter((p) => p.direction === "DOWN" && p.probability >= 0.55)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3)
    .map((p) => p.summary);
}
