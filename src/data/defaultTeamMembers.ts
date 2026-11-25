import type { TeamMemberRecord } from "../api";

export const DEFAULT_TEAM_MEMBER_RECORDS: TeamMemberRecord[] = [
  {
    "id": "usr-gv-01",
    "name": "Cô Trần Thị B",
    "email": "lananh.gv@codemind.ai",
    "code": "GV-2026-01",
    "userRole": "instructor",
    "role": "Giảng viên / Cố vấn Hội đồng",
    "initials": "CB",
    "headline": "Giảng viên Chính · Kiến trúc Phần mềm & Trình biên dịch",
    "department": "Khoa CNTT · Bộ môn Kỹ nghệ Phần mềm",
    "officeLocation": "Phòng Lab A3-201 · Tiếp SV: Thứ 3 & 5 (14:00–17:00)",
    "bio": "Giảng viên hướng dẫn đồ án chuyên ngành và thành viên Hội đồng Phản biện CodeMind Campus. Tập trung vào Clean Architecture, quản lý bộ nhớ C++20, React 19 và quy trình Git/Kanban chuẩn doanh nghiệp.",
    "skills": ["C++20 & OOP", "Compiler AST", "Clean Architecture", "React 19", "Code Review & CI/CD"],
    "githubUrl": "https://github.com/tran-thi-b-codemind",
    "websiteUrl": "https://codemind.edu.vn/faculty/tran-thi-b",
    "phone": "0903 812 401",
    "hue": 1,
    "status": "in",
    "isAdvisor": true,
    "isLead": false,
    "taughtCourses": [
      {
        "id": "class-oop",
        "subjectId": "oop",
        "code": "CS201",
        "name": "Lập trình Hướng đối tượng & Cấu trúc Dữ liệu",
        "semester": "Học kỳ 1 / 2026",
        "credits": 3,
        "studentCount": 42,
        "avgProgressPct": 74,
        "room": "Lab A3-201",
        "health": "Ổn định"
      }
    ],
    "projects": [
      {
        "id": "prj-codemind",
        "code": "PRJ-CODEMIND",
        "name": "CodeMind AI - Hệ thống gia sư lập trình",
        "status": "active",
        "course": "CS499 · Đồ án Tốt nghiệp Kỹ sư Enterprise",
        "dueText": "in 9 days"
      },
      {
        "id": "prj-compiler",
        "code": "PRJ-CPP-AST",
        "name": "Trình biên dịch Mini C++ với AST Visualizer",
        "status": "delivered",
        "course": "CS201 · Lập trình Hướng đối tượng & Cấu trúc Dữ liệu",
        "dueText": "Delivered"
      },
      {
        "id": "prj-devnet",
        "code": "PRJ-DEVNET",
        "name": "DevNet - Mạng Xã hội Chia sẻ Code Snippet & Fork Tree",
        "status": "planning",
        "course": "CS210 · Lập trình Web Frontend Hiện đại (React 19)",
        "dueText": "in 35 days"
      }
    ],
    "openTasks": [],
    "doneTasksCount": 0,
    "commitsCount": 0,
    "totalEstimateHours": 0.0,
    "lastActive": "Đang trực tuyến"
  },
  {
    "id": "usr-gv-02",
    "name": "Thầy Nguyễn Phước",
    "email": "phuoc.gv@codemind.ai",
    "code": "GV-2026-02",
    "userRole": "instructor",
    "role": "Giảng viên / Cố vấn Hội đồng",
    "initials": "TP",
    "headline": "Giảng viên · Hệ thống Phân tán, Backend & DevOps",
    "department": "Khoa CNTT · Bộ môn Hệ thống Thông tin & Cloud",
    "officeLocation": "Phòng Lab B2-304 · Tiếp SV: Thứ 4 & 6 (09:00–11:30)",
    "bio": "Phụ trách các học phần FastAPI, Kiến trúc Hệ thống Phân tán (Kafka/Redis), AI-Native Web App và Docker CI/CD.",
    "skills": ["FastAPI & Python", "Distributed Systems", "Kafka & Redis", "Docker & CI/CD"],
    "githubUrl": "https://github.com/nguyen-phuoc-codemind",
    "websiteUrl": "https://codemind.edu.vn/faculty/nguyen-phuoc",
    "phone": "0908 441 209",
    "hue": 2,
    "status": "in",
    "isAdvisor": true,
    "isLead": false,
    "taughtCourses": [],
    "projects": [
      {
        "id": "prj-ecommerce",
        "code": "PRJ-ECOM",
        "name": "Hệ thống Microservices Thương mại điện tử",
        "status": "active",
        "course": "CS315 · Hệ thống Phân tán, Kafka & Redis",
        "dueText": "in 14 days"
      }
    ],
    "openTasks": [],
    "doneTasksCount": 0,
    "commitsCount": 0,
    "totalEstimateHours": 0.0,
    "lastActive": "12 phút trước"
  },
  {
    "id": "usr-sv-06",
    "name": "Hoàng Ngọc D",
    "email": "ngocd@student.edu.vn",
    "code": "2210899",
    "userRole": "student",
    "role": "Kỹ sư Thực tập",
    "initials": "HD",
    "hue": 3,
    "status": "in",
    "isAdvisor": false,
    "isLead": false,
    "projects": [],
    "openTasks": [],
    "doneTasksCount": 0,
    "commitsCount": 0,
    "totalEstimateHours": 0.0,
    "lastActive": "2 ngày trước"
  },
  {
    "id": "usr-sv-01",
    "name": "Nguyễn Bá Hòa",
    "email": "hoa.nb@student.edu.vn",
    "code": "2210801",
    "userRole": "student",
    "role": "Leader & Architect",
    "initials": "NH",
    "hue": 4,
    "status": "in",
    "isAdvisor": false,
    "isLead": true,
    "projects": [
      {
        "id": "prj-codemind",
        "code": "PRJ-CODEMIND",
        "name": "CodeMind AI - Hệ thống gia sư lập trình",
        "status": "active",
        "course": "CS499 · Đồ án Tốt nghiệp Kỹ sư Enterprise",
        "dueText": "in 9 days"
      },
      {
        "id": "prj-compiler",
        "code": "PRJ-CPP-AST",
        "name": "Trình biên dịch Mini C++ với AST Visualizer",
        "status": "delivered",
        "course": "CS201 · Lập trình Hướng đối tượng & Cấu trúc Dữ liệu",
        "dueText": "Delivered"
      },
      {
        "id": "prj-devnet",
        "code": "PRJ-DEVNET",
        "name": "DevNet - Mạng Xã hội Chia sẻ Code Snippet & Fork Tree",
        "status": "planning",
        "course": "CS210 · Lập trình Web Frontend Hiện đại (React 19)",
        "dueText": "in 35 days"
      },
      {
        "id": "prj-ecommerce",
        "code": "PRJ-ECOM",
        "name": "Hệ thống Microservices Thương mại điện tử",
        "status": "active",
        "course": "CS315 · Hệ thống Phân tán, Kafka & Redis",
        "dueText": "in 14 days"
      },
      {
        "id": "prj-faceattend",
        "code": "PRJ-FACEATTEND",
        "name": "FaceAttend AI - Điểm danh Khuôn mặt Edge AI trên Pi 4",
        "status": "planning",
        "course": "CS410 · Trí tuệ Nhân tạo & Machine Learning",
        "dueText": "in 28 days"
      },
      {
        "id": "prj-medai",
        "code": "PRJ-MEDAI",
        "name": "MedAI - Phân loại ảnh X-quang phổi & RAG",
        "status": "active",
        "course": "CS420 · AI-Native Web App & RAG Agents",
        "dueText": "in 21 days"
      },
      {
        "id": "prj-pintos",
        "code": "PRJ-PINTOS",
        "name": "Mô phỏng Hệ điều hành PintOS: Virtual Memory & Threads",
        "status": "delivered",
        "course": "CS205 · Kiến trúc Máy tính, HĐH & Mạng TCP/IP",
        "dueText": "Delivered"
      },
      {
        "id": "prj-security",
        "code": "PRJ-SEC-DAST",
        "name": "Công cụ DAST Quét Lỗ hổng Web Tự động (OWASP Top 10)",
        "status": "review",
        "course": "CS312 · An toàn Thông tin & OWASP Top 10",
        "dueText": "in 3 days"
      }
    ],
    "openTasks": [
      {
        "id": "task-9",
        "code": "TE62D15",
        "title": "Cây Phân Nhánh GitKraken với Chuyển động Động (Nhánh 2.2)",
        "projectId": "prj-codemind",
        "projectName": "CodeMind AI - Hệ thống gia sư lập trình",
        "column": "ready",
        "priority": "medium",
        "points": 5,
        "estimateHours": 2.0,
        "dueDate": "12/11/2026"
      },
      {
        "id": "fa-2",
        "code": "FA-SYNC-02",
        "title": "Đồng bộ dữ liệu điểm danh offline với máy chủ qua MQTT Broker",
        "projectId": "prj-faceattend",
        "projectName": "FaceAttend AI - Điểm danh Khuôn mặt Edge AI trên Pi 4",
        "column": "ready",
        "priority": "medium",
        "points": 5,
        "estimateHours": 5.0,
        "dueDate": "02/12/2026"
      },
      {
        "id": "task-11",
        "code": "TE71B88",
        "title": "Đặc tả giao thức WebSocket Realtime Code Lab & Huddle",
        "projectId": "prj-codemind",
        "projectName": "CodeMind AI - Hệ thống gia sư lập trình",
        "column": "ready",
        "priority": "high",
        "points": 3,
        "estimateHours": 2.0,
        "dueDate": "13/11/2026"
      },
      {
        "id": "med-3",
        "code": "MED-GUARD-03",
        "title": "Thiết lập NeMo Guardrails ngăn chặn Hallucination y khoa",
        "projectId": "prj-medai",
        "projectName": "MedAI - Phân loại ảnh X-quang phổi & RAG",
        "column": "ready",
        "priority": "high",
        "points": 5,
        "estimateHours": 5.0,
        "dueDate": "25/11/2026"
      },
      {
        "id": "task-12",
        "code": "TE89C04",
        "title": "Tích hợp SSO & Giám sát chi phí Quota AI Gateway",
        "projectId": "prj-codemind",
        "projectName": "CodeMind AI - Hệ thống gia sư lập trình",
        "column": "backlog",
        "priority": "medium",
        "points": 5,
        "estimateHours": 4.0,
        "dueDate": "28/11/2026"
      },
      {
        "id": "ecom-5",
        "code": "EC-TEST-05",
        "title": "Kiểm thử Tải K6 & Đạt chuẩn 99.9% Uptime",
        "projectId": "prj-ecommerce",
        "projectName": "Hệ thống Microservices Thương mại điện tử",
        "column": "backlog",
        "priority": "medium",
        "points": 5,
        "estimateHours": 4.0,
        "dueDate": "30/11/2026"
      }
    ],
    "doneTasksCount": 8,
    "commitsCount": 51,
    "totalEstimateHours": 22.0,
    "lastActive": "4 phút trước"
  },
  {
    "id": "usr-sv-05",
    "name": "Nguyễn Minh Khôi",
    "email": "khoi.nm@student.edu.vn",
    "code": "2210866",
    "userRole": "student",
    "role": "Kỹ sư Thực tập",
    "initials": "NK",
    "hue": 5,
    "status": "remote",
    "isAdvisor": false,
    "isLead": false,
    "projects": [],
    "openTasks": [],
    "doneTasksCount": 0,
    "commitsCount": 0,
    "totalEstimateHours": 0.0,
    "lastActive": "Chờ xác minh lớp"
  },
  {
    "id": "usr-sv-02",
    "name": "Nguyễn Văn A",
    "email": "hasib@gmail.com",
    "code": "2210842",
    "userRole": "student",
    "role": "Kỹ sư Thực tập",
    "initials": "NA",
    "hue": 6,
    "status": "in",
    "isAdvisor": false,
    "isLead": true,
    "projects": [
      {
        "id": "prj-compiler",
        "code": "PRJ-CPP-AST",
        "name": "Trình biên dịch Mini C++ với AST Visualizer",
        "status": "delivered",
        "course": "CS201 · Lập trình Hướng đối tượng & Cấu trúc Dữ liệu",
        "dueText": "Delivered"
      }
    ],
    "openTasks": [],
    "doneTasksCount": 0,
    "commitsCount": 1,
    "totalEstimateHours": 0.0,
    "lastActive": "Đang trực tuyến"
  },
  {
    "id": "usr-sv-04",
    "name": "Phan Đình Nghị",
    "email": "nghi.pd@student.edu.vn",
    "code": "2210829",
    "userRole": "student",
    "role": "Backend & Database",
    "initials": "PN",
    "hue": 1,
    "status": "in",
    "isAdvisor": false,
    "isLead": true,
    "projects": [
      {
        "id": "prj-codemind",
        "code": "PRJ-CODEMIND",
        "name": "CodeMind AI - Hệ thống gia sư lập trình",
        "status": "active",
        "course": "CS499 · Đồ án Tốt nghiệp Kỹ sư Enterprise",
        "dueText": "in 9 days"
      },
      {
        "id": "prj-compiler",
        "code": "PRJ-CPP-AST",
        "name": "Trình biên dịch Mini C++ với AST Visualizer",
        "status": "delivered",
        "course": "CS201 · Lập trình Hướng đối tượng & Cấu trúc Dữ liệu",
        "dueText": "Delivered"
      },
      {
        "id": "prj-devnet",
        "code": "PRJ-DEVNET",
        "name": "DevNet - Mạng Xã hội Chia sẻ Code Snippet & Fork Tree",
        "status": "planning",
        "course": "CS210 · Lập trình Web Frontend Hiện đại (React 19)",
        "dueText": "in 35 days"
      },
      {
        "id": "prj-medai",
        "code": "PRJ-MEDAI",
        "name": "MedAI - Phân loại ảnh X-quang phổi & RAG",
        "status": "active",
        "course": "CS420 · AI-Native Web App & RAG Agents",
        "dueText": "in 21 days"
      },
      {
        "id": "prj-pintos",
        "code": "PRJ-PINTOS",
        "name": "Mô phỏng Hệ điều hành PintOS: Virtual Memory & Threads",
        "status": "delivered",
        "course": "CS205 · Kiến trúc Máy tính, HĐH & Mạng TCP/IP",
        "dueText": "Delivered"
      },
      {
        "id": "prj-security",
        "code": "PRJ-SEC-DAST",
        "name": "Công cụ DAST Quét Lỗ hổng Web Tự động (OWASP Top 10)",
        "status": "review",
        "course": "CS312 · An toàn Thông tin & OWASP Top 10",
        "dueText": "in 3 days"
      }
    ],
    "openTasks": [
      {
        "id": "cpp-1",
        "code": "CPP-LEX-01",
        "title": "Bộ phân tích từ vựng Lexer dựa trên DFA bảng chuyển trạng thái",
        "projectId": "prj-compiler",
        "projectName": "Trình biên dịch Mini C++ với AST Visualizer",
        "column": "backlog",
        "priority": "high",
        "points": 5,
        "estimateHours": 6.0,
        "dueDate": "02/11/2026"
      },
      {
        "id": "dev-1",
        "code": "DEV-ED-01",
        "title": "Tích hợp Monaco Editor & Syntax Highlighting 40+ ngôn ngữ",
        "projectId": "prj-devnet",
        "projectName": "DevNet - Mạng Xã hội Chia sẻ Code Snippet & Fork Tree",
        "column": "in-progress",
        "priority": "high",
        "points": 5,
        "estimateHours": 5.0,
        "dueDate": "21/11/2026"
      },
      {
        "id": "task-6",
        "code": "TE49A12",
        "title": "Mô hình Giả lập Hội đồng Phản biện AI (AI Defense Room)",
        "projectId": "prj-codemind",
        "projectName": "CodeMind AI - Hệ thống gia sư lập trình",
        "column": "backlog",
        "priority": "medium",
        "points": 8,
        "estimateHours": 6.0,
        "dueDate": "10/11/2026"
      },
      {
        "id": "sec-2",
        "code": "SEC-REP-02",
        "title": "Tạo báo cáo lỗ hổng theo chuẩn OWASP Top 10 và CVSS v3.1",
        "projectId": "prj-security",
        "projectName": "Công cụ DAST Quét Lỗ hổng Web Tự động (OWASP Top 10)",
        "column": "in-progress",
        "priority": "medium",
        "points": 5,
        "estimateHours": 5.0,
        "dueDate": "18/11/2026"
      },
      {
        "id": "task-7",
        "code": "TE54B33",
        "title": "Thuật toán Đo lường Đóng góp Thực tế Anti-Freerider",
        "projectId": "prj-codemind",
        "projectName": "CodeMind AI - Hệ thống gia sư lập trình",
        "column": "backlog",
        "priority": "medium",
        "points": 5,
        "estimateHours": 4.0,
        "dueDate": "10/11/2026"
      },
      {
        "id": "task-2",
        "code": "TE14F82",
        "title": "Thiết kế CSDL quan hệ chuẩn hóa 3NF & ERD 8 bảng",
        "projectId": "prj-codemind",
        "projectName": "CodeMind AI - Hệ thống gia sư lập trình",
        "column": "in-progress",
        "priority": "high",
        "points": 5,
        "estimateHours": 6.0,
        "dueDate": "06/11/2026"
      }
    ],
    "doneTasksCount": 2,
    "commitsCount": 18,
    "totalEstimateHours": 32.0,
    "lastActive": "35 phút trước"
  },
  {
    "id": "usr-sv-08",
    "name": "Trần Minh Tuấn",
    "email": "tuan.tm@student.edu.vn",
    "code": "2210877",
    "userRole": "student",
    "role": "Backend Lead",
    "initials": "TT",
    "hue": 2,
    "status": "in",
    "isAdvisor": false,
    "isLead": true,
    "projects": [
      {
        "id": "prj-ecommerce",
        "code": "PRJ-ECOM",
        "name": "Hệ thống Microservices Thương mại điện tử",
        "status": "active",
        "course": "CS315 · Hệ thống Phân tán, Kafka & Redis",
        "dueText": "in 14 days"
      }
    ],
    "openTasks": [
      {
        "id": "ecom-2",
        "code": "EC-PAY-02",
        "title": "Cổng thanh toán VNPay IPN & Webhook Idempotency",
        "projectId": "prj-ecommerce",
        "projectName": "Hệ thống Microservices Thương mại điện tử",
        "column": "in-progress",
        "priority": "high",
        "points": 8,
        "estimateHours": 8.0,
        "dueDate": "18/11/2026"
      }
    ],
    "doneTasksCount": 1,
    "commitsCount": 2,
    "totalEstimateHours": 8.0,
    "lastActive": "15 phút trước"
  },
  {
    "id": "usr-sv-07",
    "name": "Võ Ngọc Hà",
    "email": "ha.vn@student.edu.vn",
    "code": "2210851",
    "userRole": "student",
    "role": "Kỹ sư Thực tập",
    "initials": "VH",
    "hue": 3,
    "status": "in",
    "isAdvisor": false,
    "isLead": false,
    "projects": [],
    "openTasks": [],
    "doneTasksCount": 0,
    "commitsCount": 0,
    "totalEstimateHours": 0.0,
    "lastActive": "22 phút trước"
  },
  {
    "id": "usr-sv-03",
    "name": "Võ Nhật Huy",
    "email": "huy.vn@student.edu.vn",
    "code": "2210815",
    "userRole": "student",
    "role": "Frontend & AI Dev",
    "initials": "VH",
    "hue": 4,
    "status": "in",
    "isAdvisor": false,
    "isLead": true,
    "projects": [
      {
        "id": "prj-codemind",
        "code": "PRJ-CODEMIND",
        "name": "CodeMind AI - Hệ thống gia sư lập trình",
        "status": "active",
        "course": "CS499 · Đồ án Tốt nghiệp Kỹ sư Enterprise",
        "dueText": "in 9 days"
      },
      {
        "id": "prj-devnet",
        "code": "PRJ-DEVNET",
        "name": "DevNet - Mạng Xã hội Chia sẻ Code Snippet & Fork Tree",
        "status": "planning",
        "course": "CS210 · Lập trình Web Frontend Hiện đại (React 19)",
        "dueText": "in 35 days"
      },
      {
        "id": "prj-ecommerce",
        "code": "PRJ-ECOM",
        "name": "Hệ thống Microservices Thương mại điện tử",
        "status": "active",
        "course": "CS315 · Hệ thống Phân tán, Kafka & Redis",
        "dueText": "in 14 days"
      },
      {
        "id": "prj-faceattend",
        "code": "PRJ-FACEATTEND",
        "name": "FaceAttend AI - Điểm danh Khuôn mặt Edge AI trên Pi 4",
        "status": "planning",
        "course": "CS410 · Trí tuệ Nhân tạo & Machine Learning",
        "dueText": "in 28 days"
      },
      {
        "id": "prj-pintos",
        "code": "PRJ-PINTOS",
        "name": "Mô phỏng Hệ điều hành PintOS: Virtual Memory & Threads",
        "status": "delivered",
        "course": "CS205 · Kiến trúc Máy tính, HĐH & Mạng TCP/IP",
        "dueText": "Delivered"
      }
    ],
    "openTasks": [
      {
        "id": "task-3",
        "code": "TE22C19",
        "title": "Xây dựng Module Authentication JWT & Phân quyền RBAC",
        "projectId": "prj-codemind",
        "projectName": "CodeMind AI - Hệ thống gia sư lập trình",
        "column": "in-progress",
        "priority": "high",
        "points": 5,
        "estimateHours": 4.0,
        "dueDate": "07/11/2026"
      },
      {
        "id": "fa-1",
        "code": "FA-EDGE-01",
        "title": "Tối ưu hóa mô hình MobileFaceNet chạy trên Raspberry Pi 4",
        "projectId": "prj-faceattend",
        "projectName": "FaceAttend AI - Điểm danh Khuôn mặt Edge AI trên Pi 4",
        "column": "in-progress",
        "priority": "high",
        "points": 5,
        "estimateHours": 6.0,
        "dueDate": "25/11/2026"
      },
      {
        "id": "dev-2",
        "code": "DEV-SOCIAL-02",
        "title": "Hệ thống bình luận, Fork snippet và đánh giá sao Star",
        "projectId": "prj-devnet",
        "projectName": "DevNet - Mạng Xã hội Chia sẻ Code Snippet & Fork Tree",
        "column": "ready",
        "priority": "medium",
        "points": 5,
        "estimateHours": 6.0,
        "dueDate": "28/11/2026"
      },
      {
        "id": "task-5",
        "code": "TE41E89",
        "title": "Socratic AI Tutor Hint Ladder (Thang gợi ý 3 nấc)",
        "projectId": "prj-codemind",
        "projectName": "CodeMind AI - Hệ thống gia sư lập trình",
        "column": "in-progress",
        "priority": "high",
        "points": 5,
        "estimateHours": 4.5,
        "dueDate": "09/11/2026"
      }
    ],
    "doneTasksCount": 2,
    "commitsCount": 39,
    "totalEstimateHours": 20.5,
    "lastActive": "18 phút trước"
  }
];
