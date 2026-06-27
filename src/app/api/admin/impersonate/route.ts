import { NextRequest, NextResponse } from "next/server";
import { getSession, signSession, cookieOptions } from "@/lib/auth";

// POST /api/admin/impersonate  { userId: "user1" }  → set impersonating in cookie
// DELETE /api/admin/impersonate                      → clear impersonating from cookie

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const token = await signSession({ userId: session.userId, role: "admin", impersonating: userId });
  const opts = cookieOptions(60 * 60 * 24 * 7);

  const res = NextResponse.json({ ok: true, impersonating: userId });
  res.headers.set(
    "Set-Cookie",
    `${opts.name}=${token}; Path=${opts.path}; HttpOnly; SameSite=${opts.sameSite}; Max-Age=${opts.maxAge}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return res;
}

export async function DELETE(request: NextRequest) {
  const session = await getSession(request);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Re-sign without impersonating field
  const token = await signSession({ userId: session.userId, role: "admin" });
  const opts = cookieOptions(60 * 60 * 24 * 7);

  const res = NextResponse.json({ ok: true });
  res.headers.set(
    "Set-Cookie",
    `${opts.name}=${token}; Path=${opts.path}; HttpOnly; SameSite=${opts.sameSite}; Max-Age=${opts.maxAge}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return res;
}
