from __future__ import annotations

import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import create_engine, event, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import DB_PATH, settings
from app.core.security import hash_password, sha256, uid
from app.models.base import Base
from app.models.course import Lesson, LessonSource, LessonStep, Source, SourceVersion
from app.models.kanban import KanbanBoard, KanbanColumn, Milestone, Project
from app.models.user import Consent, Membership, Organization, StudentProfile, User

_connect_args: dict[str, Any] = {}
if settings.database_url.startswith("sqlite"):
    _connect_args["check_same_thread"] = False
    _connect_args["timeout"] = 10

engine: Engine = create_engine(
    settings.database_url,
    connect_args=_connect_args,
    echo=settings.sql_echo,
    future=True,
    pool_pre_ping=True,
)


@event.listens_for(Engine, "connect")
def _enable_sqlite_pragmas(dbapi_connection: Any, _connection_record: Any) -> None:
    """Bật PRAGMA foreign_keys, WAL mode và busy_timeout cho kết nối SQLite."""
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.execute("PRAGMA journal_mode = WAL")
        cursor.execute("PRAGMA busy_timeout = 5000")
        cursor.close()


SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Iterator[Session]:
    """FastAPI dependency cung cấp SQLAlchemy Session chuẩn lifecycle."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@contextmanager
def db_session() -> Iterator[Session]:
    """Context manager SQLAlchemy Session cho services và scripts."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    """Legacy SQLite context manager giữ tương thích ngược cho test_auth_rbac.py và script kiểm thử."""
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 5000")
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def row_dict(row: Any) -> dict[str, Any] | None:
    """Chuyển đổi sqlite3.Row, ORM model hoặc mapping thành dict Python an toàn."""
    if row is None:
        return None
    if isinstance(row, dict):
        return row
    if hasattr(row, "to_dict"):
        return row.to_dict()
    return dict(row)


def _sqlite_column_names(conn: sqlite3.Connection, table_name: str) -> set[str]:
    return {col[1] for col in conn.execute(f"PRAGMA table_info({table_name})").fetchall()}


def _sqlite_column_ddl(col: Any) -> str:
    """Sinh DDL an toàn cho SQLite ALTER TABLE ADD COLUMN."""
    from sqlalchemy import Boolean, DateTime, Float, Integer

    if isinstance(col.type, DateTime):
        return f"ALTER TABLE {col.table.name} ADD COLUMN {col.name} TEXT"
    if isinstance(col.type, Boolean):
        return f"ALTER TABLE {col.table.name} ADD COLUMN {col.name} INTEGER NOT NULL DEFAULT 1"
    if isinstance(col.type, Integer):
        default_int = col.default.arg if (col.default is not None and isinstance(col.default.arg, int)) else 0
        return f"ALTER TABLE {col.table.name} ADD COLUMN {col.name} INTEGER NOT NULL DEFAULT {default_int}"
    if isinstance(col.type, Float):
        default_flt = col.default.arg if (col.default is not None and isinstance(col.default.arg, (int, float))) else 0.0
        return f"ALTER TABLE {col.table.name} ADD COLUMN {col.name} REAL NOT NULL DEFAULT {default_flt}"
    if col.default is not None and isinstance(col.default.arg, str):
        safe_default = col.default.arg.replace("'", "''")
        return f"ALTER TABLE {col.table.name} ADD COLUMN {col.name} TEXT DEFAULT '{safe_default}'"
    return f"ALTER TABLE {col.table.name} ADD COLUMN {col.name} TEXT"


def _migrate_existing_tables(conn: sqlite3.Connection) -> None:
    """Zero-downtime migration: đồng bộ toàn bộ cột ORM lên các bảng SQLite đã tồn tại."""
    fallback_iso = datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")
    cached_cols: dict[str, set[str]] = {}

    for table in Base.metadata.sorted_tables:
        existing_cols = _sqlite_column_names(conn, table.name)
        if not existing_cols:
            continue
        cached_cols[table.name] = existing_cols
        for col in table.columns:
            if col.name not in existing_cols:
                conn.execute(_sqlite_column_ddl(col))
                existing_cols.add(col.name)
                if col.name in ("created_at", "updated_at") and not col.nullable:
                    conn.execute(f"UPDATE {table.name} SET {col.name} = ? WHERE {col.name} IS NULL", (fallback_iso,))

    ms_cols = cached_cols.get("milestones", set())
    if ms_cols and "deadline_utc" in ms_cols and "due_date_utc" in ms_cols:
        conn.execute(
            "UPDATE milestones SET due_date_utc = deadline_utc WHERE due_date_utc IS NULL AND deadline_utc IS NOT NULL"
        )
    if ms_cols and "created_at" in ms_cols:
        conn.execute("UPDATE milestones SET created_at = ? WHERE created_at IS NULL", (fallback_iso,))

    demo_credentials = {
        "student-demo": ("Student@123", "Minh Anh", "student"),
        "instructor-demo": ("Instructor@123", "Cô Linh", "instructor"),
        "admin-demo": ("Admin@123", "Content Admin", "admin"),
    }
    for uid_key, (pwd, d_name, r_name) in demo_credentials.items():
        existing_user = conn.execute(
            "SELECT id, password_hash, full_name, role, is_active FROM users WHERE id=?",
            (uid_key,),
        ).fetchone()
        if existing_user:
            updates: list[str] = []
            params: list[Any] = []
            if not existing_user["password_hash"]:
                updates.append("password_hash=?")
                params.append(hash_password(pwd))
            if not existing_user["full_name"]:
                updates.append("full_name=?")
                params.append(d_name)
            if existing_user["role"] != r_name:
                updates.append("role=?")
                params.append(r_name)
            if existing_user["is_active"] is None:
                updates.append("is_active=?")
                params.append(1)
            if updates:
                params.append(uid_key)
                conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id=?", tuple(params))


def seed_data(session: Session) -> None:
    """Seed dữ liệu demo chuẩn H4 (UTC aware) hoàn toàn idempotent qua SQLAlchemy ORM."""
    created_dt = datetime.now(timezone.utc)

    org_id = "org-demo-codemind"
    org = session.get(Organization, org_id)
    if org is None:
        session.add(
            Organization(
                id=org_id,
                name="CodeMind Demo Campus",
                status="active",
                created_at=created_dt,
                updated_at=created_dt,
            )
        )
        session.flush()

    demo_users = [
        ("student-demo", "student.demo@codemind.local", "Student@123", "Minh Anh", "student"),
        ("instructor-demo", "instructor.demo@codemind.local", "Instructor@123", "Cô Linh", "instructor"),
        ("admin-demo", "admin.demo@codemind.local", "Admin@123", "Content Admin", "admin"),
    ]
    for user_id, email, raw_pwd, display_name, role in demo_users:
        user = session.get(User, user_id)
        if user is None:
            user = User(
                id=user_id,
                email=email,
                password_hash=hash_password(raw_pwd),
                full_name=display_name,
                display_name=display_name,
                role=role,
                status="active",
                is_active=True,
                locale="vi-VN",
                timezone="Asia/Ho_Chi_Minh",
                theme_preference="one-dark",
                created_at=created_dt,
                updated_at=created_dt,
            )
            session.add(user)
            session.flush()

        membership = session.scalar(
            select(Membership).where(
                Membership.organization_id == org_id,
                Membership.user_id == user_id,
            )
        )
        if membership is None:
            membership_role = "org_admin" if role == "admin" else role
            session.add(
                Membership(
                    id=uid(),
                    organization_id=org_id,
                    user_id=user_id,
                    role=membership_role,
                    status="active",
                    created_at=created_dt,
                )
            )

        for purpose, default_granted in (
            ("academic_integrity", 1 if role == "student" else 0),
            ("teacher_visibility", 1 if role == "student" else 0),
        ):
            consent = session.scalar(
                select(Consent).where(Consent.user_id == user_id, Consent.purpose == purpose)
            )
            if consent is None:
                session.add(
                    Consent(
                        id=uid(),
                        user_id=user_id,
                        purpose=purpose,
                        policy_version="2026-08-01",
                        granted=default_granted,
                        granted_at=created_dt if default_granted else None,
                        updated_at=created_dt,
                    )
                )

        if role == "student":
            profile = session.scalar(select(StudentProfile).where(StudentProfile.user_id == user_id))
            if profile is None:
                session.add(
                    StudentProfile(
                        id=uid(),
                        user_id=user_id,
                        current_streak=3,
                        longest_streak=5,
                        exp_points=240,
                        selected_title="Bug Hunter",
                        updated_at=created_dt,
                    )
                )

    lesson_id = "lesson-deque-v1"
    lesson = session.scalar(select(Lesson).where(Lesson.slug == "deque", Lesson.version == 1))
    if lesson is None:
        lesson = Lesson(
            id=lesson_id,
            slug="deque",
            version=1,
            title="Hiểu deque bằng một lỗi có thật",
            objective="Dùng deque(maxlen=3) để lưu ba trang gần nhất và bỏ qua chuỗi rỗng.",
            status="published",
            published_at=created_dt,
        )
        session.add(lesson)
        session.flush()

        steps = [
            (1, "objective", "Mục tiêu bài học"),
            (2, "source", "Đọc nguồn chính thức"),
            (3, "concept", "Nối khái niệm"),
            (4, "practice", "Chạy bộ kiểm thử"),
            (5, "ai", "Tự sửa sau gợi ý"),
            (6, "review", "Xem bằng chứng học tập"),
        ]
        for sequence_no, step_type, title in steps:
            session.add(
                LessonStep(
                    id=uid(),
                    lesson_id=lesson.id,
                    sequence_no=sequence_no,
                    step_type=step_type,
                    title=title,
                    completion_rule=json.dumps({"required": sequence_no < 6}),
                )
            )

        source_id = "source-python-deque"
        if session.get(Source, source_id) is None:
            session.add(
                Source(
                    id=source_id,
                    canonical_url="https://docs.python.org/3.12/library/collections.html#collections.deque",
                    publisher="Python Documentation",
                    trust_status="verified",
                )
            )
            session.flush()

        source_version_id = "source-version-python312-deque"
        if session.get(SourceVersion, source_version_id) is None:
            content = (
                "collections.deque(maxlen)\n\n"
                "Deque có thể đặt độ dài tối đa bằng maxlen. Khi đã đầy, thêm phần tử mới sẽ loại phần tử ở đầu đối diện.\n\n"
                "maxlen chỉ giới hạn số phần tử; nó không tự xác thực page hay bỏ chuỗi rỗng trước khi append."
            )
            session.add(
                SourceVersion(
                    id=source_version_id,
                    source_id=source_id,
                    version_label="Python 3.12",
                    content_text=content,
                    content_sha256=sha256(content),
                    retrieved_at=created_dt,
                    availability_status="available",
                )
            )
            session.flush()

        existing_link = session.scalar(
            select(LessonSource).where(
                LessonSource.lesson_id == lesson.id,
                LessonSource.source_version_id == source_version_id,
            )
        )
        if existing_link is None:
            session.add(
                LessonSource(
                    id=uid(),
                    lesson_id=lesson.id,
                    source_version_id=source_version_id,
                    display_order=1,
                )
            )

    project_id = "project-demo-1"
    project = session.get(Project, project_id)
    if project is None:
        project = Project(
            id=project_id,
            title="CodeMind Campus Fullstack",
            description="Dự án đồ án kỳ thực tập 2026",
            mode="team",
            deadline_utc=datetime(2026, 12, 31, 23, 59, 59, tzinfo=timezone.utc),
            created_at=created_dt,
            updated_at=created_dt,
        )
        session.add(project)
        session.flush()

    milestone_id = "milestone-demo-1"
    if session.get(Milestone, milestone_id) is None:
        session.add(
            Milestone(
                id=milestone_id,
                project_id=project_id,
                title="Sprint 1 - Core MVP",
                description="Hoàn thiện backend modular routers, SQLAlchemy UTC và RBAC",
                due_date_utc=datetime(2026, 12, 15, 23, 59, 59, tzinfo=timezone.utc),
                created_at=created_dt,
                updated_at=created_dt,
            )
        )

    board_id = "board-demo-1"
    if session.get(KanbanBoard, board_id) is None:
        session.add(KanbanBoard(id=board_id, project_id=project_id, title="Sprint 1 Board"))
        session.flush()
        cols = [
            ("col-1", board_id, "Backlog", 0),
            ("col-2", board_id, "Ready", 1),
            ("col-3", board_id, "In Progress", 2),
            ("col-4", board_id, "Review / PR", 3),
            ("col-5", board_id, "Done", 4),
        ]
        for cid, bid, ctitle, cpos in cols:
            if session.get(KanbanColumn, cid) is None:
                session.add(
                    KanbanColumn(id=cid, board_id=bid, title=ctitle, position_order=cpos)
                )


def init_db() -> None:
    """Khởi tạo toàn bộ bảng SQLAlchemy ORM, chạy migration tương thích và seed dữ liệu ban đầu."""
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name == "sqlite":
        with db() as conn:
            _migrate_existing_tables(conn)
    with db_session() as session:
        seed_data(session)
