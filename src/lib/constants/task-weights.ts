// Poids par catégorie (from MASTER_PROMPT.md)
export const CATEGORY_WEIGHTS: Record<string, number> = {
  administratif: 3,
  sante: 5,
  ecole: 4,
  quotidien: 1,
  social: 6,
  activites: 2,
  logistique: 2,
}

// Poids par type d'action (plus spécifiques)
export const ACTION_WEIGHTS: Record<string, number> = {
  "papier administratif": 3,
  "rendez-vous médical": 5,
  "réunion école": 4,
  "course quotidienne": 1,
  "organisation anniversaire": 6,
  inscription: 4,
  vaccination: 5,
  "sortie scolaire": 3,
  "fournitures scolaires": 2,
  cantine: 2,
  transport: 2,
  "garde enfant": 3,
}

// Facteurs multiplicateurs
export const PRIORITY_MULTIPLIERS: Record<string, number> = {
  critical: 1.5,
  high: 1.2,
  normal: 1.0,
  low: 0.8,
}

// Seuils d'alerte pour le déséquilibre
export const BALANCE_THRESHOLDS = {
  WARNING: 55, // %
  CRITICAL: 60, // %
}

export function getDefaultWeight(categoryCode: string): number {
  return CATEGORY_WEIGHTS[categoryCode] ?? 3
}

export function getWeightWithPriority(
  baseWeight: number,
  priority: string
): number {
  const multiplier = PRIORITY_MULTIPLIERS[priority] ?? 1.0
  return Math.round(baseWeight * multiplier)
}
