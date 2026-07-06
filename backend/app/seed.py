from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from .auth_utils import hash_password
from .permissions import default_permissions_for_role, save_user_permissions
from .database import engine
from .holidays import slovak_holidays_for_year
from .models import MachineConfig, MaterialConfig, SlovakHoliday, User

DEFAULT_CHANGEOVER_SHIFTS = 3
INITIAL_PASSWORD = "12345"

DEFAULT_USERS = [
    ("admin", "admin", "Administrador", INITIAL_PASSWORD, "admin@gantt.local"),
    ("sales", "sales", "Ventas", INITIAL_PASSWORD, "sales@gantt.local"),
    ("quality", "quality", "Calidad", INITIAL_PASSWORD, "quality@gantt.local"),
    ("confection", "confection", "Confección", INITIAL_PASSWORD, "confection@gantt.local"),
    ("production", "production", "Producción", INITIAL_PASSWORD, "production@gantt.local"),
]

DEFAULT_MATERIALS = [
    ("PA", 0.83),
    ("PES", 0.95),
    ("PP", 1.0),
    ("CHY", 1.0),
    ("PA-SD", 1.0),
    ("PES-SD", 1.0),
]

DEFAULT_MACHINES = [
    ("1", 125, 2, 3),
    ("7", 120, 2, 3),
    ("9", 80, 2, 3),
    ("10", 80, 2, 3),
    ("11", 80, 2, 3),
    ("13", 80, 2, 3),
    ("14", 100, 2, 3),
    ("15", 100, 2, 3),
    ("16", 120, 2, 3),
    ("17", 125, 2, 3),
]


def migrate_schema(db: Session) -> None:
    """Add new columns to existing SQLite DB without Alembic."""
    inspector = inspect(engine)
    if "machine_configs" in inspector.get_table_names():
        cols = {c["name"] for c in inspector.get_columns("machine_configs")}
        if "changeover_shifts" not in cols:
            with engine.connect() as conn:
                conn.execute(
                    text(
                        f"ALTER TABLE machine_configs ADD COLUMN changeover_shifts INTEGER DEFAULT {DEFAULT_CHANGEOVER_SHIFTS}"
                    )
                )
                conn.commit()
    if "users" in inspector.get_table_names():
        cols = {c["name"] for c in inspector.get_columns("users")}
        if "email" not in cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(150)"))
                conn.commit()
        if "permissions_json" not in cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN permissions_json TEXT"))
                conn.commit()
    if "production_items" in inspector.get_table_names():
        cols = {c["name"] for c in inspector.get_columns("production_items")}
        if "notes" not in cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE production_items ADD COLUMN notes TEXT"))
                conn.commit()
        if "meters_produced" not in cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE production_items ADD COLUMN meters_produced FLOAT DEFAULT 0"))
                conn.commit()


def seed_database(db: Session) -> None:
    migrate_schema(db)

    if db.query(MaterialConfig).count() == 0:
        for material, shrinking in DEFAULT_MATERIALS:
            db.add(MaterialConfig(material=material, shrinking=shrinking))

    if db.query(MachineConfig).count() == 0:
        for name, mts, shifts, changeover in DEFAULT_MACHINES:
            db.add(
                MachineConfig(
                    name=name,
                    mts_per_shift=mts,
                    shifts_per_day=shifts,
                    changeover_shifts=changeover,
                )
            )
    else:
        for machine in db.query(MachineConfig).all():
            if machine.changeover_shifts is None:
                machine.changeover_shifts = DEFAULT_CHANGEOVER_SHIFTS

    if db.query(SlovakHoliday).count() == 0:
        for year in range(2024, 2031):
            for d, name in slovak_holidays_for_year(year):
                db.merge(SlovakHoliday(date=d, name=name, year=year))

    if db.query(User).count() == 0:
        for username, role, display_name, password, email in DEFAULT_USERS:
            perms = default_permissions_for_role(role)
            db.add(
                User(
                    username=username,
                    role=role,
                    display_name=display_name,
                    email=email,
                    password_hash=hash_password(password),
                    permissions_json=save_user_permissions(perms),
                    active=True,
                )
            )
    else:
        for username, role, _display_name, _password, email in DEFAULT_USERS:
            user = db.query(User).filter(User.username == username).first()
            if user:
                if not user.email:
                    user.email = email
                if not user.permissions_json:
                    user.permissions_json = save_user_permissions(default_permissions_for_role(user.role))

    db.commit()
