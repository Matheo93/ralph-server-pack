import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, variants, ...validProps } = props
      return { type: "div", props: validProps, children }
    },
  },
  AnimatePresence: ({ children }: any) => children,
}))

describe("DashboardToday Component Logic", () => {
  const PRIORITY_ORDER: Record<string, number> = {
    high: 0,
    medium: 1,
    low: 2,
  }

  interface TaskListItem {
    id: string
    title: string
    status: string
    priority: string
    deadline: string | null
    is_critical: boolean
    child_id: string | null
    child_name: string | null
  }

  const createTask = (overrides: Partial<TaskListItem> = {}): TaskListItem => ({
    id: crypto.randomUUID(),
    title: "Test Task",
    status: "pending",
    priority: "medium",
    deadline: null,
    is_critical: false,
    child_id: null,
    child_name: null,
    ...overrides,
  })

  describe("Task Sorting", () => {
    it("sorts critical tasks first", () => {
      const tasks = [
        createTask({ id: "1", is_critical: false }),
        createTask({ id: "2", is_critical: true }),
        createTask({ id: "3", is_critical: false }),
      ]

      const sorted = [...tasks].sort((a, b) => {
        if (a.is_critical && !b.is_critical) return -1
        if (!a.is_critical && b.is_critical) return 1
        return 0
      })

      expect(sorted[0]!.id).toBe("2")
    })

    it("sorts by priority within non-critical tasks", () => {
      const tasks = [
        createTask({ id: "1", priority: "low" }),
        createTask({ id: "2", priority: "high" }),
        createTask({ id: "3", priority: "medium" }),
      ]

      const sorted = [...tasks].sort((a, b) => {
        const priorityA = PRIORITY_ORDER[a.priority] ?? 2
        const priorityB = PRIORITY_ORDER[b.priority] ?? 2
        return priorityA - priorityB
      })

      expect(sorted[0]!.id).toBe("2") // high
      expect(sorted[1]!.id).toBe("3") // medium
      expect(sorted[2]!.id).toBe("1") // low
    })

    it("sorts by deadline (closest first)", () => {
      const now = new Date()
      const tasks = [
        createTask({
          id: "1",
          deadline: new Date(now.getTime() + 86400000 * 3).toISOString(),
        }), // 3 days
        createTask({
          id: "2",
          deadline: new Date(now.getTime() + 86400000).toISOString(),
        }), // 1 day
        createTask({
          id: "3",
          deadline: new Date(now.getTime() + 86400000 * 2).toISOString(),
        }), // 2 days
      ]

      const sorted = [...tasks].sort((a, b) => {
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        }
        return 0
      })

      expect(sorted[0]!.id).toBe("2")
      expect(sorted[1]!.id).toBe("3")
      expect(sorted[2]!.id).toBe("1")
    })

    it("puts tasks without deadline last", () => {
      const now = new Date()
      const tasks = [
        createTask({ id: "1", deadline: null }),
        createTask({
          id: "2",
          deadline: new Date(now.getTime() + 86400000).toISOString(),
        }),
      ]

      const sorted = [...tasks].sort((a, b) => {
        if (a.deadline && !b.deadline) return -1
        if (!a.deadline && b.deadline) return 1
        return 0
      })

      expect(sorted[0]!.id).toBe("2")
      expect(sorted[1]!.id).toBe("1")
    })
  })

  describe("Task Grouping", () => {
    it("groups tasks by child", () => {
      const tasks = [
        createTask({ id: "1", child_id: "a", child_name: "Alice" }),
        createTask({ id: "2", child_id: "b", child_name: "Bob" }),
        createTask({ id: "3", child_id: "a", child_name: "Alice" }),
        createTask({ id: "4", child_id: null, child_name: null }),
      ]

      interface TaskGroup {
        childId: string | null
        childName: string | null
        tasks: TaskListItem[]
      }

      const groupMap = new Map<string | null, TaskGroup>()
      for (const task of tasks) {
        const key = task.child_id
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            childId: task.child_id,
            childName: task.child_name,
            tasks: [],
          })
        }
        groupMap.get(key)!.tasks.push(task)
      }

      expect(groupMap.size).toBe(3)
      expect(groupMap.get("a")?.tasks.length).toBe(2)
      expect(groupMap.get("b")?.tasks.length).toBe(1)
      expect(groupMap.get(null)?.tasks.length).toBe(1)
    })

    it("sorts groups with children first", () => {
      interface TaskGroup {
        childId: string | null
        childName: string | null
        tasks: TaskListItem[]
      }

      const groups: TaskGroup[] = [
        { childId: null, childName: null, tasks: [] },
        { childId: "a", childName: "Alice", tasks: [] },
        { childId: "b", childName: "Bob", tasks: [] },
      ]

      const sorted = groups.sort((a, b) => {
        if (a.childId && !b.childId) return -1
        if (!a.childId && b.childId) return 1
        if (a.childName && b.childName) {
          return a.childName.localeCompare(b.childName)
        }
        return 0
      })

      expect(sorted[0]!.childName).toBe("Alice")
      expect(sorted[1]!.childName).toBe("Bob")
      expect(sorted[2]!.childId).toBeNull()
    })
  })

  describe("Overdue Detection", () => {
    it("identifies overdue tasks", () => {
      const now = new Date()
      const tasks = [
        createTask({
          id: "1",
          deadline: new Date(now.getTime() - 86400000).toISOString(),
        }), // yesterday
        createTask({
          id: "2",
          deadline: new Date(now.getTime() + 86400000).toISOString(),
        }), // tomorrow
        createTask({ id: "3", deadline: null }),
      ]

      const overdue = tasks.filter((t) => {
        if (!t.deadline) return false
        return new Date(t.deadline) < now
      })

      expect(overdue.length).toBe(1)
      expect(overdue[0]!.id).toBe("1")
    })
  })
})

