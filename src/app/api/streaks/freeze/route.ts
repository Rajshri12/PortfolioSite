import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

// Legacy "streak freeze" → now uses joker tokens from User model
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const user = await User.findOne({ userId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.jokerTokens <= 0) {
      return NextResponse.json({ error: "No joker tokens remaining" }, { status: 400 });
    }

    user.jokerTokens -= 1;
    user.jokerUsedThisWeek = true;
    await user.save();

    return NextResponse.json({
      ok: true,
      joker_tokens_remaining: user.jokerTokens,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
