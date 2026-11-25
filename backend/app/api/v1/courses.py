from __future__ import annotations

import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user, record_audit_log, require_instructor
from app.core.database import db
from app.core.security import uid
from app.core.timezone import now_utc
from app.services.quiz_grading import public_course_chapters
from app.schemas.courses import (
    AssignmentUpdateIn,
    ChapterCreateIn,
    ChapterPatchIn,
    DockerTestCaseIn,
    DockerTestCaseUpdateIn,
    LessonCreateIn,
    LessonReorderIn,
    LessonSaveIn,
    MindmapSaveIn,
)

router = APIRouter(tags=["Courses & Syllabus"])


import re


def _build_mindmap_telemetry_maps(conn: Any) -> dict[str, Any]:
    enr_rows = conn.execute(
        "SELECT section_id, student_id FROM class_enrollments WHERE status = 'active'"
    ).fetchall()
    students_by_section: dict[str, set[str]] = {}
    for er in enr_rows:
        sid = str(er.get("section_id") or "")
        uid_val = str(er.get("student_id") or "")
        if sid and uid_val:
            students_by_section.setdefault(sid, set()).add(uid_val)

    prog_rows = conn.execute(
        "SELECT user_id, subject_id, chapter_id, lesson_id, quiz_score, quiz_total FROM student_lesson_progress"
    ).fetchall()
    prog_by_user: dict[str, list[dict[str, Any]]] = {}
    for pr in prog_rows:
        u = str(pr.get("user_id") or "")
        if u:
            prog_by_user.setdefault(u, []).append(dict(pr))

    sub_rows = conn.execute(
        """SELECT user_id, subject_id, chapter_number,
                  tests_passed, tests_total, instructor_grade, status
           FROM student_chapter_submissions"""
    ).fetchall()
    subs_by_user: dict[str, list[dict[str, Any]]] = {}
    for sr in sub_rows:
        u = str(sr.get("user_id") or "")
        if u:
            subs_by_user.setdefault(u, []).append(dict(sr))

    return {
        "students_by_section": students_by_section,
        "prog_by_user": prog_by_user,
        "subs_by_user": subs_by_user,
    }


