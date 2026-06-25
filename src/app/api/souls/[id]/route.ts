import { connectDB } from "@/lib/db"
import { Soul } from "@/lib/models/Soul"
import { User } from "@/lib/models/User"
import { Notification } from "@/lib/models/Notification"
import { withAuth, ok, err } from "@/lib/api-helpers"
import { triggerUserNotification } from "@/lib/pusher"
import { sendMail, convertAssignedHtml } from "@/lib/mailer"
import mongoose from "mongoose"

// GET /api/souls/[id] — single soul detail
export async function GET(req: Request, ctx: { params: { id: string } }) {
  return withAuth(async (_req, _ctx) => {
    await connectDB()
    const soul = await Soul.findById(ctx.params.id)
      .populate("branchId", "name code")
      .populate("assignedShepherdId", "name shepherdTag")
      .populate("notes.createdBy", "name")
      .lean()
    if (!soul) return err("Soul not found", 404)
    return ok(soul)
  }, "flight_shepherd")(req, ctx)
}

// PATCH /api/souls/[id] — log contact, change status, add note, reassign
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  return withAuth(async (req2, { session }) => {
    const body = await req2.json()
    await connectDB()

    const soul = await Soul.findById(ctx.params.id)
    if (!soul) return err("Soul not found", 404)

    const previousShepherdId = soul.assignedShepherdId?.toString()
    const { status, lastContactDate, note, assignedShepherdId, integrationStage } = body

    if (status) soul.status = status
    if (lastContactDate) soul.lastContactDate = new Date(lastContactDate)
    if (note?.trim()) {
      soul.notes.push({
        text: note.trim(),
        createdBy: new mongoose.Types.ObjectId(session.user.id),
        createdAt: new Date(),
      })
    }
    if (assignedShepherdId !== undefined) {
      soul.assignedShepherdId = assignedShepherdId
        ? new mongoose.Types.ObjectId(assignedShepherdId)
        : undefined
      soul.assignmentDate = assignedShepherdId ? new Date() : undefined
    }
    if (integrationStage) {
      Object.assign(soul.integrationStage, integrationStage)
    }

    await soul.save()

    const updated = await Soul.findById(soul._id)
      .populate("branchId", "name code")
      .populate("assignedShepherdId", "name shepherdTag")
      .populate("notes.createdBy", "name")
      .lean()

    // Notify new shepherd if assignment changed
    const newShepherdId = assignedShepherdId as string | undefined
    const isReassignment = newShepherdId && newShepherdId !== previousShepherdId

    if (isReassignment) {
      const convertName = soul.fullName
      const loginUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/souls`

      User.findById(newShepherdId).select("name email").lean().then((shepherd) => {
        const notifTitle = "Convert Assigned to You"
        const notifBody = `${convertName} has been assigned to you for follow-up. Please make contact within 48 hours.`

        // In-app + Pusher
        Notification.create({
          recipientId: new mongoose.Types.ObjectId(newShepherdId),
          type: "convert_assigned" as const,
          channel: "in_app" as const,
          title: notifTitle,
          body: notifBody,
          relatedEntityId: soul._id,
          relatedEntityType: "Soul",
          status: "pending" as const,
        }).then((notif) => {
          triggerUserNotification(newShepherdId, {
            id: notif._id.toString(),
            type: "convert_assigned",
            title: notifTitle,
            body: notifBody,
            relatedEntityId: soul._id.toString(),
            relatedEntityType: "Soul",
            createdAt: notif.createdAt.toISOString(),
          })
        }).catch((e) => console.error("[reassign pusher]", e))

        // Email
        if (shepherd?.email) {
          sendMail({
            to: shepherd.email as string,
            subject: `Convert Assigned: ${convertName}`,
            html: convertAssignedHtml({
              shepherdName: shepherd.name as string,
              convertName,
              convertPhone: soul.phone,
              convertAddress: soul.address,
              locationWon: soul.locationWon,
              dateWon: new Date(soul.dateWon).toLocaleDateString("en-NG", {
                day: "numeric", month: "long", year: "numeric",
              }),
              loginUrl,
            }),
          }).catch((e) => console.error("[reassign email]", e))
        }
      }).catch((e) => console.error("[reassign user lookup]", e))
    }

    return ok(updated)
  }, "flight_shepherd")(req, ctx)
}
