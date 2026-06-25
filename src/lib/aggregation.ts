import { connectDB } from "@/lib/db"
import { BranchReport } from "@/lib/models/BranchReport"
import { DistrictReport } from "@/lib/models/DistrictReport"
import { ZonalReport } from "@/lib/models/ZonalReport"
import { RegionalReport } from "@/lib/models/RegionalReport"
import { NationalReport } from "@/lib/models/NationalReport"
import { Organization } from "@/lib/models/Organization"
import mongoose from "mongoose"

type ObjId = mongoose.Types.ObjectId

// Sum all numeric fields in an array of objects (shallow)
function sumFields<T extends Record<string, number>>(items: T[]): T {
  if (items.length === 0) return {} as T
  const result = { ...items[0] }
  for (let i = 1; i < items.length; i++) {
    for (const key of Object.keys(result) as (keyof T)[]) {
      ;(result[key] as number) += (items[i][key] as number) ?? 0
    }
  }
  return result
}

// ---------- Branch → District ----------
export async function aggregateDistrict(districtId: ObjId, weekEnding: Date) {
  await connectDB()

  const branches = await Organization.find({ parentId: districtId, type: "branch", isActive: true }).lean()
  const branchIds = branches.map((b) => b._id)

  const reports = await BranchReport.find({
    branchId: { $in: branchIds },
    weekEnding,
    status: { $in: ["submitted", "approved"] },
  }).lean()

  const reporting = reports.length
  const outstanding = branchIds.length - reporting

  const zero = {
    soulsWon: 0, soulsReached: 0, firstTimers: 0, newConverts: 0,
    active: 0, inactive: 0, baptized: 0,
    familyClassEnrolled: 0, responsibilityClassEnrolled: 0, sipEnrolled: 0, smlCertified: 0,
    flightShepherdsActive: 0,
  }

  const aggregated = reports.length
    ? sumFields(
        reports.map((r) => ({
          soulsWon: r.gowas?.soulsWon ?? 0,
          soulsReached: r.gowas?.soulsReached ?? 0,
          firstTimers: r.gowas?.firstTimers ?? 0,
          newConverts: r.followUp?.newConverts ?? 0,
          active: r.followUp?.active ?? 0,
          inactive: r.followUp?.inactive ?? 0,
          baptized: r.baptism?.baptized ?? 0,
          familyClassEnrolled: r.fia?.familyClass?.enrolled ?? 0,
          responsibilityClassEnrolled: r.fia?.responsibilityClass?.enrolled ?? 0,
          sipEnrolled: r.fia?.sortingOut?.enrolled ?? 0,
          smlCertified: r.fia?.hsos?.completed ?? 0,
          flightShepherdsActive: r.flightShepherds?.totalActive ?? 0,
        }))
      )
    : zero

  await DistrictReport.findOneAndUpdate(
    { districtId, reportingWeek: weekEnding },
    {
      $set: {
        branchesReporting: reporting,
        branchesOutstanding: outstanding,
        aggregated,
        status: "auto_compiled",
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  )
}

// ---------- District → Zone ----------
export async function aggregateZone(zoneId: ObjId, weekEnding: Date) {
  await connectDB()

  const districts = await Organization.find({ parentId: zoneId, type: "district", isActive: true }).lean()
  const districtIds = districts.map((d) => d._id)

  const reports = await DistrictReport.find({
    districtId: { $in: districtIds },
    reportingWeek: weekEnding,
  }).lean()

  const reporting = reports.length
  const outstanding = districtIds.length - reporting

  const zero = {
    soulsWon: 0, soulsReached: 0, firstTimers: 0, newConverts: 0,
    active: 0, inactive: 0, baptized: 0,
    familyClassEnrolled: 0, responsibilityClassEnrolled: 0, sipEnrolled: 0, smlCertified: 0,
    flightShepherdsActive: 0,
  }

  const aggregated = reports.length
    ? sumFields(reports.map((r) => ({ ...zero, ...r.aggregated })))
    : zero

  await ZonalReport.findOneAndUpdate(
    { zoneId, reportingWeek: weekEnding },
    {
      $set: {
        districtsReporting: reporting,
        districtsOutstanding: outstanding,
        aggregated,
        status: "auto_compiled",
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  )
}

// ---------- Zone → Region ----------
export async function aggregateRegion(regionId: ObjId, weekEnding: Date) {
  await connectDB()

  const zones = await Organization.find({ parentId: regionId, type: "zone", isActive: true }).lean()
  const zoneIds = zones.map((z) => z._id)

  const reports = await ZonalReport.find({
    zoneId: { $in: zoneIds },
    reportingWeek: weekEnding,
  }).lean()

  const reporting = reports.length
  const outstanding = zoneIds.length - reporting

  const zero = {
    soulsWon: 0, soulsReached: 0, firstTimers: 0, newConverts: 0,
    active: 0, inactive: 0, baptized: 0,
    familyClassEnrolled: 0, responsibilityClassEnrolled: 0, sipEnrolled: 0, smlCertified: 0,
    flightShepherdsActive: 0,
  }

  const aggregated = reports.length
    ? sumFields(reports.map((r) => ({ ...zero, ...r.aggregated })))
    : zero

  const topZones = reports
    .sort((a, b) => (b.aggregated?.soulsWon ?? 0) - (a.aggregated?.soulsWon ?? 0))
    .slice(0, 5)
    .map((r) => ({ zoneId: r.zoneId, score: r.aggregated?.soulsWon ?? 0 }))

  await RegionalReport.findOneAndUpdate(
    { regionId, reportingWeek: weekEnding },
    {
      $set: {
        zonesReporting: reporting,
        zonesOutstanding: outstanding,
        aggregated,
        topZones,
        status: "auto_compiled",
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  )
}

// ---------- Region → National ----------
export async function aggregateNational(weekEnding: Date) {
  await connectDB()

  const regions = await Organization.find({ type: "region", isActive: true }).lean()
  const regionIds = regions.map((r) => r._id)

  const reports = await RegionalReport.find({
    regionId: { $in: regionIds },
    reportingWeek: weekEnding,
  }).lean()

  const zero = {
    soulsWon: 0, soulsReached: 0, firstTimers: 0, newConverts: 0,
    active: 0, inactive: 0, baptized: 0,
    familyClassEnrolled: 0, responsibilityClassEnrolled: 0, sipEnrolled: 0, smlCertified: 0,
    flightShepherdsActive: 0,
  }

  const aggregated = reports.length
    ? sumFields(reports.map((r) => ({ ...zero, ...r.aggregated })))
    : zero

  const year = weekEnding.getFullYear()
  const month = weekEnding.getMonth() + 1

  await NationalReport.findOneAndUpdate(
    { "reportingPeriod.year": year, "reportingPeriod.month": month },
    {
      $set: {
        "reportingPeriod.year": year,
        "reportingPeriod.month": month,
        regionsReporting: reports.length,
        regionsOutstanding: regionIds.length - reports.length,
        aggregated,
        status: "auto_compiled",
        updatedAt: new Date(),
      },
      $max: { "aggregated.soulsWon": aggregated.soulsWon },
    },
    { upsert: true, new: true }
  )
}

// ---------- Full cascade from branch upward ----------
export async function cascadeFromBranch(branchId: ObjId, weekEnding: Date) {
  await connectDB()

  const branch = await Organization.findById(branchId).lean()
  if (!branch) return

  const district = await Organization.findById(branch.parentId).lean()
  if (!district) return

  const zone = await Organization.findById(district.parentId).lean()
  if (!zone) return

  const region = await Organization.findById(zone.parentId).lean()
  if (!region) return

  await aggregateDistrict(district._id as ObjId, weekEnding)
  await aggregateZone(zone._id as ObjId, weekEnding)
  await aggregateRegion(region._id as ObjId, weekEnding)
  await aggregateNational(weekEnding)
}
