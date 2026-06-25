"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { cn, formatNumber } from "@/lib/utils"

type Level = "branch" | "district" | "zone"

interface LeaderboardEntry {
  rank: number
  name: string
  code: string
  soulsWon: number
  grade: "A" | "B" | "C" | "D" | "F"
  kpiScore: number
}

const LEVELS: { value: Level; label: string }[] = [
  { value: "branch", label: "Branch" },
  { value: "district", label: "District" },
  { value: "zone", label: "Zone" },
]

const MEDALS = ["🥇", "🥈", "🥉"]

const RANK_BG: Record<number, string> = {
  1: "bg-yellow-50 border-yellow-200",
  2: "bg-gray-50 border-gray-200",
  3: "bg-orange-50 border-orange-200",
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "bg-green-100 text-green-700"
    case "B": return "bg-blue-100 text-blue-700"
    case "C": return "bg-yellow-100 text-yellow-700"
    case "D": return "bg-orange-100 text-orange-700"
    case "F": return "bg-red-100 text-red-700"
    default: return "bg-gray-100 text-gray-600"
  }
}

export default function LeaderboardPage() {
  const [activeLevel, setActiveLevel] = useState<Level>("branch")

  const { data, isLoading, isError } = useQuery<{ data: LeaderboardEntry[] }>({
    queryKey: ["leaderboard", activeLevel],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?level=${activeLevel}&limit=10`)
      if (!res.ok) throw new Error("Failed to fetch leaderboard")
      return res.json()
    },
  })

  const entries = data?.data ?? []

  const chartData = entries.slice(0, 10).map((e) => ({
    name: e.code || e.name.slice(0, 12),
    soulsWon: e.soulsWon,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            OWAS Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Top performers by souls won in the last 4 weeks
          </p>
        </div>

        {/* Level Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              onClick={() => setActiveLevel(l.value)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                activeLevel === l.value
                  ? "bg-[#1B4F72] text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1B4F72] border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
          Failed to load leaderboard. Please try again.
        </div>
      )}

      {!isLoading && !isError && entries.length === 0 && (
        <div className="rounded-xl border bg-card p-12 shadow-sm text-center">
          <p className="text-lg font-medium text-gray-500">No leaderboard data yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Submit and approve reports to see rankings here.
          </p>
        </div>
      )}

      {!isLoading && !isError && entries.length > 0 && (
        <>
          {/* Horizontal Bar Chart */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Top {Math.min(entries.length, 10)} by Souls Won
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatNumber(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(v: number) => [formatNumber(v), "Souls Won"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="soulsWon"
                  fill="#1B4F72"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rankings Table */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="text-sm font-semibold text-gray-700">Full Rankings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/60">
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 w-16">
                      Rank
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600 w-24">
                      Code
                    </th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-600 w-28">
                      Souls Won
                    </th>
                    <th className="text-center px-5 py-3 font-semibold text-gray-600 w-20">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry) => (
                    <tr
                      key={entry.code}
                      className={cn(
                        "transition-colors hover:bg-gray-50",
                        RANK_BG[entry.rank] ?? "border-transparent"
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {entry.rank <= 3 ? (
                            <span className="text-xl leading-none">
                              {MEDALS[entry.rank - 1]}
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-gray-400 w-6 text-center">
                              {entry.rank}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-gray-900">{entry.name}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {entry.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-bold tabular-nums text-[#1B4F72]">
                          {formatNumber(entry.soulsWon)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold",
                            gradeColor(entry.grade)
                          )}
                        >
                          {entry.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
