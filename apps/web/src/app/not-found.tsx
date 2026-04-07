import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Image
        src="/mascot/confused.png"
        alt="Confused owl"
        width={180}
        height={180}
        style={{ objectFit: "contain" }}
      />

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "72px", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>
          404
        </div>
        <div style={{ fontSize: "18px", color: "var(--text-secondary)", marginTop: "8px" }}>
          This page does not exist
        </div>
      </div>

      <Link
        href="/dashboard"
        style={{
          padding: "10px 24px",
          borderRadius: "8px",
          background: "linear-gradient(135deg, #4f8ef7, #a78bfa)",
          color: "#fff",
          fontWeight: 600,
          fontSize: "15px",
          textDecoration: "none",
        }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
