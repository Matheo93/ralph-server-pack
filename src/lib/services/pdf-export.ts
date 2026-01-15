/**
 * PDF Export Service
 *
 * Generates PDF reports for household data using @react-pdf/renderer
 */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { createElement } from "react"
import type { WeeklyReportData } from "./balance-alerts"

// =============================================================================
// TYPES
// =============================================================================

export interface ExportOptions {
  includeDetails?: boolean
  includeHistory?: boolean
  dateRange?: {
    start: string
    end: string
  }
}

export interface ChildHistoryExportData {
  childId: string
  childName: string
  birthDate: string
  ageYears: number
  events: {
    date: string
    type: string
    title: string
    description?: string
    category: string
  }[]
  vaccinations: {
    date: string
    vaccine: string
    status: "done" | "pending" | "missed"
  }[]
  schoolHistory: {
    year: string
    school: string
    level: string
  }[]
}

export interface MonthlyReportData {
  month: string
  year: number
  householdName: string
  totalTasks: number
  completedTasks: number
  completionRate: number
  totalLoadPoints: number
  members: {
    userName: string
    tasksCompleted: number
    loadPoints: number
    percentage: number
  }[]
  weeklyBreakdown: {
    weekStart: string
    tasksCompleted: number
    loadPoints: number
    isBalanced: boolean
  }[]
  categoryBreakdown: {
    category: string
    loadPoints: number
    percentage: number
  }[]
  streakInfo: {
    current: number
    best: number
  }
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: "#e5e5e5",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#666666",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
    marginBottom: 10,
    paddingBottom: 4,
    borderBottom: 1,
    borderBottomColor: "#e5e5e5",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 140,
    color: "#666666",
  },
  value: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    padding: 6,
    borderBottom: 1,
    borderBottomColor: "#e5e5e5",
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottom: 1,
    borderBottomColor: "#f0f0f0",
  },
  tableCell: {
    flex: 1,
  },
  tableCellRight: {
    flex: 1,
    textAlign: "right",
  },
  alertBox: {
    padding: 10,
    backgroundColor: "#fff3cd",
    borderRadius: 4,
    marginTop: 10,
  },
  alertText: {
    color: "#856404",
  },
  successBox: {
    padding: 10,
    backgroundColor: "#d4edda",
    borderRadius: 4,
    marginTop: 10,
  },
  successText: {
    color: "#155724",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#999999",
    fontSize: 8,
    borderTop: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e5e5",
    borderRadius: 4,
    marginTop: 4,
  },
  progressFill: {
    height: 8,
    backgroundColor: "#007bff",
    borderRadius: 4,
  },
})

// =============================================================================
// CATEGORY LABELS
// =============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  administratif: "Administratif",
  sante: "Santé",
  ecole: "École",
  quotidien: "Quotidien",
  social: "Social",
  activites: "Activités",
  logistique: "Logistique",
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Janvier",
  "02": "Février",
  "03": "Mars",
  "04": "Avril",
  "05": "Mai",
  "06": "Juin",
  "07": "Juillet",
  "08": "Août",
  "09": "Septembre",
  "10": "Octobre",
  "11": "Novembre",
  "12": "Décembre",
}

// =============================================================================
// PDF DOCUMENT GENERATORS
// =============================================================================

/**
 * Generate Weekly Report PDF Document
 */
export function WeeklyReportPDF({
  report,
  householdName,
}: {
  report: WeeklyReportData
  householdName: string
}) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const completionRate = report.totalTasks > 0
    ? Math.round((report.completedTasks / report.totalTasks) * 100)
    : 0

  return createElement(
    Document,
    {},
    createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      createElement(
        View,
        { style: styles.header },
        createElement(Text, { style: styles.title }, `Rapport Hebdomadaire - ${householdName}`),
        createElement(
          Text,
          { style: styles.subtitle },
          `Semaine du ${formatDate(report.weekStart)} au ${formatDate(report.weekEnd)}`
        )
      ),

      // Summary Section
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Résumé"),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Tâches complétées :"),
          createElement(
            Text,
            { style: styles.value },
            `${report.completedTasks}/${report.totalTasks} (${completionRate}%)`
          )
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Points de charge :"),
          createElement(Text, { style: styles.value }, report.totalLoadPoints.toString())
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "État de l'équilibre :"),
          createElement(
            Text,
            { style: styles.value },
            report.isBalanced ? "Bien équilibré" : "Déséquilibré"
          )
        )
      ),

      // Members Section
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Répartition par Parent"),
        createElement(
          View,
          { style: styles.table },
          createElement(
            View,
            { style: styles.tableHeader },
            createElement(Text, { style: styles.tableCell }, "Parent"),
            createElement(Text, { style: styles.tableCellRight }, "Tâches"),
            createElement(Text, { style: styles.tableCellRight }, "Points"),
            createElement(Text, { style: styles.tableCellRight }, "%")
          ),
          ...report.members.map((member) =>
            createElement(
              View,
              { style: styles.tableRow, key: member.userId },
              createElement(Text, { style: styles.tableCell }, member.userName),
              createElement(
                Text,
                { style: styles.tableCellRight },
                member.tasksCompleted.toString()
              ),
              createElement(Text, { style: styles.tableCellRight }, member.loadPoints.toString()),
              createElement(Text, { style: styles.tableCellRight }, `${member.percentage}%`)
            )
          )
        )
      ),

      // Balance Alert
      report.isBalanced
        ? createElement(
            View,
            { style: styles.successBox },
            createElement(
              Text,
              { style: styles.successText },
              "La charge mentale est bien équilibrée cette semaine. Continuez ainsi !"
            )
          )
        : createElement(
            View,
            { style: styles.alertBox },
            createElement(
              Text,
              { style: styles.alertText },
              report.alertLevel === "critical"
                ? "Attention : La charge mentale est très déséquilibrée. Pensez à redistribuer les tâches."
                : "La répartition commence à être déséquilibrée. Surveillez la situation."
            )
          ),

      // Footer
      createElement(
        Text,
        { style: styles.footer },
        `Généré par FamilyLoad le ${new Date().toLocaleDateString("fr-FR")}`
      )
    )
  )
}

