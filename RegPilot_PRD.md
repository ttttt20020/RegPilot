# RegPilot — 产品需求文档 (PRD)

> AI Product Compliance Copilot  
> 版本: v1.0 | 日期: 2026-06-01 | 状态: Draft

---

## 1. 产品概述

### 1.1 产品名称

RegPilot

### 1.2 产品定位

AI Product Compliance Copilot — 面向自行车/电助力车产业链的 AI 法规合规副驾驶

### 1.3 一句话描述

用户上传产品技术文档（BOM / Spec Sheet / Product Description），RegPilot 自动识别适用法规、判定合规状态、列出缺失项、评估风险并给出整改建议。

### 1.4 核心价值主张

| 痛点 | RegPilot 解决方案 |
|------|-------------------|
| 法规分散在数百页 PDF 中，人工检索耗时 | AI 自动解析法规，结构化存储，毫秒级检索 |
| 无法快速判断产品是否合规 | 上传文档 → 一键生成合规报告 |
| 不知道缺少哪些部件/测试/标签 | 逐条对照法规要求，列出 Missing Items 清单 |
| 合规风险无法量化 | 风险等级评分 + 风险条目明细 |
| 整改建议依赖外部顾问 | AI 生成 Corrective Actions，附带法规原文引用 |

---

## 2. 目标用户

### 2.1 用户画像

| 编号 | 角色 | 典型场景 | 核心诉求 |
|------|------|----------|----------|
| U1 | 自行车制造商工程师 | 新车型上市前自查合规 | 快速知道哪些部件不合规、需补什么测试 |
| U2 | 电助力车制造商产品经理 | e-bike 出口美国 | 了解 CPSC/CPSIA 对 e-bike 的额外要求 |
| U3 | 外贸公司跟单员 | 客户要求提供合规证明 | 生成合规报告交付客户 |
| U4 | 美国进口商采购经理 | 评估供应商产品合规性 | 快速筛查风险，避免海关扣货/召回 |

### 2.2 用户规模估算

- 全球自行车制造商: ~5,000 家
- 中国出口美国的自行车/电助力车企业: ~800 家
- 美国自行车进口商: ~2,000 家
- TAM 估算: ~8,000 家潜在企业客户

---

## 3. 法规范围

### 3.1 MVP 法规覆盖

| 法规 | 全称 | 覆盖范围 |
|------|------|----------|
| CPSC 1512 | 16 CFR Part 1512 — Requirements for Bicycles | 自行车安全要求（制动、转向、车轮、车架等） |
| CPSIA | Consumer Product Safety Improvement Act | 儿童产品铅含量、邻苯二甲酸盐、追踪标签、第三方测试 |
| ASTM F2273 | Standard Specification for Public Use Playground Equipment for Children 6 Months through 23 Months | （关联儿童产品安全） |
| ASTM F2642 | Standard Specification for Bicycle Rims | 自行车轮圈安全规范 |
| ASTM F2048 | Standard Specification for Bicycle Forks | 自行车前叉安全规范 |
| ASTM F2853 | Standard Specification for Bicycle Frames | 自行车车架安全规范 |
| 16 CFR 1512 | CPSC 自行车法规（同 CPSC 1512） | 制动性能、转向稳定性、反光装置等 |
| 儿童自行车相关 | 16 CFR 1512 + CPSIA Section 101/108 | 儿童自行车额外要求（铅、邻苯、追踪标签） |

### 3.2 法规知识库结构

```
Regulation
├── metadata (法规编号、生效日期、版本)
├── sections
│   ├── section_id
│   ├── title
│   ├── text (原文)
│   └── requirements[]
│       ├── req_id
│       ├── category (component / test / label / documentation)
│       ├── description
│       ├── applicability_condition (产品类型、年龄组等)
│       ├── severity (critical / major / minor)
│       └── reference_links[]
└── amendments[] (修订历史)
```

---

## 4. 核心功能

### 4.1 文档上传与解析

**输入**: 用户上传一个或多个文件

| 支持格式 | 说明 |
|----------|------|
| PDF | BOM / Spec Sheet / 产品说明书 |
| Excel (.xlsx/.csv) | BOM 表格 |
| Word (.docx) | 产品描述文档 |
| 图片 (.png/.jpg) | 产品照片、标签照片 |

**处理流程**:

1. 文件上传 → 存储到用户工作区
2. 文档解析 → 提取结构化产品信息
3. 信息分类 → 归入以下数据模型

