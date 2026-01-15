/**
 * Task Templates - Sprint 21 Phase 2
 *
 * Defines automatic task templates with:
 * - Age ranges for child-based triggering
 * - Country-specific templates (FR, BE, CH, CA)
 * - Category mapping to existing task categories
 * - Charge weight definitions for load distribution
 * - Recurrence patterns for recurring tasks
 *
 * Functional, immutable pattern with Zod validation.
 */

import { z } from "zod";

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Supported countries for templates
 */
export const CountryCodeSchema = z.enum(['FR', 'BE', 'CH', 'CA', 'GENERIC']);
export type CountryCode = z.infer<typeof CountryCodeSchema>;

/**
 * Task template categories
 */
export const TemplateCategorySchema = z.enum([
  'health',        // Medical appointments, vaccines
  'education',     // School-related tasks
  'administrative', // Paperwork, registrations
  'social',        // Events, activities
  'finance',       // Payments, subscriptions
  'transport',     // School runs, activities
  'seasonal'       // Period-specific tasks
]);
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;

/**
 * Priority levels
 */
export const TemplatePrioritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type TemplatePriority = z.infer<typeof TemplatePrioritySchema>;

/**
 * Age range for template applicability
 */
export const AgeRangeSchema = z.object({
  minMonths: z.number().min(0),           // Minimum age in months
  maxMonths: z.number().max(216),         // Maximum age (18 years = 216 months)
  exactMonths: z.number().optional(),     // Exact age trigger (e.g., vaccine at 12 months)
  description: z.string()                 // Human-readable age description
});
export type AgeRange = z.infer<typeof AgeRangeSchema>;

/**
 * Charge weight for load calculation
 */
export const ChargeWeightTemplateSchema = z.object({
  mental: z.number().min(1).max(5),       // Mental/planning effort
  time: z.number().min(1).max(5),         // Time required
  emotional: z.number().min(1).max(5),    // Emotional effort
  physical: z.number().min(1).max(5)      // Physical effort
});
export type ChargeWeightTemplate = z.infer<typeof ChargeWeightTemplateSchema>;

/**
 * Recurrence pattern
 */
export const RecurrencePatternSchema = z.enum([
  'once',           // One-time task
  'yearly',         // Annual recurrence
  'semester',       // Twice a year
  'quarterly',      // Four times a year
  'monthly',        // Monthly
  'weekly',         // Weekly
  'custom'          // Custom pattern
]);
export type RecurrencePattern = z.infer<typeof RecurrencePatternSchema>;

/**
 * Localized string type
 */
export type LocalizedStrings = Record<string, string>;

/**
 * Task template definition
 */
