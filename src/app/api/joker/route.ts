import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AdminAlert from "@/models/AdminAlert";

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

    if (user.jokerUsedThisWeek) {
      return NextResponse.json({ error: "Joker already used this week" }, { status: 400 });
    }

    user.jokerTokens -= 1;
    user.jokerUsedThisWeek = true;
    await user.save();

    await AdminAlert.create({
      type: "joker_used",
      userId,
      message: `Used a joker token to skip today without breaking their ${user.streak}-day streak. Tokens remaining: ${user.jokerTokens}.`,
    });

    return NextResponse.json({ ok: true, jokerTokens: user.jokerTokens });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