**产品数据模型**:

```
ProductProfile
├── basic_info
│   ├── product_name
│   ├── product_type (bicycle / e-bike / children_bicycle / accessory)
│   ├── target_age_group (adult / children_12+ / children_under_12)
│   ├── wheel_size
│   └── intended_use (road / mountain / city / cargo)
├── components[]
│   ├── component_name
│   ├── material
│   ├── specification
│   └── supplier_info
├── tests[]
│   ├── test_name
│   ├── test_standard
│   ├── test_result (pass / fail / not_tested)
│   └── test_lab
├── labels[]
│   ├── label_type
│   ├── content
│   └── location_on_product
└── documentation[]
    ├── doc_type
    └── status (available / missing)
```

### 4.2 法规匹配引擎

**功能**: 根据产品信息自动识别适用的法规条款

**匹配逻辑**:

```
Input: ProductProfile
  ↓
Rule 1: product_type → 确定适用法规集合
  - bicycle → CPSC 1512, ASTM F2642/F2048/F2853
  - e-bike → CPSC 1512 + CPSIA (如涉及儿童)
  - children_bicycle → CPSC 1512 + CPSIA + 16 CFR 1512 儿童条款
  ↓
Rule 2: target_age_group → 筛选 CPSIA 适用性
  - children_under_12 → CPSIA 全部适用 (铅、邻苯、追踪标签、第三方测试)
  - children_12+ → CPSIA 部分适用
  - adult → CPSIA 不适用 (除铅含量通用限制)
  ↓
Rule 3: components → 匹配具体法规条款
  - 有刹车组件 → CPSC 1512.18 (制动要求)
  - 有前叉 → ASTM F2048
  - 有轮圈 → ASTM F2642
  ↓
Output: ApplicableRegulations[]
```

### 4.3 合规分析报告

**输出结构**:

```
ComplianceReport
├── report_id
├── generated_at
├── product_profile (摘要)
├── applicable_regulations[]
│   ├── regulation_id
│   ├── regulation_name
│   └── applicable_sections[]
├── compliance_status
│   ├── overall_score (0-100)
│   ├── status (compliant / partially_compliant / non_compliant)
│   └── summary
├── detailed_findings[]
│   ├── req_id
│   ├── regulation_reference
│   ├── requirement_description
│   ├── current_status (met / not_met / partially_met / not_assessed)
│   ├── evidence (从用户文档中提取的佐证)
│   ├── gap_description
│   └── severity (critical / major / minor)
├── missing_requirements[]
│   ├── category (component / test / label / documentation)
│   ├── description
│   ├── regulation_reference
│   └── priority
├── risk_assessment
│   ├── risk_level (high / medium / low)
│   ├── risk_items[]
│   │   ├── risk_description
│   │   ├── potential_consequence (recall / fine / customs_hold / lawsuit)
│   │   ├── likelihood
│   │   └── impact
│   └── overall_risk_score
└── corrective_actions[]
    ├── action_id
    ├── related_finding
    ├── action_description
    ├── priority (P0 / P1 / P2)
    ├── estimated_effort
    └── regulation_reference
```

### 4.4 报告可视化

- **合规仪表盘**: 总分 + 各维度雷达图
- **合规矩阵**: 法规 × 要求 × 状态 的表格视图
- **风险热力图**: 按严重程度和可能性排列
- **整改清单**: 可排序、可筛选的 Action Items

### 4.5 法规知识库浏览

- 按法规编号浏览
- 全文搜索
- 法规条款关联图（哪些条款影响哪些产品类型）

---

## 5. 用户流程图

### 5.1 核心流程: 合规分析

```
┌─────────────┐
│  用户登录     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 创建新项目    │
│ 填写产品基本信息│
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ 上传产品文档          │
│ (BOM/Spec/Description)│
└──────┬──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ AI 解析文档    │────▶│ 提取产品信息   │
└──────┬───────┘     └──────┬───────┘
       │                     │
       ▼                     ▼
┌──────────────────────────────┐
│ 用户确认/修正提取的产品信息      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────┐
│ 法规匹配引擎   │
│ 识别适用法规   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 合规分析       │
│ 逐条对照检查   │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ 生成合规报告           │
│ (状态/缺失/风险/整改)  │
└──────┬───────────────┘
       │
       ▼
┌───────────────────┐
│ 用户查看报告        │
│ ├ 查看合规仪表盘    │
│ ├ 查看详细发现      │
│ ├ 查看风险热力图    │
│ └ 查看整改清单      │
└──────┬────────────┘
       │
       ▼
┌───────────────┐
│ 导出报告        │
│ (PDF/Excel)    │
└───────────────┘
```

