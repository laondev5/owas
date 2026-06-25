import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/User"
import { withAuth, logAudit, ok, err } from "@/lib/api-helpers"
import mongoose from "mongoose"
import { ORG_LEVELS, USER_ROLES } from "@/lib/constants"

// PATCH /api/users/[id] — update user fields
export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  return withAuth(async (req2, { session }) => {
    const { id } = ctx.params
    if (!mongoose.Types.ObjectId.isValid(id)) return err("Invalid user ID")

    const body = await req2.json()
    const allowed = ["name", "email", "role", "organizationId", "organizationLevel", "isActive"] as const
    type AllowedKey = typeof allowed[number]
    const updates: Partial<Record<AllowedKey, unknown>> = {}

    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    // Validate role if provided
    if (updates.role !== undefined && !USER_ROLES.includes(updates.role as never)) {
      return err("Invalid role")
    }

    // Validate organizationLevel if provided
    if (updates.organizationLevel !== undefined && !ORG_LEVELS.includes(updates.organizationLevel as never)) {
      return err("Invalid organizationLevel")
    }

    // Cast organizationId to ObjectId if provided
    if (updates.organizationId) {
      if (!mongoose.Types.ObjectId.isValid(updates.organizationId as string)) {
        return err("Invalid organizationId")
      }
      updates.organizationId = new mongoose.Types.ObjectId(updates.organizationId as string)
    }

    await connectDB()

    const before = await User.findById(id).select("-passwordHash").lean()
    if (!before) return err("User not found", 404)

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-passwordHash")

    if (!user) return err("User not found", 404)

    await logAudit(session.user.id, "UPDATE_USER", "User", id, before as Record<string, unknown>, updates)

    return ok(user)
  }, "super_admin")(req, ctx)
}

// DELETE /api/users/[id] — hard delete (permanent)
export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  return withAuth(async (_req, { session }) => {
    const { id } = ctx.params
    if (!mongoose.Types.ObjectId.isValid(id)) return err("Invalid user ID")

    if (id === session.user.id) return err("Cannot delete your own account", 400)

    await connectDB()

    const user = await User.findById(id).select("-passwordHash").lean()
    if (!user) return err("User not found", 404)

    await User.findByIdAndDelete(id)

    await logAudit(session.user.id, "DELETE_USER", "User", id, user as Record<string, unknown>, {})

    return ok({ message: "User deleted", id })
  }, "super_admin")(req, ctx)
}
