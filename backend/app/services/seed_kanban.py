from __future__ import annotations

import json
import sqlite3
from typing import Any

from app.core.timezone import now_utc


def _default_dod(is_done: bool = False) -> list[dict[str, Any]]:
    return [
        {"id": "dod-1", "text": "Code vượt qua 100% test cases trong Docker sandbox độc lập", "done": is_done},
        {"id": "dod-2", "text": "Tuân thủ Kiến trúc 3 tầng (Router -> Service -> Data Layer)", "done": is_done},
        {"id": "dod-3", "text": "Không có lỗi Type/Lint, timestamp chuẩn ISO-8601 UTC (H4)", "done": is_done},
        {"id": "dod-4", "text": "Được ít nhất 1 thành viên review và giải phóng Ràng buộc H2", "done": is_done},
    ]


MEMBERS_META: dict[str, dict[str, Any]] = {
    "bhoa": {"id": "m1", "name": "Nguyễn Bá Hòa", "avatar": "H", "initials": "BH", "role": "Leader & Architect", "color": "bg-[#14161a] dark:bg-slate-700", "bg": "#C7D2FE", "textColor": "#312E81"},
    "vhuy": {"id": "m2", "name": "Võ Nhật Huy", "avatar": "H", "initials": "VH", "role": "Frontend & AI Dev", "color": "bg-amber-500", "bg": "#FCD34D", "textColor": "#78350F"},
    "dnghi": {"id": "m3", "name": "Phan Đình Nghị", "avatar": "N", "initials": "PN", "role": "Backend & Database", "color": "bg-slate-600 dark:bg-slate-500", "bg": "#FED7AA", "textColor": "#7C2D12"},
    "tuan": {"id": "e1", "name": "Trần Minh Tuấn", "avatar": "T", "initials": "TT", "role": "Backend Lead", "color": "bg-amber-600", "bg": "#A7F3D0", "textColor": "#064E3B"},
    "ha": {"id": "e2", "name": "Lê Thị Hà", "avatar": "H", "initials": "LH", "role": "DevOps & Cloud", "color": "bg-slate-700 dark:bg-slate-600", "bg": "#E9D5FF", "textColor": "#581C87"},
    "nam": {"id": "a1", "name": "Hoàng Trọng Nam", "avatar": "N", "initials": "HN", "role": "AI Research Lead", "color": "bg-[#14161a] dark:bg-slate-700", "bg": "#CCFBF1", "textColor": "#115E59"},
    "linh": {"id": "a2", "name": "Đỗ Mỹ Linh", "avatar": "L", "initials": "ML", "role": "Data Scientist", "color": "bg-amber-500", "bg": "#FFE4E6", "textColor": "#9F1239"},
    "vana": {"id": "usr-sv-02", "name": "Nguyễn Văn A", "email": "hasib@gmail.com", "avatar": "A", "initials": "NA", "role": "Thành viên Frontend", "color": "bg-emerald-600", "bg": "#D1FAE5", "textColor": "#065F46"},
}


def _team(*keys: str) -> list[dict[str, Any]]:
    return [dict(MEMBERS_META[k]) for k in keys if k in MEMBERS_META]


