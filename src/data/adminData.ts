export interface AdminClassRecord {
  id: string;
  code: string;
  name: string;
  teacher: string;
  students: number;
  progressPct: number;
  pendingDualReviews: number;
  health: "Tốt" | "Ổn định" | "Cần theo dõi";
  room: string;
  dockerImage: string;
  sandboxEnabled: boolean;
  aiDefenseEnabled: boolean;
}

export interface AdminServiceUnit {
  id: string;
  name: string;
  engine: string;
  usage: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  quotaPct: number;
  barColor: string;
  active: boolean;
}

export interface AdminJwtSession {
  id: string;
  userName: string;
  role: "Quản trị viên" | "Giảng viên" | "Học viên";
  device: string;
  ipLocation: string;
  state: "Hợp lệ (JWT + Refresh)" | "Thiết bị mới" | "Cảnh báo trùng IP thi";
  issuedAt: string;
  isUntrusted: boolean;
}

export interface AdminAuditLog {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  type: "user" | "security" | "ai" | "class";
}

export interface PendingApprovalItem {
  id: string;
  name: string;
  studentCode: string;
  email: string;
  classCode: string;
  className: string;
  requestedRole: "Học viên" | "Giảng viên";
  riskNote: string;
}

export const INITIAL_ADMIN_CLASSES: AdminClassRecord[] = [
  {
    id: "adm-cls-oop",
    code: "CS201",
    name: "Lập trình Hướng đối tượng & Cấu trúc Dữ liệu",
    teacher: "Cô Trần Thị B",
    students: 42,
    progressPct: 74,
    pendingDualReviews: 3,
    health: "Ổn định",
    room: "Lab A3-201",
    dockerImage: "codemind/cpp20-sandbox:valgrind-1.4",
    sandboxEnabled: true,
    aiDefenseEnabled: true,
  },
  {
    id: "adm-cls-dsa",
    code: "CS202",
    name: "Giải thuật Nâng cao & Cấu trúc Dữ liệu Phức hợp",
    teacher: "Cô Trần Thị B",
    students: 38,
    progressPct: 68,
    pendingDualReviews: 1,
    health: "Cần theo dõi",
    room: "Lab A3-204",
    dockerImage: "codemind/cpp20-sandbox:gcc14",
    sandboxEnabled: true,
    aiDefenseEnabled: true,
  },
  {
    id: "adm-cls-web",
    code: "CS304",
    name: "Phát triển Web Hiện đại & REST API",
    teacher: "Thầy Nguyễn Phước",
    students: 45,
    progressPct: 81,
    pendingDualReviews: 1,
    health: "Tốt",
    room: "Hội trường C1",
    dockerImage: "codemind/python312-pytest:latest",
    sandboxEnabled: true,
    aiDefenseEnabled: true,
  },
  {
    id: "adm-cls-fe",
    code: "CS210",
    name: "Lập trình Web Frontend Hiện đại (React 19 & TypeScript)",
    teacher: "Cô Trần Thị B",
    students: 40,
    progressPct: 79,
    pendingDualReviews: 0,
    health: "Tốt",
    room: "Lab B1-102",
    dockerImage: "codemind/node20-playwright:latest",
    sandboxEnabled: true,
    aiDefenseEnabled: true,
  },
  {
    id: "adm-cls-ai",
    code: "CS420",
    name: "Phát triển AI-Native Web App, RAG & AI Agents",
    teacher: "Thầy Nguyễn Phước",
    students: 34,
    progressPct: 61,
    pendingDualReviews: 2,
    health: "Cần theo dõi",
    room: "Lab AI-02",
    dockerImage: "codemind/python312-rag:latest",
    sandboxEnabled: true,
    aiDefenseEnabled: true,
  },
  {
    id: "adm-cls-devops",
    code: "CS405",
    name: "DevOps, Docker & CI/CD Pipeline Automation",
    teacher: "Thầy Nguyễn Phước",
    students: 36,
    progressPct: 72,
    pendingDualReviews: 0,
    health: "Ổn định",
    room: "Lab B2-301",
    dockerImage: "codemind/alpine-ci:3.19",
    sandboxEnabled: true,
    aiDefenseEnabled: false,
  },
];

export const INITIAL_ADMIN_SERVICES: AdminServiceUnit[] = [
  {
    id: "svc-socratic",
    name: "Socratic Tutor & Hint 3 Nấc",
    engine: "LLM Guardrail (refuse_answer)",
    usage: "18,420 lượt gợi ý Socratic",
    requests: 18420,
    inputTokens: 9420000,
    outputTokens: 3840000,
    estimatedCost: 118.4,
    quotaPct: 68,
    barColor: "#14161a",
    active: true,
  },
  {
    id: "svc-defense",
    name: "Hội đồng Phản biện AI 3D",
    engine: "Multi-Agent Oral Defense",
    usage: "412 phiên bảo vệ vấn đáp",
    requests: 412,
    inputTokens: 4860000,
    outputTokens: 1920000,
    estimatedCost: 92.6,
    quotaPct: 54,
    barColor: "#EE8420",
    active: true,
  },
  {
    id: "svc-aigc",
    name: "AIGC Course & Master Mindmap Studio",
    engine: "Curriculum & Graph Extractor",
    usage: "184 giáo trình · 36 Master Maps",
    requests: 220,
    inputTokens: 2150000,
    outputTokens: 980000,
    estimatedCost: 46.2,
    quotaPct: 32,
    barColor: "#64748b",
    active: true,
  },
  {
    id: "svc-docker",
    name: "Docker CI/CD Isolated Sandbox Pool",
    engine: "Seccomp (--network=none) Runners",
    usage: "2,890 lượt chấm Valgrind / Pytest",
    requests: 2890,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 64.0,
    quotaPct: 45,
    barColor: "#94a3b8",
    active: true,
  },
];

