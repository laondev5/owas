"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { getPusherClient } from "@/lib/pusher-client"
import { PUSHER_EVENTS, type PusherNotificationPayload } from "@/lib/pusher"
import { Bell } from "lucide-react"
import { toast } from "sonner"

const MAX_STORED = 20

export function NotificationBell() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<PusherNotificationPayload[]>([])
  const [open, setOpen] = useState(false)
  const unreadCount = notifications.filter((n) => !("read" in n && n.read)).length

  const addNotification = useCallback((payload: PusherNotificationPayload) => {
    setNotifications((prev) => [payload, ...prev].slice(0, MAX_STORED))
    toast(payload.title, { description: payload.body })
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return

    let channel: ReturnType<ReturnType<typeof getPusherClient>["subscribe"]> | null = null

    try {
      const pusher = getPusherClient()
      const channelName = `private-user-${session.user.id}`
      channel = pusher.subscribe(channelName)
      channel.bind(PUSHER_EVENTS.NOTIFICATION, addNotification)
      channel.bind(PUSHER_EVENTS.REPORT_OVERDUE, (payload: PusherNotificationPayload) => {
        addNotification({ ...payload, type: "overdue" })
      })
    } catch (e) {
      // Pusher not configured yet — silent in dev
    }

    return () => {
      channel?.unbind_all()
      channel?.unsubscribe()
    }
  }, [session?.user?.id, addNotification])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v)
          if (!open) markAllRead()
        }}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-secondary text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 z-20 rounded-xl border bg-popover shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold">Notifications</p>
              {notifications.length > 0 && (
                <button
                  onClick={() => setNotifications([])}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
