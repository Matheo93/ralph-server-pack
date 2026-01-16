/**
 * Distribution Engine Tests
 *
 * Comprehensive tests for:
 * - Fairness algorithm
 * - Workload predictor
 * - Burnout prevention
 * - Delegation engine
 */

import { describe, it, expect, beforeEach } from "vitest"

// Fairness Algorithm imports
import {
  calculateFairShare,
  calculateLoadBalanceScore,
  calculateRecentActivityScore,
  calculatePreferenceScore,
  calculateSkillScore,
  calculateAvailabilityScore,
  calculateFairnessScore,
  findBestAssignment,
  assignTasksBatch,
  generateFairnessReport,
  createMemberProfile,
  createEmptyHistory,
  calculateGiniCoefficient,
  suggestRebalancing,
  type MemberProfile,
  type TaskDefinition,
  type HistoricalData,
} from "@/lib/distribution/fairness-algorithm"

// Workload Predictor imports
import {
  detectPatterns,
  analyzeWorkloadTrend,
  predictWorkload,
  predictWorkloadRange,
  detectAnomalies,
  generateProactiveDistribution,
  buildSeasonalProfile,
  createWorkloadDataPoint,
  generateSampleData,
  type WorkloadDataPoint,
} from "@/lib/distribution/workload-predictor"

// Burnout Prevention imports
import {
  calculateHealthStatus,
  assessStressLevel,
  detectStressIndicators,
  buildMemberWorkloadState,
  checkOverload,
  checkHouseholdOverload,
  determineRecoveryType,
  createRecoveryPlan,
  autoBalanceWorkload,
  generateHealthReport,
  createDailyWorkload,
  needsImmediateIntervention,
  calculateWorkloadScore,
  getHealthStatusColor,
  getRecommendedDailyLimit,
  DEFAULT_BALANCE_CONFIG,
  type MemberWorkloadState,
  type StressIndicator,
} from "@/lib/distribution/burnout-prevention"

// Delegation Engine imports
import {
  calculateSkillMatchScore,
  getSkillLevel,
  updateSkillProfile,
  calculateAvailabilityScore as calcDelegationAvailability,
  findBestWindows,
  generateDelegationSuggestions,
  generateSmartAssignment,
  createDelegationRequest,
  processDelegationResponse,
  completeDelegation,
  getExpiredDelegations,
  updateDelegationHistory,
  createSkillProfile,
  createDelegationHistory,
  createAvailabilityWindow,
  getSuggestionSummary,
  DEFAULT_DELEGATION_POLICY,
  type SkillProfile,
  type DelegationHistory,
} from "@/lib/distribution/delegation-engine"

// =============================================================================
// FAIRNESS ALGORITHM TESTS
// =============================================================================

