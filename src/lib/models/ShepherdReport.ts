import mongoose, { Schema, Document, Model } from "mongoose"

export interface IShepherdReport extends Document {
  shepherdId: mongoose.Types.ObjectId
  branchId: mongoose.Types.ObjectId
  weekStarting: Date
  weekEnding: Date
  assignedSouls: number
  activeSouls: number
  inactiveSouls: number
  newConvertsAssigned: number
  familyClassEnrolled: number
  responsibilityClassEnrolled: number
  cellConnected: number
  workforceConnected: number
  challenges?: string
  prayerRequests?: string
  submissionMethod: "web" | "whatsapp"
  submittedAt?: Date
  isLate: boolean
  status: "draft" | "submitted"
  createdAt: Date
  updatedAt: Date
}

const ShepherdReportSchema = new Schema<IShepherdReport>(
  {
    shepherdId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    weekStarting: { type: Date, required: true },
    weekEnding: { type: Date, required: true },
    assignedSouls: { type: Number, default: 0, min: 0 },
    activeSouls: { type: Number, default: 0, min: 0 },
    inactiveSouls: { type: Number, default: 0, min: 0 },
    newConvertsAssigned: { type: Number, default: 0, min: 0 },
    familyClassEnrolled: { type: Number, default: 0, min: 0 },
    responsibilityClassEnrolled: { type: Number, default: 0, min: 0 },
    cellConnected: { type: Number, default: 0, min: 0 },
    workforceConnected: { type: Number, default: 0, min: 0 },
    challenges: String,
    prayerRequests: String,
    submissionMethod: { type: String, enum: ["web", "whatsapp"], default: "web" },
    submittedAt: Date,
    isLate: { type: Boolean, default: false },
    status: { type: String, enum: ["draft", "submitted"], default: "draft" },
  },
  { timestamps: true }
)

ShepherdReportSchema.index({ shepherdId: 1, weekEnding: -1 })
ShepherdReportSchema.index({ branchId: 1, weekEnding: -1 })
ShepherdReportSchema.index({ status: 1, branchId: 1 })

export const ShepherdReport: Model<IShepherdReport> =
  mongoose.models.ShepherdReport ??
  mongoose.model<IShepherdReport>("ShepherdReport", ShepherdReportSchema)
