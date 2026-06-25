"use client"

import { useQuery } from "@tanstack/react-query"
import { formatNumber, ROLE_LABELS } from "@/lib/utils"
import Link from "next/link"
import { Building2, Users, GitBranch, Activity } from "lucide-react"

interface Stats {
  totalOrganizations: number
  totalUsers: number
  activeBranches: number
  totalSouls: number
  recentAuditLogs: { action: string; entityType: string; timestamp: string }[]
}

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery<{ success: boolean; data: Stats }>({
    queryKey: ["admin-stats"],
    queryFn: () => fetch("/api/admin/stats").then((r) => r.json()),
  })

  const stats = data?.data

  const cards = [
    { label: "Organizations", value: stats?.totalOrganizations, icon: Building2, color: "bg-purple-100 text-purple-700" },
    { label: "Users", value: stats?.totalUsers, icon: Users, color: "bg-blue-100 text-blue-700" },
    { label: "Active Branches", value: stats?.activeBranches, icon: GitBranch, color: "bg-green-100 text-green-700" },
    { label: "Total Souls Won", value: stats?.totalSouls, icon: Activity, color: "bg-orange-100 text-orange-700" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform overview and administration</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            {isLoading ? (
              <div className="animate-pulse h-8 w-24 rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold text-gray-900">{formatNumber(card.value ?? 0)}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="animate-pulse h-4 rounded bg-muted" />)}
            </div>
          ) : stats?.recentAuditLogs?.length ? (
            <div className="space-y-2">
              {stats.recentAuditLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-muted/50 last:border-0">
                  <div>
                    <span className="text-xs font-medium text-gray-700">{log.action}</span>
                    <span className="text-xs text-muted-foreground ml-2">{log.entityType}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Organizations", href: "/admin/organizations" },
              { label: "Users", href: "/admin/users" },
              { label: "National Reports", href: "/report/national" },
              { label: "Audit Logs", href: "/admin/audit" },
              { label: "KPI Scorecard", href: "/kpi" },
              { label: "Leaderboard", href: "/leaderboard" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border p-3 text-sm font-medium text-gray-700 hover:border-[#1B4F72] hover:text-[#1B4F72] transition-colors"
              >
                {link.label} →
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
