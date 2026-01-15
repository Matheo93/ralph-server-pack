import { StyleSheet } from "@react-pdf/renderer"

/**
 * Base styles for FamilyLoad PDF exports
 * Uses system fonts for maximum compatibility
 */
export const baseStyles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2563eb",
    fontFamily: "Helvetica-Bold",
  },
  logoAccent: {
    color: "#7c3aed",
  },
  headerRight: {
    textAlign: "right",
    fontSize: 9,
    color: "#6b7280",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
    color: "#111827",
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#374151",
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  text: {
    fontSize: 10,
    marginBottom: 5,
    lineHeight: 1.5,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  column: {
    flexDirection: "column",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 8,
    color: "#9ca3af",
  },
  pageNumber: {
    fontSize: 8,
    color: "#9ca3af",
  },
})

/**
 * Styles for tables in PDFs
 */
export const tableStyles = StyleSheet.create({
  table: {
    width: "100%",
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#d1d5db",
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  tableCell: {
    fontSize: 9,
    color: "#4b5563",
  },
})

/**
 * Styles for charts/graphs in PDFs
 */
export const chartStyles = StyleSheet.create({
  chartContainer: {
    marginTop: 15,
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  barContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  barLabel: {
    width: 100,
    fontSize: 9,
    color: "#374151",
  },
  barTrack: {
    flex: 1,
    height: 16,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 10,
  },
  barFill: {
    height: "100%",
    borderRadius: 8,
  },
  barValue: {
    width: 50,
    fontSize: 9,
    textAlign: "right",
    color: "#6b7280",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    gap: 15,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 5,
  },
  legendText: {
    fontSize: 8,
    color: "#6b7280",
  },
})

/**
 * Styles for statistics cards in PDFs
 */
export const statsStyles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    marginBottom: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 15,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 9,
    color: "#6b7280",
    textAlign: "center",
  },
  statBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginTop: 5,
    fontSize: 8,
  },
  badgeBalanced: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  badgeWarning: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  badgeCritical: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
})

/**
 * Status badge colors
 */
export const statusColors = {
  done: "#22c55e",
  pending: "#f59e0b",
  reported: "#6b7280",
  cancelled: "#ef4444",
}

/**
 * Member colors for charts (cycling)
 */
export const memberColors = [
  "#2563eb", // Blue
  "#7c3aed", // Purple
  "#ec4899", // Pink
  "#f97316", // Orange
  "#10b981", // Green
  "#06b6d4", // Cyan
]

/**
 * Category colors for charts
 */
export const categoryColors: Record<string, string> = {
  administratif: "#ef4444",
  sante: "#22c55e",
  ecole: "#3b82f6",
  quotidien: "#f59e0b",
  social: "#8b5cf6",
  activites: "#ec4899",
  logistique: "#14b8a6",
}

/**
 * Format date for display in PDFs
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Format date with time for PDFs
 */
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
