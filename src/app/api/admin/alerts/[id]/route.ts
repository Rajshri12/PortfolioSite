import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import AdminAlert from "@/models/AdminAlert";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await connectToDatabase();
    const alert = await AdminAlert.findByIdAndUpdate(
      id,
      { $set: { resolved: true, resolvedAt: new Date() } },
      { new: true }
    );
    if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    return NextResponse.json(alert);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
