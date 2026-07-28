import { randomBytes } from "crypto";

/** Short join codes for classroom UX (5 chars, ~33M combinations). */
export const JOIN_CODE_LENGTH = 5;

/** Avoid ambiguous characters: 0/O, 1/I/L */
const JOIN_CODE_CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateJoinCode(): string {
  const bytes = randomBytes(JOIN_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    code += JOIN_CODE_CHARSET[bytes[i]! % JOIN_CODE_CHARSET.length];
  }
  return code;
}

export function normalizeJoinCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidJoinCodeFormat(code: string): boolean {
  const n = normalizeJoinCode(code);
  return n.length === JOIN_CODE_LENGTH && /^[A-Z0-9]+$/.test(n);
}
