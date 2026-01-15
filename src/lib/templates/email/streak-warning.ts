import { wrapEmailTemplate } from "@/lib/aws/ses"

interface StreakWarningData {
  userName: string
  householdName: string
  streakCurrent: number
  streakBest: number
  criticalTaskTitle?: string
  criticalTaskId?: string
  appUrl: string
}

export function generateStreakWarningEmail(data: StreakWarningData): {
  subject: string
  html: string
  text: string
} {
  const {
    userName,
    householdName,
    streakCurrent,
    streakBest,
    criticalTaskTitle,
    criticalTaskId,
    appUrl,
  } = data

  const isNearRecord = streakCurrent >= streakBest - 2 && streakCurrent > 0

  const content = `
    <h2 style="margin-top:0;color:#dc2626;">Attention ! Votre streak est en danger</h2>
    <p style="color:#6b7280;">Bonjour ${userName},</p>

    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:24px 0;">
      <div style="text-align:center;">
        <span style="font-size:48px;">🔥</span>
        <p style="font-size:32px;font-weight:bold;color:#dc2626;margin:8px 0;">
          ${streakCurrent} jour${streakCurrent > 1 ? "s" : ""}
        </p>
        <p style="color:#991b1b;font-size:14px;">
          ${isNearRecord ? `Plus que ${streakBest - streakCurrent} jour${streakBest - streakCurrent > 1 ? "s" : ""} pour battre votre record !` : `Record: ${streakBest} jours`}
        </p>
      </div>
    </div>

    <p style="text-align:center;color:#6b7280;">
      Vous avez une tâche critique non complétée aujourd'hui.
      <br/>
      Si elle n'est pas terminée, votre streak sera perdu !
    </p>

    ${
      criticalTaskTitle && criticalTaskId
        ? `
      <div style="border:2px solid #dc2626;border-radius:8px;padding:16px;margin:24px 0;text-align:center;">
        <p style="font-weight:600;color:#111827;margin:0;">
          ${criticalTaskTitle}
        </p>
        <a href="${appUrl}/tasks/${criticalTaskId}" class="button" style="margin-top:16px;">
          Compléter maintenant
        </a>
      </div>
    `
        : ""
    }

    <div style="text-align:center;margin-top:24px;">
      <a href="${appUrl}/tasks/today" class="button">
        Voir toutes les tâches
      </a>
    </div>
  `

  const html = wrapEmailTemplate(
    content,
    `Votre streak de ${streakCurrent} jours est en danger ! - ${householdName}`
  )

  const text = `
Attention ! Votre streak est en danger

Bonjour ${userName},

Votre streak actuel: ${streakCurrent} jours
${isNearRecord ? `Plus que ${streakBest - streakCurrent} jours pour battre votre record !` : `Record: ${streakBest} jours`}

Vous avez une tâche critique non complétée aujourd'hui.
Si elle n'est pas terminée, votre streak sera perdu !

${criticalTaskTitle ? `Tâche critique: ${criticalTaskTitle}` : ""}

Voir vos tâches: ${appUrl}/tasks/today
  `.trim()

  return {
    subject: `[${householdName}] Streak en danger ! ${streakCurrent} jours`,
    html,
    text,
  }
}
