import { NextRequest, NextResponse } from "next/server";
import { signSession } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

const CREDENTIALS = [
  {
    userId: process.env.ADMIN_ID ?? "admin",
    email: process.env.ADMIN_EMAIL ?? "admin@phoenix.local",
    password: process.env.ADMIN_PASSWORD ?? "",
    role: "admin" as const,
  },
  {
    userId: process.env.USER_ID ?? "user1",
    email: process.env.USER_EMAIL ?? "user@phoenix.local",
    password: process.env.USER_PASSWORD ?? "",
    role: "user" as const,
  },
  ...(process.env.TEST_ID && process.env.TEST_EMAIL && process.env.TEST_PASSWORD
    ? [{
        userId: process.env.TEST_ID,
        email: process.env.TEST_EMAIL,
        password: process.env.TEST_PASSWORD,
        role: "user" as const,
      }]
    : []),
];

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const match = CREDENTIALS.find(
    (c) => c.email === email && c.password === password
  );

  if (!match) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Ensure user document exists in DB
  await connectToDatabase();
  await User.findOneAndUpdate(
    { userId: match.userId },
    { $setOnInsert: { userId: match.userId, email: match.email, role: match.role } },
    { upsert: true, new: true }
  );

  const token = await signSession({ userId: match.userId, role: match.role });
  const maxAge = 60 * 60 * 24 * 7; // 7 days

  const res = NextResponse.json({ ok: true, role: match.role });
  res.headers.set(
    "Set-Cookie",
    `ue_auth=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
  return res;
}
