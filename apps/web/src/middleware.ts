export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/course/:path*", "/upload/:path*"],
};
