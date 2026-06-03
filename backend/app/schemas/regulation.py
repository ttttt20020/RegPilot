from __future__ import annotations

from pydantic import BaseModel


class RegulationRuleBrief(BaseModel):
    rule_id: str
    category: str
    requirement_summary: str
    regulation: dict
    mandate: str
    applicable_products: list[str]
    risk_level: str


class RegulationListResponse(BaseModel):
    total: int
    rules: list[RegulationRuleBrief]


class TriggerCondition(BaseModel):
    field: str
    operator: str
    value: str | int | float | bool | list | None = None
    logic: str = "AND"


class EvidenceRequired(BaseModel):
    evidence_type: str
    description: str
    source_path: str | None = None


class RegulationRuleDetail(BaseModel):
    rule_id: str
    category: str
    requirement: str
    requirement_summary: str | None = None
    regulation_source: dict
    mandate: str
    applicable_products: list[str]
    trigger_conditions: list[TriggerCondition]
    evidence_required: list[EvidenceRequired]
    risk_level: str
    consequences: list[str] = []
    remediation: str | None = None
    related_rules: list[str] = []
