"use client"

import dynamic from "next/dynamic"
import { ChargeWeekChartSkeleton } from "@/components/ui/skeleton"

// Lazy load ChargeWeekChart - it's a heavy charting component
export const LazyChargeWeekChart = dynamic(
  () => import("./ChargeWeekChart").then((mod) => ({ default: mod.ChargeWeekChart })),
  {
    loading: () => <ChargeWeekChartSkeleton shimmer />,
    ssr: true, // Can render on server
  }
)
