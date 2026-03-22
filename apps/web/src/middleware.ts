import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    // Add X-Robots-Tag to all API responses to prevent indexing
    const res = NextResponse.next();
    if (req.nextUrl.pathname.startsWith("/api/")) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return res;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/course/:path*",
    "/upload/:path*",
    "/chat/:path*",
    "/profile/:path*",
    "/onboarding/:path*",
    "/notes/:path*",
    "/flashcards/:path*",
    "/settings/:path*",
  ],
};
