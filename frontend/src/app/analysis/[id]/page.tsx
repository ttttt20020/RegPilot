"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { apiFetch } from "@/lib/api";
import type { AnalysisResponse, Finding } from "@/lib/types";

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [report, setReport] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch<AnalysisResponse>(`/api/v1/analysis/${id}`)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleRule = (ruleId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      next.has(ruleId) ? next.delete(ruleId) : next.add(ruleId);
      return next;
    });
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite", color: "#6366f1", margin: "0 auto 16px", display: "block" }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" style={{ opacity: 0.25 }} />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
            </svg>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>正在加载分析报告...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (error || !report) {
    return (
      <SidebarLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 32 }}>
              ⚠️
            </div>
            <p style={{ color: "#dc2626", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>加载失败</p>
            <p style={{ color: "#94a3b8", marginBottom: 24 }}>{error || "分析报告未找到"}</p>
            <button onClick={() => router.push("/check")} style={{ color: "#fff", padding: "10px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600, background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 4px 12px rgba(79,70,229,0.3)", border: "none", cursor: "pointer" }}>
              返回产品检查
            </button>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  const findings = report.findings || [];
  const met = findings.filter((f) => f.status === "MET");
  const notMet = findings.filter((f) => f.status === "NOT_MET");
  const partial = findings.filter((f) => f.status === "PARTIALLY_MET");
  const notAssessed = findings.filter((f) => f.status === "NOT_ASSESSED");
  const exempt = findings.filter((f) => f.status === "EXEMPT");
  const problems = findings.filter((f) => f.status === "NOT_MET" || f.status === "PARTIALLY_MET" || (f.status === "MET" && f.pending_verifications && f.pending_verifications.length > 0));
  const score = report.compliance_score ?? 0;
  const mandatoryTotal = findings.filter((f) => f.mandate === "Mandatory").length;
  const mandatoryMissing = findings.filter((f) => f.mandate === "Mandatory" && (f.status === "NOT_MET" || f.status === "PARTIALLY_MET")).length;
  const riskLevelLabel = report.risk_level === "CRITICAL" ? "高风险" : report.risk_level === "HIGH" ? "较高" : report.risk_level === "MEDIUM" ? "中等" : "低风险";
  const complianceRate = findings.length > 0 ? ((met.length / (findings.length - exempt.length || 1)) * 100) : 0;
  const certificationCompleteness = findings.length > 0 ? ((met.length + partial.length) / findings.length * 100) : 0;

  const scoreColor = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";
  const scoreGradientId = "scoreGradient";

  return (
    <SidebarLayout>
      <div style={{ padding: "32px 32px 64px" }}>
        <div style={{ marginBottom: 32, animation: "slideUp 0.4s ease-out forwards" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <button
                onClick={() => router.push("/check")}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", marginBottom: 12 }}
              >
                ←
                返回产品检查
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 32, borderRadius: 9999, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }} />
                <div>
                  {editingName ? (
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={async () => {
                        if (nameInput.trim() && report) {
                          try { await apiFetch(`/api/v1/analysis/${id}/rename`, { method: "PATCH", body: JSON.stringify({ product_name: nameInput.trim() }) }); setReport({ ...report, product_name: nameInput.trim() }); } catch {}
                        }
                        setEditingName(false);
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingName(false); }}
                      style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", border: "1px solid #6366f1", borderRadius: 8, padding: "2px 8px", outline: "none", background: "#fff" }}
                    />
                  ) : (
                    <h1
                      style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.025em", cursor: "text" }}
                      title="点击重命名"
                      onClick={() => { setEditingName(true); setNameInput(report?.product_name || ""); }}
                    >
                      {report.product_name || "未命名产品"}
                    </h1>
                  )}
                  <span style={{ fontSize: 14, color: "#94a3b8", marginLeft: 4 }}>
                    {report.product_type === "Kids_Bicycle" ? "儿童自行车" : report.product_type === "E-bike" ? "电助力车" : "自行车"}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", color: "#166534", border: "1px solid #86efac" }}>
                ✅
                分析完成
              </span>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/analysis/${id}/report`}
                download
                style={{
                  padding: "6px 14px",
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "none",
                  boxShadow: "0 2px 8px rgba(79,70,229,0.3)",
                }}
              >
                📄 下载报告
              </a>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderRadius: 16, padding: 24, marginBottom: 24, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.05s" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: "1px solid #f1f5f9", paddingRight: 24 }}>
              <div style={{ position: "relative", width: 128, height: 128 }}>
                <svg width="128" height="128" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                  <defs>
                    <linearGradient id={scoreGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444"} />
                      <stop offset="100%" stopColor={score >= 80 ? "#16a34a" : score >= 60 ? "#ca8a04" : "#dc2626"} />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={`url(#${scoreGradientId})`}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 314.16} 314.16`}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 30, fontWeight: 700, color: score >= 80 ? "#16a34a" : score >= 60 ? "#ca8a04" : "#dc2626" }}>
                    {score.toFixed(0)}
                  </span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>/ 100</span>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: "#334155" }}>综合评分</div>
              <span
                style={{ marginTop: 4, padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, ...(score >= 80 ? { background: "#f0fdf4", color: "#166534", border: "1px solid #86efac" } : score >= 60 ? { background: "#fefce8", color: "#854d0e", border: "1px solid #fde047" } : { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" }) }}
              >
                {score >= 80 ? "达标" : score >= 60 ? "预警" : "不达标"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a" }}>{complianceRate.toFixed(0)}%</div>
              <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>法规符合率</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#22c55e" }} />
                <span style={{ fontSize: 12, color: "#94a3b8" }}>已满足 {met.length} 项</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: mandatoryMissing > 0 ? "#dc2626" : "#16a34a" }}>
                {mandatoryMissing}
              </div>
              <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>必需项缺失</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, background: mandatoryMissing > 0 ? "#ef4444" : "#22c55e" }} />
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{mandatoryMissing > 0 ? `${mandatoryMissing}/${mandatoryTotal} 项未满足` : "全部满足"}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: report.risk_level === "CRITICAL" ? "#dc2626" : report.risk_level === "HIGH" ? "#ea580c" : report.risk_level === "MEDIUM" ? "#ca8a04" : "#16a34a" }}>
                {riskLevelLabel}
              </div>
              <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>风险等级</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  {report.summary.critical_issues > 0 ? `${report.summary.critical_issues} 项严重问题` : "无严重问题"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderRadius: 16, padding: 16, marginBottom: 24, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.1s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 20 }}>📖</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#334155", flexShrink: 0 }}>适用法规</span>
            {report.applicable_regulations.map((reg) => (
              <span
                key={reg.regulation}
                style={{ padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 1px 3px rgba(99,102,241,0.2)" }}
              >
                {reg.regulation}
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>共 {report.summary.total_rules} 条检查项</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.15s" }}>
          {[
            { label: "已满足", count: met.length, emoji: "✅", bg: "#f0fdf4", border: "#bbf7d0", color: "#166534" },
            { label: "未满足", count: notMet.length, emoji: "❌", bg: "#fef2f2", border: "#fecaca", color: "#991b1b" },
            { label: "部分满足", count: partial.length, emoji: "⚠️", bg: "#fefce8", border: "#fde68a", color: "#854d0e" },
            { label: "豁免", count: exempt.length, emoji: "🛡️", bg: "#eef2ff", border: "#c7d2fe", color: "#3730a3" },
            { label: "待评估", count: notAssessed.length, emoji: "❓", bg: "#f8fafc", border: "#e2e8f0", color: "#475569" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6, opacity: 0.7, fontSize: 16 }}>{s.emoji}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 12, marginTop: 2, opacity: 0.8, color: s.color }}>{s.label}</div>
            </div>
          ))}
        </div>

        <section style={{ marginBottom: 32, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.2s" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>📋</span>
            法规检查结果
          </h2>
          <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderRadius: 16, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "42%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: "1px solid #f1f5f9", background: "rgba(248,250,252,0.5)" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>检查项目</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>法规来源</th>
                  <th style={{ textAlign: "center", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>性质</th>
                  <th style={{ textAlign: "center", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>风险</th>
                  <th style={{ textAlign: "center", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>状态</th>
                  <th style={{ textAlign: "center", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>待验证</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => {
                  const expanded = expandedRules.has(f.rule_id);
                  const isProblem = f.status === "NOT_MET" || f.status === "PARTIALLY_MET";
                  return (
                    <Fragment key={f.rule_id}>
                      <tr
                        style={{ cursor: "pointer", ...(isProblem ? { background: "rgba(254,242,242,0.3)" } : f.status === "MET" && f.pending_verifications?.length ? { background: "rgba(239,246,255,0.3)" } : f.status === "MET" ? { background: "rgba(240,253,244,0.2)" } : f.status === "NOT_ASSESSED" ? { background: "rgba(241,245,249,0.2)" } : {}) }}
                        onClick={() => toggleRule(f.rule_id)}
                      >
                        <td style={{ padding: "12px 16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ color: "#94a3b8", flexShrink: 0, transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{f.rule_id}</span>
                            <span style={{ fontSize: 13, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.requirement_summary}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.regulation.regulation}</td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <MandateBadge mandate={f.mandate} />
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <RiskBadge level={f.risk_level} />
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <StatusBadge status={f.status} />
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center", fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>
                          {f.pending_verifications?.length > 0 ? `${f.pending_verifications.length}项` : "—"}
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={6} style={{ padding: 20, background: "rgba(248,250,252,0.4)", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 16 }}>
                              <div>
                                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>法规条款</div>
                                <div style={{ fontSize: 14, color: "#334155", fontWeight: 500 }}>{f.regulation.regulation} {f.regulation.section}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>风险评分</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  <div style={{ flex: 1, background: "rgba(226,232,240,0.6)", borderRadius: 9999, height: 8, overflow: "hidden" }}>
                                    <div
                                      style={{ height: 8, borderRadius: 9999, width: `${Math.min(f.risk_score, 100)}%`, background: f.risk_score >= 70 ? "linear-gradient(to right, #f87171, #dc2626)" : f.risk_score >= 40 ? "linear-gradient(to right, #facc15, #eab308)" : "linear-gradient(to right, #4ade80, #22c55e)" }}
                                    />
                                  </div>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: "#334155", width: 32, textAlign: "right" }}>{f.risk_score.toFixed(0)}</span>
                                </div>
                              </div>
                            </div>
                            {f.gap_description && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>当前状态</div>
                                <div style={{ borderRadius: 12, padding: 14, fontSize: 14, lineHeight: 1.625, ...(f.status === "MET" && f.pending_verifications?.length ? { background: "#eff6ff", color: "#1e40af", border: "1px solid #93c5fd" } : f.status === "NOT_ASSESSED" ? { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" } : { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" }) }}>{f.gap_description}</div>
                              </div>
                            )}
                            {f.pending_verifications && f.pending_verifications.length > 0 && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>待验证项目</div>
                                <div style={{ borderRadius: 12, padding: 14, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {f.pending_verifications.map((v, vi) => (
                                      <li key={vi} style={{ fontSize: 13, color: "#1e40af", lineHeight: 1.8 }}>{v}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                            {f.remediation && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>建议方案</div>
                                <div style={{ background: "rgba(240,253,244,0.8)", border: "1px solid rgba(187,247,208,0.6)", borderRadius: 12, padding: 14, fontSize: 14, color: "#166534", lineHeight: 1.625 }}>{f.remediation}</div>
                              </div>
                            )}
                            {f.consequences.length > 0 && (
                              <div>
                                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>不合规后果</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {f.consequences.map((c, i) => (
                                    <span key={i} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" }}>{c}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {problems.length > 0 && (
          <section style={{ marginBottom: 32, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.25s" }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>🔧</span>
              整改与待验证
              <span style={{ fontSize: 14, fontWeight: 400, color: "#94a3b8" }}>({problems.length} 条)</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {problems.sort((a, b) => b.risk_score - a.risk_score).map((f, i) => {
                const isVerificationOnly = f.status === "MET" && f.pending_verifications?.length;
                return (
                <div key={f.rule_id} style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderRadius: 16, padding: 20, display: "flex", gap: 16 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    background: isVerificationOnly ? "linear-gradient(135deg, #60a5fa, #3b82f6)" : f.risk_level === "Critical" ? "linear-gradient(135deg, #ef4444, #dc2626)" : f.risk_level === "Major" ? "linear-gradient(135deg, #fb923c, #f97316)" : f.risk_level === "Minor" ? "linear-gradient(135deg, #facc15, #eab308)" : "linear-gradient(135deg, #94a3b8, #64748b)",
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{f.rule_id}</span>
                      <RiskBadge level={f.risk_level} />
                      <StatusBadge status={f.status} />
                      {isVerificationOnly && <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#eff6ff", color: "#1e40af", border: "1px solid #93c5fd" }}>待验证</span>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#1e293b", marginBottom: 6 }}>{f.requirement_summary}</p>
                    {f.gap_description && (
                      <p style={{ fontSize: 14, color: isVerificationOnly ? "#1e40af" : "#dc2626", marginBottom: 8, lineHeight: 1.625 }}>{f.gap_description}</p>
                    )}
                    {f.pending_verifications && f.pending_verifications.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, fontWeight: 500 }}>需补充验证：</div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {f.pending_verifications.map((v, vi) => (
                            <li key={vi} style={{ fontSize: 13, color: "#1e40af", lineHeight: 1.8 }}>{v}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {f.remediation && (
                      <div style={{ background: "rgba(240,253,244,0.8)", border: "1px solid rgba(187,247,208,0.6)", borderRadius: 12, padding: 14, fontSize: 14, color: "#166534", lineHeight: 1.625 }}>
                        <span style={{ fontWeight: 600 }}>建议方案：</span>{f.remediation}
                      </div>
                    )}
                    <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>{f.regulation.regulation} {f.regulation.section}</p>
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        )}

        <section style={{ marginBottom: 32, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.3s" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>📦</span>
            BOM 物料清单
            <span style={{ fontSize: 14, fontWeight: 400, color: "#94a3b8" }}>({report.components.length} 个零部件)</span>
          </h2>
          <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderRadius: 16, overflow: "hidden" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f1f5f9", background: "rgba(248,250,252,0.5)" }}>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>标准名称</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>原始名称</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>分类</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>数量</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>材料</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>置信度</th>
                </tr>
              </thead>
              <tbody>
                {report.components.map((comp, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "14px 20px", fontWeight: 500, color: "#0f172a" }}>{comp.standard_name}</td>
                    <td style={{ padding: "14px 20px", color: "#64748b", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{comp.original_names.join(", ")}</td>
                    <td style={{ padding: "14px 20px", color: "#475569" }}>{comp.category}{comp.sub_category ? ` / ${comp.sub_category}` : ""}</td>
                    <td style={{ padding: "14px 20px", color: "#475569" }}>{comp.quantity}</td>
                    <td style={{ padding: "14px 20px", color: "#475569" }}>{comp.material || "—"}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, ...(comp.norm_confidence >= 0.8 ? { background: "#f0fdf4", color: "#166534", border: "1px solid #86efac" } : comp.norm_confidence >= 0.5 ? { background: "#fefce8", color: "#854d0e", border: "1px solid #fde047" } : { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" }) }}
                      >
                        {(comp.norm_confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </SidebarLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; style: React.CSSProperties }> = {
    MET: { label: "合规", style: { background: "#f0fdf4", color: "#166534", border: "1px solid #86efac" } },
    NOT_MET: { label: "不合规", style: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" } },
    PARTIALLY_MET: { label: "部分合规", style: { background: "#fefce8", color: "#854d0e", border: "1px solid #fde047" } },
    NOT_ASSESSED: { label: "待评估", style: { background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" } },
    EXEMPT: { label: "豁免", style: { background: "#eef2ff", color: "#3730a3", border: "1px solid #a5b4fc" } },
  };
  const c = config[status] || { label: status, style: { background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" } };
  return <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, ...c.style }}>{c.label}</span>;
}

function RiskBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; style: React.CSSProperties }> = {
    Critical: { label: "严重", style: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" } },
    Major: { label: "重要", style: { background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74" } },
    Minor: { label: "轻微", style: { background: "#fefce8", color: "#854d0e", border: "1px solid #fde047" } },
    Info: { label: "提示", style: { background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" } },
  };
  const c = config[level] || { label: level, style: { background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" } };
  return <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, ...c.style }}>{c.label}</span>;
}

function MandateBadge({ mandate }: { mandate: string }) {
  const isMandatory = mandate === "Mandatory";
  return (
    <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, ...(isMandatory ? { background: "#faf5ff", color: "#7e22ce", border: "1px solid #d8b4fe" } : { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }) }}>
      {isMandatory ? "强制" : "建议"}
    </span>
  );
}
