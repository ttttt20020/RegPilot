# RegPilot Rule Engine — 系统设计文档

> Regulation Rule Engine System Design  
> 版本: v1.0 | 日期: 2026-06-01  
> 依赖: RegPilot_Regulation_Knowledge_Structure.md (50 条规则)

---

## 1. Rule Engine 总体架构

### 1.1 七步流水线

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RegPilot Rule Engine Pipeline                     │
│                                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ Step 1  │  │ Step 2  │  │ Step 3  │  │ Step 4  │  │ Step 5  │     │
│  │ BOM     │→ │ Name    │→ │ Product │→ │ Rule    │→ │ Gap     │     │
│  │ Parse   │  │ Norm    │  │ Classify│  │ Match   │  │ Detect  │     │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘     │
│       │             │            │             │             │           │
│       ▼             ▼            ▼             ▼             ▼           │
│  RawBOM        StandardBOM   ProductProfile  MatchedRules  GapList      │
│                                                                          │
│  ┌─────────┐  ┌─────────┐                                              │
│  │ Step 6  │  │ Step 7  │                                              │
│  │ Risk    │→ │ Report  │                                              │
│  │ Score   │  │ Generate│                                              │
│  └─────────┘  └─────────┘                                              │
│       │             │                                                    │
│       ▼             ▼                                                    │
│  RiskAssessment  ComplianceReport                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 组件职责

| 组件 | 输入 | 输出 | 核心职责 |
|------|------|------|----------|
| BOM Parser | 原始文件 (PDF/Excel/CSV) | RawBOM | 从非结构化文档中提取零部件行项目 |
| Name Normalizer | RawBOM | StandardBOM | 将非标准零部件名称映射到标准术语体系 |
| Product Classifier | StandardBOM | ProductProfile | 识别产品类型、推断关键属性 |
| Rule Matcher | ProductProfile + RuleStore | MatchedRules[] | 匹配适用法规规则 |
| Gap Detector | MatchedRules[] + StandardBOM | GapList[] | 判断缺失项和合规状态 |
| Risk Scorer | GapList[] | RiskAssessment | 计算风险评分 |
| Report Generator | RiskAssessment | ComplianceReport | 生成结构化合规报告 |

### 1.3 数据流全景

```
PDF / Excel / CSV
       │
       ▼
┌──────────────┐
│   BOM Parser  │        ┌──────────────────────────────┐
│               │        │      Component Name Map       │
│  - PDF → 表格 │───────▶│  (标准名称 ↔ 别名映射表)      │
│  - Excel→行   │        │  600+ 条映射规则              │
│  - CSV → 行   │        └──────────────────────────────┘
└──────┬───────┘
       │ RawBOM
       ▼
┌──────────────┐        ┌──────────────────────────────┐
│Name Normalizer│───────▶│   Standard Component Taxonomy │
│               │        │   12 大类 / 80+ 子类          │
└──────┬───────┘        └──────────────────────────────┘
       │ StandardBOM
       ▼
┌──────────────┐        ┌──────────────────────────────┐
│Product        │───────▶│   Product Classification Rules│
│Classifier     │        │   3 类型 + 子类型判定          │
└──────┬───────┘        └──────────────────────────────┘
       │ ProductProfile
       ▼
┌──────────────┐        ┌──────────────────────────────┐
│Rule Matcher   │───────▶│   Rule Store (50 rules)       │
│               │        │   JSON 规则文件               │
└──────┬───────┘        └──────────────────────────────┘
       │ MatchedRules[]
       ▼
┌──────────────┐
│Gap Detector   │        判断每条规则的合规状态
│               │        MET / PARTIALLY_MET / NOT_MET / NOT_ASSESSED
└──────┬───────┘
       │ EvaluatedRules[] + GapList[]
       ▼
┌──────────────┐
│Risk Scorer    │        加权风险评分算法
│               │        Compliance Score 算法
└──────┬───────┘
       │ RiskAssessment + ComplianceScore
       ▼
┌──────────────┐
│Report         │        结构化合规报告
│Generator      │        含整改建议
└──────────────┘
       │
       ▼
ComplianceReport (JSON)
```

---

## 2. BOM 标准数据结构

### 2.1 RawBOM (解析输出)

```
RawBOM {
    source_file: string
    parsed_at: datetime
    line_items: [
        {
            raw_name: string          // 原始名称，如 "V-brake set"
            raw_spec: string          // 原始规格，如 "aluminum, 89mm grip"
            quantity: integer
            material: string | null   // 如 "aluminum alloy"
            supplier: string | null
            part_number: string | null
            unit: string | null       // 如 "set", "pcs"
        }
    ]
    raw_metadata: {
        total_lines: integer
        parse_confidence: float       // 0.0 - 1.0
        warnings: string[]
    }
}
```

### 2.2 StandardBOM (标准化输出)

```
StandardBOM {
    source_file: string
    normalized_at: datetime
    components: [
        {
            standard_name: string         // 标准名称，如 "handbrake_front"
            display_name: string          // 显示名称，如 "Front Handbrake"
            category: string              // 标准大类，如 "Brake"
            sub_category: string          // 标准子类，如 "Handbrake"
            original_names: string[]      // 原始名称列表，如 ["V-brake", "前刹"]
            quantity: integer
            specifications: {
                key: string               // 如 "grip_dimension_mm"
                value: any                // 如 89
                unit: string              // 如 "mm"
                confidence: float         // 0.0 - 1.0
            }[]
            material: string | null
            supplier: string | null
            part_number: string | null
            norm_confidence: float        // 名称标准化置信度 0.0-1.0
        }
    ]
    summary: {
        total_components: integer
        categories_present: string[]      // 如 ["Brake", "Frame", "Wheel"]
        categories_missing: string[]      // 如 ["Reflector", "Battery"]
        norm_coverage: float              // 成功标准化的比例
    }
}
```

### 2.3 零部件标准分类体系 (Component Taxonomy)

