"use client"

import { useState, useTransition } from "react"
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
import { calculateAge } from "@/lib/validations/child"
import type { Child } from "@/types/database"

interface ChildCardProps {
  child: Child
}

const schoolLevelLabels: Record<string, string> = {
  maternelle: "Maternelle",
  primaire: "Primaire",
  college: "Collège",
  lycee: "Lycée",
}

export function ChildCard({ child }: ChildCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  const age = calculateAge(child.birthdate)

  const handleDelete = () => {
    startTransition(async () => {
      await deleteChild(child.id)
      setShowConfirm(false)
    })
  }

  return (
    <Card className="w-full hover:border-primary/50 hover:shadow-md transition-all">
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
            <Link href={`/children/${child.id}/edit`}>
              <Button variant="outline" size="sm">
                Modifier
              </Button>
            </Link>
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

        {showConfirm ? (
          <div className="flex items-center gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-destructive flex-1">
              Supprimer {child.first_name} ?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
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
              onClick={() => setShowConfirm(true)}
            >
              Supprimer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
