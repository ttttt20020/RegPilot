from __future__ import annotations

from app.schemas.analysis import (
    AnalysisResponse,
    AnalysisSummary,
    ApplicableRegulation,
    BOMComponent,
    Finding,
    ProductProfile,
)


def generate_report(
    profile: ProductProfile,
    components: list[BOMComponent],
    findings: list[Finding],
    compliance_score: float,
    compliance_status: str,
    risk_score: float,
    risk_level: str,
    analysis_id: str,
) -> AnalysisResponse:
    summary = _build_summary(findings)
    applicable_regulations = _extract_regulations(findings)

    return AnalysisResponse(
        id=analysis_id,
        product_name=profile.product_name,
        product_type=profile.product_type,
        product_profile=profile,
        components=components,
        findings=findings,
        compliance_score=compliance_score,
        compliance_status=compliance_status,
        risk_score=risk_score,
        risk_level=risk_level,
        summary=summary,
        applicable_regulations=applicable_regulations,
        status="completed",
        created_at="",
        updated_at="",
    )


def _build_summary(findings: list[Finding]) -> AnalysisSummary:
    met = sum(1 for f in findings if f.status == "MET")
    not_met = sum(1 for f in findings if f.status == "NOT_MET")
    partially = sum(1 for f in findings if f.status == "PARTIALLY_MET")
    not_assessed = sum(1 for f in findings if f.status == "NOT_ASSESSED")
    exempt = sum(1 for f in findings if f.status == "EXEMPT")
    critical = sum(1 for f in findings if f.risk_level == "Critical" and f.status not in ("MET", "EXEMPT"))
    major = sum(1 for f in findings if f.risk_level == "Major" and f.status not in ("MET", "EXEMPT"))
    minor = sum(1 for f in findings if f.risk_level == "Minor" and f.status not in ("MET", "EXEMPT"))

    return AnalysisSummary(
        total_rules=len(findings),
        met_count=met,
        not_met_count=not_met,
        partially_met_count=partially,
        not_assessed_count=not_assessed,
        exempt_count=exempt,
        critical_issues=critical,
        major_issues=major,
        minor_issues=minor,
    )


def _extract_regulations(findings: list[Finding]) -> list[ApplicableRegulation]:
    reg_map: dict[str, set[str]] = {}
    for f in findings:
        reg_name = f.regulation.regulation
        section = f.regulation.section
        if reg_name not in reg_map:
            reg_map[reg_name] = set()
        reg_map[reg_name].add(section)

    return [
        ApplicableRegulation(regulation=name, sections=sorted(sections))
        for name, sections in sorted(reg_map.items())
    ]
