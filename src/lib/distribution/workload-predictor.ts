/**
 * Workload Predictor Service
 *
 * ML-based workload prediction for proactive task distribution:
 * - Pattern recognition by time period
 * - Seasonal trend analysis
 * - Proactive task distribution suggestions
 * - Anomaly detection in workload patterns
 */

// =============================================================================
// TYPES
// =============================================================================

export interface WorkloadDataPoint {
  timestamp: Date
  taskCount: number
  totalMinutes: number
  categories: Record<string, number>
  dayOfWeek: number
  weekOfYear: number
  month: number
  isHoliday?: boolean
}

export interface WorkloadPattern {
  type: "daily" | "weekly" | "monthly" | "seasonal"
  periodicity: number // Days
  amplitude: number // Variance from mean
  phase: number // Peak offset in days
  confidence: number // 0-1
}

export interface PredictionResult {
  date: Date
  predictedTaskCount: number
  predictedMinutes: number
  confidence: number
  breakdown: CategoryPrediction[]
  factors: PredictionFactor[]
}

export interface CategoryPrediction {
  category: string
  predictedCount: number
  trend: "increasing" | "stable" | "decreasing"
}

export interface PredictionFactor {
  name: string
  impact: number // -1 to 1
  description: string
}

export interface WorkloadTrend {
  direction: "increasing" | "stable" | "decreasing"
  rate: number // % change per week
  confidence: number
  startedAt: Date
}

export interface SeasonalProfile {
  month: number
  averageTaskCount: number
  averageMinutes: number
  peakDays: number[] // Days of month
  categoryWeights: Record<string, number>
}

export interface AnomalyDetection {
  timestamp: Date
  type: "spike" | "drop" | "unusual_pattern"
  severity: number // 1-10
  expectedValue: number
  actualValue: number
  possibleCauses: string[]
}

export interface ProactiveDistribution {
  suggestedDate: Date
  reason: string
  taskPreparations: TaskPreparation[]
  confidence: number
}

export interface TaskPreparation {
  category: string
  estimatedCount: number
  suggestedAssignees: string[]
  priority: number
}

// =============================================================================
// STATISTICAL HELPERS
// =============================================================================

/**
 * Calculate mean of an array
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const avg = mean(values)
  const squareDiffs = values.map(v => Math.pow(v - avg, 2))
  return Math.sqrt(mean(squareDiffs))
}

/**
 * Calculate linear regression (simple least squares)
 */
function linearRegression(points: Array<{ x: number; y: number }>): {
  slope: number
  intercept: number
  r2: number
} {
  if (points.length < 2) {
    return { slope: 0, intercept: 0, r2: 0 }
  }

  const n = points.length
  const sumX = points.reduce((sum, p) => sum + p.x, 0)
  const sumY = points.reduce((sum, p) => sum + p.y, 0)
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0)
  const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0)
  const sumY2 = points.reduce((sum, p) => sum + p.y * p.y, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Calculate R-squared
  const yMean = sumY / n
  const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0)
  const ssRes = points.reduce((sum, p) => sum + Math.pow(p.y - (slope * p.x + intercept), 2), 0)
  const r2 = ssTotal > 0 ? 1 - ssRes / ssTotal : 0

  return { slope, intercept, r2: Math.max(0, r2) }
}

/**
 * Calculate moving average
 */
function movingAverage(values: number[], window: number): number[] {
  if (values.length < window) return values

  const result: number[] = []
  for (let i = window - 1; i < values.length; i++) {
    const windowValues = values.slice(i - window + 1, i + 1)
    result.push(mean(windowValues))
  }
  return result
}

/**
 * Get week number of the year
 */
function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = date.getTime() - start.getTime()
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  return Math.ceil((diff / oneWeek) + 1)
}

// =============================================================================
// PATTERN DETECTION
// =============================================================================

/**
 * Detect periodic patterns in workload data
 */
export function detectPatterns(dataPoints: WorkloadDataPoint[]): WorkloadPattern[] {
  const patterns: WorkloadPattern[] = []

  if (dataPoints.length < 14) {
    return patterns // Need at least 2 weeks of data
  }

  // Sort by date
  const sorted = [...dataPoints].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )

  // Daily pattern (day of week)
  const dailyPattern = detectDailyPattern(sorted)
  if (dailyPattern.confidence > 0.5) {
    patterns.push(dailyPattern)
  }

  // Weekly pattern
  const weeklyPattern = detectWeeklyPattern(sorted)
  if (weeklyPattern.confidence > 0.4) {
    patterns.push(weeklyPattern)
  }

  // Monthly pattern
  if (sorted.length >= 60) {
    const monthlyPattern = detectMonthlyPattern(sorted)
    if (monthlyPattern.confidence > 0.3) {
      patterns.push(monthlyPattern)
    }
  }

  return patterns
}

