import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Task from "@/models/Task";
import GameConfig from "@/models/GameConfig";
import NotificationSchedule, { INotificationSchedule } from "@/models/NotificationSchedule";
import { sendPushToUser } from "@/lib/push";

const CATCHUP_WINDOW_MS = 10 * 60 * 1000; // send anything due in the last 10 min

interface TargetUser {
  userId: string;
  name: string;
  streak: number;
  coins: number;
  jokerTokens: number;
  jokerUsedThisWeek: boolean;
  streakLastDate?: string;
  journeyStartDate?: string;
}

/** {{name}}, {{streak}}, {{coins}} template substitution */
function renderMessage(template: string, user: TargetUser, dayOfJourney: number): string {
  return template
    .replaceAll("{{name}}", user.name)
    .replaceAll("{{streak}}", String(user.streak))
    .replaceAll("{{coins}}", String(user.coins))
    .replaceAll("{{day}}", String(dayOfJourney));
}

function getTargetUsers(): Promise<TargetUser[]> {
  return User.find({ role: "user" }).lean() as unknown as Promise<TargetUser[]>;
}

/** Server-local 'HH:MM' + day-of-week for the schedule comparison. */
function localTimeNow(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return { time: `${hh}:${mm}`, dow: d.getDay() };
}

function isDue(schedule: INotificationSchedule, now: Date): boolean {
  if (!schedule.isActive) return false;
  const { time, dow } = localTimeNow(now);
  if (schedule.time !== time) return false;
  if (schedule.days.length > 0 && !schedule.days.includes(dow)) return false;
  // duplicate guard: skip if already sent within this minute-window
  if (schedule.lastSentAt) {
    const elapsed = now.getTime() - new Date(schedule.lastSentAt).getTime();
    if (elapsed < 60_000) return false;
  }
  return true;
}

/** Catch-up variant: due time within the last N minutes and not sent since then. */
function isDueCatchup(schedule: INotificationSchedule, now: Date): boolean {
  if (!schedule.isActive) return false;
  if (schedule.lastSentAt && now.getTime() - new Date(schedule.lastSentAt).getTime() < CATCHUP_WINDOW_MS) {
    return false;
  }
  // check the HH:MM falls within the catch-up window (today, server-local)
  const [h, m] = schedule.time.split(":").map(Number);
  const due = new Date(now);
  due.setHours(h, m, 0, 0);
  const elapsed = now.getTime() - due.getTime();
  if (elapsed < 0 || elapsed > CATCHUP_WINDOW_MS) return false;
  const { dow } = localTimeNow(now);
  if (schedule.days.length > 0 && !schedule.days.includes(dow)) return false;
  return true;
}

async function conditionMatches(
  schedule: INotificationSchedule,
  user: TargetUser,
  dayOfJourney: number
): Promise<boolean> {
  switch (schedule.condition) {
    case "always":
      return true;

    case "streak_at_risk": {
      if (user.streak <= 0) return false;
      // protected by available joker — no nudge needed
      if (user.jokerTokens > 0 && !user.jokerUsedThisWeek) return false;
      const today = new Date().toISOString().slice(0, 10);
      const doneToday = await Task.exists({
        userId: user.userId,
        completedDates: today,
      });
      return !doneToday;
    }

    case "not_logged_in_today": {
      const today = new Date().toISOString().slice(0, 10);
      // proxy: no task completions today and streakLastDate !== today
      const doneToday = await Task.exists({
        userId: user.userId,
        completedDates: today,
      });
      return !doneToday && user.streakLastDate !== today;
    }

    case "happy_hour_start": {
      const config = await GameConfig.findOne().lean();
      if (!config?.happyHour?.enabled) return false;
      const nowHour = new Date().getHours();
      return nowHour === config.happyHour.startHour;
    }

    default:
      return false;
  }
}

export async function checkAndSendDuePushes(now = new Date()): Promise<{
  checked: number;
  sent: number;
  failed: number;
}> {
  await connectToDatabase();

  // gather due schedules: exact-minute matches plus catch-up
  const all = await NotificationSchedule.find();
  const due = all.filter((s) => isDue(s, now) || isDueCatchup(s, now));
  if (due.length === 0) return { checked: all.length, sent: 0, failed: 0 };

  const users = await getTargetUsers();
  let sent = 0;
  let failed = 0;

  for (const schedule of due) {
    for (const user of users) {
      const journeyStart = process.env.JOURNEY_START_DATE ?? user.journeyStartDate;
      const dayOfJourney = journeyStart
        ? Math.max(1, Math.floor((Date.now() - new Date(journeyStart).getTime()) / 86_400_000) + 1)
        : 1;

      const matched = await conditionMatches(schedule, user, dayOfJourney);
      if (!matched) continue;

      const body = renderMessage(schedule.message, user, dayOfJourney);
      const result = await sendPushToUser(user.userId, {
        title: `${schedule.emoji} ${schedule.label}`.trim(),
        body,
        url: "/job-tracker-dashboard",
      });
      sent += result.sent;
      failed += result.failed;
    }
    await NotificationSchedule.updateOne({ _id: schedule._id }, { $set: { lastSentAt: now } });
  }

  return { checked: all.length, sent, failed };
}
