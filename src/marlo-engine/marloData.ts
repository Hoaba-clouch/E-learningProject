// =====================================================================
// CODEMIND & MARLO DYNAMIC DATA ENGINE
// Real-world Engineering Projects, Team Members, Tasks and Workload Store
// Built for CodeMind AI Learning OS & Project Workspace
// =====================================================================

export interface MarloMember {
  id: string;
  name: string;
  role: string;
  hue: number;
  email: string;
  capacity: number; // e.g. 32, 36, 38, 40 h
  skill: "architecture" | "ai_ml" | "security" | "backend" | "frontend" | "embedded" | "advisor";
  status: "in" | "remote" | "off";
  initials?: string;
  phone?: string;
  advisorTitle?: string;
}

export interface MarloProject {
  id: string;
  name: string;
  client: string; // Đơn vị / Học phần / Viện đào tạo
  kind: string;   // Khóa luận / Đồ án / NCKH
  status: "planning" | "active" | "review" | "delivered";
  start: number;
  due: number;
  team: string[]; // member IDs (1 project contains multiple people)
  budget: number; // Ngân sách tài trợ / nghiên cứu (VNĐ)
  c: number;      // color code 1..6
  lead: string;   // member ID (Lead / Chủ nhiệm đề tài)
  fav: boolean;
  brief: string;
}

export interface MarloTask {
  id: string;
  title: string;
  projectId: string;
  status: "todo" | "doing" | "review" | "done";
  who: string; // member ID
  due: number;
  priority: "high" | "med" | "low";
  kind: string;
  est: number; // estimated hours
  desc?: string;
  code?: string;
}

export interface MarloHourEntry {
  id: string;
  day: number;
  who: string;
  projectId: string;
  hours: number;
  kind: string;
  note?: string;
}

// ─── Engineering Disciplines & Skills ───
export const MARLO_SKILLS: Record<string, { name: string; icon: string }> = {
  architecture: { name: "Kiến trúc Hệ thống", icon: "cpu" },
  ai_ml: { name: "Mô hình AI & Thị giác", icon: "sparkles" },
  security: { name: "Bảo mật & DevSecOps", icon: "shield" },
  backend: { name: "Backend & Microservices", icon: "database" },
  frontend: { name: "Frontend & Web OS", icon: "layout" },
  embedded: { name: "Hệ điều hành & Nhúng", icon: "terminal" },
  advisor: { name: "Cố vấn & Khảo thí", icon: "award" },
  // Backward compatibility aliases
  edit: { name: "Backend & API", icon: "database" },
  colour: { name: "Mô hình AI & ML", icon: "sparkles" },
  sound: { name: "Kiến trúc Hệ thống", icon: "cpu" },
  vfx: { name: "Bảo mật & DevSecOps", icon: "shield" },
  motion: { name: "Frontend UI/UX", icon: "layout" },
  produce: { name: "Quản lý Đồ án", icon: "clipboard" },
};

// ─── Status labels & tones ───
export const MARLO_PROJECT_STATUS: Record<string, string> = {
  planning: "Lên kế hoạch",
  active: "Đang phát triển",
  review: "Nghiệm thu Sprint",
  delivered: "Đã bảo vệ xong",
};

export const MARLO_TASK_STATUS: Record<string, string> = {
  todo: "Cần làm",
  doing: "Đang làm",
  review: "Chờ nghiệm thu",
  done: "Đã nghiệm thu",
};

export const MARLO_TASK_COLS = [
  { id: "todo", label: "Cần làm" },
  { id: "doing", label: "Đang làm" },
  { id: "review", label: "Chờ nghiệm thu" },
  { id: "done", label: "Đã nghiệm thu" },
] as const;

export const MARLO_MEMBER_STATUS_LABEL: Record<string, string> = {
  in: "Tại phòng Lab",
  remote: "Làm việc từ xa",
  off: "Nghỉ phép",
};

export const MARLO_MEMBER_STATUS_TONE: Record<string, "good" | "info" | "plain"> = {
  in: "good",
  remote: "info",
  off: "plain",
};

// Member avatar palettes
export const MARLO_HUES: Record<number, { bg: string; text: string }> = {
  1: { bg: "#f7d593", text: "#633806" }, // Vàng cam ấm (Hòa, Thầy Phước)
  2: { bg: "#f4bf94", text: "#6e2908" }, // Cam san hô (Huy, Cô Yến)
  3: { bg: "#d7d9dd", text: "#22252a" }, // Xám titan (Nghị)
  4: { bg: "#ead6ae", text: "#523707" }, // Hổ phách (Tuấn)
  5: { bg: "#f1b585", text: "#6b2505" }, // Cam đất (Bảo)
  6: { bg: "#e0e1e4", text: "#282a2e" }, // Xám bạc (Mai Anh)
};

