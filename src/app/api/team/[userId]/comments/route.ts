import { connectDB } from "@/lib/db"
import { Comment } from "@/lib/models/Comment"
import { User } from "@/lib/models/User"
import { Notification } from "@/lib/models/Notification"
import { withAuth, logAudit, ok, err, getAppUrl } from "@/lib/api-helpers"
import { getSupervisorId } from "@/lib/hierarchy"
import { triggerUserNotification } from "@/lib/pusher"
import { sendMail, commentHtml } from "@/lib/mailer"
import mongoose from "mongoose"

// GET /api/team/[userId]/comments — visible to the recipient themselves or their direct supervisor
export async function GET(req: Request, ctx: { params: { userId: string } }) {
  return withAuth(async (_req2, { session }) => {
    const { userId } = ctx.params
    if (!mongoose.Types.ObjectId.isValid(userId)) return err("Invalid user ID")

    await connectDB()

    const target = await User.findById(userId).lean()
    if (!target) return err("User not found", 404)

    const isSelf = userId === session.user.id
    if (!isSelf) {
      const supervisorId = await getSupervisorId({ _id: target._id, organizationId: target.organizationId })
      if (!supervisorId || supervisorId.toString() !== session.user.id) {
        return err("Forbidden", 403)
      }
    }

    const comments = await Comment.find({ recipientId: userId })
      .populate("authorId", "name role")
      .sort({ createdAt: -1 })
      .lean()

    return ok(comments)
  }, "flight_shepherd")(req, ctx)
}

// POST /api/team/[userId]/comments — only the target's direct supervisor may comment
export async function POST(req: Request, ctx: { params: { userId: string } }) {
  return withAuth(async (req2, { session }) => {
    const { userId } = ctx.params
    if (!mongoose.Types.ObjectId.isValid(userId)) return err("Invalid user ID")

    const body = await req2.json()
    const text = (body.text as string | undefined)?.trim()
    if (!text) return err("Comment text is required")

    await connectDB()

    const target = await User.findById(userId).lean()
    if (!target) return err("User not found", 404)

    const supervisorId = await getSupervisorId({ _id: target._id, organizationId: target.organizationId })
    if (!supervisorId || supervisorId.toString() !== session.user.id) {
      return err("You can only comment on your direct reports", 403)
    }

    const comment = await Comment.create({
      authorId: new mongoose.Types.ObjectId(session.user.id),
      recipientId: target._id,
      text,
    })

    await logAudit(session.user.id, "CREATE_COMMENT", "User", userId, undefined, { text })

    const notifTitle = "New Feedback From Your Supervisor"
    const notifBody = `${session.user.name} left a comment on your activity.`

    Notification.create({
      recipientId: target._id,
      type: "supervisor_comment" as const,
      channel: "in_app" as const,
      title: notifTitle,
      body: notifBody,
      relatedEntityId: comment._id,
      relatedEntityType: "Comment",
      status: "pending" as const,
    }).then((notif) => {
      triggerUserNotification(userId, {
        id: notif._id.toString(),
        type: "supervisor_comment",
        title: notifTitle,
        body: notifBody,
        relatedEntityId: comment._id.toString(),
        relatedEntityType: "Comment",
        createdAt: notif.createdAt.toISOString(),
      })
    }).catch((e) => console.error("[comment pusher]", e))

    if (target.email) {
      const loginUrl = `${getAppUrl()}/dashboard`
      sendMail({
        to: target.email,
        subject: notifTitle,
        html: commentHtml({
          recipientName: target.name,
          authorName: session.user.name,
          text,
          loginUrl,
        }),
      }).catch((e) => console.error("[comment email]", e))
    }

    return ok(comment, 201)
  }, "branch_coordinator")(req, ctx)
}
