from __future__ import annotations

from pydantic import BaseModel

from app.schemas.bom import BOMComponent, ComponentSpec


class ProductProfile(BaseModel):
    product_name: str | None = None
    product_type: str
    seat_height_mm: float | None = None
    seat_height_lowest_mm: float | None = None
    is_sidewalk: bool = False
    is_small_sidewalk: bool = False
    has_motor: bool = False
    motor_power_w: float | None = None
    max_speed_mph: float | None = None
    has_battery: bool = False
    has_charger: bool = False
    brake_type: str | None = None
    gear_type: str | None = None
    target_age_group: str | None = None
    has_derailleur: bool = False
    has_chain_guard: bool = False
    has_charger: bool = False
    target_states: list[str] = []
    has_coating: bool = True
    has_mouthable_plastic_parts: bool = False
    target_age_max_months: int | None = None
    battery_cell_count: int | None = None
    has_bms_software: bool = False
    stem_type: str | None = None
    sold_assembled: bool = False


class RegulationSource(BaseModel):
    regulation: str
    section: str


class Finding(BaseModel):
    rule_id: str
    category: str
    requirement_summary: str
    regulation: RegulationSource
    mandate: str
    status: str
    confidence: str | None = None
    gap_description: str | None = None
    gap_type: str | None = None
    risk_level: str
    risk_score: float = 0
    remediation: str | None = None
    consequences: list[str] = []
    pending_verifications: list[str] = []


class AnalysisSummary(BaseModel):
    total_rules: int = 0
    met_count: int = 0
    not_met_count: int = 0
    partially_met_count: int = 0
    not_assessed_count: int = 0
    exempt_count: int = 0
    critical_issues: int = 0
    major_issues: int = 0
    minor_issues: int = 0


class ApplicableRegulation(BaseModel):
    regulation: str
    sections: list[str]


class AnalysisResponse(BaseModel):
    id: str
    product_name: str | None = None
    product_type: str
    product_profile: ProductProfile
    components: list[BOMComponent]
    findings: list[Finding] = []
    compliance_score: float | None = None
    compliance_status: str | None = None
    risk_score: float | None = None
    risk_level: str | None = None
    summary: AnalysisSummary
    applicable_regulations: list[ApplicableRegulation]
    status: str
    created_at: str
    updated_at: str


class AnalysisListItem(BaseModel):
    id: str
    product_name: str | None = None
    product_type: str
    compliance_score: float | None = None
    risk_level: str | None = None
    status: str
    created_at: str


class AnalysisListResponse(BaseModel):
    items: list[AnalysisListItem]
    total: int


class UploadResponse(BaseModel):
    id: str
    status: str
    message: str


class FindingListResponse(BaseModel):
    total: int
    findings: list[Finding]
