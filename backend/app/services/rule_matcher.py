from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.schemas.analysis import ProductProfile
from app.schemas.regulation import RegulationRuleDetail

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
RULES_DIR = DATA_DIR / "rules"

_rule_store: list[RegulationRuleDetail] | None = None

PRODUCT_TYPE_INHERITANCE = {
    "Bicycle": ["Bicycle"],
    "Kids Bicycle": ["Bicycle", "Kids Bicycle"],
    "E-bike": ["Bicycle", "E-bike"],
    "Kids E-bike": ["Bicycle", "Kids Bicycle", "E-bike"],
}


def load_rule_store() -> list[RegulationRuleDetail]:
    global _rule_store
    if _rule_store is not None:
        return _rule_store

    rules = []
    for json_file in RULES_DIR.glob("*.json"):
        with open(json_file) as f:
            data = json.load(f)
        for item in data:
            rule = RegulationRuleDetail(
                rule_id=item["rule_id"],
                category=item["category"],
                requirement=item["requirement"],
                requirement_summary=item.get("requirement_summary"),
                regulation_source=item["regulation_source"],
                mandate=item["mandate"],
                applicable_products=item["applicable_products"],
                trigger_conditions=item.get("trigger_conditions", []),
                evidence_required=item.get("evidence_required", []),
                risk_level=item["risk_level"],
                consequences=item.get("consequences", []),
                remediation=item.get("remediation"),
                related_rules=item.get("related_rules", []),
            )
            rules.append(rule)

    _rule_store = rules
    return _rule_store


def match_rules(profile: ProductProfile) -> list[RegulationRuleDetail]:
    all_rules = load_rule_store()
    inherited_types = PRODUCT_TYPE_INHERITANCE.get(profile.product_type, [profile.product_type])

    matched = []
    exemption_rule_ids = set()

    for rule in all_rules:
        if rule.mandate == "Exemption":
            if _product_type_matches(rule, inherited_types):
                if _evaluate_conditions(rule.trigger_conditions, profile):
                    matched.append(rule)
                    exemption_rule_ids.update(rule.related_rules)
            continue

        if not _product_type_matches(rule, inherited_types):
            continue

        if not _evaluate_conditions(rule.trigger_conditions, profile):
            continue

        if rule.rule_id in exemption_rule_ids:
            continue

        matched.append(rule)

    return matched


def _product_type_matches(rule: RegulationRuleDetail, inherited_types: list[str]) -> bool:
    for pt in inherited_types:
        if pt in rule.applicable_products:
            return True
    return False


def _evaluate_conditions(
    conditions: list, profile: ProductProfile
) -> bool:
    if not conditions:
        return True

    results = []
    for i, cond in enumerate(conditions):
        if isinstance(cond, dict):
            field = cond.get("field", "")
            operator = cond.get("operator", "eq")
            target = cond.get("value")
            logic = cond.get("logic", "AND")
        else:
            field = getattr(cond, "field", "")
            operator = getattr(cond, "operator", "eq")
            target = getattr(cond, "value", None)
            logic = getattr(cond, "logic", "AND")

        field_value = _resolve_field(field, profile)
        result = _compare(field_value, operator, target)
        results.append((result, logic))

        if i < len(conditions) - 1:
            next_cond = conditions[i + 1]
            next_logic = getattr(next_cond, "logic", "AND") if not isinstance(next_cond, dict) else next_cond.get("logic", "AND")
            if next_logic == "AND" and not result:
                return False
            if next_logic == "OR" and result:
                return True

    return all(r for r, _ in results)


FIELD_ALIASES = {
    "is_sidewalk_bicycle": "is_sidewalk",
    "includes_charger": "has_charger",
}


def _resolve_field(field: str, profile: ProductProfile) -> Any:
    path = field.replace("product.", "")
    path = FIELD_ALIASES.get(path, path)
    return getattr(profile, path, None)


def _compare(field_value: Any, operator: str, target: Any) -> bool:
    if operator == "exists":
        return field_value is not None and field_value != ""
    if operator == "not_exists":
        return field_value is None or field_value == ""
    if field_value is None:
        return False

    if operator == "eq":
        return field_value == target
    if operator == "neq":
        return field_value != target
    if operator == "gt":
        return float(field_value) > float(target)
    if operator == "gte":
        return float(field_value) >= float(target)
    if operator == "lt":
        return float(field_value) < float(target)
    if operator == "lte":
        return float(field_value) <= float(target)
    if operator == "in":
        return field_value in target
    if operator == "not_in":
        return field_value not in target
    if operator == "contains":
        return target in str(field_value)

    return False