def _build_seed_projects() -> list[dict[str, Any]]:
    return [
        {
            "id": "prj-codemind",
            "code": "PRJ-CODEMIND",
            "name": "CodeMind AI - Hệ thống gia sư lập trình",
            "client": "Khóa luận Tốt nghiệp · Đề tài Cấp Khoa",
            "course": "CS499 · Đồ án Tốt nghiệp Kỹ sư Enterprise",
            "course_id": "class-capstone",
            "instructor_id": "usr-gv-01",
            "instructor_name": "Cô Trần Thị B",
            "instructor_label": "Cô Trần Thị B (GV Hướng dẫn)",
            "leader_user_id": "usr-sv-01",
            "sprint": "Sprint 1 (Tuần 1 - 4)",
            "kind": "AI / AGENT SYSTEM",
            "status": "active",
            "fav": 1,
            "due_date": "28/11/2026",
            "due_text": "in 9 days",
            "story_points_budget": 1200,
            "color_hex": "#f29b23",
            "tl_start": 7.2,
            "tl_width": 35.5,
            "tl_color": "amber",
            "team": _team("bhoa", "vhuy", "dnghi"),
        },
        {
            "id": "prj-ecommerce",
            "code": "PRJ-ECOM",
            "name": "Hệ thống Microservices Thương mại điện tử",
            "client": "SE-402 · Kiến trúc Phần mềm Nâng cao",
            "course": "CS315 · Hệ thống Phân tán, Kafka & Redis",
            "course_id": "class-distributed",
            "instructor_id": "usr-gv-02",
            "instructor_name": "Thầy Nguyễn Phước",
            "instructor_label": "Thầy Nguyễn Phước (GV Hướng dẫn)",
            "leader_user_id": "usr-sv-08",
            "sprint": "Sprint 2 (Tuần 3 - 6)",
            "kind": "MICROSERVICES & CLOUD",
            "status": "active",
            "fav": 1,
            "due_date": "15/12/2026",
            "due_text": "in 14 days",
            "story_points_budget": 950,
            "color_hex": "#3b82f6",
            "tl_start": 11.4,
            "tl_width": 40.6,
            "tl_color": "amber",
            "team": _team("tuan", "ha", "bhoa"),
        },
        {
            "id": "prj-medai",
            "code": "PRJ-MEDAI",
            "name": "MedAI - Phân loại ảnh X-quang phổi & RAG",
            "client": "AI-301 · Thị giác Máy tính & Học sâu",
            "course": "CS420 · AI-Native Web App & RAG Agents",
            "course_id": "class-ai",
            "instructor_id": "usr-gv-04",
            "instructor_name": "TS. Lê Hoàng Mai",
            "instructor_label": "TS. Lê Hoàng Mai (GV Hướng dẫn)",
            "leader_user_id": "a1",
            "sprint": "Sprint 1 (Tuần 1 - 3)",
            "kind": "AI / COMPUTER VISION",
            "status": "active",
            "fav": 0,
            "due_date": "05/01/2027",
            "due_text": "in 21 days",
            "story_points_budget": 850,
            "color_hex": "#8b5cf6",
            "tl_start": 18.0,
            "tl_width": 42.0,
            "tl_color": "amber",
            "team": _team("nam", "linh", "bhoa"),
        },
        {
            "id": "prj-compiler",
            "code": "PRJ-CPP-AST",
            "name": "Trình biên dịch Mini C++ với AST Visualizer",
            "client": "CS-308 · Nguyên lý Trình biên dịch",
            "course": "CS201 · Lập trình Hướng đối tượng & Cấu trúc Dữ liệu",
            "course_id": "class-oop",
            "instructor_id": "usr-gv-01",
            "instructor_name": "Cô Trần Thị B",
            "instructor_label": "Cô Trần Thị B (GV Hướng dẫn)",
            "leader_user_id": "usr-sv-04",
            "sprint": "Sprint Final (Tuần 8 - 10)",
            "kind": "COMPILER",
            "status": "delivered",
            "fav": 1,
            "due_date": "20/12/2026",
            "due_text": "Delivered",
            "story_points_budget": 750,
            "color_hex": "#10b981",
            "tl_start": 5.0,
            "tl_width": 48.0,
            "tl_color": "done",
            "team": _team("dnghi", "bhoa", "vana"),
        },
        {
            "id": "prj-pintos",
            "code": "PRJ-PINTOS",
            "name": "Mô phỏng Hệ điều hành PintOS: Virtual Memory & Threads",
            "client": "CS-204 · Hệ điều hành & Kernel C++",
            "course": "CS205 · Kiến trúc Máy tính, HĐH & Mạng TCP/IP",
            "course_id": "class-network",
            "instructor_id": "usr-gv-03",
            "instructor_name": "Thầy Trần Minh Quân",
            "instructor_label": "Thầy Trần Minh Quân (GV Hướng dẫn)",
            "leader_user_id": "usr-sv-03",
            "sprint": "Sprint 3 (Tuần 5 - 8)",
            "kind": "OPERATING SYSTEM",
            "status": "delivered",
            "fav": 0,
            "due_date": "10/12/2026",
            "due_text": "Delivered",
            "story_points_budget": 800,
            "color_hex": "#10b981",
            "tl_start": 3.0,
            "tl_width": 45.0,
            "tl_color": "done",
            "team": _team("vhuy", "dnghi"),
        },
        {
            "id": "prj-security",
            "code": "PRJ-SEC-DAST",
            "name": "Công cụ DAST Quét Lỗ hổng Web Tự động (OWASP Top 10)",
            "client": "SEC-305 · An toàn & An ninh Mạng Máy tính",
            "course": "CS312 · An toàn Thông tin & OWASP Top 10",
            "course_id": "class-security",
            "instructor_id": "usr-gv-05",
            "instructor_name": "Thầy Đặng Quốc Bảo",
            "instructor_label": "Thầy Đặng Quốc Bảo (GV Hướng dẫn)",
            "leader_user_id": "usr-sv-01",
            "sprint": "Sprint 2 (Tuần 4 - 6)",
            "kind": "CYBERSECURITY",
            "status": "review",
            "fav": 0,
            "due_date": "12/12/2026",
            "due_text": "in 3 days",
            "story_points_budget": 720,
            "color_hex": "#ef4444",
            "tl_start": 25.0,
            "tl_width": 35.0,
            "tl_color": "amber",
            "team": _team("bhoa", "dnghi"),
        },
        {
            "id": "prj-faceattend",
            "code": "PRJ-FACEATTEND",
            "name": "FaceAttend AI - Điểm danh Khuôn mặt Edge AI trên Pi 4",
            "client": "CS-315 · Ứng dụng Di động & IoT Thông minh",
            "course": "CS410 · Trí tuệ Nhân tạo & Machine Learning",
            "course_id": "class-ai-ml",
            "instructor_id": "usr-gv-04",
            "instructor_name": "TS. Lê Hoàng Mai",
            "instructor_label": "TS. Lê Hoàng Mai (GV Hướng dẫn)",
            "leader_user_id": "usr-sv-03",
            "sprint": "Sprint 2 (Tuần 3 - 5)",
            "kind": "EDGE AI & IOT",
            "status": "planning",
            "fav": 0,
            "due_date": "22/12/2026",
            "due_text": "in 28 days",
            "story_points_budget": 650,
            "color_hex": "#f59e0b",
            "tl_start": 35.0,
            "tl_width": 42.0,
            "tl_color": "amber",
            "team": _team("vhuy", "bhoa"),
        },
        {
            "id": "prj-devnet",
            "code": "PRJ-DEVNET",
            "name": "DevNet - Mạng Xã hội Chia sẻ Code Snippet & Fork Tree",
            "client": "SE-210 · Đồ án Phát triển Ứng dụng Web",
            "course": "CS210 · Lập trình Web Frontend Hiện đại (React 19)",
            "course_id": "class-fe",
            "instructor_id": "usr-gv-01",
            "instructor_name": "Cô Trần Thị B",
            "instructor_label": "Cô Trần Thị B (GV Hướng dẫn)",
            "leader_user_id": "usr-sv-03",
            "sprint": "Sprint 1 (Tuần 1 - 4)",
            "kind": "WEB PLATFORM",
            "status": "planning",
            "fav": 0,
            "due_date": "29/12/2026",
            "due_text": "in 35 days",
            "story_points_budget": 580,
            "color_hex": "#06b6d4",
            "tl_start": 42.0,
            "tl_width": 38.0,
            "tl_color": "amber",
            "team": _team("vhuy", "dnghi"),
        },
    ]


def _task(
    tid: str,
    project_id: str,
    code: str,
    title: str,
    desc: str,
    col: str,
    prio: str,
    moscow: str,
    pts: int,
    assignee: dict[str, str],
    est: float,
    due: str,
    epic: str,
    epic_color: str,
    *,
    depends_on: str | None = None,
    checklist: list[dict[str, Any]] | None = None,
    dod: list[dict[str, Any]] | None = None,
    user_story: dict[str, str] | None = None,
    acceptance: str | None = None,
    deliverable: dict[str, Any] | None = None,
    sub_req: str | None = None,
    sub_url: str | None = None,
    is_bonus: bool = False,
    comments: int = 0,
    attachments: int = 0,
    audit_logs: list[dict[str, str]] | None = None,
    pos: int = 0,
) -> dict[str, Any]:
    return {
        "id": tid,
        "project_id": project_id,
        "code": code,
        "title": title,
        "description": desc,
        "column_id": col,
        "priority": prio,
        "moscow": moscow,
        "points": pts,
        "assignee": assignee,
        "estimate_hours": est,
        "due_date": due,
        "epic": epic,
        "epic_color": epic_color,
        "depends_on": depends_on,
        "checklist": checklist if checklist is not None else [],
        "dod": dod if dod is not None else _default_dod(col in ("done", "verified")),
        "user_story": user_story,
        "acceptance_criteria": acceptance,
        "deliverable": deliverable,
        "submission_requirement": sub_req,
        "submission_url": sub_url,
        "is_bonus": 1 if is_bonus else 0,
        "comments_count": comments,
        "attachments_count": attachments,
        "audit_logs": audit_logs if audit_logs is not None else [],
        "position_order": pos,
    }


