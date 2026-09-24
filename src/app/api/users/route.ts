import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/User"
import { Organization } from "@/lib/models/Organization"
import { CreateUserSchema } from "@/lib/schemas/auth"
import { withAuth, logAudit, ok, err, getAppUrl } from "@/lib/api-helpers"
import { sendMail, welcomeUserHtml } from "@/lib/mailer"
import { ROLE_LABELS } from "@/lib/utils"
import { ORG_COORDINATOR_ROLE, BRANCH_STAFF_ROLES, getChildOrgLevel } from "@/lib/hierarchy"
import type { OrgLevel, UserRole } from "@/lib/constants"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import mongoose from "mongoose"

const SETUP_TOKEN_TTL_MS = 5 * 24 * 60 * 60 * 1000 // 5 days

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

// New accounts never get an emailed password (a live credential in an email is
// one of the strongest phishing/spam signals mail filters key on — see the
// reg-form vs lff-owas comparison that led to this). Instead they get a
// single-use setup link; the passwordHash below is an unguessable placeholder
// nobody is ever told, replaced the moment they complete setup.
async function randomPlaceholderHash(): Promise<string> {
  return bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12)
}

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

// POST /api/users — create user
// super_admin: unrestricted. Coordinators (branch_coordinator+): may only
// create the role directly under them (e.g. district_coordinator creates
// branch_coordinator, branch_coordinator creates flight_shepherd/chief_trainer/
// mission_field_coordinator), scoped to their own org subtree.
export const POST = withAuth(async (req, { session }) => {
  const body = await req.json()
  const result = CreateUserSchema.safeParse(body)
  if (!result.success) {
    return err(result.error.errors[0].message)
  }

  const data = result.data

  await connectDB()

  if (session.user.role !== "super_admin") {
    const childLevel = getChildOrgLevel(session.user.organizationLevel as OrgLevel)
    const allowedRoles: UserRole[] =
      session.user.role === "branch_coordinator"
        ? BRANCH_STAFF_ROLES
        : childLevel
          ? [ORG_COORDINATOR_ROLE[childLevel]]
          : []

    if (!allowedRoles.includes(data.role)) {
      return err("You can only create the role directly under you", 403)
    }

    if (session.user.role === "branch_coordinator") {
      if (data.organizationId !== session.user.organizationId) {
        return err("You can only create users in your own branch", 403)
      }
    } else {
      const targetOrg = await Organization.findById(data.organizationId).lean()
      if (!targetOrg || targetOrg.parentId?.toString() !== session.user.organizationId) {
        return err("You can only create this user for an organization directly under your own", 403)
      }
    }
  }

  const existing = await User.findOne({ email: data.email.toLowerCase() })
  if (existing) return err("Email already in use")

  const setupToken = crypto.randomBytes(32).toString("hex")
  const passwordHash = await randomPlaceholderHash()

  const user = await User.create({
    ...data,
    passwordHash,
    resetToken: hashToken(setupToken),
    resetTokenExpiry: new Date(Date.now() + SETUP_TOKEN_TTL_MS),
    organizationId: new mongoose.Types.ObjectId(data.organizationId),
  })

  // Auto-link the new user as their organization's coordinator, if their role is a coordinator role
  if (Object.values(ORG_COORDINATOR_ROLE).includes(user.role)) {
    await Organization.findByIdAndUpdate(user.organizationId, { coordinatorId: user._id })
  }

  await logAudit(session.user.id, "CREATE_USER", "User", user._id.toString(), undefined, {
    name: user.name,
    email: user.email,
    role: user.role,
  })

  // Email a one-time setup link (expires in 5 days) instead of a password —
  // awaited so a delivery failure is reported back to the admin instead of
  // silently disappearing into a log.
  const setupUrl = `${getAppUrl()}/setup-account?token=${setupToken}`
  let emailSent = true
  try {
    await sendMail({
      to: user.email,
      subject: `You've been added to HARPAZO-OWAS`,
      html: welcomeUserHtml({
        name: user.name,
        email: user.email,
        role: ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role,
        setupUrl,
      }),
    })
  } catch (e) {
    emailSent = false
    console.error("[welcome email]", e)
  }

  return ok(
    { id: user._id, name: user.name, email: user.email, role: user.role, emailSent, setupUrl: emailSent ? undefined : setupUrl },
    201
  )
}, "branch_coordinator")
