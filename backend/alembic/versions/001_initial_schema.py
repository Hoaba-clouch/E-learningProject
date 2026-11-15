"""Initial schema version 001 (CodeMind Campus SQLAlchemy UTC H4)

Revision ID: 001
Revises:
Create Date: 2026-11-12 00:00:00+00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from app.models.base import H4DateTime

revision: str = "001"
down_revision: str | None = None
branch_labels: tuple[str, ...] | None = None
depends_on: tuple[str, ...] | None = None


def upgrade() -> None:
    """Khởi tạo toàn bộ 29 bảng lõi CodeMind Campus theo chuẩn H4 UTC."""
    op.create_table(
        "analytics_events",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=True),
        sa.Column("session_id", sa.String(length=64), nullable=True),
        sa.Column("event_name", sa.String(length=128), nullable=False),
        sa.Column("properties", sa.Text(), nullable=False),
        sa.Column("occurred_at", H4DateTime, nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analytics_events_event_name", "analytics_events", ["event_name"], unique=False)
    op.create_index("ix_analytics_events_session_id", "analytics_events", ["session_id"], unique=False)
    op.create_index("ix_analytics_events_user_id", "analytics_events", ["user_id"], unique=False)

    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("actor_user_id", sa.String(length=64), nullable=True),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("resource_type", sa.String(length=64), nullable=False),
        sa.Column("resource_id", sa.String(length=64), nullable=True),
        sa.Column("decision", sa.String(length=32), nullable=False),
        sa.Column("reason_code", sa.String(length=64), nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_events_actor_user_id", "audit_events", ["actor_user_id"], unique=False)

    op.create_table(
        "lessons",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("course_id", sa.String(length=64), nullable=True),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("published_at", H4DateTime, nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", "version", name="uq_lesson_slug_version"),
    )
    op.create_index("ix_lessons_slug", "lessons", ["slug"], unique=False)
    op.create_index("ix_lessons_status", "lessons", ["status"], unique=False)

    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("mode", sa.String(length=32), nullable=False),
        sa.Column("deadline_utc", H4DateTime, nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "sources",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("canonical_url", sa.String(length=512), nullable=False),
        sa.Column("publisher", sa.String(length=255), nullable=False),
        sa.Column("trust_status", sa.String(length=32), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("canonical_url"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("locale", sa.String(length=32), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("theme_preference", sa.String(length=32), nullable=False),
        sa.Column("role_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_role", "users", ["role"], unique=False)

    op.create_table(
        "consents",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("purpose", sa.String(length=64), nullable=False),
        sa.Column("policy_version", sa.String(length=32), nullable=False),
        sa.Column("granted", sa.Integer(), nullable=False),
        sa.Column("granted_at", H4DateTime, nullable=True),
        sa.Column("revoked_at", H4DateTime, nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "purpose", name="uq_consent_user_purpose"),
    )
    op.create_index("ix_consents_user_id", "consents", ["user_id"], unique=False)

    op.create_table(
        "kanban_boards",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("project_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kanban_boards_project_id", "kanban_boards", ["project_id"], unique=False)

    op.create_table(
        "learning_sessions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("lesson_id", sa.String(length=64), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("current_step_no", sa.Integer(), nullable=False),
        sa.Column("progress_version", sa.Integer(), nullable=False),
        sa.Column("teacher_visibility", sa.Integer(), nullable=False),
        sa.Column("started_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=True),
        sa.Column("completed_at", H4DateTime, nullable=True),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_learning_sessions_lesson_id", "learning_sessions", ["lesson_id"], unique=False)
    op.create_index("ix_learning_sessions_organization_id", "learning_sessions", ["organization_id"], unique=False)
    op.create_index("ix_learning_sessions_user_id", "learning_sessions", ["user_id"], unique=False)

    op.create_table(
        "lesson_steps",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("lesson_id", sa.String(length=64), nullable=False),
        sa.Column("sequence_no", sa.Integer(), nullable=False),
        sa.Column("step_type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("completion_rule", sa.Text(), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lesson_id", "sequence_no", name="uq_lesson_step_seq"),
    )
    op.create_index("ix_lesson_steps_lesson_id", "lesson_steps", ["lesson_id"], unique=False)

    op.create_table(
        "memberships",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_membership_org_user"),
    )
    op.create_index("ix_memberships_organization_id", "memberships", ["organization_id"], unique=False)
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"], unique=False)

    op.create_table(
        "milestones",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("project_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date_utc", H4DateTime, nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_milestones_project_id", "milestones", ["project_id"], unique=False)

    op.create_table(
        "source_versions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("source_id", sa.String(length=64), nullable=False),
        sa.Column("version_label", sa.String(length=64), nullable=False),
        sa.Column("content_text", sa.Text(), nullable=False),
        sa.Column("content_sha256", sa.String(length=64), nullable=False),
        sa.Column("retrieved_at", H4DateTime, nullable=False),
        sa.Column("availability_status", sa.String(length=32), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_id", "version_label", name="uq_source_version_label"),
    )
    op.create_index("ix_source_versions_source_id", "source_versions", ["source_id"], unique=False)

    op.create_table(
        "student_notes",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("assignment_id", sa.String(length=64), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("code_snippet", sa.Text(), nullable=True),
        sa.Column("tags", sa.Text(), nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_student_notes_assignment_id", "student_notes", ["assignment_id"], unique=False)
    op.create_index("ix_student_notes_user_id", "student_notes", ["user_id"], unique=False)

    op.create_table(
        "student_profiles",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("current_streak", sa.Integer(), nullable=False),
        sa.Column("longest_streak", sa.Integer(), nullable=False),
        sa.Column("streak_freezes_available", sa.Integer(), nullable=False),
        sa.Column("last_activity_date", sa.String(length=20), nullable=True),
        sa.Column("exp_points", sa.Integer(), nullable=False),
        sa.Column("selected_title", sa.String(length=128), nullable=False),
        sa.Column("radar_algorithm", sa.Float(), nullable=False),
        sa.Column("radar_debugging", sa.Float(), nullable=False),
        sa.Column("radar_cleancode", sa.Float(), nullable=False),
        sa.Column("radar_teamwork", sa.Float(), nullable=False),
        sa.Column("radar_defense", sa.Float(), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_student_profiles_user_id", "student_profiles", ["user_id"], unique=True)

    op.create_table(
        "teams",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("project_id", sa.String(length=64), nullable=False),
        sa.Column("team_name", sa.String(length=255), nullable=False),
        sa.Column("leader_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_teams_project_id", "teams", ["project_id"], unique=False)

    op.create_table(
        "ai_interactions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("learning_session_id", sa.String(length=64), nullable=False),
        sa.Column("submission_id", sa.String(length=64), nullable=True),
        sa.Column("user_message", sa.Text(), nullable=False),
        sa.Column("assistant_message", sa.Text(), nullable=False),
        sa.Column("policy_decision", sa.String(length=64), nullable=False),
        sa.Column("model_id", sa.String(length=128), nullable=False),
        sa.Column("prompt_version", sa.String(length=64), nullable=False),
        sa.Column("citation_json", sa.Text(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["learning_session_id"], ["learning_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_interactions_learning_session_id", "ai_interactions", ["learning_session_id"], unique=False)

    op.create_table(
        "concept_answers",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("learning_session_id", sa.String(length=64), nullable=False),
        sa.Column("relation_key", sa.String(length=128), nullable=False),
        sa.Column("selected_option", sa.String(length=255), nullable=False),
        sa.Column("is_correct", sa.Integer(), nullable=False),
        sa.Column("rule_version", sa.String(length=64), nullable=False),
        sa.Column("answered_at", H4DateTime, nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["learning_session_id"], ["learning_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_concept_answers_learning_session_id", "concept_answers", ["learning_session_id"], unique=False)

    op.create_table(
        "evidence",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("learning_session_id", sa.String(length=64), nullable=False),
        sa.Column("first_submission_id", sa.String(length=64), nullable=False),
        sa.Column("final_submission_id", sa.String(length=64), nullable=False),
        sa.Column("hint_count", sa.Integer(), nullable=False),
        sa.Column("passed_count", sa.Integer(), nullable=False),
        sa.Column("evidence_sha256", sa.String(length=64), nullable=False),
        sa.Column("completed_at", H4DateTime, nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["learning_session_id"], ["learning_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_evidence_learning_session_id", "evidence", ["learning_session_id"], unique=True)

    op.create_table(
        "kanban_columns",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("board_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("position_order", sa.Integer(), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["board_id"], ["kanban_boards.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kanban_columns_board_id", "kanban_columns", ["board_id"], unique=False)

    op.create_table(
        "lesson_sources",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("lesson_id", sa.String(length=64), nullable=False),
        sa.Column("source_version_id", sa.String(length=64), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["lesson_id"], ["lessons.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_version_id"], ["source_versions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lesson_id", "source_version_id", name="uq_lesson_source_ver"),
    )
    op.create_index("ix_lesson_sources_lesson_id", "lesson_sources", ["lesson_id"], unique=False)
    op.create_index("ix_lesson_sources_source_version_id", "lesson_sources", ["source_version_id"], unique=False)

    op.create_table(
        "step_attempts",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("learning_session_id", sa.String(length=64), nullable=False),
        sa.Column("lesson_step_id", sa.String(length=64), nullable=False),
        sa.Column("attempt_no", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("completed_at", H4DateTime, nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["learning_session_id"], ["learning_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lesson_step_id"], ["lesson_steps.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("learning_session_id", "lesson_step_id", "attempt_no", name="uq_step_attempt"),
    )
    op.create_index("ix_step_attempts_learning_session_id", "step_attempts", ["learning_session_id"], unique=False)
    op.create_index("ix_step_attempts_lesson_step_id", "step_attempts", ["lesson_step_id"], unique=False)

    op.create_table(
        "submissions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("learning_session_id", sa.String(length=64), nullable=False),
        sa.Column("exercise_id", sa.String(length=64), nullable=True),
        sa.Column("programming_language", sa.String(length=32), nullable=False),
        sa.Column("source_code", sa.Text(), nullable=False),
        sa.Column("source_sha256", sa.String(length=64), nullable=False),
        sa.Column("submission_no", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("passed_count", sa.Integer(), nullable=False),
        sa.Column("total_count", sa.Integer(), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["learning_session_id"], ["learning_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_submissions_idempotency_key", "submissions", ["idempotency_key"], unique=True)
    op.create_index("ix_submissions_learning_session_id", "submissions", ["learning_session_id"], unique=False)

    op.create_table(
        "term_selections",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("learning_session_id", sa.String(length=64), nullable=False),
        sa.Column("source_version_id", sa.String(length=64), nullable=False),
        sa.Column("term_text", sa.String(length=255), nullable=False),
        sa.Column("term_normalized", sa.String(length=255), nullable=False),
        sa.Column("context_excerpt", sa.Text(), nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["learning_session_id"], ["learning_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("learning_session_id", "term_normalized", name="uq_term_session_normalized"),
    )
    op.create_index("ix_term_selections_learning_session_id", "term_selections", ["learning_session_id"], unique=False)

    op.create_table(
        "ai_hints",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("ai_interaction_id", sa.String(length=64), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("hint_text", sa.Text(), nullable=False),
        sa.Column("opened_at", H4DateTime, nullable=False),
        sa.Column("policy_passed", sa.Integer(), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["ai_interaction_id"], ["ai_interactions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ai_interaction_id", "level", name="uq_ai_hint_level"),
    )
    op.create_index("ix_ai_hints_ai_interaction_id", "ai_hints", ["ai_interaction_id"], unique=False)

    op.create_table(
        "tasks",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("board_id", sa.String(length=64), nullable=False),
        sa.Column("column_id", sa.String(length=64), nullable=False),
        sa.Column("milestone_id", sa.String(length=64), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("assignee_id", sa.String(length=64), nullable=True),
        sa.Column("priority", sa.String(length=32), nullable=False),
        sa.Column("due_date_utc", H4DateTime, nullable=True),
        sa.Column("position_order", sa.Integer(), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["board_id"], ["kanban_boards.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["column_id"], ["kanban_columns.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["milestone_id"], ["milestones.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasks_assignee_id", "tasks", ["assignee_id"], unique=False)
    op.create_index("ix_tasks_board_id", "tasks", ["board_id"], unique=False)
    op.create_index("ix_tasks_column_id", "tasks", ["column_id"], unique=False)
    op.create_index("ix_tasks_milestone_id", "tasks", ["milestone_id"], unique=False)

    op.create_table(
        "test_results",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("submission_id", sa.String(length=64), nullable=False),
        sa.Column("sequence_no", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("safe_message", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.Column("updated_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_test_results_submission_id", "test_results", ["submission_id"], unique=False)

    op.create_table(
        "task_dependencies",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("task_id", sa.String(length=64), nullable=False),
        sa.Column("depends_on_task_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", H4DateTime, nullable=False),
        sa.ForeignKeyConstraint(["depends_on_task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("task_id", "depends_on_task_id", name="uq_task_dependency"),
    )
    op.create_index("ix_task_dependencies_depends_on_task_id", "task_dependencies", ["depends_on_task_id"], unique=False)
    op.create_index("ix_task_dependencies_task_id", "task_dependencies", ["task_id"], unique=False)


def downgrade() -> None:
    """Hoàn tác toàn bộ schema version 001 theo thứ tự ngược ràng buộc khóa ngoại."""
    op.drop_index("ix_task_dependencies_task_id", table_name="task_dependencies")
    op.drop_index("ix_task_dependencies_depends_on_task_id", table_name="task_dependencies")
    op.drop_table("task_dependencies")

    op.drop_index("ix_test_results_submission_id", table_name="test_results")
    op.drop_table("test_results")

    op.drop_index("ix_tasks_milestone_id", table_name="tasks")
    op.drop_index("ix_tasks_column_id", table_name="tasks")
    op.drop_index("ix_tasks_board_id", table_name="tasks")
    op.drop_index("ix_tasks_assignee_id", table_name="tasks")
    op.drop_table("tasks")

    op.drop_index("ix_ai_hints_ai_interaction_id", table_name="ai_hints")
    op.drop_table("ai_hints")

    op.drop_index("ix_term_selections_learning_session_id", table_name="term_selections")
    op.drop_table("term_selections")

    op.drop_index("ix_submissions_learning_session_id", table_name="submissions")
    op.drop_index("ix_submissions_idempotency_key", table_name="submissions")
    op.drop_table("submissions")

    op.drop_index("ix_step_attempts_lesson_step_id", table_name="step_attempts")
    op.drop_index("ix_step_attempts_learning_session_id", table_name="step_attempts")
    op.drop_table("step_attempts")

    op.drop_index("ix_lesson_sources_source_version_id", table_name="lesson_sources")
    op.drop_index("ix_lesson_sources_lesson_id", table_name="lesson_sources")
    op.drop_table("lesson_sources")

    op.drop_index("ix_kanban_columns_board_id", table_name="kanban_columns")
    op.drop_table("kanban_columns")

    op.drop_index("ix_evidence_learning_session_id", table_name="evidence")
    op.drop_table("evidence")

    op.drop_index("ix_concept_answers_learning_session_id", table_name="concept_answers")
    op.drop_table("concept_answers")

    op.drop_index("ix_ai_interactions_learning_session_id", table_name="ai_interactions")
    op.drop_table("ai_interactions")

    op.drop_index("ix_teams_project_id", table_name="teams")
    op.drop_table("teams")

    op.drop_index("ix_student_profiles_user_id", table_name="student_profiles")
    op.drop_table("student_profiles")

    op.drop_index("ix_student_notes_user_id", table_name="student_notes")
    op.drop_index("ix_student_notes_assignment_id", table_name="student_notes")
    op.drop_table("student_notes")

    op.drop_index("ix_source_versions_source_id", table_name="source_versions")
    op.drop_table("source_versions")

    op.drop_index("ix_milestones_project_id", table_name="milestones")
    op.drop_table("milestones")

    op.drop_index("ix_memberships_user_id", table_name="memberships")
    op.drop_index("ix_memberships_organization_id", table_name="memberships")
    op.drop_table("memberships")

    op.drop_index("ix_lesson_steps_lesson_id", table_name="lesson_steps")
    op.drop_table("lesson_steps")

    op.drop_index("ix_learning_sessions_user_id", table_name="learning_sessions")
    op.drop_index("ix_learning_sessions_organization_id", table_name="learning_sessions")
    op.drop_index("ix_learning_sessions_lesson_id", table_name="learning_sessions")
    op.drop_table("learning_sessions")

    op.drop_index("ix_kanban_boards_project_id", table_name="kanban_boards")
    op.drop_table("kanban_boards")

    op.drop_index("ix_consents_user_id", table_name="consents")
    op.drop_table("consents")

    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    op.drop_table("sources")
    op.drop_table("projects")
    op.drop_table("organizations")

    op.drop_index("ix_lessons_status", table_name="lessons")
    op.drop_index("ix_lessons_slug", table_name="lessons")
    op.drop_table("lessons")

    op.drop_index("ix_audit_events_actor_user_id", table_name="audit_events")
    op.drop_table("audit_events")

    op.drop_index("ix_analytics_events_user_id", table_name="analytics_events")
    op.drop_index("ix_analytics_events_session_id", table_name="analytics_events")
    op.drop_index("ix_analytics_events_event_name", table_name="analytics_events")
    op.drop_table("analytics_events")
