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
  illustration: React.ReactNode
}

// SVG Illustrations for each state
const TasksIllustration = () => (
  <svg viewBox="0 0 200 160" className="w-full h-full">
    <defs>
      <linearGradient id="taskBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1"/>
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="80" r="60" fill="url(#taskBg)"/>
    <rect x="60" y="50" width="80" height="60" rx="8" fill="white" stroke="#3b82f6" strokeWidth="2"/>
    <line x1="75" y1="70" x2="125" y2="70" stroke="#e5e7eb" strokeWidth="2" strokeLinecap="round"/>
    <line x1="75" y1="85" x2="110" y2="85" stroke="#e5e7eb" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="135" cy="95" r="15" fill="#3b82f6"/>
    <path d="M128 95 L133 100 L143 90" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const TasksDoneIllustration = () => (
  <svg viewBox="0 0 200 160" className="w-full h-full">
    <defs>
      <linearGradient id="doneBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15"/>
        <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="80" r="65" fill="url(#doneBg)"/>
    {/* Trophy */}
    <path d="M75 60 L85 60 L85 50 L115 50 L115 60 L125 60 L125 75 C125 85 115 90 100 95 C85 90 75 85 75 75 Z" fill="#fbbf24"/>
    <rect x="90" y="95" width="20" height="15" fill="#fbbf24"/>
    <rect x="80" y="110" width="40" height="8" rx="2" fill="#fbbf24"/>
    {/* Star */}
    <polygon points="100,25 103,35 113,35 105,42 108,52 100,46 92,52 95,42 87,35 97,35" fill="#fbbf24"/>
    {/* Confetti */}
    <circle cx="55" cy="45" r="4" fill="#f97316"/>
    <circle cx="145" cy="50" r="3" fill="#3b82f6"/>
    <circle cx="60" cy="100" r="3" fill="#22c55e"/>
    <circle cx="140" cy="95" r="4" fill="#f97316"/>
    <rect x="50" y="70" width="6" height="6" rx="1" fill="#3b82f6" transform="rotate(45 53 73)"/>
    <rect x="144" y="75" width="5" height="5" rx="1" fill="#22c55e" transform="rotate(30 146 77)"/>
  </svg>
)

const ChildrenIllustration = () => (
  <svg viewBox="0 0 200 160" className="w-full h-full">
    <defs>
      <linearGradient id="childBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.1"/>
        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="85" r="60" fill="url(#childBg)"/>
    {/* Child 1 */}
    <circle cx="70" cy="70" r="20" fill="#fcd5b8"/>
    <ellipse cx="70" cy="55" rx="18" ry="12" fill="#5c4033"/>
    <circle cx="63" cy="70" r="3" fill="#3d2817"/>
    <circle cx="77" cy="70" r="3" fill="#3d2817"/>
    <path d="M63 80 Q70 88 77 80" stroke="#d97706" strokeWidth="2" fill="none"/>
    <ellipse cx="70" cy="110" rx="15" ry="20" fill="#22c55e"/>
    {/* Child 2 */}
    <circle cx="130" cy="70" r="18" fill="#fcd5b8"/>
    <ellipse cx="130" cy="57" rx="16" ry="10" fill="#5c4033"/>
    <circle cx="123" cy="70" r="2.5" fill="#3d2817"/>
    <circle cx="137" cy="70" r="2.5" fill="#3d2817"/>
    <path d="M123 78 Q130 85 137 78" stroke="#d97706" strokeWidth="2" fill="none"/>
    <ellipse cx="130" cy="105" rx="13" ry="18" fill="#3b82f6"/>
    {/* Hearts */}
    <path d="M95 50 C95 45 100 42 100 47 C100 42 105 45 105 50 C105 55 100 60 100 60 C100 60 95 55 95 50" fill="#f97316" opacity="0.7"/>
  </svg>
)

const CalendarIllustration = () => (
  <svg viewBox="0 0 200 160" className="w-full h-full">
    <defs>
      <linearGradient id="calBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f97316" stopOpacity="0.1"/>
        <stop offset="100%" stopColor="#f97316" stopOpacity="0.05"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="80" r="60" fill="url(#calBg)"/>
    {/* Calendar */}
    <rect x="55" y="45" width="90" height="80" rx="8" fill="white" stroke="#f97316" strokeWidth="2"/>
    <rect x="55" y="45" width="90" height="25" rx="8" fill="#f97316"/>
    <rect x="55" y="55" width="90" height="15" fill="#f97316"/>
    {/* Calendar pins */}
    <rect x="75" y="40" width="6" height="15" rx="3" fill="#ea580c"/>
    <rect x="119" y="40" width="6" height="15" rx="3" fill="#ea580c"/>
    {/* Calendar dates */}
    <circle cx="80" cy="90" r="8" fill="#f97316" opacity="0.2"/>
    <circle cx="100" cy="90" r="8" fill="#f97316" opacity="0.2"/>
    <circle cx="120" cy="90" r="8" fill="#f97316"/>
    <text x="117" y="94" fill="white" fontSize="10" fontWeight="bold">15</text>
    <circle cx="80" cy="110" r="8" fill="#f97316" opacity="0.2"/>
    <circle cx="100" cy="110" r="8" fill="#f97316" opacity="0.2"/>
  </svg>
)

const ChargeIllustration = () => (
  <svg viewBox="0 0 200 160" className="w-full h-full">
    <defs>
      <linearGradient id="chargeBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1"/>
        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="80" r="60" fill="url(#chargeBg)"/>
    {/* Balance scale */}
    <rect x="95" y="35" width="10" height="70" fill="#6366f1"/>
    <polygon points="100,25 110,35 90,35" fill="#6366f1"/>
    {/* Left pan */}
    <line x1="55" y1="60" x2="100" y2="50" stroke="#6366f1" strokeWidth="3"/>
    <ellipse cx="55" cy="65" rx="25" ry="8" fill="#6366f1" opacity="0.3"/>
    <ellipse cx="55" cy="62" rx="25" ry="8" fill="#a5b4fc"/>
    {/* Right pan */}
    <line x1="145" y1="55" x2="100" y2="50" stroke="#6366f1" strokeWidth="3"/>
    <ellipse cx="145" cy="60" rx="25" ry="8" fill="#6366f1" opacity="0.3"/>
    <ellipse cx="145" cy="57" rx="25" ry="8" fill="#a5b4fc"/>
    {/* People icons on pans */}
    <circle cx="50" cy="52" r="6" fill="#f97316"/>
    <circle cx="60" cy="52" r="6" fill="#f97316"/>
    <circle cx="145" cy="47" r="6" fill="#3b82f6"/>
    {/* Base */}
    <rect x="75" y="105" width="50" height="10" rx="3" fill="#6366f1"/>
  </svg>
)

const SearchIllustration = () => (
  <svg viewBox="0 0 200 160" className="w-full h-full">
    <defs>
      <linearGradient id="searchBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6b7280" stopOpacity="0.1"/>
        <stop offset="100%" stopColor="#6b7280" stopOpacity="0.05"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="80" r="60" fill="url(#searchBg)"/>
    {/* Magnifying glass */}
    <circle cx="90" cy="70" r="30" fill="none" stroke="#6b7280" strokeWidth="6"/>
    <line x1="112" y1="92" x2="140" y2="120" stroke="#6b7280" strokeWidth="8" strokeLinecap="round"/>
    {/* X mark in glass */}
    <line x1="78" y1="58" x2="102" y2="82" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"/>
    <line x1="102" y1="58" x2="78" y2="82" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"/>
  </svg>
)

const GenericIllustration = () => (
  <svg viewBox="0 0 200 160" className="w-full h-full">
    <defs>
      <linearGradient id="genBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6b7280" stopOpacity="0.1"/>
        <stop offset="100%" stopColor="#6b7280" stopOpacity="0.05"/>
      </linearGradient>
    </defs>
    <circle cx="100" cy="80" r="60" fill="url(#genBg)"/>
    {/* Inbox box */}
    <path d="M55 70 L65 95 L135 95 L145 70 L120 70 L115 80 L85 80 L80 70 Z" fill="#9ca3af"/>
    <rect x="65" y="95" width="70" height="30" fill="#6b7280"/>
    {/* Arrow down */}
    <path d="M100 35 L100 60 M85 50 L100 65 L115 50" stroke="#6b7280" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const EMPTY_STATE_CONFIGS: Record<EmptyStateVariant, EmptyStateConfig> = {
  tasks: {
    icon: ClipboardList,
    title: "Aucune tâche",
    description: "Commencez par ajouter votre première tâche pour organiser votre quotidien.",
    actionLabel: "Créer une tâche",
    actionHref: "/tasks/new",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    illustration: <TasksIllustration />,
  },
  "tasks-today": {
    icon: CheckCircle2,
    title: "Journée libre !",
    description: "Aucune tâche prévue pour aujourd'hui. Profitez de ce moment ou planifiez vos prochaines tâches.",
    actionLabel: "Voir toutes les tâches",
    actionHref: "/tasks",
    iconColor: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    illustration: <TasksDoneIllustration />,
  },
  "tasks-done": {
    icon: CheckCircle2,
    title: "Bravo !",
    description: "Toutes les tâches sont terminées. Vous êtes au top !",
    actionLabel: "Ajouter une tâche",
    actionHref: "/tasks/new",
    iconColor: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    illustration: <TasksDoneIllustration />,
  },
  children: {
    icon: Users,
    title: "Aucun enfant",
    description: "Ajoutez vos enfants pour mieux organiser les tâches par personne.",
    actionLabel: "Ajouter un enfant",
    actionHref: "/children/new",
    iconColor: "text-sky-500",
    bgColor: "bg-sky-50 dark:bg-sky-950/20",
    illustration: <ChildrenIllustration />,
  },
  calendar: {
    icon: Calendar,
    title: "Calendrier vide",
    description: "Aucun événement prévu. Planifiez vos prochaines tâches.",
    actionLabel: "Planifier",
    actionHref: "/tasks/new",
    iconColor: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    illustration: <CalendarIllustration />,
  },
  charge: {
    icon: BarChart3,
    title: "Pas de données",
    description: "Complétez quelques tâches pour voir la répartition de la charge mentale.",
    actionLabel: "Voir les tâches",
    actionHref: "/tasks",
    iconColor: "text-indigo-500",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    illustration: <ChargeIllustration />,
  },
  search: {
    icon: Search,
    title: "Aucun résultat",
    description: "Essayez de modifier vos critères de recherche.",
    actionLabel: "Effacer les filtres",
    actionHref: "/tasks",
    iconColor: "text-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-800/20",
    illustration: <SearchIllustration />,
  },
  generic: {
    icon: Inbox,
    title: "Rien à afficher",
    description: "Il n'y a rien ici pour le moment.",
    actionLabel: "Retour",
    actionHref: "/dashboard",
    iconColor: "text-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-800/20",
    illustration: <GenericIllustration />,
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
      {/* Illustration */}
      <div className="w-48 h-40 mb-6">
        {config.illustration}
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold mb-2 text-foreground">{displayTitle}</h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        {displayDescription}
      </p>

      {/* Action button */}
      {(onAction || displayActionHref) && (
        <div>
          {onAction ? (
            <Button onClick={onAction} size="lg" className="shadow-md">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              {displayActionLabel}
            </Button>
          ) : (
            <Link href={displayActionHref}>
              <Button size="lg" className="shadow-md">
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
