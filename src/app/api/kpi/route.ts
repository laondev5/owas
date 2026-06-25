import { connectDB } from "@/lib/db"
import { KpiScore } from "@/lib/models/KpiScore"
import { withAuth, ok, err } from "@/lib/api-helpers"
import mongoose from "mongoose"

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 85) return "A"
  if (score >= 70) return "B"
  if (score >= 55) return "C"
  if (score >= 40) return "D"
  return "F"
}

export const GET = withAuth(
  async (req, { session }) => {
    await connectDB()

    const url = new URL(req.url)
    const now = new Date()

    const entityId =
      url.searchParams.get("entityId") ?? session.user.organizationId
    const entityType =
      (url.searchParams.get("entityType") as "branch" | "district" | "zone") ??
      (session.user.organizationLevel as "branch" | "district" | "zone")
    const year = parseInt(url.searchParams.get("year") ?? String(now.getFullYear()))
    const month = parseInt(url.searchParams.get("month") ?? String(now.getMonth() + 1))

    if (!entityId) {
      return err("entityId is required", 400)
    }

    const validTypes = ["branch", "district", "zone", "region", "national"]

    // Build query — filter by entityId, optionally by period
    const query: Record<string, unknown> = {
      entityId: new mongoose.Types.ObjectId(entityId),
    }
    if (entityType && validTypes.includes(entityType)) {
      query.entityType = entityType
    }

    // Fetch last 12 months of scores, sorted newest first
    const scores = await KpiScore.find(query)
      .sort({ "period.year": -1, "period.month": -1 })
      .limit(12)
      .lean()

    // Find the score for the requested period
    const currentScore = scores.find(
      (s) => s.period.year === year && s.period.month === month
    )

    const latestScore = scores[0]?.totalScore ?? 0
    const latestGrade = scoreToGrade(latestScore)

    return ok({ scores, latestGrade, latestScore })
  },
  "branch_coordinator"
)
