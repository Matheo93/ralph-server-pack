import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "FamilyLoad - Gérez la charge mentale parentale"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, #eff6ff 0%, transparent 50%), radial-gradient(circle at 75% 75%, #dbeafe 0%, transparent 50%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                backgroundColor: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "20px",
              }}
            >
              <span style={{ fontSize: "48px", color: "white" }}>F</span>
            </div>
            <span
              style={{
                fontSize: "64px",
                fontWeight: "bold",
                background: "linear-gradient(90deg, #3b82f6, #1d4ed8)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              FamilyLoad
            </span>
          </div>

          <h1
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              textAlign: "center",
              color: "#1e293b",
              marginBottom: "16px",
              lineHeight: 1.2,
            }}
          >
            Gérez la charge mentale
            <br />
            parentale en famille
          </h1>

          <p
            style={{
              fontSize: "24px",
              textAlign: "center",
              color: "#64748b",
              marginBottom: "32px",
              maxWidth: "800px",
            }}
          >
            Créez des tâches à la voix, partagez-les entre co-parents
            et visualisez qui fait quoi.
          </p>

          <div
            style={{
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {["Commande vocale", "Répartition équitable", "Rappels intelligents"].map(
              (feature) => (
                <div
                  key={feature}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#eff6ff",
                    borderRadius: "100px",
                    color: "#3b82f6",
                    fontSize: "18px",
                    fontWeight: "600",
                  }}
                >
                  {feature}
                </div>
              )
            )}
          </div>

          <div
            style={{
              marginTop: "40px",
              padding: "16px 32px",
              backgroundColor: "#3b82f6",
              borderRadius: "12px",
              color: "white",
              fontSize: "20px",
              fontWeight: "bold",
            }}
          >
            Essai gratuit 14 jours
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "20px",
            right: "40px",
            fontSize: "16px",
            color: "#94a3b8",
          }}
        >
          familyload.fr
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
