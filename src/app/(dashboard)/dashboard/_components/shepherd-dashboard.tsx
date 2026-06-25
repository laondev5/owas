"use client"

import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { formatNumber } from "@/lib/utils"
import Link from "next/link"

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

const contactBadge = (days: number) => {
  if (days <= 7) return "bg-green-100 text-green-700"
  if (days <= 14) return "bg-yellow-100 text-yellow-700"
  if (days <= 21) return "bg-orange-100 text-orange-700"
  return "bg-red-100 text-red-700"
}

export default function ShepherdDashboard() {
  const { data: session } = useSession()

  const { data: soulsData, isLoading } = useQuery<{ success: boolean; data: { souls: any[]; total: number } }>({
    queryKey: ["my-souls"],
    queryFn: () => fetch("/api/souls?limit=50").then((r) => r.json()),
    enabled: !!session,
  })

  const { data: reportData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["shepherd-report"],
    queryFn: () => fetch("/api/reports/shepherd").then((r) => r.json()),
    enabled: !!session,
  })

  const souls = soulsData?.data?.souls ?? []
  const total = soulsData?.data?.total ?? 0
  const active = souls.filter((s: any) => s.status === "active").length
  const inactive = souls.filter((s: any) => s.status === "inactive").length

  const hasReport = (reportData?.data?.length ?? 0) > 0

  const stages: Record<string, string> = {
    familyClass: "Family Class",
    responsibilityClass: "Resp. Class",
    sortingOut: "Sorting Out",
    hsos: "HSOS",
    zibi: "ZIBI",
  }

  const getHighestStage = (s: any) => {
    const stage = s.integrationStage ?? {}
    for (const key of ["zibi", "hsos", "sortingOut", "responsibilityClass", "familyClass"]) {
      if (stage[key + "Completed"] || stage[key + "Enrolled"]) return stages[key]
    }
    return "New Convert"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Shepherd Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your converts at a glance</p>
      </div>

      <div className={`rounded-xl border p-4 text-sm flex items-center justify-between ${
        hasReport ? "bg-green-50 border-green-300 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"
      }`}>
        <span>{hasReport ? "✓ Shepherd report submitted this week" : "Shepherd report not submitted yet this week"}</span>
        {!hasReport && (
          <Link href="/report/shepherd" className="text-xs font-semibold underline">Submit now →</Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Assigned Converts", value: total },
          { label: "Active", value: active },
          { label: "Inactive", value: inactive },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{s.label}</p>
            {isLoading ? (
              <div className="animate-pulse h-8 w-16 rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold text-gray-900">{formatNumber(s.value)}</p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">My Converts</h2>
          <Link href="/souls" className="text-xs text-[#1B4F72] font-medium hover:underline">View all →</Link>
        </div>
        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="animate-pulse h-10 rounded bg-muted" />)}</div>
        ) : souls.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {["Name", "Status", "Stage", "Last Contact"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {souls.map((s: any) => {
                  const days = s.lastContactDate ? daysSince(s.lastContactDate) : 999
                  return (
                    <tr key={s._id} className="border-b border-muted/50 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{s.fullName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          s.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{getHighestStage(s)}</td>
                      <td className="px-4 py-3">
                        {s.lastContactDate ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${contactBadge(days)}`}>
                            {days}d ago
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Never</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-center text-muted-foreground py-8">No converts assigned yet</p>
        )}
      </div>
    </div>
  )
}
