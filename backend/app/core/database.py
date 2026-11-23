from __future__ import annotations

import json
import os
import re
from contextlib import contextmanager
from typing import Any, Iterator

import pymysql
import pymysql.cursors

from app.core.config import (
    MYSQL_HOST,
    MYSQL_PORT,
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DB,
)
from app.core.timezone import now_utc
from app.core.security import uid, sha256, hash_password


class MySQLCursorWrapper:
    """Wrapper cho PyMySQL Cursor: hỗ trợ cú pháp SQLite ('?'), tự động chuyển đổi sang MySQL ('%s')."""

    def __init__(self, cursor: pymysql.cursors.DictCursor):
        self._cursor = cursor
        self.rowcount = 0
        self.lastrowid = None

    @staticmethod
    def _replace_scalar_min_max(sql: str) -> str:
        res = []
        i = 0
        n = len(sql)
        while i < n:
            if (i == 0 or not sql[i-1].isalnum()) and sql[i:i+4].upper() in ("MAX(", "MIN("):
                is_max = sql[i:i+3].upper() == "MAX"
                fn_name = "GREATEST" if is_max else "LEAST"
                depth = 1
                has_comma_at_depth_1 = False
                j = i + 4
                while j < n and depth > 0:
                    if sql[j] == "(":
                        depth += 1
                    elif sql[j] == ")":
                        depth -= 1
                    elif sql[j] == "," and depth == 1:
                        has_comma_at_depth_1 = True
                    j += 1
                if has_comma_at_depth_1:
                    inner = MySQLCursorWrapper._replace_scalar_min_max(sql[i+4:j-1])
                    res.append(f"{fn_name}({inner})")
                    i = j
                    continue
            res.append(sql[i])
            i += 1
        return "".join(res)

    def _convert_sql(self, sql: str) -> str:
        # 1. Chuyển đổi '?' sang '%s', bảo vệ dấu '?' bên trong chuỗi nháy đơn/kép
        parts: list[str] = []
        in_single = False
        in_double = False
        i = 0
        n = len(sql)
        while i < n:
            ch = sql[i]
            if ch == "'" and not in_double:
                if i > 0 and sql[i - 1] == "\\":
                    pass
                else:
                    in_single = not in_single
                parts.append(ch)
            elif ch == '"' and not in_single:
                if i > 0 and sql[i - 1] == "\\":
                    pass
                else:
                    in_double = not in_double
                parts.append(ch)
            elif ch == "?" and not in_single and not in_double:
                parts.append("%s")
            else:
                parts.append(ch)
            i += 1
        s = "".join(parts)

        # 2. Thay thế các cú pháp đặc thù SQLite sang chuẩn MySQL 8.0
        s = re.sub(r"\bINSERT\s+OR\s+IGNORE\s+INTO\b", "INSERT IGNORE INTO", s, flags=re.IGNORECASE)
        s = re.sub(r"\bINSERT\s+OR\s+REPLACE\s+INTO\b", "REPLACE INTO", s, flags=re.IGNORECASE)
        s = re.sub(r"\bORDER\s+BY\s+rowid\s+DESC\b", "ORDER BY created_at DESC, id DESC", s, flags=re.IGNORECASE)
        s = re.sub(r"\bORDER\s+BY\s+rowid\s+ASC\b", "ORDER BY created_at ASC, id ASC", s, flags=re.IGNORECASE)
        s = re.sub(r"\browid\b", "id", s, flags=re.IGNORECASE)
        s = re.sub(r"\bSELECT\s+key\b", "SELECT `key`", s, flags=re.IGNORECASE)
        s = re.sub(r"\bWHERE\s+key\b", "WHERE `key`", s, flags=re.IGNORECASE)
        s = re.sub(r"\bAND\s+key\b", "AND `key`", s, flags=re.IGNORECASE)
        s = re.sub(r"\bOR\s+key\b", "OR `key`", s, flags=re.IGNORECASE)
        s = re.sub(r"\bSET\s+key\b", "SET `key`", s, flags=re.IGNORECASE)
        s = re.sub(r"\(\s*key\s*,", "(`key`,", s, flags=re.IGNORECASE)
        s = re.sub(r",\s*key\s*,", ", `key`,", s, flags=re.IGNORECASE)
        s = re.sub(r",\s*key\s*\)", ", `key`)", s, flags=re.IGNORECASE)
        s = self._replace_scalar_min_max(s)
        return s

    def execute(self, sql: str, params: Any = None) -> MySQLCursorWrapper:
        conv_sql = self._convert_sql(sql)
        if params is None:
            self._cursor.execute(conv_sql)
        else:
            self._cursor.execute(conv_sql, params)
        self.rowcount = self._cursor.rowcount
        self.lastrowid = self._cursor.lastrowid
        return self

    def executemany(self, sql: str, params_list: Any) -> MySQLCursorWrapper:
        conv_sql = self._convert_sql(sql)
        self._cursor.executemany(conv_sql, params_list)
        self.rowcount = self._cursor.rowcount
        return self

    def fetchone(self) -> dict[str, Any] | None:
        return self._cursor.fetchone()

    def fetchall(self) -> list[dict[str, Any]]:
        return self._cursor.fetchall()

    def __iter__(self) -> Iterator[dict[str, Any]]:
        return iter(self._cursor)


