import { auth } from "@/lib/auth"
import { getPusher } from "@/lib/pusher"
import { NextResponse } from "next/server"

// POST /api/pusher/auth — authenticate Pusher private channels
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get("socket_id")
  const channelName = params.get("channel_name")

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Missing socket_id or channel_name" }, { status: 400 })
  }

  // Ensure users can only subscribe to their own private channel or org-level channels they belong to
  const userId = session.user.id
  const orgId = session.user.organizationId
  const role = session.user.role

  const isAllowed =
    channelName === `private-user-${userId}` ||
    channelName === `private-branch-${orgId}` ||
    channelName === `private-district-${orgId}` ||
    channelName === `private-zone-${orgId}` ||
    (channelName === "private-national" &&
      ["super_admin", "national_coordinator", "regional_coordinator"].includes(role))

  if (!isAllowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const pusher = getPusher()
  const authResponse = pusher.authorizeChannel(socketId, channelName)
  return NextResponse.json(authResponse)
}
