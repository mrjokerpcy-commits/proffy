"use client";
import { useState, useEffect } from "react";

const GROUPS = [
  {
    id: "1", course: "Data Structures", code: "0368-2158",
    members: 47, online: 12, unread: 3,
    lastMsg: "Has anyone solved question 3 in Moed A?", time: "2m",
    color: "#4f8ef7",
  },
  {
    id: "2", course: "Linear Algebra 1", code: "0366-1141",
    members: 112, online: 28, unread: 0,
    lastMsg: "Dr. Cohen's notes uploaded to pinned", time: "14m",
    color: "#a78bfa",
  },
  {
    id: "3", course: "Probability Theory", code: "0366-2115",
    members: 68, online: 9, unread: 1,
    lastMsg: "Moed A formula sheet is in the pinned msg", time: "1h",
    color: "#34d399",
  },
  {
    id: "4", course: "Algorithms", code: "0368-3077",
    members: 31, online: 5, unread: 0,
    lastMsg: "Study session tomorrow 20:00 in library?", time: "3h",
    color: "#fbbf24",
  },
  {
    id: "5", course: "Operating Systems", code: "0368-3032",
    members: 54, online: 7, unread: 0,
    lastMsg: "Shell assignment part 2 is brutal lol", time: "5h",
    color: "#f87171",
  },
];

const MESSAGES: Record<string, { id: string; user: string; avatar: string; color: string; time: string; text: string; isMe?: boolean }[]> = {
  "1": [
    { id: "1", user: "Noa R.", avatar: "N", color: "#4f8ef7", time: "10:14", text: "Has anyone solved question 3 from Moed A 2023? I keep getting a different answer than the official solution." },
    { id: "2", user: "Yossi K.", avatar: "Y", color: "#34d399", time: "10:16", text: "Yeah I struggled with that one. The trick is applying the Master Theorem before expanding the recursion tree." },
    { id: "3", user: "Noa R.", avatar: "N", color: "#4f8ef7", time: "10:17", text: "Oh wait, so T(n) = 2T(n/2) + n log n falls under Case 2 extended?" },
    { id: "4", user: "Lior A.", avatar: "L", color: "#a78bfa", time: "10:19", text: "Exactly. There is a good explanation in Cormen section 4.5. I pinned the page above." },
    { id: "5", user: "Noa R.", avatar: "N", color: "#4f8ef7", time: "10:21", text: "Got it! Thank you both. Is anyone coming to the tutorial tomorrow 14:00 in Melamed 5?" },
    { id: "6", user: "Yossi K.", avatar: "Y", color: "#34d399", time: "10:22", text: "I'll be there, might be 5 mins late" },
    { id: "7", user: "Dana M.", avatar: "D", color: "#fbbf24", time: "10:24", text: "Sharing last week's office hour solutions, DM me if you want the file" },
    { id: "8", user: "Me", avatar: "M", color: "#60a5fa", time: "10:26", text: "Thank you Dana! Also found this past exam question that's basically identical to Ex. 4b", isMe: true },
    { id: "9", user: "Lior A.", avatar: "L", color: "#a78bfa", time: "10:27", text: "Which year? Send it in here" },
  ],
  "2": [
    { id: "1", user: "Tal B.", avatar: "T", color: "#a78bfa", time: "09:30", text: "Dr. Cohen uploaded his notes from last semester to the moodle under 'Resources'. Worth checking out before the exam." },
    { id: "2", user: "Rotem S.", avatar: "R", color: "#34d399", time: "09:45", text: "Oh nice. Is the stuff about eigenvalues and diagonalization in there?" },
    { id: "3", user: "Tal B.", avatar: "T", color: "#a78bfa", time: "09:47", text: "Yes, full chapter on it. He also added practice problems with full solutions." },
    { id: "4", user: "Me", avatar: "M", color: "#60a5fa", time: "09:50", text: "Is the proof for the spectral theorem going to be on the exam?", isMe: true },
    { id: "5", user: "Rotem S.", avatar: "R", color: "#34d399", time: "09:52", text: "He said understanding not memorizing, so I think we need to know the idea but maybe not every line" },
  ],
  "3": [
    { id: "1", user: "Amir P.", avatar: "A", color: "#34d399", time: "08:00", text: "Pinning the formula sheet for Moed A. Includes: CDF/PDF reference, common distributions, and convergence theorems." },
    { id: "2", user: "Shira L.", avatar: "S", color: "#f87171", time: "08:15", text: "Thanks! Does anyone know if the negative binomial formulas are given or need to be memorized?" },
    { id: "3", user: "Amir P.", avatar: "A", color: "#34d399", time: "08:18", text: "Given on the formula sheet they hand out in the exam" },
    { id: "4", user: "Me", avatar: "M", color: "#60a5fa", time: "08:20", text: "What about moment generating functions?", isMe: true },
    { id: "5", user: "Shira L.", avatar: "S", color: "#f87171", time: "08:22", text: "Those you need to know. At least the standard ones (Normal, Poisson, Exponential)" },
  ],
  "4": [
    { id: "1", user: "Guy H.", avatar: "G", color: "#fbbf24", time: "07:10", text: "Study session tomorrow evening in the library, 20:00. Who's in?" },
    { id: "2", user: "Michal V.", avatar: "M2", color: "#a78bfa", time: "07:25", text: "I'm in. Should we focus on dynamic programming or graphs?" },
    { id: "3", user: "Guy H.", avatar: "G", color: "#fbbf24", time: "07:27", text: "DP for sure. The last two moeds had at least one DP problem each." },
    { id: "4", user: "Me", avatar: "M", color: "#60a5fa", time: "07:30", text: "I'll join. Can we also quickly go over max flow? Never fully got it", isMe: true },
    { id: "5", user: "Michal V.", avatar: "M2", color: "#a78bfa", time: "07:32", text: "Of course. We'll do both. Guy will you bring the whiteboard markers?" },
  ],
  "5": [
    { id: "1", user: "Ben C.", avatar: "B", color: "#f87171", time: "Yesterday", text: "Anyone done part 2 of the shell assignment? The pipe redirection is breaking for me." },
    { id: "2", user: "Yael N.", avatar: "Y2", color: "#34d399", time: "Yesterday", text: "Same. Took me hours to realize I needed to close the write end of the pipe in the parent process." },
    { id: "3", user: "Ben C.", avatar: "B", color: "#f87171", time: "Yesterday", text: "THATS what it was oh my god. Thank you so much" },
    { id: "4", user: "Me", avatar: "M", color: "#60a5fa", time: "Yesterday", text: "What about signal handling for SIGCHLD? Do we need to handle zombie processes explicitly?", isMe: true },
    { id: "5", user: "Yael N.", avatar: "Y2", color: "#34d399", time: "Yesterday", text: "Yes, use waitpid(-1, ..., WNOHANG) in the handler. Check the spec again, it's mentioned." },
  ],
};