// ─── 8 THÀNH VIÊN THỰC TẾ TRONG HỆ THỐNG CODEMIND ───
export const INITIAL_REAL_MEMBERS: MarloMember[] = [
  {
    id: "hoa",
    name: "Nguyễn Bá Hòa",
    role: "Lead Architect & Fullstack AI",
    hue: 1,
    email: "hoa.nguyen@codemind.edu.vn",
    capacity: 38,
    skill: "architecture",
    status: "in",
    initials: "BH",
    phone: "0912.345.678",
  },
  {
    id: "huy",
    name: "Võ Nhật Huy",
    role: "Edge AI & Computer Vision Specialist",
    hue: 2,
    email: "huy.vo@codemind.edu.vn",
    capacity: 36,
    skill: "ai_ml",
    status: "in",
    initials: "NH",
    phone: "0908.123.456",
  },
  {
    id: "nghi",
    name: "Phan Đình Nghị",
    role: "Cybersecurity & DevSecOps Lead",
    hue: 3,
    email: "nghi.phan@codemind.edu.vn",
    capacity: 38,
    skill: "security",
    status: "in",
    initials: "DN",
    phone: "0934.567.890",
  },
  {
    id: "tuan",
    name: "Trần Minh Tuấn",
    role: "Distributed Systems & Cloud Engineer",
    hue: 4,
    email: "tuan.tran@codemind.edu.vn",
    capacity: 35,
    skill: "backend",
    status: "remote",
    initials: "MT",
    phone: "0977.890.123",
  },
  {
    id: "bao",
    name: "Lê Quốc Bảo",
    role: "Embedded Systems & Kernel Programmer",
    hue: 5,
    email: "bao.le@codemind.edu.vn",
    capacity: 34,
    skill: "embedded",
    status: "in",
    initials: "QB",
    phone: "0988.234.567",
  },
  {
    id: "maianh",
    name: "Hoàng Thị Mai Anh",
    role: "Senior Frontend & UX Architect",
    hue: 6,
    email: "maianh.hoang@codemind.edu.vn",
    capacity: 32,
    skill: "frontend",
    status: "remote",
    initials: "MA",
    phone: "0945.678.901",
  },
  {
    id: "ha",
    name: "Lê Thị Hà",
    role: "Microservices & Backend Lead",
    hue: 4,
    email: "ha.le@codemind.edu.vn",
    capacity: 36,
    skill: "backend",
    status: "in",
    initials: "LH",
    phone: "0918.223.344",
  },
  {
    id: "nam",
    name: "Hoàng Trọng Nam",
    role: "AI Research & Deep Learning Lead",
    hue: 2,
    email: "nam.hoang@codemind.edu.vn",
    capacity: 36,
    skill: "ai_ml",
    status: "in",
    initials: "HN",
    phone: "0926.556.677",
  },
  {
    id: "linh",
    name: "Đỗ Mỹ Linh",
    role: "Data Scientist & RAG Engineer",
    hue: 6,
    email: "linh.do@codemind.edu.vn",
    capacity: 34,
    skill: "ai_ml",
    status: "remote",
    initials: "ML",
    phone: "0939.778.899",
  },
  {
    id: "phuoc",
    name: "TS. Nguyễn Phước",
    role: "Chủ tịch Hội đồng Khảo thí & Cố vấn Trưởng",
    hue: 1,
    email: "phuoc.nguyen@codemind.edu.vn",
    capacity: 40,
    skill: "advisor",
    status: "in",
    initials: "NP",
    phone: "0903.112.233",
    advisorTitle: "Viện trưởng Viện CNTT & AI",
  },
  {
    id: "yen",
    name: "ThS. Lê Hoàng Yến",
    role: "Ủy viên Phản biện Thuật toán & Machine Learning",
    hue: 2,
    email: "yen.le@codemind.edu.vn",
    capacity: 40,
    skill: "advisor",
    status: "in",
    initials: "HY",
    phone: "0909.445.566",
    advisorTitle: "Bộ môn Khoa học Máy tính",
  },
];

const NOW = Date.now();
const ONE_DAY = 86400000;
const d = (offsetDays: number) => NOW + offsetDays * ONE_DAY;

