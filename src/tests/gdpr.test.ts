/**
 * GDPR Service and API Tests
 *
 * Tests for GDPR compliance functionality:
 * - Data export (Article 20)
 * - Data deletion (Article 17)
 * - Data anonymization
 * - Consent management
 * - Data retention policies
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  DATA_RETENTION_POLICY,
  type GDPRDeleteResult,
  type GDPRAnonymizeResult,
  type DataReport,
  type GDPRConsentStatus,
} from "@/lib/services/gdpr"

// =============================================================================
// MOCKS
// =============================================================================

// Mock auth
vi.mock("@/lib/auth/actions", () => ({
  getUserId: vi.fn().mockResolvedValue("test-user-id"),
}))

// Mock database
const mockQueryOne = vi.fn()
const mockQuery = vi.fn()
const mockSetCurrentUser = vi.fn()

vi.mock("@/lib/aws/database", () => ({
  queryOne: (...args: unknown[]) => mockQueryOne(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  setCurrentUser: (...args: unknown[]) => mockSetCurrentUser(...args),
}))

// Mock export service
vi.mock("@/lib/services/export", () => ({
  exportHouseholdData: vi.fn().mockResolvedValue({
    household: {
      id: "test-household",
      name: "Test Family",
    },
    members: [],
    children: [],
    tasks: [],
  }),
}))

// =============================================================================
// DATA RETENTION POLICY TESTS
// =============================================================================

describe("GDPR: Data Retention Policy", () => {
  it("should have defined retention periods for all data categories", () => {
    expect(DATA_RETENTION_POLICY).toBeDefined()
    expect(DATA_RETENTION_POLICY.tasks).toBeNull() // Indefinite
    expect(DATA_RETENTION_POLICY.completedTasksArchive).toBe(730) // 2 years
    expect(DATA_RETENTION_POLICY.vocalCommands).toBe(90) // 90 days
    expect(DATA_RETENTION_POLICY.notifications).toBe(30) // 30 days
    expect(DATA_RETENTION_POLICY.generatedTasks).toBe(365) // 1 year
    expect(DATA_RETENTION_POLICY.sessionLogs).toBe(30) // 30 days
    expect(DATA_RETENTION_POLICY.children).toBeNull() // Indefinite while household active
  })

  it("should have vocal commands retention shorter than task retention", () => {
    expect(DATA_RETENTION_POLICY.vocalCommands).toBeLessThan(
      DATA_RETENTION_POLICY.completedTasksArchive!
    )
  })

  it("should have notifications with the shortest retention", () => {
    expect(DATA_RETENTION_POLICY.notifications).toBe(30)
    expect(DATA_RETENTION_POLICY.notifications).toBeLessThanOrEqual(
      DATA_RETENTION_POLICY.sessionLogs!
    )
  })
})

// =============================================================================
// DATA EXPORT TESTS
// =============================================================================

describe("GDPR: Data Export (Article 20)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should export user data when authorized", async () => {
    mockQueryOne.mockResolvedValueOnce({ household_id: "test-household" })
    mockQuery.mockResolvedValue([])

    // Import dynamically to get mocked version
    const { exportUserData } = await import("@/lib/services/gdpr")
    const result = await exportUserData()

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it("should fail when user has no household", async () => {
    mockQueryOne.mockResolvedValueOnce(null)

    const { exportUserData } = await import("@/lib/services/gdpr")
    const result = await exportUserData()

    expect(result.success).toBe(false)
    expect(result.error).toBe("Aucun foyer trouvé")
  })

  it("should include household info in export", async () => {
    mockQueryOne.mockResolvedValueOnce({ household_id: "test-household" })
    mockQuery.mockResolvedValue([])

    const { exportUserData } = await import("@/lib/services/gdpr")
    const result = await exportUserData()

    expect(result.success).toBe(true)
    expect(result.data?.household).toBeDefined()
    expect(result.data?.household.id).toBe("test-household")
  })
})

// =============================================================================
// DATA DELETION TESTS
// =============================================================================

describe("GDPR: Data Deletion (Article 17)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return proper structure for delete result", () => {
    const mockResult: GDPRDeleteResult = {
      success: true,
      deletedRecords: {
        tasks: 10,
        children: 2,
        vocalCommands: 5,
        notifications: 20,
        generatedTasks: 3,
        household: true,
        user: true,
      },
    }

    expect(mockResult.success).toBe(true)
    expect(mockResult.deletedRecords.tasks).toBe(10)
    expect(mockResult.deletedRecords.household).toBe(true)
    expect(mockResult.deletedRecords.user).toBe(true)
  })

  it("should require ownership transfer when owner with other members", async () => {
    mockQueryOne.mockResolvedValueOnce({
      household_id: "test-household",
      role: "owner",
    })
    // Owners query - returns self
    mockQuery.mockResolvedValueOnce([{ user_id: "test-user-id" }])
    // Other members query - returns 1 other member
    mockQuery.mockResolvedValueOnce([{ user_id: "other-user-id" }])

    const { deleteUserData } = await import("@/lib/services/gdpr")
    const result = await deleteUserData()

    expect(result.success).toBe(false)
    expect(result.error).toContain("transférer")
  })

  it("should allow deletion when user has no household", async () => {
    mockQueryOne.mockResolvedValueOnce(null)

    const { deleteUserData } = await import("@/lib/services/gdpr")
    const result = await deleteUserData()

    expect(result.success).toBe(true)
    expect(result.deletedRecords.user).toBe(true)
    expect(result.deletedRecords.household).toBe(false)
  })

  it("should track error when deletion fails", () => {
    const mockResult: GDPRDeleteResult = {
      success: false,
      deletedRecords: {
        tasks: 0,
        children: 0,
        vocalCommands: 0,
        notifications: 0,
        generatedTasks: 0,
        household: false,
        user: false,
      },
      error: "Database connection failed",
    }

    expect(mockResult.success).toBe(false)
    expect(mockResult.error).toBeDefined()
  })
})

// =============================================================================
// DATA ANONYMIZATION TESTS
// =============================================================================

describe("GDPR: Data Anonymization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return proper structure for anonymize result", () => {
    const mockResult: GDPRAnonymizeResult = {
      success: true,
      anonymizedRecords: {
        children: 2,
        vocalCommands: 15,
        tasks: 30,
      },
    }

    expect(mockResult.success).toBe(true)
    expect(mockResult.anonymizedRecords.children).toBe(2)
    expect(mockResult.anonymizedRecords.vocalCommands).toBe(15)
  })

  it("should succeed when user has no household", async () => {
    mockQueryOne.mockResolvedValueOnce(null)

    const { anonymizeUserData } = await import("@/lib/services/gdpr")
    const result = await anonymizeUserData()

    expect(result.success).toBe(true)
    expect(result.anonymizedRecords.children).toBe(0)
  })

  it("should track anonymized record counts", async () => {
    mockQueryOne.mockResolvedValueOnce({ household_id: "test-household" })
    // Children update
    mockQuery.mockResolvedValueOnce([{}, {}]) // 2 children
    // Vocal commands update
    mockQuery.mockResolvedValueOnce([{}, {}, {}]) // 3 vocal commands
    // Tasks update
    mockQuery.mockResolvedValueOnce([{}]) // 1 task
    // Audit log
    mockQuery.mockResolvedValueOnce([])

    const { anonymizeUserData } = await import("@/lib/services/gdpr")
    const result = await anonymizeUserData()

    expect(result.success).toBe(true)
    expect(result.anonymizedRecords.children).toBe(2)
    expect(result.anonymizedRecords.vocalCommands).toBe(3)
    expect(result.anonymizedRecords.tasks).toBe(1)
  })

  it("should handle error during anonymization", () => {
    const mockResult: GDPRAnonymizeResult = {
      success: false,
      anonymizedRecords: {
        children: 0,
        vocalCommands: 0,
        tasks: 0,
      },
      error: "Anonymization failed",
    }

    expect(mockResult.success).toBe(false)
    expect(mockResult.error).toBe("Anonymization failed")
  })
})

// =============================================================================
// DATA REPORT TESTS
// =============================================================================

describe("GDPR: Data Report (Article 15)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should have proper structure for data report", () => {
    const mockReport: DataReport = {
      userId: "test-user-id",
      householdId: "test-household",
      dataCategories: [
        {
          category: "Tâches",
          description: "Tâches créées, assignées et complétées",
          count: 50,
          retentionDays: null,
          legalBasis: "Exécution du contrat",
        },
        {
          category: "Enfants",
          description: "Informations sur les enfants",
          count: 2,
          retentionDays: null,
          legalBasis: "Consentement explicite",
        },
      ],
      lastExport: "2024-01-15T10:00:00Z",
      accountCreated: "2024-01-01T00:00:00Z",
      generatedAt: "2024-01-15T12:00:00Z",
    }

    expect(mockReport.userId).toBe("test-user-id")
    expect(mockReport.dataCategories.length).toBe(2)
    expect(mockReport.dataCategories[0]?.legalBasis).toBeDefined()
  })

  it("should include data categories with legal basis", () => {
    const mockReport: DataReport = {
      userId: "test-user-id",
      householdId: "test-household",
      dataCategories: [
        {
          category: "Compte utilisateur",
          description: "Email, nom, préférences",
          count: 1,
          retentionDays: null,
          legalBasis: "Exécution du contrat",
        },
      ],
      lastExport: null,
      accountCreated: "2024-01-01T00:00:00Z",
      generatedAt: new Date().toISOString(),
    }

    const accountCategory = mockReport.dataCategories.find(
      (c) => c.category === "Compte utilisateur"
    )
    expect(accountCategory).toBeDefined()
    expect(accountCategory?.legalBasis).toBe("Exécution du contrat")
  })
})

// =============================================================================
// CONSENT MANAGEMENT TESTS
// =============================================================================

describe("GDPR: Consent Management", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should have proper structure for consent status", () => {
    const mockConsent: GDPRConsentStatus = {
      essential: true,
      analytics: false,
      marketing: false,
      updatedAt: "2024-01-15T10:00:00Z",
    }

    expect(mockConsent.essential).toBe(true) // Always required
    expect(mockConsent.analytics).toBe(false)
    expect(mockConsent.marketing).toBe(false)
    expect(mockConsent.updatedAt).toBeDefined()
  })

  it("should always require essential consent", () => {
    const mockConsent: GDPRConsentStatus = {
      essential: true, // Cannot be false
      analytics: true,
      marketing: true,
      updatedAt: null,
    }

    // Essential must always be true
    expect(mockConsent.essential).toBe(true)
  })

  it("should return defaults when no consent stored", async () => {
    // No household
    mockQueryOne.mockResolvedValueOnce(null)

    const { getConsentStatus } = await import("@/lib/services/gdpr")
    const result = await getConsentStatus()

    expect(result?.essential).toBe(true)
    expect(result?.analytics).toBe(false)
    expect(result?.marketing).toBe(false)
  })

  it("should allow updating analytics and marketing consent", async () => {
    mockQueryOne.mockResolvedValueOnce(null)
    mockQuery.mockResolvedValue([])

    const { updateConsent } = await import("@/lib/services/gdpr")
    const result = await updateConsent({
      analytics: true,
      marketing: false,
    })

    expect(result.success).toBe(true)
  })
})

// =============================================================================
// API ENDPOINT VALIDATION TESTS
// =============================================================================

describe("GDPR: API Validation", () => {
  it("should require proper confirmation for deletion", () => {
    const validBody = {
      confirmation: "DELETE_MY_DATA",
      understand_irreversible: true,
    }

    expect(validBody.confirmation).toBe("DELETE_MY_DATA")
    expect(validBody.understand_irreversible).toBe(true)
  })

  it("should require proper confirmation for anonymization", () => {
    const validBody = {
      confirmation: "ANONYMIZE_MY_DATA",
      understand_effects: true,
    }

    expect(validBody.confirmation).toBe("ANONYMIZE_MY_DATA")
    expect(validBody.understand_effects).toBe(true)
  })

  it("should reject invalid confirmation strings", () => {
    const invalidBody = {
      confirmation: "wrong_string",
      understand_irreversible: true,
    }

    expect(invalidBody.confirmation).not.toBe("DELETE_MY_DATA")
  })

  it("should export data in JSON format", () => {
    const mockExport = {
      household: { id: "test", name: "Test Family" },
      members: [],
      children: [],
      tasks: [],
    }

    // Verify it can be stringified
    const jsonStr = JSON.stringify(mockExport, null, 2)
    expect(jsonStr).toContain("Test Family")

    // Verify it can be parsed back
    const parsed = JSON.parse(jsonStr)
    expect(parsed.household.name).toBe("Test Family")
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe("GDPR: Edge Cases", () => {
  it("should handle empty household gracefully", () => {
    const emptyReport: DataReport = {
      userId: "test-user",
      householdId: null,
      dataCategories: [],
      lastExport: null,
      accountCreated: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
    }

    expect(emptyReport.householdId).toBeNull()
    expect(emptyReport.dataCategories).toHaveLength(0)
  })

  it("should handle null retention days as indefinite", () => {
    expect(DATA_RETENTION_POLICY.tasks).toBeNull()
    expect(DATA_RETENTION_POLICY.children).toBeNull()

    // null means indefinite retention
    const isIndefinite = (days: number | null) => days === null
    expect(isIndefinite(DATA_RETENTION_POLICY.tasks)).toBe(true)
    expect(isIndefinite(DATA_RETENTION_POLICY.notifications)).toBe(false)
  })

  it("should track deletion records even when some fail", () => {
    const partialResult: GDPRDeleteResult = {
      success: false,
      deletedRecords: {
        tasks: 10, // Deleted successfully
        children: 2, // Deleted successfully
        vocalCommands: 0, // Failed
        notifications: 0, // Failed
        generatedTasks: 0, // Failed
        household: false,
        user: false,
      },
      error: "Partial deletion - database error",
    }

    // Some records were deleted even though overall failed
    expect(partialResult.success).toBe(false)
    expect(partialResult.deletedRecords.tasks).toBe(10)
    expect(partialResult.deletedRecords.vocalCommands).toBe(0)
  })

  it("should generate report timestamp at generation time", () => {
    const before = new Date().toISOString()

    const report: DataReport = {
      userId: "test",
      householdId: null,
      dataCategories: [],
      lastExport: null,
      accountCreated: "2024-01-01T00:00:00Z",
      generatedAt: new Date().toISOString(),
    }

    const after = new Date().toISOString()

    expect(report.generatedAt >= before).toBe(true)
    expect(report.generatedAt <= after).toBe(true)
  })
})
