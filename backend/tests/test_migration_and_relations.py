from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, sha256, uid
from app.models.audit import AnalyticsEvent, AuditEvent
from app.models.base import Base
from app.models.course import Lesson, LessonSource, LessonStep, Source, SourceVersion
from app.models.kanban import (
    KanbanBoard,
    KanbanColumn,
    Milestone,
    Project,
    Task,
    TaskDependency,
    Team,
)
from app.models.learning import ConceptAnswer, LearningSession, StepAttempt, TermSelection
from app.models.submission import AIHint, AIInteraction, Evidence, Submission, TestResult
from app.models.user import Consent, Membership, Organization, StudentNote, StudentProfile, User
from tests.conftest import (
    create_in_memory_engine,
    get_table_names,
    run_alembic_downgrade,
    run_alembic_upgrade,
)


def test_alembic_001_upgrade_downgrade_and_schema_parity() -> None:
    """Kiểm tra migration 001 upgrade/downgrade trên SQLite in-memory khớp toàn bộ Base.metadata."""
    engine = create_in_memory_engine()
    try:
        run_alembic_upgrade(engine, "001")

        with engine.connect() as conn:
            version = conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        assert version == "001"

        actual_tables = get_table_names(engine)
        expected_tables = set(Base.metadata.tables.keys())
        assert actual_tables == expected_tables
        assert len(actual_tables) == 29

        inspector = inspect(engine)
        for table_name, table in Base.metadata.tables.items():
            actual_cols = {col["name"] for col in inspector.get_columns(table_name)}
            expected_cols = {col.name for col in table.columns}
            assert actual_cols == expected_cols, f"Mismatch columns in {table_name}"

            actual_fks = {fk["constrained_columns"][0] for fk in inspector.get_foreign_keys(table_name)}
            expected_fks = {fk.parent.name for fk in table.foreign_keys}
            assert expected_fks.issubset(actual_fks), f"Missing FKs in {table_name}"

        run_alembic_downgrade(engine, "base")
        assert get_table_names(engine) == set()

        # Re-upgrade cleanly after downgrade
        run_alembic_upgrade(engine, "001")
        assert get_table_names(engine) == expected_tables
    finally:
        engine.dispose()


def test_user_organization_membership_consent_and_cascade(db_session: Session) -> None:
    """Kiểm tra quan hệ User <-> Membership <-> Organization, Profile, Consent, Note, Audit & Cascade delete."""
    org = Organization(id=uid(), name="Test Org", status="active")
    user = User(
        id=uid(),
        email="rel-student@codemind.edu.vn",
        password_hash=hash_password("Secret@123"),
        full_name="Relation Student",
        display_name="Rel Student",
        role="student",
        status="active",
        is_active=True,
        locale="vi-VN",
        timezone="Asia/Ho_Chi_Minh",
        theme_preference="system",
    )
    membership = Membership(
        id=uid(),
        organization=org,
        user=user,
        role="student",
        status="active",
    )
    consent = Consent(
        id=uid(),
        user=user,
        purpose="learning_analytics",
        policy_version="2026.01",
        granted=True,
        granted_at=datetime.now(timezone.utc),
    )
    profile = StudentProfile(
        id=uid(),
        user=user,
        current_streak=3,
        longest_streak=5,
        exp_points=120,
    )
    note = StudentNote(
        id=uid(),
        user=user,
        title="Binary Search Note",
        content="Luu y mid = left + (right - left) // 2",
        code_snippet="mid = (l + r) // 2",
        tags="binary-search",
    )
    audit = AuditEvent(
        id=uid(),
        actor_user_id=user.id,
        action="login",
        resource_type="user",
        resource_id=user.id,
        decision="allow",
    )
    analytics = AnalyticsEvent(
        id=uid(),
        user_id=user.id,
        event_name="note_created",
        properties=json.dumps({"topic": "binary-search"}),
    )

    db_session.add_all([org, user, membership, consent, profile, note, audit, analytics])
    db_session.commit()
    db_session.refresh(user)
    db_session.refresh(org)

    assert len(org.memberships) == 1
    assert user.memberships[0].organization.name == "Test Org"
    assert user.consents[0].purpose == "learning_analytics"
    assert user.student_profile is not None and user.student_profile.exp_points == 120
    assert user.notes[0].title == "Binary Search Note"
    assert db_session.query(AuditEvent).filter_by(actor_user_id=user.id).count() == 1
    assert db_session.query(AnalyticsEvent).filter_by(user_id=user.id).count() == 1

    # Unique constraint on (organization_id, user_id)
    dup_membership = Membership(id=uid(), organization_id=org.id, user_id=user.id, role="student", status="active")
    db_session.add(dup_membership)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    # Re-fetch and test FK violation on orphan Membership
    db_session.add(Membership(id=uid(), organization_id="missing-org", user_id=user.id, role="student", status="active"))
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    # Cascade delete User -> Membership, Consent, StudentProfile, StudentNote
    user_obj = db_session.get(User, user.id)
    assert user_obj is not None
    db_session.delete(user_obj)
    db_session.commit()

    assert db_session.get(Membership, membership.id) is None
    assert db_session.get(Consent, consent.id) is None
    assert db_session.get(StudentProfile, profile.id) is None
    assert db_session.get(StudentNote, note.id) is None


