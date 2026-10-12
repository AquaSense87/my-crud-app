import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NavSidebar from "./NavSidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      fontFamily: "ui-monospace, 'Geist Mono', monospace",
      color: "white",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Ambient blobs */}
      <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: 600, height: 600, borderRadius: "50%", opacity: 0.3, background: "radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: 500, height: 500, borderRadius: "50%", opacity: 0.2, background: "radial-gradient(circle, rgba(129,140,248,0.2) 0%, transparent 70%)" }} />
      </div>

      <NavSidebar user={{
        name: session.user?.name,
        email: session.user?.email,
        image: session.user?.image,
      }} />

      <main style={{ flex: 1, overflow: "auto", position: "relative", zIndex: 1 }}>
        {children}
      </main>
    </div>
  );
}
