import { NextRequest, NextResponse } from "next/server";
import { checkAndSendDuePushes } from "@/lib/pushScheduler";

export const dynamic = "force-dynamic";

/** Manual tick endpoint — for testing/debugging the scheduler without waiting a minute. */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await checkAndSendDuePushes();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
