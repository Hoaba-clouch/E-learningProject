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
    Nếu xin đáp án hoàn chỉnh -> từ chối (refuse_answer) theo đúng tinh thần Socratic.
    """
    message_lower = message.lower()
    unsafe_keywords = [
        "đáp án hoàn chỉnh",
        "complete solution",
        "write the code",
        "lời giải",
        "cho xin code",
        "cho code",
        "giải hộ",
        "viết code",
        "copy",
    ]
    unsafe_request = any(word in message_lower for word in unsafe_keywords)

    if unsafe_request:
        policy = "refuse_answer"
        answer = "Mình không đưa lời giải hoàn chỉnh. Hãy nhìn ca chuỗi rỗng và xác định điều kiện cần đặt trước history.append(page)."
    else:
        policy = "question"
        answer = "Khi page là chuỗi rỗng, dòng nào vẫn làm thay đổi history? Hãy đối chiếu với source đã pin trước khi mở gợi ý."

    return policy, answer


def ask_socratic_with_policy(
    message: str,
    code_context: str | None = None,
    strict_refuse: bool = True,
) -> dict[str, Any]:
    """Xử lý chat Socratic AI Tutor qua Google Gemini API và tự động fallback về Guardrail nội bộ."""
    lower = message.lower()
    policy, default_answer = analyze_user_prompt(message)
    code_snippet = (code_context or "").strip()[:2000]

    if policy == "refuse_answer" and strict_refuse:
        llm = generate_text(
            prompt=(
                f"Câu hỏi của sinh viên: {message.strip()}\n"
                + (f"Đoạn code hiện tại:\n```\n{code_snippet}\n```\n" if code_snippet else "")
                + "Hãy từ chối cho đáp án/code giải sẵn một cách lịch sự trong 1 câu, rồi đặt 1 câu hỏi gợi mở tư duy để tự tìm ra lỗi."
            ),
            system_instruction=(
                "Bạn là Gia sư lập trình Socratic CodeMind AI. "
                "Tuyệt đối KHÔNG viết code lời giải hoàn chỉnh hay sửa hộ toàn bộ hàm. "
                "Trả lời bằng tiếng Việt súc tích (tối đa 3 câu)."
            ),
            temperature=0.3,
            max_output_tokens=220,
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
                "input_tokens": llm.get("input_tokens", 0),
                "output_tokens": llm.get("output_tokens", 0),
            }

        return {
            "id": f"ai-{uid()[:8]}",
            "policy_decision": "refuse_answer",
            "assistant_message": (
                "[Socratic Guardrail]: Hệ thống không cung cấp mã nguồn giải sẵn để đảm bảo tư duy phản biện. "
                "Gợi ý sư phạm: Hãy nhìn vào Ca kiểm thử số 5 (Edge Case). Khi truyền vào chuỗi rỗng \"\" hoặc khoảng trắng, "
                "hàm visit() của bạn có đang gọi append() vào deque không?"
            ),
            "model_id": "local-socratic-guardrail",
            "input_tokens": 0,
            "output_tokens": 0,
        }

    # Câu hỏi học thuật bình thường -> Gọi Gemini Socratic Mentor
    llm = generate_text(
        prompt=(
            f"Câu hỏi / thắc mắc của học viên: {message.strip()}\n"
            + (f"Đoạn code học viên đang viết:\n```\n{code_snippet}\n```\n" if code_snippet else "")
        ),
        system_instruction=(
            "Bạn là Gia sư lập trình Socratic CodeMind AI bằng tiếng Việt. "
            "Giải thích ngắn gọn nguyên lý/nguyên nhân cốt lõi trong 2-3 câu rồi đặt 1-2 câu hỏi gợi mở để sinh viên tự sửa code. "
            "KHÔNG viết sẵn toàn bộ lời giải hoàn chỉnh."
        ),
        temperature=0.45,
        max_output_tokens=320,
    )
    if llm and llm.get("text"):
        return {
            "id": f"ai-{uid()[:8]}",
            "policy_decision": "question",
            "assistant_message": llm["text"],
            "model_id": llm["model"],
            "input_tokens": llm.get("input_tokens", 0),
            "output_tokens": llm.get("output_tokens", 0),
        }

    # Deterministic fallback nếu mất mạng hoặc hết quota
    if any(k in lower for k in ("test 5", "ca biên", "edge case", "rỗng")):
        msg = (
            "Trong bài toán Bounded Page Tracker, một trang hợp lệ phải có độ dài > 0 và không chỉ toàn khoảng trắng. "
            "Bạn cần đặt Guard Clause ở vị trí nào trong visit() để chặn dữ liệu rỗng trước khi đẩy vào deque?"
        )
    elif any(k in lower for k in ("deque", "maxlen", "fifo")):
        msg = (
            "Cấu trúc deque(maxlen=3) tự động pop phần tử cũ nhất với O(1), nhưng không tự lọc chuỗi rỗng. "
            "Bạn đã kiểm tra điều kiện đầu vào trước history.append(page) chưa?"
        )
    elif policy == "refuse_answer":
        msg = default_answer
    else:
        ctx_note = " Dựa trên đoạn code hiện tại, hãy chú ý luồng xử lý trước bước ghi dữ liệu." if code_context else ""
        msg = f"Khi kiểm tra phương thức visit(page), điều gì xảy ra nếu nhận chuỗi rỗng hoặc toàn dấu cách?{ctx_note}"

    return {
        "id": f"ai-{uid()[:8]}",
        "policy_decision": "question",
        "assistant_message": msg,
        "model_id": "local-socratic-fallback",
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
            "Hãy đưa ra đề xuất chuyên môn cụ thể (test cases biên Docker/Valgrind, câu hỏi phản biện hội đồng 1:1, rubric chấm kép hoặc phương án hỗ trợ lớp yếu) bằng tiếng Việt rõ ràng, gạch đầu dòng súc tích (tối đa 6 dòng)."
        ),
        temperature=0.4,
        max_output_tokens=420,
    )
    if llm and llm.get("text"):
        return {
            "reply": llm["text"],
            "model": llm["model"],
            "input_tokens": llm.get("input_tokens", 0),
            "output_tokens": llm.get("output_tokens", 0),
        }

    q = prompt.lower()
    if any(k in q for k in ("test", "edge", "ca kiểm thử", "docker", "valgrind")):
        fallback = (
            f"[{course_code} · Docker Test Suggestion]\n"
            "• Nên bổ sung ít nhất 2 Edge Case bắt buộc:\n"
            "  1) Kiểm tra rò rỉ bộ nhớ / tài nguyên bằng Valgrind (0 bytes leaked) hoặc đóng kết nối sau exception.\n"
            "  2) Stress test đầu vào biên (chuỗi rỗng, null pointer hoặc kích thước 10^5 trong < 500ms)."
        )
    elif any(k in q for k in ("phản biện", "vấn đáp", "3d", "hội đồng", "rubric")):
        fallback = (
            f"[{course_code} · 3D Defense Probe]\n"
            "• Câu hỏi xoáy sâu đề xuất cho Hội đồng AI:\n"
            "  1) 'Nếu bỏ cơ chế bảo vệ hiện tại, điều gì xảy ra tại runtime dưới tải cao?'\n"
            "  2) 'Giải thích trade-off về độ phức tạp thời gian & bộ nhớ trong commit mới nhất của em.'"
        )
    elif any(k in q for k in ("mindmap", "yếu", "sơ đồ", "khái niệm")):
        fallback = (
            f"[{course_code} · Master Mindmap Analysis]\n"
            "• Dữ liệu lớp cho thấy nhánh Edge Case & Quản lý bộ nhớ đang có tỷ lệ nắm vững < 55%. "
            "Đề xuất gắn thêm 1 mini-quiz trước bài Lab Docker và phát thông báo ôn tập nhánh yếu."
        )
    else:
        fallback = (
            f"[{course_code} · Instructor Co-Pilot]\n"
            f"Tôi đã ghi nhận yêu cầu: \"{prompt.strip()}\". "
            "Bạn có thể mở Tab Giáo trình & Test Cases để tạo bài giảng hoặc Tab Chấm CI/CD để đối chiếu biên bản Phản biện."
        )
    return {
        "reply": fallback,
        "model": "local-copilot-fallback",
        "input_tokens": 0,
        "output_tokens": 0,
    }
