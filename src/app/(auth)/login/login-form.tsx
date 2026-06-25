"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { LoginSchema, type LoginInput } from "@/lib/schemas/auth"

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    try {
      // NextAuth v5: signIn with redirect:false returns the redirect URL on success,
      // or throws / redirects to error page on failure.
      // We let it redirect naturally and catch the error URL via callbackUrl behaviour.
      await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirectTo: callbackUrl,
      })
      // If we reach here in some beta versions, push manually
      router.push(callbackUrl)
      router.refresh()
    } catch (err: unknown) {
      // NextAuth v5 throws an AuthError (which extends Error) on failure
      const message = err instanceof Error ? err.message : String(err)
      if (
        message.includes("CredentialsSignin") ||
        message.includes("credentials") ||
        message.includes("401")
      ) {
        toast.error("Invalid email or password")
      } else if (message.includes("NEXT_REDIRECT")) {
        // Successful redirect thrown by Next.js — not a real error
        router.push(callbackUrl)
        router.refresh()
      } else {
        toast.error("Invalid email or password")
        console.error("[login]", message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo & Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4 shadow-md overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="LFF Logo" width={56} height={56} className="object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">HARPAZO-OWAS</h1>
        <p className="text-blue-200 text-sm mt-1">Living Faith Foundation</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Sign in to your account</h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter your credentials to access the platform
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent transition-all"
              placeholder="you@lff.org"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent transition-all"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#1B4F72] hover:bg-[#154360] text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Need access? Contact your Branch Coordinator or Super Admin.
        </p>
      </div>

      <p className="text-center text-xs text-blue-200/60 mt-6">
        © {new Date().getFullYear()} Living Faith Foundation. All rights reserved.
      </p>
    </div>
  )
}
