"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils/index"
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Star,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Download,
  X,
} from "lucide-react"

export interface TimelineTask {
  id: string
  title: string
  status: "done" | "pending" | "upcoming"
  date: Date
  categoryName?: string
  categoryColor?: string
  assignedTo?: string
  loadWeight: number
  isHighPriority?: boolean
  isRecurring?: boolean
}

export interface TimelineEvent {
  id: string
  type: "milestone" | "vaccination" | "celebration" | "school"
  title: string
  description?: string
  date: Date
  icon?: string
  color?: string
}

interface ChildTimelineProps {
  childId: string
  childName: string
  tasks: TimelineTask[]
  events?: TimelineEvent[]
  className?: string
}

type PeriodFilter = "week" | "month" | "3months" | "year" | "all"
type StatusFilter = "all" | "done" | "pending" | "upcoming"

// Get unique categories from tasks
function getUniqueCategories(tasks: TimelineTask[]): string[] {
  const categories = new Set<string>()
  for (const task of tasks) {
    if (task.categoryName) {
      categories.add(task.categoryName)
    }
  }
  return Array.from(categories).sort()
}

export function ChildTimeline({
  childId,
  childName,
  tasks,
  events = [],
  className,
}: ChildTimelineProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month")
  const [currentOffset, setCurrentOffset] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [showHighPriorityOnly, setShowHighPriorityOnly] = useState(false)
  const [showEvents, setShowEvents] = useState(true)

  // Get all unique categories
  const allCategories = useMemo(() => getUniqueCategories(tasks), [tasks])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = filterTasksByPeriod(tasks, periodFilter, currentOffset)

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((task) => task.status === statusFilter)
    }

    // Category filter
    if (selectedCategories.size > 0) {
      filtered = filtered.filter(
        (task) => task.categoryName && selectedCategories.has(task.categoryName)
      )
    }

    // High priority filter
    if (showHighPriorityOnly) {
      filtered = filtered.filter((task) => task.isHighPriority || task.loadWeight >= 5)
    }

    return filtered
  }, [tasks, periodFilter, currentOffset, statusFilter, selectedCategories, showHighPriorityOnly])

  // Filter events
  const filteredEvents = useMemo(() => {
    if (!showEvents) return []
    return filterEventsByPeriod(events, periodFilter, currentOffset)
  }, [events, periodFilter, currentOffset, showEvents])

  // Group tasks and events by date
  const groupedItems = useMemo(() => {
    return groupItemsByDate(filteredTasks, filteredEvents)
  }, [filteredTasks, filteredEvents])

  // Get period label
  const periodLabel = getPeriodLabel(periodFilter, currentOffset)

  // Stats
  const stats = useMemo(() => {
    const periodTasks = filterTasksByPeriod(tasks, periodFilter, currentOffset)
    return {
      total: periodTasks.length,
      done: periodTasks.filter((t) => t.status === "done").length,
      pending: periodTasks.filter((t) => t.status === "pending").length,
      upcoming: periodTasks.filter((t) => t.status === "upcoming").length,
      highPriority: periodTasks.filter((t) => t.isHighPriority || t.loadWeight >= 5).length,
      totalPoints: periodTasks.reduce((sum, t) => sum + t.loadWeight, 0),
    }
  }, [tasks, periodFilter, currentOffset])

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter("all")
    setSelectedCategories(new Set())
    setShowHighPriorityOnly(false)
  }

  const hasActiveFilters =
    statusFilter !== "all" || selectedCategories.size > 0 || showHighPriorityOnly

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Complétées"
          value={stats.done}
          total={stats.total}
          color="text-green-600"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="En cours"
          value={stats.pending}
          total={stats.total}
          color="text-amber-600"
          icon={<Circle className="h-4 w-4" />}
        />
        <StatCard
          label="À venir"
          value={stats.upcoming}
          total={stats.total}
          color="text-blue-600"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Points"
          value={stats.totalPoints}
          color="text-purple-600"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period selector */}
        <div className="flex rounded-lg border bg-muted/50 p-1">
          {(["week", "month", "3months", "year", "all"] as const).map((period) => (
            <Button
              key={period}
              variant={periodFilter === period ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setPeriodFilter(period)
                setCurrentOffset(0)
              }}
              className="h-7 text-xs"
            >
              {period === "week" && "Semaine"}
              {period === "month" && "Mois"}
              {period === "3months" && "3 mois"}
              {period === "year" && "Année"}
              {period === "all" && "Tout"}
            </Button>
          ))}
        </div>

        {/* Navigation */}
        {periodFilter !== "all" && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentOffset((o) => o - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[100px] text-center">
              {periodLabel}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentOffset((o) => o + 1)}
              disabled={currentOffset >= 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex-1" />

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Statut
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1">
                  1
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={statusFilter === "all"}
              onCheckedChange={() => setStatusFilter("all")}
            >
              Tous
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "done"}
              onCheckedChange={() => setStatusFilter("done")}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-600" />
              Complétées ({stats.done})
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "pending"}
              onCheckedChange={() => setStatusFilter("pending")}
            >
              <Circle className="h-3.5 w-3.5 mr-2 text-amber-600" />
              En cours ({stats.pending})
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === "upcoming"}
              onCheckedChange={() => setStatusFilter("upcoming")}
            >
              <Clock className="h-3.5 w-3.5 mr-2 text-blue-600" />
              À venir ({stats.upcoming})
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category Filter */}
        {allCategories.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Catégorie
                {selectedCategories.size > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1">
                    {selectedCategories.size}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrer par catégorie</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allCategories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={selectedCategories.has(category)}
                  onCheckedChange={(checked) => {
                    const newSet = new Set(selectedCategories)
                    if (checked) {
                      newSet.add(category)
                    } else {
                      newSet.delete(category)
                    }
                    setSelectedCategories(newSet)
                  }}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* High Priority Toggle */}
        <Button
          variant={showHighPriorityOnly ? "default" : "outline"}
          size="sm"
          className="h-8"
          onClick={() => setShowHighPriorityOnly(!showHighPriorityOnly)}
        >
          <Star className={cn("h-3.5 w-3.5 mr-1.5", showHighPriorityOnly && "fill-current")} />
          Important
        </Button>

        {/* Events Toggle */}
        {events.length > 0 && (
          <Button
            variant={showEvents ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setShowEvents(!showEvents)}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Événements
          </Button>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1.5" />
            Effacer
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Statut: {statusFilter === "done" ? "Complétées" : statusFilter === "pending" ? "En cours" : "À venir"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setStatusFilter("all")}
              />
            </Badge>
          )}
          {Array.from(selectedCategories).map((cat) => (
            <Badge key={cat} variant="secondary" className="gap-1">
              {cat}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => {
                  const newSet = new Set(selectedCategories)
                  newSet.delete(cat)
                  setSelectedCategories(newSet)
                }}
              />
            </Badge>
          ))}
          {showHighPriorityOnly && (
            <Badge variant="secondary" className="gap-1">
              Important seulement
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setShowHighPriorityOnly(false)}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Timeline */}
      <Card>
        <CardContent className="pt-6">
          {groupedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucune tâche pour cette période</p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                  Effacer les filtres
                </Button>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-6">
                {groupedItems.map((group, groupIndex) => (
                  <div key={group.date.toISOString()}>
                    {/* Date header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="relative z-10 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{formatDateHeader(group.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.tasks.length} tâche{group.tasks.length > 1 ? "s" : ""}
                          {group.events.length > 0 &&
                            ` • ${group.events.length} événement${group.events.length > 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>

                    {/* Events for this date (highlighted) */}
                    {group.events.length > 0 && (
                      <div className="ml-[31px] space-y-2 mb-3">
                        {group.events.map((event) => (
                          <EventItem key={event.id} event={event} />
                        ))}
                      </div>
                    )}

                    {/* Tasks for this date */}
                    <div className="ml-[31px] space-y-3">
                      {group.tasks.map((task) => (
                        <TimelineItem key={task.id} task={task} />
                      ))}
                    </div>

                    {groupIndex < groupedItems.length - 1 && (
                      <Separator className="mt-6 ml-8" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled>
          <Download className="mr-2 h-4 w-4" />
          Exporter CSV
        </Button>
        <Button variant="outline" size="sm" disabled>
          <FileText className="mr-2 h-4 w-4" />
          Exporter PDF
        </Button>
      </div>
    </div>
  )
}

// Sub-components

interface StatCardProps {
  label: string
  value: number
  total?: number
  color: string
  icon: React.ReactNode
}

function StatCard({ label, value, total, color, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-xl font-bold", color)}>
              {value}
              {total !== undefined && (
                <span className="text-sm font-normal text-muted-foreground">
                  /{total}
                </span>
              )}
            </p>
          </div>
          <div className={color}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function TimelineItem({ task }: { task: TimelineTask }) {
  const getStatusIcon = () => {
    switch (task.status) {
      case "done":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "pending":
        return <Circle className="h-4 w-4 text-amber-500" />
      case "upcoming":
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusBadge = () => {
    switch (task.status) {
      case "done":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Fait
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            En cours
          </Badge>
        )
      case "upcoming":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            À venir
          </Badge>
        )
    }
  }

  const isHighPriority = task.isHighPriority || task.loadWeight >= 5

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors",
        isHighPriority
          ? "bg-amber-50 hover:bg-amber-100/70 border border-amber-200"
          : "bg-muted/30 hover:bg-muted/50"
      )}
    >
      <div className="mt-0.5">{getStatusIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{task.title}</p>
          {getStatusBadge()}
          {isHighPriority && (
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          )}
          {task.isRecurring && (
            <Badge variant="outline" className="text-xs">
              Récurrent
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {task.categoryName && (
            <span
              className="inline-flex items-center gap-1"
              style={{ color: task.categoryColor ?? undefined }}
            >
              {task.categoryName}
            </span>
          )}
          {task.assignedTo && <span>Assigné à {task.assignedTo}</span>}
          <span className={cn(isHighPriority && "font-semibold text-amber-700")}>
            {task.loadWeight} pts
          </span>
        </div>
      </div>
    </div>
  )
}

function EventItem({ event }: { event: TimelineEvent }) {
  const typeStyles = {
    milestone: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: <Sparkles className="h-4 w-4 text-purple-500" />,
    },
    vaccination: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
    },
    celebration: {
      bg: "bg-pink-50",
      border: "border-pink-200",
      icon: <Star className="h-4 w-4 text-pink-500 fill-pink-500" />,
    },
    school: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: <Calendar className="h-4 w-4 text-blue-500" />,
    },
  }

  const style = typeStyles[event.type]

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        style.bg,
        style.border
      )}
    >
      <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
        {style.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{event.title}</p>
        {event.description && (
          <p className="text-xs text-muted-foreground truncate">{event.description}</p>
        )}
      </div>
      <Badge variant="outline" className="shrink-0 text-xs">
        {event.type === "milestone" && "Jalon"}
        {event.type === "vaccination" && "Vaccin"}
        {event.type === "celebration" && "Fête"}
        {event.type === "school" && "École"}
      </Badge>
    </div>
  )
}

// Helper functions

function filterTasksByPeriod(
  tasks: TimelineTask[],
  period: PeriodFilter,
  offset: number
): TimelineTask[] {
  if (period === "all") {
    return tasks
  }

  const now = new Date()
  let start: Date
  let end: Date

  if (period === "week") {
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + offset * 7)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    start = startOfWeek
    end = endOfWeek
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999)
  } else if (period === "3months") {
    start = new Date(now.getFullYear(), now.getMonth() + offset * 3, 1)
    end = new Date(now.getFullYear(), now.getMonth() + offset * 3 + 3, 0, 23, 59, 59, 999)
  } else {
    // year
    start = new Date(now.getFullYear() + offset, 0, 1)
    end = new Date(now.getFullYear() + offset, 11, 31, 23, 59, 59, 999)
  }

  return tasks.filter((task) => {
    const taskDate = task.date
    return taskDate >= start && taskDate <= end
  })
}

