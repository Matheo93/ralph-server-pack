// Exclusion reasons constants
// Separated from actions file to avoid "use server" export restrictions

export type ExclusionReason =
  | "voyage"
  | "maladie"
  | "surcharge_travail"
  | "garde_alternee"
  | "autre"

export const EXCLUSION_REASONS: Record<ExclusionReason, { label: string; icon: string }> = {
  voyage: { label: "Voyage / Vacances", icon: "✈️" },
  maladie: { label: "Maladie", icon: "🤒" },
  surcharge_travail: { label: "Surcharge de travail", icon: "💼" },
  garde_alternee: { label: "Garde alternée (absent)", icon: "🏠" },
  autre: { label: "Autre", icon: "📝" },
}
