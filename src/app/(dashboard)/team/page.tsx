"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ROLE_LABELS } from "@/lib/utils"
import type { UserRole } from "@/lib/constants"
import { ChevronDown, MessageSquare, Send } from "lucide-react"

interface TeamMember {
  _id: string
  name: string
  email: string
  role: UserRole
  shepherdTag?: string
  stat: { label: string; value: string | number } | null
}

interface TeamComment {
  _id: string
  text: string
  createdAt: string
  authorId: { _id: string; name: string; role: string } | null
}

function CommentThread({ member }: { member: TeamMember }) {
  const qc = useQueryClient()
  const [text, setText] = useState("")

  const { data, isLoading } = useQuery<{ success: boolean; data: TeamComment[] }>({
    queryKey: ["team-comments", member._id],
    queryFn: () => fetch(`/api/team/${member._id}/comments`).then((r) => r.json()),
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/team/${member._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to post comment")
      return json.data
    },
    onSuccess: () => {
      setText("")
      qc.invalidateQueries({ queryKey: ["team-comments", member._id] })
      toast.success("Comment posted")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const comments = data?.data ?? []

  return (
    <div className="border-t bg-gray-50/50 p-4 space-y-3">
      {isLoading ? (
        <div className="animate-pulse h-10 rounded bg-muted" />
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">No comments yet</p>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c._id} className="p-3 rounded-lg bg-white border">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-700">{c.authorId?.name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</p>
              </div>
              <p className="text-sm text-gray-700">{c.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Leave feedback for ${member.name}…`}
          className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30"
        />
        <button
          onClick={() => text.trim() && mutation.mutate()}
          disabled={mutation.isPending || !text.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1B4F72] text-white text-sm font-medium hover:bg-[#154360] transition-colors disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function MyTeamPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery<{ success: boolean; data: TeamMember[] }>({
    queryKey: ["team"],
    queryFn: () => fetch("/api/team").then((r) => r.json()),
  })

  const members = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Team</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          The people who report directly to you — leave feedback on their activity.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-[#1B4F72]/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-3">Loading your team…</p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            You have no direct reports.
          </div>
        ) : (
          <div className="divide-y">
            {members.map((member) => {
              const isExpanded = expandedId === member._id
              return (
                <div key={member._id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : member._id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1B4F72]/10 flex items-center justify-center text-sm font-bold text-[#1B4F72] uppercase shrink-0">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.name}
                          {member.shepherdTag && <span className="ml-2 text-xs text-[#1B4F72] font-medium">{member.shepherdTag}</span>}
                        </p>
                        <p className="text-xs text-gray-500">{ROLE_LABELS[member.role]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {member.stat && (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-400">{member.stat.label}</p>
                          <p className="text-sm font-semibold text-gray-900">{member.stat.value}</p>
                        </div>
                      )}
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {isExpanded && <CommentThread member={member} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
