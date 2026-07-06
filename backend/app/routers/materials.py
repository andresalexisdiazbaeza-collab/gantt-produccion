from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import MaterialConfig, User
from ..permissions import can_modify_module
from ..schemas import MaterialCreate, MaterialOut, MaterialUpdate

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("", response_model=list[MaterialOut])
def list_materials(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return db.query(MaterialConfig).order_by(MaterialConfig.material).all()


@router.post("", response_model=MaterialOut, status_code=201)
def create_material(data: MaterialCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not can_modify_module(user, "materials"):
        raise HTTPException(403, "No tienes permiso para modificar materiales")
    if db.get(MaterialConfig, data.material):
        raise HTTPException(400, "Material ya existe")
    mat = MaterialConfig(**data.model_dump())
    db.add(mat)
    db.commit()
    db.refresh(mat)
    return mat


@router.put("/{material}", response_model=MaterialOut)
def update_material(material: str, data: MaterialUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not can_modify_module(user, "materials"):
        raise HTTPException(403, "No tienes permiso para modificar materiales")
    mat = db.get(MaterialConfig, material)
    if not mat:
        raise HTTPException(404, "Material no encontrado")
    mat.shrinking = data.shrinking
    db.commit()
    db.refresh(mat)
    return mat


@router.delete("/{material}", status_code=204)
def delete_material(material: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not can_modify_module(user, "materials"):
        raise HTTPException(403, "No tienes permiso para modificar materiales")
    mat = db.get(MaterialConfig, material)
    if not mat:
        raise HTTPException(404, "Material no encontrado")
    db.delete(mat)
    db.commit()
