# Known Issues — RC

> Updated: 2026-07-28 (Release Blocker Closure)

## P1 — Operator must configure

| Issue | Impact | Workaround |
|-------|--------|------------|
| OpenAI not configured | Event AI uses fixture (dev) or error (prod) | Manual events; set `OPENAI_API_KEY` |
| GNews not configured | News shows NOT_CONFIGURED in production | Set `BSP_NEWS_PROVIDER=gnews` + key |
| PostgreSQL not configured | Memory store — data lost on restart | Set `BSP_DATABASE_URL` + run migrate |

## P2 — Partial implementation

| Issue | Impact | Workaround |
|-------|--------|------------|
| `autoAdvance`, `worldEngine` wizard toggles | Stored in wizardMeta; not enforced by engine | Manual GM step control |
| Legacy `components/simulation/*` | Dead code from old MVP | Ignore; not in menu |
| CSV export | Debrief ranking only | Use audit API JSON |

## P3 — Minor

| Issue | Notes |
|-------|-------|
| `playerName` on join form | Not persisted |
| `/gm` duplicates admin control | Both work |
| Intelligence UI demo mode copy | Header notes preview-only publish |

## Skipped tests (when env not set)

| Skip | Reason | Release impact |
|------|--------|----------------|
| `prisma-wizard-persistence.test.ts` | `BSP_DATABASE_URL` unset | Run in staging before production deploy |
| Live OpenAI in `integrations.test.ts` | `RUN_LIVE_API_TESTS` not set | Use `node scripts/live-openai-probe.mjs` locally |
| Prisma audit persist in `p7-production.test.ts` | Requires live DB | Run in staging |

## Resolved — Release Blocker Closure

- Prisma wizard persistence (`stepDurationSec`, `maxPeriodIndex`, `economyPresetId`, `wizardMeta`)
- Migration `20260728100000_session_wizard_config`
- Production news fixture guard (`BSP_ALLOW_FIXTURE=false` in prod)
- TypeScript typecheck exit 0
- Playwright core E2E (`e2e/rc-core.spec.ts`) — 6 flows
- Git secret scan script (`scripts/secret-scan.mjs`)
- IntegrationsPanel JSX + build fix
