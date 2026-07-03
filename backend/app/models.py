from __future__ import annotations

from datetime import date as date_type, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class ItemStatus(str, Enum):
    ACTIVA = "activa"
    TERMINADA = "terminada"


class UserRole(str, Enum):
    ADMIN = "admin"
    SALES = "sales"
    QUALITY = "quality"
    CONFECTION = "confection"
    PRODUCTION = "production"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(150), unique=True, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MaterialConfig(Base):
    __tablename__ = "material_configs"

    material: Mapped[str] = mapped_column(String(50), primary_key=True)
    shrinking: Mapped[float] = mapped_column(Float, default=1.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MachineConfig(Base):
    __tablename__ = "machine_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    mts_per_shift: Mapped[float] = mapped_column(Float, nullable=False)
    shifts_per_day: Mapped[int] = mapped_column(Integer, default=2)
    changeover_shifts: Mapped[int] = mapped_column(Integer, default=3)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    items: Mapped[list["ProductionItem"]] = relationship(back_populates="machine")


class SlovakHoliday(Base):
    __tablename__ = "slovak_holidays"

    date: Mapped[date_type] = mapped_column(Date, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)


class ProductionItem(Base):
    __tablename__ = "production_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fingerprint: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default=ItemStatus.ACTIVA.value, index=True)

    raw_material: Mapped[Optional[str]] = mapped_column(String(50))
    titulo: Mapped[Optional[str]] = mapped_column(String(100))
    customer: Mapped[Optional[str]] = mapped_column(String(150))
    order_number: Mapped[str] = mapped_column(String(50), index=True)
    order_type: Mapped[Optional[str]] = mapped_column(String(50))
    braiding: Mapped[Optional[str]] = mapped_column(String(50))
    knot: Mapped[Optional[float]] = mapped_column(Float)
    model: Mapped[Optional[str]] = mapped_column(String(50))
    matriz_mm: Mapped[Optional[float]] = mapped_column(Float)
    measure: Mapped[Optional[str]] = mapped_column(String(20))
    meshes: Mapped[Optional[float]] = mapped_column(Float)
    color: Mapped[Optional[str]] = mapped_column(String(50))
    treatment: Mapped[Optional[str]] = mapped_column(String(50))
    pieces: Mapped[Optional[float]] = mapped_column(Float)
    piece_length: Mapped[Optional[float]] = mapped_column(Float)
    kg_totales: Mapped[Optional[float]] = mapped_column(Float)
    delivered: Mapped[Optional[float]] = mapped_column(Float, default=0)
    meters_produced: Mapped[Optional[float]] = mapped_column(Float, default=0)
    delivery_date: Mapped[Optional[date_type]] = mapped_column(Date)
    source_status: Mapped[Optional[str]] = mapped_column(String(50))

    machine_id: Mapped[Optional[int]] = mapped_column(ForeignKey("machine_configs.id"))
    start_date: Mapped[Optional[date_type]] = mapped_column(Date)
    comments: Mapped[Optional[str]] = mapped_column(Text)
    notes: Mapped[Optional[str]] = mapped_column(Text)

    shrinking: Mapped[Optional[float]] = mapped_column(Float)
    total_length: Mapped[Optional[float]] = mapped_column(Float)
    working_days: Mapped[Optional[float]] = mapped_column(Float)
    mts_per_shift: Mapped[Optional[float]] = mapped_column(Float)
    shifts: Mapped[Optional[int]] = mapped_column(Integer)
    finish_date: Mapped[Optional[date_type]] = mapped_column(Date)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    machine: Mapped[Optional["MachineConfig"]] = relationship(back_populates="items")


class ImportLog(Base):
    __tablename__ = "import_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255))
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    new_count: Mapped[int] = mapped_column(Integer, default=0)
    skipped_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_count: Mapped[int] = mapped_column(Integer, default=0)
    details: Mapped[Optional[str]] = mapped_column(Text)
