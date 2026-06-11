import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;

  const isDashboardRoute = nextUrl.pathname.startsWith("/dashboard");
  const isVerifyingRoute = nextUrl.pathname === "/verifying";
  const isLoginRoute = nextUrl.pathname === "/login";

  // 1. Handle unauthenticated users
  if (!isLoggedIn) {
    if (isDashboardRoute || isVerifyingRoute) {
      return NextResponse.redirect(new URL("/login", nextUrl.origin));
    }
    return NextResponse.next();
  }

  // 2. Handle logged-in users visiting the login page
  if (isLoginRoute) {
    if (user?.status === "pending") {
      return NextResponse.redirect(new URL("/verifying", nextUrl.origin));
    }
    if (user?.status === "verified" && user?.role) {
      const dashboardMap: Record<string, string> = {
        faculty: "/dashboard/faculty",
        vendor: "/dashboard/vendor",
        admin: "/dashboard/admin",
        superadmin: "/dashboard/superadmin",
      };
      return NextResponse.redirect(
        new URL(dashboardMap[user.role] || "/unauthorized", nextUrl.origin)
      );
    }
    return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
  }

  // 3. Handle pending status - force redirection to /verifying
  if (user?.status === "pending") {
    if (!isVerifyingRoute) {
      return NextResponse.redirect(new URL("/verifying", nextUrl.origin));
    }
    return NextResponse.next();
  }

  // 4. Handle verified/denied users trying to visit /verifying
  if (isVerifyingRoute) {
    if (user?.status === "verified" && user?.role) {
      const dashboardMap: Record<string, string> = {
        faculty: "/dashboard/faculty",
        vendor: "/dashboard/vendor",
        admin: "/dashboard/admin",
        superadmin: "/dashboard/superadmin",
      };
      return NextResponse.redirect(
        new URL(dashboardMap[user.role] || "/unauthorized", nextUrl.origin)
      );
    }
    return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
  }

  // 5. Handle dashboard subroutes role-based authorization
  if (isDashboardRoute) {
    const pathname = nextUrl.pathname;

    // Superadmin is allowed to access any dashboard page
    if (user?.role === "superadmin") {
      return NextResponse.next();
    }

    if (pathname.startsWith("/dashboard/faculty") && user?.role !== "faculty") {
      return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
    }
    if (pathname.startsWith("/dashboard/vendor") && user?.role !== "vendor") {
      return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
    }
    if (pathname.startsWith("/dashboard/admin") && user?.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
    }
    if (pathname.startsWith("/dashboard/superadmin")) {
      return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/verifying", "/login"],
};
