import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Reward from "@/models/Reward";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const filter = session.role === "admin" ? {} : { isActive: true };
    const rewards = await Reward.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ rewards });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
