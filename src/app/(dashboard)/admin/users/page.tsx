"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cn, ROLE_LABELS } from "@/lib/utils"
import {
  USER_ROLES, ORG_LEVELS, ORG_COORDINATOR_ROLE, BRANCH_STAFF_ROLES, getChildOrgLevel, TITLES,
  type UserRole, type OrgLevel, type Title,
} from "@/lib/constants"
import { Plus, X, Search, UserX, Pencil, Trash2, ChevronRight } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserDoc {
  _id: string
  name: string
  email: string
  role: UserRole
  organizationId?: { _id: string; name: string; code: string; type: string } | null
  organizationLevel: OrgLevel
  isActive: boolean
  lastLogin?: string | null
  createdAt: string
}

interface OrgDoc {
  _id: string
  name: string
  code: string
  type: OrgLevel
  parentId?: { _id: string; name: string; code: string; type: string } | null
}

interface UserListResponse {
  users: UserDoc[]
  total: number
  page: number
  pages: number
}

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: "bg-red-100 text-red-700 border-red-200",
  national_coordinator: "bg-purple-100 text-purple-700 border-purple-200",
  regional_coordinator: "bg-blue-100 text-blue-700 border-blue-200",
  zonal_coordinator: "bg-teal-100 text-teal-700 border-teal-200",
  district_coordinator: "bg-orange-100 text-orange-700 border-orange-200",
  branch_coordinator: "bg-green-100 text-green-700 border-green-200",
  chief_trainer: "bg-yellow-100 text-yellow-700 border-yellow-200",
  mission_field_coordinator: "bg-indigo-100 text-indigo-700 border-indigo-200",
  flight_shepherd: "bg-pink-100 text-pink-700 border-pink-200",
  viewer: "bg-gray-100 text-gray-600 border-gray-200",
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchUsers(params: { search?: string; role?: string; page: number }): Promise<UserListResponse> {
  const url = new URL("/api/users", window.location.origin)
  url.searchParams.set("limit", "50")
  url.searchParams.set("page", String(params.page))
  if (params.role) url.searchParams.set("role", params.role)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error("Failed to fetch users")
  return (await res.json()).data as UserListResponse
}

async function fetchOrgs(): Promise<OrgDoc[]> {
  const res = await fetch("/api/organizations")
  if (!res.ok) throw new Error("Failed to fetch organizations")
  return (await res.json()).data as OrgDoc[]
}

