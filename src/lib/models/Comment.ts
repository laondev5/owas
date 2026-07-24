import mongoose, { Schema, Document, Model } from "mongoose"

export interface IComment extends Document {
  authorId: mongoose.Types.ObjectId
  recipientId: mongoose.Types.ObjectId
  text: string
  createdAt: Date
}

const CommentSchema = new Schema<IComment>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

CommentSchema.index({ recipientId: 1, createdAt: -1 })

export const Comment: Model<IComment> =
  mongoose.models.Comment ?? mongoose.model<IComment>("Comment", CommentSchema)
