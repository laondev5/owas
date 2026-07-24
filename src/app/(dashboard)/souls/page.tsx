"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { hasMinRole } from "@/lib/utils"
import type { UserRole } from "@/lib/constants"
import type { IntegrationStage } from "@/lib/models/Soul"
import { X, Phone, MapPin, User, Calendar, Tag, MessageSquare, CheckCircle2, UserCheck } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Soul {
  _id: string
  fullName: string
  phone?: string
  address?: string
  locationWon?: string
  gender: "male" | "female"
  ageGroup: "youth" | "adult"
  outreachType: string
  status: "new" | "active" | "inactive" | "backslidden" | "sml_certified"
  dateWon: string
  lastContactDate?: string
  shepherdTag?: string
  integrationStage: IntegrationStage
  assignedShepherdId?: { _id: string; name: string; shepherdTag?: string }
  branchId?: { _id: string; name: string; code: string }
  notes?: { text: string; createdBy: { name?: string }; createdAt: string }[]
}

interface Shepherd {
  _id: string
  name: string
  shepherdTag?: string
  shepherdCategory?: string
  soulsAssigned?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STAGES_ORDERED = ["zibi", "hsos", "sortingOut", "responsibilityClass", "familyClass"] as const
const STAGE_LABELS: Record<string, string> = {
  zibi: "ZIBI", hsos: "HSOS", sortingOut: "Sorting Out",
  responsibilityClass: "Resp. Class", familyClass: "Family Class",
}
const STAGE_COLORS: Record<string, string> = {
  ZIBI: "bg-purple-100 text-purple-700",
  HSOS: "bg-blue-100 text-blue-700",
  "Sorting Out": "bg-cyan-100 text-cyan-700",
  "Resp. Class": "bg-indigo-100 text-indigo-700",
  "Family Class": "bg-sky-100 text-sky-700",
}
const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  inactive: "bg-red-100 text-red-700",
  backslidden: "bg-orange-100 text-orange-700",
  sml_certified: "bg-purple-100 text-purple-700",
}

function getHighestStage(stage: IntegrationStage | undefined | null): string | null {
  if (!stage) return null
  for (const s of STAGES_ORDERED) {
    const key = `${s}Completed` as keyof IntegrationStage
    if (stage[key]) return STAGE_LABELS[s]
  }
  return null
}

function daysAgo(dateStr?: string) {
  if (!dateStr) return null
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  return { label: diff === 0 ? "Today" : diff === 1 ? "Yesterday" : `${diff}d ago`, stale: diff > 30 }
}

const field = "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30"
const label = "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1"

// ─── Add Convert Modal ────────────────────────────────────────────────────────

