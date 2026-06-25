import { connectDB } from "@/lib/db"
import { Soul } from "@/lib/models/Soul"
import { withAuth, ok, err } from "@/lib/api-helpers"
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

// PATCH /api/souls/[id] — log contact, change status, add note
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  return withAuth(async (req2, { session }) => {
    const body = await req2.json()
    await connectDB()

    const soul = await Soul.findById(ctx.params.id)
    if (!soul) return err("Soul not found", 404)

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

    return ok(updated)
  }, "flight_shepherd")(req, ctx)
}
