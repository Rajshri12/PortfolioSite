import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Settings from "@/models/Settings";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  try {
    await connectToDatabase();
    const doc = await Settings.findOne({ key }).lean();
    if (!doc) return NextResponse.json({ value: null }, { status: 404 });
    return NextResponse.json({ value: doc.value });
  } catch {
    return NextResponse.json({ value: null }, { status: 200 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const { value } = await request.json();
  try {
    await connectToDatabase();
    const doc = await Settings.findOneAndUpdate(
      { key },
      { $set: { key, value } },
      { upsert: true, new: true }
    );
    return NextResponse.json({ value: doc.value });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
