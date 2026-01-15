"use client"

import { memo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/index"
import { fadeInUp } from "@/lib/animations"
import {
  CheckCircle2,
  ClipboardList,
  Users,
  Calendar,
  BarChart3,
  Plus,
  Search,
  Inbox,
  type LucideIcon,
} from "lucide-react"

type EmptyStateVariant =
  | "tasks"
  | "tasks-today"
  | "tasks-done"
  | "children"
  | "calendar"
  | "charge"
  | "search"
  | "generic"

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  className?: string
  showAnimation?: boolean
}

interface EmptyStateConfig {
  icon: LucideIcon
  title: string
  description: string
  actionLabel: string
  actionHref: string
  iconColor: string
  bgColor: string
}

const EMPTY_STATE_CONFIGS: Record<EmptyStateVariant, EmptyStateConfig> = {
  tasks: {
    icon: ClipboardList,
    title: "Aucune tache",
    description: "Commencez par ajouter votre premiere tache pour organiser votre quotidien.",
    actionLabel: "Creer une tache",
    actionHref: "/tasks/new",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
  },
  "tasks-today": {
    icon: CheckCircle2,
    title: "Journee libre !",
    description: "Aucune tache prevue pour aujourd'hui. Profitez de ce moment ou planifiez vos prochaines taches.",
    actionLabel: "Voir toutes les taches",
    actionHref: "/tasks",
    iconColor: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20",
  },
  "tasks-done": {
    icon: CheckCircle2,
    title: "Bravo !",
    description: "Toutes les taches sont terminees. Vous etes au top !",
    actionLabel: "Ajouter une tache",
    actionHref: "/tasks/new",
    iconColor: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20",
  },
  children: {
    icon: Users,
    title: "Aucun enfant",
    description: "Ajoutez vos enfants pour mieux organiser les taches par personne.",
    actionLabel: "Ajouter un enfant",
    actionHref: "/children/new",
    iconColor: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
  },
  calendar: {
    icon: Calendar,
    title: "Calendrier vide",
    description: "Aucun evenement prevu. Planifiez vos prochaines taches.",
    actionLabel: "Planifier",
    actionHref: "/tasks/new",
    iconColor: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
  },
  charge: {
    icon: BarChart3,
    title: "Pas de donnees",
    description: "Completez quelques taches pour voir la repartition de la charge mentale.",
    actionLabel: "Voir les taches",
    actionHref: "/tasks",
    iconColor: "text-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
  },
  search: {
    icon: Search,
    title: "Aucun resultat",
    description: "Essayez de modifier vos criteres de recherche.",
    actionLabel: "Effacer les filtres",
    actionHref: "/tasks",
    iconColor: "text-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-800/20",
  },
  generic: {
    icon: Inbox,
    title: "Rien a afficher",
    description: "Il n'y a rien ici pour le moment.",
    actionLabel: "Retour",
    actionHref: "/dashboard",
    iconColor: "text-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-800/20",
  },
}

function EmptyStateInner({
  variant = "generic",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  showAnimation = true,
}: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIGS[variant]
  const Icon = config.icon

  const displayTitle = title ?? config.title
  const displayDescription = description ?? config.description
  const displayActionLabel = actionLabel ?? config.actionLabel
  const displayActionHref = actionHref ?? config.actionHref

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {/* Icon container */}
      <div
        className={cn(
          "flex items-center justify-center w-16 h-16 rounded-full mb-4",
          config.bgColor
        )}
      >
        <Icon className={cn("h-8 w-8", config.iconColor)} aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold mb-2">{displayTitle}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {displayDescription}
      </p>

      {/* Action button */}
      {(onAction || displayActionHref) && (
        <div>
          {onAction ? (
            <Button onClick={onAction}>
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              {displayActionLabel}
            </Button>
          ) : (
            <Link href={displayActionHref}>
              <Button>
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                {displayActionLabel}
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )

  if (showAnimation) {
    return (
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {content}
      </motion.div>
    )
  }

  return content
}

// Memoize to prevent re-renders
export const EmptyState = memo(EmptyStateInner)

// Convenience components for common use cases
export function TasksEmptyState(props: Omit<EmptyStateProps, "variant">) {
  return <EmptyState variant="tasks" {...props} />
}

export function TasksTodayEmptyState(props: Omit<EmptyStateProps, "variant">) {
  return <EmptyState variant="tasks-today" {...props} />
}

export function ChildrenEmptyState(props: Omit<EmptyStateProps, "variant">) {
  return <EmptyState variant="children" {...props} />
}

export function SearchEmptyState(props: Omit<EmptyStateProps, "variant">) {
  return <EmptyState variant="search" {...props} />
}
