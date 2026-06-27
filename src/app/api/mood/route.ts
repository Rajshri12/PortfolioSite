import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import AdminAlert from "@/models/AdminAlert";
import { getSession } from "@/lib/auth";
import { getGameConfig } from "@/lib/coins";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mood } = await request.json();
  if (!["hard", "okay", "easy"].includes(mood)) {
    return NextResponse.json({ error: "Invalid mood" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const today = new Date().toISOString().slice(0, 10);

    const user = await User.findOne({ userId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const lastMoodDate = user.moodUpdatedAt?.toISOString().slice(0, 10);
    const isNewDay = lastMoodDate !== today;

    let consecutiveHardDays = user.consecutiveHardDays ?? 0;

    if (isNewDay) {
      if (mood === "hard") {
        consecutiveHardDays += 1;
      } else {
        consecutiveHardDays = 0;
      }
    }

    await User.findOneAndUpdate(
      { userId },
      {
        $set: {
          currentMood: mood,
          moodUpdatedAt: new Date(),
          consecutiveHardDays,
        },
      }
    );

    // Fire AdminAlert after N consecutive hard days
    if (mood === "hard" && isNewDay) {
      const config = await getGameConfig();
      if (consecutiveHardDays >= config.alerts.moodDropConsecutiveDays) {
        await AdminAlert.create({
          type: "mood_drop",
          userId,
          message: `Reported "Hard" mood for ${consecutiveHardDays} consecutive days.`,
        });
      }
    }

    return NextResponse.json({ ok: true, mood, consecutiveHardDays });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
