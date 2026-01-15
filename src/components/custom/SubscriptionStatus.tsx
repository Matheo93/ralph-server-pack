"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils/index"
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react"

type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled" | "expired"

interface SubscriptionStatusProps {
  status: SubscriptionStatus
  trialEndsAt?: Date | null
  subscriptionEndsAt?: Date | null
  className?: string
}

const STATUS_CONFIG: Record<SubscriptionStatus, {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline"
  icon: React.ElementType
  color: string
}> = {
  trial: {
    label: "Essai gratuit",
    variant: "secondary",
    icon: Clock,
    color: "text-blue-600",
  },
  active: {
    label: "Actif",
    variant: "default",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  past_due: {
    label: "Paiement en retard",
    variant: "destructive",
    icon: AlertTriangle,
    color: "text-amber-600",
  },
  cancelled: {
    label: "Annulé",
    variant: "outline",
    icon: XCircle,
    color: "text-gray-600",
  },
  expired: {
    label: "Expiré",
    variant: "destructive",
    icon: XCircle,
    color: "text-red-600",
  },
}

export function SubscriptionStatus({
  status,
  trialEndsAt,
  subscriptionEndsAt,
  className,
}: SubscriptionStatusProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  // Calculate days remaining
  const daysRemaining = getDaysRemaining(status, trialEndsAt, subscriptionEndsAt)

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>

      {daysRemaining !== null && (
        <span className={cn("text-sm", config.color)}>
          {formatDaysRemaining(daysRemaining, status)}
        </span>
      )}
    </div>
  )
}

function getDaysRemaining(
  status: SubscriptionStatus,
  trialEndsAt?: Date | null,
  subscriptionEndsAt?: Date | null
): number | null {
  const now = new Date()

  if (status === "trial" && trialEndsAt) {
    const diff = trialEndsAt.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  if (status === "cancelled" && subscriptionEndsAt) {
    const diff = subscriptionEndsAt.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return null
}

function formatDaysRemaining(days: number, status: SubscriptionStatus): string {
  if (days < 0) {
    return "Expiré"
  }

  if (days === 0) {
    return "Expire aujourd'hui"
  }

  if (days === 1) {
    return status === "trial" ? "1 jour d'essai restant" : "Expire demain"
  }

  return status === "trial"
    ? `${days} jours d'essai restants`
    : `Expire dans ${days} jours`
}

// Compact badge version
interface SubscriptionBadgeProps {
  status: SubscriptionStatus
  className?: string
}

export function SubscriptionBadge({ status, className }: SubscriptionBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn("gap-1", className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

// Alert component for expiring subscriptions
interface SubscriptionAlertProps {
  status: SubscriptionStatus
  trialEndsAt?: Date | null
  subscriptionEndsAt?: Date | null
  className?: string
}

export function SubscriptionAlert({
  status,
  trialEndsAt,
  subscriptionEndsAt,
  className,
}: SubscriptionAlertProps) {
  const daysRemaining = getDaysRemaining(status, trialEndsAt, subscriptionEndsAt)

  // Only show alert if expiring soon (within 7 days)
  if (daysRemaining === null || daysRemaining > 7) {
    return null
  }

  const isUrgent = daysRemaining <= 3

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        isUrgent
          ? "bg-red-50 border-red-200 text-red-800"
          : "bg-amber-50 border-amber-200 text-amber-800",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <div>
          <p className="font-medium">
            {status === "trial"
              ? "Votre essai gratuit arrive à expiration"
              : "Votre abonnement se termine bientôt"}
          </p>
          <p className="text-sm mt-1">
            {formatDaysRemaining(daysRemaining, status)}.
            {status === "trial"
              ? " Passez à un abonnement payant pour continuer à utiliser FamilyLoad."
              : " Renouvelez votre abonnement pour continuer."}
          </p>
        </div>
      </div>
    </div>
  )
}
