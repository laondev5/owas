import { connectDB } from "@/lib/db"
import { NationalReport } from "@/lib/models/NationalReport"
import { withAuth, ok } from "@/lib/api-helpers"
import { calculateSevenMillionProgress } from "@/lib/kpi"

export const GET = withAuth(
  async (_req, _ctx) => {
    await connectDB()

    // Fetch last 6 months of national reports for sparkline
    const reports = await NationalReport.find({})
      .sort({ "reportingPeriod.year": -1, "reportingPeriod.month": -1 })
      .limit(6)
      .lean()

    if (reports.length === 0) {
      return ok({
        totalSoulsWon: 0,
        percentComplete: 0,
        targetSouls: 7_000_000,
        projectedYear: null,
        weeklyRate: 0,
        sparkline: [],
      })
    }

    // Use sevenMillionProgress from the latest report if it exists
    const latest = reports[0]
    const totalSoulsWon =
      latest.sevenMillionProgress?.currentTotal ??
      latest.aggregated.soulsWon ??
      0

    // Build last 4 weeks souls approximation from monthly data
    // Use the last 4 monthly soulsWon values divided by 4 to estimate weekly rate
    const last4MonthsSouls = reports
      .slice(0, 4)
      .map((r) => r.aggregated.soulsWon ?? 0)

    // Approximate weekly souls from monthly (divide by ~4.3 weeks/month)
    const last4WeeksSouls = last4MonthsSouls.map((s) => Math.round(s / 4.3))

    const progress = calculateSevenMillionProgress({
      totalSoulsWonAllTime: totalSoulsWon,
      last4WeeksSouls,
      startYear: new Date().getFullYear(),
    })

    // Build sparkline for last 6 months (oldest → newest)
    const sparkline = reports
      .slice(0, 6)
      .reverse()
      .map((r) => ({
        label: `${r.reportingPeriod.year}-${String(r.reportingPeriod.month).padStart(2, "0")}`,
        soulsWon: r.aggregated.soulsWon ?? 0,
      }))

    const soulsThisMonth = latest.aggregated.soulsWon ?? 0

    return ok({
      totalSoulsWon: progress.totalSoulsWonAllTime,
      percentComplete: progress.percentComplete,
      targetSouls: progress.targetSouls,
      projectedYear: progress.projectedCompletionYear,
      weeklyRate: progress.weeklyRate,
      soulsThisMonth,
      sparkline,
    })
  },
  "viewer"
)
