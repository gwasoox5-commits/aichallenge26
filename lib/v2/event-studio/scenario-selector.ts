import type { ScenarioKey, ScenarioWeights, SelectionMode } from "./types";

const SCENARIO_KEYS: ScenarioKey[] = ["pessimistic", "neutral", "optimistic"];

/** Deterministic seeded PRNG (mulberry32) for reproducible server-side selection */
export function createSeededRng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
    h |= 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

export function selectScenarioOutcome(
  mode: SelectionMode,
  seed: string,
  manualChoice?: ScenarioKey,
  weights?: ScenarioWeights
): ScenarioKey {
  if (mode === "MANUAL") {
    if (!manualChoice) {
      throw Object.assign(new Error("Manual selection requires selectedOutcome"), {
        code: "ERR_STUDIO_SELECTION",
        status: 400,
      });
    }
    return manualChoice;
  }

  const rng = createSeededRng(seed);
  if (mode === "EQUAL_RANDOM") {
    const idx = Math.floor(rng() * 3);
    return SCENARIO_KEYS[idx];
  }

  const w = weights ?? { pessimistic: 33, neutral: 34, optimistic: 33 };
  const total = w.pessimistic + w.neutral + w.optimistic;
  if (Math.abs(total - 100) > 0.01) {
    throw Object.assign(new Error("Scenario weights must sum to 100"), {
      code: "ERR_STUDIO_WEIGHTS",
      status: 400,
    });
  }

  const roll = rng() * total;
  if (roll < w.pessimistic) return "pessimistic";
  if (roll < w.pessimistic + w.neutral) return "neutral";
  return "optimistic";
}

export function generateRandomSeed(): string {
  return crypto.randomUUID();
}
