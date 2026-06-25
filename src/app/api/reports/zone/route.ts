import { withAuth, ok, err } from "@/lib/api-helpers"
import { connectDB } from "@/lib/db"
import { ZonalReport } from "@/lib/models/ZonalReport"
import mongoose from "mongoose"

// GET /api/reports/zone?zoneId=...&weekEnding=...
export const GET = withAuth(async (req, { session }) => {
  await connectDB()

  const url = new URL(req.url)
  const zoneIdParam = url.searchParams.get("zoneId")
  const weekEndingParam = url.searchParams.get("weekEnding")

  // Fall back to the session user's own organisation
  const zoneId = zoneIdParam ?? session.user.organizationId

  if (!zoneId) {
    return err("zoneId is required", 400)
  }

  if (!mongoose.isValidObjectId(zoneId)) {
    return err("Invalid zoneId", 400)
  }

  const query: Record<string, unknown> = {
    zoneId: new mongoose.Types.ObjectId(zoneId),
  }

  if (weekEndingParam) {
    query.reportingWeek = new Date(weekEndingParam)
  }

  const reports = await ZonalReport.find(query)
    .sort({ reportingWeek: -1 })
    .limit(8)
    .populate("zoneId", "name code")
    .lean()

  return ok(reports)
}, "zonal_coordinator")
