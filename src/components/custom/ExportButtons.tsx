"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, ClipboardList, Loader2, Crown, Sparkles, Lock } from "lucide-react"

type PeriodType = "week" | "month" | "quarter"
type ExportType = "charge" | "tasks-history"

const PERIOD_LABELS: Record<PeriodType, string> = {
  week: "Dernière semaine",
  month: "Dernier mois",
  quarter: "Dernier trimestre",
}

interface ExportButtonsProps {
  className?: string
  isPremium?: boolean
}

export function ExportButtons({ className, isPremium = false }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportingType, setExportingType] = useState<string | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  const handleExport = async (type: ExportType, period: PeriodType) => {
    // Check premium access
    if (!isPremium) {
      setShowPremiumModal(true)
      return
    }

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
    <>
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
                {!isPremium && (
                  <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 text-xs">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                )}
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
              {!isPremium && <Lock className="mr-2 h-3 w-3 text-muted-foreground" />}
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
              {!isPremium && <Lock className="mr-2 h-3 w-3 text-muted-foreground" />}
              {PERIOD_LABELS[period]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Premium Gate Modal */}
      <Dialog open={showPremiumModal} onOpenChange={setShowPremiumModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-yellow-500/20 flex items-center justify-center mb-4">
              <Crown className="w-8 h-8 text-amber-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              Export PDF
            </DialogTitle>
            <DialogDescription className="text-center">
              L&apos;export PDF est une fonctionnalité Premium. Exportez vos rapports de charge mentale et l&apos;historique des tâches en PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-6 py-4 border-y">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Gratuit</p>
              <p className="text-lg font-semibold">Visualisation</p>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <p className="text-xs text-primary uppercase tracking-wide">Premium</p>
              <p className="text-lg font-semibold text-primary">Export PDF</p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowPremiumModal(false)}>
              Fermer
            </Button>
            <Button asChild className="gap-2">
              <Link href="/pricing">
                <Sparkles className="w-4 h-4" />
                Passer Premium
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
