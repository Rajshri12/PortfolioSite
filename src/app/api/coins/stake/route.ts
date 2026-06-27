import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { getGameConfig, deductCoins } from "@/lib/coins";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const config = await getGameConfig();

    const user = await User.findOne({ userId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.weeklyStake?.active) {
      return NextResponse.json({ error: "Stake already active for this week" }, { status: 400 });
    }

    const today = new Date();
    if (today.getDay() !== 1) {
      return NextResponse.json({ error: "Staking only available on Mondays" }, { status: 400 });
    }

    const amount = config.staking.defaultStakeAmount;
    if (user.coins < amount) {
      return NextResponse.json({ error: `Not enough coins. Need ${amount} to stake.` }, { status: 400 });
    }

    const weekStartDate = today.toISOString().slice(0, 10);
    await deductCoins(userId, amount, "stake_loss", "Weekly stake placed");
    await User.findOneAndUpdate(
      { userId },
      {
        $set: {
          weeklyStake: {
            active: true,
            stakedAt: today,
            amount,
            weekStartDate,
          },
        },
      }
    );

    return NextResponse.json({ ok: true, amount, weekStartDate });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
