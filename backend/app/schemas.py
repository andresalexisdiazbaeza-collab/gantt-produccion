from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class MaterialBase(BaseModel):
    material: str
    shrinking: float


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    shrinking: float


class MaterialOut(MaterialBase):
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class MachineBase(BaseModel):
    name: str
    mts_per_shift: float
    shifts_per_day: int = 2
    changeover_shifts: int = 3
    active: bool = True


class MachineCreate(MachineBase):
    pass


class MachineUpdate(BaseModel):
    name: Optional[str] = None
    mts_per_shift: Optional[float] = None
    shifts_per_day: Optional[int] = None
    changeover_shifts: Optional[int] = None
    active: Optional[bool] = None


class MachineOut(MachineBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ProductionItemCreate(BaseModel):
    # Required
    order_number: str
    # Identity
    customer: Optional[str] = None
    raw_material: Optional[str] = None
    titulo: Optional[str] = None
    color: Optional[str] = None
    treatment: Optional[str] = None
    order_type: Optional[str] = None
    braiding: Optional[str] = None
    model: Optional[str] = None
    # Dimensions
    matriz_mm: Optional[float] = None
    measure: Optional[str] = None
    meshes: Optional[float] = None
    knot: Optional[float] = None
    pieces: Optional[float] = None
    piece_length: Optional[float] = None
    # Weight / commercial
    kg_totales: Optional[float] = None
    delivery_date: Optional[date] = None
    # Planning
    machine_id: Optional[int] = None
    start_date: Optional[date] = None
    comments: Optional[str] = None
    notes: Optional[str] = None


class ProductionArticleLine(BaseModel):
    titulo: Optional[str] = None
    raw_material: Optional[str] = None
    color: Optional[str] = None
    treatment: Optional[str] = None
    order_type: Optional[str] = None
    braiding: Optional[str] = None
    model: Optional[str] = None
    matriz_mm: Optional[float] = None
    measure: Optional[str] = None
    meshes: Optional[float] = None
    knot: Optional[float] = None
    pieces: Optional[float] = None
    piece_length: Optional[float] = None
    kg_totales: Optional[float] = None
    delivery_date: Optional[date] = None
    machine_id: Optional[int] = None
    start_date: Optional[date] = None


class ProductionOrderBatchCreate(BaseModel):
    order_number: str
    customer: Optional[str] = None
    comments: Optional[str] = None
    notes: Optional[str] = None
    articles: List[ProductionArticleLine]


class ItemUpdate(BaseModel):
    machine_id: Optional[int] = None
    start_date: Optional[date] = None
    comments: Optional[str] = None
    notes: Optional[str] = None
    meters_produced: Optional[float] = None
    pieces: Optional[float] = None
    piece_length: Optional[float] = None


class ItemOut(BaseModel):
    id: int
    fingerprint: str
    status: str
    raw_material: Optional[str]
    titulo: Optional[str]
    customer: Optional[str]
    order_number: str
    order_type: Optional[str]
    braiding: Optional[str]
    knot: Optional[float]
    model: Optional[str]
    matriz_mm: Optional[float]
    measure: Optional[str]
    meshes: Optional[float]
    color: Optional[str]
    treatment: Optional[str]
    pieces: Optional[float]
    piece_length: Optional[float]
    kg_totales: Optional[float]
    delivered: Optional[float]
    meters_produced: Optional[float]
    remaining_length: Optional[float] = None
    delivery_date: Optional[date]
    source_status: Optional[str]
    machine_id: Optional[int]
    machine_name: Optional[str] = None
    start_date: Optional[date]
    comments: Optional[str]
    notes: Optional[str]
    shrinking: Optional[float]
    total_length: Optional[float]
    working_days: Optional[float]
    mts_per_shift: Optional[float]
    shifts: Optional[int]
    finish_date: Optional[date]
    delivery_status: Optional[str] = None
    is_late: bool = False
    days_late: int = 0
    days_margin: int = 0
    created_at: Optional[datetime]
    completed_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)


class BatchCreateResult(BaseModel):
    created_count: int
    items: List[ItemOut]


class ImportResult(BaseModel):
    filename: str
    new_count: int
    skipped_count: int
    updated_count: int
    details: List[str]


class PlanningImportResult(BaseModel):
    filename: str
    matched_count: int
    updated_count: int
    not_found_count: int
    machine_assigned: int
    dates_assigned: int
    comments_assigned: int
    details: List[str]


class HolidayOut(BaseModel):
    date: date
    name: str
    year: int
    model_config = ConfigDict(from_attributes=True)


class DashboardStats(BaseModel):
    active_count: int
    completed_count: int
    machines_active: int
    total_planned_meters: float
    total_planned_kg: float
    total_produced_kg: float
    total_remaining_kg: float
    machine_load: List[dict]
    by_material: List[dict]
    by_customer: List[dict]
    delivery_compliance: dict
