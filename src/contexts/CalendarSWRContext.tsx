"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useCalendarSWR, type CalendarSWRData } from "@/hooks/useCalendarSWR"

type CalendarSWRContextType = ReturnType<typeof useCalendarSWR> | null

const CalendarSWRContext = createContext<CalendarSWRContextType>(null)

interface CalendarSWRProviderProps {
  children: ReactNode
  initialData?: { date: Date; data: CalendarSWRData }
}

/**
 * Provider pour partager le contexte SWR calendrier entre les composants.
 * Permet aux sous-composants (ex: EventFormDialog) de déclencher une revalidation
 * après une mutation (création, modification, suppression d'événement).
 */
export function CalendarSWRProvider({ children, initialData }: CalendarSWRProviderProps) {
  const swr = useCalendarSWR(initialData)

  return (
    <CalendarSWRContext.Provider value={swr}>
      {children}
    </CalendarSWRContext.Provider>
  )
}

/**
 * Hook pour accéder au contexte SWR calendrier.
 * Permet de revalider les données après une mutation.
 *
 * @example
 * const { revalidate } = useCalendarSWRContext()
 * // Après création d'un événement
 * await createCalendarEvent(data)
 * revalidate(eventDate) // Revalide le mois de l'événement
 */
export function useCalendarSWRContext() {
  const context = useContext(CalendarSWRContext)

  if (!context) {
    throw new Error("useCalendarSWRContext must be used within a CalendarSWRProvider")
  }

  return context
}

/**
 * Hook optionnel qui retourne null si utilisé hors du provider.
 * Utile pour les composants qui peuvent être utilisés avec ou sans SWR.
 */
export function useCalendarSWRContextOptional() {
  return useContext(CalendarSWRContext)
}