const ONLINE_USERS = [
  { name: "Noa R.", color: "#4f8ef7" },
  { name: "Yossi K.", color: "#34d399" },
  { name: "Lior A.", color: "#a78bfa" },
  { name: "Dana M.", color: "#fbbf24" },
  { name: "Tal B.", color: "#f87171" },
];

export default function GroupsClient() {
  const [activeGroup, setActiveGroup] = useState("1");
  const [isMobile, setIsMobile] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list"); // mobile only

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const group = GROUPS.find(g => g.id === activeGroup)!;
  const messages = MESSAGES[activeGroup] ?? [];

  function selectGroup(id: string) {
    setActiveGroup(id);
    if (isMobile) setView("chat");
  }

  const BANNER_H = 0; // no longer used — banner is in flow

  // ── Shared sub-components ──────────────────────────────────────────────────

  const GroupsList = (
    <div style={{
      width: isMobile ? "100%" : "260px", flexShrink: 0,
      borderRight: isMobile ? "none" : "1px solid var(--border)",
      background: "var(--bg-surface)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "8px" }}>
          TAU — Your Groups
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "7px 10px", borderRadius: "8px",
          background: "var(--bg-elevated)", border: "1px solid var(--border)",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Search groups…</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {GROUPS.map(g => (
          <button key={g.id} onClick={() => selectGroup(g.id)} style={{
            width: "100%", display: "flex", alignItems: "flex-start", gap: "11px",
            padding: "12px 14px", border: "none", cursor: "pointer",
            background: activeGroup === g.id && !isMobile ? "rgba(79,142,247,0.08)" : "transparent",
            borderLeft: activeGroup === g.id && !isMobile ? `3px solid ${g.color}` : "3px solid transparent",
            transition: "all 0.12s", textAlign: "left",
          }}>
            <div style={{
              width: "42px", height: "42px", borderRadius: "12px", flexShrink: 0,
              background: g.color + "18", border: `1px solid ${g.color}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: 800, color: g.color,
            }}>
              {g.course.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" }}>{g.course}</span>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", flexShrink: 0 }}>{g.time}</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "4px" }}>
                {g.lastMsg}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  <span style={{ color: "#34d399" }}>●</span> {g.online} online · {g.members} members
                </span>
                {g.unread > 0 && (
                  <span style={{
                    marginLeft: "auto", minWidth: "18px", height: "18px", borderRadius: "99px",
                    background: "#f87171", color: "#fff", fontSize: "10px", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px",
                  }}>{g.unread}</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const ChatView = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
      {/* Chat header */}
      <div style={{
        flexShrink: 0, padding: "10px 14px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        {/* Back button on mobile */}
        {isMobile && (
          <button onClick={() => setView("list")} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", padding: "4px", display: "flex", alignItems: "center", flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
        )}
        <div style={{
          width: "34px", height: "34px", borderRadius: "9px", flexShrink: 0,
          background: group.color + "18", border: `1px solid ${group.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "11px", fontWeight: 800, color: group.color,
        }}>
          {group.course.split(" ").map(w => w[0]).join("").slice(0, 2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.course}</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {group.code} · <span style={{ color: "#34d399" }}>● {group.online} online</span>
          </div>
        </div>
        {/* Stacked avatars — hide on mobile */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center" }}>
            {ONLINE_USERS.slice(0, 4).map((u, i) => (
              <div key={u.name} style={{
                width: "24px", height: "24px", borderRadius: "50%",
                background: u.color + "30", border: `2px solid var(--bg-surface)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9px", fontWeight: 700, color: u.color,
                marginLeft: i > 0 ? "-7px" : "0",
              }}>{u.name[0]}</div>
            ))}
            <div style={{
              width: "24px", height: "24px", borderRadius: "50%",
              background: "var(--bg-elevated)", border: "2px solid var(--bg-surface)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "8px", fontWeight: 700, color: "var(--text-muted)", marginLeft: "-7px",
            }}>+{group.online - 4}</div>
          </div>
        )}
        {/* Members count on mobile */}
        {isMobile && (
          <div style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>
            {group.members} members
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "14px 12px" : "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>Today</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: "flex", alignItems: "flex-start", gap: "8px",
            flexDirection: msg.isMe ? "row-reverse" : "row",
          }}>
            <div style={{
              width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
              background: msg.color + "25", border: `1px solid ${msg.color}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "10px", fontWeight: 800, color: msg.color,
            }}>{msg.avatar}</div>
            <div style={{ maxWidth: isMobile ? "78%" : "65%", display: "flex", flexDirection: "column", alignItems: msg.isMe ? "flex-end" : "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px", flexDirection: msg.isMe ? "row-reverse" : "row" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: msg.isMe ? "#60a5fa" : "var(--text-secondary)" }}>
                  {msg.isMe ? "You" : msg.user}
                </span>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{msg.time}</span>
              </div>
              <div style={{
                padding: "8px 12px",
                borderRadius: msg.isMe ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                background: msg.isMe ? "rgba(79,142,247,0.15)" : "var(--bg-elevated)",
                border: msg.isMe ? "1px solid rgba(79,142,247,0.25)" : "1px solid var(--border)",
                fontSize: "13px", lineHeight: 1.55, color: "var(--text-primary)",
              }}>{msg.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, padding: "10px 12px", borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 14px", borderRadius: "12px",
          background: "var(--bg-elevated)", border: "1px solid var(--border)",
          opacity: 0.5, cursor: "not-allowed",
        }}>
          <span style={{ flex: 1, fontSize: "13px", color: "var(--text-muted)" }}>Messaging coming soon…</span>
          <div style={{
            padding: "4px 10px", borderRadius: "7px", flexShrink: 0,
            background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)",
            fontSize: "10px", fontWeight: 700, color: "#f59e0b",
          }}>Soon</div>
        </div>
      </div>
    </div>
  );

  const MembersPanel = (
    <div style={{
      width: "190px", flexShrink: 0,
      borderLeft: "1px solid var(--border)",
      background: "var(--bg-surface)",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      <div style={{ padding: "0 14px 8px", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
        Online — {group.online}
      </div>
      {ONLINE_USERS.map(u => (
        <div key={u.name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
            background: u.color + "20", border: `1px solid ${u.color}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: 800, color: u.color, position: "relative",
          }}>
            {u.name[0]}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "7px", height: "7px", borderRadius: "50%", background: "#34d399", border: "1.5px solid var(--bg-surface)" }} />
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>{u.name}</span>
        </div>
      ))}
      <div style={{ padding: "6px 14px 0" }}>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>Offline</div>
        {["Or T.", "Karin M.", "Avi S.", "Shai B."].map(n => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", opacity: 0.4 }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
              background: "var(--bg-elevated)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", fontWeight: 800, color: "var(--text-muted)",
            }}>{n[0]}</div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Under construction banner — in normal flow, no z-index conflict with sidebar */}
      <div style={{
        flexShrink: 0,
        background: "rgba(245,158,11,0.1)", borderBottom: "1px solid rgba(245,158,11,0.28)",
        padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#f59e0b" }}>
          Under Construction — preview only, messages are not real
        </span>
      </div>

      {/* Content row */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {isMobile ? (
          view === "list" ? GroupsList : ChatView
        ) : (
          <>
            {GroupsList}
            {ChatView}
            {MembersPanel}
          </>
        )}
      </div>
    </div>
  );
}