class MySQLConnectionWrapper:
    """Wrapper cho PyMySQL Connection: cung cấp API execute(), executescript(), commit(), rollback()."""

    def __init__(self, raw_conn: pymysql.connections.Connection):
        self._conn = raw_conn

    def cursor(self) -> MySQLCursorWrapper:
        return MySQLCursorWrapper(self._conn.cursor(pymysql.cursors.DictCursor))

    def execute(self, sql: str, params: Any = None) -> MySQLCursorWrapper:
        cur = self.cursor()
        cur.execute(sql, params)
        return cur

    def executemany(self, sql: str, params_list: Any) -> MySQLCursorWrapper:
        cur = self.cursor()
        cur.executemany(sql, params_list)
        return cur

    def executescript(self, script: str) -> None:
        cur = self.cursor()
        statements: list[str] = []
        current: list[str] = []
        in_single = False
        in_double = False
        for line in script.splitlines():
            line_str = line.strip()
            if line_str.startswith("--"):
                continue
            for ch in line:
                if ch == "'" and not in_double:
                    in_single = not in_single
                    current.append(ch)
                elif ch == '"' and not in_single:
                    in_double = not in_double
                    current.append(ch)
                elif ch == ";" and not in_single and not in_double:
                    stmt = "".join(current).strip()
                    if stmt:
                        statements.append(stmt)
                    current = []
                else:
                    current.append(ch)
            current.append("\n")
        remaining = "".join(current).strip()
        if remaining:
            statements.append(remaining)

        for stmt in statements:
            if stmt:
                cur.execute(stmt)

    def commit(self) -> None:
        self._conn.commit()

    def rollback(self) -> None:
        self._conn.rollback()

    def close(self) -> None:
        self._conn.close()


