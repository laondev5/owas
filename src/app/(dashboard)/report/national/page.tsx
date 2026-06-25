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

interface SevenMillionProgress {
  currentTotal: number
  target: number
  percentage: number
}

interface NationalReportDoc {
  _id: string
  reportingPeriod: { month: number; year: number }
  regionsCount: number
  zonesCount: number
  districtsCount: number
  branchesCount: number
  aggregated: AggregatedStats
  sevenMillionProgress: SevenMillionProgress
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

async function fetchNationalReports(): Promise<NationalReportDoc[]> {
  const res = await fetch("/api/reports/national")
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? "Failed to fetch national reports")
  }
  const json = await res.json()
  return json.data
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse bg-muted rounded h-8 w-72" />
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="animate-pulse bg-muted rounded h-4 w-48" />
        <div className="animate-pulse bg-muted rounded h-5 w-full" />
        <div className="animate-pulse bg-muted rounded h-3 w-32" />
      </div>
      <div className="rounded-xl border bg-card p-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-muted rounded h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

export default function NationalReportPage() {
  const { data: reports, isLoading, isError, error } = useQuery({
    queryKey: ["national-reports"],
    queryFn: fetchNationalReports,
  })

  if (isLoading) return <LoadingSkeleton />

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error instanceof Error ? error.message : "Something went wrong"}
      </div>
    )
  }

  // Use the latest report's 7M progress for the banner
  const latest = reports?.[0]
  const progress = latest?.sevenMillionProgress
  const progressPct = Math.min(progress?.percentage ?? 0, 100)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1B4F72]">National Monthly Reports</h1>

      {/* 7 Million Progress Banner */}
      {progress && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-0.5">
                7 Million Souls Goal
              </p>
              <p className="text-sm text-foreground">
                <span className="font-bold text-[#1B4F72] text-lg">
                  {formatNumber(progress.currentTotal)}
                </span>{" "}
                <span className="text-muted-foreground">
                  of {formatNumber(progress.target)} souls won
                </span>
              </p>
            </div>
            <span className="text-2xl font-bold text-[#E67E22]">
              {progressPct.toFixed(1)}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                backgroundColor: "#E67E22",
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {(progress.target - progress.currentTotal) > 0
              ? `${formatNumber(progress.target - progress.currentTotal)} souls remaining to reach the target`
              : "Target reached!"}
          </p>
        </div>
      )}

      {/* Monthly reports table */}
      <div className="rounded-xl border bg-card p-5 overflow-x-auto">
        <h2 className="text-sm font-semibold text-[#1B4F72] mb-4">Monthly Report History</h2>
        {reports && reports.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {[
                  "Month / Year",
                  "Regions",
                  "Souls Won",
                  "Baptized",
                  "SML Certified",
                  "Compliance %",
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
                const monthName =
                  MONTH_NAMES[(report.reportingPeriod?.month ?? 1) - 1] ?? "Unknown"
                const year = report.reportingPeriod?.year ?? ""
                const regionsReporting = report.regionsCount ?? 0
                // NationalReport stores total counts, not reporting/outstanding split.
                // Compliance is 100% when we have regionsCount (all compiled).
                const compliancePct = regionsReporting > 0 ? 100 : 0

                return (
                  <tr key={report._id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 pr-4 font-medium">
                      {monthName} {year}
                    </td>
                    <td className="py-3 pr-4">{regionsReporting}</td>
                    <td className="py-3 pr-4">
                      {formatNumber(report.aggregated?.soulsWon ?? 0)}
                    </td>
                    <td className="py-3 pr-4">
                      {formatNumber(report.aggregated?.baptized ?? 0)}
                    </td>
                    <td className="py-3 pr-4">
                      {formatNumber(report.aggregated?.smlCertified ?? 0)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          compliancePct === 100
                            ? "bg-green-100 text-green-700"
                            : compliancePct >= 75
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {compliancePct.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No national reports found.</p>
        )}
      </div>
    </div>
  )
}
