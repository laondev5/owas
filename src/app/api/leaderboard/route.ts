import { connectDB } from "@/lib/db"
import { BranchReport } from "@/lib/models/BranchReport"
import { KpiScore } from "@/lib/models/KpiScore"
import { Organization } from "@/lib/models/Organization"
import { withAuth, ok, err } from "@/lib/api-helpers"
import mongoose from "mongoose"

type LeaderboardLevel = "branch" | "district" | "zone"

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 85) return "A"
  if (score >= 70) return "B"
  if (score >= 55) return "C"
  if (score >= 40) return "D"
  return "F"
}

export const GET = withAuth(
  async (req, _ctx) => {
    await connectDB()

    const url = new URL(req.url)
    const level = (url.searchParams.get("level") ?? "branch") as LeaderboardLevel
    const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "10"))

    const validLevels: LeaderboardLevel[] = ["branch", "district", "zone"]
    if (!validLevels.includes(level)) {
      return err("Invalid level. Must be branch, district, or zone", 400)
    }

    // Get last 4 weeks date range
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    if (level === "branch") {
      // Aggregate BranchReport for last 4 weeks, sum soulsWon grouped by branchId
      const pipeline: mongoose.PipelineStage[] = [
        {
          $match: {
            weekEnding: { $gte: fourWeeksAgo },
            status: { $in: ["submitted", "approved"] },
          },
        },
        {
          $group: {
            _id: "$branchId",
            totalSouls: { $sum: "$gowas.soulsWon" },
          },
        },
        { $sort: { totalSouls: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "organizations",
            localField: "_id",
            foreignField: "_id",
            as: "org",
          },
        },
        { $unwind: { path: "$org", preserveNullAndEmptyArrays: true } },
      ]

      const results = await BranchReport.aggregate(pipeline)

      // Get KPI grades for these branches
      const branchIds = results.map((r) => r._id)
      const now = new Date()
      const kpiScores = await KpiScore.find({
        entityId: { $in: branchIds },
        entityType: "branch",
        "period.year": now.getFullYear(),
        "period.month": now.getMonth() + 1,
      }).lean()

      const gradeMap = new Map(
        kpiScores.map((k) => [k.entityId.toString(), k.totalScore])
      )

      const leaderboard = results.map((r, idx) => {
        const kpiScore = gradeMap.get(r._id?.toString()) ?? 0
        return {
          rank: idx + 1,
          name: r.org?.name ?? "Unknown Branch",
          code: r.org?.code ?? "???",
          soulsWon: r.totalSouls,
          grade: scoreToGrade(kpiScore),
          kpiScore,
        }
      })

      return ok(leaderboard)
    }

    // For district and zone level — aggregate from BranchReport by districtId or zoneId
    const groupField = level === "district" ? "$districtId" : "$zoneId"
    const lookupCollection = "organizations"

    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          weekEnding: { $gte: fourWeeksAgo },
          status: { $in: ["submitted", "approved"] },
        },
      },
      {
        $group: {
          _id: groupField,
          totalSouls: { $sum: "$gowas.soulsWon" },
        },
      },
      { $sort: { totalSouls: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: lookupCollection,
          localField: "_id",
          foreignField: "_id",
          as: "org",
        },
      },
      { $unwind: { path: "$org", preserveNullAndEmptyArrays: true } },
    ]

    const results = await BranchReport.aggregate(pipeline)

    const entityIds = results.map((r) => r._id)
    const now = new Date()
    const kpiScores = await KpiScore.find({
      entityId: { $in: entityIds },
      entityType: level,
      "period.year": now.getFullYear(),
      "period.month": now.getMonth() + 1,
    }).lean()

    const gradeMap = new Map(
      kpiScores.map((k) => [k.entityId.toString(), k.totalScore])
    )

    const leaderboard = results.map((r, idx) => {
      const kpiScore = gradeMap.get(r._id?.toString()) ?? 0
      return {
        rank: idx + 1,
        name: r.org?.name ?? `Unknown ${level}`,
        code: r.org?.code ?? "???",
        soulsWon: r.totalSouls,
        grade: scoreToGrade(kpiScore),
        kpiScore,
      }
    })

    return ok(leaderboard)
  },
  "viewer"
)
