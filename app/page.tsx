"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  text: string;
  createdAt: string;
}

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; text: string }
  | { type: "error"; text: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const editRef = useRef<HTMLInputElement>(null);

  const flash = (type: "success" | "error", text: string) => {
    setStatus({ type, text });
    setTimeout(() => setStatus({ type: "idle" }), 2800);
  };

  useEffect(() => {
    // Ensure table exists then load messages
    fetch("/api/messages/setup", { method: "POST" })
      .then(() => fetch("/api/messages"))
      .then(r => r.json())
      .then(data => Array.isArray(data) && setMessages(data))
      .catch(() => flash("error", "Failed to connect to database."));
  }, []);

  const handleCreate = async () => {
    const trimmed = input.trim();
    if (!trimmed) { flash("error", "Message cannot be empty."); return; }
    setStatus({ type: "loading" });
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error();
      const msg: Message = await res.json();
      setMessages(prev => [...prev, msg]);
      setInput("");
      flash("success", "Message created.");
    } catch {
      flash("error", "Failed to create message.");
    }
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditText(msg.text);
    setTimeout(() => editRef.current?.focus(), 30);
  };

  const commitEdit = async (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) { flash("error", "Message cannot be empty."); return; }
    setStatus({ type: "loading" });
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error();
      const updated: Message = await res.json();
      setMessages(prev => prev.map(m => m.id === id ? updated : m));
      setEditingId(null);
      flash("success", "Message updated.");
    } catch {
      flash("error", "Failed to update message.");
    }
  };

  const handleDelete = async (id: string) => {
    setStatus({ type: "loading" });
    try {
      const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error();
      setMessages(prev => prev.filter(m => m.id !== id));
      flash("success", "Message deleted.");
    } catch {
      flash("error", "Failed to delete message.");
    }
  };

  const statusColor = {
    idle: { bg: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", shadow: "none" },
    loading: { bg: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", shadow: "none" },
    success: { bg: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)", shadow: "0 0 20px rgba(74,222,128,0.1)" },
    error: { bg: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", shadow: "0 0 20px rgba(248,113,113,0.1)" },
  }[status.type];

  const statusText =
    status.type === "idle" ? "awaiting input..." :
    status.type === "loading" ? "working..." :
    status.text;

  const statusTextColor =
    status.type === "success" ? "#4ade80" :
    status.type === "error" ? "#f87171" :
    status.type === "loading" ? "#f59e0b" : undefined;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      fontFamily: "ui-monospace, 'Geist Mono', monospace",
      color: "white",
      position: "relative",
      overflow: "hidden",
    }}>
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: 600, height: 600, borderRadius: "50%", opacity: 0.3, background: "radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: 500, height: 500, borderRadius: "50%", opacity: 0.2, background: "radial-gradient(circle, rgba(129,140,248,0.2) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 672, margin: "0 auto", padding: "64px 24px" }}>

        <header style={{ marginBottom: 40, paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ color: "#f59e0b", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", opacity: 0.8 }}>sys/msg</span>
            <span style={{ fontSize: 11, opacity: 0.2 }}>v2.0.0</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
            MESSAGE<span style={{ color: "#f59e0b" }}>_</span>STORE
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, opacity: 0.3 }}>postgres · neon · CRUD interface</p>
        </header>

        {/* Status bar */}
        <div style={{
          marginBottom: 24, height: 40, display: "flex", alignItems: "center",
          padding: "0 16px", borderRadius: 12, fontSize: 13, transition: "all 0.4s",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          background: statusColor.bg, border: statusColor.border, boxShadow: statusColor.shadow,
        }}>
          <span style={{ marginRight: 8, color: "#f59e0b", opacity: 0.7 }}>▶</span>
          <span style={{ color: statusTextColor, opacity: status.type === "idle" ? 0.25 : 1 }}>
            {statusText}
          </span>
        </div>

        {/* Create form */}
        <section style={{
          marginBottom: 32, padding: 20, borderRadius: 16,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
          <label style={{ display: "block", fontSize: 11, letterSpacing: "0.2em", color: "#f59e0b", textTransform: "uppercase", marginBottom: 12, opacity: 0.8 }}>
            new_message
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              placeholder="type your message..."
              style={{
                flex: 1, padding: "12px 16px", fontSize: 13, color: "white",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10, outline: "none", caretColor: "#f59e0b",
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              }}
              onFocus={e => { e.currentTarget.style.border = "1px solid rgba(245,158,11,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.08)"; }}
              onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
            />
            <button
              onClick={handleCreate}
              disabled={status.type === "loading"}
              style={{
                padding: "12px 20px", fontSize: 13, fontWeight: 700, borderRadius: 10,
                letterSpacing: "0.05em", cursor: status.type === "loading" ? "not-allowed" : "pointer",
                background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)",
                color: "#f59e0b", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                opacity: status.type === "loading" ? 0.5 : 1, transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (status.type !== "loading") { e.currentTarget.style.background = "rgba(245,158,11,0.35)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(245,158,11,0.2)"; } }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              + ADD
            </button>
          </div>
          <p style={{ marginTop: 8, fontSize: 11, opacity: 0.2 }}>↵ enter or click + ADD</p>
        </section>

        {/* Message list */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
            <label style={{ fontSize: 11, letterSpacing: "0.2em", color: "#f59e0b", textTransform: "uppercase", opacity: 0.7 }}>messages</label>
            <span style={{ fontSize: 11, opacity: 0.25 }}>[{messages.length}]</span>
          </div>

          {messages.length === 0 ? (
            <div style={{
              padding: "64px 0", textAlign: "center", fontSize: 13, opacity: 0.2,
              border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 16,
              background: "rgba(255,255,255,0.02)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            }}>
              no messages yet
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.map((msg, i) => (
                <li
                  key={msg.id}
                  style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
                    borderRadius: 12, transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.15)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)"; }}
                >
                  {editingId === msg.id ? (
                    <div style={{ display: "flex", gap: 8, padding: 12 }}>
                      <input
                        ref={editRef}
                        type="text"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") commitEdit(msg.id); if (e.key === "Escape") setEditingId(null); }}
                        style={{
                          flex: 1, padding: "6px 12px", fontSize: 13, color: "white",
                          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(245,158,11,0.5)",
                          boxShadow: "0 0 0 3px rgba(245,158,11,0.08)", borderRadius: 8,
                          outline: "none", caretColor: "#f59e0b",
                        }}
                      />
                      <button onClick={() => commitEdit(msg.id)} style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, borderRadius: 8, background: "rgba(245,158,11,0.25)", border: "1px solid rgba(245,158,11,0.5)", color: "#f59e0b", cursor: "pointer" }}>SAVE</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: "6px 12px", fontSize: 11, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "white", cursor: "pointer", opacity: 0.5 }}>ESC</button>
                    </div>
                  ) : (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}
                      onMouseEnter={e => { const btns = e.currentTarget.querySelector(".card-btns") as HTMLElement; if (btns) btns.style.opacity = "1"; }}
                      onMouseLeave={e => { const btns = e.currentTarget.querySelector(".card-btns") as HTMLElement; if (btns) btns.style.opacity = "0"; }}
                    >
                      <span style={{ fontSize: 11, width: 20, flexShrink: 0, userSelect: "none", opacity: 0.2 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p style={{ flex: 1, margin: 0, fontSize: 13, lineHeight: 1.5, wordBreak: "break-all", opacity: 0.85 }}>
                        {msg.text}
                      </p>
                      <div className="card-btns" style={{ display: "flex", gap: 4, opacity: 0, transition: "opacity 0.2s" }}>
                        <button
                          onClick={() => startEdit(msg)}
                          style={{ padding: "4px 10px", fontSize: 11, borderRadius: 8, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", cursor: "pointer" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.2)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(245,158,11,0.15)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                        >EDIT</button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          style={{ padding: "4px 10px", fontSize: 11, borderRadius: 8, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", cursor: "pointer" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.2)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(248,113,113,0.15)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(248,113,113,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                        >DEL</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer style={{ marginTop: 64, paddingTop: 24, fontSize: 11, display: "flex", justifyContent: "space-between", opacity: 0.2, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <span>state: postgres/neon</span>
          <span>© 2026</span>
        </footer>
      </div>
    </div>
  );
}
