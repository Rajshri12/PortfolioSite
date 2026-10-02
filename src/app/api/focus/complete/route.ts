import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { awardCoins, getGameConfig } from "@/lib/coins";
import { checkAndAwardBadges } from "@/lib/badges";

export const dynamic = "force-dynamic";

const MIN_FOCUS_SECONDS = 60; // guard: only reward real sessions

/** Called when the client completes a focus session. Server re-checks duration. */
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;

    const { durationSeconds, taskText } = await request.json();
    const secs = Number(durationSeconds);
    if (!Number.isFinite(secs) || secs < MIN_FOCUS_SECONDS) {
      return NextResponse.json({ error: "Session too short to earn coins" }, { status: 400 });
    }

    const config = await getGameConfig();
    const base = config.bonusActions.focusSession ?? 20;
    // Cap: at most 4 payable sessions per day (anti-farm) — 1 focus hour/day
    const cappedCoins = Math.min(base, 20);
    const result = await awardCoins(userId, cappedCoins, "focus_session", `focus:${Math.round(secs / 60)}min${taskText ? ` on "${taskText}"` : ""}`);
    const newBadges = await checkAndAwardBadges(userId, "focus_session");

    return NextResponse.json({
      success: true,
      coinsAwarded: result.awarded,
      happyHour: result.happyHour,
      newBadges,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
