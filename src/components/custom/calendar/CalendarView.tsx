"use client"

import { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, isToday } from "date-fns"
import { fr } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, Loader2, History } from "lucide-react"
import Link from "next/link"
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

export function CalendarView({ events: initialEvents, eventCounts: initialEventCounts, children, householdMembers }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Animation state
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | "none">("none")
  const [viewTransition, setViewTransition] = useState<"expand" | "collapse" | "none">("none")
  const gridRef = useRef<HTMLDivElement>(null)
  const previousViewMode = useRef<ViewMode>(viewMode)

  // State local pour les événements et compteurs (permet d'utiliser le cache)
  const [displayEvents, setDisplayEvents] = useState<CalendarEvent[]>(initialEvents)
  const [displayEventCounts, setDisplayEventCounts] = useState<Record<string, number>>(initialEventCounts)
  const [isNavigating, setIsNavigating] = useState(false)

  // Prefetching hook pour les mois adjacents
  const {
    prefetchMonth,
    prefetchPreviousMonth,
    prefetchNextMonth,
    prefetchAdjacentMonths,
    getMonthData,
    setCachedData,
    getCachedData,
    cancelPendingPrefetches,
    isLoading
  } = useCalendarPrefetch()

  // Cleanup des prefetch en attente au démontage
  useEffect(() => {
    return () => {
      cancelPendingPrefetches()
    }
  }, [cancelPendingPrefetches])

  // Handle view mode transitions (month <-> week)
  useEffect(() => {
    if (previousViewMode.current !== viewMode) {
      const transitionType = viewMode === "week" ? "collapse" : "expand"
      setViewTransition(transitionType)
      setIsTransitioning(true)

      const timer = setTimeout(() => {
        setIsTransitioning(false)
        setViewTransition("none")
      }, 300)

      previousViewMode.current = viewMode
      return () => clearTimeout(timer)
    }
  }, [viewMode])

  // Initialize cache avec les données initiales au montage
  useEffect(() => {
    setCachedData(new Date(), { events: initialEvents, eventCounts: initialEventCounts })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Charger les données du mois courant (depuis cache ou fetch)
  const loadMonthData = useCallback(async (date: Date) => {
    setIsNavigating(true)
    try {
      // Vérifier d'abord le cache synchrone
      const cachedData = getCachedData(date)
      if (cachedData) {
        setDisplayEvents(cachedData.events)
        setDisplayEventCounts(cachedData.eventCounts)
        setIsNavigating(false)
        return
      }

      // Sinon, charger depuis le serveur (ou attendre le prefetch en cours)
      const data = await getMonthData(date)
      setDisplayEvents(data.events)
      setDisplayEventCounts(data.eventCounts)
    } catch (error) {
      console.error("Erreur lors du chargement des données du calendrier:", error)
    } finally {
      setIsNavigating(false)
    }
  }, [getCachedData, getMonthData])

  // Charger les données quand le mois change
  useEffect(() => {
    // Ne pas recharger pour le mois initial (on a déjà les données via props)
    const initialMonth = format(new Date(), "yyyy-MM")
    const currentMonth = format(currentDate, "yyyy-MM")

    if (currentMonth !== initialMonth) {
      void loadMonthData(currentDate)
    }

    // Toujours prefetch les mois adjacents
    prefetchAdjacentMonths(currentDate)
  }, [currentDate, loadMonthData, prefetchAdjacentMonths])

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
    displayEvents.forEach(event => {
      const dateKey = format(new Date(event.start_date), "yyyy-MM-dd")
      const existing = map.get(dateKey) || []
      map.set(dateKey, [...existing, event])
    })
    return map
  }, [displayEvents])

  const triggerSlideAnimation = (direction: "left" | "right") => {
    setSlideDirection(direction)
    setIsTransitioning(true)

    // Reset après l'animation
    setTimeout(() => {
      setIsTransitioning(false)
      setSlideDirection("none")
    }, 300)
  }

  const navigatePrevious = () => {
    triggerSlideAnimation("right")
    if (viewMode === "month") {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }

  const navigateNext = () => {
    triggerSlideAnimation("left")
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }

  const goToToday = () => {
    const today = new Date()
    const isSameMonthAsToday = format(currentDate, "yyyy-MM") === format(today, "yyyy-MM")
    if (!isSameMonthAsToday) {
      const direction = today < currentDate ? "right" : "left"
      triggerSlideAnimation(direction)
    }
    setCurrentDate(today)
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

  // Prefetch les données du mois d'un jour spécifique lors du hover
  const handleDayHover = (day: Date) => {
    if (!isSameMonth(day, currentDate)) {
      // Le jour appartient à un mois adjacent, prefetch ce mois
      prefetchMonth(day)
    }
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
            onTouchStart={() => prefetchPreviousMonth(currentDate)}
            onFocus={() => prefetchPreviousMonth(currentDate)}
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={navigateNext}
            onMouseEnter={() => prefetchNextMonth(currentDate)}
            onTouchStart={() => prefetchNextMonth(currentDate)}
            onFocus={() => prefetchNextMonth(currentDate)}
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold ml-2 capitalize flex items-center gap-2">
            {viewMode === "month"
              ? format(currentDate, "MMMM yyyy", { locale: fr })
              : `Semaine du ${format(startOfWeek(currentDate, { locale: fr }), "d MMMM", { locale: fr })}`
            }
            {(isNavigating || isLoading) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
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
          <Button variant="outline" asChild>
            <Link href="/calendar/history">
              <History className="h-4 w-4 mr-2" />
              Historique
            </Link>
          </Button>
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

        {/* Days grid with animations */}
        <div
          ref={gridRef}
          className={cn(
            "grid grid-cols-7 transition-all duration-300 ease-out",
            viewMode === "month" ? "grid-rows-6" : "grid-rows-1",
            // Slide animations for navigation
            slideDirection === "left" && isTransitioning && "animate-slide-in-left",
            slideDirection === "right" && isTransitioning && "animate-slide-in-right",
            // View transition animations (month <-> week)
            viewTransition === "collapse" && isTransitioning && "animate-collapse-grid",
            viewTransition === "expand" && isTransitioning && "animate-expand-grid"
          )}
          style={{
            // Smooth height transition for view changes
            minHeight: viewMode === "week" ? "120px" : undefined
          }}>
          {days.map((day, idx) => {
            const dateKey = format(day, "yyyy-MM-dd")
            const dayEvents = eventsByDate.get(dateKey) || []
            const eventCount = displayEventCounts[dateKey] || 0
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = selectedDate && isSameDay(day, selectedDate)

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => handleDayHover(day)}
                onTouchStart={() => handleDayHover(day)}
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
