import {
  Document,
  Page,
  Text,
  View,
} from "@react-pdf/renderer"
import type { TaskHistoryData } from "@/lib/services/export"
import {
  baseStyles,
  tableStyles,
  statsStyles,
  statusColors,
  formatDate,
  formatDateTime,
} from "./styles"

interface TasksHistoryPDFProps {
  data: TaskHistoryData
}

/**
 * Get status label in French
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case "done":
      return "Terminé"
    case "pending":
      return "En cours"
    case "reported":
      return "Reporté"
    case "cancelled":
      return "Annulé"
    default:
      return status
  }
}

/**
 * PDF Document for Tasks History
 * Displays task list with dates and statistics
 */
export function TasksHistoryPDF({ data }: TasksHistoryPDFProps) {
  return (
    <Document
      title={`FamilyLoad - Historique des Tâches - ${data.householdName}`}
      author="FamilyLoad"
      subject="Historique des tâches du foyer"
      creator="FamilyLoad App"
    >
      <Page size="A4" style={baseStyles.page}>
        {/* Header */}
        <View style={baseStyles.header}>
          <View>
            <Text style={baseStyles.logo}>
              Family<Text style={baseStyles.logoAccent}>Load</Text>
            </Text>
          </View>
          <View style={baseStyles.headerRight}>
            <Text>{data.householdName}</Text>
            <Text>{formatDateTime(data.generatedAt)}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={baseStyles.title}>Historique des Tâches</Text>
        <Text style={baseStyles.subtitle}>
          {data.period.label} ({formatDate(data.period.start)} - {formatDate(data.period.end)})
        </Text>

        {/* Statistics Overview */}
        <View style={statsStyles.statsGrid}>
          <View style={statsStyles.statCard}>
            <Text style={statsStyles.statValue}>{data.statistics.totalTasks}</Text>
            <Text style={statsStyles.statLabel}>Tâches totales</Text>
          </View>
          <View style={statsStyles.statCard}>
            <Text style={statsStyles.statValue}>{data.statistics.completedTasks}</Text>
            <Text style={statsStyles.statLabel}>Tâches terminées</Text>
          </View>
          <View style={statsStyles.statCard}>
            <Text style={statsStyles.statValue}>{data.statistics.completionRate}%</Text>
            <Text style={statsStyles.statLabel}>Taux de complétion</Text>
            <View style={[
              statsStyles.statBadge,
              data.statistics.completionRate >= 80 ? statsStyles.badgeBalanced :
              data.statistics.completionRate >= 50 ? statsStyles.badgeWarning :
              statsStyles.badgeCritical
            ]}>
              <Text>
                {data.statistics.completionRate >= 80 ? "Excellent" :
                 data.statistics.completionRate >= 50 ? "Moyen" : "À améliorer"}
              </Text>
            </View>
          </View>
          <View style={statsStyles.statCard}>
            <Text style={statsStyles.statValue}>{data.statistics.totalLoad}</Text>
            <Text style={statsStyles.statLabel}>Points de charge</Text>
          </View>
        </View>

        {/* Tasks Table */}
        <Text style={baseStyles.sectionTitle}>Liste des Tâches</Text>
        <View style={tableStyles.table}>
          <View style={tableStyles.tableHeader}>
            <Text style={[tableStyles.tableHeaderCell, { flex: 3 }]}>Tâche</Text>
            <Text style={[tableStyles.tableHeaderCell, { flex: 1.5 }]}>Catégorie</Text>
            <Text style={[tableStyles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Statut</Text>
            <Text style={[tableStyles.tableHeaderCell, { flex: 1.2, textAlign: "center" }]}>Échéance</Text>
            <Text style={[tableStyles.tableHeaderCell, { flex: 1.2, textAlign: "center" }]}>Assigné</Text>
            <Text style={[tableStyles.tableHeaderCell, { flex: 0.5, textAlign: "center" }]}>Pts</Text>
          </View>
          {data.tasks.map((task, index) => (
            <View
              key={task.id}
              style={[tableStyles.tableRow, index % 2 === 1 ? tableStyles.tableRowAlt : {}]}
            >
              <View style={{ flex: 3 }}>
                <Text style={tableStyles.tableCell}>{task.title}</Text>
                {task.childName && (
                  <Text style={[tableStyles.tableCell, { fontSize: 7, color: "#9ca3af" }]}>
                    Pour: {task.childName}
                  </Text>
                )}
              </View>
              <Text style={[tableStyles.tableCell, { flex: 1.5 }]}>
                {task.category ?? "-"}
              </Text>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={[
                    tableStyles.tableCell,
                    {
                      paddingVertical: 2,
                      paddingHorizontal: 6,
                      borderRadius: 4,
                      backgroundColor:
                        statusColors[task.status as keyof typeof statusColors] ?? "#6b7280",
                      color: "#ffffff",
                      fontSize: 7,
                    },
                  ]}
                >
                  {getStatusLabel(task.status)}
                </Text>
              </View>
              <Text style={[tableStyles.tableCell, { flex: 1.2, textAlign: "center" }]}>
                {formatDate(task.deadline)}
              </Text>
              <Text style={[tableStyles.tableCell, { flex: 1.2, textAlign: "center" }]}>
                {task.assignedTo ?? "-"}
              </Text>
              <Text style={[tableStyles.tableCell, { flex: 0.5, textAlign: "center" }]}>
                {task.loadWeight}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary by Status */}
        {data.tasks.length > 0 && (
          <>
            <Text style={baseStyles.sectionTitle}>Résumé par Statut</Text>
            <View style={tableStyles.table}>
              <View style={tableStyles.tableHeader}>
                <Text style={[tableStyles.tableHeaderCell, { flex: 2 }]}>Statut</Text>
                <Text style={[tableStyles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Nombre</Text>
                <Text style={[tableStyles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>%</Text>
              </View>
              {Object.entries(
                data.tasks.reduce((acc, task) => {
                  acc[task.status] = (acc[task.status] ?? 0) + 1
                  return acc
                }, {} as Record<string, number>)
              ).map(([status, count], index) => (
                <View
                  key={status}
                  style={[tableStyles.tableRow, index % 2 === 1 ? tableStyles.tableRowAlt : {}]}
                >
                  <Text style={[tableStyles.tableCell, { flex: 2 }]}>
                    {getStatusLabel(status)}
                  </Text>
                  <Text style={[tableStyles.tableCell, { flex: 1, textAlign: "center" }]}>
                    {count}
                  </Text>
                  <Text style={[tableStyles.tableCell, { flex: 1, textAlign: "center" }]}>
                    {Math.round((count / data.tasks.length) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={baseStyles.footer} fixed>
          <Text>
            FamilyLoad - Rapport généré le {formatDateTime(data.generatedAt)}
          </Text>
          <Text
            style={baseStyles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber}/${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