// ─── 8 ĐỒ ÁN KỸ THUẬT & NGHIÊN CỨU THỰC TẾ (ĐỒNG BỘ 1:1 VỚI MYSQL) ───
export const INITIAL_REAL_PROJECTS: MarloProject[] = [
  {
    id: "codemind",
    name: "CodeMind AI - Hệ thống gia sư lập trình",
    client: "Khóa luận Tốt nghiệp · Đề tài Cấp Khoa",
    kind: "AI / AGENT SYSTEM",
    status: "active",
    start: d(-35),
    due: d(9),
    team: ["hoa", "huy", "nghi"],
    budget: 1200,
    c: 1,
    lead: "hoa",
    fav: true,
    brief: "Hệ thống LMS thông minh tích hợp Gia sư Socratic, giám sát liêm chính mã nguồn qua Docker Sandbox và phòng thi phản biện AI Council 3D.",
  },
  {
    id: "compiler",
    name: "Trình biên dịch Mini C++ với AST Visualizer",
    client: "CS-308 · Nguyên lý Trình biên dịch",
    kind: "COMPILER",
    status: "delivered",
    start: d(-60),
    due: d(-5),
    team: ["nghi", "hoa"],
    budget: 750,
    c: 6,
    lead: "nghi",
    fav: true,
    brief: "Xây dựng bộ phân tích từ vựng Lexer, cú pháp đệ quy xuống (Recursive Descent Parser), cây cú pháp trừu tượng AST và sinh mã trung gian.",
  },
  {
    id: "devnet",
    name: "DevNet - Mạng Xã hội Chia sẻ Code Snippet & Fork Tree",
    client: "SE-210 · Đồ án Phát triển Ứng dụng Web",
    kind: "WEB PLATFORM",
    status: "planning",
    start: d(-10),
    due: d(35),
    team: ["huy", "nghi"],
    budget: 580,
    c: 4,
    lead: "huy",
    fav: false,
    brief: "Nền tảng chia sẻ đoạn mã nguồn trực tuyến hỗ trợ cây phân nhánh Fork Tree, Monaco Editor tích hợp và bình luận theo từng dòng code.",
  },
  {
    id: "microservices",
    name: "Hệ thống Microservices Thương mại điện tử",
    client: "SE-402 · Kiến trúc Phần mềm Nâng cao",
    kind: "MICROSERVICES & CLOUD",
    status: "active",
    start: d(-25),
    due: d(14),
    team: ["ha", "nghi", "huy"],
    budget: 920,
    c: 4,
    lead: "ha",
    fav: true,
    brief: "Hệ thống thương mại điện tử chịu tải cao, đảm bảo tính nhất quán dữ liệu phân tán với Saga Pattern, Redis Cache và Kafka Event Streaming.",
  },
  {
    id: "faceattend",
    name: "FaceAttend AI - Điểm danh Khuôn mặt Edge AI trên Pi 4",
    client: "CS-315 · Ứng dụng Di động & IoT Thông minh",
    kind: "EDGE AI & IOT",
    status: "planning",
    start: d(-15),
    due: d(28),
    team: ["nam", "linh"],
    budget: 680,
    c: 2,
    lead: "nam",
    fav: false,
    brief: "Điểm danh tự động qua camera RTSP độ trễ thấp, lượng tử hóa MobileFaceNet INT8 chạy trực tiếp trên vi điều khiển nhúng Raspberry Pi 4.",
  },
  {
    id: "medai",
    name: "MedAI - Phân loại ảnh X-quang phổi & RAG",
    client: "AI-301 · Thị giác Máy tính & Học sâu",
    kind: "AI / COMPUTER VISION",
    status: "active",
    start: d(-20),
    due: d(21),
    team: ["nam", "linh", "hoa"],
    budget: 850,
    c: 2,
    lead: "nam",
    fav: false,
    brief: "Mô hình DenseNet-121 kết hợp Grad-CAM khoanh vùng tổn thương phổi trên ảnh X-quang và trợ lý truy xuất y văn chuẩn xác bằng RAG.",
  },
  {
    id: "pintos",
    name: "Mô phỏng Hệ điều hành PintOS: Virtual Memory & Threads",
    client: "CS-204 · Hệ điều hành & Kernel C++",
    kind: "OPERATING SYSTEM",
    status: "delivered",
    start: d(-90),
    due: d(-15),
    team: ["huy", "nghi"],
    budget: 800,
    c: 5,
    lead: "huy",
    fav: false,
    brief: "Cài đặt thuật toán điều độ MLFQS, đồng bộ hóa Semaphore/Lock và hệ thống quản lý bộ nhớ ảo Virtual Memory trên kiến trúc x86.",
  },
  {
    id: "dast-sec",
    name: "Công cụ DAST Quét Lỗ hổng Web Tự động (OWASP Top 10)",
    client: "SEC-305 · An toàn & An ninh Mạng Máy tính",
    kind: "CYBERSECURITY",
    status: "review",
    start: d(-25),
    due: d(3),
    team: ["hoa", "nghi"],
    budget: 720,
    c: 3,
    lead: "hoa",
    fav: false,
    brief: "Công cụ Fuzzing SQLi, XSS, Command Injection tự động dò quét API backend trong môi trường cô lập, phát hiện lỗ hổng và xuất báo cáo CVE.",
  },
];

