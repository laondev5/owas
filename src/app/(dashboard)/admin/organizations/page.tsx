"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Plus, Pencil, X, Check, ChevronRight } from "lucide-react"
import type { OrgLevel } from "@/lib/constants"
import { ORG_LEVELS, getChildOrgLevel } from "@/lib/constants"

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrgDoc {
  _id: string
  name: string
  code: string
  type: OrgLevel
  parentId?: { _id: string; name: string; code: string; type: string } | null
  coordinatorId?: { _id: string; name: string; email: string } | null
  isActive: boolean
}

interface OrgForm {
  name: string
  code: string
  type: OrgLevel
  parentId: string
  coordinatorId: string
  isActive: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_ORDER: OrgLevel[] = ["national", "region", "zone", "district", "branch"]

const TYPE_BADGE: Record<OrgLevel, string> = {
  national: "bg-purple-100 text-purple-700 border-purple-200",
  region: "bg-blue-100 text-blue-700 border-blue-200",
  zone: "bg-teal-100 text-teal-700 border-teal-200",
  district: "bg-orange-100 text-orange-700 border-orange-200",
  branch: "bg-green-100 text-green-700 border-green-200",
}

const TYPE_INDENT: Record<OrgLevel, string> = {
  national: "pl-0",
  region: "pl-4",
  zone: "pl-8",
  district: "pl-12",
  branch: "pl-16",
}

const PARENT_TYPE: Record<OrgLevel, OrgLevel | null> = {
  national: null,
  region: "national",
  zone: "region",
  district: "zone",
  branch: "district",
}

const EMPTY_FORM: OrgForm = {
  name: "",
  code: "",
  type: "branch",
  parentId: "",
  coordinatorId: "",
  isActive: true,
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchOrgs(): Promise<OrgDoc[]> {
  const res = await fetch("/api/organizations?isActive=all")
  if (!res.ok) throw new Error("Failed to fetch organizations")
  const json = await res.json()
  return json.data as OrgDoc[]
}

async function createOrg(body: Omit<OrgForm, "isActive"> & { isActive: boolean }) {
  const res = await fetch("/api/organizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? "Failed to create organization")
  return json.data
}

async function updateOrg(id: string, body: Partial<OrgForm>) {
  const res = await fetch(`/api/organizations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? "Failed to update organization")
  return json.data
}

// ─── Create Panel ─────────────────────────────────────────────────────────────

function CreatePanel({
  orgs,
  onClose,
}: {
  orgs: OrgDoc[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "super_admin"
  const ownOrgId = session?.user?.organizationId
  const childLevel = !isSuperAdmin
    ? getChildOrgLevel(session?.user?.organizationLevel as OrgLevel)
    : null

  const [form, setForm] = useState<OrgForm>(() =>
    !isSuperAdmin && childLevel
      ? { ...EMPTY_FORM, type: childLevel, parentId: ownOrgId ?? "" }
      : EMPTY_FORM
  )

  const parentType = PARENT_TYPE[form.type]
  const parentOrgs = parentType ? orgs.filter((o) => o.type === parentType && o.isActive) : []

  const mutation = useMutation({
    mutationFn: () =>
      createOrg({
        name: form.name,
        code: form.code,
        type: form.type,
        parentId: form.parentId || undefined,
        coordinatorId: isSuperAdmin ? form.coordinatorId || undefined : undefined,
        isActive: form.isActive,
      } as OrgForm),
    onSuccess: () => {
      toast.success("Organization created")
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const set = <K extends keyof OrgForm>(k: K, v: OrgForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  if (!isSuperAdmin && !childLevel) {
    return (
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">New Organization</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Your role has no organization level below it to create.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">New Organization</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      {!isSuperAdmin && (
        <p className="text-xs text-gray-500">
          You can create a new <span className="font-semibold capitalize">{childLevel}</span> under your own organization.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Name *</label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Lagos Region"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Code *</label>
          <input
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="e.g. LG-REG"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 uppercase"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Type *</label>
          {isSuperAdmin ? (
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value as OrgLevel)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 bg-white"
            >
              {ORG_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-600 border rounded-lg px-3 py-2 bg-gray-50 capitalize">{form.type}</p>
          )}
        </div>

        {parentType && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              Parent {parentType.charAt(0).toUpperCase() + parentType.slice(1)}
            </label>
            {isSuperAdmin ? (
              <select
                value={form.parentId}
                onChange={(e) => set("parentId", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 bg-white"
              >
                <option value="">— None —</option>
                {parentOrgs.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-600 border rounded-lg px-3 py-2 bg-gray-50">
                {orgs.find((o) => o._id === form.parentId)?.name ?? "Your organization"}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1 sm:col-span-2 flex items-center gap-3 pt-1">
          <input
            id="org-active"
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="accent-[#1B4F72] w-4 h-4"
          />
          <label htmlFor="org-active" className="text-sm text-gray-700 cursor-pointer">
            Active
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.name || !form.code}
          className="px-4 py-2 text-sm rounded-lg bg-[#1B4F72] text-white hover:bg-[#154360] transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  )
}

// ─── Inline Edit Row ──────────────────────────────────────────────────────────

function EditRow({
  org,
  allOrgs,
  onClose,
}: {
  org: OrgDoc
  allOrgs: OrgDoc[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(org.name)
  const [code, setCode] = useState(org.code)
  const [isActive, setIsActive] = useState(org.isActive)
  const [coordinatorId, setCoordinatorId] = useState(org.coordinatorId?._id ?? "")

  const mutation = useMutation({
    mutationFn: () =>
      updateOrg(org._id, {
        name,
        code,
        isActive,
        coordinatorId: coordinatorId || undefined,
      }),
    onSuccess: () => {
      toast.success("Organization updated")
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <tr className="bg-blue-50/60">
      <td className="px-4 py-3 border-b border-muted/50" colSpan={7}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 uppercase"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Active</label>
            <div className="flex items-center h-[34px] gap-2">
              <input
                type="checkbox"
                id={`active-${org._id}`}
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-[#1B4F72] w-4 h-4"
              />
              <label htmlFor={`active-${org._id}`} className="text-sm cursor-pointer">
                {isActive ? "Active" : "Inactive"}
              </label>
            </div>
          </div>
          <div className="sm:col-span-3 flex justify-end gap-2 mt-1">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="px-3 py-1.5 text-sm rounded-lg bg-[#1B4F72] text-white hover:bg-[#154360] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              {mutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrganizationsPage() {
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "super_admin"
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery<OrgDoc[]>({
    queryKey: ["organizations"],
    queryFn: fetchOrgs,
  })

  const orgs = data ?? []

  // Sort orgs by type order, then by name
  const sorted = [...orgs].sort((a, b) => {
    const ta = TYPE_ORDER.indexOf(a.type)
    const tb = TYPE_ORDER.indexOf(b.type)
    if (ta !== tb) return ta - tb
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <span>Admin</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700 font-medium">Organizations</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage the church hierarchy from national down to branch level.
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B4F72] text-white text-sm font-medium hover:bg-[#154360] transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Organization
        </button>
      </div>

      {/* Create Panel */}
      {showCreate && (
        <CreatePanel orgs={orgs} onClose={() => setShowCreate(false)} />
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#1B4F72]/40 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-3">Loading organizations…</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 text-sm">
            Failed to load organizations. Please refresh.
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No organizations found. Create one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Name", "Code", "Type", "Parent", "Coordinator", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 bg-gray-50/80 border-b"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((org) => (
                  <>
                    <tr
                      key={org._id}
                      className={cn(
                        "hover:bg-gray-50/60 transition-colors",
                        !org.isActive && "opacity-50"
                      )}
                    >
                      <td className={cn("px-4 py-3 border-b border-gray-100 font-medium text-gray-900", TYPE_INDENT[org.type])}>
                        {org.name}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 font-mono text-xs text-gray-600">
                        {org.code}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize",
                            TYPE_BADGE[org.type]
                          )}
                        >
                          {org.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-gray-600">
                        {org.parentId ? (
                          <span className="text-xs">
                            {org.parentId.name}{" "}
                            <span className="text-gray-400">({org.parentId.code})</span>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-gray-600">
                        {org.coordinatorId ? (
                          <span className="text-xs">{org.coordinatorId.name}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium",
                            org.isActive ? "text-green-600" : "text-gray-400"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              org.isActive ? "bg-green-500" : "bg-gray-400"
                            )}
                          />
                          {org.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {isSuperAdmin ? (
                          <button
                            onClick={() =>
                              setEditingId((prev) => (prev === org._id ? null : org._id))
                            }
                            className="flex items-center gap-1 text-xs text-[#1B4F72] hover:underline font-medium"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>

                    {editingId === org._id && (
                      <EditRow
                        key={`edit-${org._id}`}
                        org={org}
                        allOrgs={orgs}
                        onClose={() => setEditingId(null)}
                      />
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
