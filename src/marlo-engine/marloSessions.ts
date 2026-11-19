// Marlo Session & Booking Engine (Rooms, Periodic Exams & Student Mentoring)
// Ported directly from D:\C++\quản lí dự án\marlo-app

export type SessionKind = "exam" | "mentor" | "review" | "defense" | "lab";

export interface MarloRoomSession {
  id: string;
  title: string;
  kind: SessionKind;
  at: number; // timestamp in ms
  mins: number; // duration in minutes
  projectId?: string;
  projectName?: string;
  who: string[]; // member / student IDs
  room: string;
  done: boolean;
  notes?: string;
  // Specific for exams & mentoring
  examinerOrMentor?: string;
  studentName?: string;
  statusText?: string;
}

export interface StudentMentoringRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  project: string;
  topic: string;
  requestedDate: string;
  preferredTime: string;
  durationMins: number;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

// ── Rooms standard list (Marlo style adapted to Engineering Campus) ──
export const MARLO_ROOMS = [
  "Phòng Khảo thí & Hội đồng 402",
  "Phòng Lab AI & Sandbox 301",
  "Phòng Cố vấn Mentor Studio",
  "Phòng Hội đồng Bảo vệ 101",
  "Google Meet Trực Tuyến",
] as const;

export type MarloRoom = (typeof MARLO_ROOMS)[number];

// ── Kind styling & badges ──
export const SESSION_KIND_META: Record<
  SessionKind,
  { name: string; icon: string; badgeClass: string; color: string }
> = {
  exam: {
    name: "Lịch thi định kỳ",
    icon: "award",
    badgeClass: "pill--bad tone-red",
    color: "#ad3622",
  },
  mentor: {
    name: "Cố vấn Mentor 1-1",
    icon: "users",
    badgeClass: "pill--accent tone-warm",
    color: "#f29b23",
  },
  review: {
    name: "Review đồ án",
    icon: "eye",
    badgeClass: "pill--info tone-blue",
    color: "#285b91",
  },
  defense: {
    name: "Hội đồng Khảo thí AI",
    icon: "shield",
    badgeClass: "pill--good tone-green",
    color: "#1c7046",
  },
  lab: {
    name: "Thực hành Lab",
    icon: "cpu",
    badgeClass: "pill--plain tone-purple",
    color: "#7c3aed",
  },
};

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const todayMs = TODAY.getTime();
const dMs = (dayOffset: number, hour: number, minute: number = 0) =>
  todayMs + dayOffset * 86400000 + hour * 3600000 + minute * 60000;

