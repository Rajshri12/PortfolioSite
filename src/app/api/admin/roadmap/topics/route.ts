import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Topic from "@/models/Topic";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    await connectToDatabase();
    const { stageId, title, resources, orderIndex } = await request.json();
    if (!stageId || !title) return NextResponse.json({ error: "stageId and title required" }, { status: 400 });
    const topicId = `${stageId}-t${Date.now()}`;
    const topic = await Topic.create({
      topicId, stageId,
      title,
      resources: (resources ?? []).map((r: any) => ({ label: r.label ?? r.title ?? "", url: r.url ?? "" })),
      orderIndex: orderIndex ?? 99,
    });
    return NextResponse.json(topic, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