### 5.2 辅助流程: 法规查询

```
┌─────────────┐
│ 进入法规知识库 │
└──────┬──────┘
       │
       ▼
┌────────────────────┐
│ 选择浏览方式         │
│ ├ 按法规编号浏览     │
│ ├ 按产品类型筛选     │
│ ├ 全文关键词搜索     │
│ └ 按要求类别筛选     │
└──────┬─────────────┘
       │
       ▼
┌──────────────┐
│ 查看法规详情   │
│ ├ 条款原文     │
│ ├ 适用条件     │
│ ├ 关联要求     │
│ └ 关联法规     │
└──────────────┘
```

### 5.3 辅助流程: 项目管理

```
┌─────────────┐
│ 我的项目列表  │
└──────┬──────┘
       │
       ├──── 查看项目详情
       │      ├ 产品信息
       │      ├ 上传的文档
       │      └ 历史报告
       │
       ├──── 重新分析 (文档更新后)
       │
       ├──── 对比两次报告
       │
       └──── 归档/删除项目
```

---

## 6. 页面结构

### 6.1 信息架构

```
RegPilot
│
├── /login                    登录页
├── /register                 注册页
│
├── /dashboard                仪表盘首页
│   ├── 最近项目
│   ├── 合规概览统计
│   └── 快速操作入口
│
├── /projects                 项目管理
│   ├── /projects/new         创建新项目
│   ├── /projects/:id         项目详情
│   │   ├── 基本信息
│   │   ├── 上传文档
│   │   ├── 产品信息确认
│   │   └── 报告列表
│   └── /projects/:id/compare 报告对比
│
├── /analysis                 合规分析
│   ├── /analysis/:reportId   分析报告
│   │   ├── 概览 Tab
│   │   │   ├── 合规仪表盘
│   │   │   ├── 风险热力图
│   │   │   └── 整改优先级
│   │   ├── 详细发现 Tab
│   │   │   ├── 按法规分组
│   │   │   └── 按严重程度分组
│   │   ├── 缺失要求 Tab
│   │   │   ├── 按类别筛选
│   │   │   └── 导出清单
│   │   ├── 风险评估 Tab
│   │   │   ├── 风险矩阵
│   │   │   └── 后果分析
│   │   └── 整改建议 Tab
│   │       ├── 按优先级排序
│   │       ├── 标记完成状态
│   │       └── 导出 Action Items
│   └── /analysis/:reportId/export  导出报告
│
├── /regulations              法规知识库
│   ├── /regulations          法规列表
│   ├── /regulations/:id      法规详情
│   │   ├── 条款列表
│   │   ├── 要求矩阵
│   │   └── 关联法规
│   └── /regulations/search   法规搜索
│
├── /settings                 设置
│   ├── 个人信息
│   ├── 团队管理
│   ├── API 密钥
│   └── 订阅计划
│
└── /help                     帮助中心
    ├── 使用指南
    ├── 法规解读
    └── 联系支持
```

### 6.2 页面详细说明

#### P1 — 登录/注册页

- 邮箱 + 密码登录
- Google SSO
- 注册: 邮箱、公司名、角色、产品类型

#### P2 — 仪表盘首页

| 区域 | 内容 |
|------|------|
| 顶部统计卡 | 项目总数 / 合规项目数 / 待整改项 / 高风险项 |
| 最近项目 | 最近 5 个项目卡片，显示产品名、合规分数、最后分析时间 |
| 快速操作 | "新建项目" / "浏览法规" / "查看帮助" |
| 通知区 | 法规更新提醒 / 报告完成通知 |

#### P3 — 创建新项目

| 步骤 | 内容 |
|------|------|
| Step 1 | 填写产品基本信息 (名称、类型、年龄组、轮径、用途) |
| Step 2 | 上传文档 (拖拽上传，支持多文件) |
| Step 3 | AI 解析 → 展示提取结果 → 用户确认/修正 |
| Step 4 | 选择分析范围 (默认自动匹配，可手动勾选法规) |
| Step 5 | 开始分析 → 跳转报告页 |

#### P4 — 分析报告页

**概览 Tab**:
- 合规总分 (大号数字 + 颜色指示)
- 合规状态标签 (Compliant / Partially / Non-compliant)
- 雷达图: 制动系统 / 转向系统 / 车架结构 / 标签标识 / 测试覆盖 / 文档完整性
- 风险等级横条
- Top 5 整改项

