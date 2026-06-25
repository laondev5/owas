import { withAuth, ok } from "@/lib/api-helpers"
import { connectDB } from "@/lib/db"
import { NationalReport } from "@/lib/models/NationalReport"

// GET /api/reports/national — last 12 months, no filter needed
export const GET = withAuth(async () => {
  await connectDB()

  const reports = await NationalReport.find()
    .sort({ "reportingPeriod.year": -1, "reportingPeriod.month": -1 })
    .limit(12)
    .lean()

  return ok(reports)
}, "national_coordinator")
