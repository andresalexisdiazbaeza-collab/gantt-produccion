from __future__ import annotations

from datetime import date
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from .calculations import calc_working_days
from .holidays import next_workday
from .models import ItemStatus, MachineConfig, ProductionItem
from .optimizer import (
    DEFAULT_CHANGEOVER_SHIFTS,
    MachinePlan,
    SchedulableItem,
    build_metrics,
    optimize_machine_sequence,
    plan_to_dict,
    schedule_current,
)
from .services import get_shrinking, recalculate_item


def _to_schedulable(db: Session, item: ProductionItem, machine: MachineConfig) -> Optional[SchedulableItem]:
    shrinking = get_shrinking(db, item.raw_material)
    mts = machine.mts_per_shift
    shifts = machine.shifts_per_day
    working_days = calc_working_days(
        item.total_length,
        mts,
        shifts,
    )
    if item.piece_length and item.pieces and shrinking:
        working_days = calc_working_days(
            (item.piece_length * item.pieces) / shrinking,
            mts,
            shifts,
        )
    if not working_days or working_days <= 0:
        return None

    return SchedulableItem(
        id=item.id,
        order_number=item.order_number,
        customer=item.customer,
        titulo=item.titulo,
        color=item.color,
        matriz_mm=item.matriz_mm,
        machine_id=machine.id,
        machine_name=machine.name,
        shifts_per_day=shifts,
        changeover_shifts=machine.changeover_shifts or DEFAULT_CHANGEOVER_SHIFTS,
        mts_per_shift=mts,
        working_days=working_days,
        delivery_date=item.delivery_date,
        start_date=item.start_date,
    )


def _machine_anchor(items: List[SchedulableItem], global_anchor: Optional[date] = None) -> date:
    dated = [i.start_date for i in items if i.start_date]
    if dated:
        return min(dated)
    return global_anchor or next_workday()


def build_optimization_preview(
    db: Session,
    global_anchor: Optional[date] = None,
) -> Dict:
    active = (
        db.query(ProductionItem)
        .filter(ProductionItem.status == ItemStatus.ACTIVA.value)
        .all()
    )

    assigned = [i for i in active if i.machine_id]
    unassigned = [i for i in active if not i.machine_id]

    by_machine: Dict[int, List[SchedulableItem]] = {}
    warnings: List[str] = []
    skipped = 0

    for item in assigned:
        machine = db.get(MachineConfig, item.machine_id)
        if not machine:
            warnings.append(f"Ítem {item.order_number}: máquina no encontrada")
            continue
        sched = _to_schedulable(db, item, machine)
        if not sched:
            skipped += 1
            warnings.append(f"Ítem {item.order_number}: sin metros/turnos calculables (omitido)")
            continue
        by_machine.setdefault(machine.id, []).append(sched)

    anchor = global_anchor or next_workday()
    current_plans: List[MachinePlan] = []
    optimized_plans: List[MachinePlan] = []
    all_current_slots = []
    all_optimized_slots = []

    for machine_id, items in sorted(by_machine.items(), key=lambda x: x[1][0].machine_name):
        machine_anchor = _machine_anchor(items, anchor)
        changeover = items[0].changeover_shifts
        current_slots = schedule_current(items, machine_anchor)
        optimized_slots = optimize_machine_sequence(items, machine_anchor)

        current_plan = MachinePlan(
            machine_id=machine_id,
            machine_name=items[0].machine_name,
            anchor_date=machine_anchor,
            changeover_shifts=changeover,
            slots=current_slots,
        )
        optimized_plan = MachinePlan(
            machine_id=machine_id,
            machine_name=items[0].machine_name,
            anchor_date=machine_anchor,
            changeover_shifts=changeover,
            slots=optimized_slots,
        )
        current_plans.append(current_plan)
        optimized_plans.append(optimized_plan)
        all_current_slots.extend(current_slots)
        all_optimized_slots.extend(optimized_slots)

    if unassigned:
        warnings.append(f"{len(unassigned)} ítems sin máquina asignada (no incluidos)")

    return {
        "default_changeover_shifts": DEFAULT_CHANGEOVER_SHIFTS,
        "global_anchor": anchor.isoformat(),
        "unassigned_count": len(unassigned),
        "skipped_count": skipped,
        "warnings": warnings,
        "current": build_metrics(all_current_slots),
        "optimized": build_metrics(all_optimized_slots),
        "current_machines": [plan_to_dict(p) for p in current_plans],
        "optimized_machines": [plan_to_dict(p) for p in optimized_plans],
        "improvement": {
            "changeovers_saved": build_metrics(all_current_slots)["total_changeovers"]
            - build_metrics(all_optimized_slots)["total_changeovers"],
            "setup_shifts_saved": build_metrics(all_current_slots)["total_setup_shifts"]
            - build_metrics(all_optimized_slots)["total_setup_shifts"],
            "late_reduced": build_metrics(all_current_slots)["late"]
            - build_metrics(all_optimized_slots)["late"],
        },
    }


def apply_optimized_schedule(db: Session, global_anchor: Optional[date] = None) -> Dict:
    preview = build_optimization_preview(db, global_anchor)
    applied = 0

    for machine_plan in preview["optimized_machines"]:
        for slot in machine_plan["items"]:
            item = db.get(ProductionItem, slot["id"])
            if not item:
                continue
            item.start_date = date.fromisoformat(slot["start_date"])
            recalculate_item(db, item)
            applied += 1

    db.commit()
    return {
        "applied_count": applied,
        "preview": preview,
    }
