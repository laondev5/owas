import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/User"
import { CreateUserSchema } from "@/lib/schemas/auth"
import { withAuth, logAudit, ok, err } from "@/lib/api-helpers"
import { sendMail, welcomeUserHtml } from "@/lib/mailer"
import { ROLE_LABELS } from "@/lib/utils"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"

// GET /api/users — list users (branch_coordinator+ can list their org's users)
export const GET = withAuth(async (req, { session }) => {
  await connectDB()
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20"))
  const role = url.searchParams.get("role") ?? undefined
  const orgId = url.searchParams.get("organizationId") ?? undefined

  const query: Record<string, unknown> = {}

  // Non-admins can only see users in their own organization
  if (session.user.role !== "super_admin" && session.user.role !== "national_coordinator") {
    query.organizationId = new mongoose.Types.ObjectId(session.user.organizationId)
  } else if (orgId) {
    query.organizationId = new mongoose.Types.ObjectId(orgId)
  }

  if (role) query.role = role

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-passwordHash")
      .populate("organizationId", "name code type")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ])

  return ok({ users, total, page, limit, pages: Math.ceil(total / limit) })
}, "branch_coordinator")

// POST /api/users — create user (branch_coordinator+ can create users in their org)
export const POST = withAuth(async (req, { session }) => {
  const body = await req.json()
  const result = CreateUserSchema.safeParse(body)
  if (!result.success) {
    return err(result.error.errors[0].message)
  }

  const { password, ...data } = result.data

  // Prevent creating users with higher privilege than self
  const ROLE_HIERARCHY: Record<string, number> = {
    super_admin: 10, national_coordinator: 9, regional_coordinator: 8,
    zonal_coordinator: 7, district_coordinator: 6, branch_coordinator: 5,
    chief_trainer: 4, mission_field_coordinator: 4, flight_shepherd: 3, viewer: 1,
  }

  if (
    session.user.role !== "super_admin" &&
    ROLE_HIERARCHY[data.role] >= ROLE_HIERARCHY[session.user.role]
  ) {
    return err("Cannot create user with equal or higher privilege", 403)
  }

  await connectDB()

  const existing = await User.findOne({ email: data.email.toLowerCase() })
  if (existing) return err("Email already in use")

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await User.create({
    ...data,
    passwordHash,
    organizationId: new mongoose.Types.ObjectId(data.organizationId),
  })

  await logAudit(session.user.id, "CREATE_USER", "User", user._id.toString(), undefined, {
    name: user.name,
    email: user.email,
    role: user.role,
  })

  // Send welcome email with credentials (non-blocking)
  const loginUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/login`
  sendMail({
    to: user.email,
    subject: "Welcome to HARPAZO-OWAS — Your Login Details",
    html: welcomeUserHtml({
      name: user.name,
      email: user.email,
      password,
      role: ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role,
      loginUrl,
    }),
  }).catch((e) => console.error("[welcome email]", e))

  return ok({ id: user._id, name: user.name, email: user.email, role: user.role }, 201)
}, "branch_coordinator")
