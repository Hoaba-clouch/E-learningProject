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


def _extract_slug(repo_url: str) -> str:
    from urllib.parse import urlparse
    parsed = urlparse((repo_url or "").strip())
    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) >= 2:
        return f"{parts[0].lower()}/{parts[1].removesuffix('.git').lower()}"
    if len(parts) == 1:
        return parts[0].removesuffix(".git").lower()
    return "hoaba-clouch/e-learningproject"


def generate_architecture_for_repo(repo_url: str, project_id: str = "prj-codemind", project_name: str = "") -> dict[str, Any]:
    """
    Sinh sơ đồ kiến trúc động phản ánh 100% theo Repository URL được dán.
    Hỗ trợ các miền kiến trúc chuyên sâu:
    - Frontend / UI Libs (React, Vue, Svelte, Next, Vite)
    - Backend / Microservices (FastAPI, Spring, Express, Nest, Gin)
    - Systems / OS Kernel (Linux, Kernel, OS, C++, Low-Level)
    - Compilers / AST (Flex, Bison, LLVM, WebAssembly)
    - General Fullstack System (Bất kỳ repository nào khác)
    """
    slug = _extract_slug(repo_url)
    s = slug.lower()
    if (slug == "hoaba-clouch/e-learningproject" or "codemind" in s or "e-learning" in s or not slug) and project_id in PROJECT_ARCHITECTURES_CATALOG:
        data = dict(PROJECT_ARCHITECTURES_CATALOG[project_id])
        data["projectId"] = project_id
        data["projectName"] = project_name or data.get("projectName", "CodeMind AI")
        data["repoUrl"] = repo_url
        return data

    owner, repo_name = slug.split("/", 1) if "/" in slug else ("github", slug)
    clean_name = repo_name.replace("-", " ").replace("_", " ").title()
    s = slug.lower()

    if any(k in s for k in ["react", "vue", "svelte", "angular", "next", "nuxt", "vite", "tailwind", "ui", "frontend"]):
        return _build_frontend_architecture(project_id, clean_name, repo_url, slug, owner, repo_name)
    elif any(k in s for k in ["fastapi", "flask", "django", "spring", "express", "nest", "gin", "fiber", "backend", "api", "server", "microservice"]):
        return _build_backend_architecture(project_id, clean_name, repo_url, slug, owner, repo_name)
    elif any(k in s for k in ["linux", "kernel", "os", "driver", "embedded", "qemu", "glibc", "system"]):
        return _build_systems_architecture(project_id, clean_name, repo_url, slug, owner, repo_name)
    elif any(k in s for k in ["compiler", "llvm", "ast", "parser", "flex", "bison"]):
        return _build_compiler_architecture(project_id, clean_name, repo_url, slug, owner, repo_name)
    else:
        return _build_general_architecture(project_id, clean_name, repo_url, slug, owner, repo_name)


def get_default_architecture_for_project(project_id: str, project_name: str, repo_url: str) -> dict[str, Any]:
    """
    Trả về kiến trúc phân tầng chuẩn phù hợp với repo_url và project_id.
    Nếu repo_url được đổi sang một repository khác -> tự động sinh kiến trúc động phù hợp với repo đó!
    """
    return generate_architecture_for_repo(repo_url, project_id, project_name)


