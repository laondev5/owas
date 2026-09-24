"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react"
import { ResetPasswordSchema, type ResetPasswordInput } from "@/lib/schemas/auth"

type TokenState = "checking" | "valid" | "invalid"

export default function SetupAccountForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [tokenState, setTokenState] = useState<TokenState>("checking")
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(ResetPasswordSchema),
  })

  useEffect(() => {
    if (!token) {
      setTokenState("invalid")
      return
    }
    fetch(`/api/setup-account?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.valid) {
          setName(json.data.name ?? null)
          setTokenState("valid")
        } else {
          setTokenState("invalid")
        }
      })
      .catch(() => setTokenState("invalid"))
  }, [token])

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true)
    try {
      const res = await fetch("/api/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...data }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Something went wrong")
      toast.success("Your password is set — you can sign in now")
      router.push("/login")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
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
          <img src="/HARPAZO_LOGO.png" alt="HARPAZO Logo" width={56} height={56} className="object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">HARPAZO-OWAS</h1>
        <p className="text-blue-200 text-sm mt-1">Living Faith Foundation</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        {tokenState === "checking" && (
          <div className="flex flex-col items-center py-6 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-[#1B4F72]" />
            <p className="text-sm text-gray-500">Checking your setup link…</p>
          </div>
        )}

        {tokenState === "invalid" && (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <XCircle className="h-10 w-10 text-red-400" />
            <h2 className="text-lg font-semibold text-gray-900">Link expired or invalid</h2>
            <p className="text-sm text-gray-500">
              This setup link has already been used, has expired, or is invalid. Ask your Branch
              Coordinator or the National OWAS Desk to create a new account for you.
            </p>
            <a href="/login" className="text-sm font-medium text-[#1B4F72] hover:underline mt-2">
              Back to login
            </a>
          </div>
        )}

        {tokenState === "valid" && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {name ? `Welcome, ${name}` : "Set up your account"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Choose a password to finish setting up your HARPAZO-OWAS account.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    {...register("password")}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent transition-all"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    {...register("confirmPassword")}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72] focus:border-transparent transition-all"
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#1B4F72] hover:bg-[#154360] text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {loading ? "Setting up…" : "Set Password & Continue"}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="text-center text-xs text-blue-200/60 mt-6">
        © {new Date().getFullYear()} Living Faith Foundation. All rights reserved.
      </p>
    </div>
  )
}
