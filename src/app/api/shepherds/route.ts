import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/User"
import { Soul } from "@/lib/models/Soul"
import { withAuth, ok } from "@/lib/api-helpers"
import mongoose from "mongoose"

// GET /api/shepherds — list flight shepherds scoped to caller's organization
export const GET = withAuth(async (req, { session }) => {
  await connectDB()

  const url = new URL(req.url)
  const branchId = url.searchParams.get("branchId") ?? undefined
  const category = url.searchParams.get("category") ?? undefined
  const search = url.searchParams.get("search") ?? undefined

  const query: Record<string, unknown> = {
    role: "flight_shepherd",
  }

  // Scope to caller's organization (non-admins)
  if (
    session.user.role !== "super_admin" &&
    session.user.role !== "national_coordinator"
  ) {
    // For branch-level, filter by their org; district+ can see all under their umbrella
    // We use organizationId as the scoping field — shepherds belong to branches
    if (
      session.user.role === "branch_coordinator" ||
      session.user.role === "chief_trainer" ||
      session.user.role === "mission_field_coordinator"
    ) {
      query.organizationId = new mongoose.Types.ObjectId(session.user.organizationId)
    }
    // district/zonal/regional coordinators: no org restriction — they see all below them
    // (a more granular tree lookup would require Organization parent traversal)
  }

  if (branchId) {
    query.organizationId = new mongoose.Types.ObjectId(branchId)
  }

  if (category) {
    query.shepherdCategory = category
  }

  if (search) {
    query.name = { $regex: search, $options: "i" }
  }

  const shepherds = await User.find(query)
    .select("-passwordHash -resetToken -resetTokenExpiry")
    .populate("organizationId", "name code")
    .lean()

  // Count souls assigned to each shepherd in parallel
  const shepherdsWithCount = await Promise.all(
    shepherds.map(async (shepherd) => {
      const soulsAssigned = await Soul.countDocuments({
        assignedShepherdId: shepherd._id,
        status: { $nin: ["transferred"] },
      })
      return { ...shepherd, soulsAssigned }
    })
  )

  return ok(shepherdsWithCount)
}, "chief_trainer")
