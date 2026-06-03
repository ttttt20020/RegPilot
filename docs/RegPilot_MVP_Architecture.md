# RegPilot MVP — 项目架构设计

> 技术栈: Next.js 15 + FastAPI + PostgreSQL + OpenAI GPT  
> 日期: 2026-06-01

---

## 1. 项目目录结构

```
RuleMinder/
├── docs/                                    # 产品设计文档
│   ├── RegPilot_PRD.md
│   ├── RegPilot_Regulation_Knowledge_Structure.md
│   └── RegPilot_Rule_Engine_Design.md
│
├── backend/                                 # Python FastAPI
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                          # FastAPI 入口
│   │   ├── config.py                        # 配置管理
│   │   ├── database.py                      # DB 连接
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── router.py                    # 总路由
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── analysis.py              # 分析相关 API
│   │   │   │   └── regulations.py           # 法规查询 API
│   │   │   └── deps.py                      # 依赖注入
│   │   │
│   │   ├── models/                          # SQLAlchemy ORM
│   │   │   ├── __init__.py
│   │   │   ├── analysis.py                  # Analysis 相关模型
│   │   │   └── regulation.py                # Regulation 相关模型
│   │   │
│   │   ├── schemas/                         # Pydantic Schema
│   │   │   ├── __init__.py
│   │   │   ├── bom.py
│   │   │   ├── analysis.py
│   │   │   └── regulation.py
│   │   │
│   │   ├── services/                        # 业务逻辑层
│   │   │   ├── __init__.py
│   │   │   ├── bom_parser.py                # Step 1: BOM 解析
│   │   │   ├── name_normalizer.py           # Step 2: 名称标准化
│   │   │   ├── product_classifier.py        # Step 3: 产品分类
│   │   │   ├── rule_matcher.py              # Step 4: 规则匹配
│   │   │   ├── gap_detector.py              # Step 5: 缺失项检测
│   │   │   ├── risk_scorer.py               # Step 6: 风险评分
│   │   │   ├── report_generator.py          # Step 7: 报告生成
│   │   │   └── analysis_orchestrator.py     # 编排 7 步流水线
│   │   │
│   │   └── llm/
│   │       ├── __init__.py
│   │       └── client.py                    # OpenAI GPT 封装
│   │
│   ├── data/
│   │   ├── rules/                           # 法规规则 JSON 文件
│   │   │   ├── brake.json
│   │   │   ├── reflector.json
│   │   │   ├── chain_guard.json
│   │   │   ├── label.json
│   │   │   ├── battery.json
│   │   │   ├── motor.json
│   │   │   ├── warning.json
│   │   │   ├── chemical.json
│   │   │   ├── testing.json
│   │   │   ├── tracking_label.json
│   │   │   ├── electrical_safety.json
│   │   │   └── bell.json
│   │   │
│   │   └── mappings/                        # 名称映射数据
│   │       ├── component_name_map.json      # 零部件名称映射表
│   │       └── component_taxonomy.json      # 零部件分类体系
│   │
│   ├── migrations/                          # Alembic 迁移
│   │   ├── env.py
│   │   ├── alembic.ini
│   │   └── versions/
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_bom_parser.py
│   │   ├── test_name_normalizer.py
│   │   ├── test_product_classifier.py
│   │   ├── test_rule_matcher.py
│   │   ├── test_gap_detector.py
│   │   ├── test_risk_scorer.py
│   │   └── test_analysis_orchestrator.py
│   │
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                                # Next.js 15
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx                   # 根布局
│   │   │   ├── page.tsx                     # 首页 (上传入口)
│   │   │   ├── analysis/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx             # 分析报告页
│   │   │   └── regulations/
│   │   │       └── page.tsx                 # 法规浏览页
│   │   │
│   │   ├── components/
│   │   │   ├── upload/
│   │   │   │   └── BOMUploader.tsx          # BOM 上传组件
│   │   │   ├── report/
│   │   │   │   ├── ComplianceScoreCard.tsx  # 合规分数卡
│   │   │   │   ├── RiskAssessmentPanel.tsx  # 风险评估面板
│   │   │   │   ├── MissingRequirements.tsx  # 缺失项列表
│   │   │   │   ├── CorrectiveActions.tsx    # 整改建议
│   │   │   │   └── ApplicableRegulations.tsx# 适用法规列表
│   │   │   └── ui/                          # 通用 UI 组件
│   │   │       ├── Badge.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Progress.tsx
│   │   │       ├── Table.tsx
│   │   │       └── Tabs.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                       # API 客户端
│   │   │   └── types.ts                     # TypeScript 类型定义
│   │   │
│   │   └── styles/
│   │       └── globals.css
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── Dockerfile
│
├── docker-compose.yml                       # 本地开发编排
└── .env.example                             # 环境变量模板
```

