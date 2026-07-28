# V2.1 Event Scenario Studio — API Contract

> **Base path**: `/api/v2/event-studio`  
> **Auth**: `requireGmSession` or `PLATFORM_ADMIN` (same as V1 GM)  
> **V1 RC**: V1 game routes unchanged — Studio is additive under `/api/v2/*`

---

## 1. POST `/drafts/generate`

AI 시나리오 초안 생성 (OpenAI Responses API + Structured Outputs).

**Request**

```json
{
  "sessionId": "uuid",
  "input": {
    "naturalLanguagePrompt": "string (required, 20–2000 chars)",
    "targetIndustry": "string",
    "targetMarketOrRegion": "string",
    "expectedDuration": "string",
    "targetHalfLabel": "Y2H1 | P3/6",
    "analysisIntensity": "LIGHT | STANDARD | DEEP",
    "economySnapshotId": "optional — default session live economy"
  }
}
```

**Response 200**

```json
{
  "draftId": "uuid",
  "status": "DRAFT",
  "studioOutput": { /* EventScenarioStudioOutput — see JSON Schema */ },
  "mappedPreview": {
    "pessimistic": { "engineEffects": [], "valuesAfter": {} },
    "neutral": { "engineEffects": [], "valuesAfter": {} },
    "optimistic": { "engineEffects": [], "valuesAfter": {} }
  },
  "validation": {
    "schemaValid": true,
    "boundsWarnings": [],
    "isEstimate": true
  },
  "meta": {
    "model": "gpt-4.1",
    "responseId": "resp_...",
    "tokensUsed": 0,
    "latencyMs": 0
  }
}
```

**Errors**

| Code | HTTP | Meaning |
|------|------|---------|
| `ERR_STUDIO_INPUT` | 400 | Missing/invalid input |
| `ERR_STUDIO_AI` | 502 | OpenAI failure (retryable) |
| `ERR_STUDIO_SCHEMA` | 422 | Structured output failed validation |
| `ERR_FORBIDDEN` | 403 | Not GM for session |

---

## 2. GET `/drafts/{draftId}`

저장된 Draft 조회 (GM Preview / Edit).

---

## 3. PATCH `/drafts/{draftId}`

GM Edit — narrative, effects 수동 수정 (Studio JSON subset).

```json
{
  "selectedScenario": "neutral",
  "editedEffects": [ { "key": "demand", "mode": "PERCENT", "value": -8, "rationale": "..." } ],
  "editedNarrative": "optional override"
}
```

Status → `GM_EDITED`

---

## 4. POST `/drafts/{draftId}/preview`

선택 시나리오 → Economy Engine dry-run (기존 `economy/preview` 재사용).

**Response**: `EconomyPreviewDto` (P5) + `affectedSteps`, `boundsCheck`

---

## 5. POST `/drafts/{draftId}/approve`

**GM 명시적 승인 필수** — Event Engine으로 전달.

```json
{
  "selectedScenario": "neutral",
  "applyTiming": "IMMEDIATE | NEXT_STEP | NEXT_HALF",
  "reason": "string (required, audit)"
}
```

**Pipeline**

1. Map Studio variables → `EconomyPatchEffect[]`
2. Validate `ECONOMY_BOUNDS`
3. Build `EventTemplate` (custom, `templateId: AI-{draftId}`)
4. Call `EventEngineService.fireEvent()` — **same as P4**
5. Audit: `EVENT_AI_APPROVED`, `generatedFromPrompt`, `approvedBy`

**Response 200**

```json
{
  "simulationEventId": "uuid",
  "patchSequence": 12,
  "status": "ACTIVE"
}
```

---

## 6. POST `/drafts/{draftId}/reject`

Draft 폐기 — Engine 미호출.

---

## 7. GET `/drafts?sessionId=`

세션별 Draft 이력 (Replay / Audit).

---

## OpenAI Integration (Implementation Phase)

```typescript
// Pseudocode — not in V1 RC codebase yet
const response = await openai.responses.create({
  model: process.env.BSP_OPENAI_MODEL ?? "gpt-4.1",
  input: buildPrompt(input, economySnapshot),
  text: {
    format: {
      type: "json_schema",
      name: "EventScenarioStudioOutput",
      schema: studioOutputSchema,
      strict: true,
    },
  },
});
```

Environment: `BSP_OPENAI_API_KEY`, `BSP_OPENAI_MODEL`, optional `BSP_STUDIO_MAX_TOKENS`.

---

## Idempotency

- `approve` accepts `Idempotency-Key` header — duplicate approve returns same `simulationEventId`.

---

## Rate Limits (Planned)

| Endpoint | Limit |
|----------|-------|
| `generate` | 10 / hour / session |
| `approve` | 20 / hour / session |

Post-GA: Redis-backed; V2.1 MVP: in-memory counter.
