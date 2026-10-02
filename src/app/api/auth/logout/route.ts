import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";

export async function POST(req: NextRequest) {
  // Log the logout before clearing the cookie (session still readable here)
  const session = await getSession(req);
  if (session) {
    try {
      await connectToDatabase();
      await ActivityLog.create({
        userId: session.impersonating ?? session.userId,
        event: "logout",
        page: "",
        userAgent: (req.headers.get("user-agent") ?? "").slice(0, 200),
      });
    } catch {}
  }

  const res = NextResponse.json({ ok: true });
  res.headers.set(
    "Set-Cookie",
    "ue_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  return res;
}
