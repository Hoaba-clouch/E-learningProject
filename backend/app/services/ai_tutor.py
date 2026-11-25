from __future__ import annotations

from typing import Any

from app.core.security import uid
from app.services.gemini_client import generate_text

HINTS = {
    1: "Khi page là chuỗi rỗng, dòng nào vẫn thay đổi history?",
    2: "maxlen chỉ giới hạn số phần tử. Điều kiện kiểm tra nên đặt trước history.append(page).",
    3: "Nếu page rỗng, trả lại history hiện tại; chỉ append khi đầu vào hợp lệ.",
}


def analyze_user_prompt(message: str) -> tuple[str, str]:
    """
    Phân tích yêu cầu sinh viên gửi cho AI Tutor.
    Nếu xin đáp án hoàn chỉnh -> từ chối (refuse_answer) theo đúng tinh thần Socratic,
    nhưng không chặn nhầm các câu hỏi xin gợi ý hay hỏi cách làm.
    """
    message_lower = message.lower()
    unsafe_keywords = [
        "đáp án hoàn chỉnh",
        "lời giải hoàn chỉnh",
        "complete solution",
        "write the full code",
        "full code",
        "code hoàn chỉnh",
        "cho xin code",
        "cho code",
        "giải hộ toàn bộ",
        "giải hộ bài",
        "viết hộ toàn bộ",
        "viết full",
        "cho xin đáp án",
        "cho đáp án",
        "cho xin lời giải",
        "cho lời giải",
        "copy paste",
        "làm hộ bài",
    ]
    unsafe_request = any(word in message_lower for word in unsafe_keywords)

    if unsafe_request:
        policy = "refuse_answer"
        answer = (
            "Mình không đưa code lời giải hoàn chỉnh để bạn giữ vững tư duy tự giải quyết vấn đề. "
            "Hãy cho biết bạn đang vướng ở bước nào để mình gợi ý từng nấc nhé."
        )
    else:
        policy = "question"
        answer = "Bạn đang vướng ở bước nào của yêu cầu hiện tại? Hãy nêu phần bạn chưa rõ để mình gợi ý sát ngay."

    return policy, answer


def _looks_like_real_code(code_context: str | None) -> bool:
    raw = (code_context or "").strip()
    if not raw:
        return False
    if raw.startswith("Môn ") and "\n" not in raw and len(raw) < 160:
        return False
    code_markers = ("{", "}", ";", "def ", "class ", "#include", "import ", "function ", "return ", "=>", "SELECT ", "std::")
    return "\n" in raw or any(m in raw for m in code_markers)


