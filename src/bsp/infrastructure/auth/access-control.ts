import type { GameEngine } from "../../application/game-engine";
import { AuthError, type AuthContext } from "../../domain/auth/types";
import { requireAuth } from "./api-guard";

export function assertSessionAccess(ctx: AuthContext, sessionId: string) {
  if (ctx.role === "PLATFORM_ADMIN") return;
  if (ctx.role === "GM" && ctx.sessionId === sessionId) return;
  throw new AuthError("ERR_FORBIDDEN_SESSION", "Access denied to this session", 403);
}

export async function assertCompanyAccess(ctx: AuthContext, engine: GameEngine, companyId: string) {
  if (ctx.role === "PLATFORM_ADMIN") return;
  if (ctx.role === "CEO") {
    if (ctx.companyId !== companyId) {
      throw new AuthError("ERR_FORBIDDEN_COMPANY", "Access denied to this company", 403);
    }
    return;
  }
  if (ctx.role === "GM") {
    if (!ctx.sessionId) {
      throw new AuthError("ERR_FORBIDDEN", "GM session scope missing", 403);
    }
    const companies = await engine.listSessionCompanies(ctx.sessionId);
    if (!companies.some((c) => c.id === companyId)) {
      throw new AuthError("ERR_FORBIDDEN_COMPANY", "Company not in GM session", 403);
    }
    return;
  }
  throw new AuthError("ERR_FORBIDDEN", "Access denied", 403);
}

export function requireGmSession(req: Request, sessionId: string) {
  const ctx = requireAuth(req, { roles: ["GM", "PLATFORM_ADMIN"], sessionId });
  assertSessionAccess(ctx, sessionId);
  return ctx;
}
