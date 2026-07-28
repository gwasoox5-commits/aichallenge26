# 강의 운영 시뮬레이션 — 10팀 · 30명 · 3년 · 6반기

> **시뮬레이션 방법**: 자동 테스트 + 코드/UI 경로 수동 분석  
> **자동 검증**: `tests/bsp/excel-regression-20.test.ts` — Lecture simulation (10 teams, 1 half-year)

---

## 시뮬레이션 범위

| 요구 | 자동 테스트 | 수동 분석 |
|------|------------|-----------|
| 10팀 Join + Step 1~7 + 결산 | ✅ PASS | — |
| 30명 (3명/팀) | — | UX 관점 |
| 3년 6반기 | ❌ 불가 | 코드 분석 |
| GM 이벤트/경제변경 | ❌ 불가 | UI/API 분석 |

---

## 1반기 운영 플로우 (실제 가능)

```
GM /gm → 게임 생성 → Join Code 공유
CEO /join → 코드 입력 → 팀명 → /play
[Step 1] CEO 제출 × 10팀 → GM "다음 Step"
[Step 2~6] 반복
[Step 7] GM "반기 종료 (결산)" → 10팀 일괄 settlement
```

**자동 테스트 결과**: 10팀 전원 SALES 제출 후 batch `closePeriod` — **10/10 성공**

---

## 3년 6반기 운영 (요구 vs 현실)

| 단계 | 기대 | 현재 | 결과 |
|------|------|------|------|
| 1년차 H1 | 7 Step + 결산 | ✅ 가능 | OK |
| 1년차 H2 | 이월 + Step 1~7 | ❌ `startNextHalf` 없음 | **BLOCKED** |
| 2~3년차 | 4 additional halves | ❌ | **BLOCKED** |
| 최종 종료 GAME_END | Ranking + Debrief | ❌ | **BLOCKED** |

**결론**: **1반기 파일럿만 가능**. 3년 커리큘럼은 Sprint 3+ 필수.

---

## 강사(GM)가 막히는 부분

| # | 상황 | 원인 | 심각도 |
|---|------|------|--------|
| G-01 | 10팀 중 3팀만 Step4 제출 | GM advance는 **세션 전체** 진행 — 미제출 팀 무시됨 | **HIGH** |
| G-02 | 미제출 팀 처리 | D-10 zero-submit 미구현 | **HIGH** |
| G-03 | 수업 중 Pause | API/UI 없음 | **HIGH** |
| G-04 | 이벤트 발생 | Event Engine 없음 | **HIGH** |
| G-05 | Economy 변경 | Preset API 있으나 GM UI 버튼 없음 | **MEDIUM** |
| G-06 | 잡수익(퀴즈) 입력 | `closePeriod` API 지원, GM UI `{}` 고정 | **MEDIUM** |
| G-07 | 2반기 시작 | 불가 | **BLOCKER** |
| G-08 | Join Code 분실 | 재조회 UI 없음 (desk에 표시만) | **LOW** |
| G-09 | sessionId URL 공유 | GM desk state local only — 새 탭 시 재로드 필요 | **MEDIUM** |

---

## 학생(CEO)이 헷갈리는 부분

| # | 상황 | 원인 | 심각도 |
|---|------|------|--------|
| C-01 | 제출했는데 다음 Step 안 열림 | GM advance 필요 — Play에 안내문 있으나 약함 | **HIGH** |
| C-02 | 현재 Step vs 완료 Step | Stepper는 있으나 "GM 대기 중" 상태 미표시 | **MEDIUM** |
| C-03 | `/play` vs `/join` vs demo setup | 3가지 진입 경로 혼재 | **MEDIUM** |
| C-04 | Legacy Sim (`/`) vs BSP (`/play`) | 홈이 구 시뮬레이션 | **HIGH** |
| C-05 | companyId URL | Join 후 URL 이동 — 북마크 없으면 유실 | **MEDIUM** |
| C-06 | 남은 시간 | 타이머 UI 없음 | **MEDIUM** |
| C-07 | 적용 이벤트 | Dashboard `recentEvents` 항상 `[]` (CEO) | **HIGH** |
| C-08 | Step7 화면 | "GM에게 요청"만 — 진행 상태 불명확 | **LOW** |

---

## UX 불편 / 오류 가능

| # | 이슈 | 재현 |
|---|------|------|
| U-01 | GM advance 전 duplicate submit | G05 에러 — 메시지 한국어 OK |
| U-02 | Stale version (다중 기기) | G06 — refresh 안내 |
| U-03 | Play page production preview | mock inventory 고정 — 실제 dashboard와 불일치 가능 |
| U-04 | 10팀 동시 submit | Memory OK; PostgreSQL schema 미검증 |
| U-05 | Settlement 중복 실행 | `settlementComplete` skip — 2nd closePeriod no-op (OK) |
| U-06 | Step gate bypass via API | **가능** — auth 없음 |

---

## 권장 운영 절차 (현재 버전 한계 내)

1. GM 먼저 `/gm`에서 세션 생성, Join Code **프로젝터에 고정 표시**
2. 학생 전원 `/join` → 동일 코드 → 팀명 입력
3. 각 Step: **전 팀 제출 확인** (GM Desk 테이블) → "다음 Step"
4. Step 7: 전 팀 SALES 확인 → "반기 종료"
5. **2반기는 진행 불가** — 별도 세션 생성으로 대체 (임시)

---

## 시뮬레이션 결론

| 항목 | 평가 |
|------|------|
| 10팀 × 1반기 | ✅ 기술적으로 가능 |
| 30명 동시 (3명/팀) | ✅ (CEO 1명/팀 가정) |
| 3년 6반기 | ❌ 불가 |
| 교육 현장 즉시 사용 | ⚠️ **1반기 파일럿만** |
