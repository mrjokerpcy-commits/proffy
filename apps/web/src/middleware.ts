import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProd = process.env.NODE_ENV === "production";
const LOGIN_BASE = isProd ? "https://proffy.study" : "http://localhost:3000";

export async function middleware(req: NextRequest) {
  // X-Robots-Tag on all API routes
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Redirect /login on subdomains to proffy.study/login so NextAuth CSRF works
  const host = req.headers.get("host") ?? "";
  if (req.nextUrl.pathname === "/login") {
    if (isProd && host !== "proffy.study" && host !== "www.proffy.study") {
      const loginUrl = new URL(`${LOGIN_BASE}/login`);
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
      if (callbackUrl) loginUrl.searchParams.set("callbackUrl", callbackUrl);
      return NextResponse.redirect(loginUrl);
    }
    // If already authenticated, skip login and go to destination
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-prod",
      cookieName: isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token",
    });
    if (token) {
      const dest = req.nextUrl.searchParams.get("callbackUrl") || "/dashboard";
      // Only follow safe same-origin callbackUrls
      const safe = dest.startsWith("/") ? new URL(dest, req.url) : new URL("/dashboard", req.url);
      return NextResponse.redirect(safe);
    }
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-prod",
    cookieName: isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token",
  });

  if (!token) {
    const callbackUrl = req.nextUrl.href;
    const loginUrl = new URL(`${LOGIN_BASE}/login`);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/chat/:path*",
    "/course/:path*",
    "/upload/:path*",
    "/profile/:path*",
    "/onboarding/:path*",
    "/notes/:path*",
    "/flashcards/:path*",
    "/settings/:path*",
    "/yael/:path*",
  ],
};
