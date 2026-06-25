"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useForm, useController, Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { getWeekEnding } from "@/lib/utils"
import type { ShepherdReportInput } from "@/lib/schemas/reports"

// ─── Local form schema — numbers optional so fields can start empty ───────────

const FormSchema = z.object({
  assignedSouls: z.number({ invalid_type_error: "Required" }).int().min(0).optional(),
  activeSouls: z.number({ invalid_type_error: "Required" }).int().min(0).optional(),
  inactiveSouls: z.number({ invalid_type_error: "Required" }).int().min(0).optional(),
  newConvertsAssigned: z.number({ invalid_type_error: "Required" }).int().min(0).optional(),
  familyClassEnrolled: z.number({ invalid_type_error: "Required" }).int().min(0).optional(),
  responsibilityClassEnrolled: z.number({ invalid_type_error: "Required" }).int().min(0).optional(),
  cellConnected: z.number({ invalid_type_error: "Required" }).int().min(0).optional(),
  workforceConnected: z.number({ invalid_type_error: "Required" }).int().min(0).optional(),
  challenges: z.string().max(1000).optional(),
  prayerRequests: z.string().max(1000).optional(),
})

type FormValues = z.infer<typeof FormSchema>

// ─── Comma-formatted number input ─────────────────────────────────────────────

function formatNum(val: number): string {
  return val >= 1000 ? val.toLocaleString("en-NG") : String(val)
}

