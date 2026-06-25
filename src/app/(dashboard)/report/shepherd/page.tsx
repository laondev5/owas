"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { getWeekEnding } from "@/lib/utils"

const ShepherdReportForm = z.object({
  assigned: z.number().int().min(0, "Must be ≥ 0"),
  active: z.number().int().min(0, "Must be ≥ 0"),
  inactive: z.number().int().min(0, "Must be ≥ 0"),
  newAssigned: z.number().int().min(0).default(0),
  contacts: z.number().int().min(0).default(0),
  prayerVisits: z.number().int().min(0).default(0),
  churchAttendance: z.number().int().min(0).default(0),
  notes: z.string().max(1000).optional(),
  challenges: z.string().max(1000).optional(),
  status: z.enum(["draft", "submitted"]).default("draft"),
}).refine((d) => d.active + d.inactive <= d.assigned, {
  message: "Active + inactive cannot exceed assigned converts",
  path: ["inactive"],
})

type FormValues = z.infer<typeof ShepherdReportForm>

async function submitShepherdReport(data: FormValues) {
  const res = await fetch("/api/reports/shepherd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      weekEnding: getWeekEnding(new Date()).toISOString(),
    }),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? "Submission failed")
  }
  return res.json()
}

export default function ShepherdReportPage() {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(ShepherdReportForm),
    defaultValues: {
      assigned: 0, active: 0, inactive: 0,
      newAssigned: 0, contacts: 0,
      prayerVisits: 0, churchAttendance: 0,
      status: "draft",
    },
  })

  const mutation = useMutation({
    mutationFn: submitShepherdReport,
    onSuccess: (_, vars) => {
      toast.success(vars.status === "submitted" ? "Report submitted!" : "Draft saved")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const onSaveDraft = handleSubmit((data) => mutation.mutate({ ...data, status: "draft" }))
  const onSubmit = handleSubmit((data) => mutation.mutate({ ...data, status: "submitted" }))

  const weekEnding = getWeekEnding(new Date()).toLocaleDateString("en-NG", {
    day: "2-digit", month: "short", year: "numeric",
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shepherd Report</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Week ending: <span className="font-medium text-foreground">{weekEnding}</span>
        </p>
      </div>

      <form className="space-y-6">
        {/* Convert Status */}
        <section className="rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-base">Convert Status</h2>
          <div className="grid grid-cols-3 gap-4">
            {(["assigned", "active", "inactive"] as const).map((field) => (
              <div key={field} className="space-y-1">
                <label className="text-sm font-medium capitalize">{field}</label>
                <input
                  type="number"
                  min={0}
                  {...register(field, { valueAsNumber: true })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/30 outline-none"
                />
                {errors[field] && (
                  <p className="text-xs text-destructive">{errors[field]?.message}</p>
                )}
              </div>
            ))}
          </div>
          {errors.inactive?.message && (
            <p className="text-xs text-destructive">{errors.inactive.message}</p>
          )}
        </section>

        {/* Weekly Activities */}
        <section className="rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-base">Weekly Activities</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { field: "newAssigned" as const, label: "Newly Assigned" },
              { field: "contacts" as const, label: "Total Contacts Made" },
              { field: "prayerVisits" as const, label: "Prayer Visits" },
              { field: "churchAttendance" as const, label: "Church Attendance" },
            ].map(({ field, label }) => (
              <div key={field} className="space-y-1">
                <label className="text-sm font-medium">{label}</label>
                <input
                  type="number"
                  min={0}
                  {...register(field, { valueAsNumber: true })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/30 outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Notes */}
        <section className="rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold text-base">Notes & Challenges</h2>
          {(["notes", "challenges"] as const).map((field) => (
            <div key={field} className="space-y-1">
              <label className="text-sm font-medium capitalize">{field}</label>
              <textarea
                {...register(field)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/30 outline-none resize-none"
                placeholder={field === "notes" ? "Testimonies and updates..." : "Challenges faced this week..."}
              />
            </div>
          ))}
        </section>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </form>
    </div>
  )
}
