/**
 * Notification Templates
 *
 * Multi-language notification templates with dynamic content interpolation.
 * Features:
 * - Template management
 * - Dynamic variable substitution
 * - Action buttons configuration
 * - Deep linking support
 * - Localization
 */

import { z } from "zod"

// =============================================================================
// TYPES
// =============================================================================

export type TemplateCategory =
  | "task_reminder"
  | "task_assigned"
  | "task_completed"
  | "deadline_approaching"
  | "deadline_missed"
  | "household_invite"
  | "member_joined"
  | "streak_alert"
  | "load_balance"
  | "system"

export type SupportedLanguage = "fr" | "en" | "es" | "de" | "it" | "pt"

export interface NotificationAction {
  id: string
  title: string
  action: string // Deep link or action identifier
  icon?: string
  destructive?: boolean
}

export interface TemplateContent {
  title: string
  body: string
  actions?: NotificationAction[]
  imageUrl?: string
  sound?: string
  badge?: number
}

export interface NotificationTemplate {
  id: string
  category: TemplateCategory
  name: string
  description: string
  content: Record<SupportedLanguage, TemplateContent>
  variables: string[]
  defaultLanguage: SupportedLanguage
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TemplateStore {
  templates: Map<string, NotificationTemplate>
  byCategory: Map<TemplateCategory, Set<string>>
}

export interface RenderedNotification {
  title: string
  body: string
  actions?: NotificationAction[]
  imageUrl?: string
  sound?: string
  badge?: number
  deepLink?: string
}

// =============================================================================
// TEMPLATE STORE MANAGEMENT
// =============================================================================

export function createTemplateStore(): TemplateStore {
  const store: TemplateStore = {
    templates: new Map(),
    byCategory: new Map(),
  }

  // Initialize with default templates
  return addDefaultTemplates(store)
}

export function addTemplate(
  store: TemplateStore,
  template: NotificationTemplate
): TemplateStore {
  const newTemplates = new Map(store.templates)
  newTemplates.set(template.id, template)

  const newByCategory = new Map(store.byCategory)
  const categoryTemplates = new Set(newByCategory.get(template.category) ?? [])
  categoryTemplates.add(template.id)
  newByCategory.set(template.category, categoryTemplates)

  return {
    templates: newTemplates,
    byCategory: newByCategory,
  }
}

export function updateTemplate(
  store: TemplateStore,
  templateId: string,
  updates: Partial<Omit<NotificationTemplate, "id" | "createdAt">>
): TemplateStore {
  const template = store.templates.get(templateId)
  if (!template) return store

  const updatedTemplate: NotificationTemplate = {
    ...template,
    ...updates,
    updatedAt: new Date(),
  }

  const newTemplates = new Map(store.templates)
  newTemplates.set(templateId, updatedTemplate)

  return {
    ...store,
    templates: newTemplates,
  }
}

export function removeTemplate(
  store: TemplateStore,
  templateId: string
): TemplateStore {
  const template = store.templates.get(templateId)
  if (!template) return store

  const newTemplates = new Map(store.templates)
  newTemplates.delete(templateId)

  const newByCategory = new Map(store.byCategory)
  const categoryTemplates = new Set(newByCategory.get(template.category) ?? [])
  categoryTemplates.delete(templateId)
  newByCategory.set(template.category, categoryTemplates)

  return {
    templates: newTemplates,
    byCategory: newByCategory,
  }
}

// =============================================================================
// TEMPLATE RENDERING
// =============================================================================

export function renderTemplate(
  template: NotificationTemplate,
  variables: Record<string, string>,
  language: SupportedLanguage = "fr"
): RenderedNotification {
  const content = template.content[language] ?? template.content[template.defaultLanguage]

  if (!content) {
    throw new Error(`No content found for template ${template.id} in language ${language}`)
  }

  return {
    title: interpolateString(content.title, variables),
    body: interpolateString(content.body, variables),
    actions: content.actions?.map(action => ({
      ...action,
      action: interpolateString(action.action, variables),
      title: interpolateString(action.title, variables),
    })),
    imageUrl: content.imageUrl ? interpolateString(content.imageUrl, variables) : undefined,
    sound: content.sound,
    badge: content.badge,
    deepLink: variables["deepLink"],
  }
}

export function interpolateString(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match
  })
}