**详细发现 Tab**:
- 表格: 法规条款 | 要求描述 | 当前状态 | 严重程度 | 佐证 | Gap 描述
- 筛选: 按法规 / 按状态 / 按严重程度
- 每行可展开查看法规原文引用

**缺失要求 Tab**:
- 分类卡片: 部件缺失 / 测试缺失 / 标签缺失 / 文档缺失
- 每项显示: 描述 + 法规引用 + 优先级

**风险评估 Tab**:
- 风险矩阵 (可能性 × 影响度)
- 风险条目列表: 描述 | 潜在后果 | 可能性 | 影响度 | 风险等级
- 后果类型标签: 召回 / 罚款 / 海关扣留 / 诉讼

**整改建议 Tab**:
- 优先级排序: P0 (Critical) → P1 (Major) → P2 (Minor)
- 每条: 建议描述 + 关联发现 + 法规引用 + 预估工作量
- 可勾选完成状态
- 批量导出为 Excel/CSV

#### P5 — 法规知识库

- 法规列表: 卡片式，显示法规编号、名称、适用产品类型、条款数
- 法规详情: 左侧条款目录 + 右侧内容区
- 搜索: 支持关键词、法规编号、要求类别搜索
- 每条要求标注: 适用产品类型、严重程度、类别标签

---

## 7. MVP 功能定义

### 7.1 MVP 范围 (v0.1)

| 模块 | 功能 | 优先级 |
|------|------|--------|
| 用户系统 | 邮箱注册/登录 | P0 |
| 项目管理 | 创建项目、填写产品信息 | P0 |
| 文档上传 | 上传 PDF/Excel/Word，AI 解析提取产品信息 | P0 |
| 产品信息确认 | 展示提取结果，用户可修正 | P0 |
| 法规匹配 | 根据产品类型自动匹配适用法规 | P0 |
| 合规分析 | 逐条对照检查，生成合规报告 | P0 |
| 报告展示 | 概览 + 详细发现 + 缺失要求 + 风险评估 + 整改建议 | P0 |
| 报告导出 | 导出 PDF 报告 | P1 |
| 法规浏览 | 法规列表 + 详情页 | P1 |
| 仪表盘 | 项目列表 + 统计概览 | P1 |

### 7.2 MVP 不包含

| 功能 | 原因 |
|------|------|
| 团队协作 | 降低 MVP 复杂度 |
| API 接口 | 先验证核心价值 |
| 法规更新推送 | 需要法规监控基础设施 |
| 多语言界面 | 先做英文版 |
| 报告对比 | 非核心路径 |
| 自定义法规集 | 先用预设 |

### 7.3 MVP 技术边界

| 维度 | 约束 |
|------|------|
| 法规范围 | CPSC 1512 + CPSIA + ASTM 自行车法规 + 儿童自行车法规 |
| 产品类型 | 自行车 / 电助力车 / 儿童自行车 |
| 文件大小 | 单文件 ≤ 20MB，单项目 ≤ 100MB |
| 分析速度 | 单次分析 ≤ 3 分钟 |
| 并发 | 支持 10 个同时在线分析 |

### 7.4 MVP 成功指标

| 指标 | 目标 |
|------|------|
| 注册用户 | 上线 3 个月内 200+ |
| 分析报告生成数 | 上线 3 个月内 500+ |
| 报告完成率 (用户从上传到查看报告) | ≥ 70% |
| 用户 NPS | ≥ 40 |
| 付费转化率 | ≥ 5% |

---

## 8. 后续版本规划

### v0.2 — 协作与效率 (上线后 2 个月)

| 功能 | 描述 |
|------|------|
| 团队协作 | 邀请团队成员，角色权限管理 |
| 报告对比 | 同一项目两次分析结果对比 |
| 报告导出增强 | Excel 导出、自定义报告模板 |
| 法规搜索增强 | 语义搜索、按产品类型智能推荐 |
| 邮件通知 | 分析完成通知、法规更新通知 |

### v0.3 — 深度合规 (上线后 4 个月)

| 功能 | 描述 |
|------|------|
| 法规更新监控 | 自动追踪 CPSC/CPSIA 修订，推送变更通知 |
| 合规趋势追踪 | 同一产品多次分析的趋势图 |
| 供应商合规档案 | 管理供应商的合规历史 |
| 儿童产品证书 (CPC) 生成 | 根据 CPSIA 要求自动生成 CPC 模板 |
| 多语言界面 | 中文界面支持 |

