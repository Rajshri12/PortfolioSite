import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import JournalEntry from "@/models/JournalEntry";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const updates = await request.json();

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const entry = await JournalEntry.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    );
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(entry);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    await JournalEntry.findOneAndDelete({ _id: id, userId });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
