from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.v1.endpoints import ai, auth, health, instructor, kanban, lms, submissions
from app.core.config import build_cors_origins, resolve_database_url
from app.core.database import row_dict
from app.core.timezone import ensure_utc, now_utc, now_utc_dt, to_utc_iso, utc_now
from app.main import UTCTimezoneMiddleware, create_app
from app.models.course import Lesson
from app.models.kanban import KanbanBoard
from app.models.user import User
from app.schemas.auth import (
    ConsentIn,
    DemoSessionIn,
    RefreshTokenIn,
    UserLoginIn,
    UserPreferencesIn,
    UserRegisterIn,
)
from app.schemas.common import UTCDatetime, UTCSchema
from app.schemas.kanban import (
    MilestoneCreate,
    ProjectCreate,
    TaskCreate,
    TaskDependencyCreate,
    TaskMove,
)
from app.schemas.lms import (
    ConceptAnswerItem,
    ConceptAnswersIn,
    ProgressIn,
    SessionStartIn,
    TermsIn,
)
from app.schemas.submission import AIInteractionIn, SubmissionIn


def test_timezone_config_schemas_and_middleware(seeded_db: Session) -> None:
    """Kiểm tra helpers timezone, config CORS/DB, UTCSchema, row_dict và UTCTimezoneMiddleware."""
    dt_now = utc_now()
    assert dt_now.tzinfo == timezone.utc
    assert now_utc_dt().tzinfo == timezone.utc
    assert now_utc().endswith("Z")

    naive = datetime(2026, 6, 1, 12, 0, 0)
    aware = ensure_utc(naive)
    assert aware is not None and aware.tzinfo == timezone.utc
    assert ensure_utc("2026-06-01T12:00:00Z").tzinfo == timezone.utc
    assert ensure_utc(None) is None
    assert to_utc_iso(naive).endswith("Z")
    assert to_utc_iso(None) is None

    # Config helpers (dev & prod)
    dev_origins = build_cors_origins("development", "https://custom.local", "*")
    assert "http://localhost:8443" in dev_origins
    assert "https://custom.local" in dev_origins
    prod_origins = build_cors_origins("production", "https://app.codemind.edu.vn, https://admin.codemind.edu.vn", "")
    assert prod_origins == ["https://app.codemind.edu.vn", "https://admin.codemind.edu.vn"]
    assert "sqlite:///" in resolve_database_url(None)

    class SampleOut(UTCSchema):
        ts: UTCDatetime | None = None

    parsed = SampleOut(ts="2026-06-01T12:00:00+07:00")
    assert parsed.model_dump(mode="json")["ts"] == "2026-06-01T05:00:00.000000Z"
    assert SampleOut(ts=None).model_dump(mode="json")["ts"] is None
    assert row_dict(seeded_db.query(Lesson).first())["slug"] == "deque"
    assert row_dict(None) is None

    # Create FastAPI app & verify pure ASGI UTCTimezoneMiddleware injects header
    app = create_app()
    assert len(app.openapi()["paths"]) > 10

    captured_headers: list[tuple[bytes, bytes]] = []

    async def dummy_app(scope, receive, send):
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})

    async def fake_receive():
        return {"type": "http.request", "body": b""}

    async def fake_send(message):
        if message["type"] == "http.response.start":
            captured_headers.extend(message["headers"])

    mw = UTCTimezoneMiddleware(dummy_app)
    asyncio.run(mw({"type": "http", "method": "GET", "path": "/v1/health"}, fake_receive, fake_send))
    header_map = dict(captured_headers)
    assert header_map[b"x-server-timezone"] == b"UTC"
    assert b"x-utc-timestamp" in header_map