function filterEventsByPeriod(
  events: TimelineEvent[],
  period: PeriodFilter,
  offset: number
): TimelineEvent[] {
  if (period === "all") {
    return events
  }

  const now = new Date()
  let start: Date
  let end: Date

  if (period === "week") {
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + offset * 7)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    start = startOfWeek
    end = endOfWeek
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999)
  } else if (period === "3months") {
    start = new Date(now.getFullYear(), now.getMonth() + offset * 3, 1)
    end = new Date(now.getFullYear(), now.getMonth() + offset * 3 + 3, 0, 23, 59, 59, 999)
  } else {
    // year
    start = new Date(now.getFullYear() + offset, 0, 1)
    end = new Date(now.getFullYear() + offset, 11, 31, 23, 59, 59, 999)
  }

  return events.filter((event) => {
    const eventDate = event.date
    return eventDate >= start && eventDate <= end
  })
}

interface GroupedItems {
  date: Date
  tasks: TimelineTask[]
  events: TimelineEvent[]
}

function groupItemsByDate(
  tasks: TimelineTask[],
  events: TimelineEvent[]
): GroupedItems[] {
  const groups = new Map<string, { tasks: TimelineTask[]; events: TimelineEvent[] }>()

  // Group tasks
  for (const task of tasks) {
    const dateKey = task.date.toISOString().split("T")[0] ?? task.date.toISOString()
    const existing = groups.get(dateKey) ?? { tasks: [], events: [] }
    existing.tasks.push(task)
    groups.set(dateKey, existing)
  }

  // Group events
  for (const event of events) {
    const dateKey = event.date.toISOString().split("T")[0] ?? event.date.toISOString()
    const existing = groups.get(dateKey) ?? { tasks: [], events: [] }
    existing.events.push(event)
    groups.set(dateKey, existing)
  }

  // Convert to array and sort by date descending
  return Array.from(groups.entries())
    .map(([dateStr, items]) => ({
      date: new Date(dateStr),
      tasks: items.tasks.sort((a, b) => b.date.getTime() - a.date.getTime()),
      events: items.events.sort((a, b) => a.date.getTime() - b.date.getTime()),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}

function getPeriodLabel(period: PeriodFilter, offset: number): string {
  if (period === "all") return "Tout"

  const now = new Date()

  if (period === "week") {
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + offset * 7)

    if (offset === 0) return "Cette semaine"
    if (offset === -1) return "Sem. dernière"

    return `Sem. ${startOfWeek.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
  }

  if (period === "month") {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1)

    if (offset === 0) return "Ce mois"
    if (offset === -1) return "Mois dernier"

    return targetMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
  }

  if (period === "3months") {
    const startMonth = new Date(now.getFullYear(), now.getMonth() + offset * 3, 1)
    const endMonth = new Date(now.getFullYear(), now.getMonth() + offset * 3 + 2, 1)

    if (offset === 0) return "Ce trimestre"
    if (offset === -1) return "Trim. dernier"

    return `${startMonth.toLocaleDateString("fr-FR", { month: "short" })} - ${endMonth.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}`
  }

  // year
  const targetYear = now.getFullYear() + offset

  if (offset === 0) return "Cette année"
  if (offset === -1) return "Année dernière"

  return String(targetYear)
}

function formatDateHeader(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const isToday = date.toDateString() === today.toDateString()
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) return "Aujourd'hui"
  if (isYesterday) return "Hier"

  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}
