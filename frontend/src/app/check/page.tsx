"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const COUNTRIES = [
  { value: "US", label: "美国", flag: "us", desc: "CPSC 1512 · CPSIA · UL 2849 · UL 2271", disabled: false },
  { value: "EU", label: "欧盟", flag: "eu", desc: "EN 15194 · EN 14764 · REACH · RoHS", disabled: true },
  { value: "CA", label: "加拿大", flag: "ca", desc: "加拿大消费品安全法", disabled: true },
  { value: "UK", label: "英国", flag: "gb", desc: "UKCA 认证", disabled: true },
  { value: "AU", label: "澳大利亚", flag: "au", desc: "AS/NZS 标准", disabled: true },
];

const PRODUCT_TYPES = [
  { value: "Kids_Bicycle", label: "儿童自行车", desc: "座垫高度 ≤635mm，适用 CPSIA 儿童产品法规" },
  { value: "Bicycle", label: "自行车", desc: "成人/山地/公路自行车，适用 CPSC 1512" },
  { value: "E-bike", label: "电助力车", desc: "电机 + 电池 + 控制器，额外适用 UL 2849/2271" },
];

const FILE_SLOTS = [
  { key: "bom", label: "BOM 物料清单", accept: ".xlsx,.csv", desc: "必填 · 产品零部件清单", required: true, multiple: false },
  { key: "spec", label: "产品规格书", accept: ".pdf", desc: "技术参数、尺寸、性能指标", required: false, multiple: false },
  { key: "description", label: "产品说明文档", accept: ".docx,.pdf", desc: "产品功能描述、使用说明", required: false, multiple: false },
  { key: "images", label: "产品图片/标签", accept: ".png,.jpg,.jpeg,.pdf", desc: "产品外观、警示标签图片", required: false, multiple: true },
];

const FLAG_EMOJIS: Record<string, string> = {
  us: "🇺🇸",
  eu: "🇪🇺",
  ca: "🇨🇦",
  gb: "🇬🇧",
  au: "🇦🇺",
};

const PRODUCT_EMOJIS: Record<string, string> = {
  Kids_Bicycle: "🚲",
  Bicycle: "🚲",
  "E-bike": "⚡",
};

const FILE_EMOJIS: Record<string, string> = {
  bom: "📋",
  spec: "📄",
  description: "📝",
  images: "🖼️",
};

