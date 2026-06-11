"use client";

import { useEffect, useState, type CSSProperties } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { apiFetch } from "@/lib/api";
import type { RegulationRuleBrief } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

const CATEGORIES = ["全部", "制动", "反光", "车铃", "链罩", "标签", "电池", "电机", "警示", "化学", "测试", "追踪标签", "电气安全"];
const REGULATIONS = ["全部", "CPSC 1512", "CPSIA", "UL 2849", "UL 2271"];

const PRODUCT_MAP: Record<string, string> = {
  Bicycle: "自行车",
  "E-bike": "电助力车",
  Kids_Bicycle: "儿童车",
};

const RISK_MAP: Record<string, { label: string; style: CSSProperties }> = {
  Critical: { label: "严重", style: { background: "#c0392b", color: "#fff", border: "none" } },
  Major: { label: "重要", style: { background: "#b8860b", color: "#fff", border: "none" } },
  Minor: { label: "轻微", style: { background: "#2d7d46", color: "#fff", border: "none" } },
  Info: { label: "提示", style: { background: "#999", color: "#fff", border: "none" } },
};

const MANDATE_STYLES: Record<string, { label: string; style: CSSProperties }> = {
  Mandatory: { label: "强制", style: { background: "#1a1a1a", color: "#fff", border: "none" } },
  Recommended: { label: "建议", style: { background: "#e8e4dc", color: "#666", border: "none" } },
};

