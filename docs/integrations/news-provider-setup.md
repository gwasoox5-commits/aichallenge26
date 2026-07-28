# News Provider Setup

## Providers

| Provider | Env | Key required |
|----------|-----|--------------|
| `fixture` (default) | `BSP_NEWS_PROVIDER=fixture` | No |
| GNews | `BSP_NEWS_PROVIDER=gnews` | `BSP_GNEWS_API_KEY` |

## GNews configuration

```env
BSP_NEWS_PROVIDER=gnews
BSP_GNEWS_API_KEY=your-key
NEWS_TIMEOUT_MS=8000
```

## Verify

- Admin → **API 연동** → 뉴스 Provider **연결 테스트**
- `GET /api/v2/news/search?q=semiconductor&language=ko`

## Article body status

| Status | Meaning |
|--------|---------|
| `FULL_TEXT` | Body fetched from URL |
| `SNIPPET_ONLY` | Search API description only |
| `METADATA_ONLY` | Title/source only |
| `FETCH_FAILED` | URL fetch failed |

GM Preview shows `contentSource` so AI analysis scope is clear.

## Fallback

GNews failure returns fixture with `degraded: true` — never silent live pretense.

Manual fallback: enter URL/title/summary in Intelligence workflow.