```
Bicycle Component Taxonomy
│
├── Brake
│   ├── handbrake_front        前手刹
│   ├── handbrake_rear         后手刹
│   ├── footbrake              脚刹 / 倒刹
│   ├── brake_lever            刹车把手
│   ├── brake_pad              刹车片
│   ├── brake_cable            刹车线
│   └── brake_caliper          刹车卡钳
│
├── Steering
│   ├── handlebar              车把
│   ├── handlebar_stem         车把立管
│   ├── handlebar_grip         把套
│   ├── handlebar_end_plug     把端塞
│   └── headset                转向组件
│
├── Frame
│   ├── frame_main             主车架
│   ├── fork_front             前叉
│   ├── seat_post              座管
│   └── seat                   座椅
│
├── Drivetrain
│   ├── chain                  链条
│   ├── chain_guard            链条防护罩
│   ├── derailleur_front       前变速器
│   ├── derailleur_rear        后变速器
│   ├── derailleur_guard       变速器防护
│   ├── crankset               曲柄
│   ├── pedal                  踏板
│   ├── sprocket_front         前链轮
│   └── sprocket_rear          后链轮
│
├── Wheel
│   ├── wheel_front            前轮
│   ├── wheel_rear             后轮
│   ├── tire_front             前轮胎
│   ├── tire_rear              后轮胎
│   ├── rim_front              前轮圈
│   ├── rim_rear               后轮圈
│   ├── hub_front              前花鼓
│   └── hub_rear               后花鼓
│
├── Reflector
│   ├── reflector_front        前反光片
│   ├── reflector_rear         后反光片
│   ├── reflector_pedal        踏板反光片
│   ├── reflector_spoke        辐条反光片
│   ├── reflective_tire        反光轮胎
│   └── reflective_rim         反光轮圈
│
├── Label
│   ├── label_manufacturer     制造商标签
│   ├── label_stem_mark        立管插入标记
│   ├── label_seatpost_mark    座管插入标记
│   ├── label_no_brakes        "No Brakes" 标签
│   └── label_tracking         追踪标签
│
├── Documentation
│   ├── manual_instruction     使用说明书
│   ├── certificate_cpc        CPC 证书
│   ├── test_report            测试报告
│   └── material_declaration   材料声明
│
├── Electrical (E-bike only)
│   ├── motor                  电机
│   ├── motor_controller       电机控制器
│   ├── battery_pack           电池组
│   ├── bms                    电池管理系统
│   ├── charger                充电器
│   ├── display                显示屏
│   ├── wiring_harness         线束
│   └── speed_sensor           速度传感器
│
├── Bell
│   └── bell                   车铃 / 警示装置
│
└── Accessory
    ├── kickstand              脚撑
    ├── fender                 挡泥板
    ├── basket                 车篮
    └── training_wheels        辅助轮
```

### 2.4 名称标准化映射表 (Name Map 片段)

```
┌──────────────────────────────────────────────────────────────┐
│              Component Name Normalization Map                 │
├──────────────────────┬─────────────────────┬────────────────┤
│ 输入 (原始名称)       │ 输出 (标准名称)      │ 置信度         │
├──────────────────────┼─────────────────────┼────────────────┤
│ "V-brake"            │ handbrake_front      │ 0.95          │
│ "前刹车"              │ handbrake_front      │ 0.95          │
│ "front brake"        │ handbrake_front      │ 0.98          │
│ "caliper brake"      │ handbrake_front      │ 0.85          │
│ "coaster brake"      │ footbrake            │ 0.98          │
│ "倒刹"               │ footbrake            │ 0.95          │
│ "foot brake"         │ footbrake            │ 0.98          │
│ "链罩"               │ chain_guard          │ 0.95          │
│ "chain cover"        │ chain_guard          │ 0.90          │
│ "chain guard"        │ chain_guard          │ 0.98          │
│ "反光片"             │ reflector_spoke      │ 0.70          │
│ "front reflector"    │ reflector_front      │ 0.98          │
│ "前反光片"           │ reflector_front      │ 0.95          │
│ "电池"               │ battery_pack         │ 0.90          │
│ "lithium battery"    │ battery_pack         │ 0.95          │
│ "锂电池组"           │ battery_pack         │ 0.95          │
│ "电机"               │ motor                │ 0.95          │
│ "hub motor"          │ motor                │ 0.95          │
│ "中置电机"           │ motor                │ 0.90          │
│ ... (600+ 条)        │ ...                  │ ...           │
└──────────────────────┴─────────────────────┴────────────────┘

标准化策略:
1. 精确匹配 → 置信度 ≥ 0.95
2. 模糊匹配 (编辑距离/语义相似度) → 置信度 0.70-0.94
3. AI 推断 (LLM 辅助) → 置信度 0.50-0.69
4. 无法识别 → 标记为 "unknown"，置信度 0，保留原始名称
```

---

## 3. Rule Matching 逻辑

### 3.1 三层匹配架构

```
┌─────────────────────────────────────────────────────────┐
│                 Rule Matching - 3 Layers                  │
│                                                           │
│  Layer 1: Product Type Filter (粗筛)                     │
│  ═════════════════════════════════════                    │
│  Input:  ProductProfile.product_type                      │
│  Action: rule.applicable_products ∋ product_type ?        │
│  Result: CandidateRules[] (从 50 条缩小到 ~25-40 条)     │
│                                                           │
│  Layer 2: Trigger Condition Evaluation (精筛)             │
│  ═════════════════════════════════════════                │
│  Input:  ProductProfile 全部字段                          │
│  Action: 逐条评估 rule.trigger_conditions                 │
│  Result: ApplicableRules[] (从 ~35 条缩小到 ~15-25 条)   │
│                                                           │
│  Layer 3: Exemption Override (豁免覆盖)                   │
│  ═════════════════════════════════════                    │
│  Input:  ApplicableRules[] + 豁免规则                     │
│  Action: 豁免规则覆盖通用规则                              │
│  Result: FinalRules[] (最终适用规则集)                     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Layer 1: Product Type Filter

```
Product Type Inheritance Table:

┌───────────────┬───────────────────────────────────────────┐
│ Product Type   │ Includes Rules From                       │
├───────────────┼───────────────────────────────────────────┤
│ Bicycle        │ applicable_products ∋ "Bicycle"           │
│ Kids Bicycle   │ applicable_products ∋ "Bicycle"           │
│                │ applicable_products ∋ "Kids Bicycle"      │
│ E-bike         │ applicable_products ∋ "Bicycle"           │
│                │ applicable_products ∋ "E-bike"            │
│ Kids E-bike    │ applicable_products ∋ "Bicycle"           │
│ (future)       │ applicable_products ∋ "Kids Bicycle"      │
│                │ applicable_products ∋ "E-bike"            │
└───────────────┴───────────────────────────────────────────┘

