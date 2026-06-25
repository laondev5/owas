import mongoose, { Schema, Document, Model } from "mongoose"
import {
  USER_ROLES, SHEPHERD_CATEGORIES, ORG_LEVELS,
  type UserRole, type ShepherdCategory, type OrgLevel,
} from "@/lib/constants"

// Re-export so existing imports from this file keep working
export type { UserRole, ShepherdCategory, OrgLevel }
export { USER_ROLES, SHEPHERD_CATEGORIES, ORG_LEVELS }

export interface IUser extends Document {
  name: string
  email: string
  passwordHash: string
  role: UserRole
  organizationId: mongoose.Types.ObjectId
  organizationLevel: OrgLevel
  shepherdTag?: string
  shepherdCategory?: ShepherdCategory
  whatsappPhone?: string
  isActive: boolean
  lastLogin?: Date
  resetToken?: string
  resetTokenExpiry?: Date
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    organizationLevel: { type: String, enum: ORG_LEVELS, required: true },
    shepherdTag: { type: String, sparse: true },
    shepherdCategory: { type: String, enum: SHEPHERD_CATEGORIES },
    whatsappPhone: { type: String, sparse: true },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    resetToken: { type: String, select: false },
    resetTokenExpiry: { type: Date, select: false },
  },
  { timestamps: true }
)

// email unique index is created by the field-level `unique: true` option
// whatsappPhone and shepherdTag sparse indexes are created by field-level `sparse: true`
UserSchema.index({ organizationId: 1, role: 1 })

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema)
