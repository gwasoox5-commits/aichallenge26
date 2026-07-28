# OpenAI Setup

## 1. Obtain API Key

Create a key at [OpenAI Platform](https://platform.openai.com/api-keys).

## 2. Configure (server only)

Add to `.env.local` (never commit):

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
OPENAI_ENABLED=true
OPENAI_TIMEOUT_MS=60000
OPENAI_MAX_RETRIES=2
```

Legacy alias `BSP_OPENAI_API_KEY` is also supported.

## 3. Verify

1. Start dev server: `npm run dev`
2. Admin → **API 연동** → OpenAI **연결 테스트**
3. Or: `POST /api/integrations/test/openai` with GM auth

## 4. Structured Output

All intelligence calls use JSON Schema via OpenAI Responses API. Failed validation triggers one repair attempt; failures return `SCHEMA_VALIDATION_FAILED` — results are **not** auto-published.

## 5. Usage

View **API 연동** dashboard for daily calls, tokens, estimated cost.

Optional pricing override:

```env
OPENAI_MODEL_PRICING_JSON={"gpt-4.1-mini":{"inputPer1M":0.4,"outputPer1M":1.6}}
```

## 6. Key rotation / leak

- Rotate key in OpenAI dashboard
- Update env var, restart server
- If leaked: revoke immediately, audit `GET /api/integrations/usage`

## 7. Disable without removing key

```env
OPENAI_ENABLED=false
```

System uses fixtures; UI shows `MOCK` / `fixture` mode.
