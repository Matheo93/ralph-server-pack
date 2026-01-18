"use client"

import { useState, useMemo, useEffect } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, isToday } from "date-fns"
import { fr } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EventCard } from "./EventCard"
import { EventFormDialog } from "./EventFormDialog"
import { useCalendarPrefetch } from "@/hooks/useCalendarPrefetch"
import type { CalendarEvent } from "@/lib/actions/calendar"

interface CalendarViewProps {
  events: CalendarEvent[]
  eventCounts: Record<string, number>
  children: Array<{ id: string; first_name: string }>
  householdMembers: Array<{ user_id: string; name: string | null }>
}

type ViewMode = "month" | "week"

export function CalendarView({ events, eventCounts, children, householdMembers }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Prefetching hook pour les mois adjacents
  const { prefetchPreviousMonth, prefetchNextMonth, prefetchAdjacentMonths } = useCalendarPrefetch()

  // Prefetch les mois adjacents au montage et quand la date change
  useEffect(() => {
    prefetchAdjacentMonths(currentDate)
  }, [currentDate, prefetchAdjacentMonths])

  const days = useMemo(() => {
    if (viewMode === "month") {
      const start = startOfWeek(startOfMonth(currentDate), { locale: fr })
      const end = endOfWeek(endOfMonth(currentDate), { locale: fr })
      return eachDayOfInterval({ start, end })
    } else {
      const start = startOfWeek(currentDate, { locale: fr })
      const end = endOfWeek(currentDate, { locale: fr })
      return eachDayOfInterval({ start, end })
    }
  }, [currentDate, viewMode])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach(event => {
      const dateKey = format(new Date(event.start_date), "yyyy-MM-dd")
      const existing = map.get(dateKey) || []
      map.set(dateKey, [...existing, event])
    })
    return map
  }, [events])

  const navigatePrevious = () => {
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }

  const navigateNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedEvent(null)
    setIsFormOpen(true)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setSelectedDate(null)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setSelectedDate(null)
    setSelectedEvent(null)
  }

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={navigatePrevious}
            onMouseEnter={() => prefetchPreviousMonth(currentDate)}
            onFocus={() => prefetchPreviousMonth(currentDate)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={navigateNext}
            onMouseEnter={() => prefetchNextMonth(currentDate)}
            onFocus={() => prefetchNextMonth(currentDate)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold ml-2 capitalize">
            {viewMode === "month"
              ? format(currentDate, "MMMM yyyy", { locale: fr })
              : `Semaine du ${format(startOfWeek(currentDate, { locale: fr }), "d MMMM", { locale: fr })}`
            }
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>
          <div className="flex rounded-lg border bg-muted p-1">
            <Button
              variant={viewMode === "month" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="rounded-md"
            >
              Mois
            </Button>
            <Button
              variant={viewMode === "week" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="rounded-md"
            >
              Semaine
            </Button>
          </div>
          <Button onClick={() => { setSelectedDate(new Date()); setSelectedEvent(null); setIsFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Événement
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 border rounded-lg overflow-hidden bg-card">
        {/* Week days header */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {weekDays.map(day => (
            <div
              key={day}
              className="py-3 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className={cn(
          "grid grid-cols-7",
          viewMode === "month" ? "grid-rows-6" : "grid-rows-1"
        )}>
          {days.map((day, idx) => {
            const dateKey = format(day, "yyyy-MM-dd")
            const dayEvents = eventsByDate.get(dateKey) || []
            const eventCount = eventCounts[dateKey] || 0
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = selectedDate && isSameDay(day, selectedDate)

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "min-h-[100px] sm:min-h-[120px] border-r border-b p-1 sm:p-2 cursor-pointer transition-colors hover:bg-muted/50",
                  !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                  isToday(day) && "bg-primary/5",
                  isSelected && "ring-2 ring-primary ring-inset"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                      isToday(day) && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {eventCount > 0 && dayEvents.length < eventCount && (
                    <Badge variant="secondary" className="text-xs">
                      +{eventCount - dayEvents.length}
                    </Badge>
                  )}
                </div>

                <div className="space-y-1 overflow-hidden">
                  {dayEvents.slice(0, viewMode === "month" ? 3 : 10).map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      compact={viewMode === "month"}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEventClick(event)
                      }}
                    />
                  ))}
                  {dayEvents.length > 3 && viewMode === "month" && (
                    <div className="text-xs text-muted-foreground pl-1">
                      +{dayEvents.length - 3} autres
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Event Form Dialog */}
      <EventFormDialog
        open={isFormOpen}
        onClose={handleCloseForm}
        event={selectedEvent}
        defaultDate={selectedDate}
        children={children}
        householdMembers={householdMembers}
      />
    </div>
  )
}
