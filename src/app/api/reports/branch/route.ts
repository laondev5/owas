import { withAuth, ok, err } from "@/lib/api-helpers"
import { BranchReport } from "@/lib/models/BranchReport"
import { Organization } from "@/lib/models/Organization"
import { connectDB } from "@/lib/db"
import { cascadeFromBranch } from "@/lib/aggregation"
import { triggerOrgEvent, PUSHER_EVENTS } from "@/lib/pusher"
import { z } from "zod"
import mongoose from "mongoose"
import { getWeekEnding } from "@/lib/utils"

const BranchReportBodySchema = z.object({
  branchId: z.string().min(1),
  weekEnding: z.string().datetime().optional(), // ISO; defaults to current week
  gowas: z.object({
    participants: z.number().int().min(0).default(0),
    soulsReached: z.number().int().min(0).default(0),
    soulsWon: z.number().int().min(0).default(0),
    firstTimers: z.number().int().min(0).default(0),
  }),
  followUp: z.object({
    newConverts: z.number().int().min(0).default(0),
    assignedToShepherds: z.number().int().min(0).default(0),
    active: z.number().int().min(0).default(0),
    inactive: z.number().int().min(0).default(0),
  }),
  fia: z.object({
    familyClass: z.object({ enrolled: z.number().int().min(0).default(0), completed: z.number().int().min(0).default(0) }).default({}),
    responsibilityClass: z.object({ enrolled: z.number().int().min(0).default(0), completed: z.number().int().min(0).default(0) }).default({}),
    sortingOut: z.object({ enrolled: z.number().int().min(0).default(0), completed: z.number().int().min(0).default(0) }).default({}),
    hsos: z.object({ enrolled: z.number().int().min(0).default(0), completed: z.number().int().min(0).default(0) }).default({}),
    zibi: z.object({ enrolled: z.number().int().min(0).default(0), completed: z.number().int().min(0).default(0) }).default({}),
  }).default({}),
  baptism: z.object({
    baptized: z.number().int().min(0).default(0),
    awaitingBaptism: z.number().int().min(0).default(0),
  }).default({}),
  flightShepherds: z.object({
    ym: z.number().int().min(0).default(0),
    yf: z.number().int().min(0).default(0),
    m: z.number().int().min(0).default(0),
    w: z.number().int().min(0).default(0),
    totalActive: z.number().int().min(0).default(0),
    trainingStatus: z.string().default(""),
  }).default({}),
  evangelismExplosion: z.object({
    trained: z.number().int().min(0).default(0),
    ongoing: z.number().int().min(0).default(0),
  }).default({}),
  hst: z.object({
    status: z.enum(["ready", "ongoing", "about_to_start"]).default("about_to_start"),
  }).default({}),
  testimonies: z.string().max(2000).optional(),
  challenges: z.string().max(2000).optional(),
  status: z.enum(["draft", "submitted"]).default("draft"),
})

// GET /api/reports/branch?branchId=...&weekEnding=...
export const GET = withAuth(async (req, { session }) => {
  await connectDB()
  const url = new URL(req.url)
  const branchId = url.searchParams.get("branchId")
  const weekEndingParam = url.searchParams.get("weekEnding")

  if (!branchId) return err("branchId is required", 400)

  const query: Record<string, unknown> = { branchId }
  if (weekEndingParam) {
    query.weekEnding = new Date(weekEndingParam)
  }

  const reports = await BranchReport.find(query).sort({ weekEnding: -1 }).limit(12).lean()
  return ok(reports)
}, "branch_coordinator")

// POST /api/reports/branch — upsert (idempotent per branchId+weekEnding)
export const POST = withAuth(async (req, { session }) => {
  await connectDB()

  const body = await req.json()
  const parsed = BranchReportBodySchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.flatten(), 422)

  const { branchId, weekEnding: weekEndingRaw, status, ...reportData } = parsed.data

  // Verify branch exists and user belongs to it (unless super_admin)
  const branch = await Organization.findById(branchId).lean()
  if (!branch || branch.type !== "branch") return err("Branch not found", 404)

  const isAdmin = ["super_admin", "national_coordinator"].includes(session.user.role)
  if (!isAdmin && session.user.organizationId !== branchId) {
    return err("You can only submit reports for your own branch", 403)
  }

  // Resolve districtId + zoneId from the hierarchy
  const district = branch.parentId
    ? await Organization.findById(branch.parentId).lean()
    : null
  if (!district) return err("Branch has no district assignment", 400)

  const weekEnding = weekEndingRaw
    ? new Date(weekEndingRaw)
    : new Date(getWeekEnding(new Date()))

  const isLate = new Date() > weekEnding
  const submittedAt = status === "submitted" ? new Date() : undefined

  const report = await BranchReport.findOneAndUpdate(
    {
      branchId: new mongoose.Types.ObjectId(branchId),
      weekEnding,
    },
    {
      $set: {
        districtId: district._id,
        zoneId: district.parentId,
        weekEnding,
        isLate,
        status,
        submittedBy: new mongoose.Types.ObjectId(session.user.id),
        ...(submittedAt && { submittedAt }),
        ...reportData,
      },
    },
    { upsert: true, new: true }
  )

  // Cascade aggregation upward only on submission (not draft)
  if (status === "submitted") {
    cascadeFromBranch(report.branchId, weekEnding).catch(console.error)

    // Notify district coordinator via Pusher
    if (branch.parentId) {
      triggerOrgEvent("district", branch.parentId.toString(), PUSHER_EVENTS.REPORT_SUBMITTED, {
        branchId,
        branchName: branch.name,
        weekEnding: weekEnding.toISOString(),
      }).catch(console.error)
    }
  }

  return ok(report, 201)
}, "branch_coordinator")
