import mongoose, { Schema, Document, Model } from "mongoose"

export const NOTIFICATION_TYPES = [
  "report_reminder",
  "report_overdue",
  "convert_inactive",
  "convert_assigned",
  "sml_certified",
  "kpi_published",
  "escalation",
  "digest",
  "supervisor_comment",
] as const

export const NOTIFICATION_CHANNELS = ["email", "whatsapp", "in_app"] as const
export const NOTIFICATION_STATUSES = ["pending", "sent", "failed", "read"] as const

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId
  recipientPhone?: string
  type: (typeof NOTIFICATION_TYPES)[number]
  channel: (typeof NOTIFICATION_CHANNELS)[number]
  title: string
  body: string
  relatedEntityId?: mongoose.Types.ObjectId
  relatedEntityType?: string
  status: (typeof NOTIFICATION_STATUSES)[number]
  scheduledAt?: Date
  sentAt?: Date
  retryCount: number
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientPhone: String,
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    relatedEntityId: Schema.Types.ObjectId,
    relatedEntityType: String,
    status: { type: String, enum: NOTIFICATION_STATUSES, default: "pending" },
    scheduledAt: Date,
    sentAt: Date,
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

NotificationSchema.index({ recipientId: 1, status: 1 })
NotificationSchema.index({ status: 1, scheduledAt: 1 })

export const Notification: Model<INotification> =
  mongoose.models.Notification ??
  mongoose.model<INotification>("Notification", NotificationSchema)