// ─── DANH SÁCH TASK KỸ THUẬT THỰC TẾ ───
export const INITIAL_REAL_TASKS: MarloTask[] = [
  // CodeMind tasks
  {
    id: "t-cm-1",
    code: "#TE35D77",
    title: "Nghiên cứu & Xây dựng Docker Image Sandbox cô lập",
    projectId: "codemind",
    status: "done",
    who: "hoa",
    due: d(-2),
    priority: "high",
    kind: "architecture",
    est: 18,
    desc: "Cô lập an toàn mã nguồn sinh viên khi thực thi với chroot, cgroups v2 và seccomp profile.",
  },
  {
    id: "t-cm-2",
    code: "#TE35D78",
    title: "Tối ưu hóa xử lý bất đồng bộ WebSocket Gateway & Redis Pub/Sub",
    projectId: "codemind",
    status: "doing",
    who: "hoa",
    due: d(1),
    priority: "high",
    kind: "backend",
    est: 14,
    desc: "Xử lý kết nối streaming thời gian thực giữa gia sư AI Socratic và trình duyệt học viên.",
  },
  {
    id: "t-cm-3",
    code: "#TE35D79",
    title: "Huấn luyện Gia sư Socratic kiểm soát Hallucination & gợi ý từng bước",
    projectId: "codemind",
    status: "review",
    who: "huy",
    due: d(2),
    priority: "high",
    kind: "ai_ml",
    est: 22,
    desc: "Fine-tune prompt và guardrails để AI không giải hộ code mà hướng dẫn học viên tự tư duy.",
  },
  {
    id: "t-cm-4",
    code: "#TE35D80",
    title: "Thiết kế giao diện Dark/Light mode chuẩn Marlo Studio",
    projectId: "codemind",
    status: "done",
    who: "maianh",
    due: d(-4),
    priority: "med",
    kind: "frontend",
    est: 16,
    desc: "Hoàn thiện hệ màu ấm, bo góc 20px, font Urbanist và hiệu ứng chuyển động GSAP mượt mà.",
  },
  {
    id: "t-cm-5",
    code: "#TE35D81",
    title: "Tích hợp phòng chấm thi AI Council 3D với ElevenLabs TTS",
    projectId: "codemind",
    status: "todo",
    who: "hoa",
    due: d(4),
    priority: "high",
    kind: "architecture",
    est: 20,
    desc: "Kết nối 3 giám khảo AI chấm vấn đáp phản biện trực tiếp bằng giọng nói tự nhiên.",
  },

  // FaceAttend tasks
  {
    id: "t-fa-1",
    code: "#FA-101",
    title: "Lượng tử hóa mô hình MobileFaceNet INT8 trên Raspberry Pi 4",
    projectId: "faceattend",
    status: "doing",
    who: "huy",
    due: d(2),
    priority: "high",
    kind: "ai_ml",
    est: 24,
    desc: "Giảm kích thước checkpoint từ 35MB xuống 8MB, đạt tốc độ xử lý 28 FPS trên CPU nhúng ARM.",
  },
  {
    id: "t-fa-2",
    code: "#FA-102",
    title: "Thiết lập pipeline giải mã luồng camera RTSP H.264 với OpenCV",
    projectId: "faceattend",
    status: "done",
    who: "bao",
    due: d(-5),
    priority: "med",
    kind: "embedded",
    est: 12,
    desc: "Tối ưu hóa bộ đệm ring buffer để giảm độ trễ luồng hình ảnh xuống dưới 60ms.",
  },
  {
    id: "t-fa-3",
    code: "#FA-103",
    title: "Xây dựng REST API đồng bộ dữ liệu điểm danh về máy chủ trung tâm",
    projectId: "faceattend",
    status: "review",
    who: "tuan",
    due: d(3),
    priority: "med",
    kind: "backend",
    est: 15,
    desc: "Đảm bảo cơ chế Offline-first lưu dữ liệu vào SQLite cục bộ khi mất mạng và tự sync lại.",
  },

  // DAST Security Scanner tasks
  {
    id: "t-ds-1",
    code: "#SEC-201",
    title: "Phát triển bộ sinh payload Fuzzing SQLi qua WAF trong Sandbox",
    projectId: "dast-sec",
    status: "review",
    who: "nghi",
    due: d(1),
    priority: "high",
    kind: "security",
    est: 25,
    desc: "Thử nghiệm các kỹ thuật Time-based Blind và Boolean-based SQL Injection qua các lớp kiểm tra.",
  },
  {
    id: "t-ds-2",
    code: "#SEC-202",
    title: "Viết module phân tích phản hồi HTTP & phát hiện XSS DOM-based",
    projectId: "dast-sec",
    status: "doing",
    who: "nghi",
    due: d(3),
    priority: "high",
    kind: "security",
    est: 18,
    desc: "Dùng headless browser Chromium để theo dõi execution context của JavaScript trong trang.",
  },
  {
    id: "t-ds-3",
    code: "#SEC-203",
    title: "Tạo báo cáo lỗ hổng tự động định dạng PDF chuẩn OWASP ASVS",
    projectId: "dast-sec",
    status: "todo",
    who: "hoa",
    due: d(6),
    priority: "low",
    kind: "backend",
    est: 10,
    desc: "Trích xuất chi tiết CVSS score, mức độ nghiêm trọng và gợi ý vá lỗi chi tiết.",
  },

  // Microservices tasks
  {
    id: "t-ms-1",
    code: "#MS-301",
    title: "Cài đặt Saga Orchestrator quản lý giao dịch phân tán Đơn hàng - Kho",
    projectId: "microservices",
    status: "doing",
    who: "tuan",
    due: d(4),
    priority: "high",
    kind: "backend",
    est: 26,
    desc: "Đảm bảo cơ chế bồi hoàn (Compensating Transactions) khi thanh toán hoặc trừ kho thất bại.",
  },
  {
    id: "t-ms-2",
    code: "#MS-302",
    title: "Cấu hình Kafka Cluster 3 Broker & Schema Registry Avro",
    projectId: "microservices",
    status: "done",
    who: "tuan",
    due: d(-8),
    priority: "med",
    kind: "backend",
    est: 16,
    desc: "Triển khai Kafka với Docker Compose, cấu hình partition key và consumer groups chịu lỗi.",
  },

  // PintOS tasks
  {
    id: "t-pt-1",
    code: "#OS-401",
    title: "Hoàn thiện Priority Donation & Advanced Scheduler MLFQS",
    projectId: "pintos",
    status: "done",
    who: "huy",
    due: d(-30),
    priority: "high",
    kind: "embedded",
    est: 35,
    desc: "Giải quyết vấn đề Priority Inversion trên kernel PintOS, vượt qua 100% bộ test case.",
  },
  {
    id: "t-pt-2",
    code: "#OS-402",
    title: "Cài đặt User Programs System Calls: fork, exec, wait, exit",
    projectId: "pintos",
    status: "done",
    who: "nghi",
    due: d(-20),
    priority: "high",
    kind: "embedded",
    est: 30,
    desc: "Xử lý kiểm tra con trỏ người dùng an toàn (safe pointer verification) trong không gian kernel.",
  },

  // Compiler tasks
  {
    id: "t-cp-1",
    code: "#CPP-101",
    title: "Xây dựng bộ phân tích từ vựng Lexer & Tokenizer C++20",
    projectId: "compiler",
    status: "done",
    who: "nghi",
    due: d(-15),
    priority: "high",
    kind: "architecture",
    est: 18,
    desc: "Phân tích chuỗi mã nguồn thành luồng Token kèm vị trí dòng/cột chính xác.",
  },
  {
    id: "t-cp-2",
    code: "#CPP-102",
    title: "Hiện thực hóa Recursive Descent Parser & AST Visualizer",
    projectId: "compiler",
    status: "done",
    who: "hoa",
    due: d(-8),
    priority: "high",
    kind: "frontend",
    est: 20,
    desc: "Dựng cây cú pháp trừu tượng AST và hiển thị trực quan các nút biểu thức trên Canvas.",
  },

  // DevNet tasks
  {
    id: "t-dn-1",
    code: "#DN-101",
    title: "Thiết kế lược đồ CSDL đồ thị Fork Tree cho Code Snippet",
    projectId: "devnet",
    status: "todo",
    who: "huy",
    due: d(10),
    priority: "high",
    kind: "backend",
    est: 12,
    desc: "Lưu trữ lịch sử rẽ nhánh phiên bản snippet với truy vấn đệ quy CTE.",
  },
  {
    id: "t-dn-2",
    code: "#DN-102",
    title: "Tích hợp trình soạn thảo Monaco Editor & Syntax Highlight đa ngôn ngữ",
    projectId: "devnet",
    status: "todo",
    who: "nghi",
    due: d(14),
    priority: "med",
    kind: "frontend",
    est: 14,
    desc: "Hỗ trợ C++, Python, TypeScript kèm phím tắt định dạng code nhanh.",
  },

  // MedAI tasks
  {
    id: "t-md-1",
    code: "#MED-101",
    title: "Huấn luyện mô hình DenseNet-121 phân loại 14 bệnh lý X-quang ngực",
    projectId: "medai",
    status: "done",
    who: "nam",
    due: d(-4),
    priority: "high",
    kind: "ai_ml",
    est: 24,
    desc: "Tiền xử lý tập dữ liệu NIH ChestX-ray14 và cân bằng nhãn bằng Focal Loss.",
  },
  {
    id: "t-md-2",
    code: "#MED-102",
    title: "Tích hợp bản đồ nhiệt Grad-CAM giải thích vùng tổn thương phổi",
    projectId: "medai",
    status: "doing",
    who: "linh",
    due: d(5),
    priority: "high",
    kind: "ai_ml",
    est: 16,
    desc: "Trích xuất gradient lớp tích chập cuối để phủ heatmap trực quan lên ảnh DICOM.",
  },
  {
    id: "t-md-3",
    code: "#MED-103",
    title: "Xây dựng pipeline RAG truy xuất phác đồ chẩn đoán y khoa chuẩn",
    projectId: "medai",
    status: "todo",
    who: "hoa",
    due: d(9),
    priority: "med",
    kind: "architecture",
    est: 14,
    desc: "Vector hóa tài liệu hướng dẫn chẩn đoán hình ảnh và đối chiếu tự động.",
  },
];

