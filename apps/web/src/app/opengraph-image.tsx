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
          background: "linear-gradient(135deg, #0a0f1a 0%, #0d1a12 50%, #0a0f1a 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "24px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Green glow behind owl */}
        <div style={{
          position: "absolute", width: "400px", height: "400px",
          background: "radial-gradient(circle, rgba(22,163,74,0.25) 0%, transparent 70%)",
          borderRadius: "50%", top: "80px", left: "50%", transform: "translateX(-50%)",
          display: "flex",
        }} />

        {/* Owl */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://proffy.study/logo-owl.png"
          width={220}
          height={220}
          style={{ objectFit: "contain", position: "relative" }}
        />

        {/* Title */}
        <div style={{
          fontSize: "56px", fontWeight: 900, color: "#ffffff",
          letterSpacing: "-0.03em", textAlign: "center",
          lineHeight: 1.1, position: "relative",
        }}>
          Proffy
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: "26px", color: "rgba(255,255,255,0.55)",
          textAlign: "center", position: "relative", fontWeight: 400,
        }}>
          AI Study Tools for Every Student
        </div>

        {/* Domain badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.3)",
          borderRadius: "99px", padding: "8px 20px", position: "relative",
        }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a" }} />
          <span style={{ fontSize: "18px", color: "#22c55e", fontWeight: 700 }}>proffy.study</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
