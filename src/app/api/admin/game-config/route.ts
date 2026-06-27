import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import GameConfig from "@/models/GameConfig";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    let config = await GameConfig.findOne();
    if (!config) config = await GameConfig.create({});
    return NextResponse.json(config);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const updates = await request.json();
    let config = await GameConfig.findOne();
    if (!config) config = await GameConfig.create({});

    // Deep merge — flatten nested keys like { "happyHour.enabled": true }
    const updated = await GameConfig.findByIdAndUpdate(
      config._id,
      { $set: updates },
      { new: true }
    );
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
