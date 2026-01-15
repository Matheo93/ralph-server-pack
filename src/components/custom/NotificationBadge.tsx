"use client"

import { useState, useEffect, useCallback } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Check, AlertTriangle, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils/index"

interface Notification {
  id: string
  type: "task_due" | "task_overdue" | "task_assigned" | "streak_risk" | "general"
  title: string
  description?: string
  read: boolean
  createdAt: Date
  actionUrl?: string
}

interface NotificationBadgeProps {
  notifications?: Notification[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  className?: string
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  task_due: <Clock className="w-4 h-4 text-blue-500" />,
  task_overdue: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  task_assigned: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  streak_risk: <AlertTriangle className="w-4 h-4 text-red-500" />,
  general: <Bell className="w-4 h-4 text-muted-foreground" />,
}

export function NotificationBadge({
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  className,
}: NotificationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAsRead = useCallback(
    (id: string) => {
      onMarkAsRead?.(id)
    },
    [onMarkAsRead]
  )

  const handleMarkAllAsRead = useCallback(() => {
    onMarkAllAsRead?.()
  }, [onMarkAllAsRead])

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "À l'instant"
    if (minutes < 60) return `Il y a ${minutes}min`
    if (hours < 24) return `Il y a ${hours}h`
    return `Il y a ${days}j`
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("relative", className)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ""}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1"
              onClick={handleMarkAllAsRead}
            >
              Tout marquer comme lu
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Aucune notification
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.slice(0, 10).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer",
                  !notification.read && "bg-muted/50"
                )}
                onClick={() => handleMarkAsRead(notification.id)}
              >
                <div className="shrink-0 mt-0.5">
                  {NOTIFICATION_ICONS[notification.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm",
                      !notification.read && "font-medium"
                    )}
                  >
                    {notification.title}
                  </p>
                  {notification.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <div className="shrink-0">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
