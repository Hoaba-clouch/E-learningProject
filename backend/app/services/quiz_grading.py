"""Server-owned quiz definitions, immutable attempts and grading helpers."""
from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from typing import Any


def public_course_chapters(value: str | list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    """Return independent student course content with quiz answer keys removed.

    Both supported curriculum shapes are covered. Keep source definitions intact
    for server grading; a student's overview must never mutate the answer key.
    """
    chapters = json.loads(value or "[]") if isinstance(value, str) else deepcopy(value or [])
    if not isinstance(chapters, list):
        return []
    private = {"correct", "answer", "correctindex", "explanation", "correctoption", "correct_option",
               "correctanswer", "answerindex", "iscorrect", "is_correct", "solution", "rationale"}

    def questions(items: Any) -> None:
        if not isinstance(items, list):
            return
        for question in items:
            if not isinstance(question, dict):
                continue
            for key in list(question):
                if key.casefold() in private:
                    question.pop(key)
            options = question.get("options") or []
            if isinstance(options, list):
                for option in options:
                    if isinstance(option, dict):
                        for key in list(option):
                            if key.casefold() in private:
                                option.pop(key)

    for chapter in chapters:
        if not isinstance(chapter, dict):
            continue
        for lesson in chapter.get("lessons") or []:
            if not isinstance(lesson, dict):
                continue
            questions(lesson.get("quizzes"))
            content = lesson.get("content")
            if isinstance(content, dict):
                questions(content.get("quizzes"))
    return chapters


def resolve_lesson(course: dict[str, Any], lesson_id: str) -> tuple[dict, dict, str]:
    chapters = json.loads(course.get("chapters_json") or "[]")
    for ci, chapter in enumerate(chapters, 1):
        for li, lesson in enumerate(chapter.get("lessons") or [], 1):
            if lesson_id in {str(lesson.get("id") or ""), f"{ci}.{li}"}:
                if chapter.get("status") == "Bản nháp" or lesson.get("status") == "Bản nháp":
                    raise ValueError("Bài học chưa được phát hành.")
                return chapter, lesson, f"{ci}.{li}"
    raise ValueError("Không tìm thấy bài học trong giáo trình đã phát hành.")


def quiz_questions(lesson: dict[str, Any]) -> list[dict[str, Any]]:
    raw = (lesson.get("content") or {}).get("quizzes") or lesson.get("quizzes") or []
    questions: list[dict[str, Any]] = []
    for i, q in enumerate(raw, 1):
        opts = q.get("options") or []
        options = [{"id": str(o.get("id") or chr(97 + j)) if isinstance(o, dict) else chr(97 + j),
                    "text": str(o.get("text") or "") if isinstance(o, dict) else str(o)}
                   for j, o in enumerate(opts)]
        correct = str(q.get("correct") or "").lower()
        if not correct and isinstance(q.get("correctIndex"), int) and 0 <= q["correctIndex"] < len(options):
            correct = options[q["correctIndex"]]["id"]
        if not correct and q.get("answer") is not None:
            correct = next((o["id"] for o in options if o["text"].strip().casefold() == str(q["answer"]).strip().casefold()), "")
        if len(options) < 2 or correct not in {o["id"] for o in options} or not (q.get("question") or q.get("q")):
            raise ValueError(f"Câu hỏi {i} chưa có cấu hình đáp án hợp lệ; vui lòng báo giảng viên.")
        questions.append({"id": f"q-{i}", "question": str(q.get("question") or q["q"]), "options": options,
                          "correct": correct, "explanation": str(q.get("explanation") or "Hãy đối chiếu đáp án với bài đọc và giải thích lại bằng lời của bạn."),
                          "topic": str(q.get("topic") or lesson.get("title") or "Kiến thức bài học")})
    return questions


def quiz_version(questions: list[dict]) -> str:
    return hashlib.sha256(json.dumps(questions, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def grade_answer(questions: list[dict], answers: dict[str, str], question_id: str, option_id: str) -> list[dict]:
    q = next((q for q in questions if q["id"] == question_id), None)
    if not q or option_id not in {o["id"] for o in q["options"]}:
        raise ValueError("Câu hỏi hoặc phương án trả lời không hợp lệ.")
    if question_id in answers and answers[question_id] != option_id:
        raise ValueError("Câu này đã được ghi nhận. Hãy bắt đầu lần luyện tập mới để làm lại.")
    answers[question_id] = option_id
    return [{"question_id": q["id"], "question": q["question"], "selected_option": answers[q["id"]],
             "correct_option": q["correct"], "is_correct": answers[q["id"]] == q["correct"],
             "explanation": q["explanation"], "topic": q["topic"]}
            for q in questions if q["id"] in answers]


def public_attempt(row: dict[str, Any]) -> dict[str, Any]:
    questions = json.loads(row["questions_json"])
    return {"id": row["id"], "subject_id": row["subject_id"], "lesson_id": row["lesson_id"],
            "chapter_id": row["chapter_id"], "status": row["status"], "score": row["score"], "total": row["total"],
            "passed": row["status"] == "submitted" and row["score"] * 100 >= row["total"] * 60,
            "questions": [{k: q[k] for k in ("id", "question", "options", "topic")} for q in questions],
            "results": json.loads(row["results_json"] or "[]")}
