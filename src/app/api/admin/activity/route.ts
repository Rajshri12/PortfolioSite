import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Admin: recent activity feed + per-user last-seen summary. */
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 100), 300);

    const [logs, users] = await Promise.all([
      ActivityLog.find().sort({ createdAt: -1 }).limit(limit).lean(),
      User.find().select("userId email role lastActiveAt lastLoginAt").lean(),
    ]);

    return NextResponse.json({
      logs: logs.map((l) => ({
        _id: l._id,
        userId: l.userId,
        event: l.event,
        page: l.page,
        createdAt: l.createdAt,
      })),
      users: users.map((u) => ({
        userId: u.userId,
        role: u.role,
        lastActiveAt: u.lastActiveAt ?? null,
        lastLoginAt: u.lastLoginAt ?? null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
