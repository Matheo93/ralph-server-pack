"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Clock, MapPin, User, Baby } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CalendarEvent } from "@/lib/actions/calendar"

interface EventCardProps {
  event: CalendarEvent
  compact?: boolean
  onClick?: (e: React.MouseEvent) => void
}

export function EventCard({ event, compact = false, onClick }: EventCardProps) {
  const startTime = event.all_day
    ? null
    : format(new Date(event.start_date), "HH:mm", { locale: fr })

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-opacity hover:opacity-80",
          "text-white font-medium"
        )}
        style={{ backgroundColor: event.color }}
        title={event.title}
      >
        {startTime && <span className="mr-1">{startTime}</span>}
        {event.title}
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-2 rounded-lg cursor-pointer transition-all hover:shadow-md border-l-4",
        "bg-card hover:bg-muted/50"
      )}
      style={{ borderLeftColor: event.color }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{event.title}</h4>

          {!event.all_day && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              <span>
                {format(new Date(event.start_date), "HH:mm", { locale: fr })}
                {event.end_date && (
                  <> - {format(new Date(event.end_date), "HH:mm", { locale: fr })}</>
                )}
              </span>
            </div>
          )}

          {event.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1">
            {event.assigned_to_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{event.assigned_to_name}</span>
              </div>
            )}
            {event.child_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Baby className="h-3 w-3" />
                <span>{event.child_name}</span>
              </div>
            )}
          </div>
        </div>

        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: event.color }}
        />
      </div>
    </div>
  )
}
