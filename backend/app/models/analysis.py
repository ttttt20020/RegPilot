import uuid

from sqlalchemy import Boolean, Numeric, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_name: Mapped[str | None] = mapped_column(String(255))
    product_type: Mapped[str] = mapped_column(String(50), nullable=False)
    seat_height_mm: Mapped[float | None] = mapped_column(Numeric(6, 1))
    seat_height_lowest_mm: Mapped[float | None] = mapped_column(Numeric(6, 1))
    is_sidewalk: Mapped[bool] = mapped_column(Boolean, default=False)
    is_small_sidewalk: Mapped[bool] = mapped_column(Boolean, default=False)
    has_motor: Mapped[bool] = mapped_column(Boolean, default=False)
    motor_power_w: Mapped[float | None] = mapped_column(Numeric(8, 1))
    max_speed_mph: Mapped[float | None] = mapped_column(Numeric(5, 1))
    has_battery: Mapped[bool] = mapped_column(Boolean, default=False)
    has_charger: Mapped[bool] = mapped_column(Boolean, default=False)
    brake_type: Mapped[str | None] = mapped_column(String(20))
    gear_type: Mapped[str | None] = mapped_column(String(20))
    target_age_group: Mapped[str | None] = mapped_column(String(20))
    has_derailleur: Mapped[bool] = mapped_column(Boolean, default=False)
    original_filename: Mapped[str | None] = mapped_column(String(255))
    raw_bom_json: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    compliance_score: Mapped[float | None] = mapped_column(Numeric(5, 1))
    risk_score: Mapped[float | None] = mapped_column(Numeric(5, 1))
    risk_level: Mapped[str | None] = mapped_column(String(20))
    compliance_status: Mapped[str | None] = mapped_column(String(30))
    created_at = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default="NOW()")
    updated_at = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default="NOW()", onupdate="NOW()")

    components: Mapped[list["AnalysisComponent"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")
    findings: Mapped[list["AnalysisFinding"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")


class AnalysisComponent(Base):
    __tablename__ = "analysis_components"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    standard_name: Mapped[str] = mapped_column(String(100), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    sub_category: Mapped[str | None] = mapped_column(String(50))
    original_names: Mapped[dict | None] = mapped_column(JSONB, default=list)
    quantity: Mapped[int] = mapped_column(default=1)
    material: Mapped[str | None] = mapped_column(String(255))
    specifications: Mapped[dict | None] = mapped_column(JSONB, default=list)
    norm_confidence: Mapped[float] = mapped_column(Numeric(3, 2), default=0.0)
    created_at = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default="NOW()")

    analysis: Mapped["Analysis"] = relationship(back_populates="components")


class AnalysisFinding(Base):
    __tablename__ = "analysis_findings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    rule_id: Mapped[str] = mapped_column(String(10), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    requirement_summary: Mapped[str] = mapped_column(Text, nullable=False)
    regulation_regulation: Mapped[str] = mapped_column(String(50), nullable=False)
    regulation_section: Mapped[str] = mapped_column(String(50), nullable=False)
    mandate: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence: Mapped[str | None] = mapped_column(String(10))
    gap_description: Mapped[str | None] = mapped_column(Text)
    gap_type: Mapped[str | None] = mapped_column(String(30))
    risk_level: Mapped[str] = mapped_column(String(10), nullable=False)
    risk_score: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    remediation: Mapped[str | None] = mapped_column(Text)
    consequences: Mapped[dict | None] = mapped_column(JSONB, default=list)
    created_at = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default="NOW()")

    analysis: Mapped["Analysis"] = relationship(back_populates="findings")
