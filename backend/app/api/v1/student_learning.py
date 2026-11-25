from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
import re
from typing import Any
import urllib.error
import urllib.request
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.deps import current_user, record_audit_log
from app.api.v1.auth import serialize_shared_profile_fields
from app.core.database import db
from app.core.security import sha256, uid
from app.core.timezone import now_utc
from app.schemas.student import (
    ChapterExerciseSubmitIn,
    LessonCompleteIn,
    QuizStartIn,
    QuizAnswerIn,
    VideoNoteCreateIn,
    VideoProgressIn,
    XpQuestClaimIn,
    XpShopEquipIn,
    XpShopPurchaseIn,
)
from app.services.analytics import track_event
from app.services.quiz_grading import resolve_lesson, quiz_questions, quiz_version, grade_answer, public_attempt, public_course_chapters

router = APIRouter(tags=["Student Learning (Branch 1)"])

GITHUB_REPO_RE = re.compile(
    r"^https?://(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?(?:/.*)?$",
    re.IGNORECASE,
)

SHOP_ITEM_UNLOCK_XP: dict[tuple[str, str], int] = {
    ("theme", "diagonal"): 0,
    ("theme", "blueprint"): 0,
    ("theme", "matrix"): 0,
    ("theme", "sunrise"): 0,
    ("theme", "graphite"): 0,
    ("avatar", "initials"): 0,
    ("avatar", "pixel"): 400,
    ("avatar", "coder"): 800,
    ("avatar", "robot"): 1500,
    ("avatar", "silver"): 2500,
    ("mentor", "mino"): 0,
    ("mentor", "nova"): 600,
    ("mentor", "byte"): 900,
    ("mentor", "sage"): 1400,
    ("mentor", "luna"): 2000,
    ("mentor", "kuro"): 2800,
    ("mentor", "ignis"): 3800,
    ("mentor", "sylph"): 4800,
    ("chat", "classic"): 0,
    ("chat", "paper"): 500,
    ("chat", "terminal"): 1000,
    ("chat", "neon"): 2200,
    ("map", "campaign"): 0,
    ("map", "route-blueprint"): 700,
    ("map", "space"): 1600,
    ("map", "circuit"): 2400,
    ("map", "dungeon"): 3500,
    ("badge", "streak"): 0,
    ("badge", "rookie"): 300,
    ("badge", "quiz"): 700,
    ("badge", "mindmap"): 1200,
    ("badge", "explorer"): 2000,
}
SHOP_ITEM_COSTS = SHOP_ITEM_UNLOCK_XP

ALL_THEME_IDS: list[str] = ["diagonal", "blueprint", "matrix", "sunrise", "graphite"]

QUEST_REWARDS: dict[str, int] = {
    "q1": 300,
    "q2": 500,
    "q3": 400,
    "q4": 200,
}

SUBJECT_TO_CLASS_ID = {
    "oop": "class-oop",
    "dsa": "class-dsa",
    "network": "class-network",
    "frontend": "class-fe",
    "realtime": "class-realtime",
    "mobile": "class-mobile",
    "web": "class-web",
    "system-design": "class-system-design",
    "distributed": "class-distributed",
    "security": "class-security",
    "ai-ml": "class-ai-ml",
    "ai-agent": "class-ai",
    "devops": "class-devops",
    "cloud": "class-cloud",
    "scrum": "class-scrum",
    "capstone": "class-capstone",
}

DEFAULT_OWNED_ITEMS: dict[str, list[str]] = {
    "theme": ["diagonal", "blueprint", "matrix", "sunrise", "graphite"],
    "avatar": ["initials"],
    "mentor": ["mino"],
    "chat": ["classic"],
    "map": ["campaign"],
    "badge": ["streak"],
}


def _parse_owned_items(raw: str | None) -> dict[str, list[str]]:
    if not raw or raw.strip() in ("", "{}"):
        return {k: list(v) for k, v in DEFAULT_OWNED_ITEMS.items()}
    try:
        data = json.loads(raw)
        if not isinstance(data, dict) or not data:
            return {k: list(v) for k, v in DEFAULT_OWNED_ITEMS.items()}
        merged = {k: list(v) for k, v in DEFAULT_OWNED_ITEMS.items()}
        for k, v in data.items():
            if isinstance(v, list):
                merged[k] = list(dict.fromkeys([*merged.get(k, []), *[str(x) for x in v]]))
        merged["theme"] = list(ALL_THEME_IDS)
        return merged
    except Exception:
        return {k: list(v) for k, v in DEFAULT_OWNED_ITEMS.items()}


def _parse_claimed_quests(raw: str | None) -> list[str]:
    if not raw or raw.strip() == "":
        return []
    try:
        arr = json.loads(raw)
        return [str(x) for x in arr] if isinstance(arr, list) else []
    except Exception:
        return []


DEFAULT_EQUIPPED_ITEMS: dict[str, str] = {
    "avatar": "initials",
    "mentor": "mino",
    "chat_skin": "classic",
    "map_skin": "campaign",
    "badge": "streak",
}


def _parse_equipped_items(raw: str | None) -> dict[str, str]:
    base = dict(DEFAULT_EQUIPPED_ITEMS)
    if not raw or raw.strip() in ("", "{}"):
        return base
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            for k in base:
                val = str(data.get(k) or "").strip()
                if val:
                    base[k] = val
    except Exception:
        pass
    return base


def _require_student_course_enrollment(
    conn: Any, user: dict[str, Any], subject_or_course_id: str
) -> tuple[Any | None, Any | None]:
    raw_key = (subject_or_course_id or "").strip()
    mapped_class = SUBJECT_TO_CLASS_ID.get(raw_key, raw_key)
    course = conn.execute(
        "SELECT * FROM courses WHERE id = ? OR subject_id = ? OR code = ? LIMIT 1",
        (mapped_class, raw_key, raw_key),
    ).fetchone()
    if not course:
        return None, None
    has_any_section = conn.execute(
        "SELECT id FROM class_sections WHERE course_id = ? AND status = 'active' LIMIT 1",
        (course["id"],),
    ).fetchone()
    if not has_any_section:
        return course, None
    enrolled_sec = conn.execute(
        """SELECT cs.*
           FROM class_enrollments ce
           JOIN class_sections cs ON cs.id = ce.section_id
           WHERE ce.student_id = ? AND cs.course_id = ? AND ce.status = 'active'
           LIMIT 1""",
        (user["id"], course["id"]),
    ).fetchone()
    if str(user.get("role") or "").lower() == "student" and not enrolled_sec:
        raise HTTPException(
            status_code=403,
            detail=f"Bạn chưa ghi danh vào lớp học phần của môn {course['code']} ({course['name']}). Vui lòng nhấn 'Ghi danh học phần' trước khi học và nộp bài.",
        )
    return course, enrolled_sec


def _ensure_profile(conn: Any, user_id: str) -> Any:
    prof = conn.execute("SELECT * FROM student_profiles WHERE user_id=?", (user_id,)).fetchone()
    if not prof:
        conn.execute(
            """INSERT INTO student_profiles(
                   id, user_id, current_streak, longest_streak, exp_points, selected_title,
                   radar_algorithm, radar_debugging, radar_cleancode, radar_teamwork, radar_defense,
                   owned_items_json, claimed_quests_json
               ) VALUES(?, ?, 1, 1, 500, 'CodeMind Learner', 75.0, 68.0, 78.0, 72.0, 80.0, ?, '[]')""",
            (uid(), user_id, json.dumps(DEFAULT_OWNED_ITEMS)),
        )
        prof = conn.execute("SELECT * FROM student_profiles WHERE user_id=?", (user_id,)).fetchone()
    return prof


def _update_streak_on_activity(conn: Any, user_id: str) -> None:
    """Cập nhật chuỗi ngày học liên tiếp (streak) thực tế theo ngày UTC+7."""
    vn_now = datetime.now(timezone(timedelta(hours=7)))
    today = vn_now.date().isoformat()
    yesterday = (vn_now.date() - timedelta(days=1)).isoformat()
    prof = conn.execute(
        "SELECT current_streak, longest_streak, last_activity_date FROM student_profiles WHERE user_id=?",
        (user_id,),
    ).fetchone()
    if not prof:
        return
    last_date = (prof.get("last_activity_date") or "").strip()
    cur_streak = int(prof.get("current_streak") or 0)
    if last_date == today:
        new_streak = max(1, cur_streak)
    elif last_date == yesterday:
        new_streak = max(1, cur_streak) + 1
    else:
        new_streak = 1
    conn.execute(
        """UPDATE student_profiles
           SET current_streak = ?,
               longest_streak = GREATEST(longest_streak, ?),
               last_activity_date = ?
           WHERE user_id = ?""",
        (new_streak, new_streak, today, user_id),
    )