关键: Kids Bicycle 和 E-bike 继承 Bicycle 的所有规则，
      再叠加各自专属规则。
```

### 3.3 Layer 2: Trigger Condition Evaluation

```
条件评估引擎:

FOR each rule IN CandidateRules:
    conditions = rule.trigger_conditions
    
    IF conditions 为空:
        → 无条件适用，MATCH
        CONTINUE
    
    result_stack = []
    
    FOR i, condition IN enumerate(conditions):
        field_value = resolve_field(condition.field, ProductProfile)
        operator    = condition.operator
        target      = condition.value
        
        eval_result = evaluate(field_value, operator, target)
        result_stack.append(eval_result)
        
        // 提前终止优化
        IF i < len(conditions) - 1:
            next_logic = conditions[i+1].logic  // 默认 AND
            IF next_logic == "AND" AND eval_result == False:
                BREAK  // AND 短路：一个 False 即全 False
            IF next_logic == "OR" AND eval_result == True:
                BREAK  // OR 短路：一个 True 即全 True
    
    // 组合结果
    final = combine_results(result_stack, logic_chain)
    
    IF final == True:
        → rule MATCH, 加入 ApplicableRules
    ELSE:
        → rule SKIP


运算符定义:

┌───────────┬──────────────────────────────────────────┐
│ Operator  │ 语义                                      │
├───────────┼──────────────────────────────────────────┤
│ eq        │ field_value == target                     │
│ neq       │ field_value != target                     │
│ gt        │ field_value > target                      │
│ gte       │ field_value >= target                     │
│ lt        │ field_value < target                      │
│ lte       │ field_value <= target                     │
│ in        │ field_value IN target[]                   │
│ not_in    │ field_value NOT IN target[]               │
│ contains  │ field_value (string/array) contains target│
│ exists    │ field_value is not null/empty             │
│ not_exists│ field_value is null/empty                 │
└───────────┴──────────────────────────────────────────┘


字段路径解析:

resolve_field(path, profile):
    // path 示例: "product.seat_height_mm"
    // path 示例: "product.components[Brake].exists"
    // path 示例: "product.brake_type"
    
    tokens = path.split(".")
    current = profile
    
    FOR token IN tokens:
        IF token contains "[category]":
            // 组件存在性检查
            category = extract_category(token)
            current = any(c.category == category for c in profile.components)
        ELSE:
            current = getattr(current, token)
    
    RETURN current
```

### 3.4 Layer 3: Exemption Override

```
豁免规则优先级:

IF 存在 mandate == "Exemption" 的规则 AND 该规则 MATCH:
    找到该规则的 related_rules (被豁免的规则)
    将被豁免规则从 ApplicableRules 中移除
    将豁免规则标记为 EXEMPT 加入 FinalRules

示例:
  REF-005 (Exemption): sidewalk bicycle 不需要反光装置
  related_rules: [REF-001, REF-002, REF-003, REF-004]
  
  IF product.is_sidewalk_bicycle == true:
    → REF-001, 002, 003, 004 从 ApplicableRules 移除
    → REF-005 标记为 EXEMPT 加入 FinalRules
```

### 3.5 完整匹配示例

**输入**: E-bike, 电机 500W, 锂电池, 座椅最高 780mm, 手刹+脚刹, 变速

```
Layer 1: Product Type Filter
  product_type = "E-bike"
  匹配: applicable_products ∋ "Bicycle" OR "E-bike"
  → 候选规则: 50 条中约 40 条 (排除仅 Kids Bicycle 的规则)

Layer 2: Trigger Condition Evaluation
  ┌─────────┬──────────────────────────────────────────────┬─────────┐
  │ Rule ID │ Trigger Evaluation                           │ Result  │
  ├─────────┼──────────────────────────────────────────────┼─────────┤
  │ BRK-001 │ product_type IN [Bicycle, Kids, E-bike]      │ ✅ MATCH│
  │ BRK-002 │ product.brake_type IN [hand, both]           │ ✅ MATCH│
  │ BRK-003 │ product.brake_type IN [hand, both]           │ ✅ MATCH│
  │ BRK-004 │ product.brake_type IN [hand, both]           │ ✅ MATCH│
  │ BRK-005 │ product.brake_type IN [foot, both]           │ ✅ MATCH│
  │ BRK-006 │ product.is_sidewalk_bicycle == true          │ ❌ SKIP │
  │ REF-001 │ product.is_sidewalk_bicycle != true          │ ✅ MATCH│
  │ REF-002 │ product.is_sidewalk_bicycle != true          │ ✅ MATCH│
  │ REF-003 │ product.is_sidewalk_bicycle != true          │ ✅ MATCH│
  │ REF-004 │ product.is_sidewalk_bicycle != true          │ ✅ MATCH│
  │ REF-005 │ product.is_sidewalk_bicycle == true          │ ❌ SKIP │
  │ CHG-001 │ product.gear_type == "single_speed"          │ ❌ SKIP │
  │ CHG-003 │ product.has_derailleur == true               │ ✅ MATCH│
  │ CHM-001 │ product.target_age_group == "children"       │ ❌ SKIP │
  │ BAT-001 │ product.has_battery == true                  │ ✅ MATCH│
  │ BAT-002 │ product.has_battery == true                  │ ✅ MATCH│
  │ BAT-003 │ product.has_battery == true                  │ ✅ MATCH│
  │ BAT-004 │ product.has_battery == true                  │ ✅ MATCH│
  │ BAT-005 │ product.has_battery == true                  │ ✅ MATCH│
  │ MOT-001 │ product.has_motor == true                    │ ✅ MATCH│
  │ MOT-002 │ product.has_motor == true                    │ ✅ MATCH│
  │ MOT-003 │ product.has_motor == true                    │ ✅ MATCH│
  │ MOT-004 │ product.has_motor == true                    │ ✅ MATCH│
  │ ELS-001 │ product.has_motor == true                    │ ✅ MATCH│
  │ ELS-002 │ product.has_motor == true                    │ ✅ MATCH│
  │ ELS-003 │ product.has_motor == true                    │ ✅ MATCH│
  │ ELS-004 │ product.has_motor == true                    │ ✅ MATCH│
  │ ELS-005 │ product.has_charger == true                  │ ✅ MATCH│
  │ TST-003 │ product.is_sidewalk_bicycle != true          │ ✅ MATCH│
  │ TST-005 │ (all bicycles)                               │ ✅ MATCH│
  │ LBL-001 │ (all bicycles)                               │ ✅ MATCH│
  │ LBL-002 │ (all bicycles, quill stem)                   │ ✅ MATCH│
  │ LBL-003 │ (all bicycles)                               │ ✅ MATCH│
  │ LBL-004 │ (all bicycles)                               │ ✅ MATCH│
  │ WRN-002 │ (all bicycles)                               │ ✅ MATCH│
  │ WRN-003 │ (all bicycles)                               │ ✅ MATCH│
  │ WRN-004 │ (all bicycles)                               │ ✅ MATCH│
  └─────────┴──────────────────────────────────────────────┴─────────┘

