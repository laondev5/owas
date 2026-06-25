"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ShepherdCategory } from "@/lib/constants"

// ---------- types ----------
interface Shepherd {
  _id: string
  name: string
  email: string
  shepherdTag?: string
  shepherdCategory?: ShepherdCategory
  isActive: boolean
  soulsAssigned: number
  organizationId?: { name: string; code: string }
}

// ---------- constants ----------
const CATEGORY_TABS = ["All", "YM", "YF", "M", "W"] as const
type CategoryTab = (typeof CATEGORY_TABS)[number]

const CATEGORY_COLORS: Record<ShepherdCategory, string> = {
  YM: "bg-blue-100 text-blue-700",
  YF: "bg-pink-100 text-pink-700",
  M: "bg-green-100 text-green-700",
  W: "bg-purple-100 text-purple-700",
}

const CAPACITY = 5 // max souls per shepherd

// ---------- API ----------
async function fetchShepherds(category?: string): Promise<Shepherd[]> {
  const sp = new URLSearchParams()
  if (category && category !== "All") sp.set("category", category)
  const res = await fetch(`/api/shepherds?${sp}`)
  if (!res.ok) throw new Error("Failed to fetch shepherds")
  const json = await res.json()
  return json.data as Shepherd[]
}

// ---------- Shepherd Card ----------
function ShepherdCard({ shepherd }: { shepherd: Shepherd }) {
  const pct = Math.min(100, Math.round((shepherd.soulsAssigned / CAPACITY) * 100))
  const catColor = shepherd.shepherdCategory
    ? CATEGORY_COLORS[shepherd.shepherdCategory]
    : "bg-gray-100 text-gray-600"

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm leading-tight">{shepherd.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {shepherd.organizationId?.name ?? "No branch"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Active status dot */}
          <span
            className={`inline-block h-2 w-2 rounded-full ${shepherd.isActive ? "bg-green-500" : "bg-gray-300"}`}
            title={shepherd.isActive ? "Active" : "Inactive"}
          />
          {shepherd.shepherdTag && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1B4F72]/10 text-[#1B4F72]">
              {shepherd.shepherdTag}
            </span>
          )}
        </div>
      </div>

      {/* Category chip */}
      {shepherd.shepherdCategory && (
        <div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${catColor}`}>
            {shepherd.shepherdCategory === "YM"
              ? "Young Men"
              : shepherd.shepherdCategory === "YF"
              ? "Young Female"
              : shepherd.shepherdCategory === "M"
              ? "Men"
              : "Women"}
          </span>
        </div>
      )}

      {/* Assignment stats */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Souls Assigned</span>
          <span className="font-semibold tabular-nums">
            {shepherd.soulsAssigned} / {CAPACITY}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct >= 100
                ? "bg-red-500"
                : pct >= 80
                ? "bg-[#E67E22]"
                : "bg-[#27AE60]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right">{pct}% capacity</p>
      </div>
    </div>
  )
}

// ---------- Main Page ----------
export default function ShepherdsPage() {
  const [activeTab, setActiveTab] = useState<CategoryTab>("All")

  const { data, isLoading, isError } = useQuery({
    queryKey: ["shepherds", activeTab],
    queryFn: () => fetchShepherds(activeTab),
    placeholderData: (prev) => prev,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold tracking-tight">Flight Shepherds</h1>

      {/* Category tab pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              activeTab === tab
                ? "bg-[#1B4F72] text-white border-[#1B4F72]"
                : "border-muted text-muted-foreground hover:border-[#1B4F72]/40 hover:text-[#1B4F72]"
            }`}
          >
            {tab === "All"
              ? "All"
              : tab === "YM"
              ? "Young Men"
              : tab === "YF"
              ? "Young Female"
              : tab === "M"
              ? "Men"
              : "Women"}
          </button>
        ))}
      </div>

      {/* Loading / Error states */}
      {isLoading && (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground text-sm">
          Loading shepherds...
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600 text-sm">
          Failed to load shepherds. Please try refreshing.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data?.length === 0 && (
        <div className="rounded-xl border bg-card p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center text-2xl">
            👤
          </div>
          <p className="font-medium text-muted-foreground">No flight shepherds found</p>
          {activeTab !== "All" && (
            <p className="text-sm text-muted-foreground">
              Try switching to the &ldquo;All&rdquo; tab to see everyone.
            </p>
          )}
        </div>
      )}

      {/* Cards grid */}
      {!isLoading && !isError && data && data.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {data.length} shepherd{data.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((shepherd) => (
              <ShepherdCard key={shepherd._id} shepherd={shepherd} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
