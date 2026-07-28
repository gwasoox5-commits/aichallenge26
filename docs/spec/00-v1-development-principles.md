# V1 Development Principles

> **최상위 원칙** — 모든 Spec · JSON Schema · Architecture · Implementation 문서는 본 문서를 따른다.  
> Phase 0 종료 · Phase 1 (JSON Specification) 시작 시점 기준

---

## 1. V1의 목표는 기존 엑셀 기반 교육를 100% 대체하는 것이다.

- GA 기준: Doc 10 §3 **G1** (엑셀 100% 대체) + **G2** (GM 엑셀 없이 운영)
- Doc 11 Acceptance Criteria = 개발 완료 정의
- V1 scope creep 금지 — 엑셀 parity 미달 기능은 GA blocker

## 2. V2 이상 기능은 Feature Flag로 분리하며 V1 핵심 로직과 결합하지 않는다.

| Feature Flag (예) | V2+ 기능 | V1 |
|-------------------|----------|:--:|
| `featureFlag.replay` | Replay UI | off |
| `featureFlag.whatIf` | What-if Sandbox | off |
| `featureFlag.advisor` | AI CEO Advisor | off |
| `featureFlag.copilot` | AI Instructor Copilot | off |
| `featureFlag.analyticsV2` | Learning Analytics v2 | off |

- Event Store **적재**는 V1에서 수행 (Replay V2 대비) — UI·엔진 분기는 flag
- V1 코드 path에 V2 optional dependency **금지**

## 3. 모든 Game Rule은 Rule Book을 Single Source of Truth로 사용한다.

- Canonical: `01-game-rule-book.md` v1.1
- JSON Schema · Validation · Accounting은 Rule Book과 **불일치 시 Rule Book 우선**
- 엑셀 `(게임용)회계기초과정 원장` = Rule Book derivation source

## 4. 모든 계산은 서버에서 수행한다. 클라이언트는 계산하지 않고 표시만 한다.

- CEO UI: preview는 server `computed` 또는 read-only API 응답만 표시
- Client-side 금지: journal, settlement, ranking, economy multiplier 적용
- Exception: UX용 **non-authoritative** format/합계 preview (서버 검증 authoritative)

## 5. 모든 의사결정은 Event Store에 저장한다.

- Append-only: `Decision`, `JournalEntry`, `FiscalSnapshot`, `AuditLog`, `SimulationEvent`
- Replay(V2) · What-if(V3) 대비 **변경 이력 보존** — UPDATE/DELETE on posted records 금지
- Correction = compensating entry + audit

## 6. 모든 Validation은 Validation Engine에서만 수행한다.

- Rule IDs: L/F/H/M/P/S (Rule Book §1.6)
- UI: 입력 보조 (type, range hint, disabled) — **422 authoritative = server only**

## 7. 모든 재무 계산은 Accounting Engine만 수행한다.

- Decision Engine: payload → validated → **delegate** journal posting to Accounting
- UI · Decision Engine 내부 **회계 분개·결산 계산 금지**

## 8. API와 JSON Schema는 V2/V3 확장을 고려하되, V1 Scope만 구현한다.

- Schema: optional fields · `featureFlag` · extension `$defs` 허용
- Implementation: V1 required subset만 deploy
- Breaking change 방지: version prefix `/api/v1`, schema `$id` versioning

---

## Document Hierarchy

```
00-v1-development-principles.md  ← THIS (supreme)
01-game-rule-book.md             ← simulation truth
04~05 engine specs               ← behavior
json/*.md                        ← machine-readable contracts
11-acceptance-criteria.md        ← done definition
```

---

## Phase Status

| Phase | Status |
|-------|--------|
| Phase 0 — 기획·설계 | ✅ **Closed** (Doc 11 approved) |
| Phase 1 — JSON Specification (V1) | 🔄 In progress |
| Phase 2 — ERD · API Contract · DB Schema | Pending JSON Spec |
| Phase 3 — Implementation | Pending |
