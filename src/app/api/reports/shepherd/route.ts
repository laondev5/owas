import { connectDB } from "@/lib/db"
import { ShepherdReport } from "@/lib/models/ShepherdReport"
import { ShepherdReportSchema } from "@/lib/schemas/reports"
import { withAuth, logAudit, ok, err } from "@/lib/api-helpers"
import { getWeekEnding, isReportLate } from "@/lib/utils"
import mongoose from "mongoose"

// GET /api/reports/shepherd — get shepherd's own reports
export const GET = withAuth(async (req, { session }) => {
  await connectDB()
  const url = new URL(req.url)
  const limit = Math.min(20, parseInt(url.searchParams.get("limit") ?? "10"))

  const query: Record<string, unknown> = {}

  if (session.user.role === "flight_shepherd") {
    query.shepherdId = new mongoose.Types.ObjectId(session.user.id)
  } else {
    // Branch coordinators can see all shepherds in their branch
    query.branchId = new mongoose.Types.ObjectId(session.user.organizationId)
  }

  const reports = await ShepherdReport.find(query)
    .populate("shepherdId", "name shepherdTag shepherdCategory")
    .sort({ weekEnding: -1 })
    .limit(limit)
    .lean()

  return ok(reports)
}, "flight_shepherd")

// POST /api/reports/shepherd — submit shepherd report
export const POST = withAuth(async (req, { session }) => {
  if (session.user.role !== "flight_shepherd") {
    return err("Only flight shepherds can submit shepherd reports", 403)
  }

  const body = await req.json()
  const result = ShepherdReportSchema.safeParse(body)
  if (!result.success) {
    return err(result.error.errors[0].message)
  }

  await connectDB()

  const weekEnding = new Date(result.data.weekEnding)
  const weekStarting = new Date(weekEnding)
  weekStarting.setDate(weekStarting.getDate() - 6)

  const existing = await ShepherdReport.findOne({
    shepherdId: new mongoose.Types.ObjectId(session.user.id),
    weekEnding: { $gte: weekStarting, $lte: weekEnding },
  })

  if (existing && existing.status === "submitted") {
    return err("Report already submitted for this week")
  }

  const isLate = isReportLate(weekEnding, 0) // Saturday deadline

  const data = {
    ...result.data,
    shepherdId: new mongoose.Types.ObjectId(session.user.id),
    branchId: new mongoose.Types.ObjectId(session.user.organizationId),
    weekEnding,
    weekStarting,
    isLate,
    status: "submitted" as const,
    submittedAt: new Date(),
    submissionMethod: "web" as const,
  }

  let report
  if (existing) {
    report = await ShepherdReport.findByIdAndUpdate(existing._id, data, { new: true })
  } else {
    report = await ShepherdReport.create(data)
  }

  await logAudit(
    session.user.id,
    "SUBMIT_SHEPHERD_REPORT",
    "ShepherdReport",
    report!._id.toString()
  )

  return ok(report, 201)
}, "flight_shepherd")
