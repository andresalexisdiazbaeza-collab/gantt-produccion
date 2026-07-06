from __future__ import annotations

from datetime import date
from io import BytesIO
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..export_service import (
    MODULE_BUILDERS,
    build_complete_pdf,
    build_complete_workbook,
    build_complete_zip,
    workbook_to_bytes,
)
from ..models import User
from ..permissions import can_view_module

router = APIRouter(prefix="/export", tags=["export"])

ExportFormat = Literal["xlsx", "pdf", "zip"]
ALL_MODULES = ("dashboard", "gantt", "active_orders", "completed", "optimize", "materials", "machines")

MODULE_PERMISSION = {
    "dashboard": "dashboard",
    "gantt": "gantt",
    "active_orders": "active_orders",
    "completed": "completed",
    "optimize": "optimize",
    "materials": "materials",
    "machines": "machines",
}


def _allowed_modules(user: User) -> list[str]:
    return [m for m in ALL_MODULES if can_view_module(user, MODULE_PERMISSION[m])]


def _require_module(user: User, module: str) -> None:
    perm = MODULE_PERMISSION.get(module)
    if not perm or not can_view_module(user, perm):
        raise HTTPException(403, "No tienes permiso para exportar este módulo")


def _stream_bytes(data: bytes, media_type: str, filename: str) -> StreamingResponse:
    return StreamingResponse(
        BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _xlsx_response(wb, filename: str) -> StreamingResponse:
    return _stream_bytes(
        workbook_to_bytes(wb),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename,
    )


def _pdf_response(data: bytes, filename: str) -> StreamingResponse:
    return _stream_bytes(data, "application/pdf", filename)


def _zip_response(data: bytes, filename: str) -> StreamingResponse:
    return _stream_bytes(data, "application/zip", filename)


def _export_module(
    db: Session,
    user: User,
    module: str,
    fmt: ExportFormat,
    filename_base: str,
) -> StreamingResponse:
    _require_module(user, module)
    if module not in MODULE_BUILDERS:
        raise HTTPException(404, "Módulo no encontrado")
    if fmt == "zip":
        raise HTTPException(400, "format zip solo disponible en /export/complete")
    label, xlsx_fn, pdf_fn = MODULE_BUILDERS[module]
    stamp = date.today().isoformat()
    if fmt == "xlsx":
        return _xlsx_response(xlsx_fn(db), f"{filename_base}_{stamp}.xlsx")
    return _pdf_response(pdf_fn(db), f"{filename_base}_{stamp}.pdf")


@router.get("/dashboard")
def export_dashboard(
    format: ExportFormat = Query("xlsx", alias="format"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _export_module(db, user, "dashboard", format, "dashboard")


@router.get("/gantt")
def export_gantt(
    format: ExportFormat = Query("xlsx", alias="format"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _export_module(db, user, "gantt", format, "gantt")


@router.get("/orders")
def export_orders(
    status: Optional[str] = Query(None, description="activa | terminada"),
    format: ExportFormat = Query("xlsx", alias="format"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    module = "active_orders" if status == "activa" else "completed" if status == "terminada" else "active_orders"
    if status == "terminada":
        module = "completed"
    elif status == "activa" or not status:
        module = "active_orders"
    else:
        raise HTTPException(400, "status debe ser activa o terminada")
    suffix = "ordenes_activas" if module == "active_orders" else "ordenes_terminadas"
    return _export_module(db, user, module, format, suffix)


@router.get("/optimize")
def export_optimize(
    format: ExportFormat = Query("xlsx", alias="format"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _export_module(db, user, "optimize", format, "optimizacion")


@router.get("/materials")
def export_materials(
    format: ExportFormat = Query("xlsx", alias="format"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _export_module(db, user, "materials", format, "materiales")


@router.get("/machines")
def export_machines(
    format: ExportFormat = Query("xlsx", alias="format"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _export_module(db, user, "machines", format, "maquinas")


@router.get("/complete")
def export_complete(
    format: ExportFormat = Query("zip", alias="format"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    modules = _allowed_modules(user)
    if not modules:
        raise HTTPException(403, "No tienes permisos para exportar ningún módulo")
    stamp = date.today().isoformat()
    if format == "xlsx":
        return _xlsx_response(build_complete_workbook(db, modules), f"gantt_produccion_completo_{stamp}.xlsx")
    if format == "pdf":
        return _pdf_response(build_complete_pdf(db, modules), f"gantt_produccion_completo_{stamp}.pdf")
    if format == "zip":
        return _zip_response(build_complete_zip(db, modules), f"gantt_produccion_completo_{stamp}.zip")
    raise HTTPException(400, "format debe ser xlsx, pdf o zip")
