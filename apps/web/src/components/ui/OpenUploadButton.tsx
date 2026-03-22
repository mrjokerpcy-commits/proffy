"use client";
export default function OpenUploadButton() {
  return (
    <button
      data-tour="upload-btn"
      onClick={() => window.dispatchEvent(new Event("proffy:open-upload"))}
      style={{
        display: "flex", alignItems: "center", gap: "7px",
        fontSize: "13px", fontWeight: 600, padding: "8px 16px",
        borderRadius: "9px", background: "var(--blue)", color: "#fff",
        boxShadow: "0 2px 14px rgba(79,142,247,0.35)",
        border: "none", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Upload
    </button>
  );
}
