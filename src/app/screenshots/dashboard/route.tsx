import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
          padding: "40px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "16px",
              }}
            >
              <span style={{ fontSize: "28px", color: "white", fontWeight: "bold" }}>F</span>
            </div>
            <span style={{ fontSize: "28px", fontWeight: "bold", color: "#1e293b" }}>
              FamilyLoad
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
            }}
          >
            <div
              style={{
                padding: "8px 20px",
                backgroundColor: "#e2e8f0",
                borderRadius: "8px",
                color: "#64748b",
                fontSize: "16px",
              }}
            >
              Dashboard
            </div>
            <div
              style={{
                padding: "8px 20px",
                backgroundColor: "#3b82f6",
                borderRadius: "8px",
                color: "white",
                fontSize: "16px",
              }}
            >
              + Nouvelle tâche
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: "flex", flex: 1, gap: "32px" }}>
          {/* Left Column - Tasks */}
          <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "20px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", margin: 0 }}>
              Tâches du jour
            </h2>

            {/* Task Cards */}
            {[
              { title: "RDV dentiste Emma", time: "14h00", status: "urgent" },
              { title: "Courses alimentaires", time: "18h00", status: "normal" },
              { title: "Aide devoirs Lucas", time: "17h00", status: "normal" },
              { title: "Préparer cartable", time: "20h00", status: "done" },
            ].map((task, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "20px",
                  backgroundColor: "white",
                  borderRadius: "16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  borderLeft: `4px solid ${
                    task.status === "urgent"
                      ? "#ef4444"
                      : task.status === "done"
                        ? "#22c55e"
                        : "#3b82f6"
                  }`,
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    border: `2px solid ${task.status === "done" ? "#22c55e" : "#d1d5db"}`,
                    backgroundColor: task.status === "done" ? "#22c55e" : "transparent",
                    marginRight: "16px",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      color: task.status === "done" ? "#94a3b8" : "#1e293b",
                      margin: 0,
                      textDecoration: task.status === "done" ? "line-through" : "none",
                    }}
                  >
                    {task.title}
                  </p>
                </div>
                <span style={{ fontSize: "14px", color: "#64748b" }}>{task.time}</span>
              </div>
            ))}
          </div>

          {/* Right Column - Stats */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", margin: 0 }}>
              Répartition
            </h2>

            {/* Chart Placeholder */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "160px",
                  height: "160px",
                  borderRadius: "50%",
                  background: "conic-gradient(#3b82f6 0% 55%, #ec4899 55% 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    backgroundColor: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#1e293b",
                  }}
                >
                  55%
                </div>
              </div>
              <div style={{ display: "flex", gap: "24px", marginTop: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: "#3b82f6",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#64748b" }}>Maman 55%</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: "#ec4899",
                    }}
                  />
                  <span style={{ fontSize: "14px", color: "#64748b" }}>Papa 45%</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <span style={{ fontSize: "14px", color: "#64748b" }}>Complétées</span>
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#22c55e" }}>12</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <span style={{ fontSize: "14px", color: "#64748b" }}>En attente</span>
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#3b82f6" }}>4</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "14px", color: "#64748b" }}>Urgentes</span>
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#ef4444" }}>1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1280,
      height: 720,
    }
  )
}