/**
 * Generate Monthly Report PDF Document
 */
export function MonthlyReportPDF({
  report,
}: {
  report: MonthlyReportData
}) {
  const monthName = MONTH_NAMES[report.month.padStart(2, "0")] ?? report.month

  return createElement(
    Document,
    {},
    createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      createElement(
        View,
        { style: styles.header },
        createElement(
          Text,
          { style: styles.title },
          `Rapport Mensuel - ${report.householdName}`
        ),
        createElement(
          Text,
          { style: styles.subtitle },
          `${monthName} ${report.year}`
        )
      ),

      // Summary
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Résumé du Mois"),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Tâches complétées :"),
          createElement(
            Text,
            { style: styles.value },
            `${report.completedTasks}/${report.totalTasks} (${report.completionRate}%)`
          )
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Points de charge :"),
          createElement(Text, { style: styles.value }, report.totalLoadPoints.toString())
        ),
        createElement(
          View,
          { style: styles.row },
          createElement(Text, { style: styles.label }, "Streak actuel :"),
          createElement(
            Text,
            { style: styles.value },
            `${report.streakInfo.current} jours (record: ${report.streakInfo.best})`
          )
        )
      ),

      // Members breakdown
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Répartition par Parent"),
        createElement(
          View,
          { style: styles.table },
          createElement(
            View,
            { style: styles.tableHeader },
            createElement(Text, { style: styles.tableCell }, "Parent"),
            createElement(Text, { style: styles.tableCellRight }, "Tâches"),
            createElement(Text, { style: styles.tableCellRight }, "Points"),
            createElement(Text, { style: styles.tableCellRight }, "%")
          ),
          ...report.members.map((member) =>
            createElement(
              View,
              { style: styles.tableRow, key: member.userName },
              createElement(Text, { style: styles.tableCell }, member.userName),
              createElement(
                Text,
                { style: styles.tableCellRight },
                member.tasksCompleted.toString()
              ),
              createElement(Text, { style: styles.tableCellRight }, member.loadPoints.toString()),
              createElement(Text, { style: styles.tableCellRight }, `${member.percentage}%`)
            )
          )
        )
      ),

      // Category breakdown
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Répartition par Catégorie"),
        createElement(
          View,
          { style: styles.table },
          createElement(
            View,
            { style: styles.tableHeader },
            createElement(Text, { style: styles.tableCell }, "Catégorie"),
            createElement(Text, { style: styles.tableCellRight }, "Points"),
            createElement(Text, { style: styles.tableCellRight }, "%")
          ),
          ...report.categoryBreakdown.map((cat) =>
            createElement(
              View,
              { style: styles.tableRow, key: cat.category },
              createElement(
                Text,
                { style: styles.tableCell },
                CATEGORY_LABELS[cat.category] ?? cat.category
              ),
              createElement(Text, { style: styles.tableCellRight }, cat.loadPoints.toString()),
              createElement(Text, { style: styles.tableCellRight }, `${cat.percentage}%`)
            )
          )
        )
      ),

      // Weekly breakdown
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Évolution Hebdomadaire"),
        createElement(
          View,
          { style: styles.table },
          createElement(
            View,
            { style: styles.tableHeader },
            createElement(Text, { style: styles.tableCell }, "Semaine"),
            createElement(Text, { style: styles.tableCellRight }, "Tâches"),
            createElement(Text, { style: styles.tableCellRight }, "Points"),
            createElement(Text, { style: styles.tableCellRight }, "Équilibre")
          ),
          ...report.weeklyBreakdown.map((week) =>
            createElement(
              View,
              { style: styles.tableRow, key: week.weekStart },
              createElement(
                Text,
                { style: styles.tableCell },
                new Date(week.weekStart).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })
              ),
              createElement(
                Text,
                { style: styles.tableCellRight },
                week.tasksCompleted.toString()
              ),
              createElement(Text, { style: styles.tableCellRight }, week.loadPoints.toString()),
              createElement(
                Text,
                { style: styles.tableCellRight },
                week.isBalanced ? "✓" : "⚠"
              )
            )
          )
        )
      ),

      // Footer
      createElement(
        Text,
        { style: styles.footer },
        `Généré par FamilyLoad le ${new Date().toLocaleDateString("fr-FR")}`
      )
    )
  )
}

