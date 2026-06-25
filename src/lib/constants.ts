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