### v0.4 — 扩展法规 (上线后 6 个月)

| 功能 | 描述 |
|------|------|
| 欧盟法规 | EN 14764 / EN 14765 / EN 15194 等 |
| 加州法规 | California e-bike 法规 |
| 加拿大法规 | CCPSA 自行车法规 |
| 自定义法规集 | 用户可上传自有法规文档 |
| 法规差异对比 | 同一产品在美国 vs 欧盟的合规差异 |

### v0.5 — 平台化 (上线后 9 个月)

| 功能 | 描述 |
|------|------|
| API 开放 | 供 ERP/PLM 系统集成 |
| 测试实验室对接 | 推荐合规测试实验室 |
| 合规培训模块 | 法规解读视频/课程 |
| 合规社区 | 用户交流、问答 |
| 白标方案 | 为咨询公司提供白标版本 |

### v1.0 — 商业化 (上线后 12 个月)

| 功能 | 描述 |
|------|------|
| 企业版 | SSO、审计日志、SLA |
| 高级分析 | AI 预测法规变化趋势 |
| 行业报告 | 自行车合规年度报告 |
| 合作伙伴生态 | 认证机构、测试实验室、法律顾问 |

---

## 9. 商业模式

### 9.1 定价策略

| 计划 | 价格 | 包含 |
|------|------|------|
| Free | $0/月 | 1 个项目/月，基础报告，法规浏览 |
| Starter | $49/月 | 5 个项目/月，完整报告，PDF 导出 |
| Professional | $149/月 | 无限项目，团队协作 (5 人)，报告对比，CPC 生成 |
| Enterprise | 定制 | SSO，API，无限团队，专属支持，白标 |

### 9.2 收入预测

| 时间 | MRR 目标 |
|------|----------|
| 上线 3 个月 | $5,000 |
| 上线 6 个月 | $20,000 |
| 上线 12 个月 | $80,000 |

---

## 10. 风险与假设

### 10.1 关键假设

| 编号 | 假设 | 验证方式 |
|------|------|----------|
| A1 | 用户愿意上传产品文档到云端 | 用户访谈、注册转化率 |
| A2 | AI 能从非结构化文档中准确提取产品信息 | 解析准确率测试 (目标 ≥ 85%) |
| A3 | 法规条款可被结构化为可检查的规则 | 法规专家验证 |
| A4 | 用户愿意为合规分析付费 | 付费转化率 |

### 10.2 关键风险

| 编号 | 风险 | 影响 | 缓解措施 |
|------|------|------|----------|
| R1 | AI 解析准确率不足 | 报告不可信 | 人工确认环节 + 持续优化解析模型 |
| R2 | 法规理解有误 | 合规判断错误 | 法规专家审核知识库 + 免责声明 |
| R3 | 用户不信任 AI 判断 | 不愿付费 | 提供法规原文引用 + 专家咨询增值服务 |
| R4 | 法规更新不及时 | 分析结果过时 | 建立法规监控机制 + 版本管理 |
| R5 | 数据安全顾虑 | 企业客户流失 | SOC 2 认证 + 数据加密 + NDA |

---

## 11. 非功能性需求

| 维度 | 要求 |
|------|------|
| 性能 | 页面加载 ≤ 2s，分析报告生成 ≤ 3min |
| 可用性 | 99.5% SLA |
| 安全 | HTTPS 全站加密，数据静态加密 (AES-256)，SOC 2 Type II |
| 隐私 | GDPR 合规，数据保留策略，用户数据可删除 |
| 可扩展 | 微服务架构，法规模块可插拔 |
| 国际化 | 界面英文优先，后续支持中文 |

---

## 12. 术语表

| 术语 | 定义 |
|------|------|
| BOM | Bill of Materials，物料清单 |
| Spec Sheet | 规格说明书 |
| CPSC | Consumer Product Safety Commission，美国消费品安全委员会 |
| CPSIA | Consumer Product Safety Improvement Act，消费品安全改进法案 |
| ASTM | American Society for Testing and Materials，美国材料与试验协会 |
| CPC | Children's Product Certificate，儿童产品证书 |
| P0/P1/P2 | 优先级: Critical / Major / Minor |
| MRR | Monthly Recurring Revenue，月度经常性收入 |
| NPS | Net Promoter Score，净推荐值 |
