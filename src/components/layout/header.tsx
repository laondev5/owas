"use client"

import { useSession, signOut } from "next-auth/react"
import { Bell, LogOut, ChevronRight, Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: { label: string; href: string }[] = []
  let path = ""

  const labelMap: Record<string, string> = {
    dashboard: "Dashboard",
    report: "Reports",
    shepherd: "Shepherd Report",
    branch: "Branch Report",
    district: "District Report",
    zone: "Zonal Report",
    national: "National Report",
    souls: "Converts",
    shepherds: "Flight Shepherds",
    sml: "SML Registry",
    sip: "SIP Cohorts",
    fia: "FIA Tracker",
    kpi: "KPI Scorecard",
    progress: "7M Progress",
    leaderboard: "Leaderboard",
    admin: "Admin",
    organizations: "Organizations",
    users: "Users",
    notifications: "Notifications",
    audit: "Audit Logs",
  }

  for (const segment of segments) {
    path += `/${segment}`
    crumbs.push({ label: labelMap[segment] ?? segment, href: path })
  }

  return crumbs
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
        <nav className="flex items-center gap-1.5 text-sm truncate">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5 shrink-0">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-medium text-gray-900 truncate">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-gray-500 hover:text-gray-900 transition-colors hidden sm:inline"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E67E22] rounded-full" />
        </button>

        <div className="w-px h-5 bg-gray-200" />

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  )
}
