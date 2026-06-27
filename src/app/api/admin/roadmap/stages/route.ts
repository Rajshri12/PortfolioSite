import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Stage from "@/models/Stage";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    await connectToDatabase();
    const { title, track, orderIndex, description, doList, dontList, projectSpec } = await request.json();
    if (!title || !track) return NextResponse.json({ error: "title and track required" }, { status: 400 });
    const stageId = `${track}-s${Date.now()}`;
    const stage = await Stage.create({
      stageId, track,
      orderIndex: orderIndex ?? 99,
      title,
      description: description ?? "",
      doList: doList ?? [],
      dontList: dontList ?? [],
      projectSpec: projectSpec ?? "",
    });
    return NextResponse.json(stage, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
