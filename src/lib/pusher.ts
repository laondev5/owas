import Pusher from "pusher"

let pusherInstance: Pusher | null = null

export function getPusher(): Pusher {
  if (!pusherInstance) {
    if (
      !process.env.PUSHER_APP_ID ||
      !process.env.PUSHER_KEY ||
      !process.env.PUSHER_SECRET ||
      !process.env.PUSHER_CLUSTER
    ) {
      throw new Error("Missing Pusher server environment variables")
    }

    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    })
  }
  return pusherInstance
}

// Channel naming conventions
export const pusherChannel = {
  user: (userId: string) => `private-user-${userId}`,
  branch: (branchId: string) => `private-branch-${branchId}`,
  district: (districtId: string) => `private-district-${districtId}`,
  zone: (zoneId: string) => `private-zone-${zoneId}`,
  national: () => "private-national",
}

// Event name constants
export const PUSHER_EVENTS = {
  NOTIFICATION: "notification",
  REPORT_SUBMITTED: "report-submitted",
  CONVERT_INACTIVE: "convert-inactive",
  KPI_PUBLISHED: "kpi-published",
  SML_CERTIFIED: "sml-certified",
  REPORT_OVERDUE: "report-overdue",
} as const

export type PusherEvent = (typeof PUSHER_EVENTS)[keyof typeof PUSHER_EVENTS]

export interface PusherNotificationPayload {
  id: string
  type: string
  title: string
  body: string
  relatedEntityId?: string
  relatedEntityType?: string
  createdAt: string
}

// Trigger a notification to a specific user
export async function triggerUserNotification(
  userId: string,
  payload: PusherNotificationPayload
): Promise<void> {
  try {
    const pusher = getPusher()
    await pusher.trigger(
      pusherChannel.user(userId),
      PUSHER_EVENTS.NOTIFICATION,
      payload
    )
  } catch (error) {
    // Never let Pusher failure block the main operation
    console.error("Pusher trigger failed:", error)
  }
}

// Trigger event to an org-level channel (e.g., new branch report submitted)
export async function triggerOrgEvent(
  level: "branch" | "district" | "zone" | "national",
  entityId: string,
  event: PusherEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const pusher = getPusher()
    const channelMap = {
      branch: pusherChannel.branch(entityId),
      district: pusherChannel.district(entityId),
      zone: pusherChannel.zone(entityId),
      national: pusherChannel.national(),
    }
    await pusher.trigger(channelMap[level], event, payload)
  } catch (error) {
    console.error("Pusher org event failed:", error)
  }
}
