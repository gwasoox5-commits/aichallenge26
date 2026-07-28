# Sprint 2 Backlog (Revised after Sprint 1.5)

> Architecture Hardening complete — Handler/Repository/Event infrastructure ready.

---

## Sprint 2A — 조달 · 구매 · P/L (P0)

| ID | Item | Handler | Est. |
|----|------|---------|------|
| 2A-1 | Step 3 HIRING implementation | `HRStepHandler` | 3d |
| 2A-2 | Step 4 MATERIAL (regions, economy) | `PurchaseStepHandler` | 5d |
| 2A-3 | Journal complete (all Dr/Cr accounts) | AccountingEngine | 2d |
| 2A-4 | P/L full screen (SCR-CEO-F01) | UI | 3d |
| 2A-5 | API integration tests Step3/4 | tests | 2d |
| 2A-6 | PostgreSQL CI pipeline | infra | 2d |

**2A total:** ~17 dev-days (~3.5 weeks / 1 dev)

---

## Sprint 2B — 생산 · 판매 · 결산 · B/S (P0)

| ID | Item | Handler | Est. |
|----|------|---------|------|
| 2B-1 | Step 5 PRODUCTION | `ProductionStepHandler` | 3d |
| 2B-2 | Step 6 SALES | `SalesStepHandler` | 3d |
| 2B-3 | Step 7 SETTLEMENT (system) | `SettlementStepHandler` | 5d |
| 2B-4 | B/S full + period selector | UI | 3d |
| 2B-5 | GM advanceStep (submit ≠ advance) | GameEngine + GM API | 2d |
| 2B-6 | Half-year close + P2 rollover | SessionRepository | 3d |

**2B total:** ~19 dev-days (~4 weeks / 1 dev)

---

## Sprint 2C — GM · Event · Ranking (P1/P2)

| ID | Item | Priority | Est. |
|----|------|----------|------|
| 2C-1 | Join Code + CEO entry | P0 | 3d |
| 2C-2 | GM Dashboard (minimal) | P1 | 5d |
| 2C-3 | Event Schema + Engine | P1 | 7d |
| 2C-4 | Live Ranking | P2 | 4d |
| 2C-5 | Economy → Decision G-02 link | P1 | 2d |
| 2C-6 | AI features (deferred spec) | P2 | TBD |

**2C total:** ~21+ dev-days

---

## Recommended Sequence

```
Sprint 1.5 ✅ → Sprint 2A → Architecture checkpoint → Sprint 2B → Sprint 2C
```

**First Sprint 2A task:** Implement `HRStepHandler` — register in existing registry, no GameEngine changes.