def _format_workspace_context(ctx: dict[str, Any] | None) -> str:
    if not ctx:
        return ""

    view_mode = str(ctx.get("view_mode") or "lecture").strip().lower()
    ch_num = ctx.get("chapter_number")
    lesson_code = str(ctx.get("lesson_code") or "").strip()
    view_labels = {
        "exercise": f"Bài tập Thực hành Chương {ch_num or ''}".strip(),
        "quiz": f"Kiểm tra Quiz (Câu {ctx.get('quiz_index') or '?'}/{ctx.get('quiz_total') or '?'})",
        "lecture": f"Bài giảng Lý thuyết {lesson_code}".strip(),
        "video": f"Video Bài giảng {lesson_code}".strip(),
        "mindmap": f"Sơ đồ Tư duy (Mindmap) Chương {ch_num or ''}".strip(),
        "catalog": "Danh mục Khóa học",
    }
    location_label = view_labels.get(view_mode, view_mode)

    lines: list[str] = ["=== NGỮ CẢNH HỌC TẬP HIỆN TẠI CỦA HỌC VIÊN ==="]
    lines.append(f"- VỊ TRÍ ĐANG MỞ: {location_label}")

    subj_code = str(ctx.get("subject_code") or "").strip()
    subj_name = str(ctx.get("subject_name") or "").strip()
    if subj_code or subj_name:
        lines.append(f"- Môn học: {subj_code} — {subj_name}".strip(" —"))
    if ch_num or ctx.get("chapter_title"):
        lines.append(f"- Chương {ch_num or ''}: {ctx.get('chapter_title') or ''}".strip())
    if lesson_code or ctx.get("lesson_title"):
        lines.append(f"- Bài học hiện tại: {lesson_code} {ctx.get('lesson_title') or ''}".strip())

    if view_mode == "exercise":
        lines.append("\n[TRỌNG TÂM HIỆN TẠI: BÀI TẬP THỰC HÀNH CHƯƠNG]")
        if ctx.get("exercise_title"):
            lang = str(ctx.get("exercise_language") or "").strip()
            lines.append(f"- Tên bài tập: {ctx['exercise_title']}" + (f" (Ngôn ngữ: {lang})" if lang else ""))
        if ctx.get("exercise_objective"):
            lines.append(f"- Mục tiêu: {ctx['exercise_objective']}")
        if ctx.get("exercise_problem"):
            lines.append(f"- Đề bài: {ctx['exercise_problem']}")
        reqs = [str(r).strip() for r in (ctx.get("exercise_requirements") or []) if str(r).strip()]
        if reqs:
            lines.append("- Yêu cầu bắt buộc:")
            for idx, r in enumerate(reqs[:6], start=1):
                lines.append(f"  {idx}. {r}")
        tcs = [str(t).strip() for t in (ctx.get("exercise_test_cases") or []) if str(t).strip()]
        if tcs:
            lines.append("- Test cases kiểm thử:")
            for tc in tcs[:5]:
                lines.append(f"  * {tc}")
        if ctx.get("exercise_submission_status"):
            lines.append(f"- Trạng thái nộp bài: {ctx['exercise_submission_status']}")
        hints = [str(h).strip() for h in (ctx.get("exercise_hints") or []) if str(h).strip()]
        if hints:
            lines.append("- Kho gợi ý nội bộ cho gia sư (CHỈ mở dần 1 nấc phù hợp với câu hỏi hiện tại, tuyệt đối không đổ hết ra cùng lúc):")
            for idx, h in enumerate(hints[:4], start=1):
                lines.append(f"  Nấc {idx}: {h}")
        takeaways = [str(t).strip() for t in (ctx.get("lesson_takeaways") or []) if str(t).strip()]
        if takeaways:
            lines.append("- Kiến thức liên quan từ bài học: " + " | ".join(takeaways[:3]))
    elif view_mode == "quiz":
        lines.append("\n[TRỌNG TÂM HIỆN TẠI: CÂU HỎI QUIZ]")
        if ctx.get("quiz_question"):
            lines.append(f"- Câu hỏi: {ctx['quiz_question']}")
        opts = [str(o).strip() for o in (ctx.get("quiz_options") or []) if str(o).strip()]
        if opts:
            lines.append("- Các lựa chọn:")
            for opt in opts[:6]:
                lines.append(f"  {opt}")
        if ctx.get("quiz_submitted"):
            if ctx.get("quiz_selected_option"):
                lines.append(f"- Học viên đã chọn: {ctx['quiz_selected_option']}")
            if ctx.get("quiz_explanation"):
                lines.append(f"- Giải thích chuẩn sau khi nộp: {ctx['quiz_explanation']}")
        else:
            lines.append(
                "- LƯU Ý QUAN TRỌNG: Học viên CHƯA nộp đáp án câu này — TUYỆT ĐỐI KHÔNG tiết lộ đáp án đúng (A/B/C/D), chỉ gợi ý cách phân tích để tự loại trừ!"
            )
    else:
        if ctx.get("lesson_summary"):
            lines.append(f"- Tóm tắt bài học: {str(ctx['lesson_summary'])[:500]}")
        takeaways = [str(t).strip() for t in (ctx.get("lesson_takeaways") or []) if str(t).strip()]
        if takeaways:
            lines.append("- Ý cốt lõi bài học:")
            for pt in takeaways[:4]:
                lines.append(f"  * {pt}")
        if ctx.get("lesson_code_snippet"):
            lines.append(f"- Code minh họa trong bài:\n```\n{str(ctx['lesson_code_snippet'])[:800]}\n```")
        if ctx.get("exercise_title"):
            ex_obj = f" — {ctx['exercise_objective']}" if ctx.get("exercise_objective") else ""
            lines.append(f"- Bài tập thực hành của chương này (nếu học viên hỏi tới): {ctx['exercise_title']}{ex_obj}")

    return "\n".join(lines)


