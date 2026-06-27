import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import RewardRedemption from "@/models/RewardRedemption";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const filter = status ? { status } : {};
    const redemptions = await RewardRedemption.find(filter)
      .sort({ requestedAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ redemptions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
