import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/webhook",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected =
    pathname.startsWith("/job-tracker-dashboard") ||
    (pathname.startsWith("/api/") && !PUBLIC_PATHS.some((p) => pathname.startsWith(p)));

  if (!isProtected) return NextResponse.next();

  const session = await getSession(req);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Attach session info as headers for use in server components / route handlers
  const res = NextResponse.next();
  res.headers.set("x-user-id", session.impersonating ?? session.userId);
  res.headers.set("x-role", session.role);
  if (session.impersonating) {
    res.headers.set("x-impersonating", session.impersonating);
  }
  return res;
}

export const config = {
  matcher: ["/job-tracker-dashboard/:path*", "/api/:path*"],
};