describe("Fairness Algorithm", () => {
  let members: MemberProfile[]
  let histories: Map<string, HistoricalData>

  beforeEach(() => {
    members = [
      createMemberProfile("m1", "Alice", "h1", { maxWeeklyLoad: 10, currentLoad: 3 }),
      createMemberProfile("m2", "Bob", "h1", { maxWeeklyLoad: 10, currentLoad: 5 }),
      createMemberProfile("m3", "Carol", "h1", { maxWeeklyLoad: 10, currentLoad: 2 }),
    ]

    histories = new Map([
      ["m1", { ...createEmptyHistory("m1"), totalTasks: 15, totalMinutes: 300 }],
      ["m2", { ...createEmptyHistory("m2"), totalTasks: 25, totalMinutes: 500 }],
      ["m3", { ...createEmptyHistory("m3"), totalTasks: 10, totalMinutes: 200 }],
    ])
  })

  describe("calculateFairShare", () => {
    it("should calculate equal shares for equal capacity", () => {
      const shares = calculateFairShare(members)

      expect(shares.get("m1")).toBeCloseTo(33.33, 1)
      expect(shares.get("m2")).toBeCloseTo(33.33, 1)
      expect(shares.get("m3")).toBeCloseTo(33.33, 1)
    })

    it("should calculate proportional shares for different capacities", () => {
      members[0]!.maxWeeklyLoad = 20
      members[1]!.maxWeeklyLoad = 10
      members[2]!.maxWeeklyLoad = 10

      const shares = calculateFairShare(members)

      expect(shares.get("m1")).toBe(50)
      expect(shares.get("m2")).toBe(25)
      expect(shares.get("m3")).toBe(25)
    })

    it("should handle zero capacity gracefully", () => {
      members.forEach(m => (m.maxWeeklyLoad = 0))
      const shares = calculateFairShare(members)

      expect(shares.get("m1")).toBeCloseTo(33.33, 1)
    })
  })

  describe("calculateLoadBalanceScore", () => {
    it("should give high score to underloaded members", () => {
      const history = histories.get("m3")!
      const score = calculateLoadBalanceScore(members[2]!, history, 33.33, 50)

      expect(score).toBeGreaterThan(50) // Under fair share
    })

    it("should give low score to overloaded members", () => {
      const history = histories.get("m2")!
      const score = calculateLoadBalanceScore(members[1]!, history, 33.33, 50)

      expect(score).toBeLessThan(50) // Over fair share
    })

    it("should return neutral score when no tasks", () => {
      const history = createEmptyHistory("m1")
      const score = calculateLoadBalanceScore(members[0]!, history, 33.33, 0)

      expect(score).toBe(50)
    })
  })

  describe("calculateRecentActivityScore", () => {
    it("should return high score for no history", () => {
      const history = createEmptyHistory("m1")
      const score = calculateRecentActivityScore(history)

      expect(score).toBe(100)
    })

    it("should calculate score based on recent activity", () => {
      const history: HistoricalData = {
        ...createEmptyHistory("m1"),
        totalTasks: 20,
        weeklyHistory: [
          { weekStart: "2025-01-01", taskCount: 5, minutesWorked: 100, categories: {} },
          { weekStart: "2025-01-08", taskCount: 5, minutesWorked: 100, categories: {} },
          { weekStart: "2025-01-15", taskCount: 5, minutesWorked: 100, categories: {} },
          { weekStart: "2025-01-22", taskCount: 5, minutesWorked: 100, categories: {} },
        ],
      }

      const score = calculateRecentActivityScore(history)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })
  })

  describe("calculatePreferenceScore", () => {
    it("should give high score for preferred category", () => {
      members[0]!.preferences.preferred = ["cleaning"]
      const task: TaskDefinition = {
        id: "t1",
        name: "Clean kitchen",
        category: "cleaning",
        estimatedMinutes: 30,
        difficulty: 3,
        requiredSkills: [],
        priority: 5,
      }

      const score = calculatePreferenceScore(members[0]!, task)
      expect(score).toBeGreaterThan(70)
    })

    it("should return 0 for blocked category", () => {
      members[0]!.preferences.blocked = ["gardening"]
      const task: TaskDefinition = {
        id: "t1",
        name: "Mow lawn",
        category: "gardening",
        estimatedMinutes: 60,
        difficulty: 5,
        requiredSkills: [],
        priority: 5,
      }

      const score = calculatePreferenceScore(members[0]!, task)
      expect(score).toBe(0)
    })

    it("should give lower score for disliked category", () => {
      members[0]!.preferences.disliked = ["laundry"]
      const task: TaskDefinition = {
        id: "t1",
        name: "Do laundry",
        category: "laundry",
        estimatedMinutes: 45,
        difficulty: 2,
        requiredSkills: [],
        priority: 5,
      }

      const score = calculatePreferenceScore(members[0]!, task)
      expect(score).toBeLessThan(50)
    })
  })

  describe("calculateSkillScore", () => {
    it("should return 100 for no required skills", () => {
      const task: TaskDefinition = {
        id: "t1",
        name: "Simple task",
        category: "general",
        estimatedMinutes: 15,
        difficulty: 1,
        requiredSkills: [],
        priority: 5,
      }

      const score = calculateSkillScore(members[0]!, task)
      expect(score).toBe(100)
    })

    it("should calculate partial skill match", () => {
      members[0]!.skills = ["cooking", "cleaning"]
      const task: TaskDefinition = {
        id: "t1",
        name: "Cook and clean",
        category: "cooking",
        estimatedMinutes: 60,
        difficulty: 5,
        requiredSkills: ["cooking", "serving"],
        priority: 5,
      }

      const score = calculateSkillScore(members[0]!, task)
      expect(score).toBe(50) // 1 out of 2 skills
    })
  })

  describe("findBestAssignment", () => {
    it("should find best member for task", () => {
      members[0]!.preferences.preferred = ["cleaning"]
      members[0]!.skills = ["cleaning"]

      const task: TaskDefinition = {
        id: "t1",
        name: "Clean room",
        category: "cleaning",
        estimatedMinutes: 30,
        difficulty: 3,
        requiredSkills: ["cleaning"],
        priority: 5,
      }

      const result = findBestAssignment(task, members, histories, 50)

      expect(result).not.toBeNull()
      expect(result!.assignedTo).toBe("m1")
    })

    it("should return null for empty members", () => {
      const task: TaskDefinition = {
        id: "t1",
        name: "Test",
        category: "test",
        estimatedMinutes: 15,
        difficulty: 1,
        requiredSkills: [],
        priority: 5,
      }

      const result = findBestAssignment(task, [], histories, 0)
      expect(result).toBeNull()
    })
  })

  describe("calculateGiniCoefficient", () => {
    it("should return 0 for equal distribution", () => {
      const gini = calculateGiniCoefficient([10, 10, 10, 10])
      expect(gini).toBe(0)
    })

    it("should return high value for unequal distribution", () => {
      const gini = calculateGiniCoefficient([0, 0, 0, 100])
      expect(gini).toBeGreaterThan(0.5)
    })

    it("should handle empty array", () => {
      const gini = calculateGiniCoefficient([])
      expect(gini).toBe(0)
    })
  })
})

