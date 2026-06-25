"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { cn, formatNumber } from "@/lib/utils"
import { BookOpen, CheckCircle, Users, Filter } from "lucide-react"

interface SoulBranch {
  _id: string
  name: string
  code: string
}

interface IntegrationStage {
  sortingOutEnrolled?: string
  sortingOutCompleted?: string
  sip101Enrolled?: string
  sip101Completed?: string
  sip102Enrolled?: string
  sip102Completed?: string
  sip103Enrolled?: string
  sip103Completed?: string
  projectCompleted?: string
}

interface SoulRecord {
  _id: string
  fullName: string
  shepherdTag?: string
  branchId: SoulBranch | string
  status: string
  integrationStage: IntegrationStage
  createdAt: string
}

interface SoulsApiResponse {
  souls: SoulRecord[]
  total: number
}

function getSipProgress(stage: IntegrationStage): {
  label: string
  percent: number
  completedSteps: number
  totalSteps: number
} {
  const steps = [
    !!stage.sip101Enrolled,
    !!stage.sip101Completed,
    !!stage.sip102Enrolled,
    !!stage.sip102Completed,
    !!stage.sip103Enrolled,
    !!stage.sip103Completed,
    !!stage.projectCompleted,
  ]
  const completedSteps = steps.filter(Boolean).length
  const totalSteps = steps.length
  const percent = Math.round((completedSteps / totalSteps) * 100)

  let label = "SIP 101"
  if (stage.sip103Completed) label = "SIP 103 Done"
  else if (stage.sip103Enrolled) label = "SIP 103"
  else if (stage.sip102Completed) label = "SIP 102 Done"
  else if (stage.sip102Enrolled) label = "SIP 102"
  else if (stage.sip101Completed) label = "SIP 101 Done"

  return { label, percent, completedSteps, totalSteps }
}

function getBranchName(branchId: SoulBranch | string): string {
  if (typeof branchId === "object" && branchId?.name) return branchId.name
  return "Unknown Branch"
}

function getBranchCode(branchId: SoulBranch | string): string {
  if (typeof branchId === "object" && branchId?.code) return branchId.code
  return "???"
}

function getSipStartDate(stage: IntegrationStage): string {
  const date = stage.sortingOutCompleted || stage.sip101Enrolled
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function SipPage() {
  const { data: session } = useSession()
  const [branchFilter, setBranchFilter] = useState<string>("all")

  const { data, isLoading, isError } = useQuery<{ data: SoulsApiResponse }>({
    queryKey: ["souls-sip", session?.user?.organizationId],
    queryFn: async () => {
      const res = await fetch("/api/souls?status=active&limit=100")
      if (!res.ok) throw new Error("Failed to fetch souls")
      return res.json()
    },
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  })

  // Filter souls who have entered SIP (sortingOut enrolled at minimum)
  const sipSouls = useMemo(() => {
    const souls = data?.data?.souls ?? []
    return souls.filter(
      (s) =>
        s.integrationStage?.sortingOutEnrolled ||
        s.integrationStage?.sip101Enrolled
    )
  }, [data])

  // Unique branches for filter
  const branches = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; code: string }>()
    sipSouls.forEach((s) => {
      if (typeof s.branchId === "object" && s.branchId?._id) {
        seen.set(s.branchId._id, {
          id: s.branchId._id,
          name: s.branchId.name,
          code: s.branchId.code,
        })
      }
    })
    return Array.from(seen.values())
  }, [sipSouls])

  const filtered = useMemo(() => {
    if (branchFilter === "all") return sipSouls
    return sipSouls.filter((s) => {
      if (typeof s.branchId === "object") return s.branchId._id === branchFilter
      return s.branchId === branchFilter
    })
  }, [sipSouls, branchFilter])

  const totalEnrolled = sipSouls.length
  const completedThisMonth = sipSouls.filter((s) => {
    const completed = s.integrationStage?.projectCompleted
    if (!completed) return false
    const d = new Date(completed)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
  const activeCohorts = branches.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">SIP Cohorts</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Sorted-In Programme — discipleship tracking
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <BookOpen className="h-5 w-5 text-[#1B4F72] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#1B4F72]">
          <strong>SIP</strong> tracks converts who have completed the Sorting Out stage and are
          enrolled in deeper discipleship. SIP has three modules (101, 102, 103) culminating
          in a ministry project and SML certification.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[#1B4F72]/10 text-[#1B4F72]">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Total Enrolled</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {formatNumber(totalEnrolled)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-100 text-green-700">
              <CheckCircle className="h-4 w-4" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">
              Completed This Month
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {formatNumber(completedThisMonth)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[#E67E22]/10 text-[#E67E22]">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Active Cohorts</span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {formatNumber(activeCohorts)}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1B4F72] border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
          Failed to load SIP data. Please try again.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* Branch Filter */}
          {branches.length > 0 && (
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by branch:</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="text-sm border rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 shadow-sm text-center">
              <p className="text-lg font-medium text-gray-500">No SIP cohorts data yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Converts who complete the Sorting Out stage will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/60">
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600 w-32">
                        Shepherd Tag
                      </th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Branch</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600 w-36">
                        SIP Start Date
                      </th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600 w-48">
                        Progress
                      </th>
                      <th className="text-center px-5 py-3 font-semibold text-gray-600 w-24">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((soul) => {
                      const progress = getSipProgress(soul.integrationStage)
                      const isComplete = !!soul.integrationStage?.projectCompleted
                      return (
                        <tr key={soul._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-medium text-gray-900">{soul.fullName}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {soul.shepherdTag ?? "—"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600">
                            {getBranchName(soul.branchId)}
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              ({getBranchCode(soul.branchId)})
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 text-xs">
                            {getSipStartDate(soul.integrationStage)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    isComplete ? "bg-green-500" : "bg-[#1B4F72]"
                                  )}
                                  style={{ width: `${progress.percent}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-16 text-right">
                                {progress.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={cn(
                                "text-xs font-semibold px-2 py-0.5 rounded-full",
                                isComplete
                                  ? "bg-green-100 text-green-700"
                                  : "bg-blue-100 text-blue-700"
                              )}
                            >
                              {isComplete ? "Complete" : "Active"}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t text-xs text-muted-foreground">
                Showing {filtered.length} of {sipSouls.length} SIP participants
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