def _build_seed_tasks() -> list[dict[str, Any]]:
    a_hoa = {"name": "Nguyễn Bá Hòa", "avatar": "H", "role": "Leader & Architect"}
    a_huy = {"name": "Võ Nhật Huy", "avatar": "H", "role": "Frontend & AI Dev"}
    a_nghi = {"name": "Phan Đình Nghị", "avatar": "N", "role": "Backend & Database"}
    a_tuan = {"name": "Trần Minh Tuấn", "avatar": "T", "role": "Backend Lead"}
    a_ha = {"name": "Lê Thị Hà", "avatar": "H", "role": "DevOps & Cloud"}
    a_nam = {"name": "Hoàng Trọng Nam", "avatar": "N", "role": "AI Research Lead"}
    a_linh = {"name": "Đỗ Mỹ Linh", "avatar": "L", "role": "Data Scientist"}

    tasks: list[dict[str, Any]] = [
        # ── 1. PRJ-CODEMIND (14 tasks) ──
        _task(
            "task-1", "prj-codemind", "TE9CA72",
            "Khảo sát thực trạng đào tạo lập trình & Đặc tả SRS 12 Ca sử dụng",
            "Khảo sát các hạn chế của LMS truyền thống. Đặc tả chi tiết 12 Use Cases cho 4 phân hệ cốt lõi: Code Lab, AI Socratic, AI Defense Room, Git Project Hub kèm chuẩn phi chức năng Latency < 500ms, ISO-8601 UTC.",
            "done", "high", "must", 5, a_hoa, 6, "05/11/2026", "SRS & Specs", "bg-blue-50 text-blue-700 border-blue-200",
            sub_req="Link", sub_url="https://github.com/nguyen0605/E-learning-Project",
            audit_logs=[
                {"user": "Nguyễn Bá Hòa", "fromColumn": "Backlog", "toColumn": "Cần làm", "timestamp": "05/11/2026 09:12"},
                {"user": "Nguyễn Bá Hòa", "fromColumn": "Cần làm", "toColumn": "Đang làm", "timestamp": "05/11/2026 09:12"},
                {"user": "Nguyễn Bá Hòa", "fromColumn": "Đang làm", "toColumn": "Hoàn thành", "timestamp": "05/11/2026 09:13"},
            ],
            user_story={"role": "Trưởng nhóm & Sinh viên", "want": "đặc tả chi tiết 12 ca sử dụng và các ràng buộc phi chức năng", "benefit": "định hình rõ phạm vi 4 phân hệ của đề tài CodeMind Campus"},
            acceptance="Given yêu cầu khởi động đề tài Nhóm 4\nWhen lập tài liệu đặc tả SRS\nThen hoàn thành 12 Use Cases và nộp link GitHub minh chứng hợp lệ",
            checklist=[
                {"id": "c1", "text": "Khảo sát các hạn chế của LMS truyền thống", "done": True},
                {"id": "c2", "text": "Đặc tả 12 Use Cases và kiến trúc 3 tầng", "done": True},
                {"id": "c3", "text": "Nộp link repo GitHub minh chứng lên hệ thống", "done": True},
            ],
            deliverable={"type": "commit", "label": "commit #TE9CA72"}, comments=4, attachments=2, pos=0,
        ),
        _task(
            "task-2", "prj-codemind", "TE14F82",
            "Thiết kế CSDL quan hệ chuẩn hóa 3NF & ERD 8 bảng",
            "Xác định khóa chính PK, khóa ngoại FK, loại bỏ toàn bộ phụ thuộc bắc cầu, bắt buộc timestamp UTC (H4) theo yêu cầu Hội đồng Phản biện.",
            "ready", "high", "must", 5, a_nghi, 6, "06/11/2026", "Database", "bg-purple-50 text-purple-700 border-purple-200",
            sub_req="File",
            user_story={"role": "Database Engineer", "want": "sơ đồ ERD 8 bảng thực thể chuẩn 3NF", "benefit": "dữ liệu không bị dị thường khi thêm, xóa, sửa và chuẩn hóa khóa ngoại"},
            acceptance="Given yêu cầu nghiệp vụ lưu trữ khóa học\nWhen thiết kế CSDL\nThen schema đạt chuẩn 3NF và timestamp dùng UTC",
            checklist=[
                {"id": "c1", "text": "Vẽ sơ đồ ERD 8 thực thể chính", "done": True},
                {"id": "c2", "text": "Thiết kế khóa ngoại ON DELETE CASCADE", "done": True},
                {"id": "c3", "text": "Xuất file ERD chất lượng cao", "done": False},
            ],
            deliverable={"type": "commit", "label": "docs/ERD_8_Tables.png"}, comments=2, attachments=1, pos=1,
        ),
        _task(
            "task-3", "prj-codemind", "TE22C19",
            "Xây dựng Module Authentication JWT & Phân quyền RBAC",
            "Đăng ký, đăng nhập, băm mật khẩu bcrypt, cấp Access Token và Refresh Token cho 3 vai trò: Student, Instructor, Admin.",
            "in-progress", "high", "must", 5, a_huy, 4, "07/11/2026", "Security & Auth", "bg-indigo-50 text-indigo-700 border-indigo-200",
            sub_req="Link",
            user_story={"role": "Backend Developer", "want": "cơ chế xác thực JWT và bảo mật mật khẩu bcrypt", "benefit": "bảo vệ API và phân định ranh giới quyền giữa sinh viên và giảng viên"},
            acceptance="Given người dùng đăng nhập\nWhen thông tin hợp lệ\nThen cấp JWT token chuẩn và lưu mã băm bcrypt",
            checklist=[
                {"id": "c1", "text": "Băm password với bcrypt 12 rounds", "done": True},
                {"id": "c2", "text": "Dependency get_current_user", "done": True},
                {"id": "c3", "text": "Viết unit test pytest cho auth router", "done": False},
            ],
            deliverable={"type": "pr", "label": "PR #07: JWT & RBAC"}, comments=6, attachments=3, pos=2,
        ),
        _task(
            "task-4", "prj-codemind", "TE35D77",
            "Nghiên cứu & Xây dựng Docker Image Sandbox cô lập (H2)",
            "Tạo Dockerfile Alpine Linux siêu nhẹ, chạy non-root user, cgroups RAM 128MB, 0.5 CPU và Watchdog 2.0s chống vô tận.",
            "in-progress", "high", "must", 5, a_hoa, 2, "11/11/2026", "Code Sandbox", "bg-amber-50 text-amber-700 border-amber-200",
            depends_on="task-1", sub_req="Link hoặc file", is_bonus=True,
            user_story={"role": "Sinh viên lập trình", "want": "thực thi code C++ và Python trong môi trường container cô lập", "benefit": "đánh giá kết quả chính xác trong < 2.0s mà không gây rủi ro cho server"},
            acceptance="Given mã nguồn nộp lên từ trình duyệt\nWhen đưa vào Docker Sandbox\nThen container thực thi an toàn với RAM <= 128MB và trả về kết quả đúng",
            checklist=[
                {"id": "c1", "text": "Thiết lập môi trường isolated sandbox", "done": True},
                {"id": "c2", "text": "Cấu hình --read-only rootfs và tmpfs 16MB", "done": True},
                {"id": "c3", "text": "Bắt timeout 2000ms TLE", "done": False},
            ],
            comments=3, attachments=1, pos=3,
        ),
        _task(
            "task-5", "prj-codemind", "TE41E89",
            "Socratic AI Tutor Hint Ladder (Thang gợi ý 3 nấc)",
            "Tuyệt đối không đưa đáp án; hướng dẫn mở dần Hint 1 -> Hint 2 -> Hint 3 và ký số băm SHA-256 khi tự sửa lỗi thành công.",
            "ready", "high", "must", 5, a_huy, 4.5, "09/11/2026", "AI Socratic", "bg-rose-50 text-rose-700 border-rose-200",
            depends_on="task-4", sub_req="Link",
            user_story={"role": "Sinh viên gặp lỗi thuật toán", "want": "nhận gợi ý Socratic theo thang 3 nấc sư phạm", "benefit": "tự hiểu nguyên lý để sửa code thay vì bị AI mớm đáp án hoàn chỉnh"},
            acceptance="Given sinh viên chưa vượt qua test case\nWhen yêu cầu trợ giúp từ AI Tutor\nThen hệ thống mở khóa tuần tự Hint 1 -> Hint 2 -> Hint 3 và khóa không lộ giải",
            checklist=[
                {"id": "c1", "text": "Cấu hình System Prompt Người Thầy Khắc Kỷ", "done": True},
                {"id": "c2", "text": "Ràng buộc mở khóa tuần tự (Sequence lock)", "done": True},
                {"id": "c3", "text": "Tạo SHA-256 evidence bằng chứng tự sửa", "done": True},
            ],
            deliverable={"type": "test", "label": "Smoke test: 14/14 Passed"}, comments=5, attachments=2, pos=4,
        ),
        _task(
            "task-6", "prj-codemind", "TE49A12",
            "Mô hình Giả lập Hội đồng Phản biện AI (AI Defense Room)",
            "Mô phỏng phòng bảo vệ tốt nghiệp thời gian thực với 3 Persona Giảng viên AI: Thầy Kiến trúc, Cô Giải thuật, Thư ký chấm điểm.",
            "backlog", "medium", "should", 8, a_nghi, 6, "10/11/2026", "Defense Room", "bg-teal-50 text-teal-700 border-teal-200",
            depends_on="task-5", sub_req="Link hoặc file", is_bonus=True,
            user_story={"role": "Sinh viên bảo vệ đồ án", "want": "luyện tập chất vấn với Hội đồng phản biện AI", "benefit": "rèn luyện phản xạ kỹ thuật và phát hiện trước lỗ hổng bảo mật/kiến trúc"},
            acceptance="Given đồ án đã hoàn thành các module cốt lõi\nWhen sinh viên bắt đầu phiên bảo vệ\nThen AI chất vấn xoay quanh Docker sandbox, 3NF và thuật toán Anti-Freerider",
            checklist=[
                {"id": "c1", "text": "Thu thập danh mục 20 câu hỏi Hội đồng Phản biện hay hỏi", "done": False},
                {"id": "c2", "text": "Tích hợp prompt Socratic phản biện", "done": False},
            ],
            comments=1, attachments=0, pos=5,
        ),
        _task(
            "task-7", "prj-codemind", "TE54B33",
            "Thuật toán Đo lường Đóng góp Thực tế Anti-Freerider",
            "Công thức minh bạch: Tỷ trọng Story Points hoàn thành (50%) + Tỷ trọng Commit/PR hợp lệ (30%) + Tiêu chuẩn DoD (20%).",
            "backlog", "medium", "should", 5, a_nghi, 4, "10/11/2026", "Team Analytics", "bg-cyan-50 text-cyan-700 border-cyan-200",
            depends_on="task-3", sub_req="File",
            user_story={"role": "Giảng viên chấm điểm đồ án", "want": "thuật toán tự động phân tích tỷ lệ đóng góp thực tế của từng thành viên", "benefit": "chấm điểm công bằng, phát hiện hiện tượng ỷ lại hoặc gánh team"},
            acceptance="Given nhóm sinh viên thực hiện đồ án\nWhen đến kỳ đánh giá tiến độ\nThen hệ thống tính toán % dựa trên Story points Done và xếp loại A/B/C tự động",
            checklist=[
                {"id": "c1", "text": "Thu thập lịch sử commit từ GitHub API", "done": False},
                {"id": "c2", "text": "Tính chỉ số cày cuốc (Effort score)", "done": False},
            ],
            comments=0, attachments=0, pos=6,
        ),
        _task(
            "task-8", "prj-codemind", "TE61C04",
            "Tích hợp CodeMind AI Senior Reviewer & AST Security Scanner",
            "Xây dựng hệ thống Code Review tự động: Soi lỗi logic, bảo mật AST và Bộ câu hỏi Hội đồng Phản biện Q&A.",
            "in-progress", "high", "must", 5, a_huy, 4, "11/11/2026", "Git Hub", "bg-emerald-50 text-emerald-700 border-emerald-200",
            sub_req="Link", is_bonus=True,
            user_story={"role": "Sinh viên & Reviewer", "want": "bot AI tự động soi lỗi logic, bảo mật và gợi ý code chuẩn trước khi merge", "benefit": "giảm tải công sức code review thủ công và chuẩn bị tốt cho buổi vấn đáp"},
            acceptance="Given PR được mở trên GitHub\nWhen CodeMind AI quét qua AST\nThen hiển thị gợi ý 1-Click Fix và câu hỏi phản biện của Giảng viên",
            checklist=[
                {"id": "c1", "text": "Giao diện Master-Detail 2 cột PR list và Review detail", "done": True},
                {"id": "c2", "text": "Diff viewer hiển thị context/addition/deletion", "done": True},
                {"id": "c3", "text": "Nút Áp dụng bản vá 1-Click Fix", "done": True},
            ],
            comments=2, attachments=1, pos=7,
        ),
        _task(
            "task-9", "prj-codemind", "TE62D15",
            "Cây Phân Nhánh GitKraken với Chuyển động Động (Nhánh 2.2)",
            "Mô phỏng đồ thị phân nhánh SVG: Hiệu ứng vẽ nét mượt mà khi đổi tab, commit pop-in nảy mầm, các hạt xung ánh sáng dữ liệu.",
            "ready", "medium", "should", 5, a_hoa, 2, "12/11/2026", "Git Hub", "bg-blue-50 text-blue-700 border-blue-200",
            sub_req="Link", is_bonus=True,
            user_story={"role": "Sinh viên & Giảng viên", "want": "xem cây phân nhánh Git trực quan với animation chuyển động sống động", "benefit": "hiểu rõ quy trình rẽ nhánh Git Flow và giám sát commit minh bạch"},
            acceptance="Given người dùng chuyển sang tab Cây Phân Nhánh\nWhen tab được chọn\nThen các đường nhánh tự vẽ, commit pop-in và có nút Phát lại chuyển động",
            checklist=[
                {"id": "c1", "text": "Vẽ đường cong Bézier SVG các nhánh main, develop, feature", "done": True},
                {"id": "c2", "text": "Hiệu ứng stroke-dashoffset và animateMotion", "done": True},
                {"id": "c3", "text": "Popover tooltip hiển thị tác giả, SHA và số dòng code", "done": True},
            ],
            comments=3, attachments=0, pos=8,
        ),
        _task(
            "task-10", "prj-codemind", "TE63E20",
            "Bản đồ Kiến trúc GitDiagram tương tác (Nhánh 2.3)",
            "Sơ đồ ReactFlow 5 phân tầng hệ thống và modal liên kết trực tiếp với GitHub Repository của nhóm.",
            "done", "high", "must", 5, a_hoa, 6, "06/11/2026", "Architecture", "bg-emerald-50 text-emerald-700 border-emerald-200",
            sub_req="Link", is_bonus=True,
            user_story={"role": "Kiến trúc sư hệ thống", "want": "bản đồ kiến trúc 5 phân tầng có thể zoom, pan và kết nối repo GitHub", "benefit": "giúp Hội đồng Phản biện thẩm định kiến trúc tổng thể của CodeMind Campus"},
            acceptance="Given người xem mở phân hệ Kiến trúc\nWhen tương tác trên canvas\nThen các node sáng lên và mở được link GitHub repo của nhóm",
            checklist=[
                {"id": "c1", "text": "Cấu hình ReactFlow 22 nodes và 5 container subsystems", "done": True},
                {"id": "c2", "text": "Modal liên kết repo GitHub nhóm 4", "done": True},
            ],
            comments=1, attachments=1, pos=9,
        ),
        _task(
            "task-11", "prj-codemind", "TE71B88",
            "Đặc tả giao thức WebSocket Realtime Code Lab & Huddle",
            "Xây dựng kết nối hai chiều kênh WebSocket phân phối sự kiện con trỏ, terminal output và code sync.",
            "ready", "high", "must", 3, a_hoa, 2, "13/11/2026", "Realtime Lab", "bg-amber-50 text-amber-700 border-amber-200",
            pos=10,
        ),
        _task(
            "task-12", "prj-codemind", "TE89C04",
            "Tích hợp SSO & Giám sát chi phí Quota AI Gateway",
            "Đấu nối xác thực OAuth2 / SSO và bộ đếm Token streaming với fallback thông minh.",
            "backlog", "medium", "could", 5, a_hoa, 4, "28/11/2026", "AI Gateway", "bg-indigo-50 text-indigo-700 border-indigo-200",
            pos=11,
        ),
        _task(
            "task-13", "prj-codemind", "TE93A12",
            "Thiết lập môi trường CI/CD GitHub Actions & Lint Checker",
            "Pipeline tự động chạy clang-format, cppcheck và build test cases khi có pull request mới.",
            "done", "high", "must", 5, a_hoa, 12, "04/11/2026", "DevOps & CI", "bg-emerald-50 text-emerald-700 border-emerald-200",
            pos=12,
        ),
        _task(
            "task-14", "prj-codemind", "TE98D55",
            "Kiểm thử tải đồng thời 500 sinh viên phòng thi AI Defense Room",
            "Benchmark k6 kịch bản nộp bài cùng lúc, độ trễ p95 < 400ms và không rò rỉ bộ nhớ.",
            "done", "medium", "should", 4, a_hoa, 3, "03/11/2026", "Load Testing", "bg-slate-50 text-slate-700 border-slate-200",
            pos=13,
        ),

        # ── 2. PRJ-ECOMMERCE (5 tasks) ──
        _task(
            "ecom-1", "prj-ecommerce", "EC-AUTH-01",
            "Tích hợp OAuth2 SSO & Token Revocation với Redis Cluster",
            "Xây dựng Auth Service độc lập, cấp phát Access Token (15m) & Refresh Token (7d), blacklist token khi đăng xuất qua Redis.",
            "done", "high", "must", 5, a_tuan, 6, "10/11/2026", "Core Auth", "bg-blue-50 text-blue-700 border-blue-200",
            checklist=[
                {"id": "ec-c1", "text": "Cấu hình OAuth2 Client & Resource Server", "done": True},
                {"id": "ec-c2", "text": "Thiết lập Redis Key-Expiry cho Blacklisted Tokens", "done": True},
                {"id": "ec-c3", "text": "Viết Unit Tests cho luồng Refresh Token Rotation", "done": True},
            ],
            comments=3, attachments=1, pos=0,
        ),
        _task(
            "ecom-2", "prj-ecommerce", "EC-PAY-02",
            "Cổng thanh toán VNPay IPN & Webhook Idempotency",
            "Hiện thực xử lý thanh toán VNPay với cơ chế kiểm tra trùng lặp giao dịch (Idempotency Key) tránh charge tiền hai lần.",
            "in-progress", "high", "must", 8, a_tuan, 8, "18/11/2026", "Payment Gateway", "bg-emerald-50 text-emerald-700 border-emerald-200",
            checklist=[
                {"id": "ec-c4", "text": "Tạo bảng `idempotent_requests` với Unique Constraint", "done": True},
                {"id": "ec-c5", "text": "Xác thực chữ ký HMAC-SHA512 từ VNPay IPN", "done": True},
                {"id": "ec-c6", "text": "Mô phỏng retry webhook thất bại qua Dead Letter Queue", "done": False},
            ],
            comments=5, attachments=2, pos=1,
        ),
        _task(
            "ecom-3", "prj-ecommerce", "EC-KAFKA-03",
            "Thiết kế Event Stream Kafka cho Order Saga Pattern",
            "Quản lý luồng giao dịch phân tán giữa Inventory Service, Order Service và Payment Service theo mô hình Saga Orchestration.",
            "in-progress", "high", "must", 8, a_ha, 7, "20/11/2026", "Distributed Saga", "bg-purple-50 text-purple-700 border-purple-200",
            checklist=[
                {"id": "ec-c7", "text": "Khởi tạo Topic `order-events` với 6 Partitions", "done": True},
                {"id": "ec-c8", "text": "Hiện thực Compensating Transaction khi hoàn tiền", "done": False},
            ],
            comments=2, attachments=1, pos=2,
        ),
        _task(
            "ecom-4", "prj-ecommerce", "EC-GW-04",
            "Cấu hình API Gateway Envoy & Rate Limiting 1000 req/s",
            "Thiết lập định tuyến động, SSL termination và giới hạn tần suất yêu cầu Token Bucket bảo vệ máy chủ.",
            "ready", "medium", "should", 5, a_ha, 5, "24/11/2026", "Infrastructure", "bg-slate-100 text-slate-700 border-slate-300",
            checklist=[
                {"id": "ec-c9", "text": "Viết cấu hình `envoy.yaml` định tuyến 5 services", "done": False},
                {"id": "ec-c10", "text": "Benchmark tải giới hạn 1000 RPS với k6", "done": False},
            ],
            comments=1, attachments=0, pos=3,
        ),
        _task(
            "ecom-5", "prj-ecommerce", "EC-TEST-05",
            "Kiểm thử Tải K6 & Đạt chuẩn 99.9% Uptime",
            "Chạy kịch bản tải 10,000 người dùng đồng thời, đo lường độ trễ p95 < 200ms và giám sát Prometheus/Grafana.",
            "backlog", "medium", "should", 5, a_hoa, 4, "30/11/2026", "Testing & QA", "bg-amber-50 text-amber-700 border-amber-200",
            checklist=[
                {"id": "ec-c11", "text": "Soạn thảo kịch bản k6 cho luồng giỏ hàng và thanh toán", "done": False},
                {"id": "ec-c12", "text": "Dashboard Grafana theo dõi CPU & Connection Pool", "done": False},
            ],
            comments=0, attachments=0, pos=4,
        ),

        # ── 3. PRJ-MEDAI (4 tasks) ──
        _task(
            "med-1", "prj-medai", "MED-DATA-01",
            "Thu thập & Tiền xử lý 5,000 ảnh X-quang lồng ngực NIH",
            "Xử lý định dạng DICOM, chuẩn hóa kích thước 512x512, cân bằng histogram và gán nhãn đa phân loại.",
            "done", "high", "must", 5, a_linh, 6, "08/11/2026", "Data Pipeline", "bg-teal-50 text-teal-700 border-teal-200",
            checklist=[
                {"id": "m-c1", "text": "Chuyển đổi file DICOM sang PNG 16-bit", "done": True},
                {"id": "m-c2", "text": "Loại bỏ ảnh nhiễu, cân bằng histogram CLAHE", "done": True},
            ],
            comments=2, attachments=3, pos=0,
        ),
        _task(
            "med-2", "prj-medai", "MED-RAG-02",
            "Xây dựng Vector DB Qdrant với Dược thư Quốc gia",
            "Chunking 12,000 trang dược thư, sinh embeddings BioBERT và cài đặt Hybrid Search (BM25 + Dense).",
            "in-progress", "high", "must", 8, a_nam, 8, "19/11/2026", "RAG Engine", "bg-blue-50 text-blue-700 border-blue-200",
            checklist=[
                {"id": "m-c3", "text": "Cắt đoạn văn bản theo cấu trúc đề mục thuốc", "done": True},
                {"id": "m-c4", "text": "Fine-tune sentence-transformers trên từ vựng y tế", "done": False},
            ],
            comments=4, attachments=1, pos=1,
        ),
        _task(
            "med-3", "prj-medai", "MED-GUARD-03",
            "Thiết lập NeMo Guardrails ngăn chặn Hallucination y khoa",
            "Cấu hình quy tắc kiểm tra câu trả lời y khoa, từ chối kê đơn nguy hiểm và trích dẫn nguồn bằng chứng.",
            "ready", "high", "must", 5, a_hoa, 5, "25/11/2026", "AI Safety", "bg-rose-50 text-rose-700 border-rose-200",
            checklist=[
                {"id": "m-c5", "text": "Định nghĩa Colang flows cho kịch bản hỏi liều dùng", "done": False},
                {"id": "m-c6", "text": "Tích hợp Fact-checking module đối chiếu nguồn Qdrant", "done": False},
            ],
            comments=1, attachments=0, pos=2,
        ),
        _task(
            "med-4", "prj-medai", "MED-UI-04",
            "Giao diện Bác sĩ Streamlit & Xem ảnh X-Quang Grad-CAM",
            "Hiển thị heatmap vùng tổn thương trực quan cho bác sĩ kèm giải thích lý do chẩn đoán của mô hình.",
            "backlog", "medium", "should", 5, a_linh, 4, "02/12/2026", "Doctor Portal", "bg-purple-50 text-purple-700 border-purple-200",
            checklist=[
                {"id": "m-c7", "text": "Vẽ bounding box và heatmap Grad-CAM lớp cuối DenseNet", "done": False},
            ],
            comments=0, attachments=0, pos=3,
        ),

        # ── 4. PRJ-COMPILER (4 tasks) ──
        _task(
            "cpp-1", "prj-compiler", "CPP-LEX-01",
            "Bộ phân tích từ vựng Lexer dựa trên DFA bảng chuyển trạng thái",
            "Tokenize các từ khóa C++ (class, virtual, template), hằng số số học, chuỗi escape và xử lý comment đa dòng.",
            "done", "high", "must", 5, a_nghi, 6, "02/11/2026", "Lexer & Parser", "bg-blue-50 text-blue-700 border-blue-200",
            checklist=[
                {"id": "cp-c1", "text": "Xây dựng DFA transition table cho số thực và chuỗi", "done": True},
                {"id": "cp-c2", "text": "Viết test cases quét từ khóa và định danh hợp lệ", "done": True},
            ],
            comments=2, attachments=1, pos=0,
        ),
        _task(
            "cpp-2", "prj-compiler", "CPP-PARSE-02",
            "Bộ phân tích cú pháp LR(1) sinh cây cú pháp trừu tượng AST",
            "Hiện thực bảng điều khiển parser không đệ quy, xử lý xung đột Shift/Reduce và bắt lỗi cú pháp có hồi phục.",
            "done", "high", "must", 8, a_nghi, 8, "08/11/2026", "Lexer & Parser", "bg-blue-50 text-blue-700 border-blue-200",
            checklist=[
                {"id": "cp-c3", "text": "Xây dựng tập FIRST và FOLLOW cho văn phạm ngữ cảnh C++", "done": True},
                {"id": "cp-c4", "text": "Xuất file biểu diễn cấu trúc cây AST dạng JSON", "done": True},
            ],
            comments=4, attachments=2, pos=1,
        ),
        _task(
            "cpp-3", "prj-compiler", "CPP-OPT-03",
            "Tối ưu hóa mã ba địa chỉ (3AC): Constant Folding & Dead Code",
            "Thu gọn hằng số trong thời gian biên dịch, loại bỏ nhánh lệnh không bao giờ tới và tái sử dụng thanh ghi ảo.",
            "done", "high", "must", 8, a_hoa, 7, "16/11/2026", "Optimization Pass", "bg-amber-50 text-amber-700 border-amber-200",
            checklist=[
                {"id": "cp-c5", "text": "Thuật toán khử câu lệnh gán biến không sử dụng", "done": True},
                {"id": "cp-c6", "text": "Rút gọn các biểu thức toán học hằng số", "done": True},
            ],
            comments=3, attachments=1, pos=2,
        ),
        _task(
            "cpp-4", "prj-compiler", "CPP-ASM-04",
            "Bộ sinh mã máy hợp ngữ x86-64 chuẩn ABI System V",
            "Ánh xạ các hàm C++ sang chỉ thị Assembly x86-64, quản lý con trỏ Stack Frame (%rbp/%rsp) và lời gọi hàm.",
            "done", "high", "must", 8, a_hoa, 9, "26/11/2026", "Code Generation", "bg-emerald-50 text-emerald-700 border-emerald-200",
            checklist=[
                {"id": "cp-c7", "text": "Sinh mã hợp ngữ tương thích GCC/Clang", "done": True},
                {"id": "cp-c8", "text": "Chạy thử nghiệm chương trình Hello World và QuickSort", "done": True},
            ],
            comments=1, attachments=0, pos=3,
        ),

        # ── 5. PRJ-PINTOS (2 tasks) ──
        _task(
            "pin-1", "prj-pintos", "PIN-TH-01",
            "Hiện thực Priority Scheduling & Priority Donation tránh Deadlock",
            "Giải quyết bài toán nghịch đảo quyền ưu tiên (Priority Inversion) khi nhiều luồng tranh chấp Semaphore và Lock.",
            "done", "high", "must", 8, a_huy, 8, "15/10/2026", "Threads", "bg-indigo-50 text-indigo-700 border-indigo-200",
            checklist=[
                {"id": "p-c1", "text": "Hiện thực danh sách chờ theo mức ưu tiên giảm dần", "done": True},
                {"id": "p-c2", "text": "Xử lý nested donation cho lock nhiều tầng", "done": True},
            ],
            comments=3, attachments=1, pos=0,
        ),
        _task(
            "pin-2", "prj-pintos", "PIN-VM-02",
            "Bảng trang ảo phân cấp (Page Table) & Thuật toán thay thế Clock Page",
            "Quản lý Supplemental Page Table, phân phối khung trang vật lý (Frame Table) và Swap Slot trên đĩa mềm.",
            "done", "high", "must", 13, a_nghi, 12, "30/10/2026", "Virtual Memory", "bg-blue-50 text-blue-700 border-blue-200",
            checklist=[
                {"id": "p-c3", "text": "Xử lý ngắt Page Fault tải trang theo yêu cầu (Demand Paging)", "done": True},
                {"id": "p-c4", "text": "Viết thuật toán con trỏ Clock Page Eviction", "done": True},
            ],
            comments=5, attachments=2, pos=1,
        ),

        # ── 6. PRJ-FACEATTEND (2 tasks) ──
        _task(
            "fa-1", "prj-faceattend", "FA-EDGE-01",
            "Tối ưu hóa mô hình MobileFaceNet chạy trên Raspberry Pi 4",
            "Lượng tử hóa mô hình sang INT8 qua ONNX Runtime, đạt tốc độ xử lý 25 FPS nhận diện không giật lag.",
            "in-progress", "high", "must", 5, a_huy, 6, "25/11/2026", "Edge Inference", "bg-amber-50 text-amber-700 border-amber-200",
            checklist=[
                {"id": "fa-c1", "text": "Lượng tử hóa mô hình PyTorch sang INT8", "done": True},
                {"id": "fa-c2", "text": "Đo lường mức tiêu thụ CPU & RAM trên Pi 4", "done": False},
            ],
            comments=1, attachments=0, pos=0,
        ),
        _task(
            "fa-2", "prj-faceattend", "FA-SYNC-02",
            "Đồng bộ dữ liệu điểm danh offline với máy chủ qua MQTT Broker",
            "Lưu trữ tạm thời vào SQLite cục bộ khi mất mạng và tự động đồng bộ khi có kết nối trở lại.",
            "ready", "medium", "should", 5, a_hoa, 5, "02/12/2026", "Offline First", "bg-blue-50 text-blue-700 border-blue-200",
            checklist=[
                {"id": "fa-c3", "text": "Thiết lập QoS level 1 trên MQTT Broker", "done": False},
                {"id": "fa-c4", "text": "Viết cronjob đồng bộ hóa dữ liệu SQLite khi có mạng", "done": False},
            ],
            comments=2, attachments=1, pos=1,
        ),

        # ── 7. PRJ-SECURITY (2 tasks) ──
        _task(
            "sec-1", "prj-security", "SEC-SQLI-01",
            "Module phát hiện Time-based & Boolean-based Blind SQL Injection",
            "Sinh tự động các payload fuzzing với kỹ thuật kiểm tra thời gian trễ và phân tích vi phân độ dài phản hồi HTTP.",
            "done", "high", "must", 8, a_hoa, 7, "05/11/2026", "Detection Engine", "bg-rose-50 text-rose-700 border-rose-200",
            checklist=[
                {"id": "s-c1", "text": "Xây dựng từ điển payload bypass WAF phổ biến", "done": True},
                {"id": "s-c2", "text": "Xác thực phát hiện trên môi trường DVWA và WebGoat", "done": True},
            ],
            comments=3, attachments=1, pos=0,
        ),
        _task(
            "sec-2", "prj-security", "SEC-REP-02",
            "Tạo báo cáo lỗ hổng theo chuẩn OWASP Top 10 và CVSS v3.1",
            "Tự động phân loại mức độ rủi ro (Critical/High/Medium/Low), tính toán điểm CVSS và đề xuất giải pháp vá lỗi.",
            "in-progress", "medium", "should", 5, a_nghi, 5, "18/11/2026", "Reporting", "bg-purple-50 text-purple-700 border-purple-200",
            checklist=[
                {"id": "s-c3", "text": "Thiết kế template PDF báo cáo bảo mật chuyên nghiệp", "done": True},
                {"id": "s-c4", "text": "Trích dẫn mã CWE và gợi ý code fix cụ thể", "done": False},
            ],
            comments=1, attachments=0, pos=1,
        ),

        # ── 8. PRJ-DEVNET (2 tasks) ──
        _task(
            "dev-1", "prj-devnet", "DEV-ED-01",
            "Tích hợp Monaco Editor & Syntax Highlighting 40+ ngôn ngữ",
            "Hỗ trợ tô màu cú pháp thời gian thực, tự động căn lề mã nguồn và tải trước các gói khai báo type TypeScript.",
            "in-progress", "high", "must", 5, a_nghi, 5, "21/11/2026", "Code Editor", "bg-blue-50 text-blue-700 border-blue-200",
            checklist=[
                {"id": "d-c1", "text": "Tích hợp thư viện @monaco-editor/react", "done": True},
                {"id": "d-c2", "text": "Thêm chức năng format code với Prettier", "done": False},
            ],
            comments=2, attachments=1, pos=0,
        ),
        _task(
            "dev-2", "prj-devnet", "DEV-SOCIAL-02",
            "Hệ thống bình luận, Fork snippet và đánh giá sao Star",
            "Cho phép lập trình viên tạo bản sao (Fork) của snippet để sửa đổi và thảo luận theo từng dòng code.",
            "ready", "medium", "should", 5, a_huy, 6, "28/11/2026", "Social Graph", "bg-emerald-50 text-emerald-700 border-emerald-200",
            checklist=[
                {"id": "d-c3", "text": "Thiết kế schema cơ sở dữ liệu quan hệ Fork Tree", "done": False},
            ],
            comments=0, attachments=0, pos=1,
        ),
    ]
    return tasks


