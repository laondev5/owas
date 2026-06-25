import { z } from "zod"

export const ShepherdReportSchema = z
  .object({
    weekEnding: z.string().datetime({ message: "Invalid date" }),
    assignedSouls: z.number().int().min(0),
    activeSouls: z.number().int().min(0),
    inactiveSouls: z.number().int().min(0),
    newConvertsAssigned: z.number().int().min(0),
    familyClassEnrolled: z.number().int().min(0),
    responsibilityClassEnrolled: z.number().int().min(0),
    cellConnected: z.number().int().min(0),
    workforceConnected: z.number().int().min(0),
    challenges: z.string().max(1000).optional(),
    prayerRequests: z.string().max(1000).optional(),
  })
  .refine((d) => d.activeSouls + d.inactiveSouls <= d.assignedSouls, {
    message: "Active + Inactive souls cannot exceed Assigned souls",
    path: ["activeSouls"],
  })

const FiaActivitySchema = z.object({
  enrolled: z.number().int().min(0),
  completed: z.number().int().min(0),
})

export const BranchReportSchema = z
  .object({
    weekEnding: z.string().datetime({ message: "Invalid date" }),
    gowas: z.object({
      participants: z.number().int().min(0),
      soulsReached: z.number().int().min(0),
      soulsWon: z.number().int().min(0),
      firstTimers: z.number().int().min(0),
    }),
    followUp: z.object({
      newConverts: z.number().int().min(0),
      assignedToShepherds: z.number().int().min(0),
      active: z.number().int().min(0),
      inactive: z.number().int().min(0),
    }),
    fia: z.object({
      familyClass: FiaActivitySchema,
      responsibilityClass: FiaActivitySchema,
      sortingOut: FiaActivitySchema,
      hsos: FiaActivitySchema,
      zibi: FiaActivitySchema,
    }),
    baptism: z.object({
      baptized: z.number().int().min(0),
      awaitingBaptism: z.number().int().min(0),
    }),
    flightShepherds: z.object({
      ym: z.number().int().min(0),
      yf: z.number().int().min(0),
      m: z.number().int().min(0),
      w: z.number().int().min(0),
      totalActive: z.number().int().min(0),
      trainingStatus: z.string().max(200),
    }),
    evangelismExplosion: z.object({
      trained: z.number().int().min(0),
      ongoing: z.number().int().min(0),
    }),
    hst: z.object({
      status: z.enum(["ready", "ongoing", "about_to_start"]),
    }),
    testimonies: z.string().max(2000).optional(),
    challenges: z.string().max(2000).optional(),
  })
  .refine((d) => d.gowas.soulsWon <= d.gowas.soulsReached, {
    message: "Souls Won cannot exceed Souls Reached",
    path: ["gowas", "soulsWon"],
  })

export const SoulSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/)
    .optional(),
  gender: z.enum(["male", "female"]),
  ageGroup: z.enum(["youth", "adult"]),
  dateWon: z.string().datetime(),
  outreachType: z.enum(["GOWAS", "personal", "crusade"]),
})

export const OrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20).toUpperCase(),
  type: z.enum(["national", "region", "zone", "district", "branch"]),
  parentId: z.string().length(24).optional(),
  region: z.string().max(100).optional(),
})

export type ShepherdReportInput = z.infer<typeof ShepherdReportSchema>
export type BranchReportInput = z.infer<typeof BranchReportSchema>
export type SoulInput = z.infer<typeof SoulSchema>
export type OrganizationInput = z.infer<typeof OrganizationSchema>
