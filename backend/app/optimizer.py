from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

from .calculations import calc_finish_date, calc_working_days
from .holidays import add_workdays, next_workday

DEFAULT_CHANGEOVER_SHIFTS = 3


@dataclass
class SchedulableItem:
    id: int
    order_number: str
    customer: Optional[str]
    titulo: Optional[str]
    color: Optional[str]
    matriz_mm: Optional[float]
    machine_id: int
    machine_name: str
    shifts_per_day: int
    changeover_shifts: int
    mts_per_shift: float
    working_days: float
    delivery_date: Optional[date]
    start_date: Optional[date] = None
    finish_date: Optional[date] = None


@dataclass
class ScheduledSlot:
    item: SchedulableItem
    sequence: int
    start_date: date
    finish_date: date
    setup_shifts: int
    is_late: bool
    days_late: int


@dataclass
class MachinePlan:
    machine_id: int
    machine_name: str
    anchor_date: date
    changeover_shifts: int = DEFAULT_CHANGEOVER_SHIFTS
    slots: List[ScheduledSlot] = field(default_factory=list)

    @property
    def total_changeovers(self) -> int:
        return sum(1 for s in self.slots if s.setup_shifts > 0)

    @property
    def total_setup_shifts(self) -> int:
        return sum(s.setup_shifts for s in self.slots)


def _norm_str(val: Optional[str]) -> str:
    return (val or "").strip().lower()


def _norm_matriz(val: Optional[float]) -> str:
    if val is None:
        return ""
    return f"{val:.4f}".rstrip("0").rstrip(".")


def needs_changeover(prev: SchedulableItem, nxt: SchedulableItem) -> bool:
    if _norm_str(prev.titulo) != _norm_str(nxt.titulo):
        return True
    if _norm_str(prev.color) != _norm_str(nxt.color):
        return True
    return False


def setup_shifts_between(prev: Optional[SchedulableItem], nxt: SchedulableItem) -> int:
    if prev is None:
        return 0
    if needs_changeover(prev, nxt):
        return nxt.changeover_shifts or DEFAULT_CHANGEOVER_SHIFTS
    return 0


def setup_days_between(prev: Optional[SchedulableItem], nxt: SchedulableItem, shifts_per_day: int) -> float:
    shifts = setup_shifts_between(prev, nxt)
    if shifts == 0 or shifts_per_day <= 0:
        return 0.0
    return shifts / shifts_per_day


def _lateness_days(finish: date, delivery: Optional[date]) -> int:
    if delivery is None:
        return 0
    return max(0, (finish - delivery).days)


def _score_candidate(
    prev: Optional[SchedulableItem],
    item: SchedulableItem,
    cursor: date,
    shifts_per_day: int,
) -> Tuple[float, date, date, int]:
    setup = setup_shifts_between(prev, item)
    setup_d = setup / shifts_per_day if setup and shifts_per_day else 0
    start = add_workdays(cursor, setup_d) if prev else cursor
    finish = add_workdays(start, item.working_days)
    late = _lateness_days(finish, item.delivery_date)

    cluster_bonus = 0.0
    if prev:
        same_titulo = _norm_str(prev.titulo) == _norm_str(item.titulo)
        same_color = _norm_str(prev.color) == _norm_str(item.color)
        same_matriz = _norm_matriz(prev.matriz_mm) == _norm_matriz(item.matriz_mm)
        if same_titulo and same_color and same_matriz:
            cluster_bonus = -500.0
        elif same_titulo and same_color:
            cluster_bonus = -200.0

    # Prioritize on-time delivery, then minimize changeovers, prefer same clusters
    score = late * 1000.0 + setup * 50.0 + cluster_bonus
    if item.delivery_date:
        days_to_deadline = (item.delivery_date - cursor).days
        if days_to_deadline < 0:
            score += abs(days_to_deadline) * 200.0

    return score, start, finish, setup


