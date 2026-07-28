# V2.1 Event Scenario Studio — P4 Event Engine Integration

> Connects AI Draft → existing V1 GA Event Engine (no engine rule changes)

---

## 1. Integration Point

**Single entry on approve**: extend `EventEngineService` with:

```typescript
async fireCustomFromDraft(
  sessionId: string,
  draft: EventDraftPackage,
  applyTiming: EventApplyTiming,
  actor: GmActor
): Promise<SimulationEvent>
```

Internally equivalent to `fireEvent()` but:

- `templateId` = `AI-{draftId}`
- `normalEffects` = mapped from selected scenario
- `appliedScenario` = `"NORMAL"` only (pessimistic/optimistic used in Studio UI, not runtime multi-scenario)
- Metadata: `generatedFromPrompt`, `approvedBy`, `approvedAt`, `studioDraftId`

---

## 2. Pipeline Alignment (P4 Spec)

```
Event (custom template)
  → EconomyPatchRecord (source = EVENT_FIRE)
  → session.economy liveValues
  → CEO environment API
  → Decision validators (unchanged)
  → Accounting (unchanged)
  → Dashboard
```

**No bypass** — same as `EVT-001` catalog fire path in `event-engine-service.ts`.

---

## 3. Data Objects

### EventDraftPackage (Studio storage)

```typescript
interface EventDraftPackage {
  draftId: string;
  sessionId: string;
  studioOutput: EventScenarioStudioOutput; // full AI JSON
  selectedScenario: "pessimistic" | "neutral" | "optimistic";
  mappedEffects: EconomyPatchEffect[];     // post-map + bounds
  status: "DRAFT" | "GM_PREVIEW" | "GM_EDITED" | "GM_APPROVED" | "REJECTED";
  simulationEventId?: string;              // set after approve
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}
```

Storage V2.1 MVP: memory table or `BspEventDraft` PG model (Post-GA).

---

## 4. Mapping Layer

```
StudioVariableEffect[]
  → mapStudioEffectToEngine()  [lib/v2/event-studio/variable-mapper.ts]
  → EconomyPatchEffect[]
  → applyEffects(snapshot) preview
  → validateBounds()
  → fireCustomFromDraft()
```

If bounds exceeded after clamp:

- GM UI shows **before/after clamp** diff
- Require checkbox "clamp applied" on approve

---

## 5. Audit Events

| Action | Audit type |
|--------|------------|
| Draft generated | `EVENT_AI_DRAFT_CREATED` |
| GM edited | `EVENT_AI_DRAFT_EDITED` |
| GM approved | `EVENT_AI_APPROVED` |
| Engine fired | `EVENT_FIRED` (existing) |
| Patch applied | `ECONOMY_PATCH_APPLIED` (existing) |
| Rejected | `EVENT_AI_DRAFT_REJECTED` |

Include: `draftId`, `sourcePromptHash`, `selectedScenario`, `reason`.

---

## 6. CEO / GM Visibility

| Surface | Behavior |
|---------|----------|
| CEO Event Feed | Shows fired event title + `impactDescription` from selected narrative |
| GM Event History | `templateId: AI-*` with link back to Studio draft (read-only) |
| GM Event Control | Custom events listed alongside catalog; **cannot re-fire without new draft** |

---

## 7. Replay

`EventHistoryEntry.payload` stores:

```json
{
  "studioDraftId": "uuid",
  "selectedScenario": "neutral",
  "sourcePromptHash": "sha256:...",
  "originalEffects": [ /* EconomyPatchEffect[] */ ]
}
```

Enables post-session debrief: "what if pessimistic had been chosen?"

---

## 8. Differences from Catalog Events

| Catalog (P4) | AI Draft |
|--------------|----------|
| Fixed `eventId` EVT-* | Dynamic `AI-{draftId}` |
| Pre-validated effects | Runtime bounds check |
| Scenario Library metadata | AI-generated discussion questions |
| No prompt hash | `generatedFromPrompt` required |

---

## 9. Failure Modes

| Failure | Handling |
|---------|----------|
| Approve after session FINISHED | 409 `ERR_SESSION_FINISHED` |
| Duplicate approve | Idempotent return existing event |
| Engine fire fails mid-patch | Transaction rollback (PG); memory: atomic in engine |
| Draft session mismatch | 403 |

---

## 10. Non-Goals

- Do not add Best/Worst runtime switching (V1 D-15: NORMAL only at fire)
- Do not auto-schedule from AI without GM timing choice
- Do not modify `EVENT_CATALOG` file from AI output
