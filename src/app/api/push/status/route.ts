import { NextRequest, NextResponse } from "next/server";
import PushSubscription from "@/models/PushSubscription";
import { getSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { getPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;
    const count = await PushSubscription.countDocuments({ userId });
    return NextResponse.json({ subscribed: count > 0, devices: count, publicKey: getPublicKey() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
