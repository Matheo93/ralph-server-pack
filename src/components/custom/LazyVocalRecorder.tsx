"use client"

import dynamic from "next/dynamic"
import { VocalRecorderSkeleton } from "@/components/ui/skeleton"

// Lazy load VocalRecorder - it uses browser APIs (microphone) and is heavy
export const LazyVocalRecorder = dynamic(
  () => import("./VocalRecorder").then((mod) => ({ default: mod.VocalRecorder })),
  {
    loading: () => <VocalRecorderSkeleton shimmer />,
    ssr: false, // VocalRecorder uses browser APIs, no SSR
  }
)
