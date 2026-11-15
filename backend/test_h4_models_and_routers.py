"""
Test suite kiểm chuẩn H4 cho Modular Routers, CORS (Dev/Prod), và SQLAlchemy UTC Models.
"""

from __future__ import annotations

import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import DateTime, create_engine
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import Settings, build_cors_origins, settings  # noqa: E402
from app.core.database import init_db  # noqa: E402
from app.core.timezone import ensure_utc, to_utc_iso, utc_now  # noqa: E402
from app.main import app, create_app  # noqa: E402
from app.models import (  # noqa: E402
    AIHint,
    AIInteraction,
    AnalyticsEvent,
    AuditEvent,
    Base,
    ConceptAnswer,
    Consent,
    Evidence,
    LearningSession,
    Lesson,
    Membership,
    Milestone,
    Organization,
    Project,
    SourceVersion,
    StepAttempt,
    StudentNote,
    StudentProfile,
    Submission,
    Task,
    TermSelection,
    User,
)
from app.schemas.kanban import ProjectCreate  # noqa: E402


EXPECTED_TIMESTAMP_COLUMNS: dict[type[Base], tuple[str, ...]] = {
    Organization: ("created_at", "updated_at"),
    User: ("created_at", "updated_at"),
    Membership: ("created_at", "updated_at"),
    Consent: ("granted_at", "revoked_at", "created_at", "updated_at"),
    StudentProfile: ("created_at", "updated_at"),
    StudentNote: ("created_at", "updated_at"),
    Lesson: ("published_at", "created_at", "updated_at"),
    SourceVersion: ("retrieved_at", "created_at", "updated_at"),
    LearningSession: ("started_at", "updated_at", "completed_at"),
    StepAttempt: ("completed_at", "created_at", "updated_at"),
    TermSelection: ("created_at", "updated_at"),
    ConceptAnswer: ("answered_at", "created_at", "updated_at"),
    Submission: ("created_at", "updated_at"),
    AIInteraction: ("created_at", "updated_at"),
    AIHint: ("opened_at", "created_at", "updated_at"),
    Evidence: ("completed_at", "created_at", "updated_at"),
    AuditEvent: ("created_at",),
    AnalyticsEvent: ("occurred_at", "created_at"),
    Project: ("deadline_utc", "created_at", "updated_at"),
    Milestone: ("due_date_utc", "created_at", "updated_at"),
    Task: ("due_date_utc", "created_at", "updated_at"),
}


def test_sqlalchemy_h4_datetime_columns_and_roundtrip() -> None:
    """Xác minh 100% cột thời gian dùng DateTime(timezone=True) và round-trip giữ nguyên tzinfo=timezone.utc."""
    for model_cls, cols in EXPECTED_TIMESTAMP_COLUMNS.items():
        for col_name in cols:
            column = model_cls.__table__.columns[col_name]
            assert isinstance(column.type, DateTime), f"{model_cls.__tablename__}.{col_name} phải là DateTime"
            assert column.type.timezone is True, f"{model_cls.__tablename__}.{col_name} phải bật timezone=True"

    test_engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(bind=test_engine)

    now = utc_now()
    assert now.tzinfo == timezone.utc
    with Session(test_engine) as s:
        proj = Project(
            id="p-h4-test",
            title="H4 UTC Test Project",
            mode="team",
            deadline_utc=datetime(2026, 12, 31, 16, 59, 59, tzinfo=timezone.utc),
        )
        s.add(proj)
        s.commit()

    with Session(test_engine) as s:
        loaded = s.get(Project, "p-h4-test")
        assert loaded is not None
        assert loaded.created_at.tzinfo == timezone.utc
        assert loaded.deadline_utc is not None
        assert loaded.deadline_utc.tzinfo == timezone.utc
        serialized = loaded.to_dict()
        assert str(serialized["created_at"]).endswith("Z")
        assert str(serialized["deadline_utc"]).endswith("Z")

    # Kiểm tra Pydantic UTCDatetime chuyển đổi múi giờ +07:00 về UTC chuẩn ISO-8601
    parsed_proj = ProjectCreate(title="TZ Convert", deadline_utc="2026-12-31T23:59:59+07:00")
    assert parsed_proj.deadline_utc is not None
    assert parsed_proj.deadline_utc.tzinfo == timezone.utc
    assert parsed_proj.deadline_utc.hour == 16
    assert to_utc_iso(parsed_proj.deadline_utc) == "2026-12-31T16:59:59.000000Z"


