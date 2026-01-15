import {
  Document,
  Page,
  Text,
  View,
} from "@react-pdf/renderer"
import type { ChargeReportData } from "@/lib/services/export"
import {
  baseStyles,
  tableStyles,
  chartStyles,
  statsStyles,
  memberColors,
  categoryColors,
  formatDate,
  formatDateTime,
} from "./styles"

interface ChargeReportPDFProps {
  data: ChargeReportData
}

/**
 * PDF Document for Charge Mental Report
 * Displays load distribution between parents with charts and statistics
 */
export function ChargeReportPDF({ data }: ChargeReportPDFProps) {
  return (
    <Document
      title={`FamilyLoad - Rapport Charge Mentale - ${data.householdName}`}
      author="FamilyLoad"
      subject="Rapport de répartition de la charge mentale"
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
        <Text style={baseStyles.title}>Rapport de Charge Mentale</Text>
        <Text style={baseStyles.subtitle}>
          {data.period.label} ({formatDate(data.period.start)} - {formatDate(data.period.end)})
        </Text>

        {/* Statistics Overview */}
        <View style={statsStyles.statsGrid}>
          <View style={statsStyles.statCard}>
            <Text style={statsStyles.statValue}>{data.totalLoad}</Text>
            <Text style={statsStyles.statLabel}>Points de charge totaux</Text>
          </View>
          <View style={statsStyles.statCard}>
            <Text style={statsStyles.statValue}>{data.balance.ratio}</Text>
            <Text style={statsStyles.statLabel}>Répartition</Text>
            <View style={[
              statsStyles.statBadge,
              data.balance.alertLevel === "none" ? statsStyles.badgeBalanced :
              data.balance.alertLevel === "warning" ? statsStyles.badgeWarning :
              statsStyles.badgeCritical
            ]}>
              <Text>
                {data.balance.isBalanced ? "Équilibré" :
                 data.balance.alertLevel === "warning" ? "Attention" : "Déséquilibre"}
              </Text>
            </View>
          </View>
          <View style={statsStyles.statCard}>
            <Text style={statsStyles.statValue}>
              {data.members.reduce((sum, m) => sum + m.tasksCount, 0)}
            </Text>
            <Text style={statsStyles.statLabel}>Tâches sur la période</Text>
          </View>
        </View>

        {/* Member Distribution Chart */}
        <Text style={baseStyles.sectionTitle}>Répartition par Parent</Text>
        <View style={chartStyles.chartContainer}>
          {data.members.map((member, index) => (
            <View key={member.userId} style={chartStyles.barContainer}>
              <Text style={chartStyles.barLabel}>{member.userName}</Text>
              <View style={chartStyles.barTrack}>
                <View
                  style={[
                    chartStyles.barFill,
                    {
                      width: `${Math.min(member.percentage, 100)}%`,
                      backgroundColor: memberColors[index % memberColors.length],
                    },
                  ]}
                />
              </View>
              <Text style={chartStyles.barValue}>
                {member.percentage}% ({member.totalLoad} pts)
              </Text>
            </View>
          ))}
        </View>

        {/* Member Details Table */}
        <View style={tableStyles.table}>
          <View style={tableStyles.tableHeader}>
            <Text style={[tableStyles.tableHeaderCell, { flex: 2 }]}>Parent</Text>
            <Text style={[tableStyles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Tâches</Text>
            <Text style={[tableStyles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Points</Text>
            <Text style={[tableStyles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>%</Text>
          </View>
          {data.members.map((member, index) => (
            <View
              key={member.userId}
              style={[tableStyles.tableRow, index % 2 === 1 ? tableStyles.tableRowAlt : {}]}
            >
              <Text style={[tableStyles.tableCell, { flex: 2 }]}>{member.userName}</Text>
              <Text style={[tableStyles.tableCell, { flex: 1, textAlign: "center" }]}>
                {member.tasksCount}
              </Text>
              <Text style={[tableStyles.tableCell, { flex: 1, textAlign: "center" }]}>
                {member.totalLoad}
              </Text>
              <Text style={[tableStyles.tableCell, { flex: 1, textAlign: "center" }]}>
                {member.percentage}%
              </Text>
            </View>
          ))}
        </View>

        {/* Category Distribution */}
        <Text style={baseStyles.sectionTitle}>Répartition par Catégorie</Text>
        <View style={chartStyles.chartContainer}>
          {data.categories.slice(0, 7).map((category) => (
            <View key={category.code} style={chartStyles.barContainer}>
              <Text style={chartStyles.barLabel}>{category.label}</Text>
              <View style={chartStyles.barTrack}>
                <View
                  style={[
                    chartStyles.barFill,
                    {
                      width: `${Math.min(category.percentage, 100)}%`,
                      backgroundColor: categoryColors[category.code] ?? "#6b7280",
                    },
                  ]}
                />
              </View>
              <Text style={chartStyles.barValue}>
                {category.percentage}% ({category.totalLoad} pts)
              </Text>
            </View>
          ))}
        </View>

        {/* Category Details Table */}
        <View style={tableStyles.table}>
          <View style={tableStyles.tableHeader}>
            <Text style={[tableStyles.tableHeaderCell, { flex: 2 }]}>Catégorie</Text>
            <Text style={[tableStyles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>Points</Text>
            <Text style={[tableStyles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>%</Text>
            {data.members.slice(0, 2).map((member) => (
              <Text
                key={member.userId}
                style={[tableStyles.tableHeaderCell, { flex: 1, textAlign: "center" }]}
              >
                {member.userName.slice(0, 8)}
              </Text>
            ))}
          </View>
          {data.categories.map((category, index) => (
            <View
              key={category.code}
              style={[tableStyles.tableRow, index % 2 === 1 ? tableStyles.tableRowAlt : {}]}
            >
              <Text style={[tableStyles.tableCell, { flex: 2 }]}>{category.label}</Text>
              <Text style={[tableStyles.tableCell, { flex: 1, textAlign: "center" }]}>
                {category.totalLoad}
              </Text>
              <Text style={[tableStyles.tableCell, { flex: 1, textAlign: "center" }]}>
                {category.percentage}%
              </Text>
              {category.memberBreakdown.slice(0, 2).map((mb) => (
                <Text
                  key={mb.userId}
                  style={[tableStyles.tableCell, { flex: 1, textAlign: "center" }]}
                >
                  {mb.percentage}%
                </Text>
              ))}
            </View>
          ))}
        </View>

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
