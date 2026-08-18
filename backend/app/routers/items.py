from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..fingerprint import build_fingerprint
from ..models import ItemStatus, MachineConfig, ProductionItem, User
from ..permissions import can_modify_item_field, can_modify_module
from ..schemas import ItemOut, ItemUpdate, ProductionItemCreate
from ..services import item_to_dict, recalculate_item

router = APIRouter(prefix="/items", tags=["items"])

PLANNING_FIELDS = frozenset({"machine_id", "start_date", "pieces", "piece_length"})

FIELD_PERMISSION_MAP = {
    "machine_id": "machine",
    "start_date": "start_date",
    "pieces": "pieces",
    "piece_length": "piece_length",
    "notes": "notes",
    "meters_produced": "meters_produced",
    "comments": "notes",
}


def _check_field_modify(user: User, payload_key: str) -> None:
    perm_key = FIELD_PERMISSION_MAP.get(payload_key)
    if perm_key and not can_modify_item_field(user, perm_key):
        raise HTTPException(403, f"No tienes permiso para modificar {perm_key}")


def _apply_item_update(item: ProductionItem, data: ItemUpdate, user: User) -> None:
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        return

    for key in payload:
        _check_field_modify(user, key)

    if "machine_id" in payload:
        item.machine_id = payload["machine_id"]
    if "start_date" in payload:
        item.start_date = payload["start_date"]
    if "comments" in payload:
        item.comments = payload["comments"]
    if "notes" in payload:
        item.notes = payload["notes"]
    if "meters_produced" in payload:
        produced = payload["meters_produced"]
        if produced is None or produced < 0:
            raise HTTPException(400, "Los metros terminados no pueden ser negativos")
        item.meters_produced = produced
    if "pieces" in payload:
        pieces = payload["pieces"]
        if pieces is None or pieces <= 0:
            raise HTTPException(400, "Las piezas deben ser mayores que 0")
        item.pieces = pieces
    if "piece_length" in payload:
        piece_length = payload["piece_length"]
        if piece_length is None or piece_length <= 0:
            raise HTTPException(400, "La longitud de pieza debe ser mayor que 0")
        item.piece_length = piece_length


@router.post("", response_model=ItemOut, status_code=201)
def create_item(
    data: ProductionItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not can_modify_module(user, "active_orders"):
        raise HTTPException(403, "No tienes permiso para crear órdenes")
    fp = build_fingerprint(data.model_dump())
    if db.query(ProductionItem).filter(ProductionItem.fingerprint == fp).first():
        raise HTTPException(409, "Ya existe una orden con esos mismos datos clave")
    item = ProductionItem(
        fingerprint=fp,
        status=ItemStatus.ACTIVA.value,
        order_number=data.order_number,
        customer=data.customer,
        raw_material=data.raw_material,
        titulo=data.titulo,
        color=data.color,
        treatment=data.treatment,
        order_type=data.order_type,
        braiding=data.braiding,
        model=data.model,
        matriz_mm=data.matriz_mm,
        measure=data.measure,
        meshes=data.meshes,
        knot=data.knot,
        pieces=data.pieces,
        piece_length=data.piece_length,
        kg_totales=data.kg_totales,
        delivery_date=data.delivery_date,
        machine_id=data.machine_id,
        start_date=data.start_date,
        comments=data.comments,
        notes=data.notes,
    )
    if data.machine_id:
        machine = db.get(MachineConfig, data.machine_id)
        if machine:
            item.mts_per_shift = machine.mts_per_shift
    recalculate_item(db, item)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_to_dict(item)


@router.get("", response_model=list[ItemOut])
def list_items(
    status: Optional[str] = Query(None, description="activa | terminada"),
    machine_id: Optional[int] = None,
    customer: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(ProductionItem)
    if status:
        q = q.filter(ProductionItem.status == status)
    if machine_id:
        q = q.filter(ProductionItem.machine_id == machine_id)
    if customer:
        q = q.filter(ProductionItem.customer.ilike(f"%{customer}%"))
    items = q.order_by(ProductionItem.order_number, ProductionItem.id).all()
    return [item_to_dict(i) for i in items]


@router.delete("/all")
def delete_all_items(
    status: Optional[str] = Query(None, description="activa | terminada | omitir para todas"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not can_modify_item_field(user, "delete_all"):
        raise HTTPException(403, "No tienes permiso para borrar órdenes")
    q = db.query(ProductionItem)
    if status:
        q = q.filter(ProductionItem.status == status)
    deleted_count = q.delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": deleted_count}


@router.get("/{item_id}", response_model=ItemOut)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    item = db.get(ProductionItem, item_id)
    if not item:
        raise HTTPException(404, "Ítem no encontrado")
    return item_to_dict(item)


@router.patch("/{item_id}", response_model=ItemOut)
def update_item(
    item_id: int,
    data: ItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.get(ProductionItem, item_id)
    if not item:
        raise HTTPException(404, "Ítem no encontrado")
    if item.status == ItemStatus.TERMINADA.value:
        raise HTTPException(400, "No se puede editar un ítem terminado")

    _apply_item_update(item, data, user)
    recalculate_item(db, item)
    if item.meters_produced is not None and item.total_length is not None and item.meters_produced > item.total_length:
        raise HTTPException(400, "Los metros terminados no pueden superar el total a producir")
    db.commit()
    db.refresh(item)
    return item_to_dict(item)


@router.post("/{item_id}/complete", response_model=ItemOut)
def complete_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not can_modify_item_field(user, "complete"):
        raise HTTPException(403, "No tienes permiso para marcar órdenes como terminadas")
    item = db.get(ProductionItem, item_id)
    if not item:
        raise HTTPException(404, "Ítem no encontrado")
    item.status = ItemStatus.TERMINADA.value
    item.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return item_to_dict(item)


@router.post("/{item_id}/reactivate", response_model=ItemOut)
def reactivate_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not can_modify_module(user, "completed"):
        raise HTTPException(403, "No tienes permiso para reactivar órdenes")
    item = db.get(ProductionItem, item_id)
    if not item:
        raise HTTPException(404, "Ítem no encontrado")
    item.status = ItemStatus.ACTIVA.value
    item.completed_at = None
    recalculate_item(db, item)
    db.commit()
    db.refresh(item)
    return item_to_dict(item)
