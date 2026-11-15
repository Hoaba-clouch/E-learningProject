from __future__ import annotations

import sys
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import app.api.deps as deps_module  # noqa: E402
import app.core.database as database_module  # noqa: E402
import app.models  # noqa: E402, F401
from app.core.database import seed_data  # noqa: E402
from app.core.security import TOKENS  # noqa: E402
from app.models.base import Base  # noqa: E402


def create_in_memory_engine() -> Engine:
    """Tạo SQLAlchemy Engine SQLite in-memory bật PRAGMA foreign_keys=ON."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


def run_alembic_upgrade(engine: Engine, revision: str = "001") -> None:
    """Chạy Alembic upgrade trên connection gắn với SQLite in-memory engine."""
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    with engine.connect() as connection:
        cfg.attributes["connection"] = connection
        command.upgrade(cfg, revision)


def run_alembic_downgrade(engine: Engine, revision: str = "base") -> None:
    """Chạy Alembic downgrade trên connection gắn với SQLite in-memory engine."""
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    with engine.connect() as connection:
        cfg.attributes["connection"] = connection
        command.downgrade(cfg, revision)


@pytest.fixture()
def in_memory_engine() -> Generator[Engine, None, None]:
    """Engine SQLite in-memory sạch đã chạy initial migration version 001."""
    engine = create_in_memory_engine()
    run_alembic_upgrade(engine, "001")
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture()
def db_session(
    in_memory_engine: Engine,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[Session, None, None]:
    """
    SQLAlchemy Session gắn SQLite in-memory (đã migrate 001).
    Monkeypatch SessionLocal/db_session để mọi lời gọi nội bộ không chạm codemind.db.
    """
    TestingSessionLocal = sessionmaker(
        bind=in_memory_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
        class_=Session,
    )

    @contextmanager
    def _test_db_session() -> Generator[Session, None, None]:
        own_session = TestingSessionLocal()
        try:
            yield own_session
            own_session.commit()
        except Exception:
            own_session.rollback()
            raise
        finally:
            own_session.close()

    monkeypatch.setattr(database_module, "engine", in_memory_engine)
    monkeypatch.setattr(database_module, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(database_module, "db_session", _test_db_session)
    monkeypatch.setattr(deps_module, "db_session", _test_db_session)

    TOKENS.clear()
    session = TestingSessionLocal()
    try:
        yield session
        session.rollback()
    finally:
        session.close()
        TOKENS.clear()


@pytest.fixture()
def seeded_db(db_session: Session) -> Session:
    """SQLite in-memory Session đã được nạp dữ liệu seed chuẩn."""
    seed_data(db_session)
    db_session.commit()
    return db_session


def get_table_names(engine: Engine) -> set[str]:
    """Trả về danh sách tên bảng ngoại trừ bảng metadata của Alembic."""
    from sqlalchemy import inspect

    return set(inspect(engine).get_table_names()) - {"alembic_version"}


__all__ = [
    "Base",
    "create_in_memory_engine",
    "run_alembic_upgrade",
    "run_alembic_downgrade",
    "get_table_names",
]
