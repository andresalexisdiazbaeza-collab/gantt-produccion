from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import MachineConfig, User
from ..permissions import can_modify_module
from ..schemas import MachineCreate, MachineOut, MachineUpdate

router = APIRouter(prefix="/machines", tags=["machines"])


@router.get("", response_model=list[MachineOut])
def list_machines(active_only: bool = False, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    q = db.query(MachineConfig)
    if active_only:
        q = q.filter(MachineConfig.active.is_(True))
    return q.order_by(MachineConfig.name).all()


@router.post("", response_model=MachineOut, status_code=201)
def create_machine(data: MachineCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not can_modify_module(user, "machines"):
        raise HTTPException(403, "No tienes permiso para modificar máquinas")
    if db.query(MachineConfig).filter(MachineConfig.name == data.name).first():
        raise HTTPException(400, "Máquina ya existe")
    machine = MachineConfig(**data.model_dump())
    db.add(machine)
    db.commit()
    db.refresh(machine)
    return machine


@router.put("/{machine_id}", response_model=MachineOut)
def update_machine(machine_id: int, data: MachineUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not can_modify_module(user, "machines"):
        raise HTTPException(403, "No tienes permiso para modificar máquinas")
    machine = db.get(MachineConfig, machine_id)
    if not machine:
        raise HTTPException(404, "Máquina no encontrada")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(machine, k, v)
    db.commit()
    db.refresh(machine)
    return machine


@router.delete("/{machine_id}", status_code=204)
def delete_machine(machine_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not can_modify_module(user, "machines"):
        raise HTTPException(403, "No tienes permiso para modificar máquinas")
    machine = db.get(MachineConfig, machine_id)
    if not machine:
        raise HTTPException(404, "Máquina no encontrada")
    db.delete(machine)
    db.commit()