/**
 * Detect daily (day of week) patterns
 */
function detectDailyPattern(dataPoints: WorkloadDataPoint[]): WorkloadPattern {
  const byDay: number[][] = [[], [], [], [], [], [], []]

  dataPoints.forEach(dp => {
    byDay[dp.dayOfWeek].push(dp.taskCount)
  })

  const dayAverages = byDay.map(day => mean(day))
  const overallMean = mean(dayAverages)
  const amplitude = Math.max(...dayAverages) - Math.min(...dayAverages)

  // Find peak day
  const peakDay = dayAverages.indexOf(Math.max(...dayAverages))

  // Calculate confidence based on consistency
  const dayVariances = byDay.map(day => standardDeviation(day))
  const avgVariance = mean(dayVariances)
  const confidence = amplitude > 0 ? Math.min(1, amplitude / (avgVariance + 1)) : 0

  return {
    type: "daily",
    periodicity: 7,
    amplitude: amplitude / Math.max(overallMean, 1),
    phase: peakDay,
    confidence: Math.min(1, confidence * 0.8),
  }
}

/**
 * Detect weekly patterns
 */
function detectWeeklyPattern(dataPoints: WorkloadDataPoint[]): WorkloadPattern {
  const byWeek: Map<number, number[]> = new Map()

  dataPoints.forEach(dp => {
    const week = dp.weekOfYear
    if (!byWeek.has(week)) {
      byWeek.set(week, [])
    }
    byWeek.get(week)!.push(dp.taskCount)
  })

  const weeklyTotals = Array.from(byWeek.values()).map(week => week.reduce((a, b) => a + b, 0))
  const avgWeekly = mean(weeklyTotals)
  const stdWeekly = standardDeviation(weeklyTotals)

  const amplitude = stdWeekly / Math.max(avgWeekly, 1)
  const confidence = weeklyTotals.length >= 4 ? Math.min(1, 0.6 + (weeklyTotals.length / 52) * 0.4) : 0.3

  return {
    type: "weekly",
    periodicity: 7,
    amplitude,
    phase: 0,
    confidence,
  }
}

/**
 * Detect monthly patterns
 */
function detectMonthlyPattern(dataPoints: WorkloadDataPoint[]): WorkloadPattern {
  const byMonth: Map<number, number[]> = new Map()

  dataPoints.forEach(dp => {
    if (!byMonth.has(dp.month)) {
      byMonth.set(dp.month, [])
    }
    byMonth.get(dp.month)!.push(dp.taskCount)
  })

  const monthlyAverages = Array.from(byMonth.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, values]) => mean(values))

  const amplitude = monthlyAverages.length > 0
    ? (Math.max(...monthlyAverages) - Math.min(...monthlyAverages)) / Math.max(mean(monthlyAverages), 1)
    : 0

  const peakMonth = monthlyAverages.indexOf(Math.max(...monthlyAverages))

  return {
    type: "monthly",
    periodicity: 30,
    amplitude,
    phase: peakMonth,
    confidence: byMonth.size >= 6 ? 0.5 : 0.2,
  }
}

// =============================================================================
// TREND ANALYSIS
// =============================================================================

/**
 * Analyze workload trend over time
 */
