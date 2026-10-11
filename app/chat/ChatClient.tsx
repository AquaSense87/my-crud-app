"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  userName: string;
  userEmail: string;
  userImage: string | null;
}

export default function ChatClient({ userName, userEmail, userImage }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages(prev => [...prev, { role: "assistant", content: data.text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}` }]);
    } finally {
      setLoading(false);
    }
  };

  const S = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      fontFamily: "ui-monospace, 'Geist Mono', monospace",
      color: "white",
      display: "flex",
      flexDirection: "column" as const,
    },
    blob1: { position: "fixed" as const, top: "-20%", left: "-10%", width: 600, height: 600, borderRadius: "50%", opacity: 0.25, background: "radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)", pointerEvents: "none" as const, zIndex: 0 },
    blob2: { position: "fixed" as const, bottom: "-10%", right: "-5%", width: 500, height: 500, borderRadius: "50%", opacity: 0.15, background: "radial-gradient(circle, rgba(129,140,248,0.2) 0%, transparent 70%)", pointerEvents: "none" as const, zIndex: 0 },
    topbar: {
      position: "sticky" as const, top: 0, zIndex: 10,
      padding: "14px 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "rgba(15,12,41,0.7)",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    },
    glass: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      borderRadius: 14,
    },
  };

  return (
    <div style={S.page}>
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={S.blob1} /><div style={S.blob2} />
      </div>

      {/* Top bar */}
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#f59e0b", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", opacity: 0.8 }}>sys/ai</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>AI<span style={{ color: "#f59e0b" }}>_</span>CHAT</span>
          <span style={{ fontSize: 10, opacity: 0.25, marginLeft: 4 }}>gemini-2.5-flash</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {userImage && <img src={userImage} alt={userName} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)" }} />}
          <span style={{ fontSize: 12, opacity: 0.5 }}>{userEmail}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.color = "white"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          >
            sign out
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0", zIndex: 1, position: "relative" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 0", opacity: 0.2, fontSize: 13 }}>
              ask anything · powered by gemini-2.5-flash
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "75%",
                padding: "12px 16px",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                ...(m.role === "user"
                  ? { background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)", color: "#fde68a" }
                  : { ...S.glass, color: "rgba(255,255,255,0.85)" }
                ),
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ ...S.glass, padding: "12px 16px", fontSize: 13, color: "rgba(255,255,255,0.4)", display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ animation: "pulse 1.2s ease-in-out infinite" }}>●</span>
                <span style={{ animation: "pulse 1.2s ease-in-out 0.2s infinite" }}>●</span>
                <span style={{ animation: "pulse 1.2s ease-in-out 0.4s infinite" }}>●</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div style={{ position: "sticky", bottom: 0, zIndex: 10, padding: "16px 24px", background: "rgba(15,12,41,0.7)", borderTop: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 10 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="ask gemini anything..."
            disabled={loading}
            style={{
              flex: 1, padding: "13px 18px", fontSize: 13, color: "white",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12, outline: "none", caretColor: "#f59e0b",
              opacity: loading ? 0.5 : 1,
            }}
            onFocus={e => { e.currentTarget.style.border = "1px solid rgba(245,158,11,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.06)"; }}
            onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              padding: "13px 22px", fontSize: 13, fontWeight: 700, borderRadius: 12,
              background: loading || !input.trim() ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.2)",
              border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              opacity: loading || !input.trim() ? 0.4 : 1, transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!loading && input.trim()) { e.currentTarget.style.background = "rgba(245,158,11,0.35)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(245,158,11,0.2)"; } }}
            onMouseLeave={e => { e.currentTarget.style.background = loading || !input.trim() ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            SEND
          </button>
        </div>
        <p style={{ textAlign: "center", marginTop: 8, fontSize: 10, opacity: 0.15 }}>↵ enter to send</p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
