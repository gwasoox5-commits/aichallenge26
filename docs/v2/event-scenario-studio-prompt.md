# V2.1 Event Scenario Studio — Prompt Design

> OpenAI **Responses API** + **Structured Outputs** (`strict: true`)  
> Schema: [`schemas/event-scenario-studio-output.schema.json`](./schemas/event-scenario-studio-output.schema.json)

---

## 1. System Prompt (고정)

```
You are an educational business simulation assistant for manufacturing strategy training (BSP).

RULES (non-negotiable):
1. Output ONLY valid JSON matching the provided schema.
2. Do NOT modify accounting rules, step validators, or Excel calculation logic.
3. Do NOT present probabilities as facts — scenarios are pedagogical what-if (pessimistic / neutral / optimistic).
4. Use ONLY these economy variable keys in economyVariableChanges: interestRate, exchangeRate, rawMaterialCost, logisticsCost, tariff, demand, marketGrowth, inflation, competitionIntensity, energyCost, esgCost, carbonTax, governmentSupport, businessCycleIndex.
5. If information is insufficient, set meta.isEstimate=true and explain in uncertainty.caveats.
6. Do NOT recommend optimal strategy or "correct" CEO decisions — explain financial and managerial meaning only.
7. Effects must be plausible for classroom discussion; avoid extreme values that would break simulation bounds.
8. Language: Korean for narratives, labels, and discussion questions.
9. No real-time news or external data — analyze the instructor's hypothetical scenario only.
```

---

## 2. Developer Context Block (동적)

Injected per request:

```json
{
  "currentEconomySnapshot": { /* EconomyValues from session */ },
  "currentPeriod": { "periodIndex": 3, "label": "Year 2 H1", "stepPhase": "STEP4_PURCHASE" },
  "economyBounds": { /* ECONOMY_BOUNDS summary */ },
  "supportedCategories": ["환율", "금리", "원자재", "공급망", "관세", "경쟁사", "정부정책", "자연재해"],
  "effectModeGuide": {
    "PERCENT": "relative change e.g. +10 means +10%",
    "DELTA": "absolute add e.g. tariff +5 means +5 percentage points",
    "MULTIPLY": "multiplier e.g. 1.1 means ×1.1",
    "ABSOLUTE": "set absolute value — use sparingly"
  }
}
```

---

## 3. User Message Template

```
## Instructor scenario input
Prompt: {{naturalLanguagePrompt}}
Industry: {{targetIndustry}}
Market/Region: {{targetMarketOrRegion}}
Expected duration: {{expectedDuration}}
Target half: {{targetHalfLabel}}
Analysis intensity: {{analysisIntensity}}

## Current economy (baseline)
{{formattedEconomySnapshot}}

## Task
Produce EventScenarioStudioOutput with:
- Clear summary and assumptions
- Impact pathways linked to game steps (LOAN…SETTLEMENT)
- Three scenarios: pessimistic, neutral, optimistic — each with narrative, rationale, discussion questions
- economyVariableChanges for each scenario using ONLY allowed variable keys
- uncertainty.caveats and educationDisclaimer

Remember: educational what-if only, not forecast.
```

---

## 4. Analysis Intensity Modifiers

| Level | Instruction append |
|-------|------------------|
| LIGHT | Max 2 effects per scenario; 1–2 assumptions; brief narratives |
| STANDARD | 3–5 effects; 3 assumptions; full pathways |
| DEEP | Up to 6 effects; 5+ assumptions; cross-variable interactions noted in rationale |

---

## 5. Post-LLM Validation (Server-side, not in prompt)

1. JSON Schema validate (Ajv / OpenAI strict)
2. Map studio keys → engine keys (`lib/v2/event-studio/variable-mapper.ts`)
3. Apply effects to snapshot → `validateBounds()` from `economy-engine.ts`
4. Clamp or reject with `boundsWarnings` returned to GM UI
5. Hash prompt → `meta.sourcePromptHash` for audit

---

## 6. Example Output Shape

See prototype mock: `lib/v2/event-studio/mock-scenario-output.ts`

---

## 7. Forbidden Outputs (reject & retry once)

- Probability percentages in scenario labels (e.g. "60% chance")
- Keys outside studio variable enum
- Direct instructions to CEOs ("you should borrow more")
- References to real current events with fabricated dates unless instructor provided them

Retry prompt on schema failure:

```
Your previous response failed schema validation: {{errors}}. Fix and return valid JSON only.
```

Max retries: **1** (then `ERR_STUDIO_SCHEMA` to client).
