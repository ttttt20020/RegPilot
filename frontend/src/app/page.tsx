"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { apiFetch } from "@/lib/api";
import type { AnalysisListItem } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);

  useEffect(() => {
    apiFetch<{ items: AnalysisListItem[]; total: number }>("/api/v1/analysis")
      .then((data) => setAnalyses(data.items || []))
      .catch(() => {});
  }, []);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleRename = useCallback(async (id: string, name: string) => {
    try {
      await apiFetch(`/api/v1/analysis/${id}/rename`, {
        method: "PATCH",
        body: JSON.stringify({ product_name: name }),
      });
      setAnalyses((prev) =>
        prev.map((a) => (a.id === id ? { ...a, product_name: name } : a))
      );
    } catch {}
    setEditingId(null);
  }, []);

  const scoreRingColor = (score: number | null) => {
    const s = score ?? 0;
    if (s >= 80) return "#22c55e";
    if (s >= 60) return "#eab308";
    return "#ef4444";
  };

  const riskBadge = (level: string | null) => {
    const map: Record<
      string,
      { label: string; bg: string; text: string }
    > = {
      CRITICAL: { label: "高风险", bg: "#fef2f2", text: "#991b1b" },
      HIGH: { label: "较高", bg: "#fff7ed", text: "#9a3412" },
      MEDIUM: { label: "中等", bg: "#fefce8", text: "#854d0e" },
      LOW: { label: "低风险", bg: "#f0fdf4", text: "#166534" },
    };
    return map[level || ""] || { label: "—", bg: "#f1f5f9", text: "#475569" };
  };

  const regUpdates = [
    { date: "2026-06", text: "FCC Part 15 已纳入法规库，新增数字电路EMC限值、充电器EMC限值两条规则", tag: "新增" },
    { date: "2026-06", text: "UN 38.3 锂电池运输安全规则已纳入，空运锂电池SoC不得超过30%", tag: "新增" },
    { date: "2026-06", text: "GCC 一般合格证书要求已纳入，适用于儿童自行车及儿童产品", tag: "新增" },
    { date: "2026-07", text: "CPSC eFiling 电子申报要求将于7月8日生效，违规将面临货物扣押及罚款", tag: "即将生效", urgent: true },
    { date: "2026-01", text: "ASTM F963 已更新，重金属限量标准有小幅调整", tag: "更新" },
    { date: "2025-12", text: "UL 2271 锂电池安全标准更新，新增热失控测试要求", tag: "更新" },
  ];

  return (
    <SidebarLayout>
      <div style={{ padding: 32, paddingBottom: 64 }}>
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 32,
                borderRadius: 4,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              }}
            />
            <h2
              style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}
            >
              工作台
            </h2>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[
            {
              label: "法规规则",
              value: "67",
              unit: "条",
              color: "#6366f1",
              emoji: "📋",
            },
            {
              label: "覆盖法规",
              value: "6",
              unit: "部",
              color: "#8b5cf6",
              emoji: "📜",
            },
            {
              label: "产品类型",
              value: "3",
              unit: "种",
              color: "#22c55e",
              emoji: "🚲",
            },
            {
              label: "分析记录",
              value: String(analyses.length),
              unit: "条",
              color: "#f59e0b",
              emoji: "📊",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: 20,
                border: "1px solid #f1f5f9",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: 24 }}>{stat.emoji}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {stat.label}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#1e293b",
                  }}
                >
                  {stat.value}
                </span>
                <span style={{ fontSize: 14, color: "#94a3b8" }}>
                  {stat.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        {analyses.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#1e293b",
                }}
              >
                ⏱️ 最近分析
              </div>
              <button
                onClick={() => router.push("/check")}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#6366f1",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                查看全部 →
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}
            >
              {analyses.slice(0, 6).map((item) => {
                const rb = riskBadge(item.risk_level);
                const score = item.compliance_score ?? 0;
                const ringColor = scoreRingColor(item.compliance_score);
                const scoreColor =
                  score >= 80
                    ? "#16a34a"
                    : score >= 60
                    ? "#ca8a04"
                    : "#dc2626";
                return (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/analysis/${item.id}`)}
                    style={{
                      background: "rgba(255,255,255,0.8)",
                      backdropFilter: "blur(8px)",
                      borderRadius: 16,
                      padding: 20,
                      border: "1px solid rgba(255,255,255,0.6)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 16,
                      }}
                    >
                      {editingId === item.id ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() =>
                            handleRename(item.id, editName)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleRename(item.id, editName);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#1e293b",
                            border: "1px solid #6366f1",
                            borderRadius: 6,
                            padding: "2px 8px",
                            outline: "none",
                            maxWidth: 160,
                            background: "#fff",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#1e293b",
                            maxWidth: 160,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            cursor: "text",
                          }}
                          title="双击重命名"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingId(item.id);
                            setEditName(item.product_name || "");
                          }}
                        >
                          {item.product_name || "未命名产品"}
                        </span>
                      )}
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 600,
                          background: rb.bg,
                          color: rb.text,
                        }}
                      >
                        {rb.label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
                        marginBottom: 16,
                      }}
                    >
                      {item.product_type === "Kids_Bicycle"
                        ? "👶 儿童自行车"
                        : item.product_type === "E-bike"
                        ? "⚡ 电助力车"
                        : "🚲 自行车"}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: 40,
                            height: 40,
                          }}
                        >
                          <svg
                            width="40"
                            height="40"
                            viewBox="0 0 36 36"
                            style={{
                              transform: "rotate(-90deg)",
                            }}
                          >
                            <circle
                              cx="18"
                              cy="18"
                              r="15"
                              fill="none"
                              stroke="#f1f5f9"
                              strokeWidth="3"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="15"
                              fill="none"
                              stroke={ringColor}
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeDasharray={`${(score / 100) * 94.2} 94.2`}
                            />
                          </svg>
                          <span
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 700,
                              color: scoreColor,
                            }}
                          >
                            {score.toFixed(0)}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: "#94a3b8",
                          }}
                        >
                          合规评分
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          color: "#cbd5e1",
                        }}
                      >
                        {item.created_at
                          ? new Date(
                              item.created_at
                            ).toLocaleDateString("zh-CN")
                          : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 18,
              fontWeight: 700,
              color: "#1e293b",
              marginBottom: 20,
            }}
          >
            🔔 法规更新动态
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              overflow: "hidden",
            }}
          >
            {regUpdates.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "14px 20px",
                  borderBottom: idx < regUpdates.length - 1 ? "1px solid #f8fafc" : "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#faf5ff")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#64748b",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {item.date}
                </span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    background: item.urgent ? "#fef2f2" : "#f0fdf4",
                    color: item.urgent ? "#dc2626" : "#16a34a",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {item.tag}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "#334155",
                    lineHeight: 1.6,
                  }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </SidebarLayout>
  );
}
