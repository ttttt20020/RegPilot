from __future__ import annotations

from pydantic import BaseModel


class ComponentSpec(BaseModel):
    key: str
    value: str | int | float | bool
    unit: str | None = None
    confidence: float = 1.0


class BOMComponent(BaseModel):
    standard_name: str
    display_name: str | None = None
    category: str
    sub_category: str | None = None
    original_names: list[str] = []
    quantity: int = 1
    material: str | None = None
    specifications: list[ComponentSpec] = []
    norm_confidence: float = 0.0
