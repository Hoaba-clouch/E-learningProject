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

    # 3. concept_answers
    ca_cols = {col[1] for col in conn.execute("PRAGMA table_info(concept_answers)").fetchall()}
    if ca_cols and "answered_at" not in ca_cols:
        conn.execute("ALTER TABLE concept_answers ADD COLUMN answered_at TEXT DEFAULT ''")


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
            """
        )
        _migrate_existing_tables(conn)
        seed_data(conn)


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
