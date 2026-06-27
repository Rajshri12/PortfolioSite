import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import JournalEntry from "@/models/JournalEntry";
import User from "@/models/User";
import AdminAlert from "@/models/AdminAlert";
import { getSession } from "@/lib/auth";
import { awardCoins, getGameConfig } from "@/lib/coins";
import { checkAndAwardBadges } from "@/lib/badges";
import { sendTelegram, getAdminChatId } from "@/lib/telegram";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? searchParams.get("per_page") ?? "20");
  const skip = (page - 1) * limit;

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const filter: any = { userId };
    if (session.role === "admin" && session.impersonating) {
      filter.isPrivate = { $ne: true };
    }

    const [rawEntries, total] = await Promise.all([
      JournalEntry.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      JournalEntry.countDocuments(filter),
    ]);
    const entries = rawEntries.map((e) => ({ ...e, id: String(e._id) }));
    return NextResponse.json({ entries, total, page, limit });
  } catch {
    return NextResponse.json({ entries: [], total: 0, page, limit });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { date, content, entryType, isPrivate } = await request.json();
  if (!date || content === undefined) {
    return NextResponse.json({ error: "date and content required" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const type = entryType ?? "general";
    const isNew = !(await JournalEntry.exists({ userId, date }));

    const existing = await JournalEntry.findOne({ userId, date });
    if (existing) {
      existing.content = content;
      if (entryType !== undefined) existing.entryType = entryType;
      if (isPrivate !== undefined) existing.isPrivate = isPrivate;
      await existing.save();
      return NextResponse.json(existing);
    }

    const entry = await JournalEntry.create({
      userId, date, content,
      entryType: type,
      isPrivate: isPrivate ?? false,
    });

    let coinsAwarded = 0;
    let happyHour = false;
    let newBadges: Array<{ slug: string; title: string; emoji: string }> = [];

    if (isNew) {
      const config = await getGameConfig();
      let coinEvent: "journal_entry" | "journal_summary" | "journal_issue" = "journal_entry";
      let coinAmount = config.bonusActions.journalEntry;

      if (type === "summary") {
        // Only award summary bonus once per day
        const summaryToday = await JournalEntry.countDocuments({ userId, date, entryType: "summary" });
        if (summaryToday <= 1) {
          coinEvent = "journal_summary";
          coinAmount = config.bonusActions.dailySummary;
        }
      } else if (type === "issue") {
        coinEvent = "journal_issue";
        coinAmount = config.bonusActions.issueLogged;
      }

      const result = await awardCoins(userId, coinAmount, coinEvent);
      coinsAwarded = result.awarded;
      happyHour = result.happyHour;
      newBadges = await checkAndAwardBadges(userId, "journal_saved");

      // Mood tracking
      const user = await User.findOne({ userId });
      if (user) {
        const today = date;
        const moodDate = user.moodUpdatedAt?.toISOString().slice(0, 10);
        if (moodDate !== today && user.currentMood === 'hard') {
          const newCount = (user.consecutiveHardDays ?? 0) + 1;
          await User.findOneAndUpdate({ userId }, { $set: { consecutiveHardDays: newCount } });
          if (newCount >= config.alerts.moodDropConsecutiveDays) {
            await AdminAlert.create({
              type: 'mood_drop',
              userId,
              message: `Reported "Hard" mood for ${newCount} consecutive days. Consider reducing daily task load.`,
            });
            getAdminChatId().then((chatId) => {
              if (chatId) sendTelegram(chatId, `😤 <b>Mood alert</b>\n\nuser1 has reported "Hard" mood for <b>${newCount} days in a row</b>.\n\nConsider checking in or reducing task load.`);
            });
          }
        }
      }
    }

    return NextResponse.json({ ...entry.toObject(), coinsAwarded, happyHour, newBadges }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
