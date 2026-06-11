"use client";

import { useState, useRef, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { Icon } from "@/components/ui/Icon";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  role: "user" | "assistant";
  content: string;
  source: "local" | "llm";
}

const SUGGESTED_QUESTIONS = [
  "20寸童车需要车铃吗？",
  "儿童自行车和成人自行车法规要求有什么不同？",
  "电助力车出口美国需要什么认证？",
  "CPSC 1512 对制动系统有什么要求？",
  "产品标签上需要标注哪些警示信息？",
  "UL 2849 认证的流程是什么样的？",
];

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "你好！我是 RegPilot AI 法规顾问。\n\n" +
    "我可以帮你解答美国市场自行车/电助力车产品的法规合规问题。\n\n" +
    "已接入智谱AI大模型，提供专业、精准的法规解读与总结。\n\n" +
    "涵盖法规：\n" +
    "• CPSC 1512 — 自行车安全标准\n" +
    "• CPSIA — 儿童产品安全\n" +
    "• UL 2849 — 电助力车电气系统\n" +
    "• UL 2271 — 电池安全\n\n" +
    "请随时向我提问！",
  source: "local",
};

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = { role: "user", content, source: "local" };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/advisor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`请求失败 (${res.status})`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, source: data.source || "local" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "抱歉，后端服务暂时不可用。请确保后端已启动：\n\n" +
            "```bash\n" +
            "cd backend\n" +
            "python3 -m uvicorn app.main:app --reload --port 8000\n" +
            "```",
          source: "local",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <SidebarLayout>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fafaf8" }}>
        <div style={{ padding: "24px 32px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ color: "#c8a44e" }}>
              <Icon name="chat" size={28} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.025em" }}>
              AI 法规顾问
            </h2>
          </div>
          <p style={{ color: "#666", fontSize: 14, paddingLeft: 4 }}>
            智谱AI驱动 · 67条法规规则 · 智能推理
          </p>
        </div>

        <div
          style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                animation: "slideUp 0.4s ease-out forwards",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.role === "assistant" && (
                <div style={{ flexShrink: 0, marginTop: 4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#c8a44e" }}>
                    <Icon name="chat" size={14} />
                  </div>
                </div>
              )}
              <div
                style={{
                  maxWidth: "75%",
                  borderRadius: 16,
                  padding: "16px 20px",
                  ...(msg.role === "user"
                    ? { color: "#1a1a1a", borderBottomRightRadius: 4, background: "#c8a44e", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }
                    : { background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", color: "#1a1a1a", borderBottomLeftRadius: 4 }),
                }}
              >
                {msg.role === "assistant" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #e8e4dc" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>
                      RegPilot AI
                    </span>
                    {msg.source === "llm" ? (
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, fontWeight: 500, background: "#2d7d46", color: "#fff" }}>
                        智谱AI
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, fontWeight: 500, background: "#e8e4dc", color: "#666" }}>
                        本地推理
                      </span>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 14, lineHeight: 1.625, whiteSpace: "pre-wrap" }}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-start", animation: "slideUp 0.4s ease-out forwards" }}>
              <div style={{ flexShrink: 0, marginTop: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#c8a44e" }}>
                  <Icon name="chat" size={14} />
                </div>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e8e4dc", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", borderRadius: 16, borderBottomLeftRadius: 4, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #e8e4dc" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>
                    RegPilot AI
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6, fontWeight: 500, background: "#fef3c7", color: "#b8860b", border: "1px solid #fcd34d" }}>
                    思考中...
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#b8860b", animation: "bounce 1s infinite", animationDelay: "0ms" }} />
                  <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#b8860b", animation: "bounce 1s infinite", animationDelay: "150ms" }} />
                  <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#b8860b", animation: "bounce 1s infinite", animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && (
          <div style={{ padding: "0 32px 16px", flexShrink: 0, animation: "slideUp 0.4s ease-out forwards" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ color: "#999" }}>
                <Icon name="search" size={12} />
              </div>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#999" }}>
                你可以这样问：
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  style={{
                    padding: "8px 16px",
                    background: "#f0efe8",
                    border: "1px solid #e8e4dc",
                    borderRadius: 9999,
                    fontSize: 14,
                    color: "#666",
                    cursor: "pointer",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ padding: "16px 32px", borderTop: "1px solid #e8e4dc", flexShrink: 0 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的法规合规问题..."
              disabled={loading}
              style={{
                flex: 1,
                borderRadius: 12,
                border: "1px solid #e8e4dc",
                background: "#fff",
                fontSize: 14,
                color: "#1a1a1a",
                padding: "12px 20px",
                outline: "none",
                opacity: loading ? 0.5 : 1,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#c8a44e"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#e8e4dc"; }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                color: "#1a1a1a",
                borderRadius: 12,
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "#c8a44e",
                border: "none",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                opacity: loading || !input.trim() ? 0.5 : 1,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {loading ? (
                <svg width="20" height="20" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" style={{ opacity: 0.25 }} />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style={{ opacity: 0.75 }} />
                </svg>
              ) : (
                "发送"
              )}
            </button>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
}
