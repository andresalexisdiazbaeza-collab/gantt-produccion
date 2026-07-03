from __future__ import annotations

from datetime import date
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_planning_access
from ..models import User
from ..optimize_service import apply_optimized_schedule, build_optimization_preview

router = APIRouter(prefix="/optimize", tags=["optimize"])


class OptimizeRequest(BaseModel):
    global_anchor: Optional[date] = None


class OptimizeApplyResult(BaseModel):
    applied_count: int
    preview: Dict[str, Any]


@router.get("/preview")
def preview_optimization(
    global_anchor: Optional[date] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = build_optimization_preview(db, global_anchor)
    if not result["optimized_machines"]:
        raise HTTPException(
            400,
            "No hay ítems con máquina asignada para optimizar. Asigna máquinas en Órdenes activas.",
        )
    return result


@router.post("/apply", response_model=OptimizeApplyResult)
def apply_optimization(
    data: OptimizeRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_planning_access),
):
    result = apply_optimized_schedule(db, data.global_anchor)
    if result["applied_count"] == 0:
        raise HTTPException(400, "No se pudo aplicar ningún ítem del plan optimizado")
    return result
