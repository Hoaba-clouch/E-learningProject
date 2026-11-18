from __future__ import annotations

import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import current_user, record_audit_log, require_instructor
from app.core.database import db
from app.core.security import uid
from app.core.timezone import now_utc
from app.schemas.courses import (
    ChapterCreateIn,
    ChapterPatchIn,
    DockerTestCaseIn,
    LessonCreateIn,
    LessonSaveIn,
    MindmapSaveIn,
)

router = APIRouter(tags=["Courses & Syllabus"])


def _serialize_course(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "subjectId": row["subject_id"],
        "code": row["code"],
        "name": row["name"],
        "semester": row["semester"],
        "teacher": row["teacher_name"],
        "studentCount": row["student_count"],
        "avgProgressPct": row["avg_progress_pct"],
        "pendingDualReviews": row["pending_dual_reviews"],
        "health": row["health"],
        "room": row["room"],
        "dockerImage": row["docker_image"],
        "sandboxEnabled": bool(row["sandbox_enabled"]),
        "aiDefenseEnabled": bool(row["ai_defense_enabled"]),
        "chapters": json.loads(row["chapters_json"] or "[]"),
    }


def _load_course_or_404(conn: Any, course_id: str) -> tuple[Any, list[dict[str, Any]]]:
    row = conn.execute("SELECT * FROM courses WHERE id=?", (course_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy học phần")
    return row, json.loads(row["chapters_json"] or "[]")


def _save_chapters(conn: Any, course_id: str, chapters: list[dict[str, Any]]) -> None:
    conn.execute(
        "UPDATE courses SET chapters_json=?, updated_at=? WHERE id=?",
        (json.dumps(chapters, ensure_ascii=False), now_utc(), course_id),
    )


@router.get("/courses")
def list_courses(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lấy danh sách toàn bộ học phần CNTT (giáo trình, Docker test cases, Master Mindmap)."""
    with db() as conn:
        rows = conn.execute("SELECT * FROM courses ORDER BY code ASC").fetchall()
    return {"courses": [_serialize_course(r) for r in rows]}


@router.get("/courses/{course_id}")
def get_course(course_id: str, _: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    """Lấy chi tiết 1 học phần theo ID."""
    with db() as conn:
        row, _ = _load_course_or_404(conn, course_id)
    return {"course": _serialize_course(row)}


@router.post("/instructor/courses/{course_id}/chapters", status_code=status.HTTP_201_CREATED)
def create_chapter(
    course_id: str,
    payload: ChapterCreateIn,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Giảng viên thêm chương mới vào học phần (tự tạo sẵn Lab Docker mặc định)."""
    new_chapter_id = f"ch-{uid()[:8]}"
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
                "dockerImage": "codemind/cpp20-sandbox:latest",
                "testCases": [],
            }
        ],
    }
    with db() as conn:
        row, chapters = _load_course_or_404(conn, course_id)
        chapters.append(new_chapter)
        _save_chapters(conn, course_id, chapters)
        updated = conn.execute("SELECT * FROM courses WHERE id=?", (course_id,)).fetchone()

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
        row, chapters = _load_course_or_404(conn, course_id)
        target = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        if payload.title is not None:
            target["title"] = payload.title.strip()
        if payload.status is not None:
            target["status"] = payload.status
        _save_chapters(conn, course_id, chapters)

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
        "status": "Bản nháp",
        "isGenerated": False,
        "documents": [],
        "content": {"reading": "", "videoScenes": [], "quizzes": []},
    }
    with db() as conn:
        _, chapters = _load_course_or_404(conn, course_id)
        target = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        target.setdefault("lessons", []).append(new_lesson)
        _save_chapters(conn, course_id, chapters)
    return {"lesson": new_lesson}


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
        _, chapters = _load_course_or_404(conn, course_id)
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

        _save_chapters(conn, course_id, chapters)
        if payload.isGenerated:
            conn.execute(
                "UPDATE ai_service_units SET requests = requests + 1, input_tokens = input_tokens + 4200, output_tokens = output_tokens + 1850 WHERE id='svc-aigc'"
            )
    return {"lesson": lesson}


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
        row, chapters = _load_course_or_404(conn, course_id)
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
        _save_chapters(conn, course_id, chapters)

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


@router.delete("/instructor/courses/{course_id}/chapters/{chapter_id}/test-cases/{tc_id}")
def delete_test_case(
    course_id: str,
    chapter_id: str,
    tc_id: str,
    user: dict[str, Any] = Depends(require_instructor),
) -> dict[str, Any]:
    """Xóa một Docker Test Case khỏi bài Lab của chương."""
    with db() as conn:
        _, chapters = _load_course_or_404(conn, course_id)
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
        _save_chapters(conn, course_id, chapters)
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
        row, chapters = _load_course_or_404(conn, course_id)
        chapter = next((ch for ch in chapters if ch["id"] == chapter_id), None)
        if not chapter:
            raise HTTPException(status_code=404, detail="Không tìm thấy chương học")
        chapter["mindmapNodes"] = payload.mindmapNodes
        chapter["mindmapEdges"] = payload.mindmapEdges
        chapter["mindmapGenerated"] = payload.mindmapGenerated
        _save_chapters(conn, course_id, chapters)

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
