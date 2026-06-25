"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface MetricScore {
  raw: number
  weighted: number
}

interface KpiScoreDoc {
  _id: string
  entityId: string
  entityType: string
  period: { month: number; year: number }
  scores: {
    soulsWon: MetricScore
    retention: MetricScore
    fiaProgress: MetricScore
    baptism: MetricScore
    flightShepherdSystem: MetricScore
    evangelismExplosion: MetricScore
    hstReadiness: MetricScore
    reportingCompliance: MetricScore
  }
  totalScore: number
}

interface KpiResponse {
  scores: KpiScoreDoc[]
  latestGrade: "A" | "B" | "C" | "D" | "F"
  latestScore: number
}

const METRICS = [
  { key: "soulsWon", label: "Souls Won", weight: 30 },
  { key: "retention", label: "Retention", weight: 20 },
  { key: "fiaProgress", label: "FIA Progress", weight: 15 },
  { key: "baptism", label: "Baptism", weight: 10 },
  { key: "flightShepherdSystem", label: "Flight Shepherd System", weight: 10 },
  { key: "evangelismExplosion", label: "Evangelism Explosion", weight: 5 },
  { key: "hstReadiness", label: "HST Readiness", weight: 5 },
  { key: "reportingCompliance", label: "Reporting Compliance", weight: 5 },
] as const

type MetricKey = (typeof METRICS)[number]["key"]

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "bg-green-500 text-white"
    case "B": return "bg-blue-500 text-white"
    case "C": return "bg-yellow-500 text-white"
    case "D": return "bg-orange-500 text-white"
    case "F": return "bg-red-500 text-white"
    default: return "bg-gray-300 text-gray-700"
  }
}

function gradeRingColor(grade: string): string {
  switch (grade) {
    case "A": return "ring-green-500"
    case "B": return "ring-blue-500"
    case "C": return "ring-yellow-500"
    case "D": return "ring-orange-500"
    case "F": return "ring-red-500"
    default: return "ring-gray-300"
  }
}

function scoreBarColor(score: number): string {
  if (score >= 85) return "bg-green-500"
  if (score >= 70) return "bg-blue-500"
  if (score >= 55) return "bg-yellow-500"
  if (score >= 40) return "bg-orange-500"
  return "bg-red-500"
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default function KpiPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data, isLoading, isError } = useQuery<{ data: KpiResponse }>({
    queryKey: ["kpi", year, month],
    queryFn: async () => {
      const res = await fetch(`/api/kpi?year=${year}&month=${month}`)
      if (!res.ok) throw new Error("Failed to fetch KPI data")
      return res.json()
    },
  })

  function prevMonth() {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
    if (isCurrentMonth) return
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const kpi = data?.data
  const currentPeriodScore = kpi?.scores.find(
    (s) => s.period.year === year && s.period.month === month
  )

  const grade = currentPeriodScore
    ? (["A", "B", "C", "D", "F"].includes(
        (() => {
          const s = currentPeriodScore.totalScore
          if (s >= 85) return "A"
          if (s >= 70) return "B"
          if (s >= 55) return "C"
          if (s >= 40) return "D"
          return "F"
        })()
      )
        ? (() => {
            const s = currentPeriodScore.totalScore
            if (s >= 85) return "A"
            if (s >= 70) return "B"
            if (s >= 55) return "C"
            if (s >= 40) return "D"
            return "F"
          })()
        : "F")
    : null

  const totalScore = currentPeriodScore?.totalScore ?? 0

  const radarData = METRICS.map((m) => ({
    metric: m.label,
    score: currentPeriodScore?.scores[m.key as MetricKey]?.raw ?? 0,
  }))

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">KPI Scorecard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Performance metrics for the current period
          </p>
        </div>

        {/* Period Navigator */}
        <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
          <button
            onClick={prevMonth}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium w-32 text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-30"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1B4F72] border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
          Failed to load KPI data. Please try again.
        </div>
      )}

      {!isLoading && !isError && !currentPeriodScore && (
        <div className="rounded-xl border bg-card p-12 shadow-sm text-center">
          <p className="text-lg font-medium text-gray-500">No KPI data for this period yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            KPI scores are calculated after reports are submitted and approved.
          </p>
        </div>
      )}

      {!isLoading && !isError && currentPeriodScore && (
        <>
          {/* Grade + Score Hero */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Grade Circle */}
            <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col items-center justify-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Overall Grade
              </p>
              <div
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold ring-4",
                  grade ? gradeColor(grade) : "bg-gray-100 text-gray-400",
                  grade ? gradeRingColor(grade) : "ring-gray-200"
                )}
              >
                {grade ?? "—"}
              </div>
              <p className="text-2xl font-bold tabular-nums">{totalScore.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>

            {/* Radar Chart */}
            <div className="md:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-2">Performance Radar</p>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(1)}%`, "Score"]}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#1B4F72"
                    fill="#1B4F72"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metric Rows */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Metric Breakdown</h2>
            <div className="space-y-4">
              {METRICS.map((m) => {
                const metricData = currentPeriodScore.scores[m.key as MetricKey]
                const rawScore = metricData?.raw ?? 0
                const weightedScore = metricData?.weighted ?? 0
                return (
                  <div key={m.key} className="grid grid-cols-12 items-center gap-3">
                    {/* Metric name */}
                    <div className="col-span-3 text-sm font-medium text-gray-700 truncate">
                      {m.label}
                    </div>

                    {/* Weight badge */}
                    <div className="col-span-1 text-center">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {m.weight}%
                      </span>
                    </div>

                    {/* Score bar */}
                    <div className="col-span-6">
                      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            scoreBarColor(rawScore)
                          )}
                          style={{ width: `${rawScore}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rawScore.toFixed(1)}% raw
                      </p>
                    </div>

                    {/* Weighted score */}
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-semibold tabular-nums text-gray-900">
                        {weightedScore.toFixed(2)}
                      </span>
                      <p className="text-xs text-muted-foreground">weighted</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Total row */}
            <div className="mt-5 pt-4 border-t flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Total Score</span>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-full",
                    grade ? gradeColor(grade) : "bg-gray-100 text-gray-500"
                  )}
                >
                  {grade ?? "N/A"}
                </span>
                <span className="text-xl font-bold tabular-nums text-gray-900">
                  {totalScore.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