export function analyzeWorkloadTrend(
  dataPoints: WorkloadDataPoint[],
  windowWeeks: number = 4
): WorkloadTrend {
  if (dataPoints.length < windowWeeks * 7) {
    return {
      direction: "stable",
      rate: 0,
      confidence: 0,
      startedAt: new Date(),
    }
  }

  const sorted = [...dataPoints].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )

  // Group by week and calculate weekly totals
  const weeklyTotals: Array<{ week: number; total: number; date: Date }> = []
  const byWeek: Map<number, { total: number; date: Date }> = new Map()

  sorted.forEach(dp => {
    const weekKey = dp.weekOfYear + dp.timestamp.getFullYear() * 100
    if (!byWeek.has(weekKey)) {
      byWeek.set(weekKey, { total: 0, date: dp.timestamp })
    }
    byWeek.get(weekKey)!.total += dp.taskCount
  })

  byWeek.forEach((data, week) => {
    weeklyTotals.push({ week, ...data })
  })

  weeklyTotals.sort((a, b) => a.week - b.week)

  // Linear regression on recent weeks
  const recentWeeks = weeklyTotals.slice(-windowWeeks)
  const points = recentWeeks.map((w, i) => ({ x: i, y: w.total }))
  const { slope, r2 } = linearRegression(points)

  const avgTotal = mean(recentWeeks.map(w => w.total))
  const weeklyRate = avgTotal > 0 ? (slope / avgTotal) * 100 : 0

  let direction: WorkloadTrend["direction"] = "stable"
  if (weeklyRate > 5) direction = "increasing"
  else if (weeklyRate < -5) direction = "decreasing"

  // Find when trend started
  let trendStartIndex = 0
  for (let i = weeklyTotals.length - 2; i >= 0; i--) {
    const recentSlope = weeklyTotals[weeklyTotals.length - 1].total - weeklyTotals[i].total
    if ((direction === "increasing" && recentSlope <= 0) ||
        (direction === "decreasing" && recentSlope >= 0)) {
      trendStartIndex = i + 1
      break
    }
  }

  return {
    direction,
    rate: Math.round(weeklyRate * 10) / 10,
    confidence: Math.min(1, r2 + 0.2),
    startedAt: weeklyTotals[trendStartIndex]?.date ?? new Date(),
  }
}

// =============================================================================
// PREDICTION ENGINE
// =============================================================================

/**
 * Predict workload for a future date
 */
export function predictWorkload(
  dataPoints: WorkloadDataPoint[],
  targetDate: Date,
  options: { includeCategories?: boolean; considerHolidays?: boolean } = {}
): PredictionResult {
  const patterns = detectPatterns(dataPoints)
  const trend = analyzeWorkloadTrend(dataPoints)

  // Base prediction from historical average
  const taskCounts = dataPoints.map(dp => dp.taskCount)
  const basePrediction = mean(taskCounts)
  const minutesCounts = dataPoints.map(dp => dp.totalMinutes)
  const baseMinutes = mean(minutesCounts)

  // Adjust for day of week
  const targetDayOfWeek = targetDate.getDay()
  const sameDayPoints = dataPoints.filter(dp => dp.dayOfWeek === targetDayOfWeek)
  const dayAdjustment = sameDayPoints.length > 0
    ? mean(sameDayPoints.map(dp => dp.taskCount)) / Math.max(basePrediction, 1)
    : 1

  // Adjust for detected patterns
  let patternMultiplier = 1
  const dailyPattern = patterns.find(p => p.type === "daily")
  if (dailyPattern && dailyPattern.confidence > 0.5) {
    const dayOffset = (targetDayOfWeek - dailyPattern.phase + 7) % 7
    const normalizedOffset = dayOffset / 7
    patternMultiplier += dailyPattern.amplitude * Math.cos(normalizedOffset * 2 * Math.PI) * 0.5
  }

  // Adjust for trend
  const daysSinceStart = (targetDate.getTime() - trend.startedAt.getTime()) / (1000 * 60 * 60 * 24)
  const weeksSinceStart = daysSinceStart / 7
  const trendAdjustment = 1 + (trend.rate / 100) * weeksSinceStart * trend.confidence

  // Calculate final prediction
  let predictedTaskCount = basePrediction * dayAdjustment * patternMultiplier * trendAdjustment
  predictedTaskCount = Math.max(0, Math.round(predictedTaskCount))

  let predictedMinutes = baseMinutes * dayAdjustment * patternMultiplier * trendAdjustment
  predictedMinutes = Math.max(0, Math.round(predictedMinutes))

  // Calculate confidence
  const patternConfidence = patterns.length > 0
    ? mean(patterns.map(p => p.confidence))
    : 0.3
  const confidence = Math.min(1, (patternConfidence + trend.confidence) / 2)

  // Category breakdown
  const breakdown: CategoryPrediction[] = []
  if (options.includeCategories) {
    const categoryTotals: Map<string, number[]> = new Map()
    dataPoints.forEach(dp => {
      Object.entries(dp.categories).forEach(([cat, count]) => {
        if (!categoryTotals.has(cat)) {
          categoryTotals.set(cat, [])
        }
        categoryTotals.get(cat)!.push(count)
      })
    })

    categoryTotals.forEach((counts, category) => {
      const avgCount = mean(counts)
      const recentCounts = counts.slice(-14)
      const recentAvg = mean(recentCounts)

      let catTrend: CategoryPrediction["trend"] = "stable"
      if (recentAvg > avgCount * 1.15) catTrend = "increasing"
      else if (recentAvg < avgCount * 0.85) catTrend = "decreasing"

      breakdown.push({
        category,
        predictedCount: Math.round(avgCount * dayAdjustment),
        trend: catTrend,
      })
    })
  }

  // Prediction factors
  const factors: PredictionFactor[] = [
    {
      name: "day_of_week",
      impact: dayAdjustment - 1,
      description: `${getDayName(targetDayOfWeek)} typically has ${dayAdjustment > 1 ? "more" : "fewer"} tasks`,
    },
    {
      name: "trend",
      impact: (trendAdjustment - 1) * trend.confidence,
      description: `Workload is ${trend.direction} at ${Math.abs(trend.rate)}% per week`,
    },
  ]

  if (dailyPattern) {
    factors.push({
      name: "weekly_pattern",
      impact: (patternMultiplier - 1) * dailyPattern.confidence,
      description: `Weekly pattern detected with ${Math.round(dailyPattern.confidence * 100)}% confidence`,
    })
  }

  return {
    date: targetDate,
    predictedTaskCount,
    predictedMinutes,
    confidence,
    breakdown,
    factors,
  }
}

