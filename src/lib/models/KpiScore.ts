import mongoose, { Schema, Document, Model } from "mongoose"

interface KpiMetric {
  raw: number
  weighted: number
}

export interface IKpiScore extends Document {
  entityId: mongoose.Types.ObjectId
  entityType: "branch" | "district" | "zone"
  period: { month: number; year: number }
  scores: {
    soulsWon: KpiMetric
    retention: KpiMetric
    fiaProgress: KpiMetric
    baptism: KpiMetric
    flightShepherdSystem: KpiMetric
    evangelismExplosion: KpiMetric
    hstReadiness: KpiMetric
    reportingCompliance: KpiMetric
  }
  totalScore: number
  rank?: number
  createdAt: Date
  updatedAt: Date
}

const KpiMetricSchema = new Schema<KpiMetric>(
  { raw: { type: Number, default: 0 }, weighted: { type: Number, default: 0 } },
  { _id: false }
)

const KpiScoreSchema = new Schema<IKpiScore>(
  {
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityType: { type: String, enum: ["branch", "district", "zone"], required: true },
    period: {
      month: { type: Number, required: true },
      year: { type: Number, required: true },
    },
    scores: {
      soulsWon: KpiMetricSchema,
      retention: KpiMetricSchema,
      fiaProgress: KpiMetricSchema,
      baptism: KpiMetricSchema,
      flightShepherdSystem: KpiMetricSchema,
      evangelismExplosion: KpiMetricSchema,
      hstReadiness: KpiMetricSchema,
      reportingCompliance: KpiMetricSchema,
    },
    totalScore: { type: Number, default: 0 },
    rank: Number,
  },
  { timestamps: true }
)

KpiScoreSchema.index({ entityId: 1, "period.year": 1, "period.month": 1 }, { unique: true })
KpiScoreSchema.index({ entityType: 1, totalScore: -1 })

export const KpiScore: Model<IKpiScore> =
  mongoose.models.KpiScore ?? mongoose.model<IKpiScore>("KpiScore", KpiScoreSchema)