Layer 3: Exemption Override
  无豁免规则触发 → FinalRules = ApplicableRules

  最终匹配: 31 条规则
```

---

## 4. Risk Scoring 算法

### 4.1 算法总览

```
Risk Score = Σ(W_category × W_severity × W_status × W_mandate)
             ─────────────────────────────────────────────────
                          N_applicable

其中:
  W_category  = 分类权重 (不同法规分类的风险权重不同)
  W_severity  = 严重程度权重 (Critical/Major/Minor/Info)
  W_status    = 合规状态系数 (NOT_MET/PARTIALLY_MET/NOT_ASSESSED)
  W_mandate   = 强制程度系数 (Mandatory/Optional/Conditional)
  N_applicable = 适用规则总数
```

### 4.2 权重定义

#### W_severity — 严重程度权重

```
┌──────────┬───────┬───────────────────────────────────────────┐
│ Level    │ Weight │ 说明                                      │
├──────────┼───────┼───────────────────────────────────────────┤
│ Critical │  10   │ 可能导致召回、人身伤害、CPSC罚款           │
│ Major    │   6   │ 可能导致海关扣留、亚马逊下架              │
│ Minor    │   3   │ 可能导致补件、标签重做                    │
│ Info     │   1   │ 信息性提示，不直接影响合规                 │
└──────────┴───────┴───────────────────────────────────────────┘
```

#### W_status — 合规状态系数

```
┌────────────────┬──────┬───────────────────────────────────────┐
│ Status          │ Factor│ 说明                                  │
├────────────────┼──────┼───────────────────────────────────────┤
│ NOT_MET         │  1.0 │ 明确不合规，完整风险                   │
│ PARTIALLY_MET   │  0.6 │ 部分合规，风险降低但未消除             │
│ NOT_ASSESSED    │  0.4 │ 无法判定，不确定性风险                 │
│ MET             │  0.0 │ 合规，无风险                          │
│ EXEMPT          │  0.0 │ 豁免，无风险                          │
└────────────────┴──────┴───────────────────────────────────────┘
```

#### W_mandate — 强制程度系数

```
┌────────────┬──────┬───────────────────────────────────────────┐
│ Mandate     │ Factor│ 说明                                      │
├────────────┼──────┼───────────────────────────────────────────┤
│ Mandatory   │  1.0 │ 法规强制要求                              │
│ Conditional │  0.7 │ 条件性要求 (满足条件时强制)               │
│ Optional    │  0.3 │ 推荐但非强制                              │
│ Exemption   │  0.0 │ 豁免项                                    │
└────────────┴──────┴───────────────────────────────────────────┘
```

#### W_category — 分类权重

```
┌────────────────────┬──────┬───────────────────────────────────────┐
│ Category            │ Weight│ 理由                                  │
├────────────────────┼──────┼───────────────────────────────────────┤
│ Brake              │  1.2  │ 制动失效直接威胁生命安全              │
│ Battery            │  1.2  │ 电池起火/爆炸是 CPSC 重点执法领域    │
│ Motor              │  1.1  │ 电机故障可导致失控                    │
│ Electrical Safety  │  1.1  │ 电击/火灾风险                         │
│ Chemical           │  1.1  │ CPSIA 铅/邻苯是 CPSC 优先执法        │
│ Chain Guard        │  1.0  │ 夹伤风险，中等严重                    │
│ Label              │  1.0  │ 标签缺失影响追溯和警告                │
│ Testing            │  1.0  │ 测试缺失影响合规证明                  │
│ Tracking Label     │  1.0  │ 追踪标签是 CPSIA 强制                 │
│ Reflector          │  0.9  │ 夜间安全，非全天候风险                │
│ Warning            │  0.9  │ 警告信息缺失，间接风险                │
│ Bell               │  0.5  │ 联邦不强制，风险最低                  │
└────────────────────┴──────┴───────────────────────────────────────┘
```

### 4.3 单条规则风险分计算

```
rule_risk_score = W_category × W_severity × W_status × W_mandate

最大单条风险分 (理论极值):
  = 1.2 × 10 × 1.0 × 1.0 = 12.0  (Brake/Battery Critical NOT_MET Mandatory)

最小非零风险分:
  = 0.5 × 1 × 0.4 × 0.3 = 0.06   (Bell Info NOT_ASSESSED Optional)
```

### 4.4 总体风险分计算

```
overall_risk_raw = Σ rule_risk_score  (对所有适用规则)

overall_risk_normalized = overall_risk_raw / max_possible_risk × 100

其中 max_possible_risk = Σ (W_category_i × 10 × 1.0 × 1.0)
                        = 对所有适用规则取 Critical + NOT_MET + Mandatory 的理论最大值

