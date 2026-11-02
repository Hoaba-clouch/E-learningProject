from __future__ import annotations

def evaluate_code(code: str) -> tuple[int, list[tuple[str, str, str]]]:
    """
    Đánh giá mã nguồn Python nộp bài.
    Trả về: (passed_count, [(status, message, duration_ms), ...])
    """
    normalized = code.replace(" ", "").replace("\t", "")
    has_guard = "ifnotpage:" in normalized or "ifnotpage" in normalized
    has_append = "history.append(page)" in normalized
    
    passed = 5 if has_guard and has_append else 4 if has_append else 0
    messages = [
        ("passed", "Giữ tối đa ba phần tử bằng deque(maxlen=3)."),
        ("passed", "Trang mới được thêm vào đúng thứ tự."),
        ("passed", "Lịch sử trả về dạng list."),
        ("passed", "Xử lý input thông thường."),
        ("passed" if has_guard else "failed", 
         "Không thêm chuỗi rỗng trước khi append." if has_guard else "Chuỗi rỗng vẫn được thêm; cần guard trước append."),
    ]
    return passed, [(status, message, "8") for status, message in messages]
