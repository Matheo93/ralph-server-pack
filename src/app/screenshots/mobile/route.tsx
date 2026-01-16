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
          padding: "0",
        }}
      >
        {/* Status Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 24px",
            backgroundColor: "#3b82f6",
          }}
        >
          <span style={{ fontSize: "14px", color: "white", fontWeight: "600" }}>9:41</span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div
              style={{
                width: "20px",
                height: "12px",
                backgroundColor: "white",
                borderRadius: "2px",
              }}
            />
          </div>
        </div>

        {/* App Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            backgroundColor: "#3b82f6",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "12px",
              }}
            >
              <span style={{ fontSize: "24px", color: "#3b82f6", fontWeight: "bold" }}>F</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "20px", fontWeight: "bold", color: "white" }}>
                FamilyLoad
              </span>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)" }}>
                Bonjour, Sophie
              </span>
            </div>
          </div>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "20px" }}>+</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "20px 24px",
            backgroundColor: "#3b82f6",
            borderBottomLeftRadius: "24px",
            borderBottomRightRadius: "24px",
          }}
        >
          {[
            { label: "Aujourd'hui", value: "4", color: "#fef3c7" },
            { label: "Cette semaine", value: "12", color: "#dbeafe" },
            { label: "Complétées", value: "8", color: "#d1fae5" },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: "12px",
                padding: "12px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "24px", fontWeight: "bold", color: "white" }}>
                {stat.value}
              </span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)" }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b", margin: 0 }}>
              Tâches du jour
            </h2>
            <span style={{ fontSize: "14px", color: "#3b82f6" }}>Voir tout</span>
          </div>

          {/* Task Cards */}
          {[
            { title: "RDV dentiste Emma", time: "14:00", emoji: "🦷", urgent: true },
            { title: "Courses Carrefour", time: "18:00", emoji: "🛒", urgent: false },
            { title: "Devoirs Lucas", time: "17:00", emoji: "📚", urgent: false },
          ].map((task, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "16px",
                backgroundColor: "white",
                borderRadius: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: task.urgent ? "#fef2f2" : "#f0f9ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: "14px",
                  fontSize: "24px",
                }}
              >
                {task.emoji}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#1e293b",
                    marginBottom: "4px",
                  }}
                >
                  {task.title}
                </span>
                <span style={{ fontSize: "13px", color: "#64748b" }}>{task.time}</span>
              </div>
              {task.urgent && (
                <div
                  style={{
                    padding: "4px 10px",
                    backgroundColor: "#fef2f2",
                    borderRadius: "20px",
                    fontSize: "12px",
                    color: "#ef4444",
                    fontWeight: "600",
                  }}
                >
                  Urgent
                </div>
              )}
            </div>
          ))}

          {/* Voice Button */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "auto",
              paddingTop: "20px",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
              }}
            >
              <span style={{ fontSize: "32px" }}>🎤</span>
            </div>
          </div>
          <p
            style={{
              textAlign: "center",
              fontSize: "14px",
              color: "#64748b",
              margin: "8px 0 0 0",
            }}
          >
            Appuyez pour dicter une tâche
          </p>
        </div>

        {/* Bottom Nav */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            padding: "16px 24px",
            backgroundColor: "white",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          {[
            { icon: "🏠", label: "Accueil", active: true },
            { icon: "📋", label: "Tâches", active: false },
            { icon: "👨‍👩‍👧", label: "Famille", active: false },
            { icon: "⚙️", label: "Réglages", active: false },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "24px" }}>{item.icon}</span>
              <span
                style={{
                  fontSize: "11px",
                  color: item.active ? "#3b82f6" : "#94a3b8",
                  fontWeight: item.active ? "600" : "400",
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 750,
      height: 1334,
    }
  )
}