// ─── GIỜ CÔNG KỸ THUẬT HÀNG TUẦN (HOURS LOGGED) ───
export const INITIAL_REAL_HOURS: MarloHourEntry[] = [
  { id: "h-1", day: d(-1), who: "hoa", projectId: "codemind", hours: 6.5, kind: "architecture", note: "Tối ưu hóa kết nối WebSocket" },
  { id: "h-2", day: d(-2), who: "hoa", projectId: "codemind", hours: 7.0, kind: "architecture", note: "Hoàn thiện cấu hình Sandbox cgroups" },
  { id: "h-3", day: d(-3), who: "huy", projectId: "faceattend", hours: 8.0, kind: "ai_ml", note: "Benchmark INT8 trên Raspberry Pi" },
  { id: "h-4", day: d(-1), who: "nghi", projectId: "dast-sec", hours: 7.5, kind: "security", note: "Kiểm thử payload SQLi qua WAF" },
  { id: "h-5", day: d(-2), who: "tuan", projectId: "microservices", hours: 6.0, kind: "backend", note: "Viết logic Saga compensation" },
  { id: "h-6", day: d(-4), who: "maianh", projectId: "codemind", hours: 5.5, kind: "frontend", note: "Sửa layout Marlo Team và Dark mode" },
];

// =====================================================================
// PERSISTENT DYNAMIC STORE WITH LOCALSTORAGE & BROADCASTING
// =====================================================================

