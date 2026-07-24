"use client"

import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { Trophy } from "lucide-react"

interface LeaderboardEntry {
  rank: number
  name: string
  code: string
  soulsWon: number
  grade: "A" | "B" | "C" | "D" | "F"
  kpiScore: number
}

interface OrgDoc {
  _id: string
  code: string
}

const GRADE_COLOR: Record<string, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-yellow-100 text-yellow-700",
  D: "bg-orange-100 text-orange-700",
  F: "bg-red-100 text-red-700",
}

export default function RankWidget({ level }: { level: "branch" | "district" | "zone" }) {
  const { data: session } = useSession()
  const ownOrgId = session?.user?.organizationId

  const { data: orgs = [] } = useQuery<OrgDoc[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await fetch("/api/organizations")
      if (!res.ok) return []
      return (await res.json()).data as OrgDoc[]
    },
    enabled: !!session,
  })

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", level],
    queryFn: async () => {
      const res = await fetch(`/api/leaderboard?level=${level}&limit=50`)
      if (!res.ok) return []
      return (await res.json()).data as LeaderboardEntry[]
    },
    enabled: !!session,
  })

  const ownCode = orgs.find((o) => o._id === ownOrgId)?.code
  const ownEntry = leaderboard.find((e) => e.code === ownCode)

  if (!ownEntry) return null

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#E67E22]/10 flex items-center justify-center shrink-0">
          <Trophy className="h-5 w-5 text-[#E67E22]" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Rank</p>
          <p className="text-2xl font-bold text-gray-900">#{ownEntry.rank}</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${GRADE_COLOR[ownEntry.grade]}`}>
          Grade {ownEntry.grade}
        </span>
        <p className="text-xs text-muted-foreground mt-1">{ownEntry.soulsWon} souls (4 wks)</p>
      </div>
    </div>
  )
}