def _reconcile_seed_project_leaders(conn: sqlite3.Connection) -> None:
    """Đồng bộ leader_user_id & danh sách thành viên cho các đồ án mẫu trên DB đã tồn tại."""
    legacy_leader_fixes = [
        ("prj-codemind", "student-demo", "usr-sv-01"),
        ("prj-security", "student-demo", "usr-sv-01"),
        ("prj-ecommerce", "usr-sv-03", "usr-sv-08"),
        ("prj-medai", "usr-sv-04", "a1"),
        ("prj-compiler", "usr-sv-02", "usr-sv-04"),
        ("prj-pintos", "usr-sv-01", "usr-sv-03"),
        ("prj-faceattend", "usr-sv-01", "usr-sv-03"),
        ("prj-devnet", "usr-sv-01", "usr-sv-03"),
    ]
    for proj_id, old_leader, new_leader in legacy_leader_fixes:
        conn.execute(
            "UPDATE engineering_projects SET leader_user_id=?, created_by=? WHERE id=? AND leader_user_id=?",
            (new_leader, new_leader, proj_id, old_leader),
        )

    comp_row = conn.execute(
        "SELECT team_json FROM engineering_projects WHERE id=?",
        ("prj-compiler",),
    ).fetchone()
    if comp_row:
        try:
            comp_team = json.loads(comp_row["team_json"] or "[]")
        except Exception:
            comp_team = []
        if isinstance(comp_team, list):
            has_vana = any(
                isinstance(tm, dict)
                and (
                    str(tm.get("id") or "") == "usr-sv-02"
                    or str(tm.get("name") or "").strip().lower() == "nguyễn văn a"
                )
                for tm in comp_team
            )
            if not has_vana and "vana" in MEMBERS_META:
                comp_team.append(dict(MEMBERS_META["vana"]))
                conn.execute(
                    "UPDATE engineering_projects SET team_json=? WHERE id=?",
                    (json.dumps(comp_team, ensure_ascii=False), "prj-compiler"),
                )


