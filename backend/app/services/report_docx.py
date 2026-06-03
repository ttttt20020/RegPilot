"""Generate Word (.docx) compliance analysis reports."""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.shared import Cm, Inches, Pt, RGBColor
from docx.oxml.ns import qn

from app.schemas.analysis import AnalysisResponse

# Report output directory
from app.config import settings
REPORT_DIR = Path(settings.REPORT_DIR)
REPORT_DIR.mkdir(parents=True, exist_ok=True)


# ── Color constants ────────────────────────────────────────────────────
COLOR_PRIMARY = RGBColor(0x4F, 0x46, 0xE5)  # Indigo
COLOR_MET = RGBColor(0x16, 0x65, 0x34)      # Green
COLOR_NOT_MET = RGBColor(0xDC, 0x26, 0x26)  # Red
COLOR_PARTIAL = RGBColor(0xD9, 0x77, 0x06)  # Amber
COLOR_NOT_ASSESSED = RGBColor(0x6B, 0x72, 0x80)  # Gray
COLOR_DARK = RGBColor(0x1E, 0x29, 0x3B)
COLOR_BODY = RGBColor(0x33, 0x41, 0x55)
COLOR_LIGHT = RGBColor(0x64, 0x74, 0x8B)


def _set_cell_shading(cell, color_hex: str):
    """Set cell background color."""
    shading = cell._element.get_or_add_tcPr()
    shd = shading.makeelement(qn('w:shd'), {
        qn('w:fill'): color_hex,
        qn('w:val'): 'clear',
    })
    shading.append(shd)


def _add_styled_paragraph(doc, text, size=11, bold=False, color=COLOR_BODY, space_after=6, alignment=None):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = color
    p.paragraph_format.space_after = Pt(space_after)
    if alignment:
        p.alignment = alignment
    return p


def _status_color(status: str) -> RGBColor:
    return {
        "MET": COLOR_MET,
        "NOT_MET": COLOR_NOT_MET,
        "PARTIALLY_MET": COLOR_PARTIAL,
        "NOT_ASSESSED": COLOR_NOT_ASSESSED,
        "EXEMPT": COLOR_LIGHT,
    }.get(status, COLOR_BODY)


def _status_cn(status: str) -> str:
    return {
        "MET": "合规",
        "NOT_MET": "不合规",
        "PARTIALLY_MET": "部分合规",
        "NOT_ASSESSED": "待验证",
        "EXEMPT": "豁免",
    }.get(status, status)


def _risk_cn(level: str) -> str:
    return {
        "Critical": "严重",
        "Major": "重要",
        "Minor": "轻微",
        "Info": "提示",
    }.get(level, level)


def _mandate_cn(mandate: str) -> str:
    return {
        "Mandatory": "强制",
        "Conditional": "有条件",
        "Optional": "建议",
        "Exemption": "豁免",
    }.get(mandate, mandate)


def _product_type_cn(ptype: str) -> str:
    return {
        "Bicycle": "自行车",
        "Kids Bicycle": "儿童自行车",
        "E-bike": "电助力车",
        "Kids E-bike": "儿童电助力车",
    }.get(ptype, ptype)


