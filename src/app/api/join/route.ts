import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { Soul } from "@/lib/models/Soul"
import { Organization } from "@/lib/models/Organization"
import { User } from "@/lib/models/User"
import mongoose from "mongoose"

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { fullName, phone, address, gender, ageGroup, branchId, assignedShepherdId, dateWon, outreachType } = body

    if (!fullName?.trim()) return err("Full name is required", 400)
    if (!gender) return err("Gender is required", 400)
    if (!ageGroup) return err("Age group is required", 400)
    if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
      return err("Invalid or missing branch", 400)
    }

    await connectDB()

    const branch = await Organization.findById(branchId).lean()
    if (!branch) return err("Branch not found", 404)

    const soulData: Record<string, unknown> = {
      fullName: fullName.trim(),
      phone: phone?.trim() || undefined,
      address: address?.trim() || undefined,
      gender,
      ageGroup,
      outreachType: outreachType ?? "crusade",
      dateWon: dateWon ? new Date(dateWon) : new Date(),
      branchId: new mongoose.Types.ObjectId(branchId),
      locationWon: "Self-registered via QR/link",
      status: "new",
      integrationStage: {},
    }

    if (assignedShepherdId && mongoose.Types.ObjectId.isValid(assignedShepherdId)) {
      const shepherd = await User.findById(assignedShepherdId).select("shepherdTag").lean()
      soulData.assignedShepherdId = new mongoose.Types.ObjectId(assignedShepherdId)
      soulData.assignmentDate = new Date()
      if (shepherd?.shepherdTag) soulData.shepherdTag = shepherd.shepherdTag
    }

    const soul = await Soul.create(soulData)
    return ok({ id: soul._id.toString() }, 201)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
