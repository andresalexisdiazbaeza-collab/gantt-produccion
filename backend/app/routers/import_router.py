import json
from pathlib import Path
from typing import Dict, Optional, Tuple

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_planning_access
from ..models import User
from ..fingerprint import build_fingerprint, build_loose_key, build_match_key
from ..import_parser import parse_nuevo_formato, parse_production_gantt
from ..models import ImportLog, ItemStatus, MachineConfig, ProductionItem
from ..schemas import ImportResult, PlanningImportResult
from ..services import get_shrinking, recalculate_item

router = APIRouter(prefix="/import", tags=["import"])

FIELDS = [
    "raw_material", "titulo", "customer", "order_number", "order_type",
    "braiding", "knot", "model", "matriz_mm", "measure", "meshes", "color",
    "treatment", "pieces", "piece_length", "kg_totales", "delivered",
    "delivery_date", "source_status",
]

DEFAULT_GANTT_PATH = Path("/Users/andresdiaz/Desktop/Production gantt2.xlsx")


def _build_item_lookup(db: Session) -> Tuple[Dict[str, ProductionItem], Dict[str, ProductionItem], Dict[str, ProductionItem]]:
    by_fp: Dict[str, ProductionItem] = {}
    by_key: Dict[str, ProductionItem] = {}
    by_loose: Dict[str, ProductionItem] = {}
    for item in db.query(ProductionItem).filter(
        ProductionItem.status.in_([ItemStatus.ACTIVA.value, ItemStatus.TERMINADA.value])
    ):
        data = {
            "order_number": item.order_number,
            "raw_material": item.raw_material,
            "titulo": item.titulo,
            "customer": item.customer,
            "matriz_mm": item.matriz_mm,
            "meshes": item.meshes,
            "color": item.color,
            "treatment": item.treatment,
            "pieces": item.pieces,
            "piece_length": item.piece_length,
            "kg_totales": item.kg_totales,
        }
        by_fp[build_fingerprint(data)] = item
        by_key[build_match_key(data)] = item
        by_loose[build_loose_key(data)] = item
    return by_fp, by_key, by_loose


def _find_item(
    row: dict,
    by_fp: Dict[str, ProductionItem],
    by_key: Dict[str, ProductionItem],
    by_loose: Dict[str, ProductionItem],
) -> Optional[ProductionItem]:
    item = by_fp.get(build_fingerprint(row))
    if item:
        return item
    item = by_key.get(build_match_key(row))
    if item:
        return item
    return by_loose.get(build_loose_key(row))


def _resolve_machine(db: Session, machine_name: Optional[str]) -> Optional[MachineConfig]:
    if not machine_name:
        return None
    name = str(machine_name).strip()
    machine = db.query(MachineConfig).filter(MachineConfig.name == name).first()
    if machine:
        return machine
    try:
        return db.query(MachineConfig).filter(MachineConfig.name == str(int(float(name)))).first()
    except (TypeError, ValueError):
        return None


def _apply_gantt_planning(
    db: Session,
    rows: list[dict],
    filename: str,
) -> PlanningImportResult:
    by_fp, by_key, by_loose = _build_item_lookup(db)
    matched_count = 0
    updated_count = 0
    not_found_count = 0
    machine_assigned = 0
    dates_assigned = 0
    comments_assigned = 0
    details: list[str] = []

    for row in rows:
        item = _find_item(row, by_fp, by_key, by_loose)
        if not item:
            not_found_count += 1
            details.append(f"No encontrado: orden {row['order_number']} ({row.get('color')})")
            continue

        if item.status == ItemStatus.TERMINADA.value:
            details.append(f"Omitido (terminada): orden {row['order_number']}")
            continue

        matched_count += 1
        changed = False
        parts: list[str] = []

        machine = _resolve_machine(db, row.get("machine_name"))
        if machine:
            if item.machine_id != machine.id:
                machine_assigned += 1
            item.machine_id = machine.id
            changed = True
            parts.append(f"máq.{machine.name}")

        if row.get("start_date"):
            if item.start_date != row["start_date"]:
                dates_assigned += 1
            item.start_date = row["start_date"]
            changed = True
            parts.append(f"inicio {row['start_date']}")

        if row.get("comments"):
            if item.comments != row["comments"]:
                comments_assigned += 1
            item.comments = row["comments"]
            changed = True

        if row.get("delivered") is not None and item.delivered != row["delivered"]:
            item.delivered = row["delivered"]
            changed = True

        if row.get("delivery_date") and item.delivery_date != row["delivery_date"]:
            item.delivery_date = row["delivery_date"]
            changed = True

        if changed:
            recalculate_item(db, item)
            updated_count += 1
            details.append(
                f"Actualizado: orden {row['order_number']} ({row.get('color')}) — {', '.join(parts) or 'datos'}"
            )
        else:
            details.append(f"Sin cambios: orden {row['order_number']} ({row.get('color')})")

    log = ImportLog(
        filename=filename,
        new_count=0,
        skipped_count=not_found_count,
        updated_count=updated_count,
        details=json.dumps(details[:200], ensure_ascii=False),
    )
    db.add(log)
    db.commit()

    return PlanningImportResult(
        filename=filename,
        matched_count=matched_count,
        updated_count=updated_count,
        not_found_count=not_found_count,
        machine_assigned=machine_assigned,
        dates_assigned=dates_assigned,
        comments_assigned=comments_assigned,
        details=details[:50],
    )


