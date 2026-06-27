import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { awardCoins, deductCoins, CoinEvent } from "@/lib/coins";
import connectToDatabase from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: targetUserId, amount, event, adminNote } = await request.json();

  // Only admin can specify a different userId; users award to themselves
  const userId =
    session.role === "admin" && targetUserId
      ? targetUserId
      : (session.impersonating ?? session.userId);

  if (!amount || !event) {
    return NextResponse.json({ error: "amount and event required" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    if (amount > 0) {
      const result = await awardCoins(userId, amount, event as CoinEvent, adminNote ?? "");
      return NextResponse.json({ ok: true, ...result });
    } else {
      await deductCoins(userId, Math.abs(amount), event as CoinEvent, adminNote ?? "");
      return NextResponse.json({ ok: true, awarded: amount, happyHour: false });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
