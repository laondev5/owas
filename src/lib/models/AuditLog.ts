import mongoose, { Schema, Document, Model } from "mongoose"

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId
  action: string
  entityType: string
  entityId?: mongoose.Types.ObjectId
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: Schema.Types.ObjectId,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

AuditLogSchema.index({ userId: 1, timestamp: -1 })
AuditLogSchema.index({ entityType: 1, entityId: 1 })
AuditLogSchema.index({ timestamp: -1 })

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ?? mongoose.model<IAuditLog>("AuditLog", AuditLogSchema)
