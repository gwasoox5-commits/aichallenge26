# User Acceptance Test — P9 RC

> **Date**: 2026-07-27  
> **Scope**: Instructor (GM) + Student (CEO) · V1 GA RC  
> **Method**: Automated engine/API (primary) + manual UI checklist (secondary)

---

## 1. UAT Summary

| Role | Scenarios | Automated | Manual UI | Result |
|------|-----------|-----------|-----------|--------|
| Instructor (GM) | 12 | 10 via P3/P9 | 2 | ✅ Pass (conditional timing) |
| Student (CEO) | 8 | 6 via excel/E2E | 2 | ✅ Pass |
| Admin | 3 | 3 via P7 | 0 | ✅ Pass |

**Overall UAT**: ✅ **PASS** for RC pilot — full-day 3Y6H classroom = **Conditional** (see G7).

---

## 2. Instructor (GM) Scenarios

| ID | Scenario | Steps | Expected | Auto evidence | Manual | Result |
|----|----------|-------|----------|---------------|--------|--------|
| UAT-GM-01 | Create session + join code | Login → create session | Join code 32-char hex | P3, P9 pilot | GM login screen | ✅ |
| UAT-GM-02 | 3+ teams visible on desk | Students join | Teams in desk table | P9 pilot join ×3 | Join page | ✅ |
| UAT-GM-03 | Step advance loop | Wait → advance ×42 | Phase transitions | P3 Scenario 1 | Ops summary | ✅ |
| UAT-GM-04 | Pause / Resume | Pause during step | CEO blocked; audit | P3 Scenario 3 | Pause button | ✅ |
| UAT-GM-05 | Zero submit missing team | 1 team missing | GM zero submit | P3 Scenario 5 | Recommended CTA | ✅ |
| UAT-GM-06 | Force submit | Invalid draft | GM force | P3 Scenario 4 | — | ✅ |
| UAT-GM-07 | Close period (settlement) | Step 7 | HALF_YEAR_END, journals locked | P9 pilot ×6 | Settlement button | ✅ |
| UAT-GM-08 | Start next half | After close | Period++ , Step 1 | P9 pilot ×5 | Next half button | ✅ |
| UAT-GM-09 | Fire event + economy patch | During game | Audit + CEO env badge | P9 pilot EVT-001 + patch | Economy tab | ✅ |
| UAT-GM-10 | Game end | After P6 | FINISHED / GAME_END | P9 pilot | Game end button | ✅ |
| UAT-GM-11 | Audit log review | Throughout | JOIN, STEP_ADVANCE, SETTLEMENT… | P9 audit >50 entries | Audit panel | ✅ |
| UAT-GM-12 | Full day 3Y6H schedule | 8h class | Complete without Excel | Runbook §13 | Classroom pilot | ⚠️ Conditional |

---

## 3. Student (CEO) Scenarios

| ID | Scenario | Expected | Auto evidence | Manual | Result |
|----|----------|----------|---------------|--------|--------|
| UAT-CEO-01 | Join with code | Token + company | auth.test.ts join flow | `/join` | ✅ |
| UAT-CEO-02 | Command dashboard | Current step + task | P8 UX tests | `/play` | ✅ |
| UAT-CEO-03 | Step 1 LOAN submit | Journal posted | S01 excel | Step form | ✅ |
| UAT-CEO-04 | Step 2–6 decisions | Validation + POSTED | 20 excel scenarios | Step forms | ✅ |
| UAT-CEO-05 | Read-only after submit | No re-edit | G05 duplicate 409 | UI badge | ✅ |
| UAT-CEO-06 | Financial / journal view | Matches settlement | excel S01 | Financial tab | ✅ |
| UAT-CEO-07 | Economy change visibility | Env badge after GM patch | P4/P5/P9 | Environment panel | ✅ |
| UAT-CEO-08 | PAUSED blocked | 403 on submit | P3 pause test | Pause state | ✅ |

---

## 4. Debrief (Instructor-Led)

| ID | Scenario | Expected | Result | Classification |
|----|----------|----------|--------|----------------|
| UAT-DB-01 | Final ranking visible | GM desk ranking after P6 | ✅ engine | Pass |
| UAT-DB-02 | Debrief discussion guide | Runbook §11 | ✅ documented | Pass |
| UAT-DB-03 | Dedicated Debrief UI | SCR debrief screen | ❌ not implemented | Post-GA |

Debrief is **GM-led** using desk ranking + runbook prompts — acceptable for **Conditional GA**.

---

## 5. Admin Scenarios

| ID | Scenario | Evidence | Result |
|----|----------|----------|--------|
| UAT-AD-01 | Session list / archive | P7 admin tests | ✅ |
| UAT-AD-02 | Audit search by action | P7 + P9 | ✅ |
| UAT-AD-03 | Economy history / errors | P7 admin API | ✅ |

---

## 6. Manual UI Checklist (Pre-GA Sign-Off)

Run with dev server + P8 screenshots as baseline:

```bash
set BSP_USE_MEMORY=1
npm run dev
node scripts/p8-review-setup.mjs http://localhost:3018
node scripts/capture-p9-screenshots.mjs http://localhost:3018
```

| Screen | Check | P8 baseline |
|--------|-------|-------------|
| `/join` | Code validate + a11y labels | `screenshots/p8/01` |
| `/gm` | Ops summary, audit, economy | `p8/02–03,06` |
| `/play` | Command dashboard, step education | `p8/04–05` |
| Mobile 390px | No broken layout | `p8/07–09` |

---

## 7. Sign-Off

| Stakeholder | Decision | Notes |
|-------------|----------|-------|
| QA (automated) | ✅ Pass | 208/208 tests |
| Instructor pilot | ⚠️ Conditional | Recommend 1Y2H first |
| Product | ✅ Conditional GA | See `p9-rc-validation.md` |

---

*Sprint 3 P9 · Cross-ref: `instructor-runbook.md`, `p8-ux-validation.md`*
