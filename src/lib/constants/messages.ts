/**
 * FamilyLoad UX Messages
 *
 * All user-facing messages in French with encouraging, non-judgmental tone.
 * These messages follow the principle of supportive parenting communication.
 */

// ============================================================================
// TASK MESSAGES
// ============================================================================

export const TASK_MESSAGES = {
  // Creation
  created: "Tâche créée ! Un petit pas de plus vers l'organisation.",
  created_with_assignment: (name: string) =>
    `Tâche créée et assignée à ${name}. Merci de l'avoir notée !`,
  created_vocal: "Commande vocale enregistrée avec succès !",

  // Completion
  completed: "Bravo ! Une tâche de moins à gérer.",
  completed_streak: (days: number) =>
    `${days} jours d'affilée ! Continuez comme ça, vous êtes formidables.`,
  completed_child: (childName: string) =>
    `Super, c'est fait pour ${childName} !`,

  // Assignment
  assigned: (name: string) => `Tâche assignée à ${name}.`,
  reassigned: (from: string, to: string) =>
    `Tâche transférée de ${from} à ${to}. L'entraide fait la force !`,

  // Reminders
  reminder_gentle: "Petit rappel pour cette tâche.",
  reminder_soon: "Cette tâche arrive bientôt à échéance.",
  reminder_overdue:
    "Cette tâche a dépassé sa date limite. Pas de panique, vous pouvez la reporter.",

  // Deletion
  deleted: "Tâche supprimée.",
  archived: "Tâche archivée.",

  // Errors
  error_create: "Impossible de créer la tâche. Veuillez réessayer.",
  error_update: "Impossible de mettre à jour la tâche.",
  error_delete: "Impossible de supprimer la tâche.",
  error_not_found: "Cette tâche n'existe plus.",
} as const

// ============================================================================
// BALANCE & LOAD MESSAGES
// ============================================================================

export const BALANCE_MESSAGES = {
  // Balanced state
  balanced: "La charge est bien équilibrée. Excellent travail d'équipe !",
  balanced_week: "Cette semaine, vous avez bien réparti les responsabilités.",

  // Warning state (60-70%)
  warning_general:
    "La répartition semble un peu déséquilibrée. Pas d'inquiétude, c'est normal parfois.",
  warning_specific: (name: string) =>
    `${name} a beaucoup de tâches en ce moment. Un coup de main serait apprécié.`,
  warning_suggestion:
    "Peut-être pourriez-vous discuter ensemble de la répartition ?",

  // Critical state (>70%)
  critical_general:
    "La charge mentale semble mal répartie. Prenez un moment pour en discuter.",
  critical_specific: (name: string, percentage: number) =>
    `${name} gère ${percentage}% des tâches. C'est beaucoup pour une seule personne.`,
  critical_help:
    "Chaque parent compte. Redistribuer quelques tâches peut faire une grande différence.",

  // Rebalancing suggestions
  suggest_rebalance:
    "Suggestion : rééquilibrer pourrait réduire le stress de toute la famille.",
  suggest_transfer: (count: number, from: string, to: string) =>
    `Transférer ${count} tâche${count > 1 ? "s" : ""} de ${from} vers ${to} pourrait aider.`,

  // Stats
  stats_ratio: (ratio: string) => `Ratio actuel : ${ratio}`,
  stats_improvement: (improvement: number) =>
    `Amélioration de ${improvement}% ce mois-ci. Continuez !`,
} as const

// ============================================================================
// CHILD TIMELINE MESSAGES
// ============================================================================

export const CHILD_MESSAGES = {
  // Milestones
  milestone_upcoming: (milestone: string, daysLeft: number) =>
    `${milestone} dans ${daysLeft} jours. Préparez-vous !`,
  milestone_today: (milestone: string) =>
    `Aujourd'hui : ${milestone}. Un moment important !`,
  milestone_achieved: (childName: string, milestone: string) =>
    `${childName} a franchi une étape : ${milestone} !`,

  // Vaccinations
  vaccine_reminder: (vaccine: string, daysLeft: number) =>
    `Rappel : ${vaccine} recommandé dans ${daysLeft} jours.`,
  vaccine_overdue: (vaccine: string) =>
    `${vaccine} est en retard. Consultez votre médecin.`,
  vaccine_done: "Vaccination enregistrée. Parfait !",

  // Birthday
  birthday_countdown: (childName: string, daysLeft: number) =>
    `L'anniversaire de ${childName} est dans ${daysLeft} jours !`,
  birthday_today: (childName: string, age: number) =>
    `Joyeux anniversaire ${childName} ! ${age} ans déjà !`,

  // General
  no_events_today: "Pas d'événements prévus aujourd'hui. Profitez-en !",
  events_today: (count: number) =>
    `${count} événement${count > 1 ? "s" : ""} prévu${count > 1 ? "s" : ""} aujourd'hui.`,
} as const

// ============================================================================
// VOCAL MESSAGES
// ============================================================================

export const VOCAL_MESSAGES = {
  // Recording
  recording_start: "Je vous écoute...",
  recording_processing: "Analyse en cours...",
  recording_success: "Compris ! Voici ce que j'ai compris :",
  recording_retry: "Je n'ai pas bien compris. Pouvez-vous répéter ?",

  // Confidence
  confidence_high: "Je suis sûr d'avoir bien compris.",
  confidence_medium: "Je pense avoir compris, mais vérifiez les détails.",
  confidence_low: "Je ne suis pas certain. Merci de vérifier.",

  // Errors
  error_microphone: "Impossible d'accéder au microphone.",
  error_transcription: "Erreur lors de la transcription. Réessayez.",
  error_analysis: "Erreur lors de l'analyse. Réessayez.",

  // Confirmation
  confirm_created: "Tâche créée à partir de votre message vocal.",
  confirm_modified: "Modifications enregistrées.",
  confirm_cancelled: "Commande vocale annulée.",
} as const

