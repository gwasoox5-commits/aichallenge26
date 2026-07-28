/** Auth roles per Spec §11 NFR-S01/S02 and core-domain-schema SessionParticipantRole */
export type AuthRole = "PLATFORM_ADMIN" | "GM" | "CEO";

export interface AuthClaims {
  sub: string;
  role: AuthRole;
  sessionId?: string;
  companyId?: string;
  teamName?: string;
  iat: number;
  exp: number;
}

export interface AuthContext {
  userId: string;
  role: AuthRole;
  sessionId?: string;
  companyId?: string;
  teamName?: string;
}

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const AUTH_COOKIE_NAME = "bsp_session";
export const AUTH_HEADER = "Authorization";

/** Token TTL — session-based auth (24h classroom default) */
export const AUTH_TOKEN_TTL_SEC = 60 * 60 * 24;
