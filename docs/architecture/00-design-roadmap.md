# 설계 로드맵

> **Supreme principles**: `docs/spec/00-v1-development-principles.md`

## Phase 0 — 설계 ✅ Closed (2026-07-26)
1. Screen Map
2. User Flow
3. Admin 기능 상세
4. Game Flow
5. Event Engine
6. 자연어 AI 이벤트 생성기
7. ERD
8. API
9. UX v2 — `docs/ux/`

## Phase 0.5 — Game Rule Specification
**`docs/spec/`** — PRD · Rule Book **승인됨**

| # | 문서 | 상태 |
|---|------|------|
| 0 | PRD | ✅ Approved |
| 1 | Game Rule Book | ✅ Approved |
| 2 | Event Engine Spec | ✅ Approved |
| 3 | Economy Engine | ✅ Approved |
| 4 | Decision Engine | ✅ Approved |
| 5 | Game State Machine | ✅ Approved |
| 6 | **Learning Design Spec** | ✅ |
| 7 | **Scenario Library (53 events)** | ✅ |
| 8 | **Cross-Document Review** | ✅ |
| — | **CHANGELOG v1.1** (D-01~D-15) | ✅ |
| 9 | **Future Experience Design (Vision v2)** | ✅ |

## Phase 0.6 — Spec v1.1 ✅ Complete

**D-01 ~ D-15** applied across spec · architecture · UX.  
See `docs/spec/CHANGELOG-v1.1.md`

## Phase 0.7 — Vision & Web-Only Experience ✅
- `09-future-experience-design.md` (summary)
- `10-web-only-education-experience.md` — **Approved 2026-07-26**

## Phase 0.8 — Acceptance Criteria ✅
- `11-acceptance-criteria.md` — **Approved 2026-07-26**

## Phase 1 — JSON Specification (V1) 🔄 Current
- `docs/spec/json/00-index.md`
- 01 Core Domain Schema → … → 08 Validation Schema

## Phase 1b — Contract & Persistence (after JSON Spec)
- ERD update · OpenAPI / API Contract · Database Schema (migrations)

## Phase 2 — 구현
10. Monorepo scaffold → Service Layer → UI

**원칙**: 엑셀 계산 규칙 유지 + 교육·AI·GM 제어 확장. 화면/Figma/코드는 Spec 승인 후.