def test_cors_dev_and_production_configuration() -> None:
    """Kiểm thử cấu hình CORS cho Dev (8443/5173/3000) và Production (chỉ origin được cấp phép)."""
    dev_origins = build_cors_origins(environment="development")
    assert "http://localhost:8443" in dev_origins
    assert "http://127.0.0.1:8443" in dev_origins
    assert "http://localhost:5173" in dev_origins
    assert "http://localhost:3000" in dev_origins

    prod_origins = build_cors_origins(
        environment="production",
        extra_raw="https://codemind.edu.vn, https://app.codemind.edu.vn/",
        frontend_url="https://campus.codemind.edu.vn",
    )
    assert prod_origins == [
        "https://codemind.edu.vn",
        "https://app.codemind.edu.vn",
        "https://campus.codemind.edu.vn",
    ]
    assert "http://localhost:8443" not in prod_origins

    # Kiểm thử CORS preflight & header thực tế trên Dev App
    init_db()
    dev_client = TestClient(app)
    r_dev = dev_client.options(
        "/v1/health/ready",
        headers={
            "Origin": "http://localhost:8443",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
    )
    assert r_dev.status_code == 200
    assert r_dev.headers.get("access-control-allow-origin") == "http://localhost:8443"
    assert r_dev.headers.get("access-control-allow-credentials") == "true"

    r_health = dev_client.get("/v1/health/ready", headers={"Origin": "http://localhost:8443"})
    assert r_health.status_code == 200
    assert r_health.headers.get("x-timezone-standard") == "UTC-ISO8601-H4"
    assert r_health.json()["timestamp"].endswith("Z")

    # Kiểm thử CORS trên Production App
    prod_settings = Settings(
        project_name="CodeMind Campus API",
        version="2.0.0",
        environment="production",
        database_url=settings.database_url,
        sql_echo=False,
        cors_origins=("https://codemind.edu.vn",),
        cors_origin_regex=None,
        cors_allow_methods=("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"),
        cors_allow_headers=("Authorization", "Content-Type", "X-Requested-With", "Idempotency-Key"),
        secret_key="test-prod-secret-key",
        algorithm="HS256",
        access_token_expire_minutes=15,
        refresh_token_expire_days=7,
        default_timezone="Asia/Ho_Chi_Minh",
    )
    prod_client = TestClient(create_app(prod_settings))
    r_prod_ok = prod_client.get("/health/live", headers={"Origin": "https://codemind.edu.vn"})
    assert r_prod_ok.status_code == 200
    assert r_prod_ok.headers.get("access-control-allow-origin") == "https://codemind.edu.vn"

    r_prod_blocked = prod_client.get("/health/live", headers={"Origin": "http://localhost:8443"})
    assert r_prod_blocked.status_code == 200
    assert "access-control-allow-origin" not in r_prod_blocked.headers


def test_modular_routers_h4_deadlines_and_h2_dependencies() -> None:
    """Kiểm thử modular routers (/v1/projects, milestones, kanban, lms, submissions) với H4 & H2."""
    init_db()
    client = TestClient(app)
    ts = int(time.time() * 1000)

    r_reg = client.post(
        "/v1/auth/register",
        json={
            "email": f"h4_student_{ts}@codemind.edu.vn",
            "password": "StrongPass@2026",
            "full_name": "Kiểm Thử H4",
            "role": "student",
        },
    )
    assert r_reg.status_code == 201, r_reg.text
    headers = {"Authorization": f"Bearer {r_reg.json()['access_token']}"}

    # 1. Tạo Project với deadline 2026-12-31T23:59:59Z
    r_proj = client.post(
        "/v1/projects",
        headers=headers,
        json={
            "title": f"H4 Project {ts}",
            "mode": "team",
            "deadline_utc": "2026-12-31T23:59:59Z",
        },
    )
    assert r_proj.status_code == 201, r_proj.text
    project_id = r_proj.json()["project"]["id"]
    board_id = r_proj.json()["board_id"]
    assert r_proj.json()["project"]["deadline_utc"].endswith("Z")

    # 2. H4 Violation: Milestone deadline > Project deadline -> 422
    r_ms_bad = client.post(
        f"/v1/projects/{project_id}/milestones",
        headers=headers,
        json={"title": "Invalid Milestone", "due_date_utc": "2027-01-05T00:00:00Z"},
    )
    assert r_ms_bad.status_code == 422

    # 3. Milestone hợp lệ (+07:00 được chuẩn hóa thành UTC 'Z')
    r_ms_ok = client.post(
        f"/v1/projects/{project_id}/milestones",
        headers=headers,
        json={"title": "Sprint H4", "due_date_utc": "2026-12-20T12:00:00+07:00"},
    )
    assert r_ms_ok.status_code == 201, r_ms_ok.text
    milestone_id = r_ms_ok.json()["id"]
    assert ensure_utc(r_ms_ok.json()["due_date_utc"]) == datetime(2026, 12, 20, 5, 0, 0, tzinfo=timezone.utc)
    assert r_ms_ok.json()["due_date_utc"].endswith("Z")

    # 4. Lấy danh sách cột Kanban
    r_board = client.get(f"/v1/kanban/boards/{board_id}", headers=headers)
    assert r_board.status_code == 200
    cols = {c["title"]: c["id"] for c in r_board.json()["columns"]}

    # 5. H4 Violation: Task due_date_utc > Milestone due_date_utc -> 422
    r_task_bad = client.post(
        "/v1/kanban/tasks",
        headers=headers,
        json={
            "board_id": board_id,
            "column_id": cols["Backlog"],
            "milestone_id": milestone_id,
            "title": "Overdue Task",
            "due_date_utc": "2026-12-25T00:00:00Z",
        },
    )
    assert r_task_bad.status_code == 422

    # 6. Tạo 2 task hợp lệ + dependency -> kiểm tra H2 trước khi chuyển sang Done
    r_t1 = client.post(
        "/v1/kanban/tasks",
        headers=headers,
        json={
            "board_id": board_id,
            "column_id": cols["Backlog"],
            "milestone_id": milestone_id,
            "title": "Setup Models",
            "due_date_utc": "2026-12-10T10:00:00Z",
        },
    )
    assert r_t1.status_code == 201, r_t1.text
    t1_id = r_t1.json()["id"]

    r_t2 = client.post(
        "/v1/kanban/tasks",
        headers=headers,
        json={
            "board_id": board_id,
            "column_id": cols["Backlog"],
            "milestone_id": milestone_id,
            "title": "Build Routers",
            "due_date_utc": "2026-12-15T10:00:00Z",
        },
    )
    assert r_t2.status_code == 201, r_t2.text
    t2_id = r_t2.json()["id"]

    r_dep = client.post(
        "/v1/kanban/tasks/dependencies",
        headers=headers,
        json={"task_id": t2_id, "depends_on_task_id": t1_id},
    )
    assert r_dep.status_code == 201

    # Chưa xong t1 -> kéo t2 sang Done phải bị chặn 422 (H2)
    r_move_blocked = client.patch(
        f"/v1/kanban/tasks/{t2_id}/move",
        headers=headers,
        json={"column_id": cols["Done"], "new_position": 0},
    )
    assert r_move_blocked.status_code == 422

    # Hoàn thành t1 trước -> sau đó kéo t2 sang Done thành công 200
    r_move_t1 = client.patch(
        f"/v1/kanban/tasks/{t1_id}/move",
        headers=headers,
        json={"column_id": cols["Done"], "new_position": 0},
    )
    assert r_move_t1.status_code == 200
    r_move_t2 = client.patch(
        f"/v1/kanban/tasks/{t2_id}/move",
        headers=headers,
        json={"column_id": cols["Done"], "new_position": 1},
    )
    assert r_move_t2.status_code == 200

    # 7. Kiểm tra /users/me/preferences cập nhật timezone
    r_pref = client.patch(
        "/v1/users/me/preferences",
        headers=headers,
        json={"timezone": "UTC", "theme_preference": "light"},
    )
    assert r_pref.status_code == 200
    assert r_pref.json()["timezone"] == "UTC"
    assert r_pref.json()["updated_at"].endswith("Z")