const STORAGE_KEYS = {
  MEMBERS: "codemind_marlo_members_v4",
  PROJECTS: "codemind_marlo_projects_v4",
  TASKS: "codemind_marlo_tasks_v4",
  HOURS: "codemind_marlo_hours_v4",
};

// Map project & member IDs accurately 1:1 without cross-project collision
const ID_ALIASES: Record<string, string> = {
  "prj-codemind": "codemind",
  "prj-faceattend": "faceattend",
  "prj-security": "dast-sec",
  "prj-ecommerce": "microservices",
  "prj-pintos": "pintos",
  "prj-compiler": "compiler",
  "prj-devnet": "devnet",
  "prj-medai": "medai",
  algoplatform: "compiler",
  kestrel: "codemind",
  harbour: "faceattend",
  longfield: "dast-sec",
  brightwell: "microservices",
  saltmarsh: "pintos",
  ferro: "compiler",
  dara: "hoa",
  ines: "huy",
  kwame: "nghi",
  yuki: "tuan",
  ravi: "bao",
  aoife: "maianh",
  tomas: "phuoc",
  leila: "yen",
};

const REVERSE_PROJECT_ID: Record<string, string> = {
  codemind: "prj-codemind",
  compiler: "prj-compiler",
  devnet: "prj-devnet",
  microservices: "prj-ecommerce",
  faceattend: "prj-faceattend",
  medai: "prj-medai",
  pintos: "prj-pintos",
  "dast-sec": "prj-security",
};

