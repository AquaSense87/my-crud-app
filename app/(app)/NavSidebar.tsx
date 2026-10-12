"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const NAV_ITEMS = [
  { href: "/crud", label: "MSG_STORE", tag: "sys/msg", icon: "⬡" },
  { href: "/chat", label: "AI_CHAT", tag: "sys/ai", icon: "⬡" },
];

export default function NavSidebar({ user }: Props) {
  const pathname = usePathname();

  return (
    <nav style={{
      width: 220,
      flexShrink: 0,
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "rgba(10,8,32,0.7)",
      borderRight: "1px solid rgba(255,255,255,0.07)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      position: "relative",
      zIndex: 20,
    }}>
      {/* Brand */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 9, letterSpacing: "0.35em", color: "#f59e0b", textTransform: "uppercase", opacity: 0.7, marginBottom: 6 }}>
          sys/root
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>
          MY<span style={{ color: "#f59e0b" }}>_</span>APP
        </div>
      </div>

      {/* Nav links */}
      <div style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                padding: "10px 12px",
                borderRadius: 10,
                textDecoration: "none",
                background: active ? "rgba(245,158,11,0.12)" : "transparent",
                border: active ? "1px solid rgba(245,158,11,0.25)" : "1px solid transparent",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLAnchorElement).style.border = "1px solid rgba(255,255,255,0.08)";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.border = "1px solid transparent";
                }
              }}
            >
              <span style={{ fontSize: 9, letterSpacing: "0.25em", color: "#f59e0b", opacity: active ? 0.9 : 0.4 }}>
                {item.tag}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: active ? "white" : "rgba(255,255,255,0.5)", letterSpacing: "0.02em" }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* User / sign-out */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "0 4px" }}>
          {user.image ? (
            <img src={user.image} alt={user.name ?? ""} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#f59e0b", flexShrink: 0 }}>
              {(user.name ?? user.email ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "white", opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name ?? "User"}
            </div>
            <div style={{ fontSize: 9, opacity: 0.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email ?? ""}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
            letterSpacing: "0.05em",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(248,113,113,0.1)";
            e.currentTarget.style.border = "1px solid rgba(248,113,113,0.25)";
            e.currentTarget.style.color = "#f87171";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "rgba(255,255,255,0.4)";
          }}
        >
          SIGN OUT
        </button>
      </div>
    </nav>
  );
}
