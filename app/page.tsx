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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages(loadMessages());
  }, []);

  const flash = (type: "success" | "error", text: string) => {
    setStatus({ type, text });
    setTimeout(() => setStatus({ type: "idle" }), 2800);
  };

  const handleCreate = () => {
    const trimmed = input.trim();
    if (!trimmed) { flash("error", "Message cannot be empty."); return; }
    const next = [...messages, { id: crypto.randomUUID(), text: trimmed, createdAt: Date.now() }];
    setMessages(next);
    saveMessages(next);
    setInput("");
    flash("success", "Message created.");
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditText(msg.text);
    setTimeout(() => editRef.current?.focus(), 30);
  };

  const commitEdit = (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) { flash("error", "Message cannot be empty."); return; }
    const next = messages.map(m => m.id === id ? { ...m, text: trimmed } : m);
    setMessages(next);
    saveMessages(next);
    setEditingId(null);
    flash("success", "Message updated.");
  };

  const handleDelete = (id: string) => {
    const next = messages.filter(m => m.id !== id);
    setMessages(next);
    saveMessages(next);
    flash("success", "Message deleted.");
  };

  return (
    <div className="min-h-screen text-white font-mono relative overflow-hidden" style={{
      background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    }}>
      {/* Ambient blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #f59e0b33 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #818cf833 0%, transparent 70%)" }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #f59e0b22 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-16">

        {/* Header */}
        <header className="mb-10 pb-6" style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[#f59e0b] text-xs tracking-[0.3em] uppercase opacity-80">sys/msg</span>
            <span className="text-xs opacity-20">v1.0.0</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            MESSAGE<span className="text-[#f59e0b]">_</span>STORE
          </h1>
          <p className="mt-1 text-sm opacity-30">in-memory / localStorage · CRUD interface</p>
        </header>

        {/* Status bar */}
        <div
          className="mb-6 h-10 flex items-center px-4 rounded-xl text-sm transition-all duration-500"
          style={{
            background: status.type === "idle"
              ? "rgba(255,255,255,0.04)"
              : status.type === "success"
              ? "rgba(74,222,128,0.08)"
              : "rgba(248,113,113,0.08)",
            border: status.type === "idle"
              ? "1px solid rgba(255,255,255,0.07)"
              : status.type === "success"
              ? "1px solid rgba(74,222,128,0.25)"
              : "1px solid rgba(248,113,113,0.25)",
            backdropFilter: "blur(12px)",
            boxShadow: status.type === "success"
              ? "0 0 20px rgba(74,222,128,0.1)"
              : status.type === "error"
              ? "0 0 20px rgba(248,113,113,0.1)"
              : "none",
          }}
        >
          <span className="mr-2 text-[#f59e0b] opacity-70">▶</span>
          <span className={
            status.type === "idle" ? "opacity-25" :
            status.type === "success" ? "text-[#4ade80]" : "text-[#f87171]"
          }>
            {status.type === "idle" ? "awaiting input..." : status.text}
          </span>
        </div>

        {/* Create form */}
        <section className="mb-8 p-5 rounded-2xl" style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
          <label className="block text-xs tracking-[0.2em] text-[#f59e0b] uppercase mb-3 opacity-80">
            new_message
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              placeholder="type your message..."
              className="flex-1 px-4 py-3 text-sm text-white placeholder-white/20 outline-none rounded-xl transition-all duration-200 caret-[#f59e0b]"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(8px)",
              }}
              onFocus={e => {
                e.currentTarget.style.border = "1px solid rgba(245,158,11,0.5)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.08)";
              }}
              onBlur={e => {
                e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              onClick={handleCreate}
              className="px-5 py-3 text-sm font-bold rounded-xl tracking-wider transition-all duration-200"
              style={{
                background: "rgba(245,158,11,0.2)",
                border: "1px solid rgba(245,158,11,0.4)",
                color: "#f59e0b",
                backdropFilter: "blur(8px)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(245,158,11,0.35)";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(245,158,11,0.2)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(245,158,11,0.2)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              + ADD
            </button>
          </div>
          <p className="mt-2 text-xs opacity-20">↵ enter or click + ADD</p>
        </section>

        {/* Message list */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <label className="text-xs tracking-[0.2em] text-[#f59e0b] uppercase opacity-70">
              messages
            </label>
            <span className="text-xs opacity-25">[{messages.length}]</span>
          </div>

          {messages.length === 0 ? (
            <div className="py-16 text-center rounded-2xl text-sm opacity-20"
              style={{
                border: "1px dashed rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.02)",
                backdropFilter: "blur(8px)",
              }}>
              no messages yet
            </div>
          ) : (
            <ul className="space-y-2">
              {messages.map((msg, i) => (
                <li
                  key={msg.id}
                  className="group rounded-xl transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    backdropFilter: "blur(16px)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.14)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)";
                  }}
                >
                  {editingId === msg.id ? (
                    <div className="flex gap-2 p-3">
                      <input
                        ref={editRef}
                        type="text"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") commitEdit(msg.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm text-white outline-none rounded-lg caret-[#f59e0b]"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(245,158,11,0.5)",
                          boxShadow: "0 0 0 3px rgba(245,158,11,0.08)",
                          backdropFilter: "blur(8px)",
                        }}
                      />
                      <button
                        onClick={() => commitEdit(msg.id)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200"
                        style={{
                          background: "rgba(245,158,11,0.25)",
                          border: "1px solid rgba(245,158,11,0.5)",
                          color: "#f59e0b",
                        }}
                      >
                        SAVE
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-xs rounded-lg transition-all duration-200 opacity-40 hover:opacity-70"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "white",
                        }}
                      >
                        ESC
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xs w-5 flex-shrink-0 select-none opacity-20">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="flex-1 text-sm leading-relaxed break-all opacity-85">
                        {msg.text}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => startEdit(msg)}
                          className="px-2.5 py-1 text-xs rounded-lg transition-all duration-150"
                          style={{
                            color: "#f59e0b",
                            background: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.25)",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(245,158,11,0.2)";
                            e.currentTarget.style.boxShadow = "0 0 12px rgba(245,158,11,0.15)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(245,158,11,0.1)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="px-2.5 py-1 text-xs rounded-lg transition-all duration-150"
                          style={{
                            color: "#f87171",
                            background: "rgba(248,113,113,0.1)",
                            border: "1px solid rgba(248,113,113,0.25)",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(248,113,113,0.2)";
                            e.currentTarget.style.boxShadow = "0 0 12px rgba(248,113,113,0.15)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(248,113,113,0.1)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          DEL
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-16 pt-6 text-xs flex justify-between opacity-20"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <span>state: localStorage</span>
          <span>© 2026</span>
        </footer>
      </div>
    </div>
  );
}
