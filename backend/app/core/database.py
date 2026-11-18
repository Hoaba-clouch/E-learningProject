from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from typing import Any, Iterator

from app.core.config import DB_PATH
from app.core.timezone import now_utc
from app.core.security import uid, sha256, hash_password


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    """Context manager kết nối CSDL SQLite với Foreign Keys enabled."""
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def row_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    """Chuyển đổi sqlite3.Row thành dict Python an toàn."""
    return dict(row) if row else None


def _migrate_existing_tables(conn: sqlite3.Connection) -> None:
    """Tự động thêm các cột mới cho database đã tồn tại từ trước (zero downtime migration)."""
    # 1. users
    user_cols = {col[1] for col in conn.execute("PRAGMA table_info(users)").fetchall()}
    if user_cols and "timezone" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh'")
    if user_cols and "theme_preference" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN theme_preference TEXT DEFAULT 'one-dark'")
    if user_cols and "password_hash" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
    if user_cols and "full_name" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN full_name TEXT")
    if user_cols and "role" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'")

    # Cập nhật thông tin và mật khẩu băm Bcrypt cho các tài khoản demo nếu chưa có
    demo_credentials = {
        "student-demo": ("Student@123", "Minh Anh", "student"),
        "instructor-demo": ("Instructor@123", "Cô Linh", "instructor"),
        "admin-demo": ("Admin@123", "Content Admin", "admin"),
    }
    for uid_key, (pwd, d_name, r_name) in demo_credentials.items():
        existing_user = conn.execute("SELECT id, password_hash, full_name, role FROM users WHERE id=?", (uid_key,)).fetchone()
        if existing_user:
            updates = []
            params = []
            if not existing_user["password_hash"]:
                updates.append("password_hash=?")
                params.append(hash_password(pwd))
            if not existing_user["full_name"]:
                updates.append("full_name=?")
                params.append(d_name)
            if existing_user["role"] != r_name:
                updates.append("role=?")
                params.append(r_name)
            if updates:
                params.append(uid_key)
                conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id=?", tuple(params))

    # 2. learning_sessions
    ls_cols = {col[1] for col in conn.execute("PRAGMA table_info(learning_sessions)").fetchall()}
    if ls_cols and "updated_at" not in ls_cols:
        conn.execute("ALTER TABLE learning_sessions ADD COLUMN updated_at TEXT")
    if ls_cols and "course_code" not in ls_cols:
        conn.execute("ALTER TABLE learning_sessions ADD COLUMN course_code TEXT DEFAULT 'CS201'")
    if ls_cols and "socratic_note" not in ls_cols:
        conn.execute("ALTER TABLE learning_sessions ADD COLUMN socratic_note TEXT DEFAULT ''")
    if ls_cols and "time_spent_min" not in ls_cols:
        conn.execute("ALTER TABLE learning_sessions ADD COLUMN time_spent_min INTEGER DEFAULT 20")
    if ls_cols and "step_logs_json" not in ls_cols:
        conn.execute("ALTER TABLE learning_sessions ADD COLUMN step_logs_json TEXT DEFAULT '[]'")

    # 3. concept_answers
    ca_cols = {col[1] for col in conn.execute("PRAGMA table_info(concept_answers)").fetchall()}
    if ca_cols and "answered_at" not in ca_cols:
        conn.execute("ALTER TABLE concept_answers ADD COLUMN answered_at TEXT DEFAULT ''")

    # 4. users (mở rộng phục vụ RBAC & Admin Console)
    if user_cols and "user_code" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN user_code TEXT DEFAULT ''")
    if user_cols and "last_active_label" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN last_active_label TEXT DEFAULT 'Vừa xong'")
    if user_cols and "last_device" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN last_device TEXT DEFAULT 'Web Session'")
    if user_cols and "classes_count" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN classes_count INTEGER DEFAULT 3")

    # 5. audit_events (mở rộng nhãn hiển thị Admin Console)
    audit_cols = {col[1] for col in conn.execute("PRAGMA table_info(audit_events)").fetchall()}
    if audit_cols and "actor_label" not in audit_cols:
        conn.execute("ALTER TABLE audit_events ADD COLUMN actor_label TEXT")
    if audit_cols and "target_label" not in audit_cols:
        conn.execute("ALTER TABLE audit_events ADD COLUMN target_label TEXT")
    if audit_cols and "category" not in audit_cols:
        conn.execute("ALTER TABLE audit_events ADD COLUMN category TEXT DEFAULT 'security'")

    # 6. student_profiles (mở rộng XP Shop & Quests)
    sp_cols = {col[1] for col in conn.execute("PRAGMA table_info(student_profiles)").fetchall()}
    if sp_cols and "owned_items_json" not in sp_cols:
        conn.execute("ALTER TABLE student_profiles ADD COLUMN owned_items_json TEXT DEFAULT '{}'")
    if sp_cols and "claimed_quests_json" not in sp_cols:
        conn.execute("ALTER TABLE student_profiles ADD COLUMN claimed_quests_json TEXT DEFAULT '[\"q3\"]'")

    # 7. student_notes (mở rộng ghi chú mốc thời gian video F8)
    sn_cols = {col[1] for col in conn.execute("PRAGMA table_info(student_notes)").fetchall()}
    if sn_cols and "subject_id" not in sn_cols:
        conn.execute("ALTER TABLE student_notes ADD COLUMN subject_id TEXT DEFAULT 'oop'")
    if sn_cols and "lesson_id" not in sn_cols:
        conn.execute("ALTER TABLE student_notes ADD COLUMN lesson_id TEXT DEFAULT '1.1'")
    if sn_cols and "time_sec" not in sn_cols:
        conn.execute("ALTER TABLE student_notes ADD COLUMN time_sec INTEGER DEFAULT 0")
    if sn_cols and "timestamp_label" not in sn_cols:
        conn.execute("ALTER TABLE student_notes ADD COLUMN timestamp_label TEXT DEFAULT '00:00'")

    # 8. users (bảo mật tài khoản: 2FA, Brute-Force Lockout, Lịch sử đổi mật khẩu)
    if user_cols and "two_factor_enabled" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0")
    if user_cols and "failed_login_attempts" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0")
    if user_cols and "locked_until" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN locked_until TEXT")
    if user_cols and "password_changed_at" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN password_changed_at TEXT")

    # 9. jwt_sessions (quản lý phiên đăng nhập đa thiết bị & token rotation)
    jwt_cols = {col[1] for col in conn.execute("PRAGMA table_info(jwt_sessions)").fetchall()}
    if jwt_cols and "refresh_jti" not in jwt_cols:
        conn.execute("ALTER TABLE jwt_sessions ADD COLUMN refresh_jti TEXT")
    if jwt_cols and "token_hash" not in jwt_cols:
        conn.execute("ALTER TABLE jwt_sessions ADD COLUMN token_hash TEXT")
    if jwt_cols and "device_type" not in jwt_cols:
        conn.execute("ALTER TABLE jwt_sessions ADD COLUMN device_type TEXT DEFAULT 'desktop'")
    if jwt_cols and "browser" not in jwt_cols:
        conn.execute("ALTER TABLE jwt_sessions ADD COLUMN browser TEXT DEFAULT 'Chrome'")
    if jwt_cols and "os" not in jwt_cols:
        conn.execute("ALTER TABLE jwt_sessions ADD COLUMN os TEXT DEFAULT 'Windows 11'")
    if jwt_cols and "last_active_at" not in jwt_cols:
        conn.execute("ALTER TABLE jwt_sessions ADD COLUMN last_active_at TEXT")
    if jwt_cols and "created_at" not in jwt_cols:
        conn.execute("ALTER TABLE jwt_sessions ADD COLUMN created_at TEXT")
    if jwt_cols and "revoked_at" not in jwt_cols:
        conn.execute("ALTER TABLE jwt_sessions ADD COLUMN revoked_at TEXT")


