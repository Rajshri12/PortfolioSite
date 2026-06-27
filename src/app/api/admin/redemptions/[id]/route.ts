import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import RewardRedemption from "@/models/RewardRedemption";
import User from "@/models/User";
import CoinTransaction from "@/models/CoinTransaction";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const { action, adminNote } = await request.json();

  if (!["approve", "reject", "fulfill"].includes(action)) {
    return NextResponse.json({ error: "action must be approve|reject|fulfill" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const redemption = await RewardRedemption.findById(id);
    if (!redemption) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "approve" && redemption.status === "pending") {
      // Deduct coins from user
      const user = await User.findOne({ userId: redemption.userId });
      if (!user || user.coins < redemption.coinsRequested) {
        return NextResponse.json({ error: "User has insufficient coins" }, { status: 400 });
      }
      await User.findOneAndUpdate(
        { userId: redemption.userId },
        { $inc: { coins: -redemption.coinsRequested } }
      );
      await CoinTransaction.create({
        userId: redemption.userId,
        amount: -redemption.coinsRequested,
        reason: "admin_adjust",
        adminNote: `Reward redemption approved: ${redemption.rewardLabel}`,
        happyHour: false,
        event: "admin_adjust",
      });
      redemption.status = "approved";
      redemption.resolvedAt = new Date();
    } else if (action === "reject" && redemption.status === "pending") {
      redemption.status = "rejected";
      redemption.resolvedAt = new Date();
    } else if (action === "fulfill" && redemption.status === "approved") {
      redemption.status = "fulfilled";
    } else {
      return NextResponse.json({ error: `Cannot ${action} a ${redemption.status} redemption` }, { status: 400 });
    }

    if (adminNote) redemption.adminNote = adminNote;
    await redemption.save();

    return NextResponse.json(redemption);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
