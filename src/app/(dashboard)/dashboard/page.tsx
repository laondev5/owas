import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { UserRole } from "@/lib/constants"
import SuperAdminDashboard from "./_components/super-admin-dashboard"
import NationalDashboard from "./_components/national-dashboard"
import RegionalDashboard from "./_components/regional-dashboard"
import ZonalDashboard from "./_components/zonal-dashboard"
import DistrictDashboard from "./_components/district-dashboard"
import BranchDashboard from "./_components/branch-dashboard"
import ShepherdDashboard from "./_components/shepherd-dashboard"
import ViewerDashboard from "./_components/viewer-dashboard"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const role = session.user.role as UserRole

  if (role === "super_admin") return <SuperAdminDashboard />
  if (role === "national_coordinator") return <NationalDashboard />
  if (role === "regional_coordinator") return <RegionalDashboard />
  if (role === "zonal_coordinator") return <ZonalDashboard />
  if (role === "district_coordinator") return <DistrictDashboard />
  if (role === "branch_coordinator") return <BranchDashboard />
  if (role === "chief_trainer") return <BranchDashboard focus="training" />
  if (role === "mission_field_coordinator") return <BranchDashboard focus="outreach" />
  if (role === "flight_shepherd") return <ShepherdDashboard />
  return <ViewerDashboard />
}