export function validateVariables(
  template: NotificationTemplate,
  variables: Record<string, string>
): { valid: boolean; missing: string[] } {
  const missing = template.variables.filter(v => !(v in variables))
  return {
    valid: missing.length === 0,
    missing,
  }
}

// =============================================================================
// TEMPLATE LOOKUP
// =============================================================================

export function getTemplate(
  store: TemplateStore,
  templateId: string
): NotificationTemplate | undefined {
  return store.templates.get(templateId)
}

export function getTemplatesByCategory(
  store: TemplateStore,
  category: TemplateCategory
): NotificationTemplate[] {
  const ids = store.byCategory.get(category) ?? new Set()
  return Array.from(ids)
    .map(id => store.templates.get(id))
    .filter((t): t is NotificationTemplate => t !== undefined && t.enabled)
}

export function getEnabledTemplates(store: TemplateStore): NotificationTemplate[] {
  return Array.from(store.templates.values()).filter(t => t.enabled)
}

// =============================================================================
// DEEP LINK BUILDING
// =============================================================================

export type DeepLinkScreen =
  | "task"
  | "tasks"
  | "household"
  | "child"
  | "settings"
  | "charge"
  | "dashboard"

export interface DeepLinkParams {
  screen: DeepLinkScreen
  id?: string
  action?: string
  params?: Record<string, string>
}

export function buildDeepLink(params: DeepLinkParams): string {
  const { screen, id, action, params: queryParams } = params
  let path = `familyload://${screen}`

  if (id) {
    path += `/${id}`
  }

  if (action) {
    path += `/${action}`
  }

  if (queryParams && Object.keys(queryParams).length > 0) {
    const query = new URLSearchParams(queryParams).toString()
    path += `?${query}`
  }

  return path
}

export function buildTaskDeepLink(taskId: string, action?: "view" | "complete" | "edit"): string {
  return buildDeepLink({ screen: "task", id: taskId, action })
}

export function buildHouseholdDeepLink(householdId: string): string {
  return buildDeepLink({ screen: "household", id: householdId })
}

export function buildChargeDeepLink(): string {
  return buildDeepLink({ screen: "charge" })
}

// =============================================================================
// ACTION BUTTON HELPERS
// =============================================================================

export function createAction(
  id: string,
  title: string,
  deepLink: string,
  options?: { icon?: string; destructive?: boolean }
): NotificationAction {
  return {
    id,
    title,
    action: deepLink,
    icon: options?.icon,
    destructive: options?.destructive,
  }
}

export function createMarkDoneAction(taskId: string): NotificationAction {
  return createAction(
    "mark_done",
    "Fait",
    buildTaskDeepLink(taskId, "complete"),
    { icon: "checkmark" }
  )
}

export function createSnoozeAction(taskId: string): NotificationAction {
  return createAction(
    "snooze",
    "Reporter",
    `familyload://snooze/${taskId}`,
    { icon: "clock" }
  )
}

export function createViewAction(taskId: string): NotificationAction {
  return createAction(
    "view",
    "Voir",
    buildTaskDeepLink(taskId, "view"),
    { icon: "eye" }
  )
}

// =============================================================================
// DEFAULT TEMPLATES
// =============================================================================

