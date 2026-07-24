"use client"

import { useState, useMemo, useRef } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { QrCode, Link2, Copy, Check, ExternalLink, RefreshCw, Download } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"

interface Shepherd {
  _id: string
  name: string
  shepherdTag?: string
}

export default function InvitePage() {
  const { data: session } = useSession()
  const branchId = session?.user?.organizationId ?? ""
  const isShepherd = session?.user?.role === "flight_shepherd"

  const [eventName, setEventName] = useState("")
  const [shepherdId, setShepherdId] = useState("")
  const [showQr, setShowQr] = useState(false)
  const [copied, setCopied] = useState(false)

  const qrRef = useRef<HTMLCanvasElement>(null)

  const { data: shepherds = [] } = useQuery<Shepherd[]>({
    queryKey: ["shepherds-list"],
    queryFn: async () => {
      const res = await fetch("/api/shepherds")
      if (!res.ok) return []
      return (await res.json()).data as Shepherd[]
    },
    enabled: !!session && !isShepherd,
  })

  const effectiveShepherdId = isShepherd ? (session?.user?.id ?? "") : shepherdId

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

  const inviteLink = useMemo(() => {
    const params = new URLSearchParams()
    if (branchId) params.set("branch", branchId)
    if (eventName.trim()) params.set("event", eventName.trim())
    if (effectiveShepherdId) params.set("shepherd", effectiveShepherdId)
    return `${baseUrl}/join?${params.toString()}`
  }, [baseUrl, branchId, eventName, effectiveShepherdId])

  const generate = () => setShowQr(true)

  const copy = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    toast.success("Link copied to clipboard!")
    setTimeout(() => setCopied(false), 2500)
  }

  const downloadQR = () => {
    const canvas = qrRef.current
    if (!canvas) return
    const url = canvas.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = url
    a.download = `${(eventName.trim() || "owas-invite").replace(/\s+/g, "-").toLowerCase()}-qr.png`
    a.click()
    toast.success("QR code downloaded!")
  }

  const reset = () => {
    setShowQr(false)
    setEventName("")
    setShepherdId("")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invite Link & QR Code</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a shareable link or QR code. Converts scan it and fill in their own details — no login needed.
        </p>
      </div>

      {/* Configuration card */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1B4F72]/10 flex items-center justify-center shrink-0">
            <QrCode className="h-5 w-5 text-[#1B4F72]" />
          </div>
          <div>
            <p className="font-semibold text-sm">Configure Your Invite</p>
            <p className="text-xs text-muted-foreground">Customise then generate the QR code</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Event / Outreach Name{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => { setEventName(e.target.value); setShowQr(false) }}
            placeholder="e.g. Cross-Over Crusade 2025, GOWAS March Edition"
            className="w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:bg-white transition-all"
          />
          <p className="text-xs text-gray-400">This name appears at the top of the registration page converts see.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Pre-assign Shepherd{" "}
            {!isShepherd && <span className="text-gray-400 font-normal">(optional)</span>}
          </label>
          {isShepherd ? (
            <p className="text-sm text-gray-600 border rounded-xl px-4 py-3 bg-gray-50">
              New converts from this link are automatically assigned to you.
            </p>
          ) : (
            <>
              <select
                value={shepherdId}
                onChange={(e) => { setShepherdId(e.target.value); setShowQr(false) }}
                className="w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1B4F72]/30 focus:bg-white transition-all"
              >
                <option value="">No specific shepherd — assign manually later</option>
                {shepherds.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}{s.shepherdTag ? ` · ${s.shepherdTag}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">
                All converts who register through this link will automatically be assigned to the selected shepherd.
              </p>
            </>
          )}
        </div>

        <button
          onClick={generate}
          className="w-full flex items-center justify-center gap-2 bg-[#1B4F72] text-white rounded-xl py-3.5 font-semibold text-sm hover:bg-[#154360] transition-colors shadow-md shadow-[#1B4F72]/20"
        >
          <QrCode className="h-4 w-4" />
          Generate QR Code & Link
        </button>
      </div>

      {/* Generated output */}
      {showQr && (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          {/* QR section */}
          <div className="p-6 flex flex-col items-center gap-5 border-b bg-gradient-to-b from-[#1B4F72]/5 to-white">
            <div className="text-center">
              <p className="font-semibold text-gray-800">
                {eventName.trim() || "Operation Win A Soul"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Scan to register as a new convert</p>
            </div>

            {/* QR Code */}
            <div className="p-4 bg-white rounded-2xl border-2 border-[#1B4F72]/10 shadow-inner">
              <QRCodeCanvas
                ref={qrRef}
                value={inviteLink}
                size={280}
                bgColor="#ffffff"
                fgColor="#1B4F72"
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Download button — sits right under the QR */}
            <button
              onClick={downloadQR}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B4F72] text-white text-sm font-semibold hover:bg-[#154360] transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" /> Download QR Code (PNG)
            </button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-4 h-px bg-gray-300" />
              <span>Point your phone camera at the code above</span>
              <div className="w-4 h-px bg-gray-300" />
            </div>
          </div>

          {/* Link + actions */}
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Invite Link</p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border">
                <Link2 className="h-4 w-4 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-700 flex-1 truncate font-mono select-all">{inviteLink}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copy}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {copied
                  ? <><Check className="h-4 w-4 text-green-500" /> Copied!</>
                  : <><Copy className="h-4 w-4" /> Copy Link</>
                }
              </button>
              <a
                href={inviteLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 rounded-xl border py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="h-4 w-4" /> Preview
              </a>
              <button
                onClick={reset}
                title="Reset"
                className="flex items-center justify-center px-3 rounded-xl border py-2.5 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Usage tips */}
          <div className="mx-5 mb-5 rounded-xl bg-amber-50 border border-amber-100 p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-800">How to use at crusades & outreach events</p>
            <ul className="text-xs text-amber-700 space-y-1.5 list-disc list-inside">
              <li>Download the QR code and project it on screen or print on flyers / banners</li>
              <li>New converts scan it with their phone camera — no app download needed</li>
              <li>They fill in their name, phone, address, and click Submit</li>
              <li>Their record appears instantly in the Converts Registry</li>
              {effectiveShepherdId && <li>All registrations from this link are automatically assigned to {isShepherd ? "you" : "the selected shepherd"}</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
