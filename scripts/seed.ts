/**
 * One-time database seed script.
 * Usage: npm run seed
 *
 * Safe to re-run — all operations are upserts (createOrUpdate by unique key).
 * To update content: edit scripts/seed-data.ts, then re-run npm run seed.
 */

import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { STAGES, TOPICS, SETTINGS, TASKS } from "./seed-data";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set in .env.local");
  process.exit(1);
}

// ─── Inline models (can't import from src/ without path aliases in tsx) ────

const StageSchema = new mongoose.Schema({
  stageId: { type: String, required: true, unique: true },
  track: String,
  orderIndex: Number,
  title: String,
  description: String,
  doList: [String],
  dontList: [String],
  projectSpec: String,
}, { timestamps: true });

const TopicSchema = new mongoose.Schema({
  topicId: { type: String, required: true, unique: true },
  stageId: String,
  orderIndex: Number,
  title: String,
  resources: [{ label: String, url: String, _id: false }],
}, { timestamps: true });

const SettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const Stage = mongoose.models.Stage || mongoose.model("Stage", StageSchema);
const Topic = mongoose.models.Topic || mongoose.model("Topic", TopicSchema);
const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

const TaskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  category: { type: String, enum: ["learning", "job-search"], required: true },
  type: { type: String, enum: ["daily", "custom"], default: "daily" },
  url: { type: String },
  date: { type: String },
  recurrence: {
    type: { type: String, enum: ["none", "daily", "weekly"], default: "none" },
    days: [{ type: Number }],
  },
  completedDates: [{ type: String }],
  excludedDates: [{ type: String }],
  endDate: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Task = mongoose.models.Task || mongoose.model("Task", TaskSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log("✅  Connected to MongoDB");

  // Stages
  let stageCount = 0;
  for (const s of STAGES) {
    await Stage.findOneAndUpdate({ stageId: s.stageId }, { $set: s }, { upsert: true });
    stageCount++;
  }
  console.log(`✅  Upserted ${stageCount} stages`);

  // Topics
  let topicCount = 0;
  for (const t of TOPICS) {
    await Topic.findOneAndUpdate({ topicId: t.topicId }, { $set: t }, { upsert: true });
    topicCount++;
  }
  console.log(`✅  Upserted ${topicCount} topics`);

  // Settings
  let settingsCount = 0;
  for (const s of SETTINGS) {
    await Settings.findOneAndUpdate({ key: s.key }, { $set: s }, { upsert: true });
    settingsCount++;
  }
  console.log(`✅  Upserted ${settingsCount} settings keys`);

  // Tasks — only seed if collection is empty (don't overwrite user data)
  const existingTaskCount = await Task.countDocuments();
  if (existingTaskCount === 0) {
    await Task.insertMany(TASKS);
    console.log(`✅  Inserted ${TASKS.length} default tasks`);
  } else {
    console.log(`⏭️   Skipped tasks — ${existingTaskCount} already exist (user data preserved)`);
  }

  await mongoose.disconnect();
  console.log("\n🌱  Seed complete. Your database is ready.");
}

seed().catch((e) => {
  console.error("❌  Seed failed:", e.message);
  process.exit(1);
});
