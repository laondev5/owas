"use client"

import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { MessageSquare } from "lucide-react"

interface FeedbackComment {
  _id: string
  text: string
  createdAt: string
  authorId: { name: string; role: string } | null
}

export default function SupervisorFeedbackCard() {
  const { data: session } = useSession()
  const selfId = session?.user?.id

  const { data } = useQuery<{ success: boolean; data: FeedbackComment[] }>({
    queryKey: ["my-supervisor-feedback", selfId],
    queryFn: () => fetch(`/api/team/${selfId}/comments`).then((r) => r.json()),
    enabled: !!selfId,
  })

  const comments = data?.data ?? []
  if (comments.length === 0) return null

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-4 w-4 text-[#1B4F72]" />
        <h2 className="text-sm font-semibold text-gray-900">Feedback From Your Supervisor</h2>
      </div>
      <div className="space-y-3">
        {comments.slice(0, 5).map((c) => (
          <div key={c._id} className="p-3 rounded-lg bg-muted/30 border border-muted/50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-gray-700">{c.authorId?.name ?? "Supervisor"}</p>
              <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</p>
            </div>
            <p className="text-sm text-gray-700">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
