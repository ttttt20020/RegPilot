from __future__ import annotations

from app.schemas.analysis import BOMComponent, Finding, ProductProfile, RegulationSource
from app.schemas.regulation import RegulationRuleDetail

ASSESSED = "ASSESSED"
NOT_ASSESSED = "NOT_ASSESSED"
FAILED = "FAILED"

CATEGORY_TO_STANDARD_NAMES = {
    "Brake": {"handbrake_front", "handbrake_rear", "footbrake", "brake_lever", "brake_pad", "brake_cable", "brake_disc", "brake_caliper", "ebrake_lever"},
    "Reflector": {"reflector_front", "reflector_rear", "reflector_pedal", "reflector_spoke"},
    "Chain Guard": {"chain_guard"},
    "Bell": {"bell"},
    "Electrical": {"motor", "motor_controller", "battery_pack", "bms", "charger", "display", "speed_sensor", "throttle", "light_front", "ebrake_lever", "wire_harness"},
    "Label": {"label", "warning_label", "tracking_label", "manual"},
    "Drivetrain": {"chain", "crankset", "pedal", "derailleur_rear", "shifter", "freewheel", "bottom_bracket", "chainring"},
    "Steering": {"handlebar", "handlebar_stem", "handlebar_grip", "headset"},
    "Frame": {"frame_main", "fork_front", "seat_post", "seat", "seat_clamp"},
    "Wheel": {"wheel_front", "wheel_rear", "tire_front", "tire_rear", "hub_front", "hub_rear", "rim", "spoke", "inner_tube", "rim_tape"},
    "Accessory": {"kickstand", "fender", "rack", "mudguard_stay", "tool_kit"},
}

SOURCE_PATH_TO_CATEGORY = {
    "product.brake_type": "Brake",
    "product.components": None,
    "product.has_battery": "Electrical",
    "product.has_motor": "Electrical",
    "product.bms_protection": "Electrical",
    "product.battery_temperature_records": "Electrical",
    "product.battery_cell_count": "Electrical",
    "product.motor_power_w": "Electrical",
    "product.max_speed_mph": "Electrical",
    "product.reflector_rear_position_mm": "Reflector",
    "product.seat_height_mm": "Frame",
    "product.is_sidewalk_bicycle": "Frame",
    "product.has_chain_guard": "Chain Guard",
    "product.tests": None,
}

CATEGORY_CN = {
    "Brake": "制动系统", "Battery": "电池", "Motor": "电机", "Electrical Safety": "电气安全",
    "Chemical": "化学物质", "Chain Guard": "链罩", "Label": "标签", "Testing": "测试",
    "Tracking Label": "追踪标签", "Reflector": "反光片", "Warning": "警告", "Bell": "车铃",
}

VERIFICATION_TYPE_CN = {
    "test_report": "测试报告",
    "label_photo": "标签照片",
    "product_photo": "产品照片",
    "packaging_photo": "包装照片",
    "manual_document": "说明书文档",
    "certificate": "认证证书",
    "material_declaration": "材质声明",
    "drawing": "图纸",
}


def _ev_get(ev: object, key: str, default: str = "") -> str:
    if isinstance(ev, dict):
        return ev.get(key, default)
    return getattr(ev, key, default)


def detect_gaps(
    matched_rules: list[RegulationRuleDetail],
    components: list[BOMComponent],
    profile: ProductProfile,
) -> list[Finding]:
    component_names = {c.standard_name for c in components}
    component_categories = {c.category for c in components}
    component_map: dict[str, BOMComponent] = {}
    for c in components:
        component_map[c.standard_name] = c

    findings = []

    for rule in matched_rules:
        if rule.mandate == "Exemption":
            findings.append(_make_finding(rule, "EXEMPT", "HIGH", None, None, []))
            continue

        evidence_results = []
        pending_verifs = []
        for ev in rule.evidence_required:
            result, verif = _check_evidence(ev, component_names, component_categories, component_map, profile)
            evidence_results.append(result)
            if verif:
                pending_verifs.append(verif)

        status, confidence, gap_desc, gap_type = _determine_status(evidence_results, pending_verifs, rule)

        findings.append(_make_finding(rule, status, confidence, gap_desc, gap_type, pending_verifs))

    return findings


