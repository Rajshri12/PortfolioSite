import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import NotificationSchedule from "@/models/NotificationSchedule";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const schedules = await NotificationSchedule.find().sort({ time: 1 }).lean();
    return NextResponse.json({ schedules });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const body = await request.json();
    const { label, emoji, message, time, days, condition, isActive } = body;

    if (!label || !message || !time) {
      return NextResponse.json({ error: "label, message, time required" }, { status: 400 });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return NextResponse.json({ error: "time must be HH:MM (24h)" }, { status: 400 });
    }

    const schedule = await NotificationSchedule.create({
      label,
      emoji: emoji || "🔔",
      message,
      time,
      days: Array.isArray(days) ? days : [],
      condition: condition || "always",
      isActive: isActive !== false,
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
