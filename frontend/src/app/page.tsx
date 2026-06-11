"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { apiFetch } from "@/lib/api";
import type { AnalysisListItem } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

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
    if (s >= 80) return "#2d7d46";
    if (s >= 60) return "#b8860b";
    return "#c0392b";
  };

  const riskBadge = (level: string | null) => {
    const map: Record<
      string,
      { label: string; bg: string; text: string }
    > = {
      CRITICAL: { label: "高风险", bg: "#fdf0ef", text: "#c0392b" },
      HIGH: { label: "较高", bg: "#fdf6ee", text: "#b8860b" },
      MEDIUM: { label: "中等", bg: "#fef9ef", text: "#b8860b" },
      LOW: { label: "低风险", bg: "#eef6f0", text: "#2d7d46" },
    };
    return map[level || ""] || { label: "—", bg: "#f5f4f0", text: "#666" };
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
      <div style={{ padding: 32, paddingBottom: 64, background: "#fafaf8", minHeight: "100%" }}>
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
                background: "#c8a44e",
              }}
            />
            <h2
              style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}
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
              icon: "rules" as const,
            },
            {
              label: "覆盖法规",
              value: "6",
              unit: "部",
              icon: "book" as const,
            },
            {
              label: "产品类型",
              value: "3",
              unit: "种",
              icon: "products" as const,
            },
            {
              label: "分析记录",
              value: String(analyses.length),
              unit: "条",
              icon: "file" as const,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#fff",
                borderRadius: 8,
                padding: 20,
                borderLeft: "3px solid #c8a44e",
                border: "1px solid #e8e4dc",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
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
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    background: "#f5f3ee",
                    color: "#c8a44e",
                  }}
                >
                  <Icon name={stat.icon} size={14} />
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#999",
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
                    color: "#1a1a1a",
                  }}
                >
                  {stat.value}
                </span>
                <span style={{ fontSize: 14, color: "#999" }}>
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
                  color: "#1a1a1a",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    background: "#f5f3ee",
                    color: "#c8a44e",
                  }}
                >
                  <Icon name="history" size={12} />
                </span>
                最近分析
              </div>
              <button
                onClick={() => router.push("/check")}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#c8a44e",
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
                    ? "#2d7d46"
                    : score >= 60
                    ? "#b8860b"
                    : "#c0392b";
                return (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/analysis/${item.id}`)}
                    style={{
                      background: "#fff",
                      borderRadius: 8,
                      padding: 20,
                      border: "1px solid #e8e4dc",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
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
                            color: "#1a1a1a",
                            border: "1px solid #c8a44e",
                            borderRadius: 4,
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
                            color: "#1a1a1a",
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
                          borderRadius: 4,
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
                        color: "#999",
                        marginBottom: 16,
                      }}
                    >
                      {item.product_type === "Kids_Bicycle"
                        ? "儿童自行车"
                        : item.product_type === "E-bike"
                        ? "电助力车"
                        : "自行车"}
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
                              stroke="#e8e4dc"
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
                            color: "#999",
                          }}
                        >
                          合规评分
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          color: "#999",
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
              color: "#1a1a1a",
              marginBottom: 20,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: 4,
                background: "#f5f3ee",
                color: "#c8a44e",
              }}
            >
              <Icon name="bell" size={12} />
            </span>
            法规更新动态
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              border: "1px solid #e8e4dc",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "80px 72px 1fr",
                padding: "10px 20px",
                background: "#fafaf8",
                borderBottom: "1px solid #e8e4dc",
                fontSize: 10,
                fontWeight: 600,
                color: "#999",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              <span>日期</span>
              <span>类型</span>
              <span>内容</span>
            </div>
            {regUpdates.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 72px 1fr",
                  alignItems: "center",
                  padding: "12px 20px",
                  borderBottom: idx < regUpdates.length - 1 ? "1px solid #e8e4dc" : "none",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fafaf8")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#666",
                  }}
                >
                  {item.date}
                </span>
                <span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: 600,
                      background: item.urgent ? "#fdf0ef" : item.tag === "新增" ? "#eef6f0" : "#fef9ef",
                      color: item.urgent ? "#c0392b" : item.tag === "新增" ? "#2d7d46" : "#b8860b",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.tag}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: "#1a1a1a",
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