def _ensure_mysql_db_exists() -> None:
    """Tự động kiểm tra và tạo cơ sở dữ liệu MySQL codemind_ai với charset utf8mb4 nếu chưa có."""
    try:
        raw_conn = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            autocommit=True,
            connect_timeout=3,
        )
        with raw_conn.cursor() as cur:
            cur.execute(
                f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DB}` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
        raw_conn.close()
    except Exception as exc:
        print(f"[MySQL] Warning ensuring database {MYSQL_DB}: {exc}")


@contextmanager
def db() -> Iterator[MySQLConnectionWrapper]:
    """Context manager kết nối CSDL MySQL 8.0 với DictCursor và Autocommit=False."""
    raw_conn = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        charset="utf8mb4",
        autocommit=False,
        cursorclass=pymysql.cursors.DictCursor,
    )
    wrapper = MySQLConnectionWrapper(raw_conn)
    try:
        yield wrapper
        wrapper.commit()
    except Exception:
        wrapper.rollback()
        raise
    finally:
        wrapper.close()


def row_dict(row: dict[str, Any] | None) -> dict[str, Any] | None:
    """Chuyển đổi row thành dict an toàn (đã là dict trong MySQL DictCursor)."""
    return dict(row) if row else None


MYSQL_DDL_SCHEMA = """
-- 1. Users, Organizations & Security
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    user_code VARCHAR(64) DEFAULT '',
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(191) NOT NULL,
    display_name VARCHAR(191) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'student',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    locale VARCHAR(32) NOT NULL DEFAULT 'vi-VN',
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    theme_preference VARCHAR(64) NOT NULL DEFAULT 'one-dark',
    two_factor_enabled INT NOT NULL DEFAULT 0,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until VARCHAR(64),
    password_changed_at VARCHAR(64),
    last_active_label VARCHAR(64) DEFAULT 'Vừa xong',
    last_device VARCHAR(191) DEFAULT 'Web Session',
    classes_count INT DEFAULT 3,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL,
    INDEX idx_user_role (role),
    INDEX idx_user_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS memberships (
    id VARCHAR(64) PRIMARY KEY,
    organization_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    UNIQUE KEY uq_org_user (organization_id, user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consents (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    purpose VARCHAR(64) NOT NULL,
    policy_version VARCHAR(32) NOT NULL,
    granted INT NOT NULL DEFAULT 0,
    granted_at VARCHAR(64),
    revoked_at VARCHAR(64),
    updated_at VARCHAR(64) NOT NULL,
    UNIQUE KEY uq_user_purpose (user_id, purpose),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. LMS & Lessons
CREATE TABLE IF NOT EXISTS lessons (
    id VARCHAR(64) PRIMARY KEY,
    slug VARCHAR(64) NOT NULL,
    version INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    objective TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    published_at VARCHAR(64),
    UNIQUE KEY uq_slug_version (slug, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_steps (
    id VARCHAR(64) PRIMARY KEY,
    lesson_id VARCHAR(64) NOT NULL,
    sequence_no INT NOT NULL,
    step_type VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    completion_rule LONGTEXT NOT NULL,
    UNIQUE KEY uq_lesson_seq (lesson_id, sequence_no),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sources (
    id VARCHAR(64) PRIMARY KEY,
    canonical_url VARCHAR(255) NOT NULL UNIQUE,
    publisher VARCHAR(191) NOT NULL,
    trust_status VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS source_versions (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL,
    version_label VARCHAR(64) NOT NULL,
    content_text LONGTEXT NOT NULL,
    content_sha256 VARCHAR(64) NOT NULL,
    retrieved_at VARCHAR(64) NOT NULL,
    availability_status VARCHAR(32) NOT NULL,
    UNIQUE KEY uq_source_version (source_id, version_label),
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_sources (
    id VARCHAR(64) PRIMARY KEY,
    lesson_id VARCHAR(64) NOT NULL,
    source_version_id VARCHAR(64) NOT NULL,
    display_order INT NOT NULL DEFAULT 1,
    UNIQUE KEY uq_lesson_source (lesson_id, source_version_id),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (source_version_id) REFERENCES source_versions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    lesson_id VARCHAR(64) NOT NULL,
    organization_id VARCHAR(64),
    course_code VARCHAR(64) DEFAULT 'CS201',
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
    current_step_no INT NOT NULL DEFAULT 1,
    progress_version INT NOT NULL DEFAULT 1,
    teacher_visibility INT NOT NULL DEFAULT 0,
    time_spent_min INT DEFAULT 20,
    socratic_note TEXT,
    step_logs_json LONGTEXT,
    started_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64),
    completed_at VARCHAR(64),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS step_attempts (
    id VARCHAR(64) PRIMARY KEY,
    learning_session_id VARCHAR(64) NOT NULL,
    lesson_step_id VARCHAR(64) NOT NULL,
    attempt_no INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    completed_at VARCHAR(64),
    UNIQUE KEY uq_session_step_attempt (learning_session_id, lesson_step_id, attempt_no),
    FOREIGN KEY (learning_session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_step_id) REFERENCES lesson_steps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS term_selections (
    id VARCHAR(64) PRIMARY KEY,
    learning_session_id VARCHAR(64) NOT NULL,
    source_version_id VARCHAR(64) NOT NULL,
    term_text VARCHAR(191) NOT NULL,
    term_normalized VARCHAR(191) NOT NULL,
    context_excerpt TEXT,
    UNIQUE KEY uq_session_term (learning_session_id, term_normalized),
    FOREIGN KEY (learning_session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS concept_answers (
    id VARCHAR(64) PRIMARY KEY,
    learning_session_id VARCHAR(64) NOT NULL,
    relation_key VARCHAR(64) NOT NULL,
    selected_option VARCHAR(191) NOT NULL,
    is_correct INT NOT NULL,
    rule_version VARCHAR(32) NOT NULL,
    answered_at VARCHAR(64),
    FOREIGN KEY (learning_session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS submissions (
    id VARCHAR(64) PRIMARY KEY,
    learning_session_id VARCHAR(64) NOT NULL,
    source_code LONGTEXT NOT NULL,
    source_sha256 VARCHAR(64) NOT NULL,
    submission_no INT NOT NULL,
    idempotency_key VARCHAR(191) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL,
    passed_count INT NOT NULL DEFAULT 0,
    total_count INT NOT NULL DEFAULT 5,
    created_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (learning_session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS test_results (
    id VARCHAR(64) PRIMARY KEY,
    submission_id VARCHAR(64) NOT NULL,
    sequence_no INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    safe_message TEXT,
    duration_ms INT,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_interactions (
    id VARCHAR(64) PRIMARY KEY,
    learning_session_id VARCHAR(64) NOT NULL,
    submission_id VARCHAR(64),
    user_message TEXT NOT NULL,
    assistant_message LONGTEXT NOT NULL,
    policy_decision VARCHAR(64) NOT NULL,
    model_id VARCHAR(64) NOT NULL,
    prompt_version VARCHAR(32) NOT NULL,
    citation_json LONGTEXT NOT NULL,
    latency_ms INT NOT NULL,
    created_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (learning_session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_hints (
    id VARCHAR(64) PRIMARY KEY,
    ai_interaction_id VARCHAR(64) NOT NULL,
    level INT NOT NULL,
    hint_text TEXT NOT NULL,
    opened_at VARCHAR(64) NOT NULL,
    policy_passed INT NOT NULL,
    UNIQUE KEY uq_interaction_level (ai_interaction_id, level),
    FOREIGN KEY (ai_interaction_id) REFERENCES ai_interactions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS evidence (
    id VARCHAR(64) PRIMARY KEY,
    learning_session_id VARCHAR(64) NOT NULL UNIQUE,
    first_submission_id VARCHAR(64) NOT NULL,
    final_submission_id VARCHAR(64) NOT NULL,
    hint_count INT NOT NULL,
    passed_count INT NOT NULL,
    evidence_sha256 VARCHAR(64) NOT NULL,
    completed_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (learning_session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Audit, Analytics & Settings
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    actor_user_id VARCHAR(64),
    actor_label VARCHAR(191),
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64),
    target_label VARCHAR(191),
    category VARCHAR(64) DEFAULT 'security',
    decision VARCHAR(32) NOT NULL,
    reason_code VARCHAR(64),
    created_at VARCHAR(64) NOT NULL,
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_events (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    session_id VARCHAR(64),
    event_name VARCHAR(64) NOT NULL,
    properties LONGTEXT NOT NULL,
    occurred_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
    `key` VARCHAR(64) PRIMARY KEY,
    value_json LONGTEXT NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Multi-Course Platform (16 Subjects, 5 Stages)
CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(64) PRIMARY KEY,
    subject_id VARCHAR(64) NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    stage_number INT NOT NULL DEFAULT 1,
    stage_title VARCHAR(191) NOT NULL DEFAULT 'Cơ sở cốt lõi',
    semester VARCHAR(64) NOT NULL,
    credits INT NOT NULL DEFAULT 3,
    prerequisite_codes VARCHAR(191) DEFAULT '',
    instructor_id VARCHAR(64),
    teacher_name VARCHAR(191) NOT NULL,
    student_count INT NOT NULL DEFAULT 40,
    avg_progress_pct INT NOT NULL DEFAULT 72,
    pending_dual_reviews INT NOT NULL DEFAULT 0,
    health VARCHAR(64) NOT NULL DEFAULT 'Ổn định',
    room VARCHAR(191) NOT NULL DEFAULT 'Lab A3-201',
    docker_image VARCHAR(191) NOT NULL,
    sandbox_enabled INT NOT NULL DEFAULT 1,
    ai_defense_enabled INT NOT NULL DEFAULT 1,
    chapters_json LONGTEXT NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dual_submissions (
    id VARCHAR(64) PRIMARY KEY,
    class_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64),
    student_name VARCHAR(191) NOT NULL,
    student_code VARCHAR(64) NOT NULL,
    chapter_title VARCHAR(255) NOT NULL,
    repo_url VARCHAR(255) NOT NULL,
    submitted_at VARCHAR(64) NOT NULL,
    passed_tests INT NOT NULL DEFAULT 0,
    total_tests INT NOT NULL DEFAULT 5,
    exec_time_ms INT NOT NULL DEFAULT 24,
    memory_mb DOUBLE NOT NULL DEFAULT 14.2,
    commit_hash VARCHAR(64) NOT NULL DEFAULT 'a1b2c3d',
    commit_count INT NOT NULL DEFAULT 4,
    similarity_pct INT NOT NULL DEFAULT 8,
    test_details_json LONGTEXT NOT NULL,
    defense_status VARCHAR(32) NOT NULL DEFAULT 'completed',
    defense_score INT NOT NULL DEFAULT 80,
    coherence_summary TEXT NOT NULL,
    transcript_json LONGTEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    final_score INT,
    instructor_feedback TEXT NOT NULL,
    updated_at VARCHAR(64) NOT NULL,
    INDEX idx_dual_class (class_id),
    INDEX idx_dual_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS defense_rubric_configs (
    id VARCHAR(64) PRIMARY KEY,
    cicd_weight_pct INT NOT NULL DEFAULT 60,
    defense_weight_pct INT NOT NULL DEFAULT 40,
    strict_anti_copy_guardrail INT NOT NULL DEFAULT 1,
    auto_flag_discrepancy_threshold INT NOT NULL DEFAULT 25,
    mandatory_probes_json LONGTEXT NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS defense_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64) NOT NULL,
    class_id VARCHAR(64) NOT NULL DEFAULT 'class-oop',
    round_number INT NOT NULL DEFAULT 1,
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
    architecture_score INT NOT NULL DEFAULT 86,
    algorithm_score INT NOT NULL DEFAULT 82,
    production_score INT NOT NULL DEFAULT 88,
    final_defense_score INT,
    transcript_json LONGTEXT NOT NULL,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jwt_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    jti VARCHAR(64),
    refresh_jti VARCHAR(64),
    token_hash VARCHAR(128),
    user_name VARCHAR(191) NOT NULL,
    role VARCHAR(32) NOT NULL,
    device VARCHAR(191) NOT NULL,
    device_type VARCHAR(64) DEFAULT 'desktop',
    browser VARCHAR(64) DEFAULT 'Chrome',
    os VARCHAR(64) DEFAULT 'Windows 11',
    ip_location VARCHAR(191) NOT NULL,
    state VARCHAR(64) NOT NULL DEFAULT 'Hợp lệ (JWT + Refresh)',
    issued_at VARCHAR(64) NOT NULL,
    last_active_at VARCHAR(64),
    is_untrusted INT NOT NULL DEFAULT 0,
    revoked INT NOT NULL DEFAULT 0,
    created_at VARCHAR(64),
    revoked_at VARCHAR(64),
    INDEX idx_jwt_user (user_id),
    INDEX idx_jwt_jti (jti)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pending_approvals (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    student_code VARCHAR(64) NOT NULL,
    email VARCHAR(191) NOT NULL,
    class_code VARCHAR(64) NOT NULL,
    class_name VARCHAR(191) NOT NULL,
    requested_role VARCHAR(32) NOT NULL,
    risk_note TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_service_units (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    engine VARCHAR(64) NOT NULL,
    usage_label VARCHAR(191) NOT NULL,
    requests INT NOT NULL DEFAULT 0,
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    estimated_cost DOUBLE NOT NULL DEFAULT 0.0,
    quota_pct INT NOT NULL DEFAULT 0,
    bar_color VARCHAR(32) NOT NULL DEFAULT '#14161a',
    active INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS instructor_session_actions (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    instructor_id VARCHAR(64) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    note TEXT NOT NULL,
    created_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Student Learning Progress & Chapter Exercises
CREATE TABLE IF NOT EXISTS student_lesson_progress (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    subject_id VARCHAR(64) NOT NULL,
    chapter_id VARCHAR(64) NOT NULL,
    lesson_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'done',
    quiz_score INT DEFAULT 0,
    quiz_total INT DEFAULT 0,
    xp_earned INT DEFAULT 0,
    completed_at VARCHAR(64) NOT NULL,
    UNIQUE KEY uq_user_subject_lesson (user_id, subject_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_chapter_submissions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    subject_id VARCHAR(64) NOT NULL,
    chapter_number INT NOT NULL,
    exercise_id VARCHAR(64) NOT NULL,
    exercise_title VARCHAR(255) NOT NULL,
    repo_url VARCHAR(255) NOT NULL,
    student_note TEXT,
    score DOUBLE NOT NULL,
    max_score DOUBLE NOT NULL DEFAULT 10.0,
    tests_passed INT NOT NULL,
    tests_total INT NOT NULL,
    execution_time_ms INT NOT NULL,
    anti_plagiarism_score DOUBLE NOT NULL,
    rubric_json LONGTEXT NOT NULL,
    ai_feedback_json LONGTEXT NOT NULL,
    xp_awarded INT NOT NULL DEFAULT 0,
    dual_submission_id VARCHAR(64),
    status VARCHAR(32) DEFAULT 'pending',
    instructor_grade DOUBLE DEFAULT NULL,
    instructor_feedback TEXT,
    graded_by VARCHAR(191) DEFAULT '',
    graded_at VARCHAR(64) DEFAULT '',
    student_name VARCHAR(191) DEFAULT '',
    student_code VARCHAR(64) DEFAULT '',
    valgrind_leaks INT NOT NULL DEFAULT 0,
    submitted_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_video_progress (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    subject_id VARCHAR(64) NOT NULL,
    lesson_id VARCHAR(64) NOT NULL,
    watched_seconds INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 0,
    watched_pct DOUBLE NOT NULL DEFAULT 0.0,
    completed INT NOT NULL DEFAULT 0,
    updated_at VARCHAR(64) NOT NULL,
    UNIQUE KEY uq_video_user_subj_lesson (user_id, subject_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_profiles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    exp_points INT DEFAULT 0,
    selected_title VARCHAR(191) DEFAULT 'Novice Developer',
    last_activity_date VARCHAR(32) DEFAULT '',
    radar_algorithm DOUBLE DEFAULT 10.0,
    radar_debugging DOUBLE DEFAULT 10.0,
    radar_cleancode DOUBLE DEFAULT 10.0,
    radar_teamwork DOUBLE DEFAULT 10.0,
    radar_defense DOUBLE DEFAULT 10.0,
    owned_items_json LONGTEXT,
    claimed_quests_json LONGTEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_notes (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    assignment_id VARCHAR(64),
    subject_id VARCHAR(64) DEFAULT 'oop',
    lesson_id VARCHAR(64) DEFAULT '1.1',
    time_sec INT DEFAULT 0,
    timestamp_label VARCHAR(32) DEFAULT '00:00',
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    code_snippet LONGTEXT,
    tags VARCHAR(255),
    created_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Engineering Projects, Kanban & Multi-Role Grading
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    mode VARCHAR(32) NOT NULL DEFAULT 'team',
    deadline_utc VARCHAR(64),
    created_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    team_name VARCHAR(191) NOT NULL,
    leader_id VARCHAR(64),
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kanban_boards (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kanban_columns (
    id VARCHAR(64) PRIMARY KEY,
    board_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    position_order INT NOT NULL,
    FOREIGN KEY(board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(64) PRIMARY KEY,
    board_id VARCHAR(64) NOT NULL,
    column_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignee_id VARCHAR(64),
    priority VARCHAR(32) DEFAULT 'medium',
    due_date_utc VARCHAR(64),
    position_order INT NOT NULL,
    created_at VARCHAR(64) NOT NULL,
    FOREIGN KEY(board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
    FOREIGN KEY(column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_dependencies (
    id VARCHAR(64) PRIMARY KEY,
    task_id VARCHAR(64) NOT NULL,
    depends_on_task_id VARCHAR(64) NOT NULL,
    UNIQUE KEY uk_task_dep (task_id, depends_on_task_id),
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY(depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS engineering_projects (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    client VARCHAR(191) NOT NULL,
    course VARCHAR(191) NOT NULL,
    course_id VARCHAR(64) DEFAULT 'oop',
    instructor_id VARCHAR(64) DEFAULT 'instructor-demo',
    instructor_name VARCHAR(191) DEFAULT 'Cô Trần Thị B',
    leader_user_id VARCHAR(64) DEFAULT 'student-demo',
    sprint VARCHAR(64) NOT NULL DEFAULT 'Sprint 1 (Tuần 1 - 4)',
    kind VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    fav INT NOT NULL DEFAULT 0,
    is_frozen INT NOT NULL DEFAULT 0,
    due_date VARCHAR(64) NOT NULL,
    due_text VARCHAR(64) NOT NULL DEFAULT 'in 14 days',
    story_points_budget INT NOT NULL DEFAULT 600,
    color_hex VARCHAR(32) NOT NULL DEFAULT '#f29b23',
    tl_start DOUBLE NOT NULL DEFAULT 10.0,
    tl_width DOUBLE NOT NULL DEFAULT 36.0,
    tl_color VARCHAR(32) NOT NULL DEFAULT 'amber',
    instructor_label VARCHAR(191) NOT NULL DEFAULT 'Cô Trần Thị B (Giảng viên)',
    team_json LONGTEXT NOT NULL,
    created_by VARCHAR(64),
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS engineering_tasks (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    code VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description LONGTEXT NOT NULL,
    column_id VARCHAR(32) NOT NULL DEFAULT 'backlog',
    priority VARCHAR(32) NOT NULL DEFAULT 'medium',
    moscow VARCHAR(32) NOT NULL DEFAULT 'should',
    points INT NOT NULL DEFAULT 3,
    assignee_user_id VARCHAR(64),
    assignee_json LONGTEXT NOT NULL,
    estimate_hours DOUBLE NOT NULL DEFAULT 4.0,
    due_date VARCHAR(64) NOT NULL DEFAULT '',
    epic VARCHAR(191) NOT NULL DEFAULT 'Sprint Goal',
    epic_color VARCHAR(191) NOT NULL DEFAULT 'bg-blue-50 text-blue-700 border-blue-200',
    depends_on VARCHAR(64),
    checklist_json LONGTEXT NOT NULL,
    dod_json LONGTEXT NOT NULL,
    user_story_json LONGTEXT,
    acceptance_criteria TEXT,
    deliverable_json LONGTEXT,
    submission_requirement TEXT,
    submission_url TEXT,
    instructor_review_status VARCHAR(32) DEFAULT 'none',
    instructor_review_note TEXT,
    reviewed_by VARCHAR(64),
    reviewed_at VARCHAR(64),
    is_bonus INT NOT NULL DEFAULT 0,
    comments_count INT NOT NULL DEFAULT 0,
    attachments_count INT NOT NULL DEFAULT 0,
    audit_logs_json LONGTEXT NOT NULL,
    position_order INT NOT NULL DEFAULT 0,
    xp_awarded INT NOT NULL DEFAULT 0,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES engineering_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_evaluations (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    instructor_id VARCHAR(64) NOT NULL,
    group_score DOUBLE NOT NULL DEFAULT 85.0,
    demo_score DOUBLE DEFAULT 8.5,
    architecture_score DOUBLE NOT NULL DEFAULT 85.0,
    process_score DOUBLE NOT NULL DEFAULT 85.0,
    defense_score DOUBLE NOT NULL DEFAULT 85.0,
    final_score DOUBLE NOT NULL DEFAULT 85.0,
    feedback TEXT NOT NULL,
    member_scores_json LONGTEXT NOT NULL,
    anti_freerider_metrics_json LONGTEXT NOT NULL,
    council_notes_json LONGTEXT,
    grader_name VARCHAR(191) DEFAULT '',
    defense_date VARCHAR(64) DEFAULT '',
    status VARCHAR(32) NOT NULL DEFAULT 'graded',
    graded_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES engineering_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_defense_packages (
    project_id VARCHAR(64) PRIMARY KEY,
    demo_url VARCHAR(500) DEFAULT '',
    slide_url VARCHAR(500) DEFAULT '',
    report_url VARCHAR(500) DEFAULT '',
    video_url VARCHAR(500) DEFAULT '',
    architecture_summary TEXT,
    member_roles_summary TEXT,
    submitted_by VARCHAR(64) DEFAULT '',
    submitted_by_name VARCHAR(191) DEFAULT '',
    updated_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES engineering_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Git Hub (Học viên)
CREATE TABLE IF NOT EXISTS git_repositories (
    project_id VARCHAR(64) PRIMARY KEY,
    repo_url VARCHAR(255) NOT NULL,
    repo_slug VARCHAR(191) NOT NULL,
    target_branch VARCHAR(64) NOT NULL DEFAULT 'main',
    default_merge_strategy VARCHAR(32) NOT NULL DEFAULT 'squash',
    webhook_active INT NOT NULL DEFAULT 1,
    cadence_variance_hours DOUBLE NOT NULL DEFAULT 4.8,
    last_synced_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES engineering_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS git_commits (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    sha VARCHAR(64) NOT NULL,
    author_name VARCHAR(191) NOT NULL,
    author_role VARCHAR(64) NOT NULL,
    author_avatar VARCHAR(64) NOT NULL,
    author_color VARCHAR(32) NOT NULL,
    branch VARCHAR(64) NOT NULL,
    branch_color VARCHAR(32) NOT NULL,
    task_code VARCHAR(64),
    message TEXT NOT NULL,
    committed_at_label VARCHAR(64) NOT NULL,
    time_ago_label VARCHAR(64) NOT NULL,
    additions INT NOT NULL DEFAULT 0,
    deletions INT NOT NULL DEFAULT 0,
    files_changed_json LONGTEXT NOT NULL,
    cx INT NOT NULL DEFAULT 70,
    cy INT NOT NULL DEFAULT 225,
    position_order INT NOT NULL DEFAULT 0,
    created_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES engineering_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS git_pull_requests (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL,
    pr_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description LONGTEXT NOT NULL,
    source_branch VARCHAR(64) NOT NULL,
    target_branch VARCHAR(64) NOT NULL DEFAULT 'develop',
    task_code VARCHAR(64),
    author_name VARCHAR(191) NOT NULL,
    author_role VARCHAR(64) NOT NULL DEFAULT 'Developer',
    author_avatar VARCHAR(64) NOT NULL DEFAULT 'D',
    author_color VARCHAR(32) NOT NULL DEFAULT '#2563eb',
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    merge_strategy VARCHAR(32) NOT NULL DEFAULT 'squash',
    ai_review_score INT NOT NULL DEFAULT 92,
    ai_blast_radius VARCHAR(64) NOT NULL DEFAULT 'Low (3 files)',
    ai_summary TEXT NOT NULL,
    ai_findings_json LONGTEXT NOT NULL,
    diff_preview_json LONGTEXT NOT NULL,
    defense_questions_json LONGTEXT NOT NULL,
    peer_reviewer VARCHAR(191),
    peer_approved INT NOT NULL DEFAULT 0,
    peer_comment TEXT NOT NULL,
    one_click_fixed INT NOT NULL DEFAULT 0,
    dod_sha256 VARCHAR(64),
    dual_submission_id VARCHAR(64),
    xp_awarded INT NOT NULL DEFAULT 0,
    created_at VARCHAR(64) NOT NULL,
    merged_at VARCHAR(64),
    FOREIGN KEY (project_id) REFERENCES engineering_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_architectures (
    project_id VARCHAR(64) PRIMARY KEY,
    architecture_json LONGTEXT NOT NULL,
    generated_from_repo VARCHAR(255) DEFAULT '',
    updated_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES engineering_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Academic Schedules & 1-on-1 Bookings
CREATE TABLE IF NOT EXISTS academic_schedules (
    id VARCHAR(64) PRIMARY KEY,
    course_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    instructor_id VARCHAR(64) NOT NULL,
    instructor_name VARCHAR(191) NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'exam',
    title VARCHAR(255) NOT NULL,
    room_or_link VARCHAR(191) NOT NULL,
    schedule_date VARCHAR(32) NOT NULL,
    start_hour DOUBLE NOT NULL,
    end_hour DOUBLE NOT NULL,
    break_hour DOUBLE NOT NULL DEFAULT 0.0,
    max_capacity INT NOT NULL DEFAULT 30,
    current_booked INT NOT NULL DEFAULT 0,
    is_locked INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'confirmed',
    note TEXT,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedule_bookings (
    id VARCHAR(64) PRIMARY KEY,
    schedule_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    student_name VARCHAR(191) NOT NULL,
    instructor_id VARCHAR(64) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    repo_or_doc_url VARCHAR(255) DEFAULT '',
    student_note TEXT,
    booking_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    instructor_reply TEXT,
    confirmed_at VARCHAR(64),
    completed_at VARCHAR(64),
    created_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (schedule_id) REFERENCES academic_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Notifications (Role-Targeted & Real-Time Broadcast)
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    recipient_user_id VARCHAR(64),
    target_role VARCHAR(32) NOT NULL DEFAULT 'student',
    title VARCHAR(255) NOT NULL,
    desc_text TEXT NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'system',
    is_read INT NOT NULL DEFAULT 0,
    action_url VARCHAR(255) DEFAULT '',
    created_at VARCHAR(64) NOT NULL,
    INDEX idx_notif_user (recipient_user_id),
    INDEX idx_notif_role (target_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Security OTP
CREATE TABLE IF NOT EXISTS security_otp_codes (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    email VARCHAR(191) NOT NULL,
    purpose VARCHAR(64) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    challenge_token VARCHAR(191) NOT NULL UNIQUE,
    device_hint VARCHAR(191),
    expires_at VARCHAR(64) NOT NULL,
    consumed INT NOT NULL DEFAULT 0,
    created_at VARCHAR(64) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""


def _run_safe_migrations(conn: MySQLConnectionWrapper) -> None:
    """Chạy các ALTER TABLE an toàn cho CSDL MySQL 8.0 đang tồn tại."""
    alter_statements = [
        "ALTER TABLE student_profiles ADD COLUMN last_activity_date VARCHAR(32) DEFAULT ''",
        "ALTER TABLE student_chapter_submissions ADD COLUMN status VARCHAR(32) DEFAULT 'pending'",
        "ALTER TABLE student_chapter_submissions ADD COLUMN instructor_grade DOUBLE DEFAULT NULL",
        "ALTER TABLE student_chapter_submissions ADD COLUMN instructor_feedback TEXT",
        "ALTER TABLE student_chapter_submissions ADD COLUMN graded_by VARCHAR(191) DEFAULT ''",
        "ALTER TABLE student_chapter_submissions ADD COLUMN graded_at VARCHAR(64) DEFAULT ''",
        "ALTER TABLE student_chapter_submissions ADD COLUMN student_name VARCHAR(191) DEFAULT ''",
        "ALTER TABLE student_chapter_submissions ADD COLUMN student_code VARCHAR(64) DEFAULT ''",
        "ALTER TABLE student_chapter_submissions ADD COLUMN valgrind_leaks INT NOT NULL DEFAULT 0",
        "ALTER TABLE engineering_projects ADD COLUMN leader_user_id VARCHAR(64) DEFAULT 'student-demo'",
        "ALTER TABLE engineering_projects ADD COLUMN instructor_id VARCHAR(64) DEFAULT 'instructor-demo'",
        "ALTER TABLE engineering_projects ADD COLUMN instructor_name VARCHAR(191) DEFAULT 'Cô Trần Thị B'",
        "ALTER TABLE engineering_projects ADD COLUMN course_id VARCHAR(64) DEFAULT 'oop'",
        "ALTER TABLE engineering_projects ADD COLUMN is_frozen INT NOT NULL DEFAULT 0",
        "ALTER TABLE project_evaluations ADD COLUMN demo_score DOUBLE DEFAULT 8.5",
        "ALTER TABLE project_evaluations ADD COLUMN council_notes_json LONGTEXT",
        "ALTER TABLE project_evaluations ADD COLUMN grader_name VARCHAR(191) DEFAULT ''",
        "ALTER TABLE project_evaluations ADD COLUMN defense_date VARCHAR(64) DEFAULT ''",
        """CREATE TABLE IF NOT EXISTS project_defense_packages (
            project_id VARCHAR(64) PRIMARY KEY,
            demo_url VARCHAR(500) DEFAULT '',
            slide_url VARCHAR(500) DEFAULT '',
            report_url VARCHAR(500) DEFAULT '',
            video_url VARCHAR(500) DEFAULT '',
            architecture_summary TEXT,
            member_roles_summary TEXT,
            submitted_by VARCHAR(64) DEFAULT '',
            submitted_by_name VARCHAR(191) DEFAULT '',
            updated_at VARCHAR(64) NOT NULL,
            FOREIGN KEY (project_id) REFERENCES engineering_projects(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",
        """CREATE TABLE IF NOT EXISTS project_invitations (
            id VARCHAR(64) PRIMARY KEY,
            project_id VARCHAR(64) NOT NULL,
            project_name VARCHAR(255) NOT NULL,
            inviter_user_id VARCHAR(64) NOT NULL,
            inviter_name VARCHAR(191) NOT NULL,
            invitee_user_id VARCHAR(64) NOT NULL,
            invitee_name VARCHAR(191) NOT NULL,
            invitee_email VARCHAR(191) NOT NULL,
            role_title VARCHAR(64) NOT NULL DEFAULT 'Developer',
            status VARCHAR(32) NOT NULL DEFAULT 'pending',
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""",
    ]
    for stmt in alter_statements:
        try:
            conn.execute(stmt)
        except Exception:
            pass


def init_db() -> None:
    """Khởi tạo toàn bộ 43 bảng CSDL chuẩn mực trên MySQL 8.0 và seed dữ liệu ban đầu."""
    _ensure_mysql_db_exists()
    with db() as conn:
        conn.executescript(MYSQL_DDL_SCHEMA)
        _run_safe_migrations(conn)
        seed_data(conn)
        from app.services.seed_platform import seed_platform_data
        seed_platform_data(conn)
        from app.services.seed_kanban import seed_kanban_workspace
        seed_kanban_workspace(conn)
        from app.services.seed_git_hub import seed_git_hub_workspace
        seed_git_hub_workspace(conn)


def seed_data(conn: MySQLConnectionWrapper) -> None:
    """Tạo dữ liệu người dùng mẫu, tổ chức và bài học nếu chưa có."""
    lesson = conn.execute("SELECT id FROM lessons WHERE slug = 'deque' AND version = 1").fetchone()
    if lesson:
        return

    created = now_utc()
    org_id = "org-demo-codemind"
    conn.execute(
        "INSERT IGNORE INTO organizations(id, name, status, created_at, updated_at) VALUES(?, ?, ?, ?, ?)",
        (org_id, "CodeMind Demo Campus", "active", created, created),
    )
    demo_users = [
        ("student-demo", "student.demo@codemind.local", hash_password("Student@123"), "Minh Anh", "Minh Anh", "student"),
        ("instructor-demo", "instructor.demo@codemind.local", hash_password("Instructor@123"), "Cô Linh", "Cô Linh", "instructor"),
        ("admin-demo", "admin.demo@codemind.local", hash_password("Admin@123"), "Content Admin", "Content Admin", "admin"),
    ]
    for user_id, email, pwd_hash, full_name, display_name, role in demo_users:
        conn.execute(
            "INSERT IGNORE INTO users(id, email, password_hash, full_name, display_name, role, status, locale, created_at, updated_at) "
            "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (user_id, email, pwd_hash, full_name, display_name, role, "active", "vi-VN", created, created),
        )
        membership_role = "org_admin" if role == "admin" else role
        conn.execute(
            "INSERT IGNORE INTO memberships(id, organization_id, user_id, role, status) VALUES(?, ?, ?, ?, ?)",
            (uid(), org_id, user_id, membership_role, "active"),
        )
        for purpose, granted in [("academic_integrity", 1 if role == "student" else 0), ("teacher_visibility", 1 if role == "student" else 0)]:
            conn.execute(
                "INSERT IGNORE INTO consents(id, user_id, purpose, policy_version, granted, granted_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?)",
                (uid(), user_id, purpose, "2026-08-01", granted, created if granted else None, created),
            )
        if role == "student":
            conn.execute(
                "INSERT IGNORE INTO student_profiles(id, user_id, current_streak, longest_streak, exp_points, selected_title) VALUES(?, ?, ?, ?, ?, ?)",
                (uid(), user_id, 3, 5, 240, "Bug Hunter"),
            )

    lesson_id = "lesson-deque-v1"
    conn.execute(
        "INSERT IGNORE INTO lessons(id, slug, version, title, objective, status, published_at) VALUES(?, ?, ?, ?, ?, ?, ?)",
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
            "INSERT IGNORE INTO lesson_steps(id, lesson_id, sequence_no, step_type, title, completion_rule) VALUES(?, ?, ?, ?, ?, ?)",
            (uid(), lesson_id, sequence_no, step_type, title, json.dumps({"required": sequence_no < 6})),
        )
    source_id = "source-python-deque"
    content = (
        "collections.deque(maxlen)\n\n"
        "Deque có thể đặt độ dài tối đa bằng maxlen. Khi đã đầy, thêm phần tử mới sẽ loại phần tử ở đầu đối diện.\n\n"
        "maxlen chỉ giới hạn số phần tử; nó không tự xác thực page hay bỏ chuỗi rỗng trước khi append."
    )
    conn.execute(
        "INSERT IGNORE INTO sources(id, canonical_url, publisher, trust_status) VALUES(?, ?, ?, ?)",
        (source_id, "https://docs.python.org/3.12/library/collections.html#collections.deque", "Python Documentation", "verified"),
    )
    source_version_id = "source-version-python312-deque"
    conn.execute(
        "INSERT IGNORE INTO source_versions(id, source_id, version_label, content_text, content_sha256, retrieved_at, availability_status) "
        "VALUES(?, ?, ?, ?, ?, ?, ?)",
        (source_version_id, source_id, "Python 3.12", content, sha256(content), created, "available"),
    )
    conn.execute(
        "INSERT IGNORE INTO lesson_sources(id, lesson_id, source_version_id, display_order) VALUES(?, ?, ?, ?)",
        (uid(), lesson_id, source_version_id, 1),
    )