def optimize_machine_sequence(items: List[SchedulableItem], anchor: date) -> List[ScheduledSlot]:
    if not items:
        return []

    shifts_per_day = items[0].shifts_per_day or 2
    remaining = [i for i in items if i.working_days and i.working_days > 0]
    remaining.sort(key=lambda i: (i.delivery_date or date.max, i.order_number))

    slots: List[ScheduledSlot] = []
    cursor = anchor
    prev: Optional[SchedulableItem] = None
    seq = 0

    while remaining:
        best_idx = 0
        best_score = float("inf")
        best_start = anchor
        best_finish = anchor
        best_setup = 0

        for idx, candidate in enumerate(remaining):
            score, start, finish, setup = _score_candidate(prev, candidate, cursor, shifts_per_day)
            if score < best_score:
                best_score = score
                best_idx = idx
                best_start = start
                best_finish = finish
                best_setup = setup

        item = remaining.pop(best_idx)
        seq += 1
        late = _lateness_days(best_finish, item.delivery_date)
        slots.append(
            ScheduledSlot(
                item=item,
                sequence=seq,
                start_date=best_start,
                finish_date=best_finish,
                setup_shifts=best_setup,
                is_late=late > 0,
                days_late=late,
            )
        )
        cursor = best_finish
        prev = item

    return slots


def schedule_current(items: List[SchedulableItem], anchor: date) -> List[ScheduledSlot]:
    """Build current plan from existing start dates, ordered by start_date per machine."""
    by_start = sorted(
        [i for i in items if i.start_date and i.working_days],
        key=lambda i: (i.start_date, i.order_number),
    )
    slots: List[ScheduledSlot] = []
    prev: Optional[SchedulableItem] = None
    for seq, item in enumerate(by_start, 1):
        start = item.start_date or anchor
        finish = calc_finish_date(start, item.working_days) or start
        setup = setup_shifts_between(prev, item) if prev else 0
        late = _lateness_days(finish, item.delivery_date)
        slots.append(
            ScheduledSlot(
                item=item,
                sequence=seq,
                start_date=start,
                finish_date=finish,
                setup_shifts=setup,
                is_late=late > 0,
                days_late=late,
            )
        )
        prev = item
    return slots


def build_metrics(slots: List[ScheduledSlot]) -> Dict[str, Any]:
    on_time = sum(1 for s in slots if s.item.delivery_date and not s.is_late)
    late = sum(1 for s in slots if s.is_late)
    no_date = sum(1 for s in slots if not s.item.delivery_date)
    return {
        "scheduled_count": len(slots),
        "on_time": on_time,
        "late": late,
        "no_delivery_date": no_date,
        "total_changeovers": sum(1 for s in slots if s.setup_shifts > 0),
        "total_setup_shifts": sum(s.setup_shifts for s in slots),
    }


def slot_to_dict(slot: ScheduledSlot) -> Dict[str, Any]:
    item = slot.item
    return {
        "id": item.id,
        "order_number": item.order_number,
        "customer": item.customer,
        "titulo": item.titulo,
        "color": item.color,
        "matriz_mm": item.matriz_mm,
        "machine_id": item.machine_id,
        "machine_name": item.machine_name,
        "sequence": slot.sequence,
        "start_date": slot.start_date.isoformat(),
        "finish_date": slot.finish_date.isoformat(),
        "delivery_date": item.delivery_date.isoformat() if item.delivery_date else None,
        "working_days": item.working_days,
        "setup_shifts": slot.setup_shifts,
        "is_late": slot.is_late,
        "days_late": slot.days_late,
    }


def plan_to_dict(plan: MachinePlan) -> Dict[str, Any]:
    return {
        "machine_id": plan.machine_id,
        "machine_name": plan.machine_name,
        "anchor_date": plan.anchor_date.isoformat(),
        "changeover_shifts": plan.changeover_shifts,
        "total_changeovers": plan.total_changeovers,
        "total_setup_shifts": plan.total_setup_shifts,
        "items": [slot_to_dict(s) for s in plan.slots],
    }
