import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Task from "@/models/Task";
import { sendTelegram } from "@/lib/telegram";
import { getGameConfig } from "@/lib/coins";

export const dynamic = "force-dynamic";

async function resolveUserId(username: string): Promise<{ userId: string } | null> {
  const handle = username.toLowerCase();

  const adminHandle = (process.env.TELEGRAM_ADMIN_USERNAME ?? "").replace(/^@/, "").toLowerCase();
  if (adminHandle && handle === adminHandle) return { userId: "admin" };

  // Env var wins; fall back to DB-stored username for the user account
  const envUserHandle = (process.env.TELEGRAM_USER_USERNAME ?? "").replace(/^@/, "").toLowerCase();
  if (envUserHandle) {
    const targetUserId = process.env.USER_ID ?? "user1";
    if (handle === envUserHandle) return { userId: targetUserId };
  } else {
    // Fall back to DB-stored username on the user account
    const userDoc = await User.findOne({ role: "user" }).lean();
    const dbHandle = ((userDoc as any)?.telegramUsername ?? "").toLowerCase();
    const dbUserId = (userDoc as any)?.userId ?? process.env.USER_ID ?? "user1";
    if (dbHandle && handle === dbHandle) return { userId: dbUserId };
  }

  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.message) return NextResponse.json({ ok: true });

  const { message } = body;
  const chatId = String(message.chat?.id ?? "");
  const username = message.from?.username ?? "";
  const text: string = message.text ?? "";

  if (!chatId || !text.startsWith("/")) return NextResponse.json({ ok: true });

  const command = text.split(" ")[0].split("@")[0].toLowerCase();

  try {
    await connectToDatabase();

    const resolved = await resolveUserId(username);

    if (command === "/start") {
      if (!resolved) {
        await sendTelegram(chatId, "⛔ Your Telegram username is not registered in the system.");
        return NextResponse.json({ ok: true });
      }
      await User.findOneAndUpdate({ userId: resolved.userId }, { $set: { telegramChatId: chatId } });
      await sendTelegram(chatId, `👋 Connected! Notifications for <b>${resolved.userId}</b> are now active.\n\nCommands:\n/today — today's tasks\n/status — coins & streak\n/streak — streak details`);
      return NextResponse.json({ ok: true });
    }

    if (!resolved) {
      await sendTelegram(chatId, "⛔ Unrecognised user. Send /start first.");
      return NextResponse.json({ ok: true });
    }
    const userId = resolved.userId;

    const today = new Date().toISOString().slice(0, 10);

    if (command === "/today") {
      const tasks = await Task.find({ userId }).lean();
      const todayTasks = tasks.filter((t) => {
        if (t.excludedDates?.includes(today)) return false;
        if (t.date) return t.date === today;
        if (t.recurrence?.type === "daily") return true;
        if (t.recurrence?.type === "weekly") {
          const dayOfWeek = new Date().getDay();
          return t.recurrence.days?.includes(dayOfWeek);
        }
        return false;
      });

      if (todayTasks.length === 0) {
        await sendTelegram(chatId, "📋 No tasks scheduled for today.");
        return NextResponse.json({ ok: true });
      }

      const lines = todayTasks.map((t) => {
        const done = t.completedDates?.includes(today);
        return `${done ? "✅" : "⬜"} ${t.text}`;
      });

      const done = todayTasks.filter((t) => t.completedDates?.includes(today)).length;
      const reply = `📋 <b>Today's Tasks</b> (${done}/${todayTasks.length} done)\n\n${lines.join("\n")}`;
      await sendTelegram(chatId, reply);
    }

    if (command === "/status") {
      const user = await User.findOne({ userId }).lean();
      if (!user) { await sendTelegram(chatId, "User not found."); return NextResponse.json({ ok: true }); }
      const config = await getGameConfig();
      const level = Math.floor((user as any).coins / config.level.coinsPerLevel) + 1;
      const reply = `🎮 <b>Status</b>\n\n🪙 Coins: <b>${(user as any).coins.toLocaleString()}</b>\n🏆 Level: <b>${level}</b>\n🔥 Streak: <b>${(user as any).streak} days</b>\n🃏 Jokers: <b>${(user as any).jokerTokens}/3</b>`;
      await sendTelegram(chatId, reply);
    }

    if (command === "/streak") {
      const user = await User.findOne({ userId }).lean();
      if (!user) { await sendTelegram(chatId, "User not found."); return NextResponse.json({ ok: true }); }
      const streak = (user as any).streak;
      const milestones = [3, 7, 14, 30, 60, 90];
      const next = milestones.find((m) => m > streak) ?? null;
      const daysLeft = next ? next - streak : 0;
      const reply = `🔥 <b>Streak: ${streak} days</b>\n\n${next ? `⏭ Next milestone: <b>${next} days</b> (${daysLeft} to go)` : "🏆 All milestones reached!"}`;
      await sendTelegram(chatId, reply);
    }
  } catch (e: any) {
    console.error("Telegram webhook error:", e.message);
  }

  return NextResponse.json({ ok: true });
}
