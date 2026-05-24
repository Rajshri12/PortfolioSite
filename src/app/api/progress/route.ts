import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import StageModel from "@/models/Stage";
import TopicModel from "@/models/Topic";
import TopicProgress from "@/models/TopicProgress";
import Task from "@/models/Task";
import UserStats from "@/models/UserStats";
import Settings from "@/models/Settings";

export async function GET() {
  try {
    await connectToDatabase();

    const [aiStages, dsaStages, topics, progressRecords, tasks, stats, badgeSettings] =
      await Promise.all([
        StageModel.find({ track: "ai" }).lean(),
        StageModel.find({ track: "dsa" }).lean(),
        TopicModel.find().lean(),
        TopicProgress.find().lean(),
        Task.find().lean(),
        UserStats.findOne({ key: "main" }).lean(),
        Settings.findOne({ key: "badges" }).lean(),
      ]);

    const progressMap = new Map(progressRecords.map((p) => [p.topicId, p.status]));

    const aiStageIds = new Set(aiStages.map((s) => s.stageId));
    const dsaStageIds = new Set(dsaStages.map((s) => s.stageId));

    const aiTopics = topics.filter((t) => aiStageIds.has(t.stageId));
    const dsaTopics = topics.filter((t) => dsaStageIds.has(t.stageId));

    const aiTopicsTotal = aiTopics.length;
    const aiTopicsCompleted = aiTopics.filter((t) => progressMap.get(t.topicId) === "completed").length;
    const dsaTopicsTotal = dsaTopics.length;
    const dsaTopicsCompleted = dsaTopics.filter((t) => progressMap.get(t.topicId) === "completed").length;

    const aiPct = aiTopicsTotal ? Math.round((aiTopicsCompleted / aiTopicsTotal) * 100) : 0;
    const tasksDone = tasks.reduce((n, t) => n + (t.completedDates?.length ?? 0), 0);
    const streakCount = stats?.streakCount ?? 0;

    // Badge criteria computed from DB topics
    const aiS1Topics = topics.filter((t) => t.stageId === "ai-s1");
    const aiS3Topics = topics.filter((t) => t.stageId === "ai-s3");
    const aiS1Done = aiS1Topics.length > 0 && aiS1Topics.every((t) => progressMap.get(t.topicId) === "completed");
    const aiS3Done = aiS3Topics.length > 0 && aiS3Topics.every((t) => progressMap.get(t.topicId) === "completed");

    const earnedSlugs = new Set<string>();
    if (tasksDone >= 1) earnedSlugs.add("first_task");
    if (streakCount >= 3) earnedSlugs.add("streak_3");
    if (streakCount >= 7) earnedSlugs.add("streak_7");
    if (streakCount >= 30) earnedSlugs.add("streak_30");
    if (aiS1Done) earnedSlugs.add("ai_stage_1");
    if (aiS3Done) earnedSlugs.add("ai_stage_3");
    if (aiPct >= 100) earnedSlugs.add("ai_complete");
    if (dsaTopicsCompleted >= 50) earnedSlugs.add("dsa_50");
    if (dsaTopicsCompleted === dsaTopicsTotal && dsaTopicsTotal > 0) earnedSlugs.add("dsa_complete");

    const badgeDefs: any[] = badgeSettings?.value ?? [];
    const badges = badgeDefs.map((b: any) => ({ ...b, earned: earnedSlugs.has(b.slug) }));

    return NextResponse.json({
      ai_completion_pct: aiPct,
      ai_topics_completed: aiTopicsCompleted,
      ai_topics_total: aiTopicsTotal,
      dsa_topics_completed: dsaTopicsCompleted,
      dsa_topics_total: dsaTopicsTotal,
      dsa_problems_done: dsaTopicsCompleted,
      streak: streakCount,
      freezes_remaining: Math.max(0, 2 - (stats?.freezeCountThisMonth ?? 0)),
      badges,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
