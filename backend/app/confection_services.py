from __future__ import annotations

import hashlib
from typing import Any, Optional

from sqlalchemy.orm import Session

from .confection_calculations import apply_confection_calculations
from .models import ConfectionItem, ConfectionTeam


def confection_fingerprint(
    po_number: str,
    id_code: Optional[str],
    tag_numbers: Optional[str],
    pcs_label: Optional[str],
) -> str:
    raw = "|".join(
        [
            (po_number or "").strip(),
            (id_code or "").strip(),
            (tag_numbers or "").strip(),
            (pcs_label or "").strip(),
        ]
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def team_capacity_hours(team: ConfectionTeam, workers: Optional[int] = None) -> float:
    w = workers if workers and workers > 0 else team.workers
    return float(w) * (float(team.hours_daily or 7.5) + float(team.extra_hours_day or 0.0))


def recalculate_confection_item(db: Session, item: ConfectionItem) -> None:
    hours_daily = 7.5
    extra = 0.0
    if item.team_id:
        team = db.get(ConfectionTeam, item.team_id)
        if team:
            hours_daily = team.hours_daily or 7.5
            extra = team.extra_hours_day or 0.0
            if not item.workers_assigned:
                item.workers_assigned = team.workers

    result = apply_confection_calculations(
        total_hours=item.total_hours,
        workers_assigned=item.workers_assigned,
        hours_daily=hours_daily,
        extra_hours_day=extra,
        team_hours_override=item.team_hours,
        start_date=item.start_date,
        pct_done=item.pct_done or 0.0,
        delivery_offered=item.delivery_offered,
    )
    item.team_hours = result["team_hours"]
    item.working_days = result["working_days"]
    item.finish_date = result["finish_date"]


def confection_item_to_dict(item: ConfectionItem) -> dict[str, Any]:
    compliance = apply_confection_calculations(
        total_hours=item.total_hours,
        workers_assigned=item.workers_assigned,
        team_hours_override=item.team_hours,
        start_date=item.start_date,
        pct_done=item.pct_done or 0.0,
        delivery_offered=item.delivery_offered,
    )
    return {
        "id": item.id,
        "fingerprint": item.fingerprint,
        "status": item.status,
        "pcs_label": item.pcs_label,
        "quantity": item.quantity,
        "po_number": item.po_number,
        "purchase_order": item.purchase_order,
        "id_code": item.id_code,
        "customer": item.customer,
        "tag_numbers": item.tag_numbers,
        "circumference": item.circumference,
        "height": item.height,
        "cage_type": item.cage_type,
        "mesh_mm": item.mesh_mm,
        "twine_size": item.twine_size,
        "color": item.color,
        "product_type": item.product_type,
        "received_date": item.received_date.isoformat() if item.received_date else None,
        "payment_terms": item.payment_terms,
        "requested_delivery_text": item.requested_delivery_text,
        "delivery_offered": item.delivery_offered.isoformat() if item.delivery_offered else None,
        "netting_ready_date": item.netting_ready_date.isoformat() if item.netting_ready_date else None,
        "netting_status": item.netting_status,
        "kg_cage": item.kg_cage,
        "netting_m2": item.netting_m2,
        "netting_kg": item.netting_kg,
        "total_hours": item.total_hours,
        "coating_hours": item.coating_hours,
        "real_hours": item.real_hours,
        "team_id": item.team_id,
        "team_name": item.team.name if item.team else None,
        "workers_assigned": item.workers_assigned,
        "team_hours": item.team_hours,
        "start_date": item.start_date.isoformat() if item.start_date else None,
        "finish_date": item.finish_date.isoformat() if item.finish_date else None,
        "working_days": item.working_days,
        "pct_done": item.pct_done or 0.0,
        "comments": item.comments,
        "completed_at": item.completed_at.isoformat() if item.completed_at else None,
        "delivery_status": compliance["delivery_status"],
        "is_late": compliance["is_late"],
        "days_late": compliance["days_late"],
        "days_margin": compliance["days_margin"],
    }