export default function RegulationsPage() {
  const [rules, setRules] = useState<RegulationRuleBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("全部");
  const [activeRegulation, setActiveRegulation] = useState("全部");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory !== "全部") params.set("category", activeCategory);
    if (activeRegulation !== "全部") params.set("regulation", activeRegulation);

    setLoading(true);
    apiFetch<{ total: number; rules: RegulationRuleBrief[] }>(
      `/api/v1/regulations?${params.toString()}`
    )
      .then((data) => setRules(data.rules))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCategory, activeRegulation]);

  const filteredRules = search
    ? rules.filter(
        (r) =>
          r.rule_id.toLowerCase().includes(search.toLowerCase()) ||
          r.requirement_summary.toLowerCase().includes(search.toLowerCase())
      )
    : rules;

  return (
    <SidebarLayout>
      <div style={{ padding: 32, maxWidth: 1400, margin: "0 auto", background: "#fafaf8", minHeight: "100vh" }}>
        <div style={{ animation: "slideUp 0.4s ease-out forwards" }}>
          <div style={{ height: 6, width: 80, borderRadius: 9999, marginBottom: 24, background: "#c8a44e" }} />
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#c8a44e", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", color: "#fff" }}>
              <Icon name="book" size={18} />
            </div>
            <div>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#1a1a1a", fontSize: 24, marginBottom: 4 }}>法规库</h2>
              <p style={{ color: "#666", fontSize: 14, lineHeight: 1.625 }}>
                浏览美国市场自行车 / 电助力车产品法规知识库，涵盖 67 条核心合规条款
              </p>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", borderRadius: 16, padding: 24, marginBottom: 24, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.05s" }}>
          <div style={{ position: "relative", marginBottom: 20 }}>
            <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", color: "#999" }}><Icon name="search" size={13} /></span>
            <input
              type="text"
              placeholder="搜索法规条款或关键词..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", borderRadius: 12, border: "1px solid #e8e4dc", background: "#fff", padding: "10px 16px 10px 48px", fontSize: 14, color: "#1a1a1a", outline: "none", transition: "border-color 0.15s" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="rules" size={10} />
                法规
              </span>
              {REGULATIONS.map((reg) => (
                <button
                  key={reg}
                  onClick={() => setActiveRegulation(reg)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    ...(activeRegulation === reg
                      ? { background: "#c8a44e", color: "#fff" }
                      : { background: "#f0efe8", color: "#666" }),
                  }}
                >
                  {reg}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="tag" size={10} />
                分类
              </span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    ...(activeCategory === cat
                      ? { background: "#c8a44e", color: "#fff" }
                      : { background: "#f0efe8", color: "#666" }),
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.1s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#666" }}>
            <Icon name="file" size={10} />
            {loading ? "加载中..." : (
              <>
                共 <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{filteredRules.length}</span> 条法规条款
              </>
            )}
          </div>
          {(activeCategory !== "全部" || activeRegulation !== "全部") && (
            <button
              onClick={() => { setActiveCategory("全部"); setActiveRegulation("全部"); }}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#999", background: "none", border: "none", cursor: "pointer" }}
            >
              <Icon name="close" size={11} />
              清除筛选
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", borderRadius: 16, overflow: "hidden", animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.15s" }}>
            <div style={{ padding: 24, borderBottom: "1px solid #e8e4dc", background: "#f5f4f0" }}>
              <div style={{ display: "flex", gap: 24 }}>
                {[120, 200, 100, 80, 60, 60].map((w, i) => (
                  <div key={i} style={{ height: 16, borderRadius: 6, width: w, background: "#e8e4dc" }} />
                ))}
              </div>
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 24, padding: "16px 24px", borderBottom: "1px solid #f5f4f0" }}>
                <div style={{ height: 16, borderRadius: 6, width: 112, background: "#f5f4f0" }} />
                <div style={{ height: 16, borderRadius: 6, flex: 1, background: "#f5f4f0" }} />
                <div style={{ height: 16, borderRadius: 6, width: 80, background: "#f5f4f0" }} />
                <div style={{ height: 16, borderRadius: 6, width: 64, background: "#f5f4f0" }} />
                <div style={{ height: 24, borderRadius: 9999, width: 48, background: "#f5f4f0" }} />
                <div style={{ height: 24, borderRadius: 9999, width: 48, background: "#f5f4f0" }} />
              </div>
            ))}
          </div>
        ) : filteredRules.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", borderRadius: 16, padding: 64, textAlign: "center", animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.15s" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "#f5f4f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#999" }}>
              <Icon name="search" size={18} />
            </div>
            <p style={{ color: "#666", fontSize: 14, fontWeight: 500 }}>未找到匹配的法规条款</p>
            <p style={{ color: "#999", fontSize: 12, marginTop: 4 }}>尝试调整筛选条件或搜索关键词</p>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", borderRadius: 16, overflow: "hidden", animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.15s" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e4dc", background: "#f5f4f0" }}>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontWeight: 600, color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", width: 144 }}>条款编号</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontWeight: 600, color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>要求描述</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontWeight: 600, color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", width: 128 }}>法规来源</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontWeight: 600, color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", width: 112 }}>适用产品</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontWeight: 600, color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", width: 80 }}>性质</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontWeight: 600, color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", width: 80 }}>风险</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((r) => {
                  const risk = RISK_MAP[r.risk_level] ?? { label: r.risk_level, style: { background: "#999", color: "#fff", border: "none" } };
                  const mandate = MANDATE_STYLES[r.mandate] ?? { label: r.mandate, style: { background: "#e8e4dc", color: "#666", border: "none" } };
                  return (
                    <tr key={r.rule_id} style={{ borderBottom: "1px solid #f5f4f0" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 12, color: "#666", background: "#f5f4f0", padding: "2px 8px", borderRadius: 6 }}>
                          {r.rule_id}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", color: "#1a1a1a", lineHeight: 1.625 }}>
                        {r.requirement_summary}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontSize: 12, color: "#666" }}>
                          {r.regulation.regulation}
                        </span>
                        <span style={{ fontSize: 12, color: "#999", marginLeft: 4 }}>
                          {r.regulation.section}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {r.applicable_products.map((p) => (
                            <span key={p} style={{ padding: "2px 8px", background: "#f0efe8", color: "#666", borderRadius: 6, fontSize: 11, fontWeight: 500 }}>
                              {PRODUCT_MAP[p] ?? p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, ...mandate.style }}>
                          {mandate.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 600, ...risk.style }}>
                          {risk.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