def _recalculate_course_avg_progress(conn: Any, subject_id: str) -> None:
    """Tính lại % hoàn thành trung bình thực tế của môn học từ student_lesson_progress."""
    course = conn.execute(
        "SELECT id, chapters_json FROM courses WHERE subject_id = ?",
        (subject_id,),
    ).fetchone()
    if not course:
        return
    try:
        chapters = json.loads(course.get("chapters_json") or "[]")
    except Exception:
        chapters = []
    published_lessons = 0
    for ch in chapters:
        if ch.get("status") == "Bản nháp":
            continue
        for ls in ch.get("lessons", []):
            if ls.get("status") != "Bản nháp":
                published_lessons += 1
    if published_lessons <= 0:
        return
    stat = conn.execute(
        """SELECT COUNT(DISTINCT user_id) AS active_students, COUNT(*) AS done_count
           FROM student_lesson_progress WHERE subject_id = ?""",
        (subject_id,),
    ).fetchone()
    active_students = int(stat["active_students"] or 0) if stat else 0
    done_count = int(stat["done_count"] or 0) if stat else 0
    if active_students <= 0:
        avg_pct = 0
    else:
        avg_pct = min(100, round((done_count / (active_students * published_lessons)) * 100))
    conn.execute(
        "UPDATE courses SET avg_progress_pct = ?, updated_at = ? WHERE id = ?",
        (avg_pct, now_utc(), course["id"]),
    )


def _recalculate_pending_dual_reviews(conn: Any, class_id: str) -> None:
    """Đồng bộ số bài chờ duyệt kép của lớp từ bảng dual_submissions."""
    cnt = conn.execute(
        "SELECT COUNT(*) AS c FROM dual_submissions WHERE class_id=? AND status IN ('pending', 'flagged')",
        (class_id,),
    ).fetchone()
    pending_val = int(cnt["c"] or 0) if cnt else 0
    conn.execute(
        "UPDATE courses SET pending_dual_reviews = ? WHERE id = ?",
        (pending_val, class_id),
    )
    conn.execute(
        "UPDATE class_sections SET pending_dual_reviews = ? WHERE id = ? OR course_id = ?",
        (pending_val, class_id, class_id),
    )


def _build_student_course_payload(
    course_row: Any,
    section_rows: list[Any],
    enrolled_section_ids: set[str],
) -> dict[str, Any]:
    """Đóng gói thông tin môn học kèm lớp học phần tương ứng và trạng thái ghi danh của học viên."""
    matching_secs = [s for s in section_rows if s["course_id"] == course_row["id"]]
    enrolled_sec = next((s for s in matching_secs if s["id"] in enrolled_section_ids), None)
    display_sec = enrolled_sec or (matching_secs[0] if matching_secs else None)
    return {
        "id": course_row["id"],
        "subjectId": course_row["subject_id"],
        "code": course_row["code"],
        "name": course_row["name"],
        "stageNumber": int(course_row.get("stage_number") or 1),
        "stageTitle": course_row.get("stage_title") or "Cơ sở cốt lõi",
        "credits": int(course_row.get("credits") or 3),
        "enrolled": enrolled_sec is not None,
        "sectionId": display_sec["id"] if display_sec else course_row["id"],
        "sectionCode": display_sec["section_code"] if display_sec else f"{course_row['code']}-N01",
        "semester": display_sec["semester"] if display_sec else course_row["semester"],
        "room": display_sec["room"] if display_sec else (course_row.get("room") or "Lab A3-201"),
        "teacher": display_sec["teacher_name"] if display_sec else course_row["teacher_name"],
        "sandboxEnabled": bool(display_sec["sandbox_enabled"] if display_sec else course_row["sandbox_enabled"]),
        "aiDefenseEnabled": bool(display_sec["ai_defense_enabled"] if display_sec else course_row["ai_defense_enabled"]),
        "chapters": public_course_chapters(course_row["chapters_json"]),
    }


def _lookup_lesson_xp(conn: Any, subject_id: str, lesson_id: str, fallback_xp: int) -> int:
    """Lấy XP chuẩn từ cấu hình bài học phía server (chống client tự gửi xp ảo)."""
    row = conn.execute("SELECT chapters_json FROM courses WHERE subject_id=?", (subject_id,)).fetchone()
    if row:
        try:
            chapters = json.loads(row.get("chapters_json") or "[]")
            for ch in chapters:
                for ls in ch.get("lessons", []):
                    if ls.get("id") == lesson_id or str(ls.get("title", "")).startswith(f"{lesson_id} "):
                        raw_xp = ls.get("xp")
                        if isinstance(raw_xp, (int, float)) and raw_xp >= 0:
                            return min(150, max(10, int(raw_xp)))
        except Exception:
            pass
    return min(100, max(10, int(fallback_xp)))


def _verify_github_repo(owner: str, repo: str) -> dict[str, Any]:
    """Record a real commit SHA when reachable; never turn a network error into a pass."""
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "CodeMind-AI-LMS/2.0"}
    try:
        request = urllib.request.Request(f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1", headers=headers)
        with urllib.request.urlopen(request, timeout=5) as response:
            commits = json.loads(response.read(2_000_000).decode("utf-8"))
        sha = commits[0].get("sha", "") if isinstance(commits, list) and commits else ""
        if not re.fullmatch(r"[0-9a-f]{40}", sha):
            return {"commit_sha": "", "note": "Chưa xác minh được commit của repository."}
        return {"commit_sha": sha, "note": f"Đã ghi nhận commit {sha[:12]} từ GitHub; giảng viên sẽ kiểm tra phiên bản này."}
    except (urllib.error.URLError, TimeoutError, OSError, ValueError, KeyError, TypeError):
        return {"commit_sha": "", "note": "Chưa xác minh được GitHub (repo riêng tư, rỗng hoặc kết nối lỗi). Bài đã được tiếp nhận và cần giảng viên kiểm tra."}


def _serialize_chapter_submission(row: Any) -> dict[str, Any]:
    evidence = json.loads(row.get("evidence_json") or "{}")
    has_grade = row.get("instructor_grade") is not None
    effective_score = row["instructor_grade"] if row.get("instructor_grade") is not None else row["score"]
    row_status = row.get("status") or "pending"
    if not has_grade:
        grade_label = "ĐÃ NHẬN BÀI · CHỜ GIẢNG VIÊN KIỂM TRA"
    elif row_status == "revision_requested":
        grade_label = "YÊU CẦU CHỈNH SỬA & NỘP LẠI"
    elif row_status == "flagged" or effective_score < 7.0:
        grade_label = "CẦN RÀ SOÁT ĐỘ TIN CẬY"
    elif effective_score >= 9.0:
        grade_label = "LOẠI XUẤT SẮC (TIÊU CHUẨN ABET)"
    else:
        grade_label = "ĐẠT YÊU CẦU KỸ THUẬT"

    return {
        "id": row["id"],
        "user_id": row.get("user_id", ""),
        "student_name": row.get("student_name") or "Học viên",
        "student_code": row.get("student_code") or "",
        "subject_id": row["subject_id"],
        "chapter_number": row["chapter_number"],
        "exercise_id": row["exercise_id"],
        "exercise_title": row["exercise_title"],
        "repo_url": row["repo_url"],
        "student_note": row["student_note"],
        "score": row["score"],
        "maxScore": row["max_score"],
        "testsPassed": row["tests_passed"],
        "testsTotal": row["tests_total"],
        "executionTimeMs": row["execution_time_ms"],
        "valgrindLeaks": int(row.get("valgrind_leaks") or 0),
        "antiPlagiarismScore": row["anti_plagiarism_score"],
        "gradeLabel": grade_label,
        "evaluation_status": "teacher_graded" if has_grade else "pending_review",
        "evidence": evidence,
        "metrics_verified": False,
        "rubric": json.loads(row["rubric_json"] or "[]"),
        "aiFeedback": json.loads(row["ai_feedback_json"] or "{}"),
        "status": row_status,
        "instructor_grade": row.get("instructor_grade"),
        "instructor_feedback": row.get("instructor_feedback") or "",
        "graded_by": row.get("graded_by") or "",
        "graded_at": row.get("graded_at") or "",
        "xp_awarded": row["xp_awarded"],
        "dual_submission_id": row["dual_submission_id"],
        "submitted_at": row["submitted_at"],
    }


def _extract_date_key(raw: str | None) -> str | None:
    """Chuẩn hóa timestamp ISO hoặc DD/MM/YYYY về YYYY-MM-DD (UTC+7)."""
    if not raw:
        return None
    s = str(raw).strip()
    m_dmy = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})", s)
    if m_dmy:
        dd, mm, yyyy = int(m_dmy.group(1)), int(m_dmy.group(2)), int(m_dmy.group(3))
        if 1 <= mm <= 12 and 1 <= dd <= 31:
            return f"{yyyy:04d}-{mm:02d}-{dd:02d}"
    m_iso = re.match(r"^(\d{4}-\d{2}-\d{2})", s)
    if m_iso:
        return m_iso.group(1)
    return None


