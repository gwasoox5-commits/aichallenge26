# Architecture Review — P2 Authentication & Authorization

> **Scope**: V1 GA Sprint 3 · P2  
> **Date**: 2026-07-26  
> **Status**: ✅ PASS

---

## 1. Overview

P2 implements session-based authentication with role-based access control (RBAC) and company/session scope separation for the BSP manufacturing simulation platform. All game and GM APIs require a valid HMAC-signed session token; pre-auth endpoints are limited to credential exchange and join-code lookup.

---

## 2. Auth Model

### Roles

| Role | Scope | Issued By |
|------|-------|-----------|
| `PLATFORM_ADMIN` | Global — create sessions, demo setup | `POST /api/v1/auth/login` |
| `GM` | Single game session | Session create, demo setup GET |
| `CEO` | Single company within a session | `POST /api/v1/auth/join` |

### Token Format

- HMAC-SHA256 signed payload (`body.sig`)
- Claims: `sub`, `role`, `sessionId?`, `companyId?`, `teamName?`, `iat`, `exp`
- TTL: 24 hours (classroom default)
- Transport: `Authorization: Bearer` header + `bsp_session` httpOnly cookie

### Secret Management

| Env Var | Purpose | Dev Default |
|---------|---------|-------------|
| `BSP_AUTH_SECRET` | HMAC signing key (≥32 chars) | `dev-bsp-auth-secret-min-32-chars!!` |
| `BSP_ADMIN_PASSWORD` | Platform admin login | `bsp-admin-dev` |

Production requires `BSP_AUTH_SECRET` to be explicitly set (≥32 chars).

---

## 3. Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Client (auth-client.ts)                                │
│  setAccessToken · authFetch (Bearer + credentials)      │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  API Routes (app/api/v1/**)                           │
│  requireAuth · requireGmSession · authErrorResponse     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Infrastructure                                         │
│  token-service · api-guard · access-control             │
│  auth-service · join-code                             │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Domain (auth/types.ts, demo-constants.ts)              │
└─────────────────────────────────────────────────────────┘
```

### Key Modules

| Module | Responsibility |
|--------|----------------|
| `src/bsp/infrastructure/auth/token-service.ts` | Issue/verify HMAC tokens |
| `src/bsp/infrastructure/auth/api-guard.ts` | `requireAuth`, cookie helpers |
| `src/bsp/infrastructure/auth/access-control.ts` | Session/company scope assertions |
| `src/bsp/infrastructure/auth/auth-service.ts` | Login, join, GM token issuance |
| `src/bsp/infrastructure/auth/join-code.ts` | 128-bit join code generation/validation |
| `lib/bsp/auth-client.ts` | Client-side token storage + authenticated fetch |

---

## 4. Scope Separation

### CEO → Company Scope

- Token carries `companyId`
- `requireAuth({ roles: ["CEO"], companyId })` enforces match
- `assertCompanyAccess()` blocks cross-company reads/writes

### GM → Session Scope

- Token carries `sessionId`
- `requireGmSession(req, sessionId)` validates GM token matches route session
- GM can read any company in their session (desk, journals, financials)

### PLATFORM_ADMIN → Global

- No session/company binding
- Can create sessions, run demo setup, access all GM endpoints

---

## 5. API Route Coverage

### Protected Routes (requireAuth / requireGmSession)

| Route | Roles |
|-------|-------|
| `POST /api/v1/gm/sessions` | PLATFORM_ADMIN |
| `GET/POST /api/v1/gm/sessions/{id}/*` | GM, PLATFORM_ADMIN |
| `GET /api/v1/gm/economy/presets` | GM, PLATFORM_ADMIN |
| `GET/POST /api/v1/play/companies/{id}/*` | CEO (+ GM/ADMIN for reads) |
| `POST /api/v1/demo/setup` | PLATFORM_ADMIN (POST), GM/ADMIN (GET) |
| `GET /api/v1/auth/me` | Any valid token |

### Pre-Auth Endpoints (by design)

| Route | Rationale |
|-------|-----------|
| `POST /api/v1/auth/login` | Credential exchange |
| `POST /api/v1/auth/join` | Join code + team name → CEO token |
| `GET /api/v1/join/{code}` | Join code (128-bit) IS the credential; format validated |
| `POST /api/v1/auth/logout` | Clears cookie (idempotent) |
| `POST /api/v1/join/{code}/companies` | Deprecated (410 Gone) |

---

## 6. Join Code (NFR-S07)

- **Entropy**: 128-bit (16 random bytes → 32 hex chars)
- **Generation**: `generateJoinCode()` via `crypto.randomBytes(16)`
- **Validation**: `isValidJoinCodeFormat()` on lookup and join
- **Demo constant**: `DEADBEEF000000000000000000000001` (dev/test only)

Seed and Prisma demo session use the demo constant; production sessions use cryptographically random codes.

---

## 7. Client Integration

| Page | Auth Pattern |
|------|-------------|
| `/join` | Public lookup → `POST /auth/join` → `setAccessToken` |
| `/gm` | Admin login → create session (GM token) → `authFetch` for desk ops |
| `/play` | Demo setup or join token → `authFetch` for all company APIs |

---

## 8. Findings & Recommendations

| ID | Finding | Severity | Action |
|----|---------|----------|--------|
| AR-P2-01 | All game/GM APIs protected | — | ✅ Complete |
| AR-P2-02 | Join lookup is pre-auth by design | Info | Documented; 128-bit format enforced |
| AR-P2-03 | CSRF protection not yet implemented | Low | Deferred to P7 Security |
| AR-P2-04 | Audit logging not yet implemented | Low | Deferred to P7 Security |
| AR-P2-05 | Token refresh/revocation not implemented | Low | Acceptable for V1 classroom (24h TTL) |

---

## 9. Verdict

**P2 Authentication & Authorization: PASS**

- Role model (PLATFORM_ADMIN / GM / CEO) implemented
- Session and company scope separation enforced
- 128-bit join codes in production path
- All operational APIs require authentication
- Auth test suite passes (9/9)

Ready to proceed to **P3 GM Operations**.