@router.post("/nuevo-formato", response_model=ImportResult)
async def import_nuevo_formato(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user: User = Depends(require_planning_access),
):
    content = await file.read()
    rows = parse_nuevo_formato(content)

    new_count = 0
    skipped_count = 0
    updated_count = 0
    details: list[str] = []
    seen_in_batch: set[str] = set()

    for row in rows:
        fp = build_fingerprint(row)

        if fp in seen_in_batch:
            skipped_count += 1
            details.append(f"Omitido (duplicado en archivo): orden {row['order_number']}")
            continue

        existing = db.query(ProductionItem).filter(ProductionItem.fingerprint == fp).first()

        if existing:
            seen_in_batch.add(fp)
            if existing.status in (ItemStatus.ACTIVA.value, ItemStatus.TERMINADA.value):
                changed = False
                if row.get("delivered") is not None and existing.delivered != row["delivered"]:
                    existing.delivered = row["delivered"]
                    changed = True
                if row.get("delivery_date") and existing.delivery_date != row["delivery_date"]:
                    existing.delivery_date = row["delivery_date"]
                    changed = True
                if changed and existing.status == ItemStatus.ACTIVA.value:
                    recalculate_item(db, existing)
                    updated_count += 1
                    details.append(f"Actualizado: orden {row['order_number']} ({row.get('color')})")
                else:
                    skipped_count += 1
                    details.append(f"Omitido (ya existe): orden {row['order_number']}")
            continue

        item = ProductionItem(
            fingerprint=fp,
            status=ItemStatus.ACTIVA.value,
            **{k: row.get(k) for k in FIELDS},
        )
        item.shrinking = get_shrinking(db, item.raw_material)
        recalculate_item(db, item)
        db.add(item)
        db.flush()
        seen_in_batch.add(fp)
        new_count += 1
        details.append(f"Nuevo: orden {row['order_number']} - {row.get('customer')} ({row.get('color')})")

    log = ImportLog(
        filename=file.filename or "unknown.xlsx",
        new_count=new_count,
        skipped_count=skipped_count,
        updated_count=updated_count,
        details=json.dumps(details[:200], ensure_ascii=False),
    )
    db.add(log)
    db.commit()

    return ImportResult(
        filename=file.filename or "unknown.xlsx",
        new_count=new_count,
        skipped_count=skipped_count,
        updated_count=updated_count,
        details=details[:50],
    )


@router.post("/gantt-planning", response_model=PlanningImportResult)
async def import_gantt_planning(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user: User = Depends(require_planning_access),
):
    """Import machine and start date from Production gantt Excel upload."""
    content = await file.read()
    rows = parse_production_gantt(content)
    return _apply_gantt_planning(db, rows, file.filename or "gantt.xlsx")


@router.post("/gantt-planning/local", response_model=PlanningImportResult)
def import_gantt_planning_local(db: Session = Depends(get_db), _user: User = Depends(require_planning_access)):
    """Load machine and start date from Production gantt2.xlsx on Desktop."""
    if not DEFAULT_GANTT_PATH.exists():
        raise HTTPException(404, f"No se encontró el archivo: {DEFAULT_GANTT_PATH}")
    rows = parse_production_gantt(DEFAULT_GANTT_PATH.read_bytes())
    return _apply_gantt_planning(db, rows, DEFAULT_GANTT_PATH.name)
