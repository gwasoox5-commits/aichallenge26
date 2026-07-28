import { NextResponse } from "next/server";
import { getAppHealth, healthHttpStatus } from "@/lib/bsp/app-health-service";

export async function GET(req: Request) {
  const live = new URL(req.url).searchParams.get("live") === "1";
  try {
    const health = await getAppHealth(live);
    return NextResponse.json(health, { status: healthHttpStatus(health.status) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Health check failed";
    return NextResponse.json(
      {
        status: "FAILED",
        checkedAt: new Date().toISOString(),
        message,
      },
      { status: 503 }
    );
  }
}
