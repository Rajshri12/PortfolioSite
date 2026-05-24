import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import UserStats from "@/models/UserStats";

export async function POST() {
  try {
    await connectToDatabase();

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let stats = await UserStats.findOne({ key: "main" });
    if (!stats) {
      stats = await UserStats.create({ key: "main", freezeMonthKey: monthKey });
    }

    // Reset freeze count if we're in a new month
    if (stats.freezeMonthKey !== monthKey) {
      stats.freezeCountThisMonth = 0;
      stats.freezeMonthKey = monthKey;
    }

    if (stats.freezeCountThisMonth >= 2) {
      return NextResponse.json(
        { error: "No freezes remaining this month" },
        { status: 400 }
      );
    }

    stats.freezeCountThisMonth += 1;
    await stats.save();

    return NextResponse.json({
      ok: true,
      freezes_remaining: 2 - stats.freezeCountThisMonth,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
