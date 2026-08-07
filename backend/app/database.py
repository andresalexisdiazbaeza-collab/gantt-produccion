import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

_raw_url = os.environ.get("DATABASE_URL")
if _raw_url:
    if _raw_url.startswith("postgres://"):
        _raw_url = _raw_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URL = _raw_url
    _connect_args: dict = {}
    # Neon / cloud Postgres: SSL + revive idle connections after scale-to-zero
    _engine_kwargs: dict = {"pool_pre_ping": True}
else:
    db_path = os.environ.get("GANTT_DB_PATH", "./gantt_produccion.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"
    _connect_args = {"check_same_thread": False}
    _engine_kwargs = {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=_connect_args,
    **_engine_kwargs,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
