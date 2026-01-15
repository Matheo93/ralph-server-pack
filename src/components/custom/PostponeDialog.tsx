"use client"

import { useState, useTransition, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { postponeTask } from "@/lib/actions/tasks"
import { modalBackdrop, modalContent } from "@/lib/animations"

interface PostponeDialogProps {
  taskId: string | null
  onClose: () => void
}

export function PostponeDialog({ taskId, onClose }: PostponeDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isPending, startTransition] = useTransition()

  if (!taskId) return null

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const handleConfirm = () => {
    if (!selectedDate) return

    startTransition(async () => {
      await postponeTask(taskId, selectedDate.toISOString())
      onClose()
    })
  }

  const quickDates = [
    { label: "Demain", date: tomorrow },
    {
      label: "Dans 3 jours",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      label: "Semaine prochaine",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reporter la tâche</CardTitle>
          <CardDescription>
            Choisissez une nouvelle date pour cette tâche
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {quickDates.map(({ label, date }) => (
              <Button
                key={label}
                variant={
                  selectedDate?.toDateString() === date.toDateString()
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => setSelectedDate(date)}
              >
                {label}
              </Button>
            ))}
          </div>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={(date) => date < tomorrow}
            className="rounded-md border mx-auto"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedDate || isPending}
            >
              {isPending ? "..." : "Confirmer"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
