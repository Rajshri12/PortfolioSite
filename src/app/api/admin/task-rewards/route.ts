import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Task from "@/models/Task";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/admin/task-rewards — list tasks with pending/rejected reward approvals
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  try {
    await connectToDatabase();
    const tasks = await Task.find({
      "rewardConfig.approvalStatus": { $in: ["pending", "rejected"] },
    })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ tasks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
