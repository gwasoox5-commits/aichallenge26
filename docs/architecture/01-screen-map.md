# 01. Screen Map (UX v2 — 교육 플랫폼)

> **Version 1.1** — D-01, D-06, D-11, D-14; see `docs/ux/04-v1.1-appendix.md`

## 라우트

| Prefix | Role | 비고 |
|--------|------|------|
| `/` | Public | |
| `/gm/*` | Game Master | 구 `/admin` |
| `/play/*` | CEO | 구 `/ceo` |

Screen ID: `SCR-{GM\|CEO\|PUB}-{NO}`

---

## Public (4)

| ID | 화면명 | Route |
|----|--------|-------|
| SCR-PUB-001 | 플랫폼 소개 | `/` |
| SCR-PUB-002 | GM 로그인 | `/login` |
| SCR-PUB-003 | CEO 참가 | `/join` |
| SCR-PUB-004 | 403 | `/403` |

---

## GM — Game Master (8 + Drawer 5)

### Core

| ID | 화면명 | Route | UX 역할 |
|----|--------|-------|---------|
| SCR-GM-001 | 내 게임 목록 | `/gm` | 수업·게임 카드 |
| SCR-GM-002 | 게임 만들기 | `/gm/game/new` | |
| SCR-GM-003 | **GM Desk** | `/gm/game/[id]` | **수업 중 80% 시간** |
| SCR-GM-004 | 게임 준비 | `/gm/game/[id]/prepare` | 코드·시나리오·시작 |
| SCR-GM-005 | 반기·최종 결과 | `/gm/game/[id]/results` | 순위·피드백 |
| SCR-GM-006 | 시나리오 보관함 | `/gm/scenarios` | |
| SCR-GM-007 | 이벤트 보관함 | `/gm/events` | |
| SCR-GM-008 | NL 이벤트 생성 | `/gm/events/generate` | |

### Drawer / Modal (Desk에서 열림, 별도 Route 선택)

| ID | 화면명 | Route (optional) |
|----|--------|------------------|
| SCR-GM-D01 | 팀 상세 | `/gm/game/[id]/team/[tid]` |
| SCR-GM-D02 | 경제 환경 확장 | Desk 우측 패널 |
| SCR-GM-D03 | 이벤트 발생 | Modal |
| SCR-GM-D04 | 팀 개입(Override) | Modal |
| SCR-GM-D05 | 활동·감사 로그 | Desk 하단 / Drawer |

---

## CEO — Play (3 + Step Views)

| ID | 화면명 | Route | UX 역할 |
|----|--------|-------|---------|
| SCR-CEO-001 | 대기실 | `/play/lobby` | GM 시작 대기 |
| SCR-CEO-002 | **Decision Journey** | `/play` | 3탭 셸 |
| SCR-CEO-003 | Step Deep Link | `/play/step/[n]` | 공유·북마크 |

### Decision Journey 내부 탭 (별 Route 없음)

| Tab | 내용 |
|-----|------|
| Tab 1 지금 할 일 | Step 1~7 폼 (현재만 활성) |
| Tab 2 우리 회사 | 현황·반기 재무 요약 |
| Tab 3 소식 | 경제·이벤트·AI 뉴스 |

### Step View (Tab 1 내 교체)

| Step | CEO 라벨 |
|------|----------|
| 1 | 자금 조달 |
| 2 | 설비 투자 |
| 3 | 인력 채용 |
| 4 | 원재료 구매 |
| 5 | 생산 계획 |
| 6 | 판매 전략 |
| 7 | 반기 결산 |

---

## Screen Tree

```
/
├── login, join
├── gm/
│   ├── (목록, new)
│   ├── game/[id]          ← GM Desk ★
│   ├── game/[id]/prepare
│   ├── game/[id]/results
│   ├── scenarios/
│   └── events/ (+ generate)
└── play/
    ├── lobby
    └── (Decision Journey) ★
```

---

## v1 → v2 매핑

| v1 (ERP式) | v2 (교육式) |
|------------|-------------|
| `/admin/sessions/[id]` | `/gm/game/[id]` GM Desk |
| `/admin/sessions/[id]/economy` | Desk 우측 Live Panel |
| `/admin/sessions/[id]/progress` | Desk 상단 Step Timeline |
| `/ceo/dashboard` + 7 modules | `/play` Tab 1 |
| `/ceo/reports/*` | `/play` Tab 2 접힘 |
| `/ceo/news` | `/play` Tab 3 |

상세 UX: `docs/ux/01-education-flow-ux.md`  
**Complete Wireframes**: `docs/ux/03-complete-wireframes.md`
