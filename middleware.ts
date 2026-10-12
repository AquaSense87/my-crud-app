import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  const isProtected = pathname.startsWith("/chat") || pathname.startsWith("/crud");
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/chat/:path*", "/crud/:path*", "/crud"],
};
