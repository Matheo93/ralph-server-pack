"use client"

import { memo } from "react"
import { TaskCard } from "./TaskCard"
import type { TaskListItem } from "@/types/task"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarClock, Calendar, ChevronRight, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface DashboardUnscheduledProps {
  tasks: TaskListItem[]
}

function DashboardUnscheduledInner({ tasks }: DashboardUnscheduledProps) {
  if (tasks.length === 0) {
    return null
  }

  return (
    <Card className="border-orange-300 bg-gradient-to-br from-orange-50/80 to-amber-50/50 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-orange-800 font-semibold">À planifier</span>
            <Badge variant="secondary" className="ml-1 bg-orange-200 text-orange-800 border-0 animate-pulse">
              {tasks.length}
            </Badge>
          </CardTitle>
          <Link href="/tasks?filter=unscheduled">
            <Button variant="default" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
              Planifier
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="flex items-start gap-2 mt-2 p-3 bg-orange-100/70 rounded-lg border border-orange-200/50">
          <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-orange-700">
            <p className="font-medium">
              {tasks.length === 1
                ? "Cette tâche n'a pas encore de date"
                : `Ces ${tasks.length} tâches n'ont pas encore de date`
              }
            </p>
            <p className="text-orange-600/80 mt-0.5">
              Ajoutez une date limite pour qu&apos;elles apparaissent dans votre planning et ne soient pas oubliées !
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.slice(0, 3).map((task) => (
          <TaskCard key={task.id} task={task} compact showScheduleHint />
        ))}
        {tasks.length > 3 && (
          <Link href="/tasks?filter=unscheduled" className="block">
            <Button variant="outline" className="w-full text-orange-700 border-orange-300 hover:bg-orange-100 font-medium">
              <Calendar className="w-4 h-4 mr-2" />
              Voir et planifier les {tasks.length - 3} autres tâches
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

export const DashboardUnscheduled = memo(DashboardUnscheduledInner)
