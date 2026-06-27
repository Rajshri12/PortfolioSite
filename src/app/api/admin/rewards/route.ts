import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Reward from "@/models/Reward";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  try {
    await connectToDatabase();
    const rewards = await Reward.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ rewards });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  try {
    await connectToDatabase();
    const body = await request.json();
    const { label, emoji, description, coinCost, coinStep, isActive, isComingSoon } = body;
    if (!label?.trim()) {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }
    if (!coinCost || coinCost < 1) {
      return NextResponse.json({ error: "coinCost must be at least 1" }, { status: 400 });
    }
    const reward = await Reward.create({ label: label.trim(), emoji, description, coinCost, coinStep: coinStep ?? 0, isActive, isComingSoon });
    return NextResponse.json(reward, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
