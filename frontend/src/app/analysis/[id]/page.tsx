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
            <svg width="48" height="48" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite", color: "#c8a44e", margin: "0 auto 16px", display: "block" }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" style={{ opacity: 0.25 }} />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
            </svg>
            <p style={{ color: "#999", fontSize: 14 }}>正在加载分析报告...</p>
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
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "#fef5f5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, fontWeight: 700, color: "#c0392b", border: "1px solid #c0392b" }}>
              !
            </div>
            <p style={{ color: "#c0392b", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>加载失败</p>
            <p style={{ color: "#999", marginBottom: 24 }}>{error || "分析报告未找到"}</p>
            <button onClick={() => router.push("/check")} style={{ color: "#1a1a1a", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "#c8a44e", border: "none", cursor: "pointer" }}>
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

  const scoreColor = score >= 80 ? "#2d7d46" : score >= 60 ? "#b8860b" : "#c0392b";

  return (
    <SidebarLayout>
      <div style={{ padding: "32px 32px 64px", background: "#fafaf8", minHeight: "100%" }}>
        <div style={{ marginBottom: 32, animation: "slideUp 0.4s ease-out forwards" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <button
                onClick={() => router.push("/check")}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#666", background: "none", border: "none", cursor: "pointer", marginBottom: 12 }}
              >
                ←
                返回产品检查
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 32, borderRadius: 9999, background: "#c8a44e" }} />
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
                      style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", border: "1px solid #c8a44e", borderRadius: 8, padding: "2px 8px", outline: "none", background: "#fff" }}
                    />
                  ) : (
                    <h1
                      style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.025em", cursor: "text" }}
                      title="点击重命名"
                      onClick={() => { setEditingName(true); setNameInput(report?.product_name || ""); }}
                    >
                      {report.product_name || "未命名产品"}
                    </h1>
                  )}
                  <span style={{ fontSize: 14, color: "#999", marginLeft: 4 }}>
                    {report.product_type === "Kids_Bicycle" ? "儿童自行车" : report.product_type === "E-bike" ? "电助力车" : "自行车"}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, background: "#fff", color: "#2d7d46", border: "1px solid #2d7d46" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d7d46" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                分析完成
              </span>
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/analysis/${id}/report`}
                download
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#c8a44e",
                  color: "#1a1a1a",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                下载报告
              </a>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", borderRadius: 12, padding: 24, marginBottom: 24, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.05s" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: "1px solid #e8e4dc", paddingRight: 24 }}>
              <div style={{ position: "relative", width: 128, height: 128 }}>
                <svg width="128" height="128" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e8e4dc" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={scoreColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 314.16} 314.16`}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 30, fontWeight: 700, color: scoreColor }}>
                    {score.toFixed(0)}
                  </span>
                  <span style={{ fontSize: 12, color: "#999" }}>/ 100</span>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>综合评分</div>
              <span
                style={{ marginTop: 4, padding: "2px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, ...(score >= 80 ? { background: "#fff", color: "#2d7d46", border: "1px solid #2d7d46" } : score >= 60 ? { background: "#fff", color: "#b8860b", border: "1px solid #b8860b" } : { background: "#fff", color: "#c0392b", border: "1px solid #c0392b" }) }}
              >
                {score >= 80 ? "达标" : score >= 60 ? "预警" : "不达标"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>{complianceRate.toFixed(0)}%</div>
              <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>法规符合率</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#2d7d46" }} />
                <span style={{ fontSize: 12, color: "#999" }}>已满足 {met.length} 项</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: mandatoryMissing > 0 ? "#c0392b" : "#2d7d46" }}>
                {mandatoryMissing}
              </div>
              <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>必需项缺失</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 9999, background: mandatoryMissing > 0 ? "#c0392b" : "#2d7d46" }} />
                <span style={{ fontSize: 12, color: "#999" }}>{mandatoryMissing > 0 ? `${mandatoryMissing}/${mandatoryTotal} 项未满足` : "全部满足"}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: report.risk_level === "CRITICAL" ? "#c0392b" : report.risk_level === "HIGH" ? "#c0392b" : report.risk_level === "MEDIUM" ? "#b8860b" : "#2d7d46" }}>
                {riskLevelLabel}
              </div>
              <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>风险等级</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 12, color: "#999" }}>
                  {report.summary.critical_issues > 0 ? `${report.summary.critical_issues} 项严重问题` : "无严重问题"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", borderRadius: 12, padding: 16, marginBottom: 24, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.1s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", flexShrink: 0 }}>适用法规</span>
            {report.applicable_regulations.map((reg) => (
              <span
                key={reg.regulation}
                style={{ padding: "6px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600, color: "#c8a44e", background: "#1a1a1a" }}
              >
                {reg.regulation}
              </span>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#999" }}>共 {report.summary.total_rules} 条检查项</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.15s" }}>
          {[
            { label: "已满足", count: met.length, abbr: "OK", borderColor: "#2d7d46", color: "#2d7d46" },
            { label: "未满足", count: notMet.length, abbr: "NO", borderColor: "#c0392b", color: "#c0392b" },
            { label: "部分满足", count: partial.length, abbr: "PT", borderColor: "#b8860b", color: "#b8860b" },
            { label: "豁免", count: exempt.length, abbr: "EX", borderColor: "#e8e4dc", color: "#666" },
            { label: "待评估", count: notAssessed.length, abbr: "NA", borderColor: "#999", color: "#999" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", borderRadius: 8, padding: 20, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", border: "1px solid #e8e4dc", borderLeft: `3px solid ${s.borderColor}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6, fontSize: 12, fontWeight: 700, color: s.color, width: 24, height: 24, borderRadius: 4, border: `1px solid ${s.borderColor}`, margin: "0 auto 6px", lineHeight: "24px", textAlign: "center" }}>{s.abbr}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color, textAlign: "center" }}>{s.count}</div>
              <div style={{ fontSize: 12, marginTop: 2, color: s.color, textAlign: "center" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <section style={{ marginBottom: 32, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.2s" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
            法规检查结果
          </h2>
          <div style={{ background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", borderRadius: 12, overflow: "auto" }}>
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
                <tr style={{ borderBottom: "1px solid #e8e4dc", background: "#f5f4f0" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>检查项目</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>法规来源</th>
                  <th style={{ textAlign: "center", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>性质</th>
                  <th style={{ textAlign: "center", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>风险</th>
                  <th style={{ textAlign: "center", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>状态</th>
                  <th style={{ textAlign: "center", padding: "12px 8px", fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>待验证</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => {
                  const expanded = expandedRules.has(f.rule_id);
                  const isProblem = f.status === "NOT_MET" || f.status === "PARTIALLY_MET";
                  return (
                    <Fragment key={f.rule_id}>
                      <tr
                        style={{ cursor: "pointer", ...(isProblem ? { background: "#fef5f5" } : f.status === "MET" && f.pending_verifications?.length ? { background: "#faf8f0" } : f.status === "MET" ? { background: "#fff" } : f.status === "NOT_ASSESSED" ? { background: "#fafaf8" } : {}) }}
                        onClick={() => toggleRule(f.rule_id)}
                      >
                        <td style={{ padding: "12px 16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ color: "#999", flexShrink: 0, transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#999", flexShrink: 0 }}>{f.rule_id}</span>
                            <span style={{ fontSize: 13, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.requirement_summary}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.regulation.regulation}</td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <MandateBadge mandate={f.mandate} />
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <RiskBadge level={f.risk_level} />
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center" }}>
                          <StatusBadge status={f.status} />
                        </td>
                        <td style={{ padding: "12px 8px", textAlign: "center", fontSize: 12, color: "#b8860b", fontWeight: 600 }}>
                          {f.pending_verifications?.length > 0 ? `${f.pending_verifications.length}项` : "—"}
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={6} style={{ padding: 20, background: "#fafaf8", borderTop: "1px solid #e8e4dc", borderBottom: "1px solid #e8e4dc" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 16 }}>
                              <div>
                                <div style={{ fontSize: 12, color: "#999", marginBottom: 6, fontWeight: 500 }}>法规条款</div>
                                <div style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 500 }}>{f.regulation.regulation} {f.regulation.section}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: "#999", marginBottom: 6, fontWeight: 500 }}>风险评分</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  <div style={{ flex: 1, background: "#e8e4dc", borderRadius: 9999, height: 8, overflow: "hidden" }}>
                                    <div
                                      style={{ height: 8, borderRadius: 9999, width: `${Math.min(f.risk_score, 100)}%`, background: f.risk_score >= 70 ? "#c0392b" : f.risk_score >= 40 ? "#b8860b" : "#2d7d46" }}
                                    />
                                  </div>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", width: 32, textAlign: "right" }}>{f.risk_score.toFixed(0)}</span>
                                </div>
                              </div>
                            </div>
                            {f.gap_description && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, color: "#999", marginBottom: 6, fontWeight: 500 }}>当前状态</div>
                                <div style={{ borderRadius: 8, padding: 14, fontSize: 14, lineHeight: 1.625, ...(f.status === "MET" && f.pending_verifications?.length ? { background: "#faf8f0", color: "#b8860b", border: "1px solid #b8860b" } : f.status === "NOT_ASSESSED" ? { background: "#fafaf8", color: "#666", border: "1px solid #e8e4dc" } : { background: "#fef5f5", color: "#c0392b", border: "1px solid #c0392b" }) }}>{f.gap_description}</div>
                              </div>
                            )}
                            {f.pending_verifications && f.pending_verifications.length > 0 && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, color: "#999", marginBottom: 6, fontWeight: 500 }}>待验证项目</div>
                                <div style={{ borderRadius: 8, padding: 14, background: "#faf8f0", border: "1px solid #b8860b" }}>
                                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                                    {f.pending_verifications.map((v, vi) => (
                                      <li key={vi} style={{ fontSize: 13, color: "#b8860b", lineHeight: 1.8 }}>{v}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                            {f.remediation && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, color: "#999", marginBottom: 6, fontWeight: 500 }}>建议方案</div>
                                <div style={{ background: "#f0f8f2", border: "1px solid #2d7d46", borderRadius: 8, padding: 14, fontSize: 14, color: "#2d7d46", lineHeight: 1.625 }}>{f.remediation}</div>
                              </div>
                            )}
                            {f.consequences.length > 0 && (
                              <div>
                                <div style={{ fontSize: 12, color: "#999", marginBottom: 6, fontWeight: 500 }}>不合规后果</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {f.consequences.map((c, i) => (
                                    <span key={i} style={{ padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 500, background: "#fef5f5", color: "#c0392b", border: "1px solid #c0392b" }}>{c}</span>
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
            <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
              整改与待验证
              <span style={{ fontSize: 14, fontWeight: 400, color: "#999" }}>({problems.length} 条)</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {problems.sort((a, b) => b.risk_score - a.risk_score).map((f, i) => {
                const isVerificationOnly = f.status === "MET" && f.pending_verifications?.length;
                return (
                <div key={f.rule_id} style={{ background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", borderRadius: 12, padding: 20, display: "flex", gap: 16 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0,
                    background: isVerificationOnly ? "#b8860b" : f.risk_level === "Critical" ? "#c0392b" : f.risk_level === "Major" ? "#b8860b" : f.risk_level === "Minor" ? "#2d7d46" : "#999",
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "#999" }}>{f.rule_id}</span>
                      <RiskBadge level={f.risk_level} />
                      <StatusBadge status={f.status} />
                      {isVerificationOnly && <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, background: "#faf8f0", color: "#b8860b", border: "1px solid #b8860b" }}>待验证</span>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a", marginBottom: 6 }}>{f.requirement_summary}</p>
                    {f.gap_description && (
                      <p style={{ fontSize: 14, color: isVerificationOnly ? "#b8860b" : "#c0392b", marginBottom: 8, lineHeight: 1.625 }}>{f.gap_description}</p>
                    )}
                    {f.pending_verifications && f.pending_verifications.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: "#666", marginBottom: 4, fontWeight: 500 }}>需补充验证：</div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {f.pending_verifications.map((v, vi) => (
                            <li key={vi} style={{ fontSize: 13, color: "#b8860b", lineHeight: 1.8 }}>{v}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {f.remediation && (
                      <div style={{ background: "#f0f8f2", border: "1px solid #2d7d46", borderRadius: 8, padding: 14, fontSize: 14, color: "#2d7d46", lineHeight: 1.625 }}>
                        <span style={{ fontWeight: 600 }}>建议方案：</span>{f.remediation}
                      </div>
                    )}
                    <p style={{ fontSize: 12, color: "#999", marginTop: 10 }}>{f.regulation.regulation} {f.regulation.section}</p>
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        )}

        <section style={{ marginBottom: 32, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.3s" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 16 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
            BOM 物料清单
            <span style={{ fontSize: 14, fontWeight: 400, color: "#999" }}>({report.components.length} 个零部件)</span>
          </h2>
          <div style={{ background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e4dc", background: "#f5f4f0" }}>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>标准名称</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>原始名称</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>分类</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>数量</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>材料</th>
                  <th style={{ textAlign: "left", padding: "14px 20px", fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em" }}>置信度</th>
                </tr>
              </thead>
              <tbody>
                {report.components.map((comp, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e8e4dc" }}>
                    <td style={{ padding: "14px 20px", fontWeight: 500, color: "#1a1a1a" }}>{comp.standard_name}</td>
                    <td style={{ padding: "14px 20px", color: "#666", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{comp.original_names.join(", ")}</td>
                    <td style={{ padding: "14px 20px", color: "#666" }}>{comp.category}{comp.sub_category ? ` / ${comp.sub_category}` : ""}</td>
                    <td style={{ padding: "14px 20px", color: "#666" }}>{comp.quantity}</td>
                    <td style={{ padding: "14px 20px", color: "#666" }}>{comp.material || "—"}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{ padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 600, ...(comp.norm_confidence >= 0.8 ? { background: "#fff", color: "#2d7d46", border: "1px solid #2d7d46" } : comp.norm_confidence >= 0.5 ? { background: "#fff", color: "#b8860b", border: "1px solid #b8860b" } : { background: "#fff", color: "#c0392b", border: "1px solid #c0392b" }) }}
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
    MET: { label: "合规", style: { background: "#fff", color: "#2d7d46", border: "1px solid #2d7d46" } },
    NOT_MET: { label: "不合规", style: { background: "#fff", color: "#c0392b", border: "1px solid #c0392b" } },
    PARTIALLY_MET: { label: "部分合规", style: { background: "#fff", color: "#b8860b", border: "1px solid #b8860b" } },
    NOT_ASSESSED: { label: "待评估", style: { background: "#fff", color: "#999", border: "1px solid #999" } },
    EXEMPT: { label: "豁免", style: { background: "#e8e4dc", color: "#666", border: "1px solid #e8e4dc" } },
  };
  const c = config[status] || { label: status, style: { background: "#fff", color: "#999", border: "1px solid #999" } };
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, ...c.style }}>{c.label}</span>;
}

function RiskBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; style: React.CSSProperties }> = {
    Critical: { label: "严重", style: { background: "#c0392b", color: "#fff", border: "1px solid #c0392b" } },
    Major: { label: "重要", style: { background: "#b8860b", color: "#fff", border: "1px solid #b8860b" } },
    Minor: { label: "轻微", style: { background: "#2d7d46", color: "#fff", border: "1px solid #2d7d46" } },
    Info: { label: "提示", style: { background: "#999", color: "#fff", border: "1px solid #999" } },
  };
  const c = config[level] || { label: level, style: { background: "#999", color: "#fff", border: "1px solid #999" } };
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, ...c.style }}>{c.label}</span>;
}

function MandateBadge({ mandate }: { mandate: string }) {
  const isMandatory = mandate === "Mandatory";
  return (
    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, ...(isMandatory ? { background: "#fff", color: "#1a1a1a", border: "1px solid #1a1a1a" } : { background: "#e8e4dc", color: "#666", border: "1px solid #e8e4dc" }) }}>
      {isMandatory ? "强制" : "建议"}
    </span>
  );
}