export default function CheckPage() {
  const router = useRouter();
  const [country, setCountry] = useState("US");
  const [productType, setProductType] = useState("");
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = useCallback((slotKey: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    setFiles((prev) => ({
      ...prev,
      [slotKey]: slotKey === "images" ? [...(prev[slotKey] || []), ...selectedFiles] : selectedFiles,
    }));
    setError(null);
  }, []);

  const handleRemoveFile = useCallback((slotKey: string, index: number) => {
    setFiles((prev) => {
      const slotFiles = [...(prev[slotKey] || [])];
      slotFiles.splice(index, 1);
      if (slotFiles.length === 0) {
        const next = { ...prev };
        delete next[slotKey];
        return next;
      }
      return { ...prev, [slotKey]: slotFiles };
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const bomFile = files.bom?.[0];
    if (!bomFile) { setError("请上传 BOM 物料清单文件"); return; }
    if (!productType) { setError("请选择产品类型"); return; }

    setUploading(true);
    setError(null);
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", bomFile);
      formData.append("country", country);
      formData.append("product_type", productType);
      if (files.spec?.[0]) formData.append("spec_file", files.spec[0]);
      if (files.description?.[0]) formData.append("description_file", files.description[0]);
      files.images?.forEach((img) => formData.append("image_files", img));

      setProgress(40);
      const res = await fetch(`${API_BASE_URL}/api/v1/analysis/upload`, { method: "POST", body: formData });
      setProgress(70);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `上传失败 (${res.status})`);
      }
      setProgress(90);
      const result = await res.json();
      setProgress(100);
      setTimeout(() => router.push(`/analysis/${result.id}`), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请重试");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }, [files, country, productType, router]);

  const hasBom = !!files.bom?.[0];
  const canSubmit = hasBom && !!productType && !uploading;
  const totalFiles = Object.values(files).reduce((sum, f) => sum + f.length, 0);

  const steps = [
    { label: "选择市场", done: true, active: true },
    { label: "选择产品", done: !!productType, active: true },
    { label: "上传资料", done: hasBom, active: !!productType },
    { label: "开始分析", done: false, active: canSubmit },
  ];

  return (
    <SidebarLayout>
      <div style={{ padding: "32px 32px 64px" }}>
        <div style={{ marginBottom: 32, animation: "slideUp 0.4s ease-out forwards" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 8, height: 32, borderRadius: 9999, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }} />
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.025em" }}>产品检查</h2>
          </div>
          <p style={{ color: "#94a3b8", marginLeft: 20 }}>上传产品资料，AI 自动进行法规合规分析</p>
        </div>

        {error && (
          <div style={{ marginBottom: 24, padding: "12px 20px", borderRadius: 16, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "space-between", animation: "slideUp 0.4s ease-out forwards", background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              {error}
            </span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#f87171" }}>
              ✕
            </button>
          </div>
        )}

        <div style={{ marginBottom: 40, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.05s" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      position: "relative", width: 36, height: 36, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700,
                      ...(step.done
                        ? { color: "#fff", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 10px 15px -3px rgba(99,102,241,0.25), 0 4px 6px -4px rgba(99,102,241,0.25)" }
                        : step.active
                          ? { background: "#e0e7ff", color: "#4f46e5", boxShadow: "0 0 0 2px #c7d2fe" }
                          : { background: "#f1f5f9", color: "#94a3b8" }),
                    }}
                  >
                    {step.done ? "✓" : <span>{i + 1}</span>}
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                    color: step.done ? "#4f46e5" : step.active ? "#475569" : "#94a3b8",
                  }}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    style={{ flex: 1, height: 2, margin: "0 16px", borderRadius: 9999, ...(step.done ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" } : { background: "#e2e8f0" }) }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 32 }}>
          <div style={{ animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.1s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 20, borderRadius: 9999, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }} />
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>目标市场</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {COUNTRIES.map((c) => (
                <button
                  key={c.value}
                  disabled={c.disabled}
                  onClick={() => setCountry(c.value)}
                  style={{
                    width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 16, border: "1px solid",
                    ...(c.disabled
                      ? { borderColor: "#f1f5f9", background: "rgba(248,250,252,0.5)", cursor: "not-allowed", opacity: 0.5 }
                      : country === c.value
                        ? { background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", borderColor: "#a5b4fc", boxShadow: "0 0 0 2px #e0e7ff, 0 10px 15px -3px rgba(99,102,241,0.05), 0 4px 6px -4px rgba(99,102,241,0.05)" }
                        : { background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", borderColor: "rgba(226,232,240,0.8)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }),
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                        ...(c.disabled
                          ? { background: "#f1f5f9" }
                          : country === c.value
                            ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 6px -1px rgba(99,102,241,0.2), 0 2px 4px -2px rgba(99,102,241,0.2)" }
                            : { background: "#eef2ff" }),
                      }}
                    >
                      {FLAG_EMOJIS[c.flag]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 14, fontWeight: 600,
                          color: c.disabled ? "#94a3b8" : country === c.value ? "#4338ca" : "#334155",
                        }}>
                          {c.label}
                        </span>
                        {c.disabled && (
                          <span style={{ padding: "2px 6px", borderRadius: 6, fontSize: 9, fontWeight: 600, background: "#fefce8", color: "#854d0e", border: "1px solid #fde047" }}>即将推出</span>
                        )}
                        {!c.disabled && country === c.value && (
                          <span style={{ fontSize: 14, color: "#6366f1" }}>✓</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 20, borderRadius: 9999, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }} />
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                产品类型
                {!productType && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {PRODUCT_TYPES.map((p) => {
                const selected = productType === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setProductType(p.value)}
                    style={{
                      width: "100%", textAlign: "left", padding: 16, borderRadius: 16, border: "1px solid",
                      ...(selected
                        ? { background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", borderColor: "#a5b4fc", boxShadow: "0 0 0 2px #e0e7ff, 0 10px 15px -3px rgba(99,102,241,0.05), 0 4px 6px -4px rgba(99,102,241,0.05)" }
                        : { background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", borderColor: "rgba(226,232,240,0.8)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }),
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                          ...(selected
                            ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 6px -1px rgba(99,102,241,0.2), 0 2px 4px -2px rgba(99,102,241,0.2)" }
                            : { background: "#eef2ff", color: "#6366f1" }),
                        }}
                      >
                        {PRODUCT_EMOJIS[p.value]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: selected ? "#4338ca" : "#334155" }}>
                            {p.label}
                          </span>
                          {selected && (
                            <div style={{ width: 20, height: 20, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", animation: "scaleIn 0.2s ease-out", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                              ✓
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{p.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 4, height: 20, borderRadius: 9999, background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }} />
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                产品资料
                {!hasBom && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FILE_SLOTS.map((slot) => {
                const slotFiles = files[slot.key] || [];
                const filled = slotFiles.length > 0;
                return (
                  <div
                    key={slot.key}
                    style={{
                      position: "relative", borderRadius: 16, border: "2px dashed", padding: 16,
                      ...(filled
                        ? { borderColor: "#6ee7b7", background: "rgba(236,253,245,0.4)" }
                        : slot.required
                          ? { borderColor: "#fde68a", background: "rgba(255,251,235,0.2)" }
                          : { borderColor: "#e2e8f0", background: "rgba(255,255,255,0.6)" }),
                    }}
                  >
                    <input
                      type="file"
                      accept={slot.accept}
                      multiple={slot.multiple}
                      onChange={handleFileSelect(slot.key)}
                      ref={(el) => { fileInputRefs.current[slot.key] = el; }}
                      style={{ display: "none" }}
                    />
                    {filled ? (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                            {FILE_EMOJIS[slot.key]}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#047857" }}>{slot.label}</span>
                          <span style={{ fontSize: 14, color: "#10b981", marginLeft: "auto" }}>✓</span>
                        </div>
                        {slotFiles.map((f, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginLeft: 42, marginTop: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                              <span style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>📄</span>
                              <span style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveFile(slot.key, i)}
                              style={{ color: "#cbd5e1", background: "none", border: "none", cursor: "pointer", marginLeft: 8, flexShrink: 0, fontSize: 14 }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => fileInputRefs.current[slot.key]?.click()}
                          style={{ marginLeft: 42, marginTop: 8, fontSize: 12, fontWeight: 500, color: "#6366f1", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          + {slot.multiple ? "添加更多" : "重新选择"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRefs.current[slot.key]?.click()}
                        style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                          ...(slot.required ? { background: "#fef3c7", color: "#f59e0b" } : { background: "#f1f5f9", color: "#94a3b8" }),
                        }}>
                          {FILE_EMOJIS[slot.key]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "#334155" }}>
                            {slot.label}
                            {slot.required && <span style={{ color: "#f87171", marginLeft: 4 }}>*</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{slot.desc}</div>
                        </div>
                        <span style={{ fontSize: 20, color: "#cbd5e1" }}>⬆️</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {totalFiles > 0 && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
                <span style={{ fontSize: 14 }}>📄</span>
                已选择 {totalFiles} 个文件
              </div>
            )}
          </div>
        </div>

        {uploading && (
          <div style={{ marginBottom: 32, animation: "slideUp 0.4s ease-out forwards" }}>
            <div style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite", color: "#6366f1" }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" style={{ opacity: 0.25 }} />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
                  </svg>
                  {progress < 40 ? "正在上传文件..." : progress < 70 ? "正在解析 BOM 数据..." : progress < 90 ? "正在进行法规匹配与风险评估..." : "分析完成，即将跳转..."}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#4f46e5" }}>{progress}%</span>
              </div>
              <div style={{ width: "100%", background: "#f1f5f9", borderRadius: 9999, height: 10, overflow: "hidden" }}>
                <div
                  style={{ height: 10, borderRadius: 9999, width: `${progress}%`, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", position: "relative" }}
                >
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 20, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.25s" }}>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10, fontSize: 16, padding: "14px 48px", color: "#fff", fontWeight: 600, borderRadius: 16, border: "none", cursor: canSubmit ? "pointer" : "not-allowed",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 4px 12px rgba(79,70,229,0.3)",
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {uploading ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" style={{ opacity: 0.25 }} />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
                </svg>
                分析中...
              </>
            ) : (
              <>
                <span style={{ fontSize: 20 }}>🔬</span>
                开始合规分析
              </>
            )}
          </button>
          {!canSubmit && !uploading && (
            <span style={{ fontSize: 14, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 16 }}>ℹ️</span>
              {!hasBom ? "请上传 BOM 物料清单" : !productType ? "请选择产品类型" : ""}
            </span>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
