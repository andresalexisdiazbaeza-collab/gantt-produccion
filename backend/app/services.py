from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from .calculations import apply_calculations, calc_delivery_compliance, calc_remaining_length
from .models import ItemStatus, MachineConfig, MaterialConfig, ProductionItem


def get_shrinking(db: Session, raw_material: Optional[str]) -> float:
    if not raw_material:
        return 1.0
    mat = db.get(MaterialConfig, raw_material.strip())
    if mat:
        return mat.shrinking
    if raw_material.startswith("PA"):
        return 0.83
    if raw_material.startswith("PES"):
        return 0.95
    return 1.0


def recalculate_item(db: Session, item: ProductionItem) -> ProductionItem:
    shrinking = get_shrinking(db, item.raw_material)
    mts = item.mts_per_shift
    shifts = item.shifts

    if item.machine_id:
        machine = db.get(MachineConfig, item.machine_id)
        if machine:
            mts = machine.mts_per_shift
            shifts = machine.shifts_per_day

    calc = apply_calculations(
        piece_length=item.piece_length,
        pieces=item.pieces,
        shrinking=shrinking,
        mts_per_shift=mts,
        shifts=shifts,
        start_date=item.start_date,
        meters_produced=item.meters_produced,
    )
    for k, v in calc.items():
        setattr(item, k, v)
    return item


def item_to_dict(item: ProductionItem) -> Dict[str, Any]:
    return {
        "id": item.id,
        "fingerprint": item.fingerprint,
        "status": item.status,
        "raw_material": item.raw_material,
        "titulo": item.titulo,
        "customer": item.customer,
        "order_number": item.order_number,
        "order_type": item.order_type,
        "braiding": item.braiding,
        "knot": item.knot,
        "model": item.model,
        "matriz_mm": item.matriz_mm,
        "measure": item.measure,
        "meshes": item.meshes,
        "color": item.color,
        "treatment": item.treatment,
        "pieces": item.pieces,
        "piece_length": item.piece_length,
        "kg_totales": item.kg_totales,
        "delivered": item.delivered,
        "meters_produced": item.meters_produced,
        "remaining_length": calc_remaining_length(item.total_length, item.meters_produced),
        "delivery_date": item.delivery_date,
        "source_status": item.source_status,
        "machine_id": item.machine_id,
        "machine_name": item.machine.name if item.machine else None,
        "start_date": item.start_date,
        "comments": item.comments,
        "notes": item.notes,
        "shrinking": item.shrinking,
        "total_length": item.total_length,
        "working_days": item.working_days,
        "mts_per_shift": item.mts_per_shift,
        "shifts": item.shifts,
        "finish_date": item.finish_date,
        "created_at": item.created_at,
        "completed_at": item.completed_at,
        **calc_delivery_compliance(item.finish_date, item.delivery_date),
    }


def recalculate_all_active(db: Session) -> int:
    items = db.query(ProductionItem).filter(ProductionItem.status == ItemStatus.ACTIVA.value).all()
    for item in items:
        recalculate_item(db, item)
    db.commit()
    return len(items)
