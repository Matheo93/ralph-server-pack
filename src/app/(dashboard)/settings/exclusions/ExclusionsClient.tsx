"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ExclusionForm, ExclusionCard } from "@/components/custom/ExclusionForm"
import { showToast } from "@/lib/toast-messages"
import { deleteExclusion, type MemberExclusion } from "@/lib/actions/settings"
import { EmptyState } from "@/components/custom/EmptyState"

interface HouseholdMember {
  id: string
  name: string | null
  email: string
}

interface ExclusionsClientProps {
  members: HouseholdMember[]
  initialExclusions: MemberExclusion[]
}

export function ExclusionsClient({
  members,
  initialExclusions,
}: ExclusionsClientProps) {
  const router = useRouter()
  const [exclusions, setExclusions] = useState(initialExclusions)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const activeExclusions = exclusions.filter((e) => e.is_active)
  const futureExclusions = exclusions.filter(
    (e) => !e.is_active && new Date(e.exclude_from) > new Date()
  )
  const pastExclusions = exclusions.filter(
    (e) => !e.is_active && new Date(e.exclude_until) < new Date()
  )

  const handleDelete = (exclusionId: string) => {
    setDeletingId(exclusionId)
    startTransition(async () => {
      const result = await deleteExclusion(exclusionId)
      if (result.success) {
        setExclusions((prev) => prev.filter((e) => e.id !== exclusionId))
        showToast.success("exclusionDeleted")
      } else {
        showToast.error("generic", result.error ?? "Erreur inconnue")
      }
      setDeletingId(null)
    })
  }

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Add exclusion button */}
      <div className="flex justify-end">
        <ExclusionForm members={members} onSuccess={handleSuccess} />
      </div>

      {/* Active exclusions */}
      {activeExclusions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-amber-500">En cours</span>
            <span className="text-sm font-normal text-muted-foreground">
              ({activeExclusions.length})
            </span>
          </h2>
          <div className="grid gap-3">
            {activeExclusions.map((exclusion) => (
              <ExclusionCard
                key={exclusion.id}
                exclusion={exclusion}
                onDelete={handleDelete}
                isDeleting={deletingId === exclusion.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Future exclusions */}
      {futureExclusions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>À venir</span>
            <span className="text-sm font-normal text-muted-foreground">
              ({futureExclusions.length})
            </span>
          </h2>
          <div className="grid gap-3">
            {futureExclusions.map((exclusion) => (
              <ExclusionCard
                key={exclusion.id}
                exclusion={exclusion}
                onDelete={handleDelete}
                isDeleting={deletingId === exclusion.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past exclusions */}
      {pastExclusions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-muted-foreground">Passées</span>
            <span className="text-sm font-normal text-muted-foreground">
              ({pastExclusions.length})
            </span>
          </h2>
          <div className="grid gap-3 opacity-60">
            {pastExclusions.map((exclusion) => (
              <ExclusionCard
                key={exclusion.id}
                exclusion={exclusion}
                onDelete={handleDelete}
                isDeleting={deletingId === exclusion.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {exclusions.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              variant="calendar"
              title="Aucune exclusion"
              description="Les exclusions temporaires permettent d'exclure un membre de l'assignation des tâches pendant une période (voyage, maladie, etc.)."
            />
            <div className="flex justify-center mt-4">
              <ExclusionForm members={members} onSuccess={handleSuccess} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Comment ça marche ?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Lorsqu'un membre est en exclusion temporaire, il ne recevra pas de nouvelles
            tâches assignées automatiquement.
          </p>
          <p>
            Les tâches déjà assignées restent sur son compte, mais peuvent être
            réassignées manuellement.
          </p>
          <p>
            Utilisez cette fonctionnalité pour les vacances, maladies ou tout autre
            période d'indisponibilité.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
