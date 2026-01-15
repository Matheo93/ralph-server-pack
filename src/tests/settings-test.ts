/**
 * Tests for Settings validations
 *
 * Run with: bun run src/tests/settings-test.ts
 *
 * These tests verify:
 * 1. Profile update validation
 * 2. Household update validation
 * 3. Notification preferences validation
 * 4. Delete account confirmation
 */

import {
  ProfileUpdateSchema,
  HouseholdUpdateSchema,
  NotificationPreferencesSchema,
  DeleteAccountSchema,
  TemplateToggleSchema,
  InviteMemberSchema,
  TransferAdminSchema,
  validateSettings,
} from "@/lib/validations/settings"

// Test utilities
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`)
  }
  console.log(`PASS: ${message}`)
}

function testGroup(name: string, fn: () => void): void {
  console.log(`\n=== ${name} ===`)
  try {
    fn()
  } catch (error) {
    console.error(`ERROR in ${name}:`, error)
    process.exitCode = 1
  }
}

// Tests
testGroup("ProfileUpdateSchema validation", () => {
  // Valid profile
  const validProfile = {
    name: "Jean Dupont",
    language: "fr",
    timezone: "Europe/Paris",
  }
  const result = ProfileUpdateSchema.safeParse(validProfile)
  assert(result.success === true, "Valid profile passes")

  // Null name (allowed)
  const nullName = { ...validProfile, name: null }
  const nullResult = ProfileUpdateSchema.safeParse(nullName)
  assert(nullResult.success === true, "Null name is allowed")

  // Empty name becomes null implicitly handled
  const emptyName = { ...validProfile, name: "" }
  const emptyResult = ProfileUpdateSchema.safeParse(emptyName)
  assert(emptyResult.success === true, "Empty name passes (trimmed to null in action)")

  // Invalid language
  const invalidLang = { ...validProfile, language: "de" }
  const langResult = ProfileUpdateSchema.safeParse(invalidLang)
  assert(langResult.success === false, "Invalid language fails")

  // Name too long
  const longName = { ...validProfile, name: "a".repeat(101) }
  const longResult = ProfileUpdateSchema.safeParse(longName)
  assert(longResult.success === false, "Name > 100 chars fails")
})

testGroup("HouseholdUpdateSchema validation", () => {
  // Valid household
  const validHousehold = {
    name: "Famille Dupont",
    country: "FR",
    timezone: "Europe/Paris",
  }
  const result = HouseholdUpdateSchema.safeParse(validHousehold)
  assert(result.success === true, "Valid household passes")

  // Empty name (required)
  const emptyName = { ...validHousehold, name: "" }
  const emptyResult = HouseholdUpdateSchema.safeParse(emptyName)
  assert(emptyResult.success === false, "Empty name fails")

  // Valid countries
  for (const country of ["FR", "BE", "CH", "CA", "LU"]) {
    const countryData = { ...validHousehold, country }
    const countryResult = HouseholdUpdateSchema.safeParse(countryData)
    assert(countryResult.success === true, `Country ${country} is valid`)
  }

  // Invalid country
  const invalidCountry = { ...validHousehold, country: "US" }
  const usResult = HouseholdUpdateSchema.safeParse(invalidCountry)
  assert(usResult.success === false, "Invalid country fails")
})

testGroup("NotificationPreferencesSchema validation", () => {
  // Valid preferences
  const validPrefs = {
    push_enabled: true,
    email_enabled: false,
    daily_reminder_time: "08:00",
    reminder_before_deadline_hours: 24,
    weekly_summary_enabled: true,
    balance_alert_enabled: true,
  }
  const result = NotificationPreferencesSchema.safeParse(validPrefs)
  assert(result.success === true, "Valid preferences pass")

  // Null reminder time (allowed)
  const nullTime = { ...validPrefs, daily_reminder_time: null }
  const nullResult = NotificationPreferencesSchema.safeParse(nullTime)
  assert(nullResult.success === true, "Null reminder time allowed")

  // Valid time formats
  const validTimes = ["00:00", "08:30", "12:00", "23:59"]
  for (const time of validTimes) {
    const timeData = { ...validPrefs, daily_reminder_time: time }
    const timeResult = NotificationPreferencesSchema.safeParse(timeData)
    assert(timeResult.success === true, `Time ${time} is valid`)
  }

  // Invalid time formats
  const invalidTimes = ["24:00", "8:00", "08:60", "25:00", "invalid"]
  for (const time of invalidTimes) {
    const timeData = { ...validPrefs, daily_reminder_time: time }
    const timeResult = NotificationPreferencesSchema.safeParse(timeData)
    assert(timeResult.success === false, `Time ${time} is invalid`)
  }

  // Reminder hours boundaries
  const validHours = [1, 24, 48, 168]
  for (const hours of validHours) {
    const hoursData = { ...validPrefs, reminder_before_deadline_hours: hours }
    const hoursResult = NotificationPreferencesSchema.safeParse(hoursData)
    assert(hoursResult.success === true, `${hours} hours is valid`)
  }

  // Invalid reminder hours
  const invalidHours = [0, 169, -1]
  for (const hours of invalidHours) {
    const hoursData = { ...validPrefs, reminder_before_deadline_hours: hours }
    const hoursResult = NotificationPreferencesSchema.safeParse(hoursData)
    assert(hoursResult.success === false, `${hours} hours is invalid`)
  }
})

testGroup("DeleteAccountSchema validation", () => {
  // Correct confirmation
  const validDelete = { confirmation: "SUPPRIMER" }
  const result = DeleteAccountSchema.safeParse(validDelete)
  assert(result.success === true, "SUPPRIMER confirmation passes")

  // Wrong confirmation
  const wrongCases = ["supprimer", "SUPPRIMER ", "DELETE", "oui", ""]
  for (const conf of wrongCases) {
    const wrongDelete = { confirmation: conf }
    const wrongResult = DeleteAccountSchema.safeParse(wrongDelete)
    assert(wrongResult.success === false, `"${conf}" fails validation`)
  }
})

testGroup("TemplateToggleSchema validation", () => {
  // Valid toggle
  const validToggle = {
    template_id: "550e8400-e29b-41d4-a716-446655440000",
    is_enabled: true,
  }
  const result = TemplateToggleSchema.safeParse(validToggle)
  assert(result.success === true, "Valid toggle passes")

  // Invalid UUID
  const invalidUuid = { ...validToggle, template_id: "not-a-uuid" }
  const uuidResult = TemplateToggleSchema.safeParse(invalidUuid)
  assert(uuidResult.success === false, "Invalid UUID fails")

  // Missing is_enabled
  const missingEnabled = { template_id: "550e8400-e29b-41d4-a716-446655440000" }
  const enabledResult = TemplateToggleSchema.safeParse(missingEnabled)
  assert(enabledResult.success === false, "Missing is_enabled fails")
})

testGroup("InviteMemberSchema validation", () => {
  // Valid invite
  const validInvite = {
    email: "coparent@example.com",
    role: "member",
  }
  const result = InviteMemberSchema.safeParse(validInvite)
  assert(result.success === true, "Valid invite passes")

  // Invalid email
  const invalidEmail = { ...validInvite, email: "not-an-email" }
  const emailResult = InviteMemberSchema.safeParse(invalidEmail)
  assert(emailResult.success === false, "Invalid email fails")

  // Invalid role
  const invalidRole = { ...validInvite, role: "superadmin" }
  const roleResult = InviteMemberSchema.safeParse(invalidRole)
  assert(roleResult.success === false, "Invalid role fails")

  // Default role
  const noRole = { email: "coparent@example.com" }
  const defaultResult = InviteMemberSchema.safeParse(noRole)
  assert(defaultResult.success === true, "Default role is applied")
  if (defaultResult.success) {
    assert(defaultResult.data.role === "member", "Default role is 'member'")
  }
})

testGroup("TransferAdminSchema validation", () => {
  // Valid transfer
  const validTransfer = {
    new_admin_user_id: "550e8400-e29b-41d4-a716-446655440000",
    confirmation: "TRANSFERER",
  }
  const result = TransferAdminSchema.safeParse(validTransfer)
  assert(result.success === true, "Valid transfer passes")

  // Wrong confirmation
  const wrongConf = { ...validTransfer, confirmation: "transferer" }
  const confResult = TransferAdminSchema.safeParse(wrongConf)
  assert(confResult.success === false, "Wrong confirmation fails")

  // Invalid UUID
  const invalidUuid = { ...validTransfer, new_admin_user_id: "invalid" }
  const uuidResult = TransferAdminSchema.safeParse(invalidUuid)
  assert(uuidResult.success === false, "Invalid UUID fails")
})

testGroup("validateSettings helper", () => {
  // Success case
  const validData = { name: "Test", language: "fr", timezone: "Europe/Paris" }
  const successResult = validateSettings(ProfileUpdateSchema, validData)
  assert(successResult.success === true, "Helper returns success for valid data")
  if (successResult.success) {
    assert(successResult.data.name === "Test", "Helper returns parsed data")
  }

  // Failure case
  const invalidData = { name: "Test", language: "invalid", timezone: "Europe/Paris" }
  const failResult = validateSettings(ProfileUpdateSchema, invalidData)
  assert(failResult.success === false, "Helper returns failure for invalid data")
  if (!failResult.success) {
    assert(typeof failResult.error === "string", "Helper returns error message")
  }
})

console.log("\n=== All settings tests completed ===\n")