def seed_kanban_workspace(conn: sqlite3.Connection, force_reseed: bool = False) -> None:
    """Khởi tạo 8 Dự án Kỹ nghệ và toàn bộ 35 Task Kanban vào SQLite (Nhánh 2)."""
    existing_count = conn.execute("SELECT COUNT(*) c FROM engineering_projects").fetchone()["c"]
    if existing_count > 0 and not force_reseed:
        _reconcile_seed_project_leaders(conn)
        return

    now = now_utc()
    if force_reseed:
        conn.execute("DELETE FROM engineering_tasks")
        conn.execute("DELETE FROM engineering_projects")

    for p in _build_seed_projects():
        conn.execute(
            """INSERT OR REPLACE INTO engineering_projects(
                   id, code, name, client, course, course_id, instructor_id, instructor_name,
                   leader_user_id, sprint, kind, status, fav,
                   due_date, due_text, story_points_budget, color_hex,
                   tl_start, tl_width, tl_color, instructor_label, team_json,
                   created_by, created_at, updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                p["id"], p["code"], p["name"], p["client"], p["course"],
                p.get("course_id", "class-capstone"), p.get("instructor_id", "usr-gv-01"),
                p.get("instructor_name", "Cô Trần Thị B"), p.get("leader_user_id", "student-demo"),
                p["sprint"], p["kind"], p["status"], p["fav"],
                p["due_date"], p["due_text"], p["story_points_budget"], p["color_hex"],
                p["tl_start"], p["tl_width"], p["tl_color"], p["instructor_label"],
                json.dumps(p["team"], ensure_ascii=False),
                p.get("leader_user_id", "student-demo"), now, now,
            ),
        )

    for t in _build_seed_tasks():
        conn.execute(
            """INSERT OR REPLACE INTO engineering_tasks(
                   id, project_id, code, title, description, column_id, priority, moscow,
                   points, assignee_json, estimate_hours, due_date, epic, epic_color,
                   depends_on, checklist_json, dod_json, user_story_json, acceptance_criteria,
                   deliverable_json, submission_requirement, submission_url, is_bonus,
                   comments_count, attachments_count, audit_logs_json, position_order,
                   xp_awarded, created_at, updated_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                t["id"], t["project_id"], t["code"], t["title"], t["description"],
                t["column_id"], t["priority"], t["moscow"], t["points"],
                json.dumps(t["assignee"], ensure_ascii=False), t["estimate_hours"],
                t["due_date"], t["epic"], t["epic_color"], t["depends_on"],
                json.dumps(t["checklist"], ensure_ascii=False),
                json.dumps(t["dod"], ensure_ascii=False),
                json.dumps(t["user_story"], ensure_ascii=False) if t["user_story"] else None,
                t["acceptance_criteria"],
                json.dumps(t["deliverable"], ensure_ascii=False) if t["deliverable"] else None,
                t["submission_requirement"], t["submission_url"], t["is_bonus"],
                t["comments_count"], t["attachments_count"],
                json.dumps(t["audit_logs"], ensure_ascii=False),
                t["position_order"], 0, now, now,
            ),
        )
