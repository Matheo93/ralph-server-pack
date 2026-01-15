/**
 * Suggested Tasks Component
 *
 * Displays personalized task suggestions based on children and current period.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react"
import { TaskTemplateCard } from "./TaskTemplateCard"
import { TaskSuggestion, TaskTemplate } from "@/lib/catalog/types"

interface SuggestedTasksProps {
  /** Maximum number of suggestions to show */
  maxSuggestions?: number
  /** Whether to show period-specific suggestions only */
  periodOnly?: boolean
  /** Callback when a task is added */
  onAddTask?: (template: TaskTemplate, childId?: string) => Promise<void>
  /** Additional CSS classes */
  className?: string
  /** Layout direction */
  direction?: "horizontal" | "vertical"
  /** Title for the section */
  title?: string
  /** Description for the section */
  description?: string
}

export function SuggestedTasks({
  maxSuggestions = 6,
  periodOnly = false,
  onAddTask,
  className,
  direction = "horizontal",
  title = "Suggestions pour vous",
  description = "Basées sur vos enfants et la période actuelle",
}: SuggestedTasksProps) {
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: maxSuggestions.toString(),
        periodOnly: periodOnly.toString(),
      })

      const response = await fetch(`/api/catalog/suggestions?${params}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? "Erreur lors du chargement")
      }

      const data = await response.json()
      setSuggestions(data.suggestions ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }, [maxSuggestions, periodOnly])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const handleAdd = useCallback(
    async (template: TaskTemplate, childId?: string) => {
      if (!onAddTask) return

      setAddingIds((prev) => new Set(prev).add(template.id))

      try {
        await onAddTask(template, childId)
        setAddedIds((prev) => new Set(prev).add(template.id))

        // Remove from suggestions after a delay
        setTimeout(() => {
          setSuggestions((prev) =>
            prev.filter((s) => s.template.id !== template.id)
          )
        }, 1500)
      } catch (err) {
        console.error("Error adding task:", err)
      } finally {
        setAddingIds((prev) => {
          const next = new Set(prev)
          next.delete(template.id)
          return next
        })
      }
    },
    [onAddTask]
  )

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>{error}</p>
            <Button variant="ghost" onClick={fetchSuggestions} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className} data-testid="suggested-tasks">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchSuggestions}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("h-4 w-4", isLoading && "animate-spin")}
            />
          </Button>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucune suggestion pour le moment</p>
            <p className="text-sm mt-1">
              Ajoutez des enfants à votre foyer pour recevoir des suggestions
              personnalisées
            </p>
          </div>
        ) : direction === "horizontal" ? (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.template.id}
                  className="w-[280px] flex-shrink-0"
                >
                  <TaskTemplateCard
                    template={suggestion.template}
                    childName={suggestion.childName}
                    relevanceScore={suggestion.relevanceScore}
                    reason={suggestion.reason}
                    onAdd={
                      onAddTask
                        ? () => handleAdd(suggestion.template, suggestion.childId)
                        : undefined
                    }
                    className={cn(
                      addingIds.has(suggestion.template.id) && "opacity-50",
                      addedIds.has(suggestion.template.id) && "border-green-500"
                    )}
                  />
                  {addedIds.has(suggestion.template.id) && (
                    <div className="flex items-center justify-center gap-2 mt-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">Ajoutée</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        ) : (
          <div className="grid gap-3">
            {suggestions.map((suggestion) => (
              <div key={suggestion.template.id}>
                <TaskTemplateCard
                  template={suggestion.template}
                  childName={suggestion.childName}
                  relevanceScore={suggestion.relevanceScore}
                  reason={suggestion.reason}
                  onAdd={
                    onAddTask
                      ? () => handleAdd(suggestion.template, suggestion.childId)
                      : undefined
                  }
                  compact
                  className={cn(
                    addingIds.has(suggestion.template.id) && "opacity-50",
                    addedIds.has(suggestion.template.id) && "border-green-500"
                  )}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
