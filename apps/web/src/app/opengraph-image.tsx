import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Proffy – AI Study Tools for Every Student";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px", height: "630px",
          background: "#0d1117",
          display: "flex",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle purple glow top-left */}
        <div style={{
          position: "absolute", width: "600px", height: "600px",
          background: "radial-gradient(circle, rgba(79,142,247,0.12) 0%, transparent 70%)",
          borderRadius: "50%", top: "-200px", left: "-100px", display: "flex",
        }} />

        {/* ── LEFT PANEL: Branding ── */}
        <div style={{
          width: "420px", height: "630px",
          display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "flex-start",
          padding: "0 0 0 60px", gap: "20px",
          position: "relative",
        }}>
          {/* Owl + name row */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://proffy.study/og-owl.png"
              width={72} height={72}
              style={{ objectFit: "contain" }}
            />
            <span style={{ fontSize: "38px", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.02em" }}>
              Proffy
            </span>
          </div>

          <div style={{ fontSize: "20px", color: "rgba(255,255,255,0.5)", lineHeight: 1.4, fontWeight: 400 }}>
            AI study tools for university students
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
            {[
              { icon: "💬", label: "AI Chat per course" },
              { icon: "🃏", label: "Spaced repetition flashcards" },
              { icon: "📄", label: "Upload exams and slides" },
            ].map((f) => (
              <div key={f.label} style={{
                display: "flex", alignItems: "center", gap: "10px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px", padding: "10px 16px",
              }}>
                <span style={{ fontSize: "18px" }}>{f.icon}</span>
                <span style={{ fontSize: "16px", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Domain */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            marginTop: "8px",
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: "15px", color: "#22c55e", fontWeight: 700 }}>proffy.study</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: "1px", height: "400px",
          background: "rgba(255,255,255,0.08)",
          alignSelf: "center", display: "flex",
        }} />

        {/* ── RIGHT PANEL: Mock UI ── */}
        <div style={{
          flex: 1, height: "630px",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "40px 50px 40px 40px",
        }}>
          {/* App window card */}
          <div style={{
            width: "100%", height: "100%",
            background: "#161b22",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Window top bar */}
            <div style={{
              height: "40px", background: "#0d1117",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", padding: "0 16px", gap: "8px",
            }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f87171" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#fbbf24" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#34d399" }} />
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginLeft: "10px" }}>
                Calculus 1 — Chat
              </span>
            </div>

            {/* Chat area */}
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              gap: "14px", padding: "20px 20px 16px",
            }}>
              {/* User message */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  background: "linear-gradient(135deg, #4f8ef7, #a78bfa)",
                  borderRadius: "12px 12px 2px 12px",
                  padding: "10px 14px", maxWidth: "75%",
                  fontSize: "14px", color: "#fff", fontWeight: 500,
                }}>
                  What is the derivative of x² sin(x)?
                </div>
              </div>

              {/* AI message */}
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://proffy.study/og-owl.png" width={28} height={28} style={{ objectFit: "contain", marginTop: "2px" }} />
                <div style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px 12px 12px 2px",
                  padding: "10px 14px", maxWidth: "80%",
                  fontSize: "14px", color: "rgba(255,255,255,0.85)", lineHeight: 1.5,
                }}>
                  Using the product rule: <span style={{ color: "#a78bfa", fontWeight: 600 }}>f(x) = x²·sin(x)</span>
                  <br />f′(x) = 2x·sin(x) + x²·cos(x)
                </div>
              </div>

              {/* User message 2 */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  background: "linear-gradient(135deg, #4f8ef7, #a78bfa)",
                  borderRadius: "12px 12px 2px 12px",
                  padding: "10px 14px", maxWidth: "75%",
                  fontSize: "14px", color: "#fff", fontWeight: 500,
                }}>
                  Will this appear on the final exam?
                </div>
              </div>

              {/* AI message 2 */}
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://proffy.study/og-owl.png" width={28} height={28} style={{ objectFit: "contain", marginTop: "2px" }} />
                <div style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px 12px 12px 2px",
                  padding: "10px 14px", maxWidth: "80%",
                  fontSize: "14px", color: "rgba(255,255,255,0.85)", lineHeight: 1.5,
                }}>
                  Based on past exams, product rule questions appear in{" "}
                  <span style={{ color: "#34d399", fontWeight: 600 }}>73% of finals</span>. High priority.
                </div>
              </div>
            </div>

            {/* Input bar */}
            <div style={{
              height: "48px", borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", padding: "0 16px", gap: "10px",
            }}>
              <div style={{
                flex: 1, height: "32px", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
              }} />
              <div style={{
                width: "32px", height: "32px", borderRadius: "8px",
                background: "linear-gradient(135deg, #4f8ef7, #a78bfa)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#fff", fontSize: "14px" }}>↑</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
