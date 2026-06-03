"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { uploadFile, apiFetch } from "@/lib/api";
import type { UploadResponse, AnalysisListItem } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    apiFetch<{ items: AnalysisListItem[]; total: number }>("/api/v1/analysis")
      .then((data) => setAnalyses(data.items || []))
      .catch(() => {});
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const result = await uploadFile<UploadResponse>("/api/v1/analysis/upload", file);
      router.push(`/analysis/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }, [router]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleRename = useCallback(async (id: string, name: string) => {
    try {
      await apiFetch(`/api/v1/analysis/${id}/rename`, {
        method: "PATCH",
        body: JSON.stringify({ product_name: name }),
      });
      setAnalyses((prev) => prev.map((a) => a.id === id ? { ...a, product_name: name } : a));
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
    const map: Record<string, { label: string; bg: string; text: string }> = {
      CRITICAL: { label: "高风险", bg: "#fef2f2", text: "#991b1b" },
      HIGH: { label: "较高", bg: "#fff7ed", text: "#9a3412" },
      MEDIUM: { label: "中等", bg: "#fefce8", text: "#854d0e" },
      LOW: { label: "低风险", bg: "#f0fdf4", text: "#166534" },
    };
    return map[level || ""] || { label: "—", bg: "#f1f5f9", text: "#475569" };
  };

  return (
    <SidebarLayout>
      <div style={{ padding: 32, paddingBottom: 64 }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 8, height: 32, borderRadius: 4, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }} />
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}>工作台</h2>
          </div>
          <p style={{ color: "#94a3b8", marginLeft: 20 }}>上传产品资料，一键生成合规分析报告</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "法规规则", value: "67", unit: "条", color: "#6366f1", emoji: "📋" },
            { label: "覆盖法规", value: "6", unit: "部", color: "#8b5cf6", emoji: "📜" },
            { label: "产品类型", value: "3", unit: "种", color: "#22c55e", emoji: "🚲" },
            { label: "分析记录", value: String(analyses.length), unit: "条", color: "#f59e0b", emoji: "📊" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              border: "1px solid #f1f5f9",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{stat.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>{stat.label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: "#1e293b" }}>{stat.value}</span>
                <span style={{ fontSize: 14, color: "#94a3b8" }}>{stat.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {analyses.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
                ⏱️ 最近分析
              </div>
              <button onClick={() => router.push("/check")} style={{ fontSize: 12, fontWeight: 500, color: "#6366f1", background: "none", border: "none", cursor: "pointer" }}>
                查看全部 →
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {analyses.slice(0, 6).map((item) => {
                const rb = riskBadge(item.risk_level);
                const score = item.compliance_score ?? 0;
                const ringColor = scoreRingColor(item.compliance_score);
                const scoreColor = score >= 80 ? "#16a34a" : score >= 60 ? "#ca8a04" : "#dc2626";
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      {editingId === item.id ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleRename(item.id, editName)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleRename(item.id, editName); if (e.key === "Escape") setEditingId(null); }}
                          style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", border: "1px solid #6366f1", borderRadius: 6, padding: "2px 8px", outline: "none", maxWidth: 160, background: "#fff" }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "text" }}
                          title="双击重命名"
                          onDoubleClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditName(item.product_name || ""); }}
                        >
                          {item.product_name || "未命名产品"}
                        </span>
                      )}
                      <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: rb.bg, color: rb.text }}>
                        {rb.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 16 }}>
                      {item.product_type === "Kids_Bicycle" ? "👶 儿童自行车" :
                       item.product_type === "E-bike" ? "⚡ 电助力车" : "🚲 自行车"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ position: "relative", width: 40, height: 40 }}>
                          <svg width="40" height="40" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                            <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15" fill="none" stroke={ringColor} strokeWidth="3" strokeLinecap="round"
                              strokeDasharray={`${(score / 100) * 94.2} 94.2`} />
                          </svg>
                          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: scoreColor }}>
                            {score.toFixed(0)}
                          </span>
                        </div>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>合规评分</span>
                      </div>
                      <span style={{ fontSize: 10, color: "#cbd5e1" }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString("zh-CN") : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          style={{
            borderRadius: 16,
            border: "2px dashed",
            borderColor: dragOver ? "#818cf8" : "#e2e8f0",
            padding: 48,
            textAlign: "center",
            background: dragOver ? "rgba(99,102,241,0.05)" : "rgba(255,255,255,0.6)",
            transition: "all 0.3s",
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 48 }}>⏳</div>
              <div>
                <p style={{ color: "#6366f1", fontWeight: 600 }}>正在分析您的 BOM 文件...</p>
                <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 4 }}>7 步分析流程运行中，请稍候</p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📎</div>
              <p style={{ fontSize: 18, fontWeight: 600, color: "#475569", marginBottom: 4 }}>拖拽 BOM 文件到此处</p>
              <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 4 }}>支持 .xlsx / .csv 格式</p>
              <p style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 24 }}>上传物料清单，系统自动解析零部件、匹配法规、生成合规报告</p>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 15,
                  padding: "12px 32px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  boxShadow: "0 4px 12px rgba(79,70,229,0.3)",
                }}
              >
                ➕ 上传 BOM 开始分析
                <input type="file" accept=".xlsx,.csv" style={{ display: "none" }} onChange={handleFileInput} />
              </label>
              <p style={{ marginTop: 20, fontSize: 12, color: "#94a3b8" }}>
                或前往{" "}
                <button onClick={() => router.push("/check")} style={{ color: "#6366f1", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
                  产品检查
                </button>
                {" "}进行完整合规分析
              </p>
            </>
          )}
          {error && (
            <div style={{ marginTop: 16, padding: "8px 16px", borderRadius: 8, fontSize: 14, display: "inline-block", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}