overall_risk_score = min(overall_risk_normalized, 100)
```

**设计理由**: 归一化到 0-100 使得不同产品类型 (适用规则数不同) 的风险分具有可比性。

### 4.5 风险等级判定

```
┌───────────────┬───────────────┬──────────────────────────────────┐
│ Risk Level     │ Score Range   │ 含义                              │
├───────────────┼───────────────┼──────────────────────────────────┤
│ CRITICAL       │ 60 - 100      │ 存在 Critical NOT_MET 项，        │
│                │               │ 产品不可上市，需立即整改           │
│ HIGH           │ 40 - 59       │ 存在多个 Major NOT_MET 项，       │
│                │               │ 高概率被海关扣留或平台下架         │
│ MEDIUM         │ 20 - 39       │ 存在部分 Minor/NOT_ASSESSED 项，   │
│                │               │ 需补充测试或文件                   │
│ LOW            │ 1 - 19        │ 仅有少量 Info/Optional 项未满足，  │
│                │               │ 不影响上市                         │
│ NONE           │ 0             │ 所有适用规则 MET 或 EXEMPT         │
└───────────────┴───────────────┴──────────────────────────────────┘

快速判定规则 (优先级高于分数):
  IF 任何 Critical 规则 NOT_MET → 风险等级 = CRITICAL
  IF 任何 Critical 规则 NOT_ASSESSED → 风险等级 ≥ HIGH
```

### 4.6 风险分计算示例

**产品**: E-bike, 500W 电机, 锂电池, 手刹+脚刹, 座椅 780mm

```
适用规则 31 条，假设评估结果如下:

NOT_MET (5 条):
  BAT-001: Battery × Critical × 1.0 × Mandatory = 1.2 × 10 × 1.0 × 1.0 = 12.0
  BAT-002: Battery × Critical × 1.0 × Mandatory = 1.2 × 10 × 1.0 × 1.0 = 12.0
  ELS-004: ElecSafety × Critical × 1.0 × Mandatory = 1.1 × 10 × 1.0 × 1.0 = 11.0
  ELS-005: ElecSafety × Critical × 1.0 × Mandatory = 1.1 × 10 × 1.0 × 1.0 = 11.0
  MOT-003: Motor × Critical × 1.0 × Mandatory = 1.1 × 10 × 1.0 × 1.0 = 11.0

PARTIALLY_MET (3 条):
  BAT-004: Battery × Critical × 0.6 × Mandatory = 1.2 × 10 × 0.6 × 1.0 = 7.2
  ELS-003: ElecSafety × Major × 0.6 × Mandatory = 1.1 × 6 × 0.6 × 1.0 = 3.96
  REF-003: Reflector × Minor × 0.6 × Mandatory = 0.9 × 3 × 0.6 × 1.0 = 1.62

NOT_ASSESSED (4 条):
  BAT-005: Battery × Critical × 0.4 × Mandatory = 1.2 × 10 × 0.4 × 1.0 = 4.8
  MOT-001: Motor × Critical × 0.4 × Mandatory = 1.1 × 10 × 0.4 × 1.0 = 4.4
  MOT-002: Motor × Critical × 0.4 × Mandatory = 1.1 × 10 × 0.4 × 1.0 = 4.4
  TST-003: Testing × Major × 0.4 × Mandatory = 1.0 × 6 × 0.4 × 1.0 = 2.4

MET (19 条): risk = 0

────────────────────────────────────────
overall_risk_raw = 12+12+11+11+11+7.2+3.96+1.62+4.8+4.4+4.4+2.4
                 = 85.78

max_possible_risk = Σ(31 条规则的 W_cat × 10 × 1.0 × 1.0)
                  ≈ 31 × 10 × 1.0 (简化估算)
                  = 310.0 (实际需逐条计算)

实际 max_possible_risk (逐条):
  Brake(5条): 1.2×10 + 1.2×10 + 1.2×6 + 1.2×6 + 1.0×10 = 58.0
  Reflector(4条): 0.9×6 + 0.9×6 + 0.9×3 + 0.9×3 = 16.2
  ChainGuard(1条): 1.0×6 = 6.0
  Label(4条): 1.0×6 + 1.0×6 + 1.0×6 + 1.0×6 = 24.0
  Battery(5条): 1.2×10×5 = 60.0
  Motor(4条): 1.1×10×4 = 44.0
  ElecSafety(5条): 1.1×10×4 + 1.1×6 = 50.6
  Testing(2条): 1.0×6 + 1.0×10 = 16.0
  Warning(3条): 0.9×6 + 0.9×3 + 0.9×3 = 10.8
  ────────────────────────────────────────
  max_possible_risk = 285.6

overall_risk_normalized = 85.78 / 285.6 × 100 = 30.0

→ 风险等级: MEDIUM

但快速判定: 存在 Critical NOT_MET (BAT-001, BAT-002, ELS-004, ELS-005, MOT-003)
→ 风险等级提升为: CRITICAL

最终: CRITICAL (30.0 分，但因 Critical NOT_MET 触发快速判定)
```

---

## 5. Compliance Score 算法

### 5.1 设计原则

```
Compliance Score ≠ 100 - Risk Score

原因:
  Risk Score 是加权风险分，反映"不合规的严重程度"
  Compliance Score 是合规完成度，反映"合规工作的完成比例"

两者相关但不同:
  - 一个产品可能有很多 Minor NOT_MET → Risk 低但 Compliance 也低
  - 一个产品可能只有一个 Critical NOT_MET → Risk 高但 Compliance 接近完成
```

### 5.2 Compliance Score 计算

```
Compliance Score = Σ(W_rule_i × compliance_ratio_i) / Σ(W_rule_i) × 100

其中:
  W_rule_i = 规则权重 = W_severity × W_mandate
  compliance_ratio_i = 合规比例

  ┌──────────────────┬───────────────────┐
  │ Status            │ compliance_ratio  │
  ├──────────────────┼───────────────────┤
  │ MET              │ 1.0               │
  │ EXEMPT           │ 1.0               │
  │ PARTIALLY_MET    │ 0.5               │
  │ NOT_ASSESSED     │ 0.0               │
  │ NOT_MET          │ 0.0               │
  └──────────────────┴───────────────────┘
```

### 5.3 Compliance Status 判定

```
┌──────────────────────┬───────────────────┬──────────────────────────┐
│ Status                │ Score Range        │ 含义                     │
├──────────────────────┼───────────────────┼──────────────────────────┤
│ COMPLIANT             │ 90 - 100          │ 产品基本合规，可上市销售  │
│ PARTIALLY_COMPLIANT   │ 60 - 89           │ 部分合规，需补充测试/文件│
│ NON_COMPLIANT         │ 0 - 59            │ 不合规，需整改后重新评估  │
└──────────────────────┴───────────────────┴──────────────────────────┘

