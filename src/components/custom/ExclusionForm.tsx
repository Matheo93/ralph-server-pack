"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils/index"
import { createExclusion } from "@/lib/actions/settings"
import { EXCLUSION_REASONS, type ExclusionReason } from "@/lib/constants/exclusion-reasons"

interface HouseholdMember {
  id: string
  name: string | null
  email: string
}

interface ExclusionFormProps {
  members: HouseholdMember[]
  onSuccess?: () => void
  className?: string
}

export function ExclusionForm({
  members,
  onSuccess,
  className,
}: ExclusionFormProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [memberId, setMemberId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState<ExclusionReason | "">("")

  const resetForm = () => {
    setMemberId("")
    setStartDate("")
    setEndDate("")
    setReason("")
    setError(null)
  }

  const handleSubmit = () => {
    if (!memberId || !startDate || !endDate || !reason) {
      setError("Veuillez remplir tous les champs")
      return
    }

    startTransition(async () => {
      const result = await createExclusion({
        member_id: memberId,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
      })

      if (result.success) {
        resetForm()
        setOpen(false)
        onSuccess?.()
      } else {
        setError(result.error ?? "Erreur inconnue")
      }
    })
  }

  // Set default dates
  const today = new Date().toISOString().split("T")[0] ?? ""
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] ?? ""

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className={className}>
          Ajouter une exclusion
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle exclusion temporaire</DialogTitle>
          <DialogDescription>
            Exclure un membre de l'assignation des taches pendant une periode.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Member selection */}
          <div className="space-y-2">
            <Label htmlFor="member">Membre</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger id="member">
                <SelectValue placeholder="Choisir un membre" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name ?? member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Date de debut</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={today}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Date de fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || today}
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Raison</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ExclusionReason)}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Choisir une raison" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXCLUSION_REASONS).map(([key, { label, icon }]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{icon}</span>
                      <span>{label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm()
              setOpen(false)
            }}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Enregistrement..." : "Créer l'exclusion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// EXCLUSION CARD
// =============================================================================

interface ExclusionCardProps {
  exclusion: {
    id: string
    member_name: string | null
    member_email: string
    exclude_from: string
    exclude_until: string
    reason: ExclusionReason
    is_active: boolean
  }
  onDelete?: (id: string) => void
  isDeleting?: boolean
}

export function ExclusionCard({
  exclusion,
  onDelete,
  isDeleting,
}: ExclusionCardProps) {
  const reasonInfo = EXCLUSION_REASONS[exclusion.reason]
  const startDate = new Date(exclusion.exclude_from)
  const endDate = new Date(exclusion.exclude_until)

  const formatDate = (date: Date) =>
    date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: startDate.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    })

  return (
    <Card className={cn(
      "transition-all",
      exclusion.is_active && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
    )}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{reasonInfo.icon}</span>
            <div>
              <p className="font-medium">
                {exclusion.member_name ?? exclusion.member_email}
              </p>
              <p className="text-sm text-muted-foreground">
                {reasonInfo.label}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(startDate)} → {formatDate(endDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {exclusion.is_active && (
              <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded">
                En cours
              </span>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(exclusion.id)}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                {isDeleting ? "..." : "Supprimer"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
