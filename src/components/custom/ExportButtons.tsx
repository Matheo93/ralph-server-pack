"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Download, FileText, ClipboardList, Loader2 } from "lucide-react"

type PeriodType = "week" | "month" | "quarter"
type ExportType = "charge" | "tasks-history"

const PERIOD_LABELS: Record<PeriodType, string> = {
  week: "Dernière semaine",
  month: "Dernier mois",
  quarter: "Dernier trimestre",
}

interface ExportButtonsProps {
  className?: string
}

export function ExportButtons({ className }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportingType, setExportingType] = useState<string | null>(null)

  const handleExport = async (type: ExportType, period: PeriodType) => {
    const key = `${type}-${period}`
    setIsExporting(true)
    setExportingType(key)

    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, period }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error ?? "Erreur lors de l'export")
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition")
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] ?? `export-${type}-${period}.pdf`

      // Download the PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export error:", error)
      alert(error instanceof Error ? error.message : "Erreur lors de l'export")
    } finally {
      setIsExporting(false)
      setExportingType(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className} disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Export en cours...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exporter PDF
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center">
          <FileText className="mr-2 h-4 w-4" />
          Rapport Charge Mentale
        </DropdownMenuLabel>
        {(["week", "month", "quarter"] as const).map((period) => (
          <DropdownMenuItem
            key={`charge-${period}`}
            onClick={() => handleExport("charge", period)}
            disabled={isExporting}
          >
            {exportingType === `charge-${period}` && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {PERIOD_LABELS[period]}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="flex items-center">
          <ClipboardList className="mr-2 h-4 w-4" />
          Historique des Tâches
        </DropdownMenuLabel>
        {(["week", "month", "quarter"] as const).map((period) => (
          <DropdownMenuItem
            key={`tasks-${period}`}
            onClick={() => handleExport("tasks-history", period)}
            disabled={isExporting}
          >
            {exportingType === `tasks-history-${period}` && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {PERIOD_LABELS[period]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
