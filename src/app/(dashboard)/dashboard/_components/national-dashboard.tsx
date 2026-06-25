"use client"

import { useQuery } from "@tanstack/react-query"
import { formatNumber } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

interface NationalReport {
  reportingPeriod: { year: number; month: number }
  aggregated: { soulsWon: number; baptized: number; smlCertified: number; newConverts: number }
  regionsCount?: number
  sevenMillionProgress?: { currentTotal: number; percentComplete: number; projectedYear: number }
}

interface ProgressData {
  totalSoulsWon: number
  percentComplete: number
  targetSouls: number
  projectedYear: number
  weeklyRate: number
  soulsThisMonth: number
  sparkline: { month: string; souls: number }[]
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

export default function NationalDashboard() {
  const { data: progressData, isLoading: progressLoading } = useQuery<{ success: boolean; data: ProgressData }>({
    queryKey: ["progress"],
    queryFn: () => fetch("/api/progress").then((r) => r.json()),
  })

  const { data: reportsData, isLoading: reportsLoading } = useQuery<{ success: boolean; data: NationalReport[] }>({
    queryKey: ["national-reports"],
    queryFn: () => fetch("/api/reports/national").then((r) => r.json()),
  })

  const progress = progressData?.data
  const reports = reportsData?.data ?? []
  const pct = Math.min(100, progress?.percentComplete ?? 0)

  const chartData = (progress?.sparkline ?? []).map((s) => ({
    month: s.month,
    souls: s.souls,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">National Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">7 Million Souls Mandate — National Overview</p>
      </div>

      {/* 7M Progress Hero */}
      <div className="rounded-xl border bg-gradient-to-r from-[#1B4F72] to-[#154360] p-6 text-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">7 Million Souls Mandate</p>
            <p className="text-3xl font-bold mt-1">{progressLoading ? "..." : formatNumber(progress?.totalSoulsWon ?? 0)}</p>
            <p className="text-sm text-blue-200 mt-1">of {formatNumber(7000000)} target souls</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-[#E67E22]">{pct.toFixed(1)}%</p>
            <p className="text-xs text-blue-200 mt-1">Complete</p>
          </div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-3">
          <div
            className="bg-[#E67E22] h-3 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-blue-200">
          <span>Projected completion: {progress?.projectedYear ?? "—"}</span>
          <span>Weekly rate: {formatNumber(progress?.weeklyRate ?? 0)} souls</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Souls This Month", value: progress?.soulsThisMonth },
          { label: "% Complete", value: `${pct.toFixed(1)}%`, raw: true },
          { label: "Projected Year", value: progress?.projectedYear, raw: true },
          { label: "Weekly Rate", value: progress?.weeklyRate },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{s.label}</p>
            {progressLoading ? (
              <div className="animate-pulse h-8 w-20 rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold text-gray-900">
                {s.raw ? s.value ?? "—" : formatNumber(s.value as number ?? 0)}
              </p>
            )}
          </div>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Monthly Souls Won Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip formatter={(v: number) => [formatNumber(v), "Souls Won"]} />
              <Bar dataKey="souls" fill="#E67E22" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {reports.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Monthly Reports</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {["Month / Year", "Souls Won", "Baptized", "SML Certified"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 6).map((r, i) => (
                  <tr key={i} className="border-b border-muted/50 hover:bg-muted/20">
                    <td className="px-4 py-3">{MONTH_NAMES[(r.reportingPeriod?.month ?? 1) - 1]} {r.reportingPeriod?.year}</td>
                    <td className="px-4 py-3 font-medium">{formatNumber(r.aggregated?.soulsWon ?? 0)}</td>
                    <td className="px-4 py-3">{formatNumber(r.aggregated?.baptized ?? 0)}</td>
                    <td className="px-4 py-3">{formatNumber(r.aggregated?.smlCertified ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
