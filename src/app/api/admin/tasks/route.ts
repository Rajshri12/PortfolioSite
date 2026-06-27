import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Task from "@/models/Task";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  try {
    await connectToDatabase();
    const body = await request.json();
    const { targetUserId = "user1", text, category, type, date, recurrence, rewardConfig } = body;

    if (!text?.trim()) return NextResponse.json({ error: "text is required" }, { status: 400 });
    if (!category) return NextResponse.json({ error: "category is required" }, { status: 400 });

    const task = await Task.create({
      userId: targetUserId,
      text: text.trim(),
      category,
      type: type ?? "custom",
      date: date ?? null,
      recurrence: recurrence ?? { type: "none", days: [] },
      completedDates: [],
      excludedDates: [],
      rewardConfig: rewardConfig ?? undefined,
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
