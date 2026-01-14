import { wrapEmailTemplate } from "@/lib/aws/ses"

interface TaskReminderData {
  userName: string
  taskTitle: string
  taskDescription?: string | null
  deadline: string
  priority: string
  is_critical: boolean
  childName?: string | null
  categoryName?: string | null
  appUrl: string
  taskId: string
}

export function generateTaskReminderEmail(data: TaskReminderData): {
  subject: string
  html: string
  text: string
} {
  const {
    userName,
    taskTitle,
    taskDescription,
    deadline,
    priority,
    is_critical,
    childName,
    categoryName,
    appUrl,
    taskId,
  } = data

  const deadlineDate = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  deadlineDate.setHours(0, 0, 0, 0)

  const isToday = deadlineDate.getTime() === today.getTime()
  const isTomorrow =
    deadlineDate.getTime() === today.getTime() + 24 * 60 * 60 * 1000
  const isOverdue = deadlineDate < today

  const deadlineText = isOverdue
    ? "En retard"
    : isToday
      ? "Aujourd'hui"
      : isTomorrow
        ? "Demain"
        : deadlineDate.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })

  const priorityBadge =
    priority === "critical" || is_critical
      ? '<span class="badge badge-critical">Critique</span>'
      : priority === "high"
        ? '<span class="badge badge-high">Prioritaire</span>'
        : ""

  const urgencyColor = isOverdue || is_critical ? "#dc2626" : isToday ? "#ea580c" : "#3b82f6"

  const content = `
    <h2 style="margin-top:0;">Rappel de tâche</h2>
    <p style="color:#6b7280;">Bonjour ${userName}, n'oubliez pas cette tâche :</p>

    <div style="border:2px solid ${urgencyColor};border-radius:8px;padding:16px;margin:24px 0;">
      <div style="margin-bottom:8px;">
        ${priorityBadge}
      </div>
      <h3 style="margin:0;color:#111827;font-size:18px;">
        ${taskTitle}
      </h3>
      ${taskDescription ? `<p style="color:#6b7280;margin:8px 0 0;">${taskDescription}</p>` : ""}
      <div style="margin-top:12px;font-size:14px;">
        <p style="margin:4px 0;">
          <strong style="color:${urgencyColor};">${deadlineText}</strong>
        </p>
        ${childName ? `<p style="margin:4px 0;color:#6b7280;">Enfant: ${childName}</p>` : ""}
        ${categoryName ? `<p style="margin:4px 0;color:#6b7280;">Catégorie: ${categoryName}</p>` : ""}
      </div>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <a href="${appUrl}/tasks/${taskId}" class="button">
        Voir la tâche
      </a>
    </div>
  `

  const html = wrapEmailTemplate(
    content,
    `${deadlineText} - ${taskTitle}`
  )

  const text = `
Rappel de tâche

Bonjour ${userName},

N'oubliez pas cette tâche :

${taskTitle}
${taskDescription ? `\n${taskDescription}\n` : ""}
Échéance: ${deadlineText}
${childName ? `Enfant: ${childName}` : ""}
${categoryName ? `Catégorie: ${categoryName}` : ""}
${is_critical ? "Cette tâche est critique." : ""}

Voir la tâche: ${appUrl}/tasks/${taskId}
  `.trim()

  const subjectPrefix = isOverdue ? "[URGENT]" : is_critical ? "[CRITIQUE]" : "[Rappel]"

  return {
    subject: `${subjectPrefix} ${taskTitle} - ${deadlineText}`,
    html,
    text,
  }
}
