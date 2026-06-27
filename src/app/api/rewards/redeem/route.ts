import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Reward from "@/models/Reward";
import RewardRedemption from "@/models/RewardRedemption";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { sendTelegram, getAdminChatId } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { rewardId, coinsRequested: requestedAmount } = body;
  if (!rewardId) {
    return NextResponse.json({ error: "rewardId required" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;

    const reward = await Reward.findById(rewardId);
    if (!reward || !reward.isActive) {
      return NextResponse.json({ error: "Reward not found or inactive" }, { status: 404 });
    }

    const coinCost = reward.coinCost ?? 0;
    const coinStep = reward.coinStep ?? 0;

    // Determine final amount: caller may pass a specific amount (for variable rewards), else use coinCost
    const finalCoins: number = (requestedAmount != null && requestedAmount > 0) ? requestedAmount : coinCost;

    if (coinCost < 1) {
      return NextResponse.json({ error: "This reward has no coin cost set — contact admin" }, { status: 400 });
    }
    if (finalCoins < coinCost) {
      return NextResponse.json({ error: `Minimum is 🪙 ${coinCost.toLocaleString()} coins` }, { status: 400 });
    }
    if (coinStep > 0 && (finalCoins - coinCost) % coinStep !== 0) {
      return NextResponse.json({ error: `Amount must be ${coinCost.toLocaleString()} + multiples of ${coinStep.toLocaleString()}` }, { status: 400 });
    }

    const user = await User.findOne({ userId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.coins < finalCoins) {
      return NextResponse.json({ error: `Not enough coins — you have 🪙 ${user.coins.toLocaleString()}, need 🪙 ${finalCoins.toLocaleString()}` }, { status: 400 });
    }

    const existing = await RewardRedemption.findOne({ userId, rewardId: String(rewardId), status: "pending" });
    if (existing) {
      return NextResponse.json({ error: "You already have a pending request for this reward" }, { status: 409 });
    }

    const redemption = await RewardRedemption.create({
      userId,
      rewardId: String(rewardId),
      rewardLabel: reward.label,
      coinsRequested: finalCoins,
      status: "pending",
    });

    getAdminChatId().then((chatId) => {
      if (chatId) sendTelegram(chatId, `🎁 <b>Reward request</b>\n\n<b>${userId}</b> requested <b>${reward.label}</b> for 🪙 ${finalCoins.toLocaleString()} coins.\n\nApprove in the Admin Panel → Rewards tab.`);
    });

    return NextResponse.json(redemption, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
