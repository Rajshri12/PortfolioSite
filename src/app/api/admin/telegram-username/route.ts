import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Find the user account — prefer matching by USER_ID env var, fall back to role:"user"
async function findUserDoc() {
  const userId = process.env.USER_ID;
  if (userId) {
    const byId = await User.findOne({ userId }).lean();
    if (byId) return byId;
  }
  return User.findOne({ role: "user" }).lean();
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    await connectToDatabase();
    const user = await findUserDoc();
    const stored = (user as any)?.telegramUsername ?? null;
    const fromEnv = process.env.TELEGRAM_USER_USERNAME?.replace(/^@/, "") || null;
    return NextResponse.json({ username: stored ?? fromEnv ?? "" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    await connectToDatabase();
    const { username } = await request.json();
    const clean = (username ?? "").replace(/^@/, "").trim();
    if (!clean) return NextResponse.json({ error: "username required" }, { status: 400 });
    const user = await findUserDoc();
    if (!user) return NextResponse.json({ error: "User account not found in DB" }, { status: 404 });
    await User.findOneAndUpdate({ _id: (user as any)._id }, { $set: { telegramUsername: clean } });
    return NextResponse.json({ ok: true, username: clean });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
