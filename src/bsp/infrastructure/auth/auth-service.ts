import { randomUUID } from "crypto";
import { AuthError } from "../../domain/auth/types";
import { issueToken } from "./token-service";
import { generateJoinCode, isValidJoinCodeFormat, normalizeJoinCode } from "./join-code";
import type { GameEngine } from "../../application/game-engine";

import { getAdminPasswordOrThrow } from "@/lib/bsp/runtime-config";

export class AuthService {
  constructor(private readonly engine: GameEngine) {}

  loginPlatformAdmin(password: string) {
    if (password !== getAdminPasswordOrThrow()) {
      throw new AuthError("ERR_INVALID_CREDENTIALS", "Invalid admin credentials", 401);
    }
    const userId = randomUUID();
    return {
      accessToken: issueToken({ userId, role: "PLATFORM_ADMIN" }),
      role: "PLATFORM_ADMIN" as const,
      userId,
    };
  }

  /** GM token scoped to a game session (issued on session create or admin grant) */
  issueGmToken(sessionId: string) {
    return {
      accessToken: issueToken({
        userId: randomUUID(),
        role: "GM",
        sessionId,
      }),
      role: "GM" as const,
      sessionId,
    };
  }

  async joinAsCeo(joinCode: string, teamName: string) {
    const normalized = normalizeJoinCode(joinCode);
    if (!isValidJoinCodeFormat(normalized)) {
      throw new AuthError("ERR_INVALID_JOIN_CODE", "Join code must be 5 characters (letters and numbers)", 400);
    }
    const { company, session } = await this.engine.joinGame(normalized, teamName.trim());
    return {
      accessToken: issueToken({
        userId: company.id,
        role: "CEO",
        sessionId: session.id,
        companyId: company.id,
        teamName: company.teamName,
      }),
      role: "CEO" as const,
      companyId: company.id,
      sessionId: session.id,
      teamName: company.teamName,
      statusVersion: company.statusVersion,
    };
  }

  async lookupJoinSession(joinCode: string) {
    const normalized = normalizeJoinCode(joinCode);
    const session = await this.engine.findSessionByJoinCode(normalized);
    return {
      name: session.name,
      periodLabel: session.periodLabel,
      stepPhase: session.stepPhase,
      sessionPhase: session.sessionPhase,
      periodIndex: session.periodIndex,
    };
  }
}
