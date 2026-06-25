/**
 * KPI calculation engine for HARPAZO-OWAS.
 * 8 metrics, total weight = 100%.
 * All ratios guarded against zero denominators — score stays 0 when base = 0.
 */

export interface BranchKpiInput {
  // Soulwinning
  soulsWon: number
  soulsReached: number
  soulsTarget: number // weekly branch target

  // Retention (active converts / total converts ever assigned)
  totalConvertsAssigned: number
  activeConverts: number

  // FIA Progress
  familyClassEnrolled: number
  responsibilityClassEnrolled: number
  sipEnrolled: number
  smlCertified: number
  totalConverts: number // denominator for FIA progress

  // Baptism
  baptized: number
  eligibleForBaptism: number // converts older than 3 months

  // Flight Shepherd System
  activeFlightShepherds: number
  totalFlightShepherds: number
  shepherdsWithFullAssignment: number // shepherds with 5 assigned

  // Evangelism Explosion
  trainedInEE: number
  targetTrainedInEE: number

  // HST Readiness
  hstReadyMembers: number
  totalMembers: number

  // Reporting Compliance
  reportsSubmittedOnTime: number
  totalReportsExpected: number
}

export interface KpiMetricScore {
  metric: string
  weight: number
  rawScore: number  // 0–100
  weightedScore: number
}

export interface KpiResult {
  totalScore: number // 0–100
  grade: "A" | "B" | "C" | "D" | "F"
  metrics: KpiMetricScore[]
}

// Clamp value between 0 and 100
function clamp(v: number): number {
  return Math.min(100, Math.max(0, v))
}

// Safe ratio → percentage, returns 0 when denominator ≤ 0
function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return clamp((numerator / denominator) * 100)
}

export function calculateBranchKpi(input: BranchKpiInput): KpiResult {
  const metrics: KpiMetricScore[] = []

  // 1. Souls Won (30%) — ratio of won to weekly target, capped at 100
  const soulsWonRaw = pct(input.soulsWon, input.soulsTarget)
  metrics.push({ metric: "soulsWon", weight: 30, rawScore: soulsWonRaw, weightedScore: soulsWonRaw * 0.3 })

  // 2. Retention (20%) — active / total assigned
  const retentionRaw = pct(input.activeConverts, input.totalConvertsAssigned)
  metrics.push({ metric: "retention", weight: 20, rawScore: retentionRaw, weightedScore: retentionRaw * 0.2 })

  // 3. FIA Progress (15%) — average of 4 FIA stages as % of total converts
  const fiaStageScores = [
    pct(input.familyClassEnrolled, input.totalConverts),
    pct(input.responsibilityClassEnrolled, input.totalConverts),
    pct(input.sipEnrolled, input.totalConverts),
    pct(input.smlCertified, input.totalConverts),
  ]
  const fiaRaw = input.totalConverts <= 0
    ? 0
    : clamp(fiaStageScores.reduce((a, b) => a + b, 0) / 4)
  metrics.push({ metric: "fiaProgress", weight: 15, rawScore: fiaRaw, weightedScore: fiaRaw * 0.15 })

  // 4. Baptism (10%) — baptized / eligible
  const baptismRaw = pct(input.baptized, input.eligibleForBaptism)
  metrics.push({ metric: "baptism", weight: 10, rawScore: baptismRaw, weightedScore: baptismRaw * 0.1 })

  // 5. Flight Shepherd System (10%) — 70% active rate + 30% full-assignment rate
  const activeRate = pct(input.activeFlightShepherds, input.totalFlightShepherds)
  const fullAssignRate = pct(input.shepherdsWithFullAssignment, input.totalFlightShepherds)
  const fssRaw = clamp(activeRate * 0.7 + fullAssignRate * 0.3)
  metrics.push({ metric: "flightShepherdSystem", weight: 10, rawScore: fssRaw, weightedScore: fssRaw * 0.1 })

  // 6. Evangelism Explosion (5%) — trained / target
  const eeRaw = pct(input.trainedInEE, input.targetTrainedInEE)
  metrics.push({ metric: "evangelismExplosion", weight: 5, rawScore: eeRaw, weightedScore: eeRaw * 0.05 })

  // 7. HST Readiness (5%) — HST-ready members / total members
  const hstRaw = pct(input.hstReadyMembers, input.totalMembers)
  metrics.push({ metric: "hstReadiness", weight: 5, rawScore: hstRaw, weightedScore: hstRaw * 0.05 })

  // 8. Reporting Compliance (5%) — on-time reports / expected
  const complianceRaw = pct(input.reportsSubmittedOnTime, input.totalReportsExpected)
  metrics.push({ metric: "reportingCompliance", weight: 5, rawScore: complianceRaw, weightedScore: complianceRaw * 0.05 })

  const totalScore = clamp(metrics.reduce((sum, m) => sum + m.weightedScore, 0))

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    grade: scoreToGrade(totalScore),
    metrics,
  }
}

function scoreToGrade(score: number): KpiResult["grade"] {
  if (score >= 85) return "A"
  if (score >= 70) return "B"
  if (score >= 55) return "C"
  if (score >= 40) return "D"
  return "F"
}

// --- Aggregation helpers for upward rollup ---

export interface AggregatedKpiInput {
  childScores: number[]      // total KPI scores from child entities
  reportingCompliance: number // 0–100 from this entity's own on-time submissions
}

/** Roll up child KPI scores into a parent-level score (simple average + own compliance). */
export function rollupKpi(input: AggregatedKpiInput): number {
  const { childScores, reportingCompliance } = input
  if (childScores.length === 0) return 0
  const avgChildScore = childScores.reduce((a, b) => a + b, 0) / childScores.length
  // Weight: 95% child average + 5% own compliance
  return clamp(avgChildScore * 0.95 + reportingCompliance * 0.05)
}

// --- 7M Progress calculation ---

export interface SevenMillionProgress {
  totalSoulsWonAllTime: number
  targetSouls: number // 7_000_000
  percentComplete: number
  projectedCompletionYear: number | null
  weeklyRate: number // souls/week average over last 4 weeks
}

export function calculateSevenMillionProgress(params: {
  totalSoulsWonAllTime: number
  last4WeeksSouls: number[]
  startYear: number
}): SevenMillionProgress {
  const TARGET = 7_000_000
  const { totalSoulsWonAllTime, last4WeeksSouls, startYear } = params

  const percentComplete = pct(totalSoulsWonAllTime, TARGET)
  const weeklyRate =
    last4WeeksSouls.length > 0
      ? last4WeeksSouls.reduce((a, b) => a + b, 0) / last4WeeksSouls.length
      : 0

  let projectedCompletionYear: number | null = null
  if (weeklyRate > 0) {
    const remaining = TARGET - totalSoulsWonAllTime
    const weeksRemaining = remaining / weeklyRate
    const yearsRemaining = weeksRemaining / 52
    projectedCompletionYear = Math.ceil(startYear + yearsRemaining)
  }

  return {
    totalSoulsWonAllTime,
    targetSouls: TARGET,
    percentComplete: Math.round(percentComplete * 100) / 100,
    projectedCompletionYear,
    weeklyRate: Math.round(weeklyRate),
  }
}
