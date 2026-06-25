import { withAuth, ok, err } from "@/lib/api-helpers"
import { connectDB } from "@/lib/db"
import { DistrictReport } from "@/lib/models/DistrictReport"
import mongoose from "mongoose"

// GET /api/reports/district?districtId=...&weekEnding=...
export const GET = withAuth(async (req, { session }) => {
  await connectDB()

  const url = new URL(req.url)
  const districtIdParam = url.searchParams.get("districtId")
  const weekEndingParam = url.searchParams.get("weekEnding")

  // Fall back to the session user's own organisation
  const districtId = districtIdParam ?? session.user.organizationId

  if (!districtId) {
    return err("districtId is required", 400)
  }

  if (!mongoose.isValidObjectId(districtId)) {
    return err("Invalid districtId", 400)
  }

  const query: Record<string, unknown> = {
    districtId: new mongoose.Types.ObjectId(districtId),
  }

  if (weekEndingParam) {
    query.reportingWeek = new Date(weekEndingParam)
  }

  const reports = await DistrictReport.find(query)
    .sort({ reportingWeek: -1 })
    .limit(8)
    .populate("districtId", "name code")
    .lean()

  return ok(reports)
}, "district_coordinator")
