import { useState, useMemo, useRef, useEffect } from "react";

import { initialProjectsData, type Project } from "../data/kanbanProjects";

import { MarloProjectSlateModal, MarloNewProjectModal } from "../components/MarloProjectModals";

import { createPortal } from "react-dom";

import {

  BarChart3,

  BookOpen,

  Bot,

  Calendar,

  Check,

  CheckCircle2,

  ChevronDown,

  Columns3,

  Copy,

  FileSpreadsheet,

  FileText,

  Filter,

  Flame,

  FolderKanban,

  GraduationCap,

  GripVertical,

  Layers,

  Link2,

  ListChecks,

  Lock,

  Plus,

  Search,

  ShieldAlert,

  ShieldCheck,

  Sparkles,

  Trash2,

  Activity,

  PieChart,

  TrendingDown,

  TrendingUp,

  Unlock,

  Eye,

  RotateCcw,

  UserCheck,

  UserPlus,

  Users,

  X,

  CheckCheck,

  Download,

  ArrowUpRight,

  Folder,

} from "lucide-react";

import TaskCsvManagerModal from "../components/TaskCsvManagerModal";

import MarloNewTaskModal from "../components/MarloNewTaskModal";

import OdometerNumber from "../components/OdometerNumber";

import MarloTitle from "../components/MarloTitle";

import MarloNumber from "../components/MarloNumber";

import MarloCapacityBar from "../components/MarloCapacityBar";

import MarloToast from "../components/MarloToast";

import MarloTaskDrawer from "../components/MarloTaskDrawer";

import KanbanMyTasksView from "../components/KanbanMyTasksView";

import KanbanTeamScrumView from "../components/KanbanTeamScrumView";

import KanbanActivityStreamView from "../components/KanbanActivityStreamView";

import MarloSegmentedControl from "../components/MarloSegmentedControl";

import { useMarloPageEntrance, animateMarloCards, animateMarloRows } from "../utils/marloAnimations";

import type { Role } from "../App";

import ProjectGradingModal from "../components/ProjectGradingModal";

import {

  fetchKanbanWorkspace,

  createWorkspaceProjectApi,

  updateWorkspaceProjectApi,

  createWorkspaceTaskApi,

  batchCreateWorkspaceTasksApi,

  generateAiWbsTasksApi,

  updateWorkspaceTaskApi,

  moveWorkspaceTaskApi,

  deleteWorkspaceTaskApi,

  reviewWorkspaceTaskApi,

  fetchProjectEvaluationApi,

  evaluateProjectApi,

} from "../api";



export type ColumnId = "backlog" | "ready" | "in-progress" | "done" | "verified" | "fail";

export type Priority = "low" | "medium" | "high";

export type MoscowPriority = "must" | "should" | "could" | "wont";

export type TabView = "board" | "my-tasks" | "team" | "activity" | "dependencies" | "analytics";

export type TechStackKey =

  | "ai"

  | "backend"

  | "database"

  | "sandbox"

  | "devops"

  | "frontend"

  | "fullstack"

  | "custom";



export interface TeamMember {

  id: string;

  name: string;

  avatar: string;

  role: string;

  color: string;

}



export interface TaskAuditLog {

  user: string;

  fromColumn: string;

  toColumn: string;

  timestamp: string;

}



export interface ChecklistItem {

  id: string;

  text: string;

  done: boolean;

}



export interface UserStory {

  role: string;

  want: string;

  benefit: string;

}



export interface KanbanTask {

  id: string;

  code: string;

  title: string;

  description: string;

  column: ColumnId;

  priority: Priority;

  moscow?: MoscowPriority;

  userStory?: UserStory;

  acceptanceCriteria?: string;

  definitionOfDone?: ChecklistItem[];

  points: number; // Story points (1, 2, 3, 5, 8, 13)

  assignee: {

    name: string;

    avatar: string;

    role: string;

  };

  estimateHours: number;

  dueDate: string;

  epic: string;

  epicColor: string;

  dependsOn?: string; // id of task that must be done first (Hard Constraint H2)

  checklist: ChecklistItem[];

  deliverable?: {

    type: "pr" | "commit" | "test";

    label: string;

    url?: string;

  };

  commentsCount: number;

  attachmentsCount: number;

  projectDay?: number;

  sprintNumber?: number;

  submissionRequirement?: "Không" | "Link" | "File" | "Link hoặc file";

  submissionUrl?: string;

  isBonus?: boolean;

  auditLogs?: TaskAuditLog[];

}



const defaultDoD = (isDone = false): ChecklistItem[] => [

  { id: "dod-1", text: "Code vượt qua 100% test cases trong Docker sandbox độc lập", done: isDone },

  { id: "dod-2", text: "Tuân thủ Kiến trúc 3 tầng (Router -> Service -> Data Layer)", done: isDone },

  { id: "dod-3", text: "Không có lỗi Type/Lint, timestamp chuẩn ISO-8601 UTC (H4)", done: isDone },

  { id: "dod-4", text: "Được ít nhất 1 thành viên review và giải phóng Ràng buộc H2", done: isDone },

];



const initialMembers: TeamMember[] = [

  { id: "m1", name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect", color: "bg-[#14161a] dark:bg-slate-700" },

  { id: "m2", name: "Võ Nhật Huy", avatar: "H", role: "Frontend & AI Dev", color: "bg-amber-500" },

  { id: "m3", name: "Phan Đình Nghị", avatar: "N", role: "Backend & Database", color: "bg-slate-600 dark:bg-slate-500" },

];



export const getAssigneeAvatarColor = (name: string, fallback?: string): string => {

  if (name.includes("Hòa")) return "bg-[#14161a] dark:bg-slate-700";

  if (name.includes("Huy")) return "bg-amber-500";

  if (name.includes("Nghị")) return "bg-slate-600 dark:bg-slate-500";

  if (fallback && !fallback.includes("blue") && !fallback.includes("emerald") && !fallback.includes("purple") && !fallback.includes("teal") && !fallback.includes("rose") && !fallback.includes("indigo") && !fallback.includes("cyan")) {

    return fallback;

  }

  return "bg-amber-600";

};



const initialTasks: KanbanTask[] = [

  {

    id: "task-1",

    code: "TE9CA72",

    title: "Khảo sát thực trạng đào tạo lập trình & Đặc tả SRS 12 Ca sử dụng",

    description: "Khảo sát các hạn chế của LMS truyền thống. Đặc tả chi tiết 12 Use Cases cho 4 phân hệ cốt lõi: Code Lab, AI Socratic, AI Defense Room, Git Project Hub kèm chuẩn phi chức năng Latency < 500ms, ISO-8601 UTC.",

    column: "done",

    priority: "high",

    moscow: "must",

    points: 5,

    assignee: { name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect" },

    estimateHours: 6,

    dueDate: "05/11/2026",

    epic: "SRS & Specs",

    epicColor: "bg-blue-50 text-blue-700 border-blue-200",

    submissionRequirement: "Link",

    submissionUrl: "https://github.com/nguyen0605/E-learning-Project",

    auditLogs: [

      { user: "Nguyễn Bá Hòa", fromColumn: "Backlog", toColumn: "Cần làm", timestamp: "05/11/2026 09:12" },

      { user: "Nguyễn Bá Hòa", fromColumn: "Cần làm", toColumn: "Đang làm", timestamp: "05/11/2026 09:12" },

      { user: "Nguyễn Bá Hòa", fromColumn: "Đang làm", toColumn: "Hoàn thành", timestamp: "05/11/2026 09:13" },

    ],

    userStory: {

      role: "Trưởng nhóm & Sinh viên",

      want: "đặc tả chi tiết 12 ca sử dụng và các ràng buộc phi chức năng",

      benefit: "định hình rõ phạm vi 4 phân hệ của đề tài CodeMind Campus",

    },

    acceptanceCriteria: "Given yêu cầu khởi động đề tài Nhóm 4\nWhen lập tài liệu đặc tả SRS\nThen hoàn thành 12 Use Cases và nộp link GitHub minh chứng hợp lệ",

    definitionOfDone: defaultDoD(true),

    checklist: [

      { id: "c1", text: "Khảo sát các hạn chế của LMS truyền thống", done: true },

      { id: "c2", text: "Đặc tả 12 Use Cases và kiến trúc 3 tầng", done: true },

      { id: "c3", text: "Nộp link repo GitHub minh chứng lên hệ thống", done: true },

    ],

    deliverable: { type: "commit", label: "commit #TE9CA72" },

    commentsCount: 4,

    attachmentsCount: 2,

  },

  {

    id: "task-2",

    code: "TE14F82",

    title: "Thiết kế CSDL quan hệ chuẩn hóa 3NF & ERD 8 bảng",

    description: "Xác định khóa chính PK, khóa ngoại FK, loại bỏ toàn bộ phụ thuộc bắc cầu, bắt buộc timestamp UTC (H4) theo yêu cầu Hội đồng Phản biện.",

    column: "ready",

    priority: "high",

    moscow: "must",

    points: 5,

    assignee: { name: "Phan Đình Nghị", avatar: "N", role: "Backend & Database" },

    estimateHours: 6,

    dueDate: "06/11/2026",

    epic: "Database",

    epicColor: "bg-purple-50 text-purple-700 border-purple-200",

    submissionRequirement: "File",

    userStory: {

      role: "Database Engineer",

      want: "sơ đồ ERD 8 bảng thực thể chuẩn 3NF",

      benefit: "dữ liệu không bị dị thường khi thêm, xóa, sửa và chuẩn hóa khóa ngoại",

    },

    acceptanceCriteria: "Given yêu cầu nghiệp vụ lưu trữ khóa học\nWhen thiết kế CSDL\nThen schema đạt chuẩn 3NF và timestamp dùng UTC",

    definitionOfDone: defaultDoD(false),

    checklist: [

      { id: "c1", text: "Vẽ sơ đồ ERD 8 thực thể chính", done: true },

      { id: "c2", text: "Thiết kế khóa ngoại ON DELETE CASCADE", done: true },

      { id: "c3", text: "Xuất file ERD chất lượng cao", done: false },

    ],

    deliverable: { type: "commit", label: "docs/ERD_8_Tables.png" },

    commentsCount: 2,

    attachmentsCount: 1,

  },

  {

    id: "task-3",

    code: "TE22C19",

    title: "Xây dựng Module Authentication JWT & Phân quyền RBAC",

    description: "Đăng ký, đăng nhập, băm mật khẩu bcrypt, cấp Access Token và Refresh Token cho 3 vai trò: Student, Instructor, Admin.",

    column: "in-progress",

    priority: "high",

    moscow: "must",

    points: 5,

    assignee: { name: "Võ Nhật Huy", avatar: "H", role: "Frontend & AI Dev" },

    estimateHours: 4,

    dueDate: "07/11/2026",

    epic: "Security & Auth",

    epicColor: "bg-indigo-50 text-indigo-700 border-indigo-200",

    submissionRequirement: "Link",

    userStory: {

      role: "Backend Developer",

      want: "cơ chế xác thực JWT và bảo mật mật khẩu bcrypt",

      benefit: "bảo vệ API và phân định ranh giới quyền giữa sinh viên và giảng viên",

    },

    acceptanceCriteria: "Given người dùng đăng nhập\nWhen thông tin hợp lệ\nThen cấp JWT token chuẩn và lưu mã băm bcrypt",

    definitionOfDone: defaultDoD(false),

    checklist: [

      { id: "c1", text: "Băm password với bcrypt 12 rounds", done: true },

      { id: "c2", text: "Dependency get_current_user", done: true },

      { id: "c3", text: "Viết unit test pytest cho auth router", done: false },

    ],

    deliverable: { type: "pr", label: "PR #07: JWT & RBAC" },

    commentsCount: 6,

    attachmentsCount: 3,

  },

  {

    id: "task-4",

    code: "TE35D77",

    title: "Nghiên cứu & Xây dựng Docker Image Sandbox cô lập (H2)",

    description: "Tạo Dockerfile Alpine Linux siêu nhẹ, chạy non-root user, cgroups RAM 128MB, 0.5 CPU và Watchdog 2.0s chống vô tận.",

    column: "in-progress",

    priority: "high",

    moscow: "must",

    points: 5,

    assignee: { name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect" },

    estimateHours: 2,

    dueDate: "11/11/2026",

    epic: "Code Sandbox",

    epicColor: "bg-amber-50 text-amber-700 border-amber-200",

    dependsOn: "task-1",

    submissionRequirement: "Link hoặc file",

    isBonus: true,

    userStory: {

      role: "Sinh viên lập trình",

      want: "thực thi code C++ và Python trong môi trường container cô lập",

      benefit: "đánh giá kết quả chính xác trong < 2.0s mà không gây rủi ro cho server",

    },

    acceptanceCriteria: "Given mã nguồn nộp lên từ trình duyệt\nWhen đưa vào Docker Sandbox\nThen container thực thi an toàn với RAM <= 128MB và trả về kết quả đúng",

    definitionOfDone: defaultDoD(false),

    checklist: [

      { id: "c1", text: "Thiết lập môi trường isolated sandbox", done: true },

      { id: "c2", text: "Cấu hình --read-only rootfs và tmpfs 16MB", done: true },

      { id: "c3", text: "Bắt timeout 2000ms TLE", done: false },

    ],

    commentsCount: 3,

    attachmentsCount: 1,

  },

  {

    id: "task-5",

    code: "TE41E89",

    title: "Socratic AI Tutor Hint Ladder (Thang gợi ý 3 nấc)",

    description: "Tuyệt đối không đưa đáp án; hướng dẫn mở dần Hint 1 -> Hint 2 -> Hint 3 và ký số băm SHA-256 khi tự sửa lỗi thành công.",

    column: "ready",

    priority: "high",

    moscow: "must",

    points: 5,

    assignee: { name: "Võ Nhật Huy", avatar: "H", role: "Frontend & AI Dev" },

    estimateHours: 4.5,

    dueDate: "09/11/2026",

    epic: "AI Socratic",

    epicColor: "bg-rose-50 text-rose-700 border-rose-200",

    dependsOn: "task-4",

    submissionRequirement: "Link",

    userStory: {

      role: "Sinh viên gặp lỗi thuật toán",

      want: "nhận gợi ý Socratic theo thang 3 nấc sư phạm",

      benefit: "tự hiểu nguyên lý để sửa code thay vì bị AI mớm đáp án hoàn chỉnh",

    },

    acceptanceCriteria: "Given sinh viên chưa vượt qua test case\nWhen yêu cầu trợ giúp từ AI Tutor\nThen hệ thống mở khóa tuần tự Hint 1 -> Hint 2 -> Hint 3 và khóa không lộ giải",

    definitionOfDone: defaultDoD(false),

    checklist: [

      { id: "c1", text: "Cấu hình System Prompt Người Thầy Khắc Kỷ", done: true },

      { id: "c2", text: "Ràng buộc mở khóa tuần tự (Sequence lock)", done: true },

      { id: "c3", text: "Tạo SHA-256 evidence bằng chứng tự sửa", done: true },

    ],

    deliverable: { type: "test", label: "Smoke test: 14/14 Passed" },

    commentsCount: 5,

    attachmentsCount: 2,

  },

  {

    id: "task-6",

    code: "TE49A12",

    title: "Mô hình Giả lập Hội đồng Phản biện AI (AI Defense Room)",

    description: "Mô phỏng phòng bảo vệ tốt nghiệp thời gian thực với 3 Persona Giảng viên AI: Thầy Kiến trúc, Cô Giải thuật, Thư ký chấm điểm.",

    column: "backlog",

    priority: "medium",

    moscow: "should",

    points: 8,

    assignee: { name: "Phan Đình Nghị", avatar: "N", role: "Backend & Database" },

    estimateHours: 6,

    dueDate: "10/11/2026",

    epic: "Defense Room",

    epicColor: "bg-teal-50 text-teal-700 border-teal-200",

    dependsOn: "task-5",

    submissionRequirement: "Link hoặc file",

    isBonus: true,

    userStory: {

      role: "Sinh viên bảo vệ đồ án",

      want: "luyện tập chất vấn với Hội đồng phản biện AI",

      benefit: "rèn luyện phản xạ kỹ thuật và phát hiện trước lỗ hổng bảo mật/kiến trúc",

    },

    acceptanceCriteria: "Given đồ án đã hoàn thành các module cốt lõi\nWhen sinh viên bắt đầu phiên bảo vệ\nThen AI chất vấn xoay quanh Docker sandbox, 3NF và thuật toán Anti-Freerider",

    definitionOfDone: defaultDoD(false),

    checklist: [

      { id: "c1", text: "Thu thập danh mục 20 câu hỏi Hội đồng Phản biện hay hỏi", done: false },

      { id: "c2", text: "Tích hợp prompt Socratic phản biện", done: false },

    ],

    commentsCount: 1,

    attachmentsCount: 0,

  },

  {

    id: "task-7",

    code: "TE54B33",

    title: "Thuật toán Đo lường Đóng góp Thực tế Anti-Freerider",

    description: "Công thức minh bạch: Tỷ trọng Story Points hoàn thành (50%) + Tỷ trọng Commit/PR hợp lệ (30%) + Tiêu chuẩn DoD (20%).",

    column: "backlog",

    priority: "medium",

    moscow: "should",

    points: 5,

    assignee: { name: "Phan Đình Nghị", avatar: "N", role: "Backend & Database" },

    estimateHours: 4,

    dueDate: "10/11/2026",

    epic: "Team Analytics",

    epicColor: "bg-cyan-50 text-cyan-700 border-cyan-200",

    dependsOn: "task-3",

    submissionRequirement: "File",

    userStory: {

      role: "Giảng viên chấm điểm đồ án",

      want: "thuật toán tự động phân tích tỷ lệ đóng góp thực tế của từng thành viên",

      benefit: "chấm điểm công bằng, phát hiện hiện tượng ỷ lại hoặc gánh team",

    },

    acceptanceCriteria: "Given nhóm sinh viên thực hiện đồ án\nWhen đến kỳ đánh giá tiến độ\nThen hệ thống tính toán % dựa trên Story points Done và xếp loại A/B/C tự động",

    definitionOfDone: defaultDoD(false),

    checklist: [

      { id: "c1", text: "Thu thập lịch sử commit từ GitHub API", done: false },

      { id: "c2", text: "Tính chỉ số cày cuốc (Effort score)", done: false },

    ],

    commentsCount: 0,

    attachmentsCount: 0,

  },

  {

    id: "task-8",

    code: "TE61C04",

    title: "Tích hợp CodeMind AI Senior Reviewer & AST Security Scanner",

    description: "Xây dựng hệ thống Code Review tự động: Soi lỗi logic, bảo mật AST và Bộ câu hỏi Hội đồng Phản biện Q&A.",

    column: "in-progress",

    priority: "high",

    moscow: "must",

    points: 5,

    assignee: { name: "Võ Nhật Huy", avatar: "H", role: "Frontend & AI Dev" },

    estimateHours: 4,

    dueDate: "11/11/2026",

    epic: "Git Hub",

    epicColor: "bg-emerald-50 text-emerald-700 border-emerald-200",

    submissionRequirement: "Link",

    isBonus: true,

    userStory: {

      role: "Sinh viên & Reviewer",

      want: "bot AI tự động soi lỗi logic, bảo mật và gợi ý code chuẩn trước khi merge",

      benefit: "giảm tải công sức code review thủ công và chuẩn bị tốt cho buổi vấn đáp",

    },

    acceptanceCriteria: "Given PR được mở trên GitHub\nWhen CodeMind AI quét qua AST\nThen hiển thị gợi ý 1-Click Fix và câu hỏi phản biện của Giảng viên",

    definitionOfDone: defaultDoD(true),

    checklist: [

      { id: "c1", text: "Giao diện Master-Detail 2 cột PR list và Review detail", done: true },

      { id: "c2", text: "Diff viewer hiển thị context/addition/deletion", done: true },

      { id: "c3", text: "Nút Áp dụng bản vá 1-Click Fix", done: true },

    ],

    commentsCount: 2,

    attachmentsCount: 1,

  },

  {

    id: "task-9",

    code: "TE62D15",

    title: "Cây Phân Nhánh GitKraken với Chuyển động Động (Nhánh 2.2)",

    description: "Mô phỏng đồ thị phân nhánh SVG: Hiệu ứng vẽ nét mượt mà khi đổi tab, commit pop-in nảy mầm, các hạt xung ánh sáng dữ liệu.",

    column: "ready",

    priority: "medium",

    moscow: "should",

    points: 5,

    assignee: { name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect" },

    estimateHours: 2,

    dueDate: "12/11/2026",

    epic: "Git Hub",

    epicColor: "bg-blue-50 text-blue-700 border-blue-200",

    submissionRequirement: "Link",

    isBonus: true,

    userStory: {

      role: "Sinh viên & Giảng viên",

      want: "xem cây phân nhánh Git trực quan với animation chuyển động sống động",

      benefit: "hiểu rõ quy trình rẽ nhánh Git Flow và giám sát commit minh bạch",

    },

    acceptanceCriteria: "Given người dùng chuyển sang tab Cây Phân Nhánh\nWhen tab được chọn\nThen các đường nhánh tự vẽ, commit pop-in và có nút Phát lại chuyển động",

    definitionOfDone: defaultDoD(true),

    checklist: [

      { id: "c1", text: "Vẽ đường cong Bézier SVG các nhánh main, develop, feature", done: true },

      { id: "c2", text: "Hiệu ứng stroke-dashoffset và animateMotion", done: true },

      { id: "c3", text: "Popover tooltip hiển thị tác giả, SHA và số dòng code", done: true },

    ],

    commentsCount: 3,

    attachmentsCount: 0,

  },

  {

    id: "task-10",

    code: "TE63E20",

    title: "Bản đồ Kiến trúc GitDiagram tương tác (Nhánh 2.3)",

    description: "Sơ đồ ReactFlow 5 phân tầng hệ thống và modal liên kết trực tiếp với GitHub Repository của nhóm.",

    column: "done",

    priority: "high",

    moscow: "must",

    points: 5,

    assignee: { name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect" },

    estimateHours: 6,

    dueDate: "06/11/2026",

    epic: "Architecture",

    epicColor: "bg-emerald-50 text-emerald-700 border-emerald-200",

    submissionRequirement: "Link",

    isBonus: true,

    userStory: {

      role: "Kiến trúc sư hệ thống",

      want: "bản đồ kiến trúc 5 phân tầng có thể zoom, pan và kết nối repo GitHub",

      benefit: "giúp Hội đồng Phản biện thẩm định kiến trúc tổng thể của CodeMind Campus",

    },

    acceptanceCriteria: "Given người xem mở phân hệ Kiến trúc\nWhen tương tác trên canvas\nThen các node sáng lên và mở được link GitHub repo của nhóm",

    definitionOfDone: defaultDoD(true),

    checklist: [

      { id: "c1", text: "Cấu hình ReactFlow 22 nodes và 5 container subsystems", done: true },

      { id: "c2", text: "Modal liên kết repo GitHub nhóm 4", done: true },

    ],

    commentsCount: 1,

    attachmentsCount: 1,

  },

  {

    id: "task-11",

    code: "TE71B88",

    title: "Đặc tả giao thức WebSocket Realtime Code Lab & Huddle",

    description: "Xây dựng kết nối hai chiều kênh WebSocket phân phối sự kiện con trỏ, terminal output và code sync.",

    column: "ready",

    priority: "high",

    moscow: "must",

    points: 3,

    assignee: { name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect" },

    estimateHours: 2,

    dueDate: "13/11/2026",

    epic: "Realtime Lab",

    epicColor: "bg-amber-50 text-amber-700 border-amber-200",

    checklist: [],

    commentsCount: 0,

    attachmentsCount: 0,

  },

  {

    id: "task-12",

    code: "TE89C04",

    title: "Tích hợp SSO & Giám sát chi phí Quota AI Gateway",

    description: "Đấu nối xác thực OAuth2 / SSO và bộ đếm Token streaming với fallback thông minh.",

    column: "backlog",

    priority: "medium",

    moscow: "could",

    points: 5,

    assignee: { name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect" },

    estimateHours: 4,

    dueDate: "28/11/2026",

    epic: "AI Gateway",

    epicColor: "bg-indigo-50 text-indigo-700 border-indigo-200",

    checklist: [],

    commentsCount: 0,

    attachmentsCount: 0,

  },

  {

    id: "task-13",

    code: "TE93A12",

    title: "Thiết lập môi trường CI/CD GitHub Actions & Lint Checker",

    description: "Pipeline tự động chạy clang-format, cppcheck và build test cases khi có pull request mới.",

    column: "done",

    priority: "high",

    moscow: "must",

    points: 5,

    assignee: { name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect" },

    estimateHours: 12,

    dueDate: "04/11/2026",

    epic: "DevOps & CI",

    epicColor: "bg-emerald-50 text-emerald-700 border-emerald-200",

    checklist: [],

    commentsCount: 0,

    attachmentsCount: 0,

  },

  {

    id: "task-14",

    code: "TE98D55",

    title: "Kiểm thử tải đồng thời 500 sinh viên phòng thi AI Defense Room",

    description: "Benchmark k6 kịch bản nộp bài cùng lúc, độ trễ p95 < 400ms và không rò rỉ bộ nhớ.",

    column: "done",

    priority: "medium",

    moscow: "should",

    points: 4,

    assignee: { name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect" },

    estimateHours: 3,

    dueDate: "03/11/2026",

    epic: "Load Testing",

    epicColor: "bg-slate-50 text-slate-700 border-slate-200",

    checklist: [],

    commentsCount: 0,

    attachmentsCount: 0,

  },

];





export interface CustomSelectOption {

  value: string | number;

  label: string;

  icon?: React.ReactNode;

  sublabel?: string;

}



export interface CustomSelectProps {

  value: string | number;

  onChange: (val: any) => void;

  options: CustomSelectOption[];

  placeholder?: string;

  className?: string;

  menuClassName?: string;

  buttonClassName?: string;

}



export function CustomSelect({

  value,

  onChange,

  options,

  placeholder = "Chọn...",

  className = "",

  menuClassName = "w-60",

  buttonClassName = "",

}: CustomSelectProps) {

  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);



  useEffect(() => {

    const handleOutside = (e: MouseEvent) => {

      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {

        setOpen(false);

      }

    };

    if (open) {

      document.addEventListener("mousedown", handleOutside);

    }

    return () => document.removeEventListener("mousedown", handleOutside);

  }, [open]);



  const selectedOption = options.find((o) => o.value === value);



  return (

    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>

      <button

        type="button"

        onClick={() => setOpen((prev) => !prev)}

        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs transition hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 focus:outline-hidden ${buttonClassName}`}

      >

        <div className="flex items-center gap-2 truncate">

          {selectedOption?.icon}

          <span className="truncate">{selectedOption?.label || placeholder}</span>

        </div>

        <ChevronDown

          size={14}

          className={`shrink-0 text-slate-400 transition-transform duration-200 ${

            open ? "rotate-180 text-blue-600 dark:text-blue-400" : ""

          }`}

        />

      </button>



      {open && (

        <div

          className={`absolute left-0 z-50 mt-1.5 ${menuClassName} origin-top-left rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-1.5 shadow-xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95`}

        >

          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">

            {options.map((opt) => {

              const isSelected = opt.value === value;

              return (

                <button

                  key={String(opt.value)}

                  type="button"

                  onClick={() => {

                    onChange(opt.value);

                    setOpen(false);

                  }}

                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs transition text-left cursor-pointer ${

                    isSelected

                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-2xs border border-slate-200 dark:border-slate-700"

                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium"

                  }`}

                >

                  <div className="flex items-center gap-2 truncate">

                    {opt.icon}

                    <div className="truncate">

                      <p className="truncate leading-tight">{opt.label}</p>

                      {opt.sublabel && (

                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{opt.sublabel}</p>

                      )}

                    </div>

                  </div>

                  {isSelected && <Check size={14} className="text-slate-900 dark:text-white shrink-0" />}

                </button>

              );

            })}

          </div>

        </div>

      )}

    </div>

  );

}



const columnsConfig: Array<{

  id: ColumnId;

  title: string;

  dotColor: string;

  dotStyle?: React.CSSProperties;

  badgeBg: string;

  badgeText: string;

  borderTop: string;

  cardBorderLeft: string;

  accentBar: string;

  accentStyle?: React.CSSProperties;

  maxWip?: number;

}> = [

  { id: "backlog", title: "Backlog", dotColor: "bg-slate-400 dark:bg-slate-500", badgeBg: "bg-slate-200/80 dark:bg-slate-800", badgeText: "text-slate-600 dark:text-slate-400", borderTop: "", cardBorderLeft: "border-l-slate-400 dark:border-l-slate-600", accentBar: "bg-slate-400 dark:bg-slate-600", accentStyle: { background: "#94a3b8" } },

  { id: "ready", title: "Cần làm", dotColor: "bg-amber-400 dark:bg-amber-500", dotStyle: { backgroundColor: "#fbbf24" }, badgeBg: "bg-amber-100/70 dark:bg-amber-950/50", badgeText: "text-amber-800 dark:text-amber-300 font-bold", borderTop: "", cardBorderLeft: "border-l-amber-400 dark:border-l-amber-500", accentBar: "bg-[#fbbf24]", accentStyle: { background: "#fbbf24" } },

  { id: "in-progress", title: "Đang làm", dotColor: "bg-amber-500", dotStyle: { backgroundColor: "#f59e0b" }, badgeBg: "bg-amber-100 dark:bg-amber-950/60", badgeText: "text-amber-800 dark:text-amber-300 font-bold", borderTop: "", cardBorderLeft: "border-l-amber-500", accentBar: "bg-[#f59e0b]", accentStyle: { background: "linear-gradient(to right, #f59e0b, #fbbf24)" }, maxWip: 4 },

  { id: "done", title: "Hoàn thành", dotColor: "bg-slate-900 dark:bg-slate-200", dotStyle: { backgroundColor: "#14161a" }, badgeBg: "bg-slate-200/80 dark:bg-slate-800", badgeText: "text-slate-800 dark:text-slate-200 font-bold", borderTop: "", cardBorderLeft: "border-l-slate-900 dark:border-l-slate-300", accentBar: "bg-[#14161a] dark:bg-slate-200", accentStyle: { background: "#14161a" } },

  { id: "verified", title: "Đã nghiệm thu", dotColor: "bg-slate-900 dark:bg-slate-200", dotStyle: { backgroundColor: "#14161a" }, badgeBg: "bg-slate-200/80 dark:bg-slate-800", badgeText: "text-slate-800 dark:text-slate-200 font-bold", borderTop: "", cardBorderLeft: "border-l-slate-900 dark:border-l-slate-300", accentBar: "bg-[#14161a] dark:bg-slate-200", accentStyle: { background: "#14161a" } },

  { id: "fail", title: "Cần sửa lại", dotColor: "bg-amber-600", dotStyle: { backgroundColor: "#ea580c" }, badgeBg: "bg-amber-100 dark:bg-amber-950/60", badgeText: "text-amber-800 dark:text-amber-300 font-bold", borderTop: "", cardBorderLeft: "border-l-amber-600", accentBar: "bg-amber-600", accentStyle: { background: "linear-gradient(to right, #ea580c, #f59e0b)" } },

];



const techStackOptions = [

  { value: "ai", label: "Trí tuệ nhân tạo (AI/ML & Socratic Prompting)", defaultDesc: "Tích hợp LLM, xây dựng guardrails sư phạm, kịch bản hội đồng phản biện." },

  { value: "backend", label: "Backend Core (FastAPI + Layered Architecture)", defaultDesc: "Xây dựng service, router v1, schema Pydantic và ràng buộc nghiệp vụ H2/H3." },

  { value: "database", label: "Cơ sở dữ liệu (ERD, Migrations SQLite/Postgres)", defaultDesc: "Thiết kế quan hệ thực thể, migration tự động và quy chuẩn ISO-8601 UTC (H4)." },

  { value: "sandbox", label: "Sandbox & Security (Docker Isolated Runner)", defaultDesc: "Môi trường thực thi isolated, timeout 2000ms, sandbox chống memory leak." },

  { value: "devops", label: "DevOps & CI/CD (GitHub Actions, Vercel, Docker Compose)", defaultDesc: "Quy trình CI tự động chạy smoke test, build container và deploy production." },

  { value: "frontend", label: "Giao diện Frontend (React 19 + Tailwind CSS)", defaultDesc: "Thiết kế component, bảng kéo thả Kanban, hook API client trong src/api.ts." },

  { value: "fullstack", label: "Toàn trình End-to-End (Fullstack Monorepo)", defaultDesc: "Tích hợp liền mạch từ UI React, RESTful API đến database SQLite và test suite." },

  { value: "custom", label: "Tự nhập công nghệ khác (Custom Tech Stack)...", defaultDesc: "" },

];



const granularityOptions = [

  { value: 2, label: "2 Thẻ (Việc nhỏ nhanh gọn: Code ➔ Test, ~4-6h)" },

  { value: 3, label: "3 Thẻ (Chuẩn nguyên tử: Kiến trúc ➔ Backend Core ➔ Test QA, ~10-12h)" },

  { value: 4, label: "4 Thẻ (Kèm giao diện: Kiến trúc ➔ Backend ➔ Test ➔ UI React, ~14-16h)" },

  { value: 5, label: "5 Thẻ (Toàn diện Sprint: DB ➔ API ➔ Sandbox ➔ Test ➔ Docs & Slide, ~18-22h)" },

  { value: 6, label: "6 Thẻ (Module lớn: Phân rã sâu từng component, ~24-30h)" },

];



// ── Animated Number Counter Component ───────────────────────────────────────

function AnimatedNumber({

  value,

  duration = 1800,

  trigger = true,

  decimals = 0,

  suffix = "",

}: {

  value: number;

  duration?: number;

  trigger?: boolean;

  decimals?: number;

  suffix?: string;

}) {

  const [displayValue, setDisplayValue] = useState(0);



  useEffect(() => {

    if (!trigger) {

      setDisplayValue(0);

      return;

    }

    let startTime: number | null = null;

    let animId: number;



    const step = (time: number) => {

      if (!startTime) startTime = time;

      const progress = Math.min((time - startTime) / duration, 1);

      // easeOutCubic

      const ease = 1 - Math.pow(1 - progress, 4);

      const current = ease * value;

      setDisplayValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));

      if (progress < 1) {

        animId = requestAnimationFrame(step);

      }

    };



    setDisplayValue(0);

    animId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animId);

  }, [value, duration, trigger, decimals]);



  return <>{decimals > 0 ? displayValue.toFixed(decimals) : displayValue}{suffix}</>;

}