// ── Initial Sessions Seed (Exams & Mentoring Sessions) ──
export const INITIAL_ROOM_SESSIONS: MarloRoomSession[] = [
  // HÔM NAY (Today)
  {
    id: "ses-1",
    title: "Thi Vấn đáp & Thực hành Giải thuật C++ (Lớp CS-201)",
    kind: "exam",
    at: dMs(0, 9, 0),
    mins: 90,
    projectId: "prj-compiler",
    projectName: "Trình biên dịch Mini C++ với AST Visualizer",
    who: ["bhoa", "vhuy"],
    studentName: "Nguyễn Bá Hòa & Võ Nhật Huy",
    examinerOrMentor: "Thầy Nguyễn Phước (Chủ tịch Hội đồng)",
    room: "Phòng Khảo thí & Hội đồng 402",
    done: false,
    notes: "Thi trực tiếp tại phòng máy, học viên giải đề tài chỗ và demo AST generator.",
    statusText: "Đang thi trực tiếp",
  },
  {
    id: "ses-2",
    title: "Cố vấn 1-1: Gỡ lỗi Docker Sandbox & H2 Constraint",
    kind: "mentor",
    at: dMs(0, 11, 0),
    mins: 60,
    projectId: "prj-codemind",
    projectName: "CodeMind AI - Hệ thống Gia sư Lập trình Socratic",
    who: ["bhoa"],
    studentName: "Nguyễn Bá Hòa (Leader)",
    examinerOrMentor: "Thầy Trần Minh Quân (Cố vấn AI)",
    room: "Phòng Cố vấn Mentor Studio",
    done: false,
    notes: "Học viên nhờ mentor giải đáp lỗi timeout khi chạy isolate container.",
    statusText: "Sắp diễn ra",
  },
  {
    id: "ses-3",
    title: "Họp Hội đồng Khảo thí AI: Đánh giá Liêm chính Sprint 1",
    kind: "defense",
    at: dMs(0, 14, 0),
    mins: 90,
    projectId: "prj-codemind",
    projectName: "CodeMind AI Socratic Platform",
    who: ["bhoa", "vhuy", "dnghi"],
    studentName: "Toàn bộ nhóm đồ án CodeMind",
    examinerOrMentor: "Hội đồng 3 Chuyên gia Khảo thí",
    room: "Phòng Hội đồng Bảo vệ 101",
    done: false,
    notes: "Đánh giá mức độ hài lòng phản biện AI và kiểm tra độ trễ 3 tầng kiến trúc.",
    statusText: "Sắp diễn ra",
  },
  {
    id: "ses-4",
    title: "Cố vấn 1-1: Review Kiến trúc Clean Architecture 3 Tầng",
    kind: "mentor",
    at: dMs(0, 16, 0),
    mins: 45,
    projectId: "prj-ecommerce",
    projectName: "Hệ thống Microservices Thương mại Điện tử",
    who: ["tuan"],
    studentName: "Trần Minh Tuấn (Backend Lead)",
    examinerOrMentor: "Thầy Nguyễn Phước",
    room: "Google Meet Trực Tuyến",
    done: false,
    notes: "Tư vấn tách gRPC service và tối ưu Kafka transaction.",
    statusText: "Sắp diễn ra",
  },

  // NGÀY MAI (Tomorrow)
  {
    id: "ses-5",
    title: "Thi Định kỳ: Kiểm tra Lỗ hổng Web OWASP Top 10 (SEC-305)",
    kind: "exam",
    at: dMs(1, 8, 30),
    mins: 120,
    projectId: "prj-security",
    projectName: "Công cụ DAST Quét Lỗ hổng Web Tự động",
    who: ["dnghi"],
    studentName: "Phan Đình Nghị (Backend & DB)",
    examinerOrMentor: "Cô Lan Anh (Giảng viên Hướng dẫn)",
    room: "Phòng Khảo thí & Hội đồng 402",
    done: false,
    notes: "Thi thực hành khai thác lỗ hổng SQL Injection trên máy chủ giả lập.",
    statusText: "Đã lên lịch",
  },
  {
    id: "ses-6",
    title: "Cố vấn 1-1: Thiết kế Sharding CSDL MySQL & Connection Pool",
    kind: "mentor",
    at: dMs(1, 14, 0),
    mins: 60,
    projectId: "prj-ecommerce",
    projectName: "Hệ thống Microservices Thương mại Điện tử",
    who: ["ha"],
    studentName: "Lê Thị Hà (DevOps)",
    examinerOrMentor: "Thầy Trần Minh Quân",
    room: "Phòng Cố vấn Mentor Studio",
    done: false,
    notes: "Tư vấn tối ưu max_connections và tuning index InnoDB.",
    statusText: "Đã lên lịch",
  },

  // CÁC NGÀY TRONG TUẦN
  {
    id: "ses-7",
    title: "Thi Vấn đáp Giữa kỳ: Kernel PintOS Threads & Scheduling",
    kind: "exam",
    at: dMs(2, 9, 30),
    mins: 90,
    projectId: "prj-pintos",
    projectName: "Mô phỏng Hệ điều hành PintOS",
    who: ["vhuy"],
    studentName: "Võ Nhật Huy (Fullstack & AI)",
    examinerOrMentor: "Thầy Nguyễn Phước",
    room: "Phòng Khảo thí & Hội đồng 402",
    done: false,
    notes: "Kiểm tra cơ chế Priority Donation và Round Robin Scheduler.",
    statusText: "Đã lên lịch",
  },
  {
    id: "ses-8",
    title: "Thực hành Lab: Cấu hình CI/CD Pipeline & GitHub Runners",
    kind: "lab",
    at: dMs(3, 10, 0),
    mins: 120,
    projectId: "prj-codemind",
    projectName: "CodeMind AI Sandbox",
    who: ["bhoa", "ha"],
    studentName: "Nguyễn Bá Hòa & Lê Thị Hà",
    examinerOrMentor: "Cô Lan Anh",
    room: "Phòng Lab AI & Sandbox 301",
    done: false,
    notes: "Kiểm thử tự động hóa pipeline linting, pytest và docker compose build.",
    statusText: "Đã lên lịch",
  },
];

