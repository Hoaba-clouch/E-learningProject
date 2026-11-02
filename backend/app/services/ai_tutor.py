from __future__ import annotations

import json

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
    unsafe_keywords = ["đáp án hoàn chỉnh", "complete solution", "write the code", "lời giải", "cho xin code", "giải hộ"]
    unsafe_request = any(word in message_lower for word in unsafe_keywords)
    
    if unsafe_request:
        policy = "refuse_answer"
        answer = "Mình không đưa lời giải hoàn chỉnh. Hãy nhìn ca chuỗi rỗng và xác định điều kiện cần đặt trước history.append(page)."
    else:
        policy = "question"
        answer = "Khi page là chuỗi rỗng, dòng nào vẫn làm thay đổi history? Hãy đối chiếu với source đã pin trước khi mở gợi ý."
        
    return policy, answer

def get_hint_text(level: int) -> str:
    """Trả về gợi ý tương ứng với level 1, 2 hoặc 3."""
    return HINTS.get(level, "Hãy đọc lại tài liệu chuẩn và kiểm tra điều kiện đầu vào.")
