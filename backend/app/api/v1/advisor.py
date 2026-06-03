from __future__ import annotations

import json
import uuid
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.rule_matcher import load_rule_store

router = APIRouter()

# ── Cache ──────────────────────────────────────────────────────────────
_rules_cache: list[dict] | None = None
_llm_cache: dict[str, dict] = {}


def _get_all_rules_text() -> list[dict]:
    global _rules_cache
    if _rules_cache is not None:
        return _rules_cache
    rules = load_rule_store()
    _rules_cache = [
        {
            "rule_id": r.rule_id,
            "category": r.category,
            "requirement": r.requirement_summary or r.requirement[:200],
            "full_requirement": r.requirement,
            "regulation": r.regulation_source.get("regulation", "") if isinstance(r.regulation_source, dict) else getattr(r.regulation_source, "regulation", ""),
            "section": r.regulation_source.get("section", "") if isinstance(r.regulation_source, dict) else getattr(r.regulation_source, "section", ""),
            "mandate": r.mandate,
            "risk_level": r.risk_level,
            "applicable_products": r.applicable_products,
            "remediation": r.remediation or "",
        }
        for r in rules
    ]
    return _rules_cache


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str
    source: str = "local"
    query_id: str = ""


class LLMStatusResponse(BaseModel):
    done: bool
    reply: str | None = None


def _keyword_match(query: str, rule: dict) -> int:
    score = 0
    q = query.lower()

    keywords_map = {
        "刹车": ["brake", "制动", "刹车", "制动器", "手闸", "脚刹"],
        "制动": ["brake", "制动", "刹车", "手闸", "脚刹"],
        "手刹": ["handbrake", "手闸", "手刹", "hand brake"],
        "脚刹": ["footbrake", "脚刹", "foot brake", "coaster"],
        "反光": ["reflector", "反光", "反射"],
        "车铃": ["bell", "铃", "声音", "警示装置"],
        "铃铛": ["bell", "铃", "声音", "警示装置"],
        "链罩": ["chain guard", "链罩", "链条", "防护"],
        "链条": ["chain guard", "链罩", "链条", "derailleur", "变速"],
        "标签": ["label", "标签", "追踪标签", "tracking", "标记"],
        "追踪标签": ["tracking label", "追踪标签", "tracking"],
        "电池": ["battery", "电池", "蓄电池", "lithium", "锂电池"],
        "充电": ["charger", "充电", "充电器"],
        "电机": ["motor", "电机", "马达", "轮毂电机"],
        "化学": ["chemical", "化学", "铅", "phthalate", "邻苯"],
        "铅": ["chemical", "铅", "lead", "涂层", "paint"],
        "邻苯": ["phthalate", "邻苯", "邻苯二甲酸"],
        "测试": ["testing", "测试", "检测", "test report", "报告"],
        "童车": ["kids", "儿童", "kids_bicycle", "童车", "儿童自行车"],
        "儿童": ["kids", "儿童", "kids_bicycle", "童车", "cpsia"],
        "电助力": ["e-bike", "电助力", "ebike", "电动自行车", "ebike"],
        "电动自行车": ["e-bike", "电助力", "ebike", "电动自行车"],
        "ul": ["ul", "ul2849", "ul2271"],
        "ul2849": ["ul 2849", "ul2849", "电气系统"],
        "ul2271": ["ul 2271", "ul2271", "电池安全"],
        "cpsc": ["cpsc", "cpsc1512", "1512"],
        "cpsia": ["cpsia", "儿童产品", "cpc"],
        "认证": ["certification", "认证", "测试报告", "cpc", "gcc"],
        "出口": ["美国", "us", "export", "出口", "进口"],
        "美国": ["美国", "us", "cpsc", "cpsia"],
        "速度": ["speed", "速度", "mph", "km/h", "20mph"],
        "功率": ["power", "功率", "watt", "750w", "350w"],
        "座垫": ["seat", "座垫", "高度", "座管"],
        "座管": ["seat post", "座管", "鞍管", "插入标记"],
        "警示": ["warning", "警示", "警告", "说明书"],
        "说明书": ["manual", "说明书", "instruction", "操作说明"],
        "标准": ["standard", "标准", "specification", "法规"],
        "合规": ["compliance", "合规", "符合"],
        "锐边": ["sharp edge", "锐边", "mechanical", "突出物"],
        "轮胎": ["tire", "轮胎", "气压", "rim"],
        "前叉": ["fork", "前叉", "车架"],
        "车架": ["frame", "车架", "前叉", "fork"],
        "车把": ["handlebar", "车把", "立管", "stem", "转向"],
        "转向": ["steering", "转向", "车把", "handlebar", "stem"],
        "踏板": ["pedal", "踏板", "脚踏"],
        "防水": ["ipx4", "water", "防水", "splash"],
        "bms": ["bms", "电池管理", "保护板"],
        "class": ["class 1", "class 2", "class 3", "分类"],
        "折叠": ["folding", "折叠", "折叠车"],
        "公路": ["road", "公路", "道路测试"],
        "跌落": ["drop test", "跌落", "冲击"],
        "包装": ["packaging", "包装", "纸箱", "吊卡"],
        "亚马逊": ["amazon", "亚马逊", "上架", "gcc"],
        "gcc": ["gcc", "一般合格证书", "general conformity"],
        "cpc": ["cpc", "儿童产品证书", "children product"],
        "第三方": ["third party", "第三方", "实验室", "iso 17025"],
    }

    for keyword, kws in keywords_map.items():
        if keyword in q:
            for kw in kws:
                if kw.lower() in rule["requirement"].lower():
                    score += 3
                if kw.lower() in rule["category"].lower():
                    score += 2
                if kw.lower() in rule["regulation"].lower():
                    score += 1
                if kw.lower() in rule["full_requirement"].lower():
                    score += 2

    return score


