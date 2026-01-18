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
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-opacity hover:opacity-80 w-full text-left",
          "text-white font-medium focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-1"
        )}
        style={{ backgroundColor: event.color }}
        aria-label={`${event.title}${startTime ? ` à ${startTime}` : ''}${event.location ? `, ${event.location}` : ''}`}
      >
        {startTime && <span className="mr-1" aria-hidden="true">{startTime}</span>}
        <span>{event.title}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "p-2 rounded-lg cursor-pointer transition-all hover:shadow-md border-l-4 w-full text-left",
        "bg-card hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
      )}
      style={{ borderLeftColor: event.color }}
      aria-label={`${event.title}${!event.all_day ? ` de ${format(new Date(event.start_date), "HH:mm", { locale: fr })}${event.end_date ? ` à ${format(new Date(event.end_date), "HH:mm", { locale: fr })}` : ''}` : ', toute la journée'}${event.location ? `, lieu: ${event.location}` : ''}${event.assigned_to_name ? `, assigné à ${event.assigned_to_name}` : ''}${event.child_name ? `, pour ${event.child_name}` : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{event.title}</h4>

          {!event.all_day && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
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
              <MapPin className="h-3 w-3" aria-hidden="true" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1">
            {event.assigned_to_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" aria-hidden="true" />
                <span>{event.assigned_to_name}</span>
              </div>
            )}
            {event.child_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Baby className="h-3 w-3" aria-hidden="true" />
                <span>{event.child_name}</span>
              </div>
            )}
          </div>
        </div>

        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: event.color }}
          aria-hidden="true"
        />
      </div>
    </button>
  )
}
