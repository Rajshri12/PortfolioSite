import { NextResponse } from "next/server";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "localdevelopmentsecret32chars!!"
);

export async function GET() {
  const token = await new SignJWT({ sub: "devuser", login: "devuser" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);

  return NextResponse.json({ token });
}
