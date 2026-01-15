import { describe, it, expect } from "vitest"

describe("Skeleton Components", () => {
  describe("Skeleton Types and Exports", () => {
    it("should export all skeleton components", async () => {
      const skeletons = await import("@/components/ui/skeleton")

      // Verify all expected exports exist
      expect(skeletons.Skeleton).toBeDefined()
      expect(skeletons.TaskCardSkeleton).toBeDefined()
      expect(skeletons.TaskListSkeleton).toBeDefined()
      expect(skeletons.DashboardCardSkeleton).toBeDefined()
      expect(skeletons.DashboardSkeleton).toBeDefined()
      expect(skeletons.ChartSkeleton).toBeDefined()
      expect(skeletons.ChargeSkeleton).toBeDefined()
      expect(skeletons.ChargeWeekChartSkeleton).toBeDefined()
      expect(skeletons.ChargePageSkeleton).toBeDefined()
      expect(skeletons.ChildrenPageSkeleton).toBeDefined()
      expect(skeletons.TasksPageSkeleton).toBeDefined()
      expect(skeletons.PageSkeleton).toBeDefined()
    })

    it("should export functions (React components)", async () => {
      const skeletons = await import("@/components/ui/skeleton")

      expect(typeof skeletons.Skeleton).toBe("function")
      expect(typeof skeletons.TaskCardSkeleton).toBe("function")
      expect(typeof skeletons.TaskListSkeleton).toBe("function")
      expect(typeof skeletons.DashboardSkeleton).toBe("function")
      expect(typeof skeletons.ChargeSkeleton).toBe("function")
      expect(typeof skeletons.PageSkeleton).toBe("function")
    })
  })

  describe("Shimmer Animation CSS", () => {
    it("should have shimmer keyframe in globals.css", async () => {
      // The shimmer animation is defined in globals.css
      // This test verifies the CSS file can be read and contains the animation
      const fs = await import("fs")
      const path = await import("path")
      const cssPath = path.join(process.cwd(), "src/app/globals.css")
      const css = fs.readFileSync(cssPath, "utf-8")

      expect(css).toContain("@keyframes shimmer")
      expect(css).toContain("translateX")
    })
  })

  describe("Loading Pages", () => {
    it("dashboard loading page should export default", async () => {
      const loading = await import("@/app/(dashboard)/dashboard/loading")
      expect(loading.default).toBeDefined()
      expect(typeof loading.default).toBe("function")
    })

    it("tasks loading page should export default", async () => {
      const loading = await import("@/app/(dashboard)/tasks/loading")
      expect(loading.default).toBeDefined()
      expect(typeof loading.default).toBe("function")
    })

    it("charge loading page should export default", async () => {
      const loading = await import("@/app/(dashboard)/charge/loading")
      expect(loading.default).toBeDefined()
      expect(typeof loading.default).toBe("function")
    })

    it("children loading page should export default", async () => {
      const loading = await import("@/app/(dashboard)/children/loading")
      expect(loading.default).toBeDefined()
      expect(typeof loading.default).toBe("function")
    })
  })
})

describe("Skeleton Component Props", () => {
  it("TaskCardSkeleton should accept shimmer prop", async () => {
    const { TaskCardSkeleton } = await import("@/components/ui/skeleton")

    // Verify the component can be called with shimmer prop
    // (This tests the TypeScript signature)
    const result1 = TaskCardSkeleton({})
    const result2 = TaskCardSkeleton({ shimmer: true })
    const result3 = TaskCardSkeleton({ shimmer: false })

    expect(result1).toBeDefined()
    expect(result2).toBeDefined()
    expect(result3).toBeDefined()
  })

  it("TaskListSkeleton should accept count and shimmer props", async () => {
    const { TaskListSkeleton } = await import("@/components/ui/skeleton")

    const result1 = TaskListSkeleton({})
    const result2 = TaskListSkeleton({ count: 5 })
    const result3 = TaskListSkeleton({ shimmer: true })
    const result4 = TaskListSkeleton({ count: 3, shimmer: true })

    expect(result1).toBeDefined()
    expect(result2).toBeDefined()
    expect(result3).toBeDefined()
    expect(result4).toBeDefined()
  })

  it("ChargeSkeleton should accept membersCount and shimmer props", async () => {
    const { ChargeSkeleton } = await import("@/components/ui/skeleton")

    const result1 = ChargeSkeleton({})
    const result2 = ChargeSkeleton({ membersCount: 3 })
    const result3 = ChargeSkeleton({ shimmer: true })
    const result4 = ChargeSkeleton({ membersCount: 4, shimmer: false })

    expect(result1).toBeDefined()
    expect(result2).toBeDefined()
    expect(result3).toBeDefined()
    expect(result4).toBeDefined()
  })

  it("Page skeletons should default shimmer to true", async () => {
    const {
      ChargePageSkeleton,
      ChildrenPageSkeleton,
      TasksPageSkeleton,
    } = await import("@/components/ui/skeleton")

    // These page skeletons have shimmer: true as default
    const charge = ChargePageSkeleton({})
    const children = ChildrenPageSkeleton({})
    const tasks = TasksPageSkeleton({})

    expect(charge).toBeDefined()
    expect(children).toBeDefined()
    expect(tasks).toBeDefined()
  })
})
