import { connectDB } from "@/lib/db"
import { Soul } from "@/lib/models/Soul"
import { BranchReport } from "@/lib/models/BranchReport"
import { withAuth, ok } from "@/lib/api-helpers"
import { getDirectReports, type TeamMember } from "@/lib/hierarchy"
import { getWeekEnding } from "@/lib/utils"

// GET /api/team — the caller's direct reports (per the org-tree supervisor rule),
// each with a quick at-a-glance activity figure where one is cheaply available.
export const GET = withAuth(async (_req, { session }) => {
  await connectDB()

  const reports = await getDirectReports({
    _id: session.user.id,
    organizationId: session.user.organizationId,
  })

  const weekEnding = getWeekEnding()

  const withStats = await Promise.all(
    reports.map(async (report: TeamMember) => {
      const role = report.role

      if (role === "flight_shepherd") {
        const soulsAssigned = await Soul.countDocuments({ assignedShepherdId: report._id })
        return { ...report, stat: { label: "Souls Assigned", value: soulsAssigned } }
      }

      if (role === "branch_coordinator") {
        const latestReport = await BranchReport.findOne({ branchId: report.organizationId })
          .sort({ weekEnding: -1 })
          .lean()
        const submitted =
          latestReport &&
          new Date(latestReport.weekEnding).toISOString().split("T")[0] ===
            weekEnding.toISOString().split("T")[0] &&
          (latestReport.status === "submitted" || latestReport.status === "approved")
        return { ...report, stat: { label: "This Week's Report", value: submitted ? "Submitted" : "Not submitted" } }
      }

      return { ...report, stat: null }
    })
  )

  return ok(withStats)
}, "branch_coordinator")
