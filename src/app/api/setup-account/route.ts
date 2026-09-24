import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/User"
import { SetupAccountSchema } from "@/lib/schemas/auth"
import { ok, err } from "@/lib/api-helpers"
import bcrypt from "bcryptjs"
import crypto from "crypto"

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

// GET /api/setup-account?token=... — check a setup link is still valid before
// showing the form, so an expired/used link gets a clear message immediately.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return err("Missing token", 400)

  await connectDB()
  const user = await User.findOne({
    resetToken: hashToken(token),
    resetTokenExpiry: { $gt: new Date() },
  })
    .select("name")
    .lean()

  if (!user) return ok({ valid: false })
  return ok({ valid: true, name: user.name })
}

// POST /api/setup-account — consume a one-time setup link and set the
// account's real password. No auth — the token itself is the credential.
export async function POST(req: Request) {
  const body = await req.json()
  const result = SetupAccountSchema.safeParse(body)
  if (!result.success) return err(result.error.errors[0].message, 400)

  await connectDB()
  const user = await User.findOne({
    resetToken: hashToken(result.data.token),
    resetTokenExpiry: { $gt: new Date() },
  })

  if (!user) return err("This setup link is invalid or has expired. Ask your coordinator for a new one.", 400)

  user.passwordHash = await bcrypt.hash(result.data.password, 12)
  user.resetToken = undefined
  user.resetTokenExpiry = undefined
  await user.save()

  return ok({ success: true })
}
