import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import ActivityLog, { ActivityEvent } from "@/models/ActivityLog";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_EVENTS: ActivityEvent[] = ["page_view", "heartbeat"];

/** Client activity ping — page views on route change + heartbeat every few minutes. */
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;

    const body = await request.json().catch(() => ({}));
    const event: ActivityEvent = VALID_EVENTS.includes(body?.event) ? body.event : "page_view";
    const page = typeof body?.page === "string" ? body.page.slice(0, 200) : "";

    // Fire-and-forget style writes; never block long on logging
    await Promise.all([
      ActivityLog.create({
        userId,
        event,
        page,
        userAgent: (request.headers.get("user-agent") ?? "").slice(0, 200),
      }),
      User.findOneAndUpdate({ userId }, { $set: { lastActiveAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