def _build_contextual_fallback(
    message: str,
    ctx: dict[str, Any] | None,
    policy: str,
    hint_level: int | None = None,
) -> str:
    lower = message.lower()
    if not ctx:
        if any(k in lower for k in ("test 5", "ca biên", "edge case", "rỗng", "deque", "visit", "maxlen", "fifo", "page")):
            if policy == "refuse_answer":
                return (
                    "[Socratic Guardrail]: Hệ thống không cung cấp mã nguồn giải sẵn để đảm bảo tư duy phản biện.\n"
                    "- **Điểm cần kiểm tra:** Điều kiện lọc đầu vào trước khi đẩy `page` vào `deque(maxlen=3)`.\n"
                    "- **Ca biên lưu ý:** Chuỗi rỗng `\"\"` hoặc chuỗi chỉ chứa khoảng trắng.\n"
                    "> Câu hỏi gợi mở: Bạn nên đặt câu lệnh kiểm tra điều kiện ở trước hay sau bước `append()`?"
                )
            return (
                "### Gợi ý xử lý hàng đợi giới hạn phần tử\n"
                "- `deque(maxlen=3)` chỉ tự loại phần tử cũ nhất, **không tự lọc chuỗi rỗng**.\n"
                "> Câu hỏi gợi mở: Bạn cần đặt điều kiện kiểm tra đầu vào ở trước bước `append()` như thế nào?"
            )
        if policy == "refuse_answer":
            return (
                "[Socratic Guardrail]: Mình không cung cấp code lời giải hoàn chỉnh.\n"
                "- Hãy cho mình biết tên **bài tập** hoặc **đoạn logic** bạn đang viết.\n"
                "> Câu hỏi gợi mở: Bạn đang vướng ở bước xử lý nào để mình gợi ý từng nấc?"
            )
        return (
            "### Mình đã tiếp nhận câu hỏi\n"
            "- Bạn hãy nêu rõ phần đang vướng (**Lý thuyết**, **Quiz** hay **Bài tập chương**).\n"
            "> Câu hỏi gợi mở: Đoạn khái niệm hoặc test case nào đang làm bạn khựng lại?"
        )

    view_mode = str(ctx.get("view_mode") or "lecture").strip().lower()
    ex_title = str(ctx.get("exercise_title") or "").strip()
    ex_reqs = [str(r).strip() for r in (ctx.get("exercise_requirements") or []) if str(r).strip()]
    ex_hints = [str(h).strip() for h in (ctx.get("exercise_hints") or []) if str(h).strip()]
    quiz_q = str(ctx.get("quiz_question") or "").strip()
    lesson_title = str(ctx.get("lesson_title") or "").strip()
    takeaways = [str(t).strip() for t in (ctx.get("lesson_takeaways") or []) if str(t).strip()]

    asking_exercise = view_mode == "exercise" or any(
        k in lower for k in ("bài tập", "exercise", "đề bài", "yêu cầu", "test case", "bắt đầu", "gợi ý", "hướng dẫn", "làm sao")
    )

    if policy == "refuse_answer":
        hint_line = ""
        if ex_hints:
            idx = min(max((hint_level or 1) - 1, 0), len(ex_hints) - 1)
            hint_line = f"\n- **Gợi ý Nấc {idx + 1}** cho **{ex_title or 'bài tập hiện tại'}**: {ex_hints[idx]}"
        elif ex_reqs:
            hint_line = f"\n- **Gợi ý khởi đầu** cho **{ex_title or 'bài tập hiện tại'}**: Bắt đầu từ yêu cầu `{ex_reqs[0]}`."
        elif takeaways:
            hint_line = f"\n- **Gợi ý trọng tâm:** Bám sát nguyên lý `{takeaways[0]}`."
        return (
            "[Socratic Guardrail]: Mình không đưa code lời giải hoàn chỉnh để bạn tự làm chủ tư duy."
            f"{hint_line}\n"
            "> Câu hỏi gợi mở: Theo gợi ý trên, bước kiểm tra đầu tiên bạn sẽ viết là gì?"
        )

    if asking_exercise and (ex_title or ex_reqs or ex_hints):
        lvl = hint_level or 1
        chosen_hint = ex_hints[min(lvl - 1, len(ex_hints) - 1)] if ex_hints else (ex_reqs[0] if ex_reqs else str(ctx.get("exercise_objective") or ""))
        req_note = f"\n- **Yêu cầu đầu tiên cần giải quyết:** `{ex_reqs[0]}`" if ex_reqs else ""
        return (
            f"### Hướng dẫn Socratic · {ex_title or 'Bài tập Thực hành'}\n"
            f"- **Gợi ý Nấc {lvl}:** {chosen_hint}{req_note}\n"
            "> Câu hỏi gợi mở: Bạn thử phác thảo hướng cài đặt rồi gửi lại ý tưởng hoặc lỗi gặp phải nhé!"
        )

    if view_mode == "quiz" and quiz_q:
        focus = takeaways[0] if takeaways else (lesson_title or "nguyên lý cốt lõi của bài học")
        return (
            "### Gợi ý phân tích Quiz\n"
            f"- **Câu hỏi hiện tại:** {quiz_q}\n"
            f"- **Trục đối chiếu:** Kiểm tra từng phương án dựa trên nguyên lý **{focus}** và loại trừ đáp án gây phụ thuộc cứng.\n"
            "> Câu hỏi gợi mở: Bạn đang phân vân giữa 2 phương án nào nhất?"
        )

    takeaway_line = f"\n- **Ý cốt lõi:** {takeaways[0]}" if takeaways else ""
    return (
        f"### Trọng tâm · {lesson_title or 'Bài học hiện tại'}"
        f"{takeaway_line}\n"
        "- Bạn có thể hỏi sâu về cơ chế chạy, ví dụ minh họa hoặc lỗi thường gặp.\n"
        "> Câu hỏi gợi mở: Bạn muốn mình phân tích kỹ hơn cơ chế nào trong phần này?"
    )


