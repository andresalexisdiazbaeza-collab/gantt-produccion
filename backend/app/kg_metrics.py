from __future__ import annotations

from typing import Optional, TypedDict


class OrderKgMetrics(TypedDict):
    kg_per_meter: Optional[float]
    planned_kg: Optional[float]
    produced_kg: Optional[float]
    remaining_kg: Optional[float]


def calc_order_kg_metrics(
    *,
    kg_totales: Optional[float],
    total_length: Optional[float],
    meters_produced: Optional[float] = 0,
) -> OrderKgMetrics:
    if not kg_totales or not total_length or total_length <= 0:
        return {
            "kg_per_meter": None,
            "planned_kg": kg_totales,
            "produced_kg": None,
            "remaining_kg": None,
        }

    produced_meters = max(0.0, meters_produced or 0)
    kg_per_meter = kg_totales / total_length
    remaining_meters = max(0.0, total_length - produced_meters)

    return {
        "kg_per_meter": round(kg_per_meter, 6),
        "planned_kg": round(kg_totales, 2),
        "produced_kg": round(produced_meters * kg_per_meter, 2),
        "remaining_kg": round(remaining_meters * kg_per_meter, 2),
    }
