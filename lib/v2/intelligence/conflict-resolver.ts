/**
 * V2.4 — Patch conflict detection for concurrent active events
 */

import { applyEffects, cloneEconomy } from "@/src/bsp/domain/economy/economy-engine";
import { ECONOMY_BOUNDS } from "@/src/bsp/domain/economy/economy-variable-meta";
import type { EconomyPatchEffect } from "@/src/bsp/domain/events/event-types";
import type { EconomyValues } from "@/src/bsp/domain/types";
import type { ConflictPreview, IntelligencePublishRecord, PatchConflictItem } from "./publish-types";
import { getEngineEffectsForScenario } from "./publish-bridge";
import type { EventScenarioDraft } from "@/lib/v2/event-studio/types";
import type { ScenarioKey } from "@/lib/v2/event-studio/types";

const ACTIVE_STATUSES = new Set(["PUBLISHED", "ACTIVE", "EXPIRING"]);

function mergeEffects(effects: EconomyPatchEffect[]): EconomyPatchEffect[] {
  const byKey = new Map<string, EconomyPatchEffect>();
  for (const e of effects) {
    const existing = byKey.get(e.key);
    if (!existing) {
      byKey.set(e.key, { ...e });
      continue;
    }
    if (e.mode === "DELTA" && existing.mode === "DELTA") {
      byKey.set(e.key, { ...existing, value: existing.value + e.value });
    } else if (e.mode === "PERCENT" && existing.mode === "PERCENT") {
      byKey.set(e.key, { ...existing, value: existing.value + e.value });
    } else {
      byKey.set(e.key, e);
    }
  }
  return Array.from(byKey.values());
}

function detectConflicts(
  baseEconomy: EconomyValues,
  proposedEffects: EconomyPatchEffect[],
  activeRecords: IntelligencePublishRecord[],
  activeDrafts: EventScenarioDraft[]
): PatchConflictItem[] {
  const conflicts: PatchConflictItem[] = [];
  const activeEffects: EconomyPatchEffect[] = [];

  for (const record of activeRecords) {
    const draft = activeDrafts.find((d) => d.draftId === record.draftId);
    if (!draft) continue;
    activeEffects.push(...getEngineEffectsForScenario(draft, record.selectedScenario));
  }

  const combined = mergeEffects([...activeEffects, ...proposedEffects]);

  for (const effect of combined) {
    const bounds = ECONOMY_BOUNDS[effect.key];
    if (!bounds) continue;

    const before = baseEconomy[effect.key];
    let after: number;
    try {
      after = applyEffects(cloneEconomy(baseEconomy), [effect])[effect.key];
    } catch {
      after = before;
    }

    const proposedOnly = proposedEffects.find((e) => e.key === effect.key);
    if (!proposedOnly) continue;

    const activeOnly = activeEffects.filter((e) => e.key === effect.key);
    if (activeOnly.length === 0) continue;

    const wouldClamp = after < bounds.min || after > bounds.max;
    const largeDelta = Math.abs(after - before) / Math.max(Math.abs(before), 0.01) > 0.5;

    if (wouldClamp || largeDelta) {
      conflicts.push({
        engineKey: effect.key,
        existingValue: before,
        proposedDelta: proposedOnly.value,
        combinedValue: after,
        allowedMin: bounds.min,
        allowedMax: bounds.max,
        severity: wouldClamp ? "CRITICAL" : largeDelta ? "WARNING" : "INFO",
        conflictingPublishIds: activeRecords.map((r) => r.publishId),
        resolution: wouldClamp ? "CLAMP" : "STACK",
      });
    }
  }

  return conflicts;
}

export function checkPatchConflicts(
  baseEconomy: EconomyValues,
  proposedEffects: EconomyPatchEffect[],
  activeRecords: IntelligencePublishRecord[],
  activeDrafts: EventScenarioDraft[]
): ConflictPreview {
  const active = activeRecords.filter((r) => ACTIVE_STATUSES.has(r.status));
  const conflicts = detectConflicts(baseEconomy, proposedEffects, active, activeDrafts);

  const critical = conflicts.filter((c) => c.severity === "CRITICAL");
  const hasConflicts = conflicts.length > 0;

  let recommendation = "충돌 없음 — 발행 가능합니다.";
  if (critical.length > 0) {
    recommendation =
      "경제 변수가 허용 범위를 초과할 수 있습니다. GM Preview에서 Clamp 결과를 확인하고 발행하세요.";
  } else if (conflicts.length > 0) {
    recommendation =
      "다중 이벤트가 동일 변수에 영향을 줍니다. 누적 효과를 Preview에서 확인하세요.";
  }

  return {
    hasConflicts,
    conflicts,
    activeEventCount: active.length,
    recommendation,
    canProceed: critical.length === 0,
  };
}

export function prioritySortRecords(records: IntelligencePublishRecord[]): IntelligencePublishRecord[] {
  const priority: Record<string, number> = {
    ACTIVE: 0,
    EXPIRING: 1,
    PUBLISHED: 2,
    SCHEDULED: 3,
    APPROVED: 4,
  };
  return [...records].sort(
    (a, b) => (priority[a.status] ?? 99) - (priority[b.status] ?? 99)
  );
}

export function previewCombinedEffects(
  baseEconomy: EconomyValues,
  effectsList: EconomyPatchEffect[][]
): EconomyValues {
  let current = cloneEconomy(baseEconomy);
  for (const effects of effectsList) {
    try {
      current = applyEffects(current, effects);
    } catch {
      /* clamp handled by engine on publish */
    }
  }
  return current;
}

export function resolveScenarioEffects(
  draft: EventScenarioDraft,
  scenarioKey: ScenarioKey
): EconomyPatchEffect[] {
  return getEngineEffectsForScenario(draft, scenarioKey);
}
