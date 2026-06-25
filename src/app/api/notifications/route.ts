import { connectDB } from "@/lib/db"
import { Notification } from "@/lib/models/Notification"
import { withAuth, ok, err } from "@/lib/api-helpers"
import mongoose from "mongoose"

// GET /api/notifications — fetch notifications for current user
export const GET = withAuth(async (_req, { session }) => {
  await connectDB()

  const notifications = await Notification.find({
    recipientId: new mongoose.Types.ObjectId(session.user.id),
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  const unreadCount = notifications.filter((n) => n.status !== "read").length

  return ok({ notifications, unreadCount })
}, "viewer")

// PATCH /api/notifications — mark notifications as read
export const PATCH = withAuth(async (req, { session }) => {
  const body = await req.json()

  await connectDB()

  if (body.all === true) {
    // Mark all notifications for this user as read
    await Notification.updateMany(
      {
        recipientId: new mongoose.Types.ObjectId(session.user.id),
        status: { $ne: "read" },
      },
      { $set: { status: "read" } }
    )
    return ok({ message: "All notifications marked as read" })
  }

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const validIds = (body.ids as string[]).filter((id) => mongoose.Types.ObjectId.isValid(id))
    if (validIds.length === 0) return err("No valid notification IDs provided")

    await Notification.updateMany(
      {
        _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
        recipientId: new mongoose.Types.ObjectId(session.user.id), // enforce ownership
      },
      { $set: { status: "read" } }
    )
    return ok({ message: "Notifications marked as read", count: validIds.length })
  }

  return err("Provide { ids: string[] } or { all: true }")
}, "viewer")
