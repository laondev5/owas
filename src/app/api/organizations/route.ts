import { connectDB } from "@/lib/db"
import { Organization } from "@/lib/models/Organization"
import { OrganizationSchema } from "@/lib/schemas/reports"
import { withAuth, logAudit, ok, err } from "@/lib/api-helpers"
import mongoose from "mongoose"

// GET /api/organizations — list organizations
export const GET = withAuth(async (req) => {
  await connectDB()
  const url = new URL(req.url)
  const type = url.searchParams.get("type") ?? undefined
  const parentId = url.searchParams.get("parentId") ?? undefined

  const query: Record<string, unknown> = { isActive: true }
  if (type) query.type = type
  if (parentId) query.parentId = new mongoose.Types.ObjectId(parentId)

  const orgs = await Organization.find(query)
    .populate("parentId", "name code type")
    .populate("coordinatorId", "name email")
    .lean()

  return ok(orgs)
}, "viewer")

// POST /api/organizations — create organization (super_admin only)
export const POST = withAuth(async (req, { session }) => {
  const body = await req.json()
  const result = OrganizationSchema.safeParse(body)
  if (!result.success) {
    return err(result.error.errors[0].message)
  }

  await connectDB()

  const existing = await Organization.findOne({ code: result.data.code.toUpperCase() })
  if (existing) return err("Organization code already exists")

  const org = await Organization.create({
    ...result.data,
    code: result.data.code.toUpperCase(),
    parentId: result.data.parentId
      ? new mongoose.Types.ObjectId(result.data.parentId)
      : undefined,
  })

  await logAudit(
    session.user.id,
    "CREATE_ORG",
    "Organization",
    org._id.toString(),
    undefined,
    { name: org.name, code: org.code, type: org.type }
  )

  return ok(org, 201)
}, "super_admin")