def _search_rules(query: str, top_k: int = 15) -> list[dict]:
    all_rules = _get_all_rules_text()
    scored = []
    for rule in all_rules:
        s = _keyword_match(query, rule)
        if s > 0:
            scored.append((s, rule))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [r for _, r in scored[:top_k]]


def _build_context(matched_rules: list[dict]) -> str:
    """Build context for LLM: matched rules with full detail, or all rules summary."""
    if matched_rules:
        parts = []
        for r in matched_rules:
            products = ", ".join(r["applicable_products"])
            parts.append(
                f"[{r['rule_id']}] {r['regulation']} {r['section']}: "
                f"{r['full_requirement']} "
                f"(性质: {r['mandate']}, 风险: {r['risk_level']}, 产品: {products})"
            )
        return "\n".join(parts)

    # No keyword match — send all rules as compact summary
    all_rules = _get_all_rules_text()
    parts = []
    for r in all_rules:
        parts.append(f"[{r['rule_id']}] {r['regulation']} {r['section']}: {r['requirement']}")
    return "\n".join(parts)


def _format_local_answer(query: str, matched_rules: list[dict]) -> str:
    """Local fallback: structured rule listing with summary."""
    product_map = {
        "Kids_Bicycle": "儿童自行车", "Bicycle": "自行车", "E-bike": "电助力车",
    }
    mandate_map = {
        "Mandatory": "强制", "Conditional": "有条件", "Optional": "建议", "Exemption": "豁免",
    }

    if not matched_rules:
        return (
            "当前未找到与您问题直接匹配的法规条款。\n\n"
            "RegPilot 法规知识库覆盖以下领域：\n"
            "• CPSC 16 CFR 1512 — 自行车安全标准（制动、转向、反光、车铃、链罩、标签等）\n"
            "• CPSIA — 儿童产品安全（铅含量、邻苯二甲酸盐、追踪标签、CPC认证等）\n"
            "• UL 2849 — 电助力车电气系统安全（绝缘、耐压、防水、BMS等）\n"
            "• UL 2271 — 电池安全（过充、短路、温升等）\n\n"
            "建议尝试更具体的问题，例如：\n"
            "• \"儿童自行车出口美国需要什么认证？\"\n"
            "• \"电助力车电池需要通过哪些测试？\"\n"
            "• \"刹车系统的制动距离要求是多少？\""
        )

    relevant_regulations = sorted(set(r["regulation"] for r in matched_rules if r["regulation"]))

    answer_parts = [f"根据法规知识库，找到 {len(matched_rules)} 条相关条款：\n"]

    for i, rule in enumerate(matched_rules[:8], 1):
        products = "、".join(product_map.get(p, p) for p in rule["applicable_products"])
        mandate = mandate_map.get(rule["mandate"], rule["mandate"])

        answer_parts.append(
            f"{i}. [{rule['rule_id']}] {rule['requirement']}\n"
            f"   法规：{rule['regulation']} {rule['section']} | {mandate} | 适用：{products}"
        )

        if rule["remediation"]:
            answer_parts.append(f"   建议：{rule['remediation'][:100]}")
        answer_parts.append("")

    if len(matched_rules) > 8:
        answer_parts.append(f"...还有 {len(matched_rules) - 8} 条相关条款。\n")

    answer_parts.append(f"涉及法规：{'、'.join(relevant_regulations)}")

    return "\n".join(answer_parts)