export const INITIAL_JWT_SESSIONS: AdminJwtSession[] = [
  {
    id: "jwt-01",
    userName: "Admin AIO",
    role: "Quản trị viên",
    device: "Workstation · Chrome 126",
    ipLocation: "10.0.1.5 (Campus Core VLAN)",
    state: "Hợp lệ (JWT + Refresh)",
    issuedAt: "08:02 hôm nay",
    isUntrusted: false,
  },
  {
    id: "jwt-02",
    userName: "Cô Trần Thị B",
    role: "Giảng viên",
    device: "MacBook Pro · Chrome 126",
    ipLocation: "192.168.10.24 (TP.HCM)",
    state: "Hợp lệ (JWT + Refresh)",
    issuedAt: "08:45 hôm nay",
    isUntrusted: false,
  },
  {
    id: "jwt-03",
    userName: "Nguyễn Văn A",
    role: "Học viên",
    device: "Windows 11 · Chrome 126",
    ipLocation: "14.161.42.88 (Hà Nội)",
    state: "Hợp lệ (JWT + Refresh)",
    issuedAt: "09:12 hôm nay",
    isUntrusted: false,
  },
  {
    id: "jwt-04",
    userName: "Thầy Nguyễn Phước",
    role: "Giảng viên",
    device: "Windows 11 · Edge 125",
    ipLocation: "113.190.15.9 (Đà Nẵng)",
    state: "Thiết bị mới",
    issuedAt: "10:04 hôm nay",
    isUntrusted: true,
  },
  {
    id: "jwt-05",
    userName: "Nguyễn Minh Khôi",
    role: "Học viên",
    device: "MacBook Pro + iPhone Safari (2 IP)",
    ipLocation: "172.16.8.14 (Phát hiện trùng phiên thi)",
    state: "Cảnh báo trùng IP thi",
    issuedAt: "10:19 hôm nay",
    isUntrusted: true,
  },
];

export const INITIAL_PENDING_APPROVALS: PendingApprovalItem[] = [
  {
    id: "pend-01",
    name: "Nguyễn Minh Khôi",
    studentCode: "2210866",
    email: "khoi.nm@student.edu.vn",
    classCode: "CS201",
    className: "OOP & Cấu trúc Dữ liệu",
    requestedRole: "Học viên",
    riskNote: "Cần xác minh bổ sung lịch sử phiên thi",
  },
  {
    id: "pend-02",
    name: "Đỗ Mỹ Linh",
    studentCode: "2210884",
    email: "linh.dm@student.edu.vn",
    classCode: "CS420",
    className: "AI-Native Web App & RAG",
    requestedRole: "Học viên",
    riskNote: "Hồ sơ hợp lệ · Đã hoàn tất CS201",
  },
  {
    id: "pend-03",
    name: "Hoàng Trọng Nam",
    studentCode: "GV-2026-03",
    email: "nam.ht@codemind.ai",
    classCode: "CS420",
    className: "Trợ giảng / Cố vấn AI Research",
    requestedRole: "Giảng viên",
    riskNote: "Chờ Admin cấp quyền Instructor RBAC",
  },
];

export const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: "aud-01",
    time: "10:42 hôm nay",
    actor: "Admin AIO (ADM-01)",
    action: "Đồng bộ cấu hình Trọng số Kép 60% CI/CD · 40% Phản biện AI",
    target: "Hệ thống Thẩm định CS201 & CS202",
    type: "ai",
  },
  {
    id: "aud-02",
    time: "10:18 hôm nay",
    actor: "System Security",
    action: "Cảnh báo đăng nhập đồng thời 2 IP trong ca Phản biện 3D",
    target: "Nguyễn Minh Khôi (2210866)",
    type: "security",
  },
  {
    id: "aud-03",
    time: "09:50 hôm nay",
    actor: "Cô Trần Thị B",
    action: "Phát hành Master Mindmap Chương 1 & 5 Docker Test Cases",
    target: "CS201 · Chương 1: Đa hình & vtable",
    type: "class",
  },
  {
    id: "aud-04",
    time: "09:15 hôm nay",
    actor: "Admin AIO (ADM-01)",
    action: "Khóa tạm thời tài khoản do vi phạm quy chế Sandbox",
    target: "Hoàng Ngọc D (2210899)",
    type: "user",
  },
  {
    id: "aud-05",
    time: "Hôm qua 20:10",
    actor: "Admin AIO (ADM-01)",
    action: "Bật chính sách Guardrail refuse_answer & Giới hạn 20 câu/giờ",
    target: "Socratic Tutor & Hint 3 Nấc",
    type: "ai",
  },
];
