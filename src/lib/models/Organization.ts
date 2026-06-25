import mongoose, { Schema, Document, Model } from "mongoose"
import type { OrgLevel } from "./User"

export interface IOrganization extends Document {
  name: string
  code: string
  type: OrgLevel
  parentId?: mongoose.Types.ObjectId
  coordinatorId?: mongoose.Types.ObjectId
  region?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: {
      type: String,
      enum: ["national", "region", "zone", "district", "branch"],
      required: true,
    },
    parentId: { type: Schema.Types.ObjectId, ref: "Organization" },
    coordinatorId: { type: Schema.Types.ObjectId, ref: "User" },
    region: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

// code unique index is created by field-level `unique: true`
OrganizationSchema.index({ type: 1, parentId: 1 })
OrganizationSchema.index({ coordinatorId: 1 })

export const Organization: Model<IOrganization> =
  mongoose.models.Organization ??
  mongoose.model<IOrganization>("Organization", OrganizationSchema)
