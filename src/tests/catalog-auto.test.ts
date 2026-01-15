/**
 * Automatic Task Catalog Tests - Sprint 21 Phase 2
 *
 * Tests for age rules, period rules, and auto task generation.
 * 30+ tests for the new automatic task generation system.
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  createTemplateStore,
  addTemplate,
  getTemplate,
  getTemplatesByCategory,
  buildHealthTemplate,
  buildEducationTemplate,
  buildAdministrativeTemplate,
  calculateAgeInMonths,
  calculateTotalWeight,
  getLocalizedTitle,
  DEFAULT_CHARGE_WEIGHTS,
  type TaskTemplate,
  type TemplateStore,
  type AgeRange,
} from "@/lib/catalog/task-templates"
import {
  createAgeRuleStore,
  addMilestone,
  initializeFrenchMilestones,
  getMilestonesForAge,
  getUpcomingMilestones,
  getMissedMilestones,
  getMandatoryMilestones,
  getMilestonesByType,
  daysUntilMilestone,
  isMilestoneDueSoon,
  FRENCH_VACCINES,
  PMI_VISITS,
  SCHOOL_MILESTONES,
  type AgeMilestone,
  type AgeRuleStore,
} from "@/lib/catalog/age-rules"
import {
  createPeriodRuleStore,
  addPeriodRule,
  initializeFrenchPeriodRules,
  getRulesForMonth,
  getCurrentMonthRules,
  getUpcomingRules,
  getRulesForChildAge,
  shouldTriggerRule,
  calculateDueDate,
  RENTREE_RULES,
  type PeriodRule,
  type PeriodRuleStore,
} from "@/lib/catalog/period-rules"
import {
  createAutoTaskStore,
  addAutoTask,
  confirmAutoTask,
  dismissAutoTask,
  completeAutoTask,
  expireOldTasks,
  getAutoTask,
  getPendingTasksForHousehold,
  getPendingTasksForChild,
  getCriticalPendingTasks,
  getTasksDueSoon,
  isSourceProcessed,
  generateFromMilestone,
  generateFromPeriodRule,
  generateTasksForChild,
  getTasksNeedingReminder,
  generateNotificationText,
  getHouseholdStats,
  AUTO_TASK_CONFIG,
  type AutoTask,
  type AutoTaskStore,
  type ChildContext,
} from "@/lib/catalog/task-generator-auto"

// =============================================================================
// TASK TEMPLATES TESTS
// =============================================================================

describe("Task Templates - Extended", () => {
  describe("Template Store", () => {
    it("should create empty template store", () => {
      const store = createTemplateStore()
      expect(store.templates.size).toBe(0)
    })

    it("should add template to store", () => {
      const store = createTemplateStore()
      const ageRange: AgeRange = { minMonths: 0, maxMonths: 36 }
      const template = buildHealthTemplate({
        slug: 'test_vaccine',
        titleFR: 'Vaccination test',
        titleEN: 'Test vaccine',
        descFR: 'Description',
        ageRange,
      })

      const updated = addTemplate(store, template)
      expect(updated.templates.size).toBe(1)
    })

    it("should get template by ID", () => {
      const store = createTemplateStore()
      const ageRange: AgeRange = { minMonths: 0, maxMonths: 36 }
      const template = buildHealthTemplate({
        slug: 'test_vaccine',
        titleFR: 'Vaccination test',
        titleEN: 'Test vaccine',
        ageRange,
      })

      const updated = addTemplate(store, template)
      const retrieved = getTemplate(updated, template.id)
      expect(retrieved).toBeDefined()
    })

    it("should return undefined for non-existent template", () => {
      const store = createTemplateStore()
      const template = getTemplate(store, 'non_existent_id')
      expect(template).toBeUndefined()
    })

    it("should get templates by category", () => {
      const store = createTemplateStore()
      const ageRange: AgeRange = { minMonths: 0, maxMonths: 36 }
      const template = buildHealthTemplate({
        slug: 'test_vaccine',
        titleFR: 'Vaccination test',
        titleEN: 'Test vaccine',
        ageRange,
      })

      const updated = addTemplate(store, template)
      const healthTemplates = getTemplatesByCategory(updated, 'health')
      expect(healthTemplates.length).toBe(1)
    })
  })

  describe("Template Builders", () => {
    it("should build health template with correct defaults", () => {
      const ageRange: AgeRange = { minMonths: 0, maxMonths: 36 }
      const template = buildHealthTemplate({
        slug: 'vaccine_test',
        titleFR: 'Vaccin test',
        titleEN: 'Test vaccine',
        descFR: 'Desc FR',
        descEN: 'Desc EN',
        ageRange,
      })

      expect(template.slug).toBe('vaccine_test')
      expect(template.category).toBe('health')
      expect(template.chargeWeight).toEqual(DEFAULT_CHARGE_WEIGHTS.health)
    })

    it("should build education template", () => {
      const ageRange: AgeRange = { minMonths: 72, maxMonths: 132 }
      const template = buildEducationTemplate({
        slug: 'school_test',
        titleFR: 'Ecole test',
        titleEN: 'Test school',
        ageRange,
      })

      expect(template.category).toBe('education')
      expect(template.ageRange).toEqual(ageRange)
    })

    it("should build administrative template", () => {
      const ageRange: AgeRange = { minMonths: 0, maxMonths: 216 }
      const template = buildAdministrativeTemplate({
        slug: 'admin_test',
        titleFR: 'Admin test',
        titleEN: 'Admin test',
        ageRange,
      })

      expect(template.category).toBe('administrative')
    })
  })

  describe("Helper Functions", () => {
    it("should calculate age in months correctly", () => {
      const now = new Date()
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      const ageMonths = calculateAgeInMonths(oneYearAgo, now)
      expect(ageMonths).toBeGreaterThanOrEqual(11)
      expect(ageMonths).toBeLessThanOrEqual(13)
    })

    it("should calculate total weight", () => {
      const weight = { mental: 3, time: 2, emotional: 1, physical: 1 }
      const total = calculateTotalWeight(weight)
      expect(total).toBe(7)
    })

    it("should get localized title from template", () => {
      const ageRange: AgeRange = { minMonths: 0, maxMonths: 36 }
      const template = buildHealthTemplate({
        slug: 'test',
        titleFR: 'Titre FR',
        titleEN: 'Title EN',
        ageRange,
      })

      expect(getLocalizedTitle(template, 'fr')).toBe('Titre FR')
      expect(getLocalizedTitle(template, 'en')).toBe('Title EN')
    })
  })
})

// =============================================================================
// AGE RULES TESTS
// =============================================================================

describe("Age Rules", () => {
  let store: AgeRuleStore

  beforeEach(() => {
    store = initializeFrenchMilestones()
  })

  describe("Store Operations", () => {
    it("should create empty store", () => {
      const emptyStore = createAgeRuleStore()
      expect(emptyStore.milestones.size).toBe(0)
    })

    it("should initialize with French milestones", () => {
      expect(store.milestones.size).toBeGreaterThan(0)
    })

    it("should add milestone to store", () => {
      const emptyStore = createAgeRuleStore()
      const milestone: AgeMilestone = {
        id: 'test_milestone',
        type: 'vaccine',
        ageMonths: 12,
        tolerance: 1,
        name: { fr: 'Test', en: 'Test' },
        description: { fr: 'Desc', en: 'Desc' },
        countries: ['FR'],
        priority: 'high',
        mandatory: true,
        reminders: [7, 3, 1],
      }

      const updated = addMilestone(emptyStore, milestone)
      expect(updated.milestones.size).toBe(1)
    })
  })

  describe("French Vaccines", () => {
    it("should have all mandatory vaccines defined", () => {
      expect(FRENCH_VACCINES.length).toBeGreaterThan(0)
    })

    it("should have vaccines at 2 months", () => {
      const twoMonthVaccines = FRENCH_VACCINES.filter(v => v.ageMonths === 2)
      expect(twoMonthVaccines.length).toBeGreaterThan(0)
    })

    it("should have critical priority vaccines", () => {
      const criticalVaccines = FRENCH_VACCINES.filter(v => v.priority === 'critical')
      expect(criticalVaccines.length).toBeGreaterThan(0)
    })
  })

  describe("Milestone Queries", () => {
    it("should get milestones for specific age", () => {
      const milestones = getMilestonesForAge(store, 2, 'FR')
      expect(milestones).toBeDefined()
    })

    it("should get upcoming milestones", () => {
      const upcoming = getUpcomingMilestones(store, 2, 6, 'FR')
      expect(upcoming).toBeDefined()
    })

    it("should get mandatory milestones", () => {
      const mandatory = getMandatoryMilestones(store, 'FR')
      expect(mandatory.length).toBeGreaterThan(0)
    })

    it("should get milestones by type", () => {
      const vaccines = getMilestonesByType(store, 'vaccine', 'FR')
      expect(vaccines).toBeDefined()
    })
  })
})

// =============================================================================
// PERIOD RULES TESTS
// =============================================================================

describe("Period Rules", () => {
  let store: PeriodRuleStore

  beforeEach(() => {
    store = initializeFrenchPeriodRules()
  })

  describe("Store Operations", () => {
    it("should create empty store", () => {
      const emptyStore = createPeriodRuleStore()
      expect(emptyStore.rules.size).toBe(0)
    })

    it("should initialize with French period rules", () => {
      expect(store.rules.size).toBeGreaterThan(0)
    })

    it("should add period rule to store", () => {
      const emptyStore = createPeriodRuleStore()
      const rule: PeriodRule = {
        id: 'test_rule',
        name: { fr: 'Test', en: 'Test' },
        description: { fr: 'Desc', en: 'Desc' },
        periodType: 'rentree',
        month: 9,
        leadDays: 30,
        countries: ['FR'],
        category: 'education',
        priority: 'high',
        recurrence: 'yearly',
        tags: ['test'],
        enabled: true,
      }

      const updated = addPeriodRule(emptyStore, rule)
      expect(updated.rules.size).toBe(1)
    })
  })

  describe("Rentree Rules", () => {
    it("should have rentree rules defined", () => {
      expect(RENTREE_RULES.length).toBeGreaterThan(0)
    })
  })

  describe("Rule Queries", () => {
    it("should get rules for specific month", () => {
      const septemberRules = getRulesForMonth(store, 9, 'FR')
      expect(septemberRules).toBeDefined()
    })

    it("should get current month rules", () => {
      const currentRules = getCurrentMonthRules(store, 'FR')
      expect(currentRules).toBeDefined()
    })

    it("should get upcoming rules", () => {
      const upcoming = getUpcomingRules(store, 30, 'FR')
      expect(upcoming).toBeDefined()
    })
  })
})

// =============================================================================
// AUTO TASK GENERATOR TESTS
// =============================================================================

describe("Auto Task Generator", () => {
  let store: AutoTaskStore
  let ageRuleStore: AgeRuleStore
  let periodRuleStore: PeriodRuleStore

  const mockChild: ChildContext = {
    id: 'child_123',
    name: 'Emma',
    birthDate: new Date(),
    householdId: 'household_456',
    country: 'FR',
  }

  beforeEach(() => {
    store = createAutoTaskStore()
    ageRuleStore = initializeFrenchMilestones()
    periodRuleStore = initializeFrenchPeriodRules()
    mockChild.birthDate = new Date()
    mockChild.birthDate.setMonth(mockChild.birthDate.getMonth() - 2)
  })

  describe("Store Operations", () => {
    it("should create empty auto task store", () => {
      expect(store.tasks.size).toBe(0)
      expect(store.stats.totalGenerated).toBe(0)
    })

    it("should add auto task to store", () => {
      const task: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_test',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'Test Task',
        description: 'Test description',
        category: 'health',
        priority: 'high',
        dueDate: new Date(),
        chargeWeight: { mental: 2, time: 2, emotional: 1, physical: 1, total: 6 },
        status: 'pending',
        mandatory: true,
        tags: ['vaccine'],
        createdAt: new Date(),
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      const updated = addAutoTask(store, task)
      expect(updated.tasks.size).toBe(1)
      expect(updated.stats.totalGenerated).toBe(1)
    })

    it("should confirm auto task", () => {
      const task: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_test',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'Test Task',
        description: '',
        category: 'health',
        priority: 'high',
        dueDate: new Date(),
        chargeWeight: { mental: 2, time: 2, emotional: 1, physical: 1, total: 6 },
        status: 'pending',
        mandatory: true,
        tags: [],
        createdAt: new Date(),
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      let updated = addAutoTask(store, task)
      updated = confirmAutoTask(updated, 'auto_1', 'task_123')

      const confirmedTask = updated.tasks.get('auto_1')
      expect(confirmedTask?.status).toBe('confirmed')
      expect(confirmedTask?.taskId).toBe('task_123')
    })

    it("should dismiss auto task", () => {
      const task: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_test',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'Test Task',
        description: '',
        category: 'health',
        priority: 'high',
        dueDate: new Date(),
        chargeWeight: { mental: 2, time: 2, emotional: 1, physical: 1, total: 6 },
        status: 'pending',
        mandatory: false,
        tags: [],
        createdAt: new Date(),
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      let updated = addAutoTask(store, task)
      updated = dismissAutoTask(updated, 'auto_1')

      const dismissedTask = updated.tasks.get('auto_1')
      expect(dismissedTask?.status).toBe('dismissed')
    })

    it("should expire old tasks", () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - AUTO_TASK_CONFIG.expirationDays - 10)

      const task: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_test',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'Old Task',
        description: '',
        category: 'health',
        priority: 'high',
        dueDate: oldDate,
        chargeWeight: { mental: 2, time: 2, emotional: 1, physical: 1, total: 6 },
        status: 'pending',
        mandatory: false,
        tags: [],
        createdAt: oldDate,
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      let updated = addAutoTask(store, task)
      updated = expireOldTasks(updated)

      const expiredTask = updated.tasks.get('auto_1')
      expect(expiredTask?.status).toBe('expired')
    })
  })

  describe("Task Queries", () => {
    it("should get pending tasks for household", () => {
      const task: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_test',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'Test Task',
        description: '',
        category: 'health',
        priority: 'high',
        dueDate: new Date(),
        chargeWeight: { mental: 2, time: 2, emotional: 1, physical: 1, total: 6 },
        status: 'pending',
        mandatory: true,
        tags: [],
        createdAt: new Date(),
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      const updated = addAutoTask(store, task)
      const pending = getPendingTasksForHousehold(updated, 'household_1')
      expect(pending.length).toBe(1)
    })

    it("should get pending tasks for child", () => {
      const task: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_test',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'Test Task',
        description: '',
        category: 'health',
        priority: 'high',
        dueDate: new Date(),
        chargeWeight: { mental: 2, time: 2, emotional: 1, physical: 1, total: 6 },
        status: 'pending',
        mandatory: true,
        tags: [],
        createdAt: new Date(),
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      const updated = addAutoTask(store, task)
      const pending = getPendingTasksForChild(updated, 'child_1')
      expect(pending.length).toBe(1)
    })

    it("should get critical pending tasks", () => {
      const task: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_test',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'Critical Task',
        description: '',
        category: 'health',
        priority: 'critical',
        dueDate: new Date(),
        chargeWeight: { mental: 3, time: 3, emotional: 2, physical: 1, total: 9 },
        status: 'pending',
        mandatory: true,
        tags: [],
        createdAt: new Date(),
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      const updated = addAutoTask(store, task)
      const critical = getCriticalPendingTasks(updated, 'household_1')
      expect(critical.length).toBe(1)
    })

    it("should get tasks due soon", () => {
      const soonDate = new Date()
      soonDate.setDate(soonDate.getDate() + 3)

      const task: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_test',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'Soon Task',
        description: '',
        category: 'health',
        priority: 'high',
        dueDate: soonDate,
        chargeWeight: { mental: 2, time: 2, emotional: 1, physical: 1, total: 6 },
        status: 'pending',
        mandatory: true,
        tags: [],
        createdAt: new Date(),
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      const updated = addAutoTask(store, task)
      const soon = getTasksDueSoon(updated, 'household_1', 7)
      expect(soon.length).toBe(1)
    })

    it("should check if source is processed", () => {
      const task: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_test',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'Test Task',
        description: '',
        category: 'health',
        priority: 'high',
        dueDate: new Date(),
        chargeWeight: { mental: 2, time: 2, emotional: 1, physical: 1, total: 6 },
        status: 'pending',
        mandatory: true,
        tags: [],
        createdAt: new Date(),
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      const updated = addAutoTask(store, task)
      const isProcessed = isSourceProcessed(updated, 'age_milestone', 'vac_test', 'child_1')
      expect(isProcessed).toBe(true)

      const notProcessed = isSourceProcessed(updated, 'age_milestone', 'other_vac', 'child_1')
      expect(notProcessed).toBe(false)
    })
  })

  describe("Task Generation", () => {
    it("should generate from milestone", () => {
      const milestone: AgeMilestone = {
        id: 'vac_dtcp_1',
        type: 'vaccine',
        ageMonths: 2,
        tolerance: 0,
        name: { fr: 'Vaccin DTP pour {enfant}', en: 'DTP vaccine for {child}' },
        description: { fr: 'Premier vaccin', en: 'First vaccine' },
        countries: ['FR'],
        priority: 'critical',
        mandatory: true,
        reminders: [7, 3, 1],
      }

      const autoTask = generateFromMilestone(milestone, mockChild, 'fr')

      expect(autoTask.sourceType).toBe('age_milestone')
      expect(autoTask.sourceId).toBe('vac_dtcp_1')
      expect(autoTask.childId).toBe(mockChild.id)
      expect(autoTask.title).toContain('Emma')
    })

    it("should generate from period rule", () => {
      const rule: PeriodRule = {
        id: 'rentree_fournitures',
        name: { fr: 'Fournitures scolaires pour {enfant}', en: 'School supplies for {child}' },
        description: { fr: 'Acheter les fournitures', en: 'Buy supplies' },
        periodType: 'rentree',
        month: 9,
        leadDays: 30,
        countries: ['FR'],
        category: 'education',
        priority: 'high',
        recurrence: 'yearly',
        tags: ['fournitures', 'rentree'],
        enabled: true,
      }

      const autoTask = generateFromPeriodRule(rule, mockChild, 2024, 'fr')

      expect(autoTask.sourceType).toBe('period_rule')
      expect(autoTask.title).toContain('Emma')
    })

    it("should generate tasks for child", () => {
      const { store: updatedStore, result } = generateTasksForChild(
        store,
        ageRuleStore,
        periodRuleStore,
        mockChild
      )

      expect(result).toBeDefined()
      expect(result.generated).toBeDefined()
      expect(result.skipped).toBeDefined()
    })
  })

  describe("Notifications", () => {
    it("should generate notification text in French", () => {
      const task: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_test',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'Vaccination DTP',
        description: '',
        category: 'health',
        priority: 'high',
        dueDate: new Date(),
        chargeWeight: { mental: 2, time: 2, emotional: 1, physical: 1, total: 6 },
        status: 'pending',
        mandatory: true,
        tags: [],
        createdAt: new Date(),
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      const notification = generateNotificationText(task, 'fr')

      expect(notification.title).toBeDefined()
      expect(notification.body).toContain('Emma')
    })

    it("should generate notification text in English", () => {
      const task: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_test',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'DTP Vaccination',
        description: '',
        category: 'health',
        priority: 'high',
        dueDate: new Date(),
        chargeWeight: { mental: 2, time: 2, emotional: 1, physical: 1, total: 6 },
        status: 'pending',
        mandatory: true,
        tags: [],
        createdAt: new Date(),
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      const notification = generateNotificationText(task, 'en')

      expect(notification.title).toContain('Suggested task')
      expect(notification.body).toContain('Emma')
    })

    it("should get tasks needing reminder", () => {
      const reminderDate = new Date()
      reminderDate.setDate(reminderDate.getDate() + 7)

      const task: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_test',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'Test Task',
        description: '',
        category: 'health',
        priority: 'high',
        dueDate: reminderDate,
        chargeWeight: { mental: 2, time: 2, emotional: 1, physical: 1, total: 6 },
        status: 'pending',
        mandatory: true,
        tags: [],
        createdAt: new Date(),
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      const updated = addAutoTask(store, task)
      const needsReminder = getTasksNeedingReminder(updated, 'household_1')
      expect(needsReminder.length).toBe(1)
    })
  })

  describe("Statistics", () => {
    it("should get household stats", () => {
      const task1: AutoTask = {
        id: 'auto_1',
        sourceType: 'age_milestone',
        sourceId: 'vac_1',
        childId: 'child_1',
        childName: 'Emma',
        householdId: 'household_1',
        title: 'Task 1',
        description: '',
        category: 'health',
        priority: 'critical',
        dueDate: new Date(),
        chargeWeight: { mental: 2, time: 2, emotional: 1, physical: 1, total: 6 },
        status: 'pending',
        mandatory: true,
        tags: [],
        createdAt: new Date(),
        confirmedAt: null,
        dismissedAt: null,
        taskId: null,
      }

      const task2: AutoTask = {
        ...task1,
        id: 'auto_2',
        sourceId: 'vac_2',
        priority: 'medium',
        mandatory: false,
      }

      let updated = addAutoTask(store, task1)
      updated = addAutoTask(updated, task2)

      const stats = getHouseholdStats(updated, 'household_1')

      expect(stats.total).toBe(2)
      expect(stats.pending).toBe(2)
      expect(stats.critical).toBe(1)
    })
  })

  describe("Configuration", () => {
    it("should have valid auto task config", () => {
      expect(AUTO_TASK_CONFIG.lookAheadDays).toBeGreaterThan(0)
      expect(AUTO_TASK_CONFIG.maxTasksPerGeneration).toBeGreaterThan(0)
    })
  })
})