快速判定规则:
  IF 任何 Critical 规则 NOT_MET → Status = NON_COMPLIANT (无论分数)
  IF 任何 Mandatory 规则 NOT_MET 且数量 ≥ 3 → Status ≤ PARTIALLY_COMPLIANT
```

### 5.4 分维度 Compliance Score

```
除总体 Compliance Score 外，按分类计算维度分数:

category_compliance[category] = 
    Σ(W_rule_i × compliance_ratio_i) / Σ(W_rule_i) × 100
    (仅统计该分类下的规则)

12 个维度:
  ├── Brake Compliance
  ├── Reflector Compliance
  ├── Bell Compliance
  ├── Chain Guard Compliance
  ├── Label Compliance
  ├── Battery Compliance
  ├── Motor Compliance
  ├── Warning Compliance
  ├── Chemical Compliance
  ├── Testing Compliance
  ├── Tracking Label Compliance
  └── Electrical Safety Compliance

可视化: 雷达图 (12 轴)
```

### 5.5 Compliance Score 示例

**产品**: Kids Bicycle, 座椅 580mm, 单速, 脚刹, 无手刹

```
适用规则 22 条:

MET (14 条):
  BRK-006, CHG-001, LBL-001, LBL-002, LBL-003, LBL-004,
  REF-005(EXEMPT), WRN-002, WRN-003, WRN-004,
  TST-004, TST-005, TRK-001, TRK-002

NOT_MET (4 条):
  CHM-001 (Critical, Mandatory): W=10×1.0=10, ratio=0
  CHM-002 (Critical, Mandatory): W=10×1.0=10, ratio=0
  CHM-003 (Critical, Mandatory): W=10×1.0=10, ratio=0
  TST-001 (Critical, Mandatory): W=10×1.0=10, ratio=0

NOT_ASSESSED (2 条):
  CHM-004 (Critical, Mandatory): W=10×1.0=10, ratio=0
  TST-002 (Critical, Mandatory): W=10×1.0=10, ratio=0

PARTIALLY_MET (2 条):
  BRK-001 (Critical, Mandatory): W=10×1.0=10, ratio=0.5
  CHG-002 (Major, Mandatory): W=6×1.0=6, ratio=0.5

────────────────────────────────────────
Σ(W_rule_i × compliance_ratio_i):
  MET:     14 条 × 各自 W × 1.0
  NOT_MET: 4 × 10 × 0 = 0
  NOT_ASSESSED: 2 × 10 × 0 = 0
  PARTIALLY: 10×0.5 + 6×0.5 = 8

  = (14 条 MET 的 W 之和) + 0 + 0 + 8
  = (10+10+6+6+6+6+3+3+3+6+10+6+6+6) + 8
  = 87 + 8 = 95

Σ(W_rule_i):
  = 87 + 40 + 20 + 16 = 163

Compliance Score = 95 / 163 × 100 = 58.3

快速判定: 存在 Critical NOT_MET (CHM-001, 002, 003, TST-001)
→ Compliance Status = NON_COMPLIANT

维度分数:
  Chemical Compliance = 0 / 30 × 100 = 0%
  Testing Compliance  = 0 / 26 × 100 = 0%  (TST-001 NOT_MET, TST-002 NOT_ASSESSED)
  Brake Compliance    = (10×0.5 + 10×1.0) / (10+10) × 100 = 75%
  Label Compliance    = 24 / 24 × 100 = 100%
  Chain Guard Compliance = (6×0.5 + 6×1.0) / (6+6) × 100 = 75%
```

---

## 6. Step 1-7 完整流程设计

### Step 1: BOM 解析

```
输入: PDF / Excel / CSV / Word / Image
输出: RawBOM

处理逻辑:
┌─────────────────────────────────────────────────────────┐
│ 1. 文件类型识别                                          │
│    PDF → PyMuPDF 提取表格                               │
│    Excel → openpyxl 读取 sheet                          │
│    CSV → pandas 读取                                    │
│    Word → python-docx 提取表格                          │
│    Image → OCR (Tesseract/PaddleOCR) + 表格识别          │
│                                                          │
│ 2. 表格定位                                              │
│    识别 BOM 表格区域 (表头关键词: Part, Component,       │
│    Item, Description, Qty, Material, Spec)               │
│                                                          │
│ 3. 行项目提取                                            │
│    每行 → RawBOM.line_item                               │
│    字段映射: 表头列名 → line_item 字段                    │
│                                                          │
│ 4. 置信度标注                                            │
│    每个提取字段标注 parse_confidence                      │
│    低于 0.7 的字段标记为需人工确认                        │
└─────────────────────────────────────────────────────────┘
```

### Step 2: 零部件名称标准化

```
输入: RawBOM
输出: StandardBOM

处理逻辑:
┌─────────────────────────────────────────────────────────┐
│ 对每个 RawBOM.line_item:                                 │
│                                                          │
│ 1. 精确匹配                                              │
│    raw_name → Name Map 精确查找                          │
│    IF found → standard_name, confidence ≥ 0.95          │
│                                                          │
│ 2. 模糊匹配 (精确匹配失败时)                              │
│    计算 raw_name 与 Name Map 所有键的相似度               │
│    方法: 编辑距离 + Jaccard + 语义嵌入 (embedding)        │
│    取 top-1, IF similarity ≥ 0.80 → 匹配                │
│    IF 0.60 ≤ similarity < 0.80 → 候选，需确认           │
│    IF similarity < 0.60 → 标记 unknown                  │
│                                                          │
│ 3. AI 辅助匹配 (模糊匹配失败时)                           │
│    构造 prompt: "将以下自行车零部件名称映射到标准术语"     │
│    LLM 返回 standard_name + confidence                   │
│    IF confidence ≥ 0.70 → 采用                           │
│    ELSE → 标记 unknown                                   │
│                                                          │
│ 4. 规格提取                                              │
│    从 raw_spec 中提取关键参数                             │
│    如 "89mm grip" → {key: "grip_dimension_mm", value: 89}│
│    使用正则 + LLM 辅助                                    │
│                                                          │
│ 5. 分类归属                                              │
│    standard_name → Taxonomy 查找 category + sub_category │
│                                                          │
│ 6. 未识别项处理                                          │
│    标记为 "unknown"，保留原始名称                         │
│    在后续步骤中作为潜在缺失项的线索                       │
└─────────────────────────────────────────────────────────┘
```

### Step 3: 产品类型识别

```
输入: StandardBOM
输出: ProductProfile