def _check_evidence(
    ev: object,
    component_names: set[str],
    component_categories: set[str],
    component_map: dict[str, BOMComponent],
    profile: ProductProfile,
) -> tuple[str, str | None]:
    ev_type = _ev_get(ev, "evidence_type")
    source_path = _ev_get(ev, "source_path")
    description = _ev_get(ev, "description").lower()

    if ev_type == "bom_component":
        result = _check_bom_component(source_path, description, component_names, component_categories)
        return result, None

    if ev_type == "spec_sheet_value":
        result = _check_spec_value(source_path, description, component_names, component_categories, profile)
        verif = None
        if result == ASSESSED:
            verif = None
        elif result == NOT_ASSESSED:
            verif_cn = VERIFICATION_TYPE_CN.get("spec_sheet_value", "规格参数")
            verif = f"{verif_cn}：{_ev_get(ev, 'description')}"
        return result, verif

    if ev_type == "test_report":
        verif_cn = VERIFICATION_TYPE_CN.get("test_report", "测试报告")
        verif = f"{verif_cn}：{_ev_get(ev, 'description')}"
        return NOT_ASSESSED, verif

    if ev_type in ("label_photo", "product_photo", "packaging_photo"):
        result = _check_photo_evidence(ev_type, description, component_names, component_categories)
        if result == NOT_ASSESSED:
            verif_cn = VERIFICATION_TYPE_CN.get(ev_type, "照片")
            verif = f"{verif_cn}：{_ev_get(ev, 'description')}"
            return result, verif
        return result, None

    if ev_type in ("manual_document", "certificate"):
        result = _check_document_evidence(description, component_names, component_categories)
        if result == NOT_ASSESSED:
            verif_cn = VERIFICATION_TYPE_CN.get(ev_type, "文档")
            verif = f"{verif_cn}：{_ev_get(ev, 'description')}"
            return result, verif
        return result, None

    if ev_type == "material_declaration":
        verif_cn = VERIFICATION_TYPE_CN.get("material_declaration", "材质声明")
        verif = f"{verif_cn}：{_ev_get(ev, 'description')}"
        return NOT_ASSESSED, verif

    if ev_type == "drawing":
        verif_cn = VERIFICATION_TYPE_CN.get("drawing", "图纸")
        verif = f"{verif_cn}：{_ev_get(ev, 'description')}"
        return NOT_ASSESSED, verif

    return NOT_ASSESSED, None


def _check_bom_component(
    source_path: str,
    description: str,
    component_names: set[str],
    component_categories: set[str],
) -> str:
    if "components[" in source_path:
        target = source_path.split("[")[1].split("]")[0]
        if target in component_names:
            return ASSESSED
        return FAILED

    category = SOURCE_PATH_TO_CATEGORY.get(source_path)
    if category and category in component_categories:
        return ASSESSED

    if source_path == "product.components":
        matched = _match_description_to_components(description, component_names, component_categories)
        if matched:
            return ASSESSED
        return FAILED

    if category:
        if category in component_categories:
            return ASSESSED
        return FAILED

    return NOT_ASSESSED


def _match_description_to_components(
    description: str,
    component_names: set[str],
    component_categories: set[str],
) -> bool:
    desc_lower = description.lower()

    brake_kw = ["brake", "handbrake", "footbrake", "刹车", "制动", "刹把", "碟刹"]
    if any(k in desc_lower for k in brake_kw):
        return "Brake" in component_categories

    reflector_kw = ["reflector", "反光"]
    if any(k in desc_lower for k in reflector_kw):
        return "Reflector" in component_categories

    chain_guard_kw = ["chain guard", "chain cover", "链罩", "链盖"]
    if any(k in desc_lower for k in chain_guard_kw):
        return "Chain Guard" in component_categories

    bell_kw = ["bell", "车铃", "铃"]
    if any(k in desc_lower for k in bell_kw):
        return "Bell" in component_categories

    motor_kw = ["motor", "电机"]
    if any(k in desc_lower for k in motor_kw):
        return "Electrical" in component_categories

    battery_kw = ["battery", "电池"]
    if any(k in desc_lower for k in battery_kw):
        return "Electrical" in component_categories

    pedal_kw = ["pedal", "踏板", "脚踏"]
    if any(k in desc_lower for k in pedal_kw):
        return "Drivetrain" in component_categories

    for cat_name, names in CATEGORY_TO_STANDARD_NAMES.items():
        if cat_name in component_categories:
            for name in names:
                if name in desc_lower:
                    return True

    return False


def _check_spec_value(
    source_path: str,
    description: str,
    component_names: set[str],
    component_categories: set[str],
    profile: ProductProfile,
) -> str:
    field = source_path.replace("product.", "")
    val = getattr(profile, field, None)

    if val is not None and val != "":
        return ASSESSED

    if "components[" in source_path and "specifications[" in source_path:
        return NOT_ASSESSED

    if field in ("brake_type", "gear_type", "has_motor", "has_battery",
                 "has_charger", "has_chain_guard", "has_derailleur",
                 "is_sidewalk", "is_small_sidewalk", "target_age_group",
                 "motor_power_w", "max_speed_mph", "seat_height_mm",
                 "seat_height_lowest_mm", "stem_type", "battery_cell_count",
                 "has_bms_software", "has_coating", "has_mouthable_plastic_parts"):
        desc_lower = description.lower()

        if "brake" in desc_lower or "刹车" in desc_lower:
            if "Brake" in component_categories:
                return ASSESSED

        if "battery" in desc_lower or "电池" in desc_lower or "bms" in desc_lower:
            if "Electrical" in component_categories:
                return ASSESSED

        if "motor" in desc_lower or "电机" in desc_lower:
            if "Electrical" in component_categories:
                return ASSESSED

        if "reflector" in desc_lower or "反光" in desc_lower:
            if "Reflector" in component_categories:
                return ASSESSED

        if "seat" in desc_lower or "座" in desc_lower:
            if "Frame" in component_categories:
                return ASSESSED

        if "chain guard" in desc_lower or "链罩" in desc_lower:
            if "Chain Guard" in component_categories:
                return ASSESSED

    return NOT_ASSESSED


