import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import AdminAlert from "@/models/AdminAlert";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const resolved = searchParams.get("resolved") === "true";

  try {
    await connectToDatabase();
    const alerts = await AdminAlert.find({ resolved })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ alerts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, message } = body;
  const userId = body.userId ?? session.userId;
  if (!type || !message) {
    return NextResponse.json({ error: "type and message required" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const alert = await AdminAlert.create({ type, userId, message });
    return NextResponse.json(alert, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
