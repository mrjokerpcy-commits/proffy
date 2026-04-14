"use client";

import { useMemo, useState } from "react";

type RequestState = {
  loading: boolean;
  status: number | null;
  body: string;
  error: string | null;
};

const initialRequestState: RequestState = {
  loading: false,
  status: null,
  body: "",
  error: null,
};

const liveEndpoints = [
  { label: "Health", path: "/health", method: "GET" },
  { label: "Chat (protected)", path: "/api/chat", method: "POST" },
  { label: "Courses (protected)", path: "/api/courses", method: "GET" },
];

const trustSignals = [
  "Standalone mode works without backend",
  "Live mode hits your real API",
  "Clear HTTP status + raw payload",
];

export default function FrontendBridgePage() {
  const [backendUrl, setBackendUrl] = useState(
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001",
  );
  const [mode, setMode] = useState<"live" | "mock">("mock");
  const [selectedPath, setSelectedPath] = useState("/health");
  const [requestBody, setRequestBody] = useState('{"message":"Test from frontend"}');
  const [requestState, setRequestState] = useState<RequestState>(initialRequestState);

  const selectedEndpoint = useMemo(
    () => liveEndpoints.find((endpoint) => endpoint.path === selectedPath) || liveEndpoints[0],
    [selectedPath],
  );

  async function runRequest() {
    if (mode === "mock") {
      setRequestState({
        loading: false,
        status: 200,
        error: null,
        body: JSON.stringify(
          {
            source: "mock",
            endpoint: selectedEndpoint.path,
            message: "Standalone mode active. Backend is not required.",
            mockData: {
              online: true,
              users: 12,
              queuedJobs: 3,
            },
          },
          null,
          2,
        ),
      });
      return;
    }

    setRequestState({ loading: true, status: null, body: "", error: null });

    try {
      const url = `${backendUrl.replace(/\/$/, "")}${selectedEndpoint.path}`;
      const init: RequestInit = { method: selectedEndpoint.method };

      if (selectedEndpoint.method !== "GET") {
        init.headers = { "Content-Type": "application/json" };
        init.body = requestBody;
      }

      const response = await fetch(url, init);
      const text = await response.text();

      setRequestState({
        loading: false,
        status: response.status,
        body: text || "(empty response)",
        error: null,
      });
    } catch (error) {
      setRequestState({
        loading: false,
        status: null,
        body: "",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "36px 20px 60px",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
      }}
    >
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <header
          style={{
            marginBottom: 22,
            border: "1px solid var(--border)",
            background:
              "radial-gradient(circle at 15% 20%, rgba(22,163,74,0.18), transparent 45%), var(--bg-surface)",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <p
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--blue-hover)",
              background: "var(--blue-dim)",
              padding: "5px 10px",
              borderRadius: 999,
              marginBottom: 10,
            }}
          >
            Frontend-first SaaS shell
          </p>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            Unique frontend, connected to your backend
          </h1>
          <p style={{ marginTop: 10, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 760 }}>
            Minimal but premium API console with trust cues and interactive testing. Use it as a standalone
            product demo, then switch to live mode for real backend integration.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {trustSignals.map((signal) => (
              <div
                key={signal}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                  borderRadius: 999,
                  padding: "6px 11px",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {signal}
              </div>
            ))}
          </div>
        </header>

        <section
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            borderRadius: 16,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <button
              className="btn-primary"
              onClick={() => setMode("mock")}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                opacity: mode === "mock" ? 1 : 0.75,
                cursor: "pointer",
              }}
            >
              Standalone (Mock)
            </button>
            <button
              className="btn-ghost"
              onClick={() => setMode("live")}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                opacity: mode === "live" ? 1 : 0.75,
                cursor: "pointer",
              }}
            >
              Live Backend
            </button>
          </div>

          <label
            htmlFor="backend-url"
            style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}
          >
            Backend URL
          </label>
          <input
            id="backend-url"
            className="input-ring"
            value={backendUrl}
            onChange={(event) => setBackendUrl(event.target.value)}
            style={{
              width: "100%",
              borderRadius: 10,
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              padding: "10px 12px",
              marginBottom: 12,
            }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 4 }}>
            <div>
              <label
                htmlFor="endpoint"
                style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}
              >
                Endpoint
              </label>
              <select
                id="endpoint"
                className="input-ring"
                value={selectedPath}
                onChange={(event) => setSelectedPath(event.target.value)}
                style={{
                  width: "100%",
                  borderRadius: 10,
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  padding: "10px 12px",
                }}
              >
                {liveEndpoints.map((endpoint) => (
                  <option key={endpoint.path} value={endpoint.path}>
                    {endpoint.label} - {endpoint.method} {endpoint.path}
                  </option>
                ))}
              </select>
            </div>

            {selectedEndpoint.method !== "GET" && (
              <div>
                <label
                  htmlFor="request-body"
                  style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}
                >
                  Request JSON body
                </label>
                <textarea
                  id="request-body"
                  className="input-ring"
                  value={requestBody}
                  onChange={(event) => setRequestBody(event.target.value)}
                  rows={5}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    padding: "10px 12px",
                    fontFamily: "monospace",
                  }}
                />
              </div>
            )}
          </div>

          <button
            className="btn-primary"
            onClick={runRequest}
            disabled={requestState.loading}
            style={{
              marginTop: 14,
              padding: "10px 16px",
              borderRadius: 10,
              cursor: requestState.loading ? "not-allowed" : "pointer",
            }}
          >
            {requestState.loading ? "Sending..." : "Send Request"}
          </button>
        </section>

        <section
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 10 }}>Response Console</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 10, fontSize: 14 }}>
            Mode: <strong>{mode}</strong>
            {requestState.status !== null ? ` | HTTP ${requestState.status}` : ""}
          </p>
          {requestState.error ? (
            <div
              style={{
                border: "1px solid rgba(248,113,113,0.4)",
                background: "rgba(248,113,113,0.08)",
                borderRadius: 10,
                padding: 12,
                color: "var(--text-primary)",
              }}
            >
              {requestState.error}
            </div>
          ) : (
            <pre
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                borderRadius: 10,
                padding: 12,
                overflowX: "auto",
                minHeight: 120,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                fontSize: 13,
              }}
            >
              {requestState.body || "No request yet."}
            </pre>
          )}
        </section>
      </div>
    </main>
  );
}
