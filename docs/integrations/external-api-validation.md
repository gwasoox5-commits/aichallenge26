# External API Validation

## CI (default)

```bash
npm test
```

Runs mock/fixture integration tests. No external network required.

## Live tests

```bash
RUN_LIVE_API_TESTS=true npm test -- tests/bsp/integrations.test.ts
```

Requires valid `OPENAI_API_KEY` and network. **Costs may apply.**

## Manual E2E checklist

1. `POST /api/integrations/test/openai` — connection OK
2. Natural language event in Event Studio → structured 3 scenarios
3. `GET /api/v2/news/search?q=...` — articles with `bodyStatus`
4. Intelligence: analyze → scenarios → consultant (check `usedFixture: false`)
5. GM Preview — grounding notes, evidence types
6. Approve → Publish → learner Breaking News
7. `POST /api/v3/ai/world-evolution` — proposal with source label
8. Disable OpenAI → confirm fixture/fallback labels, game continues

## Pilot check

`/admin/pilot-check` runs live probes when authenticated (`/api/integrations/health?live=1`).

## Verdict criteria

| Verdict | Condition |
|---------|-----------|
| **EXTERNAL APIs READY** | OpenAI + news live, schema pass, security OK, E2E pass |
| **CONDITIONAL** | Partial live (e.g. OpenAI only, news fixture) |
| **NOT READY** | Keys missing and treated as live, or security issues |
