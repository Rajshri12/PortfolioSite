import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Task from '@/models/Task';
import User from '@/models/User';
import RewardRedemption from '@/models/RewardRedemption';
import CoinTransaction from '@/models/CoinTransaction';
import { getSession } from '@/lib/auth';
import { awardCoins, deductCoins, getGameConfig } from '@/lib/coins';
import { checkAndAwardBadges } from '@/lib/badges';
import AdminAlert from '@/models/AdminAlert';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    await connectToDatabase();
    const body = await request.json();
    const userId = session.impersonating ?? session.userId;

    // Non-admin changing a task's rewardConfig → reset to pending
    if (session.role !== 'admin' && body.rewardConfig) {
      body.rewardConfig = { ...body.rewardConfig, approvalStatus: 'pending' };
    }

    // Fetch old state first so we can compare completedDates before/after
    const oldTask = await Task.findOne({ _id: id, userId }).lean();
    if (!oldTask) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    const task = await Task.findOneAndUpdate(
      { _id: id, userId },
      { $set: body },
      { new: true }
    );
    if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });

    let coinsAwarded = 0;
    let happyHour = false;
    let customReward: { label: string; quantity: number } | null = null;
    let newBadges: Array<{ slug: string; title: string; emoji: string }> = [];
    let rewardPending = false;

    const isToggling = body.completedDates !== undefined;
    // Use client-supplied date array to derive "today" — avoids UTC/local timezone mismatch
    const oldDates: string[] = oldTask.completedDates ?? [];
    const newDates: string[] = Array.isArray(body.completedDates) ? body.completedDates : [];
    const addedDate = newDates.find((d) => !oldDates.includes(d)) ?? null;
    const removedDate = oldDates.find((d) => !newDates.includes(d)) ?? null;
    const today = addedDate ?? removedDate ?? new Date().toISOString().slice(0, 10);
    const justCompleted = isToggling && addedDate !== null;
    const justUncompleted = isToggling && removedDate !== null;

    // Reverse coins when unchecking a task
    if (justUncompleted) {
      const earnedTx = await CoinTransaction.findOne({
        userId,
        event: "task_complete",
        adminNote: { $regex: id },
        amount: { $gt: 0 },
      }).sort({ createdAt: -1 });
      if (earnedTx) {
        await deductCoins(userId, earnedTx.amount, "task_complete", `Reversed: task unchecked (${task.text})`);
      }
      return NextResponse.json({ success: true, data: task, coinsAwarded: 0, happyHour: false, customReward: null, newBadges: [] });
    }

    if (justCompleted) {
      const rc = task.rewardConfig;
      const rcType = rc && typeof rc.type === 'string' ? rc.type : 'coins';
      // Block reward if user set a custom reward that hasn't been approved yet
      const rewardBlocked = rc && rc.approvalStatus === 'pending';
      const rewardRejected = rc && rc.approvalStatus === 'rejected';
      const config = await getGameConfig();

      if (rewardBlocked || rewardRejected) {
        rewardPending = !!rewardBlocked;
        // Reward pending approval or was rejected — award nothing, fall through to streak/badges
      } else if (!rc || rcType === 'coins') {
        const coinAmt = rc?.coins ?? config.rewards.taskComplete;
        const result = await awardCoins(userId, coinAmt, 'task_complete', `task:${id}`);
        coinsAwarded = result.awarded;
        happyHour = result.happyHour;
      } else {
        const qty = rc.quantity ?? 1;
        await RewardRedemption.create({
          userId,
          rewardId: rc.rewardId ?? 'custom',
          rewardLabel: rc.rewardLabel ?? 'Custom Reward',
          coinsRequested: 0,
          status: 'approved',
          adminNote: `Auto-awarded on task completion: ${task.text}`,
          quantity: qty,
        });
        customReward = { label: rc.rewardLabel ?? 'Custom Reward', quantity: qty };
      }

      // Update streak (always, regardless of reward type)
      const user = await User.findOne({ userId });
      if (user) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        if (user.streakLastDate === today) {
          // already counted
        } else if (user.streakLastDate === yesterdayStr || !user.streakLastDate) {
          user.streak = (user.streak ?? 0) + 1;
          user.maxStreak = Math.max(user.maxStreak ?? 0, user.streak);
          user.streakLastDate = today;
          await user.save();
        } else {
          user.streak = 1;
          user.streakLastDate = today;
          await user.save();
        }
      }

      // All-tasks-done bonus (coins only, not blocked)
      if (!rewardBlocked && !rewardRejected && (!rc || rcType === 'coins')) {
        const allTasks = await Task.find({ userId }).lean();
        const allDoneToday = allTasks.every((t) =>
          (t.completedDates ?? []).includes(today) ||
          (t.excludedDates ?? []).includes(today) ||
          (t.recurrence?.type === 'none' && t.date !== today)
        );
        if (allDoneToday && allTasks.length > 0) {
          const config2 = await getGameConfig();
          const bonus = await awardCoins(userId, config2.rewards.allTasksBonus, 'all_tasks_bonus');
          coinsAwarded += bonus.awarded;
        }
      }

      // Mood alert
      const updatedUser = await User.findOne({ userId });
      if (updatedUser?.currentMood === 'hard') {
        if ((updatedUser.consecutiveHardDays ?? 0) >= (config.alerts.moodDropConsecutiveDays - 1)) {
          await AdminAlert.create({
            type: 'mood_drop',
            userId,
            message: `Reported "Hard" mood for ${updatedUser.consecutiveHardDays + 1} consecutive days.`,
          });
        }
      }

      newBadges = await checkAndAwardBadges(userId, 'task_toggled');
      const updUser = await User.findOne({ userId });
      if (updUser?.streak) {
        const streakBadges = await checkAndAwardBadges(userId, 'streak_updated');
        newBadges = [...newBadges, ...streakBadges];
      }
    }

    return NextResponse.json({ success: true, data: task, coinsAwarded, happyHour, customReward, newBadges, rewardPending });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const task = await Task.findOneAndDelete({ _id: id, userId });
    if (!task) return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Task deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