def _enrich_chapters_mindmap_mastery(
    row: Any,
    chapters: list[dict[str, Any]],
    telemetry: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    if not telemetry or not chapters:
        return chapters

    sec_id = str(row.get("section_id") or row["id"] or "")
    course_id = str(row.get("course_id") or row["id"] or "")
    subject_id = str(row.get("subject_id") or "")
    enrolled_set: set[str] = telemetry["students_by_section"].get(sec_id, set())
    total_stu = len(enrolled_set)

    user_progs: list[dict[str, Any]] = []
    user_subs: list[dict[str, Any]] = []
    for u in enrolled_set:
        for p in telemetry["prog_by_user"].get(u, []):
            if subject_id and p.get("subject_id") == subject_id:
                user_progs.append(p)
        for s in telemetry["subs_by_user"].get(u, []):
            if subject_id and s.get("subject_id") == subject_id:
                user_subs.append(s)

    for chap_idx, ch in enumerate(chapters, start=1):
        nodes = ch.get("mindmapNodes") or []
        if not nodes:
            continue

        if total_stu == 0:
            for n in nodes:
                nd = n.setdefault("data", {})
                nd["masteryPct"] = 0
                nd["enrolledCount"] = 0
                nd["completedStudents"] = 0
            continue

        lessons = ch.get("lessons") or []
        lesson_mastery_by_idx: dict[int, tuple[int, int]] = {}
        lesson_mastery_by_id: dict[str, tuple[int, int]] = {}
        lesson_mastery_by_code: dict[str, tuple[int, int]] = {}

        for l_idx, lesson in enumerate(lessons, start=1):
            lid = str(lesson.get("id") or "")
            ltitle = str(lesson.get("title") or "")
            m_code = re.match(r"^\s*(\d+\.\d+)", ltitle)
            code_key = m_code.group(1) if m_code else f"{chap_idx}.{l_idx}"

            matched = [
                p
                for p in user_progs
                if str(p.get("lesson_id") or "") in {lid, code_key, f"{chap_idx}.{l_idx}"}
            ]
            done_users = {str(p["user_id"]) for p in matched}
            comp_pct = (len(done_users) / total_stu) * 100.0
            quiz_pcts = [
                (int(p.get("quiz_score") or 0) / max(1, int(p.get("quiz_total") or 1))) * 100.0
                for p in matched
                if int(p.get("quiz_total") or 0) > 0
            ]
            if done_users:
                avg_q = (sum(quiz_pcts) / len(quiz_pcts)) if quiz_pcts else comp_pct
                m_pct = int(round(comp_pct * 0.7 + avg_q * 0.3))
            else:
                m_pct = 0

            lesson_mastery_by_idx[l_idx] = (m_pct, len(done_users))
            if lid:
                lesson_mastery_by_id[lid] = (m_pct, len(done_users))
            lesson_mastery_by_code[code_key] = (m_pct, len(done_users))

        chap_subs = [s for s in user_subs if int(s.get("chapter_number") or 1) == chap_idx]
        best_sub_by_user: dict[str, float] = {}
        for s in chap_subs:
            u = str(s["user_id"])
            if s.get("instructor_grade") is not None:
                sc = float(s["instructor_grade"]) * 10.0
            else:
                sc = (int(s.get("tests_passed") or 0) / max(1, int(s.get("tests_total") or 1))) * 100.0
            best_sub_by_user[u] = max(best_sub_by_user.get(u, 0.0), min(100.0, sc))
        lab_mastery = int(round(sum(best_sub_by_user.values()) / total_stu)) if best_sub_by_user else 0
        lab_done_cnt = len(best_sub_by_user)

        edges = ch.get("mindmapEdges") or []
        parent_map: dict[str, str] = {}
        for e in edges:
            src = str(e.get("source") or "")
            tgt = str(e.get("target") or "")
            if src and tgt:
                parent_map[tgt] = src

        branch_pcts: dict[str, int] = {}
        branch_done_cnts: dict[str, int] = {}
        branch_counter = 0

        for n in nodes:
            nd = n.setdefault("data", {})
            ntype = str(nd.get("nodeType") or "branch")
            if ntype != "branch":
                continue
            branch_counter += 1
            nid = str(n.get("id") or "")
            ntitle = str(nd.get("title") or "")
            ntag = str(nd.get("tag") or "")
            explicit_lid = str(nd.get("lessonId") or "")

            res_tuple: tuple[int, int] | None = None
            if explicit_lid and explicit_lid in lesson_mastery_by_id:
                res_tuple = lesson_mastery_by_id[explicit_lid]
            if res_tuple is None:
                m_t = re.match(r"^\s*(\d+\.\d+)", ntitle)
                if m_t and m_t.group(1) in lesson_mastery_by_code:
                    res_tuple = lesson_mastery_by_code[m_t.group(1)]
            if res_tuple is None:
                m_tag = re.search(r"bài\s*(\d+)", ntag, flags=re.IGNORECASE)
                if m_tag and int(m_tag.group(1)) in lesson_mastery_by_idx:
                    res_tuple = lesson_mastery_by_idx[int(m_tag.group(1))]
            if res_tuple is None and branch_counter in lesson_mastery_by_idx:
                res_tuple = lesson_mastery_by_idx[branch_counter]

            b_pct, b_done = res_tuple if res_tuple is not None else (0, 0)
            nd["masteryPct"] = b_pct
            nd["enrolledCount"] = total_stu
            nd["completedStudents"] = b_done
            branch_pcts[nid] = b_pct
            branch_done_cnts[nid] = b_done

        for n in nodes:
            nd = n.setdefault("data", {})
            ntype = str(nd.get("nodeType") or "branch")
            if ntype != "leaf":
                continue
            nid = str(n.get("id") or "")
            combined_label = f"{nd.get('title') or ''} {nd.get('tag') or ''}".lower()
            is_lab_leaf = any(k in combined_label for k in ("lab", "docker", "bài tập", "test"))
            pid = parent_map.get(nid, "")
            parent_pct = branch_pcts.get(pid, 0)
            parent_done = branch_done_cnts.get(pid, 0)
            if is_lab_leaf and (lab_done_cnt > 0 or parent_pct == 0):
                nd["masteryPct"] = lab_mastery
                nd["completedStudents"] = lab_done_cnt
            else:
                nd["masteryPct"] = parent_pct
                nd["completedStudents"] = parent_done
            nd["enrolledCount"] = total_stu

        all_components = list(branch_pcts.values())
        if lab_done_cnt > 0:
            all_components.append(lab_mastery)
        elif not all_components and lesson_mastery_by_idx:
            all_components = [v[0] for v in lesson_mastery_by_idx.values()]
        root_pct = int(round(sum(all_components) / len(all_components))) if all_components else 0
        for n in nodes:
            nd = n.setdefault("data", {})
            if str(nd.get("nodeType") or "") == "root":
                nd["masteryPct"] = root_pct
                nd["enrolledCount"] = total_stu
                nd["completedStudents"] = max(branch_done_cnts.values(), default=lab_done_cnt)

    return chapters


def _serialize_course(row: Any, telemetry: dict[str, Any] | None = None) -> dict[str, Any]:
    enrolled_cnt = row.get("enrolled_count")
    stu_count = int(enrolled_cnt) if enrolled_cnt is not None else int(row.get("student_count") or 0)
    sec_id = row.get("section_id") or row["id"]
    course_id = row.get("course_id") or row["id"]
    raw_chapters = json.loads(row["chapters_json"] or "[]")
    chapters = _enrich_chapters_mindmap_mastery(row, raw_chapters, telemetry)
    return {
        "id": sec_id,
        "sectionId": sec_id,
        "courseId": course_id,
        "subjectId": row["subject_id"],
        "code": row["code"],
        "sectionCode": row.get("section_code") or f"{row['code']}-N01",
        "name": row["name"],
        "semester": row["semester"],
        "stageNumber": int(row.get("stage_number") or 1),
        "stageTitle": row.get("stage_title") or "Cơ sở cốt lõi",
        "credits": int(row.get("credits") or 3),
        "instructorId": row.get("instructor_id") or "",
        "teacher": row["teacher_name"],
        "studentCount": stu_count,
        "maxStudents": int(row.get("max_students") or 45),
        "avgProgressPct": int(row.get("avg_progress_pct") or 0),
        "pendingDualReviews": int(row.get("pending_dual_reviews") or 0),
        "health": row["health"],
        "room": row["room"],
        "dockerImage": row["docker_image"],
        "sandboxEnabled": bool(row["sandbox_enabled"]),
        "aiDefenseEnabled": bool(row["ai_defense_enabled"]),
        "enrolled": bool(row.get("enrolled")) if row.get("enrolled") is not None else False,
        "chapters": chapters,
    }


def _load_course_or_404(
    conn: Any,
    course_or_section_id: str,
    owner_user: dict[str, Any] | None = None,
) -> tuple[Any, list[dict[str, Any]]]:
    sec = conn.execute(
        """SELECT cs.*, cs.id AS section_id, c.id AS course_id, c.subject_id, c.code, c.name,
                  c.stage_number, c.stage_title, c.credits, c.student_count, c.chapters_json,
                  (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.section_id = cs.id AND ce.status = 'active') AS enrolled_count
           FROM class_sections cs
           JOIN courses c ON c.id = cs.course_id
           WHERE cs.id = ?""",
        (course_or_section_id,),
    ).fetchone()
    if sec:
        if owner_user and (owner_user.get("role") or "").lower() != "admin":
            if sec.get("instructor_id") != owner_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn không được phân công phụ trách lớp học phần này",
                )
        return sec, json.loads(sec["chapters_json"] or "[]")

    row = conn.execute("SELECT * FROM courses WHERE id=?", (course_or_section_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy học phần")
    if owner_user and (owner_user.get("role") or "").lower() != "admin":
        assigned = conn.execute(
            "SELECT id FROM class_sections WHERE course_id=? AND instructor_id=? LIMIT 1",
            (row["id"], owner_user["id"]),
        ).fetchone()
        if row.get("instructor_id") != owner_user["id"] and not assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không được phân công phụ trách môn học này",
            )
    row_dict = dict(row)
    row_dict["course_id"] = row["id"]
    return row_dict, json.loads(row["chapters_json"] or "[]")


def _save_chapters(conn: Any, course_id: str, chapters: list[dict[str, Any]]) -> None:
    conn.execute(
        "UPDATE courses SET chapters_json=?, updated_at=? WHERE id=?",
        (json.dumps(chapters, ensure_ascii=False), now_utc(), course_id),
    )


@router.get("/courses")
def list_courses(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lấy danh sách lớp học phần / môn học theo đúng vai trò RBAC (Phương án A)."""
    role = (user.get("role") or "student").strip().lower()
    with db() as conn:
        telemetry = _build_mindmap_telemetry_maps(conn)
        if role == "instructor":
            rows = conn.execute(
                """SELECT cs.*, cs.id AS section_id, c.id AS course_id, c.subject_id, c.code, c.name,
                          c.stage_number, c.stage_title, c.credits, c.student_count, c.chapters_json,
                          (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.section_id = cs.id AND ce.status = 'active') AS enrolled_count
                   FROM class_sections cs
                   JOIN courses c ON c.id = cs.course_id
                   WHERE cs.instructor_id = ? AND cs.status = 'active'
                   ORDER BY c.stage_number ASC, cs.section_code ASC""",
                (user["id"],),
            ).fetchall()
            return {"courses": [_serialize_course(r, telemetry) for r in rows]}

        if role == "admin":
            rows = conn.execute(
                """SELECT cs.*, cs.id AS section_id, c.id AS course_id, c.subject_id, c.code, c.name,
                          c.stage_number, c.stage_title, c.credits, c.student_count, c.chapters_json,
                          (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.section_id = cs.id AND ce.status = 'active') AS enrolled_count
                   FROM class_sections cs
                   JOIN courses c ON c.id = cs.course_id
                   ORDER BY c.stage_number ASC, cs.section_code ASC"""
            ).fetchall()
            return {"courses": [_serialize_course(r, telemetry) for r in rows]}

        course_rows = conn.execute("SELECT * FROM courses ORDER BY stage_number ASC, code ASC").fetchall()
        sec_rows = conn.execute(
            """SELECT cs.*, cs.id AS section_id, c.id AS course_id,
                      (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.section_id = cs.id AND ce.status = 'active') AS enrolled_count
               FROM class_sections cs
               JOIN courses c ON c.id = cs.course_id
               WHERE cs.status = 'active'
               ORDER BY cs.created_at ASC"""
        ).fetchall()
        enr_rows = conn.execute(
            "SELECT section_id FROM class_enrollments WHERE student_id=? AND status='active'",
            (user["id"],),
        ).fetchall()
        enrolled_ids = {r["section_id"] for r in enr_rows}

    serialized: list[dict[str, Any]] = []
    for c in course_rows:
        matching = [s for s in sec_rows if s["course_id"] == c["id"]]
        enrolled_sec = next((s for s in matching if s["section_id"] in enrolled_ids), None)
        picked = enrolled_sec or (matching[0] if matching else None)
        merged = dict(c)
        if picked:
            merged.update(
                {
                    "id": picked["section_id"],
                    "section_id": picked["section_id"],
                    "course_id": c["id"],
                    "section_code": picked["section_code"],
                    "semester": picked["semester"],
                    "instructor_id": picked.get("instructor_id") or "",
                    "teacher_name": picked["teacher_name"],
                    "room": picked["room"],
                    "max_students": picked.get("max_students") or 45,
                    "docker_image": picked["docker_image"],
                    "sandbox_enabled": picked["sandbox_enabled"],
                    "ai_defense_enabled": picked["ai_defense_enabled"],
                    "avg_progress_pct": picked["avg_progress_pct"],
                    "pending_dual_reviews": picked["pending_dual_reviews"],
                    "health": picked["health"],
                    "enrolled_count": picked.get("enrolled_count") or 0,
                    "enrolled": enrolled_sec is not None,
                }
            )
        else:
            merged["enrolled"] = False
        item = _serialize_course(merged, telemetry)
        item["chapters"] = public_course_chapters(item.get("chapters"))
        serialized.append(item)
    return {"courses": serialized}


@router.get("/courses/{course_id}")
def get_course(course_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lấy chi tiết 1 học phần theo ID."""
    with db() as conn:
        telemetry = _build_mindmap_telemetry_maps(conn)
        row, _ = _load_course_or_404(conn, course_id)
    result = _serialize_course(row, telemetry)
    if user.get("role") not in ("instructor", "admin"):
        result["chapters"] = public_course_chapters(result.get("chapters"))
    return {"course": result}


@router.post("/instructor/courses/{course_id}/chapters", status_code=status.HTTP_201_CREATED)
def create_chapter(
    course_id: str,
    payload: ChapterCreateIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Giảng viên thêm chương mới vào học phần (tự tạo sẵn Lab Docker mặc định đúng image của môn)."""
    new_chapter_id = f"ch-{uid()[:8]}"
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id, owner_user=user)
        docker_img = row.get("docker_image") or "codemind/cpp20-sandbox:latest"
        new_chapter: dict[str, Any] = {
            "id": new_chapter_id,
            "title": payload.title.strip(),
            "status": "Bản nháp",
            "mindmapGenerated": False,
            "mindmapNodes": [],
            "mindmapEdges": [],
            "lessons": [],
            "assignments": [
                {
                    "id": f"lab-{uid()[:8]}",
                    "type": "code_lab",
                    "title": f"Bài tập thực hành Docker: {payload.title.strip()}",
                    "description": "Sinh viên nộp repo GitHub để chấm tự động qua Docker Sandbox & Phản biện AI.",
                    "isRequired": True,
                    "points": 100,
                    "dockerImage": docker_img,
                    "testCases": [],
                }
            ],
        }
        chapters.append(new_chapter)
        _save_chapters(conn, row["course_id"], chapters)
        updated, _ = _load_course_or_404(conn, course_id)

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Giảng viên",
        user["id"],
        f"Thêm chương học: {new_chapter['title']}",
        f"{row['code']} · {course_id}",
        log_type="class",
        resource_type="course",
        resource_id=course_id,
    )
    return {"chapter": new_chapter, "course": _serialize_course(updated)}


@router.patch("/instructor/courses/{course_id}/chapters/{chapter_id}")
def patch_chapter(
    course_id: str,
    chapter_id: str,
    payload: ChapterPatchIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Cập nhật tiêu đề hoặc trạng thái phát hành ('Đã phát hành' / 'Bản nháp') của chương."""
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id, owner_user=user)
        target = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        if payload.title is not None:
            target["title"] = payload.title.strip()
        if payload.status is not None:
            target["status"] = payload.status
        _save_chapters(conn, row["course_id"], chapters)

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Giảng viên",
        user["id"],
        f"Cập nhật chương ({target['status']})",
        f"{row['code']} · {target['title']}",
        log_type="class",
        resource_type="chapter",
        resource_id=chapter_id,
    )
    return {"chapter": target}


@router.delete("/instructor/courses/{course_id}/chapters/{chapter_id}")
def delete_chapter(
    course_id: str,
    chapter_id: str,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Giảng viên xóa một chương khỏi học phần."""
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id, owner_user=user)
        target = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        chapters = [ch for ch in chapters if ch["id"] != chapter_id]
        _save_chapters(conn, row["course_id"], chapters)
        updated, _ = _load_course_or_404(conn, course_id)

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Giảng viên",
        user["id"],
        f"Xóa chương học: {target.get('title', chapter_id)}",
        f"{row['code']} · {course_id}",
        log_type="class",
        resource_type="chapter",
        resource_id=chapter_id,
    )
    return {"status": "deleted", "id": chapter_id, "course": _serialize_course(updated)}


@router.post("/instructor/courses/{course_id}/chapters/{chapter_id}/lessons", status_code=status.HTTP_201_CREATED)
def create_lesson(
    course_id: str,
    chapter_id: str,
    payload: LessonCreateIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Thêm bài giảng mới vào chương học."""
    new_lesson = {
        "id": f"lesson-{uid()[:8]}",
        "title": payload.title.strip(),
        "duration": payload.duration,
        "xp": 60,
        "status": "Bản nháp",
        "isGenerated": False,
        "documents": [],
        "content": {"reading": "", "videoScenes": [], "quizzes": []},
    }
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id, owner_user=user)
        target = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        target.setdefault("lessons", []).append(new_lesson)
        _save_chapters(conn, row["course_id"], chapters)
    return {"lesson": new_lesson}


@router.put("/instructor/courses/{course_id}/chapters/{chapter_id}/lessons/reorder")
def reorder_lessons(
    course_id: str,
    chapter_id: str,
    payload: LessonReorderIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Sắp xếp lại thứ tự các bài giảng trong chương."""
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id, owner_user=user)
        chapter = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not chapter:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        lessons = chapter.get("lessons", [])
        lesson_map = {ls["id"]: ls for ls in lessons}
        ordered = [lesson_map[lid] for lid in payload.lessonIds if lid in lesson_map]
        seen = {ls["id"] for ls in ordered}
        for ls in lessons:
            if ls["id"] not in seen:
                ordered.append(ls)
        chapter["lessons"] = ordered
        _save_chapters(conn, row["course_id"], chapters)
    return {"lessons": ordered}


@router.put("/instructor/courses/{course_id}/chapters/{chapter_id}/lessons/{lesson_id}")
def save_lesson_content(
    course_id: str,
    chapter_id: str,
    lesson_id: str,
    payload: LessonSaveIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Lưu nội dung bài giảng AIGC Studio (Reading, Video Script, Quiz) và cập nhật thống kê AIGC."""
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id, owner_user=user)
        chapter = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not chapter:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        lesson = next((ls for ls in chapter.get("lessons", []) if ls["id"] == lesson_id), None)
        if not lesson:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài học")

        if payload.title is not None:
            lesson["title"] = payload.title
        if payload.duration is not None:
            lesson["duration"] = payload.duration
        if payload.xp is not None:
            lesson["xp"] = payload.xp
        if payload.status is not None:
            lesson["status"] = payload.status
        if payload.isGenerated is not None:
            lesson["isGenerated"] = payload.isGenerated
        if payload.documents is not None:
            lesson["documents"] = payload.documents
        if payload.content is not None:
            lesson["content"] = payload.content

        lesson["isInstructorEdited"] = True
        lesson["instructorEditedAt"] = now_utc()
        lesson["instructorName"] = user.get("display_name") or user.get("name") or "Giảng viên Phụ trách"

        _save_chapters(conn, row["course_id"], chapters)
        if payload.isAigcGenerated:
            conn.execute(
                "UPDATE ai_service_units SET requests = requests + 1, input_tokens = input_tokens + 4200, output_tokens = output_tokens + 1850 WHERE id='svc-aigc'"
            )
    return {"lesson": lesson}


@router.delete("/instructor/courses/{course_id}/chapters/{chapter_id}/lessons/{lesson_id}")
def delete_lesson(
    course_id: str,
    chapter_id: str,
    lesson_id: str,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Xóa một bài giảng khỏi chương học."""
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id, owner_user=user)
        chapter = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not chapter:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        orig = chapter.get("lessons", [])
        target = next((ls for ls in orig if ls["id"] == lesson_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài học")
        chapter["lessons"] = [ls for ls in orig if ls["id"] != lesson_id]
        _save_chapters(conn, row["course_id"], chapters)

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Giảng viên",
        user["id"],
        f"Xóa bài giảng: {target.get('title', lesson_id)}",
        f"{row['code']} · {chapter['title']}",
        log_type="class",
        resource_type="lesson",
        resource_id=lesson_id,
    )
    return {"status": "deleted", "id": lesson_id}


@router.patch("/instructor/courses/{course_id}/chapters/{chapter_id}/assignments/{assignment_id}")
def update_assignment(
    course_id: str,
    chapter_id: str,
    assignment_id: str,
    payload: AssignmentUpdateIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Cập nhật thông tin Bài tập Lab Docker của chương."""
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id, owner_user=user)
        chapter = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not chapter:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        asg = next((a for a in chapter.get("assignments", []) if a["id"] == assignment_id), None)
        if not asg:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài tập thực hành")
        if payload.title is not None:
            asg["title"] = payload.title.strip()
        if payload.description is not None:
            asg["description"] = payload.description.strip()
        if payload.points is not None:
            asg["points"] = payload.points
        if payload.dockerImage is not None:
            asg["dockerImage"] = payload.dockerImage.strip()
        if payload.repoTemplate is not None:
            asg["repoTemplate"] = payload.repoTemplate.strip()
        if payload.isRequired is not None:
            asg["isRequired"] = payload.isRequired
        _save_chapters(conn, row["course_id"], chapters)

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Giảng viên",
        user["id"],
        f"Cập nhật Bài tập Docker: {asg.get('title', assignment_id)}",
        f"{row['code']} · {chapter['title']}",
        log_type="class",
        resource_type="assignment",
        resource_id=assignment_id,
    )
    return {"assignment": asg}


