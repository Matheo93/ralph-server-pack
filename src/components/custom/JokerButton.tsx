"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils/index"
import { useJoker } from "@/hooks/use-joker"

interface JokerButtonProps {
  className?: string
  compact?: boolean
  showLabel?: boolean
}

export function JokerButton({
  className,
  compact = false,
  showLabel = true,
}: JokerButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showSuccess, setShowSuccess] = useState(false)
  const [savedStreak, setSavedStreak] = useState<number | null>(null)

  const { status, isLoading, useJokerAction, refreshStatus } = useJoker()

  const handleUseJoker = () => {
    startTransition(async () => {
      const result = await useJokerAction()
      if (result.success && result.data) {
        setSavedStreak(result.data.streakSaved)
        setShowSuccess(true)
        setShowDialog(false)
        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false)
          setSavedStreak(null)
        }, 5000)
        // Refresh status
        refreshStatus()
      }
    })
  }

  // Don't render if loading or no status
  if (isLoading || !status) {
    return null
  }

  // Don't render if not premium
  if (!status.isPremium) {
    return null
  }

  // Show success animation
  if (showSuccess) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-700 animate-in fade-in-0 zoom-in-95",
          className
        )}
      >
        <span className="text-2xl animate-bounce">🃏</span>
        <div>
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Joker utilise !
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">
            Streak de {savedStreak} jours sauve
          </p>
        </div>
      </div>
    )
  }

  // Joker already used this month
  if (status.usedThisMonth) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg opacity-60",
                compact && "px-2 py-1",
                className
              )}
            >
              <span className={cn("text-2xl grayscale", compact && "text-xl")}>🃏</span>
              {showLabel && !compact && (
                <span className="text-sm text-muted-foreground">
                  Joker utilise
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Joker deja utilise ce mois-ci</p>
            <p className="text-xs text-muted-foreground">
              Disponible le mois prochain
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Joker available but streak not at risk
  if (status.available && !status.streakAtRisk) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800",
                compact && "px-2 py-1",
                className
              )}
            >
              <span className={cn("text-2xl", compact && "text-xl")}>🃏</span>
              {showLabel && !compact && (
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  1 joker disponible
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Joker mensuel disponible</p>
            <p className="text-xs text-muted-foreground">
              Utilisez-le si votre streak est en danger
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Joker available AND streak at risk - show prominent button
  return (
    <>
      <Button
        variant="default"
        size={compact ? "sm" : "default"}
        onClick={() => setShowDialog(true)}
        className={cn(
          "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold animate-pulse",
          compact && "px-2 py-1 h-auto",
          className
        )}
      >
        <span className={cn("mr-2", compact && "mr-1")}>🃏</span>
        {showLabel ? "Utiliser le Joker" : "Joker"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-3xl">🃏</span>
              Utiliser votre Joker ?
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                Votre streak de <strong>{status.currentStreak} jours</strong> est en
                danger !
              </p>
              <p className="text-amber-600 dark:text-amber-400 font-medium">
                Le joker vous permet de sauver votre streak une fois par mois.
              </p>
              <p className="text-sm">
                Apres utilisation, le joker sera disponible le mois prochain.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              variant="default"
              onClick={handleUseJoker}
              disabled={isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {isPending ? (
                <>
                  <span className="mr-2 animate-spin">⏳</span>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <span className="mr-2">🃏</span>
                  Sauver mon streak !
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
