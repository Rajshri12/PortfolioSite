import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { getSession } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ value: null }, { status: 401 });

  const { key } = await params;
  try {
    await connectToDatabase();
    // Try user-specific first, fall back to global
    const userId = session.impersonating ?? session.userId;
    const doc =
      (await Settings.findOne({ userId, key }).lean()) ??
      (await Settings.findOne({ userId: "global", key }).lean());
    if (!doc) return NextResponse.json({ value: null }, { status: 404 });
    return NextResponse.json({ value: doc.value });
  } catch {
    return NextResponse.json({ value: null });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = await params;
  const { value, scope } = await request.json();
  const userId = scope === "global" && session.role === "admin" ? "global" : (session.impersonating ?? session.userId);

  try {
    await connectToDatabase();
    const doc = await Settings.findOneAndUpdate(
      { userId, key },
      { $set: { userId, key, value } },
      { upsert: true, new: true }
    );
    return NextResponse.json({ value: doc.value });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
