"use client"

import { useQuery } from "@tanstack/react-query"
import { formatNumber } from "@/lib/utils"

interface AggregatedStats {
  soulsWon: number
  soulsReached: number
  firstTimers: number
  newConverts: number
  active: number
  inactive: number
  baptized: number
  familyClassEnrolled: number
  responsibilityClassEnrolled: number
  sipEnrolled: number
  smlCertified: number
  flightShepherdsActive: number
}

interface TopDistrict {
  districtId: string
  score: number
}

interface ZonalReportDoc {
  _id: string
  zoneId: { _id: string; name: string; code: string } | string
  reportingWeek: string
  districtsReporting: number
  districtsOutstanding: number
  aggregated: AggregatedStats
  topDistricts?: TopDistrict[]
  isLate: boolean
  status: "auto_compiled" | "submitted" | "approved"
}

async function fetchZonalReports(): Promise<ZonalReportDoc[]> {
  const res = await fetch("/api/reports/zone")
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? "Failed to fetch zonal reports")
  }
  const json = await res.json()
  return json.data
}

function StatusBadge({ status }: { status: ZonalReportDoc["status"] }) {
  const styles = {
    auto_compiled: "bg-gray-100 text-gray-600",
    submitted: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
  } as const

  const labels = {
    auto_compiled: "Auto Compiled",
    submitted: "Submitted",
    approved: "Approved",
  } as const

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold text-[#1B4F72]">
        {typeof value === "number" ? formatNumber(value) : value}
      </span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse bg-muted rounded h-8 w-64" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-2">
            <div className="animate-pulse bg-muted rounded h-3 w-20" />
            <div className="animate-pulse bg-muted rounded h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function ZoneReportPage() {
  const { data: reports, isLoading, isError, error } = useQuery({
    queryKey: ["zonal-reports"],
    queryFn: fetchZonalReports,
  })

  if (isLoading) return <LoadingSkeleton />

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error instanceof Error ? error.message : "Something went wrong"}
      </div>
    )
  }

  const latest = reports?.[0]
  const totalSoulsWon = reports?.reduce((sum, r) => sum + (r.aggregated?.soulsWon ?? 0), 0) ?? 0
  const totalBaptized = reports?.reduce((sum, r) => sum + (r.aggregated?.baptized ?? 0), 0) ?? 0
  const latestDistrictsReporting = latest?.districtsReporting ?? 0
  const totalOutstanding =
    reports?.reduce((sum, r) => sum + (r.districtsOutstanding ?? 0), 0) ?? 0

  // Top districts from the latest report
  const topDistricts = latest?.topDistricts?.slice(0, 3) ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1B4F72]">Zonal Weekly Reports</h1>

      {/* Outstanding banner */}
      {totalOutstanding > 0 && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800 flex items-start gap-3">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <span>
            <strong>{totalOutstanding}</strong> district
            {totalOutstanding !== 1 ? "s have" : " has"} not yet submitted their reports this
            period.
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Souls Won (8 wks)" value={totalSoulsWon} />
        <SummaryCard label="Districts Reporting" value={latestDistrictsReporting} />
        <SummaryCard
          label="Baptized (8 wks)"
          value={totalBaptized}
        />
        <SummaryCard
          label="SML Certified (8 wks)"
          value={
            reports?.reduce((sum, r) => sum + (r.aggregated?.smlCertified ?? 0), 0) ?? 0
          }
        />
      </div>

      {/* Recent weeks table */}
      <div className="rounded-xl border bg-card p-5 overflow-x-auto">
        <h2 className="text-sm font-semibold text-[#1B4F72] mb-4">Recent Weekly Summaries</h2>
        {reports && reports.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {[
                  "Week Ending",
                  "Districts (Rep / Out)",
                  "Souls Won",
                  "Baptized",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="pb-2 pr-4 text-left text-xs font-semibold uppercase text-muted-foreground last:pr-0"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const week = new Date(report.reportingWeek).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
                return (
                  <tr key={report._id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 pr-4 font-medium">{week}</td>
                    <td className="py-3 pr-4">
                      <span className="text-[#27AE60] font-medium">
                        {report.districtsReporting}
                      </span>
                      <span className="text-muted-foreground"> / </span>
                      <span
                        className={
                          report.districtsOutstanding > 0
                            ? "text-[#C0392B] font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {report.districtsOutstanding}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{formatNumber(report.aggregated?.soulsWon ?? 0)}</td>
                    <td className="py-3 pr-4">{formatNumber(report.aggregated?.baptized ?? 0)}</td>
                    <td className="py-3">
                      <StatusBadge status={report.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No reports found for this zone.</p>
        )}
      </div>

      {/* Top districts section */}
      {topDistricts.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold text-[#1B4F72] mb-4">
            Top Districts — Latest Week
          </h2>
          <ol className="space-y-3">
            {topDistricts.map((d, idx) => (
              <li
                key={d.districtId}
                className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white ${
                      idx === 0
                        ? "bg-[#E67E22]"
                        : idx === 1
                        ? "bg-[#1B4F72]"
                        : "bg-gray-400"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    District ID: {d.districtId}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#27AE60]">
                  Score: {formatNumber(d.score)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