def _build_frontend_architecture(project_id: str, clean_name: str, repo_url: str, slug: str, owner: str, repo_name: str) -> dict[str, Any]:
    return {
        "projectId": project_id,
        "projectName": f"{clean_name} UI Engine",
        "repoUrl": repo_url,
        "title": f"{owner}/{repo_name} - Sơ đồ Kiến trúc Reconciler & Component Tree",
        "techStack": "TypeScript + React Fiber / Virtual DOM + Hooks Engine + SSR Streaming",
        "subsystems": [
            {"id": "group-campus-app", "label": "Client Component Tree & State Tier", "stroke": "#2563eb", "width": 1780, "height": 260},
            {"id": "group-project-ws", "label": "Reconciliation & Virtual DOM Tier", "stroke": "#16a34a", "width": 1780, "height": 260},
            {"id": "group-api-core", "label": "Compilation & Optimization Pipeline", "stroke": "#dc2626", "width": 1780, "height": 260},
            {"id": "group-infra-data", "label": "Host Runtime & Distribution Tier", "stroke": "#d97706", "width": 1780, "height": 260},
        ],
        "flows": [
            {
                "id": "all",
                "label": f"Toàn cảnh Kiến trúc {clean_name}",
                "color": "#2563eb",
                "summary": f"Hiển thị tổng thể 4 phân tầng kiến trúc của thư viện {clean_name}: State, Fiber Reconciler, Compiler và DOM Runtime.",
                "nodeIds": [],
                "edgeIds": [],
            },
            {
                "id": "flow-mount",
                "label": "Luồng 1: Mount Component & Render Virtual DOM",
                "color": "#16a34a",
                "summary": "Root khởi tạo cây Component -> Đăng ký Context State -> Tạo cấu trúc Fiber ảo -> Commit sang DOM thực.",
                "nodeIds": ["app-root", "state-store", "vdom-fiber", "dom-renderer"],
                "edgeIds": ["e-app-state", "e-state-fiber", "e-fiber-dom"],
            },
            {
                "id": "flow-update",
                "label": "Luồng 2: Cập nhật State & Reconciler Diffing",
                "color": "#dc2626",
                "summary": "Hooks kích hoạt cập nhật -> Xếp hàng Concurrent Scheduler -> Diffing so sánh key -> Cập nhật DOM cục bộ.",
                "nodeIds": ["hook-scheduler", "vdom-fiber", "diff-heuristic", "dom-renderer"],
                "edgeIds": ["e-hook-fiber", "e-fiber-diff", "e-diff-dom"],
            },
            {
                "id": "flow-ssr",
                "label": "Luồng 3: Streaming SSR & Hydration",
                "color": "#d97706",
                "summary": "Render cây component trên Server -> Stream chunk HTML thô -> Tải script Client và Hydrate tái kết nối sự kiện.",
                "nodeIds": ["app-root", "ssr-stream", "dom-renderer"],
                "edgeIds": ["e-app-ssr", "e-ssr-dom"],
            },
        ],
        "nodes": [
            {"id": "group-campus-app", "type": "containerBox", "position": {"x": 80, "y": 70}, "data": {"label": "Phân tầng Component Tree & State Management", "stroke": "#2563eb", "width": 1780, "height": 260}},
            {"id": "group-project-ws", "type": "containerBox", "position": {"x": 80, "y": 440}, "data": {"label": "Phân tầng Reconciliation & Virtual DOM Engine", "stroke": "#16a34a", "width": 1780, "height": 260}},
            {"id": "group-api-core", "type": "containerBox", "position": {"x": 80, "y": 810}, "data": {"label": "Phân tầng Compilation & Optimization Pipeline", "stroke": "#dc2626", "width": 1780, "height": 260}},
            {"id": "group-infra-data", "type": "containerBox", "position": {"x": 80, "y": 1180}, "data": {"label": "Phân tầng Host Runtime & Rendering Execution", "stroke": "#d97706", "width": 1780, "height": 260}},
            # Components Layer 1
            {"id": "app-root", "type": "cardNode", "position": {"x": 110, "y": 150}, "data": {"label": f"{clean_name} App Root", "subLabel": "[AppRoot.tsx]", "container": "Component Tier", "containerColor": "#2563eb", "filePath": "src/App.tsx", "tech": "React 19 / JSX", "description": "Cây Root Component khởi tạo Context Providers và Error Boundaries.", "badge": "Root Tree", "upstream": "Browser Host", "downstream": "Fiber Reconciler", "defenseQA": "Tối ưu render lại cho component con thế nào? Đáp: Sử dụng React.memo và auto-memoization compiler."}},
            {"id": "state-store", "type": "cardNode", "position": {"x": 340, "y": 150}, "data": {"label": "State Store & Context", "subLabel": "[store.ts]", "container": "Component Tier", "containerColor": "#2563eb", "filePath": "src/state/store.ts", "tech": "Signals / Zustand", "description": "Lưu trữ trạng thái toàn cục ứng dụng và đồng bộ hóa qua atomic subscriptions.", "badge": "Global State", "upstream": "App Root", "downstream": "Hooks Scheduler", "defenseQA": "Làm sao tránh unnecessary re-renders? Đáp: Sử dụng fine-grained selectors và subscription listeners."}},
            {"id": "hook-scheduler", "type": "cardNode", "position": {"x": 570, "y": 150}, "data": {"label": "Hooks Scheduler", "subLabel": "[scheduler.ts]", "container": "Component Tier", "containerColor": "#2563eb", "filePath": "src/hooks/scheduler.ts", "tech": "Concurrent Mode", "description": "Điều phối thứ tự ưu tiên render, xử lý useTransition và Suspense promises.", "badge": "Scheduler", "upstream": "State Store", "downstream": "Fiber Reconciler", "defenseQA": "Cơ chế time-slicing hoạt động ra sao? Đáp: Sử dụng MessageChannel để nhường luồng chính cho input người dùng."}},
            # Components Layer 2
            {"id": "vdom-fiber", "type": "cardNode", "position": {"x": 110, "y": 520}, "data": {"label": "Fiber Reconciler", "subLabel": "[fiber.ts]", "container": "Reconciler Tier", "containerColor": "#16a34a", "filePath": "src/reconciler/fiber.ts", "tech": "Fiber Node Tree", "description": "Cấu trúc cây Fiber hai luồng song song (Current & WorkInProgress) cho phép tạm hoãn và tiếp tục render.", "badge": "Core Engine", "upstream": "Hooks Scheduler", "downstream": "DOM Renderer", "defenseQA": "Tại sao lại chọn cấu trúc Fiber thay vì đệ quy ngăn xếp? Đáp: Cho phép ngắt quãng (interruptible work) khi có tác vụ ưu tiên cao."}},
            {"id": "diff-heuristic", "type": "cardNode", "position": {"x": 340, "y": 520}, "data": {"label": "Heuristic Tree Diffing", "subLabel": "[diff.ts]", "container": "Reconciler Tier", "containerColor": "#16a34a", "filePath": "src/reconciler/diff.ts", "tech": "O(N) Diff Algorithm", "description": "Đối sánh key và loại phần tử để tạo ra danh sách biến đổi tối thiểu (Mutation Effect List).", "badge": "Diffing Engine", "upstream": "Fiber Reconciler", "downstream": "DOM Renderer", "defenseQA": "Độ phức tạp thuật toán diffing là bao nhiêu? Đáp: O(N) nhờ 2 giả định thực nghiệm về loại component và key."}},
            {"id": "synthetic-events", "type": "cardNode", "position": {"x": 570, "y": 520}, "data": {"label": "Synthetic Event Delegator", "subLabel": "[events.ts]", "container": "Reconciler Tier", "containerColor": "#16a34a", "filePath": "src/events/synthetic.ts", "tech": "W3C Normalizer", "description": "Hệ thống ủy quyền sự kiện (Event Delegation) tại Root Container, chuẩn hóa đa trình duyệt.", "badge": "Event System", "upstream": "Browser Events", "downstream": "Fiber Reconciler", "defenseQA": "Lợi ích của Event Delegation là gì? Đáp: Tiết kiệm bộ nhớ và tránh gán listener trên từng thẻ DOM con."}},
            # Components Layer 3
            {"id": "compiler-swc", "type": "cardNode", "position": {"x": 110, "y": 890}, "data": {"label": "JSX & TS Transformer", "subLabel": "[compiler.ts]", "container": "Compiler Tier", "containerColor": "#dc2626", "filePath": "src/compiler/transform.ts", "tech": "SWC / Rust AST", "description": "Biên dịch cú pháp JSX sang mã bytecode tối ưu với automatic runtime import.", "badge": "AST Compiler", "upstream": "Developer Code", "downstream": "Tree Shaker", "defenseQA": "SWC nhanh hơn Babel bao nhiêu lần? Đáp: Nhanh hơn 20-70 lần nhờ viết bằng ngôn ngữ Rust đa luồng."}},
            {"id": "tree-shaker", "type": "cardNode", "position": {"x": 340, "y": 890}, "data": {"label": "Tree-Shaking Optimizer", "subLabel": "[bundler.ts]", "container": "Compiler Tier", "containerColor": "#dc2626", "filePath": "src/optimizer/bundler.ts", "tech": "ESM Static Analyzer", "description": "Phân tích đồ thị phụ thuộc tĩnh và loại bỏ hoàn toàn các hàm không dùng tới (Dead Code).", "badge": "Bundler", "upstream": "JSX Transformer", "downstream": "Host Distribution", "defenseQA": "Điều kiện để Tree-shaking hoạt động tối ưu là gì? Đáp: Phải dùng ES Modules (import/export) thay vì CommonJS."}},
            # Components Layer 4
            {"id": "dom-renderer", "type": "cardNode", "position": {"x": 110, "y": 1260}, "data": {"label": "Host DOM Renderer", "subLabel": "[domRenderer.ts]", "container": "Runtime Tier", "containerColor": "#d97706", "filePath": "src/renderer/dom.ts", "tech": "Browser Native DOM", "description": "Thực hiện các thao tác DOM thật trong Commit Phase: appendChild, removeChild, updateAttributes.", "badge": "Native Renderer", "upstream": "Diffing Engine", "downstream": "Screen Display", "defenseQA": "Render phase và Commit phase khác nhau ra sao? Đáp: Render phase thuần tính toán có thể ngắt quãng, Commit phase tác động DOM đồng bộ."}},
            {"id": "ssr-stream", "type": "cardNode", "position": {"x": 340, "y": 1260}, "data": {"label": "Streaming SSR Engine", "subLabel": "[ssrStream.ts]", "container": "Runtime Tier", "containerColor": "#d97706", "filePath": "src/ssr/stream.ts", "tech": "Node / Edge Stream", "description": "Truyền dòng HTML từng phần (Streaming HTML) ngay khi có dữ liệu giúp tối ưu First Contentful Paint (FCP).", "badge": "SSR Streamer", "upstream": "App Root", "downstream": "Client Browser", "defenseQA": "Streaming SSR ưu việt hơn renderToString thế nào? Đáp: Giảm Time-to-First-Byte (TTFB) và không block server render."}},
            {"id": "pkg-dist", "type": "cardNode", "position": {"x": 570, "y": 1260}, "data": {"label": "Package Registry & CDN", "subLabel": "[npm/@dist]", "container": "Runtime Tier", "containerColor": "#d97706", "filePath": "package.json", "tech": "NPM / CDN ESM", "description": "Phân phối bản build qua CDN và package manager toàn cầu.", "badge": "Distribution", "upstream": "Tree Shaker", "downstream": "Browser", "defenseQA": "Tối ưu CDN thế nào? Đáp: Thiết lập immutable caching header."}},
            {"id": "devtools-hook", "type": "cardNode", "position": {"x": 570, "y": 890}, "data": {"label": "DevTools Bridge", "subLabel": "[devtools.ts]", "container": "Compiler Tier", "containerColor": "#dc2626", "filePath": "src/devtools/bridge.ts", "tech": "Profiler Protocol", "description": "Cổng kết nối extension DevTools để đo thời gian render.", "badge": "Profiler", "upstream": "Fiber Reconciler", "downstream": "DevTools UI", "defenseQA": "Profiler đo thời gian ra sao? Đáp: Sử dụng Performance Timeline API."}},
        ],
        "edges": [
            {"id": "e-app-state", "source": "app-root", "target": "state-store", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-state-hook", "source": "state-store", "target": "hook-scheduler", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-state-fiber", "source": "state-store", "target": "vdom-fiber", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-hook-fiber", "source": "hook-scheduler", "target": "vdom-fiber", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-fiber-diff", "source": "vdom-fiber", "target": "diff-heuristic", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-diff-dom", "source": "diff-heuristic", "target": "dom-renderer", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-fiber-dom", "source": "vdom-fiber", "target": "dom-renderer", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-app-event", "source": "app-root", "target": "synthetic-events", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-compiler-app", "source": "compiler-swc", "target": "app-root", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-compiler-shaker", "source": "compiler-swc", "target": "tree-shaker", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-app-ssr", "source": "app-root", "target": "ssr-stream", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-ssr-dom", "source": "ssr-stream", "target": "dom-renderer", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
        ]
    }


def _build_backend_architecture(project_id: str, clean_name: str, repo_url: str, slug: str, owner: str, repo_name: str) -> dict[str, Any]:
    return {
        "projectId": project_id,
        "projectName": f"{clean_name} API Platform",
        "repoUrl": repo_url,
        "title": f"{owner}/{repo_name} - Sơ đồ Kiến trúc Microservices & API Gateway",
        "techStack": "FastAPI / Python + Pydantic v2 + Dependency Injection + MySQL / PostgreSQL + Redis",
        "subsystems": [
            {"id": "group-campus-app", "label": "Ingress Gateway & Traffic Routing Layer", "stroke": "#2563eb", "width": 1780, "height": 260},
            {"id": "group-project-ws", "label": "API Routing & Security Middleware Layer", "stroke": "#16a34a", "width": 1780, "height": 260},
            {"id": "group-api-core", "label": "Domain Business Engine & Service Layer", "stroke": "#dc2626", "width": 1780, "height": 260},
            {"id": "group-infra-data", "label": "Storage, Cache & Async Infrastructure", "stroke": "#d97706", "width": 1780, "height": 260},
        ],
        "flows": [
            {
                "id": "all",
                "label": f"Toàn cảnh Nền tảng {clean_name}",
                "color": "#2563eb",
                "summary": f"Tổng thể các phân tầng dịch vụ backend của {clean_name}: Cổng Ingress, Bộ xác thực, Xử lý nghiệp vụ và Lưu trữ.",
                "nodeIds": [],
                "edgeIds": [],
            },
            {
                "id": "flow-req",
                "label": "Luồng 1: Tiếp nhận Request & Xác thực JWT RBAC",
                "color": "#16a34a",
                "summary": "Client gọi API -> Ingress Gateway phân luồng -> Middleware kiểm tra chữ ký JWT & phân quyền -> Chuyển tiếp Controller.",
                "nodeIds": ["api-clients", "ingress-gw", "auth-mw", "domain-svc"],
                "edgeIds": ["e-client-gw", "e-gw-auth", "e-auth-svc"],
            },
            {
                "id": "flow-tx",
                "label": "Luồng 2: Xử lý Giao dịch & Ghi CSDL",
                "color": "#dc2626",
                "summary": "Domain Controller kích hoạt Logic -> Schema Validation -> Mở Database Transaction ACID -> Ghi dữ liệu.",
                "nodeIds": ["domain-svc", "biz-engine", "primary-db"],
                "edgeIds": ["e-svc-engine", "e-engine-db"],
            },
            {
                "id": "flow-cache",
                "label": "Luồng 3: Đệm Dữ liệu Cache & Tác vụ Ngầm",
                "color": "#d97706",
                "summary": "Truy vấn Cache-aside trên Redis -> Nếu Cache miss gọi DB và nạp cache -> Đẩy tác vụ nặng vào Async Worker Queue.",
                "nodeIds": ["biz-engine", "redis-cache", "async-worker"],
                "edgeIds": ["e-engine-cache", "e-engine-worker"],
            },
        ],
        "nodes": [
            {"id": "group-campus-app", "type": "containerBox", "position": {"x": 80, "y": 70}, "data": {"label": "Phân tầng Ingress Gateway & Traffic Routing", "stroke": "#2563eb", "width": 1780, "height": 260}},
            {"id": "group-project-ws", "type": "containerBox", "position": {"x": 80, "y": 440}, "data": {"label": "Phân tầng API Routing & Security Middleware", "stroke": "#16a34a", "width": 1780, "height": 260}},
            {"id": "group-api-core", "type": "containerBox", "position": {"x": 80, "y": 810}, "data": {"label": "Phân tầng Domain Business Engine & Services", "stroke": "#dc2626", "width": 1780, "height": 260}},
            {"id": "group-infra-data", "type": "containerBox", "position": {"x": 80, "y": 1180}, "data": {"label": "Phân tầng Polyglot Persistence & Cache Storage", "stroke": "#d97706", "width": 1780, "height": 260}},
            # Layer 1
            {"id": "api-clients", "type": "cardNode", "position": {"x": 110, "y": 150}, "data": {"label": "API Consumers", "subLabel": "[Clients]", "container": "Ingress Tier", "containerColor": "#2563eb", "filePath": "src/client/api.ts", "tech": "Web / Mobile / CLI", "description": "Ứng dụng Client gửi các yêu cầu HTTP/gRPC tới cụm dịch vụ backend.", "badge": "API Consumer", "upstream": "End-users", "downstream": "Ingress Gateway", "defenseQA": "Xử lý retry và circuit breaker ở client ra sao? Đáp: Sử dụng Exponential Backoff và Jitter để tránh làm nghẽn server."}},
            {"id": "ingress-gw", "type": "cardNode", "position": {"x": 340, "y": 150}, "data": {"label": "API Ingress Gateway", "subLabel": "[gateway.conf]", "container": "Ingress Tier", "containerColor": "#2563eb", "filePath": "infra/gateway/nginx.conf", "tech": "Envoy / Nginx", "description": "Điểm tiếp nhận cổng đơn (Single Entry Point), cân bằng tải và chấm dứt SSL/TLS.", "badge": "Reverse Proxy", "upstream": "API Consumers", "downstream": "HTTP Router", "defenseQA": "Lợi ích của API Gateway là gì? Đáp: Tập trung hóa SSL, Rate Limiting, CORS và che giấu cấu trúc mạng nội bộ."}},
            {"id": "rate-guard", "type": "cardNode", "position": {"x": 570, "y": 150}, "data": {"label": "Rate Limiter & WAF", "subLabel": "[rateLimit.py]", "container": "Ingress Tier", "containerColor": "#2563eb", "filePath": "infra/security/rate_limit.py", "tech": "Token Bucket", "description": "Giới hạn tần suất gọi API (100 req/min) ngăn ngừa tấn công DoS và lạm dụng tài nguyên.", "badge": "Security Guard", "upstream": "API Gateway", "downstream": "HTTP Router", "defenseQA": "Thuật toán Rate Limiting nào được dùng? Đáp: Token Bucket hoặc Sliding Window Counter trên Redis."}},
            # Layer 2
            {"id": "v1-router", "type": "cardNode", "position": {"x": 110, "y": 520}, "data": {"label": "API Versioned Router", "subLabel": "[router.py]", "container": "Routing Tier", "containerColor": "#16a34a", "filePath": "backend/app/api/v1/router.py", "tech": "FastAPI APIRouter", "description": "Định tuyến URL RESTful phân cấp theo version /api/v1 với schema OpenAPI tự động.", "badge": "Core Router", "upstream": "Ingress Gateway", "downstream": "Domain Services", "defenseQA": "Tại sao phải versioning API? Đáp: Đảm bảo tương thích ngược khi nâng cấp tính năng mới."}},
            {"id": "auth-mw", "type": "cardNode", "position": {"x": 340, "y": 520}, "data": {"label": "JWT & RBAC Middleware", "subLabel": "[security.py]", "container": "Routing Tier", "containerColor": "#16a34a", "filePath": "backend/app/core/security.py", "tech": "OAuth2 / PyJWT", "description": "Trích xuất Bearer Token, kiểm tra chữ ký HMAC-SHA256 và quyền hạn theo vai trò (RBAC).", "badge": "Auth Guard", "upstream": "API Router", "downstream": "Domain Services", "defenseQA": "Cơ chế bảo vệ JWT hết hạn ra sao? Đáp: Sử dụng Access Token ngắn hạn (15m) kèm Refresh Token xoay vòng (Rotation)."}},
            {"id": "schema-validator", "type": "cardNode", "position": {"x": 570, "y": 520}, "data": {"label": "Schema Validator", "subLabel": "[schemas.py]", "container": "Routing Tier", "containerColor": "#16a34a", "filePath": "backend/app/schemas/domain.py", "tech": "Pydantic v2", "description": "Kiểm thực dữ liệu đầu vào (Validation & Coercion) chặt chẽ bằng Rust Core trước khi vào nghiệp vụ.", "badge": "DTO Validator", "upstream": "API Router", "downstream": "Domain Services", "defenseQA": "Pydantic v2 cải thiện hiệu năng ra sao? Đáp: Viết lại phần parsing lõi bằng Rust, tăng tốc 5-20 lần so với v1."}},
            # Layer 3
            {"id": "domain-svc", "type": "cardNode", "position": {"x": 110, "y": 890}, "data": {"label": f"{clean_name} Controller", "subLabel": "[service.py]", "container": "Business Tier", "containerColor": "#dc2626", "filePath": "backend/app/services/domain.py", "tech": "Python / FastAPI", "description": "Điều phối các ca sử dụng nghiệp vụ (Use Cases), tuân thủ nguyên lý Clean Architecture.", "badge": "Controller", "upstream": "API Router", "downstream": "Database", "defenseQA": "Áp dụng mẫu thiết kế nào trong service? Đáp: Dependency Injection kết hợp Repository Pattern."}},
            {"id": "biz-engine", "type": "cardNode", "position": {"x": 340, "y": 890}, "data": {"label": "Business Rules Engine", "subLabel": "[engine.py]", "container": "Business Tier", "containerColor": "#dc2626", "filePath": "backend/app/core/engine.py", "tech": "State Machine", "description": "Thực thi các ràng buộc nghiệp vụ cốt lõi, quản lý chuyển dịch trạng thái hệ thống.", "badge": "Rules Engine", "upstream": "Domain Controller", "downstream": "Database", "defenseQA": "Đảm bảo tính toàn vẹn khi nhiều luồng cùng sửa đổi thế nào? Đáp: Sử dụng Optimistic Concurrency Control qua version field."}},
            {"id": "async-worker", "type": "cardNode", "position": {"x": 570, "y": 890}, "data": {"label": "Async Worker Queue", "subLabel": "[worker.py]", "container": "Business Tier", "containerColor": "#dc2626", "filePath": "backend/app/worker.py", "tech": "Celery / Redis", "description": "Xử lý các tác vụ nền tốn thời gian (gửi email, tính toán báo cáo, xử lý file media).", "badge": "Task Queue", "upstream": "Rules Engine", "downstream": "Storage", "defenseQA": "Đảm bảo tác vụ không bị mất khi worker chết ra sao? Đáp: Sử dụng tin nhắn Ack và Persistent Queue trên Redis/RabbitMQ."}},
            # Layer 4
            {"id": "primary-db", "type": "cardNode", "position": {"x": 110, "y": 1260}, "data": {"label": "Primary Relational DB", "subLabel": "[MySQL / PostgreSQL]", "container": "Storage Tier", "containerColor": "#d97706", "filePath": "backend/app/core/database.py", "tech": "SQLAlchemy 2.0", "description": "Lưu trữ dữ liệu quan hệ với chuẩn ACID, khóa ngoại và chỉ mục B-Tree tối ưu.", "badge": "RDBMS Core", "upstream": "Domain Services", "downstream": "Storage Disk", "defenseQA": "Xử lý n+1 query problem thế nào? Đáp: Sử dụng joinedload hoặc selectinload trong SQLAlchemy."}},
            {"id": "redis-cache", "type": "cardNode", "position": {"x": 340, "y": 1260}, "data": {"label": "Redis Distributed Cache", "subLabel": "[redis:6379]", "container": "Storage Tier", "containerColor": "#d97706", "filePath": "backend/app/core/cache.py", "tech": "Redis In-Memory", "description": "Bộ nhớ đệm tốc độ cao giảm tải cho database, hỗ trợ Pub/Sub và lưu trữ Session.", "badge": "In-Memory DB", "upstream": "Domain Services", "downstream": "RAM", "defenseQA": "Chiến lược xóa cache là gì? Đáp: Cache-Aside kết hợp TTL ngắn và Event Invalidation."}},
            {"id": "object-storage", "type": "cardNode", "position": {"x": 570, "y": 1260}, "data": {"label": "Cloud Object Storage", "subLabel": "[S3 / MinIO]", "container": "Storage Tier", "containerColor": "#d97706", "filePath": "backend/app/core/storage.py", "tech": "S3 Compatible", "description": "Lưu trữ tài liệu và file đính kèm với pre-signed URLs.", "badge": "Object Storage", "upstream": "Domain Services", "downstream": "Cloud Storage", "defenseQA": "Bảo mật upload file thế nào? Đáp: Sử dụng Pre-signed URLs có thời hạn."}},
        ],
        "edges": [
            {"id": "e-client-gw", "source": "api-clients", "target": "ingress-gw", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-gw-rate", "source": "ingress-gw", "target": "rate-guard", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-gw-v1", "source": "ingress-gw", "target": "v1-router", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-v1-auth", "source": "v1-router", "target": "auth-mw", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-v1-val", "source": "v1-router", "target": "schema-validator", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-v1-svc", "source": "v1-router", "target": "domain-svc", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-svc-engine", "source": "domain-svc", "target": "biz-engine", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-engine-worker", "source": "biz-engine", "target": "async-worker", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-svc-db", "source": "domain-svc", "target": "primary-db", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-engine-db", "source": "biz-engine", "target": "primary-db", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-svc-cache", "source": "domain-svc", "target": "redis-cache", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
        ]
    }


def _build_systems_architecture(project_id: str, clean_name: str, repo_url: str, slug: str, owner: str, repo_name: str) -> dict[str, Any]:
    return {
        "projectId": project_id,
        "projectName": f"{clean_name} Kernel Core",
        "repoUrl": repo_url,
        "title": f"{owner}/{repo_name} - Sơ đồ Kiến trúc Nhân Hệ điều hành & Low-Level",
        "techStack": "C / Assembly + POSIX Syscalls + CFS Scheduler + VFS + Hardware HAL",
        "subsystems": [
            {"id": "group-campus-app", "label": "User Space & POSIX Application Interface", "stroke": "#2563eb", "width": 1780, "height": 260},
            {"id": "group-project-ws", "label": "Core Kernel Subsystems & Scheduling Tier", "stroke": "#16a34a", "width": 1780, "height": 260},
            {"id": "group-api-core", "label": "Virtual Filesystem & Device Driver Layer", "stroke": "#dc2626", "width": 1780, "height": 260},
            {"id": "group-infra-data", "label": "Hardware Abstraction Layer & Bare Metal", "stroke": "#d97706", "width": 1780, "height": 260},
        ],
        "flows": [
            {
                "id": "all",
                "label": f"Toàn cảnh Kiến trúc Nhân {clean_name}",
                "color": "#2563eb",
                "summary": f"Hiển thị cấu trúc đa tầng của hệ thống nhân {clean_name}: Không gian người dùng, Bộ lập lịch, VFS và Tương tác phần cứng.",
                "nodeIds": [],
                "edgeIds": [],
            },
            {
                "id": "flow-syscall",
                "label": "Luồng 1: Xử lý System Call & File I/O",
                "color": "#16a34a",
                "summary": "Tiến trình gọi POSIX API -> Chuyển sang Kernel Mode qua trap -> VFS chuyển tiếp Block Driver -> Ghi phần cứng.",
                "nodeIds": ["user-apps", "syscall-tbl", "vfs-core", "blk-driver", "cpu-arch"],
                "edgeIds": ["e-user-syscall", "e-syscall-vfs", "e-vfs-blk", "e-blk-hw"],
            },
            {
                "id": "flow-mem",
                "label": "Luồng 2: Quản lý Bộ nhớ Ảo & Phân trang",
                "color": "#dc2626",
                "summary": "Tiến trình truy cập bộ nhớ -> MMU kiểm tra TLB -> Kích hoạt Page Fault nếu thiếu trang -> Cấp phát Page Frame vật lý.",
                "nodeIds": ["user-apps", "vmm-paging", "cpu-arch"],
                "edgeIds": ["e-user-vmm", "e-vmm-hw"],
            },
            {
                "id": "flow-sched",
                "label": "Luồng 3: Lập lịch Tiến trình CFS",
                "color": "#d97706",
                "summary": "Ngắt Timer ngắt quãng CPU -> CFS tính toán vruntime -> Chuyển ngữ cảnh (Context Switch) sang tiến trình tiếp theo.",
                "nodeIds": ["syscall-tbl", "cfs-sched", "cpu-arch"],
                "edgeIds": ["e-syscall-cfs", "e-cfs-hw"],
            },
        ],
        "nodes": [
            {"id": "group-campus-app", "type": "containerBox", "position": {"x": 80, "y": 70}, "data": {"label": "Phân tầng User Space & POSIX Interface", "stroke": "#2563eb", "width": 1780, "height": 260}},
            {"id": "group-project-ws", "type": "containerBox", "position": {"x": 80, "y": 440}, "data": {"label": "Phân tầng Core Kernel Management & CFS Scheduler", "stroke": "#16a34a", "width": 1780, "height": 260}},
            {"id": "group-api-core", "type": "containerBox", "position": {"x": 80, "y": 810}, "data": {"label": "Phân tầng Virtual Filesystem & Device Driver Stack", "stroke": "#dc2626", "width": 1780, "height": 260}},
            {"id": "group-infra-data", "type": "containerBox", "position": {"x": 80, "y": 1180}, "data": {"label": "Phân tầng Hardware Architecture & Bare Metal", "stroke": "#d97706", "width": 1780, "height": 260}},
            # Layer 1
            {"id": "user-apps", "type": "cardNode", "position": {"x": 110, "y": 150}, "data": {"label": "User Space Processes", "subLabel": "[user_proc]", "container": "User Space", "containerColor": "#2563eb", "filePath": "src/user/main.c", "tech": "Ring 3 User Mode", "description": "Các tiến trình ứng dụng người dùng chạy ở đặc quyền hạn chế Ring 3.", "badge": "User Mode", "upstream": "End-users", "downstream": "System Calls", "defenseQA": "Tại sao phân chia User Space và Kernel Space? Đáp: Ngăn ứng dụng lỗi làm crash toàn bộ hệ điều hành."}},
            {"id": "glibc-runtime", "type": "cardNode", "position": {"x": 340, "y": 150}, "data": {"label": "POSIX C Library", "subLabel": "[glibc.so]", "container": "User Space", "containerColor": "#2563eb", "filePath": "lib/libc.so.6", "tech": "glibc / musl", "description": "Thư viện chuẩn C cung cấp wrapper cho các system calls (read, write, fork, mmap).", "badge": "Runtime Lib", "upstream": "User Processes", "downstream": "Syscall Table", "defenseQA": "Hàm malloc tương tác với kernel thế nào? Đáp: Gọi brk hoặc mmap để yêu cầu kernel cấp phát trang nhớ."}},
            # Layer 2
            {"id": "syscall-tbl", "type": "cardNode", "position": {"x": 110, "y": 520}, "data": {"label": "System Call Dispatcher", "subLabel": "[entry_64.S]", "container": "Kernel Core", "containerColor": "#16a34a", "filePath": "arch/x86/entry/entry_64.S", "tech": "Syscall Vector", "description": "Điểm chuyển đổi đặc quyền từ Ring 3 sang Ring 0 thông qua lệnh hợp ngữ SYSCALL.", "badge": "Syscall Trap", "upstream": "POSIX Lib", "downstream": "Kernel Subsystems", "defenseQA": "Bảo vệ Kernel trước tham số người dùng độc hại thế nào? Đáp: Sử dụng copy_from_user để kiểm tra tính hợp lệ của địa chỉ."}},
            {"id": "cfs-sched", "type": "cardNode", "position": {"x": 340, "y": 520}, "data": {"label": "Completely Fair Scheduler", "subLabel": "[sched/fair.c]", "container": "Kernel Core", "containerColor": "#16a34a", "filePath": "kernel/sched/fair.c", "tech": "Red-Black Tree O(1)", "description": "Bộ lập lịch tiến trình CFS phân bổ thời gian CPU công bằng dựa trên vruntime và cây Đỏ-Đen.", "badge": "CFS Scheduler", "upstream": "Syscall Dispatcher", "downstream": "CPU Execution", "defenseQA": "Tại sao dùng cây Red-Black cho CFS? Đáp: Để lấy tiến trình có vruntime nhỏ nhất nhanh nhất với O(log N) hoặc O(1) con trỏ trái."}},
            {"id": "vmm-paging", "type": "cardNode", "position": {"x": 570, "y": 520}, "data": {"label": "Virtual Memory Manager", "subLabel": "[mm/memory.c]", "container": "Kernel Core", "containerColor": "#16a34a", "filePath": "mm/memory.c", "tech": "4-Level Paging", "description": "Quản lý bảng phân trang 4 cấp (PGD, P4D, PUD, PMD, PTE) và ánh xạ địa chỉ ảo sang vật lý.", "badge": "VMM Engine", "upstream": "Syscall Dispatcher", "downstream": "Hardware MMU", "defenseQA": "Cơ chế Copy-on-Write (COW) trong fork hoạt động ra sao? Đáp: Chỉ sao chép bảng trang và đánh dấu Read-Only, chỉ copy khi có tiến trình ghi."}},
            # Layer 3
            {"id": "vfs-core", "type": "cardNode", "position": {"x": 110, "y": 890}, "data": {"label": "Virtual Filesystem (VFS)", "subLabel": "[fs/open.c]", "container": "Driver Tier", "containerColor": "#dc2626", "filePath": "fs/vfs.c", "tech": "Inode & Dentry Cache", "description": "Lớp trừu tượng cung cấp giao diện tập tin đồng nhất cho Ext4, Btrfs, NFS và thiết bị.", "badge": "VFS Switch", "upstream": "Syscall Dispatcher", "downstream": "Block Driver", "defenseQA": "Dentry Cache giải quyết bài toán gì? Đáp: Tăng tốc độ tra cứu đường dẫn file mà không cần đọc disk."}},
            {"id": "blk-driver", "type": "cardNode", "position": {"x": 340, "y": 890}, "data": {"label": "NVMe Block Device Driver", "subLabel": "[drivers/nvme]", "container": "Driver Tier", "containerColor": "#dc2626", "filePath": "drivers/nvme/host/core.c", "tech": "blk-mq Multi-Queue", "description": "Điều khiển phần cứng ổ cứng NVMe/SSD với hàng đợi song song tận dụng tối đa băng thông PCIe.", "badge": "Block Device", "upstream": "VFS Core", "downstream": "Hardware Bus", "defenseQA": "blk-mq cải thiện I/O như thế nào? Đáp: Tạo hàng đợi I/O riêng cho từng CPU core, loại bỏ lock contention."}},
            {"id": "net-proto", "type": "cardNode", "position": {"x": 570, "y": 890}, "data": {"label": "Network Protocol Stack", "subLabel": "[net/ipv4]", "container": "Driver Tier", "containerColor": "#dc2626", "filePath": "net/ipv4/tcp.c", "tech": "TCP/IP & eBPF", "description": "Xử lý ngăn xếp mạng TCP/IP socket, định tuyến gói tin và lọc lưu lượng cao cấp bằng eBPF.", "badge": "Network Stack", "upstream": "Syscall Dispatcher", "downstream": "NIC Driver", "defenseQA": "eBPF giúp ích gì cho kernel? Đáp: Cho phép chạy mã an toàn trong kernel space mà không cần nạp kernel module."}},
            # Layer 4
            {"id": "cpu-arch", "type": "cardNode", "position": {"x": 110, "y": 1260}, "data": {"label": "Hardware Architecture HAL", "subLabel": "[arch/x86]", "container": "Hardware Tier", "containerColor": "#d97706", "filePath": "arch/x86/kernel/setup.c", "tech": "x86_64 / ARM64", "description": "Giao tiếp trực tiếp thanh ghi vi xử lý, bảng ngắt IDT và quản lý chế độ tiết kiệm năng lượng.", "badge": "Hardware HAL", "upstream": "Kernel Core", "downstream": "Bare Metal", "defenseQA": "Context switch tiêu tốn những gì? Đáp: Lưu và nạp lại toàn bộ thanh ghi đa dụng, con trỏ ngăn xếp và thanh ghi CR3 (TLB flush)."}},
        ],
        "edges": [
            {"id": "e-user-glibc", "source": "user-apps", "target": "glibc-runtime", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-glibc-syscall", "source": "glibc-runtime", "target": "syscall-tbl", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-user-syscall", "source": "user-apps", "target": "syscall-tbl", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-syscall-cfs", "source": "syscall-tbl", "target": "cfs-sched", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-user-vmm", "source": "user-apps", "target": "vmm-paging", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-syscall-vfs", "source": "syscall-tbl", "target": "vfs-core", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-vfs-blk", "source": "vfs-core", "target": "blk-driver", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-syscall-net", "source": "syscall-tbl", "target": "net-proto", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-cfs-hw", "source": "cfs-sched", "target": "cpu-arch", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-vmm-hw", "source": "vmm-paging", "target": "cpu-arch", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-blk-hw", "source": "blk-driver", "target": "cpu-arch", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
        ]
    }


def _build_compiler_architecture(project_id: str, clean_name: str, repo_url: str, slug: str, owner: str, repo_name: str) -> dict[str, Any]:
    catalog_copy = dict(PROJECT_ARCHITECTURES_CATALOG["prj-compiler"])
    catalog_copy["projectId"] = project_id
    catalog_copy["projectName"] = f"{clean_name} Compiler"
    catalog_copy["repoUrl"] = repo_url
    catalog_copy["title"] = f"{owner}/{repo_name} - Sơ đồ Kiến trúc Compiler & AST Pipeline"
    return catalog_copy


def _build_general_architecture(project_id: str, clean_name: str, repo_url: str, slug: str, owner: str, repo_name: str) -> dict[str, Any]:
    return {
        "projectId": project_id,
        "projectName": f"{clean_name} System",
        "repoUrl": repo_url,
        "title": f"{owner}/{repo_name} - Sơ đồ Kiến trúc Phân tầng Động",
        "techStack": "Microservices + React / TypeScript + RESTful Gateway + MySQL 8.0 + CI/CD",
        "subsystems": [
            {"id": "group-campus-app", "label": "Client Interface & Presentation Layer", "stroke": "#2563eb", "width": 1780, "height": 260},
            {"id": "group-project-ws", "label": "API Gateway & Security Routing Tier", "stroke": "#16a34a", "width": 1780, "height": 260},
            {"id": "group-api-core", "label": "Core Business Engine & Logic Services", "stroke": "#dc2626", "width": 1780, "height": 260},
            {"id": "group-infra-data", "label": "Database Storage & Cache Infrastructure", "stroke": "#d97706", "width": 1780, "height": 260},
        ],
        "flows": [
            {
                "id": "all",
                "label": f"Toàn cảnh Kiến trúc {clean_name}",
                "color": "#2563eb",
                "summary": f"Hiển thị tổng thể các phân tầng kiến trúc của dự án {clean_name}: Giao diện, Gateway, Nghiệp vụ lõi và CSDL.",
                "nodeIds": [],
                "edgeIds": [],
            },
            {
                "id": "flow-user",
                "label": "Luồng 1: Tương tác Người dùng & Xác thực",
                "color": "#16a34a",
                "summary": "Người dùng thao tác trên Portal -> Gửi qua API Gateway -> Kiểm tra Token bảo mật -> Chuyển đến Controller.",
                "nodeIds": ["client-portal", "api-gw", "auth-validator", "biz-controller"],
                "edgeIds": ["e-portal-gw", "e-gw-auth", "e-gw-biz"],
            },
            {
                "id": "flow-data",
                "label": "Luồng 2: Xử lý Nghiệp vụ & Lưu trữ Dữ liệu",
                "color": "#dc2626",
                "summary": "Controller thực thi nghiệp vụ -> Gọi Core Service -> Ghi dữ liệu vào CSDL -> Đồng bộ bộ nhớ đệm.",
                "nodeIds": ["biz-controller", "core-service", "primary-rdbms", "cache-redis"],
                "edgeIds": ["e-biz-core", "e-core-db", "e-core-cache"],
            },
        ],
        "nodes": [
            {"id": "group-campus-app", "type": "containerBox", "position": {"x": 80, "y": 70}, "data": {"label": "Phân tầng Giao diện Người dùng (Presentation Layer)", "stroke": "#2563eb", "width": 1780, "height": 260}},
            {"id": "group-project-ws", "type": "containerBox", "position": {"x": 80, "y": 440}, "data": {"label": "Phân tầng Định tuyến & Cổng API (Gateway Tier)", "stroke": "#16a34a", "width": 1780, "height": 260}},
            {"id": "group-api-core", "type": "containerBox", "position": {"x": 80, "y": 810}, "data": {"label": "Phân tầng Động cơ Nghiệp vụ Lõi (Business Core)", "stroke": "#dc2626", "width": 1780, "height": 260}},
            {"id": "group-infra-data", "type": "containerBox", "position": {"x": 80, "y": 1180}, "data": {"label": "Phân tầng Hạ tầng & Lưu trữ Dữ liệu (Persistence)", "stroke": "#d97706", "width": 1780, "height": 260}},
            # Layer 1
            {"id": "client-portal", "type": "cardNode", "position": {"x": 110, "y": 150}, "data": {"label": f"{clean_name} Web Portal", "subLabel": "[App.tsx]", "container": "Client Tier", "containerColor": "#2563eb", "filePath": "src/client/App.tsx", "tech": "React / TypeScript", "description": "Giao diện web người dùng tương tác thời gian thực kết nối API backend.", "badge": "Client UI", "upstream": "Người dùng", "downstream": "API Gateway", "defenseQA": "Tối ưu hóa hiệu năng frontend thế nào? Đáp: Áp dụng Code-splitting, Lazy Loading và caching client-side."}},
            {"id": "analytics-dash", "type": "cardNode", "position": {"x": 340, "y": 150}, "data": {"label": "Telemetry Dashboard", "subLabel": "[Dashboard.tsx]", "container": "Client Tier", "containerColor": "#2563eb", "filePath": "src/client/Dashboard.tsx", "tech": "Recharts / Tailwind", "description": "Bảng giám sát chỉ số hoạt động và biểu đồ thống kê thời gian thực.", "badge": "Telemetry", "upstream": "Web Portal", "downstream": "API Gateway", "defenseQA": "Làm sao hiển thị dữ liệu lớn mượt mà? Đáp: Phân trang ở server và ảo hóa danh sách (Virtual List) ở client."}},
            # Layer 2
            {"id": "api-gw", "type": "cardNode", "position": {"x": 110, "y": 520}, "data": {"label": "Ingress API Gateway", "subLabel": "[gateway.ts]", "container": "Gateway Tier", "containerColor": "#16a34a", "filePath": "src/gateway/server.ts", "tech": "Reverse Proxy", "description": "Cổng kết nối phân phối tải và điều hướng yêu cầu tới các vi dịch vụ tương ứng.", "badge": "Gateway", "upstream": "Web Portal", "downstream": "Business Core", "defenseQA": "Xử lý xác thực người dùng ra sao? Đáp: Kiểm tra Authorization header và xác thực token JWT hợp lệ."}},
            {"id": "auth-validator", "type": "cardNode", "position": {"x": 340, "y": 520}, "data": {"label": "Security & Auth Guard", "subLabel": "[auth.ts]", "container": "Gateway Tier", "containerColor": "#16a34a", "filePath": "src/security/auth.ts", "tech": "JWT / Bcrypt", "description": "Module kiểm định bảo mật, băm mật khẩu và phân quyền RBAC đa cấp.", "badge": "Security", "upstream": "API Gateway", "downstream": "Database", "defenseQA": "Bảo vệ mật khẩu người dùng thế nào? Đáp: Sử dụng thuật toán băm Bcrypt kết hợp muối ngẫu nhiên."}},
            # Layer 3
            {"id": "biz-controller", "type": "cardNode", "position": {"x": 110, "y": 890}, "data": {"label": f"{clean_name} Controller", "subLabel": "[controller.ts]", "container": "Business Core", "containerColor": "#dc2626", "filePath": "src/controllers/main.ts", "tech": "Node / Python", "description": "Tiếp nhận và xử lý các quy tắc nghiệp vụ cốt lõi của đề tài đồ án.", "badge": "Controller", "upstream": "API Gateway", "downstream": "Database", "defenseQA": "Xử lý lỗi hệ thống ra sao? Đáp: Sử dụng Global Exception Middleware trả về mã lỗi HTTP chuẩn RFC 7807."}},
            {"id": "core-service", "type": "cardNode", "position": {"x": 340, "y": 890}, "data": {"label": "Core Business Engine", "subLabel": "[service.ts]", "container": "Business Core", "containerColor": "#dc2626", "filePath": "src/services/core.ts", "tech": "Domain Logic", "description": "Thực thi tính toán, giao dịch và logic chuyên sâu của hệ thống.", "badge": "Core Engine", "upstream": "Controller", "downstream": "Database", "defenseQA": "Đảm bảo tính nhất quán dữ liệu thế nào? Đáp: Sử dụng Transaction rollback và validation schema nghiêm ngặt."}},
            # Layer 4
            {"id": "primary-rdbms", "type": "cardNode", "position": {"x": 110, "y": 1260}, "data": {"label": "Primary Relational DB", "subLabel": "[database.sql]", "container": "Persistence", "containerColor": "#d97706", "filePath": "src/infra/database.ts", "tech": "MySQL 8.0 InnoDB", "description": "Cơ sở dữ liệu quan hệ lưu trữ dữ liệu ACID với các bảng chuẩn hóa.", "badge": "Primary DB", "upstream": "Controllers", "downstream": "Storage", "defenseQA": "Chiến lược sao lưu cơ sở dữ liệu là gì? Đáp: Tự động backup định kỳ hàng ngày và lưu trữ binlog phục hồi thời điểm bất kỳ."}},
            {"id": "cache-redis", "type": "cardNode", "position": {"x": 340, "y": 1260}, "data": {"label": "Redis Cache & Memory", "subLabel": "[redis:6379]", "container": "Persistence", "containerColor": "#d97706", "filePath": "src/infra/cache.ts", "tech": "Redis Key-Value", "description": "Bộ nhớ đệm tốc độ cao tăng tốc truy vấn và giảm tải cho cơ sở dữ liệu chính.", "badge": "Cache Tier", "upstream": "Controllers", "downstream": "RAM", "defenseQA": "Xử lý cache stampede ra sao? Đáp: Sử dụng khóa phân tán Mutex lock khi tính toán lại giá trị cache."}},
            {"id": "event-bus", "type": "cardNode", "position": {"x": 570, "y": 890}, "data": {"label": "Event Message Bus", "subLabel": "[events.ts]", "container": "Business Core", "containerColor": "#dc2626", "filePath": "src/events/bus.ts", "tech": "Event Broker", "description": "Điều phối các sự kiện bất đồng bộ giữa các tầng dịch vụ.", "badge": "Event Bus", "upstream": "Core Engine", "downstream": "Worker", "defenseQA": "Xử lý message ordering thế nào? Đáp: Sử dụng partition key nhất quán."}},
            {"id": "task-worker", "type": "cardNode", "position": {"x": 570, "y": 1260}, "data": {"label": "Background Task Worker", "subLabel": "[worker.ts]", "container": "Persistence", "containerColor": "#d97706", "filePath": "src/infra/worker.ts", "tech": "Async Worker", "description": "Thực thi các tác vụ xử lý lô và xuất báo cáo nền.", "badge": "Worker", "upstream": "Event Bus", "downstream": "Storage", "defenseQA": "Xử lý worker crash thế nào? Đáp: Sử dụng cơ chế dead-letter-queue và tự động retry."}},
            {"id": "config-manager", "type": "cardNode", "position": {"x": 570, "y": 520}, "data": {"label": "Configuration Manager", "subLabel": "[config.ts]", "container": "Gateway Tier", "containerColor": "#16a34a", "filePath": "src/config/env.ts", "tech": "Environment Loader", "description": "Quản lý biến môi trường và cấu hình hệ thống.", "badge": "Config", "upstream": "API Gateway", "downstream": "Services", "defenseQA": "Bảo vệ secret keys thế nào? Đáp: Nạp từ environment variables, không commit plain-text vào git."}},
            {"id": "audit-logger", "type": "cardNode", "position": {"x": 570, "y": 150}, "data": {"label": "Audit & Telemetry Logger", "subLabel": "[logger.ts]", "container": "Client Tier", "containerColor": "#2563eb", "filePath": "src/client/logger.ts", "tech": "Structured Logging", "description": "Ghi nhận nhật ký tương tác và các sự kiện bảo mật.", "badge": "Logger", "upstream": "Web Portal", "downstream": "Telemetry", "defenseQA": "Ghi log có ảnh hưởng hiệu năng không? Đáp: Log bất đồng bộ không chặn luồng chính."}},
        ],
        "edges": [
            {"id": "e-portal-gw", "source": "client-portal", "target": "api-gw", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-dash-gw", "source": "analytics-dash", "target": "api-gw", "animated": True, "style": {"stroke": "#2563eb", "strokeWidth": 2}},
            {"id": "e-gw-auth", "source": "api-gw", "target": "auth-validator", "animated": True, "style": {"stroke": "#16a34a", "strokeWidth": 2}},
            {"id": "e-gw-biz", "source": "api-gw", "target": "biz-controller", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-biz-core", "source": "biz-controller", "target": "core-service", "animated": True, "style": {"stroke": "#dc2626", "strokeWidth": 2}},
            {"id": "e-biz-db", "source": "biz-controller", "target": "primary-rdbms", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-core-db", "source": "core-service", "target": "primary-rdbms", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
            {"id": "e-core-cache", "source": "core-service", "target": "cache-redis", "animated": True, "style": {"stroke": "#d97706", "strokeWidth": 2}},
        ]
    }
