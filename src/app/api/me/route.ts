import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Task from "@/models/Task";
import CoinTransaction from "@/models/CoinTransaction";
import { getSession } from "@/lib/auth";
import { settleStreak, checkStreakMilestones, awardCoins, getGameConfig } from "@/lib/coins";

export const dynamic = "force-dynamic";

async function settleWeeklyStake(userId: string) {
  const user = await User.findOne({ userId });
  if (!user?.weeklyStake?.active) return;

  const stakeStart = new Date(user.weeklyStake.weekStartDate);
  const stakeEnd = new Date(stakeStart);
  stakeEnd.setDate(stakeEnd.getDate() + 6); // Sunday of that week
  stakeEnd.setHours(23, 59, 59, 999);

  if (new Date() <= stakeEnd) return; // week not over yet

  // Check if all 7 days had at least one completed task
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(stakeStart);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }

  const tasks = await Task.find({ userId }).lean();
  const completedDaysSet = new Set<string>();
  for (const t of tasks) {
    for (const d of t.completedDates ?? []) {
      completedDaysSet.add(d);
    }
  }

  const allDone = days.every((d) => completedDaysSet.has(d));
  const config = await getGameConfig();
  const stakeAmount = user.weeklyStake.amount;

  if (allDone) {
    const winAmount = stakeAmount * config.staking.winMultiplier;
    await awardCoins(userId, winAmount, "stake_win", "Weekly stake win — 7/7 days completed");
  }
  // Loss: coins already deducted when stake was placed

  await User.findOneAndUpdate(
    { userId },
    { $set: { "weeklyStake.active": false } }
  );

  await CoinTransaction.create({
    userId,
    amount: 0,
    reason: allDone ? "stake_win" : "stake_loss",
    adminNote: `Stake settled: ${allDone ? "WON" : "LOST"} (${days.filter((d) => completedDaysSet.has(d)).length}/7 days)`,
    happyHour: false,
    event: allDone ? "stake_win" : "stake_loss",
  });
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;

    // Lazy settlement — run before reading user state
    await settleStreak(userId);
    await settleWeeklyStake(userId);

    const user = await User.findOne({ userId }).lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const config = await getGameConfig();
    const level = Math.floor(user.coins / config.level.coinsPerLevel) + 1;

    // Check streak milestones
    if (user.streak > 0) {
      await checkStreakMilestones(userId, user.streak);
    }

    // Reset jokerUsedThisWeek on Mondays
    const today = new Date();
    if (today.getDay() === 1 && user.jokerUsedThisWeek) {
      await User.findOneAndUpdate({ userId }, { $set: { jokerUsedThisWeek: false } });
    }

    const isHappyHour =
      config.happyHour.enabled &&
      today.getHours() >= config.happyHour.startHour &&
      today.getHours() < config.happyHour.endHour;

    // Env var always wins — lets admin update start date without touching DB
    const journeyStartDate = process.env.JOURNEY_START_DATE
      ?? user.journeyStartDate
      ?? new Date().toISOString().slice(0, 10);
    if (!user.journeyStartDate) {
      await User.findOneAndUpdate({ userId }, { $set: { journeyStartDate } });
    }

    return NextResponse.json({
      userId: user.userId,
      role: session.role,
      coins: user.coins,
      level,
      coinsPerLevel: config.level.coinsPerLevel,
      streak: user.streak,
      maxStreak: user.maxStreak,
      jokerTokens: user.jokerTokens,
      applicationUnlocked: user.applicationUnlocked,
      onboardingComplete: user.onboardingComplete,
      currentMood: user.currentMood,
      weeklyStake: user.weeklyStake,
      isHappyHour,
      happyHourMultiplier: config.happyHour.multiplier,
      happyHourEnd: config.happyHour.endHour,
      impersonating: session.impersonating ?? null,
      journeyStartDate,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
