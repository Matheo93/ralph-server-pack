"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CheckCircle2,
  XCircle,
  Edit3,
  Calendar,
  User,
  FolderOpen,
  AlertTriangle,
  Loader2,
} from "lucide-react"

export interface VocalFeedbackProps {
  analysis: {
    action: string
    child_name: string | null
    category: string
    deadline: string | null
    confidence: number
    confidence_details?: {
      action: number
      date: number
      child: number
      category: number
    }
    date_parsed_from?: string | null
  }
  children: Array<{ id: string; name: string }>
  categories: Array<{ code: string; name: string }>
  onConfirm: (data: {
    action: string
    child_id: string | null
    category: string
    deadline: string | null
  }) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const CONFIDENCE_COLORS = {
  high: "bg-green-500",
  medium: "bg-yellow-500",
  low: "bg-red-500",
}

function getConfidenceColor(score: number): string {
  if (score >= 0.8) return CONFIDENCE_COLORS.high
  if (score >= 0.5) return CONFIDENCE_COLORS.medium
  return CONFIDENCE_COLORS.low
}

function getConfidenceLabel(score: number): string {
  if (score >= 0.9) return "Excellent"
  if (score >= 0.8) return "Très bien"
  if (score >= 0.7) return "Bien"
  if (score >= 0.5) return "Correct"
  return "À vérifier"
}

export function VocalFeedback({
  analysis,
  children,
  categories,
  onConfirm,
  onCancel,
  isLoading = false,
}: VocalFeedbackProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedAction, setEditedAction] = useState(analysis.action)
  const [editedChildId, setEditedChildId] = useState<string | null>(
    children.find(c => c.name === analysis.child_name)?.id ?? null
  )
  const [editedCategory, setEditedCategory] = useState(analysis.category)
  const [editedDeadline, setEditedDeadline] = useState(
    analysis.deadline ? analysis.deadline.split("T")[0] : ""
  )

  // Auto-switch to edit mode if confidence is low
  useEffect(() => {
    if (analysis.confidence < 0.5) {
      setIsEditing(true)
    }
  }, [analysis.confidence])

  const handleConfirm = async () => {
    await onConfirm({
      action: editedAction,
      child_id: editedChildId,
      category: editedCategory,
      deadline: editedDeadline ? new Date(editedDeadline).toISOString() : null,
    })
  }

  const confidencePercent = Math.round(analysis.confidence * 100)

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Commande vocale</CardTitle>
          <Badge
            variant="outline"
            className={`${getConfidenceColor(analysis.confidence)} text-white`}
          >
            {confidencePercent}% - {getConfidenceLabel(analysis.confidence)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Confidence Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Confiance globale</span>
            <span>{confidencePercent}%</span>
          </div>
          <Progress
            value={confidencePercent}
            className={`h-2 ${analysis.confidence < 0.5 ? "[&>div]:bg-red-500" : analysis.confidence < 0.8 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`}
          />
        </div>

        {/* Low confidence warning */}
        {analysis.confidence < 0.5 && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="h-4 w-4" />
            <span>Confiance faible - veuillez vérifier les détails</span>
          </div>
        )}

        {/* Analysis Details */}
        {!isEditing ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{analysis.action}</p>
                {analysis.confidence_details && (
                  <p className="text-xs text-muted-foreground">
                    Action: {Math.round(analysis.confidence_details.action * 100)}%
                  </p>
                )}
              </div>
            </div>

            {analysis.child_name && (
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <p>{analysis.child_name}</p>
                  {analysis.confidence_details && (
                    <p className="text-xs text-muted-foreground">
                      Enfant: {Math.round(analysis.confidence_details.child * 100)}%
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-purple-500 flex-shrink-0" />
              <div className="flex-1">
                <p>{categories.find(c => c.code === analysis.category)?.name ?? analysis.category}</p>
                {analysis.confidence_details && (
                  <p className="text-xs text-muted-foreground">
                    Catégorie: {Math.round(analysis.confidence_details.category * 100)}%
                  </p>
                )}
              </div>
            </div>

            {analysis.deadline && (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <div className="flex-1">
                  <p>
                    {new Date(analysis.deadline).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  {analysis.date_parsed_from && (
                    <p className="text-xs text-muted-foreground">
                      Interprété: "{analysis.date_parsed_from}"
                    </p>
                  )}
                  {analysis.confidence_details && (
                    <p className="text-xs text-muted-foreground">
                      Date: {Math.round(analysis.confidence_details.date * 100)}%
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Edit Mode
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Input
                id="action"
                value={editedAction}
                onChange={(e) => setEditedAction(e.target.value)}
                placeholder="Décrivez l'action..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="child">Enfant (optionnel)</Label>
              <Select
                value={editedChildId ?? "none"}
                onValueChange={(value) => setEditedChildId(value === "none" ? null : value)}
              >
                <SelectTrigger id="child">
                  <SelectValue placeholder="Sélectionnez un enfant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun enfant</SelectItem>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={editedCategory} onValueChange={setEditedCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.code} value={cat.code}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Date limite (optionnelle)</Label>
              <Input
                id="deadline"
                type="date"
                value={editedDeadline}
                onChange={(e) => setEditedDeadline(e.target.value)}
              />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between gap-2">
        {!isEditing ? (
          <>
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onCancel}>
                <XCircle className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={handleConfirm} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Confirmer
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Voir résumé
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onCancel}>
                Annuler
              </Button>
              <Button onClick={handleConfirm} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Créer la tâche
              </Button>
            </div>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