function AddConvertModal({ branchName, shepherds, selfShepherdId, selfRole, onClose }: {
  branchName?: string
  shepherds: Shepherd[]
  selfShepherdId?: string
  selfRole?: string
  onClose: () => void
}) {
  const isShepherd = selfRole === "flight_shepherd"
  const qc = useQueryClient()
  const [form, setForm] = useState({
    fullName: "", phone: "", address: "", locationWon: "",
    gender: "male", ageGroup: "adult", outreachType: "GOWAS",
    dateWon: new Date().toISOString().split("T")[0],
    assignedShepherdId: isShepherd && selfShepherdId ? selfShepherdId : "",
    initialNote: "",
  })

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/souls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to register convert")
      return json.data
    },
    onSuccess: (soul: Soul) => {
      toast.success(`${soul.fullName} registered successfully`)
      if (soul.assignedShepherdId) {
        toast.info(`Shepherd ${soul.assignedShepherdId.name} has been notified`)
      }
      qc.invalidateQueries({ queryKey: ["souls"] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full max-w-2xl rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between border-b px-6 py-4 z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Register New Convert</h2>
            {branchName && <p className="text-xs text-muted-foreground mt-0.5">Branch: {branchName}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="p-6 space-y-5">
          {/* Personal Info */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#1B4F72] mb-3">Personal Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={label}>Full Name *</label>
                <input name="fullName" value={form.fullName} onChange={set} required
                  placeholder="e.g. John Emmanuel Doe" className={field} />
              </div>
              <div>
                <label className={label}>Phone Number</label>
                <input name="phone" value={form.phone} onChange={set}
                  placeholder="08012345678" className={field} />
              </div>
              <div>
                <label className={label}>Gender *</label>
                <select name="gender" value={form.gender} onChange={set} required className={field}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className={label}>Age Group *</label>
                <select name="ageGroup" value={form.ageGroup} onChange={set} required className={field}>
                  <option value="adult">Adult (18+)</option>
                  <option value="youth">Youth (under 18)</option>
                </select>
              </div>
              <div>
                <label className={label}>Home Address</label>
                <input name="address" value={form.address} onChange={set}
                  placeholder="Street / Area / Town" className={field} />
              </div>
            </div>
          </div>

          {/* Outreach Details */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#1B4F72] mb-3">Outreach Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>Date Won *</label>
                <input name="dateWon" type="date" value={form.dateWon} onChange={set} required className={field} />
              </div>
              <div>
                <label className={label}>Outreach Type *</label>
                <select name="outreachType" value={form.outreachType} onChange={set} required className={field}>
                  <option value="GOWAS">GOWAS (Group)</option>
                  <option value="personal">Personal Evangelism</option>
                  <option value="crusade">Crusade / Program</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Location / Where They Were Won</label>
                <input name="locationWon" value={form.locationWon} onChange={set}
                  placeholder="e.g. Jakande Market, Lagos Island..." className={field} />
              </div>
            </div>
          </div>

          {/* Shepherd Assignment */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#1B4F72] mb-3">Shepherd Assignment</p>
            <div>
              <label className={label}>Assign Flight Shepherd</label>
              {isShepherd ? (
                <div className={`${field} bg-muted/50 text-muted-foreground cursor-not-allowed`}>
                  Assigned to you
                </div>
              ) : (
                <select name="assignedShepherdId" value={form.assignedShepherdId} onChange={set} className={field}>
                  <option value="">— Unassigned (assign later) —</option>
                  {shepherds.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}{s.shepherdTag ? ` (${s.shepherdTag})` : ""}{s.shepherdCategory ? ` · ${s.shepherdCategory}` : ""}
                      {s.soulsAssigned !== undefined ? ` · ${s.soulsAssigned} souls` : ""}
                    </option>
                  ))}
                </select>
              )}
              {form.assignedShepherdId && (
                <p className="text-xs text-green-600 mt-1.5">
                  ✓ {isShepherd ? "Assigned to you automatically" : "Shepherd will be notified immediately after registration"}
                </p>
              )}
            </div>
          </div>

          {/* Initial Note */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#1B4F72] mb-3">Follow-Up Notes</p>
            <div>
              <label className={label}>Initial Note (optional)</label>
              <textarea name="initialNote" value={form.initialNote} onChange={set} rows={3}
                placeholder="Any additional context about this convert — receptiveness, prayer points, how to reach them..."
                className={`${field} resize-none`} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose}
              className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="bg-[#1B4F72] text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-[#154360] transition-colors disabled:opacity-50">
              {mutation.isPending ? "Registering..." : "Register Convert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Convert Detail Drawer ────────────────────────────────────────────────────

function ConvertDrawer({ soul, onClose, onUpdate, shepherds, canReassign }: {
  soul: Soul
  onClose: () => void
  onUpdate: () => void
  shepherds: Shepherd[]
  canReassign: boolean
}) {
  const qc = useQueryClient()
  const [note, setNote] = useState("")
  const [activeTab, setActiveTab] = useState<"info" | "stage" | "notes">("info")
  const [reassigning, setReassigning] = useState(false)
  const [newShepherdId, setNewShepherdId] = useState("")

  const { data } = useQuery<{ success: boolean; data: Soul }>({
    queryKey: ["soul", soul._id],
    queryFn: () => fetch(`/api/souls/${soul._id}`).then((r) => r.json()),
    initialData: { success: true, data: soul },
  })

  const detail = data?.data ?? soul

  const patchMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch(`/api/souls/${soul._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["souls"] })
      qc.invalidateQueries({ queryKey: ["soul", soul._id] })
      onUpdate()
    },
  })

  const logContact = () => {
    patchMutation.mutate({ lastContactDate: new Date().toISOString() }, {
      onSuccess: () => toast.success("Contact logged"),
    })
  }

  const addNote = () => {
    if (!note.trim()) return
    patchMutation.mutate({ note }, {
      onSuccess: () => { toast.success("Note added"); setNote("") },
    })
  }

  const setStatus = (status: string) => {
    patchMutation.mutate({ status }, {
      onSuccess: () => toast.success(`Status updated to ${status}`),
    })
  }

  const reassignShepherd = () => {
    if (!newShepherdId) return
    patchMutation.mutate({ assignedShepherdId: newShepherdId }, {
      onSuccess: () => {
        toast.success("Convert reassigned — shepherd notified")
        setReassigning(false)
        setNewShepherdId("")
      },
    })
  }

  const contact = daysAgo(detail.lastContactDate)
  const stage = getHighestStage(detail.integrationStage)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b bg-[#1B4F72] text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">{detail.fullName}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-blue-100 text-xs">
                <span className="capitalize">{detail.gender}</span>
                <span>·</span>
                <span className="capitalize">{detail.ageGroup}</span>
                <span>·</span>
                <span>{detail.outreachType}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Status + quick actions */}
          <div className="flex items-center gap-2 mt-4">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[detail.status] ?? "bg-gray-100 text-gray-700"}`}>
              {detail.status.replace("_", " ")}
            </span>
            {stage && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STAGE_COLORS[stage] ?? "bg-gray-100 text-gray-600"}`}>
                {stage}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b text-sm font-medium">
          {(["info", "stage", "notes"] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-3 capitalize transition-colors ${activeTab === t ? "border-b-2 border-[#1B4F72] text-[#1B4F72]" : "text-muted-foreground hover:text-gray-900"}`}>
              {t === "info" ? "Details" : t === "stage" ? "Integration" : "Notes"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ── Details Tab ── */}
          {activeTab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {detail.phone && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{detail.phone}</p>
                    </div>
                  </div>
                )}
                {detail.address && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Home Address</p>
                      <p className="text-sm font-medium">{detail.address}</p>
                    </div>
                  </div>
                )}
                {detail.locationWon && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <MapPin className="h-4 w-4 text-[#E67E22] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Where They Were Won</p>
                      <p className="text-sm font-medium">{detail.locationWon}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date Won</p>
                    <p className="text-sm font-medium">{new Date(detail.dateWon).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                </div>
                {detail.assignedShepherdId && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned Shepherd</p>
                      <p className="text-sm font-medium">{detail.assignedShepherdId.name}</p>
                      {detail.assignedShepherdId.shepherdTag && (
                        <p className="text-xs text-[#1B4F72] font-medium">{detail.assignedShepherdId.shepherdTag}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Contact</p>
                    <p className={`text-sm font-medium ${contact?.stale ? "text-red-600" : ""}`}>
                      {contact ? contact.label : "Never contacted"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={logContact} disabled={patchMutation.isPending}
                    className="flex items-center justify-center gap-2 rounded-lg border border-[#1B4F72] text-[#1B4F72] py-2.5 text-xs font-semibold hover:bg-[#1B4F72]/5 transition-colors disabled:opacity-50">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Log Contact Today
                  </button>
                  {["active", "inactive", "backslidden"].map((s) => (
                    detail.status !== s && (
                      <button key={s} onClick={() => setStatus(s)} disabled={patchMutation.isPending}
                        className="rounded-lg border py-2.5 text-xs font-semibold hover:bg-muted transition-colors capitalize disabled:opacity-50">
                        Mark {s}
                      </button>
                    )
                  ))}
                </div>
              </div>

              {/* Reassign shepherd — coordinators and above only */}
              {canReassign && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reassign Shepherd</p>
                  {!reassigning ? (
                    <button
                      onClick={() => setReassigning(true)}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Change Shepherd
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={newShepherdId}
                        onChange={(e) => setNewShepherdId(e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30"
                      >
                        <option value="">— Select shepherd —</option>
                        {shepherds.map((s) => (
                          <option key={s._id} value={s._id}>{s.name}{s.shepherdTag ? ` (${s.shepherdTag})` : ""}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={reassignShepherd}
                          disabled={!newShepherdId || patchMutation.isPending}
                          className="flex-1 rounded-lg bg-[#1B4F72] text-white py-2 text-xs font-semibold hover:bg-[#154360] transition-colors disabled:opacity-40"
                        >
                          {patchMutation.isPending ? "Saving…" : "Confirm"}
                        </button>
                        <button
                          onClick={() => { setReassigning(false); setNewShepherdId("") }}
                          className="flex-1 rounded-lg border py-2 text-xs font-semibold text-gray-600 hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Integration Tab ── */}
          {activeTab === "stage" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">FIA Integration Progress (5 stages)</p>
              {[
                { key: "familyClass", label: "Family Class", desc: "New believers class" },
                { key: "responsibilityClass", label: "Responsibility Class", desc: "Church membership responsibilities" },
                { key: "sortingOut", label: "Sorting Out", desc: "Lifestyle alignment" },
                { key: "hsos", label: "HSOS", desc: "Holy Spirit and spiritual gifts" },
                { key: "zibi", label: "ZIBI", desc: "Leadership development" },
              ].map(({ key, label: stageLabel, desc }) => {
                const enrolled = detail.integrationStage?.[`${key}Enrolled` as keyof IntegrationStage]
                const completed = detail.integrationStage?.[`${key}Completed` as keyof IntegrationStage]
                return (
                  <div key={key} className={`p-3.5 rounded-xl border-2 ${completed ? "border-green-200 bg-green-50" : enrolled ? "border-blue-200 bg-blue-50" : "border-gray-100 bg-gray-50"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{stageLabel}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${completed ? "bg-green-100 text-green-700" : enrolled ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                        {completed ? "Completed" : enrolled ? "Enrolled" : "Not started"}
                      </span>
                    </div>
                    {enrolled && !completed && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Enrolled: {new Date(enrolled as string).toLocaleDateString()}
                      </p>
                    )}
                    {completed && (
                      <p className="text-xs text-green-700 mt-1">
                        Completed: {new Date(completed as string).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Notes Tab ── */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="space-y-3">
                {(detail.notes ?? []).length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-6">No notes yet</p>
                )}
                {(detail.notes ?? []).map((n, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30 border">
                    <p className="text-sm text-gray-800">{n.text}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {n.createdBy?.name ?? "Unknown"} · {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Add note */}
              <div className="border-t pt-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Add Note</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                  placeholder="Contact outcome, prayer points, next steps..."
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30 resize-none" />
                <button onClick={addNote} disabled={!note.trim() || patchMutation.isPending}
                  className="mt-2 flex items-center gap-2 bg-[#1B4F72] text-white rounded-lg px-4 py-2 text-xs font-semibold hover:bg-[#154360] transition-colors disabled:opacity-50">
                  <MessageSquare className="h-3.5 w-3.5" /> Save Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SoulsPage() {
  const { data: session } = useSession()
  const role = session?.user?.role as UserRole | undefined

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [selectedSoul, setSelectedSoul] = useState<Soul | null>(null)

  const canCreate = role ? hasMinRole(role, "flight_shepherd") : false

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
    const v = e.target.value
    setTimeout(() => setDebouncedSearch(v), 350)
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["souls", debouncedSearch, status, page],
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (debouncedSearch) sp.set("search", debouncedSearch)
      if (status !== "all") sp.set("status", status)
      sp.set("page", String(page))
      sp.set("limit", "20")
      const res = await fetch(`/api/souls?${sp}`)
      if (!res.ok) throw new Error("Failed")
      const json = await res.json()
      return json.data as { souls: Soul[]; total: number; page: number; pages: number }
    },
    placeholderData: (p) => p,
    enabled: !!session,
  })

  // Fetch shepherds for the form
  const { data: shepherdsData } = useQuery({
    queryKey: ["shepherds-list"],
    queryFn: async () => {
      const res = await fetch("/api/shepherds")
      if (!res.ok) return []
      const json = await res.json()
      return json.data as Shepherd[]
    },
    enabled: canCreate,
  })

  // Fetch branch name for the form header
  const { data: orgsData } = useQuery({
    queryKey: ["my-org"],
    queryFn: async () => {
      const res = await fetch(`/api/organizations?id=${session?.user?.organizationId}`)
      if (!res.ok) return null
      const json = await res.json()
      return json.data?.[0] ?? null
    },
    enabled: canCreate && !!session?.user?.organizationId,
  })

  return (
    <div className="space-y-6">
      {showModal && (
        <AddConvertModal
          branchName={orgsData?.name}
          shepherds={shepherdsData ?? []}
          selfShepherdId={session?.user?.id}
          selfRole={role}
          onClose={() => setShowModal(false)}
        />
      )}
      {selectedSoul && (
        <ConvertDrawer
          soul={selectedSoul}
          onClose={() => setSelectedSoul(null)}
          onUpdate={() => refetch()}
          shepherds={shepherdsData ?? []}
          canReassign={role ? hasMinRole(role, "branch_coordinator") : false}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Converts Registry</h1>
          {data && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1B4F72]/10 text-[#1B4F72]">
              {data.total.toLocaleString()}
            </span>
          )}
        </div>
        {canCreate && (
          <button onClick={() => setShowModal(true)}
            className="bg-[#1B4F72] text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[#154360] transition-colors">
            + Register Convert
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input type="text" value={search} onChange={handleSearchChange}
          placeholder="Search by name..."
          className="w-full sm:w-72 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30">
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="backslidden">Backslidden</option>
          <option value="sml_certified">SML Certified</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {["Name & Contact", "Date Won", "Location", "Status", "Stage", "Shepherd", "Last Contact", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30 border-b whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Loading converts...</td></tr>
            )}
            {isError && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-red-500">Failed to load. Please try again.</td></tr>
            )}
            {!isLoading && !isError && data?.souls.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center">
                <p className="text-muted-foreground">No converts found</p>
                {canCreate && <button onClick={() => setShowModal(true)} className="mt-2 text-[#1B4F72] text-sm font-medium hover:underline">Register your first convert →</button>}
              </td></tr>
            )}
            {data?.souls.map((soul) => {
              const stage = getHighestStage(soul.integrationStage)
              const contact = daysAgo(soul.lastContactDate)
              return (
                <tr key={soul._id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 border-b border-muted/50">
                    <p className="font-semibold text-gray-900">{soul.fullName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{soul.gender} · {soul.ageGroup}</p>
                    {soul.phone && <p className="text-xs text-muted-foreground">{soul.phone}</p>}
                  </td>
                  <td className="px-4 py-3 border-b border-muted/50 whitespace-nowrap text-sm text-gray-700">
                    {soul.dateWon ? new Date(soul.dateWon).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3 border-b border-muted/50 max-w-[160px]">
                    <p className="text-xs text-muted-foreground truncate">{soul.locationWon || "—"}</p>
                  </td>
                  <td className="px-4 py-3 border-b border-muted/50">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[soul.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {soul.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-muted/50">
                    {stage ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stage] ?? "bg-gray-100 text-gray-600"}`}>
                        {stage}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 border-b border-muted/50">
                    {soul.assignedShepherdId ? (
                      <div>
                        <p className="text-xs font-medium text-gray-900">{soul.assignedShepherdId.name}</p>
                        {soul.shepherdTag && <p className="text-xs text-[#1B4F72]">{soul.shepherdTag}</p>}
                      </div>
                    ) : <span className="text-xs text-red-400 font-medium">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 border-b border-muted/50">
                    {contact ? (
                      <span className={`text-xs font-medium ${contact.stale ? "text-red-600" : "text-muted-foreground"}`}>
                        {contact.label}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">Never</span>}
                  </td>
                  <td className="px-4 py-3 border-b border-muted/50">
                    <button onClick={() => setSelectedSoul(soul)}
                      className="text-xs text-[#1B4F72] hover:underline font-semibold whitespace-nowrap">
                      View →
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {data.page} of {data.pages} · {data.total} total</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              ← Prev
            </button>
            <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
