"use client"

import dynamic from "next/dynamic"
import { ModalSkeleton } from "@/components/ui/skeleton"

// Props interface for the dialog
interface PostponeDialogProps {
  taskId: string | null
  onClose: () => void
}

// Lazy load PostponeDialog - it includes Calendar which is heavy
export const LazyPostponeDialog = dynamic<PostponeDialogProps>(
  () => import("./PostponeDialog").then((mod) => ({ default: mod.PostponeDialog })),
  {
    loading: () => null, // Don't show skeleton for modals that may not be open
    ssr: false, // Modal content doesn't need SSR
  }
)
