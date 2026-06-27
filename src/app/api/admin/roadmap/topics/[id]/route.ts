import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Topic from "@/models/Topic";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  try {
    await connectToDatabase();
    const body = await request.json();
    const update: Record<string, any> = {};
    if ("title" in body) update.title = body.title;
    if ("orderIndex" in body) update.orderIndex = body.orderIndex;
    if ("notes" in body) update.notes = body.notes ?? "";
    if ("rewardConfig" in body) update.rewardConfig = body.rewardConfig;
    if ("resources" in body) {
      update.resources = body.resources.map((r: any) => ({ label: r.label ?? r.title ?? "", url: r.url ?? "" }));
    }
    const topic = await Topic.findOneAndUpdate({ topicId: id }, { $set: update }, { new: true });
    if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(topic);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  try {
    await connectToDatabase();
    await Topic.findOneAndDelete({ topicId: id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
