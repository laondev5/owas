import { cn, formatNumber } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatsCardProps {
  title: string
  value: number | string
  change?: string
  trend?: "up" | "down" | "neutral"
  icon?: React.ReactNode
  className?: string
  suffix?: string
}

export function StatsCard({
  title,
  value,
  change,
  trend = "neutral",
  icon,
  className,
  suffix,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        {icon && (
          <div className="p-2 bg-[#1B4F72]/8 rounded-lg text-[#1B4F72]">{icon}</div>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-bold text-gray-900 tabular-nums">
          {typeof value === "number" ? formatNumber(value) : value}
          {suffix && <span className="text-base font-medium text-muted-foreground ml-1">{suffix}</span>}
        </p>

        {change && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend === "up" && "bg-green-50 text-green-700",
              trend === "down" && "bg-red-50 text-red-700",
              trend === "neutral" && "bg-gray-50 text-gray-600"
            )}
          >
            {trend === "up" && <TrendingUp className="h-3 w-3" />}
            {trend === "down" && <TrendingDown className="h-3 w-3" />}
            {trend === "neutral" && <Minus className="h-3 w-3" />}
            {change}
          </div>
        )}
      </div>
    </div>
  )
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-7 w-20 bg-gray-200 rounded" />
    </div>
  )
}