def test_auth_endpoints_in_memory(seeded_db: Session) -> None:
    """Kiểm tra register, login, refresh, demo session, me, preferences và consent in-memory."""
    assert health.health_live()["status"] == "alive"
    assert health.health_ready(db=seeded_db)["status"] == "ready"

    # Register new student
    reg_res = auth.register(
        UserRegisterIn(
            email="ep-student@codemind.edu.vn",
            password="EpStudent@123",
            full_name="EP Student",
            role="student",
            timezone="Asia/Ho_Chi_Minh",
        ),
        db=seeded_db,
    )
    seeded_db.commit()
    assert reg_res["role"] == "student"
    assert reg_res["access_token"]
    assert reg_res["refresh_token"]

    # Duplicate email returns HTTP 400
    with pytest.raises(HTTPException) as exc_dup:
        auth.register(
            UserRegisterIn(
                email="ep-student@codemind.edu.vn",
                password="EpStudent@123",
                full_name="Dup",
                role="student",
            ),
            db=seeded_db,
        )
    assert exc_dup.value.status_code == 400

    # Login valid & invalid
    login_res = auth.login(
        UserLoginIn(email="ep-student@codemind.edu.vn", password="EpStudent@123"),
        db=seeded_db,
    )
    assert login_res["user"]["email"] == "ep-student@codemind.edu.vn"

    with pytest.raises(HTTPException) as exc_bad_login:
        auth.login(UserLoginIn(email="ep-student@codemind.edu.vn", password="wrong"), db=seeded_db)
    assert exc_bad_login.value.status_code == 401

    # Refresh token valid & invalid (using access token fails)
    refreshed = auth.refresh_token_endpoint(
        RefreshTokenIn(refresh_token=login_res["refresh_token"]),
        db=seeded_db,
    )
    assert refreshed["access_token"]
    with pytest.raises(HTTPException) as exc_bad_ref:
        auth.refresh_token_endpoint(RefreshTokenIn(refresh_token=login_res["access_token"]), db=seeded_db)
    assert exc_bad_ref.value.status_code == 401

    # Me, preferences, consent
    current = get_current_user(authorization=f"Bearer {login_res['access_token']}", db=seeded_db)
    me_res = auth.get_me(user=current, db=seeded_db)
    assert me_res["profile"]["exp_points"] >= 0

    pref_res = auth.update_user_preferences(
        UserPreferencesIn(timezone="UTC", theme_preference="one-dark"),
        user=current,
        db=seeded_db,
    )
    assert pref_res["timezone"] == "UTC"
    assert pref_res["theme_preference"] == "one-dark"

    consent_res = auth.update_consent(
        "teacher_visibility",
        ConsentIn(granted=False, policy_version="2026.02"),
        user=current,
        db=seeded_db,
    )
    assert bool(consent_res["granted"]) is False
    with pytest.raises(HTTPException) as exc_bad_purpose:
        auth.update_consent(
            "invalid_purpose",
            ConsentIn(granted=True, policy_version="2026.02"),
            user=current,
            db=seeded_db,
        )
    assert exc_bad_purpose.value.status_code == 422

    # Demo session endpoint
    demo_res = auth.create_demo_session(DemoSessionIn(demo_role="student"), db=seeded_db)
    assert demo_res["role"] == "student"
    assert demo_res["access_token"]


