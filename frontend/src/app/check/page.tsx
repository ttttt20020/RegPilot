"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { Icon } from "@/components/ui/Icon";

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

const FLAG_ABBR: Record<string, string> = {
  us: "US",
  eu: "EU",
  ca: "CA",
  gb: "UK",
  au: "AU",
};

const PRODUCT_ABBR: Record<string, string> = {
  Kids_Bicycle: "KB",
  Bicycle: "BK",
  "E-bike": "EB",
};

const FILE_ABBR: Record<string, string> = {
  bom: "BM",
  spec: "SP",
  description: "DC",
  images: "IM",
};

const FILE_ICON: Record<string, string> = {
  bom: "file",
  spec: "file",
  description: "edit",
  images: "tag",
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
      <div style={{ padding: "32px 32px 64px", background: "#fafaf8", minHeight: "100vh" }}>
        <div style={{ marginBottom: 32, animation: "slideUp 0.4s ease-out forwards" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Icon name="shield" size={28} />
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.025em" }}>产品检查</h2>
          </div>
          <p style={{ color: "#999", marginLeft: 20 }}>上传产品资料，AI 自动进行法规合规分析</p>
        </div>

        {error && (
          <div style={{ marginBottom: 24, padding: "12px 20px", borderRadius: 8, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "space-between", animation: "slideUp 0.4s ease-out forwards", background: "#fdf2f2", color: "#c0392b", border: "1px solid #e8b4b4" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#c0392b" strokeWidth="1.5" />
                <line x1="8" y1="4" x2="8" y2="9" stroke="#c0392b" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11.5" r="0.75" fill="#c0392b" />
              </svg>
              {error}
            </span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#c0392b" }}>
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
                        ? { color: "#fff", background: "#c8a44e", boxShadow: "0 2px 4px rgba(200,164,78,0.25)" }
                        : step.active
                          ? { background: "#f5f0e6", color: "#c8a44e", border: "2px solid #e8e4dc" }
                          : { background: "#f0ede6", color: "#999" }),
                    }}
                  >
                    {step.done ? "✓" : <span>{i + 1}</span>}
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                    color: step.done ? "#c8a44e" : step.active ? "#666" : "#999",
                  }}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    style={{ flex: 1, height: 2, margin: "0 16px", borderRadius: 9999, ...(step.done ? { background: "#c8a44e" } : { background: "#e8e4dc" }) }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 32 }}>
          <div style={{ animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.1s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Icon name="globe" size={20} />
              <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>目标市场</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {COUNTRIES.map((c) => (
                <button
                  key={c.value}
                  disabled={c.disabled}
                  onClick={() => setCountry(c.value)}
                  style={{
                    width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 8, border: "none",
                    ...(c.disabled
                      ? { background: "#f5f3ee", cursor: "not-allowed", opacity: 0.5 }
                      : country === c.value
                        ? { background: "#fff", borderLeft: "3px solid #c8a44e", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", border: "1px solid #e8e4dc" }
                        : { background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", border: "1px solid #e8e4dc" }),
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, letterSpacing: "0.5px",
                        ...(c.disabled
                          ? { background: "#f0ede6", color: "#999" }
                          : country === c.value
                            ? { background: "#c8a44e", color: "#fff", boxShadow: "0 2px 4px rgba(200,164,78,0.2)" }
                            : { background: "#f5f0e6", color: "#c8a44e" }),
                      }}
                    >
                      {FLAG_ABBR[c.flag]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 14, fontWeight: 600,
                          color: c.disabled ? "#999" : country === c.value ? "#1a1a1a" : "#666",
                        }}>
                          {c.label}
                        </span>
                        {c.disabled && (
                          <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: "#fdf6e3", color: "#b8860b", border: "1px solid #e8dcc8" }}>即将推出</span>
                        )}
                        {!c.disabled && country === c.value && (
                          <span style={{ fontSize: 14, color: "#c8a44e", fontWeight: 700 }}>✓</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#999", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Icon name="products" size={20} />
              <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
                产品类型
                {!productType && <span style={{ color: "#c0392b", marginLeft: 2 }}>*</span>}
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
                      width: "100%", textAlign: "left", padding: 16, borderRadius: 8,
                      ...(selected
                        ? { background: "#fff", border: "1px solid #e8e4dc", borderLeft: "3px solid #c8a44e", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }
                        : { background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }),
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, letterSpacing: "0.5px",
                          ...(selected
                            ? { background: "#c8a44e", color: "#fff", boxShadow: "0 2px 4px rgba(200,164,78,0.2)" }
                            : { background: "#f5f0e6", color: "#c8a44e" }),
                        }}
                      >
                        {PRODUCT_ABBR[p.value]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: selected ? "#1a1a1a" : "#666" }}>
                            {p.label}
                          </span>
                          {selected && (
                            <div style={{ width: 20, height: 20, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "#c8a44e", animation: "scaleIn 0.2s ease-out", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                              ✓
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{p.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Icon name="upload" size={20} />
              <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
                产品资料
                {!hasBom && <span style={{ color: "#c0392b", marginLeft: 2 }}>*</span>}
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
                      position: "relative", borderRadius: 8, border: "2px dashed", padding: 16,
                      ...(filled
                        ? { borderColor: "#2d7d46", background: "#f6faf7" }
                        : slot.required
                          ? { borderColor: "#e8e4dc", background: "#fffcf5" }
                          : { borderColor: "#e8e4dc", background: "#fff" }),
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
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: "#e6f2ea", display: "flex", alignItems: "center", justifyContent: "center", color: "#2d7d46" }}>
                            <Icon name={FILE_ICON[slot.key]} size={16} />
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#2d7d46" }}>{slot.label}</span>
                          <span style={{ fontSize: 14, color: "#2d7d46", marginLeft: "auto", fontWeight: 700 }}>✓</span>
                        </div>
                        {slotFiles.map((f, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginLeft: 42, marginTop: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                              <Icon name="file" size={12} />
                              <span style={{ fontSize: 12, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveFile(slot.key, i)}
                              style={{ color: "#999", background: "none", border: "none", cursor: "pointer", marginLeft: 8, flexShrink: 0, fontSize: 14 }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => fileInputRefs.current[slot.key]?.click()}
                          style={{ marginLeft: 42, marginTop: 8, fontSize: 12, fontWeight: 500, color: "#c8a44e", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
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
                          width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                          ...(slot.required ? { background: "#fdf6e3", color: "#b8860b" } : { background: "#f5f0e6", color: "#999" }),
                        }}>
                          <Icon name={FILE_ICON[slot.key]} size={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>
                            {slot.label}
                            {slot.required && <span style={{ color: "#c0392b", marginLeft: 4 }}>*</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{slot.desc}</div>
                        </div>
                        <div style={{ flexShrink: 0, color: "#999" }}>
                          <Icon name="upload" size={16} />
                        </div>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {totalFiles > 0 && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#999" }}>
                <Icon name="info" size={14} />
                已选择 {totalFiles} 个文件
              </div>
            )}
          </div>
        </div>

        {uploading && (
          <div style={{ marginBottom: 32, animation: "slideUp 0.4s ease-out forwards" }}>
            <div style={{ background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", borderRadius: 8, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#666", display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite", color: "#c8a44e" }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" style={{ opacity: 0.25 }} />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
                  </svg>
                  {progress < 40 ? "正在上传文件..." : progress < 70 ? "正在解析 BOM 数据..." : progress < 90 ? "正在进行法规匹配与风险评估..." : "分析完成，即将跳转..."}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#c8a44e" }}>{progress}%</span>
              </div>
              <div style={{ width: "100%", background: "#f0ede6", borderRadius: 9999, height: 10, overflow: "hidden" }}>
                <div
                  style={{ height: 10, borderRadius: 9999, width: `${progress}%`, background: "#c8a44e", transition: "width 0.3s ease" }}
                />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 20, animation: "slideUp 0.4s ease-out forwards", animationDelay: "0.25s" }}>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10, fontSize: 16, padding: "14px 48px", color: "#1a1a1a", fontWeight: 600, borderRadius: 8, border: "none", cursor: canSubmit ? "pointer" : "not-allowed",
              background: "#c8a44e",
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {uploading ? (
              <>
                <div style={{ animation: "spin 1s linear infinite" }}>
                  <Icon name="clock" size={20} />
                </div>
                分析中...
              </>
            ) : (
              <>
                <Icon name="check" size={20} />
                开始合规分析
              </>
            )}
          </button>
          {!canSubmit && !uploading && (
            <span style={{ fontSize: 14, color: "#999", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="info" size={14} />
              {!hasBom ? "请上传 BOM 物料清单" : !productType ? "请选择产品类型" : ""}
            </span>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