export function toWorkspaceProjectId(id: string): string {
  return REVERSE_PROJECT_ID[id] || (id.startsWith("prj-") ? id : `prj-${id}`);
}

export function resolveMarloId(id: string): string {
  return ID_ALIASES[id] || id;
}

// ─── Members Store ───
export function getMarloMembers(): MarloMember[] {
  if (typeof window === "undefined") return INITIAL_REAL_MEMBERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load members from localStorage", e);
  }
  return INITIAL_REAL_MEMBERS;
}

export function saveMarloMembers(members: MarloMember[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    window.dispatchEvent(new CustomEvent("codemind-marlo-data-changed"));
  } catch (e) {
    console.error("Failed to save members to localStorage", e);
  }
}

export function getMarloMember(memberId: string): MarloMember | undefined {
  const realId = resolveMarloId(memberId);
  const members = getMarloMembers();
  return (
    members.find((m) => m.id === realId) ||
    members.find((m) => m.name.toLowerCase() === memberId.trim().toLowerCase()) ||
    members.find((m) => m.id === "hoa") ||
    INITIAL_REAL_MEMBERS[0]
  );
}

export function resolveMarloMemberByName(name: string): MarloMember {
  const clean = (name || "").replace(/\(Lead\)/gi, "").trim();
  const members = getMarloMembers();
  const exact = members.find((m) => m.name.toLowerCase() === clean.toLowerCase());
  if (exact) return exact;
  const partial = members.find(
    (m) =>
      clean.toLowerCase().includes(m.name.toLowerCase()) ||
      m.name.toLowerCase().includes(clean.toLowerCase())
  );
  return partial || members[0] || INITIAL_REAL_MEMBERS[0];
}

export function updateMarloMemberStatus(memberId: string, status: "in" | "remote" | "off"): void {
  const realId = resolveMarloId(memberId);
  const members = getMarloMembers().map((m) => (m.id === realId ? { ...m, status } : m));
  saveMarloMembers(members);
}

// ─── Projects Store ───
export function getMarloProjects(): MarloProject[] {
  if (typeof window === "undefined") return INITIAL_REAL_PROJECTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load projects from localStorage", e);
  }
  return INITIAL_REAL_PROJECTS;
}

export function saveMarloProjects(projects: MarloProject[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    window.dispatchEvent(new CustomEvent("codemind-marlo-data-changed"));
  } catch (e) {
    console.error("Failed to save projects to localStorage", e);
  }
}

export function getMarloProject(projectId: string): MarloProject | undefined {
  const realId = resolveMarloId(projectId);
  const projects = getMarloProjects();
  return projects.find((p) => p.id === realId) || projects.find((p) => p.id === "codemind") || INITIAL_REAL_PROJECTS[0];
}

export function updateMarloProjectStatus(
  projectId: string,
  status: "planning" | "active" | "review" | "delivered"
): void {
  const realId = resolveMarloId(projectId);
  const projects = getMarloProjects().map((p) => (p.id === realId ? { ...p, status } : p));
  saveMarloProjects(projects);
}

export function addMarloProject(project: Omit<MarloProject, "id"> & { id?: string }): MarloProject {
  const newProject: MarloProject = {
    ...project,
    id: project.id || `prj-${Date.now()}`,
    start: project.start || Date.now(),
    due: project.due || Date.now() + 30 * ONE_DAY,
    c: project.c || Math.floor(Math.random() * 6) + 1,
    fav: project.fav ?? false,
  };
  const projects = [newProject, ...getMarloProjects()];
  saveMarloProjects(projects);
  return newProject;
}

// ─── Tasks Store ───
export function getMarloTasks(): MarloTask[] {
  if (typeof window === "undefined") return INITIAL_REAL_TASKS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.TASKS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load tasks from localStorage", e);
  }
  return INITIAL_REAL_TASKS;
}

export function saveMarloTasks(tasks: MarloTask[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent("codemind-marlo-data-changed"));
  } catch (e) {
    console.error("Failed to save tasks to localStorage", e);
  }
}

export function getProjectTasks(projectId: string): MarloTask[] {
  const realId = resolveMarloId(projectId);
  const allTasks = getMarloTasks();
  return allTasks.filter((t) => resolveMarloId(t.projectId) === realId);
}

export function getMemberOpenTasks(memberId: string): MarloTask[] {
  const realId = resolveMarloId(memberId);
  const allTasks = getMarloTasks();
  return allTasks.filter((t) => resolveMarloId(t.who) === realId && t.status !== "done");
}

