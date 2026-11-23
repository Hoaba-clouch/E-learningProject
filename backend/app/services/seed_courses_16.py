from __future__ import annotations
import json
import os
from typing import Any

_COURSES_CACHE: list[dict[str, Any]] | None = None

def _get_default_courses() -> list[dict[str, Any]]:
    subjects = [
        ("course-oop", "oop", "CS201", "Lập trình Hướng đối tượng C++ (OOP)", "Học kỳ 1 · 2026", "Thầy Nguyễn Phước", 42, 68, 3, "good", "Lab-302", "codemind/sandbox-cpp:latest"),
        ("course-dsa", "dsa", "CS202", "Cấu trúc Dữ liệu & Giải thuật Chuyên sâu", "Học kỳ 1 · 2026", "Cô Trần Thị Mai", 38, 54, 5, "stable", "Lab-303", "codemind/sandbox-algo:latest"),
        ("course-network", "network", "CS203", "Mạng Máy tính & Giao thức TCP/IP", "Học kỳ 1 · 2026", "Thầy Lê Hoàng Nam", 35, 60, 2, "good", "Lab-201", "codemind/sandbox-net:latest"),
        ("course-frontend", "frontend", "CS204", "Kỹ thuật Web Frontend Hiện đại (React 19 & Next.js)", "Học kỳ 2 · 2026", "Thầy Vũ Quốc Huy", 45, 75, 4, "good", "Lab-102", "codemind/sandbox-node:latest"),
        ("course-realtime", "realtime", "CS205", "Real-time Web & WebSockets High-Concurrency", "Học kỳ 2 · 2026", "Cô Lê Thị Thanh", 30, 48, 2, "stable", "Lab-103", "codemind/sandbox-node:latest"),
        ("course-mobile", "mobile", "CS206", "Lập trình Di động Đa nền tảng (Flutter & Dart)", "Học kỳ 2 · 2026", "Thầy Đỗ Minh Quân", 32, 50, 1, "good", "Lab-104", "codemind/sandbox-flutter:latest"),
        ("course-web", "web", "CS207", "Thiết kế Kiến trúc Web Nâng cao (SPA & Micro-frontends)", "Học kỳ 2 · 2026", "Thầy Phan Anh Tuấn", 40, 62, 3, "good", "Lab-105", "codemind/sandbox-node:latest"),
        ("course-system-design", "system-design", "CS301", "Thiết kế Hệ thống Quy mô lớn (System Design)", "Học kỳ 3 · 2026", "Thầy Nguyễn Phước", 36, 45, 6, "warning", "Hall-A", "codemind/sandbox-arch:latest"),
        ("course-distributed", "distributed", "CS302", "Hệ thống Phân tán & Microservices (Kafka / gRPC)", "Học kỳ 3 · 2026", "Cô Phạm Thùy Linh", 28, 40, 4, "stable", "Lab-205", "codemind/sandbox-cloud:latest"),
        ("course-security", "security", "CS303", "An toàn Thông tin & Bảo mật Ứng dụng Web", "Học kỳ 3 · 2026", "Thầy Trần Bảo Long", 34, 58, 2, "good", "Lab-206", "codemind/sandbox-sec:latest"),
        ("course-ai-ml", "ai-ml", "CS304", "Trí tuệ Nhân tạo & Machine Learning Cơ bản", "Học kỳ 4 · 2026", "TS. Hoàng Đức Trọng", 48, 70, 5, "good", "Lab-AI-01", "codemind/sandbox-python:latest"),
        ("course-ai-agent", "ai-agent", "CS305", "AI Agents & Ứng dụng LLM Socratic", "Học kỳ 4 · 2026", "TS. Hoàng Đức Trọng", 42, 65, 3, "good", "Lab-AI-02", "codemind/sandbox-python:latest"),
        ("course-devops", "devops", "CS306", "DevOps & Tự động hóa CI/CD Pipeline (Docker/K8s)", "Học kỳ 4 · 2026", "Thầy Đinh Quang Minh", 35, 52, 2, "stable", "Lab-DevOps", "codemind/sandbox-ci:latest"),
        ("course-cloud", "cloud", "CS307", "Điện toán Đám mây (AWS & GCP Cloud Architecture)", "Học kỳ 5 · 2026", "Thầy Đinh Quang Minh", 30, 48, 3, "good", "Lab-Cloud", "codemind/sandbox-cloud:latest"),
        ("course-scrum", "scrum", "CS308", "Quản trị Đồ án Phần mềm Chuẩn Agile / Scrum", "Học kỳ 5 · 2026", "Cô Nguyễn Kim Oanh", 50, 80, 1, "good", "Hall-B", "codemind/sandbox-scrum:latest"),
        ("course-capstone", "capstone", "CS401", "Đồ án Tốt nghiệp Kỹ sư Phần mềm (Capstone Project)", "Học kỳ 6 · 2026", "Hội đồng Khoa học CNTT", 25, 85, 0, "good", "Audit-01", "codemind/sandbox-full:latest"),
    ]
    courses = []
    for cid, sub_id, code, name, sem, teacher, st_cnt, prog, rev, health, room, img in subjects:
        courses.append({
            "id": cid,
            "subject_id": sub_id,
            "code": code,
            "name": name,
            "semester": sem,
            "teacher_name": teacher,
            "student_count": st_cnt,
            "avg_progress_pct": prog,
            "pending_dual_reviews": rev,
            "health": health,
            "room": room,
            "docker_image": img,
            "sandbox_enabled": 1,
            "ai_defense_enabled": 1,
            "chapters": [
                {
                    "id": f"{sub_id}-c1",
                    "number": 1,
                    "title": "Chương 1: Tổng quan & Khái niệm Cốt lõi",
                    "description": "Nền tảng lý thuyết và thực hành đầu tiên.",
                    "duration": "45 phút",
                    "progressPct": 100,
                    "lessons": [
                        {
                            "id": "1.1",
                            "title": "Nhập môn & Cài đặt môi trường",
                            "type": "video",
                            "duration": "15 phút",
                            "status": "done",
                            "xp": 50,
                            "objective": "Nắm vững quy chuẩn",
                            "lead": "Bắt đầu hành trình học tập",
                            "keyTakeaways": ["Thiết lập môi trường", "Kiểm thử code"]
                        }
                    ]
                }
            ]
        })
    return courses


def build_all_16_courses_seed() -> list[dict[str, Any]]:
    global _COURSES_CACHE
    if _COURSES_CACHE is not None:
        return _COURSES_CACHE
    json_path = os.path.join(os.path.dirname(__file__), "..", "data", "courses_16.json")
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                _COURSES_CACHE = json.load(f)
                return _COURSES_CACHE
        except Exception:
            pass
    _COURSES_CACHE = _get_default_courses()
    # Save cache for next runs if dir exists
    try:
        os.makedirs(os.path.dirname(json_path), exist_ok=True)
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(_COURSES_CACHE, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
    return _COURSES_CACHE
