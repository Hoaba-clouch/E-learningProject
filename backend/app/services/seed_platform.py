from __future__ import annotations

import json
import sqlite3
from typing import Any

from app.core.security import hash_password, uid
from app.core.timezone import now_utc


def _edge(edge_id: str, source: str, target: str) -> dict[str, Any]:
    return {
        "id": edge_id,
        "source": source,
        "target": target,
        "type": "smoothstep",
        "markerEnd": {"type": "arrowclosed", "color": "#94a3b8"},
        "style": {"strokeWidth": 1.75, "stroke": "#94a3b8", "strokeDasharray": "5 4"},
    }


def _build_courses_seed() -> list[dict[str, Any]]:
    from app.services.seed_courses_16 import build_all_16_courses_seed
    return build_all_16_courses_seed()


def _build_dual_submissions_seed() -> list[dict[str, Any]]:
    return [
        {
            "id": "sub-oop-01",
            "class_id": "class-oop",
            "user_id": "usr-sv-05",
            "student_name": "Nguyễn Minh Khôi",
            "student_code": "2210866",
            "chapter_title": "Chương 1: Đa hình & Kiến trúc vtable",
            "repo_url": "https://github.com/khoinm/cpp-oop-polymorphism",
            "submitted_at": "Hôm nay, 09:42",
            "passed_tests": 5,
            "total_tests": 5,
            "exec_time_ms": 38,
            "memory_mb": 12.6,
            "commit_hash": "a4f91c2",
            "commit_count": 1,
            "similarity_pct": 44,
            "test_details": [
                {"id": "tc-1", "title": "Tính lương Developer", "status": "passed", "durationMs": 6, "isEdgeCase": False},
                {"id": "tc-2", "title": "Tính lương Manager", "status": "passed", "durationMs": 5, "isEdgeCase": False},
                {"id": "tc-3", "title": "Đa hình mảng Employee*", "status": "passed", "durationMs": 8, "isEdgeCase": False},
                {"id": "tc-4", "title": "Chống Object Slicing", "status": "passed", "durationMs": 7, "isEdgeCase": True},
                {"id": "tc-5", "title": "Valgrind Virtual Destructor", "status": "passed", "durationMs": 12, "isEdgeCase": True},
            ],
            "defense_status": "flagged",
            "defense_score": 48,
            "coherence_summary": "Cảnh báo lệch điểm: Code CI/CD pass 5/5 (100%) nhưng chỉ 1 commit đơn lẻ và trả lời vấn đáp về vptr/vtable sai bản chất.",
            "transcript": [
                {"id": "t1", "speaker": "ai_chair", "speakerLabel": "Chủ tịch Hội đồng AI", "text": "Trong hàm evaluatePayroll(Employee* emp), điều gì xảy ra ở tầng bộ nhớ runtime khi gọi emp->calculateSalary()?"},
                {"id": "t2", "speaker": "student", "speakerLabel": "Nguyễn Minh Khôi", "text": "Dạ hệ thống sẽ chạy vòng lặp if else kiểm tra tên class rồi chọn hàm ạ.", "evaluation": "Sai cơ chế Dynamic Dispatch (nhầm vtable lookup với rẽ nhánh if/else)."},
                {"id": "t3", "speaker": "ai_critic", "speakerLabel": "Giám khảo Phản biện", "text": "Nếu bỏ từ khóa virtual ở destructor ~Employee(), Valgrind có báo rò rỉ khi delete con trỏ Base* không? Tại sao?"},
                {"id": "t4", "speaker": "student", "speakerLabel": "Nguyễn Minh Khôi", "text": "Em nghĩ C++ tự giải phóng hết vùng nhớ lớp con vì mình đã dùng delete rồi ạ.", "evaluation": "Chưa nắm vững static binding của destructor không phải virtual."},
            ],
            "status": "flagged",
            "final_score": None,
            "instructor_feedback": "",
        },
        {
            "id": "sub-oop-02",
            "class_id": "class-oop",
            "user_id": "usr-sv-02",
            "student_name": "Nguyễn Văn A",
            "student_code": "2210842",
            "chapter_title": "Chương 1: Đa hình & Kiến trúc vtable",
            "repo_url": "https://github.com/nguyenvana/cpp-oop-vtable",
            "submitted_at": "Hôm nay, 09:15",
            "passed_tests": 5,
            "total_tests": 5,
            "exec_time_ms": 41,
            "memory_mb": 14.1,
            "commit_hash": "7c31b8e",
            "commit_count": 9,
            "similarity_pct": 6,
            "test_details": [
                {"id": "tc-1", "title": "Tính lương Developer", "status": "passed", "durationMs": 7, "isEdgeCase": False},
                {"id": "tc-2", "title": "Tính lương Manager", "status": "passed", "durationMs": 6, "isEdgeCase": False},
                {"id": "tc-3", "title": "Đa hình mảng Employee*", "status": "passed", "durationMs": 8, "isEdgeCase": False},
                {"id": "tc-4", "title": "Chống Object Slicing", "status": "passed", "durationMs": 8, "isEdgeCase": True},
                {"id": "tc-5", "title": "Valgrind Virtual Destructor", "status": "passed", "durationMs": 12, "isEdgeCase": True},
            ],
            "defense_status": "completed",
            "defense_score": 91,
            "coherence_summary": "Lịch sử 9 commits tự nhiên. Giải thích chính xác vptr (8 byte đầu object) và lý do chọn Employee* tránh Object Slicing.",
            "transcript": [
                {"id": "t1", "speaker": "ai_chair", "speakerLabel": "Chủ tịch Hội đồng AI", "text": "Tại sao bạn truyền Employee* vào evaluatePayroll thay vì truyền tham trị Employee?"},
                {"id": "t2", "speaker": "student", "speakerLabel": "Nguyễn Văn A", "text": "Vì truyền tham trị sẽ gây Object Slicing, cắt mất phần thuộc tính mở rộng của Developer/Manager và ép vptr trỏ về vtable của Employee.", "evaluation": "Xuất sắc — diễn giải chính xác cơ chế vptr và object layout."},
                {"id": "t3", "speaker": "ai_critic", "speakerLabel": "Giám khảo Phản biện", "text": "Virtual destructor đảm bảo điều gì khi giải phóng mảng đa hình?"},
                {"id": "t4", "speaker": "student", "speakerLabel": "Nguyễn Văn A", "text": "Nó giúp tra vtable để gọi ~Developer() hoặc ~Manager() trước rồi mới gọi ngược lên ~Employee(), đảm bảo 0 byte leak.", "evaluation": "Chuẩn xác 100%."},
            ],
            "status": "pending",
            "final_score": None,
            "instructor_feedback": "",
        },
        {
            "id": "sub-oop-03",
            "class_id": "class-oop",
            "user_id": "usr-sv-07",
            "student_name": "Võ Ngọc Hà",
            "student_code": "2210851",
            "chapter_title": "Chương 1: Đa hình & Kiến trúc vtable",
            "repo_url": "https://github.com/havn/oop-inheritance-lab",
            "submitted_at": "Hôm qua, 21:18",
            "passed_tests": 3,
            "total_tests": 5,
            "exec_time_ms": 49,
            "memory_mb": 15.8,
            "commit_hash": "2b98d14",
            "commit_count": 5,
            "similarity_pct": 9,
            "test_details": [
                {"id": "tc-1", "title": "Tính lương Developer", "status": "passed", "durationMs": 8, "isEdgeCase": False},
                {"id": "tc-2", "title": "Tính lương Manager", "status": "passed", "durationMs": 7, "isEdgeCase": False},
                {"id": "tc-3", "title": "Đa hình mảng Employee*", "status": "passed", "durationMs": 11, "isEdgeCase": False},
                {"id": "tc-4", "title": "Chống Object Slicing", "status": "failed", "durationMs": 9, "isEdgeCase": True, "note": "Tham số hàm vẫn nhận Employee theo giá trị"},
                {"id": "tc-5", "title": "Valgrind Virtual Destructor", "status": "failed", "durationMs": 14, "isEdgeCase": True, "note": "Thiếu virtual ở ~Employee() -> leaked 48 bytes"},
            ],
            "defense_status": "completed",
            "defense_score": 76,
            "coherence_summary": "Hiểu lý thuyết kế thừa cơ bản nhưng còn nhầm tham số con trỏ khi truyền vào hàm đánh giá.",
            "transcript": [
                {"id": "t1", "speaker": "ai_chair", "speakerLabel": "Chủ tịch Hội đồng AI", "text": "Test số 4 báo lỗi Object Slicing ở hàm evaluatePayroll, bạn nhận ra nguyên nhân từ chữ ký hàm chưa?"},
                {"id": "t2", "speaker": "student", "speakerLabel": "Võ Ngọc Hà", "text": "Em đang để tham số là Employee emp nên khi truyền Manager vào nó bị ép kiểu mất biến bonus ạ, em sẽ sửa sang Employee* emp.", "evaluation": "Tự nhận diện đúng lỗi sau khi vấn đáp."},
            ],
            "status": "pending",
            "final_score": None,
            "instructor_feedback": "",
        },
        {
            "id": "sub-oop-04",
            "class_id": "class-oop",
            "user_id": "usr-sv-01",
            "student_name": "Nguyễn Bá Hòa",
            "student_code": "2210801",
            "chapter_title": "Chương 1: Đa hình & Kiến trúc vtable",
            "repo_url": "https://github.com/hoabn/cpp20-vtable-clean",
            "submitted_at": "Hôm qua, 16:05",
            "passed_tests": 5,
            "total_tests": 5,
            "exec_time_ms": 31,
            "memory_mb": 11.4,
            "commit_hash": "91e04c7",
            "commit_count": 12,
            "similarity_pct": 4,
            "test_details": [
                {"id": "tc-1", "title": "Tính lương Developer", "status": "passed", "durationMs": 5, "isEdgeCase": False},
                {"id": "tc-2", "title": "Tính lương Manager", "status": "passed", "durationMs": 5, "isEdgeCase": False},
                {"id": "tc-3", "title": "Đa hình mảng Employee*", "status": "passed", "durationMs": 7, "isEdgeCase": False},
                {"id": "tc-4", "title": "Chống Object Slicing", "status": "passed", "durationMs": 6, "isEdgeCase": True},
                {"id": "tc-5", "title": "Valgrind Virtual Destructor", "status": "passed", "durationMs": 8, "isEdgeCase": True},
            ],
            "defense_status": "completed",
            "defense_score": 96,
            "coherence_summary": "Hoàn hảo: 12 commits nhỏ gọn, code đạt chuẩn C++20 và bảo vệ xuất sắc câu hỏi về memory alignment.",
            "transcript": [
                {"id": "t1", "speaker": "ai_chair", "speakerLabel": "Chủ tịch Hội đồng AI", "text": "Khi thêm hàm virtual đầu tiên vào Employee, sizeof(Employee) thay đổi như thế nào trên kiến trúc 64-bit?"},
                {"id": "t2", "speaker": "student", "speakerLabel": "Nguyễn Bá Hòa", "text": "Kích thước tăng thêm đúng 8 bytes cho con trỏ vptr (kèm padding alignment nếu cần) để trỏ tới vtable của lớp.", "evaluation": "Câu trả lời cấp độ Senior Systems."},
            ],
            "status": "graded",
            "final_score": 98,
            "instructor_feedback": "Bài làm rất sạch, tư duy vtable và RAII vững vàng.",
        },
        {
            "id": "sub-dsa-01",
            "class_id": "class-dsa",
            "user_id": "usr-sv-03",
            "student_name": "Võ Nhật Huy",
            "student_code": "2210815",
            "chapter_title": "Chương 1: Đồ thị & Dijkstra",
            "repo_url": "https://github.com/huyvn/dijkstra-100k-nodes",
            "submitted_at": "Hôm nay, 10:15",
            "passed_tests": 4,
            "total_tests": 5,
            "exec_time_ms": 492,
            "memory_mb": 98.2,
            "commit_hash": "4e19f0a",
            "commit_count": 7,
            "similarity_pct": 8,
            "test_details": [
                {"id": "tc-dsa-1", "title": "Đồ thị nhỏ có cạnh song song", "status": "passed", "durationMs": 4, "isEdgeCase": False},
                {"id": "tc-dsa-2", "title": "Đồ thị không liên thông", "status": "passed", "durationMs": 5, "isEdgeCase": True},
                {"id": "tc-dsa-3", "title": "Stress Test 100k đỉnh", "status": "failed", "durationMs": 483, "isEdgeCase": True, "note": "Sát ngưỡng timeout do thiếu lazy deletion d > dist[u]"},
            ],
            "defense_status": "completed",
            "defense_score": 84,
            "coherence_summary": "Nắm rõ nguyên lý tham lam của Dijkstra nhưng cần bổ sung guard clause cắt nhánh trong priority queue.",
            "transcript": [
                {"id": "t1", "speaker": "ai_critic", "speakerLabel": "Giám khảo Phản biện", "text": "Tại sao vòng lặp while(!pq.empty()) vẫn bị TLE ở đồ thị dày 200k cạnh?"},
                {"id": "t2", "speaker": "student", "speakerLabel": "Võ Nhật Huy", "text": "Do cùng một đỉnh u có thể bị push vào heap nhiều lần với khoảng cách cũ lớn hơn, thiếu lệnh if(d > dist[u]) continue ạ.", "evaluation": "Phát hiện đúng điểm nghẽn thuật toán."},
            ],
            "status": "pending",
            "final_score": None,
            "instructor_feedback": "",
        },
        {
            "id": "sub-web-01",
            "class_id": "class-web",
            "user_id": "usr-sv-04",
            "student_name": "Phan Đình Nghị",
            "student_code": "2210829",
            "chapter_title": "Chương 1: FastAPI JWT & RBAC",
            "repo_url": "https://github.com/nghipd/fastapi-rbac-security",
            "submitted_at": "Hôm nay, 08:50",
            "passed_tests": 5,
            "total_tests": 5,
            "exec_time_ms": 64,
            "memory_mb": 28.4,
            "commit_hash": "c52e901",
            "commit_count": 8,
            "similarity_pct": 5,
            "test_details": [
                {"id": "tc-web-1", "title": "Chặn HTTP 403 khi sai vai trò", "status": "passed", "durationMs": 31, "isEdgeCase": True},
                {"id": "tc-web-2", "title": "Cô lập dữ liệu theo organization_id", "status": "passed", "durationMs": 33, "isEdgeCase": False},
            ],
            "defense_status": "completed",
            "defense_score": 93,
            "coherence_summary": "Kiến trúc 3 tầng chuẩn mực, tách bạch authentication (401) và authorization (403).",
            "transcript": [
                {"id": "t1", "speaker": "ai_chair", "speakerLabel": "Chủ tịch Hội đồng AI", "text": "Làm sao ngăn sinh viên dùng JWT hợp lệ của chính mình để đọc phiên chấm bài của giảng viên?"},
                {"id": "t2", "speaker": "student", "speakerLabel": "Phan Đình Nghị", "text": "Sử dụng FastAPI dependency require_instructor kiểm tra claim role trong payload đã ký HMAC và lọc query theo organization_id của user.", "evaluation": "Giải thích mạch lạc, đúng code thực tế."},
            ],
            "status": "pending",
            "final_score": None,
            "instructor_feedback": "",
        },
        {
            "id": "sub-ai-01",
            "class_id": "class-ai",
            "user_id": "usr-sv-08",
            "student_name": "Trần Minh Tuấn",
            "student_code": "2210877",
            "chapter_title": "Chương 1: RAG Architecture & pgvector",
            "repo_url": "https://github.com/tuantm/rag-pgvector-socratic",
            "submitted_at": "Hôm nay, 10:05",
            "passed_tests": 5,
            "total_tests": 5,
            "exec_time_ms": 112,
            "memory_mb": 42.0,
            "commit_hash": "8f71a20",
            "commit_count": 6,
            "similarity_pct": 7,
            "test_details": [
                {"id": "tc-ai-1", "title": "Lọc ngưỡng similarity >= 0.72", "status": "passed", "durationMs": 112, "isEdgeCase": True}
            ],
            "defense_status": "pending",
            "defense_score": 72,
            "coherence_summary": "Code đạt test case lọc cosine similarity; đang chờ hoàn tất vòng phản biện sâu về chunk overlap.",
            "transcript": [
                {"id": "t1", "speaker": "ai_chair", "speakerLabel": "Chủ tịch Hội đồng AI", "text": "Nếu chunk size quá lớn (2000 tokens) thì ảnh hưởng gì đến độ chính xác truy xuất?"},
                {"id": "t2", "speaker": "student", "speakerLabel": "Trần Minh Tuấn", "text": "Vector embedding bị pha loãng ngữ nghĩa, làm cosine similarity giảm và tăng độ trễ LLM.", "evaluation": "Đạt yêu cầu cốt lõi."},
            ],
            "status": "pending",
            "final_score": None,
            "instructor_feedback": "",
        },
    ]


