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
    return [
        {
            "id": "class-oop",
            "subject_id": "oop",
            "code": "CS201",
            "name": "Lập trình Hướng đối tượng & Cấu trúc Dữ liệu",
            "semester": "Học kỳ 1 / 2026",
            "teacher_name": "Cô Trần Thị B",
            "student_count": 42,
            "avg_progress_pct": 74,
            "pending_dual_reviews": 3,
            "health": "Ổn định",
            "room": "Lab A3-201",
            "docker_image": "codemind/cpp20-sandbox:valgrind-1.4",
            "sandbox_enabled": 1,
            "ai_defense_enabled": 1,
            "chapters": [
                {
                    "id": "oop-ch1",
                    "title": "Chương 1: Kế thừa, Đa hình & Kiến trúc vtable",
                    "status": "Đã phát hành",
                    "mindmapGenerated": True,
                    "mindmapNodes": [
                        {
                            "id": "oop-root",
                            "type": "masterMindmapNode",
                            "position": {"x": 40, "y": 170},
                            "data": {
                                "title": "Chương 1: OOP & Kiến trúc vtable",
                                "summary": "Sơ đồ Master Graph chuẩn của chương",
                                "tag": "CS201 · ROOT",
                                "nodeType": "root",
                                "masteryPct": 78,
                                "xp": 210,
                            },
                        },
                        {
                            "id": "oop-b1",
                            "type": "masterMindmapNode",
                            "position": {"x": 350, "y": 40},
                            "data": {
                                "title": "1.1 Kế thừa & Bố cục bộ nhớ",
                                "summary": "Superclass Employee, tái sử dụng thuộc tính và constructor chaining.",
                                "tag": "Inheritance",
                                "nodeType": "branch",
                                "masteryPct": 89,
                            },
                        },
                        {
                            "id": "oop-b2",
                            "type": "masterMindmapNode",
                            "position": {"x": 350, "y": 175},
                            "data": {
                                "title": "1.2 Đa hình & Bảng ảo vtable",
                                "summary": "Dynamic dispatch qua vptr runtime, giải quyết bài toán evaluatePayroll.",
                                "tag": "Polymorphism",
                                "nodeType": "branch",
                                "masteryPct": 68,
                            },
                        },
                        {
                            "id": "oop-b3",
                            "type": "masterMindmapNode",
                            "position": {"x": 350, "y": 310},
                            "data": {
                                "title": "1.3 Virtual Destructor & RAII",
                                "summary": "Giải phóng đúng thứ tự Subclass -> Baseclass tránh memory leak.",
                                "tag": "Memory Safety",
                                "nodeType": "branch",
                                "masteryPct": 44,
                            },
                        },
                        {
                            "id": "oop-l1",
                            "type": "masterMindmapNode",
                            "position": {"x": 670, "y": 110},
                            "data": {
                                "title": "Object Slicing Guard",
                                "summary": "Truyền Base* hoặc Base& thay vì truyền tham trị cắt mất phần lớp con.",
                                "tag": "Edge Case",
                                "nodeType": "leaf",
                                "masteryPct": 52,
                            },
                        },
                        {
                            "id": "oop-l2",
                            "type": "masterMindmapNode",
                            "position": {"x": 670, "y": 260},
                            "data": {
                                "title": "SOLID Interface Contract",
                                "summary": "Thuần ảo (= 0) ép buộc lớp con hiện thực calculateSalary().",
                                "tag": "Docker Lab",
                                "nodeType": "leaf",
                                "masteryPct": 64,
                            },
                        },
                    ],
                    "mindmapEdges": [
                        _edge("oop-e1", "oop-root", "oop-b1"),
                        _edge("oop-e2", "oop-root", "oop-b2"),
                        _edge("oop-e3", "oop-root", "oop-b3"),
                        _edge("oop-e4", "oop-b2", "oop-l1"),
                        _edge("oop-e5", "oop-b2", "oop-l2"),
                        _edge("oop-e6", "oop-b3", "oop-l2"),
                    ],
                    "lessons": [
                        {
                            "id": "oop-ch1-l1",
                            "title": "1.1 Kế thừa, super() & Quan hệ Is-A",
                            "duration": "14 phút",
                            "status": "Đã phát hành",
                            "isGenerated": True,
                            "youtubeId": "M6FwepHC6vM",
                            "documents": [{"name": "CS201_Chuong1_KeThua_OOP.docx", "size": "128 KB", "uploadedAt": "10/11/2026"}],
                            "content": {
                                "reading": (
                                    "Kế thừa (Inheritance) cho phép lớp con (Subclass) kế thừa dữ liệu và hành vi từ lớp cha (Superclass) mà vẫn giữ nguyên tính đóng gói.\n\n"
                                    "Điểm cốt lõi cần nắm:\n1. Constructor chaining: Lớp cha luôn được khởi tạo trước lớp con (gọi qua initializer list trong C++ hoặc super() ở Java).\n"
                                    "2. Bảo vệ phạm vi truy cập: Dùng protected cho các hàm nội bộ cần chia sẻ với lớp con nhưng vẫn ẩn khỏi bên ngoài.\n"
                                    "3. Tránh lạm dụng kế thừa sâu quá 3 tầng để không làm phình kích thước đối tượng."
                                ),
                                "videoScenes": [
                                    {
                                        "id": "s1",
                                        "title": "Phân cảnh 1",
                                        "text": "Bố cục bộ nhớ đối tượng kế thừa",
                                        "script": "Khi tạo một đối tượng Developer kế thừa từ Employee, phần bộ nhớ của Employee được cấp phát ở đầu vùng nhớ đối tượng.",
                                    },
                                    {
                                        "id": "s2",
                                        "title": "Phân cảnh 2",
                                        "text": "Thứ tự gọi Constructor & Destructor",
                                        "script": "Constructor chạy từ Cha xuống Con, còn Destructor luôn chạy ngược lại từ Con lên Cha để dọn dẹp tài nguyên an toàn.",
                                    },
                                ],
                                "quizzes": [
                                    {
                                        "id": "q1",
                                        "question": "Thứ tự khởi tạo Constructor khi tạo đối tượng lớp con Manager kế thừa Employee là gì?",
                                        "options": ["Employee -> Manager", "Manager -> Employee", "Chỉ chạy Manager", "Ngẫu nhiên theo trình biên dịch"],
                                        "answer": "Employee -> Manager",
                                    },
                                    {
                                        "id": "q2",
                                        "question": "Lỗi Object Slicing xảy ra khi nào trong C++?",
                                        "options": [
                                            "Truyền đối tượng lớp con theo giá trị (pass-by-value) vào tham số kiểu lớp cha",
                                            "Dùng con trỏ Base* trỏ tới Derived",
                                            "Khai báo hàm virtual destructor",
                                            "Dùng từ khóa override ở lớp con",
                                        ],
                                        "answer": "Truyền đối tượng lớp con theo giá trị (pass-by-value) vào tham số kiểu lớp cha",
                                    },
                                ],
                            },
                        },
                        {
                            "id": "oop-ch1-l2",
                            "title": "1.2 Bản chất Đa hình, vtable & Dynamic Dispatch",
                            "duration": "18 phút",
                            "status": "Đã phát hành",
                            "isGenerated": True,
                            "youtubeId": "m2ZsYwZuns4",
                            "documents": [{"name": "CS201_vtable_Dynamic_Dispatch.pdf", "size": "420 KB", "uploadedAt": "11/11/2026"}],
                            "content": {
                                "reading": (
                                    "Tính đa hình thời gian chạy (Runtime Polymorphism) được C++ Runtime thực thi thông qua bảng hàm ảo (Virtual Table - vtable) "
                                    "và con trỏ ẩn vptr nằm ở 8 byte đầu mỗi object.\n\nLưu ý sống còn: Nếu lớp có bất kỳ hàm virtual nào, hãy luôn khai báo virtual ~Employee() = default; để tránh rò rỉ bộ nhớ Heap."
                                ),
                                "videoScenes": [
                                    {
                                        "id": "s1",
                                        "title": "Phân cảnh 1",
                                        "text": "Cơ chế vptr trỏ tới vtable",
                                        "script": "Mỗi lớp có hàm virtual sở hữu đúng 1 bảng vtable tĩnh lưu địa chỉ các hàm override.",
                                    },
                                    {
                                        "id": "s2",
                                        "title": "Phân cảnh 2",
                                        "text": "Tại sao cần Virtual Destructor",
                                        "script": "Khi gọi delete emp qua con trỏ lớp cha mà destructor không phải virtual, trình biên dịch chỉ dọn phần Employee.",
                                    },
                                ],
                                "quizzes": [
                                    {
                                        "id": "q3",
                                        "question": "Con trỏ vptr được trình biên dịch chèn vào đâu?",
                                        "options": [
                                            "Vào từng instance (đối tượng) của lớp có hàm virtual",
                                            "Vào stack của hàm main()",
                                            "Chỉ lưu trong biến static toàn cục",
                                            "Không tồn tại lúc runtime",
                                        ],
                                        "answer": "Vào từng instance (đối tượng) của lớp có hàm virtual",
                                    }
                                ],
                            },
                        },
                        {
                            "id": "oop-ch1-l3",
                            "title": "1.3 Lớp trừu tượng, Interface & Nguyên lý SOLID",
                            "duration": "15 phút",
                            "status": "Bản nháp",
                            "isGenerated": False,
                            "documents": [],
                            "content": {"reading": "", "videoScenes": [], "quizzes": []},
                        },
                    ],
                    "assignments": [
                        {
                            "id": "oop-ch1-lab",
                            "type": "code_lab",
                            "title": "Hiện thực Đa hình Employee, Developer & Manager (Virtual Table)",
                            "description": "Khai báo lớp trừu tượng Employee với calculateSalary() = 0 và virtual destructor; đánh giá đúng bảng lương qua Employee*.",
                            "isRequired": True,
                            "points": 100,
                            "repoTemplate": "https://github.com/codemind-campus/cpp-oop-polymorphism-template",
                            "dockerImage": "codemind/cpp20-sandbox:valgrind-1.4",
                            "testCases": [
                                {"id": "tc-1", "title": "Kiểm tra tính lương Developer (base + overtime * 25)", "input": 'Developer("An", 1500, 10)', "expectedOutput": "1750.00", "isEdgeCase": False, "timeoutMs": 1200, "memoryLimitMb": 64},
                                {"id": "tc-2", "title": "Kiểm tra tính lương Manager (base + bonus)", "input": 'Manager("Binh", 2200, 600)', "expectedOutput": "2800.00", "isEdgeCase": False, "timeoutMs": 1200, "memoryLimitMb": 64},
                                {"id": "tc-3", "title": "Đa hình qua mảng con trỏ Employee* (Dynamic Dispatch)", "input": "vector<Employee*> { dev, mgr }", "expectedOutput": "Total Payroll: 4550.00", "isEdgeCase": False, "timeoutMs": 1500, "memoryLimitMb": 64},
                                {"id": "tc-4", "title": "Biên: Giờ làm thêm = 0 và chống Object Slicing", "input": 'evaluatePayroll(new Developer("Lan", 1000, 0))', "expectedOutput": "1000.00", "isEdgeCase": True, "timeoutMs": 1200, "memoryLimitMb": 64},
                                {"id": "tc-5", "title": "Edge Case: Valgrind kiểm tra Virtual Destructor (0 bytes leaked)", "input": "delete empBasePtr; // empBasePtr -> Developer", "expectedOutput": "All heap blocks were freed -- no leaks are possible", "isEdgeCase": True, "timeoutMs": 2500, "memoryLimitMb": 128},
                            ],
                        }
                    ],
                },
                {
                    "id": "oop-ch2",
                    "title": "Chương 2: Smart Pointers & Quản lý Tài nguyên (RAII)",
                    "status": "Bản nháp",
                    "mindmapGenerated": False,
                    "lessons": [
                        {
                            "id": "oop-ch2-l1",
                            "title": "2.1 unique_ptr, shared_ptr & weak_ptr chống Circular Reference",
                            "duration": "16 phút",
                            "status": "Bản nháp",
                            "isGenerated": False,
                            "documents": [],
                            "content": {"reading": "", "videoScenes": [], "quizzes": []},
                        }
                    ],
                    "assignments": [
                        {
                            "id": "oop-ch2-lab",
                            "type": "code_lab",
                            "title": "Phá vỡ vòng tham chiếu bằng std::weak_ptr trong Cache Pool",
                            "description": "Triển khai Resource Pool bằng shared_ptr và weak_ptr đạt 0 memory leaks.",
                            "isRequired": True,
                            "points": 120,
                            "repoTemplate": "https://github.com/codemind-campus/cpp-raii-smart-ptr",
                            "dockerImage": "codemind/cpp20-sandbox:valgrind-1.4",
                            "testCases": [
                                {"id": "tc-raii-1", "title": "Kiểm tra reference count giải phóng về 0 khi out of scope", "input": 'pool.acquire("tex_01") -> scope exit', "expectedOutput": "expired() == true", "isEdgeCase": True, "timeoutMs": 1500, "memoryLimitMb": 64}
                            ],
                        }
                    ],
                },
            ],
        },
        {
            "id": "class-dsa",
            "subject_id": "dsa",
            "code": "CS202",
            "name": "Giải thuật Nâng cao & Cấu trúc Dữ liệu Phức hợp",
            "semester": "Học kỳ 1 / 2026",
            "teacher_name": "Cô Trần Thị B",
            "student_count": 38,
            "avg_progress_pct": 68,
            "pending_dual_reviews": 1,
            "health": "Cần theo dõi",
            "room": "Lab A3-204",
            "docker_image": "codemind/cpp20-sandbox:gcc14",
            "sandbox_enabled": 1,
            "ai_defense_enabled": 1,
            "chapters": [
                {
                    "id": "dsa-ch1",
                    "title": "Chương 1: Đồ thị có trọng số, Dijkstra & Disjoint Set Union",
                    "status": "Đã phát hành",
                    "mindmapGenerated": True,
                    "mindmapNodes": [
                        {"id": "dsa-root", "type": "masterMindmapNode", "position": {"x": 40, "y": 165}, "data": {"title": "Chương 1: Đồ thị & DSU", "summary": "Đường đi ngắn nhất & Cây khung nhỏ nhất", "tag": "CS202 · ROOT", "nodeType": "root", "masteryPct": 71, "xp": 200}},
                        {"id": "dsa-b1", "type": "masterMindmapNode", "position": {"x": 350, "y": 55}, "data": {"title": "1.1 Min-Heap Dijkstra", "summary": "Priority Queue tìm đường đi ngắn nhất độ phức tạp O((V+E) log V).", "tag": "Shortest Path", "nodeType": "branch", "masteryPct": 76}},
                        {"id": "dsa-b2", "type": "masterMindmapNode", "position": {"x": 350, "y": 215}, "data": {"title": "1.2 Disjoint Set (Path Compression)", "summary": "Hợp nhất tập hợp theo rank tối ưu gần O(1) alpha(N).", "tag": "Union-Find", "nodeType": "branch", "masteryPct": 58}},
                        {"id": "dsa-l1", "type": "masterMindmapNode", "position": {"x": 670, "y": 55}, "data": {"title": "Lazy Deletion Guard", "summary": "Bỏ qua trạng thái cũ if (d > dist[u]) continue tránh TLE.", "tag": "Edge Case", "nodeType": "leaf", "masteryPct": 48}},
                    ],
                    "mindmapEdges": [
                        _edge("dsa-e1", "dsa-root", "dsa-b1"),
                        _edge("dsa-e2", "dsa-root", "dsa-b2"),
                        _edge("dsa-e3", "dsa-b1", "dsa-l1"),
                    ],
                    "lessons": [
                        {
                            "id": "dsa-ch1-l1",
                            "title": "1.1 Dijkstra với Priority Queue & Kỹ thuật Lazy Deletion",
                            "duration": "20 phút",
                            "status": "Đã phát hành",
                            "isGenerated": True,
                            "youtubeId": "Kuw9OOhEuCw",
                            "documents": [{"name": "CS202_Dijkstra_MinHeap.pdf", "size": "310 KB", "uploadedAt": "09/11/2026"}],
                            "content": {
                                "reading": "Thuật toán Dijkstra tìm đường đi ngắn nhất từ một đỉnh nguồn tới mọi đỉnh còn lại trên đồ thị có trọng số không âm. Luôn kiểm tra if (d > dist[u]) continue ngay khi pop khỏi heap.",
                                "videoScenes": [{"id": "s1", "title": "Phân cảnh 1", "text": "Vì sao phải kiểm tra d > dist[u]?", "script": "Do std::priority_queue không hỗ trợ decrease-key trực tiếp, ta dùng lazy deletion để bỏ qua bản sao lỗi thời."}],
                                "quizzes": [{"id": "dsa-q1", "question": "Khi nào thuật toán Dijkstra chuẩn cho kết quả sai?", "options": ["Khi đồ thị chứa cạnh có trọng số âm", "Khi đồ thị là đồ thị vô hướng", "Khi có nhiều thành phần liên thông", "Khi có cạnh trọng số bằng 0"], "answer": "Khi đồ thị chứa cạnh có trọng số âm"}],
                            },
                        }
                    ],
                    "assignments": [
                        {
                            "id": "dsa-ch1-lab",
                            "type": "code_lab",
                            "title": "Định tuyến Mạng Độ trễ Thấp (Dijkstra 10^5 đỉnh)",
                            "description": "Tìm đường đi ngắn nhất và xử lý đỉnh cô lập trên đồ thị lớn trong dưới 500ms.",
                            "isRequired": True,
                            "points": 120,
                            "repoTemplate": "https://github.com/codemind-campus/dsa-dijkstra-benchmark",
                            "dockerImage": "codemind/cpp20-sandbox:gcc14",
                            "testCases": [
                                {"id": "tc-dsa-1", "title": "Đồ thị nhỏ 6 đỉnh có cạnh song song", "input": "N=6, M=8, S=1 -> T=6", "expectedOutput": "14", "isEdgeCase": False, "timeoutMs": 500, "memoryLimitMb": 64},
                                {"id": "tc-dsa-2", "title": "Edge Case: Đồ thị không liên thông (trả về -1) & trọng số 0", "input": "N=5, M=2, S=1 -> T=5", "expectedOutput": "-1", "isEdgeCase": True, "timeoutMs": 500, "memoryLimitMb": 64},
                                {"id": "tc-dsa-3", "title": "Stress Test: 100,000 đỉnh & 200,000 cạnh (< 500ms)", "input": "dense_graph_100k.txt", "expectedOutput": "294810294", "isEdgeCase": True, "timeoutMs": 500, "memoryLimitMb": 256},
                            ],
                        }
                    ],
                }
            ],
        },
        {
            "id": "class-web",
            "subject_id": "web",
            "code": "CS304",
            "name": "Phát triển Web Hiện đại & REST API",
            "semester": "Học kỳ 1 / 2026",
            "teacher_name": "Thầy Nguyễn Phước",
            "student_count": 45,
            "avg_progress_pct": 81,
            "pending_dual_reviews": 1,
            "health": "Tốt",
            "room": "Hội trường C1",
            "docker_image": "codemind/python312-pytest:latest",
            "sandbox_enabled": 1,
            "ai_defense_enabled": 1,
            "chapters": [
                {
                    "id": "web-ch1",
                    "title": "Chương 1: Kiến trúc 3 Tầng FastAPI, JWT & RBAC Guard",
                    "status": "Đã phát hành",
                    "mindmapGenerated": True,
                    "mindmapNodes": [
                        {"id": "web-root", "type": "masterMindmapNode", "position": {"x": 40, "y": 140}, "data": {"title": "CS304: REST API & Security", "summary": "FastAPI Layered Architecture + RBAC", "tag": "CS304 · ROOT", "nodeType": "root", "masteryPct": 84, "xp": 190}},
                        {"id": "web-b1", "type": "masterMindmapNode", "position": {"x": 350, "y": 60}, "data": {"title": "1.1 Bearer JWT & Token Rotation", "summary": "Access token 15m + Refresh token hash lưu DB.", "tag": "Auth", "nodeType": "branch", "masteryPct": 87}},
                        {"id": "web-b2", "type": "masterMindmapNode", "position": {"x": 350, "y": 210}, "data": {"title": "1.2 FastAPI Dependency RBAC", "summary": "require_instructor & require_admin tách biệt 401 vs 403.", "tag": "RBAC", "nodeType": "branch", "masteryPct": 79}},
                    ],
                    "mindmapEdges": [_edge("web-e1", "web-root", "web-b1"), _edge("web-e2", "web-root", "web-b2")],
                    "lessons": [
                        {
                            "id": "web-ch1-l1",
                            "title": "1.1 Phân tách Controller - Service - Repository & RBAC",
                            "duration": "17 phút",
                            "status": "Đã phát hành",
                            "isGenerated": True,
                            "youtubeId": "TRjVXmk8q8I",
                            "documents": [{"name": "CS304_FastAPI_Layered_RBAC.md", "size": "64 KB", "uploadedAt": "11/11/2026"}],
                            "content": {
                                "reading": "Hệ thống API chuẩn doanh nghiệp tách qua Dependency Injection Depends(require_instructor), tầng Service và Repository.",
                                "videoScenes": [{"id": "w1", "title": "Phân cảnh 1", "text": "Luồng kiểm tra Token qua Depends", "script": "Mỗi request đi qua lớp xác thực JWT trước khi chạm tới logic nghiệp vụ."}],
                                "quizzes": [{"id": "wq1", "question": "Khi student gửi JWT hợp lệ tới GET /v1/instructor/sessions, API trả về mã HTTP nào?", "options": ["403 Forbidden", "401 Unauthorized", "404 Not Found", "200 OK"], "answer": "403 Forbidden"}],
                            },
                        }
                    ],
                    "assignments": [
                        {
                            "id": "web-ch1-lab",
                            "type": "github",
                            "title": "Xây dựng Middleware Phân quyền RBAC cho API Giảng viên",
                            "description": "Bảo vệ endpoint giám sát phiên học và cô lập dữ liệu theo organization_id.",
                            "isRequired": True,
                            "points": 110,
                            "repoTemplate": "https://github.com/codemind-campus/fastapi-rbac-starter",
                            "dockerImage": "codemind/python312-pytest:latest",
                            "testCases": [
                                {"id": "tc-web-1", "title": "Student JWT gọi route Instructor bị chặn 403", "input": "GET /v1/instructor/sessions (Bearer student_token)", "expectedOutput": "HTTP 403 Forbidden", "isEdgeCase": True, "timeoutMs": 1000, "memoryLimitMb": 128},
                                {"id": "tc-web-2", "title": "Instructor JWT chỉ thấy phiên có teacher_visibility=1", "input": "GET /v1/instructor/sessions (Bearer instructor_token)", "expectedOutput": "Filtered sessions count == 4", "isEdgeCase": False, "timeoutMs": 1000, "memoryLimitMb": 128},
                            ],
                        }
                    ],
                }
            ],
        },
        {
            "id": "class-fe",
            "subject_id": "frontend",
            "code": "CS210",
            "name": "Lập trình Web Frontend Hiện đại (React 19 & TypeScript)",
            "semester": "Học kỳ 1 / 2026",
            "teacher_name": "Cô Trần Thị B",
            "student_count": 40,
            "avg_progress_pct": 79,
            "pending_dual_reviews": 0,
            "health": "Tốt",
            "room": "Lab B1-102",
            "docker_image": "codemind/node20-playwright:latest",
            "sandbox_enabled": 1,
            "ai_defense_enabled": 1,
            "chapters": [
                {
                    "id": "fe-ch1",
                    "title": "Chương 1: React 19 Concurrent Rendering & Design System",
                    "status": "Đã phát hành",
                    "mindmapGenerated": True,
                    "mindmapNodes": [
                        {"id": "fe-root", "type": "masterMindmapNode", "position": {"x": 40, "y": 120}, "data": {"title": "CS210: React 19 & Design OS", "summary": "Kiến trúc State & Layout Micro-interaction", "tag": "CS210 · ROOT", "nodeType": "root", "masteryPct": 82, "xp": 180}},
                        {"id": "fe-b1", "type": "masterMindmapNode", "position": {"x": 340, "y": 120}, "data": {"title": "1.1 Strict Mode & View Transitions", "summary": "Quản lý ref animation an toàn không chặn pointer-events.", "tag": "UI Engineering", "nodeType": "branch", "masteryPct": 77}},
                    ],
                    "mindmapEdges": [_edge("fe-e1", "fe-root", "fe-b1")],
                    "lessons": [
                        {
                            "id": "fe-ch1-l1",
                            "title": "1.1 Quản lý Layer Z-Index, Pointer Events & GSAP Context",
                            "duration": "14 phút",
                            "status": "Đã phát hành",
                            "isGenerated": True,
                            "youtubeId": "x0fSBAgBrOQ",
                            "documents": [{"name": "CS210_GSAP_ViewTransition.pdf", "size": "215 KB", "uploadedAt": "12/11/2026"}],
                            "content": {"reading": "Khi overlay kết thúc animation cần đặt pointer-events: none để không chặn sự kiện click.", "videoScenes": [], "quizzes": []},
                        }
                    ],
                    "assignments": [
                        {
                            "id": "fe-ch1-lab",
                            "type": "code_lab",
                            "title": "Xây dựng Segmented Control với ResizeObserver chuẩn 60fps",
                            "description": "Đồng bộ indicator pill khi resize viewport và đổi tab tức thì.",
                            "isRequired": True,
                            "points": 100,
                            "dockerImage": "codemind/node20-playwright:latest",
                            "testCases": [{"id": "tc-fe-1", "title": "Button CTA nhận click khi overlay kết thúc animation", "input": "Playwright elementFromPoint(ctaButton)", "expectedOutput": "clickable == true", "isEdgeCase": True, "timeoutMs": 2000, "memoryLimitMb": 256}],
                        }
                    ],
                }
            ],
        },
        {
            "id": "class-ai",
            "subject_id": "ai-agent",
            "code": "CS420",
            "name": "Phát triển AI-Native Web App, RAG & AI Agents",
            "semester": "Học kỳ 1 / 2026",
            "teacher_name": "Thầy Nguyễn Phước",
            "student_count": 34,
            "avg_progress_pct": 61,
            "pending_dual_reviews": 2,
            "health": "Cần theo dõi",
            "room": "Lab AI-02",
            "docker_image": "codemind/python312-rag:latest",
            "sandbox_enabled": 1,
            "ai_defense_enabled": 1,
            "chapters": [
                {
                    "id": "ai-ch1",
                    "title": "Chương 1: RAG Architecture, pgvector & Socratic Guardrails",
                    "status": "Đã phát hành",
                    "mindmapGenerated": True,
                    "mindmapNodes": [
                        {"id": "ai-root", "type": "masterMindmapNode", "position": {"x": 40, "y": 120}, "data": {"title": "CS420: RAG & Socratic Agent", "summary": "Semantic Search + Guardrail Policy", "tag": "CS420 · ROOT", "nodeType": "root", "masteryPct": 64, "xp": 240}},
                        {"id": "ai-b1", "type": "masterMindmapNode", "position": {"x": 350, "y": 120}, "data": {"title": "1.1 pgvector Cosine Threshold", "summary": "Lọc chunk nhiễu bằng ngưỡng khoảng cách vector.", "tag": "Vector DB", "nodeType": "branch", "masteryPct": 51}},
                    ],
                    "mindmapEdges": [_edge("ai-e1", "ai-root", "ai-b1")],
                    "lessons": [
                        {
                            "id": "ai-ch1-l1",
                            "title": "1.1 Thiết kế Hybrid Search & Chính sách không đưa code đáp án",
                            "duration": "19 phút",
                            "status": "Đã phát hành",
                            "isGenerated": True,
                            "youtubeId": "TRjVXmk8q8I",
                            "documents": [{"name": "CS420_RAG_Socratic_Guardrail.pdf", "size": "380 KB", "uploadedAt": "12/11/2026"}],
                            "content": {"reading": "Khi sinh viên xin code giải sẵn, Guardrail phải chuyển về refuse_answer và gợi mở câu hỏi tư duy.", "videoScenes": [], "quizzes": []},
                        }
                    ],
                    "assignments": [
                        {
                            "id": "ai-ch1-lab",
                            "type": "code_lab",
                            "title": "Truy vấn Hybrid RAG với Cosine Similarity Guardrail",
                            "description": "Loại bỏ các đoạn văn bản có độ tương đồng < 0.72 trước khi tổng hợp.",
                            "isRequired": True,
                            "points": 150,
                            "dockerImage": "codemind/python312-rag:latest",
                            "testCases": [{"id": "tc-ai-1", "title": "Từ chối context nhiễu dưới ngưỡng similarity 0.72", "input": "query='vtable', docs=[sim=0.91, sim=0.42]", "expectedOutput": "selected_chunks == 1", "isEdgeCase": True, "timeoutMs": 2000, "memoryLimitMb": 256}],
                        }
                    ],
                }
            ],
        },
        {
            "id": "class-devops",
            "subject_id": "devops",
            "code": "CS405",
            "name": "DevOps, Docker & CI/CD Pipeline Automation",
            "semester": "Học kỳ 1 / 2026",
            "teacher_name": "Thầy Nguyễn Phước",
            "student_count": 36,
            "avg_progress_pct": 72,
            "pending_dual_reviews": 0,
            "health": "Ổn định",
            "room": "Lab B2-301",
            "docker_image": "codemind/alpine-ci:3.19",
            "sandbox_enabled": 1,
            "ai_defense_enabled": 0,
            "chapters": [
                {
                    "id": "devops-ch1",
                    "title": "Chương 1: Container Sandbox Cô lập & GitHub Actions",
                    "status": "Đã phát hành",
                    "mindmapGenerated": True,
                    "mindmapNodes": [
                        {"id": "dev-root", "type": "masterMindmapNode", "position": {"x": 40, "y": 120}, "data": {"title": "CS405: Docker & CI/CD", "summary": "Isolated Runner & Seccomp Policy", "tag": "CS405 · ROOT", "nodeType": "root", "masteryPct": 75, "xp": 200}},
                        {"id": "dev-b1", "type": "masterMindmapNode", "position": {"x": 340, "y": 120}, "data": {"title": "1.1 Non-root Container & --network=none", "summary": "Giới hạn RAM/CPU và ngắt mạng khi chạy mã nguồn.", "tag": "Security Sandbox", "nodeType": "branch", "masteryPct": 72}},
                    ],
                    "mindmapEdges": [_edge("dev-e1", "dev-root", "dev-b1")],
                    "lessons": [
                        {
                            "id": "devops-ch1-l1",
                            "title": "1.1 Multi-stage Build & Khóa Lockfile trong Pipeline",
                            "duration": "15 phút",
                            "status": "Đã phát hành",
                            "isGenerated": True,
                            "youtubeId": "7ppRSaGT1uw",
                            "documents": [{"name": "CS405_Docker_CICD_Pipeline.md", "size": "95 KB", "uploadedAt": "14/11/2026"}],
                            "content": {"reading": "Pipeline chấm bài và triển khai cần đồng bộ lockfile và thiết lập seccomp profile.", "videoScenes": [], "quizzes": []},
                        }
                    ],
                    "assignments": [
                        {
                            "id": "devops-ch1-lab",
                            "type": "github",
                            "title": "Cấu hình Workflow Lint, TypeCheck & Build cho Monorepo",
                            "description": "Đảm bảo pipeline xanh trên push/PR.",
                            "isRequired": True,
                            "points": 100,
                            "dockerImage": "codemind/alpine-ci:3.19",
                            "testCases": [{"id": "tc-dev-1", "title": "Build artifact tạo dist/index.html không lỗi", "input": "pnpm install && pnpm build", "expectedOutput": "Exit code 0", "isEdgeCase": False, "timeoutMs": 3000, "memoryLimitMb": 512}],
                        }
                    ],
                }
            ],
        },
    ]


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
        ("usr-gv-01", "lananh.gv@codemind.ai", default_pwd_hash, "Cô Trần Thị B", "instructor", "active", "GV-2026-01", "Vừa xong", "MacBook Pro · Chrome 126", 3),
        ("usr-gv-02", "phuoc.gv@codemind.ai", default_pwd_hash, "Thầy Nguyễn Phước", "instructor", "active", "GV-2026-02", "12 phút trước", "Windows 11 · Edge 125", 3),
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
        existing = conn.execute("SELECT id FROM users WHERE id=? OR lower(email)=?", (u_id, email)).fetchone()
        is_primary_student = u_id == "usr-sv-02"
        target_xp = 3240 if is_primary_student else 1250
        target_streak = 14 if is_primary_student else 4
        if not existing:
            conn.execute(
                """INSERT INTO users(id, email, password_hash, full_name, display_name, role, status, locale, timezone,
                                     theme_preference, user_code, last_active_label, last_device, classes_count, created_at, updated_at)
                   VALUES(?, ?, ?, ?, ?, ?, ?, 'vi-VN', 'Asia/Ho_Chi_Minh', 'one-dark', ?, ?, ?, ?, ?, ?)""",
                (u_id, email, pwd_hash, full_name, full_name, role, st, code, last_act, dev, cls_cnt, now, now),
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
                "UPDATE users SET role=?, status=?, user_code=?, last_active_label=?, last_device=?, classes_count=?, updated_at=? WHERE id=?",
                (role, st, code, last_act, dev, cls_cnt, now, existing["id"]),
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

    # 2. Seed Courses (dùng chung cho Student, Instructor & Admin)
    existing_courses = conn.execute("SELECT COUNT(*) c FROM courses").fetchone()["c"]
    if existing_courses == 0 or force_reseed:
        if force_reseed:
            conn.execute("DELETE FROM courses")
        for c in _build_courses_seed():
            conn.execute(
                """INSERT OR REPLACE INTO courses(
                       id, subject_id, code, name, semester, teacher_name, student_count, avg_progress_pct,
                       pending_dual_reviews, health, room, docker_image, sandbox_enabled, ai_defense_enabled,
                       chapters_json, updated_at
                   ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    c["id"], c["subject_id"], c["code"], c["name"], c["semester"], c["teacher_name"],
                    c["student_count"], c["avg_progress_pct"], c["pending_dual_reviews"], c["health"], c["room"],
                    c["docker_image"], c["sandbox_enabled"], c["ai_defense_enabled"],
                    json.dumps(c["chapters"], ensure_ascii=False), now,
                ),
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
            "require2FA": True,
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
