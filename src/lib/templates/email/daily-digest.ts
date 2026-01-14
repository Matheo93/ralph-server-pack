import { wrapEmailTemplate } from "@/lib/aws/ses"

interface Task {
  id: string
  title: string
  priority: string
  is_critical: boolean
  child_name?: string | null
  category_name?: string | null
}

interface DailyDigestData {
  userName: string
  householdName: string
  date: string
  todayTasks: Task[]
  overdueTasks: Task[]
  weekCount: number
  streakCurrent: number
  streakBest: number
  appUrl: string
}

export function generateDailyDigestEmail(data: DailyDigestData): {
  subject: string
  html: string
  text: string
} {
  const {
    userName,
    householdName,
    date,
    todayTasks,
    overdueTasks,
    weekCount,
    streakCurrent,
    streakBest,
    appUrl,
  } = data

  const criticalCount = todayTasks.filter((t) => t.is_critical).length
  const formattedDate = new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const taskListHtml = (tasks: Task[]) =>
    tasks
      .map(
        (task) => `
          <div class="task-card">
            <div class="task-title">
              ${task.is_critical ? '<span class="badge badge-critical">Critique</span> ' : ""}
              ${task.priority === "high" ? '<span class="badge badge-high">Prioritaire</span> ' : ""}
              ${task.title}
            </div>
            <div class="task-meta">
              ${task.child_name ? `${task.child_name} ` : ""}
              ${task.category_name ? `• ${task.category_name}` : ""}
            </div>
          </div>
        `
      )
      .join("")

  const content = `
    <h2 style="margin-top:0;">Bonjour ${userName},</h2>
    <p style="color:#6b7280;">Voici votre récapitulatif pour ${formattedDate}.</p>

    ${
      streakCurrent > 0
        ? `
      <div style="background-color:#fef3c7;border-radius:6px;padding:12px;margin:16px 0;">
        <strong style="color:#d97706;">Streak actuel: ${streakCurrent} jour${streakCurrent > 1 ? "s" : ""}</strong>
        ${streakCurrent >= streakBest ? " - Record !" : ` (Record: ${streakBest})`}
      </div>
    `
        : ""
    }

    <div style="display:flex;gap:16px;margin:24px 0;">
      <div class="stat" style="flex:1;background-color:#f3f4f6;border-radius:6px;">
        <div class="stat-value">${todayTasks.length}</div>
        <div class="stat-label">Aujourd'hui</div>
      </div>
      <div class="stat" style="flex:1;background-color:#f3f4f6;border-radius:6px;">
        <div class="stat-value" style="color:${criticalCount > 0 ? "#dc2626" : "inherit"};">${criticalCount}</div>
        <div class="stat-label">Critiques</div>
      </div>
      <div class="stat" style="flex:1;background-color:#f3f4f6;border-radius:6px;">
        <div class="stat-value">${weekCount}</div>
        <div class="stat-label">Cette semaine</div>
      </div>
    </div>

    ${
      overdueTasks.length > 0
        ? `
      <h3 style="color:#dc2626;margin-top:24px;">
        En retard (${overdueTasks.length})
      </h3>
      ${taskListHtml(overdueTasks)}
    `
        : ""
    }

    ${
      todayTasks.length > 0
        ? `
      <h3 style="margin-top:24px;">Tâches du jour (${todayTasks.length})</h3>
      ${taskListHtml(todayTasks)}
    `
        : `
      <p style="color:#059669;font-weight:600;margin-top:24px;">
        Aucune tâche pour aujourd'hui. Profitez bien !
      </p>
    `
    }

    <div style="text-align:center;margin-top:32px;">
      <a href="${appUrl}/tasks/today" class="button">
        Voir mes tâches
      </a>
    </div>
  `

  const html = wrapEmailTemplate(
    content,
    `${todayTasks.length} tâches aujourd'hui${criticalCount > 0 ? `, ${criticalCount} critiques` : ""} - ${householdName}`
  )

  const text = `
Bonjour ${userName},

Voici votre récapitulatif pour ${formattedDate}.

${streakCurrent > 0 ? `Streak actuel: ${streakCurrent} jours\n` : ""}

Aujourd'hui: ${todayTasks.length} tâches
Critiques: ${criticalCount}
Cette semaine: ${weekCount} tâches

${overdueTasks.length > 0 ? `En retard: ${overdueTasks.length}\n${overdueTasks.map((t) => `- ${t.title}`).join("\n")}\n` : ""}

${todayTasks.length > 0 ? `Tâches du jour:\n${todayTasks.map((t) => `- ${t.title}`).join("\n")}` : "Aucune tâche pour aujourd'hui. Profitez bien !"}

Voir mes tâches: ${appUrl}/tasks/today
  `.trim()

  return {
    subject: `[${householdName}] ${todayTasks.length} tâches aujourd'hui${criticalCount > 0 ? ` (${criticalCount} critiques)` : ""}`,
    html,
    text,
  }
}
