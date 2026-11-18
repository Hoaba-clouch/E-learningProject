from __future__ import annotations

from typing import Any
from app.core.security import uid

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
    """Xử lý chat Socratic AI Tutor tuân thủ Guardrail của Quản trị viên."""
    lower = message.lower()
    policy, default_answer = analyze_user_prompt(message)

    if policy == "refuse_answer" and strict_refuse:
        return {
            "id": f"ai-{uid()[:8]}",
            "policy_decision": "refuse_answer",
            "assistant_message": (
                "[Socratic Guardrail]: Hệ thống không cung cấp mã nguồn giải sẵn để đảm bảo tư duy phản biện. "
                "Gợi ý sư phạm: Hãy nhìn vào Ca kiểm thử số 5 (Edge Case). Khi truyền vào chuỗi rỗng \"\" hoặc khoảng trắng, "
                "hàm visit() của bạn có đang gọi append() vào deque không?"
            ),
        }

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
    }


def get_hint_text(level: int) -> str:
    """Trả về gợi ý tương ứng với level 1, 2 hoặc 3."""
    return HINTS.get(level, "Hãy đọc lại tài liệu chuẩn và kiểm tra điều kiện đầu vào.")


def generate_copilot_suggestion(prompt: str, course_code: str = "CS201") -> str:
    """Sinh gợi ý trợ giảng AI Co-Pilot cho Giảng viên theo ngữ cảnh học phần."""
    q = prompt.lower()
    if any(k in q for k in ("test", "edge", "ca kiểm thử", "docker", "valgrind")):
        return (
            f"[{course_code} · Docker Test Suggestion]\n"
            "• Nên bổ sung ít nhất 2 Edge Case bắt buộc:\n"
            "  1) Kiểm tra rò rỉ bộ nhớ / tài nguyên bằng Valgrind (0 bytes leaked) hoặc đóng kết nối sau exception.\n"
            "  2) Stress test đầu vào biên (chuỗi rỗng, null pointer hoặc kích thước 10^5 trong < 500ms)."
        )
    if any(k in q for k in ("phản biện", "vấn đáp", "3d", "hội đồng", "rubric")):
        return (
            f"[{course_code} · 3D Defense Probe]\n"
            "• Câu hỏi xoáy sâu đề xuất cho Hội đồng AI:\n"
            "  1) 'Nếu bỏ cơ chế bảo vệ hiện tại, điều gì xảy ra tại runtime dưới tải cao?'\n"
            "  2) 'Giải thích trade-off về độ phức tạp thời gian & bộ nhớ trong commit mới nhất của em.'"
        )
    if any(k in q for k in ("mindmap", "yếu", "sơ đồ", "khái niệm")):
        return (
            f"[{course_code} · Master Mindmap Analysis]\n"
            "• Dữ liệu lớp cho thấy nhánh Edge Case & Quản lý bộ nhớ đang có tỷ lệ nắm vững < 55%. "
            "Đề xuất gắn thêm 1 mini-quiz trước bài Lab Docker và phát thông báo ôn tập nhánh yếu."
        )
    return (
        f"[{course_code} · Instructor Co-Pilot]\n"
        f"Tôi đã ghi nhận yêu cầu: \"{prompt.strip()}\". "
        "Bạn có thể mở Tab Giáo trình & Test Cases để tạo bài giảng AIGC hoặc Tab Chấm CI/CD để đối chiếu biên bản Phản biện 3D."
    )
