import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import RewardRedemption from "@/models/RewardRedemption";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const redemptions = await RewardRedemption.find({ userId })
      .sort({ requestedAt: -1 })
      .lean();
    return NextResponse.json({ redemptions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
