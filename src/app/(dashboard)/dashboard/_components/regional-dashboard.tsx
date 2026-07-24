"use client"

import { useQuery } from "@tanstack/react-query"
import { formatNumber } from "@/lib/utils"
import SupervisorFeedbackCard from "./supervisor-feedback-card"

interface ZonalReport {
  _id: string
  zoneId: { name: string; code: string } | string
  reportingWeek: string
  zonesReporting: number
  zonesOutstanding: number
  aggregated: { soulsWon: number; baptized: number; newConverts: number }
  status: string
}

export default function RegionalDashboard() {
  const { data, isLoading } = useQuery<{ success: boolean; data: ZonalReport[] }>({
    queryKey: ["zone-reports"],
    queryFn: () => fetch("/api/reports/zone").then((r) => r.json()),
  })

  const reports = data?.data ?? []
  const latest = reports[0]
  const totalSouls = reports.slice(0, 4).reduce((s, r) => s + (r.aggregated?.soulsWon ?? 0), 0)
  const totalBaptized = reports.slice(0, 4).reduce((s, r) => s + (r.aggregated?.baptized ?? 0), 0)
  const outstanding = reports.reduce((s, r) => s + (r.zonesOutstanding ?? 0), 0)
  const reporting = reports.reduce((s, r) => s + (r.zonesReporting ?? 0), 0)
  const compliance = reporting + outstanding > 0 ? Math.round((reporting / (reporting + outstanding)) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Regional Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Regional performance overview</p>
      </div>

      {outstanding > 0 && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
          <strong>{outstanding} zones</strong> have outstanding reports this period.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Zones Reporting", value: reporting },
          { label: "Souls This Month", value: totalSouls },
          { label: "Baptized", value: totalBaptized },
          { label: "Compliance Rate", value: `${compliance}%`, raw: true },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{s.label}</p>
            {isLoading ? (
              <div className="animate-pulse h-8 w-20 rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold text-gray-900">{s.raw ? s.value : formatNumber(s.value as number)}</p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Zone Reports</h2>
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="animate-pulse h-10 rounded bg-muted" />)}</div>
        ) : reports.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {["Week Ending", "Zones Rep.", "Souls Won", "Baptized", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 8).map((r, i) => (
                  <tr key={i} className="border-b border-muted/50 hover:bg-muted/20">
                    <td className="px-4 py-3">{new Date(r.reportingWeek).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{r.zonesReporting}/{(r.zonesReporting ?? 0) + (r.zonesOutstanding ?? 0)}</td>
                    <td className="px-4 py-3 font-medium">{formatNumber(r.aggregated?.soulsWon ?? 0)}</td>
                    <td className="px-4 py-3">{formatNumber(r.aggregated?.baptized ?? 0)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === "approved" ? "bg-green-100 text-green-700" :
                        r.status === "submitted" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-center text-muted-foreground py-8">No zone reports yet</p>
        )}
      </div>

      <SupervisorFeedbackCard />
    </div>
  )
}
