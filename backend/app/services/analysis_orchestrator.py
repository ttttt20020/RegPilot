from __future__ import annotations

import tempfile
from pathlib import Path

from app.schemas.analysis import AnalysisResponse, BOMComponent, ProductProfile
from app.services.bom_parser import parse_and_normalize
from app.services.gap_detector import detect_gaps
from app.services.product_classifier import classify_product
from app.services.report_generator import generate_report
from app.services.risk_scorer import calculate_compliance_score, calculate_risk_score, score_risks
from app.services.rule_matcher import match_rules


async def run_analysis(
    analysis_id: str,
    file_content: bytes,
    filename: str,
    country: str = "US",
    product_type: str = "",
    spec_content: bytes | None = None,
    desc_content: bytes | None = None,
    image_contents: list[dict] | None = None,
) -> AnalysisResponse:
    with tempfile.NamedTemporaryFile(suffix=Path(filename).suffix, delete=False) as tmp:
        tmp.write(file_content)
        tmp_path = tmp.name

    try:
        components = parse_and_normalize(tmp_path)
    except Exception as e:
        Path(tmp_path).unlink(missing_ok=True)
        raise ValueError(f"BOM 文件解析失败: {str(e)}。请确保上传的是有效的 .xlsx 或 .csv 文件。")
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if not components:
        raise ValueError("BOM 文件中未找到有效的零部件数据。请检查文件格式是否正确。")

    profile = classify_product(components)

    if product_type:
        product_type = product_type.replace("_", " ")
        if product_type in ("Bicycle", "Kids Bicycle", "E-bike"):
            profile.product_type = product_type

    matched = match_rules(profile)
    findings = detect_gaps(matched, components, profile)
    findings = score_risks(findings, profile)
    risk_score, risk_level = calculate_risk_score(findings)
    compliance_score, compliance_status = calculate_compliance_score(findings)

    report = generate_report(
        profile=profile,
        components=components,
        findings=findings,
        compliance_score=compliance_score,
        compliance_status=compliance_status,
        risk_score=risk_score,
        risk_level=risk_level,
        analysis_id=analysis_id,
    )

    return report