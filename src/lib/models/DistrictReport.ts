import mongoose, { Schema, Document, Model } from "mongoose"

export interface IDistrictReport extends Document {
  districtId: mongoose.Types.ObjectId
  zoneId: mongoose.Types.ObjectId
  reportingWeek: Date
  branchesReporting: number
  branchesOutstanding: number
  aggregated: {
    soulsWon: number
    soulsReached: number
    firstTimers: number
    newConverts: number
    active: number
    inactive: number
    baptized: number
    familyClassEnrolled: number
    responsibilityClassEnrolled: number
    sipEnrolled: number
    smlCertified: number
    flightShepherdsActive: number
  }
  topBranches: Array<{ branchId: mongoose.Types.ObjectId; score: number }>
  submittedBy?: mongoose.Types.ObjectId
  submittedAt?: Date
  isLate: boolean
  status: "auto_compiled" | "submitted" | "approved"
  createdAt: Date
  updatedAt: Date
}

const DistrictReportSchema = new Schema<IDistrictReport>(
  {
    districtId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    zoneId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    reportingWeek: { type: Date, required: true },
    branchesReporting: { type: Number, default: 0 },
    branchesOutstanding: { type: Number, default: 0 },
    aggregated: {
      soulsWon: { type: Number, default: 0 },
      soulsReached: { type: Number, default: 0 },
      firstTimers: { type: Number, default: 0 },
      newConverts: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
      inactive: { type: Number, default: 0 },
      baptized: { type: Number, default: 0 },
      familyClassEnrolled: { type: Number, default: 0 },
      responsibilityClassEnrolled: { type: Number, default: 0 },
      sipEnrolled: { type: Number, default: 0 },
      smlCertified: { type: Number, default: 0 },
      flightShepherdsActive: { type: Number, default: 0 },
    },
    topBranches: [
      {
        branchId: { type: Schema.Types.ObjectId, ref: "Organization" },
        score: Number,
      },
    ],
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
    submittedAt: Date,
    isLate: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["auto_compiled", "submitted", "approved"],
      default: "auto_compiled",
    },
  },
  { timestamps: true }
)

DistrictReportSchema.index({ districtId: 1, reportingWeek: -1 }, { unique: true })
DistrictReportSchema.index({ zoneId: 1, reportingWeek: -1 })

export const DistrictReport: Model<IDistrictReport> =
  mongoose.models.DistrictReport ??
  mongoose.model<IDistrictReport>("DistrictReport", DistrictReportSchema)