@router.get("/student/learning-overview")
def get_student_learning_overview(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lấy toàn bộ dữ liệu đồng bộ MySQL 8.0 cho Học viên (Profile, XP, Quests, Achievements, Heatmap, Courses)."""
    user_id = user["id"]
    student_name = (user.get("full_name") or user.get("display_name") or "Học viên").strip()
    vn_today = datetime.now(timezone(timedelta(hours=7))).date()

    with db() as conn:
        prof = _ensure_profile(conn, user_id)
        u_row = conn.execute(
            """SELECT theme_preference, user_code, email, full_name, avatar_url,
                      headline, bio, department, office_location, skills_json,
                      github_url, website_url, phone
               FROM users WHERE id=?""",
            (user_id,),
        ).fetchone()
        if u_row and u_row.get("full_name"):
            student_name = str(u_row["full_name"]).strip() or student_name
        raw_pref = (u_row["theme_preference"] if u_row else None) or "light:diagonal"
        bg_theme = "diagonal"
        if ":" in raw_pref:
            bg_cand = raw_pref.split(":", 1)[1].strip().lower()
            if bg_cand in ALL_THEME_IDS:
                bg_theme = bg_cand

        progress_rows = conn.execute(
            """SELECT subject_id, chapter_id, lesson_id, status, quiz_score, quiz_total, xp_earned, completed_at
               FROM student_lesson_progress WHERE user_id=? ORDER BY completed_at ASC""",
            (user_id,),
        ).fetchall()
        video_rows = conn.execute(
            """SELECT subject_id, lesson_id, watched_seconds, duration_seconds, watched_pct, completed, updated_at
               FROM student_video_progress WHERE user_id=?""",
            (user_id,),
        ).fetchall()
        sub_rows = conn.execute(
            """SELECT * FROM student_chapter_submissions
               WHERE user_id=? ORDER BY submitted_at DESC""",
            (user_id,),
        ).fetchall()
        course_rows = conn.execute("SELECT * FROM courses ORDER BY stage_number ASC, code ASC").fetchall()
        section_rows = conn.execute(
            "SELECT * FROM class_sections WHERE status='active' ORDER BY created_at ASC"
        ).fetchall()
        enrollment_rows = conn.execute(
            "SELECT section_id FROM class_enrollments WHERE student_id=? AND status='active'",
            (user_id,),
        ).fetchall()
        enrolled_section_ids = {r["section_id"] for r in enrollment_rows}
        defense_rows = conn.execute(
            "SELECT id, project_id, status, final_defense_score, created_at FROM defense_sessions WHERE user_id=?",
            (user_id,),
        ).fetchall()
        dual_rows = conn.execute(
            "SELECT id, repo_url, commit_count, similarity_pct, updated_at FROM dual_submissions WHERE user_id=? ORDER BY updated_at DESC",
            (user_id,),
        ).fetchall()
        proj_rows = conn.execute(
            "SELECT id FROM engineering_projects WHERE leader_user_id=? OR team_json LIKE ?",
            (user_id, f"%{student_name}%"),
        ).fetchall()

        user_project_ids = list(
            dict.fromkeys(
                [r["id"] for r in proj_rows]
                + [r["project_id"] for r in defense_rows if r["project_id"]]
            )
        )
        if user_project_ids:
            placeholders = ",".join("?" for _ in user_project_ids)
            commits_rows = conn.execute(
                f"""SELECT id, project_id, sha, author_name, message, committed_at_label, created_at
                    FROM git_commits
                    WHERE LOWER(author_name) = LOWER(?) OR project_id IN ({placeholders})
                    ORDER BY position_order DESC, created_at DESC""",
                (student_name, *user_project_ids),
            ).fetchall()
            repo_row = conn.execute(
                f"SELECT repo_url FROM git_repositories WHERE project_id IN ({placeholders}) AND repo_url != '' LIMIT 1",
                tuple(user_project_ids),
            ).fetchone()
        else:
            commits_rows = conn.execute(
                """SELECT id, project_id, sha, author_name, message, committed_at_label, created_at
                   FROM git_commits WHERE LOWER(author_name) = LOWER(?)
                   ORDER BY position_order DESC, created_at DESC""",
                (student_name,),
            ).fetchall()
            repo_row = None

    commits_count = len(commits_rows)
    if sub_rows:
        clean_code_pct = round(
            sum(float(r["anti_plagiarism_score"] or 90.0) for r in sub_rows) / len(sub_rows)
        )
        plagiarism_flags = sum(1 for r in sub_rows if float(r["anti_plagiarism_score"] or 100.0) < 70.0)
    else:
        clean_code_pct = round(float(prof["radar_cleancode"] or 85.0))
        plagiarism_flags = 0

    resolved_repo_url = (
        (sub_rows[0]["repo_url"] if sub_rows and sub_rows[0]["repo_url"] else None)
        or (dual_rows[0]["repo_url"] if dual_rows and dual_rows[0]["repo_url"] else None)
        or (repo_row["repo_url"] if repo_row else None)
        or (u_row.get("github_url") if u_row and u_row.get("github_url") else None)
        or ""
    )
    defense_completed_count = sum(
        1 for d in defense_rows if (d["status"] or "") in ("completed", "flagged")
    )

    current_streak = int(prof["current_streak"] or 0)
    claimed_list = _parse_claimed_quests(prof["claimed_quests_json"])
    claimed_set = set(claimed_list)
    good_subs_count = sum(1 for s in sub_rows if float(s["score"] or 0.0) >= 8.0)
    done_lessons_count = len(progress_rows)

    quests = [
        {
            "id": "q1",
            "title": "Học tập liên tục (Chuỗi Streak)",
            "desc": "Duy trì chuỗi học tập tối thiểu 3 ngày liên tiếp trong học kỳ.",
            "xpReward": QUEST_REWARDS["q1"],
            "status": "claimed" if "q1" in claimed_set else ("claimable" if current_streak >= 3 else "available"),
            "progress": f"{min(current_streak, 3)}/3 ngày",
        },
        {
            "id": "q2",
            "title": "Thực hành Lab & Phản biện AI",
            "desc": "Hoàn thành ít nhất 1 bài tập thực hành đạt từ 8.0/10 hoặc 1 phiên Phản biện AI.",
            "xpReward": QUEST_REWARDS["q2"],
            "status": "claimed"
            if "q2" in claimed_set
            else ("claimable" if (good_subs_count + defense_completed_count) >= 1 else "available"),
            "progress": f"{good_subs_count + defense_completed_count}/1 bài",
        },
        {
            "id": "q3",
            "title": "GitHub Pioneer (Commit thực chiến)",
            "desc": "Có ít nhất 1 commit hợp lệ gắn với đồ án kỹ nghệ trong kho lưu trữ Git.",
            "xpReward": QUEST_REWARDS["q3"],
            "status": "claimed" if "q3" in claimed_set else ("claimable" if commits_count >= 1 else "available"),
            "progress": f"{commits_count} commits",
        },
        {
            "id": "q4",
            "title": "Học tập thần tốc (Chinh phục bài giảng)",
            "desc": "Đọc lý thuyết và hoàn thành quiz của 5 bài học trên hệ thống.",
            "xpReward": QUEST_REWARDS["q4"],
            "status": "claimed" if "q4" in claimed_set else ("claimable" if done_lessons_count >= 5 else "available"),
            "progress": f"{done_lessons_count}/5 bài học",
        },
    ]

    achievements = [
        {
            "id": "ach-1",
            "name": "Giữ nhịp học đều",
            "desc": "Duy trì chuỗi học tập liên tiếp từ 3 ngày trở lên.",
            "unlocked": current_streak >= 3,
            "xpReward": 100,
        },
        {
            "id": "ach-2",
            "name": "Chinh phục bài giảng",
            "desc": "Hoàn thành ít nhất 1 bài học và vượt qua câu hỏi kiểm tra.",
            "unlocked": done_lessons_count >= 1,
            "xpReward": 200,
        },
        {
            "id": "ach-3",
            "name": "Kỹ sư Code sạch",
            "desc": "Duy trì chỉ số chính trực & chất lượng code từ 85% trở lên.",
            "unlocked": clean_code_pct >= 85,
            "xpReward": 300,
        },
        {
            "id": "ach-4",
            "name": "Đóng góp GitHub thực chiến",
            "desc": "Ghi nhận commit thực tế trên kho mã nguồn đồ án.",
            "unlocked": commits_count >= 1,
            "xpReward": 200,
        },
        {
            "id": "ach-5",
            "name": "Bản lĩnh Phản biện AI",
            "desc": "Hoàn tất tối thiểu 1 phiên bảo vệ đồ án cùng Hội đồng AI.",
            "unlocked": defense_completed_count >= 1,
            "xpReward": 500,
        },
        {
            "id": "ach-6",
            "name": "Thực hành đa học phần",
            "desc": "Hoàn thành bài nộp thực hành hoặc tối thiểu 5 bài giảng chuyên ngành.",
            "unlocked": len(sub_rows) >= 1 or done_lessons_count >= 5,
            "xpReward": 250,
        },
    ]

    # Build 16-week (112-day) real activity heatmap anchored to current week
    end_of_week = vn_today + timedelta(days=(6 - vn_today.weekday()))
    start_date = end_of_week - timedelta(days=111)
    commit_by_date: dict[str, int] = {}
    activity_by_date: dict[str, int] = {}

    for c in commits_rows:
        dk = _extract_date_key(c["committed_at_label"]) or _extract_date_key(c["created_at"])
        if dk:
            commit_by_date[dk] = commit_by_date.get(dk, 0) + 1
            activity_by_date[dk] = activity_by_date.get(dk, 0) + 1
    for pr in progress_rows:
        dk = _extract_date_key(pr["completed_at"])
        if dk:
            activity_by_date[dk] = activity_by_date.get(dk, 0) + 1
    for sr in sub_rows:
        dk = _extract_date_key(sr["submitted_at"])
        if dk:
            activity_by_date[dk] = activity_by_date.get(dk, 0) + 1
    for dr in defense_rows:
        dk = _extract_date_key(dr["created_at"])
        if dk:
            activity_by_date[dk] = activity_by_date.get(dk, 0) + 1

    heatmap_cells: list[dict[str, Any]] = []
    total_heatmap_commits = 0
    total_heatmap_activities = 0
    for offset in range(112):
        d_obj = start_date + timedelta(days=offset)
        dk = d_obj.isoformat()
        w_idx = offset // 7
        d_idx = d_obj.weekday()
        c_cnt = commit_by_date.get(dk, 0) if d_obj <= vn_today else 0
        a_cnt = activity_by_date.get(dk, 0) if d_obj <= vn_today else 0
        total_heatmap_commits += c_cnt
        total_heatmap_activities += a_cnt
        if a_cnt >= 6:
            lvl = 4
        elif a_cnt >= 4:
            lvl = 3
        elif a_cnt >= 2:
            lvl = 2
        elif a_cnt >= 1:
            lvl = 1
        else:
            lvl = 0
        heatmap_cells.append(
            {
                "date": dk,
                "weekIndex": w_idx,
                "dayIndex": d_idx,
                "commits": c_cnt,
                "activities": a_cnt,
                "level": lvl,
            }
        )

    return {
        "user": {
            "id": user["id"],
            "name": student_name,
            "email": (u_row["email"] if u_row else None) or user.get("email"),
            "code": (u_row["user_code"] if u_row else None) or user.get("user_code") or "—",
            "role": user.get("role") or "student",
            "background_theme": bg_theme,
            **serialize_shared_profile_fields(dict(u_row) if u_row else None),
        },
        "profile": {
            "exp_points": int(prof["exp_points"] or 0),
            "current_streak": current_streak,
            "longest_streak": int(prof["longest_streak"] or 0),
            "selected_title": prof["selected_title"] or "Clean Code Builder",
            "radar": {
                "algorithm": float(prof["radar_algorithm"] or 80.0),
                "debugging": float(prof["radar_debugging"] or 65.0),
                "cleancode": float(prof["radar_cleancode"] or 85.0),
                "teamwork": float(prof["radar_teamwork"] or 75.0),
                "defense": float(prof["radar_defense"] or 90.0),
            },
            "owned_items": _parse_owned_items(prof["owned_items_json"]),
            "equipped_items": _parse_equipped_items(prof.get("equipped_items_json")),
            "claimed_quests": claimed_list,
        },
        "quests": quests,
        "achievements": achievements,
        "github_summary": {
            "repo_url": resolved_repo_url,
            "commits_count": commits_count,
            "clean_code_pct": clean_code_pct,
            "plagiarism_flags": plagiarism_flags,
            "enrolled_courses_count": len(enrolled_section_ids),
            "defense_completed_count": defense_completed_count,
        },
        "activity_heatmap": {
            "weeks": 16,
            "total_commits": total_heatmap_commits,
            "total_activities": total_heatmap_activities,
            "cells": heatmap_cells,
        },
        "completed_lessons": [dict(r) for r in progress_rows],
        "video_progress": [
            {
                "subject_id": v["subject_id"],
                "lesson_id": v["lesson_id"],
                "watched_seconds": int(v["watched_seconds"] or 0),
                "duration_seconds": int(v["duration_seconds"] or 0),
                "watched_pct": float(v["watched_pct"] or 0.0),
                "completed": bool(v["completed"]),
                "updated_at": v["updated_at"],
            }
            for v in video_rows
        ],
        "chapter_submissions": [_serialize_chapter_submission(r) for r in sub_rows],
        "courses": [
            _build_student_course_payload(c, section_rows, enrolled_section_ids)
            for c in course_rows
        ],
    }


@router.post("/student/video-progress")
def save_student_video_progress(
    payload: VideoProgressIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lưu tiến độ xem video thực tế của học viên và xác thực điều kiện hoàn thành."""
    user_id = user["id"]
    now = now_utc()
    if payload.duration_seconds > 0:
        watched_pct = round(min(100.0, (payload.watched_seconds / payload.duration_seconds) * 100.0), 1)
        is_completed = 1 if watched_pct >= 90.0 else 0
    else:
        is_completed = 0
        watched_pct = 0.0

    with db() as conn:
        existing = conn.execute(
            "SELECT * FROM student_video_progress WHERE user_id=? AND subject_id=? AND lesson_id=?",
            (user_id, payload.subject_id, payload.lesson_id),
        ).fetchone()
        if existing:
            conn.execute(
                """UPDATE student_video_progress
                   SET watched_seconds = GREATEST(watched_seconds, ?),
                       duration_seconds = GREATEST(duration_seconds, ?),
                       watched_pct = GREATEST(watched_pct, ?),
                       completed = GREATEST(completed, ?),
                       updated_at = ?
                   WHERE id = ?""",
                (payload.watched_seconds, payload.duration_seconds, watched_pct, is_completed, now, existing["id"]),
            )
            row = conn.execute("SELECT * FROM student_video_progress WHERE id=?", (existing["id"],)).fetchone()
        else:
            rec_id = f"vid-{uid()[:10]}"
            conn.execute(
                """INSERT INTO student_video_progress(
                       id, user_id, subject_id, lesson_id, watched_seconds, duration_seconds, watched_pct, completed, updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?)""",
                (
                    rec_id,
                    user_id,
                    payload.subject_id,
                    payload.lesson_id,
                    payload.watched_seconds,
                    payload.duration_seconds,
                    watched_pct,
                    is_completed,
                    now,
                ),
            )
            row = conn.execute("SELECT * FROM student_video_progress WHERE id=?", (rec_id,)).fetchone()

    return {
        "subject_id": row["subject_id"],
        "lesson_id": row["lesson_id"],
        "watched_seconds": int(row["watched_seconds"] or 0),
        "duration_seconds": int(row["duration_seconds"] or 0),
        "watched_pct": float(row["watched_pct"] or 0.0),
        "completed": bool(row["completed"]),
    }


@router.post("/student/quiz-attempts", status_code=201)
def start_quiz_attempt(payload: QuizStartIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Chỉ học viên được làm Quiz.")
    with db() as conn:
        course, section = _require_student_course_enrollment(conn, user, payload.subject_id)
        if not course:
            raise HTTPException(status_code=404, detail="Không tìm thấy môn học.")
        payload = payload.model_copy(update={"subject_id": course["subject_id"]})
        try:
            chapter, lesson, _ = resolve_lesson(course, payload.lesson_id)
            questions = quiz_questions(lesson)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if not questions:
            raise HTTPException(status_code=422, detail="Bài học chưa có Quiz được giảng viên cấu hình trên server.")
        if not payload.restart:
            previous = conn.execute("SELECT * FROM student_quiz_attempts WHERE user_id=? AND subject_id=? AND lesson_id=? ORDER BY created_at DESC, id DESC LIMIT 1",
                                    (user["id"], payload.subject_id, lesson["id"])).fetchone()
            if (previous and previous["quiz_version"] == quiz_version(questions)
                    and previous["section_id"] == (section["id"] if section else "")):
                return public_attempt(previous)
        attempt_id = uid()
        conn.execute("""INSERT INTO student_quiz_attempts
            (id,user_id,subject_id,lesson_id,chapter_id,section_id,quiz_version,questions_json,answers_json,results_json,score,total,status,created_at,submitted_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,0,?,'in_progress',?,'')""",
            (attempt_id, user["id"], payload.subject_id, lesson["id"], chapter["id"], section["id"] if section else "",
             quiz_version(questions), json.dumps(questions, ensure_ascii=False), "{}", "[]", len(questions), now_utc()))
        row = conn.execute("SELECT * FROM student_quiz_attempts WHERE id=?", (attempt_id,)).fetchone()
    return public_attempt(row)


@router.post("/student/quiz-attempts/{attempt_id}/answers")
def answer_quiz_question(attempt_id: str, payload: QuizAnswerIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with db() as conn:
        row = conn.execute("SELECT * FROM student_quiz_attempts WHERE id=? AND user_id=? FOR UPDATE", (attempt_id, user["id"])).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy lần làm Quiz của bạn.")
        course, section = _require_student_course_enrollment(conn, user, row["subject_id"])
        if not course or (row["section_id"] and (not section or section["id"] != row["section_id"])):
            raise HTTPException(status_code=403, detail="Lần làm Quiz không thuộc lớp hiện tại.")
        questions = json.loads(row["questions_json"])
        answers = json.loads(row["answers_json"] or "{}")
        try:
            results = grade_answer(questions, answers, payload.question_id, payload.option_id)
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        finished = len(results) == len(questions)
        conn.execute("""UPDATE student_quiz_attempts SET answers_json=?, results_json=?, score=?, status=?, submitted_at=? WHERE id=?""",
                     (json.dumps(answers), json.dumps(results, ensure_ascii=False), sum(r["is_correct"] for r in results),
                      "submitted" if finished else "in_progress", row.get("submitted_at") or (now_utc() if finished else ""), attempt_id))
        updated = conn.execute("SELECT * FROM student_quiz_attempts WHERE id=?", (attempt_id,)).fetchone()
    return public_attempt(updated)


@router.post("/student/lessons/complete")
def complete_student_lesson(payload: LessonCompleteIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Only server-graded attempts complete a quiz lesson; award XP once per canonical lesson."""
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Chỉ học viên được ghi nhận hoàn thành bài học.")
    now = now_utc()
    with db() as conn:
        course, section = _require_student_course_enrollment(conn, user, payload.subject_id)
        if not course:
            raise HTTPException(status_code=404, detail="Không tìm thấy môn học.")
        try:
            chapter, lesson, display_code = resolve_lesson(course, payload.lesson_id)
            questions = quiz_questions(lesson)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        subject_id, lesson_id = course["subject_id"], lesson["id"]
        score, total = 0, 0
        if questions:
            attempt = conn.execute("SELECT * FROM student_quiz_attempts WHERE id=? AND user_id=? AND subject_id=? AND lesson_id=?",
                                   (payload.quiz_attempt_id or "", user["id"], subject_id, lesson_id)).fetchone()
            if (not attempt or attempt["status"] != "submitted" or attempt["quiz_version"] != quiz_version(questions)
                    or attempt["section_id"] != (section["id"] if section else "")
                    or attempt["total"] != len(questions) or attempt["score"] * 100 < attempt["total"] * 60):
                raise HTTPException(status_code=422, detail="Cần hoàn thành Quiz trên server và đạt ít nhất 60%. Nếu đề đã thay đổi, hãy làm lại Quiz.")
            score, total = attempt["score"], attempt["total"]
        _ensure_profile(conn, user["id"])
        # Serialize concurrent completions on the student's profile, not only the optional progress row.
        conn.execute("SELECT exp_points FROM student_profiles WHERE user_id=? FOR UPDATE", (user["id"],)).fetchone()
        existing = conn.execute("""SELECT * FROM student_lesson_progress
            WHERE user_id=? AND subject_id IN (?,?,?) AND lesson_id IN (?,?)
            ORDER BY completed_at DESC LIMIT 1""",
            (user["id"], subject_id, course["id"], course.get("code") or subject_id, lesson_id, display_code)).fetchone()
        xp_awarded = 0
        if not existing:
            xp_awarded = min(500, max(0, int(lesson.get("xp") or 50)))
            conn.execute("""INSERT INTO student_lesson_progress
                (id,user_id,subject_id,chapter_id,lesson_id,status,quiz_score,quiz_total,xp_earned,completed_at)
                VALUES(?,?,?,?,?,'done',?,?,?,?)""",
                (uid(),user["id"],subject_id,chapter["id"],lesson_id,score,total,xp_awarded,now))
            conn.execute("UPDATE student_profiles SET exp_points=exp_points+? WHERE user_id=?", (xp_awarded,user["id"]))
        else:
            conn.execute("""UPDATE student_lesson_progress SET subject_id=?,chapter_id=?,lesson_id=?,quiz_score=?,quiz_total=?,completed_at=? WHERE id=?""",
                         (subject_id,chapter["id"],lesson_id,score,total,now,existing["id"]))
        _update_streak_on_activity(conn, user["id"])
        _recalculate_course_avg_progress(conn, subject_id)
        profile = conn.execute("SELECT exp_points,current_streak FROM student_profiles WHERE user_id=?", (user["id"],)).fetchone()
    track_event(user["id"],None,"student_lesson_completed",{"subject_id":subject_id,"lesson_id":lesson_id,"xp_awarded":xp_awarded})
    return {"status":"completed","subject_id":subject_id,"lesson_id":lesson_id,"xp_awarded":xp_awarded,
            "total_xp":int(profile["exp_points"]),"current_streak":int(profile["current_streak"])}


@router.get("/student/video-notes")
def list_video_notes(
    subject_id: str = Query(default="oop"),
    lesson_id: str | None = Query(default=None),
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lấy ghi chú mốc thời gian video F8 đã lưu trong SQLite."""
    with db() as conn:
        if lesson_id:
            rows = conn.execute(
                """SELECT id, subject_id, lesson_id, time_sec, timestamp_label, content, created_at
                   FROM student_notes WHERE user_id=? AND subject_id=? AND lesson_id=?
                   ORDER BY created_at DESC""",
                (user["id"], subject_id, lesson_id),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT id, subject_id, lesson_id, time_sec, timestamp_label, content, created_at
                   FROM student_notes WHERE user_id=? AND subject_id=?
                   ORDER BY created_at DESC""",
                (user["id"], subject_id),
            ).fetchall()

    notes = []
    for r in rows:
        raw_t = r["created_at"] or ""
        short_t = raw_t[11:16] + " hôm nay" if len(raw_t) >= 16 and "T" in raw_t else "Vừa xong"
        notes.append(
            {
                "id": r["id"],
                "subject_id": r["subject_id"],
                "lesson_id": r["lesson_id"],
                "timeSec": int(r["time_sec"] or 0),
                "timestamp": r["timestamp_label"] or "00:00",
                "content": r["content"],
                "createdAt": short_t,
            }
        )
    return {"notes": notes}


@router.post("/student/video-notes", status_code=status.HTTP_201_CREATED)
def create_video_note(
    payload: VideoNoteCreateIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lưu mới một ghi chú kèm mốc thời gian video F8 vào bảng student_notes."""
    note_id = f"note-{uid()[:8]}"
    now = now_utc()
    title = f"[{payload.subject_id.upper()} {payload.lesson_id}] @ {payload.timestamp}"
    with db() as conn:
        conn.execute(
            """INSERT INTO student_notes(
                   id, user_id, assignment_id, title, content, tags, created_at,
                   subject_id, lesson_id, time_sec, timestamp_label
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
            (
                note_id,
                user["id"],
                f"{payload.subject_id}-{payload.lesson_id}",
                title,
                payload.content.strip(),
                payload.subject_id,
                now,
                payload.subject_id,
                payload.lesson_id,
                payload.time_sec,
                payload.timestamp,
            ),
        )
    return {
        "note": {
            "id": note_id,
            "subject_id": payload.subject_id,
            "lesson_id": payload.lesson_id,
            "timeSec": payload.time_sec,
            "timestamp": payload.timestamp,
            "content": payload.content.strip(),
            "createdAt": "Vừa xong",
        }
    }


@router.delete("/student/video-notes/{note_id}")
def delete_video_note(note_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, str]:
    """Xóa ghi chú video F8 của học viên."""
    with db() as conn:
        row = conn.execute("SELECT id, user_id FROM student_notes WHERE id=?", (note_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy ghi chú video")
        if row["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Không có quyền xóa ghi chú của người khác")
        conn.execute("DELETE FROM student_notes WHERE id=?", (note_id,))
    return {"status": "deleted", "id": note_id}


@router.post("/student/chapter-submissions", status_code=status.HTTP_201_CREATED)
def submit_chapter_exercise(payload: ChapterExerciseSubmitIn, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Accept a pinned repository submission; a URL is not a test run or a grade."""
    match = GITHUB_REPO_RE.fullmatch(payload.repo_url.strip())
    if not match:
        raise HTTPException(status_code=422, detail="Vui lòng nhập link repository GitHub hợp lệ.")
    owner, repo_name = match.group(1), match.group(2)
    repo_url = f"https://github.com/{owner}/{repo_name}"
    with db() as conn:
        course, section = _require_student_course_enrollment(conn, user, payload.subject_id)
        if not course:
            raise HTTPException(status_code=404, detail="Không tìm thấy học phần.")
        chapters = json.loads(course["chapters_json"] or "[]")
        assignment = next((a for ch in chapters if ch.get("status") != "Bản nháp"
                           for a in ch.get("assignments", []) if str(a.get("id")) == payload.exercise_id), None)
        if not assignment:
            raise HTTPException(status_code=422, detail="Bài tập chưa được phát hành hoặc không thuộc học phần.")
        class_id = section["id"] if section else course["id"]
    info = _verify_github_repo(owner, repo_name)
    now = now_utc()
    evidence = {"source": "github-rest", "repo_url": repo_url, "commit_sha": info.get("commit_sha") or "",
                "verified_at": now if info.get("commit_sha") else None, "verification": info["note"],
                "evaluation_status": "pending_review", "execution_status": "not_run"}
    feedback = {"strengths": "Đã tiếp nhận bài làm để giảng viên kiểm tra.",
                "improvements": info["note"] + " Chưa chạy kiểm thử; chưa có điểm tự động.",
                "cleanCodeAnalysis": "Chưa phân tích mã nguồn, độ tương đồng hoặc an toàn bộ nhớ."}
    student_name = user.get("full_name") or user.get("display_name") or "Học viên"
    student_code = user.get("user_code") or ""
    submission_id, dual_id = f"chsub-{uid()[:16]}", f"sub-{uid()[:20]}"
    with db() as conn:
        _ensure_profile(conn, user["id"])
        # Every submission records its own repository version; previous teacher feedback stays intact.
        conn.execute("""INSERT INTO student_chapter_submissions
            (id,user_id,subject_id,chapter_number,exercise_id,exercise_title,repo_url,student_note,
             score,max_score,tests_passed,tests_total,execution_time_ms,anti_plagiarism_score,
             rubric_json,ai_feedback_json,xp_awarded,dual_submission_id,submitted_at,status,
             student_name,student_code,valgrind_leaks,evidence_json)
            VALUES(?,?,?,?,?,?,?,?,0,10,0,0,0,0,?,?,0,?,?,'pending',?,?,0,?)""",
            (submission_id,user["id"],payload.subject_id,payload.chapter_number,payload.exercise_id,
             assignment.get("title") or payload.exercise_title,repo_url,payload.student_note.strip(),
             "[]",json.dumps(feedback,ensure_ascii=False),dual_id,now,student_name,student_code,
             json.dumps(evidence,ensure_ascii=False)))
        conn.execute("""INSERT INTO dual_submissions
            (id,class_id,user_id,student_name,student_code,chapter_title,repo_url,submitted_at,
             passed_tests,total_tests,exec_time_ms,memory_mb,commit_hash,commit_count,similarity_pct,
             test_details_json,defense_status,defense_score,coherence_summary,transcript_json,
             status,final_score,instructor_feedback,updated_at)
            VALUES(?,?,?,?,?,?,?,?,0,0,0,0,?,0,0,'[]','pending',0,?,'[]','pending',NULL,'',?)""",
            (dual_id,class_id,user["id"],student_name,student_code,
             f"Chương {payload.chapter_number}: {assignment.get('title') or payload.exercise_title}",
             repo_url,now,evidence["commit_sha"],"Đã nhận bài; chưa chạy kiểm thử, chưa có kết quả đánh giá tự động.",now))
        _recalculate_pending_dual_reviews(conn, class_id)
        row = conn.execute("SELECT * FROM student_chapter_submissions WHERE id=?", (submission_id,)).fetchone()
        profile = conn.execute("SELECT exp_points FROM student_profiles WHERE user_id=?", (user["id"],)).fetchone()
    record_audit_log(student_name,user["id"],"Nộp bài chờ kiểm tra",payload.exercise_title,
                     log_type="class",resource_type="chapter_submission",resource_id=submission_id)
    return {"submission": _serialize_chapter_submission(row), "total_xp": int(profile["exp_points"])}


@router.post("/student/xp-shop/unlock")
@router.post("/student/xp-shop/purchase")
def unlock_xp_shop_item(
    payload: XpShopPurchaseIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Mở khóa vật phẩm theo mốc XP tích lũy (không trừ XP) và lưu vào MySQL 8.0."""
    user_id = user["id"]
    is_free_theme = payload.category == "theme"
    item_key = (payload.category, payload.item_id)
    if is_free_theme:
        if payload.item_id not in ALL_THEME_IDS:
            raise HTTPException(status_code=422, detail=f"Chủ đề giao diện '{payload.item_id}' không hợp lệ.")
        required_xp = 0
    elif item_key in SHOP_ITEM_UNLOCK_XP:
        required_xp = SHOP_ITEM_UNLOCK_XP[item_key]
    else:
        raise HTTPException(status_code=422, detail=f"Vật phẩm '{payload.category}:{payload.item_id}' không tồn tại trong XP Shop.")

    with db() as conn:
        prof = _ensure_profile(conn, user_id)
        owned = _parse_owned_items(prof["owned_items_json"])
        cat_list = owned.setdefault(payload.category, [])
        xp = int(prof["exp_points"] or 0)

        if is_free_theme:
            owned["theme"] = list(dict.fromkeys([*ALL_THEME_IDS, payload.item_id]))
            if payload.item_id in ALL_THEME_IDS:
                u_row = conn.execute("SELECT theme_preference FROM users WHERE id=?", (user_id,)).fetchone()
                raw_pref = (u_row["theme_preference"] if u_row else "") or ""
                mode_part = raw_pref.split(":", 1)[0] if ":" in raw_pref and raw_pref.split(":", 1)[0] in ("light", "dark") else "light"
                conn.execute(
                    "UPDATE users SET theme_preference=?, updated_at=? WHERE id=?",
                    (f"{mode_part}:{payload.item_id}", now_utc(), user_id),
                )
        elif payload.item_id not in cat_list:
            if xp < required_xp:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cần đạt mốc {required_xp:,} XP để mở khóa vật phẩm này (hiện có {xp:,} XP).",
                )
            # Mở khóa theo mốc XP tích lũy — giữ nguyên exp_points, không trừ XP
            cat_list.append(payload.item_id)
            conn.execute(
                "UPDATE student_profiles SET owned_items_json=? WHERE user_id=?",
                (json.dumps(owned), user_id),
            )

    return {
        "exp_points": xp,
        "owned_items": owned,
        "unlocked": True,
        "required_xp": required_xp,
    }


@router.post("/student/xp-shop/claim-quest")
def claim_xp_quest(
    payload: XpQuestClaimIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Nhận thưởng XP từ Nhiệm vụ và lưu trạng thái đã nhận xuống MySQL 8.0 (kiểm chứng thưởng server-side)."""
    user_id = user["id"]
    if payload.quest_id not in QUEST_REWARDS:
        raise HTTPException(status_code=400, detail="Mã nhiệm vụ không hợp lệ")
    actual_reward = QUEST_REWARDS[payload.quest_id]

    with db() as conn:
        prof = _ensure_profile(conn, user_id)
        claimed = _parse_claimed_quests(prof["claimed_quests_json"])
        if payload.quest_id in claimed:
            raise HTTPException(status_code=400, detail="Nhiệm vụ này đã được nhận thưởng trước đó")

        if payload.quest_id == "q1":
            if int(prof.get("current_streak") or 0) < 3:
                raise HTTPException(
                    status_code=400,
                    detail="Bạn cần duy trì chuỗi học tập liên tiếp tối thiểu 3 ngày để nhận nhiệm vụ này.",
                )
        elif payload.quest_id == "q2":
            ch_cnt = int(conn.execute("SELECT COUNT(*) AS c FROM student_chapter_submissions WHERE user_id=?", (user_id,)).fetchone()["c"] or 0)
            def_cnt = int(conn.execute("SELECT COUNT(*) AS c FROM defense_sessions WHERE user_id=? AND status IN ('completed', 'flagged')", (user_id,)).fetchone()["c"] or 0)
            if ch_cnt < 1 and def_cnt < 1:
                raise HTTPException(
                    status_code=400,
                    detail="Bạn cần hoàn thành ít nhất 1 bài nộp Lab Chương hoặc 1 phiên Phản biện AI trước khi nhận thưởng.",
                )
        elif payload.quest_id == "q3":
            ch_cnt = int(conn.execute("SELECT COUNT(*) AS c FROM student_chapter_submissions WHERE user_id=?", (user_id,)).fetchone()["c"] or 0)
            u_name = (user.get("full_name") or user.get("display_name") or "").strip()
            git_cnt = int(conn.execute("SELECT COUNT(*) AS c FROM git_commits WHERE lower(author_name)=lower(?)", (u_name,)).fetchone()["c"] or 0) if u_name else 0
            if ch_cnt < 1 and git_cnt < 1:
                raise HTTPException(
                    status_code=400,
                    detail="Bạn cần đóng góp ít nhất 1 Git Commit hoặc nộp 1 Repository bài tập thực hành trước khi nhận thưởng.",
                )
        elif payload.quest_id == "q4":
            ls_cnt = int(conn.execute("SELECT COUNT(*) AS c FROM student_lesson_progress WHERE user_id=?", (user_id,)).fetchone()["c"] or 0)
            if ls_cnt < 5:
                raise HTTPException(
                    status_code=400,
                    detail=f"Bạn cần hoàn thành tối thiểu 5 bài học (hiện tại: {ls_cnt}/5) để nhận nhiệm vụ này.",
                )

        claimed.append(payload.quest_id)
        new_xp = int(prof["exp_points"] or 0) + actual_reward
        conn.execute(
            "UPDATE student_profiles SET exp_points=?, claimed_quests_json=? WHERE user_id=?",
            (new_xp, json.dumps(claimed), user_id),
        )
    return {"exp_points": new_xp, "claimed_quests": claimed}


@router.patch("/student/xp-shop/equip")
def equip_xp_shop_item(
    payload: XpShopEquipIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Trang bị vật phẩm thẩm mỹ đã sở hữu trong XP Shop vào hồ sơ CSDL của học viên."""
    user_id = user["id"]
    raw_cat = payload.category.strip().lower()
    item_id = payload.item_id.strip()

    slot_map = {
        "avatar": ("avatar", "avatar"),
        "mentor": ("mentor", "mentor"),
        "chat": ("chat", "chat_skin"),
        "chat_skin": ("chat", "chat_skin"),
        "map": ("map", "map_skin"),
        "map_skin": ("map", "map_skin"),
        "badge": ("badge", "badge"),
    }
    if raw_cat not in slot_map:
        raise HTTPException(status_code=422, detail="Nhóm vật phẩm trang bị không hợp lệ.")
    owned_cat, equip_slot = slot_map[raw_cat]

    with db() as conn:
        prof = _ensure_profile(conn, user_id)
        owned = _parse_owned_items(prof["owned_items_json"])
        allowed_items = set(owned.get(owned_cat, [])) | set(DEFAULT_OWNED_ITEMS.get(owned_cat, []))
        if item_id not in allowed_items:
            raise HTTPException(
                status_code=403,
                detail="Bạn chưa mở khóa vật phẩm này trong XP Shop nên không thể trang bị.",
            )
        equipped = _parse_equipped_items(prof.get("equipped_items_json"))
        equipped[equip_slot] = item_id
        conn.execute(
            "UPDATE student_profiles SET equipped_items_json = ? WHERE user_id = ?",
            (json.dumps(equipped, ensure_ascii=False), user_id),
        )

    return {"equipped_items": equipped}


_SECTION_COLUMNS_READY = False


def _ensure_section_enrollment_meta(conn: Any) -> None:
    """Đảm bảo bảng class_sections có lịch học, mã tham gia lớp (join_code) và các nhóm lớp mẫu N02 thực tế (kể cả sau reset-demo)."""
    global _SECTION_COLUMNS_READY
    if not _SECTION_COLUMNS_READY:
        cols = {r["Field"] for r in conn.execute("SHOW COLUMNS FROM class_sections").fetchall()}
        if "join_code" not in cols:
            conn.execute("ALTER TABLE class_sections ADD COLUMN join_code VARCHAR(32) NULL")
        if "schedule_label" not in cols:
            conn.execute("ALTER TABLE class_sections ADD COLUMN schedule_label VARCHAR(120) NULL")
        _SECTION_COLUMNS_READY = True

    has_n02 = conn.execute(
        "SELECT id FROM class_sections WHERE id = 'sec-cs205-n02' LIMIT 1"
    ).fetchone()
    has_null_meta = conn.execute(
        "SELECT id FROM class_sections WHERE join_code IS NULL OR schedule_label IS NULL LIMIT 1"
    ).fetchone()
    if has_n02 and not has_null_meta:
        return

    # Bổ sung nhóm lớp N02 (ca chiều / giảng viên khác) cho các môn tiêu biểu để học viên có thể chọn lớp thực tế
    extra_n02_specs = [
        ("sec-cs205-n02", "class-network", "CS205-N02", "TS. Lê Hoàng Mai", "Lab B2-208", 40, "Thứ 5 · 13:30 - 17:00"),
        ("sec-cs308-n02", "class-system-design", "CS308-N02", "Cô Trần Thị B", "Lab C1-202", 35, "Thứ 6 · 13:30 - 17:00"),
        ("sec-cs215-n02", "class-realtime", "CS215-N02", "Thầy Nguyễn Phước", "Lab B2-115", 40, "Thứ 4 · 13:30 - 17:00"),
        ("sec-cs410-n02", "class-ai-ml", "CS410-N02", "Thầy Nguyễn Phước", "Lab AI-01", 35, "Thứ 7 · 08:00 - 11:30"),
        ("sec-cs306-n02", "class-mobile", "CS306-N02", "Cô Trần Thị B", "Lab B2-118", 40, "Thứ 3 · 13:30 - 17:00"),
        ("sec-cs312-n02", "class-security", "CS312-N02", "Thầy Trần Minh Quân", "Lab C2-405", 35, "Thứ 6 · 07:30 - 11:00"),
    ]
    now = now_utc()
    for sec_id, course_id, sec_code, teacher_name, room, max_stu, sched in extra_n02_specs:
        course_exists = conn.execute("SELECT id, semester, docker_image FROM courses WHERE id = ?", (course_id,)).fetchone()
        if not course_exists:
            continue
        sec_exists = conn.execute(
            "SELECT id FROM class_sections WHERE id = ? OR section_code = ? LIMIT 1",
            (sec_id, sec_code),
        ).fetchone()
        if not sec_exists:
            conn.execute(
                """INSERT INTO class_sections(
                       id, course_id, section_code, semester, instructor_id, teacher_name, room, max_students,
                       docker_image, sandbox_enabled, ai_defense_enabled, avg_progress_pct,
                       pending_dual_reviews, health, status, join_code, schedule_label, created_at, updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    sec_id,
                    course_id,
                    sec_code,
                    course_exists["semester"] or "Học kỳ 1 / 2026",
                    "user-instructor",
                    teacher_name,
                    room,
                    max_stu,
                    course_exists["docker_image"] or "gcc:13-bookworm",
                    1,
                    1,
                    0,
                    0,
                    "Tốt",
                    "active",
                    sec_code,
                    sched,
                    now,
                    now,
                ),
            )

    default_schedules = [
        "Thứ 2 · 07:30 - 11:00",
        "Thứ 3 · 07:30 - 11:00",
        "Thứ 4 · 07:30 - 11:00",
        "Thứ 5 · 07:30 - 11:00",
        "Thứ 6 · 07:30 - 11:00",
    ]
    all_secs = conn.execute("SELECT id, section_code, join_code, schedule_label FROM class_sections").fetchall()
    for idx, s in enumerate(all_secs):
        j_code = (s.get("join_code") or "").strip() or str(s["section_code"]).strip().upper()
        sched = (s.get("schedule_label") or "").strip() or default_schedules[idx % len(default_schedules)]
        if s.get("join_code") != j_code or s.get("schedule_label") != sched:
            conn.execute(
                "UPDATE class_sections SET join_code = ?, schedule_label = ? WHERE id = ?",
                (j_code, sched, s["id"]),
            )
    conn.commit()


def _format_short_section_label(section_code: str, course_code: str) -> str:
    clean = (section_code or "").strip()
    prefix = f"{(course_code or '').strip()}-"
    if prefix != "-" and clean.upper().startswith(prefix.upper()):
        suffix = clean[len(prefix):].strip()
        if suffix:
            return f"Lớp {suffix}"
    return f"Lớp {clean}" if clean else "Lớp N01"


class JoinClassByCodeIn(BaseModel):
    code: str = Field(..., min_length=2, max_length=64)
    expected_subject_id: str | None = Field(default=None, max_length=64)


@router.get("/student/courses/{course_or_subject_id}/sections")
def list_open_course_sections(
    course_or_subject_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Lấy danh sách các Lớp học phần đang mở của một môn học kèm sĩ số thực tế."""
    raw_key = course_or_subject_id.strip()
    mapped_class = SUBJECT_TO_CLASS_ID.get(raw_key, raw_key)
    with db() as conn:
        _ensure_section_enrollment_meta(conn)
        course = conn.execute(
            "SELECT * FROM courses WHERE id = ? OR subject_id = ? OR UPPER(code) = UPPER(?) LIMIT 1",
            (mapped_class, raw_key, raw_key),
        ).fetchone()
        if not course:
            raise HTTPException(status_code=404, detail="Không tìm thấy học phần này.")

        secs = conn.execute(
            """SELECT * FROM class_sections
               WHERE course_id = ? AND status = 'active'
               ORDER BY section_code ASC""",
            (course["id"],),
        ).fetchall()

        enr_rows = conn.execute(
            """SELECT section_id, student_id
               FROM class_enrollments
               WHERE status = 'active'"""
        ).fetchall()

    by_sec: dict[str, set[str]] = {}
    for er in enr_rows:
        by_sec.setdefault(str(er["section_id"]), set()).add(str(er["student_id"]))

    my_enrolled_section_id: str | None = None
    out_sections: list[dict[str, Any]] = []
    for s in secs:
        sid = str(s["id"])
        stu_set = by_sec.get(sid, set())
        is_me = user["id"] in stu_set
        if is_me:
            my_enrolled_section_id = sid
        enrolled_cnt = len(stu_set)
        max_stu = int(s.get("max_students") or 45)
        out_sections.append(
            {
                "id": sid,
                "sectionCode": s["section_code"],
                "groupLabel": _format_short_section_label(s["section_code"], course["code"]),
                "joinCode": s.get("join_code") or s["section_code"],
                "teacherName": s.get("teacher_name") or course.get("teacher_name") or "Giảng viên Phụ trách",
                "room": s.get("room") or course.get("room") or "Lab A3-201",
                "semester": s.get("semester") or course.get("semester") or "Học kỳ 1 / 2026",
                "scheduleLabel": s.get("schedule_label") or "Thứ 2 · 07:30 - 11:00",
                "enrolledCount": enrolled_cnt,
                "maxStudents": max_stu,
                "isFull": enrolled_cnt >= max_stu and not is_me,
                "isEnrolled": is_me,
            }
        )

    return {
        "courseId": course["id"],
        "subjectId": course["subject_id"],
        "courseCode": course["code"],
        "courseName": course["name"],
        "credits": int(course.get("credits") or 3),
        "enrolledSectionId": my_enrolled_section_id,
        "sections": out_sections,
    }


@router.post("/student/classes/join-by-code", status_code=status.HTTP_200_OK)
def join_class_by_code(
    payload: JoinClassByCodeIn,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Học viên tham gia lớp học phần bằng Mã lớp do Giảng viên / Admin cấp."""
    if str(user.get("role") or "").lower() != "student":
        raise HTTPException(status_code=403, detail="Chỉ tài khoản Học viên mới dùng chức năng tham gia lớp học phần.")

    clean_code = payload.code.strip().upper()
    compact_code = clean_code.replace(" ", "")
    with db() as conn:
        _ensure_section_enrollment_meta(conn)
        sec = conn.execute(
            """SELECT cs.*, c.code AS course_code, c.name AS course_name, c.subject_id
               FROM class_sections cs
               JOIN courses c ON c.id = cs.course_id
               WHERE cs.status = 'active'
                 AND (
                   UPPER(cs.join_code) = ?
                   OR UPPER(cs.section_code) = ?
                   OR REPLACE(UPPER(cs.section_code), '-', '') = REPLACE(?, '-', '')
                 )
               LIMIT 1""",
            (compact_code, compact_code, compact_code),
        ).fetchone()

        if not sec:
            raise HTTPException(
                status_code=404,
                detail="Mã tham gia lớp không hợp lệ hoặc lớp học phần đã đóng. Vui lòng kiểm tra lại mã từ Giảng viên.",
            )

        if payload.expected_subject_id:
            exp = payload.expected_subject_id.strip().lower()
            if exp and str(sec["subject_id"]).lower() != exp and str(sec["course_code"]).lower() != exp:
                raise HTTPException(
                    status_code=400,
                    detail=f"Mã lớp {sec['section_code']} thuộc môn {sec['course_code']} ({sec['course_name']}), không phải môn hiện tại.",
                )

    return enroll_student_course(sec["id"], user=user)


@router.post("/student/courses/{course_or_section_id}/enroll", status_code=status.HTTP_200_OK)
def enroll_student_course(
    course_or_section_id: str,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Học viên tự ghi danh vào lớp học phần đang mở của môn học."""
    if str(user.get("role") or "").lower() != "student":
        raise HTTPException(status_code=403, detail="Chỉ tài khoản Học viên mới dùng chức năng ghi danh học phần.")
    user_id = user["id"]
    raw_key = course_or_section_id.strip()
    mapped_class = SUBJECT_TO_CLASS_ID.get(raw_key, raw_key)
    now = now_utc()

    with db() as conn:
        _ensure_section_enrollment_meta(conn)
        sec = conn.execute(
            """SELECT cs.*, c.code AS course_code, c.name AS course_name, c.subject_id
               FROM class_sections cs
               JOIN courses c ON c.id = cs.course_id
               WHERE (cs.id = ? OR cs.section_code = ?) AND cs.status = 'active'
               LIMIT 1""",
            (raw_key, raw_key),
        ).fetchone()
        if not sec:
            sec = conn.execute(
                """SELECT cs.*, c.code AS course_code, c.name AS course_name, c.subject_id
                   FROM class_sections cs
                   JOIN courses c ON c.id = cs.course_id
                   WHERE (c.id = ? OR c.subject_id = ? OR c.code = ?) AND cs.status = 'active'
                   ORDER BY cs.created_at ASC
                   LIMIT 1""",
                (mapped_class, raw_key, raw_key),
            ).fetchone()
        if not sec:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học phần đang mở cho môn học này.")

        existing_in_course = conn.execute(
            """SELECT ce.id, ce.section_id, cs.section_code
               FROM class_enrollments ce
               JOIN class_sections cs ON cs.id = ce.section_id
               WHERE ce.student_id = ? AND cs.course_id = ? AND ce.status = 'active'
               LIMIT 1""",
            (user_id, sec["course_id"]),
        ).fetchone()
        if existing_in_course:
            return {
                "enrolled": True,
                "sectionId": existing_in_course["section_id"],
                "sectionCode": existing_in_course["section_code"],
                "courseId": sec["course_id"],
                "subjectId": sec["subject_id"],
                "courseCode": sec["course_code"],
                "message": f"Bạn đã ghi danh lớp {existing_in_course['section_code']}.",
            }

        cnt_row = conn.execute(
            "SELECT COUNT(*) AS c FROM class_enrollments WHERE section_id = ? AND status = 'active'",
            (sec["id"],),
        ).fetchone()
        cur_students = int(cnt_row["c"] or 0) if cnt_row else 0
        max_students = int(sec["max_students"] or 45)
        if cur_students >= max_students:
            raise HTTPException(status_code=400, detail=f"Lớp {sec['section_code']} đã đủ sĩ số tối đa ({max_students} HV).")

        existing_row = conn.execute(
            "SELECT id FROM class_enrollments WHERE section_id = ? AND student_id = ? LIMIT 1",
            (sec["id"], user_id),
        ).fetchone()
        if existing_row:
            conn.execute(
                "UPDATE class_enrollments SET status = 'active', enrolled_at = ? WHERE id = ?",
                (now, existing_row["id"]),
            )
        else:
            conn.execute(
                "INSERT INTO class_enrollments(id, section_id, student_id, status, enrolled_at) VALUES(?, ?, ?, 'active', ?)",
                (f"enr-{uid()[:10]}", sec["id"], user_id, now),
            )

        conn.execute(
            """UPDATE courses
               SET student_count = COALESCE((
                   SELECT COUNT(*) FROM class_enrollments ce
                   JOIN class_sections cs ON cs.id = ce.section_id
                   WHERE cs.course_id = courses.id AND ce.status = 'active'
               ), 0)
               WHERE id = ?""",
            (sec["course_id"],),
        )
        conn.execute(
            """UPDATE users
               SET classes_count = COALESCE((
                   SELECT COUNT(*) FROM class_enrollments ce WHERE ce.student_id = users.id AND ce.status = 'active'
               ), 0)
               WHERE id = ?""",
            (user_id,),
        )

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Học viên",
        user_id,
        f"Ghi danh lớp học phần {sec['section_code']}",
        f"{sec['course_code']} - {sec['course_name']}",
        log_type="class",
        resource_type="class_enrollment",
        resource_id=sec["id"],
    )
    return {
        "enrolled": True,
        "sectionId": sec["id"],
        "sectionCode": sec["section_code"],
        "courseId": sec["course_id"],
        "subjectId": sec["subject_id"],
        "courseCode": sec["course_code"],
        "message": f"Đã ghi danh thành công vào lớp {sec['section_code']} ({sec['course_name']}).",
    }
