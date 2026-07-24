"use client"

import { useQuery } from "@tanstack/react-query"
import { formatNumber } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import SupervisorFeedbackCard from "./supervisor-feedback-card"
import RankWidget from "./rank-widget"

export default function DistrictDashboard() {
  const { data, isLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["district-reports"],
    queryFn: () => fetch("/api/reports/district").then((r) => r.json()),
  })

  const reports = data?.data ?? []
  const totalSouls = reports.slice(0, 4).reduce((s: number, r: any) => s + (r.aggregated?.soulsWon ?? 0), 0)
  const totalBaptized = reports.slice(0, 4).reduce((s: number, r: any) => s + (r.aggregated?.baptized ?? 0), 0)
  const branchesReporting = reports[0]?.branchesReporting ?? 0
  const branchesOutstanding = reports[0]?.branchesOutstanding ?? 0

  const chartData = reports.slice(0, 6).reverse().map((r: any) => ({
    week: new Date(r.reportingWeek).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
    souls: r.aggregated?.soulsWon ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">District Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Branch reporting overview</p>
      </div>

      {branchesOutstanding > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>{branchesOutstanding} branches</strong> have not submitted their report this week.
        </div>
      )}

      <RankWidget level="district" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Branches Reporting", value: branchesReporting },
          { label: "Outstanding", value: branchesOutstanding },
          { label: "Souls This Month", value: totalSouls },
          { label: "Baptized", value: totalBaptized },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{s.label}</p>
            {isLoading ? (
              <div className="animate-pulse h-8 w-20 rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold text-gray-900">{formatNumber(s.value)}</p>
            )}
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Souls Won — Last 6 Weeks</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip formatter={(v: number) => [formatNumber(v), "Souls"]} />
              <Bar dataKey="souls" fill="#1B4F72" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <SupervisorFeedbackCard />
    </div>
  )
}
