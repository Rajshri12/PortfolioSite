import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import PushSubscription from "@/models/PushSubscription";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const userId = session.impersonating ?? session.userId;

    const body = await request.json();
    const { endpoint, keys } = body?.subscription ?? body ?? {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId,
        endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
        userAgent: request.headers.get("user-agent") ?? "",
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectToDatabase();
    const body = await request.json().catch(() => ({}));
    const endpoint = body?.endpoint;
    if (!endpoint) {
      return NextResponse.json({ error: "endpoint required" }, { status: 400 });
    }
    await PushSubscription.deleteOne({ endpoint });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
