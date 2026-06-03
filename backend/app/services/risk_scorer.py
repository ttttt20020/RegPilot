from __future__ import annotations

from app.schemas.analysis import Finding, ProductProfile

W_SEVERITY = {"Critical": 10, "Major": 6, "Minor": 3, "Info": 1}
W_STATUS = {"NOT_MET": 1.0, "PARTIALLY_MET": 0.6, "NOT_ASSESSED": 0.3, "MET": 0.0, "EXEMPT": 0.0}
W_MANDATE = {"Mandatory": 1.0, "Conditional": 0.7, "Optional": 0.3, "Exemption": 0.0}
W_CATEGORY = {
    "Brake": 1.2, "Battery": 1.2, "Motor": 1.1, "Electrical Safety": 1.1,
    "Chemical": 1.1, "Chain Guard": 1.0, "Label": 1.0, "Testing": 1.0,
    "Tracking Label": 1.0, "Reflector": 0.9, "Warning": 0.9, "Bell": 0.5,
}

COMPLIANCE_RATIO = {
    "MET": 1.0, "EXEMPT": 1.0, "PARTIALLY_MET": 0.5,
    "NOT_ASSESSED": 0.5, "NOT_MET": 0.0,
}


def score_risks(findings: list[Finding], profile: ProductProfile) -> list[Finding]:
    for f in findings:
        w_cat = W_CATEGORY.get(f.category, 1.0)
        w_sev = W_SEVERITY.get(f.risk_level, 1)
        w_sta = W_STATUS.get(f.status, 0.0)
        w_man = W_MANDATE.get(f.mandate, 0.0)
        f.risk_score = round(w_cat * w_sev * w_sta * w_man, 2)
    return findings


def calculate_risk_score(findings: list[Finding]) -> tuple[float, str]:
    risk_raw = sum(f.risk_score for f in findings)

    max_possible = 0.0
    for f in findings:
        w_cat = W_CATEGORY.get(f.category, 1.0)
        w_sev = W_SEVERITY.get(f.risk_level, 1)
        w_man = W_MANDATE.get(f.mandate, 0.0)
        max_possible += w_cat * w_sev * 1.0 * w_man

    if max_possible == 0:
        return 0.0, "NONE"

    risk_normalized = min(risk_raw / max_possible * 100, 100)

    has_critical_not_met = any(
        f.risk_level == "Critical" and f.status == "NOT_MET" for f in findings
    )
    has_critical_not_assessed = any(
        f.risk_level == "Critical" and f.status == "NOT_ASSESSED" for f in findings
    )
    has_major_not_met = any(
        f.risk_level == "Major" and f.status == "NOT_MET" for f in findings
    )

    if has_critical_not_met:
        risk_level = "CRITICAL"
    elif has_critical_not_assessed and has_major_not_met:
        risk_level = "HIGH"
    elif has_critical_not_assessed:
        risk_level = "MEDIUM"
    elif has_major_not_met:
        risk_level = "HIGH"
    elif risk_normalized >= 40:
        risk_level = "HIGH"
    elif risk_normalized >= 20:
        risk_level = "MEDIUM"
    elif risk_normalized >= 5:
        risk_level = "LOW"
    else:
        risk_level = "NONE"

    return round(risk_normalized, 1), risk_level


def calculate_compliance_score(findings: list[Finding]) -> tuple[float, str]:
    total_weight = 0.0
    weighted_compliance = 0.0

    for f in findings:
        w_sev = W_SEVERITY.get(f.risk_level, 1)
        w_man = W_MANDATE.get(f.mandate, 0.0)
        w_rule = w_sev * w_man
        ratio = COMPLIANCE_RATIO.get(f.status, 0.0)

        total_weight += w_rule
        weighted_compliance += w_rule * ratio

    if total_weight == 0:
        return 100.0, "COMPLIANT"

    score = round(weighted_compliance / total_weight * 100, 1)

    has_critical_not_met = any(
        f.risk_level == "Critical" and f.status == "NOT_MET" for f in findings
    )
    mandatory_not_met_count = sum(
        1 for f in findings if f.mandate == "Mandatory" and f.status == "NOT_MET"
    )

    if has_critical_not_met:
        status = "NON_COMPLIANT"
    elif mandatory_not_met_count >= 3:
        status = "NON_COMPLIANT"
    elif score >= 80:
        status = "COMPLIANT"
    elif score >= 50:
        status = "PARTIALLY_COMPLIANT"
    else:
        status = "NON_COMPLIANT"

    return score, status
