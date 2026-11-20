"""Các MCP Prompts (Templates tương tác) cho CodeMind Learning OS.

Giúp các AI Agents (Antigravity, Claude, Cursor) ngay lập tức kích hoạt các kịch bản
phản biện, tổng hợp Sprint, hoặc review code tiêu chuẩn công nghiệp.
"""

from __future__ import annotations

from typing import Any
from app.mcp.protocol import McpDispatcher


def register_all_prompts(dispatcher: McpDispatcher) -> None:
    """Đăng ký toàn bộ Prompt Templates."""

    # 1. kanban_sprint_summary
    def handle_sprint_summary_prompt(args: dict[str, Any]) -> dict[str, Any]:
        project_name = args.get("project_name", "Dự án hiện tại")
        sprint_name = args.get("sprint_name", "Sprint hiện tại")
        return {
            "description": f"Báo cáo tổng kết tiến độ cho {project_name} - {sprint_name}",
            "messages": [
                {
                    "role": "user",
                    "content": {
                        "type": "text",
                        "text": (
                            f"Hãy phân tích và viết báo cáo tổng kết Sprint cho dự án '{project_name}' ({sprint_name}).\n"
                            "1. Gọi MCP tool 'get_project_detail' hoặc 'list_kanban_tasks' để lấy dữ liệu thực tế từ MySQL.\n"
                            "2. Tổng hợp số task hoàn thành (cột 'done' / 'verified') so với tổng task.\n"
                            "3. Liệt kê các task còn nghẽn (ở cột 'in-progress' hoặc 'review') và kiểm tra xem có task nào vi phạm Ràng buộc H2 không.\n"
                            "4. Đưa ra 3 khuyến nghị hành động cho nhóm trong Sprint tiếp theo."
                        ),
                    },
                }
            ],
        }

    dispatcher.register_prompt(
        name="kanban_sprint_summary",
        description="Prompt tổng hợp tiến độ Sprint, phân tích tỉ lệ hoàn thành và nhận diện các task nghẽn hoặc vi phạm ràng buộc H2.",
        arguments=[
            {"name": "project_name", "description": "Tên hoặc mã đồ án", "required": True},
            {"name": "sprint_name", "description": "Tên Sprint cần tổng hợp", "required": False},
        ],
        handler=handle_sprint_summary_prompt,
    )

    # 2. ai_code_defense_prep
    def handle_ai_defense_prep_prompt(args: dict[str, Any]) -> dict[str, Any]:
        student_name = args.get("student_name", "Sinh viên")
        topic = args.get("topic", "Kiến trúc hệ thống")
        return {
            "description": f"Kịch bản phản biện đồ án cho sinh viên {student_name}",
            "messages": [
                {
                    "role": "user",
                    "content": {
                        "type": "text",
                        "text": (
                            f"Bạn là Hội đồng Phản biện AI CodeMind (AI Defense Council). "
                            f"Hãy chuẩn bị bộ câu hỏi phản biện chuyên sâu cho sinh viên '{student_name}' về chủ đề '{topic}'.\n"
                            "1. Dùng tool 'list_git_commits' và 'list_pull_requests' để lấy các commit và PR thực tế của sinh viên.\n"
                            "2. Đặt 3 câu hỏi xoay quanh: (a) Tính hợp lý của kiến trúc dữ liệu, (b) Độ phức tạp thuật toán và quản lý bộ nhớ, (c) Xử lý tình huống edge case / race condition trong production.\n"
                            "3. Dùng tool 'submit_ai_defense_audit' để ghi nhận đánh giá khi hoàn thành buổi phản biện."
                        ),
                    },
                }
            ],
        }

    dispatcher.register_prompt(
        name="ai_code_defense_prep",
        description="Prompt chuẩn bị kịch bản phản biện đồ án kỹ thuật 3 vòng (Kiến trúc, Thuật toán, Production).",
        arguments=[
            {"name": "student_name", "description": "Tên sinh viên", "required": True},
            {"name": "topic", "description": "Chủ đề đồ án", "required": True},
        ],
        handler=handle_ai_defense_prep_prompt,
    )