function addDefaultTemplates(store: TemplateStore): TemplateStore {
  const now = new Date()

  const defaultTemplates: NotificationTemplate[] = [
    {
      id: "task_reminder_default",
      category: "task_reminder",
      name: "Rappel de tâche standard",
      description: "Rappel standard pour une tâche à faire",
      variables: ["taskName", "taskId", "deadline"],
      defaultLanguage: "fr",
      enabled: true,
      createdAt: now,
      updatedAt: now,
      content: {
        fr: {
          title: "Rappel: {{taskName}}",
          body: "N'oubliez pas de terminer cette tâche",
          actions: [
            createMarkDoneAction("{{taskId}}"),
            createSnoozeAction("{{taskId}}"),
          ],
          sound: "default",
        },
        en: {
          title: "Reminder: {{taskName}}",
          body: "Don't forget to complete this task",
          actions: [
            { ...createMarkDoneAction("{{taskId}}"), title: "Done" },
            { ...createSnoozeAction("{{taskId}}"), title: "Snooze" },
          ],
          sound: "default",
        },
        es: {
          title: "Recordatorio: {{taskName}}",
          body: "No olvides completar esta tarea",
          actions: [
            { ...createMarkDoneAction("{{taskId}}"), title: "Hecho" },
            { ...createSnoozeAction("{{taskId}}"), title: "Posponer" },
          ],
          sound: "default",
        },
        de: {
          title: "Erinnerung: {{taskName}}",
          body: "Vergessen Sie nicht, diese Aufgabe zu erledigen",
          actions: [
            { ...createMarkDoneAction("{{taskId}}"), title: "Erledigt" },
            { ...createSnoozeAction("{{taskId}}"), title: "Zurückstellen" },
          ],
          sound: "default",
        },
        it: {
          title: "Promemoria: {{taskName}}",
          body: "Non dimenticare di completare questa attività",
          actions: [
            { ...createMarkDoneAction("{{taskId}}"), title: "Fatto" },
            { ...createSnoozeAction("{{taskId}}"), title: "Posticipa" },
          ],
          sound: "default",
        },
        pt: {
          title: "Lembrete: {{taskName}}",
          body: "Não esqueça de completar esta tarefa",
          actions: [
            { ...createMarkDoneAction("{{taskId}}"), title: "Feito" },
            { ...createSnoozeAction("{{taskId}}"), title: "Adiar" },
          ],
          sound: "default",
        },
      },
    },
    {
      id: "task_assigned_default",
      category: "task_assigned",
      name: "Tâche assignée",
      description: "Notification quand une tâche est assignée à un membre",
      variables: ["taskName", "taskId", "assignedBy"],
      defaultLanguage: "fr",
      enabled: true,
      createdAt: now,
      updatedAt: now,
      content: {
        fr: {
          title: "Nouvelle tâche: {{taskName}}",
          body: "{{assignedBy}} vous a assigné cette tâche",
          actions: [createViewAction("{{taskId}}")],
          sound: "default",
        },
        en: {
          title: "New task: {{taskName}}",
          body: "{{assignedBy}} assigned you this task",
          actions: [{ ...createViewAction("{{taskId}}"), title: "View" }],
          sound: "default",
        },
        es: {
          title: "Nueva tarea: {{taskName}}",
          body: "{{assignedBy}} te asignó esta tarea",
          actions: [{ ...createViewAction("{{taskId}}"), title: "Ver" }],
          sound: "default",
        },
        de: {
          title: "Neue Aufgabe: {{taskName}}",
          body: "{{assignedBy}} hat Ihnen diese Aufgabe zugewiesen",
          actions: [{ ...createViewAction("{{taskId}}"), title: "Ansehen" }],
          sound: "default",
        },
        it: {
          title: "Nuova attività: {{taskName}}",
          body: "{{assignedBy}} ti ha assegnato questa attività",
          actions: [{ ...createViewAction("{{taskId}}"), title: "Vedi" }],
          sound: "default",
        },
        pt: {
          title: "Nova tarefa: {{taskName}}",
          body: "{{assignedBy}} atribuiu esta tarefa a você",
          actions: [{ ...createViewAction("{{taskId}}"), title: "Ver" }],
          sound: "default",
        },
      },
    },
    {
      id: "deadline_approaching_default",
      category: "deadline_approaching",
      name: "Échéance proche",
      description: "Alerte quand une échéance approche",
      variables: ["taskName", "taskId", "timeRemaining"],
      defaultLanguage: "fr",
      enabled: true,
      createdAt: now,
      updatedAt: now,
      content: {
        fr: {
          title: "Échéance proche!",
          body: "{{taskName}} doit être terminé {{timeRemaining}}",
          actions: [
            createMarkDoneAction("{{taskId}}"),
            createViewAction("{{taskId}}"),
          ],
          sound: "urgent",
        },
        en: {
          title: "Deadline approaching!",
          body: "{{taskName}} must be completed {{timeRemaining}}",
          actions: [
            { ...createMarkDoneAction("{{taskId}}"), title: "Done" },
            { ...createViewAction("{{taskId}}"), title: "View" },
          ],
          sound: "urgent",
        },
        es: {
          title: "¡Fecha límite cercana!",
          body: "{{taskName}} debe completarse {{timeRemaining}}",
          actions: [
            { ...createMarkDoneAction("{{taskId}}"), title: "Hecho" },
            { ...createViewAction("{{taskId}}"), title: "Ver" },
          ],
          sound: "urgent",
        },
        de: {
          title: "Frist naht!",
          body: "{{taskName}} muss {{timeRemaining}} erledigt werden",
          actions: [
            { ...createMarkDoneAction("{{taskId}}"), title: "Erledigt" },
            { ...createViewAction("{{taskId}}"), title: "Ansehen" },
          ],
          sound: "urgent",
        },
        it: {
          title: "Scadenza imminente!",
          body: "{{taskName}} deve essere completato {{timeRemaining}}",
          actions: [
            { ...createMarkDoneAction("{{taskId}}"), title: "Fatto" },
            { ...createViewAction("{{taskId}}"), title: "Vedi" },
          ],
          sound: "urgent",
        },
        pt: {
          title: "Prazo chegando!",
          body: "{{taskName}} deve ser concluído {{timeRemaining}}",
          actions: [
            { ...createMarkDoneAction("{{taskId}}"), title: "Feito" },
            { ...createViewAction("{{taskId}}"), title: "Ver" },
          ],
          sound: "urgent",
        },
      },
    },
    {
      id: "load_balance_alert",
      category: "load_balance",
      name: "Alerte de répartition",
      description: "Alerte quand la charge est déséquilibrée",
      variables: ["percentage", "period"],
      defaultLanguage: "fr",
      enabled: true,
      createdAt: now,
      updatedAt: now,
      content: {
        fr: {
          title: "Charge mentale déséquilibrée",
          body: "Cette {{period}}, vous portez {{percentage}}% de la charge familiale",
          actions: [
            { id: "view_charge", title: "Voir détails", action: buildChargeDeepLink() },
          ],
          sound: "default",
        },
        en: {
          title: "Mental load imbalance",
          body: "This {{period}}, you're carrying {{percentage}}% of the family load",
          actions: [
            { id: "view_charge", title: "View details", action: buildChargeDeepLink() },
          ],
          sound: "default",
        },
        es: {
          title: "Carga mental desequilibrada",
          body: "Esta {{period}}, llevas el {{percentage}}% de la carga familiar",
          actions: [
            { id: "view_charge", title: "Ver detalles", action: buildChargeDeepLink() },
          ],
          sound: "default",
        },
        de: {
          title: "Mentale Last unausgeglichen",
          body: "Diese {{period}} tragen Sie {{percentage}}% der Familienlast",
          actions: [
            { id: "view_charge", title: "Details ansehen", action: buildChargeDeepLink() },
          ],
          sound: "default",
        },
        it: {
          title: "Carico mentale sbilanciato",
          body: "Questa {{period}}, stai portando il {{percentage}}% del carico familiare",
          actions: [
            { id: "view_charge", title: "Vedi dettagli", action: buildChargeDeepLink() },
          ],
          sound: "default",
        },
        pt: {
          title: "Carga mental desequilibrada",
          body: "Este/a {{period}}, você está carregando {{percentage}}% da carga familiar",
          actions: [
            { id: "view_charge", title: "Ver detalhes", action: buildChargeDeepLink() },
          ],
          sound: "default",
        },
      },
    },
    {
      id: "streak_at_risk",
      category: "streak_alert",
      name: "Streak en danger",
      description: "Alerte quand le streak est menacé",
      variables: ["currentStreak", "tasksRemaining"],
      defaultLanguage: "fr",
      enabled: true,
      createdAt: now,
      updatedAt: now,
      content: {
        fr: {
          title: "Streak en danger! 🔥",
          body: "Il reste {{tasksRemaining}} tâche(s) pour maintenir votre streak de {{currentStreak}} jours",
          sound: "urgent",
        },
        en: {
          title: "Streak at risk! 🔥",
          body: "{{tasksRemaining}} task(s) remaining to keep your {{currentStreak}}-day streak",
          sound: "urgent",
        },
        es: {
          title: "¡Racha en peligro! 🔥",
          body: "Quedan {{tasksRemaining}} tarea(s) para mantener tu racha de {{currentStreak}} días",
          sound: "urgent",
        },
        de: {
          title: "Serie in Gefahr! 🔥",
          body: "Noch {{tasksRemaining}} Aufgabe(n) um Ihre {{currentStreak}}-Tage-Serie zu halten",
          sound: "urgent",
        },
        it: {
          title: "Serie a rischio! 🔥",
          body: "Rimangono {{tasksRemaining}} attività per mantenere la serie di {{currentStreak}} giorni",
          sound: "urgent",
        },
        pt: {
          title: "Sequência em risco! 🔥",
          body: "Restam {{tasksRemaining}} tarefa(s) para manter sua sequência de {{currentStreak}} dias",
          sound: "urgent",
        },
      },
    },
    {
      id: "household_invite_default",
      category: "household_invite",
      name: "Invitation au foyer",
      description: "Invitation à rejoindre un foyer",
      variables: ["inviterName", "householdName", "inviteLink"],
      defaultLanguage: "fr",
      enabled: true,
      createdAt: now,
      updatedAt: now,
      content: {
        fr: {
          title: "Invitation à rejoindre un foyer",
          body: "{{inviterName}} vous invite à rejoindre le foyer {{householdName}}",
          actions: [
            { id: "accept", title: "Accepter", action: "{{inviteLink}}" },
          ],
          sound: "default",
        },
        en: {
          title: "Household invitation",
          body: "{{inviterName}} invites you to join {{householdName}}",
          actions: [
            { id: "accept", title: "Accept", action: "{{inviteLink}}" },
          ],
          sound: "default",
        },
        es: {
          title: "Invitación al hogar",
          body: "{{inviterName}} te invita a unirte a {{householdName}}",
          actions: [
            { id: "accept", title: "Aceptar", action: "{{inviteLink}}" },
          ],
          sound: "default",
        },
        de: {
          title: "Haushaltseinladung",
          body: "{{inviterName}} lädt Sie ein, {{householdName}} beizutreten",
          actions: [
            { id: "accept", title: "Annehmen", action: "{{inviteLink}}" },
          ],
          sound: "default",
        },
        it: {
          title: "Invito a unirsi alla famiglia",
          body: "{{inviterName}} ti invita a unirti a {{householdName}}",
          actions: [
            { id: "accept", title: "Accetta", action: "{{inviteLink}}" },
          ],
          sound: "default",
        },
        pt: {
          title: "Convite para família",
          body: "{{inviterName}} convida você para participar de {{householdName}}",
          actions: [
            { id: "accept", title: "Aceitar", action: "{{inviteLink}}" },
          ],
          sound: "default",
        },
      },
    },
  ]

  let updatedStore = store
  for (const template of defaultTemplates) {
    updatedStore = addTemplate(updatedStore, template)
  }

  return updatedStore
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function createCustomTemplate(
  category: TemplateCategory,
  name: string,
  description: string,
  content: Record<SupportedLanguage, TemplateContent>,
  variables: string[]
): NotificationTemplate {
  const now = new Date()
  return {
    id: `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    category,
    name,
    description,
    content,
    variables,
    defaultLanguage: "fr",
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }
}

export function cloneTemplate(
  template: NotificationTemplate,
  newName: string
): NotificationTemplate {
  const now = new Date()
  return {
    ...template,
    id: `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: newName,
    createdAt: now,
    updatedAt: now,
  }
}

export function getAvailableLanguages(): SupportedLanguage[] {
  return ["fr", "en", "es", "de", "it", "pt"]
}

export function getLanguageName(lang: SupportedLanguage): string {
  const names: Record<SupportedLanguage, string> = {
    fr: "Français",
    en: "English",
    es: "Español",
    de: "Deutsch",
    it: "Italiano",
    pt: "Português",
  }
  return names[lang]
}
