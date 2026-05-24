import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import VaultItem from "@/models/VaultItem";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const q = searchParams.get("q");

  try {
    await connectToDatabase();
    const filter: Record<string, any> = {};
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

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.category || !body.title) {
    return NextResponse.json({ error: "category and title required" }, { status: 400 });
  }
  try {
    await connectToDatabase();
    const item = await VaultItem.create(body);
    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