处理逻辑:
┌─────────────────────────────────────────────────────────┐
│ 1. 从 BOM 组件推断产品属性                               │
│                                                          │
│    has_motor = "motor" IN StandardBOM.components          │
│    has_battery = "battery_pack" IN components             │
│    has_charger = "charger" IN components                  │
│    has_derailleur = "derailleur_*" IN components          │
│    brake_type = infer_from_components():                  │
│      IF handbrake_front/rear EXISTS AND footbrake EXISTS  │
│        → "both"                                          │
│      ELIF handbrake_* EXISTS                             │
│        → "hand"                                          │
│      ELIF footbrake EXISTS                               │
│        → "foot"                                          │
│      ELSE                                                │
│        → "none"                                          │
│    gear_type =                                           │
│      IF has_derailleur → "multi"                         │
│      ELIF single sprocket → "single_speed"               │
│      ELSE → "unknown"                                    │
│                                                          │
│ 2. 从规格参数推断                                        │
│                                                          │
│    motor_power_w =                                       │
│      components[motor].specifications["power_w"]          │
│    max_speed_mph =                                       │
│      components[motor].specifications["max_speed_mph"]    │
│    seat_height_mm =                                      │
│      从 Spec Sheet 提取 (或从车轮尺寸推断)                │
│    seat_height_lowest_mm =                               │
│      从 Spec Sheet 提取                                   │
│                                                          │
│ 3. 从产品描述推断                                        │
│                                                          │
│    target_age_group =                                    │
│      IF description contains "children/kids/儿童"         │
│        → "children"                                      │
│      ELSE → "adult"                                      │
│                                                          │
│ 4. 产品类型判定                                          │
│                                                          │
│    IF has_motor == true:                                 │
│      IF target_age_group == "children":                  │
│        → "Kids E-bike" (future)                          │
│      ELSE:                                               │
│        → "E-bike"                                        │
│    ELIF target_age_group == "children"                   │
│         OR seat_height_mm ≤ 635:                         │
│      → "Kids Bicycle"                                    │
│    ELSE:                                                 │
│      → "Bicycle"                                        │
│                                                          │
│ 5. 子类型标记                                            │
│                                                          │
│    is_sidewalk_bicycle = (seat_height_mm ≤ 635)          │
│    is_small_sidewalk = (seat_height_lowest_mm < 560)     │
│                                                          │
│ 6. 缺失属性推断                                          │
│                                                          │
│    IF seat_height_mm 未知:                               │
│      从 wheel_size 推算 (如 12" wheel → ~500mm seat)     │
│      标记 confidence = "INFERRED"                         │
│                                                          │
│ 7. 输出 ProductProfile                                   │
│    所有字段 + 各字段的 confidence 标注                    │
└─────────────────────────────────────────────────────────┘
```

### Step 4: 法规规则匹配

```
输入: ProductProfile + RuleStore (50 条)
输出: MatchedRules[]

处理逻辑: 见第 3 节 Rule Matching 逻辑
```

### Step 5: 缺失项判断

```
输入: MatchedRules[] + StandardBOM + ProductProfile
输出: EvaluatedRules[] + GapList[]

处理逻辑:
┌─────────────────────────────────────────────────────────┐
│ 对每条 MatchedRule:                                      │
│                                                          │
│ 1. 证据收集                                              │
│    FOR each evidence_req IN rule.evidence_required:       │
│                                                          │
│      SWITCH evidence_req.evidence_type:                  │
│                                                          │
│        CASE "bom_component":                             │
│          搜索 StandardBOM.components                     │
│          匹配条件: component.sub_category ==              │
│            evidence_req.source_path 对应的子类            │
│          结果: found (True/False) + component 详情       │
│                                                          │
│        CASE "spec_sheet_value":                          │
│          搜索 ProductProfile 中对应字段                  │
│          匹配条件: field exists AND value valid           │
│          结果: found + value + confidence                │
│                                                          │
│        CASE "test_report":                               │
│          搜索 ProductProfile.tests[]                     │
│          匹配条件: test_name matches AND result exists    │
│          结果: found + test_result (pass/fail/not_tested) │
│                                                          │
│        CASE "label_photo":                               │
│          搜索 ProductProfile.labels[]                    │
│          匹配条件: label_type matches                     │
│          结果: found + label_content                     │
│                                                          │
│        CASE "manual_document":                           │
│          搜索 ProductProfile.documentation[]             │
│          匹配条件: doc_type == "manual"                   │
│          结果: found + doc_status                        │
│                                                          │
│        CASE "certificate":                               │
│          搜索 ProductProfile.documentation[]             │
│          匹配条件: doc_type == "CPC"                      │
│          结果: found + cert_details                      │
│                                                          │
│ 2. 综合判定                                              │
│    evidence_count = len(evidence_results)                 │
│    met_count = count(found == True)                      │
│                                                          │
│    IF met_count == evidence_count:                       │
│      → status = "MET"                                    │
│      → confidence = "HIGH"                               │
│                                                          │
│    ELIF met_count > 0 AND met_count < evidence_count:    │
│      → status = "PARTIALLY_MET"                          │
│      → confidence = "MEDIUM"                             │
│      → gap = 未满足的 evidence 描述                      │
│                                                          │
│    ELIF met_count == 0 AND 有相关文档但未覆盖:           │
│      → status = "NOT_ASSESSED"                           │
│      → confidence = "LOW"                                │
│      → gap = "无法从提供的文档中判定"                    │
│                                                          │
│    ELSE:                                                 │
│      → status = "NOT_MET"                                │
│      → confidence = "HIGH" (确定不合规)                  │
│      → gap = rule.requirement_summary                    │
│                                                          │
│ 3. Gap 描述生成                                          │
│    IF status != "MET":                                   │
│      gap_item = {                                        │
│        rule_id: rule.rule_id,                            │
│        category: rule.category,                          │
│        gap_type: infer_gap_type(rule),                   │
│        description: generate_gap_description(             │
│            rule, missing_evidence),                      │
│        regulation_reference: rule.regulation_source,     │
│        risk_level: rule.risk_level,                      │
│        remediation: rule.remediation                     │
│      }                                                   │
│                                                          │
│ gap_type 推断:                                           │
│   IF evidence_type == "bom_component"                    │
│     → "MISSING_COMPONENT"                                │
│   IF evidence_type == "test_report"                      │
│     → "MISSING_TEST"                                     │
│   IF evidence_type == "label_photo"                      │
│     → "MISSING_LABEL"                                    │
│   IF evidence_type == "certificate"                      │
│     → "MISSING_DOCUMENTATION"                            │
│   IF evidence_type == "spec_sheet_value"                 │
│     → "SPECIFICATION_GAP"                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Step 6: 风险评分

```
输入: EvaluatedRules[]
输出: RiskAssessment

处理逻辑: 见第 4 节 Risk Scoring 算法

输出结构:
┌─────────────────────────────────────────────────────────┐
│ RiskAssessment {                                         │
│   overall_risk_score: float (0-100)                      │
│   risk_level: CRITICAL | HIGH | MEDIUM | LOW | NONE     │
│   risk_items: [                                          │
│     {                                                    │
│       rule_id: string                                    │
│       risk_score: float                                  │
│       risk_contribution_pct: float (% of total risk)     │
│       consequence_type: Recall | Fine | Customs | ...    │
│       consequence_description: string                    │
│     }                                                    │
│   ]                                                      │
│   risk_by_category: {                                    │
│     category: { score: float, level: string }            │
│   }                                                      │
│   top_risks: [ top 5 risk_items by score ]               │
│ }                                                        │
└─────────────────────────────────────────────────────────┘
```

### Step 7: 整改建议生成

```
输入: EvaluatedRules[] + RiskAssessment
输出: ComplianceReport

处理逻辑:
┌─────────────────────────────────────────────────────────┐
│ 1. 筛选需要整改的规则                                    │
│    actionable_rules = filter(                             │
│        status IN [NOT_MET, PARTIALLY_MET, NOT_ASSESSED]  │
│    )                                                     │
│                                                          │
│ 2. 按优先级排序                                          │
│    sort by: risk_score DESC                              │
│    同分时: Critical > Major > Minor > Info               │
│                                                          │
│ 3. 生成整改建议                                          │
│    FOR each actionable_rule:                              │
│      action = {                                          │
│        priority: P0 | P1 | P2,                           │
│        rule_id: string,                                  │
│        issue: gap_description,                           │
│        action: rule.remediation,                         │
│        regulation_reference: rule.regulation_source,     │
│        estimated_effort: estimate_effort(rule),          │
│        related_components: identify_affected_components() │
│      }                                                   │
│                                                          │
│    priority 判定:                                        │
│      P0: Critical NOT_MET → 立即整改，产品不可上市       │
│      P1: Major NOT_MET / Critical NOT_ASSESSED           │
│          → 尽快整改或补充测试                            │
│      P2: Minor NOT_MET / Major NOT_ASSESSED              │
│          → 计划整改                                      │
│                                                          │
│    estimated_effort 判定:                                │
│      MISSING_COMPONENT → "High" (需重新设计/采购)        │
│      MISSING_TEST → "Medium" (需送测，1-2周)             │
│      MISSING_LABEL → "Low" (标签重做，1-3天)             │
│      MISSING_DOCUMENTATION → "Low" (文件补充)            │
│      SPECIFICATION_GAP → "Medium" (需验证/修改规格)      │
│                                                          │
│ 4. 组装 ComplianceReport                                 │
│                                                          │
│    ComplianceReport {                                    │
│      report_id: uuid,                                    │
│      generated_at: datetime,                             │
│      product_profile: ProductProfile,                    │
│      applicable_regulations: Regulation[],               │
│      compliance_score: float (0-100),                    │
│      compliance_status: COMPLIANT | PARTIALLY | NON,     │
│      risk_assessment: RiskAssessment,                    │
│      findings: EvaluatedRule[],                          │
│      gaps: GapList[],                                    │
│      corrective_actions: Action[],                       │
│      summary: {                                          │
│        total_rules: int,                                 │
│        met_count: int,                                   │
│        not_met_count: int,                               │
│        partially_met_count: int,                         │
│        not_assessed_count: int,                          │
│        exempt_count: int,                                │
│        critical_issues: int,                             │
│        major_issues: int,                                │
│        minor_issues: int                                 │
│      }                                                   │
│    }                                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 7. 设计决策记录

| 编号 | 决策 | 理由 | 替代方案 |
|------|------|------|----------|
| D1 | Risk Score 归一化到 0-100 | 不同产品类型适用规则数不同，归一化使分数可比 | 绝对分数 (简单但不可比) |
| D2 | Critical NOT_MET 快速判定覆盖分数 | 一个 Critical 缺陷即应阻止上市，不应被其他 MET 项稀释 | 纯分数判定 (可能掩盖 Critical 项) |
| D3 | Compliance Score 和 Risk Score 分离 | 完成度和严重度是不同维度 | 合并为单一分数 (信息损失) |
| D4 | NOT_ASSESSED 给予 0.4 系数而非 0 | 未知不等同于合规，保守策略 | 0 系数 (过于宽松) |
| D5 | 分类权重 W_category | 制动和电池失效的后果远重于标签缺失 | 统一权重 (忽略风险差异) |
| D6 | 名称标准化三级策略 (精确→模糊→AI) | 平衡速度和准确度，减少 LLM 调用成本 | 全部用 LLM (成本高，速度慢) |
| D7 | 产品类型继承 | E-bike 继承 Bicycle 规则，避免规则重复定义 | 每种产品独立规则集 (维护成本高) |
| D8 | 豁免规则覆盖通用规则 | sidewalk bicycle 豁免反光装置，需显式移除 | 通用规则内嵌条件 (逻辑复杂) |
