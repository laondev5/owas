"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

// ---------- types ----------
interface Organization {
  _id: string
  name: string
  code: string
}

interface SmlSoul {
  _id: string
  fullName: string
  phone?: string
  shepherdTag?: string
  status: string
  integrationStage: {
    zibiCompleted?: string
    smlCertifiedDate?: string
  }
  branchId?: { _id: string; name: string; code: string }
  assignedShepherdId?: { name: string; shepherdTag?: string }
  dateWon?: string
}

// ---------- API ----------
async function fetchOrganizations(type: string): Promise<Organization[]> {
  const res = await fetch(`/api/organizations?type=${type}`)
  if (!res.ok) throw new Error("Failed to fetch organizations")
  const json = await res.json()
  return json.data as Organization[]
}

async function fetchSmlCandidates(branchId?: string): Promise<SmlSoul[]> {
  const sp = new URLSearchParams()
  sp.set("limit", "100")
  // Fetch all active souls — we filter for ZIBI-completed client-side
  // (a dedicated /api/souls?stage=zibi endpoint would be cleaner but isn't available yet)
  if (branchId) sp.set("branchId", branchId)
  const res = await fetch(`/api/souls?${sp}`)
  if (!res.ok) throw new Error("Failed to fetch souls")
  const json = await res.json()
  const all = (json.data?.souls ?? []) as SmlSoul[]
  // Filter to only ZIBI-completed souls
  return all.filter((s) => s.integrationStage?.zibiCompleted)
}

// ---------- helpers ----------
function certMonth(souls: SmlSoul[]): number {
  const now = new Date()
  return souls.filter((s) => {
    const d = s.integrationStage.smlCertifiedDate
      ? new Date(s.integrationStage.smlCertifiedDate)
      : s.integrationStage.zibiCompleted
      ? new Date(s.integrationStage.zibiCompleted)
      : null
    if (!d) return false
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
}

function uniqueBranches(souls: SmlSoul[]): number {
  return new Set(souls.map((s) => s.branchId?._id).filter(Boolean)).size
}

// ---------- Summary Card ----------
function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold tabular-nums text-[#1B4F72]">{value}</p>
    </div>
  )
}

// ---------- Main Page ----------
export default function SmlPage() {
  const [branchFilter, setBranchFilter] = useState("")

  const { data: branches } = useQuery({
    queryKey: ["orgs-branch"],
    queryFn: () => fetchOrganizations("branch"),
    staleTime: 5 * 60 * 1000,
  })

  const { data: smls, isLoading, isError } = useQuery({
    queryKey: ["sml-candidates", branchFilter],
    queryFn: () => fetchSmlCandidates(branchFilter || undefined),
    placeholderData: (prev) => prev,
  })

  const totalSmls = smls?.length ?? 0
  const certifiedThisMonth = smls ? certMonth(smls) : 0
  const branchesCovered = smls ? uniqueBranches(smls) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SML Registry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Soulwinning Mission Leaders — converts who have completed the ZIBI integration stage
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Total SMLs" value={totalSmls} />
        <SummaryCard label="Certified This Month" value={certifiedThisMonth} />
        <SummaryCard label="Branches Covered" value={branchesCovered} />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-muted-foreground">Filter by Branch:</label>
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30"
        >
          <option value="">All Branches</option>
          {branches?.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {["Name", "Branch", "Certification Date", "Shepherd Tag", "Status"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30 border-b"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Loading SML registry...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-red-500 text-sm">
                  Failed to load SML data. Please try again.
                </td>
              </tr>
            )}
            {!isLoading && !isError && smls?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  No SML candidates found
                  {branchFilter ? " for the selected branch" : ""}.
                </td>
              </tr>
            )}
            {smls?.map((soul) => {
              const certDate =
                soul.integrationStage.smlCertifiedDate ?? soul.integrationStage.zibiCompleted

              return (
                <tr key={soul._id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 border-b border-muted/50 font-medium">
                    {soul.fullName}
                  </td>
                  <td className="px-4 py-3 border-b border-muted/50 text-muted-foreground">
                    {soul.branchId ? (
                      <>
                        {soul.branchId.name}{" "}
                        <span className="text-xs text-muted-foreground/70">
                          ({soul.branchId.code})
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 border-b border-muted/50 whitespace-nowrap">
                    {certDate ? (
                      new Date(certDate).toLocaleDateString("en-NG", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 border-b border-muted/50">
                    {soul.shepherdTag ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1B4F72]/10 text-[#1B4F72]">
                        {soul.shepherdTag}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b border-muted/50">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#27AE60]/10 text-[#27AE60]">
                      Certified
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {smls && smls.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {smls.length} SML{smls.length !== 1 ? "s" : ""} — converts who completed the
          ZIBI integration stage
        </p>
      )}
    </div>
  )
}
