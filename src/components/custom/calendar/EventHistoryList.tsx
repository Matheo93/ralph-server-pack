"use client"

import { useState, useTransition, useCallback } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Clock,
  MapPin,
  User,
  Baby,
  Calendar,
  Loader2,
  ArrowUpDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCalendarEventsHistory, type CalendarEvent, type CalendarEventsHistoryResult } from "@/lib/actions/calendar"
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/validations/calendar"

interface EventHistoryListProps {
  initialData: CalendarEventsHistoryResult
  children: Array<{ id: string; first_name: string }>
  householdMembers: Array<{ user_id: string; name: string | null }>
}

const ITEMS_PER_PAGE = 20

export function EventHistoryList({
  initialData,
  children,
  householdMembers
}: EventHistoryListProps) {
  const [data, setData] = useState<CalendarEventsHistoryResult>(initialData)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [eventType, setEventType] = useState<EventType | "all">("all")
  const [assignedTo, setAssignedTo] = useState<string | "all">("all")
  const [childId, setChildId] = useState<string | "all">("all")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.ceil(data.total / ITEMS_PER_PAGE)

  const fetchData = useCallback((newPage: number, newSearch?: string, newEventType?: EventType | "all", newAssignedTo?: string | "all", newChildId?: string | "all", newSortOrder?: "asc" | "desc") => {
    const searchValue = newSearch ?? search
    const typeValue = newEventType ?? eventType
    const assignedValue = newAssignedTo ?? assignedTo
    const childValue = newChildId ?? childId
    const orderValue = newSortOrder ?? sortOrder

    startTransition(async () => {
      const result = await getCalendarEventsHistory({
        limit: ITEMS_PER_PAGE,
        offset: (newPage - 1) * ITEMS_PER_PAGE,
        search: searchValue || undefined,
        event_type: typeValue === "all" ? undefined : typeValue,
        assigned_to: assignedValue === "all" ? undefined : assignedValue,
        child_id: childValue === "all" ? undefined : childValue,
        sort_order: orderValue,
      })
      setData(result)
    })
  }, [search, eventType, assignedTo, childId, sortOrder])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchData(newPage)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchData(1)
  }

  const handleFilterChange = (
    type: "eventType" | "assignedTo" | "childId" | "sortOrder",
    value: string
  ) => {
    setPage(1)
    switch (type) {
      case "eventType":
        setEventType(value as EventType | "all")
        fetchData(1, undefined, value as EventType | "all")
        break
      case "assignedTo":
        setAssignedTo(value)
        fetchData(1, undefined, undefined, value)
        break
      case "childId":
        setChildId(value)
        fetchData(1, undefined, undefined, undefined, value)
        break
      case "sortOrder":
        setSortOrder(value as "asc" | "desc")
        fetchData(1, undefined, undefined, undefined, undefined, value as "asc" | "desc")
        break
    }
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages: (number | "...")[] = []
    const showEllipsisStart = page > 3
    const showEllipsisEnd = page < totalPages - 2

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (showEllipsisStart) pages.push("...")

      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i)
      }

      if (showEllipsisEnd) pages.push("...")
      if (!pages.includes(totalPages)) pages.push(totalPages)
    }

    return (
      <div className="flex items-center justify-center gap-1 mt-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1 || isPending}
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, idx) => (
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
          ) : (
            <Button
              key={p}
              variant={page === p ? "default" : "outline"}
              size="icon"
              onClick={() => handlePageChange(p)}
              disabled={isPending}
              className="w-10"
            >
              {p}
            </Button>
          )
        ))}

        <Button
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages || isPending}
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un événement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}
          </Button>
        </form>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filtres:</span>
          </div>

          <Select
            value={eventType}
            onValueChange={(v) => handleFilterChange("eventType", v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {householdMembers.length > 0 && (
            <Select
              value={assignedTo}
              onValueChange={(v) => handleFilterChange("assignedTo", v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Assigné à" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les membres</SelectItem>
                {householdMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.name || "Sans nom"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {children.length > 0 && (
            <Select
              value={childId}
              onValueChange={(v) => handleFilterChange("childId", v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Enfant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les enfants</SelectItem>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.first_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterChange("sortOrder", sortOrder === "desc" ? "asc" : "desc")}
            className="gap-1"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === "desc" ? "Plus récent" : "Plus ancien"}
          </Button>
        </div>
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.total === 0
            ? "Aucun événement trouvé"
            : `${data.total} événement${data.total > 1 ? "s" : ""} trouvé${data.total > 1 ? "s" : ""}`
          }
          {totalPages > 1 && (
            <span className="ml-2">• Page {page} sur {totalPages}</span>
          )}
        </p>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>

      {/* Events list */}
      <div className="space-y-3">
        {data.events.map((event) => (
          <EventHistoryCard key={event.id} event={event} />
        ))}

        {data.events.length === 0 && !isPending && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun événement dans l&apos;historique</p>
            <p className="text-sm mt-1">Les événements passés apparaîtront ici</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  )
}

function EventHistoryCard({ event }: { event: CalendarEvent }) {
  const eventDate = new Date(event.start_date)
  const formattedDate = format(eventDate, "EEEE d MMMM yyyy", { locale: fr })
  const formattedTime = event.all_day
    ? "Toute la journée"
    : format(eventDate, "HH:mm", { locale: fr })

  return (
    <div
      className={cn(
        "p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors",
        "border-l-4"
      )}
      style={{ borderLeftColor: event.color }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
              style={{ backgroundColor: event.color }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base">{event.title}</h3>
              {event.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground pl-6">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span className="capitalize">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formattedTime}</span>
              {event.end_date && !event.all_day && (
                <span> - {format(new Date(event.end_date), "HH:mm", { locale: fr })}</span>
              )}
            </div>
          </div>

          {(event.location || event.assigned_to_name || event.child_name) && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground pl-6">
              {event.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">{event.location}</span>
                </div>
              )}
              {event.assigned_to_name && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{event.assigned_to_name}</span>
                </div>
              )}
              {event.child_name && (
                <div className="flex items-center gap-1">
                  <Baby className="h-4 w-4" />
                  <span>{event.child_name}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="capitalize">
            {EVENT_TYPE_LABELS[event.event_type as EventType] || event.event_type}
          </Badge>
        </div>
      </div>
    </div>
  )
}
