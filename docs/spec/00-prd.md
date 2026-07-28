# PRD — AI 기반 제조기업 경영 시뮬레이션 플랫폼

> Version **1.1** | Spec + Learning + Vision v2 complete  
> **Supreme principles**: `00-v1-development-principles.md`

## 핵심 철학

> **이 플랫폼은 정답을 찾는 게임이 아니라, 동일한 경영환경에서도 서로 다른 의사결정이 서로 다른 재무성과를 만들어내는 과정을 학습하는 교육 플랫폼이다.**

## 프로젝트 목적

오프라인(교안·레고·보드게임·엑셀 원장) 제조 경영 시뮬레이션을 **웹 기반 교육 플랫폼**으로 전환한다.  
엑셀 계산 규칙은 **Source of Truth**로 유지하되, UI/UX·실시간 경제·AI·GM 제어는 **차세대 교육 기능**으로 확장한다.

## 교육 목표

교육생은 다음을 **경험**한다 (직접 결과 입력 불가):

- 회계의 흐름 · 기업 운영 프로세스 · 제조업 Value Chain
- 의사결정 → 결과 → 재무제표 연결

## 대상 사용자

| Role | UI 명칭 | 핵심 |
|------|---------|------|
| TRAINEE | **CEO** | 의사결정만 |
| INSTRUCTOR | **Game Master (GM)** | 진행·환경·이벤트·평가 |

## Spec 문서 인덱스

| # | 문서 | 경로 |
|---|------|------|
| 1 | Game Rule Book | `01-game-rule-book.md` |
| 2 | Event Engine Specification | `02-event-engine-spec.md` |
| 3 | Economy Engine | `03-economy-engine-spec.md` |
| 4 | Decision Engine | `04-decision-engine-spec.md` |
| 5 | Game State Machine | `05-game-state-machine-spec.md` |
| 6 | Learning Design | `06-learning-design-spec.md` |
| 7 | Scenario Library | `07-scenario-library.md` |
| 8 | Document Review | `08-document-review.md` |
| — | Changelog v1.1 | `CHANGELOG-v1.1.md` |
| 9 | **Future Experience (Vision v2)** | `09-future-experience-design.md` |
| 10 | **Web-Only Education Experience** | `10-web-only-education-experience.md` |
| 11 | **Acceptance Criteria (V1)** | `11-acceptance-criteria.md` |
| — | **V1 Development Principles** | `00-v1-development-principles.md` |
| 12 | **JSON Specification (V1)** | `json/00-index.md` |

**구현 게이트**: Doc 11 ✅ → **JSON Spec (V1)** 🔄 → ERD · API Contract · DB → V1 code

## 성공 KPI (교육 종료 후)

| 목표 | 측정 |
|------|------|
| 재무제표 이해 | P/L·B/S 해석 퀴즈 |
| 의사결정 이해 | 근거 발표 |
| 회계 흐름 | 거래→분개→재무제표 설명 |
| 전략적 사고 | 이벤트 대응 토론 |
