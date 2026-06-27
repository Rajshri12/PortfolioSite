import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import BadgeModel from "@/models/Badge";
import { getSession } from "@/lib/auth";
import { BADGE_CATALOGUE } from "@/lib/badges";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unseenOnly = searchParams.get("unseen") === "true";

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;

    const earnedDocs = unseenOnly
      ? await BadgeModel.find({ userId, seenAt: null }).lean()
      : await BadgeModel.find({ userId }).lean();

    const earnedMap = new Map(earnedDocs.map((b) => [b.slug, b]));

    const badges = BADGE_CATALOGUE.map((def) => {
      const earned = earnedMap.get(def.slug);
      return {
        ...def,
        earned: !!earned,
        earnedAt: earned?.earnedAt ?? null,
        seenAt: earned?.seenAt ?? null,
      };
    });

    return NextResponse.json({ badges });
  } catch {
    return NextResponse.json({ badges: [] });
  }
}
