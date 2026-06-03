"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "首页", icon: "🏠" },
  { href: "/check", label: "产品检查", icon: "🔍" },
  { href: "/regulations", label: "法规库", icon: "📚" },
  { href: "/advisor", label: "AI 法规顾问", icon: "💬" },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
                fontSize: 18,
              }}
            >
              ✅
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>RegPilot</div>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 500, letterSpacing: 1, textTransform: "uppercase" }}>智能合规引擎</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "20px 12px" }}>
          <div style={{ padding: "0 12px", marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5 }}>导航菜单</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 500,
                    color: isActive ? "#fff" : "#94a3b8",
                    background: isActive ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
                    boxShadow: isActive ? "0 4px 12px rgba(99,102,241,0.25)" : "none",
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
              👤
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#cbd5e1" }}>RegPilot v1.0</div>
              <div style={{ fontSize: 10, color: "#475569" }}>MVP 体验版</div>
            </div>
          </div>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          background: "radial-gradient(at 20% 80%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(139,92,246,0.04) 0%, transparent 50%), #f8fafc",
        }}
      >
        {children}
      </main>
    </div>
  );
}