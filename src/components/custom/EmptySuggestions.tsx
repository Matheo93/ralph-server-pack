"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Mic,
  FileText,
  MessageSquare,
  Sparkles,
  Plus,
  CalendarPlus,
  Baby,
  ArrowRight
} from "lucide-react"

interface Suggestion {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  action?: "vocal" | "template"
  color: string
  bgColor: string
}

const suggestions: Suggestion[] = [
  {
    id: "vocal",
    title: "Chat rapide",
    description: "Ajoutez une tâche en parlant naturellement",
    icon: Mic,
    action: "vocal",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "templates",
    title: "Templates",
    description: "Utilisez des modèles pré-configurés",
    icon: FileText,
    href: "/settings/templates",
    color: "text-slate-600",
    bgColor: "bg-slate-100",
  },
  {
    id: "new-task",
    title: "Nouvelle tâche",
    description: "Créez une tâche manuellement",
    icon: CalendarPlus,
    href: "/tasks/new",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    id: "add-child",
    title: "Ajouter un enfant",
    description: "Personnalisez les tâches par enfant",
    icon: Baby,
    href: "/children/new",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
]

interface EmptySuggestionsProps {
  hasChildren?: boolean
  onVocalClick?: () => void
}

export function EmptySuggestions({ hasChildren = false, onVocalClick }: EmptySuggestionsProps) {
  // Filter suggestions based on context
  const filteredSuggestions = hasChildren
    ? suggestions.filter(s => s.id !== "add-child")
    : suggestions

  const handleClick = (suggestion: Suggestion) => {
    if (suggestion.action === "vocal" && onVocalClick) {
      onVocalClick()
    }
  }

  return (
    <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <CardHeader className="text-center pb-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-xl">Par où commencer ?</CardTitle>
        <CardDescription className="text-base">
          Voici quelques suggestions pour bien démarrer avec FamilyLoad
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredSuggestions.map((suggestion) => {
            const Icon = suggestion.icon
            const content = (
              <div className="flex flex-col items-center text-center p-4 rounded-xl border-2 border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all group cursor-pointer h-full">
                <div className={`w-12 h-12 rounded-xl ${suggestion.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${suggestion.color}`} />
                </div>
                <h4 className="font-semibold text-sm mb-1">{suggestion.title}</h4>
                <p className="text-xs text-muted-foreground leading-snug">
                  {suggestion.description}
                </p>
              </div>
            )

            if (suggestion.href) {
              return (
                <Link key={suggestion.id} href={suggestion.href}>
                  {content}
                </Link>
              )
            }

            return (
              <div key={suggestion.id} onClick={() => handleClick(suggestion)}>
                {content}
              </div>
            )
          })}
        </div>

        {/* CTA principale */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="flex-1 max-w-xs mx-auto"
              onClick={onVocalClick}
            >
              <Mic className="w-5 h-5 mr-2" />
              Commencer par une tâche vocale
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Dites par exemple : &quot;Rappelle-moi de prendre RDV chez le médecin&quot;
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
