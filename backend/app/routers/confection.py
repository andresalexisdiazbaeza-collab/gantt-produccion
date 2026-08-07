from __future__ import annotations

import os
import tempfile
from datetime import date, datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..confection_import_parser import parse_confection_finished, parse_confection_orders
from ..confection_optimize import apply_confection_optimization, build_confection_optimize_preview
from ..confection_services import confection_fingerprint, confection_item_to_dict, recalculate_confection_item
from ..database import get_db
from ..deps import get_current_user
from ..models import ConfectionItem, ConfectionTeam, ImportLog, ItemStatus, User
from ..permissions import can_modify_module, can_view_module

router = APIRouter(prefix="/confection", tags=["confection"])


class TeamCreate(BaseModel):
    name: str
    workers: int = 4
    hours_daily: float = 7.5
    extra_hours_day: float = 0.0
    active: bool = True


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    workers: Optional[int] = None
    hours_daily: Optional[float] = None
    extra_hours_day: Optional[float] = None
    active: Optional[bool] = None


class TeamOut(BaseModel):
    id: int
    name: str
    workers: int
    hours_daily: float
    extra_hours_day: float
    active: bool

    class Config:
        from_attributes = True


class ItemUpdate(BaseModel):
    team_id: Optional[int] = None
    workers_assigned: Optional[int] = None
    team_hours: Optional[float] = None
    start_date: Optional[date] = None
    pct_done: Optional[float] = Field(None, ge=0, le=100)
    comments: Optional[str] = None
    total_hours: Optional[float] = None


def _require_view(user: User, module: str) -> None:
    if not can_view_module(user, module):
        raise HTTPException(403, f"No tienes permiso para ver {module}")


def _require_modify(user: User, module: str) -> None:
    if not can_modify_module(user, module):
        raise HTTPException(403, f"No tienes permiso para modificar {module}")