/**
 * Generate Child History PDF Document
 */
export function ChildHistoryPDF({
  data,
}: {
  data: ChildHistoryExportData
}) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return createElement(
    Document,
    {},
    createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      createElement(
        View,
        { style: styles.header },
        createElement(Text, { style: styles.title }, `Historique - ${data.childName}`),
        createElement(
          Text,
          { style: styles.subtitle },
          `Né(e) le ${formatDate(data.birthDate)} (${data.ageYears} ans)`
        )
      ),

      // Vaccinations
      data.vaccinations.length > 0 &&
        createElement(
          View,
          { style: styles.section },
          createElement(Text, { style: styles.sectionTitle }, "Vaccinations"),
          createElement(
            View,
            { style: styles.table },
            createElement(
              View,
              { style: styles.tableHeader },
              createElement(Text, { style: styles.tableCell }, "Date"),
              createElement(Text, { style: styles.tableCell }, "Vaccin"),
              createElement(Text, { style: styles.tableCellRight }, "Statut")
            ),
            ...data.vaccinations.map((vac, index) =>
              createElement(
                View,
                { style: styles.tableRow, key: index },
                createElement(
                  Text,
                  { style: styles.tableCell },
                  vac.date ? formatDate(vac.date) : "-"
                ),
                createElement(Text, { style: styles.tableCell }, vac.vaccine),
                createElement(
                  Text,
                  { style: styles.tableCellRight },
                  vac.status === "done" ? "Fait" : vac.status === "pending" ? "À faire" : "Manqué"
                )
              )
            )
          )
        ),

      // School History
      data.schoolHistory.length > 0 &&
        createElement(
          View,
          { style: styles.section },
          createElement(Text, { style: styles.sectionTitle }, "Parcours Scolaire"),
          createElement(
            View,
            { style: styles.table },
            createElement(
              View,
              { style: styles.tableHeader },
              createElement(Text, { style: styles.tableCell }, "Année"),
              createElement(Text, { style: styles.tableCell }, "École"),
              createElement(Text, { style: styles.tableCellRight }, "Niveau")
            ),
            ...data.schoolHistory.map((school, index) =>
              createElement(
                View,
                { style: styles.tableRow, key: index },
                createElement(Text, { style: styles.tableCell }, school.year),
                createElement(Text, { style: styles.tableCell }, school.school),
                createElement(Text, { style: styles.tableCellRight }, school.level)
              )
            )
          )
        ),

      // Timeline Events
      data.events.length > 0 &&
        createElement(
          View,
          { style: styles.section },
          createElement(Text, { style: styles.sectionTitle }, "Événements"),
          ...data.events.slice(0, 20).map((event, index) =>
            createElement(
              View,
              {
                style: { ...styles.row, paddingBottom: 8, marginBottom: 8, borderBottom: 1, borderBottomColor: "#f0f0f0" },
                key: index,
              },
              createElement(
                View,
                { style: { width: 80 } },
                createElement(
                  Text,
                  { style: { color: "#666666", fontSize: 9 } },
                  formatDate(event.date)
                )
              ),
              createElement(
                View,
                { style: { flex: 1 } },
                createElement(
                  Text,
                  { style: { fontFamily: "Helvetica-Bold" } },
                  event.title
                ),
                event.description &&
                  createElement(
                    Text,
                    { style: { color: "#666666", marginTop: 2, fontSize: 9 } },
                    event.description
                  ),
                createElement(
                  Text,
                  { style: { color: "#999999", marginTop: 2, fontSize: 8 } },
                  CATEGORY_LABELS[event.category] ?? event.category
                )
              )
            )
          )
        ),

      // Footer
      createElement(
        Text,
        { style: styles.footer },
        `Généré par FamilyLoad le ${new Date().toLocaleDateString("fr-FR")}`
      )
    )
  )
}

// =============================================================================
// EXPORT UTILITY FUNCTIONS
// =============================================================================

/**
 * Get export filename with date
 */
export function getExportFilename(type: "weekly" | "monthly" | "child", identifier?: string): string {
  const date = new Date().toISOString().split("T")[0]
  switch (type) {
    case "weekly":
      return `rapport-hebdomadaire-${date}.pdf`
    case "monthly":
      return `rapport-mensuel-${identifier ?? date.substring(0, 7)}.pdf`
    case "child":
      return `historique-${identifier ?? "enfant"}-${date}.pdf`
    default:
      return `export-${date}.pdf`
  }
}

/**
 * Format bytes to human readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
