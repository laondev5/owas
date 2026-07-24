import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { AuditLog } from "@/lib/models/AuditLog"
import { connectDB } from "@/lib/db"
import type { UserRole } from "@/lib/models/User"
import mongoose from "mongoose"
import { ROLE_HIERARCHY, hasMinRole } from "@/lib/utils"

export { ROLE_HIERARCHY, hasMinRole }

type ApiHandler = (
  req: Request,
  context: {
    session: {
      user: {
        id: string
        name: string
        email: string
        role: UserRole
        organizationId: string
        organizationLevel: string
        shepherdTag?: string
      }
    }
    params?: Record<string, string>
  }
) => Promise<Response>

export function withAuth(handler: ApiHandler, minRole?: UserRole) {
  return async (req: Request, ctx?: { params?: Record<string, string> }) => {
    try {
      const session = await auth()

      if (!session?.user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
      }

      if (minRole && !hasMinRole(session.user.role as UserRole, minRole)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
      }

      return handler(req, { session: session as never, params: ctx?.params })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error"
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
  }
}

export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
) {
  try {
    await connectDB()
    await AuditLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      action,
      entityType,
      entityId: entityId ? new mongoose.Types.ObjectId(entityId) : undefined,
      before,
      after,
    })
  } catch {
    // Audit log failures should not block the main operation
  }
}

// Base URL for links embedded in outgoing emails/notifications.
// NEXTAUTH_URL must be set explicitly in production (Vercel project env vars —
// .env.local never gets deployed). VERCEL_URL is auto-injected by Vercel as a
// last-resort fallback so links never silently point at localhost in prod.
export function getAppUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

export function ok<T>(data: T, status = 200): Response {
  return NextResponse.json({ success: true, data }, { status })
}

export function err(message: string | Record<string, unknown>, status = 400): Response {
  return NextResponse.json({ success: false, error: message }, { status })
}
