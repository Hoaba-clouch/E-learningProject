# backend/app/services/architecture_templates.py
"""
Service quản lý Sơ đồ Kiến trúc Phân tầng Động (GitDiagram Canvas) cho 8 Đồ án lớn.
Lưu trữ và đồng bộ 100% qua bảng MySQL `project_architectures`.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

PROJECT_ARCHITECTURES_CATALOG: dict[str, dict[str, Any]] = {
    "prj-codemind": {
        "title": "CodeMind AI - Hệ thống Gia sư Lập trình Socratic & Docker Sandbox",
        "techStack": "React 18 + Tailwind CSS + FastAPI + Docker Seccomp + MySQL 8.0 + Gemini AI",
        "subsystems": [
            {"id": "group-campus-app", "label": "Client & IDE Layer (React 18, Monaco, Tailwind)", "stroke": "#2563eb", "width": 1780, "height": 260},
            {"id": "group-project-ws", "label": "Project Workspace & Collaboration (Git Hub, Kanban)", "stroke": "#16a34a", "width": 1780, "height": 260},
            {"id": "group-api-core", "label": "API Gateway & Socratic AI Engine (FastAPI, LangChain)", "stroke": "#dc2626", "width": 1780, "height": 260},
            {"id": "group-infra-data", "label": "Execution Sandbox & Persistence (Docker Seccomp, MySQL 8.0)", "stroke": "#d97706", "width": 1780, "height": 260},
        ],
        "flows": [
            {
                "id": "all",
                "label": "Toàn cảnh Kiến trúc (22 Components)",
                "color": "#2563eb",
                "summary": "Hiển thị tổng thể 4 Subsystem Containers, 22 Components và các luồng liên kết dữ liệu theo chuẩn GitDiagram.",
                "nodeIds": [],
                "edgeIds": [],
            },
            {
                "id": "flow-auth",
                "label": "Luồng 1: Xác thực & RBAC 3 Vai trò",
                "color": "#e11d48",
                "summary": "Luồng đăng nhập -> JWT Access Token 15p -> Kiểm tra RBAC (Student/Instructor/Admin) -> Bcrypt bảo mật.",
                "nodeIds": ["user", "app-shell", "login", "api-client", "api-startup", "v1-router", "auth", "auth-deps", "token-utils", "mysql-db"],
                "edgeIds": ["e-user-app", "e-app-login", "e-client-api", "e-api-router", "e-router-auth", "e-auth-deps", "e-deps-utils"],
            },
            {
                "id": "flow-sandbox",
                "label": "Luồng 2: Nộp bài & Docker Sandbox",
                "color": "#059669",
                "summary": "Học viên nộp code C++/Python -> FastAPI nhận bài -> Sandbox cô lập Seccomp biên dịch -> Chấm test case -> Ghi DB.",
                "nodeIds": ["user", "app-shell", "learning-ws", "api-client", "api-startup", "v1-router", "submissions", "code-evaluator", "mysql-db"],
                "edgeIds": ["e-user-app", "e-app-ws", "e-ws-client", "e-client-api", "e-api-router", "e-router-sub", "e-sub-eval", "e-sub-db"],
            },
            {
                "id": "flow-socratic",
                "label": "Luồng 3: Gia sư Socratic & Giám sát Liêm chính",
                "color": "#d97706",
                "summary": "Học viên hỏi trợ giảng -> AI phân tích thói quen gõ -> Gợi mở 3 bước không giải hộ -> Ghi nhận log Liêm chính.",
                "nodeIds": ["user", "app-shell", "learning-ws", "api-client", "api-startup", "v1-router", "ai-apis", "analytics", "mysql-db"],
                "edgeIds": ["e-user-app", "e-app-ws", "e-ws-client", "e-client-api", "e-api-router", "e-router-ai", "e-ai-analytics-track", "e-ai-db", "e-analytics-db"],
            },
            {
                "id": "flow-kanban",
                "label": "Luồng 4: Sprint Kanban & Live Git Hub",
                "color": "#16a34a",
                "summary": "Quản lý 72 tasks 4 Sprint -> Khóa phụ thuộc task -> Đồng bộ Live GitHub Commits/PRs -> Thẩm định DoD.",
                "nodeIds": ["user", "app-shell", "git-hub", "kanban-board", "task-csv", "v1-router", "kanban-apis", "mysql-db"],
                "edgeIds": ["e-user-app", "e-app-hub", "e-app-kanban", "e-kanban-csv", "e-router-kanban", "e-kanban-db"],
            },
        ],
        "nodes": [
            # Group Containers
            {"id": "group-campus-app", "type": "containerBox", "position": {"x": 80, "y": 70}, "data": {"label": "Phân tầng Client UI (Campus App)", "stroke": "#2563eb", "width": 1780, "height": 260}},
            {"id": "group-project-ws", "type": "containerBox", "position": {"x": 80, "y": 440}, "data": {"label": "Phân tầng Dự án & Hợp tác (Project Workspace)", "stroke": "#16a34a", "width": 1780, "height": 260}},
            {"id": "group-api-core", "type": "containerBox", "position": {"x": 80, "y": 810}, "data": {"label": "Phân tầng API Gateway & Dịch vụ Lõi (API Platform)", "stroke": "#dc2626", "width": 1780, "height": 260}},
            {"id": "group-infra-data", "type": "containerBox", "position": {"x": 80, "y": 1180}, "data": {"label": "Phân tầng Thực thi & Lưu trữ (Execution & Storage)", "stroke": "#d97706", "width": 1780, "height": 260}},
            # User & Client Components
            {"id": "user", "type": "cardNode", "position": {"x": 110, "y": 150}, "data": {"label": "Người dùng (3 Roles)", "subLabel": "[Sinh viên / Giảng viên / Quản trị]", "container": "Campus App", "containerColor": "#2563eb", "filePath": "src/App.tsx", "tech": "React 18", "description": "Tác nhân tương tác qua giao diện web thích ứng.", "badge": "End User", "upstream": "None", "downstream": "App shell", "defenseQA": "Hệ thống hỗ trợ những vai trò nào? Đáp: Student, Instructor và Admin với RBAC đa tầng."}},
            {"id": "app-shell", "type": "cardNode", "position": {"x": 340, "y": 150}, "data": {"label": "App Shell Router", "subLabel": "[App.tsx]", "container": "Campus App", "containerColor": "#2563eb", "filePath": "src/App.tsx", "tech": "React Router DOM", "description": "Bộ định tuyến chính phân giải view theo tab và quyền truy cập.", "badge": "Core Layout", "upstream": "User", "downstream": "Các màn hình nghiệp vụ", "defenseQA": "Xử lý tải chậm như thế nào? Đáp: Dùng React.lazy và Suspense code-splitting."}},
            {"id": "login", "type": "cardNode", "position": {"x": 570, "y": 150}, "data": {"label": "Login & Auth Modal", "subLabel": "[LoginModal.tsx]", "container": "Campus App", "containerColor": "#2563eb", "filePath": "src/components/LoginModal.tsx", "tech": "OAuth2 / JWT", "description": "Hộp thoại đăng nhập và cấp phiên làm việc bảo mật.", "badge": "Security", "upstream": "App shell", "downstream": "POST /v1/auth/login", "defenseQA": "Lưu token ở đâu? Đáp: Token lưu trong bộ nhớ state và cookie HttpOnly."}},
            {"id": "learning-ws", "type": "cardNode", "position": {"x": 800, "y": 150}, "data": {"label": "Không gian Học tập & IDE", "subLabel": "[StudentDashboard.tsx]", "container": "Campus App", "containerColor": "#2563eb", "filePath": "src/screens/StudentDashboard.tsx", "tech": "Monaco Editor", "description": "Màn hình soạn thảo code C++, chạy test case và video F8.", "badge": "Workspace", "upstream": "App shell", "downstream": "POST /v1/submissions", "defenseQA": "Bảo vệ sinh viên gian lận code thế nào? Đáp: Ghi log keystroke và tính toán độ tương đồng AST."}},
            {"id": "instructor-panel", "type": "cardNode", "position": {"x": 1030, "y": 150}, "data": {"label": "Bảng Điều khiển Giảng viên", "subLabel": "[InstructorPanel.tsx]", "container": "Campus App", "containerColor": "#2563eb", "filePath": "src/screens/InstructorPanel.tsx", "tech": "React Dashboard", "description": "Thống kê 16 môn, chấm bài lab, nghiệm thu đồ án và cảnh báo rủi ro.", "badge": "Instructor", "upstream": "App shell", "downstream": "GET /v1/instructor/analytics", "defenseQA": "Giảng viên chấm đồ án theo tiêu chí gì? Đáp: Rubric 3 phần kết hợp tỷ lệ đóng góp Anti-Freerider."}},
            {"id": "admin-dash", "type": "cardNode", "position": {"x": 1260, "y": 150}, "data": {"label": "Bảng Quản trị Toàn trường", "subLabel": "[AdminDashboard.tsx]", "container": "Campus App", "containerColor": "#2563eb", "filePath": "src/screens/AdminDashboard.tsx", "tech": "Analytics Chart", "description": "Quản lý 5 chặng lộ trình, phân bổ giảng viên và biểu đồ thời gian thực.", "badge": "Admin", "upstream": "App shell", "downstream": "GET /v1/admin/analytics-overview", "defenseQA": "Hệ thống bảo vệ trước tải lớn ra sao? Đáp: Caching Redis và phân mảnh truy vấn MySQL qua index."}},
            # Project Workspace Components
            {"id": "git-hub", "type": "cardNode", "position": {"x": 110, "y": 520}, "data": {"label": "Git Project Hub", "subLabel": "[GitProjectHub.tsx]", "container": "Project Workspace", "containerColor": "#16a34a", "filePath": "src/screens/GitProjectHub.tsx", "tech": "Live GitHub REST API", "description": "Metro-line commit topology, bảng PR 2-tier review và sơ đồ kiến trúc động.", "badge": "Git Core", "upstream": "App shell", "downstream": "POST /v1/git-hub/sync-github", "defenseQA": "Tính năng Git lấy dữ liệu từ đâu? Đáp: Kéo commits và PRs trực tiếp từ GitHub REST API công khai vào MySQL."}},
            {"id": "kanban-board", "type": "cardNode", "position": {"x": 340, "y": 520}, "data": {"label": "Sprint Kanban Board", "subLabel": "[KanbanBoard.tsx]", "container": "Project Workspace", "containerColor": "#16a34a", "filePath": "src/components/KanbanBoard.tsx", "tech": "Drag & Drop DndKit", "description": "Quản trị 72 tasks, khóa phụ thuộc cha-con, kiểm soát cột Nghiệm thu.", "badge": "Kanban", "upstream": "App shell", "downstream": "PUT /v1/kanban/tasks/{id}/move", "defenseQA": "Ai có quyền chuyển task sang Đã nghiệm thu? Đáp: Chỉ Giảng viên hướng dẫn sau khi thẩm định DoD."}},
            {"id": "task-csv", "type": "cardNode", "position": {"x": 570, "y": 520}, "data": {"label": "WBS & Excel Exporter", "subLabel": "[task_csv.py]", "container": "Project Workspace", "containerColor": "#16a34a", "filePath": "backend/app/services/task_csv.py", "tech": "OpenPyXL / CSV", "description": "Sinh mẫu kế hoạch 72 tasks 4 Sprints xuất nhập định dạng chuẩn.", "badge": "WBS Tools", "upstream": "Kanban board", "downstream": "POST /v1/kanban/import", "defenseQA": "Khắc phục lệch dữ liệu khi import thế nào? Đáp: Dùng transaction ACID rollback toàn bộ khi lỗi."}},
            {"id": "academic-sched", "type": "cardNode", "position": {"x": 800, "y": 520}, "data": {"label": "Lịch Học vụ & Hẹn gặp 1-1", "subLabel": "[EngineeringScheduleRota.tsx]", "container": "Project Workspace", "containerColor": "#16a34a", "filePath": "src/screens/EngineeringScheduleRota.tsx", "tech": "Full Calendar Engine", "description": "Quản lý ca thi, seminar, và slot hẹn vấn đáp riêng giữa Thầy và Trò.", "badge": "Schedule", "upstream": "App shell", "downstream": "POST /v1/schedules/booking", "defenseQA": "Tránh trùng lịch hẹn thế nào? Đáp: Ràng buộc UNIQUE và transaction lock trên MySQL."}},
            # API Platform Components
            {"id": "api-client", "type": "cardNode", "position": {"x": 110, "y": 890}, "data": {"label": "Fetch API Client", "subLabel": "[api.ts]", "container": "API Platform", "containerColor": "#dc2626", "filePath": "src/api.ts", "tech": "Axios / Fetch", "description": "Lớp gọi API chuẩn hóa kèm Bearer token và xử lý lỗi 401 tự động.", "badge": "Client SDK", "upstream": "Các màn hình UI", "downstream": "FastAPI Server", "defenseQA": "Xử lý mất kết nối mạng thế nào? Đáp: Retry 3 lần với exponential backoff."}},
            {"id": "api-startup", "type": "cardNode", "position": {"x": 340, "y": 890}, "data": {"label": "FastAPI Gateway Startup", "subLabel": "[main.py]", "container": "API Platform", "containerColor": "#dc2626", "filePath": "backend/app/main.py", "tech": "FastAPI ASGI", "description": "Khởi động ứng dụng, nạp CORS Middleware, Rate Limiter và Lifespan context.", "badge": "ASGI Server", "upstream": "API Client", "downstream": "API Routers", "defenseQA": "Bảo vệ DoS thế nào? Đáp: Dùng SlowAPI rate limiter giới hạn 60 requests/phút mỗi IP."}},
            {"id": "v1-router", "type": "cardNode", "position": {"x": 570, "y": 890}, "data": {"label": "V1 Unified APIRouter", "subLabel": "[api.py]", "container": "API Platform", "containerColor": "#dc2626", "filePath": "backend/app/api/v1/api.py", "tech": "FastAPI APIRouter", "description": "Tổng hợp các module endpoints: auth, student, instructor, admin, git, kanban.", "badge": "Router Hub", "upstream": "FastAPI Startup", "downstream": "Business Controllers", "defenseQA": "Tại sao dùng tiền tố /v1? Đáp: Để đảm bảo tương thích ngược khi nâng cấp API trong tương lai."}},
            {"id": "auth", "type": "cardNode", "position": {"x": 800, "y": 890}, "data": {"label": "Auth & Session Service", "subLabel": "[auth.py]", "container": "API Platform", "containerColor": "#dc2626", "filePath": "backend/app/api/v1/auth.py", "tech": "PyJWT / Passlib", "description": "Cấp phát token, quản lý phiên làm việc đa thiết bị và thu hồi JWT.", "badge": "Auth Controller", "upstream": "V1 Router", "downstream": "MySQL Database", "defenseQA": "Phát hiện đăng nhập lạ bằng cách nào? Đáp: Lưu User-Agent và địa chỉ IP trong bảng auth_sessions."}},
            {"id": "ai-apis", "type": "cardNode", "position": {"x": 1030, "y": 890}, "data": {"label": "Socratic AI Engine", "subLabel": "[socratic_ai.py]", "container": "API Platform", "containerColor": "#dc2626", "filePath": "backend/app/services/socratic_ai.py", "tech": "Google Gemini Pro API", "description": "Hệ thống prompt gợi ý từng bước, không giải trực tiếp, ngăn chặn gian lận.", "badge": "AI Service", "upstream": "V1 Router", "downstream": "External Gemini LLM", "defenseQA": "Prompt Socratic được tinh chỉnh ra sao? Đáp: Sử dụng quy tắc 3 bước gợi mở và kiểm tra guardrails."}},
            {"id": "kanban-apis", "type": "cardNode", "position": {"x": 1260, "y": 890}, "data": {"label": "Kanban & Grading API", "subLabel": "[kanban.py]", "container": "API Platform", "containerColor": "#dc2626", "filePath": "backend/app/api/v1/kanban.py", "tech": "FastAPI CRUD", "description": "Xử lý kéo thẻ, kiểm tra DoD, tính điểm Anti-Freerider và lưu rubric.", "badge": "Kanban Backend", "upstream": "V1 Router", "downstream": "MySQL Database", "defenseQA": "Công thức Anti-Freerider hoạt động ra sao? Đáp: Tỷ lệ hoàn thành Story Points chia cho tổng SP cam kết của nhóm."}},
            # Execution & Storage Components
            {"id": "submissions", "type": "cardNode", "position": {"x": 110, "y": 1260}, "data": {"label": "Submission Dispatcher", "subLabel": "[submissions.py]", "container": "Execution & Storage", "containerColor": "#d97706", "filePath": "backend/app/api/v1/submissions.py", "tech": "Task Queue", "description": "Tiếp nhận mã nguồn bài tập, ghi log hàng đợi và gửi sang Sandbox.", "badge": "Queue Hub", "upstream": "V1 Router", "downstream": "Docker Evaluator", "defenseQA": "Xử lý nộp bài dồn dập thế nào? Đáp: Dùng worker pool với semaphore giới hạn số tiến trình đồng thời."}},
            {"id": "code-evaluator", "type": "cardNode", "position": {"x": 340, "y": 1260}, "data": {"label": "Docker Seccomp Sandbox", "subLabel": "[sandbox_runner.py]", "container": "Execution & Storage", "containerColor": "#d97706", "filePath": "backend/app/services/sandbox_runner.py", "tech": "Docker + Seccomp BPF", "description": "Môi trường thực thi mã cô lập: giới hạn RAM 128MB, CPU 1s, chặn kết nối mạng.", "badge": "Sandbox Core", "upstream": "Submission Dispatcher", "downstream": "Linux Cgroups", "defenseQA": "Ngăn chặn sinh viên chạy mã độc (rm -rf /) ra sao? Đáp: Chặn syscalls bằng Seccomp profile và cấp user no-root."}},
            {"id": "mysql-db", "type": "cardNode", "position": {"x": 570, "y": 1260}, "data": {"label": "MySQL 8.0 Primary RDBMS", "subLabel": "[codemind_ai database]", "container": "Execution & Storage", "containerColor": "#d97706", "filePath": "backend/app/core/database.py", "tech": "MySQL 8.0 InnoDB", "description": "Cơ sở dữ liệu quan hệ lưu trữ 43 bảng lõi với chuẩn toàn vẹn ACID.", "badge": "Primary DB", "upstream": "Tất cả API Services", "downstream": "Disk Storage", "defenseQA": "Đảm bảo tính toàn vẹn thế nào? Đáp: Sử dụng khóa ngoại Foreign Key với CASCADE và giao dịch ACID."}},
            {"id": "redis-cache", "type": "cardNode", "position": {"x": 800, "y": 1260}, "data": {"label": "Redis In-Memory Cache", "subLabel": "[redis:6379]", "container": "Execution & Storage", "containerColor": "#d97706", "filePath": "backend/app/core/cache.py", "tech": "Redis 7.0 Key-Value", "description": "Bộ nhớ đệm lưu phiên làm việc JWT, bảng xếp hạng Leaderboard và rate limit.", "badge": "Cache Tier", "upstream": "Auth / Kanban APIs", "downstream": "RAM", "defenseQA": "Cache invalidation hoạt động thế nào? Đáp: Tự động hết hạn qua TTL và xóa chủ động khi có sự kiện cập nhật."}},
        ],
        "edges": [
            {"id": "e-user-app", "source": "user", "target": "app-shell", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-app-login", "source": "app-shell", "target": "login", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-app-ws", "source": "app-shell", "target": "learning-ws", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-app-hub", "source": "app-shell", "target": "git-hub", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-app-kanban", "source": "app-shell", "target": "kanban-board", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-app-sched", "source": "app-shell", "target": "academic-sched", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-app-inst", "source": "app-shell", "target": "instructor-panel", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-app-admin", "source": "app-shell", "target": "admin-dash", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-kanban-csv", "source": "kanban-board", "target": "task-csv", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-client-api", "source": "learning-ws", "target": "api-client", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-hub-client", "source": "git-hub", "target": "api-client", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-client-startup", "source": "api-client", "target": "api-startup", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-api-router", "source": "api-startup", "target": "v1-router", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-router-auth", "source": "v1-router", "target": "auth", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-router-ai", "source": "v1-router", "target": "ai-apis", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-router-kanban", "source": "v1-router", "target": "kanban-apis", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-router-sub", "source": "v1-router", "target": "submissions", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-sub-eval", "source": "submissions", "target": "code-evaluator", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-eval-db", "source": "code-evaluator", "target": "mysql-db", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-auth-db", "source": "auth", "target": "mysql-db", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-kanban-db", "source": "kanban-apis", "target": "mysql-db", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-auth-redis", "source": "auth", "target": "redis-cache", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
        ]
    },
    "prj-ecommerce": {
        "title": "E-Commerce Microservices - Nền tảng Thương mại Điện tử SAGA Pattern",
        "techStack": "Next.js 14 + NestJS + Spring Boot + RabbitMQ + Redis + PostgreSQL / MySQL 8.0",
        "subsystems": [
            {"id": "group-campus-app", "label": "Client Storefront & Admin Portal (Next.js 14, Tailwind)", "stroke": "#2563eb", "width": 1780, "height": 260},
            {"id": "group-project-ws", "label": "API Gateway & Authentication Service (Kong / Spring Cloud)", "stroke": "#16a34a", "width": 1780, "height": 260},
            {"id": "group-api-core", "label": "Business Microservices Tier (Order, Product, Payment, Inventory)", "stroke": "#dc2626", "width": 1780, "height": 260},
            {"id": "group-infra-data", "label": "Event Bus & Polyglot Persistence (RabbitMQ, MySQL 8.0, Redis)", "stroke": "#d97706", "width": 1780, "height": 260},
        ],
        "flows": [
            {
                "id": "all",
                "label": "Toàn cảnh Microservices Kiến trúc SAGA",
                "color": "#2563eb",
                "summary": "Kiến trúc Microservices điều phối đơn hàng bất đồng bộ với Choreography SAGA Pattern.",
                "nodeIds": [],
                "edgeIds": [],
            },
            {
                "id": "flow-order",
                "label": "Luồng 1: Đặt hàng & Phối hợp SAGA Pattern",
                "color": "#16a34a",
                "summary": "Tạo đơn hàng -> Kiểm tra kho -> Giữ hàng -> Ủy quyền thanh toán -> Xuất kho thành công.",
                "nodeIds": ["storefront-ui", "api-gateway", "order-svc", "inventory-svc", "payment-svc", "rabbitmq-bus"],
                "edgeIds": ["e-store-gw", "e-gw-order", "e-order-bus", "e-bus-inv", "e-bus-pay"],
            },
            {
                "id": "flow-rollback",
                "label": "Luồng 2: Bù trừ Giao dịch (Compensating Transaction)",
                "color": "#dc2626",
                "summary": "Thanh toán thất bại -> Kích hoạt SAGA Rollback -> Nhả hàng tồn kho -> Hoàn tác đơn hàng.",
                "nodeIds": ["payment-svc", "rabbitmq-bus", "inventory-svc", "order-svc", "notification-svc"],
                "edgeIds": ["e-pay-bus-fail", "e-bus-inv-rollback", "e-bus-order-cancel"],
            },
        ],
        "nodes": [
            {"id": "group-campus-app", "type": "containerBox", "position": {"x": 80, "y": 70}, "data": {"label": "Phân tầng Frontend Storefront & Admin Portal", "stroke": "#2563eb", "width": 1780, "height": 260}},
            {"id": "group-project-ws", "type": "containerBox", "position": {"x": 80, "y": 440}, "data": {"label": "Phân tầng API Gateway & Định danh", "stroke": "#16a34a", "width": 1780, "height": 260}},
            {"id": "group-api-core", "type": "containerBox", "position": {"x": 80, "y": 810}, "data": {"label": "Phân tầng Microservices Nghiệp vụ", "stroke": "#dc2626", "width": 1780, "height": 260}},
            {"id": "group-infra-data", "type": "containerBox", "position": {"x": 80, "y": 1180}, "data": {"label": "Phân tầng Event Broker & Lưu trữ Đa hệ", "stroke": "#d97706", "width": 1780, "height": 260}},
            # Components
            {"id": "storefront-ui", "type": "cardNode", "position": {"x": 110, "y": 150}, "data": {"label": "Storefront Web App", "subLabel": "[Next.js 14 SSR]", "container": "Client Storefront", "containerColor": "#2563eb", "filePath": "src/app/page.tsx", "tech": "React 18 / Next.js", "description": "Giao diện mua sắm khách hàng tối ưu SEO và Server-side rendering.", "badge": "Storefront", "upstream": "Khách hàng", "downstream": "Kong Gateway", "defenseQA": "Tại sao dùng Next.js SSR? Đáp: Tối ưu SEO cho sản phẩm và cải thiện chỉ số Core Web Vitals."}},
            {"id": "admin-portal", "type": "cardNode", "position": {"x": 340, "y": 150}, "data": {"label": "Admin Merchant Portal", "subLabel": "[AdminPanel.tsx]", "container": "Client Storefront", "containerColor": "#2563eb", "filePath": "src/admin/Dashboard.tsx", "tech": "React SPA", "description": "Trang quản trị cho chủ cửa hàng duyệt đơn và cập nhật tồn kho.", "badge": "Merchant", "upstream": "Chủ shop", "downstream": "Kong Gateway", "defenseQA": "Phân quyền chủ shop thế nào? Đáp: Dùng RBAC với scope merchant:write."}},
            {"id": "api-gateway", "type": "cardNode", "position": {"x": 110, "y": 520}, "data": {"label": "Kong API Gateway", "subLabel": "[kong.yml]", "container": "API Gateway", "containerColor": "#16a34a", "filePath": "infra/gateway/kong.conf", "tech": "Kong / Nginx", "description": "Điểm truy cập duy nhất, định tuyến reverse proxy và rate limiting.", "badge": "Gateway", "upstream": "Storefront", "downstream": "Microservices", "defenseQA": "Gateway xử lý xác thực ra sao? Đáp: Giải mã JWT tại Gateway và inject X-User-Id header."}},
            {"id": "auth-service", "type": "cardNode", "position": {"x": 340, "y": 520}, "data": {"label": "Identity & Auth Service", "subLabel": "[AuthMicroservice]", "container": "API Gateway", "containerColor": "#16a34a", "filePath": "services/auth/main.py", "tech": "OAuth2 / Keycloak", "description": "Cấp phát JWT, xác thực vân tay session và refresh token xoay vòng.", "badge": "Auth Core", "upstream": "Kong Gateway", "downstream": "MySQL Auth DB", "defenseQA": "Ngăn chặn replay attack thế nào? Đáp: Dùng JTI nonce kiểm tra trong Redis."}},
            {"id": "order-svc", "type": "cardNode", "position": {"x": 110, "y": 890}, "data": {"label": "Order Service (SAGA Lead)", "subLabel": "[OrderController.java]", "container": "Business Microservices", "containerColor": "#dc2626", "filePath": "services/order/src/OrderService.java", "tech": "Spring Boot 3.2", "description": "Quản lý vòng đời đơn hàng và điều phối chu trình SAGA phân tán.", "badge": "Order Core", "upstream": "Kong Gateway", "downstream": "RabbitMQ", "defenseQA": "Tránh đơn hàng trùng lặp thế nào? Đáp: Idempotency Key gửi kèm trong header mỗi yêu cầu."}},
            {"id": "payment-svc", "type": "cardNode", "position": {"x": 340, "y": 890}, "data": {"label": "Payment Service", "subLabel": "[payment_handler.go]", "container": "Business Microservices", "containerColor": "#dc2626", "filePath": "services/payment/main.go", "tech": "Golang 1.22", "description": "Tích hợp cổng thanh toán VNPay/Stripe và xử lý webhook bảo mật.", "badge": "Payment", "upstream": "RabbitMQ / Order", "downstream": "Stripe API", "defenseQA": "Bảo vệ thông tin thanh toán PCI-DSS? Đáp: Không lưu số thẻ đầy đủ, chỉ lưu token hash."}},
            {"id": "inventory-svc", "type": "cardNode", "position": {"x": 570, "y": 890}, "data": {"label": "Inventory & Warehouse", "subLabel": "[inventory.service.ts]", "container": "Business Microservices", "containerColor": "#dc2626", "filePath": "services/inventory/src/service.ts", "tech": "NestJS", "description": "Quản lý tồn kho thời gian thực với khóa lạc quan (Optimistic Locking).", "badge": "Inventory", "upstream": "RabbitMQ", "downstream": "MySQL Database", "defenseQA": "Xử lý mua đồng thời khi còn 1 sản phẩm? Đáp: Dùng SELECT FOR UPDATE hoặc Version locking."}},
            {"id": "notification-svc", "type": "cardNode", "position": {"x": 800, "y": 890}, "data": {"label": "Notification Service", "subLabel": "[mailer_worker.py]", "container": "Business Microservices", "containerColor": "#dc2626", "filePath": "services/notify/worker.py", "tech": "Python Celery", "description": "Gửi email xác nhận, tin nhắn SMS và push notification thời gian thực.", "badge": "Notifier", "upstream": "RabbitMQ", "downstream": "SMTP / FCM", "defenseQA": "Tránh gửi trùng email thế nào? Đáp: Kiểm tra ID sự kiện đã xử lý trong Redis."}},
            {"id": "rabbitmq-bus", "type": "cardNode", "position": {"x": 110, "y": 1260}, "data": {"label": "RabbitMQ Message Broker", "subLabel": "[AMQP 0-9-1 Exchange]", "container": "Event Broker", "containerColor": "#d97706", "filePath": "infra/rabbitmq/definitions.json", "tech": "RabbitMQ Cluster", "description": "Truyền thông điệp bất đồng bộ giữa các microservices với cơ chế Dead Letter Queue.", "badge": "Event Bus", "upstream": "Order / Payment", "downstream": "Consumers", "defenseQA": "Xử lý sự kiện lỗi thế nào? Đáp: Đẩy vào Dead Letter Exchange và retry sau 5 phút."}},
            {"id": "mysql-ecom", "type": "cardNode", "position": {"x": 340, "y": 1260}, "data": {"label": "MySQL 8.0 Sharded Cluster", "subLabel": "[order_db / inv_db]", "container": "Event Broker", "containerColor": "#d97706", "filePath": "infra/mysql/my.cnf", "tech": "MySQL 8.0 Primary-Replica", "description": "Lưu trữ dữ liệu quan hệ với cơ chế Master-Slave nhân bản bất đồng bộ.", "badge": "RDBMS", "upstream": "Microservices", "downstream": "NVMe Storage", "defenseQA": "Tối ưu truy vấn bảng triệu bản ghi? Đáp: Phân vùng bảng (Partitioning) theo tháng và đánh index phù hợp."}},
        ],
        "edges": [
            {"id": "e-store-gw", "source": "storefront-ui", "target": "api-gateway", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-admin-gw", "source": "admin-portal", "target": "api-gateway", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-gw-auth", "source": "api-gateway", "target": "auth-service", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-gw-order", "source": "api-gateway", "target": "order-svc", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-order-bus", "source": "order-svc", "target": "rabbitmq-bus", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-bus-pay", "source": "rabbitmq-bus", "target": "payment-svc", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-bus-inv", "source": "rabbitmq-bus", "target": "inventory-svc", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-bus-notify", "source": "rabbitmq-bus", "target": "notification-svc", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-order-db", "source": "order-svc", "target": "mysql-ecom", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-inv-db", "source": "inventory-svc", "target": "mysql-ecom", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
        ]
    },
    "prj-compiler": {
        "title": "Mini C++ Compiler với AST Visualizer & LLVM IR Code Generation",
        "techStack": "C++17 + Flex & Bison + LLVM 16 + WebAssembly + React 18 Canvas",
        "subsystems": [
            {"id": "group-campus-app", "label": "Frontend AST Visualizer & Code Editor", "stroke": "#2563eb", "width": 1780, "height": 260},
            {"id": "group-project-ws", "label": "Lexical & Syntax Analysis Engine (Lex & Yacc)", "stroke": "#16a34a", "width": 1780, "height": 260},
            {"id": "group-api-core", "label": "Semantic Analysis & Symbol Table Resolver", "stroke": "#dc2626", "width": 1780, "height": 260},
            {"id": "group-infra-data", "label": "LLVM IR Generator & Machine Code Emitter", "stroke": "#d97706", "width": 1780, "height": 260},
        ],
        "flows": [
            {
                "id": "all",
                "label": "Toàn cảnh Quy trình Biên dịch 4 Giai đoạn",
                "color": "#2563eb",
                "summary": "Source Code -> Tokens -> AST -> Typed AST -> LLVM Intermediate Representation -> Executable.",
                "nodeIds": [],
                "edgeIds": [],
            },
            {
                "id": "flow-parse",
                "label": "Luồng 1: Phân tích Cú pháp & Dựng cây AST",
                "color": "#16a34a",
                "summary": "Lexer quét từ vựng -> Parser dựng cây AST -> Báo lỗi cú pháp kèm dòng và cột.",
                "nodeIds": ["editor-ui", "lexer-flex", "parser-bison", "ast-visualizer"],
                "edgeIds": ["e-ed-lex", "e-lex-parse", "e-parse-ast"],
            },
            {
                "id": "flow-codegen",
                "label": "Luồng 2: Kiểm tra Ngữ nghĩa & Sinh mã LLVM IR",
                "color": "#dc2626",
                "summary": "Duyệt cây AST -> Phân giải kiểu dữ liệu trong Symbol Table -> Sinh mã LLVM IR -> Tối ưu hóa -O2.",
                "nodeIds": ["parser-bison", "type-checker", "symbol-table", "llvm-emitter"],
                "edgeIds": ["e-parse-type", "e-type-sym", "e-type-llvm"],
            },
        ],
        "nodes": [
            {"id": "group-campus-app", "type": "containerBox", "position": {"x": 80, "y": 70}, "data": {"label": "Phân tầng Giao diện & Trực quan hóa AST", "stroke": "#2563eb", "width": 1780, "height": 260}},
            {"id": "group-project-ws", "type": "containerBox", "position": {"x": 80, "y": 440}, "data": {"label": "Phân tầng Phân tích Từ vựng & Cú pháp", "stroke": "#16a34a", "width": 1780, "height": 260}},
            {"id": "group-api-core", "type": "containerBox", "position": {"x": 80, "y": 810}, "data": {"label": "Phân tầng Kiểm tra Ngữ nghĩa & Bảng Ký hiệu", "stroke": "#dc2626", "width": 1780, "height": 260}},
            {"id": "group-infra-data", "type": "containerBox", "position": {"x": 80, "y": 1180}, "data": {"label": "Phân tầng Tối ưu & Sinh mã LLVM IR", "stroke": "#d97706", "width": 1780, "height": 260}},
            # Components
            {"id": "editor-ui", "type": "cardNode", "position": {"x": 110, "y": 150}, "data": {"label": "C++ Code Editor", "subLabel": "[MonacoEditor.tsx]", "container": "Client UI", "containerColor": "#2563eb", "filePath": "src/editor.tsx", "tech": "Monaco Editor", "description": "Giao diện soạn thảo C++ kèm highlight từ khóa và số dòng.", "badge": "Editor", "upstream": "Sinh viên", "downstream": "WebAssembly Lexer", "defenseQA": "Làm sao editor nhận diện lỗi tức thời? Đáp: Chạy WebAssembly compiler nền trên Web Worker."}},
            {"id": "ast-visualizer", "type": "cardNode", "position": {"x": 340, "y": 150}, "data": {"label": "Interactive AST Tree Visualizer", "subLabel": "[ASTCanvas.tsx]", "container": "Client UI", "containerColor": "#2563eb", "filePath": "src/components/ASTCanvas.tsx", "tech": "D3.js / SVG", "description": "Hiển thị cây cú pháp trừu tượng có thể thu phóng và nhấp xem chi tiết node.", "badge": "Visualizer", "upstream": "Parser", "downstream": "Canvas", "defenseQA": "Xử lý cây AST hàng nghìn node không bị đơ? Đáp: Thu gọn nhánh đệ quy (collapsible nodes)."}},
            {"id": "lexer-flex", "type": "cardNode", "position": {"x": 110, "y": 520}, "data": {"label": "Lexer (Tokenizer)", "subLabel": "[lexer.l]", "container": "Lexer Tier", "containerColor": "#16a34a", "filePath": "compiler/src/lexer.l", "tech": "Flex / C++", "description": "Quét luồng ký tự thành các Token (KEYWORD, IDENTIFIER, OPERATOR, LITERAL).", "badge": "Lexer", "upstream": "Editor", "downstream": "Bison Parser", "defenseQA": "Xử lý nhận diện chuỗi ký tự unicode ra sao? Đáp: Dùng UTF-8 decoder trạng thái trước khi quét regex."}},
            {"id": "parser-bison", "type": "cardNode", "position": {"x": 340, "y": 520}, "data": {"label": "Parser LALR(1)", "subLabel": "[parser.y]", "container": "Parser Tier", "containerColor": "#16a34a", "filePath": "compiler/src/parser.y", "tech": "Bison / C++17", "description": "Phân tích ngữ pháp phi ngữ cảnh và khởi tạo cấu trúc nút cây AST.", "badge": "Parser", "upstream": "Lexer", "downstream": "Type Checker", "defenseQA": "Giải quyết xung đột Shift/Reduce trong câu lệnh IF-ELSE thế nào? Đáp: Khai báo %nonassoc LOWER_THAN_ELSE và %nonassoc ELSE."}},
            {"id": "type-checker", "type": "cardNode", "position": {"x": 110, "y": 890}, "data": {"label": "Semantic Type Checker", "subLabel": "[semantic.cpp]", "container": "Semantic Tier", "containerColor": "#dc2626", "filePath": "compiler/src/semantic.cpp", "tech": "C++17 Visitor Pattern", "description": "Kiểm tra tương thích kiểu dữ liệu (int, float, bool, pointer), ép kiểu ngầm định.", "badge": "Type Checker", "upstream": "Parser", "downstream": "Symbol Table", "defenseQA": "Phát hiện biến chưa khai báo thế nào? Đáp: Tra cứu trong bảng Symbol Table theo tầm vực (Scope chain)."}},
            {"id": "symbol-table", "type": "cardNode", "position": {"x": 340, "y": 890}, "data": {"label": "Scoped Symbol Table", "subLabel": "[symbol_table.h]", "container": "Semantic Tier", "containerColor": "#dc2626", "filePath": "compiler/src/symbol_table.h", "tech": "Hash Map Stack", "description": "Lưu trữ định danh, kiểu, offset bộ nhớ và tầm vực biến cục bộ/toàn cục.", "badge": "Symbol Table", "upstream": "Type Checker", "downstream": "LLVM Emitter", "defenseQA": "Quản lý tầm vực biến lồng nhau ra sao? Đáp: Cấu trúc dữ liệu Stack of HashMaps (Scope Hierarchy)."}},
            {"id": "llvm-emitter", "type": "cardNode", "position": {"x": 110, "y": 1260}, "data": {"label": "LLVM IR Code Generator", "subLabel": "[codegen.cpp]", "container": "LLVM Tier", "containerColor": "#d97706", "filePath": "compiler/src/codegen.cpp", "tech": "LLVM 16 C++ API", "description": "Sinh mã trung gian LLVM IR SSA-form, tối ưu hóa qua pass manager.", "badge": "IR Generator", "upstream": "Type Checker", "downstream": "Clang Assembler", "defenseQA": "SSA form là gì và tại sao cần thiết? Đáp: Static Single Assignment giúp trình biên dịch tối ưu biến và thanh ghi dễ dàng."}},
            {"id": "wasm-target", "type": "cardNode", "position": {"x": 340, "y": 1260}, "data": {"label": "WebAssembly Backend", "subLabel": "[wasm_target.cpp]", "container": "LLVM Tier", "containerColor": "#d97706", "filePath": "compiler/src/wasm.cpp", "tech": "Emscripten / Wasm", "description": "Biên dịch mã đích sang file nhị phân .wasm để chạy trực tiếp trên trình duyệt.", "badge": "WASM Output", "upstream": "LLVM Emitter", "downstream": "Browser Runtime", "defenseQA": "Lợi ích khi compile sang WebAssembly? Đáp: Chạy trực tiếp sandbox trên trình duyệt sinh viên mà không tốn server."}},
        ],
        "edges": [
            {"id": "e-ed-lex", "source": "editor-ui", "target": "lexer-flex", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-lex-parse", "source": "lexer-flex", "target": "parser-bison", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-parse-ast", "source": "parser-bison", "target": "ast-visualizer", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-parse-type", "source": "parser-bison", "target": "type-checker", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-type-sym", "source": "type-checker", "target": "symbol-table", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-type-llvm", "source": "type-checker", "target": "llvm-emitter", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-llvm-wasm", "source": "llvm-emitter", "target": "wasm-target", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
        ]
    },
    "prj-security": {
        "title": "Cybersecurity AI-IDS & DAST - Quét Lỗ Hổng Web Tự Động (OWASP Top 10)",
        "techStack": "Python 3.11 + Playwright Headless + Suricata + XGBoost + SQLite / MySQL 8.0",
        "subsystems": [
            {"id": "group-campus-app", "label": "Security Operations Center (SOC Web Dashboard)", "stroke": "#2563eb", "width": 1780, "height": 260},
            {"id": "group-project-ws", "label": "Attack Surface Crawler & Fuzzing Engine", "stroke": "#16a34a", "width": 1780, "height": 260},
            {"id": "group-api-core", "label": "Vulnerability Scanner Modules (SQLi, XSS, SSRF)", "stroke": "#dc2626", "width": 1780, "height": 260},
            {"id": "group-infra-data", "label": "AI Exploit Verification & Compliance Reporting", "stroke": "#d97706", "width": 1780, "height": 260},
        ],
        "flows": [
            {
                "id": "all",
                "label": "Toàn cảnh Quy trình DAST & IDS",
                "color": "#2563eb",
                "summary": "Thu thập URL -> Fuzzing Payload -> Bắt phản hồi bất thường -> AI xác minh PoC -> Báo cáo CVSS 3.1.",
                "nodeIds": [],
                "edgeIds": [],
            },
            {
                "id": "flow-sqli",
                "label": "Luồng 1: Phát hiện & Xác minh SQL Injection",
                "color": "#dc2626",
                "summary": "Tiêm Payload boolean-based / time-based -> Đo độ trễ phản hồi -> AI PoC chứng minh lỗi.",
                "nodeIds": ["soc-dash", "crawler-engine", "sqli-detector", "poc-verifier", "mysql-sec"],
                "edgeIds": ["e-soc-crawl", "e-crawl-sqli", "e-sqli-poc", "e-poc-db"],
            },
            {
                "id": "flow-xss",
                "label": "Luồng 2: Kiểm thử XSS Trong Trình duyệt Headless",
                "color": "#d97706",
                "summary": "Tiêm payload SVG/Script -> Playwright bắt dialog alert -> Chụp màn hình bằng chứng PoC.",
                "nodeIds": ["crawler-engine", "xss-detector", "headless-browser", "poc-verifier"],
                "edgeIds": ["e-crawl-xss", "e-xss-browser", "e-browser-poc"],
            },
        ],
        "nodes": [
            {"id": "group-campus-app", "type": "containerBox", "position": {"x": 80, "y": 70}, "data": {"label": "Phân tầng Bảng điều khiển Giám sát An toàn (SOC Console)", "stroke": "#2563eb", "width": 1780, "height": 260}},
            {"id": "group-project-ws", "type": "containerBox", "position": {"x": 80, "y": 440}, "data": {"label": "Phân tầng Thu thập Bề mặt Tấn công & Fuzzing", "stroke": "#16a34a", "width": 1780, "height": 260}},
            {"id": "group-api-core", "type": "containerBox", "position": {"x": 80, "y": 810}, "data": {"label": "Phân tầng Động cơ Phát hiện Lỗ hổng OWASP", "stroke": "#dc2626", "width": 1780, "height": 260}},
            {"id": "group-infra-data", "type": "containerBox", "position": {"x": 80, "y": 1180}, "data": {"label": "Phân tầng Xác thực Bằng chứng PoC & Xuất báo cáo", "stroke": "#d97706", "width": 1780, "height": 260}},
            # Components
            {"id": "soc-dash", "type": "cardNode", "position": {"x": 110, "y": 150}, "data": {"label": "SOC Incident Console", "subLabel": "[SecurityDashboard.tsx]", "container": "SOC Console", "containerColor": "#2563eb", "filePath": "src/screens/SOCDashboard.tsx", "tech": "React 18 / Lucide", "description": "Biểu đồ mối đe dọa thời gian thực, điểm số CVSS và danh sách cảnh báo đỏ.", "badge": "SOC Console", "upstream": "Chuyên viên An ninh", "downstream": "FastAPI Scanner", "defenseQA": "Tiêu chí đánh giá mức độ nghiêm trọng? Đáp: Tính theo chuẩn CVSS 3.1 Base Score."}},
            {"id": "crawler-engine", "type": "cardNode", "position": {"x": 110, "y": 520}, "data": {"label": "Playwright Attack Crawler", "subLabel": "[crawler.py]", "container": "Crawler Tier", "containerColor": "#16a34a", "filePath": "scanner/crawler.py", "tech": "Playwright Async", "description": "Duyệt tìm tất cả Form, Input, URL parameters và API endpoints của mục tiêu.", "badge": "Crawler", "upstream": "SOC Console", "downstream": "Fuzzing Engine", "defenseQA": "Làm sao quét các trang yêu cầu đăng nhập? Đáp: Tự động inject cookie phiên đã xác thực."}},
            {"id": "sqli-detector", "type": "cardNode", "position": {"x": 110, "y": 890}, "data": {"label": "SQL Injection Engine", "subLabel": "[sqli_scanner.py]", "container": "Detector Tier", "containerColor": "#dc2626", "filePath": "scanner/sqli.py", "tech": "Python / AsyncIO", "description": "Kiểm thử Time-based Blind, Error-based và Boolean-based SQL Injection.", "badge": "SQLi Scanner", "upstream": "Crawler", "downstream": "PoC Verifier", "defenseQA": "Tránh phá hoại cơ sở dữ liệu mục tiêu ra sao? Đáp: Chỉ dùng lệnh SELECT 1 và SLEEP(2), không dùng DROP hay UPDATE."}},
            {"id": "xss-detector", "type": "cardNode", "position": {"x": 340, "y": 890}, "data": {"label": "DOM & Stored XSS Scanner", "subLabel": "[xss_scanner.py]", "container": "Detector Tier", "containerColor": "#dc2626", "filePath": "scanner/xss.py", "tech": "Playwright Hook", "description": "Bắt sự kiện JavaScript alert/prompt và kiểm tra bối cảnh HTML context.", "badge": "XSS Scanner", "upstream": "Crawler", "downstream": "Headless Browser", "defenseQA": "Phân biệt False Positive XSS thế nào? Đáp: Chỉ xác nhận có lỗi khi mã độc thực sự kích hoạt hàm eval/alert."}},
            {"id": "headless-browser", "type": "cardNode", "position": {"x": 570, "y": 890}, "data": {"label": "Headless Chromium Sandbox", "subLabel": "[playwright_vm]", "container": "Detector Tier", "containerColor": "#dc2626", "filePath": "scanner/browser_sandbox.py", "tech": "Chromium Headless", "description": "Trình duyệt cô lập để render trang và phát hiện DOM sink execution.", "badge": "Browser VM", "upstream": "XSS Scanner", "downstream": "PoC Verifier", "defenseQA": "Tại sao dùng Headless browser thay vì Regex? Đáp: Bắt buộc render DOM thực tế mới phát hiện được DOM XSS phức tạp."}},
            {"id": "poc-verifier", "type": "cardNode", "position": {"x": 110, "y": 1260}, "data": {"label": "AI PoC Verifier & CVSS Scorer", "subLabel": "[ai_poc_engine.py]", "container": "PoC Tier", "containerColor": "#d97706", "filePath": "scanner/ai_verifier.py", "tech": "Gemini AI / Heuristic", "description": "Tự động tạo Proof-of-Concept, loại bỏ cảnh báo giả và gán nhãn MITRE ATT&CK.", "badge": "PoC Engine", "upstream": "Detectors", "downstream": "PDF Reporter", "defenseQA": "Loại bỏ False Positive bằng cách nào? Đáp: AI kiểm tra lại kịch bản khai thác 3 lần độc lập với payload khác nhau."}},
            {"id": "mysql-sec", "type": "cardNode", "position": {"x": 340, "y": 1260}, "data": {"label": "Security Findings MySQL DB", "subLabel": "[vuln_findings table]", "container": "PoC Tier", "containerColor": "#d97706", "filePath": "backend/app/core/database.py", "tech": "MySQL 8.0 InnoDB", "description": "Lưu trữ nhật ký quét, bằng chứng HTTP request/response và lịch sử khắc phục.", "badge": "Security DB", "upstream": "PoC Verifier", "downstream": "Storage", "defenseQA": "Bảo vệ báo cáo lỗ hổng nhạy cảm thế nào? Đáp: Mã hóa cột bằng chứng HTTP request/response bằng AES-256."}},
        ],
        "edges": [
            {"id": "e-soc-crawl", "source": "soc-dash", "target": "crawler-engine", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-crawl-sqli", "source": "crawler-engine", "target": "sqli-detector", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-crawl-xss", "source": "crawler-engine", "target": "xss-detector", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-xss-browser", "source": "xss-detector", "target": "headless-browser", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-browser-poc", "source": "headless-browser", "target": "poc-verifier", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-sqli-poc", "source": "sqli-detector", "target": "poc-verifier", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-poc-db", "source": "poc-verifier", "target": "mysql-sec", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
        ]
    }
}


def get_default_architecture_for_project(project_id: str, project_name: str, repo_url: str) -> dict[str, Any]:
    """
    Trả về kiến trúc phân tầng chuẩn phù hợp với project_id.
    Nếu thuộc 4 catalog đặc biệt -> trả về catalog đó.
    Nếu là các project còn lại -> tự động sinh kiến trúc động phù hợp với tên đề tài.
    """
    if project_id in PROJECT_ARCHITECTURES_CATALOG:
        data = dict(PROJECT_ARCHITECTURES_CATALOG[project_id])
        data["projectId"] = project_id
        data["projectName"] = project_name
        data["repoUrl"] = repo_url
        return data

    # Sinh kiến trúc động thông minh cho các đề tài còn lại
    return _generate_smart_project_architecture(project_id, project_name, repo_url)


def _generate_smart_project_architecture(project_id: str, project_name: str, repo_url: str) -> dict[str, Any]:
    """Sinh kiến trúc 4 phân tầng động tương thích hoàn toàn với GitDiagram."""
    return {
        "projectId": project_id,
        "projectName": project_name,
        "repoUrl": repo_url,
        "title": f"{project_name} - Kiến trúc Phân tầng Động",
        "techStack": "Microservices + React / Vue + FastAPI / Go + CSDL MySQL 8.0 + CI/CD",
        "subsystems": [
            {"id": "group-campus-app", "label": "Client Interface & Visualization Layer", "stroke": "#2563eb", "width": 1780, "height": 260},
            {"id": "group-project-ws", "label": "API Gateway & Traffic Routing Layer", "stroke": "#16a34a", "width": 1780, "height": 260},
            {"id": "group-api-core", "label": "Core Business Engine & Logic Microservices", "stroke": "#dc2626", "width": 1780, "height": 260},
            {"id": "group-infra-data", "label": "Storage, Cache & Hardware/Cloud Infrastructure", "stroke": "#d97706", "width": 1780, "height": 260},
        ],
        "flows": [
            {
                "id": "all",
                "label": "Toàn cảnh Kiến trúc Phân tầng",
                "color": "#2563eb",
                "summary": "Tổng thể các tầng giao diện, gateway, dịch vụ lõi và cơ sở dữ liệu quan hệ.",
                "nodeIds": [],
                "edgeIds": [],
            },
            {
                "id": "flow-core",
                "label": "Luồng 1: Tiếp nhận Yêu cầu & Xử lý Nghiệp vụ",
                "color": "#16a34a",
                "summary": "Người dùng gửi request -> Gateway kiểm tra quyền -> Controller xử lý -> Ghi dữ liệu.",
                "nodeIds": ["client-ui", "api-gw", "biz-core", "db-node"],
                "edgeIds": ["e-ui-gw", "e-gw-core", "e-core-db"],
            },
            {
                "id": "flow-ai",
                "label": "Luồng 2: Phân tích Dữ liệu Nâng cao & AI",
                "color": "#dc2626",
                "summary": "Bộ điều hướng chuyển dữ liệu sang module phân tích chuyên sâu và phản hồi kết quả.",
                "nodeIds": ["api-gw", "ai-engine", "db-node"],
                "edgeIds": ["e-gw-ai", "e-ai-db"],
            },
        ],
        "nodes": [
            {"id": "group-campus-app", "type": "containerBox", "position": {"x": 80, "y": 70}, "data": {"label": "Phân tầng Giao diện Người dùng (Client Layer)", "stroke": "#2563eb", "width": 1780, "height": 260}},
            {"id": "group-project-ws", "type": "containerBox", "position": {"x": 80, "y": 440}, "data": {"label": "Phân tầng Định tuyến & Cổng API (Gateway Tier)", "stroke": "#16a34a", "width": 1780, "height": 260}},
            {"id": "group-api-core", "type": "containerBox", "position": {"x": 80, "y": 810}, "data": {"label": "Phân tầng Động cơ Nghiệp vụ Lõi (Business Core)", "stroke": "#dc2626", "width": 1780, "height": 260}},
            {"id": "group-infra-data", "type": "containerBox", "position": {"x": 80, "y": 1180}, "data": {"label": "Phân tầng Hạ tầng & Lưu trữ Dữ liệu (Persistence)", "stroke": "#d97706", "width": 1780, "height": 260}},
            # Components
            {"id": "client-ui", "type": "cardNode", "position": {"x": 110, "y": 150}, "data": {"label": f"{project_name} Web Portal", "subLabel": "[AppView.tsx]", "container": "Client Layer", "containerColor": "#2563eb", "filePath": "src/App.tsx", "tech": "React 18 / TypeScript", "description": "Giao diện người dùng thời gian thực tích hợp REST/WebSocket.", "badge": "Frontend", "upstream": "Người dùng", "downstream": "API Gateway", "defenseQA": "Frontend tối ưu hiệu năng ra sao? Đáp: Sử dụng code-splitting, lazy loading và bộ nhớ đệm React Query."}},
            {"id": "analytics-view", "type": "cardNode", "position": {"x": 340, "y": 150}, "data": {"label": "Real-time Telemetry Dashboard", "subLabel": "[Dashboard.tsx]", "container": "Client Layer", "containerColor": "#2563eb", "filePath": "src/screens/Dashboard.tsx", "tech": "Recharts / Tailwind", "description": "Biểu đồ trực quan hóa dữ liệu thống kê và trạng thái hoạt động.", "badge": "Analytics", "upstream": "Client UI", "downstream": "API Gateway", "defenseQA": "Làm sao hiển thị biểu đồ mượt mà? Đáp: Debounce dữ liệu đầu vào và render canvas theo frame."}},
            {"id": "api-gw", "type": "cardNode", "position": {"x": 110, "y": 520}, "data": {"label": "Reverse Proxy & API Gateway", "subLabel": "[gateway.py]", "container": "Gateway Tier", "containerColor": "#16a34a", "filePath": "backend/app/gateway.py", "tech": "FastAPI / Nginx", "description": "Xác thực JWT token, phân tải và rate limiting cho các yêu cầu.", "badge": "Gateway", "upstream": "Client UI", "downstream": "Business Core", "defenseQA": "Gateway xử lý phân quyền ra sao? Đáp: Kiểm tra RBAC trong header Authorization trước khi chuyển tiếp."}},
            {"id": "auth-layer", "type": "cardNode", "position": {"x": 340, "y": 520}, "data": {"label": "Security & Token Validator", "subLabel": "[security.py]", "container": "Gateway Tier", "containerColor": "#16a34a", "filePath": "backend/app/core/security.py", "tech": "HMAC-SHA256 / JWT", "description": "Kiểm tra tính hợp lệ của token và quyền thực thi.", "badge": "Security", "upstream": "API Gateway", "downstream": "Database", "defenseQA": "Bảo vệ mã hóa mật khẩu thế nào? Đáp: Sử dụng thuật toán băm Bcrypt 12 vòng muối."}},
            {"id": "biz-core", "type": "cardNode", "position": {"x": 110, "y": 890}, "data": {"label": f"{project_name} Core Controller", "subLabel": "[controller.py]", "container": "Business Core", "containerColor": "#dc2626", "filePath": "backend/app/controllers.py", "tech": "FastAPI / Python", "description": "Thực thi các quy tắc nghiệp vụ chính của đề tài đồ án.", "badge": "Core Engine", "upstream": "API Gateway", "downstream": "Database", "defenseQA": "Đảm bảo tính toàn vẹn nghiệp vụ thế nào? Đáp: Sử dụng Transaction rollback và validation schema Pydantic."}},
            {"id": "ai-engine", "type": "cardNode", "position": {"x": 340, "y": 890}, "data": {"label": "AI Analytics & Prediction Unit", "subLabel": "[ai_unit.py]", "container": "Business Core", "containerColor": "#dc2626", "filePath": "backend/app/ai.py", "tech": "Machine Learning Model", "description": "Mô hình suy luận dữ liệu và đưa ra gợi ý phân tích nâng cao.", "badge": "AI Engine", "upstream": "API Gateway", "downstream": "Database", "defenseQA": "Độ chính xác mô hình được thẩm định ra sao? Đáp: Đánh giá qua bộ test set độc lập với chỉ số F1-Score > 0.88."}},
            {"id": "db-node", "type": "cardNode", "position": {"x": 110, "y": 1260}, "data": {"label": "MySQL 8.0 Primary RDBMS", "subLabel": "[codemind_ai database]", "container": "Persistence", "containerColor": "#d97706", "filePath": "backend/app/core/database.py", "tech": "MySQL 8.0 InnoDB", "description": "Lưu trữ dữ liệu toàn vẹn ACID với hệ thống khóa ngoại và chỉ mục B-Tree.", "badge": "MySQL DB", "upstream": "Controllers", "downstream": "Disk Storage", "defenseQA": "Chiến lược backup cơ sở dữ liệu là gì? Đáp: Tự động mysqldump định kỳ hàng ngày và lưu trữ bản ghi binlog."}},
            {"id": "cache-node", "type": "cardNode", "position": {"x": 340, "y": 1260}, "data": {"label": "Distributed Cache & Memory", "subLabel": "[Redis 7.0]", "container": "Persistence", "containerColor": "#d97706", "filePath": "infra/redis.conf", "tech": "Redis Key-Value", "description": "Tăng tốc truy vấn và giảm tải cho cơ sở dữ liệu quan hệ.", "badge": "Cache Tier", "upstream": "Controllers", "downstream": "RAM", "defenseQA": "Xử lý cache stampede ra sao? Đáp: Dùng mutex lock phân tán khi làm mới khóa cache."}},
        ],
        "edges": [
            {"id": "e-ui-gw", "source": "client-ui", "target": "api-gw", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-dash-gw", "source": "analytics-view", "target": "api-gw", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-gw-auth", "source": "api-gw", "target": "auth-layer", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-gw-core", "source": "api-gw", "target": "biz-core", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-gw-ai", "source": "api-gw", "target": "ai-engine", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-core-db", "source": "biz-core", "target": "db-node", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-ai-db", "source": "ai-engine", "target": "db-node", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-core-cache", "source": "biz-core", "target": "cache-node", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
        ]
    }