PLATFORM_USER_PROFILES: dict[str, dict[str, Any]] = {
    "usr-adm-01": {
        "headline": "Quản trị Hệ thống & Điều phối Học vụ CodeMind Campus",
        "department": "Trung tâm Hạ tầng Số & Đào tạo Kỹ sư",
        "office_location": "Văn phòng Điều hành A1-102 · Giờ hành chính",
        "bio": "Quản trị phân quyền RBAC, phê duyệt học viên, giám sát cụm Docker Sandbox và ngân sách AI Campus.",
        "skills": ["RBAC & Security", "MySQL 8 Operations", "Docker Infrastructure", "Academic Ops"],
        "github_url": "https://github.com/codemind-campus",
        "website_url": "https://codemind.edu.vn",
        "phone": "028 3899 0101",
    },
    "usr-gv-01": {
        "headline": "Giảng viên Chính · Kiến trúc Phần mềm & Trình biên dịch",
        "department": "Khoa CNTT · Bộ môn Kỹ nghệ Phần mềm",
        "office_location": "Phòng Lab A3-201 · Tiếp SV: Thứ 3 & 5 (14:00–17:00)",
        "bio": "Giảng viên hướng dẫn đồ án chuyên ngành và thành viên Hội đồng Phản biện CodeMind Campus. Tập trung vào Clean Architecture, quản lý bộ nhớ C++20, React 19 và quy trình Git/Kanban chuẩn doanh nghiệp.",
        "skills": ["C++20 & OOP", "Compiler AST", "Clean Architecture", "React 19", "Code Review & CI/CD"],
        "github_url": "https://github.com/tran-thi-b-codemind",
        "website_url": "https://codemind.edu.vn/faculty/tran-thi-b",
        "phone": "0903 812 401",
    },
    "usr-gv-02": {
        "headline": "Giảng viên · Hệ thống Phân tán, Backend & DevOps",
        "department": "Khoa CNTT · Bộ môn Hệ thống Thông tin & Cloud",
        "office_location": "Phòng Lab B2-304 · Tiếp SV: Thứ 4 & 6 (09:00–11:30)",
        "bio": "Phụ trách các học phần FastAPI, Kiến trúc Hệ thống Phân tán (Kafka/Redis), AI-Native Web App và Docker CI/CD. Đồng hành cùng các nhóm đồ án tối ưu hiệu năng và triển khai thực tế.",
        "skills": ["FastAPI & Python", "Distributed Systems", "Kafka & Redis", "Docker & CI/CD", "AI-Native RAG"],
        "github_url": "https://github.com/nguyen-phuoc-codemind",
        "website_url": "https://codemind.edu.vn/faculty/nguyen-phuoc",
        "phone": "0908 441 209",
    },
    "usr-gv-03": {
        "headline": "Giảng viên · Kiến trúc Máy tính, Mạng & Di động Đa nền tảng",
        "department": "Khoa CNTT · Bộ môn Mạng Máy tính & Mobile",
        "office_location": "Phòng Lab B2-105 · Tiếp SV: Thứ 2 & 4 (13:30–16:30)",
        "bio": "Phụ trách học phần Hệ điều hành, Giao thức TCP/IP (CS205) và Phát triển Ứng dụng Di động Flutter/Dart (CS306).",
        "skills": ["TCP/IP & OS", "Socket Programming", "Wireshark", "Flutter & Dart", "Mobile UX"],
        "github_url": "https://github.com/tran-minh-quan-codemind",
        "website_url": "https://codemind.edu.vn/faculty/tran-minh-quan",
        "phone": "0909 512 303",
    },
    "usr-gv-04": {
        "headline": "Giảng viên · An toàn Thông tin & Quản trị Dự án Agile",
        "department": "Khoa CNTT · Bộ môn An ninh Mạng & Công nghệ Phần mềm",
        "office_location": "Phòng Lab C1-208 · Tiếp SV: Thứ 3 & 6 (14:00–17:00)",
        "bio": "Chuyên gia kiểm thử bảo mật ứng dụng Web (OWASP Top 10) và cố vấn quy trình Agile Scrum / Kanban chuẩn doanh nghiệp.",
        "skills": ["OWASP Top 10", "AppSec & JWT", "Agile Scrum", "Code Audit", "Risk Governance"],
        "github_url": "https://github.com/dang-quoc-bao-codemind",
        "website_url": "https://codemind.edu.vn/faculty/dang-quoc-bao",
        "phone": "0914 708 404",
    },
    "usr-gv-05": {
        "headline": "Tiến sĩ · Trí tuệ Nhân tạo & Hạ tầng Đám mây Kubernetes",
        "department": "Khoa CNTT · Bộ môn AI Engineering & Cloud Native",
        "office_location": "Phòng Nghiên cứu A2-401 · Tiếp SV: Thứ 5 (08:30–11:30)",
        "bio": "Giảng dạy Học máy ứng dụng (CS410) và Triển khai Cloud Kubernetes / Terraform (CS415), hướng dẫn nghiên cứu mô hình AI.",
        "skills": ["Deep Learning", "PyTorch & Attention", "Kubernetes", "Terraform Cloud", "MLOps"],
        "github_url": "https://github.com/le-hoang-mai-codemind",
        "website_url": "https://codemind.edu.vn/faculty/le-hoang-mai",
        "phone": "0906 921 505",
    },
    "usr-sv-01": {
        "headline": "Nhóm trưởng Đồ án · Fullstack & AI RAG Engineer",
        "department": "Lớp K22-KTPM01 · Chuyên ngành Kỹ thuật Phần mềm",
        "office_location": "Khu thực hành Lab A3 · Bàn nhóm 01",
        "bio": "Đam mê thiết kế giao diện React/TypeScript kết hợp kiến trúc AI-Native và hệ thống chấm bài tự động.",
        "skills": ["React 19", "TypeScript", "FastAPI", "C++20", "AI RAG"],
        "github_url": "https://github.com/hoabn",
        "website_url": "",
        "phone": "0912 308 801",
    },
    "usr-sv-02": {
        "headline": "Sinh viên Năm 4 · Systems C++ & Compiler Engineer",
        "department": "Lớp K22-KHMT02 · Chuyên ngành Khoa học Máy tính",
        "office_location": "Khu thực hành Lab A3 · Bàn nhóm 02",
        "bio": "Tập trung phát triển Trình biên dịch Mini C++ với AST Visualizer, tối ưu bộ nhớ Valgrind và tư duy Clean Code trong các đồ án kỹ nghệ.",
        "skills": ["C++20", "AST & Compiler", "Algorithms", "Git Workflow", "TypeScript"],
        "github_url": "https://github.com/nguyenvana",
        "website_url": "",
        "phone": "0915 221 842",
    },
    "usr-sv-03": {
        "headline": "Sinh viên Năm 4 · Backend & Thuật toán Tối ưu",
        "department": "Lớp K22-KHMT01 · Chuyên ngành Khoa học Máy tính",
        "office_location": "Khu thực hành Lab B2 · Nhóm Đồ thị & Microservices",
        "bio": "Quan tâm đến cấu trúc dữ liệu hiệu năng cao, thuật toán đồ thị quy mô lớn và kiến trúc Microservices chịu lỗi.",
        "skills": ["C++ Algorithms", "Python", "Kafka", "PostgreSQL", "Docker"],
        "github_url": "https://github.com/huyvn",
        "website_url": "",
        "phone": "0917 884 150",
    },
    "usr-sv-04": {
        "headline": "Sinh viên Năm 4 · Bảo mật API & Kiến trúc 3 tầng",
        "department": "Lớp K22-KTPM02 · Chuyên ngành Kỹ thuật Phần mềm",
        "office_location": "Khu thực hành Lab B2 · Nhóm Bảo mật & Web",
        "bio": "Xây dựng các hệ thống FastAPI RBAC, JWT rotation và phòng thủ lỗ hổng OWASP cho đồ án doanh nghiệp.",
        "skills": ["FastAPI Security", "RBAC & JWT", "MySQL 8", "TypeScript", "Pytest"],
        "github_url": "https://github.com/nghipd",
        "website_url": "",
        "phone": "0934 510 829",
    },
    "usr-sv-05": {
        "headline": "Sinh viên Năm 3 · AI & Retrieval Systems",
        "department": "Lớp K23-AI01 · Chuyên ngành Trí tuệ Nhân tạo",
        "office_location": "Phòng tự học Tòa C",
        "bio": "Đang hoàn thiện nền tảng lập trình hướng đối tượng C++ và tìm hiểu embedding vector với pgvector.",
        "skills": ["Python", "C++ OOP", "pgvector", "SQL"],
        "github_url": "https://github.com/khoinm",
        "website_url": "",
        "phone": "0971 204 866",
    },
    "usr-sv-06": {
        "headline": "Sinh viên · Lập trình Hệ thống Cơ bản",
        "department": "Lớp K23-CNTT03",
        "office_location": "Phòng tự học Tòa C",
        "bio": "Học viên khoa CNTT đang bảo lưu tạm thời.",
        "skills": ["C++", "Git"],
        "github_url": "",
        "website_url": "",
        "phone": "",
    },
    "usr-sv-07": {
        "headline": "Sinh viên Năm 4 · Frontend & Interactive UI",
        "department": "Lớp K22-KTPM01 · Chuyên ngành Kỹ thuật Phần mềm",
        "office_location": "Khu thực hành Lab A3 · Nhóm DevNet",
        "bio": "Tập trung thiết kế trải nghiệm người dùng mượt mà với React, GSAP animation và trực quan hóa cây dữ liệu.",
        "skills": ["React 19", "Tailwind CSS", "GSAP", "C++ OOP"],
        "github_url": "https://github.com/havn",
        "website_url": "",
        "phone": "0988 312 851",
    },
    "usr-sv-08": {
        "headline": "Sinh viên Năm 4 · AI Agent & Semantic Search",
        "department": "Lớp K22-AI01 · Chuyên ngành Trí tuệ Nhân tạo",
        "office_location": "Khu thực hành Lab B2 · Nhóm AI Socratic",
        "bio": "Nghiên cứu pipeline RAG, tinh chỉnh ngưỡng cosine similarity và đánh giá chất lượng phản hồi LLM.",
        "skills": ["Python", "RAG Pipeline", "Embeddings", "FastAPI"],
        "github_url": "https://github.com/tuantm",
        "website_url": "",
        "phone": "0909 742 877",
    },
}