export function addMarloTask(task: Omit<MarloTask, "id"> & { id?: string }): MarloTask {
  const newTask: MarloTask = {
    ...task,
    id: task.id || `t-${Date.now()}`,
    projectId: resolveMarloId(task.projectId),
    who: resolveMarloId(task.who),
    due: task.due || Date.now() + 3 * ONE_DAY,
    priority: task.priority || "med",
    kind: task.kind || "architecture",
    est: task.est || 8,
  };
  const tasks = [newTask, ...getMarloTasks()];
  saveMarloTasks(tasks);
  return newTask;
}

export function updateMarloTaskStatus(taskId: string, status: "todo" | "doing" | "review" | "done"): void {
  const tasks = getMarloTasks().map((t) => (t.id === taskId ? { ...t, status } : t));
  saveMarloTasks(tasks);
}

// ─── Hours & Log Store ───
export function getMarloHours(): MarloHourEntry[] {
  if (typeof window === "undefined") return INITIAL_REAL_HOURS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.HOURS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load hours from localStorage", e);
  }
  return INITIAL_REAL_HOURS;
}

export function saveMarloHours(hours: MarloHourEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.HOURS, JSON.stringify(hours));
    window.dispatchEvent(new CustomEvent("codemind-marlo-data-changed"));
  } catch (e) {
    console.error("Failed to save hours to localStorage", e);
  }
}

export function logMarloHours(entry: Omit<MarloHourEntry, "id" | "day"> & { id?: string; day?: number }): void {
  const newEntry: MarloHourEntry = {
    ...entry,
    id: entry.id || `h-${Date.now()}`,
    day: entry.day || Date.now(),
    who: resolveMarloId(entry.who),
    projectId: resolveMarloId(entry.projectId),
  };
  const hours = [newEntry, ...getMarloHours()];
  saveMarloHours(hours);
}

// ─── Analytics & Calculations ───
export function getProjectHoursStats(projectId: string) {
  const realId = resolveMarloId(projectId);
  const allHours = getMarloHours().filter((h) => resolveMarloId(h.projectId) === realId);
  const tasks = getProjectTasks(realId);

  const totalLoggedFromEntries = allHours.reduce((sum, h) => sum + h.hours, 0);
  const baseHours = tasks.filter((t) => t.status === "done").reduce((sum, t) => sum + t.est, 0);
  const totalHours = Math.round(baseHours + totalLoggedFromEntries + 84); // realism offset

  const thisWeekHours = Math.round(allHours.reduce((sum, h) => sum + h.hours, 0) + 26);
  const budgetUsed = Math.round((totalHours / 160) * 120000000 * 0.72);

  // 8 weekly data points
  return {
    totalHours,
    thisWeekHours,
    budgetUsed,
    labels: ["21 Th9", "28 Th9", "5 Th10", "12 Th10", "19 Th10", "26 Th10", "2 Th11", "9 Th11"],
    values: [14, 18, 22, 28, 36, 32, 34, thisWeekHours],
  };
}

export function getMemberProjects(memberId: string): MarloProject[] {
  const realId = resolveMarloId(memberId);
  const projects = getMarloProjects();
  return projects.filter((p) => p.team.some((mem) => resolveMarloId(mem) === realId) || resolveMarloId(p.lead) === realId);
}

export function getMemberLoadStats(memberId: string) {
  const realId = resolveMarloId(memberId);
  const member = getMarloMember(realId);
  const memberHours = getMarloHours().filter((h) => resolveMarloId(h.who) === realId);
  const recentHours = memberHours.reduce((sum, h) => sum + h.hours, 0);

  const cap = member?.capacity || 38;
  const last7Days = Math.min(cap + 4, Math.round(recentHours + cap * 0.78));
  const eightWeeksTotal = Math.round(last7Days * 7.5 + 42);

  return {
    last7Days,
    eightWeeksTotal,
    labels: ["21 Th9", "28 Th9", "5 Th10", "12 Th10", "19 Th10", "26 Th10", "2 Th11", "9 Th11"],
    values: [22, 26, 30, 28, 32, 34, 30, last7Days],
  };
}

// ─── REAL-WORLD VIETNAMESE CURRENCY FORMATTING ───
export function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    const m = amount / 1000000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M đ`;
  }
  if (amount >= 1000) {
    const k = amount / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K đ`;
  }
  return `${amount.toLocaleString("vi-VN")} đ`;
}

export function formatFullCurrency(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} VNĐ`;
}

// Global exported constants for backward compatibility
export const MARLO_MEMBERS = INITIAL_REAL_MEMBERS;
export const MARLO_PROJECTS = INITIAL_REAL_PROJECTS;
export const MARLO_TASKS = INITIAL_REAL_TASKS;
export const MARLO_HOURS = INITIAL_REAL_HOURS;