---

## 2. 数据库 Schema

### 2.1 ER 图

```
┌──────────────────┐       ┌──────────────────────┐
│ analyses         │       │ analysis_components   │
├──────────────────┤       ├──────────────────────┤
│ id (PK)          │──1:N──│ id (PK)              │
│ product_name     │       │ analysis_id (FK)     │
│ product_type     │       │ standard_name        │
│ seat_height_mm   │       │ display_name         │
│ seat_height_low  │       │ category             │
│ is_sidewalk      │       │ sub_category         │
│ has_motor        │       │ original_name        │
│ motor_power_w    │       │ quantity             │
│ has_battery      │       │ material             │
│ brake_type       │       │ specifications (JSON)│
│ gear_type        │       │ norm_confidence      │
│ target_age_group │       └──────────────────────┘
│ has_derailleur   │
│ original_filename│       ┌──────────────────────┐
│ raw_bom_json     │       │ analysis_findings    │
│ status           │──1:N──├──────────────────────┤
│ compliance_score │       │ id (PK)              │
│ risk_score       │       │ analysis_id (FK)     │
│ risk_level       │       │ rule_id              │
│ created_at       │       │ category             │
│ updated_at       │       │ requirement_summary  │
└──────────────────┘       │ regulation_source    │
                           │ mandate              │
                           │ status               │
                           │ confidence           │
                           │ gap_description      │
                           │ risk_level           │
                           │ risk_score           │
                           │ remediation          │
                           │ consequences (JSON)  │
                           └──────────────────────┘
```

### 2.2 SQL DDL

```sql
CREATE TABLE analyses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name    VARCHAR(255),
    product_type    VARCHAR(50) NOT NULL,
    seat_height_mm  NUMERIC(6,1),
    seat_height_lowest_mm NUMERIC(6,1),
    is_sidewalk     BOOLEAN DEFAULT FALSE,
    is_small_sidewalk BOOLEAN DEFAULT FALSE,
    has_motor       BOOLEAN DEFAULT FALSE,
    motor_power_w   NUMERIC(8,1),
    max_speed_mph   NUMERIC(5,1),
    has_battery     BOOLEAN DEFAULT FALSE,
    has_charger     BOOLEAN DEFAULT FALSE,
    brake_type      VARCHAR(20),
    gear_type       VARCHAR(20),
    target_age_group VARCHAR(20),
    has_derailleur  BOOLEAN DEFAULT FALSE,
    original_filename VARCHAR(255),
    raw_bom_json    JSONB,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    compliance_score NUMERIC(5,1),
    risk_score      NUMERIC(5,1),
    risk_level      VARCHAR(20),
    compliance_status VARCHAR(30),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_components (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id     UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    standard_name   VARCHAR(100) NOT NULL,
    display_name    VARCHAR(255),
    category        VARCHAR(50) NOT NULL,
    sub_category    VARCHAR(50),
    original_names  JSONB DEFAULT '[]',
    quantity        INTEGER DEFAULT 1,
    material        VARCHAR(255),
    specifications  JSONB DEFAULT '[]',
    norm_confidence NUMERIC(3,2) DEFAULT 0.0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_findings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id         UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    rule_id             VARCHAR(10) NOT NULL,
    category            VARCHAR(50) NOT NULL,
    requirement_summary TEXT NOT NULL,
    regulation_regulation VARCHAR(50) NOT NULL,
    regulation_section  VARCHAR(50) NOT NULL,
    mandate             VARCHAR(20) NOT NULL,
    status              VARCHAR(20) NOT NULL,
    confidence          VARCHAR(10),
    gap_description     TEXT,
    gap_type            VARCHAR(30),
    risk_level          VARCHAR(10) NOT NULL,
    risk_score          NUMERIC(6,2) DEFAULT 0,
    remediation         TEXT,
    consequences        JSONB DEFAULT '[]',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_product_type ON analyses(product_type);
CREATE INDEX idx_components_analysis ON analysis_components(analysis_id);
CREATE INDEX idx_findings_analysis ON analysis_findings(analysis_id);
CREATE INDEX idx_findings_status ON analysis_findings(status);
CREATE INDEX idx_findings_risk_level ON analysis_findings(risk_level);
```

