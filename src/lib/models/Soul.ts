import mongoose, { Schema, Document, Model } from "mongoose"

export const SOUL_STATUSES = ["new", "active", "inactive", "backslidden", "sml_certified"] as const
export type SoulStatus = (typeof SOUL_STATUSES)[number]

export const OUTREACH_TYPES = ["GOWAS", "personal", "crusade"] as const
export const AGE_GROUPS = ["youth", "adult"] as const

export interface IntegrationStage {
  familyClassEnrolled?: Date
  familyClassCompleted?: Date
  responsibilityClassEnrolled?: Date
  responsibilityClassCompleted?: Date
  sortingOutEnrolled?: Date
  sortingOutCompleted?: Date
  hsosEnrolled?: Date
  hsosCompleted?: Date
  zibiEnrolled?: Date
  zibiCompleted?: Date
  sip101Enrolled?: Date
  sip101Completed?: Date
  sip102Enrolled?: Date
  sip102Completed?: Date
  sip103Enrolled?: Date
  sip103Completed?: Date
  projectCompleted?: Date
  smlCertifiedDate?: Date
  certificateUrl?: string
}

export interface SoulNote {
  text: string
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
}

export interface ISoul extends Document {
  fullName: string
  phone?: string
  address?: string
  locationWon?: string
  gender: "male" | "female"
  ageGroup: "youth" | "adult"
  branchId: mongoose.Types.ObjectId
  dateWon: Date
  outreachType: "GOWAS" | "personal" | "crusade"
  assignedShepherdId?: mongoose.Types.ObjectId
  shepherdTag?: string
  assignmentDate?: Date
  status: SoulStatus
  lastContactDate?: Date
  integrationStage: IntegrationStage
  isBaptized: boolean
  baptismDate?: Date
  cellConnected: boolean
  workforceConnected: boolean
  notes: SoulNote[]
  createdAt: Date
  updatedAt: Date
}

const IntegrationStageSchema = new Schema<IntegrationStage>(
  {
    familyClassEnrolled: Date,
    familyClassCompleted: Date,
    responsibilityClassEnrolled: Date,
    responsibilityClassCompleted: Date,
    sortingOutEnrolled: Date,
    sortingOutCompleted: Date,
    hsosEnrolled: Date,
    hsosCompleted: Date,
    zibiEnrolled: Date,
    zibiCompleted: Date,
    sip101Enrolled: Date,
    sip101Completed: Date,
    sip102Enrolled: Date,
    sip102Completed: Date,
    sip103Enrolled: Date,
    sip103Completed: Date,
    projectCompleted: Date,
    smlCertifiedDate: Date,
    certificateUrl: String,
  },
  { _id: false }
)

const SoulSchema = new Schema<ISoul>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    locationWon: { type: String, trim: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    ageGroup: { type: String, enum: AGE_GROUPS, required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    dateWon: { type: Date, required: true },
    outreachType: { type: String, enum: OUTREACH_TYPES, required: true },
    assignedShepherdId: { type: Schema.Types.ObjectId, ref: "User" },
    shepherdTag: String,
    assignmentDate: Date,
    status: { type: String, enum: SOUL_STATUSES, default: "new" },
    lastContactDate: Date,
    integrationStage: { type: IntegrationStageSchema, default: {} },
    isBaptized: { type: Boolean, default: false },
    baptismDate: Date,
    cellConnected: { type: Boolean, default: false },
    workforceConnected: { type: Boolean, default: false },
    notes: [
      {
        text: { type: String, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
)

SoulSchema.index({ branchId: 1, dateWon: -1 })
SoulSchema.index({ assignedShepherdId: 1, status: 1 })
SoulSchema.index({ status: 1, branchId: 1 })
SoulSchema.index({ lastContactDate: 1, status: 1 })
SoulSchema.index({ fullName: "text" })

export const Soul: Model<ISoul> =
  mongoose.models.Soul ?? mongoose.model<ISoul>("Soul", SoulSchema)