def generate_report(analysis: AnalysisResponse) -> str:
    """Generate a Word report and return the file path."""
    doc = Document()

    # ── Page margins ───────────────────────────────────────────────
    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)

    # ── Title ──────────────────────────────────────────────────────
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("RegPilot 合规审查报告")
    run.font.size = Pt(22)
    run.bold = True
    run.font.color.rgb = COLOR_PRIMARY
    p.paragraph_format.space_after = Pt(4)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("Regulation Compliance Analysis Report")
    run.font.size = Pt(12)
    run.font.color.rgb = COLOR_LIGHT
    p.paragraph_format.space_after = Pt(16)

    # Divider line
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("━" * 60)
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor(0xE2, 0xE8, 0xF0)
    p.paragraph_format.space_after = Pt(16)

    # ── Basic Info ─────────────────────────────────────────────────
    _add_styled_paragraph(doc, "一、基本信息", size=14, bold=True, color=COLOR_PRIMARY, space_after=10)

    product_name = analysis.product_name or "未命名产品"
    product_type = _product_type_cn(analysis.product_type)
    created = analysis.created_at[:19].replace("T", " ") if analysis.created_at else datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    info_table = doc.add_table(rows=6, cols=2, style='Table Grid')
    info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    info_data = [
        ("产品名称", product_name),
        ("产品类型", product_type),
        ("审查日期", created),
        ("报告编号", f"RP-{analysis.id[:8].upper()}"),
        ("审查状态", "已完成" if analysis.status == "completed" else analysis.status),
        ("法规体系", "CPSC 16 CFR 1512 / CPSIA / UL 2849 / UL 2271"),
    ]
    for i, (label, value) in enumerate(info_data):
        cell_l = info_table.cell(i, 0)
        cell_r = info_table.cell(i, 1)
        cell_l.text = label
        cell_r.text = value
        for cell in [cell_l, cell_r]:
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.size = Pt(10)
        cell_l.paragraphs[0].runs[0].bold = True
        _set_cell_shading(cell_l, "F1F5F9")

    doc.add_paragraph()  # spacer

    # ── Compliance Summary ─────────────────────────────────────────
    _add_styled_paragraph(doc, "二、合规概览", size=14, bold=True, color=COLOR_PRIMARY, space_after=10)

    summary = analysis.summary
    compliance_score = analysis.compliance_score or 0
    risk_score = analysis.risk_score or 0
    risk_level = _risk_cn(analysis.risk_level or "Medium")
    compliance_status = {
        "COMPLIANT": "合规",
        "PARTIALLY_COMPLIANT": "部分合规",
        "NON_COMPLIANT": "不合规",
    }.get(analysis.compliance_status, analysis.compliance_status or "未知")

    # Score cards
    score_table = doc.add_table(rows=2, cols=4, style='Table Grid')
    score_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    score_data = [
        [f"合规分数\n{compliance_score:.1f}", f"风险分数\n{risk_score:.1f}", f"风险等级\n{risk_level}", f"合规状态\n{compliance_status}"],
        [
            f"合规: {summary.met_count}",
            f"部分合规: {summary.partially_met_count}",
            f"待验证: {summary.not_assessed_count}",
            f"不合规: {summary.not_met_count}",
        ],
    ]
    for i, row_data in enumerate(score_data):
        for j, text in enumerate(row_data):
            cell = score_table.cell(i, j)
            cell.text = text
            for paragraph in cell.paragraphs:
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for run in paragraph.runs:
                    run.font.size = Pt(10)
                    if i == 0:
                        run.bold = True

    # Color the header cells
    _set_cell_shading(score_table.cell(0, 0), "F0FDF4")
    _set_cell_shading(score_table.cell(0, 1), "FEF3C7")
    _set_cell_shading(score_table.cell(0, 2), "FEF3C7")
    _set_cell_shading(score_table.cell(0, 3), "EEF2FF")

    doc.add_paragraph()

    # ── Applicable Regulations ─────────────────────────────────────
    _add_styled_paragraph(doc, "三、适用法规", size=14, bold=True, color=COLOR_PRIMARY, space_after=10)

    for reg in analysis.applicable_regulations:
        sections_str = "、".join(reg.sections) if reg.sections else "—"
        _add_styled_paragraph(doc, f"• {reg.regulation}  ({sections_str})", size=10, color=COLOR_BODY, space_after=4)

    doc.add_paragraph()

    # ── Findings Detail ────────────────────────────────────────────
    _add_styled_paragraph(doc, "四、详细审查结果", size=14, bold=True, color=COLOR_PRIMARY, space_after=10)

    # Sort findings: NOT_MET > PARTIALLY_MET > NOT_ASSESSED > MET
    status_order = {"NOT_MET": 0, "PARTIALLY_MET": 1, "NOT_ASSESSED": 2, "MET": 3, "EXEMPT": 4}
    sorted_findings = sorted(analysis.findings, key=lambda f: (status_order.get(f.status, 5), -f.risk_score))

    # Summary table
    header_row = ["序号", "规则ID", "类别", "要求摘要", "法规来源", "状态", "风险", "性质"]
    findings_table = doc.add_table(rows=1 + len(sorted_findings), cols=len(header_row), style='Table Grid')
    findings_table.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Header
    for j, header in enumerate(header_row):
        cell = findings_table.cell(0, j)
        cell.text = header
        for paragraph in cell.paragraphs:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in paragraph.runs:
                run.font.size = Pt(9)
                run.bold = True
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        _set_cell_shading(cell, "4F46E5")

    # Data rows
    for i, f in enumerate(sorted_findings):
        row_data = [
            str(i + 1),
            f.rule_id,
            f.category,
            f.requirement_summary[:40] + ("..." if len(f.requirement_summary) > 40 else ""),
            f"{f.regulation.regulation} {f.regulation.section}",
            _status_cn(f.status),
            _risk_cn(f.risk_level),
            _mandate_cn(f.mandate),
        ]
        for j, text in enumerate(row_data):
            cell = findings_table.cell(i + 1, j)
            cell.text = text
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.size = Pt(8)
                    # Color status column
                    if j == 5:
                        run.font.color.rgb = _status_color(f.status)
                        run.bold = True

        # Row background for non-MET
        if f.status == "NOT_MET":
            for j in range(len(header_row)):
                _set_cell_shading(findings_table.cell(i + 1, j), "FEF2F2")
        elif f.status == "PARTIALLY_MET":
            for j in range(len(header_row)):
                _set_cell_shading(findings_table.cell(i + 1, j), "FFFBEB")

    doc.add_paragraph()

    # ── Issues & Verifications ─────────────────────────────────────
    issues = [f for f in sorted_findings if f.status in ("NOT_MET", "PARTIALLY_MET")]
    verifications = [f for f in sorted_findings if f.pending_verifications and f.status != "NOT_MET"]

    if issues:
        _add_styled_paragraph(doc, "五、不合规项与部分合规项", size=14, bold=True, color=COLOR_NOT_MET, space_after=10)

        for i, f in enumerate(issues, 1):
            _add_styled_paragraph(doc, f"{i}. [{f.rule_id}] {f.requirement_summary}", size=11, bold=True, color=COLOR_DARK, space_after=2)
            _add_styled_paragraph(doc, f"   法规来源：{f.regulation.regulation} {f.regulation.section}", size=10, color=COLOR_LIGHT, space_after=2)
            _add_styled_paragraph(doc, f"   状态：{_status_cn(f.status)} | 风险：{_risk_cn(f.risk_level)} | 性质：{_mandate_cn(f.mandate)}", size=10, color=COLOR_LIGHT, space_after=2)
            if f.gap_description:
                _add_styled_paragraph(doc, f"   差距描述：{f.gap_description}", size=10, color=COLOR_BODY, space_after=2)
            if f.remediation:
                _add_styled_paragraph(doc, f"   整改建议：{f.remediation}", size=10, color=COLOR_PRIMARY, space_after=2)
            if f.consequences:
                _add_styled_paragraph(doc, f"   后果：{'；'.join(f.consequences)}", size=10, color=COLOR_NOT_MET, space_after=6)

    if verifications:
        _add_styled_paragraph(doc, "六、待验证项", size=14, bold=True, color=COLOR_PARTIAL, space_after=10)

        for i, f in enumerate(verifications, 1):
            verifs = "；".join(f.pending_verifications)
            _add_styled_paragraph(doc, f"{i}. [{f.rule_id}] {f.requirement_summary}", size=11, bold=True, color=COLOR_DARK, space_after=2)
            _add_styled_paragraph(doc, f"   需提供的验证材料：{verifs}", size=10, color=COLOR_BODY, space_after=6)

    # ── Component List ─────────────────────────────────────────────
    _add_styled_paragraph(doc, "七、产品组件清单", size=14, bold=True, color=COLOR_PRIMARY, space_after=10)

    comp_header = ["序号", "原始名称", "标准名称", "类别", "规格", "数量"]
    comp_table = doc.add_table(rows=1 + len(analysis.components), cols=len(comp_header), style='Table Grid')
    comp_table.alignment = WD_TABLE_ALIGNMENT.CENTER

    for j, header in enumerate(comp_header):
        cell = comp_table.cell(0, j)
        cell.text = header
        for paragraph in cell.paragraphs:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in paragraph.runs:
                run.font.size = Pt(9)
                run.bold = True
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        _set_cell_shading(cell, "4F46E5")

    for i, comp in enumerate(analysis.components):
        specs_str = ""
        if comp.specifications:
            spec_parts = [f"{s.key}: {s.value}" for s in comp.specifications[:3]]
            specs_str = ", ".join(spec_parts)
        row_data = [
            str(i + 1),
            ", ".join(comp.original_names) if comp.original_names else (comp.display_name or ""),
            comp.standard_name or "unknown",
            comp.category or "",
            specs_str[:50],
            str(comp.quantity or ""),
        ]
        for j, text in enumerate(row_data):
            cell = comp_table.cell(i + 1, j)
            cell.text = text
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.size = Pt(8)

    doc.add_paragraph()

    # ── Disclaimer ─────────────────────────────────────────────────
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("━" * 60)
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor(0xE2, 0xE8, 0xF0)

    _add_styled_paragraph(
        doc,
        "免责声明：本报告由 RegPilot 系统基于上传的 BOM 数据自动生成，仅供参考。"
        "实际合规状态应以第三方实验室测试报告和法规原文为准。",
        size=9, color=COLOR_LIGHT, space_after=4, alignment=WD_ALIGN_PARAGRAPH.CENTER,
    )
    _add_styled_paragraph(
        doc,
        f"Generated by RegPilot v1.0 | {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        size=8, color=COLOR_LIGHT, alignment=WD_ALIGN_PARAGRAPH.CENTER,
    )

    # ── Save ───────────────────────────────────────────────────────
    safe_name = (analysis.product_name or "未命名产品").replace(" ", "_").replace("/", "_")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{safe_name}_合规审查报告_{timestamp}.docx"
    filepath = REPORT_DIR / filename

    doc.save(str(filepath))
    return str(filepath)
