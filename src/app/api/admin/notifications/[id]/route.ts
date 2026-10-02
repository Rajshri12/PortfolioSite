import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import NotificationSchedule from "@/models/NotificationSchedule";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const { id } = await ctx.params;
    const body = await request.json();

    const allowed: Record<string, unknown> = {};
    for (const key of ["label", "emoji", "message", "time", "days", "condition", "isActive"]) {
      if (key in body) allowed[key] = body[key];
    }
    if (typeof allowed.time === "string" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(allowed.time)) {
      return NextResponse.json({ error: "time must be HH:MM (24h)" }, { status: 400 });
    }

    const schedule = await NotificationSchedule.findByIdAndUpdate(id, allowed, { new: true });
    if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ schedule });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const { id } = await ctx.params;
    await NotificationSchedule.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
