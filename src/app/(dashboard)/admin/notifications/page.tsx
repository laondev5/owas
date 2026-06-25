"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Bell,
  BellOff,
  Clock,
  AlertTriangle,
  Award,
  BarChart2,
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  ChevronRight,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationStatus = "pending" | "sent" | "failed" | "read"
type NotificationType =
  | "report_reminder"
  | "report_overdue"
  | "convert_inactive"
  | "sml_certified"
  | "kpi_published"
  | "escalation"
  | "digest"

interface NotificationDoc {
  _id: string
  recipientId: string
  type: NotificationType
  channel: string
  title: string
  body: string
  status: NotificationStatus
  createdAt: string
}

type Tab = "all" | "unread" | "read"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString("en-NG", { day: "2-digit", month: "short" })
}

const TYPE_ICON: Record<NotificationType, React.ElementType> = {
  report_reminder: Clock,
  report_overdue: AlertTriangle,
  convert_inactive: BellOff,
  sml_certified: Award,
  kpi_published: BarChart2,
  escalation: ArrowUpRight,
  digest: BookOpen,
}

const TYPE_COLOR: Record<NotificationType, string> = {
  report_reminder: "bg-blue-100 text-blue-600",
  report_overdue: "bg-red-100 text-red-600",
  convert_inactive: "bg-orange-100 text-orange-600",
  sml_certified: "bg-yellow-100 text-yellow-600",
  kpi_published: "bg-purple-100 text-purple-600",
  escalation: "bg-rose-100 text-rose-600",
  digest: "bg-gray-100 text-gray-600",
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchNotifications(): Promise<{
  notifications: NotificationDoc[]
  unreadCount: number
}> {
  const res = await fetch("/api/notifications")
  if (!res.ok) throw new Error("Failed to fetch notifications")
  const json = await res.json()
  return json.data
}

async function markRead(payload: { ids?: string[]; all?: boolean }) {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? "Failed to update notifications")
  return json.data
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>("all")
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 60_000, // refresh every minute
  })

  const markMut = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const notifications = data?.notifications ?? []

  const filtered = notifications.filter((n) => {
    if (tab === "unread") return n.status !== "read"
    if (tab === "read") return n.status === "read"
    return true
  })

  const unreadCount = notifications.filter((n) => n.status !== "read").length

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "all", label: "All", count: notifications.length },
    { id: "unread", label: "Unread", count: unreadCount },
    { id: "read", label: "Read" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <span>Admin</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700 font-medium">Notifications</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              You have{" "}
              <span className="font-semibold text-[#E67E22]">{unreadCount} unread</span>{" "}
              notification{unreadCount !== 1 ? "s" : ""}.
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markMut.mutate({ all: true })}
            disabled={markMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5",
              tab === t.id
                ? "text-[#1B4F72] border-b-2 border-[#1B4F72] -mb-px"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs font-semibold",
                  tab === t.id ? "bg-[#1B4F72] text-white" : "bg-gray-100 text-gray-600"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#1B4F72]/40 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-3">Loading notifications…</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 text-sm">
            Failed to load notifications. Please refresh.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">No notifications</p>
            <p className="text-gray-300 text-xs mt-1">
              {tab === "unread" ? "You're all caught up!" : "Nothing to show here."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell
              const colorClass = TYPE_COLOR[n.type] ?? "bg-gray-100 text-gray-500"
              const isUnread = n.status !== "read"

              return (
                <li
                  key={n._id}
                  onClick={() => {
                    if (isUnread) markMut.mutate({ ids: [n._id] })
                  }}
                  className={cn(
                    "flex items-start gap-4 px-5 py-4 transition-colors",
                    isUnread
                      ? "bg-blue-50/40 hover:bg-blue-50/80 cursor-pointer"
                      : "hover:bg-gray-50/60"
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
                      colorClass
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm leading-snug",
                          isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                        )}
                      >
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#E67E22] flex-shrink-0" />
                        )}
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {relativeTime(n.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1 capitalize">
                      via {n.channel} &bull; {n.type.replace(/_/g, " ")}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
