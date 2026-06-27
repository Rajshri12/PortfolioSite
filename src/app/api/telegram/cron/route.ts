import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Task from "@/models/Task";
import { getUserChatId, sendTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const querySecret = request.nextUrl.searchParams.get("secret");
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const validSecret = process.env.WEBHOOK_SECRET;
  if (querySecret !== validSecret && bearerSecret !== validSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const today = new Date().toISOString().slice(0, 10);

    const tasks = await Task.find({ userId: "user1" }).lean();
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

    const allDone = todayTasks.length > 0 && todayTasks.every((t) => t.completedDates?.includes(today));

    if (!allDone) {
      const chatId = await getUserChatId();
      if (chatId) {
        const done = todayTasks.filter((t) => t.completedDates?.includes(today)).length;
        const remaining = todayTasks.length - done;
        await sendTelegram(
          chatId,
          `⏰ <b>Evening check-in</b>\n\nYou still have <b>${remaining} task${remaining !== 1 ? "s" : ""}</b> left today.\n\nComplete them before midnight to keep your streak alive! 🔥`
        );
      }
    }

    return NextResponse.json({ ok: true, allDone, tasksToday: todayTasks.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
