"use client"

import { useQuery } from "@tanstack/react-query"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts"
import { formatNumber } from "@/lib/utils"
import { Target, TrendingUp, Calendar, Zap } from "lucide-react"

interface ProgressResponse {
  totalSoulsWon: number
  percentComplete: number
  targetSouls: number
  projectedYear: number | null
  weeklyRate: number
  soulsThisMonth: number
  sparkline: Array<{ label: string; soulsWon: number }>
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-[#1B4F72]/10 text-[#1B4F72]">{icon}</div>
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

const MILESTONES = [
  { pct: 25, label: "25%" },
  { pct: 50, label: "50%" },
  { pct: 75, label: "75%" },
]

export default function ProgressPage() {
  const { data, isLoading, isError } = useQuery<{ data: ProgressResponse }>({
    queryKey: ["7m-progress"],
    queryFn: async () => {
      const res = await fetch("/api/progress")
      if (!res.ok) throw new Error("Failed to fetch progress data")
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const progress = data?.data

  const totalSoulsWon = progress?.totalSoulsWon ?? 0
  const percentComplete = progress?.percentComplete ?? 0
  const targetSouls = progress?.targetSouls ?? 7_000_000
  const projectedYear = progress?.projectedYear
  const weeklyRate = progress?.weeklyRate ?? 0
  const soulsThisMonth = progress?.soulsThisMonth ?? 0
  const sparkline = progress?.sparkline ?? []

  // SVG arc progress indicator
  const radius = 90
  const stroke = 14
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentComplete / 100) * circumference

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          7 Million Souls Mandate
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tracking our national evangelism target
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1B4F72] border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
          Failed to load progress data. Please try again.
        </div>
      )}

      {!isLoading && (
        <>
          {/* Hero Section */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* SVG Arc Progress */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
                  {/* Track */}
                  <circle
                    stroke="#e5e7eb"
                    fill="transparent"
                    strokeWidth={stroke}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                  />
                  {/* Progress */}
                  <circle
                    stroke="#E67E22"
                    fill="transparent"
                    strokeWidth={stroke}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                  />
                </svg>
                <div className="mt-[-50%] translate-y-[-50%] text-center pointer-events-none">
                  <p className="text-3xl font-bold tabular-nums text-gray-900">
                    {percentComplete.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground">complete</p>
                </div>
              </div>

              {/* Text info */}
              <div className="flex-1 text-center md:text-left">
                <p className="text-4xl font-extrabold tabular-nums text-[#1B4F72]">
                  {formatNumber(totalSoulsWon)}
                </p>
                <p className="text-lg text-muted-foreground mt-1">
                  souls won of{" "}
                  <span className="font-semibold text-gray-700">
                    {formatNumber(targetSouls)}
                  </span>{" "}
                  target
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  Remaining:{" "}
                  <span className="font-semibold text-gray-700">
                    {formatNumber(Math.max(0, targetSouls - totalSoulsWon))} souls
                  </span>
                </p>
              </div>
            </div>

            {/* Wide progress bar with milestones */}
            <div className="mt-6">
              <div className="relative h-5 rounded-full bg-gray-100 overflow-visible">
                {/* Fill */}
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-[#E67E22] transition-all duration-1000"
                  style={{ width: `${Math.min(100, percentComplete)}%` }}
                />
                {/* Milestone markers */}
                {MILESTONES.map((m) => (
                  <div
                    key={m.pct}
                    className="absolute top-0 h-full flex flex-col items-center"
                    style={{ left: `${m.pct}%` }}
                  >
                    <div className="w-0.5 h-full bg-white/60" />
                    <span className="absolute -bottom-5 text-[10px] text-muted-foreground -translate-x-1/2">
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>{formatNumber(targetSouls)}</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Target className="h-4 w-4" />}
              label="% Complete"
              value={`${percentComplete.toFixed(2)}%`}
              sub="of 7 million target"
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Souls This Month"
              value={formatNumber(soulsThisMonth)}
              sub="current reporting period"
            />
            <StatCard
              icon={<Calendar className="h-4 w-4" />}
              label="Projected Year"
              value={projectedYear ? String(projectedYear) : "N/A"}
              sub={projectedYear ? "estimated completion" : "insufficient data"}
            />
            <StatCard
              icon={<Zap className="h-4 w-4" />}
              label="Weekly Rate"
              value={formatNumber(weeklyRate)}
              sub="souls per week (avg)"
            />
          </div>

          {/* Monthly Trend Chart */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Monthly Souls Won Trend
            </h2>
            {sparkline.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No monthly data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sparkline} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatNumber(v)}
                    width={60}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatNumber(v), "Souls Won"]}
                    labelStyle={{ color: "#374151", fontWeight: 600 }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="soulsWon"
                    fill="#E67E22"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={64}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  )
}