SYSTEM_PROMPT = """你是RegPilot智能法规顾问，专门解答自行车/电助力车/童车出口美国市场的法规合规问题。

你的核心能力：
1. **推理与总结**：基于提供的法规知识库内容，综合分析并给出专业回答，不要简单罗列条款
2. **精确引用**：引用法规条款编号（如§1512.5、CPSIA Section 14等）和具体数值
3. **实用建议**：给出可操作的合规建议，而非泛泛而谈
4. **流程指引**：对认证、出口等流程类问题，给出清晰步骤

回答要求：
- 用中文回答，结构清晰，重点突出
- 先给结论/总结，再展开细节
- 如果知识库中没有直接相关内容，基于你的专业知识给出通用指引，并说明哪些方面需要进一步确认
- 不要说"知识库中没有"，而是主动给出你能提供的最佳建议"""


async def _call_llm(messages: list[ChatMessage], context: str) -> str | None:
    """LLM call — the primary answer engine."""
    try:
        from app.config import settings
        if not settings.LLM_API_KEY:
            return None

        import httpx
        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=5.0, read=60.0, write=5.0, pool=5.0)) as client:
            response = await client.post(
                settings.LLM_API_BASE,
                headers={
                    "Authorization": f"Bearer {settings.LLM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.LLM_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": f"{SYSTEM_PROMPT}\n\n以下是法规知识库的相关内容：\n{context[:8000]}",
                        },
                        *[{"role": m.role, "content": m.content} for m in messages],
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1000,
                },
            )
            data = response.json()
            if "choices" in data and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"]
            return None
    except Exception:
        import traceback
        traceback.print_exc()
        return None


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    user_messages = [m for m in request.messages if m.role == "user"]
    if not user_messages:
        return ChatResponse(reply="请提出您的法规合规问题。", source="local")

    last_query = user_messages[-1].content
    matched_rules = _search_rules(last_query)

    from app.config import settings

    # LLM is the primary answer engine — wait for it
    if settings.LLM_API_KEY:
        context = _build_context(matched_rules)
        import asyncio
        try:
            reply = await asyncio.wait_for(
                _call_llm(request.messages, context),
                timeout=45.0,
            )
            if reply:
                return ChatResponse(reply=reply, source="llm")
        except asyncio.TimeoutError:
            pass
        except Exception:
            pass

    # Fallback to local keyword search only if LLM failed
    return ChatResponse(reply=_format_local_answer(last_query, matched_rules), source="local")
