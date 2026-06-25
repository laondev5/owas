"use client"

import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { formatNumber } from "@/lib/utils"
import Link from "next/link"

function getWeekEnding() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + diff)
  return d
}

export default function BranchDashboard() {
  const { data: session } = useSession()

  const { data: reportsData, isLoading: reportsLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["branch-reports"],
    queryFn: () => fetch("/api/reports/branch").then((r) => r.json()),
    enabled: !!session,
  })

  const { data: soulsData, isLoading: soulsLoading } = useQuery<{ success: boolean; data: { souls: any[] } }>({
    queryKey: ["souls-recent"],
    queryFn: () => fetch("/api/souls?limit=5&status=active").then((r) => r.json()),
    enabled: !!session,
  })

  const reports = reportsData?.data ?? []
  const latestReport = reports[0]
  const weekEnding = getWeekEnding()
  const currentWeekStr = weekEnding.toISOString().split("T")[0]
  const latestWeekStr = latestReport?.weekEnding ? new Date(latestReport.weekEnding).toISOString().split("T")[0] : null
  const reportSubmitted = latestWeekStr === currentWeekStr && (latestReport?.status === "submitted" || latestReport?.status === "approved")

  const souls = soulsData?.data?.souls ?? []
  const totalSouls = reports.slice(0, 4).reduce((s: number, r: any) => s + (r.gowas?.soulsWon ?? 0), 0)
  const activeSouls = souls.filter((s: any) => s.status === "active").length
  const baptized = reports.slice(0, 4).reduce((s: number, r: any) => s + (r.baptism?.baptized ?? 0), 0)
  const shepherds = latestReport?.flightShepherds?.totalActive ?? 0

  const fiaStages = latestReport ? [
    { label: "Family Class", enrolled: latestReport.fia?.familyClass?.enrolled ?? 0 },
    { label: "Resp. Class", enrolled: latestReport.fia?.responsibilityClass?.enrolled ?? 0 },
    { label: "Sorting Out", enrolled: latestReport.fia?.sortingOut?.enrolled ?? 0 },
    { label: "HSOS", enrolled: latestReport.fia?.hsos?.enrolled ?? 0 },
    { label: "ZIBI", enrolled: latestReport.fia?.zibi?.enrolled ?? 0 },
  ] : []
  const maxEnrolled = Math.max(...fiaStages.map((s) => s.enrolled), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Branch Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">This week at a glance</p>
      </div>

      <div className={`rounded-xl border p-4 text-sm flex items-center justify-between ${
        reportSubmitted ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-200 text-red-800"
      }`}>
        <span>{reportSubmitted ? "✓ Weekly report submitted" : "Weekly report not yet submitted for this week"}</span>
        {!reportSubmitted && (
          <Link href="/report/branch" className="text-xs font-semibold underline">Submit now →</Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Souls Won (4 wks)", value: totalSouls },
          { label: "Active Converts", value: activeSouls },
          { label: "Flight Shepherds", value: shepherds },
          { label: "Baptized (4 wks)", value: baptized },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{s.label}</p>
            {reportsLoading ? (
              <div className="animate-pulse h-8 w-20 rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold text-gray-900">{formatNumber(s.value)}</p>
            )}
          </div>
        ))}
      </div>

      {fiaStages.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">FIA Integration Funnel</h2>
          <div className="space-y-3">
            {fiaStages.map((stage) => (
              <div key={stage.label}>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{stage.label}</span>
                  <span>{stage.enrolled} enrolled</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-[#1B4F72] h-2 rounded-full"
                    style={{ width: `${(stage.enrolled / maxEnrolled) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {souls.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Converts</h2>
            <Link href="/souls" className="text-xs text-[#1B4F72] font-medium hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {souls.map((s: any) => (
              <div key={s._id} className="flex items-center justify-between py-2 border-b border-muted/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.fullName}</p>
                  <p className="text-xs text-muted-foreground">{s.assignedShepherdId?.shepherdTag ?? "Unassigned"}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  s.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
