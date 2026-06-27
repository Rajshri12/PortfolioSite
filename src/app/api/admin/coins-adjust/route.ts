import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import CoinTransaction from "@/models/CoinTransaction";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { userId, amount, reason } = await request.json();
  if (!userId || amount === undefined || !reason) {
    return NextResponse.json({ error: "userId, amount, and reason required" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await User.findOneAndUpdate(
      { userId },
      { $inc: { coins: amount } },
      { new: true }
    );
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await CoinTransaction.create({
      userId,
      amount,
      reason: "admin_adjust",
      adminNote: reason,
      happyHour: false,
      event: "admin_adjust",
    });

    return NextResponse.json({ ok: true, newBalance: user.coins });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
