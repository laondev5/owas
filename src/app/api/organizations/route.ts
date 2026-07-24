import { connectDB } from "@/lib/db"
import { Organization } from "@/lib/models/Organization"
import { OrganizationSchema } from "@/lib/schemas/reports"
import { withAuth, logAudit, ok, err } from "@/lib/api-helpers"
import { getChildOrgLevel } from "@/lib/hierarchy"
import type { OrgLevel } from "@/lib/constants"
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

// POST /api/organizations — create organization
// super_admin: unrestricted. Coordinators (district_coordinator+): may only
// create the org level directly below their own, parented to their own org
// (e.g. a district_coordinator creates a branch under their own district).
export const POST = withAuth(async (req, { session }) => {
  const body = await req.json()
  const result = OrganizationSchema.safeParse(body)
  if (!result.success) {
    return err(result.error.errors[0].message)
  }

  let parentId = result.data.parentId
  const type: OrgLevel = result.data.type

  if (session.user.role !== "super_admin") {
    const childLevel = getChildOrgLevel(session.user.organizationLevel as OrgLevel)
    if (!childLevel || type !== childLevel) {
      return err(`You can only create a "${childLevel ?? "no"}" level organization`, 403)
    }
    parentId = session.user.organizationId
  }

  await connectDB()

  const existing = await Organization.findOne({ code: result.data.code.toUpperCase() })
  if (existing) return err("Organization code already exists")

  const org = await Organization.create({
    ...result.data,
    code: result.data.code.toUpperCase(),
    parentId: parentId ? new mongoose.Types.ObjectId(parentId) : undefined,
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
}, "district_coordinator")
