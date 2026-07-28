# P9 Pilot Screenshots

Capture with dev server running:

```bash
set BSP_USE_MEMORY=1
npm run dev

# In another terminal (uses p8-setup-data.json if present):
node scripts/capture-p9-screenshots.mjs http://localhost:3018
```

| File | Content |
|------|---------|
| `01-join.png` | Join page |
| `02-gm-desk-pilot.png` | GM Desk with pilot session |
| `03-gm-audit-pilot.png` | Audit log panel |
| `04-ceo-play-pilot.png` | CEO Command Dashboard |
| `05-gm-ops-pilot.png` | GM Ops Summary |

If `p8-setup-data.json` is missing, only join + GM login fallback are captured.

Automated E2E evidence is in `tests/bsp/p9-rc-pilot.test.ts` (engine/API path).