def test_course_learning_submission_and_ai_relationships(db_session: Session) -> None:
    """Kiểm tra quan hệ Course/Lesson <-> LearningSession <-> Attempts/Submissions/AI/Evidence."""
    now = datetime.now(timezone.utc)
    user = User(
        id=uid(),
        email="learner@codemind.edu.vn",
        password_hash=hash_password("Pass@1234"),
        full_name="Learner",
        display_name="Learner",
        role="student",
        status="active",
        is_active=True,
    )
    lesson = Lesson(
        id=uid(),
        slug="two-sum-test",
        version=1,
        title="Two Sum",
        objective="Hash map lookup in O(n)",
        status="published",
        published_at=now,
    )
    step = LessonStep(
        id=uid(),
        lesson=lesson,
        sequence_no=1,
        step_type="source_reading",
        title="Read problem",
        completion_rule="term_selected",
    )
    source = Source(
        id=uid(),
        canonical_url="https://docs.codemind.edu/two-sum",
        publisher="CodeMind",
        trust_status="trusted",
    )
    source_ver = SourceVersion(
        id=uid(),
        source=source,
        version_label="v1",
        content_text="Use a hash map to store seen complements.",
        content_sha256=sha256("hash map"),
        retrieved_at=now,
        availability_status="available",
    )
    lesson_source = LessonSource(
        id=uid(),
        lesson=lesson,
        source_version=source_ver,
        display_order=1,
    )
    db_session.add_all([user, lesson, step, source, source_ver])
    db_session.flush()

    learning_session = LearningSession(
        id=uid(),
        user_id=user.id,
        lesson_id=lesson.id,
        status="active",
        current_step_no=1,
        progress_version=1,
        teacher_visibility=True,
        started_at=now,
    )
    attempt = StepAttempt(
        id=uid(),
        learning_session=learning_session,
        lesson_step_id=step.id,
        attempt_no=1,
        status="completed",
        completed_at=now,
    )
    term = TermSelection(
        id=uid(),
        learning_session=learning_session,
        source_version_id=source_ver.id,
        term_text="Hash Map",
        term_normalized="hash map",
        context_excerpt="Use a hash map",
    )
    concept = ConceptAnswer(
        id=uid(),
        learning_session=learning_session,
        relation_key="time_complexity",
        selected_option="O(n)",
        is_correct=True,
        rule_version="v1",
        answered_at=now,
    )
    submission = Submission(
        id=uid(),
        learning_session_id=learning_session.id,
        programming_language="python",
        source_code="def two_sum(nums, target): return [0, 1]",
        source_sha256=sha256("code"),
        submission_no=1,
        idempotency_key="idem-1",
        status="passed",
        passed_count=3,
        total_count=3,
        score=100,
        duration_ms=42,
    )
    test_res = TestResult(
        id=uid(),
        submission=submission,
        sequence_no=1,
        status="passed",
        safe_message="OK",
        duration_ms=5,
    )
    ai_interaction = AIInteraction(
        id=uid(),
        learning_session_id=learning_session.id,
        submission_id=submission.id,
        user_message="Why use a dict?",
        assistant_message="Dict lookup is O(1) average.",
        policy_decision="allow",
        model_id="gemini-test",
        prompt_version="v1",
        citation_json='["v1"]',
        latency_ms=110,
    )
    ai_hint = AIHint(
        id=uid(),
        interaction=ai_interaction,
        level=1,
        hint_text="Store num -> index in a dict.",
        opened_at=now,
        policy_passed=True,
    )
    evidence = Evidence(
        id=uid(),
        learning_session_id=learning_session.id,
        first_submission_id=submission.id,
        final_submission_id=submission.id,
        hint_count=1,
        passed_count=3,
        evidence_sha256=sha256("evidence-1"),
        completed_at=now,
    )

    db_session.add_all(
        [
            lesson_source,
            learning_session,
            attempt,
            term,
            concept,
            submission,
            test_res,
            ai_interaction,
            ai_hint,
            evidence,
        ]
    )
    db_session.commit()
    db_session.refresh(learning_session)
    db_session.refresh(lesson)
    db_session.refresh(submission)
    db_session.refresh(ai_interaction)

    assert lesson.steps[0].title == "Read problem"
    assert lesson.lesson_sources[0].source_version.source.publisher == "CodeMind"
    assert learning_session.attempts[0].lesson_step_id == step.id
    assert learning_session.terms[0].term_normalized == "hash map"
    assert learning_session.concept_answers[0].is_correct == 1
    assert submission.test_results[0].status == "passed"
    assert ai_interaction.hints[0].level == 1
    assert db_session.query(Evidence).filter_by(learning_session_id=learning_session.id).one().passed_count == 3

    # Verify UTC ISO-8601 Z serialization in to_dict()
    session_dict = learning_session.to_dict()
    assert session_dict["started_at"].endswith("Z")

    # Duplicate lesson (slug, version) fails unique constraint
    db_session.add(
        Lesson(
            id=uid(),
            slug="two-sum-test",
            version=1,
            title="Duplicate",
            objective="Dup",
            status="draft",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    # Deleting LearningSession cascades to all child records
    child_checks = [
        (StepAttempt, attempt.id),
        (TermSelection, term.id),
        (ConceptAnswer, concept.id),
        (Submission, submission.id),
        (TestResult, test_res.id),
        (AIInteraction, ai_interaction.id),
        (AIHint, ai_hint.id),
        (Evidence, evidence.id),
    ]
    ls_obj = db_session.get(LearningSession, learning_session.id)
    assert ls_obj is not None
    db_session.delete(ls_obj)
    db_session.commit()
    db_session.expire_all()

    for model_cls, child_id in child_checks:
        assert db_session.get(model_cls, child_id) is None


def test_kanban_project_milestone_task_dependencies_and_cascades(db_session: Session) -> None:
    """Kiểm tra quan hệ Project/Team/Milestone/KanbanBoard/Column/Task/TaskDependency và SET NULL / CASCADE."""
    # Naive datetime input must auto-normalize to UTC via H4DateTime/UTCDateTime
    naive_deadline = datetime(2026, 12, 1, 9, 30, 0)
    project = Project(
        id=uid(),
        title="CapStone App",
        description="Agile Kanban H4",
        mode="team",
        deadline_utc=naive_deadline,
    )
    leader = User(
        id=uid(),
        email="leader@codemind.edu.vn",
        password_hash=hash_password("Lead@123"),
        full_name="Team Leader",
        display_name="Leader",
        role="student",
        status="active",
        is_active=True,
    )
    db_session.add_all([project, leader])
    db_session.flush()
    team = Team(id=uid(), project=project, team_name="Team Alpha", leader_id=leader.id)
    milestone = Milestone(
        id=uid(),
        project=project,
        title="Sprint 1",
        due_date_utc=datetime.now(timezone.utc) + timedelta(days=7),
    )
    board = KanbanBoard(id=uid(), project=project, title="Main Board")
    col_todo = KanbanColumn(id=uid(), board=board, title="To Do", position_order=0)
    task_a = Task(
        id=uid(),
        board=board,
        column=col_todo,
        milestone=milestone,
        assignee_id=leader.id,
        title="Design DB",
        priority="high",
        position_order=0,
    )
    task_b = Task(
        id=uid(),
        board=board,
        column=col_todo,
        milestone=milestone,
        title="Build API",
        priority="medium",
        position_order=1,
    )
    db_session.add_all([team, milestone, board, col_todo, task_a, task_b])
    db_session.flush()
    dep = TaskDependency(id=uid(), task_id=task_b.id, depends_on_task_id=task_a.id)

    db_session.add(dep)
    db_session.commit()
    db_session.refresh(project)
    db_session.refresh(task_b)
    db_session.refresh(task_a)

    assert project.deadline_utc is not None
    assert project.deadline_utc.tzinfo == timezone.utc
    assert project.teams[0].leader_id == leader.id
    assert project.boards[0].columns[0].tasks[0].milestone.title == "Sprint 1"
    persisted_dep = db_session.query(TaskDependency).filter_by(task_id=task_b.id).one()
    assert persisted_dep.depends_on_task_id == task_a.id

    # Deleting Milestone sets Task.milestone_id -> NULL instead of deleting Task
    ms_obj = db_session.get(Milestone, milestone.id)
    assert ms_obj is not None
    db_session.delete(ms_obj)
    db_session.commit()
    db_session.refresh(task_a)
    assert task_a.milestone_id is None

    # Deleting Project cascades to teams, boards, columns, tasks, task_dependencies
    cascade_checks = [
        (Team, team.id),
        (KanbanBoard, board.id),
        (KanbanColumn, col_todo.id),
        (Task, task_a.id),
        (Task, task_b.id),
        (TaskDependency, dep.id),
    ]
    proj_obj = db_session.get(Project, project.id)
    assert proj_obj is not None
    db_session.delete(proj_obj)
    db_session.commit()
    db_session.expire_all()

    for model_cls, row_id in cascade_checks:
        assert db_session.get(model_cls, row_id) is None
