import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import CoinTransaction from "@/models/CoinTransaction";
import User from "@/models/User";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const { reason } = await request.json();

  try {
    await connectToDatabase();
    const tx = await CoinTransaction.findByIdAndUpdate(id, { $set: { reason } }, { new: true });
    if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    return NextResponse.json(tx);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await connectToDatabase();
    const tx = await CoinTransaction.findByIdAndDelete(id);
    if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

    // Recalculate user's coin balance from remaining transactions
    const txs = await CoinTransaction.find({ userId: tx.userId }).lean();
    const total = txs.reduce((sum, t) => sum + t.amount, 0);
    await User.findOneAndUpdate({ userId: tx.userId }, { $set: { coins: Math.max(0, total) } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