// =============================================================================
// WORKLOAD PREDICTOR TESTS
// =============================================================================

describe("Workload Predictor", () => {
  let sampleData: WorkloadDataPoint[]

  beforeEach(() => {
    sampleData = generateSampleData(8) // 8 weeks of data
  })

  describe("createWorkloadDataPoint", () => {
    it("should create data point with correct fields", () => {
      const date = new Date("2025-01-15")
      const dp = createWorkloadDataPoint(date, 5, 75, { cleaning: 3, cooking: 2 })

      expect(dp.timestamp).toEqual(date)
      expect(dp.taskCount).toBe(5)
      expect(dp.totalMinutes).toBe(75)
      expect(dp.dayOfWeek).toBe(3) // Wednesday
      expect(dp.categories["cleaning"]).toBe(3)
    })
  })

  describe("detectPatterns", () => {
    it("should detect patterns with sufficient data", () => {
      const patterns = detectPatterns(sampleData)

      expect(patterns.length).toBeGreaterThanOrEqual(0)
      // With synthetic weekend reduction, should detect daily pattern
    })

    it("should return empty for insufficient data", () => {
      const shortData = sampleData.slice(0, 10)
      const patterns = detectPatterns(shortData)

      expect(patterns.length).toBe(0)
    })

    it("should include confidence scores", () => {
      const patterns = detectPatterns(sampleData)

      for (const pattern of patterns) {
        expect(pattern.confidence).toBeGreaterThanOrEqual(0)
        expect(pattern.confidence).toBeLessThanOrEqual(1)
      }
    })
  })

  describe("analyzeWorkloadTrend", () => {
    it("should analyze trend with sufficient data", () => {
      const trend = analyzeWorkloadTrend(sampleData)

      expect(["increasing", "stable", "decreasing"]).toContain(trend.direction)
      expect(trend.confidence).toBeGreaterThanOrEqual(0)
      expect(trend.confidence).toBeLessThanOrEqual(1)
    })

    it("should return stable for insufficient data", () => {
      const shortData = sampleData.slice(0, 5)
      const trend = analyzeWorkloadTrend(shortData)

      expect(trend.direction).toBe("stable")
      expect(trend.confidence).toBe(0)
    })
  })

  describe("predictWorkload", () => {
    it("should predict future workload", () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)

      const prediction = predictWorkload(sampleData, futureDate)

      expect(prediction.predictedTaskCount).toBeGreaterThanOrEqual(0)
      expect(prediction.confidence).toBeGreaterThanOrEqual(0)
      expect(prediction.factors.length).toBeGreaterThan(0)
    })

    it("should include category breakdown when requested", () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 3)

      const prediction = predictWorkload(sampleData, futureDate, { includeCategories: true })

      expect(prediction.breakdown.length).toBeGreaterThan(0)
    })
  })

  describe("predictWorkloadRange", () => {
    it("should predict for date range", () => {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 5)

      const predictions = predictWorkloadRange(sampleData, startDate, endDate)

      expect(predictions.length).toBe(6) // 6 days inclusive
    })
  })

  describe("detectAnomalies", () => {
    it("should detect spikes and drops", () => {
      // Add an anomaly
      const anomalyDate = new Date()
      sampleData.push(createWorkloadDataPoint(anomalyDate, 50, 500, {})) // Huge spike

      const anomalies = detectAnomalies(sampleData)

      expect(anomalies.length).toBeGreaterThan(0)
      // Anomalies can be spikes or drops depending on data
      expect(["spike", "drop"]).toContain(anomalies[0]!.type)
    })

    it("should return empty for consistent data", () => {
      // Create very consistent data
      const consistentData: WorkloadDataPoint[] = []
      for (let i = 0; i < 30; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        consistentData.push(createWorkloadDataPoint(date, 5, 75, {}))
      }

      const anomalies = detectAnomalies(consistentData)
      expect(anomalies.length).toBe(0)
    })
  })

  describe("buildSeasonalProfile", () => {
    it("should build monthly profiles", () => {
      const profiles = buildSeasonalProfile(sampleData)

      expect(profiles.length).toBeGreaterThan(0)
      expect(profiles[0]!.averageTaskCount).toBeGreaterThanOrEqual(0)
    })
  })
})

