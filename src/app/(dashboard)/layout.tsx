import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import MobileLayout from "@/components/layout/mobile-layout"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return <MobileLayout>{children}</MobileLayout>
}
