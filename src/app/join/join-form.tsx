"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"

export default function JoinForm() {
  const params = useSearchParams()
  const branchId = params.get("branch") ?? ""
  const shepherdId = params.get("shepherd") ?? ""
  const eventName = params.get("event") ?? "Operation Win A Soul"

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    gender: "",
    ageGroup: "",
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.fullName.trim()) { setError("Full name is required"); return }
    if (!form.gender) { setError("Please select your gender"); return }
    if (!form.ageGroup) { setError("Please select your age group"); return }
    if (!branchId) { setError("Invalid invite link — branch information is missing"); return }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          branchId,
          assignedShepherdId: shepherdId || undefined,
          dateWon: new Date().toISOString(),
          outreachType: "crusade",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Submission failed")
      setSuccess(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#1B4F72] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl">
          <div className="text-6xl">🎉</div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Welcome to the Family!</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your information has been recorded. A shepherd will reach out to you soon to help you grow in your faith journey.
            </p>
          </div>
          <div className="h-1 w-20 mx-auto rounded-full bg-[#E67E22]" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#1B4F72]">Living Faith Foundation</p>
            <p className="text-xs text-gray-400">HARPAZO · Operation Win A Soul</p>
          </div>
        </div>
      </div>
    )
  }

  const inputClass =
    "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:bg-white focus:border-[#1B4F72]/40 transition-all placeholder:text-gray-300"

  return (
    <div className="min-h-screen bg-[#1B4F72]">
      {/* Top accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-[#E67E22] via-yellow-400 to-[#E67E22]" />

      <div className="max-w-md mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/HARPAZO_LOGO.png" alt="HARPAZO" width={56} height={56} className="object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome!</h1>
            <p className="text-[#E67E22] font-semibold text-sm mt-1">{eventName}</p>
          </div>
          <p className="text-blue-200/80 text-sm leading-relaxed max-w-xs mx-auto">
            You just made the most important decision of your life. Fill in your details so our team can walk this journey with you.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-[#1B4F72]/5 px-6 py-4 border-b">
            <p className="text-sm font-semibold text-[#1B4F72]">Your Information</p>
            <p className="text-xs text-gray-400 mt-0.5">All fields marked * are required</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Full Name <span className="text-red-400 normal-case tracking-normal">*</span>
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={set("fullName")}
                placeholder="e.g. John Adeyemi"
                className={inputClass}
                autoComplete="name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="e.g. 08012345678"
                className={inputClass}
                autoComplete="tel"
                inputMode="tel"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Home Address</label>
              <textarea
                value={form.address}
                onChange={set("address")}
                placeholder="Street, area, city..."
                rows={2}
                className={`${inputClass} resize-none`}
                autoComplete="street-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Gender <span className="text-red-400">*</span>
                </label>
                <select value={form.gender} onChange={set("gender")} className={inputClass}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Age Group <span className="text-red-400">*</span>
                </label>
                <select value={form.ageGroup} onChange={set("ageGroup")} className={inputClass}>
                  <option value="">Select</option>
                  <option value="youth">Youth</option>
                  <option value="adult">Adult</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#1B4F72] text-white rounded-2xl py-4 font-bold text-sm hover:bg-[#154360] active:scale-[0.98] transition-all disabled:opacity-50 mt-2 shadow-lg shadow-[#1B4F72]/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit & Connect with Us"
              )}
            </button>
          </div>

          <div className="px-6 pb-5 text-center">
            <p className="text-xs text-gray-400">
              Your information is safe and will only be used to connect you with a shepherd from our church.
            </p>
          </div>
        </div>

        <p className="text-center text-blue-300/50 text-xs mt-6">
          Living Faith Foundation · HARPAZO OWAS
        </p>
      </div>
    </div>
  )
}
