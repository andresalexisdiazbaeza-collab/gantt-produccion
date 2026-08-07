from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from .confection_calculations import calc_working_days_hours, calc_team_hours
from .confection_services import recalculate_confection_item, team_capacity_hours
from .holidays import add_workdays, next_workday
from .models import ConfectionItem, ConfectionTeam, ItemStatus


def _schedule_team(
    items: List[ConfectionItem],
    team: ConfectionTeam,
    anchor: date,
) -> List[dict[str, Any]]:
    cursor = anchor
    slots: List[dict[str, Any]] = []
    for item in sorted(items, key=lambda i: (i.delivery_offered or date.max, i.po_number, i.id)):
        workers = item.workers_assigned or team.workers
        team_hours = item.team_hours or calc_team_hours(workers, team.hours_daily, team.extra_hours_day)
        days = calc_working_days_hours(item.total_hours, team_hours, item.pct_done or 0.0) or 0.0
        start = cursor
        finish = add_workdays(start, days) if days > 0 else start
        late = bool(item.delivery_offered and finish > item.delivery_offered)
        slots.append(
            {
                "id": item.id,
                "po_number": item.po_number,
                "customer": item.customer,
                "id_code": item.id_code,
                "team_id": team.id,
                "team_name": team.name,
                "start_date": start.isoformat(),
                "finish_date": finish.isoformat(),
                "working_days": days,
                "delivery_offered": item.delivery_offered.isoformat() if item.delivery_offered else None,
                "is_late": late,
                "total_hours": item.total_hours,
            }
        )
        cursor = add_workdays(finish, 0.01) if days > 0 else next_workday(finish)
    return slots


def build_confection_optimize_preview(db: Session, global_anchor: Optional[date] = None) -> Dict[str, Any]:
    active = (
        db.query(ConfectionItem)
        .filter(ConfectionItem.status == ItemStatus.ACTIVA.value)
        .all()
    )
    teams = {t.id: t for t in db.query(ConfectionTeam).filter(ConfectionTeam.active.is_(True)).all()}
    assigned = [i for i in active if i.team_id and i.team_id in teams]
    unassigned = [i for i in active if not i.team_id or i.team_id not in teams]
    anchor = global_anchor or next_workday()

    by_team: Dict[int, List[ConfectionItem]] = {}
    for item in assigned:
        by_team.setdefault(item.team_id, []).append(item)

    current_slots: List[dict[str, Any]] = []
    optimized_slots: List[dict[str, Any]] = []
    for team_id, items in by_team.items():
        team = teams[team_id]
        # current: keep existing order by start_date then id
        current_order = sorted(items, key=lambda i: (i.start_date or date.max, i.id))
        optimized_order = sorted(items, key=lambda i: (i.delivery_offered or date.max, -(i.total_hours or 0), i.id))
        current_slots.extend(_schedule_team(current_order, team, anchor))
        optimized_slots.extend(_schedule_team(optimized_order, team, anchor))

    def metrics(slots: List[dict[str, Any]]) -> dict[str, Any]:
        late = sum(1 for s in slots if s["is_late"])
        on_time = sum(1 for s in slots if s["delivery_offered"] and not s["is_late"])
        return {
            "scheduled": len(slots),
            "on_time": on_time,
            "late": late,
            "unassigned": len(unassigned),
        }

    return {
        "anchor_date": anchor.isoformat(),
        "current": {"slots": current_slots, "metrics": metrics(current_slots)},
        "optimized": {"slots": optimized_slots, "metrics": metrics(optimized_slots)},
        "unassigned": [
            {"id": i.id, "po_number": i.po_number, "customer": i.customer, "id_code": i.id_code}
            for i in unassigned
        ],
        "capacity": [
            {
                "team_id": t.id,
                "team_name": t.name,
                "daily_hours": team_capacity_hours(t),
                "workers": t.workers,
            }
            for t in teams.values()
        ],
    }


def apply_confection_optimization(db: Session, global_anchor: Optional[date] = None) -> int:
    preview = build_confection_optimize_preview(db, global_anchor)
    applied = 0
    by_id = {s["id"]: s for s in preview["optimized"]["slots"]}
    for item_id, slot in by_id.items():
        item = db.get(ConfectionItem, item_id)
        if not item:
            continue
        item.start_date = date.fromisoformat(slot["start_date"])
        recalculate_confection_item(db, item)
        applied += 1
    db.commit()
    return applied
