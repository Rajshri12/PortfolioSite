import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import JournalEntry from "@/models/JournalEntry";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? searchParams.get("per_page") ?? "20");
  const skip = (page - 1) * limit;

  try {
    await connectToDatabase();
    const [rawEntries, total] = await Promise.all([
      JournalEntry.find().sort({ date: -1 }).skip(skip).limit(limit).lean(),
      JournalEntry.countDocuments(),
    ]);
    // Map _id → id so frontend treats it as a string ID
    const entries = rawEntries.map((e) => ({ ...e, id: String(e._id) }));
    return NextResponse.json({ entries, total, page, limit });
  } catch {
    return NextResponse.json({ entries: [], total: 0, page, limit });
  }
}

export async function POST(request: Request) {
  const { date, content } = await request.json();
  if (!date || content === undefined) {
    return NextResponse.json({ error: "date and content required" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const existing = await JournalEntry.findOne({ date });
    if (existing) {
      existing.content = content;
      await existing.save();
      return NextResponse.json(existing);
    }
    const entry = await JournalEntry.create({ date, content });
    return NextResponse.json(entry, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
