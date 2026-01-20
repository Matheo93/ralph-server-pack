/**
 * Test Constants and Fixtures
 *
 * Centralized test data to ensure consistency across tests.
 */

// ============================================================
// USER CREDENTIALS
// ============================================================

export const TEST_PARENT = {
  email: "test-e2e@familyload.test",
  password: "TestE2E123!",
  name: "Parent Test",
}

export const TEST_PARENT_2 = {
  email: "test-e2e-2@familyload.test",
  password: "TestE2E456!",
  name: "Parent Test 2",
}

// ============================================================
// CHILD DATA
// ============================================================

export const TEST_CHILDREN = [
  {
    name: "Johan",
    pin: "1234",
    birthdate: "2015-05-15",
    avatar: "boy1",
  },
  {
    name: "Emma",
    pin: "5678",
    birthdate: "2018-03-20",
    avatar: "girl1",
  },
]

// ============================================================
// TASK TEMPLATES
// ============================================================

export const TASK_TEMPLATES = {
  simple: {
    title: "E2E TEST - Tâche simple",
    category: "chores",
    priority: 2,
  },
  withChild: {
    title: "E2E TEST - Tâche assignée",
    category: "homework",
    priority: 2,
  },
  urgent: {
    title: "E2E TEST - Tâche urgente",
    category: "chores",
    priority: 3,
  },
  recurring: {
    title: "E2E TEST - Tâche récurrente",
    category: "chores",
    priority: 2,
    recurrence: "weekly",
  },
}

// ============================================================
// CALENDAR TEMPLATES
// ============================================================

export const EVENT_TEMPLATES = {
  simple: {
    title: "E2E TEST - Événement simple",
    duration: 60, // minutes
  },
  allDay: {
    title: "E2E TEST - Journée entière",
    allDay: true,
  },
  recurring: {
    title: "E2E TEST - Événement récurrent",
    duration: 60,
    recurrence: "weekly",
  },
}

// ============================================================
// SHOPPING TEMPLATES
// ============================================================

export const SHOPPING_LIST_TEMPLATES = {
  groceries: {
    name: "E2E TEST - Courses",
    items: ["Lait", "Pain", "Beurre", "Oeufs"],
  },
  weekly: {
    name: "E2E TEST - Courses semaine",
    items: ["Fruits", "Légumes", "Viande", "Poisson"],
  },
}

// ============================================================
// STRIPE TEST DATA
// ============================================================

export const STRIPE_TEST = {
  cards: {
    success: "4242424242424242",
    declined: "4000000000000002",
    insufficientFunds: "4000000000009995",
    expired: "4000000000000069",
  },
  expiry: "12/30",
  cvc: "123",
}

// ============================================================
// TIMEOUTS
// ============================================================

export const TIMEOUTS = {
  short: 5000,
  medium: 10000,
  long: 15000,
  navigation: 15000,
  api: 30000,
}

// ============================================================
// PATTERNS
// ============================================================

export const PATTERNS = {
  testPrefix: "E2E TEST",
  cleanup: /E2E TEST|TEST -|INTEGRATION/i,
}

// ============================================================
// XP VALUES
// ============================================================

export const XP_VALUES = {
  taskCompletion: {
    low: 5,
    medium: 10,
    high: 20,
  },
  challengeCompletion: 50,
  levelUp: 100,
}

// ============================================================
// BADGE IDS (for testing badge unlocks)
// ============================================================

export const BADGE_TRIGGERS = {
  firstTask: "first_task",
  fiveTasks: "five_tasks",
  tenTasks: "ten_tasks",
  streak3: "streak_3",
  streak7: "streak_7",
}

// ============================================================
// DATE HELPERS
// ============================================================

export function tomorrow(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date
}

export function nextWeek(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? ''
}

export function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 16)
}

// ============================================================
// VOICE COMMAND TEMPLATES
// ============================================================

export const VOICE_COMMANDS = {
  createTask: [
    "Johan doit ranger sa chambre demain",
    "Créer une tâche faire les courses samedi",
    "Ajouter faire la vaisselle ce soir",
  ],
  askList: [
    "Qu'est-ce que je dois faire aujourd'hui",
    "Montre mes tâches",
    "Liste des tâches pour Emma",
  ],
  complete: [
    "Marquer la tâche comme terminée",
    "J'ai fini de ranger",
  ],
}

// ============================================================
// MAGIC CHAT PROMPTS
// ============================================================

export const CHAT_PROMPTS = {
  taskCreation: [
    "Johan doit faire ses devoirs demain à 19h",
    "Rappelle-moi d'acheter du lait",
    "Ajoute une tâche pour Emma: ranger ses jouets",
  ],
  queries: [
    "Quelles tâches dois-je faire cette semaine?",
    "Montre le planning de Johan",
    "Combien de tâches sont en retard?",
  ],
}
