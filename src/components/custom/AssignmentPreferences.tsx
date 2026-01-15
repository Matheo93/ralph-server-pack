"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/index"
import { setCategoryPreference, type PreferenceLevel, type TaskCategoryWithPreference } from "@/lib/actions/settings"
import { Heart, ThumbsDown, Star, Minus, Loader2, CheckCircle2 } from "lucide-react"
import { TaskCategoryIcon } from "./TaskCategoryIcon"

interface AssignmentPreferencesProps {
  categories: TaskCategoryWithPreference[]
}

const preferenceConfig: Record<PreferenceLevel, {
  label: string
  shortLabel: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
}> = {
  expert: {
    label: "Expert",
    shortLabel: "Expert",
    description: "Je suis expert(e) dans cette catégorie - priorité haute",
    icon: <Star className="h-4 w-4" />,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 hover:bg-yellow-200",
  },
  prefer: {
    label: "Je préfère",
    shortLabel: "Préfère",
    description: "J'aime faire ces tâches - m'en assigner plus",
    icon: <Heart className="h-4 w-4" />,
    color: "text-rose-600",
    bgColor: "bg-rose-100 hover:bg-rose-200",
  },
  neutral: {
    label: "Neutre",
    shortLabel: "Neutre",
    description: "Pas de préférence particulière",
    icon: <Minus className="h-4 w-4" />,
    color: "text-gray-600",
    bgColor: "bg-gray-100 hover:bg-gray-200",
  },
  dislike: {
    label: "J'évite",
    shortLabel: "Évite",
    description: "Je préfère éviter ces tâches si possible",
    icon: <ThumbsDown className="h-4 w-4" />,
    color: "text-blue-600",
    bgColor: "bg-blue-100 hover:bg-blue-200",
  },
}

const preferenceOrder: PreferenceLevel[] = ["expert", "prefer", "neutral", "dislike"]

function CategoryPreferenceCard({
  category,
  onPreferenceChange,
  isPending,
}: {
  category: TaskCategoryWithPreference
  onPreferenceChange: (categoryId: string, level: PreferenceLevel) => void
  isPending: boolean
}) {
  const currentConfig = preferenceConfig[category.preference]

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <TaskCategoryIcon
            code={category.code}
            icon={category.icon}
            color={category.color}
            name={category.name}
          />
          <div>
            <CardTitle className="text-base">{category.name}</CardTitle>
            <CardDescription className="text-xs">
              {currentConfig.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {preferenceOrder.map((level) => {
            const config = preferenceConfig[level]
            const isSelected = category.preference === level

            return (
              <Button
                key={level}
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => onPreferenceChange(category.id, level)}
                className={cn(
                  "gap-1.5 transition-colors",
                  isSelected && config.bgColor,
                  isSelected && config.color,
                  isSelected && "border-current"
                )}
              >
                {config.icon}
                <span className="hidden sm:inline">{config.label}</span>
                <span className="sm:hidden">{config.shortLabel}</span>
                {isSelected && <CheckCircle2 className="h-3 w-3 ml-1" />}
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function AssignmentPreferences({ categories }: AssignmentPreferencesProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [savingCategory, setSavingCategory] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePreferenceChange = (categoryId: string, level: PreferenceLevel) => {
    setError(null)
    setSuccess(false)
    setSavingCategory(categoryId)

    startTransition(async () => {
      const result = await setCategoryPreference({
        categoryId,
        preferenceLevel: level,
      })

      setSavingCategory(null)

      if (result.success) {
        setSuccess(true)
        router.refresh()
        setTimeout(() => setSuccess(false), 2000)
      } else {
        setError(result.error ?? "Une erreur est survenue")
      }
    })
  }

  // Group categories by current preference
  const expertCategories = categories.filter(c => c.preference === "expert")
  const preferredCategories = categories.filter(c => c.preference === "prefer")
  const dislikedCategories = categories.filter(c => c.preference === "dislike")
  const neutralCategories = categories.filter(c => c.preference === "neutral")

  return (
    <div className="space-y-6">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {expertCategories.length > 0 && (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <Star className="h-3 w-3 mr-1" />
            {expertCategories.length} Expert
          </Badge>
        )}
        {preferredCategories.length > 0 && (
          <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-300">
            <Heart className="h-3 w-3 mr-1" />
            {preferredCategories.length} Préférée{preferredCategories.length > 1 ? "s" : ""}
          </Badge>
        )}
        {dislikedCategories.length > 0 && (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
            <ThumbsDown className="h-3 w-3 mr-1" />
            {dislikedCategories.length} Évitée{dislikedCategories.length > 1 ? "s" : ""}
          </Badge>
        )}
        {neutralCategories.length > 0 && (
          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
            <Minus className="h-3 w-3 mr-1" />
            {neutralCategories.length} Neutre{neutralCategories.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Status messages */}
      {isPending && savingCategory && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Enregistrement...
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          Préférence enregistrée
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}

      {/* Explanation */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <h4 className="font-medium mb-2">Comment ça marche ?</h4>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <Star className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <span><strong>Expert :</strong> Les tâches de cette catégorie vous seront assignées en priorité si vous êtes compétent(e)</span>
            </li>
            <li className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span><strong>Je préfère :</strong> Vous recevrez plus de tâches de cette catégorie, sauf si cela crée un déséquilibre</span>
            </li>
            <li className="flex items-start gap-2">
              <Minus className="h-4 w-4 text-gray-600 shrink-0 mt-0.5" />
              <span><strong>Neutre :</strong> Répartition normale basée uniquement sur l&apos;équilibre de la charge</span>
            </li>
            <li className="flex items-start gap-2">
              <ThumbsDown className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span><strong>J&apos;évite :</strong> Ces tâches seront assignées à d&apos;autres membres si possible</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Categories grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => (
          <CategoryPreferenceCard
            key={category.id}
            category={category}
            onPreferenceChange={handlePreferenceChange}
            isPending={isPending && savingCategory === category.id}
          />
        ))}
      </div>

      {categories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune catégorie de tâche disponible
          </CardContent>
        </Card>
      )}
    </div>
  )
}