@router.post("/instructor/courses/{course_id}/chapters/{chapter_id}/test-cases", status_code=status.HTTP_201_CREATED)
def add_test_case(
    course_id: str,
    chapter_id: str,
    payload: DockerTestCaseIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Bổ sung Docker Test Case cho bài Lab của chương."""
    tc = {
        "id": payload.id or f"tc-{uid()[:8]}",
        "title": payload.title.strip(),
        "input": payload.input,
        "expectedOutput": payload.expectedOutput,
        "isEdgeCase": payload.isEdgeCase,
        "timeoutMs": payload.timeoutMs,
        "memoryLimitMb": payload.memoryLimitMb,
    }
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id, owner_user=user)
        chapter = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not chapter:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        assignments = chapter.setdefault("assignments", [])
        if not assignments:
            assignments.append(
                {
                    "id": f"lab-{uid()[:8]}",
                    "type": "code_lab",
                    "title": f"Docker Lab: {chapter['title']}",
                    "description": "Bài tập kiểm thử tự động trong sandbox Docker.",
                    "isRequired": True,
                    "points": 100,
                    "dockerImage": row["docker_image"],
                    "testCases": [],
                }
            )
        assignments[0].setdefault("testCases", []).append(tc)
        _save_chapters(conn, row["course_id"], chapters)

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Giảng viên",
        user["id"],
        f"Thêm Docker Test Case: {tc['title']}",
        f"{row['code']} · {chapter['title']}",
        log_type="class",
        resource_type="test_case",
        resource_id=tc["id"],
    )
    return {"testCase": tc, "assignment": assignments[0]}


@router.put("/instructor/courses/{course_id}/chapters/{chapter_id}/test-cases/{tc_id}")
def update_test_case(
    course_id: str,
    chapter_id: str,
    tc_id: str,
    payload: DockerTestCaseUpdateIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Cập nhật Docker Test Case (sửa tiêu đề, input/output, giới hạn hoặc bật/tắt Edge Case)."""
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id, owner_user=user)
        chapter = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not chapter:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        updated_tc = None
        for asg in chapter.get("assignments", []):
            for tc in asg.get("testCases", []):
                if tc.get("id") == tc_id:
                    if payload.title is not None:
                        tc["title"] = payload.title.strip()
                    if payload.input is not None:
                        tc["input"] = payload.input
                    if payload.expectedOutput is not None:
                        tc["expectedOutput"] = payload.expectedOutput
                    if payload.isEdgeCase is not None:
                        tc["isEdgeCase"] = payload.isEdgeCase
                    if payload.timeoutMs is not None:
                        tc["timeoutMs"] = payload.timeoutMs
                    if payload.memoryLimitMb is not None:
                        tc["memoryLimitMb"] = payload.memoryLimitMb
                    updated_tc = tc
                    break
            if updated_tc:
                break
        if not updated_tc:
            raise HTTPException(status_code=404, detail="Không tìm thấy Docker Test Case")
        _save_chapters(conn, row["course_id"], chapters)

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Giảng viên",
        user["id"],
        f"Cập nhật Docker Test Case: {updated_tc['title']}",
        f"{row['code']} · {chapter['title']}",
        log_type="class",
        resource_type="test_case",
        resource_id=tc_id,
    )
    return {"testCase": updated_tc}


