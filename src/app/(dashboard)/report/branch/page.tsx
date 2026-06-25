"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { getWeekEnding } from "@/lib/utils"
import { useState } from "react"

const FiaStageSchema = z.object({
  enrolled: z.number().int().min(0).default(0),
  completed: z.number().int().min(0).default(0),
})

const BranchReportFormSchema = z.object({
  gowas: z.object({
    participants: z.number().int().min(0).default(0),
    soulsReached: z.number().int().min(0).default(0),
    soulsWon: z.number().int().min(0).default(0),
    firstTimers: z.number().int().min(0).default(0),
  }),
  followUp: z.object({
    newConverts: z.number().int().min(0).default(0),
    assignedToShepherds: z.number().int().min(0).default(0),
    active: z.number().int().min(0).default(0),
    inactive: z.number().int().min(0).default(0),
  }),
  fia: z.object({
    familyClass: FiaStageSchema,
    responsibilityClass: FiaStageSchema,
    sortingOut: FiaStageSchema,
    hsos: FiaStageSchema,
    zibi: FiaStageSchema,
  }),
  baptism: z.object({
    baptized: z.number().int().min(0).default(0),
    awaitingBaptism: z.number().int().min(0).default(0),
  }),
  flightShepherds: z.object({
    ym: z.number().int().min(0).default(0),
    yf: z.number().int().min(0).default(0),
    m: z.number().int().min(0).default(0),
    w: z.number().int().min(0).default(0),
    totalActive: z.number().int().min(0).default(0),
    trainingStatus: z.string().default(""),
  }),
  evangelismExplosion: z.object({
    trained: z.number().int().min(0).default(0),
    ongoing: z.number().int().min(0).default(0),
  }),
  hst: z.object({
    status: z.enum(["ready", "ongoing", "about_to_start"]),
  }),
  testimonies: z.string().max(2000).optional(),
  challenges: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof BranchReportFormSchema>

const DEFAULT_FIA_STAGE = { enrolled: 0, completed: 0 }
const DEFAULT_VALUES: FormValues = {
  gowas: { participants: 0, soulsReached: 0, soulsWon: 0, firstTimers: 0 },
  followUp: { newConverts: 0, assignedToShepherds: 0, active: 0, inactive: 0 },
  fia: {
    familyClass: DEFAULT_FIA_STAGE,
    responsibilityClass: DEFAULT_FIA_STAGE,
    sortingOut: DEFAULT_FIA_STAGE,
    hsos: DEFAULT_FIA_STAGE,
    zibi: DEFAULT_FIA_STAGE,
  },
  baptism: { baptized: 0, awaitingBaptism: 0 },
  flightShepherds: { ym: 0, yf: 0, m: 0, w: 0, totalActive: 0, trainingStatus: "" },
  evangelismExplosion: { trained: 0, ongoing: 0 },
  hst: { status: "about_to_start" },
}

async function submitBranchReport(branchId: string, data: FormValues, status: "draft" | "submitted") {
  const res = await fetch("/api/reports/branch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branchId, ...data, status }),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(typeof json.error === "string" ? json.error : "Submission failed")
  }
  return res.json()
}

function NumberField({ label, name, register }: { label: string; name: string; register: ReturnType<typeof useForm<FormValues>>["register"] }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="number"
        min={0}
        {...(register as (name: string, opts: object) => object)(name, { valueAsNumber: true })}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/30 outline-none"
      />
    </div>
  )
}

type TabId = "gowas" | "followup" | "fia" | "baptism" | "shepherds" | "ee" | "notes"

export default function BranchReportPage() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<TabId>("gowas")
  const branchId = session?.user?.organizationId ?? ""

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(BranchReportFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const mutation = useMutation({
    mutationFn: ({ data, status }: { data: FormValues; status: "draft" | "submitted" }) =>
      submitBranchReport(branchId, data, status),
    onSuccess: (_, { status }) =>
      toast.success(status === "submitted" ? "Report submitted!" : "Draft saved"),
    onError: (e: Error) => toast.error(e.message),
  })

  const onSave = (status: "draft" | "submitted") =>
    handleSubmit((data) => mutation.mutate({ data, status }))()

  const weekEnding = getWeekEnding(new Date()).toLocaleDateString("en-NG", {
    day: "2-digit", month: "short", year: "numeric",
  })

  const TABS: { id: TabId; label: string }[] = [
    { id: "gowas", label: "GOWAS" },
    { id: "followup", label: "Follow-Up" },
    { id: "fia", label: "FIA" },
    { id: "baptism", label: "Baptism" },
    { id: "shepherds", label: "Flight Shepherds" },
    { id: "ee", label: "EE / HST" },
    { id: "notes", label: "Notes" },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Branch Weekly Report</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Week ending: <span className="font-medium text-foreground">{weekEnding}</span>
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md whitespace-nowrap transition-colors ${
              tab === id
                ? "bg-brand-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="space-y-6">
        {/* GOWAS */}
        {tab === "gowas" && (
          <section className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">GOWAS Outreach Figures</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "gowas.participants", label: "Participants" },
                { name: "gowas.soulsReached", label: "Souls Reached" },
                { name: "gowas.soulsWon", label: "Souls Won" },
                { name: "gowas.firstTimers", label: "First Timers" },
              ].map((f) => <NumberField key={f.name} {...f} register={register} />)}
            </div>
          </section>
        )}

        {/* Follow Up */}
        {tab === "followup" && (
          <section className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">Convert Follow-Up</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "followUp.newConverts", label: "New Converts" },
                { name: "followUp.assignedToShepherds", label: "Assigned to Shepherds" },
                { name: "followUp.active", label: "Active Converts" },
                { name: "followUp.inactive", label: "Inactive Converts" },
              ].map((f) => <NumberField key={f.name} {...f} register={register} />)}
            </div>
          </section>
        )}

        {/* FIA */}
        {tab === "fia" && (
          <section className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">FIA Integration Progress</h2>
            {[
              { key: "familyClass", label: "Family Class" },
              { key: "responsibilityClass", label: "Responsibility Class" },
              { key: "sortingOut", label: "Sorting Out" },
              { key: "hsos", label: "HSOS" },
              { key: "zibi", label: "ZIBI" },
            ].map(({ key, label }) => (
              <div key={key} className="grid grid-cols-2 gap-4 items-end">
                <div className="col-span-2 text-sm font-medium text-brand-primary">{label}</div>
                <NumberField name={`fia.${key}.enrolled`} label="Enrolled" register={register} />
                <NumberField name={`fia.${key}.completed`} label="Completed" register={register} />
              </div>
            ))}
          </section>
        )}

        {/* Baptism */}
        {tab === "baptism" && (
          <section className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">Baptism</h2>
            <div className="grid grid-cols-2 gap-4">
              <NumberField name="baptism.baptized" label="Baptized This Week" register={register} />
              <NumberField name="baptism.awaitingBaptism" label="Awaiting Baptism" register={register} />
            </div>
          </section>
        )}

        {/* Flight Shepherds */}
        {tab === "shepherds" && (
          <section className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">Flight Shepherd System</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "flightShepherds.ym", label: "Young Men (YM)" },
                { name: "flightShepherds.yf", label: "Young Female (YF)" },
                { name: "flightShepherds.m", label: "Men (M)" },
                { name: "flightShepherds.w", label: "Women (W)" },
                { name: "flightShepherds.totalActive", label: "Total Active" },
              ].map((f) => <NumberField key={f.name} {...f} register={register} />)}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Training Status</label>
              <input
                type="text"
                {...register("flightShepherds.trainingStatus")}
                placeholder="e.g. Phase 2 ongoing"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/30 outline-none"
              />
            </div>
          </section>
        )}

        {/* EE / HST */}
        {tab === "ee" && (
          <div className="space-y-4">
            <section className="rounded-xl border p-5 space-y-4">
              <h2 className="font-semibold">Evangelism Explosion</h2>
              <div className="grid grid-cols-2 gap-4">
                <NumberField name="evangelismExplosion.trained" label="Trained" register={register} />
                <NumberField name="evangelismExplosion.ongoing" label="Ongoing Training" register={register} />
              </div>
            </section>
            <section className="rounded-xl border p-5 space-y-3">
              <h2 className="font-semibold">HST Readiness</h2>
              <div className="flex gap-3">
                {(["ready", "ongoing", "about_to_start"] as const).map((v) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" {...register("hst.status")} value={v} className="accent-brand-primary" />
                    <span className="text-sm capitalize">{v.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Notes */}
        {tab === "notes" && (
          <section className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">Notes & Challenges</h2>
            {(["testimonies", "challenges"] as const).map((field) => (
              <div key={field} className="space-y-1">
                <label className="text-sm font-medium capitalize">{field}</label>
                <textarea
                  {...register(field)}
                  rows={4}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary/30 outline-none resize-none"
                  placeholder={field === "testimonies" ? "Share testimonies from this week..." : "Challenges and prayer requests..."}
                />
              </div>
            ))}
          </section>
        )}

        {/* Actions — always visible */}
        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={() => onSave("draft")}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => onSave("submitted")}
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
