// One-off: seed default push notification schedules. Run: npx tsx scripts/seed-push-schedules.ts
import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";

dotenvConfig({ path: ".env.local" });

async function main() {
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI missing");
  process.exit(1);
}

const DEFAULTS = [
  {
    label: "Morning kickoff",
    emoji: "☀️",
    message: "{{name}}, day {{day}} is open. First task done = first coins.",
    time: "08:00",
    days: [],
    condition: "always",
  },
  {
    label: "Happy hour alert",
    emoji: "⚡",
    message: "2x coins window is open — early tasks pay double. {{streak}}-day streak on the line!",
    time: "06:00",
    days: [],
    condition: "happy_hour_start",
  },
  {
    label: "Evening streak nudge",
    emoji: "🔥",
    message: "{{name}}, {{streak}}-day streak is at risk. 15 min of work keeps it alive.",
    time: "20:00",
    days: [],
    condition: "streak_at_risk",
  },
  {
    label: "Last call",
    emoji: "🌙",
    message: "Final call — one task before midnight saves the streak.",
    time: "22:30",
    days: [],
    condition: "streak_at_risk",
  },
];

await mongoose.connect(MONGODB_URI);

const ScheduleSchema = new mongoose.Schema({
  label: String,
  emoji: String,
  message: String,
  time: String,
  days: [Number],
  condition: String,
  isActive: Boolean,
  lastSentAt: Date,
});

const Schedule = mongoose.models.NotificationSchedule || mongoose.model("NotificationSchedule", ScheduleSchema);

let created = 0;
for (const d of DEFAULTS) {
  const exists = await Schedule.findOne({ label: d.label });
  if (exists) {
    console.log(`skip (exists): ${d.label}`);
    continue;
  }
  await Schedule.create({ ...d, isActive: true, lastSentAt: null });
  created++;
  console.log(`created: ${d.label}`);
}

console.log(`Done — ${created} created.`);
await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
