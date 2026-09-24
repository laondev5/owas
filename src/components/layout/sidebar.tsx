"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  Award,
  Globe,
  ChevronDown,
  Target,
  Bell,
  X,
  QrCode,
  MessageSquare,
} from "lucide-react"
import type { UserRole } from "@/lib/models/User"
import { ROLE_HIERARCHY } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  minRole?: UserRole
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    title: "Reporting",
    items: [
      { label: "My Report", href: "/report/shepherd", icon: FileText, minRole: "flight_shepherd" },
      { label: "Branch Reports", href: "/report/branch", icon: FileText, minRole: "branch_coordinator" },
      { label: "District Reports", href: "/report/district", icon: FileText, minRole: "district_coordinator" },
      { label: "Zonal Reports", href: "/report/zone", icon: FileText, minRole: "zonal_coordinator" },
      { label: "National Reports", href: "/report/national", icon: Globe, minRole: "national_coordinator" },
    ],
  },
  {
    title: "Souls & Shepherds",
    items: [
      { label: "Converts", href: "/souls", icon: Users, minRole: "flight_shepherd" },
      { label: "Flight Shepherds", href: "/shepherds", icon: Users, minRole: "branch_coordinator" },
      { label: "Invite / QR Code", href: "/outreach/invite", icon: QrCode, minRole: "flight_shepherd" },
      { label: "SML Registry", href: "/sml", icon: Award, minRole: "chief_trainer" },
      { label: "My Team", href: "/team", icon: MessageSquare, minRole: "branch_coordinator" },
    ],
  },
  {
    title: "Training",
    items: [
      { label: "SIP Cohorts", href: "/sip", icon: BookOpen, minRole: "chief_trainer" },
      { label: "FIA Tracker", href: "/fia", icon: BookOpen, minRole: "chief_trainer" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "KPI Scorecard", href: "/kpi", icon: BarChart3, minRole: "branch_coordinator" },
      { label: "7M Progress", href: "/progress", icon: Target, minRole: "zonal_coordinator" },
      { label: "Leaderboard", href: "/leaderboard", icon: BarChart3, minRole: "branch_coordinator" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Organizations", href: "/admin/organizations", icon: Settings, minRole: "district_coordinator" },
      { label: "Users", href: "/admin/users", icon: Users, minRole: "branch_coordinator" },
      { label: "Notifications", href: "/admin/notifications", icon: Settings, minRole: "super_admin" },
      { label: "Audit Logs", href: "/admin/audit", icon: Settings, minRole: "super_admin" },
    ],
  },
]

export function Sidebar({ className, onClose }: { className?: string; onClose?: () => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = (session?.user?.role ?? "viewer") as UserRole

  const canSeeItem = (item: NavItem) => {
    if (!item.minRole) return true
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[item.minRole]
  }

  return (
    <aside
      className={cn(
        "w-64 bg-[#1B4F72] text-white flex flex-col h-screen overflow-y-auto shrink-0",
        className
      )}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-white flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/HARPAZO_LOGO.png" alt="HARPAZO Logo" width={36} height={36} className="object-contain" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">HARPAZO</p>
              <p className="text-xs text-blue-200/70 leading-tight">OWAS Platform</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4 text-blue-200" />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(canSeeItem)
          if (visibleItems.length === 0) return null

          return (
            <div key={section.title}>
              {section.title && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-blue-200/50">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          active
                            ? "bg-white/15 text-white"
                            : "text-blue-100/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors">
          <div className="w-8 h-8 bg-[#E67E22] rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0">
            {session?.user?.name?.charAt(0) ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session?.user?.name ?? "Loading..."}
            </p>
            <p className="text-xs text-blue-200/60 truncate capitalize">
              {session?.user?.role?.replace(/_/g, " ") ?? ""}
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-blue-200/50 shrink-0" />
        </div>
      </div>
    </aside>
  )
}
