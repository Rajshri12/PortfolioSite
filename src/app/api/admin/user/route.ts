import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? "user1";
    const user = await User.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, email: process.env.USER_EMAIL ?? userId, role: "user" } },
      { upsert: true, new: true }
    ).lean();
    return NextResponse.json(user);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, streakOverride, jokerGrant, applicationUnlocked, resetStreak } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  try {
    await connectToDatabase();
    const updates: Record<string, any> = {};

    if (typeof streakOverride === "number") {
      updates.streak = streakOverride;
      updates.streakLastDate = new Date().toISOString().slice(0, 10);
    }
    if (resetStreak) {
      updates.streak = 0;
      updates.streakLastDate = "";
    }
    if (typeof jokerGrant === "number") {
      const user = await User.findOne({ userId });
      const maxStored = 3;
      updates.jokerTokens = Math.min(maxStored, (user?.jokerTokens ?? 0) + jokerGrant);
    }
    if (typeof applicationUnlocked === "boolean") {
      updates.applicationUnlocked = applicationUnlocked;
    }

    const user = await User.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, email: `${userId}@phoenix.local`, role: "user" }, $set: updates },
      { upsert: true, new: true }
    );
    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
