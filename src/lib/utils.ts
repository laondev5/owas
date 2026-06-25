import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { UserRole } from "@/lib/constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-NG").format(n)
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%"
  return `${((value / total) * 100).toFixed(1)}%`
}

export function getWeekEnding(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + diff)
  d.setHours(23, 59, 59, 999)
  return d
}

export function getWeekStarting(weekEnding: Date): Date {
  const d = new Date(weekEnding)
  d.setDate(d.getDate() - 6)
  d.setHours(0, 0, 0, 0)
  return d
}

export function isReportLate(weekEnding: Date, dueDay: number): boolean {
  const due = new Date(weekEnding)
  due.setDate(due.getDate() + dueDay)
  due.setHours(23, 59, 59, 999)
  return new Date() > due
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 10,
  national_coordinator: 9,
  regional_coordinator: 8,
  zonal_coordinator: 7,
  district_coordinator: 6,
  branch_coordinator: 5,
  chief_trainer: 4,
  mission_field_coordinator: 4,
  flight_shepherd: 3,
  viewer: 1,
}

export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  national_coordinator: "National Coordinator",
  regional_coordinator: "Regional Coordinator",
  zonal_coordinator: "Zonal Coordinator",
  district_coordinator: "District Coordinator",
  branch_coordinator: "Branch Coordinator",
  chief_trainer: "Chief Trainer",
  mission_field_coordinator: "Mission Field Coordinator",
  flight_shepherd: "Flight Shepherd",
  viewer: "Viewer",
}
