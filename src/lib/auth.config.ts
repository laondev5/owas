import type { NextAuthConfig } from "next-auth"

// Edge-safe auth config — NO mongoose imports here.
// The credentials provider is added in auth.ts (Node.js only).
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" as const },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          role?: string
          organizationId?: string
          organizationLevel?: string
          shepherdTag?: string
        }
        if (u.role) token.role = u.role
        if (u.organizationId) token.organizationId = u.organizationId
        if (u.organizationLevel) token.organizationLevel = u.organizationLevel
        if (u.shepherdTag !== undefined) token.shepherdTag = u.shepherdTag
      }
      return token
    },
    async session({ session, token }) {
      const t = token as {
        sub?: string
        role?: string
        organizationId?: string
        organizationLevel?: string
        shepherdTag?: string
      }
      if (t.sub) session.user.id = t.sub
      Object.assign(session.user, {
        role: t.role,
        organizationId: t.organizationId,
        organizationLevel: t.organizationLevel,
        shepherdTag: t.shepherdTag,
      })
      return session
    },
  },
} satisfies NextAuthConfig
