"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { deleteChild } from "@/lib/actions/children"
import { showToast } from "@/lib/toast-messages"
import { calculateAge } from "@/lib/validations/child"
import type { Child } from "@/types/database"
import { Copy, Check, Gamepad2, KeyRound } from "lucide-react"

interface ChildCardProps {
  child: Child & { has_account?: boolean }
  kidsLoginUrl?: string
}

const schoolLevelLabels: Record<string, string> = {
  maternelle: "Maternelle",
  primaire: "Primaire",
  college: "Collège",
  lycee: "Lycée",
}

export function ChildCard({ child, kidsLoginUrl }: ChildCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  const age = calculateAge(child.birthdate)

  const handleCardClick = () => {
    router.push(`/children/${child.id}`)
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteChild(child.id)
      if (result.success) {
        showToast.success("childDeleted", child.first_name)
      } else {
        showToast.error("generic", result.error ?? "Erreur inconnue")
      }
      setShowConfirm(false)
    })
  }

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (kidsLoginUrl) {
      try {
        await navigator.clipboard.writeText(kidsLoginUrl)
        setCopied(true)
        showToast.success("linkCopied")
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Fallback pour les navigateurs qui ne supportent pas clipboard API
        const textArea = document.createElement("textarea")
        textArea.value = kidsLoginUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
        setCopied(true)
        showToast.success("linkCopied")
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  return (
    <Card 
      className="w-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{child.first_name}</CardTitle>
            <CardDescription>
              {age} an{age > 1 ? "s" : ""}
              {child.gender && (
                <span className="ml-2">
                  ({child.gender === "M" ? "Garçon" : "Fille"})
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/children/${child.id}/edit`)
              }}
            >
              Modifier
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {child.school_name && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">École:</span> {child.school_name}
          </p>
        )}
        {(child.school_level ?? child.school_class) && (
          <p className="text-sm text-muted-foreground">
            {child.school_level && (
              <span className="font-medium">
                {schoolLevelLabels[child.school_level] ?? child.school_level}
              </span>
            )}
            {child.school_class && (
              <span className="ml-2">- {child.school_class}</span>
            )}
          </p>
        )}

        {/* Kids Space Access */}
        <div className="pt-2 border-t" onClick={(e) => e.stopPropagation()}>
          {child.has_account && kidsLoginUrl ? (
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground flex-1">Espace Enfant</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-1"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copié!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copier lien
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/children/${child.id}/setup-pin`)
              }}
            >
              <KeyRound className="h-3 w-3" />
              Configurer PIN enfant
            </Button>
          )}
        </div>

        {showConfirm ? (
          <div className="flex items-center gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-destructive flex-1">
              Supprimer {child.first_name} ?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setShowConfirm(false)
              }}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              disabled={isPending}
            >
              {isPending ? "..." : "Confirmer"}
            </Button>
          </div>
        ) : (
          <div className="pt-2 border-t" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                setShowConfirm(true)
              }}
            >
              Supprimer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
