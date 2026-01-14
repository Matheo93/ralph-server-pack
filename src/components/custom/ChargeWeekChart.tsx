"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils/index"

interface DayLoad {
  date: string
  dayName: string
  loads: {
    userId: string
    userName: string
    load: number
  }[]
  totalLoad: number
}

interface ChargeWeekChartProps {
  data: DayLoad[]
  className?: string
}

const COLORS = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b"]

export function ChargeWeekChart({ data, className }: ChargeWeekChartProps) {
  const maxDayLoad = Math.max(...data.map((d) => d.totalLoad), 1)

  // Get unique users from the data
  const users = new Map<string, string>()
  for (const day of data) {
    for (const load of day.loads) {
      if (!users.has(load.userId)) {
        users.set(load.userId, load.userName)
      }
    }
  }
  const userList = Array.from(users.entries())

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Charge de la semaine</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4">
          {userList.map(([userId, userName], index) => (
            <div key={userId} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm text-muted-foreground">{userName}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="flex items-end gap-2 h-48">
          {data.map((day) => {
            const heightPercent = (day.totalLoad / maxDayLoad) * 100
            const isToday =
              new Date(day.date).toDateString() === new Date().toDateString()

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center"
              >
                {/* Stacked bar */}
                <div
                  className={cn(
                    "w-full relative rounded-t-sm overflow-hidden transition-all",
                    isToday && "ring-2 ring-primary ring-offset-2"
                  )}
                  style={{ height: `${heightPercent}%`, minHeight: "4px" }}
                >
                  {day.loads.map((load, index) => {
                    const loadPercent =
                      day.totalLoad > 0
                        ? (load.load / day.totalLoad) * 100
                        : 0
                    const userIndex = userList.findIndex(
                      ([uid]) => uid === load.userId
                    )
                    return (
                      <div
                        key={load.userId}
                        className="w-full"
                        style={{
                          height: `${loadPercent}%`,
                          backgroundColor:
                            COLORS[userIndex % COLORS.length] ||
                            COLORS[index % COLORS.length],
                        }}
                        title={`${load.userName}: ${load.load} points`}
                      />
                    )
                  })}
                </div>

                {/* Day label */}
                <div
                  className={cn(
                    "text-xs mt-2 text-center",
                    isToday
                      ? "font-bold text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {day.dayName}
                </div>

                {/* Load value */}
                <div className="text-xs text-muted-foreground">
                  {day.totalLoad}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total semaine</span>
            <span className="font-medium">
              {data.reduce((sum, d) => sum + d.totalLoad, 0)} points
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
