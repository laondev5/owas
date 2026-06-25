import { connectDB } from "@/lib/db"
import { Soul } from "@/lib/models/Soul"
import { User } from "@/lib/models/User"
import { Notification } from "@/lib/models/Notification"
import { withAuth, ok, err } from "@/lib/api-helpers"
import { triggerUserNotification, PUSHER_EVENTS } from "@/lib/pusher"
import mongoose from "mongoose"

// GET /api/souls — list souls with role-based scoping
export const GET = withAuth(async (req, { session }) => {
  await connectDB()

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"))
  const branchId = url.searchParams.get("branchId") ?? undefined
  const status = url.searchParams.get("status") ?? undefined
  const search = url.searchParams.get("search") ?? undefined

  const query: Record<string, unknown> = {}

  if (session.user.role === "flight_shepherd") {
    query.assignedShepherdId = new mongoose.Types.ObjectId(session.user.id)
  } else if (
    session.user.role === "branch_coordinator" ||
    session.user.role === "chief_trainer" ||
    session.user.role === "mission_field_coordinator"
  ) {
    query.branchId = new mongoose.Types.ObjectId(session.user.organizationId)
  }

  if (branchId && session.user.role !== "flight_shepherd") {
    query.branchId = new mongoose.Types.ObjectId(branchId)
  }
  if (status) query.status = status
  if (search) query.fullName = { $regex: search, $options: "i" }

  const [souls, total] = await Promise.all([
    Soul.find(query)
      .populate("branchId", "name code")
      .populate("assignedShepherdId", "name shepherdTag")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Soul.countDocuments(query),
  ])

  return ok({ souls, total, page, pages: Math.ceil(total / limit) })
}, "flight_shepherd")

// POST /api/souls — register a new convert
export const POST = withAuth(async (req, { session }) => {
  const body = await req.json()

  const {
    fullName, phone, address, locationWon,
    gender, ageGroup, dateWon, outreachType,
    assignedShepherdId, initialNote,
  } = body

  if (!fullName || !gender || !ageGroup || !dateWon || !outreachType) {
    return err("fullName, gender, ageGroup, dateWon, and outreachType are required", 400)
  }

  await connectDB()

  // Branch coordinators and below always write to their own branch
  const branchId = session.user.organizationId

  const soulData: Record<string, unknown> = {
    fullName: fullName.trim(),
    phone: phone?.trim() || undefined,
    address: address?.trim() || undefined,
    locationWon: locationWon?.trim() || undefined,
    gender,
    ageGroup,
    outreachType,
    dateWon: new Date(dateWon),
    branchId: new mongoose.Types.ObjectId(branchId),
    status: "new",
    integrationStage: {},
  }

  if (assignedShepherdId) {
    soulData.assignedShepherdId = new mongoose.Types.ObjectId(assignedShepherdId)
    soulData.assignmentDate = new Date()

    // Copy shepherdTag from the shepherd user
    const shepherd = await User.findById(assignedShepherdId).select("shepherdTag").lean()
    if (shepherd?.shepherdTag) soulData.shepherdTag = shepherd.shepherdTag
  }

  // Add initial note if provided
  if (initialNote?.trim()) {
    soulData.notes = [
      { text: initialNote.trim(), createdBy: new mongoose.Types.ObjectId(session.user.id), createdAt: new Date() },
    ]
  }

  const soul = await Soul.create(soulData)

  // Populate for response
  const populated = await Soul.findById(soul._id)
    .populate("branchId", "name code")
    .populate("assignedShepherdId", "name shepherdTag")
    .lean()

  // Notify the assigned shepherd (non-blocking)
  if (assignedShepherdId) {
    const notifData = {
      recipientId: new mongoose.Types.ObjectId(assignedShepherdId),
      type: "convert_assigned" as const,
      channel: "in_app" as const,
      title: "New Convert Assigned",
      body: `${fullName} has been assigned to you for follow-up. Please make contact within 48 hours.`,
      relatedEntityId: soul._id,
      relatedEntityType: "Soul",
      status: "pending" as const,
    }

    Notification.create(notifData).then((notif) => {
      triggerUserNotification(assignedShepherdId, {
        id: notif._id.toString(),
        type: "convert_assigned",
        title: notifData.title,
        body: notifData.body,
        relatedEntityId: soul._id.toString(),
        relatedEntityType: "Soul",
        createdAt: notif.createdAt.toISOString(),
      })
    }).catch((e) => console.error("[soul notify]", e))
  }

  return ok(populated, 201)
}, "branch_coordinator")
