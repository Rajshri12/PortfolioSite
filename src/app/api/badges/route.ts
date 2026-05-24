import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Settings from "@/models/Settings";

export async function GET() {
  try {
    await connectToDatabase();
    const doc = await Settings.findOne({ key: "badges" }).lean();
    const badges = (doc?.value ?? []).map((b: any) => ({ ...b, earned: false }));
    return NextResponse.json({ badges });
  } catch {
    return NextResponse.json({ badges: [] });
  }
}
