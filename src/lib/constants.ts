// Shared constants — no mongoose, safe to import on client and server.

export const USER_ROLES = [
  "super_admin",
  "national_coordinator",
  "regional_coordinator",
  "zonal_coordinator",
  "district_coordinator",
  "branch_coordinator",
  "chief_trainer",
  "mission_field_coordinator",
  "flight_shepherd",
  "viewer",
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const SHEPHERD_CATEGORIES = ["YM", "YF", "M", "W"] as const
export type ShepherdCategory = (typeof SHEPHERD_CATEGORIES)[number]

export const ORG_LEVELS = ["national", "region", "zone", "district", "branch"] as const
export type OrgLevel = (typeof ORG_LEVELS)[number]

// ─── Cascading org/user creation ────────────────────────────────────────────
// Each coordinator level may create the org + coordinator role directly under
// them (e.g. a district_coordinator creates a branch + its branch_coordinator).

export const ORG_COORDINATOR_ROLE: Record<OrgLevel, UserRole> = {
  national: "national_coordinator",
  region: "regional_coordinator",
  zone: "zonal_coordinator",
  district: "district_coordinator",
  branch: "branch_coordinator",
}

export function getChildOrgLevel(level: OrgLevel): OrgLevel | null {
  const idx = ORG_LEVELS.indexOf(level)
  const next = ORG_LEVELS[idx + 1]
  return next ?? null
}

// Terminal roles a branch_coordinator creates directly (no org level below branch)
export const BRANCH_STAFF_ROLES: UserRole[] = [
  "chief_trainer",
  "mission_field_coordinator",
  "flight_shepherd",
]
