from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_admin
from ..models import MaterialConfig, User
from ..schemas import MaterialCreate, MaterialOut, MaterialUpdate

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("", response_model=list[MaterialOut])
def list_materials(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return db.query(MaterialConfig).order_by(MaterialConfig.material).all()


@router.post("", response_model=MaterialOut, status_code=201)
def create_material(data: MaterialCreate, db: Session = Depends(get_db), _user: User = Depends(require_admin)):
    if db.get(MaterialConfig, data.material):
        raise HTTPException(400, "Material ya existe")
    mat = MaterialConfig(**data.model_dump())
    db.add(mat)
    db.commit()
    db.refresh(mat)
    return mat


@router.put("/{material}", response_model=MaterialOut)
def update_material(material: str, data: MaterialUpdate, db: Session = Depends(get_db), _user: User = Depends(require_admin)):
    mat = db.get(MaterialConfig, material)
    if not mat:
        raise HTTPException(404, "Material no encontrado")
    mat.shrinking = data.shrinking
    db.commit()
    db.refresh(mat)
    return mat


@router.delete("/{material}", status_code=204)
def delete_material(material: str, db: Session = Depends(get_db), _user: User = Depends(require_admin)):
    mat = db.get(MaterialConfig, material)
    if not mat:
        raise HTTPException(404, "Material no encontrado")
    db.delete(mat)
    db.commit()
