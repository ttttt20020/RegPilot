from __future__ import annotations

import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.schemas.analysis import (
    AnalysisResponse,
    FindingListResponse,
    UploadResponse,
)
from app.services.analysis_orchestrator import run_analysis
from app.services.report_docx import generate_report

router = APIRouter()

class RenameRequest(BaseModel):
    product_name: str


# analysis_id → report data
_analysis_store: dict[str, AnalysisResponse] = {}
# analysis_id → docx file path
_report_path_store: dict[str, str] = {}


@router.post("/upload", response_model=UploadResponse)
async def upload_bom(
    file: UploadFile,
    country: str = Form(default="US"),
    product_type: str = Form(default=""),
    spec_file: Optional[UploadFile] = None,
    description_file: Optional[UploadFile] = None,
    image_files: list[UploadFile] = [],
):
    analysis_id = str(uuid.uuid4())
    content = await file.read()
    filename = file.filename or "unknown.xlsx"

    spec_content = await spec_file.read() if spec_file else None
    desc_content = await description_file.read() if description_file else None
    image_contents = []
    for img in image_files:
        img_data = await img.read()
        image_contents.append({"filename": img.filename, "content": img_data})

    try:
        report = await run_analysis(
            analysis_id, content, filename,
            country=country, product_type=product_type,
            spec_content=spec_content, desc_content=desc_content,
            image_contents=image_contents,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")

    # Auto-generate product name from filename and type
    if not report.product_name:
        base_name = Path(filename).stem
        type_cn = {"Bicycle": "自行车", "Kids Bicycle": "儿童自行车", "E-bike": "电助力车"}.get(report.product_type, report.product_type)
        report.product_name = f"{base_name} - {type_cn}"

    _analysis_store[analysis_id] = report

    # Auto-generate Word report
    try:
        report_path = generate_report(report)
        _report_path_store[analysis_id] = report_path
    except Exception as e:
        # Report generation failure should not block the analysis
        import traceback
        traceback.print_exc()
        print(f"Report generation failed: {e}")

    return UploadResponse(
        id=analysis_id,
        status=report.status,
        message="BOM file analyzed successfully",
    )


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: str):
    report = _analysis_store.get(analysis_id)
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Analysis not found")
    return report


@router.get("/{analysis_id}/findings", response_model=FindingListResponse)
async def get_findings(
    analysis_id: str,
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
):
    report = _analysis_store.get(analysis_id)
    if not report:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Analysis not found")

    findings = report.findings if hasattr(report, "findings") else []

    if status:
        findings = [f for f in findings if f.status == status]
    if category:
        findings = [f for f in findings if f.category == category]
    if risk_level:
        findings = [f for f in findings if f.risk_level == risk_level]

    findings.sort(key=lambda f: f.risk_score, reverse=True)

    return FindingListResponse(total=len(findings), findings=findings)


@router.get("")
async def list_analyses():
    items = []
    for aid, report in _analysis_store.items():
        items.append({
            "id": aid,
            "product_name": report.product_name,
            "product_type": report.product_type,
            "compliance_score": report.compliance_score,
            "risk_level": report.risk_level,
            "status": report.status,
            "created_at": report.created_at,
        })
    return {"items": items, "total": len(items)}


@router.patch("/{analysis_id}/rename")
async def rename_analysis(analysis_id: str, req: RenameRequest):
    report = _analysis_store.get(analysis_id)
    if not report:
        raise HTTPException(status_code=404, detail="Analysis not found")
    report.product_name = req.product_name
    return {"id": analysis_id, "product_name": req.product_name}


@router.get("/{analysis_id}/report")
async def download_report(analysis_id: str):
    """Download the Word compliance report."""
    report_path = _report_path_store.get(analysis_id)
    if not report_path or not Path(report_path).exists():
        # Try to generate on-the-fly
        report = _analysis_store.get(analysis_id)
        if not report:
            raise HTTPException(status_code=404, detail="Analysis not found")
        try:
            report_path = generate_report(report)
            _report_path_store[analysis_id] = report_path
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

    filename = Path(report_path).name
    return FileResponse(
        path=report_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
