# BSP Sprint 2B — 화면 워크스루

> V1 Gate G1 기준 · Sprint 2B 구현 상태 (2026-07-26)

---

## 1. 실행 방법

### 필수 (메모리 모드 — PostgreSQL 불필요)

```bash
cd project
npm install
npm run dev
```

터미널에 표시된 **Local URL**을 확인하세요. 3000이 사용 중이면 **3005, 3006, 3007** 등 다른 포트로 자동 할당됩니다.

| 화면 | URL |
|------|-----|
| Legacy KPI 시뮬 (구버전) | `http://localhost:PORT/` |
| Join (게임 참가) | `http://localhost:PORT/join` |
| CEO Play (Step 1~7) | `http://localhost:PORT/play` |
| GM Desk | `http://localhost:PORT/gm` |

> **주의:** `npm run dev`를 **동시에 여러 번 실행하지 마세요.** `.next` 캐시 충돌로 500 오류가 발생할 수 있습니다.

### 선택 (PostgreSQL 영구 저장)

```bash
# .env 파일 생성
echo BSP_DATABASE_URL="postgresql://bsp:bsp@localhost:5433/bsp?schema=public" > .env

npm run bsp:generate
npm run bsp:migrate
npm run bsp:seed   # 선택
npm run dev
```

Docker는 **필수 아님**. `BSP_DATABASE_URL` 미설정 시 자동으로 **메모리 모드**로 동작합니다.

### 빠른 데모 (2탭)

1. **GM 탭** → `/gm` → 「게임 생성 + Join Code」 또는 「데모 세션 불러오기」
2. **CEO 탭** → `/play` → 「데모 회사 생성」 또는 `/join`에서 Join Code 입력
3. CEO가 Step 제출 → **GM이 「다음 Step」 클릭** (필수!)
4. Step 1~6 반복 → Step 7에서 GM 「반기 종료 (결산)」
5. `/play` 사이드바에서 Dashboard + 재무제표 확인

---

## 2. 구현된 화면 목록

### BSP (Sprint 2B) — `/join`, `/play`, `/gm`

| # | 화면 | Route | 컴포넌트 |
|---|------|-------|----------|
| 1 | Join (게임 참가) | `/join` | `app/join/page.tsx` |
| 2 | CEO Play — Step 1 자금조달 | `/play` | `StepFinanceForm` (1A/1B 탭) |
| 3 | CEO Play — Step 2 설비투자 | `/play` | `StepFacilityForm` |
| 4 | CEO Play — Step 3 인력채용 | `/play` | `StepHRForm` |
| 5 | CEO Play — Step 4 원재료 | `/play` | `StepMaterialForm` |
| 6 | CEO Play — Step 5 생산 | `/play` | `StepProductionForm` |
| 7 | CEO Play — Step 6 판매 | `/play` | `StepSalesForm` |
| 8 | CEO Play — Step 7 결산 | `/play` | CEO 뷰 (GM 실행 안내) |
| 9 | CEO Dashboard | `/play` 사이드바 | `DashboardPanel` |
| 10 | 재무제표 (P/L + B/S) | `/play` 사이드바 | `FinancialStatementsPanel` |
| 11 | Journal 목록 | `/play` 메인 | `JournalSummaryPanel` |
| 12 | Validation 결과 | `/play` 메인 | `ValidationPanel` |
| 13 | Step 진행 표시 | `/play` 상단 | `StepProgressStepper` |
| 14 | GM Desk — 게임 생성 | `/gm` | 세션 이름 + Join Code |
| 15 | GM Desk — 세션 관리 | `/gm` | Step 진행 · 팀 제출 · 이벤트 로그 |

### Legacy (구버전 KPI 시뮬) — `/`

| 화면 | 설명 |
|------|------|
| Start | 팀 이름 입력 |
| Round 1~4 | 4대 전략 배분 |
| Round Result | 라운드 KPI 결과 |
| Final Result | 4라운드 종합 |

> Legacy는 BSP Step 1~7과 **별개**입니다.

---

## 3. GM 화면 상세

### 구현됨 ✅

| 기능 | UI 위치 | API |
|------|---------|-----|
| 게임 생성 | 「게임 생성 + Join Code」 | `POST /api/v1/gm/sessions` |
| Join Code 표시 | 세션 헤더 `Join Code: XXXXXX` | 응답 `joinCode` |
| 데모 세션 | 「데모 세션 불러오기」 | `GET /api/v1/demo/setup` |
| 현재 Step 표시 | `현재 Step: Step N` | `GET .../desk` |
| 다음 Step | 「다음 Step」 버튼 | `POST .../advance-step` |
| 반기 종료 (결산) | 「반기 종료 (결산)」 (Step 7에서만 활성) | `POST .../close-period` |
| 팀 제출현황 | 테이블 (팀 / 제출 Step / 미제출) | `desk.teams[]` |
| 최근 이벤트 | `decision.posted`, `journal.posted`, `step.advanced` | `desk.recentEvents[]` |
| 새로고침 | 「새로고침」 | `GET .../desk` |

### 미구현 ❌

| 기능 | 상태 |
|------|------|
| Pause / Resume | `PAUSED` enum만 존재, UI·API 없음 |
| Economy 변경 UI | API (`/economy/presets/.../apply`)만 존재 |
| Event 발생 (SCR-GM-007) | Event Engine 미구현 |
| miscIncome 입력 | GM UI 없음 |
| 게임 종료 (GAME_END) | 미구현 |
| 다중 반기 (Year 2+) | 1반기만 지원 |
| Live Ranking | 미구현 |
| Auth / GM 로그인 | 미구현 |

---

## 4. 스크린샷

캡처 파일: `docs/readiness/screenshots/`

| # | 파일 | 설명 |
|---|------|------|
| ① | `01-join-page.png` | Join 페이지 |
| ② | `02-play-dashboard-step1.png` | CEO Play Step 1 + Dashboard |
| ③~⑨ | `03~09-play-stepN.png` | Step 2~7 |
| ⑩ | `10-financial-statements.png` | 결산 후 P/L · B/S |
| ⑪ | `11-gm-dashboard.png` | GM Desk (팀 현황) |
| ⑫ | `12-gm-create-session.png` | GM 게임 생성 + Join Code |

> 스크린샷 재캡처: `scripts/screenshot-setup.ps1` (API) + 브라우저 순회

---

## 6. 미구현 / Placeholder / Stub

### 미구현 (화면 자체 없음)

- GM Pause/Resume, Economy UI, Event 관리, 게임 종료
- Auth (CEO/GM 로그인), Live Ranking, Debrief/Replay
- 다중 반기 (3년 6반기), CEO Step별 별도 Route

### Placeholder / Stub

| 항목 | 위치 | 설명 |
|------|------|------|
| `FinancialSummaryPanel` | `components/bsp/` | **Dead code** — `FinancialStatementsPanel`로 대체됨 |
| Validation H02/H03 | `step-validators.ts` | Year 2+ 구조조정·퇴사 — stub always pass |
| Validation L05 | `step-validators.ts` | stub |
| Prisma repos | `prisma-repositories.ts` | Memory mode가 기본; Prisma는 선택 |
| `createStubHandler` | `step-handler.ts` | Sprint 1.5 잔존 (실제 handler로 교체됨) |
| Legacy `/` | `app/page.tsx` | 구 KPI 4라운드 시뮬 (BSP 아님) |

### CEO Step 7

- CEO는 결산 **실행 불가** — GM만 「반기 종료」 가능
- 결산 완료 후 `settlementComplete` + Journal Locked 메시지 표시
