from __future__ import annotations

import os
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..catalog_parser import parse_title_material_excel
from ..database import get_db
from ..deps import get_current_user
from ..models import OrderFieldOption, ProductionItem, TitleMaterialCatalog, User
from ..permissions import can_modify_module

router = APIRouter(prefix="/catalog", tags=["catalog"])

OPTION_CATEGORIES = ("braiding", "model", "meshes", "knot", "order_type")
FIELD_MAP = {
    "braiding": ProductionItem.braiding,
    "model": ProductionItem.model,
    "meshes": ProductionItem.meshes,
    "knot": ProductionItem.knot,
    "order_type": ProductionItem.order_type,
}


class TitleMaterialOut(BaseModel):
    id: int
    titulo: str
    material: str

    class Config:
        from_attributes = True


class OptionOut(BaseModel):
    id: int
    category: str
    value: str

    class Config:
        from_attributes = True


class CatalogOut(BaseModel):
    title_materials: list[TitleMaterialOut]
    options: dict[str, list[str]]


class OptionCreate(BaseModel):
    category: str
    value: str


def _fmt_option(val: object) -> str:
    if val is None:
        return ""
    if isinstance(val, float) and val == int(val):
        return str(int(val))
    s = str(val).strip()
    return s


def _sync_options_from_items(db: Session) -> None:
    """Seed dropdown lists from distinct production item values when empty."""
    for cat in OPTION_CATEGORIES:
        if db.query(OrderFieldOption).filter(OrderFieldOption.category == cat).first():
            continue
        col = FIELD_MAP[cat]
        rows = db.query(col).filter(col.isnot(None)).distinct().all()
        seen: set[str] = set()
        for (val,) in rows:
            s = _fmt_option(val)
            if not s or s in ("-", "—") or s in seen:
                continue
            seen.add(s)
            db.add(OrderFieldOption(category=cat, value=s))


def _sync_title_materials_from_items(db: Session) -> None:
    if db.query(TitleMaterialCatalog).first():
        return
    rows = (
        db.query(ProductionItem.titulo, ProductionItem.raw_material)
        .filter(ProductionItem.titulo.isnot(None), ProductionItem.raw_material.isnot(None))
        .distinct()
        .all()
    )
    seen: set[tuple[str, str]] = set()
    for titulo, material in rows:
        t = (titulo or "").strip()
        m = (material or "").strip().upper()
        if not t or not m:
            continue
        key = (t, m)
        if key in seen:
            continue
        seen.add(key)
        db.add(TitleMaterialCatalog(titulo=t, material=m))


@router.get("", response_model=CatalogOut)
def get_catalog(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    _sync_options_from_items(db)
    _sync_title_materials_from_items(db)
    db.commit()
    title_materials = db.query(TitleMaterialCatalog).order_by(TitleMaterialCatalog.titulo).all()
    options: dict[str, list[str]] = {c: [] for c in OPTION_CATEGORIES}
    for opt in db.query(OrderFieldOption).order_by(OrderFieldOption.category, OrderFieldOption.value).all():
        if opt.category in options:
            options[opt.category].append(opt.value)
    return CatalogOut(title_materials=title_materials, options=options)


@router.post("/title-materials/import")
async def import_title_materials(
    file: UploadFile = File(...),
    replace: bool = Query(False, description="Replace entire catalog"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not can_modify_module(user, "import") and not can_modify_module(user, "materials"):
        raise HTTPException(403, "No tienes permiso para importar catálogo")
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(400, "Sube un archivo Excel (.xlsx)")
    suffix = os.path.splitext(file.filename)[1] or ".xlsx"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        rows = parse_title_material_excel(tmp_path)
    finally:
        os.unlink(tmp_path)
    if not rows:
        raise HTTPException(400, "No se encontraron filas title/material en el Excel")
    if replace:
        db.query(TitleMaterialCatalog).delete(synchronize_session=False)
    existing = {(r.titulo, r.material) for r in db.query(TitleMaterialCatalog).all()}
    added = 0
    for row in rows:
        key = (row["titulo"], row["material"])
        if key in existing:
            continue
        db.add(TitleMaterialCatalog(titulo=row["titulo"], material=row["material"]))
        existing.add(key)
        added += 1
    db.commit()
    return {"imported_count": added, "total_count": len(existing), "parsed_rows": len(rows)}


@router.post("/options", response_model=OptionOut, status_code=201)
def add_option(data: OptionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not can_modify_module(user, "materials"):
        raise HTTPException(403, "No tienes permiso")
    cat = data.category.strip().lower()
    if cat not in OPTION_CATEGORIES:
        raise HTTPException(400, f"Categoría inválida. Usa: {', '.join(OPTION_CATEGORIES)}")
    val = data.value.strip()
    if not val:
        raise HTTPException(400, "Valor vacío")
    dup = (
        db.query(OrderFieldOption)
        .filter(OrderFieldOption.category == cat, OrderFieldOption.value == val)
        .first()
    )
    if dup:
        return dup
    opt = OrderFieldOption(category=cat, value=val)
    db.add(opt)
    db.commit()
    db.refresh(opt)
    return opt


@router.delete("/options/{option_id}", status_code=204)
def delete_option(option_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not can_modify_module(user, "materials"):
        raise HTTPException(403, "No tienes permiso")
    opt = db.get(OrderFieldOption, option_id)
    if not opt:
        raise HTTPException(404, "Opción no encontrada")
    db.delete(opt)
    db.commit()