/**
 * Predict workload for a range of dates
 */
export function predictWorkloadRange(
  dataPoints: WorkloadDataPoint[],
  startDate: Date,
  endDate: Date
): PredictionResult[] {
  const results: PredictionResult[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    results.push(predictWorkload(dataPoints, new Date(currentDate), { includeCategories: true }))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return results
}

// =============================================================================
// ANOMALY DETECTION
// =============================================================================

/**
 * Detect anomalies in workload data
 */
export function detectAnomalies(
  dataPoints: WorkloadDataPoint[],
  sensitivityMultiplier: number = 2
): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = []

  if (dataPoints.length < 14) return anomalies

  const sorted = [...dataPoints].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )

  // Calculate rolling statistics
  const windowSize = 7
  const taskCounts = sorted.map(dp => dp.taskCount)
  const rollingMean = movingAverage(taskCounts, windowSize)
  const rollingStd = taskCounts.slice(windowSize - 1).map((_, i) => {
    const windowValues = taskCounts.slice(i, i + windowSize)
    return standardDeviation(windowValues)
  })

  // Check for anomalies
  for (let i = windowSize - 1; i < sorted.length; i++) {
    const actual = sorted[i].taskCount
    const expected = rollingMean[i - windowSize + 1] ?? mean(taskCounts)
    const std = rollingStd[i - windowSize + 1] ?? standardDeviation(taskCounts)

    const zScore = std > 0 ? Math.abs(actual - expected) / std : 0

    if (zScore > sensitivityMultiplier) {
      const type: AnomalyDetection["type"] = actual > expected ? "spike" : "drop"
      const severity = Math.min(10, Math.round(zScore * 2))

      const possibleCauses: string[] = []
      if (sorted[i].isHoliday) {
        possibleCauses.push("Holiday period")
      }
      if (sorted[i].dayOfWeek === 0 || sorted[i].dayOfWeek === 6) {
        possibleCauses.push("Weekend effect")
      }
      if (type === "spike") {
        possibleCauses.push("Possible backlog or special event")
      } else {
        possibleCauses.push("Possible reduced activity or vacation")
      }

      anomalies.push({
        timestamp: sorted[i].timestamp,
        type,
        severity,
        expectedValue: Math.round(expected),
        actualValue: actual,
        possibleCauses,
      })
    }
  }

  return anomalies
}

// =============================================================================
// PROACTIVE DISTRIBUTION
// =============================================================================

/**
 * Generate proactive distribution suggestions
 */
export function generateProactiveDistribution(
  dataPoints: WorkloadDataPoint[],
  memberAvailability: Array<{ memberId: string; name: string; availableDays: number[] }>,
  lookaheadDays: number = 7
): ProactiveDistribution[] {
  const suggestions: ProactiveDistribution[] = []
  const startDate = new Date()

  for (let i = 0; i < lookaheadDays; i++) {
    const targetDate = new Date(startDate)
    targetDate.setDate(targetDate.getDate() + i)

    const prediction = predictWorkload(dataPoints, targetDate, { includeCategories: true })

    // Only suggest if confidence is reasonable and workload is significant
    if (prediction.confidence < 0.4 || prediction.predictedTaskCount < 2) continue

    const dayOfWeek = targetDate.getDay()

    // Find available members for this day
    const availableMembers = memberAvailability
      .filter(m => m.availableDays.includes(dayOfWeek))
      .map(m => m.memberId)

    if (availableMembers.length === 0) continue

    const taskPreparations: TaskPreparation[] = prediction.breakdown
      .filter(b => b.predictedCount > 0)
      .map(b => ({
        category: b.category,
        estimatedCount: b.predictedCount,
        suggestedAssignees: availableMembers,
        priority: b.trend === "increasing" ? 8 : b.trend === "decreasing" ? 4 : 6,
      }))

    if (taskPreparations.length > 0) {
      suggestions.push({
        suggestedDate: targetDate,
        reason: `Predicted ${prediction.predictedTaskCount} tasks based on ${getDayName(dayOfWeek)} pattern`,
        taskPreparations,
        confidence: prediction.confidence,
      })
    }
  }

  return suggestions
}