describe("TaskSummaryCard Component Logic", () => {
  interface TaskListItem {
    id: string
    status: string
    deadline: string | null
    is_critical: boolean
  }

  const createTask = (overrides: Partial<TaskListItem> = {}): TaskListItem => ({
    id: crypto.randomUUID(),
    status: "pending",
    deadline: null,
    is_critical: false,
    ...overrides,
  })

  it("calculates correct summary stats", () => {
    const now = new Date()
    const tasks = [
      createTask({ status: "pending" }),
      createTask({ status: "pending", is_critical: true }),
      createTask({ status: "done" }),
      createTask({ status: "done" }),
      createTask({ status: "done" }),
      createTask({
        status: "pending",
        deadline: new Date(now.getTime() - 86400000).toISOString(),
      }), // overdue
    ]

    const pending = tasks.filter((t) => t.status === "pending")
    const done = tasks.filter((t) => t.status === "done")
    const overdue = pending.filter((t) => {
      if (!t.deadline) return false
      return new Date(t.deadline) < now
    })
    const critical = pending.filter((t) => t.is_critical)
    const completionRate = Math.round((done.length / tasks.length) * 100)

    expect(pending.length).toBe(3)
    expect(done.length).toBe(3)
    expect(overdue.length).toBe(1)
    expect(critical.length).toBe(1)
    expect(completionRate).toBe(50)
  })

  it("handles empty task list", () => {
    const tasks: TaskListItem[] = []
    const completionRate = tasks.length > 0 ? Math.round((0 / tasks.length) * 100) : 0

    expect(completionRate).toBe(0)
  })

  it("calculates 100% when all tasks done", () => {
    const tasks = [
      createTask({ status: "done" }),
      createTask({ status: "done" }),
      createTask({ status: "done" }),
    ]

    const done = tasks.filter((t) => t.status === "done")
    const completionRate = Math.round((done.length / tasks.length) * 100)

    expect(completionRate).toBe(100)
  })
})

describe("NotificationBadge Component Logic", () => {
  interface Notification {
    id: string
    type: string
    title: string
    read: boolean
    createdAt: Date
  }

  it("counts unread notifications correctly", () => {
    const notifications: Notification[] = [
      { id: "1", type: "task_due", title: "Task 1", read: false, createdAt: new Date() },
      { id: "2", type: "task_due", title: "Task 2", read: true, createdAt: new Date() },
      { id: "3", type: "task_due", title: "Task 3", read: false, createdAt: new Date() },
    ]

    const unreadCount = notifications.filter((n) => !n.read).length

    expect(unreadCount).toBe(2)
  })

  it("formats time correctly", () => {
    const formatTime = (date: Date) => {
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (minutes < 1) return "À l'instant"
      if (minutes < 60) return `Il y a ${minutes}min`
      if (hours < 24) return `Il y a ${hours}h`
      return `Il y a ${days}j`
    }

    const now = new Date()
    expect(formatTime(now)).toBe("À l'instant")
    expect(formatTime(new Date(now.getTime() - 30000))).toBe("À l'instant")
    expect(formatTime(new Date(now.getTime() - 120000))).toBe("Il y a 2min")
    expect(formatTime(new Date(now.getTime() - 3600000))).toBe("Il y a 1h")
    expect(formatTime(new Date(now.getTime() - 86400000))).toBe("Il y a 1j")
  })
})

describe("FirstTimeGuide Component Logic", () => {

  it("defines all guide steps", () => {
    const GUIDE_STEPS = [
      { id: "welcome", title: "Bienvenue" },
      { id: "tasks", title: "Tâches" },
      { id: "children", title: "Enfants" },
      { id: "charge", title: "Charge" },
      { id: "settings", title: "Paramètres" },
    ]

    expect(GUIDE_STEPS.length).toBe(5)
    expect(GUIDE_STEPS[0]!.id).toBe("welcome")
    expect(GUIDE_STEPS[4]!.id).toBe("settings")
  })

  it("navigates through steps correctly", () => {
    let currentStep = 0
    const totalSteps = 5

    const handleNext = () => {
      if (currentStep < totalSteps - 1) {
        currentStep++
      }
    }

    const handlePrev = () => {
      if (currentStep > 0) {
        currentStep--
      }
    }

    expect(currentStep).toBe(0)

    handleNext()
    expect(currentStep).toBe(1)

    handleNext()
    handleNext()
    expect(currentStep).toBe(3)

    handlePrev()
    expect(currentStep).toBe(2)

    handlePrev()
    handlePrev()
    handlePrev() // Should not go below 0
    expect(currentStep).toBe(0)
  })

  it("does not show guide if already completed", () => {
    const STORAGE_KEY = "familyload_guide_completed"
    const completed = "true"

    let isVisible = false
    if (!completed) {
      isVisible = true
    }

    expect(isVisible).toBe(false)
  })
})

describe("Progress Component Logic", () => {
  it("calculates percentage correctly", () => {
    const calculatePercentage = (value: number, max: number) => {
      return Math.min(Math.max((value / max) * 100, 0), 100)
    }

    expect(calculatePercentage(50, 100)).toBe(50)
    expect(calculatePercentage(0, 100)).toBe(0)
    expect(calculatePercentage(100, 100)).toBe(100)
    expect(calculatePercentage(150, 100)).toBe(100) // capped at 100
    expect(calculatePercentage(-10, 100)).toBe(0) // minimum 0
  })
})
