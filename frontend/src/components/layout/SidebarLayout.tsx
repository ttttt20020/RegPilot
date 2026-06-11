"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

const navItems = [
  { href: "/", label: "首页", icon: "home" },
  { href: "/check", label: "产品检查", icon: "check" },
  { href: "/regulations", label: "法规库", icon: "book" },
  { href: "/advisor", label: "AI 顾问", icon: "chat" },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "#fafaf8" }} />;
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#fafaf8",
        position: "relative",
      }}
    >
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          style={{
            width: 220,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            background: "#1a1a1a",
            overflow: "hidden",
            borderRight: "1px solid #2a2a2a",
          }}
        >
          <div style={{ padding: "28px 20px 24px", borderBottom: "1px solid #2a2a2a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#c8a44e",
                  color: "#1a1a1a",
                }}
              >
                <Icon name="shield" size={16} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e8e4dc", letterSpacing: "-0.3px" }}>RegPilot</div>
                <div style={{ fontSize: 9, color: "#666", fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase" }}>Compliance</div>
              </div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: "16px 10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#c8a44e" : "#888",
                      background: isActive ? "rgba(200,164,78,0.08)" : "transparent",
                      textDecoration: "none",
                      transition: "all 0.15s",
                      borderLeft: isActive ? "2px solid #c8a44e" : "2px solid transparent",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isActive ? "#c8a44e" : "#666",
                      }}
                    >
                      <Icon name={item.icon} size={16} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div style={{ padding: "16px 20px", borderTop: "1px solid #2a2a2a" }}>
            <div style={{ fontSize: 10, color: "#444", fontWeight: 500 }}>v1.0 MVP</div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          background: "#fafaf8",
          paddingBottom: isMobile ? 64 : 0,
        }}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#1a1a1a",
            borderTop: "1px solid #2a2a2a",
            padding: "4px 0",
            paddingBottom: "calc(4px + env(safe-area-inset-bottom, 0px))",
            zIndex: 1000,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    padding: "4px 10px",
                    fontSize: 9,
                    fontWeight: isActive ? 700 : 400,
                    color: isActive ? "#c8a44e" : "#666",
                    textDecoration: "none",
                    transition: "all 0.15s",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isActive ? "#c8a44e" : "#666",
                    }}
                  >
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
