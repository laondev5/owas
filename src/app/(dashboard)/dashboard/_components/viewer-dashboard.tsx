"use client"

import { useQuery } from "@tanstack/react-query"
import { formatNumber } from "@/lib/utils"

const QUOTES = [
  "The harvest is plentiful, but the workers are few. — Matthew 9:37",
  "Go into all the world and preach the gospel to all creation. — Mark 16:15",
  "I will make you fishers of men. — Matthew 4:19",
]

export default function ViewerDashboard() {
  const { data, isLoading } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["progress"],
    queryFn: () => fetch("/api/progress").then((r) => r.json()),
  })

  const progress = data?.data
  const pct = Math.min(100, progress?.percentComplete ?? 0)
  const quote = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">OWAS Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">7 Million Souls National Progress</p>
      </div>

      <div className="rounded-xl border bg-gradient-to-r from-[#1B4F72] to-[#154360] p-6 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-2">7 Million Souls Mandate</p>
        <div className="flex items-end justify-between mb-4">
          <p className="text-3xl font-bold">{isLoading ? "..." : formatNumber(progress?.totalSoulsWon ?? 0)}</p>
          <p className="text-4xl font-bold text-[#E67E22]">{pct.toFixed(1)}%</p>
        </div>
        <div className="w-full bg-white/20 rounded-full h-3">
          <div className="bg-[#E67E22] h-3 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-blue-200 mt-2">of 7,000,000 target souls</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Souls Won", value: progress?.totalSoulsWon },
          { label: "Souls This Month", value: progress?.soulsThisMonth },
          { label: "Weekly Rate", value: progress?.weeklyRate },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{s.label}</p>
            {isLoading ? (
              <div className="animate-pulse h-8 w-20 rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold text-gray-900">{formatNumber(s.value ?? 0)}</p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-[#FFF8F0] border-[#E67E22]/30 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#E67E22] mb-3">Word of Encouragement</p>
        <p className="text-base italic text-gray-700">&ldquo;{quote}&rdquo;</p>
        <p className="text-xs text-muted-foreground mt-3">— Living Faith Foundation, OWAS Platform</p>
      </div>
    </div>
  )
}
