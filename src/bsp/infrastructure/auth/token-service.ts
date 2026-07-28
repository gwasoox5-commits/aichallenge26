import { createHmac, timingSafeEqual } from "crypto";
import type { AuthClaims, AuthContext, AuthRole } from "../../domain/auth/types";
import { AUTH_TOKEN_TTL_SEC } from "../../domain/auth/types";

function getSecret(): string {
  const secret = process.env.BSP_AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BSP_AUTH_SECRET must be set in production (≥32 chars)");
  }
  return "dev-bsp-auth-secret-min-32-chars!!";
}

export function issueToken(input: {
  userId: string;
  role: AuthRole;
  sessionId?: string;
  companyId?: string;
  teamName?: string;
  ttlSec?: number;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const claims: AuthClaims = {
    sub: input.userId,
    role: input.role,
    sessionId: input.sessionId,
    companyId: input.companyId,
    teamName: input.teamName,
    iat: now,
    exp: now + (input.ttlSec ?? AUTH_TOKEN_TTL_SEC),
  };
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string): AuthContext {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("ERR_INVALID_TOKEN");
  const [body, sig] = parts;
  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("ERR_INVALID_TOKEN");
  }
  const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthClaims;
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp < now) throw new Error("ERR_TOKEN_EXPIRED");
  return {
    userId: claims.sub,
    role: claims.role,
    sessionId: claims.sessionId,
    companyId: claims.companyId,
    teamName: claims.teamName,
  };
}
