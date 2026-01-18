/**
 * Messages de toast standardisés pour une expérience utilisateur cohérente
 *
 * Usage:
 * import { toastMessages, showToast } from "@/lib/toast-messages"
 *
 * showToast.success("taskCreated", { name: "Ma tâche" })
 * showToast.error("generic")
 */

import { toast } from "@/components/custom/toast-notifications"

// ============================================
// MESSAGE TEMPLATES
// ============================================

export const toastMessages = {
  // ============ SUCCESS MESSAGES ============
  success: {
    // Tasks
    taskCreated: {
      title: "Tâche créée",
      description: (name: string) => `"${name}" a été ajoutée à votre liste`,
    },
    taskUpdated: {
      title: "Tâche modifiée",
      description: (name: string) => `"${name}" a été mise à jour`,
    },
    taskCompleted: {
      title: "Tâche terminée",
      description: (name: string) => `"${name}" marquée comme terminée`,
    },
    taskDeleted: {
      title: "Tâche supprimée",
      description: (name: string) => `"${name}" a été supprimée`,
    },
    taskRestored: {
      title: "Tâche restaurée",
      description: (name: string) => `"${name}" est de nouveau active`,
    },
    taskPostponed: {
      title: "Tâche reportée",
      description: (name: string) => `"${name}" a été reportée`,
    },

    // Children
    childCreated: {
      title: "Enfant ajouté",
      description: (name: string) => `${name} a été ajouté au foyer`,
    },
    childUpdated: {
      title: "Enfant modifié",
      description: (name: string) => `Les informations de ${name} ont été mises à jour`,
    },
    childDeleted: {
      title: "Enfant retiré",
      description: (name: string) => `${name} a été retiré du foyer`,
    },

    // Shopping
    itemAdded: {
      title: "Article ajouté",
      description: (name: string) => `"${name}" a été ajouté à la liste`,
    },
    itemChecked: {
      title: "Article coché",
      description: (name: string) => `"${name}" a été acheté`,
    },
    itemDeleted: {
      title: "Article supprimé",
      description: (name: string) => `"${name}" a été retiré de la liste`,
    },
    listCleared: {
      title: "Liste vidée",
      description: "Tous les articles cochés ont été supprimés",
    },
    shareCreated: {
      title: "Lien de partage créé",
      description: "Le lien a été copié dans le presse-papier",
    },
    shareRevoked: {
      title: "Partage désactivé",
      description: "Le lien de partage n'est plus actif",
    },
    shareCopied: {
      title: "Lien copié",
      description: "Le lien de partage a été copié dans le presse-papier",
    },

    // Calendar
    eventCreated: {
      title: "Événement créé",
      description: (name: string) => `"${name}" a été ajouté au calendrier`,
    },
    eventUpdated: {
      title: "Événement modifié",
      description: (name: string) => `"${name}" a été mis à jour`,
    },
    eventDeleted: {
      title: "Événement supprimé",
      description: (name: string) => `"${name}" a été retiré du calendrier`,
    },

    // Settings
    profileUpdated: {
      title: "Profil mis à jour",
      description: "Vos préférences ont été enregistrées",
    },
    notificationsUpdated: {
      title: "Préférences enregistrées",
      description: "Vos paramètres de notification ont été mis à jour",
    },
    householdUpdated: {
      title: "Foyer mis à jour",
      description: "Les informations du foyer ont été enregistrées",
    },
    exclusionAdded: {
      title: "Exclusion ajoutée",
      description: "La période d'exclusion a été créée",
    },
    exclusionDeleted: {
      title: "Exclusion supprimée",
      description: "La période d'exclusion a été retirée",
    },

    // Auth
    signupSuccess: {
      title: "Inscription réussie",
      description: "Bienvenue sur FamilyLoad !",
    },
    logoutSuccess: {
      title: "Déconnexion",
      description: "À bientôt !",
    },

    // Invitations
    inviteSent: {
      title: "Invitation envoyée",
      description: (email: string) => `Une invitation a été envoyée à ${email}`,
    },
    inviteAccepted: {
      title: "Invitation acceptée",
      description: "Vous avez rejoint le foyer",
    },

    // Templates
    templateEnabled: {
      title: "Template activé",
      description: (name: string) => `Les tâches de "${name}" ont été générées`,
    },
    templateDisabled: {
      title: "Template désactivé",
      description: (name: string) => `"${name}" a été désactivé`,
    },

    // Household
    householdCreated: {
      title: "Foyer créé",
      description: (name: string) => `"${name}" a été créé avec succès`,
    },

    // Onboarding
    onboardingCompleted: {
      title: "Bienvenue !",
      description: "Votre foyer a été configuré avec succès",
    },

    // Clipboard
    linkCopied: {
      title: "Lien copié",
      description: "Le lien de connexion a été copié dans le presse-papier",
    },

    // Generic
    saved: {
      title: "Enregistré",
      description: "Les modifications ont été sauvegardées",
    },
    copied: {
      title: "Copié",
      description: "Le contenu a été copié dans le presse-papier",
    },
    dataExported: {
      title: "Export terminé",
      description: "Vos données ont été téléchargées",
    },
    accountDeleted: {
      title: "Compte supprimé",
      description: "Votre compte a été définitivement supprimé",
    },
  },

  // ============ ERROR MESSAGES ============
  error: {
    // Generic
    generic: {
      title: "Une erreur est survenue",
      description: "Veuillez réessayer plus tard",
    },
    network: {
      title: "Erreur de connexion",
      description: "Vérifiez votre connexion internet",
    },
    unauthorized: {
      title: "Accès refusé",
      description: "Vous n'avez pas les droits nécessaires",
    },
    notFound: {
      title: "Non trouvé",
      description: "La ressource demandée n'existe pas",
    },
    validation: {
      title: "Données invalides",
      description: "Veuillez vérifier les informations saisies",
    },

    // Tasks
    taskCreateFailed: {
      title: "Échec de création",
      description: "Impossible de créer la tâche",
    },
    taskUpdateFailed: {
      title: "Échec de modification",
      description: "Impossible de modifier la tâche",
    },
    taskDeleteFailed: {
      title: "Échec de suppression",
      description: "Impossible de supprimer la tâche",
    },
    taskCompleteFailed: {
      title: "Échec",
      description: "Impossible de terminer la tâche",
    },

    // Children
    childCreateFailed: {
      title: "Échec de l'ajout",
      description: "Impossible d'ajouter l'enfant",
    },
    childUpdateFailed: {
      title: "Échec de la modification",
      description: "Impossible de modifier l'enfant",
    },

    // Shopping
    itemAddFailed: {
      title: "Échec de l'ajout",
      description: "Impossible d'ajouter l'article",
    },
    shareCreateFailed: {
      title: "Échec de création du lien",
      description: "Impossible de créer le lien de partage",
    },
    shareRevokeFailed: {
      title: "Échec de désactivation",
      description: "Impossible de désactiver le lien de partage",
    },

    // Calendar
    eventCreateFailed: {
      title: "Échec de création",
      description: "Impossible de créer l'événement",
    },

    // Household
    householdCreateFailed: {
      title: "Échec de la création",
      description: "Impossible de créer le foyer",
    },

    // Settings
    profileUpdateFailed: {
      title: "Échec de la mise à jour",
      description: "Impossible de mettre à jour le profil",
    },
    notificationsUpdateFailed: {
      title: "Échec de l'enregistrement",
      description: "Impossible de sauvegarder les préférences",
    },

    // Auth
    loginFailed: {
      title: "Échec de connexion",
      description: "Email ou mot de passe incorrect",
    },
    signupFailed: {
      title: "Échec d'inscription",
      description: "Impossible de créer le compte",
    },

    // Push notifications
    pushTestFailed: {
      title: "Échec du test",
      description: "Impossible d'envoyer la notification de test",
    },
    pushNotSupported: {
      title: "Non supporté",
      description: "Votre navigateur ne supporte pas les notifications push",
    },
    pushDenied: {
      title: "Notifications bloquées",
      description: "Activez les notifications dans les paramètres de votre navigateur",
    },
  },

  // ============ INFO MESSAGES ============
  info: {
    taskCancelled: {
      title: "Tâche annulée",
      description: (name: string) => `"${name}" a été annulée`,
    },
    emailSent: {
      title: "Email envoyé",
      description: "Vérifiez votre boîte mail pour confirmer votre compte",
    },
    pushSent: {
      title: "Notification envoyée",
      description: "Vérifiez que vous l'avez bien reçue",
    },
    noChanges: {
      title: "Aucune modification",
      description: "Aucun changement à enregistrer",
    },
  },

  // ============ WARNING MESSAGES ============
  warning: {
    magicLinkUnavailable: {
      title: "Non disponible",
      description: "Les liens magiques ne sont pas disponibles. Veuillez utiliser la connexion classique.",
    },
    sessionExpiring: {
      title: "Session bientôt expirée",
      description: "Votre session expire dans 5 minutes",
    },
    unsavedChanges: {
      title: "Modifications non enregistrées",
      description: "Voulez-vous vraiment quitter sans sauvegarder ?",
    },
  },
} as const

