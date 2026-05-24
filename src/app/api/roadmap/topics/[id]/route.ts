import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TopicProgress, { TopicStatus } from "@/models/TopicProgress";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = (await request.json()) as { status: TopicStatus };
  if (!status) return NextResponse.json({ error: "status required" }, { status: 400 });

  try {
    await connectToDatabase();
    const updated = await TopicProgress.findOneAndUpdate(
      { topicId: id },
      { $set: { topicId: id, status, completedAt: status === "completed" ? new Date() : undefined } },
      { upsert: true, new: true }
    );
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
