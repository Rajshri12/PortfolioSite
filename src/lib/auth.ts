import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const COOKIE_NAME = "ue_auth";
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "project-phoenix-jwt-secret-key-minimum-32-chars!!"
);

export interface Session {
  userId: string;
  role: "admin" | "user";
  impersonating?: string;
}

export async function signSession(payload: Session): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function getSession(req?: NextRequest): Promise<Session | null> {
  try {
    let token: string | undefined;

    if (req) {
      token = req.cookies.get(COOKIE_NAME)?.value;
    } else {
      const store = await cookies();
      token = store.get(COOKIE_NAME)?.value;
    }

    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAge: number) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
