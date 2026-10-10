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
    <div className="min-h-screen bg-[#0f0f0f] text-[#e8e0d0] font-mono">
      {/* scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)",
        }}
      />

      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* Header */}
        <header className="mb-12 border-b border-[#2a2a2a] pb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[#f59e0b] text-xs tracking-[0.3em] uppercase">sys/msg</span>
            <span className="text-[#2a2a2a] text-xs">v1.0.0</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#f5f0e8]">
            MESSAGE<span className="text-[#f59e0b]">_</span>STORE
          </h1>
          <p className="mt-1 text-sm text-[#5a5a5a]">in-memory / localStorage · CRUD interface</p>
        </header>

        {/* Status bar */}
        <div
          className={`mb-6 h-9 flex items-center px-4 rounded text-sm transition-all duration-300 ${
            status.type === "idle"
              ? "bg-[#1a1a1a] text-[#3a3a3a]"
              : status.type === "success"
              ? "bg-[#1a2a1a] text-[#4ade80] border border-[#1e4d2b]"
              : "bg-[#2a1a1a] text-[#f87171] border border-[#4d1e1e]"
          }`}
        >
          <span className="mr-2 text-[#f59e0b]">▶</span>
          {status.type === "idle" ? "awaiting input..." : status.text}
        </div>

        {/* Create form */}
        <section className="mb-10">
          <label className="block text-xs tracking-[0.2em] text-[#f59e0b] uppercase mb-2">
            new_message
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              placeholder="type your message..."
              className="flex-1 bg-[#171717] border border-[#2a2a2a] rounded px-4 py-3 text-sm text-[#e8e0d0] placeholder-[#3a3a3a] outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]/20 transition-colors caret-[#f59e0b]"
            />
            <button
              onClick={handleCreate}
              className="px-5 py-3 bg-[#f59e0b] text-[#0f0f0f] text-sm font-bold rounded hover:bg-[#fbbf24] active:bg-[#d97706] transition-colors tracking-wider"
            >
              + ADD
            </button>
          </div>
          <p className="mt-1.5 text-xs text-[#3a3a3a]">↵ enter or click + ADD</p>
        </section>

        {/* Message list */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs tracking-[0.2em] text-[#f59e0b] uppercase">
              messages
            </label>
            <span className="text-xs text-[#3a3a3a]">[{messages.length}]</span>
          </div>

          {messages.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-[#2a2a2a] rounded text-[#3a3a3a] text-sm">
              no messages yet
            </div>
          ) : (
            <ul className="space-y-2">
              {messages.map((msg, i) => (
                <li
                  key={msg.id}
                  className="group border border-[#2a2a2a] rounded bg-[#141414] hover:border-[#3a3a3a] transition-colors"
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
                        className="flex-1 bg-[#0f0f0f] border border-[#f59e0b] rounded px-3 py-1.5 text-sm text-[#e8e0d0] outline-none caret-[#f59e0b]"
                      />
                      <button
                        onClick={() => commitEdit(msg.id)}
                        className="px-3 py-1.5 bg-[#f59e0b] text-[#0f0f0f] text-xs font-bold rounded hover:bg-[#fbbf24] transition-colors"
                      >
                        SAVE
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-[#5a5a5a] text-xs border border-[#2a2a2a] rounded hover:text-[#e8e0d0] hover:border-[#3a3a3a] transition-colors"
                      >
                        ESC
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-[#2a2a2a] text-xs w-5 flex-shrink-0 select-none">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="flex-1 text-sm text-[#e8e0d0] leading-relaxed break-all">
                        {msg.text}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(msg)}
                          className="px-2.5 py-1 text-xs text-[#f59e0b] border border-[#f59e0b]/30 rounded hover:bg-[#f59e0b]/10 transition-colors"
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="px-2.5 py-1 text-xs text-[#f87171] border border-[#f87171]/30 rounded hover:bg-[#f87171]/10 transition-colors"
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

        <footer className="mt-16 pt-6 border-t border-[#1a1a1a] text-xs text-[#2a2a2a] flex justify-between">
          <span>state: localStorage</span>
          <span>© 2026</span>
        </footer>
      </div>
    </div>
  );
}