// ── Mentoring Requests from Students (Học viên gửi nhờ mentor cố vấn) ──
export const INITIAL_MENTORING_REQUESTS: StudentMentoringRequest[] = [
  {
    id: "req-1",
    studentId: "bhoa",
    studentName: "Nguyễn Bá Hòa",
    studentAvatar: "BH",
    project: "CodeMind AI - Hệ thống Gia sư Socratic",
    topic: "Nhờ Thầy hướng dẫn cách giải quyết nghẽn kết nối WebSocket khi có nhiều học viên đồng thời đặt câu hỏi cho AI.",
    requestedDate: "Hôm nay",
    preferredTime: "15:00 - 16:00",
    durationMins: 60,
    status: "approved",
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: "req-2",
    studentId: "vhuy",
    studentName: "Võ Nhật Huy",
    studentAvatar: "VH",
    project: "FaceAttend AI - Điểm danh Khuôn mặt Edge AI",
    topic: "Nhờ Thầy cố vấn cách lượng tử hóa mô hình MobileFaceNet INT8 để nhúng xuống Raspberry Pi 4 mượt mà không bị sụt FPS.",
    requestedDate: "Ngày mai",
    preferredTime: "09:30 - 10:30",
    durationMins: 60,
    status: "pending",
    createdAt: Date.now() - 3600000 * 5,
  },
  {
    id: "req-3",
    studentId: "dnghi",
    studentName: "Phan Đình Nghị",
    studentAvatar: "PN",
    project: "DAST Quét Lỗ hổng Web Tự động",
    topic: "Em gặp khó khăn khi sinh payload Fuzzing SQLi không bypass được WAF trong môi trường Docker, nhờ Thầy chỉ dẫn thêm.",
    requestedDate: "Thứ Sáu, 21/11",
    preferredTime: "14:00 - 15:00",
    durationMins: 60,
    status: "pending",
    createdAt: Date.now() - 3600000 * 12,
  },
  {
    id: "req-4",
    studentId: "tuan",
    studentName: "Trần Minh Tuấn",
    studentAvatar: "TT",
    project: "Hệ thống Microservices Thương mại Điện tử",
    topic: "Xin Thầy tư vấn giải pháp xử lý Distributed Transaction theo mô hình Saga Orchestrator khi một dịch vụ con thất bại.",
    requestedDate: "Thứ Hai tuần sau",
    preferredTime: "10:00 - 11:30",
    durationMins: 90,
    status: "pending",
    createdAt: Date.now() - 3600000 * 24,
  },
];

// Helper: Kiểm tra xung đột trùng phòng (Room conflict check)
export function checkRoomConflict(
  sessions: MarloRoomSession[],
  room: string,
  startMs: number,
  durationMins: number,
  excludeId?: string
): MarloRoomSession | null {
  if (room === "Google Meet Trực Tuyến") return null; // Online không giới hạn phòng
  const endMs = startMs + durationMins * 60000;
  return (
    sessions.find(
      (s) =>
        s.id !== excludeId &&
        s.room === room &&
        s.at < endMs &&
        s.at + s.mins * 60000 > startMs
    ) || null
  );
}
