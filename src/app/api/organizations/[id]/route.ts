import { connectDB } from "@/lib/db"
import { Organization } from "@/lib/models/Organization"
import { withAuth, logAudit, ok, err } from "@/lib/api-helpers"
import mongoose from "mongoose"

// PATCH /api/organizations/[id] — update org fields
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  return withAuth(async (req2, { session }) => {
    const { id } = ctx.params
    if (!mongoose.Types.ObjectId.isValid(id)) return err("Invalid organization ID")

    const body = await req2.json()
    const allowed = ["name", "code", "isActive", "coordinatorId"] as const
    type AllowedKey = typeof allowed[number]
    const updates: Partial<Record<AllowedKey, unknown>> = {}

    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    // Uppercase code if provided
    if (typeof updates.code === "string") {
      updates.code = updates.code.toUpperCase()
    }

    // Validate and cast coordinatorId
    if (updates.coordinatorId !== undefined && updates.coordinatorId !== null) {
      if (!mongoose.Types.ObjectId.isValid(updates.coordinatorId as string)) {
        return err("Invalid coordinatorId")
      }
      updates.coordinatorId = new mongoose.Types.ObjectId(updates.coordinatorId as string)
    }

    await connectDB()

    // Check code uniqueness if code is being changed
    if (updates.code) {
      const existing = await Organization.findOne({
        code: updates.code,
        _id: { $ne: new mongoose.Types.ObjectId(id) },
      })
      if (existing) return err("Organization code already in use")
    }

    const before = await Organization.findById(id).lean()
    if (!before) return err("Organization not found", 404)

    const org = await Organization.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("parentId", "name code type")
      .populate("coordinatorId", "name email")

    if (!org) return err("Organization not found", 404)

    await logAudit(
      session.user.id,
      "UPDATE_ORG",
      "Organization",
      id,
      before as Record<string, unknown>,
      updates
    )

    return ok(org)
  }, "super_admin")(req, ctx)
}