// ============================================
// HELPER TYPES
// ============================================

type SuccessKey = keyof typeof toastMessages.success
type ErrorKey = keyof typeof toastMessages.error
type InfoKey = keyof typeof toastMessages.info
type WarningKey = keyof typeof toastMessages.warning

// ============================================
// TOAST HELPER FUNCTIONS
// ============================================

/**
 * Show standardized toast notifications
 */
export const showToast = {
  /**
   * Show a success toast
   * @param key - The message key from toastMessages.success
   * @param param - Optional parameter for dynamic descriptions
   * @param customDescription - Override the description
   */
  success: (
    key: SuccessKey,
    param?: string,
    customDescription?: string
  ) => {
    const message = toastMessages.success[key]
    const description = customDescription ?? (
      typeof message.description === "function"
        ? message.description(param ?? "")
        : message.description
    )
    toast.success(message.title, description)
  },

  /**
   * Show an error toast
   * @param key - The message key from toastMessages.error
   * @param customDescription - Override the description with error details
   */
  error: (
    key: ErrorKey,
    customDescription?: string
  ) => {
    const message = toastMessages.error[key]
    toast.error(message.title, customDescription ?? message.description)
  },

  /**
   * Show an info toast
   * @param key - The message key from toastMessages.info
   * @param param - Optional parameter for dynamic descriptions
   */
  info: (
    key: InfoKey,
    param?: string
  ) => {
    const message = toastMessages.info[key]
    const description = typeof message.description === "function"
      ? message.description(param ?? "")
      : message.description
    toast.info(message.title, description)
  },

  /**
   * Show a warning toast
   * @param key - The message key from toastMessages.warning
   */
  warning: (key: WarningKey) => {
    const message = toastMessages.warning[key]
    toast.warning(message.title, message.description)
  },

  /**
   * Show a loading toast (returns ID to dismiss/update later)
   * @param message - Loading message to display
   */
  loading: (message: string) => {
    return toast.loading(message)
  },

  /**
   * Dismiss a specific toast by ID
   * @param id - Toast ID returned by loading()
   */
  dismiss: (id: string) => {
    toast.dismiss(id)
  },

  /**
   * Wrap a promise with loading/success/error toasts
   */
  promise: toast.promise,
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

// Re-export the raw toast for advanced usage
export { toast }