export type TaskTemplate = {
  id: string;
  slug: string;
  titleTemplate: LocalizedStrings;
  descriptionTemplate?: LocalizedStrings;
  category: TemplateCategory;
  priority: TemplatePriority;
  ageRange: AgeRange;
  chargeWeight: ChargeWeightTemplate;
  recurrence: RecurrencePattern;
  countries: CountryCode[];
  triggerMonth?: number;
  triggerDayOfMonth?: number;
  leadDays: number;
  tags: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Template store (immutable)
 */
export const TemplateStoreSchema = z.object({
  templates: z.map(z.string(), TaskTemplateSchema),
  byCategory: z.map(TemplateCategorySchema, z.array(z.string())),
  byCountry: z.map(CountryCodeSchema, z.array(z.string())),
  lastUpdated: z.date()
});
export type TemplateStore = z.infer<typeof TemplateStoreSchema>;

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Age conversion helpers
 */
export const AGE_IN_MONTHS = {
  BIRTH: 0,
  ONE_MONTH: 1,
  TWO_MONTHS: 2,
  THREE_MONTHS: 3,
  FOUR_MONTHS: 4,
  SIX_MONTHS: 6,
  NINE_MONTHS: 9,
  ONE_YEAR: 12,
  EIGHTEEN_MONTHS: 18,
  TWO_YEARS: 24,
  THREE_YEARS: 36,
  FOUR_YEARS: 48,
  FIVE_YEARS: 60,
  SIX_YEARS: 72,
  SEVEN_YEARS: 84,
  EIGHT_YEARS: 96,
  NINE_YEARS: 108,
  TEN_YEARS: 120,
  ELEVEN_YEARS: 132,
  TWELVE_YEARS: 144,
  THIRTEEN_YEARS: 156,
  FOURTEEN_YEARS: 168,
  FIFTEEN_YEARS: 180,
  SIXTEEN_YEARS: 192,
  SEVENTEEN_YEARS: 204,
  EIGHTEEN_YEARS: 216
} as const;

/**
 * Default charge weights by category
 */
export const DEFAULT_CHARGE_WEIGHTS: Record<TemplateCategory, ChargeWeightTemplate> = {
  health: { mental: 4, time: 4, emotional: 4, physical: 2 },
  education: { mental: 4, time: 3, emotional: 3, physical: 2 },
  administrative: { mental: 5, time: 3, emotional: 2, physical: 1 },
  social: { mental: 2, time: 3, emotional: 2, physical: 2 },
  finance: { mental: 3, time: 2, emotional: 2, physical: 1 },
  transport: { mental: 2, time: 4, emotional: 1, physical: 3 },
  seasonal: { mental: 3, time: 3, emotional: 2, physical: 2 }
};

/**
 * French school periods
 */
export const FRENCH_SCHOOL_PERIODS = {
  TOUSSAINT: { month: 10, weekOfMonth: 4 },      // Last week of October
  CHRISTMAS: { month: 12, weekOfMonth: 3 },      // Third week of December
  FEBRUARY: { month: 2, weekOfMonth: 2 },        // Mid-February (varies by zone)
  SPRING: { month: 4, weekOfMonth: 2 },          // Mid-April (varies by zone)
  SUMMER_START: { month: 7, day: 7 },            // Around July 7
  SUMMER_END: { month: 9, day: 1 }               // September 1 (rentrée)
} as const;

// =============================================================================
// STORE CREATION
// =============================================================================

/**
 * Create an empty template store
 */
export function createTemplateStore(): TemplateStore {
  return {
    templates: new Map(),
    byCategory: new Map(),
    byCountry: new Map(),
    lastUpdated: new Date()
  };
}

/**
 * Add a template to the store (immutable)
 */
export function addTemplate(
  store: TemplateStore,
  template: TaskTemplate
): TemplateStore {
  const templates = new Map(store.templates);
  templates.set(template.id, template);

  // Update category index
  const byCategory = new Map(store.byCategory);
  const categoryList = byCategory.get(template.category) || [];
  if (!categoryList.includes(template.id)) {
    byCategory.set(template.category, [...categoryList, template.id]);
  }

  // Update country index
  const byCountry = new Map(store.byCountry);
  for (const country of template.countries) {
    const countryList = byCountry.get(country) || [];
    if (!countryList.includes(template.id)) {
      byCountry.set(country, [...countryList, template.id]);
    }
  }

  return {
    templates,
    byCategory,
    byCountry,
    lastUpdated: new Date()
  };
}

/**
 * Remove a template from the store (immutable)
 */
export function removeTemplate(
  store: TemplateStore,
  templateId: string
): TemplateStore {
  const template = store.templates.get(templateId);
  if (!template) return store;

  const templates = new Map(store.templates);
  templates.delete(templateId);

  // Update category index
  const byCategory = new Map(store.byCategory);
  const categoryList = byCategory.get(template.category) || [];
  byCategory.set(template.category, categoryList.filter(id => id !== templateId));

  // Update country index
  const byCountry = new Map(store.byCountry);
  for (const country of template.countries) {
    const countryList = byCountry.get(country) || [];
    byCountry.set(country, countryList.filter(id => id !== templateId));
  }

  return {
    templates,
    byCategory,
    byCountry,
    lastUpdated: new Date()
  };
}

/**
 * Update a template (immutable)
 */
export function updateTemplate(
  store: TemplateStore,
  templateId: string,
  updates: Partial<Omit<TaskTemplate, 'id' | 'createdAt'>>
): TemplateStore {
  const template = store.templates.get(templateId);
  if (!template) return store;

  // If category changed, need to update indexes
  const categoryChanged = updates.category && updates.category !== template.category;
  const countriesChanged = updates.countries &&
    JSON.stringify(updates.countries) !== JSON.stringify(template.countries);

  // Remove old template
  let updatedStore = categoryChanged || countriesChanged
    ? removeTemplate(store, templateId)
    : store;

  // Add updated template
  const updatedTemplate: TaskTemplate = {
    ...template,
    ...updates,
    updatedAt: new Date()
  };

  if (categoryChanged || countriesChanged) {
    return addTemplate(updatedStore, updatedTemplate);
  }

  const templates = new Map(updatedStore.templates);
  templates.set(templateId, updatedTemplate);

  return {
    ...updatedStore,
    templates,
    lastUpdated: new Date()
  };
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get template by ID
 */
export function getTemplate(
  store: TemplateStore,
  templateId: string
): TaskTemplate | undefined {
  return store.templates.get(templateId);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  store: TemplateStore,
  category: TemplateCategory
): readonly TaskTemplate[] {
  const templateIds = store.byCategory.get(category) || [];
  return templateIds
    .map(id => store.templates.get(id))
    .filter((t): t is TaskTemplate => t !== undefined && t.enabled);
}

/**
 * Get templates by country
 */
export function getTemplatesByCountry(
  store: TemplateStore,
  country: CountryCode
): readonly TaskTemplate[] {
  const genericIds = store.byCountry.get('GENERIC') || [];
  const countryIds = store.byCountry.get(country) || [];
  const allIds = [...new Set([...genericIds, ...countryIds])];

  return allIds
    .map(id => store.templates.get(id))
    .filter((t): t is TaskTemplate => t !== undefined && t.enabled);
}

/**
 * Get templates applicable for a child's age
 */
export function getTemplatesForAge(
  store: TemplateStore,
  ageInMonths: number,
  country: CountryCode = 'GENERIC'
): readonly TaskTemplate[] {
  const countryTemplates = getTemplatesByCountry(store, country);

  return countryTemplates.filter(template => {
    const { minMonths, maxMonths, exactMonths } = template.ageRange;

    // Exact age match (for vaccines, etc.)
    if (exactMonths !== undefined) {
      return Math.abs(ageInMonths - exactMonths) <= 1; // 1 month tolerance
    }

    // Range match
    return ageInMonths >= minMonths && ageInMonths <= maxMonths;
  });
}

/**
 * Get templates for a specific trigger month
 */
export function getTemplatesForMonth(
  store: TemplateStore,
  month: number,
  country: CountryCode = 'GENERIC'
): readonly TaskTemplate[] {
  const countryTemplates = getTemplatesByCountry(store, country);

  return countryTemplates.filter(template =>
    template.triggerMonth === month
  );
}

/**
 * Search templates by text
 */
export function searchTemplates(
  store: TemplateStore,
  query: string,
  language: string = 'fr'
): readonly TaskTemplate[] {
  const normalizedQuery = query.toLowerCase().trim();

  return Array.from(store.templates.values())
    .filter(template => {
      if (!template.enabled) return false;

      const title = template.titleTemplate[language] || template.titleTemplate['fr'] || '';
      const desc = template.descriptionTemplate?.[language] || template.descriptionTemplate?.['fr'] || '';
      const tags = template.tags.join(' ');

      const searchText = `${title} ${desc} ${tags}`.toLowerCase();
      return searchText.includes(normalizedQuery);
    });
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Calculate age in months from birthdate
 */
export function calculateAgeInMonths(birthDate: Date, referenceDate: Date = new Date()): number {
  const years = referenceDate.getFullYear() - birthDate.getFullYear();
  const months = referenceDate.getMonth() - birthDate.getMonth();
  const days = referenceDate.getDate() - birthDate.getDate();

  let totalMonths = years * 12 + months;
  if (days < 0) totalMonths--;

  return Math.max(0, totalMonths);
}

/**
 * Get age range description in French
 */
export function getAgeRangeDescriptionFR(ageRange: AgeRange): string {
  if (ageRange.exactMonths !== undefined) {
    const months = ageRange.exactMonths;
    if (months < 12) {
      return `${months} mois`;
    } else if (months < 24) {
      return months === 12 ? '1 an' : `${months} mois`;
    } else {
      const years = Math.floor(months / 12);
      return `${years} ans`;
    }
  }

  return ageRange.description;
}

/**
 * Calculate total charge weight
 */
export function calculateTotalWeight(weight: ChargeWeightTemplate): number {
  return weight.mental + weight.time + weight.emotional + weight.physical;
}

/**
 * Create a template ID
 */
export function generateTemplateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a template slug from title
 */
export function createSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

/**
 * Get localized title
 */
export function getLocalizedTitle(
  template: TaskTemplate,
  language: string,
  childName?: string
): string {
  let title = template.titleTemplate[language] || template.titleTemplate['fr'] || '';

  if (childName) {
    title = title.replace(/\{child\}/g, childName);
    title = title.replace(/\{enfant\}/g, childName);
  }

  return title;
}

/**
 * Get localized description
 */
export function getLocalizedDescription(
  template: TaskTemplate,
  language: string,
  childName?: string
): string {
  let desc = template.descriptionTemplate?.[language] ||
             template.descriptionTemplate?.['fr'] || '';

  if (childName) {
    desc = desc.replace(/\{child\}/g, childName);
    desc = desc.replace(/\{enfant\}/g, childName);
  }

  return desc;
}

// =============================================================================
// TEMPLATE BUILDERS
// =============================================================================

/**
 * Build a health template
 */
export function buildHealthTemplate(
  params: {
    slug: string;
    titleFR: string;
    titleEN: string;
    descFR?: string;
    descEN?: string;
    ageRange: AgeRange;
    recurrence?: RecurrencePattern;
    priority?: TemplatePriority;
    countries?: CountryCode[];
    triggerMonth?: number;
    leadDays?: number;
    tags?: string[];
  }
): TaskTemplate {
  return {
    id: generateTemplateId(),
    slug: params.slug,
    titleTemplate: { fr: params.titleFR, en: params.titleEN },
    descriptionTemplate: params.descFR || params.descEN ? {
      ...(params.descFR && { fr: params.descFR }),
      ...(params.descEN && { en: params.descEN })
    } : undefined,
    category: 'health',
    priority: params.priority || 'high',
    ageRange: params.ageRange,
    chargeWeight: DEFAULT_CHARGE_WEIGHTS.health,
    recurrence: params.recurrence || 'once',
    countries: params.countries || ['GENERIC'],
    triggerMonth: params.triggerMonth,
    leadDays: params.leadDays ?? 14,
    tags: params.tags || ['health', 'medical'],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Build an education template
 */
export function buildEducationTemplate(
  params: {
    slug: string;
    titleFR: string;
    titleEN: string;
    descFR?: string;
    descEN?: string;
    ageRange: AgeRange;
    recurrence?: RecurrencePattern;
    priority?: TemplatePriority;
    countries?: CountryCode[];
    triggerMonth?: number;
    leadDays?: number;
    tags?: string[];
  }
): TaskTemplate {
  return {
    id: generateTemplateId(),
    slug: params.slug,
    titleTemplate: { fr: params.titleFR, en: params.titleEN },
    descriptionTemplate: params.descFR || params.descEN ? {
      ...(params.descFR && { fr: params.descFR }),
      ...(params.descEN && { en: params.descEN })
    } : undefined,
    category: 'education',
    priority: params.priority || 'high',
    ageRange: params.ageRange,
    chargeWeight: DEFAULT_CHARGE_WEIGHTS.education,
    recurrence: params.recurrence || 'yearly',
    countries: params.countries || ['GENERIC'],
    triggerMonth: params.triggerMonth,
    leadDays: params.leadDays ?? 30,
    tags: params.tags || ['education', 'school'],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Build an administrative template
 */
export function buildAdministrativeTemplate(
  params: {
    slug: string;
    titleFR: string;
    titleEN: string;
    descFR?: string;
    descEN?: string;
    ageRange: AgeRange;
    recurrence?: RecurrencePattern;
    priority?: TemplatePriority;
    countries?: CountryCode[];
    triggerMonth?: number;
    leadDays?: number;
    tags?: string[];
  }
): TaskTemplate {
  return {
    id: generateTemplateId(),
    slug: params.slug,
    titleTemplate: { fr: params.titleFR, en: params.titleEN },
    descriptionTemplate: params.descFR || params.descEN ? {
      ...(params.descFR && { fr: params.descFR }),
      ...(params.descEN && { en: params.descEN })
    } : undefined,
    category: 'administrative',
    priority: params.priority || 'medium',
    ageRange: params.ageRange,
    chargeWeight: DEFAULT_CHARGE_WEIGHTS.administrative,
    recurrence: params.recurrence || 'once',
    countries: params.countries || ['GENERIC'],
    triggerMonth: params.triggerMonth,
    leadDays: params.leadDays ?? 21,
    tags: params.tags || ['administrative', 'paperwork'],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a template
 */
export function validateTemplate(template: unknown): { valid: boolean; errors: string[] } {
  const result = TaskTemplateSchema.safeParse(template);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.errors.map(e =>
    `${e.path.join('.')}: ${e.message}`
  );

  return { valid: false, errors };
}

/**
 * Validate age range consistency
 */
export function validateAgeRange(ageRange: AgeRange): { valid: boolean; error?: string } {
  if (ageRange.exactMonths !== undefined) {
    if (ageRange.exactMonths < ageRange.minMonths || ageRange.exactMonths > ageRange.maxMonths) {
      return { valid: false, error: 'exactMonths must be within minMonths and maxMonths range' };
    }
  }

  if (ageRange.minMonths > ageRange.maxMonths) {
    return { valid: false, error: 'minMonths cannot be greater than maxMonths' };
  }

  return { valid: true };
}

// =============================================================================
// EXPORT ALL TYPES AND FUNCTIONS
// =============================================================================

export {
  // Schemas are exported with their names above
};
