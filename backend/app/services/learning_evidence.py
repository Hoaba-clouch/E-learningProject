"""Read-only, user-scoped learning evidence and deterministic study plans.

No client score, self-reported pass/fail, or historical simulated grade is evidence.
The service deliberately has no model/network/database connection side effects.
"""
from __future__ import annotations

import json
from typing import Any


class EvidenceScopeError(ValueError):
    pass


def _json(value: Any, default: Any) -> Any:
    try:
        parsed = json.loads(value) if isinstance(value, str) else value
        return parsed if isinstance(parsed, type(default)) else default
    except (TypeError, ValueError):
        return default


def _text(value: Any, limit: int = 500) -> str:
    return str(value or "").strip()[:limit]


def _number(value: Any, default: int = 0) -> int:
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return default


def _empty_plan() -> dict[str, Any]:
    return {
        "status": "no_verified_evidence",
        "summary": "Chưa có kết quả đã xác minh cho nội dung này; chưa thể kết luận điểm yếu.",
        "evidence": [], "actions": [],
        "progress": {"verification_note": "Chỉ dùng quiz đã chấm trên máy chủ, test thực chạy và nhận xét giảng viên."},
    }


def _lesson_code(chapter_no: int, lesson_no: int, lesson: dict[str, Any]) -> str:
    title = _text(lesson.get("title"))
    first = title.split(" ", 1)[0]
    return first if first.replace(".", "").isdigit() else f"{chapter_no}.{lesson_no}"


def _option_text(question: dict[str, Any], option_id: Any) -> str:
    for index, option in enumerate(question.get("options") or []):
        if isinstance(option, dict):
            if str(option.get("id")) == str(option_id):
                return _text(option.get("text"), 300)
        elif str(option_id) in (str(index), str(option)):
            return _text(option, 300)
    return _text(option_id, 300)


def _trusted_tests(row: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]] | None:
    evaluation = _json(row.get("evaluation_json"), {})
    if evaluation.get("execution_status") != "executed" or evaluation.get("runner") != "docker-python-v1":
        return None
    tests = [t for t in evaluation.get("test_cases", []) if isinstance(t, dict)]
    if not tests or any(t.get("status") not in ("passed", "failed", "error", "timeout") for t in tests):
        return None
    return evaluation, tests


