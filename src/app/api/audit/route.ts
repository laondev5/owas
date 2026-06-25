import { connectDB } from "@/lib/db"
import { AuditLog } from "@/lib/models/AuditLog"
import { withAuth, ok } from "@/lib/api-helpers"
import mongoose from "mongoose"

// GET /api/audit — list audit logs (super_admin only)
export const GET = withAuth(async (req) => {
  await connectDB()

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "25"))
  const entityType = url.searchParams.get("entityType") ?? undefined
  const action = url.searchParams.get("action") ?? undefined
  const userId = url.searchParams.get("userId") ?? undefined
  const startDate = url.searchParams.get("startDate") ?? undefined
  const endDate = url.searchParams.get("endDate") ?? undefined

  const query: Record<string, unknown> = {}

  if (entityType) query.entityType = entityType
  if (action) query.action = { $regex: action, $options: "i" }
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    query.userId = new mongoose.Types.ObjectId(userId)
  }
  if (startDate || endDate) {
    query.timestamp = {}
    if (startDate) (query.timestamp as Record<string, unknown>).$gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      ;(query.timestamp as Record<string, unknown>).$lte = end
    }
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "name email")
      .lean(),
    AuditLog.countDocuments(query),
  ])

  return ok({
    logs,
    total,
    page,
    pages: Math.ceil(total / limit),
  })
}, "super_admin")