# ---- Teams ----
@router.get("/teams", response_model=list[TeamOut])
def list_teams(active_only: bool = False, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_view(user, "confection_teams")
    q = db.query(ConfectionTeam)
    if active_only:
        q = q.filter(ConfectionTeam.active.is_(True))
    return q.order_by(ConfectionTeam.name).all()


@router.post("/teams", response_model=TeamOut, status_code=201)
def create_team(data: TeamCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_modify(user, "confection_teams")
    if db.query(ConfectionTeam).filter(ConfectionTeam.name == data.name).first():
        raise HTTPException(400, "Equipo ya existe")
    team = ConfectionTeam(**data.model_dump())
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@router.put("/teams/{team_id}", response_model=TeamOut)
def update_team(team_id: int, data: TeamUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_modify(user, "confection_teams")
    team = db.get(ConfectionTeam, team_id)
    if not team:
        raise HTTPException(404, "Equipo no encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(team, k, v)
    db.commit()
    db.refresh(team)
    return team


@router.delete("/teams/{team_id}", status_code=204)
def delete_team(team_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_modify(user, "confection_teams")
    team = db.get(ConfectionTeam, team_id)
    if not team:
        raise HTTPException(404, "Equipo no encontrado")
    db.delete(team)
    db.commit()


# ---- Items ----
@router.get("/items")
def list_items(
    status: Optional[str] = Query(None),
    team_id: Optional[int] = None,
    customer: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if status == ItemStatus.TERMINADA.value:
        _require_view(user, "confection_completed")
    else:
        _require_view(user, "confection_orders")
    q = db.query(ConfectionItem)
    if status:
        q = q.filter(ConfectionItem.status == status)
    if team_id:
        q = q.filter(ConfectionItem.team_id == team_id)
    if customer:
        q = q.filter(ConfectionItem.customer.ilike(f"%{customer}%"))
    items = q.order_by(ConfectionItem.po_number, ConfectionItem.id).all()
    return [confection_item_to_dict(i) for i in items]


@router.delete("/items/all")
def delete_all_items(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_modify(user, "confection_orders")
    q = db.query(ConfectionItem)
    if status:
        q = q.filter(ConfectionItem.status == status)
    deleted = q.delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": deleted}


@router.patch("/items/{item_id}")
def update_item(item_id: int, data: ItemUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_modify(user, "confection_orders")
    item = db.get(ConfectionItem, item_id)
    if not item:
        raise HTTPException(404, "Ítem no encontrado")
    if item.status == ItemStatus.TERMINADA.value:
        raise HTTPException(400, "No se puede editar un ítem terminado")
    payload = data.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(item, k, v)
    recalculate_confection_item(db, item)
    db.commit()
    db.refresh(item)
    return confection_item_to_dict(item)


@router.post("/items/{item_id}/complete")
def complete_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_modify(user, "confection_orders")
    item = db.get(ConfectionItem, item_id)
    if not item:
        raise HTTPException(404, "Ítem no encontrado")
    item.status = ItemStatus.TERMINADA.value
    item.pct_done = 100.0
    item.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return confection_item_to_dict(item)


@router.post("/items/{item_id}/reactivate")
def reactivate_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_modify(user, "confection_completed")
    item = db.get(ConfectionItem, item_id)
    if not item:
        raise HTTPException(404, "Ítem no encontrado")
    item.status = ItemStatus.ACTIVA.value
    item.completed_at = None
    if (item.pct_done or 0) >= 100:
        item.pct_done = 0.0
    recalculate_confection_item(db, item)
    db.commit()
    db.refresh(item)
    return confection_item_to_dict(item)


# ---- Import ----
@router.post("/import")
async def import_confection(
    file: UploadFile = File(...),
    include_finished: bool = Query(True),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_modify(user, "confection_import")
    suffix = os.path.splitext(file.filename or "confection.xlsx")[1] or ".xlsx"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        path = tmp.name
    try:
        orders = parse_confection_orders(path)
        finished = parse_confection_finished(path) if include_finished else []
    except Exception as exc:
        os.unlink(path)
        raise HTTPException(400, str(exc)) from exc
    finally:
        if os.path.exists(path):
            os.unlink(path)

    new_count = 0
    updated_count = 0
    skipped_count = 0
    seen: dict[str, ConfectionItem] = {}

    def upsert(row: dict[str, Any], force_status: Optional[str] = None) -> None:
        nonlocal new_count, updated_count, skipped_count
        fp = confection_fingerprint(row["po_number"], row.get("id_code"), row.get("tag_numbers"), row.get("pcs_label"))
        existing = seen.get(fp) or db.query(ConfectionItem).filter(ConfectionItem.fingerprint == fp).first()
        status = force_status or row.get("status") or ItemStatus.ACTIVA.value
        if existing:
            for key, value in row.items():
                if key in ("status", "completed_at", "pct_done") and status == ItemStatus.ACTIVA.value and existing.status == ItemStatus.TERMINADA.value:
                    continue
                if hasattr(existing, key) and value is not None:
                    setattr(existing, key, value)
            if status == ItemStatus.TERMINADA.value:
                existing.status = ItemStatus.TERMINADA.value
                existing.pct_done = 100.0
                if row.get("completed_at"):
                    existing.completed_at = datetime.combine(row["completed_at"], datetime.min.time())
            recalculate_confection_item(db, existing)
            seen[fp] = existing
            updated_count += 1
            return
        item = ConfectionItem(
            fingerprint=fp,
            status=status,
            pcs_label=row.get("pcs_label"),
            quantity=row.get("quantity"),
            po_number=row["po_number"],
            purchase_order=row.get("purchase_order"),
            id_code=row.get("id_code"),
            customer=row.get("customer"),
            tag_numbers=row.get("tag_numbers"),
            circumference=row.get("circumference"),
            height=row.get("height"),
            cage_type=row.get("cage_type"),
            mesh_mm=row.get("mesh_mm"),
            twine_size=row.get("twine_size"),
            color=row.get("color"),
            product_type=row.get("product_type"),
            received_date=row.get("received_date"),
            payment_terms=row.get("payment_terms"),
            requested_delivery_text=row.get("requested_delivery_text"),
            delivery_offered=row.get("delivery_offered"),
            netting_ready_date=row.get("netting_ready_date"),
            netting_status=row.get("netting_status"),
            kg_cage=row.get("kg_cage"),
            netting_m2=row.get("netting_m2"),
            netting_kg=row.get("netting_kg"),
            total_hours=row.get("total_hours"),
            coating_hours=row.get("coating_hours"),
            real_hours=row.get("real_hours"),
            pct_done=row.get("pct_done") or 0.0,
        )
        if status == ItemStatus.TERMINADA.value and row.get("completed_at"):
            item.completed_at = datetime.combine(row["completed_at"], datetime.min.time())
        recalculate_confection_item(db, item)
        db.add(item)
        seen[fp] = item
        new_count += 1

    for row in orders:
        upsert(row, ItemStatus.ACTIVA.value)
    for row in finished:
        upsert(row, ItemStatus.TERMINADA.value)

    if new_count == 0 and updated_count == 0:
        skipped_count = len(orders) + len(finished)

    db.add(
        ImportLog(
            filename=file.filename or "confection.xlsx",
            new_count=new_count,
            updated_count=updated_count,
            skipped_count=skipped_count,
            details=f"confection orders={len(orders)} finished={len(finished)}",
        )
    )
    db.commit()
    return {
        "new_count": new_count,
        "updated_count": updated_count,
        "skipped_count": skipped_count,
        "orders_parsed": len(orders),
        "finished_parsed": len(finished),
    }


# ---- Dashboard ----
@router.get("/dashboard")
def confection_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_view(user, "confection_dashboard")
    active = db.query(ConfectionItem).filter(ConfectionItem.status == ItemStatus.ACTIVA.value).all()
    completed = db.query(ConfectionItem).filter(ConfectionItem.status == ItemStatus.TERMINADA.value).count()
    teams_active = db.query(ConfectionTeam).filter(ConfectionTeam.active.is_(True)).count()

    total_hours = 0.0
    pct_sum = 0.0
    team_load: dict[str, dict[str, float]] = {}
    by_type: dict[str, dict[str, float]] = {}
    by_customer: dict[str, dict[str, float]] = {}
    on_time = late = no_date = 0

    for item in active:
        total_hours += item.total_hours or 0
        pct_sum += item.pct_done or 0
        name = item.team.name if item.team else "Sin asignar"
        load = team_load.setdefault(name, {"working_days": 0.0, "hours": 0.0})
        load["working_days"] += item.working_days or 0
        load["hours"] += item.total_hours or 0

        tkey = item.product_type or "N/A"
        typ = by_type.setdefault(tkey, {"count": 0, "hours": 0.0})
        typ["count"] += 1
        typ["hours"] += item.total_hours or 0

        ckey = item.customer or "N/A"
        cust = by_customer.setdefault(ckey, {"count": 0, "hours": 0.0})
        cust["count"] += 1
        cust["hours"] += item.total_hours or 0

        d = confection_item_to_dict(item)
        if d["delivery_status"] == "late":
            late += 1
        elif d["delivery_status"] == "on_time":
            on_time += 1
        else:
            no_date += 1

    avg_pct = round(pct_sum / len(active), 1) if active else 0.0
    return {
        "active_count": len(active),
        "completed_count": completed,
        "teams_active": teams_active,
        "total_hours": round(total_hours, 1),
        "avg_pct_done": avg_pct,
        "team_load": [
            {"team": k, "working_days": round(v["working_days"], 2), "hours": round(v["hours"], 1)}
            for k, v in sorted(team_load.items())
        ],
        "by_type": [
            {"type": k, "count": int(v["count"]), "hours": round(v["hours"], 1)}
            for k, v in sorted(by_type.items(), key=lambda x: -x[1]["hours"])
        ],
        "by_customer": [
            {"customer": k, "count": int(v["count"]), "hours": round(v["hours"], 1)}
            for k, v in sorted(by_customer.items(), key=lambda x: -x[1]["hours"])[:10]
        ],
        "delivery_compliance": {"on_time": on_time, "late": late, "no_date": no_date},
    }


# ---- Optimize ----
@router.get("/optimize/preview")
def optimize_preview(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_view(user, "confection_optimize")
    return build_confection_optimize_preview(db)


@router.post("/optimize/apply")
def optimize_apply(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _require_modify(user, "confection_optimize")
    applied = apply_confection_optimization(db)
    return {"applied_count": applied}


# ---- Export Excel / PDF ----
@router.get("/export")
def export_confection(
    status: Optional[str] = Query("activa"),
    format: str = Query("xlsx"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_view(user, "confection_orders")
    from datetime import datetime
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    from openpyxl import Workbook
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    from reportlab.lib import colors

    if format not in ("xlsx", "pdf"):
        raise HTTPException(400, "format debe ser xlsx o pdf")

    q = db.query(ConfectionItem)
    if status:
        q = q.filter(ConfectionItem.status == status)
    items = q.order_by(ConfectionItem.po_number).all()
    rows_data = [confection_item_to_dict(item) for item in items]
    headers = [
        "PO", "Cliente", "ID", "Tipo", "Jaula", "mm/HM", "Horas", "Equipo",
        "Trabajadores", "Inicio", "Fin", "%", "Entrega", "Estado entrega", "Status",
    ]

    def _row(d: dict):
        return [
            d["po_number"], d["customer"], d["id_code"], d["product_type"], d["cage_type"],
            d["mesh_mm"], d["total_hours"], d["team_name"], d["workers_assigned"],
            d["start_date"], d["finish_date"], d["pct_done"], d["delivery_offered"],
            d["delivery_status"], d["status"],
        ]

    if format == "xlsx":
        wb = Workbook()
        ws = wb.active
        ws.title = "Confeccion"
        ws.append(headers)
        for d in rows_data:
            ws.append(_row(d))
        buf = BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=confection.xlsx"},
        )

    # PDF
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=1 * cm, rightMargin=1 * cm)
    styles = getSampleStyleSheet()
    pdf_headers = ["PO", "Cliente", "Tipo", "Horas", "Equipo", "Inicio", "Fin", "%", "Entrega", "Retraso"]
    pdf_rows = [[
        d["po_number"], d["customer"], d["product_type"], d["total_hours"], d["team_name"],
        d["start_date"], d["finish_date"], d["pct_done"], d["delivery_offered"], d["delivery_status"],
    ] for d in rows_data[:200]]
    table = Table([pdf_headers] + pdf_rows, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0fdfa")]),
    ]))
    story = [
        Paragraph("Gantt Confección — Órdenes", styles["Title"]),
        Paragraph(f"Registros: {len(rows_data)} · {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles["Normal"]),
        Spacer(1, 0.3 * cm),
        table,
    ]
    if len(rows_data) > 200:
        story.append(Paragraph(f"... y {len(rows_data) - 200} más (ver Excel completo)", styles["Italic"]))
    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=confection.pdf"},
    )