def ask_socratic_with_policy(
    message: str,
    code_context: str | None = None,
    strict_refuse: bool = True,
    workspace_context: dict[str, Any] | None = None,
    history: list[dict[str, str]] | None = None,
    hint_level: int | None = None,
) -> dict[str, Any]:
    """Xử lý chat Socratic AI Tutor qua Google Gemini API với đầy đủ ngữ cảnh & lịch sử hội thoại."""
    policy, _ = analyze_user_prompt(message)
    code_snippet = (code_context or "").strip()[:2000] if _looks_like_real_code(code_context) else ""
    ctx_block = _format_workspace_context(workspace_context)
    view_mode = (workspace_context or {}).get("view_mode")

    hint_instruction = (
        f"\n- Nấc gợi ý yêu cầu hiện tại: Nấc {hint_level}/3 "
        "(Nấc 1: định hướng tư duy & bước đầu tiên; Nấc 2: chỉ rõ phương thức/cấu trúc/edge case cần xử lý; "
        "Nấc 3: vạch rõ dàn ý từng bước hoặc pseudocode ngắn gọn — không viết sẵn code lời giải hoàn chỉnh)."
        if hint_level
        else ""
    )

    if policy == "refuse_answer" and strict_refuse:
        prompt_parts = []
        if ctx_block:
            prompt_parts.append(ctx_block)
        if code_snippet:
            prompt_parts.append(f"Đoạn code hiện tại của học viên:\n```\n{code_snippet}\n```")
        prompt_parts.append(
            f"Câu hỏi của học viên (xin lời giải/đáp án): {message.strip()}\n"
            "Hãy từ chối đưa code giải sẵn hoàn chỉnh một cách lịch sự trong 1 câu, "
            "sau đó đưa ngay 1 gạch đầu dòng gợi ý cụ thể bám sát đúng bài tập/câu hỏi hiện tại + kết bằng '> Câu hỏi gợi mở: ...'."
        )
        llm = generate_text(
            prompt="\n\n".join(prompt_parts),
            system_instruction=(
                "Bạn là Gia sư lập trình Socratic CodeMind AI bằng tiếng Việt. "
                "TUYỆT ĐỐI KHÔNG viết code lời giải hoàn chỉnh hay sửa hộ toàn bộ hàm. "
                "KHÔNG chào hỏi mở bài lại ('Chào bạn, mình là...') và KHÔNG giảng lại định nghĩa chung chung của bài học. "
                "Phải bám sát đúng NGỮ CẢNH HỌC TẬP HIỆN TẠI, trình bày gọn bằng Markdown (`**từ khóa**`, `` `hàm/biến` ``, gạch đầu dòng `- `, và kết bằng `> Câu hỏi gợi mở: ...`)."
            ),
            temperature=0.3,
            max_output_tokens=550,
            history=history,
        )
        if llm and llm.get("text"):
            reply_txt = llm["text"]
            if "[Socratic Guardrail]" not in reply_txt:
                reply_txt = f"[Socratic Guardrail]: {reply_txt}"
            return {
                "id": f"ai-{uid()[:8]}",
                "policy_decision": "refuse_answer",
                "assistant_message": reply_txt,
                "model_id": llm["model"],
                "context_view": view_mode,
                "input_tokens": llm.get("input_tokens", 0),
                "output_tokens": llm.get("output_tokens", 0),
            }

        return {
            "id": f"ai-{uid()[:8]}",
            "policy_decision": "refuse_answer",
            "assistant_message": _build_contextual_fallback(message, workspace_context, "refuse_answer", hint_level),
            "model_id": "local-socratic-guardrail",
            "context_view": view_mode,
            "input_tokens": 0,
            "output_tokens": 0,
        }

    # Câu hỏi học thuật bình thường -> Gọi Gemini Socratic Mentor với ngữ cảnh sống + lịch sử chat
    prompt_parts = []
    if ctx_block:
        prompt_parts.append(ctx_block)
    if code_snippet:
        prompt_parts.append(f"Đoạn code học viên đang viết:\n```\n{code_snippet}\n```")
    prompt_parts.append(f"Câu hỏi hiện tại của học viên: {message.strip()}{hint_instruction}")

    llm = generate_text(
        prompt="\n\n".join(prompt_parts),
        system_instruction=(
            "Bạn là Gia sư lập trình Socratic CodeMind AI hỗ trợ học viên bằng tiếng Việt.\n"
            "QUY TẮC BẮT BUỘC:\n"
            "1. Trả lời TRỰC DIỆN vào câu hỏi hiện tại của học viên. KHÔNG chào hỏi mở bài lặp lại ('Chào bạn, mình là...'), KHÔNG tóm tắt hay giảng lại toàn bộ tên bài học trừ khi học viên yêu cầu giải thích bài học.\n"
            "2. Luôn nhận thức rõ VỊ TRÍ ĐANG MỞ trong phần NGỮ CẢNH HỌC TẬP HIỆN TẠI (đặc biệt khi học viên đang ở Bài tập Thực hành Chương hoặc Quiz — phải gọi đúng tên bài tập/yêu cầu/câu quiz đang mở).\n"
            "3. Nếu học viên xin gợi ý, hướng dẫn làm bài, hỏi bước tiếp theo hoặc hỏi đang ở đâu: chỉ rõ bài/phần đang làm rồi đưa ngay 1-3 gạch đầu dòng gợi ý Socratic CỤ THỂ, có tính hành động theo đúng nấc gợi ý, và kết bằng 1 câu hỏi gợi mở.\n"
            "4. TUYỆT ĐỐI KHÔNG viết sẵn trọn bộ code lời giải để copy-paste; nếu đang ở Quiz chưa nộp thì không tiết lộ đáp án đúng A/B/C/D.\n"
            "5. Định dạng trả lời rõ ràng bằng Markdown gọn mắt: dùng `### Tiêu đề ngắn` khi tách ý, `**in đậm**` cho khái niệm trọng tâm, `` `tên hàm/lệnh` `` cho mã nguồn ngắn, `- ` hoặc `1. ` cho các bước/ý chính, và kết thúc gợi ý bằng dòng `> Câu hỏi gợi mở: ...`.\n"
            "6. Văn phong tự nhiên, súc tích, không rườm rà."
        ),
        temperature=0.4,
        max_output_tokens=950,
        history=history,
    )
    if llm and llm.get("text"):
        return {
            "id": f"ai-{uid()[:8]}",
            "policy_decision": "question",
            "assistant_message": llm["text"],
            "model_id": llm["model"],
            "context_view": view_mode,
            "input_tokens": llm.get("input_tokens", 0),
            "output_tokens": llm.get("output_tokens", 0),
        }

    # Deterministic contextual fallback nếu mất mạng hoặc hết quota
    return {
        "id": f"ai-{uid()[:8]}",
        "policy_decision": "question",
        "assistant_message": _build_contextual_fallback(message, workspace_context, policy, hint_level),
        "model_id": "local-socratic-fallback",
        "context_view": view_mode,
        "input_tokens": 0,
        "output_tokens": 0,
    }