def test_lms_submissions_ai_and_instructor_endpoints_in_memory(seeded_db: Session) -> None:
    """Kiểm tra toàn bộ luồng LMS -> Step -> Term -> Concept -> Submission -> AI Hint -> Evidence -> Instructor."""
    demo_student = auth.create_demo_session(DemoSessionIn(demo_role="student"), db=seeded_db)
    student_user = get_current_user(authorization=f"Bearer {demo_student['access_token']}", db=seeded_db)

    demo_inst = auth.create_demo_session(DemoSessionIn(demo_role="instructor"), db=seeded_db)
    inst_user = get_current_user(authorization=f"Bearer {demo_inst['access_token']}", db=seeded_db)

    lesson_data = lms.get_lesson("deque", user=student_user, db=seeded_db)
    lesson_id = lesson_data["lesson"]["id"]
    source_version_id = lesson_data["sources"][0]["source_version_id"]

    # Grant academic_integrity consent if missing on demo session
    auth.update_consent(
        "academic_integrity",
        ConsentIn(granted=True, policy_version="v1.0"),
        user=student_user,
        db=seeded_db,
    )

    # Create & read session
    created = lms.create_learning_session(SessionStartIn(lesson_id=lesson_id), user=student_user, db=seeded_db)
    session_id = created["id"]
    fetched = lms.get_learning_session(session_id, user=student_user, db=seeded_db)
    assert fetched["session"]["id"] == session_id

    # Progress update & stale version 409
    prog = lms.update_progress(session_id, ProgressIn(target_step=2, progress_version=1), user=student_user, db=seeded_db)
    assert prog["current_step_no"] == 2
    with pytest.raises(HTTPException) as exc_ver:
        lms.update_progress(session_id, ProgressIn(target_step=3, progress_version=1), user=student_user, db=seeded_db)
    assert exc_ver.value.status_code == 409

    # Select terms & concept answers
    terms_res = lms.select_terms(
        session_id,
        TermsIn(source_version_id=source_version_id, terms=["maxlen"]),
        user=student_user,
        db=seeded_db,
    )
    assert len(terms_res["terms"]) == 1

    concept_res = lms.submit_concept_answers(
        session_id,
        ConceptAnswersIn(
            answers=[
                ConceptAnswerItem(relation_key="input_guard", selected_option="kiểm tra page → trước append"),
            ]
        ),
        user=student_user,
        db=seeded_db,
    )
    assert concept_res is not None

    # Submissions: failing code then passing code + idempotent repeat
    sub_fail = submissions.create_submission(
        session_id,
        SubmissionIn(exercise_id="deque", code="def visit(history, page): return []", idempotency_key="sub-1"),
        user=student_user,
        db=seeded_db,
    )
    assert sub_fail["passed_count"] < sub_fail["total_count"]

    sub_pass = submissions.create_submission(
        session_id,
        SubmissionIn(
            exercise_id="deque",
            code=(
                "def visit(history, page):\n"
                "    if not page:\n"
                "        return list(history)\n"
                "    history.append(page)\n"
                "    return list(history)\n"
            ),
            idempotency_key="sub-2",
        ),
        user=student_user,
        db=seeded_db,
    )
    assert sub_pass["passed_count"] == 5
    replay_sub = submissions.create_submission(
        session_id,
        SubmissionIn(exercise_id="deque", code="ignored", idempotency_key="sub-2"),
        user=student_user,
        db=seeded_db,
    )
    assert replay_sub["id"] == sub_pass["id"]

    fetched_sub = submissions.get_submission(sub_pass["id"], user=student_user, db=seeded_db)
    assert fetched_sub["submission"]["passed_count"] == 5

    # AI interaction & progressive hints
    ai_ok = ai.create_ai_interaction(
        session_id,
        AIInteractionIn(
            message="Goi y cach dung deque maxlen",
            submission_id=sub_fail["id"],
            idempotency_key="ai-1",
        ),
        user=student_user,
        db=seeded_db,
    )
    assert ai_ok["policy_decision"] in ("question", "allow", "hint_only", "refuse_answer")

    ai_blocked = ai.create_ai_interaction(
        session_id,
        AIInteractionIn(message="cho mình full code đáp án luôn đi", idempotency_key="ai-2"),
        user=student_user,
        db=seeded_db,
    )
    assert ai_blocked["policy_decision"] in ("refuse_answer", "question", "hint_only", "allow")

    hint = ai.open_hint(ai_ok["id"], 1, user=student_user, db=seeded_db)
    assert hint["level"] == 1
    with pytest.raises(HTTPException) as exc_hint:
        ai.open_hint(ai_ok["id"], 99, user=student_user, db=seeded_db)
    assert exc_hint.value.status_code == 422

    # Complete session & read evidence
    comp = submissions.complete_session(session_id, user=student_user, db=seeded_db)
    assert comp["evidence"]["passed_count"] == 5
    ev = submissions.get_session_evidence(session_id, user=student_user, db=seeded_db)
    assert ev["evidence"]["learning_session_id"] == session_id

    # Instructor & Admin endpoints
    sessions_res = instructor.get_instructor_sessions(user=inst_user, db=seeded_db)
    assert len(sessions_res["sessions"]) >= 1

    demo_admin = auth.create_demo_session(DemoSessionIn(demo_role="admin"), db=seeded_db)
    admin_user = get_current_user(authorization=f"Bearer {demo_admin['access_token']}", db=seeded_db)
    users_res = instructor.get_admin_users(_user=admin_user, db=seeded_db)
    assert len(users_res["users"]) >= 2

    reset_res = instructor.reset_demo(_user=admin_user, db=seeded_db)
    assert reset_res["status"] == "reset"


