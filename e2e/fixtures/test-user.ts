/**
 * Test fixtures for E2E tests
 * Mock data that can be used across tests
 */

export const testUser = {
  id: "test-user-id-123",
  email: "test@familyload.app",
  name: "Test User",
}

export const testHousehold = {
  id: "test-household-id-123",
  name: "Famille Test",
  country: "FR",
  timezone: "Europe/Paris",
  streak_current: 5,
  streak_best: 10,
  subscription_status: "active",
}

export const testChildren = [
  {
    id: "child-1",
    first_name: "Emma",
    birthdate: "2018-05-15",
    household_id: testHousehold.id,
  },
  {
    id: "child-2",
    first_name: "Lucas",
    birthdate: "2020-09-22",
    household_id: testHousehold.id,
  },
]

export const testTasks = [
  {
    id: "task-1",
    title: "Rendez-vous pédiatre Emma",
    description: "Visite annuelle",
    status: "pending",
    priority: "high",
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    child_id: "child-1",
    household_id: testHousehold.id,
    is_critical: true,
    load_weight: 4,
  },
  {
    id: "task-2",
    title: "Inscription activité Lucas",
    description: "Football",
    status: "pending",
    priority: "normal",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    child_id: "child-2",
    household_id: testHousehold.id,
    is_critical: false,
    load_weight: 3,
  },
  {
    id: "task-3",
    title: "Réunion parents d'élèves",
    description: "École primaire",
    status: "done",
    priority: "normal",
    deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    child_id: "child-1",
    household_id: testHousehold.id,
    is_critical: false,
    load_weight: 4,
    completed_at: new Date().toISOString(),
  },
]

export const testCategories = [
  { id: "cat-1", name: "Santé", color: "#ef4444" },
  { id: "cat-2", name: "École", color: "#3b82f6" },
  { id: "cat-3", name: "Activités", color: "#22c55e" },
  { id: "cat-4", name: "Administratif", color: "#f59e0b" },
]

/**
 * Generate mock API responses
 */
export function mockTasksResponse() {
  return {
    tasks: testTasks,
    total: testTasks.length,
  }
}

export function mockChildrenResponse() {
  return {
    children: testChildren,
    total: testChildren.length,
  }
}

export function mockHouseholdResponse() {
  return {
    household: testHousehold,
    members: [
      { userId: testUser.id, role: "owner", email: testUser.email },
    ],
  }
}

export function mockChargeBalance() {
  return {
    members: [
      {
        userId: testUser.id,
        name: "Parent 1",
        percentage: 58,
        taskCount: 7,
        totalWeight: 24,
      },
      {
        userId: "user-2",
        name: "Parent 2",
        percentage: 42,
        taskCount: 5,
        totalWeight: 18,
      },
    ],
    totalWeight: 42,
    isBalanced: true,
    balanceAlert: null,
  }
}
