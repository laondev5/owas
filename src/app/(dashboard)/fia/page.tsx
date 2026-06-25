"use client"

import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts"
import { cn, formatNumber } from "@/lib/utils"
import { Info } from "lucide-react"
import type { UserRole } from "@/lib/models/User"

interface FiaActivity {
  enrolled: number
  completed: number
}

interface FiaFigures {
  familyClass: FiaActivity
  responsibilityClass: FiaActivity
  sortingOut: FiaActivity
  hsos: FiaActivity
  zibi: FiaActivity
}

interface BranchReportDoc {
  _id: string
  fia: FiaFigures
  weekEnding: string
}

const FIA_STAGES = [
  {
    key: "familyClass" as keyof FiaFigures,
    label: "Family Class",
    shortLabel: "FC",
    description: "Initial integration class for new converts — covers basic Christian foundations.",
    color: "#1B4F72",
  },
  {
    key: "responsibilityClass" as keyof FiaFigures,
    label: "Responsibility Class",
    shortLabel: "RC",
    description: "Teaches converts their responsibilities as members of the local church.",
    color: "#2980B9",
  },
  {
    key: "sortingOut" as keyof FiaFigures,
    label: "Sorting Out",
    shortLabel: "SO",
    description: "A filtering stage to identify converts ready for deeper SIP discipleship.",
    color: "#E67E22",
  },
  {
    key: "hsos" as keyof FiaFigures,
    label: "HSOS",
    shortLabel: "HSOS",
    description: "Higher School of Servants — advanced leadership and ministry training.",
    color: "#27AE60",
  },
  {
    key: "zibi" as keyof FiaFigures,
    label: "ZIBI",
    shortLabel: "ZIBI",
    description: "Zonal Integration and Building Initiative — final stage before SML certification.",
    color: "#8E44AD",
  },
]

const BRANCH_LEVEL_ROLES: UserRole[] = [
  "branch_coordinator",
  "chief_trainer",
  "mission_field_coordinator",
  "flight_shepherd",
]

function isBranchRole(role: UserRole | undefined): boolean {
  return BRANCH_LEVEL_ROLES.includes(role as UserRole)
}

