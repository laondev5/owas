"use client"

import PusherClient from "pusher-js"

let clientInstance: PusherClient | null = null

export function getPusherClient(): PusherClient {
  if (typeof window === "undefined") {
    throw new Error("getPusherClient must only be called on the client")
  }

  if (!clientInstance) {
    clientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
    })
  }
  return clientInstance
}
