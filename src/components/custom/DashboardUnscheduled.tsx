"use client"

import { memo } from "react"
import { TaskCard } from "./TaskCard"
import type { TaskListItem } from "@/types/task"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarX, Plus } from "lucide-react"
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
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarX className="w-5 h-5 text-purple-600" />
            A planifier
            <Badge variant="secondary" className="ml-1">
              {tasks.length}
            </Badge>
          </CardTitle>
          <Link href="/tasks?status=pending">
            <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700">
              Voir tout
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Taches sans date limite - pensez a les planifier
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.slice(0, 5).map((task) => (
          <TaskCard key={task.id} task={task} compact />
        ))}
        {tasks.length > 5 && (
          <Link href="/tasks?status=pending" className="block">
            <Button variant="outline" className="w-full text-purple-600 border-purple-200 hover:bg-purple-50">
              <Plus className="w-4 h-4 mr-2" />
              Voir {tasks.length - 5} autres taches
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}

export const DashboardUnscheduled = memo(DashboardUnscheduledInner)