export default function FiaPage() {
  const { data: session } = useSession()
  const role = session?.user?.role as UserRole | undefined
  const organizationId = session?.user?.organizationId

  // Build the correct API URL based on role
  // Branch-level roles: /api/reports/branch?branchId=...
  // Higher roles: fetch district or zone report summaries via national reports or branch aggregation
  const apiUrl = organizationId
    ? isBranchRole(role)
      ? `/api/reports/branch?branchId=${organizationId}&limit=1`
      : `/api/reports/branch?branchId=${organizationId}&limit=1`
    : null

  const { data, isLoading, isError } = useQuery<{ data: BranchReportDoc[] }>({
    queryKey: ["fia-reports", organizationId, role],
    queryFn: async () => {
      if (!apiUrl) throw new Error("No organization ID")
      const res = await fetch(apiUrl)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? "Failed to fetch FIA data")
      }
      return res.json()
    },
    enabled: !!apiUrl,
    staleTime: 5 * 60 * 1000,
  })

  const reports = Array.isArray(data?.data) ? data!.data : []
  const latestReport = reports[0]
  const fia: FiaFigures | null = latestReport?.fia ?? null

  const hasData = fia !== null && FIA_STAGES.some((s) => (fia[s.key]?.enrolled ?? 0) > 0)

  const chartData = FIA_STAGES.map((stage) => ({
    name: stage.shortLabel,
    fullName: stage.label,
    enrolled: fia?.[stage.key]?.enrolled ?? 0,
    completed: fia?.[stage.key]?.completed ?? 0,
    color: stage.color,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          FIA Integration Tracker
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Family Integration Approach — 5-stage convert discipleship pipeline
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Info className="h-5 w-5 text-[#1B4F72] flex-shrink-0 mt-0.5" />
        <div className="text-sm text-[#1B4F72]">
          <p>
            <strong>FIA</strong> is a structured integration pathway that moves converts from
            initial outreach through 5 stages of discipleship: Family Class → Responsibility
            Class → Sorting Out → HSOS → ZIBI. Each stage deepens spiritual maturity and
            church involvement.
          </p>
        </div>
      </div>

      {(isLoading || !session) && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1B4F72] border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
          Failed to load FIA data. Branch-level coordinators can view their branch data. Higher
          roles should view this from a branch context.
        </div>
      )}

      {!isLoading && session && !isError && (
        <>
          {!hasData ? (
            <div className="rounded-xl border bg-card p-12 shadow-sm text-center">
              <p className="text-lg font-medium text-gray-500">No FIA data available yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Submit branch reports with FIA figures to see the integration funnel here.
              </p>
            </div>
          ) : (
            <>
              {/* Funnel Chart */}
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Integration Funnel — Enrolled by Stage
                  </h2>
                  {latestReport && (
                    <span className="text-xs text-muted-foreground">
                      Week ending:{" "}
                      {new Date(latestReport.weekEnding).toLocaleDateString("en-NG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatNumber(v)}
                      width={50}
                    />
                    <Tooltip
                      formatter={(v: number, name: string) => [
                        formatNumber(v),
                        name === "enrolled" ? "Enrolled" : "Completed",
                      ]}
                      labelFormatter={(label, payload: { payload?: { fullName?: string } }[]) => {
                        const item = payload?.[0]?.payload
                        return item?.fullName ?? label
                      }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="enrolled" radius={[4, 4, 0, 0]} maxBarSize={64} name="enrolled">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                    <Bar
                      dataKey="completed"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={64}
                      name="completed"
                      fill="#27AE60"
                      opacity={0.5}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-[#1B4F72]" />
                    <span className="text-xs text-muted-foreground">Enrolled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-green-400 opacity-70" />
                    <span className="text-xs text-muted-foreground">Completed</span>
                  </div>
                </div>
              </div>

              {/* Visual Funnel — custom CSS horizontal bars */}
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Pipeline View</h2>
                <div className="space-y-3">
                  {(() => {
                    const maxEnrolled = Math.max(
                      ...FIA_STAGES.map((s) => fia?.[s.key]?.enrolled ?? 0),
                      1
                    )
                    return FIA_STAGES.map((stage) => {
                      const enrolled = fia?.[stage.key]?.enrolled ?? 0
                      const pct = (enrolled / maxEnrolled) * 100
                      return (
                        <div key={stage.key} className="flex items-center gap-3">
                          <div className="w-36 text-xs font-medium text-gray-600 text-right shrink-0">
                            {stage.label}
                          </div>
                          <div className="flex-1 h-8 rounded-md bg-gray-100 overflow-hidden relative">
                            <div
                              className="h-full rounded-md flex items-center px-3 transition-all duration-700"
                              style={{
                                width: `${Math.max(pct, 2)}%`,
                                backgroundColor: stage.color,
                              }}
                            >
                              <span className="text-white text-xs font-semibold whitespace-nowrap">
                                {formatNumber(enrolled)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Summary Table */}
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b">
                  <h2 className="text-sm font-semibold text-gray-700">Stage Summary</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50/60">
                        <th className="text-left px-5 py-3 font-semibold text-gray-600">
                          Stage
                        </th>
                        <th className="text-right px-5 py-3 font-semibold text-gray-600 w-28">
                          Enrolled
                        </th>
                        <th className="text-right px-5 py-3 font-semibold text-gray-600 w-28">
                          Completed
                        </th>
                        <th className="text-right px-5 py-3 font-semibold text-gray-600 w-36">
                          Completion Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {FIA_STAGES.map((stage) => {
                        const enrolled = fia?.[stage.key]?.enrolled ?? 0
                        const completed = fia?.[stage.key]?.completed ?? 0
                        const rate = enrolled > 0 ? (completed / enrolled) * 100 : 0
                        return (
                          <tr
                            key={stage.key}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: stage.color }}
                                />
                                <span className="font-medium text-gray-900">
                                  {stage.label}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right tabular-nums font-medium">
                              {formatNumber(enrolled)}
                            </td>
                            <td className="px-5 py-3.5 text-right tabular-nums text-green-700 font-medium">
                              {formatNumber(completed)}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-green-500"
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                                <span
                                  className={cn(
                                    "text-xs font-semibold tabular-nums w-12 text-right",
                                    rate >= 70
                                      ? "text-green-700"
                                      : rate >= 40
                                      ? "text-yellow-700"
                                      : "text-red-600"
                                  )}
                                >
                                  {rate.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stage Legend */}
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Stage Legend</h2>
                <div className="space-y-2.5">
                  {FIA_STAGES.map((stage) => (
                    <div key={stage.key} className="flex items-start gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-800">
                          {stage.label}
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">
                          — {stage.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
