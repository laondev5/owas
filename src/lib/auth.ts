import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { connectDB } from "@/lib/db"
import { User } from "@/lib/models/User"
import type { UserRole, OrgLevel } from "@/lib/models/User"
import { authConfig } from "@/lib/auth.config"

declare module "next-auth" {
  interface User {
    role: UserRole
    organizationId: string
    organizationLevel: OrgLevel
    shepherdTag?: string
  }
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: UserRole
      organizationId: string
      organizationLevel: OrgLevel
      shepherdTag?: string
    }
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null

          await connectDB()
          const user = await User.findOne({
            email: (credentials.email as string).toLowerCase(),
            isActive: true,
          }).select("+passwordHash")

          if (!user) return null

          const valid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          )
          if (!valid) return null

          // Update lastLogin in background — don't let it block the response
          User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch(() => {})

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId.toString(),
            organizationLevel: user.organizationLevel,
            shepherdTag: user.shepherdTag,
          }
        } catch (err) {
          console.error("[authorize] error:", err)
          return null
        }
      },
    }),
  ],
})
