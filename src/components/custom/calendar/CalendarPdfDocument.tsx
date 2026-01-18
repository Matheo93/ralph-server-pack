"use client"

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, getDay } from "date-fns"
import { fr } from "date-fns/locale"
import type { CalendarEvent } from "@/lib/actions/calendar"

// Styles pour le PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "capitalize",
    color: "#1e3a5f",
  },
  subtitle: {
    fontSize: 10,
    textAlign: "center",
    color: "#6b7280",
    marginTop: 5,
  },
  weekDaysRow: {
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  weekDayCell: {
    width: "14.28%",
    padding: 8,
    alignItems: "center",
  },
  weekDayText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#ffffff",
  },
  calendarGrid: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  weekRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    minHeight: 70,
  },
  dayCell: {
    width: "14.28%",
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    padding: 4,
  },
  dayCellOtherMonth: {
    backgroundColor: "#f9fafb",
  },
  dayCellToday: {
    backgroundColor: "#eff6ff",
  },
  dayNumber: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 2,
  },
  dayNumberOtherMonth: {
    color: "#9ca3af",
  },
  dayNumberToday: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    borderRadius: 10,
    width: 16,
    height: 16,
    textAlign: "center",
    paddingTop: 2,
  },
  eventsContainer: {
    gap: 2,
  },
  eventItem: {
    padding: 2,
    borderRadius: 2,
    marginBottom: 1,
  },
  eventText: {
    fontSize: 6,
    color: "#ffffff",
    fontWeight: "bold",
  },
  eventTime: {
    fontSize: 5,
    color: "#ffffff",
    opacity: 0.9,
  },
  moreEvents: {
    fontSize: 5,
    color: "#6b7280",
    marginTop: 1,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
  legend: {
    marginTop: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendColor: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 8,
    color: "#6b7280",
  },
})

// Couleurs par type d'événement
const eventTypeColors: Record<string, string> = {
  appointment: "#3b82f6",
  birthday: "#ec4899",
  school: "#8b5cf6",
  activity: "#10b981",
  medical: "#ef4444",
  family: "#f59e0b",
  other: "#6b7280",
}

const eventTypeLabels: Record<string, string> = {
  appointment: "Rendez-vous",
  birthday: "Anniversaire",
  school: "École",
  activity: "Activité",
  medical: "Médical",
  family: "Famille",
  other: "Autre",
}

interface CalendarPdfDocumentProps {
  currentDate: Date
  events: CalendarEvent[]
}

export function CalendarPdfDocument({ currentDate, events }: CalendarPdfDocumentProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weeks: Date[][] = []

  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  // Organiser les événements par date
  const eventsByDate = new Map<string, CalendarEvent[]>()
  events.forEach(event => {
    const dateKey = format(new Date(event.start_date), "yyyy-MM-dd")
    const existing = eventsByDate.get(dateKey) || []
    eventsByDate.set(dateKey, [...existing, event])
  })

  // Trouver les types d'événements utilisés pour la légende
  const usedEventTypes = new Set<string>()
  events.forEach(event => usedEventTypes.add(event.event_type))

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
  const today = new Date()
  const todayStr = format(today, "yyyy-MM-dd")

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {format(currentDate, "MMMM yyyy", { locale: fr })}
          </Text>
          <Text style={styles.subtitle}>
            Calendrier familial - Généré le {format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </Text>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {/* Week days header */}
          <View style={styles.weekDaysRow}>
            {weekDays.map(day => (
              <View key={day} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Weeks */}
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((day, dayIndex) => {
                const dateKey = format(day, "yyyy-MM-dd")
                const dayEvents = eventsByDate.get(dateKey) || []
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isToday = dateKey === todayStr

                const dayCellStyles = [
                  styles.dayCell,
                  ...(!isCurrentMonth ? [styles.dayCellOtherMonth] : []),
                  ...(isToday ? [styles.dayCellToday] : []),
                ]

                const dayNumberStyles = [
                  styles.dayNumber,
                  ...(!isCurrentMonth ? [styles.dayNumberOtherMonth] : []),
                  ...(isToday ? [styles.dayNumberToday] : []),
                ]

                return (
                  <View key={dayIndex} style={dayCellStyles}>
                    <Text style={dayNumberStyles}>
                      {format(day, "d")}
                    </Text>

                    <View style={styles.eventsContainer}>
                      {dayEvents.slice(0, 3).map((event, eventIndex) => {
                        const eventColor = event.color || eventTypeColors[event.event_type] || eventTypeColors["other"]
                        return (
                          <View
                            key={eventIndex}
                            style={[styles.eventItem, { backgroundColor: eventColor }]}
                          >
                            <Text style={styles.eventText}>
                              {event.title.length > 15 ? `${event.title.substring(0, 15)}...` : event.title}
                            </Text>
                            {!event.all_day && (
                              <Text style={styles.eventTime}>
                                {format(new Date(event.start_date), "HH:mm")}
                              </Text>
                            )}
                          </View>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <Text style={styles.moreEvents}>
                          +{dayEvents.length - 3} autres
                        </Text>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          ))}
        </View>

        {/* Legend */}
        {usedEventTypes.size > 0 && (
          <View style={styles.legend}>
            {Array.from(usedEventTypes).map(type => {
              const legendColor = eventTypeColors[type] || eventTypeColors["other"]
              return (
                <View key={type} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: legendColor }]} />
                  <Text style={styles.legendText}>
                    {eventTypeLabels[type] || type}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>FamilyLoad - Calendrier familial</Text>
          <Text style={styles.footerText}>
            {events.length} événement{events.length > 1 ? "s" : ""} ce mois
          </Text>
        </View>
      </Page>
    </Document>
  )
}
