import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import StageModel from "@/models/Stage";
import TopicModel from "@/models/Topic";
import TopicProgress from "@/models/TopicProgress";
import Task from "@/models/Task";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;

    const [aiStages, dsaStages, topics, progressRecords, tasks, user] =
      await Promise.all([
        StageModel.find({ track: "ai" }).lean(),
        StageModel.find({ track: "dsa" }).lean(),
        TopicModel.find().lean(),
        TopicProgress.find({ userId }).lean(),
        Task.find({ userId }).lean(),
        User.findOne({ userId }).lean(),
      ]);

    const progressMap = new Map(progressRecords.map((p) => [p.topicId, p.status]));

    const aiStageIds = new Set(aiStages.map((s) => s.stageId));
    const dsaStageIds = new Set(dsaStages.map((s) => s.stageId));

    const aiTopics = topics.filter((t) => aiStageIds.has(t.stageId));
    const dsaTopics = topics.filter((t) => dsaStageIds.has(t.stageId));

    const aiTopicsCompleted = aiTopics.filter((t) => progressMap.get(t.topicId) === "completed").length;
    const dsaTopicsCompleted = dsaTopics.filter((t) => progressMap.get(t.topicId) === "completed").length;
    const aiPct = aiTopics.length ? Math.round((aiTopicsCompleted / aiTopics.length) * 100) : 0;
    const tasksDone = tasks.reduce((n, t) => n + (t.completedDates?.length ?? 0), 0);

    return NextResponse.json({
      ai_completion_pct: aiPct,
      ai_topics_completed: aiTopicsCompleted,
      ai_topics_total: aiTopics.length,
      dsa_topics_completed: dsaTopicsCompleted,
      dsa_topics_total: dsaTopics.length,
      dsa_problems_done: dsaTopicsCompleted,
      streak: user?.streak ?? 0,
      joker_tokens: user?.jokerTokens ?? 0,
      coins: user?.coins ?? 0,
      level: user ? Math.floor(user.coins / 100) + 1 : 1,
      tasks_done_total: tasksDone,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
