"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  text: string;
  createdAt: number;
}

type Status = { type: "idle" } | { type: "success"; text: string } | { type: "error"; text: string };

const LS_KEY = "crud-messages";

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveMessages(msgs: Message[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(msgs));
}

export default function CrudPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMessages(loadMessages()); }, []);

  const flash = (type: "success" | "error", text: string) => {
    setStatus({ type, text });
    setTimeout(() => setStatus({ type: "idle" }), 2800);
  };

  const handleCreate = () => {
    const trimmed = input.trim();
    if (!trimmed) { flash("error", "Message cannot be empty."); return; }
    const next = [...messages, { id: crypto.randomUUID(), text: trimmed, createdAt: Date.now() }];
    setMessages(next); saveMessages(next); setInput("");
    flash("success", "Message created.");
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id); setEditText(msg.text);
    setTimeout(() => editRef.current?.focus(), 30);
  };

  const commitEdit = (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) { flash("error", "Message cannot be empty."); return; }
    const next = messages.map(m => m.id === id ? { ...m, text: trimmed } : m);
    setMessages(next); saveMessages(next); setEditingId(null);
    flash("success", "Message updated.");
  };

  const handleDelete = (id: string) => {
    const next = messages.filter(m => m.id !== id);
    setMessages(next); saveMessages(next);
    flash("success", "Message deleted.");
  };

  const glass = (extra?: object) => ({
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
    borderRadius: "16px",
    ...extra,
  });

  return (
    <div style={{ maxWidth: 672, margin: "0 auto", padding: "48px 24px" }}>

      {/* Header */}
      <header style={{ marginBottom: 40, paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ color: "#f59e0b", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", opacity: 0.8 }}>sys/msg</span>
          <span style={{ fontSize: 11, opacity: 0.2 }}>v1.0.0</span>
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
          MESSAGE<span style={{ color: "#f59e0b" }}>_</span>STORE
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, opacity: 0.3 }}>in-memory / localStorage · CRUD interface</p>
      </header>

      {/* Status bar */}
      <div style={{
        marginBottom: 24, height: 40, display: "flex", alignItems: "center",
        padding: "0 16px", borderRadius: 12, fontSize: 13, transition: "all 0.4s",
        background: status.type === "idle" ? "rgba(255,255,255,0.04)" : status.type === "success" ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
        border: status.type === "idle" ? "1px solid rgba(255,255,255,0.07)" : status.type === "success" ? "1px solid rgba(74,222,128,0.25)" : "1px solid rgba(248,113,113,0.25)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        boxShadow: status.type === "success" ? "0 0 20px rgba(74,222,128,0.1)" : status.type === "error" ? "0 0 20px rgba(248,113,113,0.1)" : "none",
      }}>
        <span style={{ marginRight: 8, color: "#f59e0b", opacity: 0.7 }}>▶</span>
        <span style={{ color: status.type === "success" ? "#4ade80" : status.type === "error" ? "#f87171" : undefined, opacity: status.type === "idle" ? 0.25 : 1 }}>
          {status.type === "idle" ? "awaiting input..." : status.text}
        </span>
      </div>

      {/* Create form */}
      <section style={{ marginBottom: 32, padding: 20, ...glass() }}>
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
            style={{
              padding: "12px 20px", fontSize: 13, fontWeight: 700, borderRadius: 10,
              letterSpacing: "0.05em", background: "rgba(245,158,11,0.2)",
              border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b",
              cursor: "pointer", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.35)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(245,158,11,0.2)"; }}
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
                        outline: "none", caretColor: "#f59e0b", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
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
        <span>state: localStorage</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}
