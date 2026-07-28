# External API Integration Audit

Generated from codebase inspection — 2026-07-27

## Summary

| Integration | Default (no env) | With keys | Post-sprint |
|-------------|------------------|-----------|-------------|
| OpenAI | MOCK/FALLBACK | LIVE | Structured output + usage tracking |
| News (GNews) | MOCK (fixture) | LIVE | Adapter + cache + bodyStatus |
| FX (Frankfurter) | LIVE | LIVE | Reference-only |
| V3 World AI | MOCK (rules) | LIVE optional | OpenAI overlay on rules |

## OpenAI

| File | Function | Classification | Env | Network |
|------|----------|----------------|-----|---------|
| `lib/integrations/openai-client.ts` | `callOpenAiStructured` | LIVE / CONFIG REQUIRED | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`, `OPENAI_MAX_RETRIES`, `OPENAI_ENABLED` | Yes |
| `lib/v2/intelligence/openai-analyzer.ts` | `analyzeNewsArticles` | LIVE / FALLBACK | Same | Yes |
| `lib/v2/intelligence/scenario-generator.ts` | `generateIntelligenceScenarios` | LIVE / FALLBACK (fixed) | Same | Yes |
| `lib/v2/intelligence/consultant-generator.ts` | `generateConsultantBriefing` | LIVE / FALLBACK (fixed) | Same | Yes |
| `lib/v2/event-studio/openai-generator.ts` | `generateScenarioOutput` | LIVE / FALLBACK | `BSP_STUDIO_MAX_TOKENS` | Yes |

**Fixed:** scenario + consultant generators previously discarded OpenAI responses.

## News

| File | Function | Classification | Env | Network |
|------|----------|----------------|-----|---------|
| `FixtureNewsAdapter` | search | MOCK | default | No |
| `GNewsAdapter` | search | LIVE / FALLBACK | `BSP_NEWS_PROVIDER=gnews`, `BSP_GNEWS_API_KEY` | Yes |
| `article-fetcher.ts` | fetchArticleBody | LIVE best-effort | — | Yes |

## External Data

| File | Function | Classification | Network |
|------|----------|----------------|---------|
| `frankfurter-provider.ts` | FX rates | LIVE | Yes |
| V3 forecast/director/evolution | rules | MOCK | No |

Macro APIs (commodities, rates beyond FX reference): **NOT IMPLEMENTED**

## Mock / Stub / Fallback

- `tests/fixtures/v2/*.json` — MOCK
- `client-fixtures.ts`, `IntelligenceWorkflow demoMode` — FALLBACK
- `debrief-generator.ts`, event-chain stub — STUB
- GNews error → fixture with `degraded: true` — FALLBACK

## Routes

- `GET /api/integrations/health?live=1`
- `GET /api/integrations/usage`
- `POST /api/integrations/test/{openai,news,external-data}`
- `GET /api/v2/news/search`
- `POST /api/v2/ai/{intelligence,scenarios}`
- `POST /api/v3/ai/world-evolution`

## Admin

- `/admin/integrations` — status, tests, usage
- `/admin/pilot-check` — live probes

See also: `openai-setup.md`, `news-provider-setup.md`, `external-api-validation.md`
