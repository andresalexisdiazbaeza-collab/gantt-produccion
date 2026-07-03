from __future__ import annotations

from datetime import date
from typing import Any, Optional

from .holidays import add_workdays


def calc_total_length(piece_length: Optional[float], pieces: Optional[float], shrinking: float) -> Optional[float]:
    if piece_length is None or pieces is None or shrinking <= 0:
        return None
    return round(piece_length * pieces / shrinking, 4)


def calc_working_days(total_length: Optional[float], mts_per_shift: Optional[float], shifts: Optional[int]) -> Optional[float]:
    if not total_length or total_length <= 0 or not mts_per_shift or not shifts or mts_per_shift <= 0 or shifts <= 0:
        return None
    return round(total_length / mts_per_shift / shifts, 5)


def calc_remaining_length(total_length: Optional[float], meters_produced: Optional[float]) -> Optional[float]:
    if total_length is None:
        return None
    produced = meters_produced or 0
    return round(max(0.0, total_length - produced), 4)


def calc_finish_date(start_date: Optional[date], working_days: Optional[float]) -> Optional[date]:
    if start_date is None or working_days is None:
        return None
    return add_workdays(start_date, working_days)


def apply_calculations(
    *,
    piece_length: Optional[float],
    pieces: Optional[float],
    shrinking: float,
    mts_per_shift: Optional[float],
    shifts: Optional[int],
    start_date: Optional[date],
    meters_produced: Optional[float] = 0,
) -> dict[str, Any]:
    total_length = calc_total_length(piece_length, pieces, shrinking)
    remaining = calc_remaining_length(total_length, meters_produced)
    working_days = calc_working_days(remaining, mts_per_shift, shifts)
    finish_date = calc_finish_date(start_date, working_days)
    return {
        "shrinking": shrinking,
        "total_length": total_length,
        "working_days": working_days,
        "mts_per_shift": mts_per_shift,
        "shifts": shifts,
        "finish_date": finish_date,
    }