def get_hint_text(level: int) -> str:
    """Trả về gợi ý tương ứng với level 1, 2 hoặc 3."""
    return HINTS.get(level, "Hãy đọc lại tài liệu chuẩn và kiểm tra điều kiện đầu vào.")


def generate_copilot_suggestion(
    prompt: str,
    course_code: str = "CS201",
    course_name: str = "",
) -> dict[str, Any]:
    """Sinh gợi ý trợ giảng AI Co-Pilot cho Giảng viên qua Gemini và fallback nội bộ."""
    course_desc = f"{course_code} ({course_name})" if course_name else course_code
    llm = generate_text(
        prompt=(
            f"Học phần giảng dạy: {course_desc}\n"
            f"Yêu cầu của Giảng viên: {prompt.strip()}"
        ),
        system_instruction=(
            "Bạn là Trợ giảng AI Co-Pilot dành cho Giảng viên Kỹ thuật Phần mềm trên hệ thống CodeMind AI. "
            "Hãy đưa ra đề xuất chuyên môn cụ thể (test cases biên Docker/Valgrind, câu hỏi phản biện hội đồng 1:1, rubric chấm kép hoặc phương án hỗ trợ lớp yếu) bằng tiếng Việt rõ ràng, súc tích (3–5 ý hoàn chỉnh).\n"
            "ĐỊNH DẠNG BẮT BUỘC: Mở đầu bằng `### Tiêu đề ngắn`, mỗi ý CHỈ dùng một kiểu đánh dấu đầu dòng (`1. ` hoặc `- `, tuyệt đối KHÔNG ghép `- 1.`), bôi đậm `**điểm nhấn/chỉ số**`, bọc `` `Docker/Valgrind/code` `` bằng backtick, và kết thúc trọn vẹn bằng 1 dòng `> Gợi ý triển khai: ...`."
        ),
        temperature=0.4,
        max_output_tokens=1000,
    )
    if llm and llm.get("text"):
        return {
            "reply": llm["reply"] if "reply" in llm else llm["text"],
            "model": llm["model"],
            "input_tokens": llm.get("input_tokens", 0),
            "output_tokens": llm.get("output_tokens", 0),
        }

    q = prompt.lower()
    if any(k in q for k in ("test", "edge", "ca kiểm thử", "docker", "valgrind")):
        fallback = (
            f"[{course_code} · Docker Test Suggestion]\n"
            "### Đề xuất 2 Edge Cases bắt buộc\n"
            "1. **Kiểm tra bộ nhớ với `Valgrind`**: Đảm bảo `0 bytes leaked` và đóng mọi resource khi ném exception.\n"
            "2. **Stress test đầu vào biên**: Xử lý an toàn `\"\"`, `nullptr` và tập `10^5` phần tử trong `< 500ms`.\n"
            "> Gợi ý triển khai: Gắn ngay hai test này vào bộ chấm CI tự động ở tab *Giáo trình & Test Cases*."
        )
    elif any(k in q for k in ("phản biện", "vấn đáp", "3d", "hội đồng", "rubric")):
        fallback = (
            f"[{course_code} · 3D Defense Probe]\n"
            "### Bộ câu hỏi xoáy sâu Hội đồng AI 3D\n"
            "1. *\"Nếu bỏ cơ chế kiểm tra biên hiện tại, điều gì xảy ra tại runtime dưới tải cao?\"*\n"
            "2. *\"Giải thích trade-off về độ phức tạp thời gian & bộ nhớ trong commit mới nhất của em.\"*\n"
            "> Gợi ý triển khai: Đặt trọng số **40%** cho khả năng giải thích nguyên nhân gốc."
        )
    elif any(k in q for k in ("mindmap", "yếu", "sơ đồ", "khái niệm", "quiz")):
        fallback = (
            f"[{course_code} · Master Mindmap Analysis]\n"
            "### Điểm yếu cần gia cố (< 55%)\n"
            "- Nhánh **Edge Case & Quản lý bộ nhớ** đang có tỷ lệ nắm vững dưới ngưỡng đạt.\n"
            "1. Bổ sung **2 câu Quiz bẫy** về `virtual destructor` và `Object Slicing` trước giờ Lab.\n"
            "→ Hành động: Gửi nhắc nhở ôn tập kèm hint Nấc 1 cho nhóm sinh viên có tiến độ chậm.\n"
            "> Gợi ý triển khai: Mở tab *Sơ đồ & Nhánh yếu* để phát bài luyện tập 5 phút."
        )
    else:
        fallback = (
            f"[{course_code} · Instructor Co-Pilot]\n"
            "### Tổng hợp yêu cầu Co-Pilot\n"
            f"- Đã ghi nhận: **\"{prompt.strip()}\"**\n"
            "- Mở tab **Giáo trình & Test Cases** để soạn bài Lab/Quiz hoặc tab **Chấm CI/CD** để đối chiếu biên bản phản biện.\n"
            "> Gợi ý triển khai: Bạn có thể chọn nhanh một mẫu tác vụ bên dưới để tôi sinh đề chi tiết hơn."
        )
    return {
        "reply": fallback,
        "model": "local-copilot-fallback",
        "input_tokens": 0,
        "output_tokens": 0,
    }
