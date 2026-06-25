import mongoose, { Schema, Document, Model } from "mongoose"

export interface INationalReport extends Document {
  reportingPeriod: { month: number; year: number }
  zonesCount: number
  districtsCount: number
  branchesCount: number
  regionsCount: number
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
  sevenMillionProgress: {
    currentTotal: number
    target: number
    percentage: number
  }
  topZones: Array<{ zoneId: mongoose.Types.ObjectId; score: number }>
  testimonies?: string
  recommendations?: string
  compiledBy?: mongoose.Types.ObjectId
  compiledAt?: Date
  createdAt: Date
  updatedAt: Date
}

const NationalReportSchema = new Schema<INationalReport>(
  {
    reportingPeriod: {
      month: { type: Number, required: true, min: 1, max: 12 },
      year: { type: Number, required: true },
    },
    zonesCount: { type: Number, default: 0 },
    districtsCount: { type: Number, default: 0 },
    branchesCount: { type: Number, default: 0 },
    regionsCount: { type: Number, default: 0 },
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
    sevenMillionProgress: {
      currentTotal: { type: Number, default: 0 },
      target: { type: Number, default: 7000000 },
      percentage: { type: Number, default: 0 },
    },
    topZones: [{ zoneId: { type: Schema.Types.ObjectId, ref: "Organization" }, score: Number }],
    testimonies: String,
    recommendations: String,
    compiledBy: { type: Schema.Types.ObjectId, ref: "User" },
    compiledAt: Date,
  },
  { timestamps: true }
)

NationalReportSchema.index(
  { "reportingPeriod.year": 1, "reportingPeriod.month": 1 },
  { unique: true }
)

export const NationalReport: Model<INationalReport> =
  mongoose.models.NationalReport ??
  mongoose.model<INationalReport>("NationalReport", NationalReportSchema)