def prepare_learning_evidence(
    conn: Any, user: dict[str, Any], requested: dict[str, Any] | None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Resolve location from course data; return only authoritative learning facts.

    Client location identifiers are selectors, never proof of having submitted.
    At most the current lesson and current exercise are read, for the signed-in user.
    """
    requested = requested or {}
    plan = _empty_plan()
    view = _text(requested.get("view_mode"), 20).lower() or "lecture"
    view = view if view in ("catalog", "lecture", "video", "quiz", "exercise", "mindmap") else "lecture"
    context: dict[str, Any] = {"view_mode": view, "quiz_submitted": False}
    subject = _text(requested.get("subject_id"), 64)
    if not subject:
        return context, plan
    course = conn.execute(
        "SELECT id, subject_id, code, name, chapters_json FROM courses WHERE subject_id=? OR id=? OR code=? LIMIT 1",
        (subject, subject, subject),
    ).fetchone()
    if not course:
        return context, plan
    if str(user.get("role") or "student").lower() == "student":
        section = conn.execute(
            "SELECT id FROM class_sections WHERE course_id=? AND status='active' LIMIT 1", (course["id"],),
        ).fetchone()
        if section and not conn.execute(
            """SELECT ce.id FROM class_enrollments ce JOIN class_sections cs ON cs.id=ce.section_id
               WHERE ce.student_id=? AND cs.course_id=? AND ce.status='active' AND cs.status='active' LIMIT 1""",
            (user["id"], course["id"]),
        ).fetchone():
            raise EvidenceScopeError("Bạn cần ghi danh học phần trước khi xem phân tích học tập.")
    subject = course["subject_id"]
    context.update(subject_id=subject, subject_code=course["code"], subject_name=course["name"])
    chapters = _json(course.get("chapters_json"), [])
    lesson_id = _text(requested.get("lesson_id"), 64)
    lesson_code = _text(requested.get("lesson_code"), 64)
    exercise_id = _text(requested.get("exercise_id"), 64)
    chapter_number = _number(requested.get("chapter_number"))
    chapter: dict[str, Any] = {}
    lesson: dict[str, Any] = {}
    exercise: dict[str, Any] = {}
    exercise_chapter_id = ""
    resolved_code = ""
    for ch_no, candidate in enumerate(chapters, 1):
        if not isinstance(candidate, dict):
            continue
        for l_no, candidate_lesson in enumerate(candidate.get("lessons") or [], 1):
            if not isinstance(candidate_lesson, dict):
                continue
            code = _lesson_code(ch_no, l_no, candidate_lesson)
            if (lesson_id and lesson_id == candidate_lesson.get("id")) or (not lesson_id and lesson_code and lesson_code in (code, candidate_lesson.get("id"))):
                chapter, lesson, chapter_number, resolved_code = candidate, candidate_lesson, ch_no, code
        for assignment in candidate.get("assignments") or []:
            if not isinstance(assignment, dict):
                continue
            if exercise_id and exercise_id == assignment.get("id"):
                exercise = assignment
                exercise_chapter_id = _text(candidate.get("id"), 64)
                if not chapter:
                    chapter, chapter_number = candidate, ch_no
        if not chapter and chapter_number == ch_no:
            chapter = candidate
    # Legacy workspace IDs map to a chapter assignment; only within the resolved course.
    if not exercise and chapter and exercise_id == f"ex-{subject}-{chapter_number}":
        exercise = next((a for a in chapter.get("assignments", []) if isinstance(a, dict)), {})
    if exercise and exercise_chapter_id and chapter.get("id") != exercise_chapter_id:
        exercise = {}
    if chapter:
        context.update(chapter_number=chapter_number, chapter_title=_text(chapter.get("title")))
    if lesson:
        content = lesson.get("content") if isinstance(lesson.get("content"), dict) else {}
        context.update(
            lesson_id=lesson["id"], lesson_code=resolved_code, lesson_title=_text(lesson.get("title")),
            lesson_summary=_text(content.get("reading"), 1000),
            lesson_takeaways=[_text(s.get("script"), 300) for s in content.get("videoScenes", []) if isinstance(s, dict)][:3],
        )
    if exercise:
        context.update(
            exercise_id=exercise_id, exercise_title=_text(exercise.get("title")),
            exercise_objective=_text(exercise.get("description"), 1000),
            exercise_problem=_text(exercise.get("description"), 1000),
            exercise_requirements=[_text(exercise.get("description"), 600)] if exercise.get("description") else [],
            exercise_test_cases=[_text(t.get("title"), 180) for t in exercise.get("testCases", []) if isinstance(t, dict)][:5],
        )
    target = {k: context[k] for k in ("subject_id", "lesson_id", "lesson_code", "chapter_number", "exercise_id") if k in context}
    review_target = {**target, "view_mode": "lecture"}
    if not lesson and chapter:
        first = next((l for l in chapter.get("lessons", []) if isinstance(l, dict)), {})
        if first:
            review_target.update(lesson_id=first["id"], lesson_code=_lesson_code(chapter_number, 1, first))

    def action(key: str, kind: str, label: str, instruction: str, destination: dict[str, Any] | None = None) -> None:
        plan["actions"].append({"id": key, "kind": kind, "label": label, "instruction": instruction, **({"target": destination} if destination else {})})

    quiz_active = False
    if lesson:
        attempts = conn.execute(
            """SELECT * FROM student_quiz_attempts WHERE user_id=? AND subject_id=? AND lesson_id=?
               ORDER BY created_at DESC, id DESC LIMIT 12""", (user["id"], subject, lesson["id"]),
        ).fetchall()
        latest = attempts[0] if attempts else None
        quiz_active = bool(latest and latest.get("status") == "in_progress")
        if view == "quiz":
            # Use the server attempt snapshot, including randomized options, when present.
            raw_questions = _json(latest.get("questions_json"), []) if latest else content.get("quizzes", [])
            questions = [q for q in raw_questions if isinstance(q, dict)]
            index = _number(requested.get("quiz_index"), 1)
            index = max(1, min(index, len(questions))) if questions else 1
            q = questions[index - 1] if questions else {}
            if isinstance(q, dict):
                context.update(quiz_index=index, quiz_total=len(questions), quiz_question=_text(q.get("question")),
                               quiz_options=[_text(o.get("text") if isinstance(o, dict) else o, 300) for o in q.get("options", [])])
            submitted = bool(latest and latest.get("status") == "submitted")
            context["quiz_submitted"] = submitted
            if submitted:
                result = next((r for r in _json(latest.get("results_json"), []) if isinstance(r, dict) and r.get("question_id") == q.get("id")), {})
                context["quiz_selected_option"] = _option_text(q, result.get("selected_option"))
                context["quiz_explanation"] = _text(result.get("explanation"), 800)
        submitted_attempts = [a for a in attempts if a.get("status") == "submitted" and _number(a.get("total")) > 0]
        if submitted_attempts and not quiz_active:
            current = submitted_attempts[0]
            previous = next((a for a in submitted_attempts[1:] if a.get("quiz_version") == current.get("quiz_version") and a.get("total") == current.get("total")), None)
            metric = {"latest_score": _number(current.get("score")), "latest_total": _number(current.get("total")), "comparable": bool(previous)}
            if previous:
                metric.update(previous_score=_number(previous.get("score")), previous_total=_number(previous.get("total")),
                              delta_percentage_points=round(100 * (metric["latest_score"] - _number(previous.get("score"))) / metric["latest_total"], 1))
            plan["progress"]["quiz"] = metric
            plan["evidence"].append({"kind": "quiz", "source_id": current["id"], "label": "Quiz đã chấm trên máy chủ", "detail": f"{metric['latest_score']}/{metric['latest_total']} câu đúng · {context.get('lesson_title', '')}"})
            wrong = [r for r in _json(current.get("results_json"), []) if isinstance(r, dict) and r.get("is_correct") is False]
            for n, result in enumerate(wrong[:2], 1):
                question = _text(result.get("question"), 300)
                topic = _text(result.get("topic"), 160) or context.get("lesson_title", "khái niệm của câu hỏi")
                explanation = _text(result.get("explanation"), 400)
                action(f"review-quiz-{n}", "review", f"Ôn lại: {topic}", f"Câu chưa đúng: {question}. Đọc lại phần liên quan và viết một ví dụ cùng một phản ví dụ." + (f" Ghi chú sau chấm: {explanation}" if explanation else ""), review_target)
            if wrong:
                action("quiz-understanding", "check_understanding", "Tự giải thích nguyên nhân sai", "Chọn một câu vừa sai, diễn giải bằng lời của bạn vì sao lựa chọn trước chưa phù hợp; đưa một tình huống làm kết quả thay đổi.")
            action("quiz-retest", "retest", "Làm lại quiz để đo tiến bộ", "Hoàn thành lượt quiz mới sau khi ôn. Chỉ so sánh điểm khi cùng phiên bản đề và cùng số câu; điểm tăng ở cùng đề chưa chứng minh khả năng ghi nhớ dài hạn.", {**target, "view_mode": "quiz"})
            if wrong:
                plan["status"] = "needs_practice"

    if exercise:
        runs = conn.execute(
            "SELECT * FROM sandbox_runs WHERE user_id=? AND exercise_id=? ORDER BY created_at DESC, id DESC LIMIT 12",
            (user["id"], exercise_id),
        ).fetchall()
        verified = [(r, value) for r in runs if (value := _trusted_tests(r)) is not None]
        if verified:
            run, (evaluation, tests) = verified[0]
            failures = [t for t in tests if t["status"] != "passed"]
            metric = {"passed": len(tests) - len(failures), "total": len(tests), "comparable": False}
            # Names/IDs form the test suite fingerprint; changed suites are not progress.
            fingerprint = evaluation.get("provenance", {}).get("test_suite_sha256")
            if len(verified) > 1:
                old_evaluation, old_tests = verified[1][1]
                if fingerprint and fingerprint == old_evaluation.get("provenance", {}).get("test_suite_sha256") and len(tests) == len(old_tests):
                    old_passed = sum(t["status"] == "passed" for t in old_tests)
                    metric.update(comparable=True, previous_passed=old_passed, previous_total=len(old_tests), delta_passed=metric["passed"] - old_passed)
            plan["progress"]["sandbox"] = metric
            plan["evidence"].append({"kind": "sandbox", "source_id": run["id"], "label": "Lần test thực chạy gần nhất", "detail": f"{metric['passed']}/{metric['total']} test đạt · {context['exercise_title']} · {_text(run.get('created_at'), 64)}"})
            for n, failed in enumerate(failures[:2], 1):
                name = _text(failed.get("name") or failed.get("title") or failed.get("id"), 220)
                trace = f" Đầu vào: {_text(failed.get('input'), 160)}. Kỳ vọng: {_text(failed.get('expected_output'), 160)}. Thực tế: {_text(failed.get('actual_output'), 160)}."
                reason = _text(failed.get("failure_reason"), 240)
                action(f"practice-test-{n}", "practice", f"Luyện test chưa đạt: {name}", f"Test thực chạy báo {failed['status']}: {name}.{trace}" + (f" Lý do từ runner: {reason}." if reason else "") + " Theo vết đầu vào này từng bước; sửa một nguyên nhân rồi chạy lại, không thay toàn bộ lời giải.", {**target, "view_mode": "exercise"})
            if failures:
                plan["status"] = "needs_practice"
            action("sandbox-retest", "retest", "Chạy lại test sau khi sửa", "Chạy bộ kiểm thử thật một lần nữa rồi mở lại phân tích. Chỉ kết quả execution_status=executed được dùng để đo số test tiến bộ.", {**target, "view_mode": "exercise"})
        elif runs:
            plan["progress"]["verification_note"] += " Lượt sandbox gần đây chưa có kết quả thực chạy; không suy ra đạt hay trượt."
        feedback = conn.execute(
            """SELECT id, instructor_feedback, status, graded_at FROM student_chapter_submissions
               WHERE user_id=? AND subject_id=? AND exercise_id=? ORDER BY submitted_at DESC, id DESC LIMIT 1""",
            (user["id"], subject, exercise_id),
        ).fetchone()
        if feedback and _text(feedback.get("instructor_feedback")):
            detail = _text(feedback.get("instructor_feedback"), 900)
            plan["evidence"].append({"kind": "instructor", "source_id": feedback["id"], "label": "Nhận xét giảng viên", "detail": detail})
            action("review-instructor", "practice", "Thực hiện góp ý giảng viên", f"Góp ý đã lưu: {detail}\nTách góp ý thành một thay đổi nhỏ, tự giải thích lý do rồi nộp bản sửa để giảng viên kiểm tra.", {**target, "view_mode": "exercise"})
            if feedback.get("status") == "revision_requested":
                plan["status"] = "needs_practice"

    if quiz_active and view == "quiz":
        # Even feedback on another exercise can accidentally expose the current quiz solution.
        plan = _empty_plan()
        plan.update(status="assessment_in_progress", summary="Quiz đang làm chưa nộp; chỉ hỗ trợ cách suy luận, chưa mở đáp án hay chẩn đoán từ lượt này.")
        action("finish-quiz", "check_understanding", "Tự kiểm tra cách suy luận", "Nêu giả thiết của câu hỏi và tự đối chiếu từng phương án; hoàn thành lượt quiz để nhận phân tích lỗi đã chấm.")
    elif plan["evidence"]:
        if plan["status"] != "needs_practice":
            plan["status"] = "on_track"
        plan["summary"] = "Ưu tiên các bước gắn với bằng chứng bên dưới; làm lại để kiểm tra thay đổi." if plan["status"] == "needs_practice" else "Đã có bằng chứng học tập; hãy tự giải thích và kiểm tra lại để củng cố."
    elif quiz_active:
        plan.update(status="assessment_in_progress", summary="Quiz của bài học chưa nộp; chưa mở phân tích đáp án từ các lượt trước.")
        action("finish-quiz", "check_understanding", "Tự kiểm tra cách suy luận", "Nêu giả thiết của câu hỏi và tự đối chiếu từng phương án; hoàn thành lượt quiz để nhận phân tích lỗi đã chấm.")
    elif lesson or exercise:
        if (view == "exercise" and exercise) or (lesson and content.get("quizzes")):
            action("collect-baseline", "retest", "Tạo kết quả ban đầu", "Hoàn thành quiz hoặc chạy test thật cho nội dung này. Nhận xét tự khai và điểm mô phỏng không được dùng để kết luận điểm yếu.", {**target, "view_mode": "exercise" if view == "exercise" and exercise else "quiz"})
        else:
            action("review-baseline", "review", "Đọc lại và ghi câu hỏi cụ thể", "Nội dung này chưa có bài kiểm tra đã xác minh. Đọc phần lý thuyết, nêu một điểm chưa rõ và một ví dụ tự tạo để trao đổi với gia sư.", review_target)
    return context, plan


def format_learning_plan(plan: dict[str, Any]) -> str:
    """A useful fallback that works without Gemini, with visible provenance."""
    lines = ["### Lộ trình từ kết quả đã xác minh", plan["summary"]]
    for item in plan.get("evidence", []):
        lines.append(f"- **{item['label']}:** {item['detail']}")
    for item in plan.get("actions", [])[:5]:
        lines.append(f"- **{item['label']}:** {item['instruction']}")
    for name, metric in plan.get("progress", {}).items():
        if name == "quiz" and metric.get("comparable"):
            lines.append(f"- **Đo lại quiz:** {metric['previous_score']}/{metric['previous_total']} → {metric['latest_score']}/{metric['latest_total']} ({metric['delta_percentage_points']:+g} điểm phần trăm, cùng phiên bản đề).")
        elif name == "sandbox" and metric.get("comparable"):
            lines.append(f"- **Đo lại test:** {metric['previous_passed']}/{metric['previous_total']} → {metric['passed']}/{metric['total']} ({metric['delta_passed']:+g} test, cùng bộ kiểm thử).")
    lines.append("> Câu hỏi gợi mở: Bạn sẽ thực hiện bước nào trước và dùng kết quả nào để tự kiểm tra?")
    return "\n".join(lines)
