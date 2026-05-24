import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Stage from "@/models/Stage";
import Topic from "@/models/Topic";
import Settings from "@/models/Settings";
import { STAGES, TOPICS, SETTINGS } from "../../../../../scripts/seed-data";

export async function POST() {
  try {
    await connectToDatabase();

    const results: Record<string, number> = { stages: 0, topics: 0, settings: 0 };

    for (const s of STAGES) {
      await Stage.findOneAndUpdate({ stageId: s.stageId }, { $set: s }, { upsert: true, new: true });
      results.stages++;
    }

    for (const t of TOPICS) {
      await Topic.findOneAndUpdate({ topicId: t.topicId }, { $set: t }, { upsert: true, new: true });
      results.topics++;
    }

    for (const s of SETTINGS) {
      await Settings.findOneAndUpdate({ key: s.key }, { $set: s }, { upsert: true, new: true });
      results.settings++;
    }

    return NextResponse.json({
      ok: true,
      message: `Seed complete — ${results.stages} stages, ${results.topics} topics, ${results.settings} settings keys upserted`,
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// Quick status check
export async function GET() {
  try {
    await connectToDatabase();
    const [stages, topics, settings] = await Promise.all([
      Stage.countDocuments(),
      Topic.countDocuments(),
      Settings.countDocuments(),
    ]);
    return NextResponse.json({ seeded: stages > 0, stages, topics, settings });
  } catch {
    return NextResponse.json({ seeded: false, error: "DB not connected" }, { status: 200 });
  }
}
