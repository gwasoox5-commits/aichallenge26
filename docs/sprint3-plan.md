# Sprint 3 — V1 GA Completion Sprint



> **목표**: G1/G2 PASS · 3년 6반기 · 교육 현장 운영 가능  

> **원칙**: 신규 AI/V2 기능 추가 금지 · 기존 기능 완성



---



## 진행 상태 (2026-07-26)



| Priority | 항목 | 상태 | 비고 |

|----------|------|------|------|

| **P1** | Multi-period Engine | ✅ **1차 완료** | 6반기 · carry-forward · startNextHalf · gameEnd |

| **P2** | Authentication | ✅ **완료** | Admin/GM/CEO + company scope |

| P3 | GM 운영 | 🔲 미착수 | Pause, Force Submit, Zero Submit 등 |

| P4 | Event Engine MVP | 🔲 미착수 | GM Preview → Apply |

| P5 | Economy UI | 🔲 미착수 | API → GM 화면 |

| P6 | WebSocket | 🔲 미착수 | Step/Pause/Event 실시간 |

| P7 | Security | 🔲 미착수 | 128bit Join Code, CSRF, Audit |

| P8 | PostgreSQL | 🔲 미착수 | Migration/Seed/100팀 perf |

| P9 | UI/UX | 🔲 부분 | GM 6반기 버튼 추가 |

| P10 | 최종 검증 | 🔲 미착수 | G1/G2 checklist, 6반기 Excel |



---



## P2 완료 체크리스트



- [x] Auth domain: roles PLATFORM_ADMIN / GM / CEO

- [x] 128-bit join codes (`generateJoinCode`, `isValidJoinCodeFormat`)

- [x] HMAC session tokens (`token-service.ts`)

- [x] API guard (`requireAuth`, `requireGmSession`)

- [x] Access control (company scope, session scope)

- [x] Auth API routes: login, join, me, logout

- [x] All operational API routes protected

- [x] Client `auth-client.ts` with `authFetch` + `setAccessToken`

- [x] UI: join page, gm page (admin login + GM token), play page (authFetch)

- [x] Demo join code constant (`DEADBEEF000000000000000000000001`)

- [x] Seed + Prisma demo session use 128-bit join code

- [x] `.env.example` with `BSP_AUTH_SECRET`, `BSP_ADMIN_PASSWORD`

- [x] Auth tests pass (`tests/bsp/auth.test.ts` — 9/9)

- [x] Full test suite pass (101/101)

- [x] `npm run build` pass

- [x] Architecture review: `docs/release/architecture-review-p2.md`

- [x] Security test report: `docs/release/security-test-p2.md`



---



## P1 구현 내역



### Domain

- `src/bsp/domain/period/period-calendar.ts` — P1~P6 캘린더

- `src/bsp/domain/period/carry-forward.ts` — 반기 이월 (ledger → operational)



### Engine

- `closePeriod()` → `HALF_YEAR_END` 전환

- `startNextHalf()` — 다음 반기 Step1, carry-forward

- `gameEnd()` — P6 결산 후 FINISHED / GAME_END

- GM Desk: `canStartNextHalf`, `canEndGame`, periodIndex/year/half



### API

- `POST /api/v1/gm/sessions/{id}/start-next-half`

- `POST /api/v1/gm/sessions/{id}/game-end`



### UI

- GM Desk: 「다음 반기 시작」「게임 종료」 버튼



### Tests

- `tests/bsp/multi-period.test.ts` — 6반기 E2E



---



## P2 구현 내역



### Domain & Infrastructure

- `src/bsp/domain/auth/types.ts` — AuthRole, AuthContext, AuthError

- `src/bsp/domain/auth/demo-constants.ts` — DEMO_JOIN_CODE, DEFAULT_ADMIN_PASSWORD

- `src/bsp/infrastructure/auth/token-service.ts` — HMAC issue/verify

- `src/bsp/infrastructure/auth/api-guard.ts` — requireAuth, cookie helpers

- `src/bsp/infrastructure/auth/access-control.ts` — scope assertions

- `src/bsp/infrastructure/auth/auth-service.ts` — login, join, GM token

- `src/bsp/infrastructure/auth/join-code.ts` — 128-bit generation/validation



### API

- `POST /api/v1/auth/login` — Platform admin login

- `POST /api/v1/auth/join` — CEO join with join code

- `GET /api/v1/auth/me` — Current session info

- `POST /api/v1/auth/logout` — Clear session cookie

- All GM/Play/Demo routes protected with role + scope gates



### Client

- `lib/bsp/auth-client.ts` — setAccessToken, authFetch

- `/join`, `/gm`, `/play` pages integrated



### Tests

- `tests/bsp/auth.test.ts` — join code, tokens, role/scope (9 tests)



---



## 다음 작업 순서 (권장)



1. ~~**P2 Auth** — 모든 API에 scope gate (G2 blocker)~~ ✅

2. **P3 GM Pause/Force Submit** — 교육 운영 필수

3. **P7 Security** — Join Code 128bit + idempotency

4. **P4 Event MVP** — spec `02-event-engine-spec.md`

5. **P5 Economy UI**

6. **P6 WebSocket**

7. **P8 PostgreSQL** + 100팀 benchmark

8. **P9 UX** — CEO/GM command center

9. **P10** — 6반기 Excel regression + Final Release Report



---



## G1/G2 Gate 매핑



| Gate | Sprint 3 항목 |

|------|----------------|

| G1 Excel 6반기 | P1 + P10 excel 6-half test |

| G2 교육 운영 | P2 ✅ + P3 + P6 + P9 |

| Security | P7 |

| DB Production | P8 |