// ─── Shared form fields ───────────────────────────────────────────────────────

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30 bg-white"
const labelCls = "text-xs font-medium text-gray-600"

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateUserModal({ orgs, onClose }: { orgs: OrgDoc[]; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "super_admin"
  const ownOrgId = session?.user?.organizationId
  const ownOrgLevel = session?.user?.organizationLevel as OrgLevel | undefined
  const ownRole = session?.user?.role as UserRole | undefined

  // Non-admins may only create the role directly under them, scoped to their own org subtree.
  const allowedRoles: UserRole[] = isSuperAdmin
    ? [...USER_ROLES]
    : ownRole === "branch_coordinator"
      ? BRANCH_STAFF_ROLES
      : ownRole && ownOrgLevel && getChildOrgLevel(ownOrgLevel)
        ? [ORG_COORDINATOR_ROLE[getChildOrgLevel(ownOrgLevel)!]]
        : []

  const eligibleOrgs = isSuperAdmin
    ? orgs
    : ownRole === "branch_coordinator"
      ? orgs.filter((o) => o._id === ownOrgId)
      : orgs.filter((o) => o.parentId?._id === ownOrgId)

  const [form, setForm] = useState({
    name: "", email: "",
    title: "" as Title | "",
    role: (allowedRoles[0] ?? "viewer") as UserRole,
    organizationId: !isSuperAdmin && ownRole === "branch_coordinator" ? (ownOrgId ?? "") : "",
    organizationLevel: "branch" as OrgLevel,
  })

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleOrgChange = (orgId: string) => {
    const org = orgs.find((o) => o._id === orgId)
    set("organizationId", orgId)
    if (org) set("organizationLevel", org.type as OrgLevel)
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to create user")
      return json.data
    },
    onSuccess: (data: { emailSent: boolean; setupUrl?: string }) => {
      if (data.emailSent) {
        toast.success("User created — a setup link was emailed to them (expires in 5 days)")
      } else if (data.setupUrl) {
        const setupUrl = data.setupUrl
        toast.warning("User created, but the setup email failed to send", {
          description: "Copy the setup link below and share it with them directly.",
          duration: 20000,
          action: {
            label: "Copy Link",
            onClick: () => {
              navigator.clipboard.writeText(setupUrl)
              toast.success("Setup link copied")
            },
          },
        })
      } else {
        toast.warning("User created, but the setup email failed to send")
      }
      qc.invalidateQueries({ queryKey: ["users"] })
      qc.invalidateQueries({ queryKey: ["organizations"] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const valid = form.name.length >= 2 && form.email.includes("@") && !!form.organizationId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create User</h2>
            <p className="text-xs text-gray-400 mt-0.5">A one-time setup link is emailed to them to choose their own password (expires in 5 days)</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Full Name *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Doe" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Email *</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@example.com" className={inputCls} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className={labelCls}>Title</label>
              <select value={form.title} onChange={(e) => set("title", e.target.value as Title | "")} className={inputCls}>
                <option value="">— No title —</option>
                {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className={labelCls}>Role *</label>
              <select value={form.role} onChange={(e) => set("role", e.target.value as UserRole)} className={inputCls}>
                {allowedRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className={labelCls}>Organization *</label>
              {!isSuperAdmin && ownRole === "branch_coordinator" ? (
                <p className="text-sm text-gray-600 border rounded-lg px-3 py-2 bg-gray-50">
                  {orgs.find((o) => o._id === ownOrgId)?.name ?? "Your branch"}
                </p>
              ) : (
                <select value={form.organizationId} onChange={(e) => handleOrgChange(e.target.value)} className={inputCls}>
                  <option value="">— Select organization —</option>
                  {eligibleOrgs.map((o) => <option key={o._id} value={o._id}>{o.name} ({o.code}) — {o.type}</option>)}
                </select>
              )}
              {!isSuperAdmin && eligibleOrgs.length === 0 && ownRole !== "branch_coordinator" && (
                <p className="text-xs text-amber-600">
                  No eligible organization yet — create one first under Organizations.
                </p>
              )}
            </div>
            {isSuperAdmin && (
              <div className="space-y-1 sm:col-span-2">
                <label className={labelCls}>Organization Level</label>
                <select value={form.organizationLevel} onChange={(e) => set("organizationLevel", e.target.value as OrgLevel)} className={inputCls}>
                  {ORG_LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !valid}
              className="px-4 py-2 text-sm rounded-lg bg-[#1B4F72] text-white hover:bg-[#154360] transition-colors disabled:opacity-50">
              {mutation.isPending ? "Creating..." : "Create User"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditUserModal({ user, orgs, onClose }: { user: UserDoc; orgs: OrgDoc[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId?._id ?? "",
    organizationLevel: user.organizationLevel,
    isActive: user.isActive,
  })

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleOrgChange = (orgId: string) => {
    const org = orgs.find((o) => o._id === orgId)
    set("organizationId", orgId)
    if (org) set("organizationLevel", org.type as OrgLevel)
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to update user")
      return json.data
    },
    onSuccess: () => {
      toast.success("User updated successfully")
      qc.invalidateQueries({ queryKey: ["users"] })
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const valid = form.name.length >= 2 && form.email.includes("@")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
            <p className="text-xs text-gray-400 mt-0.5">Changes are saved immediately</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4 text-gray-500" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelCls}>Full Name *</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Email *</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Role *</label>
              <select value={form.role} onChange={(e) => set("role", e.target.value as UserRole)} className={inputCls}>
                {USER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Status</label>
              <select value={String(form.isActive)} onChange={(e) => set("isActive", e.target.value === "true")} className={inputCls}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className={labelCls}>Organization</label>
              <select value={form.organizationId} onChange={(e) => handleOrgChange(e.target.value)} className={inputCls}>
                <option value="">— Select organization —</option>
                {orgs.map((o) => <option key={o._id} value={o._id}>{o.name} ({o.code}) — {o.type}</option>)}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className={labelCls}>Organization Level</label>
              <select value={form.organizationLevel} onChange={(e) => set("organizationLevel", e.target.value as OrgLevel)} className={inputCls}>
                {ORG_LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !valid}
              className="px-4 py-2 text-sm rounded-lg bg-[#1B4F72] text-white hover:bg-[#154360] transition-colors disabled:opacity-50">
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "super_admin"
  const currentUserId = session?.user?.id

  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<UserDoc | null>(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("")
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ["users", { roleFilter, page }],
    queryFn: () => fetchUsers({ role: roleFilter, page }),
  })

  const { data: orgs = [] } = useQuery<OrgDoc[]>({
    queryKey: ["organizations"],
    queryFn: fetchOrgs,
  })

  const deactivateMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to deactivate")
      return json.data
    },
    onSuccess: () => { toast.success("User deactivated"); qc.invalidateQueries({ queryKey: ["users"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to delete")
      return json.data
    },
    onSuccess: () => { toast.success("User permanently deleted"); qc.invalidateQueries({ queryKey: ["users"] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const users = (data?.users ?? []).filter((u) => {
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchActive = activeFilter === "" || String(u.isActive) === activeFilter
    return matchSearch && matchActive
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <span>Admin</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700 font-medium">Users</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Users{" "}
            {data && <span className="text-base font-normal text-gray-400">({data.total})</span>}
          </h1>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B4F72] text-white text-sm font-medium hover:bg-[#154360] transition-colors shadow-sm">
          <Plus className="h-4 w-4" /> New User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30" />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30">
          <option value="">All Roles</option>
          {USER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as "" | "true" | "false")}
          className="border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-[#1B4F72]/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-sm text-gray-400 mt-3">Loading users…</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 text-sm">Failed to load users. Please refresh.</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No users match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Name", "Email", "Role", "Organization", "Last Login", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 bg-gray-50/80 border-b whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user._id === currentUserId
                  return (
                    <tr key={user._id} className={cn("hover:bg-gray-50/60 transition-colors", !user.isActive && "opacity-60")}>
                      <td className="px-4 py-3 border-b border-gray-100 font-medium text-gray-900 whitespace-nowrap">
                        {user.name}
                        {isSelf && <span className="ml-1.5 text-xs text-gray-400">(you)</span>}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-gray-600 text-xs">{user.email}</td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", ROLE_BADGE[user.role])}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-gray-600 text-xs">
                        {user.organizationId
                          ? <>{user.organizationId.name} <span className="text-gray-400">({user.organizationId.code})</span></>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 text-gray-500 text-xs whitespace-nowrap">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })
                          : <span className="text-gray-300">Never</span>}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", user.isActive ? "text-green-600" : "text-gray-400")}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", user.isActive ? "bg-green-500" : "bg-gray-400")} />
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          {/* Edit */}
                          <button
                            onClick={() => setEditingUser(user)}
                            className="flex items-center gap-1 text-xs text-[#1B4F72] hover:text-[#154360] font-medium hover:underline"
                            title="Edit user"
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>

                          {/* Deactivate (only if active and not self) */}
                          {user.isActive && !isSelf && isSuperAdmin && (
                            <button
                              onClick={() => { if (confirm(`Deactivate ${user.name}?`)) deactivateMut.mutate(user._id) }}
                              disabled={deactivateMut.isPending}
                              className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 font-medium hover:underline disabled:opacity-50"
                              title="Deactivate user"
                            >
                              <UserX className="h-3 w-3" /> Deactivate
                            </button>
                          )}

                          {/* Delete (super admin only, not self) */}
                          {isSuperAdmin && !isSelf && (
                            <button
                              onClick={() => {
                                if (confirm(`Permanently delete ${user.name}? This cannot be undone.`))
                                  deleteMut.mutate(user._id)
                              }}
                              disabled={deleteMut.isPending}
                              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium hover:underline disabled:opacity-50"
                              title="Delete user permanently"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50/50">
            <p className="text-xs text-gray-500">Page {data.page} of {data.pages} — {data.total} total users</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Previous
              </button>
              <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages}
                className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && <CreateUserModal orgs={orgs} onClose={() => setShowCreate(false)} />}
      {editingUser && <EditUserModal user={editingUser} orgs={orgs} onClose={() => setEditingUser(null)} />}
    </div>
  )
}
