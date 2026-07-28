import { NextResponse } from "next/server";

/** @deprecated Use POST /api/v1/auth/join instead */
export async function POST() {
  return NextResponse.json(
    { error: "Use POST /api/v1/auth/join with joinCode and teamName", code: "ERR_USE_AUTH_JOIN" },
    { status: 410 }
  );
}