function NumInput({
  label,
  name,
  control,
  error,
}: {
  label: string
  name: keyof FormValues
  control: Control<FormValues>
  error?: string
}) {
  const { field } = useController({ name, control })
  const [display, setDisplay] = useState("")

  // Sync display when form values are set externally (e.g. draft loaded)
  useEffect(() => {
    const v = field.value as number | undefined
    if (v !== undefined && !isNaN(v)) {
      setDisplay(formatNum(v))
    }
  }, [field.value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "").replace(/[^\d]/g, "")
    if (raw === "") {
      setDisplay("")
      field.onChange(undefined)
    } else {
      const num = parseInt(raw, 10)
      setDisplay(formatNum(num))
      field.onChange(num)
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700 leading-snug">
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onBlur={field.onBlur}
        placeholder="—"
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30 text-center font-semibold placeholder:text-gray-300 placeholder:font-normal"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShepherdReportPage() {
  const { data: session } = useSession()
  const role = session?.user?.role

  const weekEnding = getWeekEnding(new Date())
  const weekEndingISO = weekEnding.toISOString()
  const weekEndingLabel = weekEnding.toLocaleDateString("en-NG", {
    day: "2-digit", month: "long", year: "numeric",
  })

  const { data: existing } = useQuery({
    queryKey: ["shepherd-report-draft"],
    queryFn: async () => {
      const res = await fetch("/api/reports/shepherd?limit=1")
      if (!res.ok) return null
      const json = await res.json()
      const reports = json.data as ({ weekEnding: string; status: string } & Record<string, unknown>)[]
      return reports.find((r) => Math.abs(new Date(r.weekEnding).getTime() - weekEnding.getTime()) < 86_400_000) ?? null
    },
    enabled: role === "flight_shepherd",
  })

  const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {},
  })

  useEffect(() => {
    if (!existing) return
    const numFields = [
      "assignedSouls", "activeSouls", "inactiveSouls", "newConvertsAssigned",
      "familyClassEnrolled", "responsibilityClassEnrolled", "cellConnected", "workforceConnected",
    ] as const
    numFields.forEach((f) => {
      const v = existing[f]
      if (typeof v === "number") setValue(f, v)
    })
    if (existing.challenges) setValue("challenges", existing.challenges as string)
    if (existing.prayerRequests) setValue("prayerRequests", existing.prayerRequests as string)
  }, [existing, setValue])

  const mutation = useMutation({
    mutationFn: async (payload: ShepherdReportInput & { status: "draft" | "submitted" }) => {
      const res = await fetch("/api/reports/shepherd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Submission failed")
      return json.data
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === "submitted" ? "Report submitted successfully!" : "Draft saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // Non-shepherd roles see an informational message instead of the form
  if (role && role !== "flight_shepherd") {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3">
        <p className="text-4xl">📋</p>
        <h2 className="text-xl font-semibold text-gray-800">Shepherd Report</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          This report is for Flight Shepherds only. As a coordinator, view your team&apos;s submitted reports under the Reports section.
        </p>
      </div>
    )
  }

  const submit = (status: "draft" | "submitted") =>
    handleSubmit((data) => {
      // Coerce undefined → 0 for API schema
      const payload: ShepherdReportInput & { status: typeof status } = {
        weekEnding: weekEndingISO,
        assignedSouls: data.assignedSouls ?? 0,
        activeSouls: data.activeSouls ?? 0,
        inactiveSouls: data.inactiveSouls ?? 0,
        newConvertsAssigned: data.newConvertsAssigned ?? 0,
        familyClassEnrolled: data.familyClassEnrolled ?? 0,
        responsibilityClassEnrolled: data.responsibilityClassEnrolled ?? 0,
        cellConnected: data.cellConnected ?? 0,
        workforceConnected: data.workforceConnected ?? 0,
        challenges: data.challenges || undefined,
        prayerRequests: data.prayerRequests || undefined,
        status,
      }
      mutation.mutate(payload)
    })()

  const isSubmitted = existing?.status === "submitted"

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shepherd Weekly Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Week ending: <span className="font-semibold text-gray-900">{weekEndingLabel}</span>
          </p>
        </div>
        {isSubmitted && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            ✓ Submitted
          </span>
        )}
      </div>

      <form className="space-y-5">
        {/* Convert Status */}
        <div className="rounded-xl border bg-white p-5 space-y-4 shadow-sm">
          <div>
            <h2 className="font-semibold text-base">Convert Status</h2>
            <p className="text-xs text-muted-foreground">Tell us about the converts currently under your care</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <NumInput label="How many converts are currently assigned to you?" name="assignedSouls" control={control} error={errors.assignedSouls?.message} />
            <NumInput label="How many of your converts are currently active?" name="activeSouls" control={control} error={errors.activeSouls?.message} />
            <NumInput label="How many of your converts are currently inactive?" name="inactiveSouls" control={control} error={errors.inactiveSouls?.message} />
            <NumInput label="How many new converts were assigned to you this week?" name="newConvertsAssigned" control={control} error={errors.newConvertsAssigned?.message} />
          </div>
        </div>

        {/* FIA Integration */}
        <div className="rounded-xl border bg-white p-5 space-y-4 shadow-sm">
          <div>
            <h2 className="font-semibold text-base">FIA Integration Progress</h2>
            <p className="text-xs text-muted-foreground">Track your converts&apos; progress through the integration journey</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <NumInput label="How many of your converts enrolled in Family Class this week?" name="familyClassEnrolled" control={control} error={errors.familyClassEnrolled?.message} />
            <NumInput label="How many of your converts enrolled in Responsibility Class this week?" name="responsibilityClassEnrolled" control={control} error={errors.responsibilityClassEnrolled?.message} />
          </div>
        </div>

        {/* Church Connection */}
        <div className="rounded-xl border bg-white p-5 space-y-4 shadow-sm">
          <div>
            <h2 className="font-semibold text-base">Church Connection</h2>
            <p className="text-xs text-muted-foreground">How well are your converts being rooted into church life?</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <NumInput label="How many of your converts got connected to a cell group this week?" name="cellConnected" control={control} error={errors.cellConnected?.message} />
            <NumInput label="How many of your converts got connected to a workforce this week?" name="workforceConnected" control={control} error={errors.workforceConnected?.message} />
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border bg-white p-5 space-y-4 shadow-sm">
          <h2 className="font-semibold text-base">Notes & Prayer Requests</h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">What challenges did you face with your converts this week?</label>
            <textarea
              {...register("challenges")}
              rows={3}
              placeholder="Share any difficulties, resistance, or obstacles you encountered..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Do any of your converts have specific prayer requests?</label>
            <textarea
              {...register("prayerRequests")}
              rows={3}
              placeholder="List prayer points for your converts so the church can intercede..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => submit("draft")}
            disabled={mutation.isPending || isSubmitted}
            className="px-5 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => submit("submitted")}
            disabled={mutation.isPending || isSubmitted}
            className="px-5 py-2.5 rounded-lg bg-[#1B4F72] text-white text-sm font-semibold hover:bg-[#154360] transition-colors disabled:opacity-40"
          >
            {mutation.isPending ? "Submitting..." : isSubmitted ? "Already Submitted" : "Submit Report"}
          </button>
        </div>
      </form>
    </div>
  )
}