def seed_platform_data(conn: sqlite3.Connection, force_reseed: bool = False) -> None:
    """
    Seed dữ liệu đồng bộ cho cả 3 vai trò (Student, Instructor, Admin).
    Chạy idempotent (không ghi đè dữ liệu đã chỉnh sửa trừ khi force_reseed=True).
    """
    now = now_utc()
    org_id = "org-demo-codemind"
    conn.execute(
        "INSERT OR IGNORE INTO organizations(id,name,status,created_at,updated_at) VALUES(?,?,?,?,?)",
        (org_id, "CodeMind Demo Campus", "active", now, now),
    )

    # 1. Seed Users (bao gồm các tài khoản LoginScreen & RBAC mẫu)
    default_pwd_hash = hash_password("hasib123")
    platform_users = [
        ("usr-adm-01", "admin@codemind.ai", default_pwd_hash, "Admin AIO", "admin", "active", "ADM-01", "Đang trực tuyến", "Workstation · Chrome 126", 6),
        ("usr-gv-01", "lananh.gv@codemind.ai", default_pwd_hash, "Cô Trần Thị B", "instructor", "active", "GV-2026-01", "Vừa xong", "MacBook Pro · Chrome 126", 5),
        ("usr-gv-02", "phuoc.gv@codemind.ai", default_pwd_hash, "Thầy Nguyễn Phước", "instructor", "active", "GV-2026-02", "12 phút trước", "Windows 11 · Edge 125", 5),
        ("usr-gv-03", "quan.gv@codemind.ai", default_pwd_hash, "Thầy Trần Minh Quân", "instructor", "active", "GV-2026-03", "18 phút trước", "ThinkPad X1 · Ubuntu 24.04", 2),
        ("usr-gv-04", "bao.gv@codemind.ai", default_pwd_hash, "Thầy Đặng Quốc Bảo", "instructor", "active", "GV-2026-04", "25 phút trước", "MacBook Air M2 · Chrome", 2),
        ("usr-gv-05", "mai.gv@codemind.ai", default_pwd_hash, "TS. Lê Hoàng Mai", "instructor", "active", "GV-2026-05", "9 phút trước", "Workstation Linux · Chrome", 2),
        ("usr-sv-01", "hoa.nb@student.edu.vn", default_pwd_hash, "Nguyễn Bá Hòa", "student", "active", "2210801", "4 phút trước", "MacBook Air M3 · Safari", 4),
        ("usr-sv-02", "hasib@gmail.com", default_pwd_hash, "Nguyễn Văn A", "student", "active", "2210842", "Vừa xong", "Windows 11 · Chrome 126", 4),
        ("usr-sv-03", "huy.vn@student.edu.vn", default_pwd_hash, "Võ Nhật Huy", "student", "active", "2210815", "18 phút trước", "Ubuntu 24.04 · Firefox", 3),
        ("usr-sv-04", "nghi.pd@student.edu.vn", default_pwd_hash, "Phan Đình Nghị", "student", "active", "2210829", "35 phút trước", "Windows 11 · Chrome", 3),
        ("usr-sv-05", "khoi.nm@student.edu.vn", default_pwd_hash, "Nguyễn Minh Khôi", "student", "pending", "2210866", "Chờ xác minh lớp", "MacBook Pro · Chrome", 2),
        ("usr-sv-06", "ngocd@student.edu.vn", default_pwd_hash, "Hoàng Ngọc D", "student", "suspended", "2210899", "2 ngày trước", "iPhone 15 · Safari Mobile", 1),
        ("usr-sv-07", "ha.vn@student.edu.vn", default_pwd_hash, "Võ Ngọc Hà", "student", "active", "2210851", "22 phút trước", "Windows 11 · Chrome", 3),
        ("usr-sv-08", "tuan.tm@student.edu.vn", default_pwd_hash, "Trần Minh Tuấn", "student", "active", "2210877", "15 phút trước", "Ubuntu 24.04 · Chrome", 2),
    ]
    default_owned_json = json.dumps({
        "theme": ["diagonal"],
        "avatar": ["initials"],
        "mentor": ["mino"],
        "chat": ["classic"],
        "map": ["campaign"],
        "badge": ["streak"],
    })
    default_claimed_json = json.dumps(["q3"])

    for u_id, email, pwd_hash, full_name, role, st, code, last_act, dev, cls_cnt in platform_users:
        existing = conn.execute("SELECT id, headline, bio FROM users WHERE id=? OR lower(email)=?", (u_id, email)).fetchone()
        p_prof = PLATFORM_USER_PROFILES.get(u_id, {})
        p_headline = p_prof.get("headline", "")
        p_bio = p_prof.get("bio", "")
        p_department = p_prof.get("department", "")
        p_office = p_prof.get("office_location", "")
        p_skills_json = json.dumps(p_prof.get("skills", []), ensure_ascii=False)
        p_github = p_prof.get("github_url", "")
        p_website = p_prof.get("website_url", "")
        p_phone = p_prof.get("phone", "")
        is_primary_student = u_id == "usr-sv-02"
        target_xp = 3240 if is_primary_student else 1250
        target_streak = 14 if is_primary_student else 4
        if not existing:
            conn.execute(
                """INSERT INTO users(id, email, password_hash, full_name, display_name, role, status, locale, timezone,
                                     theme_preference, user_code, last_active_label, last_device, classes_count,
                                     headline, bio, department, office_location, skills_json, github_url, website_url, phone,
                                     created_at, updated_at)
                   VALUES(?, ?, ?, ?, ?, ?, ?, 'vi-VN', 'Asia/Ho_Chi_Minh', 'one-dark', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    u_id, email, pwd_hash, full_name, full_name, role, st, code, last_act, dev, cls_cnt,
                    p_headline, p_bio, p_department, p_office, p_skills_json, p_github, p_website, p_phone,
                    now, now,
                ),
            )
            m_role = "org_admin" if role == "admin" else role
            conn.execute(
                "INSERT OR IGNORE INTO memberships(id, organization_id, user_id, role, status) VALUES(?,?,?,?,?)",
                (uid(), org_id, u_id, m_role, "active"),
            )
            if role == "student":
                conn.execute(
                    """INSERT OR IGNORE INTO student_profiles(
                           id, user_id, current_streak, longest_streak, exp_points, selected_title,
                           radar_algorithm, radar_debugging, radar_cleancode, radar_teamwork, radar_defense,
                           owned_items_json, claimed_quests_json
                       ) VALUES(?, ?, ?, ?, ?, 'Clean Code Builder', 90.0, 65.0, 85.0, 75.0, 92.0, ?, ?)""",
                    (uid(), u_id, target_streak, target_streak, target_xp, default_owned_json, default_claimed_json),
                )
                for purpose in ("academic_integrity", "teacher_visibility"):
                    conn.execute(
                        "INSERT OR IGNORE INTO consents(id, user_id, purpose, policy_version, granted, granted_at, updated_at) VALUES(?,?,?,?,?,?,?)",
                        (uid(), u_id, purpose, "2026-08-01", 1, now, now),
                    )
        elif force_reseed:
            conn.execute(
                """UPDATE users
                   SET full_name=?, display_name=?, role=?, status=?, user_code=?, last_active_label=?, last_device=?, classes_count=?,
                       headline=?, bio=?, department=?, office_location=?, skills_json=?, github_url=?, website_url=?, phone=?,
                       two_factor_enabled=0, failed_login_attempts=0, locked_until=NULL, updated_at=?
                   WHERE id=?""",
                (
                    full_name, full_name, role, st, code, last_act, dev, cls_cnt,
                    p_headline, p_bio, p_department, p_office, p_skills_json, p_github, p_website, p_phone,
                    now, existing["id"],
                ),
            )
            if role == "student":
                conn.execute(
                    """UPDATE student_profiles
                       SET current_streak=?, longest_streak=?, exp_points=?,
                           radar_algorithm=90.0, radar_debugging=65.0, radar_cleancode=85.0,
                           radar_teamwork=75.0, radar_defense=92.0,
                           owned_items_json=?, claimed_quests_json=?
                       WHERE user_id=?""",
                    (target_streak, target_streak, target_xp, default_owned_json, default_claimed_json, existing["id"]),
                )
        else:
            if not (existing.get("headline") or "").strip() and not (existing.get("bio") or "").strip() and p_prof:
                conn.execute(
                    """UPDATE users
                       SET headline=?, bio=?, department=?, office_location=?, skills_json=?, github_url=?, website_url=?, phone=?, updated_at=?
                       WHERE id=?""",
                    (p_headline, p_bio, p_department, p_office, p_skills_json, p_github, p_website, p_phone, now, existing["id"]),
                )

    # Đảm bảo học viên usr-sv-02 trên DB đã tồn tại từ trước có hồ sơ XP Shop & tiến độ Nhánh 1 đồng bộ
    sv2_prog_count = conn.execute("SELECT COUNT(*) c FROM student_lesson_progress WHERE user_id='usr-sv-02'").fetchone()["c"]
    if sv2_prog_count == 0 or force_reseed:
        sv2_prof = conn.execute("SELECT exp_points, owned_items_json FROM student_profiles WHERE user_id='usr-sv-02'").fetchone()
        if sv2_prof and (sv2_prof["exp_points"] < 1000 or not sv2_prof["owned_items_json"] or sv2_prof["owned_items_json"] == "{}" or force_reseed):
            conn.execute(
                """UPDATE student_profiles
                   SET current_streak=14, longest_streak=14, exp_points=3240,
                       radar_algorithm=90.0, radar_debugging=65.0, radar_cleancode=85.0,
                       radar_teamwork=75.0, radar_defense=92.0,
                       owned_items_json=?, claimed_quests_json=?
                   WHERE user_id='usr-sv-02'""",
                (default_owned_json, default_claimed_json),
            )
        seed_lessons = [
            ("oop", "oop-c1", "1.1", "done", 0, 0, 80),
            ("oop", "oop-c1", "1.2", "done", 0, 0, 90),
            ("oop", "oop-c1", "1.3", "done", 0, 0, 120),
            ("oop", "oop-c1", "1.4", "done", 3, 3, 50),
            ("oop", "oop-c2", "2.1", "done", 0, 0, 80),
        ]
        for subj, ch_id, l_id, l_st, qs, qt, xp_val in seed_lessons:
            conn.execute(
                """INSERT OR IGNORE INTO student_lesson_progress(
                       id, user_id, subject_id, chapter_id, lesson_id, status, quiz_score, quiz_total, xp_earned, completed_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?)""",
                (uid(), "usr-sv-02", subj, ch_id, l_id, l_st, qs, qt, xp_val, now),
            )

    # 2. Seed Courses, Class Sections & Enrollments (Phương án A: Lộ trình -> Môn học -> Lớp học phần -> Ghi danh)
    stage_titles_map = {
        1: "Cơ sở cốt lõi",
        2: "Giao diện & Trải nghiệm",
        3: "Kiến trúc Nền tảng",
        4: "Trí tuệ Nhân tạo Ứng dụng",
        5: "Chuyên sâu & Tốt nghiệp",
    }
    course_stage_map = {
        "CS201": (1, 4),
        "CS202": (1, 4),
        "CS205": (1, 3),
        "CS210": (2, 3),
        "CS215": (2, 3),
        "CS306": (2, 3),
        "CS304": (3, 4),
        "CS308": (3, 3),
        "CS315": (3, 4),
        "CS312": (3, 3),
        "CS410": (4, 4),
        "CS420": (4, 4),
        "CS405": (5, 3),
        "CS415": (5, 3),
        "CS401": (5, 3),
        "CS499": (5, 6),
    }
    teacher_to_instructor_id = {
        "Cô Trần Thị B": "usr-gv-01",
        "Thầy Nguyễn Phước": "usr-gv-02",
        "Thầy Trần Minh Quân": "usr-gv-03",
        "Thầy Đặng Quốc Bảo": "usr-gv-04",
        "TS. Lê Hoàng Mai": "usr-gv-05",
    }
    fixed_student_owners = {
        "CS215": ("Cô Trần Thị B", "usr-gv-01"),
        "CS306": ("Thầy Trần Minh Quân", "usr-gv-03"),
        "CS401": ("Thầy Đặng Quốc Bảo", "usr-gv-04"),
    }

    if force_reseed:
        conn.execute("DELETE FROM class_enrollments")
        conn.execute("DELETE FROM class_sections")
        conn.execute("DELETE FROM courses")

    for c in _build_courses_seed():
        stage_no, creds = course_stage_map.get(c["code"], (1, 3))
        stage_title = stage_titles_map.get(stage_no, "Cơ sở cốt lõi")
        inst_id = c.get("instructor_id") or teacher_to_instructor_id.get(c["teacher_name"], "")
        exists_course = conn.execute("SELECT id FROM courses WHERE id=? OR code=?", (c["id"], c["code"])).fetchone()
        if not exists_course:
            conn.execute(
                """INSERT INTO courses(
                       id, subject_id, code, name, stage_number, stage_title, semester, credits,
                       instructor_id, teacher_name, student_count, avg_progress_pct,
                       pending_dual_reviews, health, room, docker_image, sandbox_enabled, ai_defense_enabled,
                       chapters_json, updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    c["id"], c["subject_id"], c["code"], c["name"], stage_no, stage_title,
                    c["semester"], creds, inst_id or None, c["teacher_name"],
                    c["student_count"], c["avg_progress_pct"], c["pending_dual_reviews"], c["health"], c["room"],
                    c["docker_image"], c["sandbox_enabled"], c["ai_defense_enabled"],
                    json.dumps(c["chapters"], ensure_ascii=False), now,
                ),
            )

    # Sửa idempotent dữ liệu học viên đứng tên chủ lớp & chuẩn hóa instructor_id + stage_number
    for code, (real_teacher, real_inst_id) in fixed_student_owners.items():
        conn.execute(
            """UPDATE courses
               SET teacher_name=?, instructor_id=?, updated_at=?
               WHERE code=? AND (teacher_name IN ('Phan Đình Nghị', 'Nguyễn Bá Hòa') OR instructor_id IS NULL OR instructor_id='')""",
            (real_teacher, real_inst_id, now, code),
        )
    for t_name, inst_id in teacher_to_instructor_id.items():
        conn.execute(
            "UPDATE courses SET instructor_id=? WHERE (instructor_id IS NULL OR instructor_id='') AND teacher_name=?",
            (inst_id, t_name),
        )
    for code, (stage_no, creds) in course_stage_map.items():
        stage_title = stage_titles_map.get(stage_no, "Cơ sở cốt lõi")
        if stage_no != 1 or creds != 3:
            conn.execute(
                """UPDATE courses
                   SET stage_number=?, stage_title=?, credits=?
                   WHERE code=? AND stage_number=1 AND stage_title='Cơ sở cốt lõi'""",
                (stage_no, stage_title, creds, code),
            )

    # Seed class_sections N01 (id = course["id"] để tương thích ngược dual_submissions / defense_sessions)
    all_courses_rows = conn.execute("SELECT * FROM courses").fetchall()
    for c_row in all_courses_rows:
        sec_id = c_row["id"]
        sec_code = f"{c_row['code']}-N01"
        resolved_inst_id = c_row.get("instructor_id") or teacher_to_instructor_id.get(c_row["teacher_name"], "") or None
        existing_sec = conn.execute(
            "SELECT id, teacher_name, instructor_id FROM class_sections WHERE id=? OR section_code=?",
            (sec_id, sec_code),
        ).fetchone()
        if not existing_sec:
            conn.execute(
                """INSERT INTO class_sections(
                       id, course_id, section_code, semester, instructor_id, teacher_name, room, max_students,
                       docker_image, sandbox_enabled, ai_defense_enabled, avg_progress_pct,
                       pending_dual_reviews, health, status, created_at, updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    sec_id, c_row["id"], sec_code, c_row["semester"], resolved_inst_id, c_row["teacher_name"],
                    c_row.get("room") or "Lab A3-201", max(45, int(c_row.get("student_count") or 40)),
                    c_row["docker_image"], c_row["sandbox_enabled"], c_row["ai_defense_enabled"],
                    c_row["avg_progress_pct"], c_row["pending_dual_reviews"], c_row["health"], "active", now, now,
                ),
            )
        else:
            if (existing_sec.get("teacher_name") in ("Phan Đình Nghị", "Nguyễn Bá Hòa")) or not (existing_sec.get("instructor_id") or "").strip():
                conn.execute(
                    "UPDATE class_sections SET teacher_name=?, instructor_id=?, updated_at=? WHERE id=?",
                    (c_row["teacher_name"], resolved_inst_id, now, existing_sec["id"]),
                )

    # Seed class_enrollments thực tế khi chưa có bản ghi nào (giữ nguyên chỉnh sửa thủ công của Admin về sau)
    existing_enrollments_cnt = conn.execute("SELECT COUNT(*) c FROM class_enrollments").fetchone()["c"]
    valid_student_ids = {r["id"] for r in conn.execute("SELECT id FROM users WHERE role='student'").fetchall()}
    code_to_section_id = {
        r["code"]: r["id"]
        for r in conn.execute(
            """SELECT c.code, cs.id
               FROM class_sections cs
               JOIN courses c ON c.id = cs.course_id
               ORDER BY cs.created_at ASC"""
        ).fetchall()
    }
    if existing_enrollments_cnt == 0 or force_reseed:
        starter_enrollments: dict[str, list[str]] = {
            "usr-sv-02": ["CS201", "CS202", "CS205", "CS210", "CS304", "CS308", "CS420", "CS405", "CS499"],
            "usr-sv-01": ["CS201", "CS202", "CS210", "CS304", "CS308", "CS499"],
            "usr-sv-03": ["CS202", "CS205", "CS304", "CS315", "CS405", "CS499"],
            "usr-sv-04": ["CS205", "CS215", "CS304", "CS312", "CS401"],
            "usr-sv-05": ["CS201", "CS420"],
            "usr-sv-07": ["CS201", "CS210", "CS215", "CS306", "CS499"],
            "usr-sv-08": ["CS410", "CS420", "CS415", "CS499"],
            "student-demo": ["CS201", "CS202", "CS210", "CS304", "CS420"],
        }
        for stu_id, course_codes in starter_enrollments.items():
            if stu_id not in valid_student_ids:
                continue
            for code in course_codes:
                sec_id = code_to_section_id.get(code)
                if not sec_id:
                    continue
                conn.execute(
                    """INSERT IGNORE INTO class_enrollments(id, section_id, student_id, status, enrolled_at)
                       VALUES(?,?,?,?,?)""",
                    (f"enr-{sec_id}-{stu_id}", sec_id, stu_id, "active", now),
                )
        # Đảm bảo học viên có dual_submissions luôn được ghi danh vào lớp tương ứng
        for sub_row in conn.execute("SELECT DISTINCT class_id, user_id FROM dual_submissions").fetchall():
            if sub_row["user_id"] in valid_student_ids and conn.execute(
                "SELECT id FROM class_sections WHERE id=?", (sub_row["class_id"],)
            ).fetchone():
                conn.execute(
                    """INSERT IGNORE INTO class_enrollments(id, section_id, student_id, status, enrolled_at)
                       VALUES(?,?,?,?,?)""",
                    (f"enr-{sub_row['class_id']}-{sub_row['user_id']}", sub_row["class_id"], sub_row["user_id"], "active", now),
                )
        # Đảm bảo lớp nào chưa có học viên nào thì có ít nhất cặp học viên đại diện để GV test được ngay
        for c_row in all_courses_rows:
            sec_id = c_row["id"]
            cnt_row = conn.execute(
                "SELECT COUNT(*) c FROM class_enrollments WHERE section_id=? AND status='active'",
                (sec_id,),
            ).fetchone()
            if (cnt_row["c"] if cnt_row else 0) == 0:
                for fallback_stu in ("usr-sv-01", "usr-sv-03"):
                    if fallback_stu in valid_student_ids:
                        conn.execute(
                            """INSERT IGNORE INTO class_enrollments(id, section_id, student_id, status, enrolled_at)
                               VALUES(?,?,?,?,?)""",
                            (f"enr-{sec_id}-{fallback_stu}", sec_id, fallback_stu, "active", now),
                        )

    # Đồng bộ sĩ số thật lên courses.student_count và users.classes_count
    conn.execute(
        """UPDATE courses
           SET student_count = COALESCE((
               SELECT COUNT(*)
               FROM class_enrollments ce
               JOIN class_sections cs ON cs.id = ce.section_id
               WHERE cs.course_id = courses.id AND ce.status = 'active'
           ), 0)"""
    )
    conn.execute(
        """UPDATE users
           SET classes_count = COALESCE((
               SELECT COUNT(*) FROM class_sections cs WHERE cs.instructor_id = users.id AND cs.status = 'active'
           ), 0)
           WHERE role = 'instructor'"""
    )
    conn.execute(
        """UPDATE users
           SET classes_count = COALESCE((
               SELECT COUNT(*) FROM class_enrollments ce WHERE ce.student_id = users.id AND ce.status = 'active'
           ), 0)
           WHERE role = 'student'"""
    )

    # 3. Seed Dual Submissions
    existing_subs = conn.execute("SELECT COUNT(*) c FROM dual_submissions").fetchone()["c"]
    if existing_subs == 0 or force_reseed:
        if force_reseed:
            conn.execute("DELETE FROM dual_submissions")
        for s in _build_dual_submissions_seed():
            conn.execute(
                """INSERT OR REPLACE INTO dual_submissions(
                       id, class_id, user_id, student_name, student_code, chapter_title, repo_url, submitted_at,
                       passed_tests, total_tests, exec_time_ms, memory_mb, commit_hash, commit_count, similarity_pct,
                       test_details_json, defense_status, defense_score, coherence_summary, transcript_json,
                       status, final_score, instructor_feedback, updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    s["id"], s["class_id"], s["user_id"], s["student_name"], s["student_code"], s["chapter_title"],
                    s["repo_url"], s["submitted_at"], s["passed_tests"], s["total_tests"], s["exec_time_ms"],
                    s["memory_mb"], s["commit_hash"], s["commit_count"], s["similarity_pct"],
                    json.dumps(s["test_details"], ensure_ascii=False), s["defense_status"], s["defense_score"],
                    s["coherence_summary"], json.dumps(s["transcript"], ensure_ascii=False),
                    s["status"], s["final_score"], s["instructor_feedback"], now,
                ),
            )

    # 4. Seed Defense Rubric
    existing_rubric = conn.execute("SELECT id FROM defense_rubric_configs WHERE id='default'").fetchone()
    if not existing_rubric or force_reseed:
        probes = [
            {"id": "probe-1", "chapterKeyword": "CS201 · Chương 1", "topic": "Giải thích cơ chế vptr / vtable lookup và hệ quả thiếu virtual destructor khi delete Base*."},
            {"id": "probe-2", "chapterKeyword": "CS202 · Chương 1", "topic": "Phân tích độ phức tạp O((V + E) log V) của Dijkstra và lý do cần điều kiện lazy deletion."},
            {"id": "probe-3", "chapterKeyword": "CS304 · Chương 1", "topic": "Quy trình xác thực Bearer JWT qua FastAPI Dependency và phân quyền RBAC tránh lộ dữ liệu chéo."},
            {"id": "probe-4", "chapterKeyword": "CS420 · Chương 1", "topic": "Cách thiết kế Chunk Overlap và ngưỡng Cosine Similarity trong pgvector để giảm ảo giác RAG."},
        ]
        conn.execute(
            """INSERT OR REPLACE INTO defense_rubric_configs(
                   id, cicd_weight_pct, defense_weight_pct, strict_anti_copy_guardrail,
                   auto_flag_discrepancy_threshold, mandatory_probes_json, updated_at
               ) VALUES('default', 60, 40, 1, 25, ?, ?)""",
            (json.dumps(probes, ensure_ascii=False), now),
        )

    # 5. Seed AI Services & Compute Units
    existing_svcs = conn.execute("SELECT COUNT(*) c FROM ai_service_units").fetchone()["c"]
    if existing_svcs == 0 or force_reseed:
        if force_reseed:
            conn.execute("DELETE FROM ai_service_units")
        services = [
            ("svc-socratic", "Socratic Tutor & Hint 3 Nấc", "LLM Guardrail (refuse_answer)", "18,420 lượt gợi ý Socratic", 18420, 9420000, 3840000, 118.4, 68, "#14161a", 1),
            ("svc-defense", "Hội đồng Phản biện AI 3D", "Multi-Agent Oral Defense", "412 phiên bảo vệ vấn đáp", 412, 4860000, 1920000, 92.6, 54, "#EE8420", 1),
            ("svc-aigc", "AIGC Course & Master Mindmap Studio", "Curriculum & Graph Extractor", "184 giáo trình · 36 Master Maps", 220, 2150000, 980000, 46.2, 32, "#64748b", 1),
            ("svc-docker", "Docker CI/CD Isolated Sandbox Pool", "Seccomp (--network=none) Runners", "2,890 lượt chấm Valgrind / Pytest", 2890, 0, 0, 64.0, 45, "#94a3b8", 1),
        ]
        for row in services:
            conn.execute(
                """INSERT OR REPLACE INTO ai_service_units(
                       id, name, engine, usage_label, requests, input_tokens, output_tokens, estimated_cost, quota_pct, bar_color, active
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                row,
            )

    # 6. Seed System Settings (Guardrail & Security Policies + Broadcast)
    existing_policies = conn.execute("SELECT key FROM system_settings WHERE key='policies'").fetchone()
    if not existing_policies or force_reseed:
        policies = {
            "budgetCap": 500,
            "guardrailRefuseAnswer": True,
            "rateLimit20PerHour": True,
            "dockerNetworkNone": True,
            "require2FA": False,
            "blockConcurrentIP": True,
            "autoLockFailedAttempts": True,
        }
        conn.execute(
            "INSERT OR REPLACE INTO system_settings(key, value_json, updated_at) VALUES('policies', ?, ?)",
            (json.dumps(policies), now),
        )
    if force_reseed:
        conn.execute("DELETE FROM system_settings WHERE key='broadcast'")

    # 7. Seed JWT Sessions (Đa thiết bị cho Học viên, Giảng viên & Admin)
    existing_jwt = conn.execute("SELECT COUNT(*) c FROM jwt_sessions").fetchone()["c"]
    if existing_jwt == 0 or force_reseed:
        if force_reseed:
            conn.execute("DELETE FROM jwt_sessions")
        sessions = [
            ("jwt-01", "usr-adm-01", None, "Admin AIO", "Quản trị viên", "Workstation · Chrome 126", "10.0.1.5 (Campus Core VLAN)", "Hợp lệ (JWT + Refresh)", "08:02 hôm nay", 0, 0, "desktop", "Chrome 126", "Windows 11", now, now),
            ("jwt-02", "usr-gv-01", None, "Cô Trần Thị B", "Giảng viên", "MacBook Pro · Chrome 126", "192.168.10.24 (TP.HCM)", "Hợp lệ (JWT + Refresh)", "08:45 hôm nay", 0, 0, "laptop", "Chrome 126", "macOS Sonoma", now, now),
            ("jwt-03", "usr-sv-02", None, "Nguyễn Văn A", "Học viên", "Windows 11 · Chrome 126", "14.161.42.88 (Hà Nội)", "Hợp lệ (JWT + Refresh)", "09:12 hôm nay", 0, 0, "laptop", "Chrome 126", "Windows 11", now, now),
            ("jwt-04", "usr-gv-02", None, "Thầy Nguyễn Phước", "Giảng viên", "Windows 11 · Edge 125", "113.190.15.9 (Đà Nẵng)", "Thiết bị mới", "10:04 hôm nay", 1, 0, "desktop", "Edge 125", "Windows 11", now, now),
            ("jwt-05", "usr-sv-05", None, "Nguyễn Minh Khôi", "Học viên", "MacBook Pro + iPhone Safari (2 IP)", "172.16.8.14 (Phát hiện trùng phiên thi)", "Cảnh báo trùng IP thi", "10:19 hôm nay", 1, 0, "mobile", "Safari Mobile", "iOS 18", now, now),
            ("jwt-06", "usr-sv-02", None, "Nguyễn Văn A", "Học viên", "iPadOS 17 · Mobile Safari", "113.161.72.19 (TP.HCM · Mạng công cộng)", "Thiết bị mới (Chưa xác minh)", "Hôm qua 21:40", 1, 0, "tablet", "Mobile Safari", "iPadOS 17", now, now),
        ]
        for s in sessions:
            conn.execute(
                """INSERT OR REPLACE INTO jwt_sessions(
                       id, user_id, jti, user_name, role, device, ip_location, state, issued_at,
                       is_untrusted, revoked, device_type, browser, os, last_active_at, created_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                s,
            )

    # 8. Seed Pending Approvals
    existing_pend = conn.execute("SELECT COUNT(*) c FROM pending_approvals").fetchone()["c"]
    if existing_pend == 0 or force_reseed:
        if force_reseed:
            conn.execute("DELETE FROM pending_approvals")
        approvals = [
            ("pend-01", "Nguyễn Minh Khôi", "2210866", "khoi.nm@student.edu.vn", "CS201", "OOP & Cấu trúc Dữ liệu", "Học viên", "Cần xác minh bổ sung lịch sử phiên thi", "pending", now),
            ("pend-02", "Đỗ Mỹ Linh", "2210884", "linh.dm@student.edu.vn", "CS420", "AI-Native Web App & RAG", "Học viên", "Hồ sơ hợp lệ · Đã hoàn tất CS201", "pending", now),
            ("pend-03", "Hoàng Trọng Nam", "GV-2026-03", "nam.ht@codemind.ai", "CS420", "Trợ giảng / Cố vấn AI Research", "Giảng viên", "Chờ Admin cấp quyền Instructor RBAC", "pending", now),
        ]
        for a in approvals:
            conn.execute(
                """INSERT OR REPLACE INTO pending_approvals(
                       id, name, student_code, email, class_code, class_name, requested_role, risk_note, status, created_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?)""",
                a,
            )

    # 9. Seed Audit Logs (khi chưa có log khởi tạo)
    existing_audits = conn.execute("SELECT COUNT(*) c FROM audit_events WHERE actor_label IS NOT NULL").fetchone()["c"]
    if existing_audits == 0:
        audits = [
            ("aud-seed-01", "usr-adm-01", "Admin AIO (ADM-01)", "Đồng bộ cấu hình Trọng số Kép 60% CI/CD · 40% Phản biện AI", "rubric", "default", "Hệ thống Thẩm định CS201 & CS202", "allow", "ai", "ai", "2026-11-18T03:42:00+00:00"),
            ("aud-seed-02", None, "System Security", "Cảnh báo đăng nhập đồng thời 2 IP trong ca Phản biện 3D", "jwt_session", "jwt-05", "Nguyễn Minh Khôi (2210866)", "deny", "security", "security", "2026-11-18T03:18:00+00:00"),
            ("aud-seed-03", "usr-gv-01", "Cô Trần Thị B", "Phát hành Master Mindmap Chương 1 & 5 Docker Test Cases", "course", "class-oop", "CS201 · Chương 1: Đa hình & vtable", "allow", "class", "class", "2026-11-18T02:50:00+00:00"),
            ("aud-seed-04", "usr-adm-01", "Admin AIO (ADM-01)", "Khóa tạm thời tài khoản do vi phạm quy chế Sandbox", "user", "usr-sv-06", "Hoàng Ngọc D (2210899)", "allow", "user", "user", "2026-11-18T02:15:00+00:00"),
            ("aud-seed-05", "usr-adm-01", "Admin AIO (ADM-01)", "Bật chính sách Guardrail refuse_answer & Giới hạn 20 câu/giờ", "policy", "policies", "Socratic Tutor & Hint 3 Nấc", "allow", "ai", "ai", "2026-11-17T13:10:00+00:00"),
        ]
        for row in audits:
            conn.execute(
                """INSERT OR IGNORE INTO audit_events(
                       id, actor_user_id, actor_label, action, resource_type, resource_id, target_label,
                       decision, reason_code, category, created_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                row,
            )

    # 10. Seed Lessons & Instructor Learning Sessions (cho Tab Bằng chứng Tự học)
    extra_lessons = [
        ("lesson-oop-vtable", "oop-vtable", 1, "vtable & Virtual Destructor", "Hiểu cơ chế dynamic dispatch và RAII trong C++20.", "published", now),
        ("lesson-dsa-dijkstra", "dsa-dijkstra", 1, "Dijkstra & DSU", "Tối ưu Priority Queue với lazy deletion trên đồ thị lớn.", "published", now),
        ("lesson-web-jwt", "web-jwt", 1, "JWT & PostgreSQL", "Xác thực Bearer JWT và Dependency RBAC chuẩn FastAPI.", "published", now),
        ("lesson-ai-rag", "ai-rag", 1, "RAG pgvector", "Lọc ngưỡng tương đồng cosine trước khi đưa vào context.", "published", now),
    ]
    for l_row in extra_lessons:
        conn.execute(
            "INSERT OR IGNORE INTO lessons(id, slug, version, title, objective, status, published_at) VALUES(?,?,?,?,?,?,?)",
            l_row,
        )

    sess_seeds = [
        {
            "id": "sess-oop-01",
            "user_id": "usr-sv-01",
            "lesson_id": "lesson-oop-vtable",
            "status": "completed",
            "current_step_no": 6,
            "course_code": "CS201",
            "time_spent_min": 19,
            "socratic_note": "Không dùng virtual destructor sẽ bỏ qua destructor lớp dẫn xuất khi delete qua con trỏ Base*, gây rò rỉ Heap.",
            "passed_count": 5,
            "hint_count": 0,
            "step_logs": [
                {"step": 1, "label": "Đọc mục tiêu & hợp đồng tự học", "outcome": "completed", "detail": "Kích hoạt chế độ chia sẻ bằng chứng cho giảng viên", "timestamp": "08:10"},
                {"step": 2, "label": "Khám phá khái niệm vptr / vtable", "outcome": "completed", "detail": "Đúng 3/3 câu hỏi nhận diện vùng nhớ con trỏ ảo", "timestamp": "08:15"},
                {"step": 4, "label": "Chạy kiểm thử Docker Sandbox", "outcome": "passed", "detail": "Pass 5/5 test cases (kể cả Valgrind leak check)", "timestamp": "08:24"},
                {"step": 6, "label": "Lưu ghi chú phản tư & nộp bài", "outcome": "completed", "detail": "Tự lực hoàn thành, không mở gợi ý AI", "timestamp": "08:29"},
            ],
        },
        {
            "id": "sess-oop-02",
            "user_id": "usr-sv-02",
            "lesson_id": "lesson-oop-vtable",
            "status": "completed",
            "current_step_no": 6,
            "course_code": "CS201",
            "time_spent_min": 28,
            "socratic_note": "Ban đầu bị object slicing do truyền tham trị Employee thay vì Employee*; đã tự sửa lại truyền con trỏ.",
            "passed_count": 5,
            "hint_count": 2,
            "step_logs": [
                {"step": 2, "label": "Kiểm tra khái niệm Dynamic Dispatch", "outcome": "completed", "detail": "Hoàn thành câu hỏi phân biệt override và overload", "timestamp": "09:04"},
                {"step": 4, "label": "Chạy kiểm thử lần 1", "outcome": "stuck", "detail": "Trượt Test 4 & 5 do thiếu từ khóa override và virtual", "timestamp": "09:13"},
                {"step": 5, "label": "Hỏi Socratic AI & Mở Hint Nấc 2", "outcome": "hint", "detail": "Nhận phân tích lỗi Object Slicing ở chữ ký hàm evaluatePayroll", "timestamp": "09:19"},
                {"step": 6, "label": "Tự sửa mã nguồn & Pass 5/5", "outcome": "completed", "detail": "Ghi chú bài học kinh nghiệm rõ ràng", "timestamp": "09:32"},
            ],
        },
        {
            "id": "sess-dsa-03",
            "user_id": "usr-sv-03",
            "lesson_id": "lesson-dsa-dijkstra",
            "status": "in_progress",
            "current_step_no": 5,
            "course_code": "CS202",
            "time_spent_min": 44,
            "socratic_note": "Đang xử lý test biên đồ thị không liên thông và cạnh trọng số bằng 0 khi dùng priority_queue.",
            "passed_count": 4,
            "hint_count": 3,
            "step_logs": [
                {"step": 2, "label": "Ôn tập Min-Heap & Lazy Deletion", "outcome": "completed", "detail": "Gắn thẻ cặp (dist, u) chuẩn xác", "timestamp": "09:40"},
                {"step": 4, "label": "Chạy kiểm thử Sandbox", "outcome": "stuck", "detail": "Pass 4/5 — TLE ở đồ thị dày 10^5 cạnh do thiếu check d > dist[u]", "timestamp": "10:02"},
                {"step": 5, "label": "Mở Hint Nấc 3 (Pseudo-code)", "outcome": "hint", "detail": "Đã xem khung lệnh if (d > dist[u]) continue; và đang tự code lại", "timestamp": "10:18"},
            ],
        },
        {
            "id": "sess-web-04",
            "user_id": "usr-sv-04",
            "lesson_id": "lesson-web-jwt",
            "status": "completed",
            "current_step_no": 6,
            "course_code": "CS304",
            "time_spent_min": 22,
            "socratic_note": "Phân biệt rõ Access Token ngắn hạn (stateless) và Refresh Token lưu hash kèm kiểm tra role ở Depends(require_instructor).",
            "passed_count": 5,
            "hint_count": 1,
            "step_logs": [
                {"step": 1, "label": "Đọc spec RBAC FastAPI", "outcome": "completed", "detail": "Chọn 2 thuật ngữ cốt lõi: Bearer JWT, RBAC Guard", "timestamp": "13:05"},
                {"step": 4, "label": "Chạy pytest RBAC Suite", "outcome": "hint", "detail": "Mở Hint Nấc 1 về HTTP 403 vs 401 trước khi sửa dependency", "timestamp": "13:16"},
                {"step": 6, "label": "Nộp bằng chứng hoàn tất", "outcome": "completed", "detail": "Pass 5/5 kiểm thử phân quyền & token expiry", "timestamp": "13:27"},
            ],
        },
        {
            "id": "sess-ai-05",
            "user_id": "usr-sv-05",
            "lesson_id": "lesson-ai-rag",
            "status": "in_progress",
            "current_step_no": 4,
            "course_code": "CS420",
            "time_spent_min": 52,
            "socratic_note": "Chưa truyền cosine distance threshold vào truy vấn pgvector nên context trả về bị nhiễu chunk ngoài chủ đề.",
            "passed_count": 2,
            "hint_count": 3,
            "step_logs": [
                {"step": 3, "label": "Trắc nghiệm Embedding & Chunking", "outcome": "completed", "detail": "Đạt 2/3 câu hỏi khái niệm", "timestamp": "14:00"},
                {"step": 4, "label": "Chạy đánh giá Retrieval Precision", "outcome": "stuck", "detail": "Pass 2/5 — Top-k chưa lọc độ tương đồng tối thiểu", "timestamp": "14:25"},
                {"step": 5, "label": "Mở Hint Nấc 3", "outcome": "hint", "detail": "Cần giảng viên hướng dẫn thêm về Cosine Similarity (<=>)", "timestamp": "14:46"},
            ],
        },
        {
            "id": "sess-oop-06",
            "user_id": "usr-sv-07",
            "lesson_id": "lesson-oop-vtable",
            "status": "in_progress",
            "current_step_no": 4,
            "course_code": "CS201",
            "time_spent_min": 49,
            "socratic_note": "Còn lúng túng giữa hàm thuần ảo (= 0) và hàm ảo thường khi thiết kế lớp trừu tượng Employee.",
            "passed_count": 3,
            "hint_count": 3,
            "step_logs": [
                {"step": 2, "label": "Đọc tài liệu & Video Script", "outcome": "completed", "detail": "Xem hết 3 phân cảnh vtable", "timestamp": "15:05"},
                {"step": 4, "label": "Biên dịch Docker C++20", "outcome": "stuck", "detail": "Lỗi compile khi thử khởi tạo trực tiếp abstract class Employee", "timestamp": "15:31"},
                {"step": 5, "label": "Mở Hint Nấc 3", "outcome": "hint", "detail": "Chưa chạy lại test sau khi xem gợi ý", "timestamp": "15:52"},
            ],
        },
    ]

    for s in sess_seeds:
        exists_ls = conn.execute("SELECT id FROM learning_sessions WHERE id=?", (s["id"],)).fetchone()
        if exists_ls:
            continue
        conn.execute(
            """INSERT INTO learning_sessions(
                   id, user_id, lesson_id, organization_id, status, current_step_no, progress_version,
                   teacher_visibility, started_at, updated_at, completed_at, course_code,
                   socratic_note, time_spent_min, step_logs_json
               ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                s["id"], s["user_id"], s["lesson_id"], org_id, s["status"], s["current_step_no"], 1,
                1, now, now, now if s["status"] == "completed" else None, s["course_code"],
                s["socratic_note"], s["time_spent_min"], json.dumps(s["step_logs"], ensure_ascii=False),
            ),
        )
        # Seed matching submission + evidence so LEFT JOIN e.passed_count / e.hint_count is exact
        first_sub_id = f"sub-first-{s['id']}"
        final_sub_id = f"sub-final-{s['id']}"
        conn.execute(
            """INSERT OR IGNORE INTO submissions(
                   id, learning_session_id, source_code, source_sha256, submission_no,
                   idempotency_key, status, passed_count, total_count, created_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (first_sub_id, s["id"], "// initial draft", f"sha-{first_sub_id}", 1, f"idem-1-{s['id']}", "failed", max(1, s["passed_count"] - 1), 5, now),
        )
        conn.execute(
            """INSERT OR IGNORE INTO submissions(
                   id, learning_session_id, source_code, source_sha256, submission_no,
                   idempotency_key, status, passed_count, total_count, created_at
               ) VALUES(?,?,?,?,?,?,?,?,?,?)""",
            (final_sub_id, s["id"], "// evaluated code", f"sha-{final_sub_id}", 2, f"idem-2-{s['id']}", "passed" if s["passed_count"] == 5 else "failed", s["passed_count"], 5, now),
        )
        conn.execute(
            """INSERT OR IGNORE INTO evidence(
                   id, learning_session_id, first_submission_id, final_submission_id,
                   hint_count, passed_count, evidence_sha256, completed_at
               ) VALUES(?,?,?,?,?,?,?,?)""",
            (f"ev-{s['id']}", s["id"], first_sub_id, final_sub_id, s["hint_count"], s["passed_count"], f"evsha-{s['id']}", now),
        )
