import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import CoinTransaction from "@/models/CoinTransaction";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const txs = await CoinTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return NextResponse.json({ transactions: txs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
