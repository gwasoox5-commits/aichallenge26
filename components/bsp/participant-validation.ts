import type { ValidationRule } from "./ValidationPanel";

/** Per-field format checks — hide from participants when they pass. */
const HIDE_WHEN_PASSED_RULE_IDS = new Set(["L04", "H01"]);

export function participantVisibleRules(rules: ValidationRule[]): ValidationRule[] {
  return rules.filter((rule) => !(rule.passed && HIDE_WHEN_PASSED_RULE_IDS.has(rule.ruleId)));
}

export function participantValidationView(
  validation: { ok: boolean; rules: ValidationRule[] } | null
): { ok: boolean; rules: ValidationRule[] } | null {
  if (!validation) return null;
  const rules = participantVisibleRules(validation.rules);
  if (rules.length === 0) return null;
  const hasVisibleFailure = rules.some((rule) => !rule.passed);
  return {
    ok: validation.ok && !hasVisibleFailure,
    rules,
  };
}
