import mongoose, { Schema, Document, Model } from "mongoose"

interface GowasFigures {
  participants: number
  soulsReached: number
  soulsWon: number
  firstTimers: number
}

interface FollowUpFigures {
  newConverts: number
  assignedToShepherds: number
  active: number
  inactive: number
}

interface FiaActivity {
  enrolled: number
  completed: number
}

interface FiaFigures {
  familyClass: FiaActivity
  responsibilityClass: FiaActivity
  sortingOut: FiaActivity
  hsos: FiaActivity
  zibi: FiaActivity
}

interface BaptismFigures {
  baptized: number
  awaitingBaptism: number
}

interface ShepherdFigures {
  ym: number
  yf: number
  m: number
  w: number
  totalActive: number
  trainingStatus: string
}

interface EeFigures {
  trained: number
  ongoing: number
}

export interface IBranchReport extends Document {
  branchId: mongoose.Types.ObjectId
  districtId: mongoose.Types.ObjectId
  zoneId: mongoose.Types.ObjectId
  weekEnding: Date
  gowas: GowasFigures
  followUp: FollowUpFigures
  fia: FiaFigures
  baptism: BaptismFigures
  flightShepherds: ShepherdFigures
  evangelismExplosion: EeFigures
  hst: { status: "ready" | "ongoing" | "about_to_start" }
  testimonies?: string
  challenges?: string
  submittedBy: mongoose.Types.ObjectId
  submittedAt?: Date
  isLate: boolean
  status: "draft" | "submitted" | "approved"
  createdAt: Date
  updatedAt: Date
}

const FiaActivitySchema = new Schema<FiaActivity>(
  { enrolled: { type: Number, default: 0 }, completed: { type: Number, default: 0 } },
  { _id: false }
)

const BranchReportSchema = new Schema<IBranchReport>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    districtId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    zoneId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    weekEnding: { type: Date, required: true },
    gowas: {
      participants: { type: Number, default: 0 },
      soulsReached: { type: Number, default: 0 },
      soulsWon: { type: Number, default: 0 },
      firstTimers: { type: Number, default: 0 },
    },
    followUp: {
      newConverts: { type: Number, default: 0 },
      assignedToShepherds: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
      inactive: { type: Number, default: 0 },
    },
    fia: {
      familyClass: FiaActivitySchema,
      responsibilityClass: FiaActivitySchema,
      sortingOut: FiaActivitySchema,
      hsos: FiaActivitySchema,
      zibi: FiaActivitySchema,
    },
    baptism: {
      baptized: { type: Number, default: 0 },
      awaitingBaptism: { type: Number, default: 0 },
    },
    flightShepherds: {
      ym: { type: Number, default: 0 },
      yf: { type: Number, default: 0 },
      m: { type: Number, default: 0 },
      w: { type: Number, default: 0 },
      totalActive: { type: Number, default: 0 },
      trainingStatus: { type: String, default: "" },
    },
    evangelismExplosion: {
      trained: { type: Number, default: 0 },
      ongoing: { type: Number, default: 0 },
    },
    hst: {
      status: { type: String, enum: ["ready", "ongoing", "about_to_start"], default: "about_to_start" },
    },
    testimonies: String,
    challenges: String,
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedAt: Date,
    isLate: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "submitted", "approved"], default: "draft" },
  },
  { timestamps: true }
)

BranchReportSchema.index({ branchId: 1, weekEnding: -1 }, { unique: true })
BranchReportSchema.index({ districtId: 1, weekEnding: -1 })
BranchReportSchema.index({ zoneId: 1, weekEnding: -1 })
BranchReportSchema.index({ status: 1, districtId: 1 })

export const BranchReport: Model<IBranchReport> =
  mongoose.models.BranchReport ??
  mongoose.model<IBranchReport>("BranchReport", BranchReportSchema)
