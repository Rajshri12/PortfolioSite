import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Task from "@/models/Task";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/admin/task-rewards/[id] — approve or reject a task's reward
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const { action } = await request.json(); // "approve" | "reject"

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const task = await Task.findByIdAndUpdate(
      id,
      { $set: { "rewardConfig.approvalStatus": action === "approve" ? "approved" : "rejected" } },
      { new: true }
    );
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: task });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