def init_db() -> None:
    """Khởi tạo toàn bộ bảng CSDL chuẩn mực và seed dữ liệu ban đầu."""
    with db() as conn:
        conn.executescript(
            """
            -- 1. Users & Organizations
            CREATE TABLE IF NOT EXISTS organizations (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT,
                full_name TEXT NOT NULL, display_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                status TEXT NOT NULL DEFAULT 'active', locale TEXT NOT NULL DEFAULT 'vi-VN',
                timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh', theme_preference TEXT NOT NULL DEFAULT 'one-dark',
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS memberships (
                id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, user_id TEXT NOT NULL,
                role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
                UNIQUE(organization_id, user_id),
                FOREIGN KEY(organization_id) REFERENCES organizations(id),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS consents (
                id TEXT PRIMARY KEY, user_id TEXT NOT NULL, purpose TEXT NOT NULL,
                policy_version TEXT NOT NULL, granted INTEGER NOT NULL DEFAULT 0,
                granted_at TEXT, revoked_at TEXT, updated_at TEXT NOT NULL,
                UNIQUE(user_id, purpose), FOREIGN KEY(user_id) REFERENCES users(id)
            );

            -- 2. LMS & Lessons (Nhánh 1)
            CREATE TABLE IF NOT EXISTS lessons (
                id TEXT PRIMARY KEY, slug TEXT NOT NULL, version INTEGER NOT NULL,
                title TEXT NOT NULL, objective TEXT NOT NULL, status TEXT NOT NULL,
                published_at TEXT, UNIQUE(slug, version)
            );
            CREATE TABLE IF NOT EXISTS lesson_steps (
                id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL, sequence_no INTEGER NOT NULL,
                step_type TEXT NOT NULL, title TEXT NOT NULL, completion_rule TEXT NOT NULL,
                UNIQUE(lesson_id, sequence_no), FOREIGN KEY(lesson_id) REFERENCES lessons(id)
            );
            CREATE TABLE IF NOT EXISTS sources (
                id TEXT PRIMARY KEY, canonical_url TEXT NOT NULL UNIQUE, publisher TEXT NOT NULL,
                trust_status TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS source_versions (
                id TEXT PRIMARY KEY, source_id TEXT NOT NULL, version_label TEXT NOT NULL,
                content_text TEXT NOT NULL, content_sha256 TEXT NOT NULL,
                retrieved_at TEXT NOT NULL, availability_status TEXT NOT NULL,
                UNIQUE(source_id, version_label), FOREIGN KEY(source_id) REFERENCES sources(id)
            );
            CREATE TABLE IF NOT EXISTS lesson_sources (
                id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL, source_version_id TEXT NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 1,
                UNIQUE(lesson_id, source_version_id), FOREIGN KEY(lesson_id) REFERENCES lessons(id),
                FOREIGN KEY(source_version_id) REFERENCES source_versions(id)
            );

            -- 3. Learning Sessions, Terms & Checks
            CREATE TABLE IF NOT EXISTS learning_sessions (
                id TEXT PRIMARY KEY, user_id TEXT NOT NULL, lesson_id TEXT NOT NULL,
                organization_id TEXT, status TEXT NOT NULL DEFAULT 'in_progress',
                current_step_no INTEGER NOT NULL DEFAULT 1, progress_version INTEGER NOT NULL DEFAULT 1,
                teacher_visibility INTEGER NOT NULL DEFAULT 0, started_at TEXT NOT NULL,
                updated_at TEXT, completed_at TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id),
                FOREIGN KEY(lesson_id) REFERENCES lessons(id)
            );
            CREATE TABLE IF NOT EXISTS step_attempts (
                id TEXT PRIMARY KEY, learning_session_id TEXT NOT NULL, lesson_step_id TEXT NOT NULL,
                attempt_no INTEGER NOT NULL, status TEXT NOT NULL, completed_at TEXT,
                UNIQUE(learning_session_id, lesson_step_id, attempt_no),
                FOREIGN KEY(learning_session_id) REFERENCES learning_sessions(id),
                FOREIGN KEY(lesson_step_id) REFERENCES lesson_steps(id)
            );
            CREATE TABLE IF NOT EXISTS term_selections (
                id TEXT PRIMARY KEY, learning_session_id TEXT NOT NULL, source_version_id TEXT NOT NULL,
                term_text TEXT NOT NULL, term_normalized TEXT NOT NULL, context_excerpt TEXT,
                UNIQUE(learning_session_id, term_normalized),
                FOREIGN KEY(learning_session_id) REFERENCES learning_sessions(id)
            );
            CREATE TABLE IF NOT EXISTS concept_answers (
                id TEXT PRIMARY KEY, learning_session_id TEXT NOT NULL, relation_key TEXT NOT NULL,
                selected_option TEXT NOT NULL, is_correct INTEGER NOT NULL, rule_version TEXT NOT NULL,
                answered_at TEXT,
                FOREIGN KEY(learning_session_id) REFERENCES learning_sessions(id)
            );

            -- 4. Submissions & Test Results
            CREATE TABLE IF NOT EXISTS submissions (
                id TEXT PRIMARY KEY, learning_session_id TEXT NOT NULL, source_code TEXT NOT NULL,
                source_sha256 TEXT NOT NULL, submission_no INTEGER NOT NULL, idempotency_key TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL, passed_count INTEGER NOT NULL DEFAULT 0, total_count INTEGER NOT NULL DEFAULT 5,
                created_at TEXT NOT NULL, FOREIGN KEY(learning_session_id) REFERENCES learning_sessions(id)
            );
            CREATE TABLE IF NOT EXISTS test_results (
                id TEXT PRIMARY KEY, submission_id TEXT NOT NULL, sequence_no INTEGER NOT NULL,
                status TEXT NOT NULL, safe_message TEXT, duration_ms INTEGER,
                FOREIGN KEY(submission_id) REFERENCES submissions(id)
            );

            -- 5. Socratic AI Interactions & Hints
            CREATE TABLE IF NOT EXISTS ai_interactions (
                id TEXT PRIMARY KEY, learning_session_id TEXT NOT NULL, submission_id TEXT,
                user_message TEXT NOT NULL, assistant_message TEXT NOT NULL,
                policy_decision TEXT NOT NULL, model_id TEXT NOT NULL, prompt_version TEXT NOT NULL,
                citation_json TEXT NOT NULL, latency_ms INTEGER NOT NULL, created_at TEXT NOT NULL,
                FOREIGN KEY(learning_session_id) REFERENCES learning_sessions(id)
            );
            CREATE TABLE IF NOT EXISTS ai_hints (
                id TEXT PRIMARY KEY, ai_interaction_id TEXT NOT NULL, level INTEGER NOT NULL,
                hint_text TEXT NOT NULL, opened_at TEXT NOT NULL, policy_passed INTEGER NOT NULL,
                UNIQUE(ai_interaction_id, level), FOREIGN KEY(ai_interaction_id) REFERENCES ai_interactions(id)
            );
            CREATE TABLE IF NOT EXISTS evidence (
                id TEXT PRIMARY KEY, learning_session_id TEXT NOT NULL UNIQUE,
                first_submission_id TEXT NOT NULL, final_submission_id TEXT NOT NULL,
                hint_count INTEGER NOT NULL, passed_count INTEGER NOT NULL,
                evidence_sha256 TEXT NOT NULL, completed_at TEXT NOT NULL,
                FOREIGN KEY(learning_session_id) REFERENCES learning_sessions(id)
            );

            -- 6. Audit & Analytics
            CREATE TABLE IF NOT EXISTS audit_events (
                id TEXT PRIMARY KEY, actor_user_id TEXT, action TEXT NOT NULL,
                resource_type TEXT NOT NULL, resource_id TEXT, decision TEXT NOT NULL,
                reason_code TEXT, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS analytics_events (
                id TEXT PRIMARY KEY, user_id TEXT, session_id TEXT, event_name TEXT NOT NULL,
                properties TEXT NOT NULL, occurred_at TEXT NOT NULL
            );

            -- 7. Kanban & Engineering Project Workspace (Nhánh 2)
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
                mode TEXT NOT NULL DEFAULT 'team', deadline_utc TEXT, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS teams (
                id TEXT PRIMARY KEY, project_id TEXT NOT NULL, team_name TEXT NOT NULL, leader_id TEXT,
                FOREIGN KEY(project_id) REFERENCES projects(id)
            );
            CREATE TABLE IF NOT EXISTS kanban_boards (
                id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES projects(id)
            );
            CREATE TABLE IF NOT EXISTS kanban_columns (
                id TEXT PRIMARY KEY, board_id TEXT NOT NULL, title TEXT NOT NULL, position_order INTEGER NOT NULL,
                FOREIGN KEY(board_id) REFERENCES kanban_boards(id)
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY, board_id TEXT NOT NULL, column_id TEXT NOT NULL,
                title TEXT NOT NULL, description TEXT, assignee_id TEXT, priority TEXT DEFAULT 'medium',
                due_date_utc TEXT, position_order INTEGER NOT NULL, created_at TEXT NOT NULL,
                FOREIGN KEY(board_id) REFERENCES kanban_boards(id),
                FOREIGN KEY(column_id) REFERENCES kanban_columns(id)
            );
            CREATE TABLE IF NOT EXISTS task_dependencies (
                id TEXT PRIMARY KEY, task_id TEXT NOT NULL, depends_on_task_id TEXT NOT NULL,
                UNIQUE(task_id, depends_on_task_id),
                FOREIGN KEY(task_id) REFERENCES tasks(id),
                FOREIGN KEY(depends_on_task_id) REFERENCES tasks(id)
            );

            -- 8. Dev Gamification & Notes
            CREATE TABLE IF NOT EXISTS student_profiles (
                id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0, exp_points INTEGER DEFAULT 0,
                selected_title TEXT DEFAULT 'Novice Developer',
                radar_algorithm REAL DEFAULT 10.0, radar_debugging REAL DEFAULT 10.0,
                radar_cleancode REAL DEFAULT 10.0, radar_teamwork REAL DEFAULT 10.0,
                radar_defense REAL DEFAULT 10.0,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS student_notes (
                id TEXT PRIMARY KEY, user_id TEXT NOT NULL, assignment_id TEXT,
                title TEXT NOT NULL, content TEXT NOT NULL, code_snippet TEXT, tags TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            -- 9. Synchronized Multi-Role Platform Tables (Courses, Dual Grading, AI 3D Defense, Admin Governance)
            CREATE TABLE IF NOT EXISTS courses (
                id TEXT PRIMARY KEY,
                subject_id TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                semester TEXT NOT NULL,
                teacher_name TEXT NOT NULL,
                student_count INTEGER NOT NULL DEFAULT 40,
                avg_progress_pct INTEGER NOT NULL DEFAULT 72,
                pending_dual_reviews INTEGER NOT NULL DEFAULT 0,
                health TEXT NOT NULL DEFAULT 'Ổn định',
                room TEXT NOT NULL DEFAULT 'Lab A3-201',
                docker_image TEXT NOT NULL,
                sandbox_enabled INTEGER NOT NULL DEFAULT 1,
                ai_defense_enabled INTEGER NOT NULL DEFAULT 1,
                chapters_json TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS dual_submissions (
                id TEXT PRIMARY KEY,
                class_id TEXT NOT NULL,
                user_id TEXT,
                student_name TEXT NOT NULL,
                student_code TEXT NOT NULL,
                chapter_title TEXT NOT NULL,
                repo_url TEXT NOT NULL,
                submitted_at TEXT NOT NULL,
                passed_tests INTEGER NOT NULL DEFAULT 0,
                total_tests INTEGER NOT NULL DEFAULT 5,
                exec_time_ms INTEGER NOT NULL DEFAULT 24,
                memory_mb REAL NOT NULL DEFAULT 14.2,
                commit_hash TEXT NOT NULL DEFAULT 'a1b2c3d',
                commit_count INTEGER NOT NULL DEFAULT 4,
                similarity_pct INTEGER NOT NULL DEFAULT 8,
                test_details_json TEXT NOT NULL DEFAULT '[]',
                defense_status TEXT NOT NULL DEFAULT 'completed',
                defense_score INTEGER NOT NULL DEFAULT 80,
                coherence_summary TEXT NOT NULL DEFAULT '',
                transcript_json TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'pending',
                final_score INTEGER,
                instructor_feedback TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS defense_rubric_configs (
                id TEXT PRIMARY KEY,
                cicd_weight_pct INTEGER NOT NULL DEFAULT 60,
                defense_weight_pct INTEGER NOT NULL DEFAULT 40,
                strict_anti_copy_guardrail INTEGER NOT NULL DEFAULT 1,
                auto_flag_discrepancy_threshold INTEGER NOT NULL DEFAULT 25,
                mandatory_probes_json TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS defense_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                class_id TEXT NOT NULL DEFAULT 'class-oop',
                round_number INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'in_progress',
                architecture_score INTEGER NOT NULL DEFAULT 86,
                algorithm_score INTEGER NOT NULL DEFAULT 82,
                production_score INTEGER NOT NULL DEFAULT 88,
                final_defense_score INTEGER,
                transcript_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS jwt_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                jti TEXT,
                user_name TEXT NOT NULL,
                role TEXT NOT NULL,
                device TEXT NOT NULL,
                ip_location TEXT NOT NULL,
                state TEXT NOT NULL DEFAULT 'Hợp lệ (JWT + Refresh)',
                issued_at TEXT NOT NULL,
                is_untrusted INTEGER NOT NULL DEFAULT 0,
                revoked INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS pending_approvals (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                student_code TEXT NOT NULL,
                email TEXT NOT NULL,
                class_code TEXT NOT NULL,
                class_name TEXT NOT NULL,
                requested_role TEXT NOT NULL,
                risk_note TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ai_service_units (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                engine TEXT NOT NULL,
                usage_label TEXT NOT NULL,
                requests INTEGER NOT NULL DEFAULT 0,
                input_tokens INTEGER NOT NULL DEFAULT 0,
                output_tokens INTEGER NOT NULL DEFAULT 0,
                estimated_cost REAL NOT NULL DEFAULT 0.0,
                quota_pct INTEGER NOT NULL DEFAULT 0,
                bar_color TEXT NOT NULL DEFAULT '#14161a',
                active INTEGER NOT NULL DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS instructor_session_actions (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                instructor_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                note TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            -- 10. Student Learning Progress & Chapter Exercise Submissions (Nhánh 1 Fullstack)
            CREATE TABLE IF NOT EXISTS student_lesson_progress (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                subject_id TEXT NOT NULL,
                chapter_id TEXT NOT NULL,
                lesson_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'done',
                quiz_score INTEGER DEFAULT 0,
                quiz_total INTEGER DEFAULT 0,
                xp_earned INTEGER DEFAULT 0,
                completed_at TEXT NOT NULL,
                UNIQUE(user_id, subject_id, lesson_id),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS student_chapter_submissions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                subject_id TEXT NOT NULL,
                chapter_number INTEGER NOT NULL,
                exercise_id TEXT NOT NULL,
                exercise_title TEXT NOT NULL,
                repo_url TEXT NOT NULL,
                student_note TEXT DEFAULT '',
                score REAL NOT NULL,
                max_score REAL NOT NULL DEFAULT 10.0,
                tests_passed INTEGER NOT NULL,
                tests_total INTEGER NOT NULL,
                execution_time_ms INTEGER NOT NULL,
                anti_plagiarism_score REAL NOT NULL,
                rubric_json TEXT NOT NULL,
                ai_feedback_json TEXT NOT NULL,
                xp_awarded INTEGER NOT NULL DEFAULT 0,
                dual_submission_id TEXT,
                submitted_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            -- 11. Engineering Projects & Kanban Workspace (Nhánh 2 Fullstack)
            CREATE TABLE IF NOT EXISTS engineering_projects (
                id TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                name TEXT NOT NULL,
                client TEXT NOT NULL,
                course TEXT NOT NULL,
                sprint TEXT NOT NULL DEFAULT 'Sprint 1 (Tuần 1 - 4)',
                kind TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                fav INTEGER NOT NULL DEFAULT 0,
                due_date TEXT NOT NULL,
                due_text TEXT NOT NULL DEFAULT 'in 14 days',
                story_points_budget INTEGER NOT NULL DEFAULT 600,
                color_hex TEXT NOT NULL DEFAULT '#f29b23',
                tl_start REAL NOT NULL DEFAULT 10.0,
                tl_width REAL NOT NULL DEFAULT 36.0,
                tl_color TEXT NOT NULL DEFAULT 'amber',
                instructor_label TEXT NOT NULL DEFAULT 'Nguyễn Bá Hòa (Lead)',
                team_json TEXT NOT NULL DEFAULT '[]',
                created_by TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS engineering_tasks (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                code TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                column_id TEXT NOT NULL DEFAULT 'backlog',
                priority TEXT NOT NULL DEFAULT 'medium',
                moscow TEXT NOT NULL DEFAULT 'should',
                points INTEGER NOT NULL DEFAULT 3,
                assignee_json TEXT NOT NULL DEFAULT '{}',
                estimate_hours REAL NOT NULL DEFAULT 4.0,
                due_date TEXT NOT NULL DEFAULT '',
                epic TEXT NOT NULL DEFAULT 'Sprint Goal',
                epic_color TEXT NOT NULL DEFAULT 'bg-blue-50 text-blue-700 border-blue-200',
                depends_on TEXT,
                checklist_json TEXT NOT NULL DEFAULT '[]',
                dod_json TEXT NOT NULL DEFAULT '[]',
                user_story_json TEXT,
                acceptance_criteria TEXT,
                deliverable_json TEXT,
                submission_requirement TEXT,
                submission_url TEXT,
                is_bonus INTEGER NOT NULL DEFAULT 0,
                comments_count INTEGER NOT NULL DEFAULT 0,
                attachments_count INTEGER NOT NULL DEFAULT 0,
                audit_logs_json TEXT NOT NULL DEFAULT '[]',
                position_order INTEGER NOT NULL DEFAULT 0,
                xp_awarded INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES engineering_projects(id) ON DELETE CASCADE
            );

            -- 12. Git Project Hub, Commits & 2-Tier Pull Requests (Nhánh 3 Fullstack)
            CREATE TABLE IF NOT EXISTS git_repositories (
                project_id TEXT PRIMARY KEY,
                repo_url TEXT NOT NULL,
                repo_slug TEXT NOT NULL,
                target_branch TEXT NOT NULL DEFAULT 'main',
                default_merge_strategy TEXT NOT NULL DEFAULT 'squash',
                webhook_active INTEGER NOT NULL DEFAULT 1,
                cadence_variance_hours REAL NOT NULL DEFAULT 4.8,
                last_synced_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES engineering_projects(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS git_commits (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                sha TEXT NOT NULL,
                author_name TEXT NOT NULL,
                author_role TEXT NOT NULL,
                author_avatar TEXT NOT NULL,
                author_color TEXT NOT NULL,
                branch TEXT NOT NULL,
                branch_color TEXT NOT NULL,
                task_code TEXT,
                message TEXT NOT NULL,
                committed_at_label TEXT NOT NULL,
                time_ago_label TEXT NOT NULL,
                additions INTEGER NOT NULL DEFAULT 0,
                deletions INTEGER NOT NULL DEFAULT 0,
                files_changed_json TEXT NOT NULL DEFAULT '[]',
                cx INTEGER NOT NULL DEFAULT 70,
                cy INTEGER NOT NULL DEFAULT 225,
                position_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY(project_id) REFERENCES engineering_projects(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS git_pull_requests (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                pr_number INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                source_branch TEXT NOT NULL,
                target_branch TEXT NOT NULL DEFAULT 'develop',
                task_code TEXT,
                author_name TEXT NOT NULL,
                author_role TEXT NOT NULL DEFAULT 'Developer',
                author_avatar TEXT NOT NULL DEFAULT 'D',
                author_color TEXT NOT NULL DEFAULT '#2563eb',
                status TEXT NOT NULL DEFAULT 'open',
                merge_strategy TEXT NOT NULL DEFAULT 'squash',
                ai_review_score INTEGER NOT NULL DEFAULT 92,
                ai_blast_radius TEXT NOT NULL DEFAULT 'Low (3 files)',
                ai_summary TEXT NOT NULL DEFAULT '',
                ai_findings_json TEXT NOT NULL DEFAULT '[]',
                diff_preview_json TEXT NOT NULL DEFAULT '[]',
                defense_questions_json TEXT NOT NULL DEFAULT '[]',
                peer_reviewer TEXT,
                peer_approved INTEGER NOT NULL DEFAULT 0,
                peer_comment TEXT NOT NULL DEFAULT '',
                one_click_fixed INTEGER NOT NULL DEFAULT 0,
                dod_sha256 TEXT,
                dual_submission_id TEXT,
                xp_awarded INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                merged_at TEXT,
                FOREIGN KEY(project_id) REFERENCES engineering_projects(id) ON DELETE CASCADE
            );

            -- 13. Security OTP & Password Recovery Challenges
            CREATE TABLE IF NOT EXISTS security_otp_codes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                email TEXT NOT NULL,
                purpose TEXT NOT NULL,
                code_hash TEXT NOT NULL,
                challenge_token TEXT NOT NULL UNIQUE,
                device_hint TEXT,
                expires_at TEXT NOT NULL,
                consumed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        _migrate_existing_tables(conn)
        seed_data(conn)
        from app.services.seed_platform import seed_platform_data
        seed_platform_data(conn)
        from app.services.seed_kanban import seed_kanban_workspace
        seed_kanban_workspace(conn)
        from app.services.seed_git_hub import seed_git_hub_workspace
        seed_git_hub_workspace(conn)


def seed_data(conn: sqlite3.Connection) -> None:
    """Tạo dữ liệu demo mẫu nếu CSDL chưa có."""
    lesson = conn.execute("SELECT id FROM lessons WHERE slug = 'deque' AND version = 1").fetchone()
    if lesson:
        # Check if project workspace is seeded
        proj = conn.execute("SELECT id FROM projects WHERE id = 'project-demo-1'").fetchone()
        if not proj:
            created = now_utc()
            project_id = "project-demo-1"
            conn.execute(
                "INSERT INTO projects(id, title, description, mode, deadline_utc, created_at) VALUES(?,?,?,?,?,?)",
                (project_id, "CodeMind Campus Fullstack", "Dự án đồ án kỳ thực tập 2026", "team", "2026-12-31T23:59:59Z", created),
            )
            board_id = "board-demo-1"
            conn.execute("INSERT INTO kanban_boards(id, project_id, title) VALUES(?,?,?)", (board_id, project_id, "Sprint 1 Board"))
            cols = [
                ("col-1", board_id, "Backlog", 0),
                ("col-2", board_id, "Ready", 1),
                ("col-3", board_id, "In Progress", 2),
                ("col-4", board_id, "Review / PR", 3),
                ("col-5", board_id, "Done", 4),
            ]
            for cid, bid, ctitle, cpos in cols:
                conn.execute("INSERT INTO kanban_columns(id, board_id, title, position_order) VALUES(?,?,?,?)", (cid, bid, ctitle, cpos))
        return

    created = now_utc()
    org_id = "org-demo-codemind"
    conn.execute(
        "INSERT INTO organizations(id,name,status,created_at,updated_at) VALUES(?,?,?,?,?)",
        (org_id, "CodeMind Demo Campus", "active", created, created),
    )
    demo_users = [
        ("student-demo", "student.demo@codemind.local", hash_password("Student@123"), "Minh Anh", "student"),
        ("instructor-demo", "instructor.demo@codemind.local", hash_password("Instructor@123"), "Cô Linh", "instructor"),
        ("admin-demo", "admin.demo@codemind.local", hash_password("Admin@123"), "Content Admin", "admin"),
    ]
    for user_id, email, pwd_hash, display_name, role in demo_users:
        conn.execute(
            "INSERT INTO users(id,email,password_hash,full_name,display_name,role,status,locale,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
            (user_id, email, pwd_hash, display_name, display_name, role, "active", "vi-VN", created, created),
        )
        membership_role = "org_admin" if role == "admin" else role
        conn.execute(
            "INSERT INTO memberships(id,organization_id,user_id,role,status) VALUES(?,?,?,?,?)",
            (uid(), org_id, user_id, membership_role, "active"),
        )
        for purpose, granted in [("academic_integrity", 1 if role == "student" else 0), ("teacher_visibility", 1 if role == "student" else 0)]:
            conn.execute(
                "INSERT INTO consents(id,user_id,purpose,policy_version,granted,granted_at,updated_at) VALUES(?,?,?,?,?,?,?)",
                (uid(), user_id, purpose, "2026-08-01", granted, created if granted else None, created),
            )
        if role == "student":
            conn.execute(
                "INSERT INTO student_profiles(id,user_id,current_streak,longest_streak,exp_points,selected_title) VALUES(?,?,?,?,?,?)",
                (uid(), user_id, 3, 5, 240, "Bug Hunter"),
            )

    lesson_id = "lesson-deque-v1"
    conn.execute(
        "INSERT INTO lessons(id,slug,version,title,objective,status,published_at) VALUES(?,?,?,?,?,?,?)",
        (lesson_id, "deque", 1, "Hiểu deque bằng một lỗi có thật", "Dùng deque(maxlen=3) để lưu ba trang gần nhất và bỏ qua chuỗi rỗng.", "published", created),
    )
    steps = [
        (1, "objective", "Mục tiêu bài học"),
        (2, "source", "Đọc nguồn chính thức"),
        (3, "concept", "Nối khái niệm"),
        (4, "practice", "Chạy bộ kiểm thử"),
        (5, "ai", "Tự sửa sau gợi ý"),
        (6, "review", "Xem bằng chứng học tập"),
    ]
    for sequence_no, step_type, title in steps:
        conn.execute(
            "INSERT INTO lesson_steps(id,lesson_id,sequence_no,step_type,title,completion_rule) VALUES(?,?,?,?,?,?)",
            (uid(), lesson_id, sequence_no, step_type, title, json.dumps({"required": sequence_no < 6})),
        )
    source_id = "source-python-deque"
    content = (
        "collections.deque(maxlen)\n\n"
        "Deque có thể đặt độ dài tối đa bằng maxlen. Khi đã đầy, thêm phần tử mới sẽ loại phần tử ở đầu đối diện.\n\n"
        "maxlen chỉ giới hạn số phần tử; nó không tự xác thực page hay bỏ chuỗi rỗng trước khi append."
    )
    conn.execute(
        "INSERT INTO sources(id,canonical_url,publisher,trust_status) VALUES(?,?,?,?)",
        (source_id, "https://docs.python.org/3.12/library/collections.html#collections.deque", "Python Documentation", "verified"),
    )
    source_version_id = "source-version-python312-deque"
    conn.execute(
        "INSERT INTO source_versions(id,source_id,version_label,content_text,content_sha256,retrieved_at,availability_status) VALUES(?,?,?,?,?,?,?)",
        (source_version_id, source_id, "Python 3.12", content, sha256(content), created, "available"),
    )
    conn.execute(
        "INSERT INTO lesson_sources(id,lesson_id,source_version_id,display_order) VALUES(?,?,?,?)",
        (uid(), lesson_id, source_version_id, 1),
    )

    # Seed demo project for Kanban
    project_id = "project-demo-1"
    conn.execute(
        "INSERT INTO projects(id, title, description, mode, deadline_utc, created_at) VALUES(?,?,?,?,?,?)",
        (project_id, "CodeMind Campus Fullstack", "Dự án đồ án kỳ thực tập 2026", "team", "2026-12-31T23:59:59Z", created),
    )
    board_id = "board-demo-1"
    conn.execute("INSERT INTO kanban_boards(id, project_id, title) VALUES(?,?,?)", (board_id, project_id, "Sprint 1 Board"))
    cols = [
        ("col-1", board_id, "Backlog", 0),
        ("col-2", board_id, "Ready", 1),
        ("col-3", board_id, "In Progress", 2),
        ("col-4", board_id, "Review / PR", 3),
        ("col-5", board_id, "Done", 4),
    ]
    for cid, bid, ctitle, cpos in cols:
        conn.execute("INSERT INTO kanban_columns(id, board_id, title, position_order) VALUES(?,?,?,?)", (cid, bid, ctitle, cpos))
