from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..kg_metrics import calc_order_kg_metrics
from ..models import ItemStatus, MachineConfig, ProductionItem, SlovakHoliday, User
from ..schemas import DashboardStats, HolidayOut

router = APIRouter(tags=["dashboard"])


def get_dashboard_stats(db: Session) -> DashboardStats:
    active = db.query(ProductionItem).filter(ProductionItem.status == ItemStatus.ACTIVA.value).all()
    completed = db.query(ProductionItem).filter(ProductionItem.status == ItemStatus.TERMINADA.value).count()
    machines = db.query(MachineConfig).filter(MachineConfig.active.is_(True)).count()

    total_meters = 0.0
    total_planned_kg = 0.0
    total_produced_kg = 0.0
    total_remaining_kg = 0.0
    machine_load: dict[str, dict[str, float]] = {}
    by_material: dict[str, dict[str, float]] = {}
    by_customer: dict[str, dict[str, float]] = {}
    on_time = 0
    late = 0
    no_date = 0

    for item in active:
        total_meters += item.total_length or 0
        kg = calc_order_kg_metrics(
            kg_totales=item.kg_totales,
            total_length=item.total_length,
            meters_produced=item.meters_produced,
        )
        if kg["planned_kg"]:
            total_planned_kg += kg["planned_kg"]
        if kg["produced_kg"]:
            total_produced_kg += kg["produced_kg"]
        if kg["remaining_kg"]:
            total_remaining_kg += kg["remaining_kg"]

        name = item.machine.name if item.machine else "Sin asignar"
        load = machine_load.setdefault(name, {"working_days": 0.0, "kg": 0.0})
        load["working_days"] += item.working_days or 0
        load["kg"] += kg["planned_kg"] or 0

        mat_key = item.raw_material or "N/A"
        mat = by_material.setdefault(mat_key, {"count": 0, "kg": 0.0})
        mat["count"] += 1
        mat["kg"] += kg["planned_kg"] or 0

        cust_key = item.customer or "N/A"
        cust = by_customer.setdefault(cust_key, {"count": 0, "kg": 0.0})
        cust["count"] += 1
        cust["kg"] += kg["planned_kg"] or 0

        if item.finish_date and item.delivery_date:
            if item.finish_date <= item.delivery_date:
                on_time += 1
            else:
                late += 1
        else:
            no_date += 1

    return DashboardStats(
        active_count=len(active),
        completed_count=completed,
        machines_active=machines,
        total_planned_meters=round(total_meters, 2),
        total_planned_kg=round(total_planned_kg, 2),
        total_produced_kg=round(total_produced_kg, 2),
        total_remaining_kg=round(total_remaining_kg, 2),
        machine_load=[
            {"machine": k, "working_days": round(v["working_days"], 2), "kg": round(v["kg"], 2)}
            for k, v in sorted(machine_load.items())
        ],
        by_material=[
            {"material": k, "count": int(v["count"]), "kg": round(v["kg"], 2)}
            for k, v in sorted(by_material.items(), key=lambda x: -x[1]["kg"])
        ],
        by_customer=[
            {"customer": k, "count": int(v["count"]), "kg": round(v["kg"], 2)}
            for k, v in sorted(by_customer.items(), key=lambda x: -x[1]["kg"])[:10]
        ],
        delivery_compliance={"on_time": on_time, "late": late, "no_date": no_date},
    )


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return get_dashboard_stats(db)


@router.get("/holidays", response_model=list[HolidayOut])
def list_holidays(year: Optional[int] = Query(None), db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    q = db.query(SlovakHoliday)
    if year:
        q = q.filter(SlovakHoliday.year == year)
    return q.order_by(SlovakHoliday.date).all()
