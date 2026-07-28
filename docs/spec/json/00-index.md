# JSON Specification (V1 Scope)

> **Supreme principles**: `../00-v1-development-principles.md`  
> **Gate**: Doc 11 approved (Phase 0 closed)

## Implementation First Rule

JSON Specification = **구현 명세** (설계 메모 아님). 각 Schema 승인 전:

1. Backend — 추가 질문 없이 구현 가능  
2. Frontend — 화면 ↔ API 연결 가능  
3. QA — 테스트 케이스 즉시 작성 가능  
4. Rule Book 계산 규칙 **1:1** 연결  
5. Acceptance Criteria **전건 trace** 가능  
> **Format**: JSON Schema draft 2020-12 · `$id` base: `https://bsp.education/schemas/v1/`  
> **Rule truth**: `01-game-rule-book.md` v1.1

---

## Writing Order

| # | Document | Schema file(s) | Status |
|---|----------|----------------|--------|
| 1 | [Core Domain Schema](./01-core-domain-schema.md) | `schemas/common.json`, `schemas/core-domain.json` | ✅ Approved |
| 2 | [Decision Schema](./02-decision-schema.md) | `schemas/decision.json` | ✅ Approved |
| 3 | [Economy Schema](./03-economy-schema.md) | `schemas/economy.json` | 🔄 Review |
| 4 | Event Schema | `schemas/event.json` | Pending |
| 5 | Accounting Schema | `schemas/accounting.json` | Pending |
| 6 | Dashboard DTO | `schemas/dashboard.json` | Pending |
| 7 | API Request / Response | `schemas/api/*.json` | Pending |
| 8 | Validation Schema | `schemas/validation.json` | Pending |

각 문서는 **독립 검토** 후 승인 → 다음 문서 착수.

---

## Conventions

| Topic | Convention |
|-------|------------|
| ID | `uuid` string (RFC 4122) |
| Money | integer **만원** (Rule Book §1.5) |
| Rate | decimal number (e.g. 10 = 10%/year) |
| Timestamp | ISO 8601 UTC `date-time` |
| Enum | UPPER_SNAKE in JSON |
| Extensibility | `extensions` object, read-only for V1 |

---

## Post JSON Spec

1. ERD alignment (`architecture/07-erd.md` update)
2. OpenAPI / API Contract (`architecture/08-api-design.md`)
3. Database Schema (migrations)

---

## Approval

- [x] 01 Core Domain Schema
- [x] 02 Decision Schema
- [ ] 03 Economy Schema
- [ ] 04 Event Schema
- [ ] 05 Accounting Schema
- [ ] 06 Dashboard DTO
- [ ] 07 API Request / Response
- [ ] 08 Validation Schema

**Full JSON Spec approved** → ERD · API Contract · DB Schema
