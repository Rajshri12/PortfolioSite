import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TopicProgress, { TopicStatus } from "@/models/TopicProgress";
import TopicModel from "@/models/Topic";
import StageModel from "@/models/Stage";
import RewardRedemption from "@/models/RewardRedemption";
import { getSession } from "@/lib/auth";
import { awardCoins, deductCoins, getGameConfig } from "@/lib/coins";
import CoinTransaction from "@/models/CoinTransaction";
import { checkAndAwardBadges } from "@/lib/badges";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = (await request.json()) as { status: TopicStatus };
  if (!status) return NextResponse.json({ error: "status required" }, { status: 400 });

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;

    const prev = await TopicProgress.findOne({ userId, topicId: id });
    const wasCompleted = prev?.status === "completed";

    const updated = await TopicProgress.findOneAndUpdate(
      { userId, topicId: id },
      { $set: { userId, topicId: id, status, completedAt: status === "completed" ? new Date() : undefined } },
      { upsert: true, new: true }
    );

    let coinsAwarded = 0;
    let happyHour = false;
    let customReward: { label: string; quantity: number } | null = null;
    let stageReward: { coins?: number; custom?: { label: string; quantity: number } } | null = null;
    let newBadges: Array<{ slug: string; title: string; emoji: string }> = [];

    // Reverse coins when un-completing a topic
    if (wasCompleted && status !== "completed") {
      const earnedTx = await CoinTransaction.findOne({
        userId,
        event: "topic_complete",
        adminNote: { $regex: `topic:${id}` },
      }).sort({ createdAt: -1 });
      if (earnedTx) {
        await deductCoins(userId, earnedTx.amount, "topic_complete", `Reversed: topic unchecked (${id})`);
      }
      return NextResponse.json({ ...updated.toObject(), coinsAwarded: 0, happyHour: false, customReward: null, stageReward: null, newBadges: [] });
    }

    if (status === "completed" && !wasCompleted) {
      // ── Topic reward ──────────────────────────────────────────────────────
      const topic = await TopicModel.findOne({ topicId: id }).lean();
      const rc = topic?.rewardConfig;

      if (!rc || rc.type === "coins") {
        const config = await getGameConfig();
        const coinAmt = rc?.coins ?? config.rewards.roadmapTopicComplete;
        const result = await awardCoins(userId, coinAmt, "topic_complete", `topic:${id}`);
        coinsAwarded = result.awarded;
        happyHour = result.happyHour;
      } else {
        // custom reward — create a pre-approved redemption automatically
        const qty = rc.quantity ?? 1;
        await RewardRedemption.create({
          userId,
          rewardId: rc.rewardId ?? "custom",
          rewardLabel: rc.rewardLabel ?? "Custom Reward",
          coinsRequested: 0,
          status: "approved",
          adminNote: `Auto-awarded on topic completion: ${topic?.title}`,
          quantity: qty,
        });
        customReward = { label: rc.rewardLabel ?? "Custom Reward", quantity: qty };
      }

      newBadges = await checkAndAwardBadges(userId, "topic_completed");

      // ── Stage completion check ────────────────────────────────────────────
      if (topic?.stageId) {
        const allTopics = await TopicModel.find({ stageId: topic.stageId }).lean();
        const allTopicIds = allTopics.map((t) => t.topicId);
        const completedCount = await TopicProgress.countDocuments({
          userId,
          topicId: { $in: allTopicIds },
          status: "completed",
        });

        if (completedCount === allTopicIds.length) {
          const stage = await StageModel.findOne({ stageId: topic.stageId }).lean();
          const src = stage?.rewardConfig;

          if (!src || src.type === "coins") {
            const config2 = await getGameConfig();
            const stageCoins = src?.coins ?? config2.rewards.roadmapTopicComplete * 3;
            const res2 = await awardCoins(userId, stageCoins, "topic_complete", `Stage complete: ${stage?.title}`);
            stageReward = { coins: res2.awarded };
            coinsAwarded += res2.awarded;
            if (res2.happyHour) happyHour = true;
          } else {
            const qty2 = src.quantity ?? 1;
            await RewardRedemption.create({
              userId,
              rewardId: src.rewardId ?? "custom",
              rewardLabel: src.rewardLabel ?? "Stage Reward",
              coinsRequested: 0,
              status: "approved",
              adminNote: `Auto-awarded on stage completion: ${stage?.title}`,
              quantity: qty2,
            });
            stageReward = { custom: { label: src.rewardLabel ?? "Stage Reward", quantity: qty2 } };
          }
        }
      }
    }

    return NextResponse.json({ ...updated.toObject(), coinsAwarded, happyHour, customReward, stageReward, newBadges });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