// ── Member Contribution Donut Chart Component (Anti-Freerider) ─────────────

function ContributionDonutChart({

  teamMembers,

  contribution,

  totalDonePoints,

  trigger = true,

}: {

  teamMembers: TeamMember[];

  contribution: Record<string, { member: TeamMember; donePts: number; totalPts: number; tasksDone: number; percent: number }>;

  totalDonePoints: number;

  trigger?: boolean;

}) {

  const r = 44;

  const circumference = 2 * Math.PI * r; // ~276.46



  const memberColors: Record<string, string> = {

    "Nguyễn Bá Hòa": "#14161a",   // Black / Slate

    "Võ Nhật Huy": "#f59e0b",    // Amber

    "Phan Đình Nghị": "#64748b", // Slate

  };



  let cumulativePercent = 0;



  return (

    <div className="flex flex-col sm:flex-row items-center gap-5">

      {/* SVG Donut */}

      <div className="relative shrink-0 flex items-center justify-center">

        <svg width="124" height="124" viewBox="0 0 124 124" className="rotate-[-90deg]">

          {/* Background Track */}

          <circle

            cx="62"

            cy="62"

            r={r}

            fill="none"

            stroke="#f1f5f9"

            strokeWidth="12"

          />



          {/* Slices */}

          {teamMembers.map((member) => {

            const stat = contribution[member.name];

            const pct = stat ? stat.percent : 0;

            if (pct <= 0) return null;



            const strokeDash = (pct / 100) * circumference;

            const strokeOffset = -(cumulativePercent / 100) * circumference;

            cumulativePercent += pct;



            const color = memberColors[member.name] || "#6366f1";



            return (

              <circle

                key={member.id}

                cx="62"

                cy="62"

                r={r}

                fill="none"

                stroke={color}

                strokeWidth="12"

                strokeDasharray={`${trigger ? strokeDash : 0} ${circumference}`}

                strokeDashoffset={strokeOffset}

                strokeLinecap="round"

                style={{

                  transition: "stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)",

                }}

              />

            );

          })}

        </svg>



        {/* Center Text inside Donut */}

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">

          <span className="text-sm font-black text-slate-900 leading-tight">

            <AnimatedNumber value={totalDonePoints} trigger={trigger} suffix=" pts" />

          </span>

          <span className="text-[10px] text-slate-400 font-medium">Hoàn thành</span>

        </div>

      </div>



      {/* Legend & Breakdown */}

      <div className="flex-1 w-full space-y-2">

        {teamMembers.map((member) => {

          const stat = contribution[member.name];

          const color = memberColors[member.name] || "#f59e0b";

          const pct = stat ? stat.percent : 0;

          const done = stat ? stat.donePts : 0;

          const tasks = stat ? stat.tasksDone : 0;



          return (

            <div key={member.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-xs">

              <div className="flex items-center justify-between mb-1">

                <div className="flex items-center gap-1.5 min-w-0">

                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />

                  <span className="font-bold text-slate-800 truncate">{member.name}</span>

                  <span className="text-[10px] text-slate-400 truncate">({member.role})</span>

                </div>

                <span className="font-mono font-bold text-slate-700 text-[11px] shrink-0">

                  <AnimatedNumber value={done} trigger={trigger} suffix=" pts" /> (

                  <AnimatedNumber value={pct} trigger={trigger} suffix="%" />)

                </span>

              </div>



              {/* Mini progress bar */}

              <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">

                <div

                  className="h-full rounded-full transition-all duration-1000 ease-out"

                  style={{

                    backgroundColor: color,

                    width: trigger ? `${pct}%` : "0%",

                  }}

                />

              </div>



              <div className="flex items-center justify-between mt-1 text-[10px]">

                <span className="text-slate-400">{tasks} tasks đã Done</span>

                <span className={pct >= 50 ? "text-slate-900 dark:text-white font-bold" : "text-amber-600 font-medium"}>

                  {pct >= 50 ? "Lead đóng góp (A+)" : pct > 0 ? "Đang tiến độ" : "Cần phân bổ task"}

                </span>

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

}



export interface KanbanBoardProps {

  initialProjectId?: string;

  role?: Role;

}



export default function KanbanBoard({

  initialProjectId,

  role = "student",

}: KanbanBoardProps = {}) {

  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);



  const handleInstructorReview = async (taskId: string, decision: "approve" | "request_revision", feedback: string = "") => {

    const res = await reviewWorkspaceTaskApi(taskId, decision, feedback);

    if (!res.error && res.task) {

      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, column: res.task.column_id } : t)));

      void reloadWorkspace();

    } else {

      alert(res.error || "Lỗi thẩm định task");

    }

  };

  const [projects, setProjects] = useState<Project[]>(() => {

    return initialProjectsData.map((proj) => {

      if (proj.id === "prj-codemind") {

        return {

          ...proj,

          tasks: initialTasks,

          team: initialMembers,

        };

      }

      return {

        ...proj,

        tasks: Array.isArray(proj.tasks) ? proj.tasks : [],

        team: Array.isArray(proj.team) ? proj.team : [],

      };

    });

  });

  const [currentProjectId, setCurrentProjectId] = useState<string>(() => initialProjectId || "prj-codemind");



  const normalizeWorkspaceProject = (p: any): Project => ({

    id: p.id,

    code: p.code,

    name: p.name,

    course: p.course,

    sprint: p.sprint,

    kind: p.kind,

    status: p.kanbanStatus || (p.status === "active" ? "in-progress" : p.status),

    fav: p.fav,

    dueDate: p.dueDate,

    tasks: Array.isArray(p.tasks) ? p.tasks : [],

    team: Array.isArray(p.team) ? p.team : [],

  });



  const reloadWorkspace = async () => {

    const ws = await fetchKanbanWorkspace();

    if (ws?.projects?.length) {

      setProjects(ws.projects.map(normalizeWorkspaceProject));

    }

  };



  useEffect(() => {

    let active = true;

    fetchKanbanWorkspace().then((ws) => {

      if (!active || !ws?.projects?.length) return;

      setProjects(ws.projects.map(normalizeWorkspaceProject));

    });

    return () => {

      active = false;

    };

  }, []);



  useEffect(() => {

    if (initialProjectId) {

      setCurrentProjectId(initialProjectId);

    }

  }, [initialProjectId]);



  const [isProjectSlateOpen, setIsProjectSlateOpen] = useState(false);

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const projectDropdownRef = useRef<HTMLDivElement>(null);



  const currentProject = useMemo(() => {

    return (

      projects.find((p) => p.id === currentProjectId) ||

      projects[0] ||

      initialProjectsData[0]

    );

  }, [projects, currentProjectId]);



  const tasks = Array.isArray(currentProject?.tasks) ? currentProject.tasks : [];

  const teamMembers = Array.isArray(currentProject?.team) ? currentProject.team : [];



  const setTasks = (updater: KanbanTask[] | ((prev: KanbanTask[]) => KanbanTask[])) => {

    setProjects((prevProjects) => {

      return prevProjects.map((proj) => {

        if (proj.id === currentProjectId) {

          const prevTasks = Array.isArray(proj.tasks) ? proj.tasks : [];

          const nextTasks = typeof updater === "function" ? updater(prevTasks) : updater;

          return { ...proj, tasks: nextTasks };

        }

        return proj;

      });

    });

  };



  const setTeamMembers = (updater: TeamMember[] | ((prev: TeamMember[]) => TeamMember[])) => {

    setProjects((prevProjects) => {

      return prevProjects.map((proj) => {

        if (proj.id === currentProjectId) {

          const prevTeam = Array.isArray(proj.team) ? proj.team : [];

          const nextTeam = typeof updater === "function" ? updater(prevTeam) : updater;

          return { ...proj, team: nextTeam };

        }

        return proj;

      });

    });

  };



  const handleCreateProject = async (newProjData: any) => {

    const saved = await createWorkspaceProjectApi({

      name: newProjData.name,

      client: newProjData.client || "CodeMind Campus",

      course: newProjData.course || newProjData.client || "CNTT-2026 · Đồ án Chuyên ngành",

      sprint: newProjData.sprint || "Sprint 1 (Tuần 1 - 4)",

      kind: (newProjData.kind || "AI / FULLSTACK").toUpperCase(),

      status: "planning",

      fav: true,

      due_date: newProjData.dueDate || "15/12/2026",

      story_points: newProjData.storyPoints || 600,

      team_members: Array.isArray(newProjData.teamMembers) ? newProjData.teamMembers : [],

    });



    const newProj: Project = saved

      ? normalizeWorkspaceProject(saved)

      : {

          id: newProjData.id || `prj-${Date.now()}`,

          code: newProjData.code || "PRJ-NEW",

          name: newProjData.name,

          course: newProjData.course || "CNTT-2026 · Đồ án Chuyên ngành",

          sprint: newProjData.sprint || "Sprint 1",

          kind: newProjData.kind || "AI / FULLSTACK",

          status: "planning",

          fav: true,

          dueDate: newProjData.dueDate || "15/12/2026",

          team: [

            { id: "m1", name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect", color: "bg-[#14161a] dark:bg-slate-700" },

            { id: "m2", name: "Võ Nhật Huy", avatar: "H", role: "Developer", color: "bg-amber-500" },

          ],

          tasks: [

            {

              id: `task-${Date.now()}-1`,

              code: `${newProjData.code || "PRJ"}-01`,

              title: "Khởi tạo kiến trúc dự án & Thiết lập Repo",

              description: `Thiết lập cấu trúc thư mục, CI/CD pipeline và tài liệu SRS ban đầu cho ${newProjData.name}.`,

              column: "ready",

              priority: "high",

              moscow: "must",

              points: 5,

              assignee: { name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect" },

              estimateHours: 4,

              dueDate: newProjData.dueDate || "15/12/2026",

              epic: "Khởi tạo",

              epicColor: "bg-blue-50 text-blue-700 border-blue-200",

              checklist: [],

              commentsCount: 0,

              attachmentsCount: 0,

            },

          ],

        };

    setProjects((prev) => [newProj, ...prev]);

    setCurrentProjectId(newProj.id);

  };



  const handleTogglePinProject = (projId: string) => {

    const target = projects.find((p) => p.id === projId);

    const nextFav = target ? !target.fav : true;

    setProjects((prev) =>

      prev.map((p) => (p.id === projId ? { ...p, fav: nextFav } : p))

    );

    void updateWorkspaceProjectApi(projId, { fav: nextFav });

  };



  useEffect(() => {

    const handleOutside = (e: MouseEvent) => {

      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {

        setIsProjectDropdownOpen(false);

      }

    };

    if (isProjectDropdownOpen) {

      document.addEventListener("mousedown", handleOutside);

    }

    return () => document.removeEventListener("mousedown", handleOutside);

  }, [isProjectDropdownOpen]);



  const kanbanRef = useRef<HTMLDivElement>(null);

  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);

  const [activeTab, setActiveTab] = useState<TabView>("board");

  const [kanbanAnimKey, setKanbanAnimKey] = useState<number>(0);

  const [analyticsAnimTrigger, setAnalyticsAnimTrigger] = useState(false);

  const [justDroppedTaskId, setJustDroppedTaskId] = useState<string | null>(null);

  const justDroppedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [hasEnteredInitial, setHasEnteredInitial] = useState(false);



  useEffect(() => {

    const timer = setTimeout(() => {

      setHasEnteredInitial(true);

    }, 800);

    return () => clearTimeout(timer);

  }, []);



  

  // Floating Toast Notification with Undo Pill (solvik.mp4 t=10s, gustra.mp4 t=12s)

  const [undoToast, setUndoToast] = useState<{

    taskId: string;

    taskCode: string;

    taskTitle: string;

    action?: "move" | "delete";

    fromColTitle?: string;

    toColTitle?: string;

    fromCol?: ColumnId;

    toCol?: ColumnId;

    deletedTask?: KanbanTask;

    deletedIndex?: number;

    customMessage?: string;

    undone?: boolean;

  } | null>(null);



  const handleDeleteTask = (taskToDelete: KanbanTask) => {

    const taskIndex = tasks.findIndex((t) => t.id === taskToDelete.id);

    setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));



    if (selectedTask?.id === taskToDelete.id) {

      setSelectedTask(null);

    }



    void deleteWorkspaceTaskApi(taskToDelete.id);



    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    setUndoToast({

      taskId: taskToDelete.id,

      taskCode: taskToDelete.code,

      taskTitle: taskToDelete.title,

      action: "delete",

      deletedTask: taskToDelete,

      deletedIndex: taskIndex >= 0 ? taskIndex : 0,

      undone: false,

    });



    undoTimerRef.current = setTimeout(() => {

      setUndoToast(null);

    }, 6000);

  };

  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);



  // ── True Trello Drag & Drop Engine (High Performance Ref-Based + Continuous Auto-Scroll) ──

  const [pointerDrag, setPointerDrag] = useState<{

    task: KanbanTask;

    width: number;

    isDragging: boolean;

    currentX: number;

    currentY: number;

    offsetX: number;

    offsetY: number;

    hoverColId: ColumnId | null;

    hoverIndex: number;

  } | null>(null);



  const dragTrackerRef = useRef<{

    isDragging: boolean;

    task: KanbanTask | null;

    startX: number;

    startY: number;

    currentX: number;

    currentY: number;

    offsetX: number;

    offsetY: number;

    width: number;

    hoverColId: ColumnId | null;

    hoverIndex: number;

  }>({

    isDragging: false,

    task: null,

    startX: 0,

    startY: 0,

    currentX: 0,

    currentY: 0,

    offsetX: 0,

    offsetY: 0,

    width: 0,

    hoverColId: null,

    hoverIndex: 0,

  });



  const floatingCardRef = useRef<HTMLDivElement>(null);



  const detectHoverColumn = (clientX: number): ColumnId | null => {

    for (const col of columnsConfig) {

      const el = document.querySelector(`[data-column-id="${col.id}"]`) as HTMLElement | null;

      if (el) {

        const rect = el.getBoundingClientRect();

        if (clientX >= rect.left && clientX <= rect.right) {

          return col.id;

        }

      }

    }

    return null;

  };



  const detectHoverIndex = (colId: ColumnId, clientY: number): number => {

    const colScroll = document.querySelector(`[data-column-scroll="${colId}"]`) as HTMLElement | null;

    if (!colScroll) return 0;

    const cardEls = Array.from(colScroll.querySelectorAll("[data-task-card-id]")) as HTMLElement[];

    if (cardEls.length === 0) return 0;



    const sRect = colScroll.getBoundingClientRect();

    const lastCard = cardEls[cardEls.length - 1];

    const lastRect = lastCard.getBoundingClientRect();



    // If dragged at or past bottom card, or near/past bottom edge of scroll container

    if (clientY >= lastRect.bottom || clientY >= sRect.bottom - 30) {

      return cardEls.length;

    }



    const firstCard = cardEls[0];

    const firstRect = firstCard.getBoundingClientRect();

    // If dragged at or above first card, or near/above top edge of scroll container

    if (clientY <= firstRect.top || clientY <= sRect.top + 30) {

      return 0;

    }



    for (let i = 0; i < cardEls.length; i++) {

      const r = cardEls[i].getBoundingClientRect();

      const midY = r.top + r.height / 2;

      if (clientY < midY) {

        return i;

      }

    }

    return cardEls.length;

  };



  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>, task: KanbanTask) => {

    if (e.button !== 0) return;

    const target = e.target as HTMLElement;

    if (target.closest("button") || target.closest("a") || target.closest("input") || target.closest("textarea")) return;



    const card = e.currentTarget;

    const rect = card.getBoundingClientRect();



    dragTrackerRef.current = {

      isDragging: false,

      task,

      startX: e.clientX,

      startY: e.clientY,

      currentX: e.clientX,

      currentY: e.clientY,

      offsetX: e.clientX - rect.left,

      offsetY: e.clientY - rect.top,

      width: rect.width,

      hoverColId: task.column,

      hoverIndex: 0,

    };



    setPointerDrag({

      task,

      width: rect.width,

      isDragging: false,

      currentX: e.clientX,

      currentY: e.clientY,

      offsetX: e.clientX - rect.left,

      offsetY: e.clientY - rect.top,

      hoverColId: task.column,

      hoverIndex: 0,

    });

  };



  const isDragActive = pointerDrag !== null;



  useEffect(() => {

    if (!isDragActive) return;



    let movePending = false;

    let animFrameId: number;



    const processPointerMove = () => {

      movePending = false;

      const d = dragTrackerRef.current;

      if (!d.task || !d.isDragging) return;



      const hoverCol = detectHoverColumn(d.currentX) || d.hoverColId;

      const hoverIdx = hoverCol ? detectHoverIndex(hoverCol, d.currentY) : 0;



      // Only re-render React when hover column or hover index changes (prevents 99% of lag!)

      if (hoverCol !== d.hoverColId || hoverIdx !== d.hoverIndex) {

        d.hoverColId = hoverCol;

        d.hoverIndex = hoverIdx;

        setPointerDrag((prev) => prev ? {

          ...prev,

          hoverColId: hoverCol,

          hoverIndex: hoverIdx,

        } : null);

      }

    };



    const handlePointerMove = (e: PointerEvent) => {

      const d = dragTrackerRef.current;

      if (!d.task) return;



      d.currentX = e.clientX;

      d.currentY = e.clientY;



      const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);

      if (!d.isDragging && dist > 4) {

        d.isDragging = true;

        setPointerDrag((prev) => prev ? { ...prev, isDragging: true } : null);

      }



      // 🚀 ZERO LATENCY DIRECT GPU TRANSFORM: Sticks to mouse with 0.0ms delay (True Trello feel)

      if (floatingCardRef.current) {

        const x = e.clientX - d.offsetX;

        const y = e.clientY - d.offsetY;

        floatingCardRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(1.8deg)`;

        floatingCardRef.current.style.transformOrigin = `${d.offsetX}px ${d.offsetY}px`;

      }



      if (d.isDragging && !movePending) {

        movePending = true;

        requestAnimationFrame(processPointerMove);

      }

    };



    // ── Continuous Auto-Scroll Engine (Trello Edge Auto-Scroll with Live Index Sync) ──

    const autoScrollStep = () => {

      const d = dragTrackerRef.current;

      if (d.isDragging && d.hoverColId) {

        // 1. Page vertical scroll when near top or bottom edge of viewport

        const mainEl = document.querySelector('main');

        if (mainEl) {

          const threshold = 80;

          if (d.currentY > window.innerHeight - threshold) {

            const intensity = Math.min(1, Math.max(0, (d.currentY - (window.innerHeight - threshold)) / threshold));

            mainEl.scrollTop += 6 + intensity * 16;

            const newIdx = detectHoverIndex(d.hoverColId, d.currentY);

            if (newIdx !== d.hoverIndex) {

              d.hoverIndex = newIdx;

              setPointerDrag((prev) => prev ? { ...prev, hoverIndex: newIdx } : null);

            }

          } else if (d.currentY < 120) {

            const intensity = Math.min(1, Math.max(0, (120 - d.currentY) / 80));

            mainEl.scrollTop -= 6 + intensity * 16;

            const newIdx = detectHoverIndex(d.hoverColId, d.currentY);

            if (newIdx !== d.hoverIndex) {

              d.hoverIndex = newIdx;

              setPointerDrag((prev) => prev ? { ...prev, hoverIndex: newIdx } : null);

            }

          }

        }



        // 2. Board horizontal scroll when near left or right edge

        const boardEl = document.getElementById("kanban-board-scroll-area");

        if (boardEl) {

          const bRect = boardEl.getBoundingClientRect();

          const horizThreshold = 80;

          if (d.currentX > bRect.right - horizThreshold) {

            boardEl.scrollLeft += 12;

          } else if (d.currentX < bRect.left + horizThreshold) {

            boardEl.scrollLeft -= 12;

          }

        }

      }



      animFrameId = requestAnimationFrame(autoScrollStep);

    };



    animFrameId = requestAnimationFrame(autoScrollStep);



    const handlePointerUp = () => {

      const d = dragTrackerRef.current;

      if (d.isDragging && d.hoverColId && d.task) {

        moveTaskToIndex(d.task.id, d.hoverColId, d.hoverIndex);

      } else if (!d.isDragging && d.task) {

        setSelectedTask(d.task);

      }

      d.isDragging = false;

      d.task = null;

      setPointerDrag(null);

    };



    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    window.addEventListener("pointerup", handlePointerUp);



    return () => {

      cancelAnimationFrame(animFrameId);

      window.removeEventListener("pointermove", handlePointerMove);

      window.removeEventListener("pointerup", handlePointerUp);

    };

  }, [isDragActive]);



  // ── TRELLO-STYLE BOARD CANVAS PANNING (DRAG HORIZONTALLY ON BOARD BACKGROUND) ──

  const boardScrollRef = useRef<HTMLDivElement>(null);

  const [isBoardPanning, setIsBoardPanning] = useState(false);

  const hasJustPannedRef = useRef(false);

  const panMomentumIdRef = useRef<number | null>(null);



  const panTrackerRef = useRef<{

    isPanning: boolean;

    startX: number;

    startY: number;

    startScrollLeft: number;

    hasDragged: boolean;

    lastX: number;

    lastTime: number;

    velocity: number;

  }>({

    isPanning: false,

    startX: 0,

    startY: 0,

    startScrollLeft: 0,

    hasDragged: false,

    lastX: 0,

    lastTime: 0,

    velocity: 0,

  });



  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {

    // If card is being dragged, do not pan

    if (pointerDrag?.isDragging) return;



    // Support both Left Click (0) and Middle Click (1)

    if (e.button !== 0 && e.button !== 1) return;



    // Ignore interactive targets (task cards, buttons, links, inputs)

    const target = e.target as HTMLElement;

    if (

      target.closest("[data-task-card-id]") ||

      target.closest("button") ||

      target.closest("a") ||

      target.closest("input") ||

      target.closest("textarea") ||

      target.closest("[data-no-pan]")

    ) {

      return;

    }



    const scrollEl = boardScrollRef.current;

    if (!scrollEl) return;



    // Stop ongoing momentum if any

    if (panMomentumIdRef.current) {

      cancelAnimationFrame(panMomentumIdRef.current);

      panMomentumIdRef.current = null;

    }



    panTrackerRef.current = {

      isPanning: true,

      startX: e.clientX,

      startY: e.clientY,

      startScrollLeft: scrollEl.scrollLeft,

      hasDragged: false,

      lastX: e.clientX,

      lastTime: performance.now(),

      velocity: 0,

    };

  };



  useEffect(() => {

    const handleCaptureClick = (e: MouseEvent) => {

      if (hasJustPannedRef.current) {

        e.stopPropagation();

        e.preventDefault();

        hasJustPannedRef.current = false;

      }

    };

    window.addEventListener("click", handleCaptureClick, true);

    return () => window.removeEventListener("click", handleCaptureClick, true);

  }, []);



  useEffect(() => {

    const handleWindowPointerMove = (e: PointerEvent) => {

      const tracker = panTrackerRef.current;

      if (!tracker.isPanning) return;



      const scrollEl = boardScrollRef.current;

      if (!scrollEl) return;



      const deltaX = e.clientX - tracker.startX;

      const deltaY = e.clientY - tracker.startY;



      // Threshold to distinguish click from drag

      if (!tracker.hasDragged && Math.hypot(deltaX, deltaY) > 5) {

        tracker.hasDragged = true;

        setIsBoardPanning(true);

        document.body.style.userSelect = "none";

        document.body.style.cursor = "grabbing";

      }



      if (tracker.hasDragged) {

        // Direct scroll 1:1 with mouse movement (exact Trello feel)

        scrollEl.scrollLeft = tracker.startScrollLeft - deltaX;



        // Calculate velocity for smooth momentum release

        const now = performance.now();

        const dt = now - tracker.lastTime;

        if (dt > 8) {

          tracker.velocity = (e.clientX - tracker.lastX) / dt;

          tracker.lastX = e.clientX;

          tracker.lastTime = now;

        }

      }

    };



    const handleWindowPointerUp = () => {

      const tracker = panTrackerRef.current;

      if (tracker.isPanning) {

        tracker.isPanning = false;

        if (tracker.hasDragged) {

          setIsBoardPanning(false);

          document.body.style.userSelect = "";

          document.body.style.cursor = "";



          hasJustPannedRef.current = true;

          setTimeout(() => {

            hasJustPannedRef.current = false;

          }, 80);



          // Apply silky smooth momentum glide

          const scrollEl = boardScrollRef.current;

          if (scrollEl && Math.abs(tracker.velocity) > 0.15) {

            let vel = tracker.velocity * 16; // pixels per frame

            const momentumStep = () => {

              if (Math.abs(vel) < 0.4) {

                panMomentumIdRef.current = null;

                return;

              }

              if (boardScrollRef.current) {

                boardScrollRef.current.scrollLeft -= vel;

                vel *= 0.92; // smooth friction

                panMomentumIdRef.current = requestAnimationFrame(momentumStep);

              }

            };

            panMomentumIdRef.current = requestAnimationFrame(momentumStep);

          }

        }

      }

    };



    window.addEventListener("pointermove", handleWindowPointerMove);

    window.addEventListener("pointerup", handleWindowPointerUp);

    window.addEventListener("pointercancel", handleWindowPointerUp);



    return () => {

      window.removeEventListener("pointermove", handleWindowPointerMove);

      window.removeEventListener("pointerup", handleWindowPointerUp);

      window.removeEventListener("pointercancel", handleWindowPointerUp);

      if (panMomentumIdRef.current) cancelAnimationFrame(panMomentumIdRef.current);

      document.body.style.userSelect = "";

      document.body.style.cursor = "";

    };

  }, []);



  const triggerUndoToast = (task: KanbanTask, fromCol: ColumnId, toCol: ColumnId) => {

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    const fromTitle = columnsConfig.find((c) => c.id === fromCol)?.title || fromCol;

    const toTitle = columnsConfig.find((c) => c.id === toCol)?.title || toCol;



    setUndoToast({

      taskId: task.id,

      taskCode: task.code,

      taskTitle: task.title,

      fromColTitle: fromTitle,

      toColTitle: toTitle,

      fromCol,

      toCol,

      undone: false,

    });



    undoTimerRef.current = setTimeout(() => {

      setUndoToast(null);

    }, 6000);

  };



  const handleUndo = () => {

    if (!undoToast || undoToast.undone) return;

    if (undoToast.action === "delete" && undoToast.deletedTask) {

      const restoreTask = undoToast.deletedTask;

      const restoreIndex = undoToast.deletedIndex ?? 0;

      setTasks((prev) => {

        const copy = [...prev];

        copy.splice(Math.min(restoreIndex, copy.length), 0, restoreTask);

        return copy;

      });

      setJustDroppedTaskId(restoreTask.id);

      void createWorkspaceTaskApi(currentProjectId, restoreTask);

    } else if (undoToast.fromCol) {

      const { taskId, fromCol } = undoToast;

      setTasks((prev) =>

        prev.map((t) => (t.id === taskId ? { ...t, column: fromCol } : t))

      );

      setJustDroppedTaskId(taskId);

      void moveWorkspaceTaskApi(taskId, fromCol, 0);

    }

    if (justDroppedTimerRef.current) clearTimeout(justDroppedTimerRef.current);

    justDroppedTimerRef.current = setTimeout(() => {

      setJustDroppedTaskId(null);

    }, 450);

    setUndoToast((prev) => (prev ? { ...prev, undone: true } : null));

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    undoTimerRef.current = setTimeout(() => {

      setUndoToast(null);

    }, 2500);

  };



  const handleTabChange = (tab: TabView) => {

    setActiveTab(tab);

    setKanbanAnimKey((k) => k + 1);

  };



  useEffect(() => {

    if (activeTab === "analytics") {

      setAnalyticsAnimTrigger(false);

      const timer = setTimeout(() => {

        setAnalyticsAnimTrigger(true);

      }, 50);

      return () => clearTimeout(timer);

    } else {

      setAnalyticsAnimTrigger(false);

    }

  }, [activeTab]);



  // Dynamic Member Management Modal

  const [memberModalOpen, setMemberModalOpen] = useState(false);

  const [csvModalOpen, setCsvModalOpen] = useState(false);

  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);



  // Export tasks as CSV matching Marlo Export

  const handleExportTasks = () => {

    const headers = ["ID", "Code", "Title", "Column", "Priority", "Points", "Assignee", "Role", "EstimateHours", "DueDate", "Project"];

    const rows = tasks.map((t) => [

      t.id,

      t.code,

      `"${(t.title || "").replace(/"/g, '""')}"`,

      t.column,

      t.priority,

      t.points,

      `"${(t.assignee?.name || "").replace(/"/g, '""')}"`,

      `"${(t.assignee?.role || "").replace(/"/g, '""')}"`,

      t.estimateHours || 0,

      `"${t.dueDate || ""}"`,

      `"${(t.epic || "").replace(/"/g, '""')}"`,

    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.setAttribute("download", `marlo-tasks-${new Date().toISOString().slice(0, 10)}.csv`);

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

  };



  const handleImportCsvTasks = (newTasks: KanbanTask[]) => {

    setTasks((prev) => [...prev, ...newTasks]);

    handleTabChange("board");

    void batchCreateWorkspaceTasksApi(currentProjectId, newTasks);

  };

  const [newMemberName, setNewMemberName] = useState("");

  const [newMemberRole, setNewMemberRole] = useState("Frontend Developer");



  // Filtering

  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  const [filterPriority, setFilterPriority] = useState<string>("all");

  const [searchQuery, setSearchQuery] = useState<string>("");

  const [viewMode, setViewMode] = useState<"team" | "my">("team");



  // Helper count for My Tasks tab badge

  const myOpenTasksCount = useMemo(() => {

    const currentName = teamMembers[0]?.name || "Nguyễn Bá Hòa";

    return tasks.filter((t) => t.assignee.name === currentName && t.column !== "done").length;

  }, [tasks, teamMembers]);



  const handleToggleTaskComplete = (task: KanbanTask, e?: React.MouseEvent) => {

    if (e) e.stopPropagation();

    const newCol: ColumnId = task.column === "done" ? "in-progress" : "done";

    moveTaskToIndex(task.id, newCol);

  };



  const handleFilterByMember = (memberName: string) => {

    setFilterAssignee(memberName);

    handleTabChange("board");

  };



  const assigneeFilterOptions: CustomSelectOption[] = useMemo(() => [

    {

      value: "all",

      label: "Tất cả thành viên",

      icon: <Users size={13} className="text-slate-400" />,

    },

    ...teamMembers.map((m) => ({

      value: m.name,

      label: `${m.name} (${m.role})`,

      icon: (

        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${m.color}`}>

          {m.avatar}

        </span>

      ),

    })),

  ], [teamMembers]);



  const priorityFilterOptions: CustomSelectOption[] = useMemo(() => [

    {

      value: "all",

      label: "Mọi độ ưu tiên",

      icon: <Filter size={13} className="text-slate-400" />,

    },

    {

      value: "high",

      label: "Ưu tiên Cao (P0)",

      icon: <span className="h-2 w-2 rounded-full bg-rose-500 shadow-xs" />,

    },

    {

      value: "medium",

      label: "Ưu tiên Vừa (P1)",

      icon: <span className="h-2 w-2 rounded-full bg-amber-500 shadow-xs" />,

    },

    {

      value: "low",

      label: "Ưu tiên Thấp (P2)",

      icon: <span className="h-2 w-2 rounded-full bg-slate-400 shadow-xs" />,

    },

  ], []);



  // Drag and Drop state

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const [dragOverCol, setDragOverCol] = useState<ColumnId | null>(null);

  const [copiedTaskCode, setCopiedTaskCode] = useState(false);



  // H2 Violation Modal

  const [h2Violation, setH2Violation] = useState<{

    task: KanbanTask;

    blockingTask: KanbanTask;

  } | null>(null);



  // AI Modal State

  const [aiModalOpen, setAiModalOpen] = useState(false);

  const [aiStage, setAiStage] = useState<"input" | "preview">("input");

  const [aiFeatureName, setAiFeatureName] = useState("");

  const [aiDescription, setAiDescription] = useState("");

  const [aiStack, setAiStack] = useState<TechStackKey>("backend");

  const [aiCustomTech, setAiCustomTech] = useState("");

  const [aiGranularity, setAiGranularity] = useState<number>(3);

  const [aiIncludeH2, setAiIncludeH2] = useState(true);

  const [aiSelectedMemberIds, setAiSelectedMemberIds] = useState<string[]>(["m1", "m2", "m3"]);

  const [aiGenerating, setAiGenerating] = useState(false);

  const [aiPreviewTasks, setAiPreviewTasks] = useState<KanbanTask[]>([]);



  // Engineering & Agile Scrum Handbook Modal

  const [handbookOpen, setHandbookOpen] = useState(false);



  // Quick Inline Add Task

  const [inlineAddingCol, setInlineAddingCol] = useState<ColumnId | null>(null);

  const [inlineTitle, setInlineTitle] = useState("");



  const [isMemberModalClosing, setIsMemberModalClosing] = useState(false);

  const [isH2ViolationClosing, setIsH2ViolationClosing] = useState(false);

  const [isAiModalClosing, setIsAiModalClosing] = useState(false);

  const [isHandbookClosing, setIsHandbookClosing] = useState(false);



  const handleCloseMemberModal = () => {

    if (isMemberModalClosing) return;

    setIsMemberModalClosing(true);

    setTimeout(() => {

      setMemberModalOpen(false);

      setIsMemberModalClosing(false);

    }, 220);

  };



  const handleCloseH2Violation = () => {

    if (isH2ViolationClosing) return;

    setIsH2ViolationClosing(true);

    setTimeout(() => {

      setH2Violation(null);

      setIsH2ViolationClosing(false);

    }, 220);

  };



  const handleCloseAiModal = () => {

    if (isAiModalClosing) return;

    setIsAiModalClosing(true);

    setTimeout(() => {

      setAiModalOpen(false);

      setIsAiModalClosing(false);

    }, 220);

  };



  const handleCloseHandbook = () => {

    if (isHandbookClosing) return;

    setIsHandbookClosing(true);

    setTimeout(() => {

      setHandbookOpen(false);

      setIsHandbookClosing(false);

    }, 220);

  };



  useEffect(() => {

    const handleKeyDown = (e: KeyboardEvent) => {

      if (e.key === "Escape") {

        if (memberModalOpen) handleCloseMemberModal();

        if (h2Violation) handleCloseH2Violation();

        if (aiModalOpen) handleCloseAiModal();

        if (handbookOpen) handleCloseHandbook();

      }

    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [memberModalOpen, h2Violation, aiModalOpen, handbookOpen, isMemberModalClosing, isH2ViolationClosing, isAiModalClosing, isHandbookClosing]);

  const [handbookTab, setHandbookTab] = useState<"scrum" | "pttk">("scrum");

  const [taskDetailTab, setTaskDetailTab] = useState<"general" | "engineering">("general");



  const getTaskById = (id: string) => tasks.find((t) => t.id === id);



  // Total Story points and completed points

  const sprintStats = useMemo(() => {

    const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0);

    const donePoints = tasks.filter((t) => t.column === "done" || t.column === "verified").reduce((sum, t) => sum + t.points, 0);

    const inProgPoints = tasks.filter((t) => t.column === "in-progress").reduce((sum, t) => sum + t.points, 0);

    const percentDone = Math.round((donePoints / (totalPoints || 1)) * 100);

    return { totalPoints, donePoints, inProgPoints, percentDone };

  }, [tasks]);



  // Anti-Freerider Contribution calculated dynamically for ANY number of members!

  const contribution = useMemo(() => {

    const memberStats: Record<string, { member: TeamMember; donePts: number; totalPts: number; tasksDone: number; percent: number }> = {};

    

    teamMembers.forEach((m) => {

      memberStats[m.name] = { member: m, donePts: 0, totalPts: 0, tasksDone: 0, percent: 0 };

    });



    tasks.forEach((t) => {

      const name = t.assignee.name;

      if (memberStats[name]) {

        memberStats[name].totalPts += t.points;

        if (t.column === "done") {

          memberStats[name].donePts += t.points;

          memberStats[name].tasksDone += 1;

        }

      }

    });



    const totalDonePts = Object.values(memberStats).reduce((s, m) => s + m.donePts, 0) || 1;

    Object.values(memberStats).forEach((stat) => {

      stat.percent = Math.round((stat.donePts / totalDonePts) * 100);

    });



    return memberStats;

  }, [tasks, teamMembers]);



  // Execute Move Task to specific index (Trello-style positional insertion)

  const moveTaskToIndex = (taskId: string, targetCol: ColumnId, targetIndex?: number) => {

    const task = getTaskById(taskId);

    if (!task) return;



    // Restrict student from moving directly to 'verified'

    if (role === "student" && targetCol === "verified") {

      alert("Cột 'Đã nghiệm thu' chỉ dành riêng cho Giảng viên hướng dẫn thẩm định. Sinh viên chỉ có thể chuyển sang 'Hoàn thành' để chờ nghiệm thu.");

      return;

    }



    // Hard Constraint H2 Check

    if (targetCol === "done" && task.dependsOn) {

      const parent = getTaskById(task.dependsOn);

      if (parent && parent.column !== "done") {

        setH2Violation({ task, blockingTask: parent });

        return;

      }

    }



    const previousCol = task.column;

    const targetColLength = tasks.filter((t) => t.id !== taskId && t.column === targetCol).length;

    const resolvedIdx = targetIndex !== undefined

      ? Math.max(0, Math.min(targetIndex, targetColLength))

      : targetColLength;



    setTasks((prev) => {

      const existingTask = prev.find((t) => t.id === taskId);

      if (!existingTask) return prev;

      const fromTitle = columnsConfig.find((c) => c.id === previousCol)?.title || previousCol;

      const toTitle = columnsConfig.find((c) => c.id === targetCol)?.title || targetCol;

      const nowLog = {

        user: existingTask.assignee?.name || "Nguyễn Bá Hòa",

        fromColumn: fromTitle,

        toColumn: toTitle,

        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),

      };

      const nextLogs =

        previousCol !== targetCol

          ? [...(existingTask.auditLogs || []), nowLog]

          : existingTask.auditLogs;

      const updatedTask = { ...existingTask, column: targetCol, auditLogs: nextLogs };



      const withoutTask = prev.filter((t) => t.id !== taskId);

      const targetColTasks = withoutTask.filter((t) => t.column === targetCol);

      const otherTasks = withoutTask.filter((t) => t.column !== targetCol);



      const boundedIdx = targetIndex !== undefined

        ? Math.max(0, Math.min(targetIndex, targetColTasks.length))

        : targetColTasks.length;



      targetColTasks.splice(boundedIdx, 0, updatedTask);



      return [...otherTasks, ...targetColTasks];

    });



    setJustDroppedTaskId(taskId);

    if (justDroppedTimerRef.current) clearTimeout(justDroppedTimerRef.current);

    justDroppedTimerRef.current = setTimeout(() => {

      setJustDroppedTaskId(null);

    }, 450);



    if (previousCol !== targetCol) {

      triggerUndoToast(task, previousCol, targetCol);

    }



    moveWorkspaceTaskApi(taskId, targetCol, resolvedIdx).then((res) => {

      if (res.error) {

        void reloadWorkspace();

      }

    });

  };



  const moveTask = (taskId: string, targetCol: ColumnId) => {

    moveTaskToIndex(taskId, targetCol);

  };



  // Drag Handlers (Chuẩn Trello: Custom Drag Ghost nghiêng 3.5 độ, viền trắng đổ bóng 3D sắc nét)

  const handleDragStart = (e: React.DragEvent, taskId: string) => {

    e.dataTransfer.setData("text/plain", taskId);

    e.dataTransfer.effectAllowed = "move";



    const cardEl = e.currentTarget as HTMLElement;

    if (cardEl && e.dataTransfer.setDragImage) {

      const rect = cardEl.getBoundingClientRect();

      const ghost = cardEl.cloneNode(true) as HTMLElement;

      ghost.id = "trello-drag-ghost";

      ghost.style.position = "fixed";

      ghost.style.top = "-9999px";

      ghost.style.left = "-9999px";

      ghost.style.width = `${rect.width}px`;

      ghost.style.transform = "rotate(3.5deg)";

      ghost.style.boxShadow = "0 18px 32px -4px rgba(15, 23, 42, 0.28), 0 6px 12px rgba(15, 23, 42, 0.12)";

      ghost.style.borderRadius = "12px";

      ghost.style.backgroundColor = "#ffffff";

      ghost.style.border = "1px solid #cbd5e1";

      ghost.style.opacity = "1";

      ghost.style.zIndex = "99999";

      ghost.style.pointerEvents = "none";

      document.body.appendChild(ghost);



      const offsetX = Math.min(Math.max(e.clientX - rect.left, 20), rect.width - 20);

      const offsetY = Math.min(Math.max(e.clientY - rect.top, 15), rect.height - 15);

      e.dataTransfer.setDragImage(ghost, offsetX, offsetY);



      setTimeout(() => {

        if (ghost.parentNode) {

          ghost.parentNode.removeChild(ghost);

        }

      }, 0);

    }



    setDraggingTaskId(taskId);

  };



  const handleDragEnd = () => {

    setDraggingTaskId(null);

    setDragOverCol(null);

  };



  const handleDragOver = (e: React.DragEvent, colId: ColumnId) => {

    e.preventDefault();

    e.dataTransfer.dropEffect = "move";

    if (dragOverCol !== colId) {

      setDragOverCol(colId);

    }

  };



  const handleDragLeave = (e: React.DragEvent, colId: ColumnId) => {

    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();

    const x = e.clientX;

    const y = e.clientY;

    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {

      if (dragOverCol === colId) {

        setDragOverCol(null);

      }

    }

  };



  const handleDrop = (e: React.DragEvent, colId: ColumnId) => {

    e.preventDefault();

    e.stopPropagation();

    const taskId = e.dataTransfer.getData("text/plain") || draggingTaskId;

    setDraggingTaskId(null);

    setDragOverCol(null);

    if (taskId) {

      moveTask(taskId, colId);

    }

  };



  // Inline Task creation

  const handleInlineAdd = (colId: ColumnId) => {

    if (!inlineTitle.trim()) {

      setInlineAddingCol(null);

      return;

    }

    const defaultAssignee = teamMembers[0] || { name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect" };

    const newTask: KanbanTask = {

      id: `task-${Date.now()}`,

      code: `TSK-${Math.floor(Math.random() * 800 + 100)}`,

      title: inlineTitle.trim(),

      description: "Thẻ công việc phân rã từ Sprint Backlog theo chuẩn Scrum.",

      column: colId,

      priority: "medium",

      moscow: "should",

      points: 3,

      assignee: { name: defaultAssignee.name, avatar: defaultAssignee.avatar, role: defaultAssignee.role },

      estimateHours: 3,

      dueDate: "15/11",

      epic: "Sprint Goal",

      epicColor: "bg-blue-50 text-blue-700 border-blue-200",

      userStory: {

        role: "Nhóm phát triển",

        want: `triển khai ${inlineTitle.trim()}`,

        benefit: "đạt mục tiêu Sprint Goal đã cam kết trong Sprint Planning",

      },

      acceptanceCriteria: `Given yêu cầu ${inlineTitle.trim()}\nWhen thực hiện hoàn tất\nThen đáp ứng tiêu chuẩn nghiệm thu và vượt qua 4 tiêu chí DoD`,

      definitionOfDone: defaultDoD(false),

      checklist: [],

      commentsCount: 0,

      attachmentsCount: 0,

    };

    setTasks((prev) => [...prev, newTask]);

    void createWorkspaceTaskApi(currentProjectId, newTask);

    setJustDroppedTaskId(newTask.id);

    if (justDroppedTimerRef.current) clearTimeout(justDroppedTimerRef.current);

    justDroppedTimerRef.current = setTimeout(() => {

      setJustDroppedTaskId(null);

    }, 450);

    setInlineTitle("");

    setInlineAddingCol(null);

  };



  // Add Dynamic Team Member

  const handleAddMember = () => {

    if (!newMemberName.trim()) return;

    const initials = newMemberName

      .trim()

      .split(" ")

      .map((w) => w[0])

      .slice(-2)

      .join("")

      .toUpperCase();

    

    const palette = ["bg-[#14161a] dark:bg-slate-700", "bg-amber-500", "bg-slate-600 dark:bg-slate-500", "bg-amber-600", "bg-slate-800"];

    const randomColor = palette[teamMembers.length % palette.length];



    const newMember: TeamMember = {

      id: `m-${Date.now()}`,

      name: newMemberName.trim(),

      avatar: initials || "DEV",

      role: newMemberRole.trim() || "Developer",

      color: randomColor,

    };



    const nextTeam = [...teamMembers, newMember];

    setTeamMembers(nextTeam);

    void updateWorkspaceProjectApi(currentProjectId, { team: nextTeam });

    setAiSelectedMemberIds((prev) => [...prev, newMember.id]);

    setNewMemberName("");

    setMemberModalOpen(false);

  };



  // Remove Dynamic Team Member

  const handleRemoveMember = (memberId: string) => {

    if (teamMembers.length <= 1) return;

    const nextTeam = teamMembers.filter((m) => m.id !== memberId);

    setTeamMembers(nextTeam);

    void updateWorkspaceProjectApi(currentProjectId, { team: nextTeam });

    setAiSelectedMemberIds((prev) => prev.filter((id) => id !== memberId));

  };



  // AI Presets

  const aiPresets = [

    {

      name: "Docker Sandbox Code Runner",

      desc: "Môi trường thực thi isolated sandbox chấm 5 test cases Deque, chặn memory leak và timeout 2s.",

      stack: "sandbox" as TechStackKey,

      count: 3,

    },

    {

      name: "Socratic AI Tutor Hint Ladder",

      desc: "Thang gợi ý sư phạm 3 nấc (Level 1, 2, 3), từ chối giải sẵn, sinh mã băm SHA-256 evidence.",

      stack: "ai" as TechStackKey,

      count: 3,

    },

    {

      name: "AI Defense Simulator (Hội đồng phản biện)",

      desc: "Phòng bảo vệ đồ án ảo: AI phản biện chất vấn sinh viên, đo mức độ hiểu code và cảnh báo gian lận.",

      stack: "fullstack" as TechStackKey,

      count: 4,

    },

    {

      name: "Anti-Freerider Git Analytics Engine",

      desc: "Thuật toán đo lường đóng góp thực tế từ commit GitHub, số task Done và test cases pass.",

      stack: "backend" as TechStackKey,

      count: 3,

    },

  ];



  // AI WBS Generation Logic dynamically distributing among SELECTED members!

  const handleGenerateWbs = async () => {

    if (!aiFeatureName.trim()) return;

    setAiGenerating(true);



    const activeMembers = teamMembers.filter((m) => aiSelectedMemberIds.includes(m.id));

    const pool = activeMembers.length > 0 ? activeMembers : teamMembers;



    const apiTasks = await generateAiWbsTasksApi({

      feature_name: aiFeatureName.trim(),

      description: aiDescription,

      stack: aiStack,

      custom_tech: aiCustomTech,

      granularity: aiGranularity,

      include_h2: aiIncludeH2,

      selected_members: pool,

    });



    if (apiTasks && apiTasks.length > 0) {

      setAiPreviewTasks(apiTasks);

      setAiGenerating(false);

      setAiStage("preview");

      return;

    }



    setTimeout(() => {

      const stamp = Date.now();

      const parentId = `task-ai-${stamp}-1`;



      const techLabel =

        aiStack === "custom" && aiCustomTech.trim()

          ? aiCustomTech.trim()

          : techStackOptions.find((t) => t.value === aiStack)?.label || "Backend Architecture";



      const generated: KanbanTask[] = [];



      // Task 1: Architecture & Data Specs (assigned to 1st member)

      const m1 = pool[0 % pool.length];

      generated.push({

        id: parentId,

        code: `ARC-${Math.floor(Math.random() * 90 + 10)}`,

        title: `Thiết kế Kiến trúc & Data Model: ${aiFeatureName.trim()}`,

        description: `Đặc tả kỹ thuật [${techLabel}], phân tích schema CSDL 3NF, data contracts và sequence diagram. ${

          aiDescription ? "Yêu cầu: " + aiDescription : ""

        }`,

        column: "backlog",

        priority: "high",

        moscow: "must",

        points: 5,

        assignee: { name: m1.name, avatar: m1.avatar, role: m1.role },

        estimateHours: 4,

        dueDate: "14/11",

        epic: aiFeatureName.trim(),

        epicColor: "bg-blue-50 text-blue-700 border-blue-200",

        userStory: {

          role: "Kiến trúc sư phần mềm",

          want: `thiết kế cấu trúc dữ liệu và API contract cho ${aiFeatureName.trim()}`,

          benefit: "hệ thống hoạt động nhất quán, chuẩn hóa 3NF và tuân thủ múi giờ UTC (H4)",

        },

        acceptanceCriteria: `Given yêu cầu ${aiFeatureName.trim()}\nWhen thiết kế kiến trúc\nThen schema CSDL đạt chuẩn 3NF và vẽ đủ sơ đồ tuần tự (Sequence Diagram)`,

        definitionOfDone: defaultDoD(false),

        checklist: [

          { id: "ai-c1", text: "Đặc tả schema database & DTO contracts", done: false },

          { id: "ai-c2", text: "Vẽ sơ đồ luồng dữ liệu (Sequence diagram)", done: false },

        ],

        commentsCount: 1,

        attachmentsCount: 1,

      });



      // Task 2: Core Engine / API Implementation (assigned to 2nd member if available)

      const m2 = pool[1 % pool.length];

      const task2Id = `task-ai-${stamp}-2`;

      generated.push({

        id: task2Id,

        code: `CORE-${Math.floor(Math.random() * 90 + 10)}`,

        title: `Xây dựng Core Logic Service: ${aiFeatureName.trim()}`,

        description: `Hiện thực hóa logic nghiệp vụ theo Kiến trúc 3 tầng, kết nối router RESTful, áp dụng ràng buộc nghiệp vụ H2/H3.`,

        column: "backlog",

        priority: "high",

        moscow: "must",

        points: 5,

        assignee: { name: m2.name, avatar: m2.avatar, role: m2.role },

        estimateHours: 4.5,

        dueDate: "18/11",

        epic: aiFeatureName.trim(),

        epicColor: "bg-amber-50 text-amber-700 border-amber-200",

        dependsOn: aiIncludeH2 ? parentId : undefined,

        userStory: {

          role: "Backend Developer",

          want: `hiện thực hóa logic xử lý trong services/ cho ${aiFeatureName.trim()}`,

          benefit: "xử lý nghiệp vụ an toàn, đúng ràng buộc và có API endpoint hoàn chỉnh",

        },

        acceptanceCriteria: `Given thiết kế kiến trúc đã sẵn sàng\nWhen client gửi request nghiệp vụ\nThen server xử lý chuẩn xác và trả về HTTP 200 OK`,

        definitionOfDone: defaultDoD(false),

        checklist: [

          { id: "ai-c3", text: "Viết logic xử lý cốt lõi trong services/", done: false },

          { id: "ai-c4", text: "Cấu hình API Endpoint và kiểm tra lỗi", done: false },

        ],

        commentsCount: 0,

        attachmentsCount: 0,

      });



      // Task 3: Security & Automated Tests (assigned to 3rd member if available)

      if (aiGranularity >= 3) {

        const m3 = pool[2 % pool.length];

        generated.push({

          id: `task-ai-${stamp}-3`,

          code: `QA-${Math.floor(Math.random() * 90 + 10)}`,

          title: `Bộ Kiểm thử Tự động & QA: ${aiFeatureName.trim()}`,

          description: `Viết 15 ca unit test tự động (test_layered_api.py), kiểm tra biên, timeout và exception handling.`,

          column: "backlog",

          priority: "medium",

          moscow: "should",

          points: 3,

          assignee: { name: m3.name, avatar: m3.avatar, role: m3.role },

          estimateHours: 3.5,

          dueDate: "20/11",

          epic: aiFeatureName.trim(),

          epicColor: "bg-teal-50 text-teal-700 border-teal-200",

          dependsOn: aiIncludeH2 ? task2Id : undefined,

          userStory: {

            role: "QA & Test Engineer",

            want: `xây dựng bộ 15 ca kiểm thử tự động cho ${aiFeatureName.trim()}`,

            benefit: "đảm bảo chất lượng mã nguồn và ngăn chặn lỗi hồi quy (regression)",

          },

          acceptanceCriteria: `Given service đã hoàn thành\nWhen chạy lệnh kiểm thử tự động\nThen 100% test cases pass và thời gian phản hồi dưới 300ms`,

          definitionOfDone: defaultDoD(false),

          checklist: [

            { id: "ai-c5", text: "Viết 10 test cases happy path & edge cases", done: false },

            { id: "ai-c6", text: "Kiểm tra log telemetry analytics", done: false },

          ],

          commentsCount: 0,

          attachmentsCount: 1,

        });

      }



      // Task 4: Frontend UI Component (assigned to 4th member if available)

      if (aiGranularity >= 4) {

        const m4 = pool[3 % pool.length];

        generated.push({

          id: `task-ai-${stamp}-4`,

          code: `FE-${Math.floor(Math.random() * 90 + 10)}`,

          title: `Giao diện Tương tác React: ${aiFeatureName.trim()}`,

          description: `Thiết kế UI component đồng bộ với hệ thống theme CodeMind, xử lý state loading/error.`,

          column: "backlog",

          priority: "medium",

          moscow: "should",

          points: 3,

          assignee: { name: m4.name, avatar: m4.avatar, role: m4.role },

          estimateHours: 3,

          dueDate: "22/11",

          epic: aiFeatureName.trim(),

          epicColor: "bg-indigo-50 text-indigo-700 border-indigo-200",

          dependsOn: aiIncludeH2 ? task2Id : undefined,

          userStory: {

            role: "Frontend Developer",

            want: `xây dựng giao diện trực quan cho ${aiFeatureName.trim()}`,

            benefit: "người dùng thao tác mượt mà và nhận thông báo phản hồi nhanh chóng",

          },

          acceptanceCriteria: `Given API endpoint đã mở\nWhen người dùng thao tác trên màn hình\nThen giao diện render đúng trạng thái và không gây crash UI`,

          definitionOfDone: defaultDoD(false),

          checklist: [{ id: "ai-c7", text: "Nối hook API client trong src/api.ts", done: false }],

          commentsCount: 0,

          attachmentsCount: 0,

        });

      }



      // Task 5: Integration & Docs (assigned to 5th member if available)

      if (aiGranularity >= 5) {

        const m5 = pool[4 % pool.length];

        generated.push({

          id: `task-ai-${stamp}-5`,

          code: `DOC-${Math.floor(Math.random() * 90 + 10)}`,

          title: `Tài liệu Kỹ thuật & Slide Báo cáo: ${aiFeatureName.trim()}`,

          description: `Cập nhật tài liệu SRS Master Blueprint, xuất file báo cáo tiến độ nộp Hội đồng Phản biện.`,

          column: "backlog",

          priority: "low",

          moscow: "could",

          points: 2,

          assignee: { name: m5.name, avatar: m5.avatar, role: m5.role },

          estimateHours: 2.5,

          dueDate: "24/11",

          epic: aiFeatureName.trim(),

          epicColor: "bg-purple-50 text-purple-700 border-purple-200",

          dependsOn: aiIncludeH2 ? `task-ai-${stamp}-3` : undefined,

          userStory: {

            role: "Giảng viên & Đội ngũ",

            want: `tài liệu đặc tả và slide thuyết trình cho ${aiFeatureName.trim()}`,

            benefit: "chứng minh tính hoàn thiện của đề án trước Hội đồng nghiệm thu",

          },

          acceptanceCriteria: `Given module đã phát triển xong\nWhen nghiệm thu Sprint\nThen tài liệu SRS và slide cập nhật đầy đủ cấu trúc và kết quả đo lường`,

          definitionOfDone: defaultDoD(false),

          checklist: [{ id: "ai-c8", text: "Cập nhật slide thuyết trình", done: false }],

          commentsCount: 0,

          attachmentsCount: 0,

        });

      }



      setAiPreviewTasks(generated);

      setAiGenerating(false);

      setAiStage("preview");

    }, 1100);

  };



  const confirmAiTasks = () => {

    const confirmed = [...aiPreviewTasks];

    setTasks((prev) => [...prev, ...confirmed]);

    void batchCreateWorkspaceTasksApi(currentProjectId, confirmed);

    setAiModalOpen(false);

    setAiStage("input");

    setAiFeatureName("");

    setAiDescription("");

    setAiPreviewTasks([]);

  };



  // Filtered Tasks

  const filteredTasks = useMemo(() => {

    return tasks.filter((t) => {

      if (viewMode === "my" && t.assignee.name !== (teamMembers[0]?.name || "Nguyễn Bá Hòa")) return false;

      if (filterAssignee !== "all" && t.assignee.name !== filterAssignee) return false;

      if (filterPriority !== "all" && t.priority !== filterPriority) return false;

      if (searchQuery.trim()) {

        const query = searchQuery.toLowerCase();

        const matchesTitle = t.title.toLowerCase().includes(query);

        const matchesCode = t.code.toLowerCase().includes(query);

        const matchesEpic = t.epic.toLowerCase().includes(query);

        if (!matchesTitle && !matchesCode && !matchesEpic) return false;

      }

      return true;

    });

  }, [tasks, viewMode, filterAssignee, filterPriority, searchQuery, teamMembers]);



  useMarloPageEntrance(

    kanbanRef,

    (el) => {

      const cards = el.querySelectorAll(".marlo-card, [data-column-id], .kanban-col, .mine__summary-card");

      if (cards.length > 0) {

        animateMarloCards(cards, { stagger: 0.06, y: 26 });

      }

      const rows = el.querySelectorAll("[data-task-card-id], .marlo-row, .mine__row, .feed__row, .tcard");

      if (rows.length > 0) {

        animateMarloRows(rows, { y: 14, stagger: 0.025, delay: 0.22 });

      }

    },

    []);



  return (

    <div ref={kanbanRef} className="flex min-h-full flex-col p-6">

      {/* ── TOP CONTROL BAR (LINEAR / JIRA STYLE) ────────────────────────── */}

      <header className="mb-5 flex flex-col gap-4">

        {/* Row 1: Project Identity, Dynamic Team Roster & Primary Actions */}

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div className="flex items-center gap-3">



            <div ref={projectDropdownRef} className="relative z-30">

              <div className="flex items-center gap-2.5 flex-wrap">

                {/* 🏷️ Marlo Project Switcher Trigger */}

                <button

                  type="button"

                  onClick={() => setIsProjectDropdownOpen((prev) => !prev)}

                  className="group flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer"

                  title="Bấm để đổi dự án hoặc xem danh sách"

                >

                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#14161a] dark:bg-white text-white dark:text-slate-900 shadow-2xs shrink-0">

                    <FolderKanban size={15} />

                  </div>

                  <div className="text-left">

                    <div className="flex items-center gap-1.5">

                      <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">

                        {currentProject.name}

                      </span>

                      <ChevronDown

                        size={14}

                        className={`text-slate-400 group-hover:text-amber-500 transition-transform duration-200 ${

                          isProjectDropdownOpen ? "rotate-180 text-amber-500" : ""

                        }`}

                      />

                    </div>

                  </div>

                </button>



                {/* Sprint Badge */}

                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800/60 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">

                  <Flame size={12} className="text-amber-500" /> {currentProject.sprint}

                </span>

              </div>



              <p className="text-xs text-[#62656b] dark:text-[#a0a3a9] mt-1">

                {currentProject.course} • #{currentProject.code} • Nhóm {teamMembers.length} thành viên • Ràng buộc cứng H2 & Anti-Freerider

              </p>



              {/* 🏷️ Floating Project Quick-Switcher Menu */}

              {isProjectDropdownOpen && (

                <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141a] shadow-xl p-2 z-50 animate-fade-in select-none">

                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 mb-1">

                    <span>Chọn dự án làm việc ({projects.length})</span>

                    <button

                      onClick={() => {

                        setIsProjectDropdownOpen(false);

                        setIsProjectSlateOpen(true);

                      }}

                      className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer lowercase"

                    >

                      xem tất cả

                    </button>

                  </div>



                  <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">

                    {projects.map((proj) => {

                      const isSel = proj.id === currentProjectId;

                      const pTasks = Array.isArray(proj.tasks) ? proj.tasks : [];

                      const doneCount = pTasks.filter((t) => t.column === "done" || t.column === "verified").length;

                      return (

                        <div

                          key={proj.id}

                          onClick={() => {

                            setCurrentProjectId(proj.id);

                            setIsProjectDropdownOpen(false);

                          }}

                          className={`flex items-center justify-between p-2 rounded-xl transition cursor-pointer ${

                            isSel

                              ? "bg-slate-100 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700 shadow-2xs"

                              : "hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"

                          }`}

                        >

                          <div className="min-w-0 flex-1 pr-2">

                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{proj.name}</div>

                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{proj.course}</div>

                          </div>

                          <div className="text-right shrink-0">

                            <div className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">

                              {doneCount}/{pTasks.length}

                            </div>

                            <div className="text-[9px] text-slate-400 font-mono">

                              #{proj.code}

                            </div>

                          </div>

                        </div>

                      );

                    })}

                  </div>



                  <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">

                    <button

                      type="button"

                      onClick={() => {

                        setIsProjectDropdownOpen(false);

                        setIsNewProjectModalOpen(true);

                      }}

                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 transition shadow-2xs cursor-pointer active:scale-97"

                    >

                      <Plus size={13} />

                      <span>Tạo dự án mới</span>

                    </button>

                    <button

                      type="button"

                      onClick={() => {

                        setIsProjectDropdownOpen(false);

                        setIsProjectSlateOpen(true);

                      }}

                      className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"

                    >

                      Lưới dự án

                    </button>

                  </div>

                </div>

              )}

            </div>

          </div>



          {/* Unified, Perfectly Proportioned Marlo Pill Action Buttons */}

          <div className="flex items-center gap-2.5 flex-wrap">

            {/* 🏷️ Marlo Projects Slate Button */}

            <button

              onClick={() => setIsProjectSlateOpen(true)}

              className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-1.5"

              title="Xem danh sách tất cả dự án dạng lưới Marlo Slate"

            >

              <FolderKanban size={15} className="text-slate-600 dark:text-slate-300 shrink-0" />

              <span>Dự án ({projects.length})</span>

            </button>



            {/* Manage Team Members Button */}

            <button

              onClick={() => setMemberModalOpen(true)}

              className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-1.5"

              title="Quản lý thành viên trong nhóm"

            >

              <Users size={15} className="text-slate-600 dark:text-slate-300 shrink-0" />

              <span>Đội ngũ ({teamMembers.length})</span>

            </button>



            {/* Engineering & Agile Scrum Handbook Button */}

            <button

              onClick={() => setHandbookOpen(true)}

              className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-1.5"

              title="Cẩm nang quy chuẩn Kỹ nghệ phần mềm & Agile/Scrum"

            >

              <BookOpen size={15} className="text-slate-600 dark:text-slate-300 shrink-0" />

              <span>Cẩm nang Kỹ nghệ</span>

            </button>



            {/* Teacher CSV Format Button */}

            <button

              onClick={() => setCsvModalOpen(true)}

              className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-1.5"

              title="Nhập / Xuất task chuẩn định dạng 8 cột của Hội đồng Phản biện"

            >

              <FileSpreadsheet size={15} className="text-slate-600 dark:text-slate-300 shrink-0" />

              <span>CSV Mẫu Task</span>

            </button>



            {/* AI WBS Generator - Authentic Marlo Golden Primary Pill */}

            <button

              onClick={() => {

                setAiModalOpen(true);

                setAiStage("input");

              }}

              className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-1.5"

              title="Khởi tạo cây phân rã công việc tự động bằng AI Socratic"

            >

              <Sparkles size={15} className="text-slate-600 dark:text-slate-300 shrink-0" />

              <span>AI Phân rã WBS</span>

            </button>



            {/* ── Marlo Action Pill Group: [ ↓ Export ] & [ + New task ] (100% Authentic Marlo) ── */}

            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">

              {/* Export Button */}

              <button

                type="button"

                onClick={handleExportTasks}

                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-[#1a1f2c] hover:bg-slate-800 dark:hover:bg-[#252c3e] text-white border border-transparent dark:border-slate-700/60 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-97 cursor-pointer"

                title="Xuất danh sách công việc sang file CSV"

              >

                <Download size={14} className="stroke-[2.5]" />

                <span>Export</span>

              </button>



              {/* + New task Button */}

              <button

                type="button"

                onClick={() => setIsNewTaskModalOpen(true)}

                className="px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-97 transition cursor-pointer"

                title="Tạo công việc mới (Marlo Task) có checklist"

              >

                <Plus size={15} className="stroke-[2.5]" />

                <span>New task</span>

              </button>



              {/* Instructor Project Grading Button */}

              {role === "instructor" && (

                <button

                  type="button"

                  onClick={() => setIsGradingModalOpen(true)}

                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#ee8420] hover:from-amber-600 hover:to-[#d97706] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-97 transition cursor-pointer"

                  title="Thẩm định & Chấm điểm đồ án theo chuẩn Rubric Anti-Freerider"

                >

                  <ShieldCheck size={15} className="stroke-[2.5]" />

                  <span>Chấm điểm Đồ án</span>

                </button>

              )}



              {/* Admin Read-only Indicator */}

              {role === "admin" && (

                <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">

                  <Eye size={13} />

                  <span>Giám sát (Read-Only)</span>

                </span>

              )}

            </div>

          </div>

        </div>



        {/* Row 2: View Switcher (Full Width breathing room for 5 Marlo tabs) */}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">

          <MarloSegmentedControl

            value={activeTab}

            options={[

              { id: "board", label: "Bảng Kanban", icon: <Columns3 size={14} /> },

              {

                id: "my-tasks",

                label: "Của mình",

                icon: <UserCheck size={14} />,

                badge: myOpenTasksCount > 0 ? myOpenTasksCount : undefined,

              },

              {

                id: "team",

                label: `Phân vai & Team (${teamMembers.length})`,

                icon: <Users size={14} />,

              },

              {

                id: "activity",

                label: "Nhật ký & Git Stream",

                icon: <Activity size={14} />,

              },

              { id: "dependencies", label: "Cây Phụ thuộc (H2)", icon: <Link2 size={14} /> },

            ]}

            onChange={(val) => handleTabChange(val as TabView)}

            tone="dark"

          />

        </div>



        {/* Row 3: Filter & Search Toolbar */}

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div className="flex items-center gap-2">

            {/* View Mode: Team vs My with Marlo Liquid Segmented Pill */}

            <MarloSegmentedControl

              value={viewMode}

              options={[

                { id: "team", label: `Toàn nhóm (${teamMembers.length})`, icon: <Users size={13} /> },

                { id: "my", label: "Task của tôi", icon: <UserCheck size={13} /> },

              ]}

              onChange={(val) => setViewMode(val as "team" | "my")}

              size="sm"

              tone="dark"

            />



            {/* Modern Custom Assignee Filter */}

            <CustomSelect

              value={filterAssignee}

              onChange={setFilterAssignee}

              options={assigneeFilterOptions}

              placeholder="Tất cả thành viên"

              menuClassName="w-64"

            />



            {/* Modern Custom Priority Filter */}

            <CustomSelect

              value={filterPriority}

              onChange={setFilterPriority}

              options={priorityFilterOptions}

              placeholder="Mọi độ ưu tiên"

              menuClassName="w-48"

            />

          </div>



          <div className="flex items-center gap-2">

            <div className="relative">

              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />

              <input

                type="text"

                value={searchQuery}

                onChange={(e) => setSearchQuery(e.target.value)}

                placeholder="Tìm mã task, tiêu đề..."

                className="w-56 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 shadow-2xs focus:border-[#EE8420] focus:outline-hidden transition"

              />

            </div>

            <span className="text-xs text-slate-400">

              {filteredTasks.length} thẻ

            </span>

          </div>

        </div>

      </header>



      {/* 📊 Marlo Stacked Capacity Bar for Sprint Workload (chỉ hiện ở góc nhìn Bảng Kanban) */}

      {activeTab === "board" && (

        <div className="mb-4">

          <MarloCapacityBar

          title="Năng lực Sprint & Phân bổ Story Points"

          subtitle="Tỷ lệ tải công việc phân rã từ Sprint Backlog theo chuẩn Scrum"

          items={[

            { id: "done", label: "Đã nghiệm thu", count: tasks.filter(t => t.column === "done" || t.column === "verified").reduce((s, t) => s + t.points, 0), color: "#14161a" },

            { id: "prog", label: "Đang làm", count: tasks.filter(t => t.column === "in-progress").reduce((s, t) => s + t.points, 0), color: "#f59e0b" },

            { id: "ready", label: "Sẵn sàng", count: tasks.filter(t => t.column === "ready").reduce((s, t) => s + t.points, 0), color: "#fbbf24" },

            { id: "backlog", label: "Tồn đọng", count: tasks.filter(t => t.column === "backlog").reduce((s, t) => s + t.points, 0), color: "#94a3b8" },

          ]}

        />

      </div>

      )}



      {/* ── TAB 1: KANBAN BOARD WITH REAL DRAG AND DROP (WITH STAGGERED WATERFALL CASCADE) ─ */}

      {activeTab === "board" && (

        <div

          id="kanban-board-scroll-area"

          ref={boardScrollRef}

          onPointerDown={handleBoardPointerDown}

          key={`board-view-${kanbanAnimKey}`}

          className={`animate-screen-enter flex gap-4 items-start overflow-x-auto pb-8 min-w-full ${

            isBoardPanning ? "cursor-grabbing select-none" : "cursor-grab"

          }`}>

          {columnsConfig.map((col, colIdx) => {

            const colTasks = filteredTasks.filter((t) => t.column === col.id);

            const isDraggingOver = dragOverCol === col.id;

            const colPoints = colTasks.reduce((s, t) => s + t.points, 0);



            const isColHovered = (pointerDrag?.isDragging && pointerDrag.hoverColId === col.id) || isDraggingOver;

            return (

              <div

                key={col.id}

                data-column-id={col.id}

                onDragOver={(e) => handleDragOver(e, col.id)}

                onDragLeave={(e) => handleDragLeave(e, col.id)}

                onDrop={(e) => handleDrop(e, col.id)}



                className={`flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-100/75 dark:bg-slate-900/80 p-2.5 shadow-2xs transition-all w-[310px] min-w-[300px] shrink-0 ${

                  isColHovered ? "kanban-col-droptarget" : ""

                }`}

              >

                {/* Column Top Accent Line */}

                <div

                  className={`h-1 w-full rounded-full mb-2 ${col.accentBar} opacity-85`}

                  style={col.accentStyle}

                />



                {/* Column Header */}

                <div className="mb-2 flex items-center justify-between px-1.5 pt-0.5">

                  <div className="flex items-center gap-2">

                    <span

                      className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`}

                      style={col.dotStyle}

                    />

                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">

                      {col.title}

                    </h2>

                    <span

                      className={`flex h-4 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold font-mono ${col.badgeBg} ${col.badgeText}`}

                    >

                      {colTasks.length}

                    </span>

                  </div>



                  <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 font-bold bg-white/80 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200/60">

                    <OdometerNumber value={colPoints} suffix=" pts" />

                  </span>

                </div>



                {/* Tasks Container */}

                <div data-column-id={col.id} data-column-scroll={col.id} className="flex flex-col gap-2 pt-3 px-1.5 pb-6 min-h-[80px]">

                  {/* Target Column Empty Slot */}

                  {pointerDrag?.isDragging && pointerDrag.hoverColId === col.id && colTasks.filter(t => t.id !== pointerDrag.task.id).length === 0 && (

                    <div

                      key="trello-slot-empty"

                      className="trello-slot-unfurl rounded-xl border border-slate-300/80 dark:border-slate-700/80 bg-slate-200/75 dark:bg-slate-800/60 shadow-none pointer-events-none select-none min-h-[84px]"

                    />

                  )}



                  {colTasks.map((task, taskIdx) => {

                    // If this is the card currently being dragged

                    if (pointerDrag?.isDragging && task.id === pointerDrag.task.id) {

                      // If hovering another column, keep the ghost placeholder at this card's exact original slot!

                      if (pointerDrag.hoverColId !== col.id) {

                        return (

                          <div

                            key={`trello-slot-origin-${task.id}`}

                            className="trello-slot-origin rounded-xl border border-slate-300/80 dark:border-slate-700/80 bg-slate-200/60 dark:bg-slate-800/50 shadow-none pointer-events-none select-none min-h-[84px]"

                          />

                        );

                      }

                      return null;

                    }



                    const otherTasks = colTasks.filter((t) => t.id !== pointerDrag?.task.id);

                    const otherIdx = otherTasks.findIndex((t) => t.id === task.id);

                    const isTargetCol = pointerDrag?.isDragging && pointerDrag.hoverColId === col.id;

                    const isSlotHere = isTargetCol && pointerDrag.hoverIndex === otherIdx;

                    const isLastCard = otherIdx === otherTasks.length - 1;

                    const isSlotAfterLast = isTargetCol && isLastCard && pointerDrag.hoverIndex >= otherTasks.length;

                    const parentTask = task.dependsOn ? getTaskById(task.dependsOn) : null;

                    const isParentDone = parentTask ? parentTask.column === "done" : true;

                    const isLocked = !isParentDone;

                    const isJustDropped = justDroppedTaskId === task.id;



                    const checklist = Array.isArray(task.checklist) ? task.checklist : [];

                    const doneChecklist = checklist.filter((c) => c.done).length;

                    const totalChecklist = checklist.length;



                    const dod = Array.isArray(task.definitionOfDone) ? task.definitionOfDone : [];

                    const doneDodCount = dod.filter((d) => d.done).length;

                    const totalDodCount = dod.length;



                    // Match assignee color from dynamic team

                    const memberMeta = teamMembers.find((m) => m.name === task.assignee.name);

                    const avatarColor = getAssigneeAvatarColor(task.assignee.name, memberMeta?.color);



                    const taskGlobalIdx = filteredTasks.findIndex((t) => t.id === task.id);

                    const taskDelay = Math.max(0, taskGlobalIdx) * 32;



                    return (

                      <div

                        key={`${task.id}-${viewMode}-${filterAssignee}`}

                        className={`flex flex-col gap-2 ${!hasEnteredInitial ? "animate-kanban-card" : ""}`}

                        style={!hasEnteredInitial ? { animationDelay: `${taskDelay}ms` } : undefined}

                      >

                        {/* Expanding slot unfurls down between cards if hovered here */}

                        {isSlotHere && (

                          <div

                            key={`trello-slot-before-${task.id}`}

                            className="trello-slot-unfurl rounded-xl border border-slate-300/80 dark:border-slate-700/80 bg-slate-200/75 dark:bg-slate-800/60 shadow-none pointer-events-none select-none"

                          />

                        )}





                            <div

                              data-task-card-id={task.id}

                              onPointerDown={(e) => handleCardPointerDown(e, task)}

                              style={isJustDropped ? {

                                animation: "card-drop-settle 0.46s cubic-bezier(0.2, 0.85, 0.3, 1.2) forwards",

                              } : undefined}

                              className={`group relative flex cursor-grab active:cursor-grabbing flex-col rounded-xl p-3.5 transition-all select-none border border-slate-200/90 dark:border-slate-700/70 bg-white dark:bg-[#181d29] border-l-[3.5px] ${col.cardBorderLeft} ${

                                isJustDropped

                                  ? "border-amber-400 bg-white dark:bg-[#181d29] shadow-md z-20 ring-1 ring-amber-400/40"

                                  : "shadow-[0_1.5px_4px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-1 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.06)]"

                              }`}

                            >

                              

                        {/* Drag Handle & Epic Tag */}

                        <div className="mb-2 flex items-center justify-between gap-1 text-[11px]">

                          <div className="flex items-center gap-1.5 min-w-0">

                            <GripVertical

                              size={13}

                              className="text-slate-300 group-hover:text-slate-500 shrink-0"

                            />

                            <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-0.5 shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60">

                              #{task.code}

                              <button

                                type="button"

                                onClick={(e) => {

                                  e.stopPropagation();

                                  navigator.clipboard.writeText(task.code);

                                }}

                                title="Sao chép mã task"

                                className="opacity-0 group-hover:opacity-100 hover:text-[#EE8420] transition cursor-pointer p-0.5"

                              >

                                <Copy size={10} />

                              </button>

                              <button

                                type="button"

                                onClick={(e) => {

                                  e.stopPropagation();

                                  handleDeleteTask(task);

                                }}

                                title="Xóa thẻ này"

                                className="opacity-0 group-hover:opacity-100 hover:text-rose-600 transition cursor-pointer p-0.5 rounded hover:bg-rose-50"

                              >

                                <Trash2 size={10} />

                              </button>

                              {isLocked && parentTask && (

                                <span title={`Ràng buộc H2: Chờ #${parentTask.code} (${parentTask.assignee.name}) hoàn thành`} className="inline-flex text-rose-500 shrink-0 ml-0.5">

                                  <Lock size={11} />

                                </span>

                              )}

                            </span>



                          </div>



                          <div className="flex items-center gap-1.5 shrink-0">

                            {/* Story Points */}

                            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200/60">

                              {task.points}p

                            </span>

                          </div>

                        </div>



                        {/* Title - Giữ chuẩn màu chữ gốc text-slate-900 dark:text-white, không đổi màu khi hover */}

                        <h3 className="mb-2 text-[12px] font-semibold leading-snug text-slate-900 dark:text-white line-clamp-2">

                          {task.title}

                        </h3>



                        {/* Clean Boxy Footer */}

                        <div className="mt-auto flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 text-[11px]">

                          {/* Assignee Avatar & Name */}

                          <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">

                            <span

                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${avatarColor} shadow-2xs`}

                              title={`${task.assignee.name} (${task.assignee.role})`}

                            >

                              {task.assignee.avatar}

                            </span>

                            <span className="truncate font-semibold text-slate-700 dark:text-slate-300 text-[11px]" title={task.assignee.name}>

                              {task.assignee.name}

                            </span>

                          </div>



                          {/* Subtle micro badges: Checklist, DoD, Due Date */}

                          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] shrink-0">

                            {totalChecklist > 0 && (

                              <span

                                className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[10.5px] border-0 transition-colors ${

                                  doneChecklist === totalChecklist

                                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold"

                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"

                                }`}

                                title={`Checklist: ${doneChecklist}/${totalChecklist}`}

                              >

                                <ListChecks size={11} />

                                <span>{doneChecklist}/{totalChecklist}</span>

                              </span>

                            )}



                            {totalDodCount > 0 && (

                              <span

                                className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[10.5px] border-0 transition-colors ${

                                  doneDodCount === totalDodCount

                                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold"

                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"

                                }`}

                                title={`DoD: ${doneDodCount}/${totalDodCount} tiêu chuẩn`}

                              >

                                <ShieldCheck size={11} />

                                <span>{doneDodCount}/{totalDodCount}</span>

                              </span>

                            )}



                            <span

                              className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10.5px] font-medium border-0"

                              title={`Hạn hoàn thành: ${task.dueDate}`}

                            >

                              <Calendar size={11} />

                              <span>{task.dueDate.length > 5 ? task.dueDate.slice(0, 5) : task.dueDate}</span>

                            </span>

                          </div>

                        </div>



                        {/* Instructor Task Review Toolbar for Tasks in "done" */}

                        {role === "instructor" && task.column === "done" && (
                          <div className="mt-2 pt-1.5 border-t border-dashed border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1">
                              <ShieldCheck size={11} className="text-slate-500" /> Thẩm định:
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleInstructorReview(task.id, "approve");
                                }}
                                className="w-6 h-6 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition shadow-2xs hover:scale-105 active:scale-95 cursor-pointer border-0 outline-none ring-0"
                                title="Nghiệm thu task (Chuyển sang Đã nghiệm thu & cấp XP)"
                              >
                                <Check size={13} strokeWidth={2.8} />
                              </button>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const fb = prompt(
                                    "Nhập nhận xét / lý do yêu cầu sửa lại:",
                                    "Cần bổ sung test case biên hoặc tối ưu cấu trúc hàm."
                                  );
                                  if (fb !== null) {
                                    await handleInstructorReview(task.id, "request_revision", fb);
                                  }
                                }}
                                className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border-0 outline-none ring-0 flex items-center justify-center transition hover:scale-105 active:scale-95 cursor-pointer"
                                title="Yêu cầu sửa lại (Trả về cột Cần sửa lại kèm nhận xét)"
                              >
                                <RotateCcw size={12} strokeWidth={2.2} />
                              </button>
                            </div>
                          </div>
                        )}

                        {task.column === "verified" && (

                          <div className="mt-1.5 pt-1.5 border-t border-emerald-100 dark:border-emerald-950/40 flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">

                            <span className="flex items-center gap-1">

                              <ShieldCheck size={11} /> Đã nghiệm thu

                            </span>

                            <span className="font-mono">+{task.points * 10} XP</span>

                          </div>

                        )}

                      </div>





                        {/* If hovering below the last card, render slot after last card */}

                        {isSlotAfterLast && (

                          <div

                            key="trello-slot-after-last"

                            className="trello-slot-unfurl rounded-xl border border-slate-300/80 dark:border-slate-700/80 bg-slate-200/75 dark:bg-slate-800/60 shadow-none pointer-events-none select-none min-h-[84px]"

                          />

                        )}

                      </div>

                    );

                  })}

                </div>



                {/* Inline Quick Add Card - Trello Style */}

                {inlineAddingCol === col.id ? (

                  <div className="mt-1.5 rounded-xl border border-amber-400/80 bg-white dark:bg-slate-800 p-2 shadow-xs">

                    <textarea

                      autoFocus

                      value={inlineTitle}

                      onChange={(e) => setInlineTitle(e.target.value)}

                      onKeyDown={(e) => {

                        if (e.key === "Enter" && !e.shiftKey) {

                          e.preventDefault();

                          handleInlineAdd(col.id);

                        }

                        if (e.key === "Escape") setInlineAddingCol(null);

                      }}

                      rows={2}

                      placeholder="Nhập tiêu đề cho thẻ này..."

                      className="w-full resize-none border-none text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden bg-transparent"

                    />

                    <div className="flex items-center gap-1.5 pt-1">

                      <button

                        onClick={() => handleInlineAdd(col.id)}

                        className="rounded-lg bg-[#14161a] dark:bg-white px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xs"

                      >

                        Thêm thẻ

                      </button>

                      <button

                        onClick={() => setInlineAddingCol(null)}

                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"

                      >

                        <X size={16} />

                      </button>

                    </div>

                  </div>

                ) : (

                  <button

                    onClick={() => {

                      setInlineAddingCol(col.id);

                      setInlineTitle("");

                    }}

                    className="mt-1 flex w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-200/70 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"

                  >

                    <Plus size={15} />

                    <span>Thêm thẻ</span>

                  </button>

                )}

              </div>

            );

          })}

        </div>

      )}



      {/* ── TAB: MY TASKS (VIỆC CỦA TÔI) ─────────────────────────────────── */}

      {activeTab === "my-tasks" && (

        <KanbanMyTasksView

          tasks={tasks}

          currentUser={teamMembers[0]}

          onSelectTask={(task) => setSelectedTask(task)}

          onToggleComplete={handleToggleTaskComplete}

          onOpenAddTask={() => setIsNewTaskModalOpen(true)}

        />

      )}



      {/* ── TAB: TEAM & SCRUM ROLES (PHÂN VAI & ĐÓNG GÓP SCRUM) ───────────── */}

      {activeTab === "team" && (

        <KanbanTeamScrumView

          teamMembers={teamMembers}

          tasks={tasks}

          sprintStats={{ ...sprintStats, percentage: sprintStats.percentDone }}

          onManageMembers={() => setMemberModalOpen(true)}

          onFilterByMember={handleFilterByMember}

        />

      )}



      {/* ── TAB: ACTIVITY LOG & GIT STREAM (NHẬT KÝ HOẠT ĐỘNG) ─────────────── */}

      {activeTab === "activity" && (

        <KanbanActivityStreamView

          tasks={tasks}

          teamMembers={teamMembers}

          onSelectTask={(task) => setSelectedTask(task)}

        />

      )}



      {/* ── TAB 2: DEPENDENCIES & CONSTRAINT H2 GRAPH ────────────────────── */}

      {activeTab === "dependencies" && (

        <div key={`deps-view-${kanbanAnimKey}`} className="animate-screen-enter flex-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0f1219] p-6 shadow-xs overflow-y-auto">

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">

            <div>

              <h2 className="text-base font-bold text-slate-900 dark:text-white">

                Sơ đồ Ràng buộc Phụ thuộc Nhiệm vụ (Hard Constraint H2)

              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">

                Quy định thứ tự bàn giao: Task con chỉ được phép chuyển sang cột Done khi task tiền đề đã hoàn tất.

              </p>

            </div>

            <div className="flex items-center gap-2">

              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">

                <span className="w-2 h-2 rounded-full bg-[#f97316]" />

                Kiểm soát tự động bởi Backend Rule Engine

              </span>

            </div>

          </div>



          <div className="space-y-3.5 max-w-4xl">

            {tasks

              .filter((t) => t.dependsOn)

              .map((task) => {

                const parent = getTaskById(task.dependsOn!);

                const isParentDone = parent?.column === "done";

                return (

                  <div

                    key={task.id}

                    className="flex flex-col md:flex-row items-stretch md:items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#141824] p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"

                  >

                    {/* Thẻ tiền đề (Prerequisite) */}

                    <div

                      onClick={() => parent && setSelectedTask(parent)}

                      className="flex-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#1a202e] p-3.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"

                    >

                      <div className="flex items-center justify-between text-[11px] mb-1.5">

                        <span className="font-mono font-bold text-slate-500 dark:text-slate-400">#{parent?.code}</span>

                        <span

                          className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${

                            isParentDone

                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"

                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"

                          }`}

                        >

                          {parent?.column === "done" ? "Hoàn thành" : parent?.column === "in-progress" ? "Đang làm" : parent?.column || "Backlog"}

                        </span>

                      </div>

                      <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">{parent?.title}</p>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2">

                        <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[9px] font-bold shrink-0">

                          {parent?.assignee.avatar || parent?.assignee.name.charAt(0) || "U"}

                        </div>

                        <span className="truncate">{parent?.assignee.name}</span>

                      </div>

                    </div>



                    {/* Clean Connector Pill */}

                    <div className="flex md:flex-col items-center justify-center gap-1 shrink-0 px-1 py-1">

                      <div

                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-2xs ${

                          isParentDone

                            ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"

                            : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"

                        }`}

                      >

                        {isParentDone ? <Unlock size={12} className="stroke-[2.5]" /> : <Lock size={12} className="stroke-[2.5]" />}

                        <span>{isParentDone ? "Đã mở khóa" : "Chặn bởi H2"}</span>

                      </div>

                    </div>



                    {/* Thẻ phụ thuộc (Dependent) */}

                    <div

                      onClick={() => setSelectedTask(task)}

                      className="flex-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-[#1a202e] p-3.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"

                    >

                      <div className="flex items-center justify-between text-[11px] mb-1.5">

                        <span className="font-mono font-bold text-slate-500 dark:text-slate-400">#{task.code}</span>

                        <span

                          className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${

                            task.column === "done"

                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"

                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"

                          }`}

                        >

                          {task.column === "done" ? "Hoàn thành" : task.column === "in-progress" ? "Đang làm" : task.column}

                        </span>

                      </div>

                      <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">{task.title}</p>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2">

                        <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[9px] font-bold shrink-0">

                          {task.assignee.avatar || task.assignee.name.charAt(0) || "U"}

                        </div>

                        <span className="truncate">{task.assignee.name}</span>

                      </div>

                    </div>

                  </div>

                );

              })}

          </div>

        </div>

      )}



      {/* ── TAB 3: PROJECT OVERVIEW, BURNDOWN CHART & ANTI-FREERIDER DASHBOARD ──────────────────────── */}

      {activeTab === "analytics" && (

        <div key={`analytics-view-${kanbanAnimKey}`} className="animate-screen-enter flex-1 space-y-5 overflow-y-auto pr-1">

          {/* Header & Quick Action */}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs ">

            <div>

              <div className="flex items-center gap-2">

                <h2 className="text-base font-bold text-slate-900">

                  Báo cáo Tiến độ & Sức khỏe Dự án (Sprint Analytics)

                </h2>

                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200 flex items-center gap-1">

                  <Activity size={12} className="text-rose-600 animate-pulse" />

                  Burndown Chart Đường Đỏ

                </span>

              </div>

              <p className="text-xs text-slate-500 mt-0.5">

                Theo dõi đường cháy việc thực tế (Red line), vận tốc nhóm qua các Sprint và đóng góp của {teamMembers.length} thành viên.

              </p>

            </div>

            <div className="flex items-center gap-2">

              <button

                onClick={() => setHandbookOpen(true)}

                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"

              >

                <BookOpen size={13} />

                Tiêu chuẩn Scrum SS07

              </button>

              <button

                onClick={() => setMemberModalOpen(true)}

                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"

              >

                <UserPlus size={13} />

                Quản lý Thành viên

              </button>

            </div>

          </div>



          {/* 4 Summary KPI Cards (Xuất hiện lần lượt từng thẻ với số liệu nhảy tự động) */}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs animate-cascade-2 hover:shadow-md transition-all">

              <span className="text-[11px] font-medium text-slate-400 block mb-1">Tổng Điểm Sprint:</span>

              <div className="flex items-baseline gap-1.5">

                <span className="text-2xl font-black text-slate-900">

                  <AnimatedNumber value={sprintStats.totalPoints} trigger={analyticsAnimTrigger} key={`an-tp-${kanbanAnimKey}`} />

                </span>

                <span className="text-xs font-bold text-slate-500">Story Points</span>

              </div>

              <p className="text-[10px] text-slate-400 mt-1">Cam kết 9 tasks trong Sprint 1</p>

            </div>



            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs animate-cascade-3 hover:shadow-md transition-all">

              <span className="text-[11px] font-medium text-emerald-700 block mb-1">Đã Hoàn Thành (Done):</span>

              <div className="flex items-baseline gap-1.5">

                <span className="text-2xl font-black text-emerald-700">

                  <AnimatedNumber value={sprintStats.donePoints} trigger={analyticsAnimTrigger} key={`an-dp-${kanbanAnimKey}`} />

                </span>

                <span className="text-xs font-bold text-emerald-600">

                  pts (<AnimatedNumber value={sprintStats.percentDone} trigger={analyticsAnimTrigger} suffix="%" key={`an-pcd-${kanbanAnimKey}`} />)

                </span>

              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200/60">

                <div

                  style={{ width: analyticsAnimTrigger ? `${sprintStats.percentDone}%` : "0%" }}

                  className="h-full bg-emerald-500 transition-all duration-1000 ease-out"

                />

              </div>

            </div>



            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs animate-cascade-4 hover:shadow-md transition-all">

              <span className="text-[11px] font-medium text-rose-700 block mb-1">Điểm Còn Lại (Remaining):</span>

              <div className="flex items-baseline gap-1.5">

                <span className="text-2xl font-black text-rose-600">

                  <AnimatedNumber value={sprintStats.totalPoints - sprintStats.donePoints} trigger={analyticsAnimTrigger} key={`an-rp-${kanbanAnimKey}`} />

                </span>

                <span className="text-xs font-bold text-rose-600">pts (Đường Đỏ)</span>

              </div>

              <p className="text-[10px] text-rose-600/80 mt-1">Cần hoàn tất trước hạn 15/11</p>

            </div>



            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs animate-cascade-5 hover:shadow-md transition-all">

              <span className="text-[11px] font-medium text-amber-700 block mb-1">Vận tốc Sprint (Velocity):</span>

              <div className="flex items-baseline gap-1.5">

                <span className="text-2xl font-black text-amber-800">

                  <AnimatedNumber value={36.5} decimals={1} trigger={analyticsAnimTrigger} key={`an-v-${kanbanAnimKey}`} />

                </span>

                <span className="text-xs font-bold text-amber-700">SP / Sprint</span>

              </div>

              <p className="text-[10px] text-amber-700/80 mt-1">Đạt năng suất chuẩn công nghiệp</p>

            </div>

          </div>



          {/* Main Visuals Grid: Burndown Chart with Red Line + Velocity Chart */}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 ">

            {/* 1. SPRINT BURNDOWN CHART (7 cols) - REFINED CLASSIC */}

            <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">

              {/* Header: Exact Classic Structure as requested */}

              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">

                <div>

                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">

                    <TrendingDown size={16} className="text-rose-600" />

                    Biểu đồ Sprint Burndown Chart (Đường Cháy việc)

                  </h3>

                  <p className="text-[11px] text-slate-500 mt-0.5">

                    Mô hình hóa sự suy giảm khối lượng công việc theo từng ngày thực tế

                  </p>

                </div>



                {/* Legend */}

                <div className="flex items-center gap-3.5 text-xs font-medium">

                  <div className="flex items-center gap-1.5">

                    <span className="h-0.5 w-4 border-b-2 border-dashed border-slate-400" />

                    <span className="text-slate-500">Lý tưởng (Ideal)</span>

                  </div>

                  <div className="flex items-center gap-1.5">

                    <span className="h-1 w-4 rounded-full bg-rose-500" />

                    <span className="font-bold text-rose-600">Thực tế (Red Line)</span>

                  </div>

                </div>

              </div>



              {/* Refined SVG Chart with Clean Micro-Pills on Every Point */}

              <div className="relative w-full overflow-hidden rounded-xl bg-slate-50/50 p-2.5 border border-slate-100">

                <svg viewBox="0 0 500 215" className="w-full h-52 overflow-visible">

                  <defs>

                    <linearGradient id="refinedRedGradient" x1="0" y1="0" x2="0" y2="1">

                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.14" />

                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01" />

                    </linearGradient>

                  </defs>



                  {/* Horizontal Grid lines */}

                  <line x1="45" y1="25" x2="475" y2="25" stroke="#e2e8f0" strokeDasharray="3 3" />

                  <text x="35" y="29" textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="ui-monospace, monospace">40p</text>



                  <line x1="45" y1="65" x2="475" y2="65" stroke="#e2e8f0" strokeDasharray="3 3" />

                  <text x="35" y="69" textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="ui-monospace, monospace">30p</text>



                  <line x1="45" y1="105" x2="475" y2="105" stroke="#e2e8f0" strokeDasharray="3 3" />

                  <text x="35" y="109" textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="ui-monospace, monospace">20p</text>



                  <line x1="45" y1="145" x2="475" y2="145" stroke="#e2e8f0" strokeDasharray="3 3" />

                  <text x="35" y="149" textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="ui-monospace, monospace">10p</text>



                  <line x1="45" y1="185" x2="475" y2="185" stroke="#cbd5e1" strokeWidth="1.5" />

                  <text x="35" y="189" textAnchor="end" fontSize="10" fill="#64748b" fontFamily="ui-monospace, monospace" fontWeight="bold">0p</text>



                  {/* Vertical Day Grid Lines & Clean Labels */}

                  {[

                    { day: "N1 (25/10)", x: 45 },

                    { day: "N2 (27/10)", x: 116 },

                    { day: "N3 (29/10)", x: 188 },

                    { day: "N4 (31/10)", x: 260 },

                    { day: "N5 (02/11)", x: 331 },

                    { day: "N6 (Hôm nay)", x: 403, active: true },

                    { day: "N7 (Cuối)", x: 475 },

                  ].map((d, i) => (

                    <g key={i}>

                      <line x1={d.x} y1="25" x2={d.x} y2="185" stroke="#f1f5f9" />

                      <text

                        x={d.x}

                        y="202"

                        textAnchor="middle"

                        fontSize="9.5"

                        fill={d.active ? "#0f172a" : "#64748b"}

                        fontWeight={d.active ? "bold" : "normal"}

                      >

                        {d.day}

                      </text>

                    </g>

                  ))}



                  {/* IDEAL LINE (Grey Dashed) from (45, 33) down to (475, 185) */}

                  <line

                    x1="45"

                    y1="33"

                    x2="475"

                    y2="185"

                    stroke="#94a3b8"

                    strokeWidth="1.75"

                    strokeDasharray="5 5"

                  />



                  {/* ACTUAL RED LINE AREA FILL with smooth fade-in */}

                  <polygon

                    points="45,33 116,33 188,53 260,73 331,113 403,125 403,185 45,185"

                    fill="url(#refinedRedGradient)"

                    style={{

                      opacity: analyticsAnimTrigger ? 1 : 0,

                      transition: "opacity 1.2s ease-in-out",

                    }}

                  />



                  {/* ACTUAL RED LINE (ĐƯỜNG LINE MÀU ĐỎ SẮC NÉT VẼ ĐỘNG TỪ 0) */}

                  <polyline

                    fill="none"

                    stroke="#ef4444"

                    strokeWidth="3.25"

                    strokeLinecap="round"

                    strokeLinejoin="round"

                    points="45,33 116,33 188,53 260,73 331,113 403,125"

                    strokeDasharray="600"

                    strokeDashoffset={analyticsAnimTrigger ? "0" : "600"}

                    style={{

                      transition: "stroke-dashoffset 1.3s cubic-bezier(0.16, 1, 0.3, 1)",

                    }}

                  />



                  {/* Refined Points with Sleek Micro-Pills (38p, 38p, 33p, 28p, 18p, 15p) */}

                  {[

                    { x: 45, y: 33, val: "38p" },

                    { x: 116, y: 33, val: "38p" },

                    { x: 188, y: 53, val: "33p" },

                    { x: 260, y: 73, val: "28p" },

                    { x: 331, y: 113, val: "18p" },

                    { x: 403, y: 125, val: "15p", active: true },

                  ].map((pt, i) => (

                    <g key={i} className="cursor-pointer">

                      {/* Active pulse for today */}

                      {pt.active && (

                        <circle cx={pt.x} cy={pt.y} r="8" fill="#ef4444" opacity="0.25" className="animate-ping" />

                      )}



                      {/* Crisp Node with White Center and Red Ring */}

                      <circle

                        cx={pt.x}

                        cy={pt.y}

                        r={pt.active ? "5" : "4"}

                        fill="#ffffff"

                        stroke="#ef4444"

                        strokeWidth="2.5"

                      />



                      {/* Refined Micro-Pill Badge Floating Above (Chữ nhật bo cong tinh tế) */}

                      <rect

                        x={pt.x - 14}

                        y={pt.y - 19}

                        width="28"

                        height="15"

                        rx="7.5"

                        fill={pt.active ? "#ef4444" : "#1e293b"}

                        stroke={pt.active ? "#ffffff" : "transparent"}

                        strokeWidth="1"

                        className="shadow-xs"

                      />

                      <text

                        x={pt.x}

                        y={pt.y - 8.5}

                        textAnchor="middle"

                        fontSize="9"

                        fill="#ffffff"

                        fontWeight="bold"

                        fontFamily="ui-monospace, monospace"

                      >

                        {pt.val}

                      </text>

                    </g>

                  ))}

                </svg>

              </div>



              {/* Status Ribbon below chart */}

              <div className="mt-3 flex items-center justify-between text-xs rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-2">

                <div className="flex items-center gap-2 text-slate-700">

                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs shrink-0" />

                  <span className="font-medium text-[11px]">

                    <strong className="text-slate-900">Đánh giá Sprint:</strong> Đường đỏ thực tế dốc đúng quỹ đạo, còn 15 Story Points cần đóng gói.

                  </span>

                </div>

                <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full text-[11px]">

                  Hiệu suất 94%

                </span>

              </div>

            </div>



            {/* 2. MEMBER CONTRIBUTION DONUT CHART & EPIC DISTRIBUTION (5 cols) */}

            <div className="lg:col-span-5 space-y-4">

              {/* Biểu đồ tròn Donut Chart Đóng góp Thành viên (Anti-Freerider) */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">

                <div className="flex items-center justify-between mb-3.5">

                  <div>

                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">

                      <PieChart size={14} className="text-blue-600" />

                      Tỉ lệ Đóng góp Thành viên (Anti-Freerider)

                    </h4>

                    <p className="text-[11px] text-slate-500 mt-0.5">

                      Biểu đồ tròn đo lường mức độ gánh team & hoàn thành Story Points

                    </p>

                  </div>

                  <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">

                    Donut Chart

                  </span>

                </div>



                {/* Donut Chart with animated SVG segments & legend */}

                <ContributionDonutChart

                  teamMembers={teamMembers}

                  contribution={contribution}

                  totalDonePoints={sprintStats.donePoints}

                  trigger={analyticsAnimTrigger}

                />

              </div>



              {/* Epic Distribution */}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">

                <h4 className="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">

                  <Layers size={14} className="text-purple-600" />

                  Cơ cấu Phân bổ Story Points theo Epic

                </h4>

                <div className="grid grid-cols-2 gap-2 text-[11px]">

                  <div className="rounded-lg bg-blue-50/60 p-2 border border-blue-100">

                    <span className="text-blue-700 font-bold block">Architecture (H4)</span>

                    <span className="text-slate-500">10 pts (Done 100%)</span>

                  </div>

                  <div className="rounded-lg bg-purple-50/60 p-2 border border-purple-100">

                    <span className="text-purple-700 font-bold block">Documentation</span>

                    <span className="text-slate-500">8 pts (Done 100%)</span>

                  </div>

                  <div className="rounded-lg bg-amber-50/60 p-2 border border-amber-100">

                    <span className="text-amber-700 font-bold block">Code Grader Sandbox</span>

                    <span className="text-slate-500">5 pts (In Progress)</span>

                  </div>

                  <div className="rounded-lg bg-teal-50/60 p-2 border border-teal-100">

                    <span className="text-teal-700 font-bold block">AI Defense Room</span>

                    <span className="text-slate-500">8 pts (Ready)</span>

                  </div>

                </div>

              </div>

            </div>

          </div>



          {/* Bottom Section: Dynamic Anti-Freerider Member Cards */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">

            <div className="mb-4 flex items-center justify-between">

              <div>

                <h3 className="text-sm font-bold text-slate-900">

                  Báo cáo Đóng góp Cá nhân (Thuật toán Anti-Freerider)

                </h3>

                <p className="text-xs text-slate-500">

                  Đánh giá minh bạch và khách quan hiệu quả làm việc của từng thành viên

                </p>

              </div>

              <span className="text-[11px] font-semibold text-slate-400">

                Chống ỷ lại & Gánh team

              </span>

            </div>



            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {teamMembers.map((member) => {

                const stat = contribution[member.name];

                const percent = stat?.percent || 0;

                const points = stat?.donePts || 0;

                const doneCount = stat?.tasksDone || 0;



                const grade =

                  percent >= 40

                    ? "A+ (Xuất sắc)"

                    : percent >= 25

                    ? "A (Rất tốt)"

                    : percent >= 15

                    ? "B+ (Đạt yêu cầu)"

                    : "Cảnh báo (Thiếu đóng góp)";



                return (

                  <div key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-xs">

                    <div className="flex items-center gap-3 mb-3">

                      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white font-bold text-xs shadow-sm ${member.color}`}>

                        {member.avatar}

                      </span>

                      <div>

                        <h4 className="font-bold text-slate-900 text-xs">{member.name}</h4>

                        <p className="text-[11px] text-slate-500">{member.role}</p>

                      </div>

                    </div>



                    <div className="space-y-2 border-t border-slate-200/70 pt-2.5 text-[11px]">

                      <div className="flex justify-between">

                        <span className="text-slate-500">Tỷ lệ đóng góp:</span>

                        <span className="font-bold text-slate-900"><AnimatedNumber value={percent} trigger={analyticsAnimTrigger} suffix="%" /></span>

                      </div>

                      <div className="flex justify-between">

                        <span className="text-slate-500">Story Points hoàn thành:</span>

                        <span className="font-mono font-bold text-slate-900"><AnimatedNumber value={points} trigger={analyticsAnimTrigger} suffix=" pts" /></span>

                      </div>

                      <div className="flex justify-between">

                        <span className="text-slate-500">Số task đã Done:</span>

                        <span className="font-bold text-slate-900"><AnimatedNumber value={doneCount} trigger={analyticsAnimTrigger} suffix=" tasks" /></span>

                      </div>

                      <div className="flex justify-between">

                        <span className="text-slate-500">Đánh giá hệ thống:</span>

                        <span className={`font-bold ${percent >= 25 ? "text-emerald-600" : "text-amber-600"}`}>

                          {grade}

                        </span>

                      </div>

                    </div>

                  </div>

                );

              })}

            </div>

          </div>

        </div>

      )}



      {/* ── MANAGE TEAM MEMBERS MODAL ────────────────────────────────────── */}

      {memberModalOpen && (

        <div onClick={handleCloseMemberModal} className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 ${isMemberModalClosing ? "marlo-scrim-out" : "marlo-scrim"}`}>

          <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl ${isMemberModalClosing ? "marlo-modal-out" : "marlo-modal"}`}>

            

          

            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">

              <div className="flex items-center gap-2.5">

                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">

                  <Users size={18} />

                </span>

                <div>

                  <h3 className="text-base font-bold text-slate-900">Quản lý Thành viên Nhóm</h3>

                  <p className="text-xs text-slate-500">Thêm hoặc bớt thành viên để AI phân rã chuẩn</p>

                </div>

              </div>

              <button onClick={handleCloseMemberModal} className="text-slate-400 hover:text-slate-600">

                <X size={18} />

              </button>

            </div>



            {/* Members List */}

            <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">

              {teamMembers.map((m) => (

                <div

                  key={m.id}

                  className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5 bg-slate-50/50"

                >

                  <div className="flex items-center gap-2.5">

                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white text-[11px] font-bold ${m.color}`}>

                      {m.avatar}

                    </span>

                    <div>

                      <p className="text-xs font-bold text-slate-800">{m.name}</p>

                      <p className="text-[10px] text-slate-500">{m.role}</p>

                    </div>

                  </div>

                  {teamMembers.length > 1 && (

                    <button

                      onClick={() => handleRemoveMember(m.id)}

                      className="p-1 text-slate-400 hover:text-rose-600 transition"

                      title="Xóa thành viên"

                    >

                      <Trash2 size={14} />

                    </button>

                  )}

                </div>

              ))}

            </div>



            {/* Add New Member Input */}

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5 space-y-2.5 mb-5">

              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">

                <UserPlus size={14} className="text-amber-500" /> Thêm thành viên mới:

              </span>

              <div className="space-y-2">

                <input

                  type="text"

                  value={newMemberName}

                  onChange={(e) => setNewMemberName(e.target.value)}

                  placeholder="Họ và tên (ví dụ: Nguyễn Văn Nam)"

                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500 focus:outline-hidden"

                />

                <input

                  type="text"

                  value={newMemberRole}

                  onChange={(e) => setNewMemberRole(e.target.value)}

                  placeholder="Vai trò (ví dụ: DevOps / UI Designer)"

                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:border-amber-500 focus:outline-hidden"

                />

              </div>

              <button

                onClick={handleAddMember}

                disabled={!newMemberName.trim()}

                className="w-full rounded-xl bg-[#14161a] dark:bg-white py-1.5 text-xs font-semibold text-white dark:text-slate-950 shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 cursor-pointer"

              >

                + Thêm vào Nhóm

              </button>

            </div>



            <div className="flex justify-end">

              <button

                onClick={handleCloseMemberModal}

                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"

              >

                Hoàn tất

              </button>

            </div>

          </div>

        </div>

      )}



      {/* ── HARD CONSTRAINT H2 VIOLATION ALERT MODAL ──────────────────────── */}

      {h2Violation && (

        <div onClick={handleCloseH2Violation} className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 ${isH2ViolationClosing ? "marlo-scrim-out" : "marlo-scrim"}`}>

          <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl ${isH2ViolationClosing ? "marlo-modal-out" : "marlo-modal"}`}>

            

          

            <div className="mb-4 flex items-center gap-3.5">

              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-sm">

                <ShieldAlert size={28} />

              </span>

              <div>

                <h3 className="text-base font-bold text-slate-900">

                  Ràng buộc Cứng H2 Bị Vi Phạm!

                </h3>

                <p className="text-xs font-semibold text-rose-600">

                  Task Dependency Constraint Blocked

                </p>

              </div>

            </div>



            <p className="mb-4 text-xs leading-relaxed text-slate-600">

              Hệ thống không cho phép kéo thẻ <strong>"{h2Violation.task.title}"</strong> sang cột <strong>Done</strong> vì thẻ tiền đề sau đây vẫn chưa hoàn thành:

            </p>



            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-4">

              <div className="flex items-center justify-between text-xs font-semibold text-rose-900">

                <span>Thẻ tiền đề: #{h2Violation.blockingTask.code}</span>

                <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700 shadow-2xs">

                  Hiện ở: {h2Violation.blockingTask.column}

                </span>

              </div>

              <p className="mt-1.5 text-xs font-bold text-rose-800">

                {h2Violation.blockingTask.title}

              </p>

              <p className="mt-1.5 text-[11px] text-slate-600">

                Người phụ trách: <strong>{h2Violation.blockingTask.assignee.name}</strong> ({h2Violation.blockingTask.assignee.role})

              </p>

            </div>



            <p className="mb-5 text-[11px] text-slate-500 italic">

              * Quy tắc H2 trong đồ án đảm bảo mã nguồn và module được tích hợp tuần tự, triệt tiêu nguy cơ xung đột (merge conflicts) giữa các bạn trong nhóm.

            </p>



            <div className="flex justify-end">

              <button

                onClick={handleCloseH2Violation}

                className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"

              >

                Đã hiểu, tôi sẽ hoàn thành task tiền đề trước

              </button>

            </div>

          </div>

        </div>

      )}



      {/* ── UPGRADED AI WBS STUDIO (DYNAMIC TEAM & EXPANDED STACKS) ──────── */}

      {aiModalOpen && (

        <div onClick={handleCloseAiModal} className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 ${isAiModalClosing ? "marlo-scrim-out" : "marlo-scrim"}`}>

          <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#181d29] p-6 shadow-2xl max-h-[90vh] flex flex-col ${isAiModalClosing ? "marlo-modal-out" : "marlo-modal"}`}>

            

          

            {/* Header */}

            <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">

              <div className="flex items-center gap-3">



                <div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">

                    AI Task Decomposition Studio (WBS Generator)

                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400">

                    {aiStage === "input"

                      ? "Cung cấp đủ ngữ cảnh kỹ thuật & phân bổ thành viên linh hoạt"

                      : "Xem trước, tùy chỉnh người phụ trách và xác nhận trước khi nạp vào Backlog"}

                  </p>

                </div>

              </div>

              <button

                onClick={() => {

                  setAiModalOpen(false);

                  setAiStage("input");

                }}

                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"

              >

                <X size={18} />

              </button>

            </div>



            {/* STAGE 1: GUIDED STRUCTURED INPUTS */}

            {aiStage === "input" && (

              <div className="flex-1 overflow-y-auto pr-1 space-y-4">

                {/* 1-Click Presets */}

                <div>

                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">

                    Chọn nhanh mẫu đồ án thực tế (1-Click Presets):

                  </label>

                  <div className="grid grid-cols-2 gap-2">

                    {aiPresets.map((preset) => (

                      <button

                        key={preset.name}

                        type="button"

                        onClick={() => {

                          setAiFeatureName(preset.name);

                          setAiDescription(preset.desc);

                          setAiStack(preset.stack);

                          setAiGranularity(preset.count);

                        }}

                        className={`rounded-xl border p-2.5 text-left transition ${

                          aiFeatureName === preset.name

                            ? "border-slate-900 bg-slate-100/90 dark:border-slate-300 dark:bg-slate-800 shadow-2xs font-semibold"

                            : "border-slate-200/90 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100/50 dark:border-slate-800 dark:bg-slate-900/50"

                        }`}

                      >

                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-0.5">

                          <span>{preset.name}</span>

                          <span className="text-[10px] uppercase font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.5 rounded">

                            {preset.stack}

                          </span>

                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{preset.desc}</p>

                      </button>

                    ))}

                  </div>

                </div>



                {/* Feature Name */}

                <div>

                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">

                    Tên Tính năng / Module nghiệp vụ: <span className="text-rose-500">*</span>

                  </label>

                  <input

                    type="text"

                    value={aiFeatureName}

                    onChange={(e) => setAiFeatureName(e.target.value)}

                    placeholder="Ví dụ: Docker Sandbox Code Runner, Socratic AI Tutor, AI Defense Room..."

                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-slate-900 dark:focus:border-slate-300 focus:outline-hidden bg-white dark:bg-slate-800"

                  />

                </div>



                {/* Dynamic Team Members Selection */}

                <div>

                  <div className="flex items-center justify-between mb-1.5">

                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">

                      Thành viên tham gia thực hiện ({aiSelectedMemberIds.length}/{teamMembers.length} người):

                    </label>

                    <div className="flex items-center gap-2">

                      <button

                        type="button"

                        onClick={() => {

                          if (aiSelectedMemberIds.length === teamMembers.length) {

                            setAiSelectedMemberIds([]);

                          } else {

                            setAiSelectedMemberIds(teamMembers.map((m) => m.id));

                          }

                        }}

                        className="text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"

                      >

                        {aiSelectedMemberIds.length === teamMembers.length ? "Bỏ chọn hết" : "Chọn tất cả"}

                      </button>

                      <span className="text-slate-300 dark:text-slate-600">|</span>

                      <button

                        type="button"

                        onClick={() => setMemberModalOpen(true)}

                        className="text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"

                      >

                        <UserPlus size={12} /> Quản lý danh sách

                      </button>

                    </div>

                  </div>

                  <div className="flex flex-wrap gap-2">

                    {teamMembers.map((m) => {

                      const isSelected = aiSelectedMemberIds.includes(m.id);

                      return (

                        <button

                          key={m.id}

                          type="button"

                          onClick={() => {

                            setAiSelectedMemberIds((prev) =>

                              isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]

                            );

                          }}

                          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${

                            isSelected

                              ? "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-semibold ring-1 ring-slate-900/10 dark:ring-white/10"

                              : "border-slate-200/80 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 hover:border-slate-300"

                          }`}

                        >

                          <span className={`h-2.5 w-2.5 rounded-full ${m.color} shrink-0`} />

                          <span>{m.name}</span>

                          <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-normal">({m.role})</span>

                        </button>

                      );

                    })}

                  </div>

                </div>



                {/* Tech Specs Description */}

                <div>

                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">

                    Yêu cầu kỹ thuật & Tiêu chí nghiệm thu (Acceptance Criteria):

                  </label>

                  <textarea

                    value={aiDescription}

                    onChange={(e) => setAiDescription(e.target.value)}

                    rows={2}

                    placeholder="Mô tả cụ thể: input/output, giới hạn thời gian (timeout 2s), các trường hợp ngoại lệ..."

                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-slate-900 dark:focus:border-slate-300 focus:outline-hidden bg-white dark:bg-slate-800"

                  />

                </div>



                {/* Tech Stack & Granularity */}

                <div className="grid grid-cols-2 gap-3.5">

                  <div>

                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">

                      Tầng kiến trúc & Công nghệ:

                    </label>

                    <CustomSelect

                      value={aiStack}

                      onChange={(val) => setAiStack(val as TechStackKey)}

                      options={techStackOptions.map((opt) => ({

                        value: opt.value,

                        label: opt.label,

                        sublabel: opt.defaultDesc,

                      }))}

                      placeholder="Chọn tầng kiến trúc..."

                      className="w-full"

                      buttonClassName="w-full py-2 bg-slate-50/50"

                      menuClassName="w-80"

                    />

                  </div>



                  <div>

                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">

                      Độ chi tiết phân rã:

                    </label>

                    <CustomSelect

                      value={aiGranularity}

                      onChange={(val) => setAiGranularity(Number(val))}

                      options={granularityOptions.map((opt) => ({

                        value: opt.value,

                        label: opt.label,

                      }))}

                      placeholder="Chọn độ chi tiết..."

                      className="w-full"

                      buttonClassName="w-full py-2 bg-slate-50/50"

                      menuClassName="w-80"

                    />

                  </div>

                </div>



                {/* Custom Tech Stack Input if selected "custom" */}

                {aiStack === "custom" && (

                  <div>

                    <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">

                      Nhập công nghệ tùy chỉnh:

                    </label>

                    <input

                      type="text"

                      value={aiCustomTech}

                      onChange={(e) => setAiCustomTech(e.target.value)}

                      placeholder="Ví dụ: FastAPI + Docker Sandbox + WebSocket + PostgreSQL..."

                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-slate-900 dark:focus:border-slate-300 focus:outline-hidden"

                    />

                  </div>

                )}



                {/* Constraints Checklist */}

                <div className="rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 text-xs">

                  <span className="font-bold text-slate-900 dark:text-white block mb-2">

                    Các quy tắc kỹ nghệ tự động áp dụng:

                  </span>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">

                    <label className="flex items-center gap-1.5 cursor-pointer">

                      <input

                        type="checkbox"

                        checked={aiIncludeH2}

                        onChange={(e) => setAiIncludeH2(e.target.checked)}

                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"

                      />

                      <span>Tự động liên kết Ràng buộc cứng H2</span>

                    </label>

                    <label className="flex items-center gap-1.5">

                      <input type="checkbox" checked readOnly className="rounded border-slate-300 text-slate-900" />

                      <span>Chia đều cho các thành viên được chọn</span>

                    </label>

                    <label className="flex items-center gap-1.5">

                      <input type="checkbox" checked readOnly className="rounded border-slate-300 text-slate-900" />

                      <span>Ước lượng thời gian nguyên tử (2 - 5 giờ)</span>

                    </label>

                    <label className="flex items-center gap-1.5">

                      <input type="checkbox" checked readOnly className="rounded border-slate-300 text-slate-900" />

                      <span>Cho phép xem lại trước khi chốt nạp</span>

                    </label>

                  </div>

                </div>

              </div>

            )}



            {/* STAGE 2: PREVIEW & CUSTOMIZE BEFORE CONFIRMING */}

            {aiStage === "preview" && (

              <div className="flex-1 overflow-y-auto pr-1 space-y-3">

                <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-700">

                  <span className="font-semibold text-slate-900 dark:text-white">

                    AI đã phân rã thành công {aiPreviewTasks.length} task nguyên tử:

                  </span>

                  <span className="text-[11px] text-slate-500 dark:text-slate-400">

                    Bạn có thể đổi người làm hoặc số giờ trước khi nạp

                  </span>

                </div>



                <div className="space-y-2.5">

                  {aiPreviewTasks.map((pt, idx) => (

                    <div

                      key={pt.id}

                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 shadow-2xs space-y-2"

                    >

                      <div className="flex items-center justify-between gap-2">

                        <div className="flex items-center gap-2 flex-1">

                          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700">

                            #{pt.code}

                          </span>

                          <input

                            type="text"

                            value={pt.title}

                            onChange={(e) => {

                              const updated = [...aiPreviewTasks];

                              updated[idx].title = e.target.value;

                              setAiPreviewTasks(updated);

                            }}

                            className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-slate-900 focus:outline-hidden"

                          />

                        </div>

                        {pt.dependsOn && (

                          <span className="text-[10px] font-medium text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">

                            H2 Phụ thuộc Task #{idx}

                          </span>

                        )}

                      </div>



                      <div className="grid grid-cols-3 gap-2.5 text-xs">

                        <div>

                          <span className="text-[10px] text-slate-400 block mb-0.5">Phụ trách:</span>

                          <CustomSelect

                            value={pt.assignee.name}

                            onChange={(name) => {

                              const updated = [...aiPreviewTasks];

                              const targetMember = teamMembers.find((m) => m.name === name);

                              updated[idx].assignee = {

                                name,

                                avatar: targetMember?.avatar || "DEV",

                                role: targetMember?.role || "Developer",

                              };

                              setAiPreviewTasks(updated);

                            }}

                            options={teamMembers.map((m) => ({

                              value: m.name,

                              label: `${m.name} (${m.role})`,

                              icon: (

                                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${getAssigneeAvatarColor(m.name, m.color)}`}>

                                  {m.avatar}

                                </span>

                              ),

                            }))}

                            className="w-full"

                            buttonClassName="w-full py-1 text-[11px]"

                            menuClassName="w-56"

                          />

                        </div>



                        <div>

                          <span className="text-[10px] text-slate-400 block mb-0.5">Story Points:</span>

                          <CustomSelect

                            value={pt.points}

                            onChange={(val) => {

                              const updated = [...aiPreviewTasks];

                              updated[idx].points = Number(val);

                              setAiPreviewTasks(updated);

                            }}

                            options={[

                              { value: 1, label: "1 Point" },

                              { value: 2, label: "2 Points" },

                              { value: 3, label: "3 Points" },

                              { value: 5, label: "5 Points" },

                              { value: 8, label: "8 Points" },

                            ]}

                            className="w-full"

                            buttonClassName="w-full py-1 text-[11px]"

                            menuClassName="w-40"

                          />

                        </div>



                        <div>

                          <span className="text-[10px] text-slate-400 block mb-0.5">Thời lượng (giờ):</span>

                          <input

                            type="number"

                            step="0.5"

                            value={pt.estimateHours}

                            onChange={(e) => {

                              const updated = [...aiPreviewTasks];

                              updated[idx].estimateHours = Number(e.target.value);

                              setAiPreviewTasks(updated);

                            }}

                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"

                          />

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            )}



            {/* Modal Footer */}

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">

              {aiStage === "preview" ? (

                <>

                  <button

                    onClick={() => setAiStage("input")}

                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"

                  >

                    <span>⬅️ Chỉnh sửa lại đầu vào</span>

                  </button>

                  <button

                    onClick={confirmAiTasks}

                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"

                  >

                    <CheckCircle2 size={15} />

                    <span>Xác nhận nạp {aiPreviewTasks.length} thẻ vào Backlog</span>

                  </button>

                </>

              ) : (

                <>

                  <button

                    onClick={handleCloseAiModal}

                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"

                  >

                    Đóng

                  </button>

                  <button

                    disabled={aiGenerating || !aiFeatureName.trim() || aiSelectedMemberIds.length === 0}

                    onClick={handleGenerateWbs}

                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-xs font-semibold shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 cursor-pointer transition-colors"

                  >

                    {aiGenerating ? (

                      <>

                        <Sparkles size={14} className="animate-spin" />

                        <span>Đang phân rã WBS...</span>

                      </>

                    ) : (

                      <>

                        <Bot size={14} />

                        <span>Phân rã & Xem trước (Preview)</span>

                      </>

                    )}

                  </button>

                </>

              )}

            </div>

          </div>

        </div>

      )}



      {/* ── TASK DETAIL DRAWER (AUTHENTIC MARLO 3-ZONE FLOATING DRAWER) ────────────────── */}

      <MarloTaskDrawer

        task={selectedTask}

        teamMembers={teamMembers}

        onClose={() => setSelectedTask(null)}

        onUpdateTask={(updated) => {

          const prevTask = tasks.find((t) => t.id === updated.id);

          let safeUpdated = updated;

          if (

            updated.column === "done" &&

            prevTask?.column !== "done" &&

            updated.dependsOn

          ) {

            const parent = getTaskById(updated.dependsOn);

            if (parent && parent.column !== "done") {

              safeUpdated = {

                ...updated,

                column: prevTask?.column || "ready",

              };

            }

          }

          setTasks((prev) => prev.map((t) => (t.id === safeUpdated.id ? safeUpdated : t)));

          setSelectedTask(safeUpdated);

          void updateWorkspaceTaskApi(safeUpdated.id, {

            checklist: safeUpdated.checklist,

            definitionOfDone: safeUpdated.definitionOfDone,

            assignee: safeUpdated.assignee,

            title: safeUpdated.title,

            description: safeUpdated.description,

            priority: safeUpdated.priority,

          });

        }}

        onDeleteTask={(taskToDelete) => {

          handleDeleteTask(taskToDelete);

          setSelectedTask(null);

        }}

        onMoveColumn={(taskId, col) => {

          const task = tasks.find((t) => t.id === taskId);

          if (col === "done" && task?.dependsOn) {

            const parent = getTaskById(task.dependsOn);

            if (parent && parent.column !== "done") {

              setH2Violation({ task, blockingTask: parent });

              return;

            }

          }

          moveTask(taskId, col);

          setSelectedTask((prev) => (prev ? { ...prev, column: col } : null));

        }}

      />



      {/* Teacher Standard CSV Manager Modal */}

      <TaskCsvManagerModal

        isOpen={csvModalOpen}

        onClose={() => setCsvModalOpen(false)}

        tasks={tasks}

        teamMembers={teamMembers}

        onImportTasks={handleImportCsvTasks}

      />



      {/* ── Marlo Authentic New Task Modal (With Integrated Checklist) ── */}

      <MarloNewTaskModal

        isOpen={isNewTaskModalOpen}

        onClose={() => setIsNewTaskModalOpen(false)}

        onAddTask={(newTask) => {

          const targetProj = projects.find((p) => p.name === newTask.epic);

          const targetProjId = targetProj?.id || currentProjectId;

          setProjects((prevProjects) =>

            prevProjects.map((proj) =>

              proj.id === targetProjId

                ? { ...proj, tasks: [newTask, ...(proj.tasks || [])] }

                : proj

            )

          );

          if (targetProjId === currentProjectId) {

            setSelectedTask(newTask); // Open drawer so user can inspect their newly created task immediately!

            setJustDroppedTaskId(newTask.id);

            if (justDroppedTimerRef.current) clearTimeout(justDroppedTimerRef.current);

            justDroppedTimerRef.current = setTimeout(() => {

              setJustDroppedTaskId(null);

            }, 600);

          }

          void createWorkspaceTaskApi(targetProjId, newTask);

        }}

        teamMembers={teamMembers}

        currentProjectName={currentProject?.name}

        projects={projects.map((p) => ({ id: p.id, name: p.name }))}

      />



      {/* ── ENGINEERING & AGILE SCRUM HANDBOOK MODAL (RIKKEI EDUCATION SYLLABUS) ────────── */}

      {handbookOpen && (

        <div onClick={handleCloseHandbook} className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 ${isHandbookClosing ? "marlo-scrim-out" : "marlo-scrim"}`}>

          <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#11141c] p-6 shadow-2xl overflow-hidden ${isHandbookClosing ? "marlo-modal-out" : "marlo-modal"}`}>

            {/* Header */}

            <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3.5">

              <div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">

                  Cẩm nang Kỹ nghệ Phần mềm & Agile Scrum

                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">

                  Đúc kết bộ bài giảng Phân tích thiết kế hệ thống & Scrum (Rikkei Education) cho Đề án CodeMind

                </p>

              </div>

              <button

                onClick={handleCloseHandbook}

                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"

              >

                <X size={18} />

              </button>

            </div>



            {/* Tab Switcher */}

            <div className="mb-4 flex rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-[#171c28] p-1">

              <button

                onClick={() => setHandbookTab("scrum")}

                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${

                  handbookTab === "scrum"

                    ? "bg-white dark:bg-[#232a3c] text-slate-900 dark:text-white shadow-2xs font-bold"

                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"

                }`}

              >

                1. Quy trình Agile / Scrum (SS02 - SS09)

              </button>

              <button

                onClick={() => setHandbookTab("pttk")}

                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${

                  handbookTab === "pttk"

                    ? "bg-white dark:bg-[#232a3c] text-slate-900 dark:text-white shadow-2xs font-bold"

                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"

                }`}

              >

                2. Phân tích Thiết kế Hệ thống & UML (SS01 - SS17)

              </button>

            </div>



            {/* Handbook Content Body */}

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs text-slate-700 dark:text-slate-300">

              {handbookTab === "scrum" ? (

                <>

                  {/* Pillar 1: 3 Trụ cột & 3 Vai trò */}

                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#141824] p-4 space-y-3">

                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">

                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">1</span>

                      3 Trụ cột Scrum & 3 Vai trò Cốt lõi (Session 02)

                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white">Minh bạch (Transparency)</p>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Mọi task, blocker H2 và story points đều hiển thị công khai trên Kanban.</p>

                      </div>

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white">Thanh tra (Inspection)</p>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Thường xuyên kiểm tra tiến độ, burn-down velocity và chất lượng mã nguồn.</p>

                      </div>

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white">Thích nghi (Adaptation)</p>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sẵn sàng điều chỉnh kế hoạch Sprint khi có góp ý từ Hội đồng Phản biện.</p>

                      </div>

                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">

                      <strong className="text-slate-700 dark:text-slate-300">3 Vai trò:</strong> Product Owner (Định hướng sản phẩm), Scrum Master (Điều phối, gỡ bỏ blocker), Developers (Đội ngũ kỹ thuật).

                    </p>

                  </div>



                  {/* Pillar 2: D.E.E.P Backlog & INVEST User Story */}

                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#141824] p-4 space-y-3">

                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">

                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">2</span>

                      Tiêu chuẩn D.E.E.P cho Product Backlog & INVEST cho User Story (Session 03)

                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white mb-1.5">Tiêu chuẩn D.E.E.P Backlog:</p>

                        <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">

                          <li><strong>D</strong>etailed appropriately: Task đỉnh chi tiết, đáy là Epic</li>

                          <li><strong>E</strong>stimated: Toàn bộ thẻ đều có điểm Fibonacci</li>

                          <li><strong>E</strong>mergent: Backlog liên tục tiến hóa theo Sprint</li>

                          <li><strong>P</strong>rioritized: Luôn ưu tiên theo mức độ quan trọng</li>

                        </ul>

                      </div>

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white mb-1.5">Tiêu chuẩn INVEST User Story:</p>

                        <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">

                          <li><strong>I</strong>ndependent: Độc lập tối đa giữa các Story</li>

                          <li><strong>N</strong>egotiable: Có thể thương lượng phạm vi</li>

                          <li><strong>V</strong>aluable: Mang lại giá trị cho người dùng cuối</li>

                          <li><strong>E</strong>stimable: Đội ngũ có thể ước lượng được</li>

                          <li><strong>S</strong>mall: Kích thước vừa vặn cho 1 Sprint (2-5h)</li>

                          <li><strong>T</strong>estable: Có tiêu chí nghiệm thu kiểm thử được</li>

                        </ul>

                      </div>

                    </div>

                  </div>



                  {/* Pillar 3: MoSCoW & Gherkin vs DoD */}

                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#141824] p-4 space-y-3">

                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">

                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">3</span>

                      Phân loại MoSCoW & Cú pháp Gherkin vs Definition of Done (Session 05)

                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] border border-slate-200/80 dark:border-slate-700/60 p-2.5 shadow-2xs">

                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">

                          <span className="w-2 h-2 rounded-full bg-rose-500" />

                          <span>M · Must Have</span>

                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Bắt buộc hoàn thành</p>

                      </div>

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] border border-slate-200/80 dark:border-slate-700/60 p-2.5 shadow-2xs">

                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">

                          <span className="w-2 h-2 rounded-full bg-amber-500" />

                          <span>S · Should Have</span>

                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Nên có trong bản MVP</p>

                      </div>

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] border border-slate-200/80 dark:border-slate-700/60 p-2.5 shadow-2xs">

                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">

                          <span className="w-2 h-2 rounded-full bg-sky-500" />

                          <span>C · Could Have</span>

                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Gia tăng trải nghiệm</p>

                      </div>

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] border border-slate-200/80 dark:border-slate-700/60 p-2.5 shadow-2xs">

                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">

                          <span className="w-2 h-2 rounded-full bg-slate-400" />

                          <span>W · Won't Have</span>

                        </div>

                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Dời sang giai đoạn sau</p>

                      </div>

                    </div>

                    <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 text-[11px] leading-relaxed shadow-2xs">

                      <span className="font-bold text-slate-900 dark:text-white">Phân biệt AC và DoD: </span>

                      <span className="text-slate-600 dark:text-slate-300">

                        <strong>AC (Acceptance Criteria)</strong> là tiêu chí nghiệm thu riêng cho từng Story (Given - When - Then). Còn <strong>DoD (Definition of Done)</strong> là tiêu chuẩn kỹ thuật chung bắt buộc cho MỌI task (100% test pass, Clean 3 tầng, Lint pass, Review PR).

                      </span>

                    </div>

                  </div>



                  {/* Pillar 4: Fibonacci & Retro 5 Bước */}

                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#141824] p-4 space-y-3">

                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">

                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">4</span>

                      Dãy Fibonacci (1, 2, 3, 5, 8) & Quy trình 5 Bước Retrospective (Session 07, 09)

                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">

                      Dãy số Fibonacci phản ánh độ bất định tăng phi tuyến tính. Task trên 8 Story Points bắt buộc phải chẻ nhỏ (WBS) để kiểm soát rủi ro.

                    </p>

                    <div className="rounded-xl bg-white dark:bg-[#1a202e] border border-slate-200/80 dark:border-slate-700/60 p-3.5 text-[11px] text-slate-700 dark:text-slate-300 shadow-2xs">

                      <div className="font-bold text-slate-900 dark:text-white mb-2">

                        5 Bước Retrospective (Văn hóa "No Blame Culture"):

                      </div>

                      <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">

                        <li><strong>Set the Stage:</strong> Khởi động, tạo môi trường cởi mở, tin tưởng</li>

                        <li><strong>Gather Data:</strong> Thu thập số liệu Velocity, Burndown, task Done/Fail</li>

                        <li><strong>Generate Insights:</strong> Phân tích nguyên nhân gốc rễ (Root Cause)</li>

                        <li><strong>Decide What to Do:</strong> Đưa ra 1 - 2 hành động cải tiến SMART</li>

                        <li><strong>Close:</strong> Đúc kết, ghi nhận nỗ lực đồng đội</li>

                      </ol>

                    </div>

                  </div>

                </>

              ) : (

                <>

                  {/* PTTK 1: Problem Solver vs Thợ gõ code */}

                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#141824] p-4 space-y-3">

                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">

                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">1</span>

                      Tư duy Problem Solver vs Thợ gõ code (Fred Brooks - Session 01)

                    </h4>

                    <blockquote className="border-l-2 border-[#f97316] pl-3 italic text-[11px] text-slate-700 dark:text-slate-300">

                      "Phần khó nhất của việc xây dựng phần mềm là quyết định chính xác những gì cần phải xây dựng. Công nghệ chỉ là công cụ. Giá trị thực sự nằm ở việc giải quyết đúng bài toán trước khi viết dòng code đầu tiên."

                    </blockquote>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">

                      CodeMind Campus áp dụng triệt để nguyên lý này: Socratic AI Tutor không đưa code sẵn mà hướng dẫn sinh viên tìm nguyên nhân gốc rễ (Root Cause) của lỗi thuật toán.

                    </p>

                  </div>



                  {/* PTTK 2: Ma trận FR vs NFR */}

                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#141824] p-4 space-y-3">

                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">

                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">2</span>

                      Phân định Yêu cầu Chức năng (FR) & Phi chức năng (NFR - Session 03)

                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white mb-1.5">Functional Requirements (FR):</p>

                        <ul className="space-y-1 text-slate-600 dark:text-slate-300">

                          <li>• LMS Lập trình & nộp bài qua Git / kéo thả</li>

                          <li>• Sandbox chấm tự động 5 test cases Deque</li>

                          <li>• Socratic AI Tutor gợi ý theo 3 nấc (Hint Ladder)</li>

                          <li>• Bảng Kanban Ràng buộc H2 & Anti-Freerider</li>

                          <li>• AI Defense Simulator giả lập Hội đồng phản biện</li>

                        </ul>

                      </div>

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white mb-1.5">Non-Functional Requirements (NFR):</p>

                        <ul className="space-y-1 text-slate-600 dark:text-slate-300">

                          <li>• <strong>Hiệu năng:</strong> Sandbox timeout &lt; 2000ms, API &lt; 300ms</li>

                          <li>• <strong>Bảo mật:</strong> Docker isolated process chống memory leak</li>

                          <li>• <strong>Chuẩn hóa dữ liệu:</strong> Timestamp chuẩn ISO-8601 UTC (H4)</li>

                          <li>• <strong>Độ sẵn sàng:</strong> Kiến trúc Layered độc lập chịu tải cao</li>

                        </ul>

                      </div>

                    </div>

                  </div>



                  {/* PTTK 3: 4 Biểu đồ UML Cốt lõi */}

                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#141824] p-4 space-y-3">

                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">

                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">3</span>

                      4 Biểu đồ UML Cốt lõi trong Thiết kế Hệ thống (Session 05, 07, 09)

                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white">1. Use Case Diagram (SS05)</p>

                        <p className="text-slate-500 dark:text-slate-400 mt-1">Mô hình hóa Actors (Sinh viên, Giảng viên, AI Mentor) cùng quan hệ &lt;&lt;include&gt;&gt; (Chấm bài include Sandbox) và &lt;&lt;extend&gt;&gt; (Hint AI).</p>

                      </div>

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white">2. Activity Diagram (SS05)</p>

                        <p className="text-slate-500 dark:text-slate-400 mt-1">Biểu diễn luồng công việc chấm code, rẽ nhánh điều kiện Pass 5/5 sinh hash SHA-256 vs Fail mở Hint 1-3.</p>

                      </div>

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white">3. Class Diagram (SS07)</p>

                        <p className="text-slate-500 dark:text-slate-400 mt-1">Cấu trúc OOP với thuộc tính, phương thức, Access Modifiers (+, -, #) và quan hệ Association / Composition giữa các Entity.</p>

                      </div>

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white">4. Sequence Diagram (SS09)</p>

                        <p className="text-slate-500 dark:text-slate-400 mt-1">Trực quan hóa thông điệp đồng bộ/bất đồng bộ theo trục thời gian giữa React UI, FastAPI Router, Service, Docker và Database.</p>

                      </div>

                    </div>

                  </div>



                  {/* PTTK 4: Chuẩn hóa 3NF & Kiến trúc 3 Tầng */}

                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#141824] p-4 space-y-3">

                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs">

                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">4</span>

                      Chuẩn hóa CSDL 3NF & Kiến trúc 3 Tầng Phân Tách (Session 15, 17)

                    </h4>

                    <div className="space-y-2.5 text-[11px]">

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white mb-1.5">3 Cấp độ Chuẩn hóa CSDL (3NF):</p>

                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">

                          <strong>1NF:</strong> Mọi thuộc tính đều là giá trị nguyên tử (Atomic).<br/>

                          <strong>2NF:</strong> Đạt 1NF và loại bỏ phụ thuộc một phần vào khóa chính phức hợp.<br/>

                          <strong>3NF:</strong> Đạt 2NF và loại bỏ toàn bộ phụ thuộc bắc cầu (Transitive dependency) giữa Users, Submissions và TestCases.

                        </p>

                      </div>

                      <div className="rounded-xl bg-white dark:bg-[#1a202e] p-3 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">

                        <p className="font-bold text-slate-900 dark:text-white mb-1.5">Mô hình Kiến trúc 3 Tầng (3-Tier Clean Architecture):</p>

                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">

                          • <strong>Presentation Layer:</strong> React 19 UI & FastAPI Router (Validation, Response JSON).<br/>

                          • <strong>Business Logic Layer:</strong> Services (Socratic Tutor, Sandbox Runner, Anti-freerider Engine).<br/>

                          • <strong>Data Access Layer:</strong> SQLAlchemy Models, Migrations & SQLite/PostgreSQL (UTC ISO-8601 H4).

                        </p>

                      </div>

                    </div>

                  </div>

                </>

              )}

            </div>



            {/* Modal Footer */}

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3.5">

              <span className="text-[11px] text-slate-400 dark:text-slate-500">

                Chương trình chuẩn Rikkei Education • Hội đồng Đồ án hướng dẫn

              </span>

              <button

                onClick={handleCloseHandbook}

                className="rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"

              >

                Đã hiểu quy chuẩn

              </button>

            </div>

          </div>

        </div>

      )}



      {/* ── REAL TRELLO DRAG CARD PREVIEW (Đồng bộ 100% kích thước chữ, badge, border y hệt thẻ gốc) ── */}

      {pointerDrag?.isDragging && pointerDrag.task && typeof document !== 'undefined' && (() => {

        const dragTask = pointerDrag.task;

        const dragCol = columnsConfig.find((c) => c.id === dragTask.column);

        const dragMember = teamMembers.find((m) => m.name === dragTask.assignee.name);

        const dragAvatarColor = getAssigneeAvatarColor(dragTask.assignee.name, dragMember?.color);

        const dragChecklist = Array.isArray(dragTask.checklist) ? dragTask.checklist : [];

        const dragDoneChecklist = dragChecklist.filter((c) => c.done).length;

        const dragTotalChecklist = dragChecklist.length;

        const dragDod = Array.isArray(dragTask.definitionOfDone) ? dragTask.definitionOfDone : [];

        const dragDoneDodCount = dragDod.filter((d) => d.done).length;

        const dragTotalDodCount = dragDod.length;

        const dragParent = dragTask.dependsOn ? getTaskById(dragTask.dependsOn) : null;

        const dragIsLocked = dragParent ? dragParent.column !== "done" : false;



        return createPortal(

          <div

            ref={floatingCardRef}

            style={{

              position: "fixed",

              left: 0,

              top: 0,

              width: pointerDrag.width,

              transform: `translate3d(${dragTrackerRef.current.currentX - dragTrackerRef.current.offsetX}px, ${dragTrackerRef.current.currentY - dragTrackerRef.current.offsetY}px, 0) rotate(1.8deg)`,

              transformOrigin: `${dragTrackerRef.current.offsetX}px ${dragTrackerRef.current.offsetY}px`,

              zIndex: 99999,

              pointerEvents: "none",

              willChange: "transform",

            }}

            className={`flex flex-col p-3.5 select-none rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-[#181d29] border-l-[3.5px] ${dragCol?.cardBorderLeft || "border-l-blue-500"} shadow-[0_20px_40px_-8px_rgba(0,0,0,0.22),0_10px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_22px_35px_-5px_rgba(0,0,0,0.7),0_8px_16px_rgba(0,0,0,0.5)]`}

          >

            {/* Drag Handle & Epic Tag */}

            <div className="mb-2 flex items-center justify-between gap-1 text-[11px]">

              <div className="flex items-center gap-1.5 min-w-0">

                <GripVertical size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />

                <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-0.5 shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60">

                  #{dragTask.code}

                  {dragIsLocked && dragParent && (

                    <span title={`Ràng buộc H2: Chờ #${dragParent.code} hoàn thành`} className="inline-flex text-rose-500 shrink-0 ml-0.5">

                      <Lock size={11} />

                    </span>

                  )}

                </span>

              </div>

              <div className="flex items-center gap-1.5 shrink-0">

                <span className="rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">

                  {dragTask.points}p

                </span>

              </div>

            </div>



            {/* Title - ĐỒNG BỘ 100% CỠ CHỮ [12px] font-semibold vừa vặn */}

            <h3 className="mb-2 text-[12px] font-semibold leading-snug text-slate-900 dark:text-white line-clamp-2">

              {dragTask.title}

            </h3>



            {/* Footer đầy đủ Assignee, Checklist, DoD, Hạn nộp dạng badge */}

            <div className="mt-auto flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 text-[11px]">

              <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">

                <span

                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${dragAvatarColor} shadow-2xs`}

                >

                  {dragTask.assignee.avatar}

                </span>

                <span className="truncate font-semibold text-slate-700 dark:text-slate-300 text-[11px]">

                  {dragTask.assignee.name}

                </span>

              </div>



              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] shrink-0">

                {dragTotalChecklist > 0 && (

                  <span

                    className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[10.5px] border-0 transition-colors ${

                      dragDoneChecklist === dragTotalChecklist

                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold"

                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"

                    }`}

                  >

                    <ListChecks size={11} />

                    <span>{dragDoneChecklist}/{dragTotalChecklist}</span>

                  </span>

                )}



                {dragTotalDodCount > 0 && (

                  <span

                    className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[10.5px] border-0 transition-colors ${

                      dragDoneDodCount === dragTotalDodCount

                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold"

                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"

                    }`}

                  >

                    <ShieldCheck size={11} />

                    <span>{dragDoneDodCount}/{dragTotalDodCount}</span>

                  </span>

                )}



                {dragTask.dueDate && (

                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10.5px] font-medium border-0">

                    <Calendar size={11} />

                    <span>{dragTask.dueDate.length > 5 ? dragTask.dueDate.slice(0, 5) : dragTask.dueDate}</span>

                  </span>

                )}

              </div>

            </div>

          </div>,

          document.body

        );

      })()}



      {/* ── 🏷️ MARLO PROJECTS SLATE GRID MODAL ── */}

      <MarloProjectSlateModal

        isOpen={isProjectSlateOpen}

        onClose={() => setIsProjectSlateOpen(false)}

        projects={projects}

        currentProjectId={currentProjectId}

        onSelectProject={(id) => setCurrentProjectId(id)}

        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}

        onTogglePinProject={handleTogglePinProject}

      />



      {/* ── 🏷️ CREATE NEW PROJECT MODAL ── */}

      <MarloNewProjectModal

        isOpen={isNewProjectModalOpen}

        onClose={() => setIsNewProjectModalOpen(false)}

        onCreateProject={handleCreateProject}

      />



      {/* ── 🎓 INSTRUCTOR PROJECT GRADING MODAL (ANTI-FREERIDER) ── */}

      <ProjectGradingModal

        isOpen={isGradingModalOpen}

        onClose={() => setIsGradingModalOpen(false)}

        projectId={currentProject?.id || "prj-codemind"}

        projectName={currentProject?.name || "CodeMind AI"}

        projectCode={currentProject?.code || "PRJ-CODEMIND"}

        courseName={currentProject?.course}

        onGradingSuccess={() => {

          void reloadWorkspace();

        }}

      />



      {/* ── FLOATING TOAST NOTIFICATION WITH UNDO PILL (Exact Marlo Design from user images) ── */}

      {undoToast && (

        <MarloToast

          showUndo={!undoToast.undone}

          onUndo={handleUndo}

          message={

            undoToast.undone ? (

              undoToast.action === "delete" ? (

                <>“{undoToast.taskTitle}” restored.</>

              ) : (

                <>“{undoToast.taskTitle}” → {undoToast.fromColTitle}</>

              )

            ) : undoToast.customMessage ? (

              <span>{undoToast.customMessage}</span>

            ) : undoToast.action === "delete" ? (

              <>“{undoToast.taskTitle}” deleted.</>

            ) : (

              <>

                <span className="font-semibold text-slate-900 dark:text-white">“{undoToast.taskTitle}”</span>

                <span className="text-slate-400 dark:text-slate-500 mx-1.5 font-normal">→</span>

                <span className="text-slate-700 dark:text-slate-300 font-medium">

                  {undoToast.toCol === "in-progress" ? "In progress" : undoToast.toCol === "done" ? "Done" : undoToast.toColTitle}

                </span>

              </>

            )

          }

        />

      )}

    </div>

  );

}

