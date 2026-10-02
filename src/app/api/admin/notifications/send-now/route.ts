import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import connectToDatabase from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/** One-off push blast — bypasses schedules, fires immediately. */
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const { emoji, title, message, target } = await request.json();
    if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

    const finalTitle = `${emoji ?? "🔔"} ${title ?? "Phoenix"}`.trim();

    if (target && target !== "all") {
      const result = await sendPushToUser(target, { title: finalTitle, body: message });
      return NextResponse.json({ ok: true, ...result });
    }

    const users = await User.find({ role: "user" }).select("userId").lean();
    let sent = 0;
    let failed = 0;
    for (const u of users) {
      const r = await sendPushToUser(u.userId, { title: finalTitle, body: message });
      sent += r.sent;
      failed += r.failed;
    }
    return NextResponse.json({ ok: true, sent, failed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
