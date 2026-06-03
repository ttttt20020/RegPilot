from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas.regulation import RegulationListResponse, RegulationRuleBrief, RegulationRuleDetail
from app.services.rule_matcher import load_rule_store

router = APIRouter()


@router.get("", response_model=RegulationListResponse)
async def list_regulations(
    regulation: str | None = Query(None),
    category: str | None = Query(None),
    applicable_product: str | None = Query(None),
):
    all_rules = load_rule_store()

    filtered = all_rules
    if regulation:
        filtered = [r for r in filtered if r.regulation_source.get("regulation") == regulation]
    if category:
        filtered = [r for r in filtered if r.category == category]
    if applicable_product:
        filtered = [r for r in filtered if applicable_product in r.applicable_products]

    rules = [
        RegulationRuleBrief(
            rule_id=r.rule_id,
            category=r.category,
            requirement_summary=r.requirement_summary or r.requirement[:80],
            regulation=r.regulation_source,
            mandate=r.mandate,
            applicable_products=r.applicable_products,
            risk_level=r.risk_level,
        )
        for r in filtered
    ]

    return RegulationListResponse(total=len(rules), rules=rules)


@router.get("/{rule_id}", response_model=RegulationRuleDetail)
async def get_regulation(rule_id: str):
    all_rules = load_rule_store()
    for r in all_rules:
        if r.rule_id == rule_id:
            return r
    raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found")