// ============================================================================
// NOTIFICATION MESSAGES
// ============================================================================

export const NOTIFICATION_MESSAGES = {
  // Streak risk
  streak_risk_title: "Votre série est en danger !",
  streak_risk_body: (days: number) =>
    `${days} jours de suite - ne cassez pas la chaîne. Une tâche vous attend.`,

  // Deadline warnings
  deadline_today_title: "Échéance aujourd'hui",
  deadline_today_body: (taskTitle: string) =>
    `"${taskTitle}" est prévu pour aujourd'hui.`,
  deadline_tomorrow_title: "Échéance demain",
  deadline_tomorrow_body: (taskTitle: string) => `"${taskTitle}" arrive demain.`,

  // Balance alerts
  balance_warning_title: "Équilibre des charges",
  balance_warning_body:
    "La répartition des tâches pourrait être améliorée. Discutez-en ensemble.",
  balance_critical_title: "Attention à la surcharge",
  balance_critical_body: (name: string) =>
    `${name} semble avoir beaucoup à gérer. Un coup de main ?`,

  // Task completed
  task_completed_title: "Tâche terminée",
  task_completed_body: (partnerName: string, taskTitle: string) =>
    `${partnerName} a terminé "${taskTitle}".`,

  // Milestones
  milestone_title: "Nouveau jalon !",
  milestone_body: (childName: string, milestone: string) =>
    `${childName} : ${milestone}`,
} as const

// ============================================================================
// EMPTY STATES
// ============================================================================

export const EMPTY_STATES = {
  tasks: {
    title: "Aucune tâche pour le moment",
    description: "Ajoutez une tâche pour commencer à vous organiser.",
    action: "Créer une tâche",
  },
  children: {
    title: "Pas encore d'enfants",
    description: "Ajoutez vos enfants pour suivre leurs événements.",
    action: "Ajouter un enfant",
  },
  timeline: {
    title: "Timeline vide",
    description: "Les événements de votre enfant apparaîtront ici.",
  },
  notifications: {
    title: "Pas de notifications",
    description: "Vous êtes à jour !",
  },
  history: {
    title: "Pas d'historique",
    description: "Les commandes vocales passées apparaîtront ici.",
  },
} as const

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
  saved: "Enregistré !",
  updated: "Mis à jour !",
  deleted: "Supprimé.",
  sent: "Envoyé !",
  copied: "Copié dans le presse-papiers.",
  synced: "Synchronisation réussie.",
  connected: "Connecté.",
  disconnected: "Déconnecté.",
} as const

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  // Generic
  generic: "Une erreur s'est produite. Veuillez réessayer.",
  network: "Problème de connexion. Vérifiez votre réseau.",
  unauthorized: "Vous n'êtes pas autorisé à effectuer cette action.",
  not_found: "Élément non trouvé.",
  server: "Erreur serveur. Réessayez dans quelques instants.",

  // Validation
  required_field: "Ce champ est requis.",
  invalid_email: "Adresse email invalide.",
  invalid_date: "Date invalide.",
  too_short: (min: number) => `Minimum ${min} caractères.`,
  too_long: (max: number) => `Maximum ${max} caractères.`,

  // Rate limiting
  rate_limit: "Trop de requêtes. Attendez quelques secondes.",

  // Session
  session_expired: "Votre session a expiré. Reconnectez-vous.",
} as const

// ============================================================================
// LOADING MESSAGES
// ============================================================================

export const LOADING_MESSAGES = {
  default: "Chargement...",
  tasks: "Chargement des tâches...",
  children: "Chargement des enfants...",
  timeline: "Chargement de la timeline...",
  syncing: "Synchronisation en cours...",
  saving: "Enregistrement...",
  sending: "Envoi en cours...",
  processing: "Traitement en cours...",
} as const

// ============================================================================
// ENCOURAGEMENT MESSAGES
// ============================================================================

export const ENCOURAGEMENT_MESSAGES = {
  // Daily motivation
  morning: [
    "Nouvelle journée, nouvelles possibilités !",
    "Chaque petit pas compte.",
    "Vous gérez, et c'est déjà beaucoup.",
  ],
  evening: [
    "Bravo pour cette journée !",
    "Reposez-vous, demain est un autre jour.",
    "Vous avez fait de votre mieux.",
  ],

  // On task completion
  task_done: [
    "Bien joué !",
    "Une de moins !",
    "Parfait !",
    "Excellent !",
    "Super !",
  ],

  // On streak
  streak_maintained: [
    "La régularité, c'est la clé !",
    "Bravo pour votre constance !",
    "Vous êtes sur la bonne voie !",
  ],

  // On balance improvement
  balance_improved: [
    "L'équipe fonctionne bien !",
    "Belle coopération !",
    "Ensemble, c'est mieux !",
  ],
} as const

/**
 * Get a random encouragement message
 */
export function getRandomEncouragement(
  category: keyof typeof ENCOURAGEMENT_MESSAGES
): string {
  const messages = ENCOURAGEMENT_MESSAGES[category]
  const messageArray = messages as readonly string[]
  const index = Math.floor(Math.random() * messageArray.length)
  return messageArray[index] ?? messageArray[0] ?? ""
}
