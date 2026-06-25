"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { ChevronRight, X } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogDoc {
  _id: string
  userId: { _id: string; name: string; email: string } | string | null
  action: string
  entityType: string
  entityId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  timestamp: string
}

interface AuditResponse {
  logs: AuditLogDoc[]
  total: number
  page: number
  pages: number
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchAudit(params: {
  entityType?: string
  action?: string
  startDate?: string
  endDate?: string
  page: number
  limit: number
}): Promise<AuditResponse> {
  const url = new URL("/api/audit", window.location.origin)
  url.searchParams.set("page", String(params.page))
  url.searchParams.set("limit", String(params.limit))
  if (params.entityType) url.searchParams.set("entityType", params.entityType)
  if (params.action) url.searchParams.set("action", params.action)
  if (params.startDate) url.searchParams.set("startDate", params.startDate)
  if (params.endDate) url.searchParams.set("endDate", params.endDate)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error("Failed to fetch audit logs")
  const json = await res.json()
  return json.data as AuditResponse
}

// ─── JSON Diff Viewer ─────────────────────────────────────────────────────────

function DiffViewer({
  log,
  onClose,
}: {
  log: AuditLogDoc
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Audit Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {log.action} &bull; {log.entityType}
              {log.entityId ? ` #${log.entityId}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {log.before !== undefined && (
            <div>
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1.5">
                Before
              </p>
              <pre className="text-xs bg-red-50 border border-red-100 rounded-xl p-4 overflow-x-auto text-gray-700 whitespace-pre-wrap break-words">
                {JSON.stringify(log.before, null, 2)}
              </pre>
            </div>
          )}
          {log.after !== undefined && (
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1.5">
                After
              </p>
              <pre className="text-xs bg-green-50 border border-green-100 rounded-xl p-4 overflow-x-auto text-gray-700 whitespace-pre-wrap break-words">
                {JSON.stringify(log.after, null, 2)}
              </pre>
            </div>
          )}
          {log.before === undefined && log.after === undefined && (
            <p className="text-sm text-gray-400 text-center py-8">No diff data available.</p>
          )}
        </div>

        <div className="flex justify-end mt-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-3 border-b border-gray-100">
          <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + (i * 7) % 40}%` }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const LIMIT = 25

export default function AuditPage() {
  const [entityType, setEntityType] = useState("")
  const [action, setAction] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [page, setPage] = useState(1)
  const [selectedLog, setSelectedLog] = useState<AuditLogDoc | null>(null)

  // Committed filter state (applied when user hits Apply)
  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
    startDate: "",
    endDate: "",
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit", { ...filters, page }],
    queryFn: () => fetchAudit({ ...filters, page, limit: LIMIT }),
  })

  const applyFilters = () => {
    setFilters({ entityType, action, startDate, endDate })
    setPage(1)
  }

  const clearFilters = () => {
    setEntityType("")
    setAction("")
    setStartDate("")
    setEndDate("")
    setFilters({ entityType: "", action: "", startDate: "", endDate: "" })
    setPage(1)
  }

  const hasActiveFilters =
    filters.entityType || filters.action || filters.startDate || filters.endDate

  const logs = data?.logs ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <span>Admin</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-700 font-medium">Audit Logs</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          System-wide activity trail for all admin operations.
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Entity Type</label>
            <input
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="e.g. User, Organization"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Action</label>
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. CREATE_USER"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/30"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-3">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
            >
              Clear Filters
            </button>
          )}
          <button
            onClick={applyFilters}
            className="px-4 py-1.5 text-xs rounded-lg bg-[#1B4F72] text-white hover:bg-[#154360] transition-colors font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {error ? (
          <div className="p-12 text-center text-red-500 text-sm">
            Failed to load audit logs. Please refresh.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {["Timestamp", "User", "Action", "Entity Type", "Entity ID", "Details"].map((h) => (
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
                {isLoading
                  ? Array.from({ length: LIMIT }).map((_, i) => <SkeletonRow key={i} />)
                  : logs.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                        No audit logs found for the selected filters.
                      </td>
                    </tr>
                  )
                  : logs.map((log) => {
                      const user =
                        log.userId && typeof log.userId === "object" ? log.userId : null

                      const hasDiff = log.before !== undefined || log.after !== undefined

                      return (
                        <tr
                          key={log._id}
                          className="hover:bg-gray-50/60 transition-colors"
                        >
                          <td className="px-4 py-3 border-b border-gray-100 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString("en-NG", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100">
                            {user ? (
                              <div>
                                <p className="text-xs font-medium text-gray-800">{user.name}</p>
                                <p className="text-[10px] text-gray-400">{user.email}</p>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono uppercase tracking-wide",
                                log.action.startsWith("CREATE")
                                  ? "bg-green-100 text-green-700"
                                  : log.action.startsWith("UPDATE")
                                  ? "bg-blue-100 text-blue-700"
                                  : log.action.startsWith("DELETE") || log.action.startsWith("DEACTIVATE")
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                              )}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 text-xs text-gray-600">
                            {log.entityType}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100 text-[10px] font-mono text-gray-400 max-w-[120px] truncate">
                            {log.entityId ?? "—"}
                          </td>
                          <td className="px-4 py-3 border-b border-gray-100">
                            {hasDiff ? (
                              <button
                                onClick={() => setSelectedLog(log)}
                                className="text-xs text-[#1B4F72] hover:underline font-medium"
                              >
                                Details
                              </button>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
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
            <p className="text-xs text-gray-500">
              Page {data.page} of {data.pages} &mdash; {data.total} total entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {/* Page number buttons */}
              {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, data.pages - 4))
                const p = start + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "w-8 h-7 text-xs border rounded-lg transition-colors",
                      p === page
                        ? "bg-[#1B4F72] text-white border-[#1B4F72]"
                        : "hover:bg-gray-100"
                    )}
                  >
                    {p}
                  </button>
                )
              })}

              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Diff Viewer Modal */}
      {selectedLog && (
        <DiffViewer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}
