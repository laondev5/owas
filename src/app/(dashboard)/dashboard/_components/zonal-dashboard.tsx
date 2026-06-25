"use client"

import { useQuery } from "@tanstack/react-query"
import { formatNumber } from "@/lib/utils"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

export default function ZonalDashboard() {
  const { data, isLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["zone-reports"],
    queryFn: () => fetch("/api/reports/zone").then((r) => r.json()),
  })

  const { data: kpiData } = useQuery<{ success: boolean; data: { latestGrade: string; latestScore: number } }>({
    queryKey: ["kpi"],
    queryFn: () => fetch("/api/kpi").then((r) => r.json()),
  })

  const reports = data?.data ?? []
  const totalSouls = reports.reduce((s: number, r: any) => s + (r.aggregated?.soulsWon ?? 0), 0)
  const totalBaptized = reports.reduce((s: number, r: any) => s + (r.aggregated?.baptized ?? 0), 0)
  const outstanding = reports.reduce((s: number, r: any) => s + (r.zonesOutstanding ?? 0), 0)
  const reporting = reports.reduce((s: number, r: any) => s + (r.zonesReporting ?? 0), 0)
  const kpi = kpiData?.data
  const gradeColor = { A: "text-green-600", B: "text-blue-600", C: "text-yellow-600", D: "text-orange-600", F: "text-red-600" }

  const chartData = reports.slice(0, 8).reverse().map((r: any) => ({
    week: new Date(r.reportingWeek).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
    souls: r.aggregated?.soulsWon ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Zonal Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Zone weekly performance</p>
      </div>

      {outstanding > 0 && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
          <strong>{outstanding} districts</strong> have not submitted reports this week.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Districts Reporting", value: reporting, raw: false },
          { label: "Souls This Month", value: totalSouls, raw: false },
          { label: "Baptized", value: totalBaptized, raw: false },
          { label: "KPI Grade", value: kpi?.latestGrade ?? "—", raw: true },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{s.label}</p>
            {isLoading ? (
              <div className="animate-pulse h-8 w-20 rounded bg-muted" />
            ) : (
              <p className={`text-3xl font-bold ${s.label === "KPI Grade" ? (gradeColor[s.value as keyof typeof gradeColor] ?? "text-gray-900") : "text-gray-900"}`}>
                {s.raw ? s.value : formatNumber(s.value as number)}
              </p>
            )}
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Souls Won — Last 8 Weeks</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip formatter={(v: number) => [formatNumber(v), "Souls"]} />
              <Line type="monotone" dataKey="souls" stroke="#1B4F72" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
