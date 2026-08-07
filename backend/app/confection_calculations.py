from __future__ import annotations

from datetime import date
from typing import Any, Optional

from .calculations import calc_delivery_compliance, calc_finish_date


def calc_team_hours(workers: Optional[int], hours_daily: float = 7.5, extra: float = 0.0) -> Optional[float]:
    if not workers or workers <= 0:
        return None
    return round(workers * (hours_daily + (extra or 0.0)), 4)


def calc_working_days_hours(total_hours: Optional[float], team_hours: Optional[float], pct_done: float = 0.0) -> Optional[float]:
    if not total_hours or total_hours <= 0 or not team_hours or team_hours <= 0:
        return None
    remaining = total_hours * max(0.0, 1.0 - min(100.0, pct_done or 0.0) / 100.0)
    if remaining <= 0:
        return 0.0
    return round(remaining / team_hours, 5)


def apply_confection_calculations(
    *,
    total_hours: Optional[float],
    workers_assigned: Optional[int],
    hours_daily: float = 7.5,
    extra_hours_day: float = 0.0,
    team_hours_override: Optional[float] = None,
    start_date: Optional[date] = None,
    pct_done: float = 0.0,
    delivery_offered: Optional[date] = None,
) -> dict[str, Any]:
    team_hours = team_hours_override if team_hours_override and team_hours_override > 0 else calc_team_hours(
        workers_assigned, hours_daily, extra_hours_day
    )
    working_days = calc_working_days_hours(total_hours, team_hours, pct_done)
    finish_date = calc_finish_date(start_date, working_days)
    compliance = calc_delivery_compliance(finish_date, delivery_offered)
    return {
        "team_hours": team_hours,
        "working_days": working_days,
        "finish_date": finish_date,
        **compliance,
    }
