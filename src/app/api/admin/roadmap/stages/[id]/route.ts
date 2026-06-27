import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Stage from "@/models/Stage";
import Topic from "@/models/Topic";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const { id } = await params;
  try {
    await connectToDatabase();
    const body = await request.json();
    const allowed = ["title", "track", "description", "doList", "dontList", "projectSpec", "orderIndex", "rewardConfig"];
    const update: Record<string, any> = {};
    for (const key of allowed) if (key in body) update[key] = body[key];
    const stage = await Stage.findOneAndUpdate({ stageId: id }, { $set: update }, { new: true });
    if (!stage) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(stage);
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
    await Promise.all([
      Stage.findOneAndDelete({ stageId: id }),
      Topic.deleteMany({ stageId: id }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