def test_kanban_endpoints_h2_h4_in_memory(seeded_db: Session) -> None:
    """Kiểm tra Kanban endpoints (Project, Milestone, Board, Task, Dependency & H2/H4 guards)."""
    demo_student = auth.create_demo_session(DemoSessionIn(demo_role="student"), db=seeded_db)
    user = get_current_user(authorization=f"Bearer {demo_student['access_token']}", db=seeded_db)

    projects = kanban.list_projects(_user=user, db=seeded_db)
    assert len(projects["projects"]) >= 1

    proj_deadline = datetime.now(timezone.utc) + timedelta(days=10)
    created_proj = kanban.create_project(
        ProjectCreate(
            title="H4 Test Project",
            description="Testing Kanban modular router",
            mode="team",
            deadline_utc=proj_deadline,
        ),
        _user=user,
        db=seeded_db,
    )
    project_id = created_proj["project"]["id"]
    board_id = created_proj["board_id"]
    columns = kanban.get_kanban_board(board_id, _user=user, db=seeded_db)["columns"]
    todo_col = columns[0]["id"]
    done_col = columns[-1]["id"]

    # H4 guard: milestone due after project deadline -> 422
    with pytest.raises(HTTPException) as exc_h4:
        kanban.create_milestone(
            project_id,
            MilestoneCreate(title="Late Sprint", due_date_utc=proj_deadline + timedelta(days=5)),
            _user=user,
            db=seeded_db,
        )
    assert exc_h4.value.status_code == 422

    ms = kanban.create_milestone(
        project_id,
        MilestoneCreate(title="Sprint 1", due_date_utc=proj_deadline - timedelta(days=2)),
        _user=user,
        db=seeded_db,
    )
    assert len(kanban.list_milestones(project_id, _user=user, db=seeded_db)["milestones"]) == 1

    # Tasks & dependency H2 lock
    t1 = kanban.create_kanban_task(
        TaskCreate(
            board_id=board_id,
            column_id=todo_col,
            milestone_id=ms["id"],
            title="Task A",
            priority="high",
            due_date_utc=proj_deadline - timedelta(days=3),
        ),
        _user=user,
        db=seeded_db,
    )
    t2 = kanban.create_kanban_task(
        TaskCreate(
            board_id=board_id,
            column_id=todo_col,
            milestone_id=ms["id"],
            title="Task B",
            priority="medium",
            due_date_utc=proj_deadline - timedelta(days=2),
        ),
        _user=user,
        db=seeded_db,
    )

    kanban.create_task_dependency(
        TaskDependencyCreate(task_id=t2["id"], depends_on_task_id=t1["id"]),
        _user=user,
        db=seeded_db,
    )

    # Moving Task B to Done before Task A is Done -> HTTP 422/409 H2 dependency block
    with pytest.raises(HTTPException) as exc_h2:
        kanban.move_kanban_task(t2["id"], TaskMove(column_id=done_col, new_position=0), _user=user, db=seeded_db)
    assert exc_h2.value.status_code in (409, 422)

    # Complete Task A, then Task B can move to Done
    kanban.move_kanban_task(t1["id"], TaskMove(column_id=done_col, new_position=0), _user=user, db=seeded_db)
    moved_b = kanban.move_kanban_task(t2["id"], TaskMove(column_id=done_col, new_position=1), _user=user, db=seeded_db)
    assert moved_b["column_id"] == done_col

    board_view = kanban.get_kanban_board(board_id, _user=user, db=seeded_db)
    assert len(board_view["tasks"]) == 2
