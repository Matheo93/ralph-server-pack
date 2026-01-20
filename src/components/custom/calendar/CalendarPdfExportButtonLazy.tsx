"use client"

import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"
import type { CalendarEvent } from "@/lib/actions/calendar"
import { useState } from "react"

// Lazy load the PDF export button - saves ~1.5MB from initial bundle
const CalendarPdfExportButton = dynamic(
  () => import("./CalendarPdfExportButton").then((mod) => ({ default: mod.CalendarPdfExportButton })),
  {
    loading: () => (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Chargement...
      </Button>
    ),
    ssr: false, // PDF generation only works client-side
  }
)

interface CalendarPdfExportButtonLazyProps {
  currentDate: Date
  events: CalendarEvent[]
}

export function CalendarPdfExportButtonLazy({ currentDate, events }: CalendarPdfExportButtonLazyProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  // Only load the heavy PDF component when user clicks
  if (!isLoaded) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsLoaded(true)}
        aria-label="Exporter le calendrier en PDF"
      >
        <FileDown className="h-4 w-4 mr-2" />
        PDF
      </Button>
    )
  }

  return <CalendarPdfExportButton currentDate={currentDate} events={events} />
}