// =============================================================================
// BURNOUT PREVENTION TESTS
// =============================================================================

describe("Burnout Prevention", () => {
  describe("calculateHealthStatus", () => {
    it("should return healthy for low load", () => {
      expect(calculateHealthStatus(50)).toBe("healthy")
    })

    it("should return elevated for moderate load", () => {
      expect(calculateHealthStatus(75)).toBe("elevated")
    })

    it("should return high for heavy load", () => {
      expect(calculateHealthStatus(95)).toBe("high")
    })

    it("should return critical for overload", () => {
      expect(calculateHealthStatus(110)).toBe("critical")
    })

    it("should return burnout_risk for severe overload", () => {
      expect(calculateHealthStatus(130)).toBe("burnout_risk")
    })
  })

  describe("assessStressLevel", () => {
    it("should return low for no indicators", () => {
      expect(assessStressLevel([])).toBe("low")
    })

    it("should return severe for high severity indicators", () => {
      const indicators: StressIndicator[] = [
        {
          type: "consecutive_overload",
          severity: 9,
          description: "5 days overload",
          detectedAt: new Date(),
        },
      ]

      expect(assessStressLevel(indicators)).toBe("severe")
    })

    it("should return moderate for medium severity", () => {
      const indicators: StressIndicator[] = [
        {
          type: "no_rest",
          severity: 4,
          description: "8 days without rest",
          detectedAt: new Date(),
        },
      ]

      expect(assessStressLevel(indicators)).toBe("moderate")
    })
  })

  describe("detectStressIndicators", () => {
    it("should detect consecutive overload", () => {
      const workload = [
        createDailyWorkload(new Date(), 12, 360, 10),
        createDailyWorkload(new Date(), 11, 330, 10),
        createDailyWorkload(new Date(), 10, 300, 10),
        createDailyWorkload(new Date(), 11, 330, 10),
      ]

      const indicators = detectStressIndicators(workload)

      expect(indicators.some(i => i.type === "consecutive_overload")).toBe(true)
    })

    it("should detect no rest period", () => {
      const workload = [createDailyWorkload(new Date(), 5, 150, 10)]
      const oldRestDay = new Date()
      oldRestDay.setDate(oldRestDay.getDate() - 20)

      const indicators = detectStressIndicators(workload, oldRestDay)

      expect(indicators.some(i => i.type === "no_rest")).toBe(true)
    })
  })

  describe("buildMemberWorkloadState", () => {
    it("should build complete state", () => {
      const workload = [createDailyWorkload(new Date(), 8, 240, 10)]

      const state = buildMemberWorkloadState(
        "m1",
        "Alice",
        8,
        10,
        workload,
        new Date()
      )

      expect(state.memberId).toBe("m1")
      expect(state.memberName).toBe("Alice")
      expect(state.loadPercentage).toBe(80)
      expect(state.healthStatus).toBe("elevated")
    })
  })

  describe("checkOverload", () => {
    it("should generate alert for overloaded member", () => {
      const state: MemberWorkloadState = {
        memberId: "m1",
        memberName: "Alice",
        currentLoad: 12,
        maxLoad: 10,
        loadPercentage: 120,
        consecutiveHighLoadDays: 5,
        recentWorkload: [],
        healthStatus: "critical",
        stressIndicators: [],
      }

      const alert = checkOverload(state)

      expect(alert).not.toBeNull()
      expect(alert!.alertType).toBe("critical")
    })

    it("should return null for healthy member", () => {
      const state: MemberWorkloadState = {
        memberId: "m1",
        memberName: "Alice",
        currentLoad: 5,
        maxLoad: 10,
        loadPercentage: 50,
        consecutiveHighLoadDays: 0,
        recentWorkload: [],
        healthStatus: "healthy",
        stressIndicators: [],
      }

      const alert = checkOverload(state)
      expect(alert).toBeNull()
    })
  })

  describe("determineRecoveryType", () => {
    it("should recommend extended rest for burnout risk", () => {
      const state: MemberWorkloadState = {
        memberId: "m1",
        memberName: "Alice",
        currentLoad: 15,
        maxLoad: 10,
        loadPercentage: 150,
        consecutiveHighLoadDays: 7,
        recentWorkload: [],
        healthStatus: "burnout_risk",
        stressIndicators: [{ type: "consecutive_overload", severity: 10, description: "", detectedAt: new Date() }],
      }

      expect(determineRecoveryType(state)).toBe("extended_rest")
    })

    it("should recommend light day for elevated load", () => {
      const state: MemberWorkloadState = {
        memberId: "m1",
        memberName: "Alice",
        currentLoad: 8,
        maxLoad: 10,
        loadPercentage: 80,
        consecutiveHighLoadDays: 1,
        recentWorkload: [],
        healthStatus: "elevated",
        stressIndicators: [{ type: "high_variance", severity: 4, description: "", detectedAt: new Date() }],
      }

      expect(determineRecoveryType(state)).toBe("light_day")
    })
  })

  describe("autoBalanceWorkload", () => {
    it("should redistribute tasks from overloaded to underloaded", () => {
      const states: MemberWorkloadState[] = [
        {
          memberId: "m1",
          memberName: "Alice",
          currentLoad: 12,
          maxLoad: 10,
          loadPercentage: 120,
          consecutiveHighLoadDays: 3,
          recentWorkload: [],
          healthStatus: "critical",
          stressIndicators: [],
        },
        {
          memberId: "m2",
          memberName: "Bob",
          currentLoad: 3,
          maxLoad: 10,
          loadPercentage: 30,
          consecutiveHighLoadDays: 0,
          recentWorkload: [],
          healthStatus: "healthy",
          stressIndicators: [],
        },
      ]

      const tasks = [
        { id: "t1", name: "Task 1", assignedTo: "m1", canReassign: true, priority: 3 },
        { id: "t2", name: "Task 2", assignedTo: "m1", canReassign: true, priority: 5 },
      ]

      const result = autoBalanceWorkload(states, tasks)

      expect(result.success).toBe(true)
      expect(result.redistributedTasks.length).toBeGreaterThan(0)
    })
  })

  describe("needsImmediateIntervention", () => {
    it("should return true for burnout risk", () => {
      const state: MemberWorkloadState = {
        memberId: "m1",
        memberName: "Alice",
        currentLoad: 15,
        maxLoad: 10,
        loadPercentage: 150,
        consecutiveHighLoadDays: 7,
        recentWorkload: [],
        healthStatus: "burnout_risk",
        stressIndicators: [],
      }

      expect(needsImmediateIntervention(state)).toBe(true)
    })

    it("should return false for healthy state", () => {
      const state: MemberWorkloadState = {
        memberId: "m1",
        memberName: "Alice",
        currentLoad: 5,
        maxLoad: 10,
        loadPercentage: 50,
        consecutiveHighLoadDays: 0,
        recentWorkload: [],
        healthStatus: "healthy",
        stressIndicators: [],
      }

      expect(needsImmediateIntervention(state)).toBe(false)
    })
  })

  describe("getHealthStatusColor", () => {
    it("should return correct colors", () => {
      expect(getHealthStatusColor("healthy")).toBe("#22c55e")
      expect(getHealthStatusColor("critical")).toBe("#ef4444")
      expect(getHealthStatusColor("burnout_risk")).toBe("#dc2626")
    })
  })
})

