import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import PushSubscription from "@/models/PushSubscription";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Delivery log: all schedules with last-sent status + per-user device list. */
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const devices = await PushSubscription.find()
      .select("userId endpoint userAgent createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .lean();
    return NextResponse.json({
      devices: devices.map((d) => ({
        _id: d._id,
        userId: d.userId,
        userAgent: d.userAgent,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        endpointTail: d.endpoint.slice(-24),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