@router.delete("/instructor/courses/{course_id}/chapters/{chapter_id}/test-cases/{tc_id}")
def delete_test_case(
    course_id: str,
    chapter_id: str,
    tc_id: str,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Xóa một Docker Test Case khỏi bài Lab của chương."""
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id, owner_user=user)
        chapter = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not chapter:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        removed = False
        for asg in chapter.get("assignments", []):
            orig = asg.get("testCases", [])
            filtered = [item for item in orig if item.get("id") != tc_id]
            if len(filtered) != len(orig):
                asg["testCases"] = filtered
                removed = True
        if not removed:
            raise HTTPException(status_code=404, detail="Không tìm thấy Docker Test Case")
        _save_chapters(conn, row["course_id"], chapters)
    return {"status": "deleted", "id": tc_id}


@router.put("/instructor/courses/{course_id}/chapters/{chapter_id}/mindmap")
def save_chapter_mindmap(
    course_id: str,
    chapter_id: str,
    payload: MindmapSaveIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Lưu cấu trúc Master Mindmap (Nodes + Edges) của chương vào SQLite."""
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id, owner_user=user)
        chapter = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not chapter:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        chapter["mindmapNodes"] = payload.mindmapNodes
        chapter["mindmapEdges"] = payload.mindmapEdges
        chapter["mindmapGenerated"] = payload.mindmapGenerated
        _save_chapters(conn, row["course_id"], chapters)

    record_audit_log(
        user.get("full_name") or user.get("display_name") or "Giảng viên",
        user["id"],
        f"Lưu Master Mindmap ({len(payload.mindmapNodes)} nodes)",
        f"{row['code']} · {chapter['title']}",
        log_type="class",
        resource_type="mindmap",
        resource_id=chapter_id,
    )
    return {
        "chapterId": chapter_id,
        "nodeCount": len(payload.mindmapNodes),
        "edgeCount": len(payload.mindmapEdges),
    }
