import { Organization } from "@/lib/models/Organization"
import { User } from "@/lib/models/User"
import mongoose from "mongoose"

// Re-exported for convenience so server code can import everything hierarchy-related
// from one place. These three are plain data/functions (no mongoose) and also used
// directly by client components from "@/lib/constants".
export { ORG_COORDINATOR_ROLE, getChildOrgLevel, BRANCH_STAFF_ROLES } from "@/lib/constants"

// ─── Supervisor / direct-reports resolution ─────────────────────────────────

type SupervisorUser = { _id: mongoose.Types.ObjectId | string; organizationId: mongoose.Types.ObjectId | string }

export interface TeamMember {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  role: string
  organizationId: mongoose.Types.ObjectId
  organizationLevel: string
  shepherdTag?: string
  shepherdCategory?: string
  isActive: boolean
}

export async function getSupervisorId(
  user: SupervisorUser
): Promise<mongoose.Types.ObjectId | null> {
  const org = await Organization.findById(user.organizationId).lean()
  if (!org) return null

  const userId = user._id.toString()
  const isCoordinator = org.coordinatorId?.toString() === userId

  if (isCoordinator) {
    if (!org.parentId) return null
    const parentOrg = await Organization.findById(org.parentId).lean()
    return parentOrg?.coordinatorId ?? null
  }

  return org.coordinatorId ?? null
}

export async function getDirectReports(user: SupervisorUser): Promise<TeamMember[]> {
  const org = await Organization.findById(user.organizationId).lean()
  if (!org) return []

  const userId = user._id.toString()
  const isCoordinator = org.coordinatorId?.toString() === userId
  if (!isCoordinator) return []

  const [peers, childOrgs] = await Promise.all([
    User.find({ organizationId: org._id, _id: { $ne: user._id } })
      .select("-passwordHash -resetToken -resetTokenExpiry")
      .lean(),
    Organization.find({ parentId: org._id }).populate("coordinatorId", "-passwordHash -resetToken -resetTokenExpiry").lean(),
  ])

  const childCoordinators = childOrgs
    .map((c) => c.coordinatorId)
    .filter((c): c is NonNullable<typeof c> => !!c)

  return [...peers, ...childCoordinators] as unknown as TeamMember[]
}