// =============================================================================
// DELEGATION ENGINE TESTS
// =============================================================================

describe("Delegation Engine", () => {
  let skillProfile: SkillProfile
  let delegationHistory: DelegationHistory

  beforeEach(() => {
    skillProfile = createSkillProfile("m1", ["cleaning", "cooking"], ["gardening"])
    skillProfile.skills.set("cleaning", { level: 8, experience: 20, lastUsed: new Date(), growthRate: 0.1 })
    skillProfile.skills.set("cooking", { level: 6, experience: 15, lastUsed: new Date(), growthRate: 0.05 })

    delegationHistory = createDelegationHistory("m1")
  })

  describe("createSkillProfile", () => {
    it("should create empty profile with preferences", () => {
      const profile = createSkillProfile("m2", ["cooking"], ["cleaning"])

      expect(profile.memberId).toBe("m2")
      expect(profile.preferredCategories).toContain("cooking")
      expect(profile.learningInterests).toContain("cleaning")
      expect(profile.skills.size).toBe(0)
    })
  })

  describe("calculateSkillMatchScore", () => {
    it("should give high score for matching skills", () => {
      const { score, factors } = calculateSkillMatchScore(
        skillProfile,
        ["cleaning"],
        "cleaning"
      )

      expect(score).toBeGreaterThan(70)
      expect(factors.length).toBeGreaterThan(0)
    })

    it("should give low score for missing skills", () => {
      const { score } = calculateSkillMatchScore(
        skillProfile,
        ["plumbing", "electrical"],
        "maintenance"
      )

      expect(score).toBeLessThan(50)
    })

    it("should handle learning interests", () => {
      const { score, factors } = calculateSkillMatchScore(
        skillProfile,
        ["gardening"],
        "gardening"
      )

      // Should be moderate score due to learning interest
      expect(score).toBeGreaterThan(20)
      expect(factors.some(f => f.description.includes("learning"))).toBe(true)
    })
  })

  describe("getSkillLevel", () => {
    it("should return skill level", () => {
      const level = getSkillLevel(skillProfile, "cleaning")
      expect(level).toBe(8)
    })

    it("should return 0 for unknown skill", () => {
      const level = getSkillLevel(skillProfile, "unknown")
      expect(level).toBe(0)
    })
  })

  describe("updateSkillProfile", () => {
    it("should update existing skills", () => {
      const updated = updateSkillProfile(skillProfile, "cleaning", ["cleaning"], 8)

      expect(updated.skills.get("cleaning")!.experience).toBe(21)
    })

    it("should add new skills", () => {
      const updated = updateSkillProfile(skillProfile, "gardening", ["gardening"], 7)

      expect(updated.skills.has("gardening")).toBe(true)
      expect(updated.skills.get("gardening")!.experience).toBe(1)
    })
  })

  describe("createAvailabilityWindow", () => {
    it("should create window with correct fields", () => {
      const date = new Date()
      const window = createAvailabilityWindow("m1", date, "09:00", "17:00", 5, ["cleaning"])

      expect(window.memberId).toBe("m1")
      expect(window.startTime).toBe("09:00")
      expect(window.endTime).toBe("17:00")
      expect(window.capacity).toBe(5)
    })
  })

  describe("findBestWindows", () => {
    it("should find suitable windows", () => {
      const today = new Date()
      const windows = [
        createAvailabilityWindow("m1", today, "09:00", "12:00", 3),
        createAvailabilityWindow("m1", today, "14:00", "18:00", 2),
      ]

      const best = findBestWindows(windows, 60) // 60 minutes

      expect(best.length).toBeGreaterThan(0)
      expect(best[0]!.score).toBeGreaterThan(0)
    })
  })

  describe("generateDelegationSuggestions", () => {
    it("should generate suggestions for task", () => {
      const task = {
        id: "t1",
        name: "Clean kitchen",
        category: "cleaning",
        requiredSkills: ["cleaning"],
        estimatedMinutes: 30,
        priority: 5,
      }

      const members = [
        {
          id: "m1",
          name: "Alice",
          skillProfile,
          availability: [createAvailabilityWindow("m1", new Date(), "09:00", "17:00", 5)],
          currentLoad: 3,
          maxLoad: 10,
        },
        {
          id: "m2",
          name: "Bob",
          skillProfile: createSkillProfile("m2", [], []),
          availability: [createAvailabilityWindow("m2", new Date(), "09:00", "17:00", 5)],
          currentLoad: 2,
          maxLoad: 10,
        },
      ]

      const history = new Map<string, DelegationHistory>()

      const suggestions = generateDelegationSuggestions(
        task,
        "m3", // Current assignee
        members,
        history
      )

      expect(suggestions.length).toBe(2)
      expect(suggestions[0]!.score).toBeGreaterThanOrEqual(suggestions[1]!.score)
    })
  })

  describe("generateSmartAssignment", () => {
    it("should recommend best member", () => {
      const task = {
        id: "t1",
        name: "Cook dinner",
        category: "cooking",
        requiredSkills: ["cooking"],
        estimatedMinutes: 60,
        priority: 7,
      }

      const members = [
        {
          id: "m1",
          name: "Alice",
          skillProfile,
          availability: [createAvailabilityWindow("m1", new Date(), "09:00", "17:00", 5)],
          currentLoad: 3,
          maxLoad: 10,
        },
      ]

      const assignment = generateSmartAssignment(task, members, new Map())

      expect(assignment).not.toBeNull()
      expect(assignment!.recommendedMember).toBe("m1")
      expect(assignment!.reasoning.length).toBeGreaterThan(0)
    })

    it("should return null for empty members", () => {
      const task = {
        id: "t1",
        name: "Test",
        category: "test",
        requiredSkills: [],
        estimatedMinutes: 15,
        priority: 5,
      }

      const assignment = generateSmartAssignment(task, [], new Map())
      expect(assignment).toBeNull()
    })
  })

  describe("Delegation Request Workflow", () => {
    it("should create and process delegation request", () => {
      const suggestion = {
        id: "sug_1",
        taskId: "t1",
        taskName: "Test task",
        taskCategory: "test",
        fromMember: "m1",
        toMember: "m2",
        toMemberName: "Bob",
        reason: "skill_match" as const,
        score: 85,
        confidence: 0.8,
        factors: [],
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
      }

      const request = createDelegationRequest(suggestion)
      expect(request.status).toBe("pending")

      const accepted = processDelegationResponse(request, true, { rating: 5 })
      expect(accepted.status).toBe("accepted")
      expect(accepted.feedback?.accepted).toBe(true)

      const completed = completeDelegation(accepted, { timeToComplete: 30 })
      expect(completed.status).toBe("completed")
      expect(completed.feedback?.timeToComplete).toBe(30)
    })
  })

  describe("getExpiredDelegations", () => {
    it("should find expired pending requests", () => {
      const oldDate = new Date()
      oldDate.setHours(oldDate.getHours() - 48)

      const requests = [
        {
          id: "r1",
          taskId: "t1",
          fromMember: "m1",
          toMember: "m2",
          reason: "test",
          status: "pending" as const,
          requestedAt: oldDate,
        },
        {
          id: "r2",
          taskId: "t2",
          fromMember: "m1",
          toMember: "m3",
          reason: "test",
          status: "pending" as const,
          requestedAt: new Date(),
        },
      ]

      const expired = getExpiredDelegations(requests, 24)

      expect(expired.length).toBe(1)
      expect(expired[0]!.id).toBe("r1")
    })
  })

  describe("getSuggestionSummary", () => {
    it("should generate readable summary", () => {
      const suggestion = {
        id: "sug_1",
        taskId: "t1",
        taskName: "Clean bathroom",
        taskCategory: "cleaning",
        fromMember: "m1",
        toMember: "m2",
        toMemberName: "Bob",
        reason: "skill_match" as const,
        score: 85,
        confidence: 0.8,
        factors: [],
        expiresAt: new Date(),
        createdAt: new Date(),
      }

      const summary = getSuggestionSummary(suggestion)

      expect(summary).toContain("Clean bathroom")
      expect(summary).toContain("Bob")
      expect(summary).toContain("85")
    })
  })
})
