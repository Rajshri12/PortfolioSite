import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import StageModel from "@/models/Stage";
import TopicModel from "@/models/Topic";
import TopicProgress from "@/models/TopicProgress";

export async function GET() {
  try {
    await connectToDatabase();

    const [stages, topics, progressRecords] = await Promise.all([
      StageModel.find().sort({ orderIndex: 1 }).lean(),
      TopicModel.find().sort({ stageId: 1, orderIndex: 1 }).lean(),
      TopicProgress.find().lean(),
    ]);

    const progressMap = new Map(progressRecords.map((p) => [p.topicId, p.status]));
    const topicsByStage = new Map<string, typeof topics>();
    for (const t of topics) {
      const arr = topicsByStage.get(t.stageId) ?? [];
      arr.push(t);
      topicsByStage.set(t.stageId, arr);
    }

    const result = stages.map((stage) => ({
      id: stage.stageId,
      track: stage.track,
      order_index: stage.orderIndex,
      title: stage.title,
      description: stage.description,
      do_list: stage.doList,
      dont_list: stage.dontList,
      project_spec: stage.projectSpec,
      topics: (topicsByStage.get(stage.stageId) ?? []).map((topic) => ({
        id: topic.topicId,
        title: topic.title,
        resources: (topic.resources as { label: string; url: string }[]).map((r) => ({ title: r.label, url: r.url, type: "link" })),
        progress: { status: (progressMap.get(topic.topicId) ?? "not_started") as "not_started" | "in_progress" | "completed" },
      })),
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stages: [] }, { status: 500 });
  }
}