---

## 3. API 设计

### 3.1 API 总览

| Method | Path | 描述 |
|--------|------|------|
| POST | `/api/v1/analysis/upload` | 上传 BOM 文件并启动分析 |
| GET | `/api/v1/analysis/{id}` | 获取分析结果 |
| GET | `/api/v1/analysis/{id}/findings` | 获取详细发现列表 |
| GET | `/api/v1/analysis` | 列出所有分析记录 |
| GET | `/api/v1/regulations` | 列出法规规则 |
| GET | `/api/v1/regulations/{rule_id}` | 获取单条法规规则详情 |

### 3.2 API 详细设计

#### POST /api/v1/analysis/upload

```
Request:
  Content-Type: multipart/form-data
  Body:
    file: <Excel file (.xlsx/.csv)>

Response 202:
{
  "id": "uuid",
  "status": "processing",
  "message": "BOM file uploaded, analysis started"
}
```

#### GET /api/v1/analysis/{id}

```
Response 200:
{
  "id": "uuid",
  "product_name": "Kids Bicycle Model X",
  "product_type": "Kids Bicycle",
  "product_profile": {
    "seat_height_mm": 580,
    "seat_height_lowest_mm": 480,
    "is_sidewalk": true,
    "is_small_sidewalk": true,
    "has_motor": false,
    "brake_type": "foot",
    "gear_type": "single_speed",
    "target_age_group": "children",
    "has_derailleur": false
  },
  "components": [
    {
      "standard_name": "footbrake",
      "display_name": "Foot Brake",
      "category": "Brake",
      "sub_category": "Footbrake",
      "original_names": ["coaster brake", "倒刹"],
      "quantity": 1,
      "norm_confidence": 0.98
    }
  ],
  "compliance_score": 58.3,
  "compliance_status": "NON_COMPLIANT",
  "risk_score": 72.0,
  "risk_level": "CRITICAL",
  "summary": {
    "total_rules": 22,
    "met_count": 14,
    "not_met_count": 4,
    "partially_met_count": 2,
    "not_assessed_count": 2,
    "exempt_count": 1,
    "critical_issues": 4,
    "major_issues": 2,
    "minor_issues": 0
  },
  "applicable_regulations": [
    {"regulation": "CPSC 1512", "sections": ["§1512.5", "§1512.9", "..."]},
    {"regulation": "CPSIA", "sections": ["§101(a)", "§108", "§14(a)(5)"]}
  ],
  "status": "completed",
  "created_at": "2026-06-01T10:00:00Z",
  "updated_at": "2026-06-01T10:01:30Z"
}
```

#### GET /api/v1/analysis/{id}/findings

```
Query Params:
  status: MET | NOT_MET | PARTIALLY_MET | NOT_ASSESSED | EXEMPT  (optional)
  category: Brake | Reflector | ...  (optional)
  risk_level: Critical | Major | Minor | Info  (optional)
  sort_by: risk_score | category | rule_id  (default: risk_score)
  sort_order: desc | asc  (default: desc)

Response 200:
{
  "total": 22,
  "findings": [
    {
      "rule_id": "CHM-001",
      "category": "Chemical",
      "requirement_summary": "基材铅含量 ≤ 100 ppm",
      "regulation": {
        "regulation": "CPSIA",
        "section": "Section 101(a)"
      },
      "mandate": "Mandatory",
      "status": "NOT_MET",
      "confidence": "HIGH",
      "gap_description": "未找到铅含量测试报告",
      "gap_type": "MISSING_TEST",
      "risk_level": "Critical",
      "risk_score": 11.0,
      "remediation": "将产品送至 CPSC 认可实验室进行铅含量测试",
      "consequences": ["Recall", "CPSC Fine"]
    },
    {
      "rule_id": "BRK-006",
      "category": "Brake",
      "requirement_summary": "人行道自行车不得仅配备手刹",
      "regulation": {
        "regulation": "CPSC 1512",
        "section": "§1512.5(e)(1)"
      },
      "mandate": "Mandatory",
      "status": "MET",
      "confidence": "HIGH",
      "gap_description": null,
      "gap_type": null,
      "risk_level": "Critical",
      "risk_score": 0,
      "remediation": null,
      "consequences": []
    }
  ]
}
```

#### GET /api/v1/regulations

