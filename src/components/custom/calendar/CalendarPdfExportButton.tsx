"use client"

import { useState, useCallback } from "react"
import { pdf } from "@react-pdf/renderer"
import { FileDown, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { CalendarPdfDocument } from "./CalendarPdfDocument"
import { toast } from "@/components/custom/toast-notifications"
import type { CalendarEvent } from "@/lib/actions/calendar"

interface CalendarPdfExportButtonProps {
  currentDate: Date
  events: CalendarEvent[]
}

export function CalendarPdfExportButton({ currentDate, events }: CalendarPdfExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleExportPdf = useCallback(async () => {
    if (isGenerating) return

    setIsGenerating(true)

    try {
      // Générer le PDF
      const blob = await pdf(
        <CalendarPdfDocument currentDate={currentDate} events={events} />
      ).toBlob()

      // Créer le nom du fichier
      const monthName = format(currentDate, "MMMM-yyyy", { locale: fr })
      const fileName = `calendrier-${monthName}.pdf`

      // Télécharger le fichier
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("PDF téléchargé", `Le calendrier de ${format(currentDate, "MMMM yyyy", { locale: fr })} a été exporté.`)
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error)
      toast.error("Erreur", "Impossible de générer le PDF. Veuillez réessayer.")
    } finally {
      setIsGenerating(false)
    }
  }, [currentDate, events, isGenerating])

  return (
    <Button
      variant="outline"
      onClick={handleExportPdf}
      disabled={isGenerating}
      aria-label="Exporter le calendrier en PDF"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Export...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 mr-2" />
          PDF
        </>
      )}
    </Button>
  )
}
