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
    <div className="flex min-h-screen bg-[#f8fafc] relative">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[240px] flex-shrink-0 flex-col bg-gradient-to-b from-[#0f172a] to-[#1e293b] overflow-hidden">
        <div className="p-6 pb-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] shadow-lg shadow-indigo-500/30 text-lg">
              ✅
            </div>
            <div>
              <div className="text-[15px] font-bold text-white">RegPilot</div>
              <div className="text-[10px] text-[#64748b] font-medium tracking-wide uppercase">智能合规引擎</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-5 px-3">
          <div className="px-3 mb-3">
            <span className="text-[10px] font-semibold text-[#475569] uppercase tracking-widest">导航菜单</span>
          </div>
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium no-underline transition-all ${
                    isActive
                      ? "text-white bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] shadow-lg shadow-indigo-500/25"
                      : "text-[#94a3b8] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="text-[16px] w-5 text-center">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="px-5 py-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center text-sm">
              
            </div>
            <div>
              <div className="text-xs font-medium text-[#cbd5e1]">RegPilot v1.0</div>
              <div className="text-[10px] text-[#475569]">MVP 体验版</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-h-screen bg-gradient-radial from-indigo-500/6 via-transparent to-transparent bg-gradient-radial2 from-purple-500/4 via-transparent to-transparent" style={{ background: "radial-gradient(at 20% 80%, rgba(99,102,241,0.06) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(139,92,246,0.04) 0%, transparent 50%), #f8fafc" }}>
        <div className="pb-16 md:pb-0">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] px-0 py-1.5 z-[1000] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" style={{ paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex justify-around items-center w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] no-underline transition-all min-w-0 ${
                  isActive ? "font-bold text-[#6366f1]" : "font-medium text-[#64748b]"
                }`}
              >
                <span className="text-[20px]">{item.icon}</span>
                <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
