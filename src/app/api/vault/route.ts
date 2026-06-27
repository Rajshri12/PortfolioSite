import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import VaultItem from "@/models/VaultItem";
import { getSession } from "@/lib/auth";
import { awardCoins, getGameConfig } from "@/lib/coins";
import { checkAndAwardBadges } from "@/lib/badges";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const q = searchParams.get("q");

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const filter: Record<string, any> = { userId };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (q) filter.title = { $regex: q, $options: "i" };

    const raw = await VaultItem.find(filter).sort({ createdAt: -1 }).lean();
    const items = raw.map((i) => ({
      ...i,
      id: String(i._id),
      created_at: i.createdAt?.toISOString() ?? "",
    }));
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.category || !body.title) {
    return NextResponse.json({ error: "category and title required" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const item = await VaultItem.create({ ...body, userId });

    const config = await getGameConfig();
    const { awarded, happyHour } = await awardCoins(userId, config.bonusActions.vaultSaved, "vault_saved");
    const newBadges = await checkAndAwardBadges(userId, "vault_saved");

    return NextResponse.json({ ...item.toObject(), coinsAwarded: awarded, happyHour, newBadges }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