// =============================================================================
// SEASONAL ANALYSIS
// =============================================================================

/**
 * Build seasonal profile from historical data
 */
export function buildSeasonalProfile(dataPoints: WorkloadDataPoint[]): SeasonalProfile[] {
  const profiles: SeasonalProfile[] = []
  const byMonth: Map<number, WorkloadDataPoint[]> = new Map()

  dataPoints.forEach(dp => {
    if (!byMonth.has(dp.month)) {
      byMonth.set(dp.month, [])
    }
    byMonth.get(dp.month)!.push(dp)
  })

  byMonth.forEach((points, month) => {
    const avgTasks = mean(points.map(p => p.taskCount))
    const avgMinutes = mean(points.map(p => p.totalMinutes))

    // Find peak days of month
    const dayTotals: number[] = Array(31).fill(0)
    const dayCounts: number[] = Array(31).fill(0)

    points.forEach(p => {
      const day = p.timestamp.getDate() - 1
      dayTotals[day] += p.taskCount
      dayCounts[day]++
    })

    const dayAverages = dayTotals.map((total, i) =>
      dayCounts[i] > 0 ? total / dayCounts[i] : 0
    )

    const threshold = mean(dayAverages) * 1.2
    const peakDays = dayAverages
      .map((avg, day) => ({ day: day + 1, avg }))
      .filter(d => d.avg > threshold)
      .map(d => d.day)

    // Category weights
    const categoryTotals: Record<string, number> = {}
    points.forEach(p => {
      Object.entries(p.categories).forEach(([cat, count]) => {
        categoryTotals[cat] = (categoryTotals[cat] ?? 0) + count
      })
    })

    const totalAllCategories = Object.values(categoryTotals).reduce((a, b) => a + b, 0)
    const categoryWeights: Record<string, number> = {}
    Object.entries(categoryTotals).forEach(([cat, total]) => {
      categoryWeights[cat] = totalAllCategories > 0 ? total / totalAllCategories : 0
    })

    profiles.push({
      month,
      averageTaskCount: Math.round(avgTasks),
      averageMinutes: Math.round(avgMinutes),
      peakDays,
      categoryWeights,
    })
  })

  return profiles.sort((a, b) => a.month - b.month)
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create workload data point
 */
export function createWorkloadDataPoint(
  timestamp: Date,
  taskCount: number,
  totalMinutes: number,
  categories: Record<string, number> = {},
  isHoliday: boolean = false
): WorkloadDataPoint {
  return {
    timestamp,
    taskCount,
    totalMinutes,
    categories,
    dayOfWeek: timestamp.getDay(),
    weekOfYear: getWeekOfYear(timestamp),
    month: timestamp.getMonth(),
    isHoliday,
  }
}

/**
 * Get day name from day number
 */
function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return days[day] ?? "Unknown"
}

/**
 * Get month name from month number
 */
export function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  return months[month] ?? "Unknown"
}

/**
 * Generate sample data for testing
 */
export function generateSampleData(weeks: number): WorkloadDataPoint[] {
  const data: WorkloadDataPoint[] = []
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - weeks * 7)

  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)

    const dayOfWeek = date.getDay()
    // Simulate lower weekend activity
    const baseCount = dayOfWeek === 0 || dayOfWeek === 6 ? 3 : 8
    // Add some randomness
    const variance = Math.floor(Math.random() * 5) - 2
    const taskCount = Math.max(0, baseCount + variance)

    data.push(createWorkloadDataPoint(
      date,
      taskCount,
      taskCount * 15, // 15 min average per task
      {
        cleaning: Math.floor(taskCount * 0.4),
        cooking: Math.floor(taskCount * 0.3),
        shopping: Math.floor(taskCount * 0.2),
        maintenance: Math.floor(taskCount * 0.1),
      }
    ))
  }

  return data
}