```
Query Params:
  regulation: CPSC 1512 | CPSIA | UL 2849 | UL 2271  (optional)
  category: Brake | Reflector | ...  (optional)
  applicable_product: Bicycle | Kids Bicycle | E-bike  (optional)

Response 200:
{
  "total": 50,
  "rules": [
    {
      "rule_id": "BRK-001",
      "category": "Brake",
      "requirement_summary": "自行车必须配备制动器",
      "regulation": {"regulation": "CPSC 1512", "section": "§1512.5(a)"},
      "mandate": "Mandatory",
      "applicable_products": ["Bicycle", "Kids Bicycle", "E-bike"],
      "risk_level": "Critical"
    }
  ]
}
```

---

## 4. 页面结构

### 4.1 页面列表

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | 首页 | BOM 上传入口 + 历史记录 |
| `/analysis/[id]` | 分析报告页 | 完整合规报告 |
| `/regulations` | 法规浏览页 | 法规规则列表 |

### 4.2 首页 `/`

```
┌──────────────────────────────────────────────────────────┐
│  RegPilot                                    [法规浏览]   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                                                     │ │
│  │     🚲 RegPilot                                     │ │
│  │     AI Product Compliance Copilot                   │ │
│  │                                                     │ │
│  │     ┌─────────────────────────────────────────┐     │ │
│  │     │  📎 拖拽上传 BOM 文件 (.xlsx / .csv)    │     │ │
│  │     │     或点击选择文件                       │     │ │
│  │     └─────────────────────────────────────────┘     │ │
│  │                                                     │ │
│  │     [开始分析]                                       │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  历史分析记录                                              │
│  ┌──────────┬──────────┬──────────┬──────────┬────────┐ │
│  │ 产品名称  │ 产品类型  │ 合规分数  │ 风险等级  │ 时间   │ │
│  ├──────────┼──────────┼──────────┼──────────┼────────┤ │
│  │ Model A  │ Kids Bike│ 58       │ CRITICAL │ 6/1    │ │
│  │ Model B  │ E-bike   │ 82       │ MEDIUM   │ 5/31   │ │
│  └──────────┴──────────┴──────────┴──────────┴────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### 4.3 分析报告页 `/analysis/[id]`

```
┌──────────────────────────────────────────────────────────┐
│  ← 返回    Model A - Kids Bicycle           [导出 PDF]   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │  合规分数         │  │  风险等级                     │  │
│  │     58           │  │     🔴 CRITICAL               │  │
│  │  NON_COMPLIANT   │  │  4 Critical / 2 Major         │  │
│  └─────────────────┘  └──────────────────────────────┘  │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐│
│  │  适用法规: CPSC 1512 | CPSIA                         ││
│  │  适用规则: 22 条 | 已满足: 14 | 未满足: 4 | 待评估: 2 ││
│  └──────────────────────────────────────────────────────┘│
│                                                           │
│  [概览] [缺失项] [风险评估] [整改建议] [法规详情]         │
│  ─────────────────────────────────────────────────────── │
│                                                           │
│  (Tab 内容区)                                             │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

**Tab 1: 概览** — 合规分数卡 + 风险等级 + 统计摘要 + Top 5 风险项

**Tab 2: 缺失项** — 按 gap_type 分组的缺失项列表 (MISSING_COMPONENT / MISSING_TEST / MISSING_LABEL / MISSING_DOCUMENTATION / SPECIFICATION_GAP)

**Tab 3: 风险评估** — 风险条目列表，按 risk_score 降序，每条显示后果类型标签

**Tab 4: 整改建议** — 按 P0/P1/P2 优先级分组的 Action Items，每条含法规引用

**Tab 5: 法规详情** — 所有 22 条适用规则的完整列表，含合规状态

### 4.4 法规浏览页 `/regulations`

```
┌──────────────────────────────────────────────────────────┐
│  ← 返回    法规知识库                                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  筛选: [法规 ▼] [分类 ▼] [产品类型 ▼]                     │
│                                                           │
│  ┌──────────┬────────┬──────────┬──────────┬──────────┐ │
│  │ Rule ID  │ 分类    │ 要求摘要  │ 适用产品  │ 风险等级 │ │
│  ├──────────┼────────┼──────────┼──────────┼──────────┤ │
│  │ BRK-001  │ Brake  │ 必须配备  │ All      │ Critical │ │
│  │          │        │ 制动器    │          │          │ │
│  ├──────────┼────────┼──────────┼──────────┼──────────┤ │
│  │ CHM-001  │ Chem.  │ 铅≤100ppm│ Kids     │ Critical │ │
│  └──────────┴────────┴──────────┴──────────┴──────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```