def _check_photo_evidence(
    ev_type: str,
    description: str,
    component_names: set[str],
    component_categories: set[str],
) -> str:
    desc_lower = description.lower()

    if "label" in desc_lower or "标" in desc_lower or "贴" in desc_lower:
        if "Label" in component_categories:
            return ASSESSED

    if "reflector" in desc_lower or "反光" in desc_lower:
        if "Reflector" in component_categories:
            return ASSESSED

    return NOT_ASSESSED


def _check_document_evidence(
    description: str,
    component_names: set[str],
    component_categories: set[str],
) -> str:
    desc_lower = description.lower()

    if "manual" in desc_lower or "说明书" in desc_lower or "instruction" in desc_lower:
        doc_kw = ["说明书", "manual", "instruction"]
        for name in component_names:
            for kw in doc_kw:
                if kw in name.lower():
                    return ASSESSED
        if "Label" in component_categories:
            for name in component_names:
                if "manual" in name.lower():
                    return ASSESSED

    if "certificate" in desc_lower or "证书" in desc_lower or "认证" in desc_lower:
        return NOT_ASSESSED

    return NOT_ASSESSED


def _determine_status(
    evidence_results: list[str],
    pending_verifs: list[str],
    rule: RegulationRuleDetail,
) -> tuple[str, str, str | None, str | None]:
    if not evidence_results:
        return "NOT_ASSESSED", "NONE", "无证据要求定义", "SPECIFICATION_GAP"

    assessed = sum(1 for r in evidence_results if r == ASSESSED)
    failed = sum(1 for r in evidence_results if r == FAILED)
    not_assessed = sum(1 for r in evidence_results if r == NOT_ASSESSED)
    total = len(evidence_results)

    if assessed == total:
        return "MET", "HIGH", None, None

    if failed > 0 and not_assessed == 0:
        gap_type = _infer_gap_type(rule)
        gap_desc = f"缺失：{rule.requirement_summary}"
        return "NOT_MET", "HIGH", gap_desc, gap_type

    if failed > 0 and not_assessed > 0:
        gap_type = _infer_gap_type(rule)
        gap_desc = f"BOM确认部分组件存在，但存在缺失项，且部分测试待验证"
        return "PARTIALLY_MET", "MEDIUM", gap_desc, gap_type

    if assessed > 0 and not_assessed > 0 and failed == 0:
        gap_desc = f"组件已确认存在，需补充测试验证"
        return "MET", "HIGH", gap_desc, "MISSING_TEST"

    if not_assessed == total:
        gap_desc = f"BOM无法验证，需提供测试报告"
        return "NOT_ASSESSED", "LOW", gap_desc, "MISSING_TEST"

    gap_type = _infer_gap_type(rule)
    gap_desc = f"缺失：{rule.requirement_summary}"
    return "NOT_MET", "HIGH", gap_desc, gap_type


def _infer_gap_type(rule: RegulationRuleDetail) -> str:
    for ev in rule.evidence_required:
        ev_type = _ev_get(ev, "evidence_type")
        if ev_type == "bom_component":
            return "MISSING_COMPONENT"
        if ev_type == "test_report":
            return "MISSING_TEST"
        if ev_type in ("label_photo", "product_photo", "packaging_photo"):
            return "MISSING_LABEL"
        if ev_type in ("manual_document", "certificate"):
            return "MISSING_DOCUMENTATION"
    return "SPECIFICATION_GAP"


def _reg_get(obj: object, key: str, default: str = "") -> str:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _make_finding(
    rule: RegulationRuleDetail,
    status: str,
    confidence: str,
    gap_description: str | None,
    gap_type: str | None,
    pending_verifications: list[str],
) -> Finding:
    return Finding(
        rule_id=rule.rule_id,
        category=rule.category,
        requirement_summary=rule.requirement_summary or rule.requirement[:100],
        regulation=RegulationSource(
            regulation=_reg_get(rule.regulation_source, "regulation"),
            section=_reg_get(rule.regulation_source, "section"),
        ),
        mandate=rule.mandate,
        status=status,
        confidence=confidence,
        gap_description=gap_description,
        gap_type=gap_type,
        risk_level=rule.risk_level,
        risk_score=0,
        remediation=rule.remediation,
        consequences=rule.consequences,
        pending_verifications=pending_verifications,
    )
