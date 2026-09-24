import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"
import { NextResponse } from "next/server"

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 10,
  national_coordinator: 9,
  regional_coordinator: 8,
  zonal_coordinator: 7,
  district_coordinator: 6,
  branch_coordinator: 5,
  chief_trainer: 4,
  mission_field_coordinator: 4,
  flight_shepherd: 3,
  viewer: 1,
}

function hasMinRole(userRole: string, minRole: string): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0)
}

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  const isPublicPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/setup-account") ||
    pathname.startsWith("/api/setup-account") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/pusher/auth") ||
    pathname.startsWith("/join") ||
    pathname.startsWith("/api/join")

  if (isPublicPath) return NextResponse.next()

  if (!session) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = (session.user as Record<string, unknown>).role as string ?? "viewer"

  // Admin routes — organizations/users are open to coordinators (scoped further
  // at the API level); everything else under /admin (audit, notifications) stays
  // super_admin-only.
  if (pathname.startsWith("/admin/organizations") && !hasMinRole(role, "district_coordinator")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  } else if (pathname.startsWith("/admin/users") && !hasMinRole(role, "branch_coordinator")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  } else if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/organizations") &&
    !pathname.startsWith("/admin/users") &&
    role !== "super_admin"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // National-level routes
  if (pathname.startsWith("/report/national") && !hasMinRole(role, "national_coordinator")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Zonal-level routes
  if (pathname.startsWith("/report/zone") && !hasMinRole(role, "zonal_coordinator")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // District-level routes
  if (pathname.startsWith("/report/district") && !hasMinRole(role, "district_coordinator")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // API route protection (coarse-grained — fine-grained is done per route via withAuth)
  if (pathname.startsWith("/api/admin") && role !== "super_admin") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  if (pathname.startsWith("/api/reports/national") && !hasMinRole(role, "national_coordinator")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
}
