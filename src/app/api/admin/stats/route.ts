import { withAuth, ok } from "@/lib/api-helpers"
import { connectDB } from "@/lib/db"
import { Organization } from "@/lib/models/Organization"
import { User } from "@/lib/models/User"
import { AuditLog } from "@/lib/models/AuditLog"
import { Soul } from "@/lib/models/Soul"

// GET /api/admin/stats — super admin system stats
export const GET = withAuth(async () => {
  await connectDB()

  const [totalOrganizations, totalUsers, activeBranches, totalSouls, recentAuditLogs] =
    await Promise.all([
      Organization.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      Organization.countDocuments({ type: "branch", isActive: true }),
      Soul.countDocuments({}),
      AuditLog.find()
        .sort({ timestamp: -1 })
        .limit(5)
        .populate("userId", "name email")
        .lean(),
    ])

  return ok({
    totalOrganizations,
    totalUsers,
    activeBranches,
    totalSouls,
    recentAuditLogs: recentAuditLogs.map((log) => ({
      id: log._id.toString(),
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId?.toString(),
      userId: (log.userId as { name?: string; email?: string } | null)?.name ?? "Unknown",
      timestamp: log.timestamp,
    })),
  })
}, "super_admin")
