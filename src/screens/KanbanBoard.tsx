import { useState, useMemo, useRef, useEffect } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Clock,
  Clock3,
  Columns3,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  FolderKanban,
  GitBranch,
  GitCommit,
  GitPullRequest,
  GraduationCap,
  GripVertical,
  Layers,
  Link2,
  ListChecks,
  ListTodo,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Settings2,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Terminal,
  Timer,
  Trash2,
  Activity,
  PieChart,
  Target,
  TrendingDown,
  TrendingUp,
  Unlock,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";

export type ColumnId = "backlog" | "ready" | "in-progress" | "review" | "done";
export type Priority = "low" | "medium" | "high";
export type MoscowPriority = "must" | "should" | "could" | "wont";
export type TabView = "board" | "analytics" | "dependencies";
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
}

export const defaultDoD = (isDone = false): ChecklistItem[] => [
  { id: "dod-1", text: "Code vượt qua 100% test cases trong Docker sandbox độc lập", done: isDone },
  { id: "dod-2", text: "Tuân thủ Kiến trúc 3 tầng (Router -> Service -> Data Layer)", done: isDone },
  { id: "dod-3", text: "Không có lỗi Type/Lint, timestamp chuẩn ISO-8601 UTC (H4)", done: isDone },
  { id: "dod-4", text: "Được ít nhất 1 thành viên review và giải phóng Ràng buộc H2", done: isDone },
];

const initialMembers: TeamMember[] = [
  { id: "m1", name: "Minh Anh", avatar: "MA", role: "Team Lead & Arch", color: "bg-blue-600" },
  { id: "m2", name: "Quốc Huy", avatar: "QH", role: "Backend Dev", color: "bg-amber-500" },
  { id: "m3", name: "Hoàng Long", avatar: "HL", role: "QA & AI Ops", color: "bg-teal-600" },
];

const initialTasks: KanbanTask[] = [
  {
    id: "task-1",
    code: "BE-01",
    title: "Thiết kế CSDL ERD & Timezone UTC chuẩn ISO-8601 (H4)",
    description: "Xây dựng 8 bảng core, quy chuẩn toàn bộ timestamp về UTC (H4) theo yêu cầu Thầy Phước.",
    column: "done",
    priority: "high",
    moscow: "must",
    points: 5,
    assignee: { name: "Minh Anh", avatar: "MA", role: "Team Lead & Arch" },
    estimateHours: 4,
    dueDate: "28/10",
    epic: "Architecture",
    epicColor: "bg-blue-50 text-blue-700 border-blue-200",
    userStory: {
      role: "Kiến trúc sư hệ thống",
      want: "thiết kế ERD chuẩn hóa 3NF và quy định múi giờ UTC ISO-8601",
      benefit: "dữ liệu không bị phân mảnh hay sai lệch timestamp giữa client và server (H4)",
    },
    acceptanceCriteria: "Given cơ sở dữ liệu khởi tạo\nWhen các bảng lưu trữ thông tin thời gian\nThen timestamp được quy đổi về UTC theo ISO-8601 và schema đạt chuẩn 3NF",
    definitionOfDone: defaultDoD(true),
    checklist: [
      { id: "c1", text: "Vẽ sơ đồ ERD 8 thực thể chính", done: true },
      { id: "c2", text: "Tạo migration SQLite & Index", done: true },
      { id: "c3", text: "Viết helper UTC now_utc()", done: true },
    ],
    deliverable: { type: "commit", label: "commit #a8f3b2" },
    commentsCount: 4,
    attachmentsCount: 2,
  },
  {
    id: "task-2",
    code: "DOC-01",
    title: "Lập Tài liệu SRS Master Blueprint v3.1 & Xuất Word",
    description: "Đặc tả các ràng buộc cứng H1-H4, kịch bản Socratic và cơ chế chống Free-rider cho báo cáo Thầy.",
    column: "done",
    priority: "high",
    moscow: "must",
    points: 8,
    assignee: { name: "Minh Anh", avatar: "MA", role: "Team Lead & Arch" },
    estimateHours: 6,
    dueDate: "29/10",
    epic: "Documentation",
    epicColor: "bg-purple-50 text-purple-700 border-purple-200",
    userStory: {
      role: "Hội đồng & Giảng viên",
      want: "tài liệu SRS Master Blueprint chuẩn IEEE 830",
      benefit: "nắm bắt toàn diện các ràng buộc cứng H1-H4 và lộ trình đồ án thực tế",
    },
    acceptanceCriteria: "Given yêu cầu nghiệm thu môn học\nWhen xuất tài liệu đặc tả hệ thống\nThen văn bản có đủ 10 chương chuẩn PTTKHT, Agile Scrum và danh mục Product Backlog",
    definitionOfDone: defaultDoD(true),
    checklist: [
      { id: "c1", text: "Khảo sát và gạch bỏ các tính năng ảo (VARK)", done: true },
      { id: "c2", text: "Viết đặc tả Hard Constraints H1-H4", done: true },
      { id: "c3", text: "Format chuẩn Word nộp Thầy", done: true },
    ],
    deliverable: { type: "commit", label: "docs/Tai_Lieu_Khoi_Dong.docx" },
    commentsCount: 2,
    attachmentsCount: 1,
  },
  {
    id: "task-3",
    code: "BE-02",
    title: "Tái cấu trúc Backend Layered Architecture (Clean Code)",
    description: "Tách nhỏ 650 dòng monolithic thành core, schemas, services, api v1 cô lập lỗi.",
    column: "done",
    priority: "high",
    moscow: "must",
    points: 5,
    assignee: { name: "Minh Anh", avatar: "MA", role: "Team Lead & Arch" },
    estimateHours: 4,
    dueDate: "02/11",
    epic: "Backend Refactor",
    epicColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    userStory: {
      role: "Backend Developer",
      want: "tách biệt hệ thống theo kiến trúc 3 tầng (3-tier Architecture)",
      benefit: "cô lập lỗi, dễ bảo trì và phân định rõ ràng giữa Router, Service và Data Layer",
    },
    acceptanceCriteria: "Given backend monolithic 650 dòng\nWhen tái cấu trúc sang Layered Clean Architecture\nThen schemas, services, core tách riêng và smoke test 100% pass",
    definitionOfDone: defaultDoD(true),
    checklist: [
      { id: "c1", text: "Tách app/core/database.py", done: true },
      { id: "c2", text: "Tách app/services/ai_tutor.py", done: true },
      { id: "c3", text: "Chạy test smoke 100% pass", done: true },
    ],
    deliverable: { type: "pr", label: "PR #14: Layered Arch" },
    commentsCount: 6,
    attachmentsCount: 3,
  },
  {
    id: "task-4",
    code: "SAND-01",
    title: "Bộ Sandbox Test Runner độc lập (5 Test Cases)",
    description: "Đánh giá an toàn mã nguồn deque: maxlen, boundary cases, xử lý chuỗi rỗng.",
    column: "in-progress",
    priority: "high",
    moscow: "must",
    points: 5,
    assignee: { name: "Quốc Huy", avatar: "QH", role: "Backend Dev" },
    estimateHours: 4,
    dueDate: "05/11",
    epic: "Code Grader",
    epicColor: "bg-amber-50 text-amber-700 border-amber-200",
    dependsOn: "task-3",
    userStory: {
      role: "Sinh viên lập trình",
      want: "chạy 5 test cases trên môi trường Docker Sandbox cô lập",
      benefit: "biết chính xác kết quả pass/fail trong < 2000ms mà không làm sập server",
    },
    acceptanceCriteria: "Given sinh viên nộp bài hàm deque\nWhen nhấn Chạy kiểm thử\nThen sandbox thực thi 5 test cases và trả về kết quả từng test trong thời gian < 2s",
    definitionOfDone: [
      { id: "dod-1", text: "Code vượt qua 100% test cases trong Docker sandbox độc lập", done: true },
      { id: "dod-2", text: "Tuân thủ Kiến trúc 3 tầng (Router -> Service -> Data Layer)", done: true },
      { id: "dod-3", text: "Không có lỗi Type/Lint, timestamp chuẩn ISO-8601 UTC (H4)", done: false },
      { id: "dod-4", text: "Được ít nhất 1 thành viên review và giải phóng Ràng buộc H2", done: false },
    ],
    checklist: [
      { id: "c1", text: "Thiết lập môi trường isolated sandbox", done: true },
      { id: "c2", text: "Viết bộ 5 test cases chuẩn công nghiệp", done: true },
      { id: "c3", text: "Bắt timeout 2000ms chống lặp vô tận", done: false },
    ],
    commentsCount: 3,
    attachmentsCount: 1,
  },
  {
    id: "task-5",
    code: "AI-01",
    title: "Socratic AI Tutor Hint Ladder (Thang gợi ý 3 nấc)",
    description: "Tuyệt đối không đưa đáp án; hướng dẫn mở dần Hint 1 -> Hint 2 -> Hint 3.",
    column: "review",
    priority: "high",
    moscow: "must",
    points: 5,
    assignee: { name: "Quốc Huy", avatar: "QH", role: "Backend Dev" },
    estimateHours: 4.5,
    dueDate: "06/11",
    epic: "AI Pedagogy",
    epicColor: "bg-rose-50 text-rose-700 border-rose-200",
    dependsOn: "task-4",
    userStory: {
      role: "Sinh viên gặp lỗi thuật toán",
      want: "nhận gợi ý Socratic theo thang 3 nấc sư phạm",
      benefit: "tự hiểu nguyên lý để sửa code thay vì bị AI mớm đáp án hoàn chỉnh",
    },
    acceptanceCriteria: "Given sinh viên chưa vượt qua test case\nWhen yêu cầu trợ giúp từ AI Tutor\nThen hệ thống mở khóa tuần tự Hint 1 -> Hint 2 -> Hint 3 và khóa không lộ giải",
    definitionOfDone: [
      { id: "dod-1", text: "Code vượt qua 100% test cases trong Docker sandbox độc lập", done: true },
      { id: "dod-2", text: "Tuân thủ Kiến trúc 3 tầng (Router -> Service -> Data Layer)", done: true },
      { id: "dod-3", text: "Không có lỗi Type/Lint, timestamp chuẩn ISO-8601 UTC (H4)", done: true },
      { id: "dod-4", text: "Được ít nhất 1 thành viên review và giải phóng Ràng buộc H2", done: false },
    ],
    checklist: [
      { id: "c1", text: "Cấu hình Guardrails từ chối đưa code hoàn chỉnh", done: true },
      { id: "c2", text: "Ràng buộc mở tuần tự (Sequence lock)", done: true },
      { id: "c3", text: "Tạo SHA-256 evidence bằng chứng tự sửa", done: true },
    ],
    deliverable: { type: "test", label: "Smoke test: 14/14 Passed" },
    commentsCount: 5,
    attachmentsCount: 2,
  },
  {
    id: "task-6",
    code: "DEF-01",
    title: "AI Defense Simulator: Giả lập Hội đồng phản biện",
    description: "AI đóng vai giảng viên phản biện khó tính, xoáy sâu vào các điểm yếu của đồ án.",
    column: "ready",
    priority: "medium",
    moscow: "should",
    points: 8,
    assignee: { name: "Hoàng Long", avatar: "HL", role: "QA & AI Ops" },
    estimateHours: 5,
    dueDate: "09/11",
    epic: "Defense Room",
    epicColor: "bg-teal-50 text-teal-700 border-teal-200",
    dependsOn: "task-5",
    userStory: {
      role: "Sinh viên bảo vệ đồ án",
      want: "luyện tập chất vấn với Hội đồng phản biện AI",
      benefit: "rèn luyện phản xạ kỹ thuật và phát hiện trước lỗ hổng bảo mật/kiến trúc",
    },
    acceptanceCriteria: "Given đồ án đã hoàn thành các module cốt lõi\nWhen sinh viên bắt đầu phiên bảo vệ\nThen AI chất vấn xoay quanh Docker sandbox, 3NF và thuật toán Anti-Freerider",
    definitionOfDone: defaultDoD(false),
    checklist: [
      { id: "c1", text: "Thu thập danh mục 20 câu hỏi Thầy Phước hay hỏi", done: false },
      { id: "c2", text: "Tích hợp prompt Socratic phản biện", done: false },
    ],
    commentsCount: 1,
    attachmentsCount: 0,
  },
  {
    id: "task-7",
    code: "QA-01",
    title: "Bộ kiểm thử 50 ca tự động (Automated Smoke Test)",
    description: "Đảm bảo mã nguồn nộp lên không làm treo máy chủ hoặc bypass sandbox.",
    column: "backlog",
    priority: "medium",
    moscow: "should",
    points: 3,
    assignee: { name: "Hoàng Long", avatar: "HL", role: "QA & AI Ops" },
    estimateHours: 3.5,
    dueDate: "11/11",
    epic: "Testing",
    epicColor: "bg-slate-50 text-slate-700 border-slate-200",
    dependsOn: "task-4",
    userStory: {
      role: "QA Engineer",
      want: "50 ca kiểm thử tự động cho router và services",
      benefit: "hệ thống không phát sinh lỗi hồi quy (regression) khi thêm tính năng mới",
    },
    acceptanceCriteria: "Given pull request mới tạo\nWhen kích hoạt chạy bộ test smoke\nThen 50 test cases hoàn thành với tỷ lệ 100% pass và thời gian dưới 10s",
    definitionOfDone: defaultDoD(false),
    checklist: [
      { id: "c1", text: "Viết test case biên bộ nhớ", done: false },
      { id: "c2", text: "Viết test case injection chuỗi rỗng", done: false },
    ],
    commentsCount: 0,
    attachmentsCount: 1,
  },
  {
    id: "task-8",
    code: "FE-01",
    title: "Radar Skill Chart & Daily Heatmap Streak",
    description: "Trực quan hóa năng lực lập trình viên: CleanCode, Debugging, Teamwork.",
    column: "in-progress",
    priority: "medium",
    moscow: "could",
    points: 3,
    assignee: { name: "Minh Anh", avatar: "MA", role: "Team Lead & Arch" },
    estimateHours: 3,
    dueDate: "07/11",
    epic: "Gamification",
    epicColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    userStory: {
      role: "Sinh viên",
      want: "theo dõi biểu đồ Radar 5 trục kỹ năng và chuỗi ngày code Streak",
      benefit: "duy trì động lực rèn luyện mỗi ngày và nhìn thấy sự tiến bộ rõ rệt",
    },
    acceptanceCriteria: "Given sinh viên nộp bài thành công\nWhen vào trang Dashboard cá nhân\nThen radar chart cập nhật điểm số và ô vuông streak sáng màu xanh",
    definitionOfDone: [
      { id: "dod-1", text: "Code vượt qua 100% test cases trong Docker sandbox độc lập", done: true },
      { id: "dod-2", text: "Tuân thủ Kiến trúc 3 tầng (Router -> Service -> Data Layer)", done: false },
      { id: "dod-3", text: "Không có lỗi Type/Lint, timestamp chuẩn ISO-8601 UTC (H4)", done: false },
      { id: "dod-4", text: "Được ít nhất 1 thành viên review và giải phóng Ràng buộc H2", done: false },
    ],
    checklist: [
      { id: "c1", text: "Vẽ SVG ngũ giác Radar Chart", done: true },
      { id: "c2", text: "Tạo ô vuông xanh GitHub Contribution", done: false },
    ],
    commentsCount: 2,
    attachmentsCount: 1,
  },
  {
    id: "task-9",
    code: "ANTI-01",
    title: "Thuật toán Anti-Freerider đo lường đóng góp nhóm",
    description: "Tính % đóng góp dựa trên số task Done, commit Git và test evidence thật.",
    column: "backlog",
    priority: "low",
    moscow: "must",
    points: 5,
    assignee: { name: "Quốc Huy", avatar: "QH", role: "Backend Dev" },
    estimateHours: 4,
    dueDate: "14/11",
    epic: "Team Analytics",
    epicColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dependsOn: "task-3",
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
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50/80 focus:outline-hidden ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 z-50 mt-1.5 ${menuClassName} origin-top-left rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95`}
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
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition text-left ${
                    isSelected
                      ? "bg-blue-50 text-blue-700 font-semibold shadow-2xs"
                      : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
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
                  {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
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
  badgeBg: string;
  badgeText: string;
  borderTop: string;
  maxWip?: number;
}> = [
  { id: "backlog", title: "Backlog", dotColor: "bg-slate-400", badgeBg: "bg-slate-200/80", badgeText: "text-slate-700", borderTop: "border-t-slate-400" },
  { id: "ready", title: "Ready", dotColor: "bg-blue-500", badgeBg: "bg-blue-100", badgeText: "text-blue-700", borderTop: "border-t-blue-500" },
  { id: "in-progress", title: "In Progress", dotColor: "bg-amber-500", badgeBg: "bg-amber-100", badgeText: "text-amber-800", borderTop: "border-t-amber-500", maxWip: 3 },
  { id: "review", title: "Review / PR", dotColor: "bg-purple-500", badgeBg: "bg-purple-100", badgeText: "text-purple-700", borderTop: "border-t-purple-500" },
  { id: "done", title: "Done", dotColor: "bg-emerald-500", badgeBg: "bg-emerald-100", badgeText: "text-emerald-700", borderTop: "border-t-emerald-500" },
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

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialMembers);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("board");

  // Dynamic Member Management Modal
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Frontend Developer");

  // Filtering
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"team" | "my">("team");

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

  // Quick Inline Add Task
  const [inlineAddingCol, setInlineAddingCol] = useState<ColumnId | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");

  // Engineering & Agile Scrum Handbook Modal
  const [handbookOpen, setHandbookOpen] = useState(false);
  const [handbookTab, setHandbookTab] = useState<"scrum" | "pttk">("scrum");
  const [taskDetailTab, setTaskDetailTab] = useState<"general" | "engineering">("general");

  const getTaskById = (id: string) => tasks.find((t) => t.id === id);

  // Total Story points and completed points
  const sprintStats = useMemo(() => {
    const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0);
    const donePoints = tasks.filter((t) => t.column === "done").reduce((sum, t) => sum + t.points, 0);
    const inProgPoints = tasks.filter((t) => t.column === "in-progress" || t.column === "review").reduce((sum, t) => sum + t.points, 0);
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

  // Execute Move Task (with Constraint H2 enforcement)
  const moveTask = (taskId: string, targetCol: ColumnId) => {
    const task = getTaskById(taskId);
    if (!task || task.column === targetCol) return;

    // Hard Constraint H2 Check
    if (targetCol === "done" && task.dependsOn) {
      const parent = getTaskById(task.dependsOn);
      if (parent && parent.column !== "done") {
        setH2Violation({ task, blockingTask: parent });
        return;
      }
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, column: targetCol } : t))
    );
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(taskId);
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
    if (dragOverCol === colId) {
      setDragOverCol(null);
    }
  };

  const handleDrop = (e: React.DragEvent, colId: ColumnId) => {
    e.preventDefault();
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
    const defaultAssignee = teamMembers[0] || { name: "Minh Anh", avatar: "MA", role: "Team Lead" };
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
    
    const palette = ["bg-indigo-600", "bg-rose-600", "bg-purple-600", "bg-emerald-600", "bg-cyan-600"];
    const randomColor = palette[teamMembers.length % palette.length];

    const newMember: TeamMember = {
      id: `m-${Date.now()}`,
      name: newMemberName.trim(),
      avatar: initials || "DEV",
      role: newMemberRole.trim() || "Developer",
      color: randomColor,
    };

    setTeamMembers((prev) => [...prev, newMember]);
    setAiSelectedMemberIds((prev) => [...prev, newMember.id]);
    setNewMemberName("");
    setMemberModalOpen(false);
  };

  // Remove Dynamic Team Member
  const handleRemoveMember = (memberId: string) => {
    if (teamMembers.length <= 1) return;
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
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
  const handleGenerateWbs = () => {
    if (!aiFeatureName.trim()) return;
    setAiGenerating(true);

    setTimeout(() => {
      const stamp = Date.now();
      const parentId = `task-ai-${stamp}-1`;

      // Get list of active selected members
      const activeMembers = teamMembers.filter((m) => aiSelectedMemberIds.includes(m.id));
      const pool = activeMembers.length > 0 ? activeMembers : teamMembers;

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
          description: `Cập nhật tài liệu SRS Master Blueprint, xuất file báo cáo tiến độ nộp Thầy Phước.`,
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
    setTasks((prev) => [...prev, ...aiPreviewTasks]);
    setAiModalOpen(false);
    setAiStage("input");
    setAiFeatureName("");
    setAiDescription("");
    setAiPreviewTasks([]);
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (viewMode === "my" && t.assignee.name !== (teamMembers[0]?.name || "Minh Anh")) return false;
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

  return (
    <div className="flex h-full flex-col bg-slate-50/60 p-6">
      {/* ── TOP CONTROL BAR (LINEAR / JIRA STYLE) ────────────────────────── */}
      <header className="mb-5 flex flex-col gap-4">
        {/* Row 1: Project Identity, Dynamic Team Roster & Primary Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
              <FolderKanban size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Engineering Project Workspace
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  <Flame size={12} className="text-amber-500" /> Sprint 1 (Tuần 1 - 4)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                CodeMind Campus • Nhóm {teamMembers.length} thành viên • Ràng buộc cứng H2 & Đo lường đóng góp Anti-Freerider
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Switcher: Board vs Dependencies vs Analytics */}
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
              <button
                onClick={() => setActiveTab("board")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "board"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Columns3 size={14} />
                Bảng Kanban
              </button>
              <button
                onClick={() => setActiveTab("dependencies")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "dependencies"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Link2 size={14} />
                Cây Phụ thuộc (H2)
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "analytics"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart3 size={14} />
                Báo cáo Đóng góp
              </button>
            </div>

            {/* Manage Team Members Button */}
            <button
              onClick={() => setMemberModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              title="Quản lý thành viên trong nhóm"
            >
              <Users size={14} className="text-blue-600" />
              <span>Đội ngũ ({teamMembers.length})</span>
            </button>

            {/* Engineering & Agile Scrum Handbook Button */}
            <button
              onClick={() => setHandbookOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 transition"
              title="Cẩm nang quy chuẩn Kỹ nghệ phần mềm & Agile/Scrum"
            >
              <BookOpen size={14} className="text-indigo-600" />
              <span>Cẩm nang Kỹ nghệ</span>
            </button>

            {/* AI WBS Generator */}
            <button
              onClick={() => {
                setAiModalOpen(true);
                setAiStage("input");
              }}
              className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 px-3.5 py-2 text-xs font-semibold text-purple-700 shadow-xs transition hover:border-purple-300 hover:shadow-sm"
            >
              <Sparkles size={15} className="text-purple-600 animate-pulse" />
              <span>AI Phân rã WBS</span>
            </button>
          </div>
        </div>

        {/* Row 2: Sprint Progress & Dynamic Anti-Freerider Contribution Ribbon */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          {/* Sprint Points & Burndown Progress (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100 pb-3 lg:pb-0 lg:pr-5">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <TrendingUp size={14} className="text-blue-600" />
                Tiến độ Sprint 1:
              </span>
              <span className="text-xs font-mono font-bold text-slate-800">
                {sprintStats.donePoints} / {sprintStats.totalPoints} Story Points ({sprintStats.percentDone}%)
              </span>
            </div>
            {/* Progress Bar */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 flex">
              <div
                style={{ width: `${sprintStats.percentDone}%` }}
                className="bg-emerald-500 transition-all duration-500"
                title={`Đã hoàn thành: ${sprintStats.donePoints} pts`}
              />
              <div
                style={{
                  width: `${Math.round(
                    (sprintStats.inProgPoints / (sprintStats.totalPoints || 1)) * 100
                  )}%`,
                }}
                className="bg-amber-400 transition-all duration-500"
                title={`Đang thực hiện: ${sprintStats.inProgPoints} pts`}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 font-medium">
              <span>Bắt đầu: 25/10</span>
              <span className="text-blue-600 font-semibold">Còn lại: 12 ngày</span>
              <span>Hạn nộp: 15/11</span>
            </div>
          </div>

          {/* Dynamic Anti-Freerider Team Contribution Bar (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between pl-0 lg:pl-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Flame size={11} />
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Đo lường Đóng góp Thực tế ({teamMembers.length} thành viên):
                </span>
              </div>
              <span className="text-[11px] text-slate-500">Thuật toán Anti-Freerider</span>
            </div>

            {/* Segmented Team Bar dynamically rendered for all members */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 flex">
              {teamMembers.map((member) => {
                const stat = contribution[member.name];
                return (
                  <div
                    key={member.id}
                    style={{ width: `${stat?.percent || 0}%` }}
                    className={`${member.color} transition-all duration-500`}
                    title={`${member.name} (${member.role}): ${stat?.percent || 0}%`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px]">
              {teamMembers.map((member) => {
                const stat = contribution[member.name];
                return (
                  <span key={member.id} className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className={`h-2 w-2 rounded-full ${member.color}`} />
                    {member.name} ({stat?.percent || 0}% • {stat?.tasksDone || 0} tasks)
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 3: Filter & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* View Mode: Team vs My */}
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
              <button
                onClick={() => setViewMode("team")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === "team"
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users size={13} />
                Toàn nhóm ({teamMembers.length})
              </button>
              <button
                onClick={() => setViewMode("my")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  viewMode === "my"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserCheck size={13} />
                Task của tôi
              </button>
            </div>

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
                className="w-56 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <span className="text-xs text-slate-400">
              {filteredTasks.length} thẻ
            </span>
          </div>
        </div>
      </header>

      {/* ── TAB 1: KANBAN BOARD WITH REAL DRAG AND DROP ──────────────────── */}
      {activeTab === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start overflow-x-auto pb-10">
          {columnsConfig.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.column === col.id);
            const isDraggingOver = dragOverCol === col.id;
            const colPoints = colTasks.reduce((s, t) => s + t.points, 0);

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={(e) => handleDragLeave(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-2xl border border-slate-200/90 bg-slate-100/70 p-2.5 shadow-xs transition-all max-h-[calc(100vh-210px)] ${
                  col.borderTop
                } border-t-4 ${
                  isDraggingOver
                    ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-300/60"
                    : ""
                }`}
              >
                {/* Column Header */}
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      {col.title}
                    </h2>
                    <span
                      className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${col.badgeBg} ${col.badgeText}`}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 font-medium">
                    {colPoints} pts
                  </span>
                </div>

                {/* Tasks Container */}
                <div className="flex flex-col gap-2 overflow-y-auto pr-0.5">
                  {colTasks.length === 0 && isDraggingOver && (
                    <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/60 py-6 text-center">
                      <p className="text-xs font-semibold text-blue-600">Thả thẻ vào đây</p>
                    </div>
                  )}

                  {colTasks.map((task) => {
                    const parentTask = task.dependsOn ? getTaskById(task.dependsOn) : null;
                    const isParentDone = parentTask ? parentTask.column === "done" : true;
                    const isLocked = !isParentDone;
                    const isDragging = draggingTaskId === task.id;

                    const doneChecklist = task.checklist.filter((c) => c.done).length;
                    const totalChecklist = task.checklist.length;

                    // Match assignee color from dynamic team
                    const memberMeta = teamMembers.find((m) => m.name === task.assignee.name);
                    const avatarColor = memberMeta?.color || "bg-blue-600";

                    return (
                      <div
                        key={task.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => setSelectedTask(task)}
                        className={`group relative flex cursor-grab active:cursor-grabbing flex-col rounded-xl border bg-white p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
                          isDragging
                            ? "opacity-40 scale-95 border-blue-400"
                            : isLocked
                            ? "border-slate-200 bg-slate-50/80"
                            : "border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        {/* Drag Handle & Epic Tag */}
                        <div className="mb-2 flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <GripVertical
                              size={13}
                              className="text-slate-300 group-hover:text-slate-500"
                            />
                            <span className="font-mono text-[10px] font-bold text-slate-600">
                              #{task.code}
                            </span>
                            <span
                              className={`rounded-md border px-1.5 py-0.2 text-[10px] font-semibold ${task.epicColor}`}
                            >
                              {task.epic}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* MoSCoW Badge */}
                            {task.moscow && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                  task.moscow === "must"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : task.moscow === "should"
                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                    : task.moscow === "could"
                                    ? "bg-sky-50 text-sky-700 border border-sky-200"
                                    : "bg-slate-50 text-slate-600 border border-slate-200"
                                }`}
                                title={`Phân loại MoSCoW: ${task.moscow.toUpperCase()} HAVE`}
                              >
                                {task.moscow.toUpperCase()}
                              </span>
                            )}
                            {/* Story Points */}
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600">
                              {task.points}p
                            </span>
                            {/* Priority Badge */}
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                task.priority === "high"
                                  ? "bg-rose-100 text-rose-700"
                                  : task.priority === "medium"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {task.priority === "high" ? "P0" : task.priority === "medium" ? "P1" : "P2"}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="mb-1 text-xs font-bold leading-snug text-slate-900 group-hover:text-blue-600">
                          {task.title}
                        </h3>

                        {/* Description */}
                        <p className="mb-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                          {task.description}
                        </p>

                        {/* User Story preview if exists */}
                        {task.userStory && (
                          <div className="mb-2 rounded-lg bg-slate-50/90 border border-slate-100 p-1.5 text-[10px] text-slate-600 leading-snug line-clamp-2">
                            <span className="font-bold text-slate-700">Story:</span> Là <span className="text-blue-600 font-semibold">{task.userStory.role}</span>, tôi muốn {task.userStory.want}...
                          </div>
                        )}

                        {/* Hard Constraint H2 Dependency Status */}
                        {task.dependsOn && parentTask && (
                          <div
                            className={`mb-2.5 flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium transition ${
                              isLocked
                                ? "border-rose-200 bg-rose-50/80 text-rose-700"
                                : "border-emerald-200 bg-emerald-50/80 text-emerald-700"
                            }`}
                          >
                            {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                            <span className="truncate">
                              {isLocked ? "H2 Chờ: #" : "H2 Khả dụng: #"}{parentTask.code} ({parentTask.assignee.name})
                            </span>
                          </div>
                        )}

                        {/* Deliverable Badge (PR, Commit, Test) */}
                        {task.deliverable && (
                          <div className="mb-2.5 flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/70 px-2 py-1 text-[10px] font-medium text-indigo-700">
                            {task.deliverable.type === "pr" ? (
                              <GitPullRequest size={12} />
                            ) : task.deliverable.type === "commit" ? (
                              <GitCommit size={12} />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            <span className="truncate">{task.deliverable.label}</span>
                          </div>
                        )}

                        {/* Checklist progress if exists */}
                        {totalChecklist > 0 && (
                          <div className="mb-2 flex items-center gap-2 text-[10px] text-slate-500">
                            <ListChecks size={12} className={doneChecklist === totalChecklist ? "text-emerald-600" : "text-slate-400"} />
                            <span>
                              {doneChecklist}/{totalChecklist} checklist
                            </span>
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div
                                style={{
                                  width: `${Math.round((doneChecklist / totalChecklist) * 100)}%`,
                                }}
                                className="h-full bg-blue-500"
                              />
                            </div>
                          </div>
                        )}

                        {/* DoD Compliance Badge */}
                        {task.definitionOfDone && task.definitionOfDone.length > 0 && (
                          <div className="mb-2 flex items-center gap-1.5 text-[10px] text-slate-600">
                            <ShieldCheck
                              size={12}
                              className={
                                task.definitionOfDone.filter((d) => d.done).length === task.definitionOfDone.length
                                  ? "text-emerald-600"
                                  : "text-slate-400"
                              }
                            />
                            <span className="font-medium">
                              DoD: {task.definitionOfDone.filter((d) => d.done).length}/{task.definitionOfDone.length} tiêu chuẩn
                            </span>
                          </div>
                        )}

                        {/* Footer: Assignee & Due Date */}
                        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white shadow-xs ${avatarColor}`}
                              title={`${task.assignee.name} (${task.assignee.role})`}
                            >
                              {task.assignee.avatar}
                            </span>
                            <span className="font-medium text-slate-700 text-[11px]">
                              {task.assignee.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                            {task.commentsCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <MessageSquare size={11} />
                                {task.commentsCount}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-slate-500">
                              <Calendar size={11} />
                              {task.dueDate}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Inline Quick Add Card - Trello Style */}
                {inlineAddingCol === col.id ? (
                  <div className="mt-1.5 rounded-xl border border-blue-400/80 bg-white p-2 shadow-xs">
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
                      className="w-full resize-none border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                    />
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => handleInlineAdd(col.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
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
                    className="mt-1 flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900"
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

      {/* ── TAB 2: DEPENDENCIES & CONSTRAINT H2 GRAPH ────────────────────── */}
      {activeTab === "dependencies" && (
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs overflow-y-auto">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Sơ đồ Ràng buộc Phụ thuộc Nhiệm vụ (Hard Constraint H2)
              </h2>
              <p className="text-xs text-slate-500">
                Quy định thứ tự bàn giao: Task con chỉ được phép chuyển sang cột Done khi task tiền đề đã hoàn tất.
              </p>
            </div>
            <span className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
              Kiểm soát tự động bởi Backend Rule Engine
            </span>
          </div>

          <div className="space-y-4 max-w-3xl">
            {tasks
              .filter((t) => t.dependsOn)
              .map((task) => {
                const parent = getTaskById(task.dependsOn!);
                const isParentDone = parent?.column === "done";
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                  >
                    {/* Parent Task */}
                    <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono font-bold text-slate-600">#{parent?.code}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            isParentDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {parent?.column}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{parent?.title}</p>
                      <p className="text-[11px] text-slate-500 mt-1">Phụ trách: {parent?.assignee.name}</p>
                    </div>

                    {/* Arrow with Lock/Unlock */}
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm ${
                          isParentDone ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      >
                        {isParentDone ? <Unlock size={16} /> : <Lock size={16} />}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1">H2</span>
                    </div>

                    {/* Dependent Task */}
                    <div
                      className={`flex-1 rounded-lg border p-3 shadow-2xs ${
                        isParentDone
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-rose-200 bg-rose-50/40"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono font-bold text-slate-600">#{task.code}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            task.column === "done" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {task.column}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{task.title}</p>
                      <p className="text-[11px] text-slate-500 mt-1">Phụ trách: {task.assignee.name}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── TAB 3: PROJECT OVERVIEW, BURNDOWN CHART & ANTI-FREERIDER DASHBOARD ──────────────────────── */}
      {activeTab === "analytics" && (
        <div className="flex-1 space-y-5 overflow-y-auto pr-1 animate-in fade-in">
          {/* Header & Quick Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
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

          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-medium text-slate-400 block mb-1">Tổng Điểm Sprint:</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">{sprintStats.totalPoints}</span>
                <span className="text-xs font-bold text-slate-500">Story Points</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Cam kết 9 tasks trong Sprint 1</p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
              <span className="text-[11px] font-medium text-emerald-700 block mb-1">Đã Hoàn Thành (Done):</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-700">{sprintStats.donePoints}</span>
                <span className="text-xs font-bold text-emerald-600">pts ({sprintStats.percentDone}%)</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200/60">
                <div style={{ width: `${sprintStats.percentDone}%` }} className="h-full bg-emerald-500" />
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs">
              <span className="text-[11px] font-medium text-rose-700 block mb-1">Điểm Còn Lại (Remaining):</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-rose-600">
                  {sprintStats.totalPoints - sprintStats.donePoints}
                </span>
                <span className="text-xs font-bold text-rose-600">pts (Đường Đỏ)</span>
              </div>
              <p className="text-[10px] text-rose-600/80 mt-1">Cần hoàn tất trước hạn 15/11</p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
              <span className="text-[11px] font-medium text-amber-700 block mb-1">Vận tốc Sprint (Velocity):</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-800">36.5</span>
                <span className="text-xs font-bold text-amber-700">SP / Sprint</span>
              </div>
              <p className="text-[10px] text-amber-700/80 mt-1">Đạt năng suất chuẩn công nghiệp</p>
            </div>
          </div>

          {/* Main Visuals Grid: Burndown Chart with Red Line + Velocity Chart */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* 1. SPRINT BURNDOWN CHART (7 cols) - MINIMALIST & TASTEFUL */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
              {/* Header: Clean & Modern like Linear */}
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                      <TrendingDown size={14} />
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Sprint Burndown
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      Sprint 1
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-black tracking-tight text-slate-900">
                      15 <span className="text-xs font-semibold text-slate-400">pts còn lại</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      ↓ 60.5% đã hoàn tất
                    </span>
                  </div>
                </div>

                {/* Minimalist Legend */}
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="h-0.5 w-3.5 border-b-2 border-dashed border-slate-300" />
                    <span>Lý tưởng</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500 shadow-xs" />
                    <span className="font-semibold text-rose-600">Thực tế (Đường đỏ)</span>
                  </div>
                </div>
              </div>

              {/* Minimalist SVG Chart (Smooth Bezier Spline, Zero Clutter) */}
              <div className="w-full py-2">
                <svg viewBox="0 0 500 210" className="w-full h-52 overflow-visible">
                  <defs>
                    <linearGradient id="softRoseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Faint Guide Lines */}
                  {[
                    { y: 25, label: "40" },
                    { y: 65, label: "30" },
                    { y: 105, label: "20" },
                    { y: 145, label: "10" },
                    { y: 185, label: "0" },
                  ].map((grid, i) => (
                    <g key={i}>
                      <line
                        x1="35"
                        y1={grid.y}
                        x2="480"
                        y2={grid.y}
                        stroke="#f1f5f9"
                        strokeDasharray={i === 4 ? "none" : "4 4"}
                        strokeWidth={i === 4 ? "1.5" : "1"}
                      />
                      <text
                        x="25"
                        y={grid.y + 3.5}
                        textAnchor="end"
                        fontSize="9.5"
                        fill="#94a3b8"
                        fontFamily="ui-monospace, monospace"
                      >
                        {grid.label}
                      </text>
                    </g>
                  ))}

                  {/* Day Axis Columns */}
                  {[
                    { day: "25/10", x: 45 },
                    { day: "27/10", x: 117 },
                    { day: "29/10", x: 190 },
                    { day: "31/10", x: 262 },
                    { day: "02/11", x: 335 },
                    { day: "Hôm nay", x: 407, active: true },
                    { day: "15/11", x: 480 },
                  ].map((d, i) => (
                    <g key={i}>
                      <text
                        x={d.x}
                        y="202"
                        textAnchor="middle"
                        fontSize="10"
                        fill={d.active ? "#0f172a" : "#94a3b8"}
                        fontWeight={d.active ? "bold" : "normal"}
                      >
                        {d.day}
                      </text>
                    </g>
                  ))}

                  {/* IDEAL SPRINT LINE (Subtle Dashed Gray) */}
                  <line
                    x1="45"
                    y1="33"
                    x2="480"
                    y2="185"
                    stroke="#cbd5e1"
                    strokeWidth="1.75"
                    strokeDasharray="4 4"
                  />

                  {/* SMOOTH CURVED AREA FILL */}
                  <path
                    d="M 45 33 C 80 33, 90 33, 117 33 C 150 33, 160 53, 190 53 C 220 53, 230 75, 262 75 C 295 75, 305 115, 335 115 C 365 115, 380 126, 407 126 L 407 185 L 45 185 Z"
                    fill="url(#softRoseGradient)"
                  />

                  {/* SMOOTH RED CURVE (ĐƯỜNG CONG MÀU ĐỎ TUYỆT ĐẸP) */}
                  <path
                    d="M 45 33 C 80 33, 90 33, 117 33 C 150 33, 160 53, 190 53 C 220 53, 230 75, 262 75 C 295 75, 305 115, 335 115 C 365 115, 380 126, 407 126"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Clean Minimalist Dots on Data Nodes (No Clunky Black Boxes) */}
                  {[
                    { x: 45, y: 33 },
                    { x: 117, y: 33 },
                    { x: 190, y: 53 },
                    { x: 262, y: 75 },
                    { x: 335, y: 115 },
                  ].map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r="3.5"
                      fill="#ffffff"
                      stroke="#f43f5e"
                      strokeWidth="2"
                    />
                  ))}

                  {/* Start Point Hint: 38p (Muted) */}
                  <text
                    x="45"
                    y="22"
                    textAnchor="middle"
                    fontSize="9"
                    fill="#94a3b8"
                    fontFamily="ui-monospace, monospace"
                  >
                    38 pts
                  </text>

                  {/* LATEST POINT: TODAY (Hôm nay - Day 6) with Chic Floating Pill */}
                  <g className="cursor-pointer">
                    {/* Pulsing ring */}
                    <circle cx="407" cy="126" r="9" fill="#f43f5e" opacity="0.2" className="animate-ping" />
                    {/* Solid node */}
                    <circle cx="407" cy="126" r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="2.5" />

                    {/* Chic Minimalist Black Pill Badge Floating Above */}
                    <rect
                      x="381"
                      y="94"
                      width="52"
                      height="22"
                      rx="11"
                      fill="#0f172a"
                      className="shadow-sm"
                    />
                    <text
                      x="407"
                      y="108.5"
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#ffffff"
                      fontWeight="bold"
                      fontFamily="ui-monospace, monospace"
                    >
                      15 pts
                    </text>
                  </g>
                </svg>
              </div>

              {/* Minimalist Linear-Style Status Footer */}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Đang bám sát đường lý tưởng • Dự kiến hoàn thành đúng hạn 15/11</span>
                </div>
                <span className="font-semibold text-slate-700 bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 rounded-full text-[11px]">
                  Hiệu suất 94%
                </span>
              </div>
            </div>

            {/* 2. VELOCITY CHART & EPIC DISTRIBUTION (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Velocity Chart */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <BarChart3 size={15} className="text-blue-600" />
                    Biểu đồ Vận tốc Nhóm (Velocity qua 4 Sprints)
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-500">Session 07</span>
                </div>

                <div className="space-y-3">
                  {[
                    { name: "Sprint 1 (Kiến trúc & SRS)", committed: 38, done: 23, active: true },
                    { name: "Sprint 2 (LMS & Sandbox)", committed: 35, done: 0, active: false },
                    { name: "Sprint 3 (Kanban & WBS)", committed: 40, done: 0, active: false },
                    { name: "Sprint 4 (Defense & Báo cáo)", committed: 32, done: 0, active: false },
                  ].map((s, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex justify-between text-[11px] font-medium mb-1">
                        <span className={s.active ? "font-bold text-blue-700" : "text-slate-600"}>
                          {s.name}
                        </span>
                        <span className="font-mono text-slate-500">
                          {s.active ? `${s.done} / ${s.committed} pts` : `${s.committed} pts dự kiến`}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
                        <div
                          style={{ width: `${Math.round((s.done / s.committed) * 100)}%` }}
                          className="bg-emerald-500"
                        />
                        <div
                          style={{
                            width: `${Math.round(((s.committed - s.done) / s.committed) * 100)}%`,
                          }}
                          className={s.active ? "bg-rose-400" : "bg-slate-200"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Epic Distribution */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
                  <PieChart size={14} className="text-purple-600" />
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
                        <span className="font-bold text-slate-900">{percent}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Story Points hoàn thành:</span>
                        <span className="font-mono font-bold text-slate-900">{points} pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Số task đã Done:</span>
                        <span className="font-bold text-slate-900">{doneCount} tasks</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
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
              <button onClick={() => setMemberModalOpen(false)} className="text-slate-400 hover:text-slate-600">
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
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5 mb-5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserPlus size={14} className="text-blue-600" /> Thêm thành viên mới:
              </span>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Họ và tên (ví dụ: Nguyễn Văn Nam)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
                <input
                  type="text"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  placeholder="Vai trò (ví dụ: DevOps / UI Designer)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
              <button
                onClick={handleAddMember}
                disabled={!newMemberName.trim()}
                className="w-full rounded-xl bg-blue-600 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
              >
                + Thêm vào Nhóm
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setMemberModalOpen(false)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl">
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
                onClick={() => setH2Violation(null)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-purple-200 bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-sm shadow-purple-500/20">
                  <Sparkles size={20} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    AI Task Decomposition Studio (WBS Generator)
                  </h3>
                  <p className="text-xs text-slate-500">
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
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* STAGE 1: GUIDED STRUCTURED INPUTS */}
            {aiStage === "input" && (
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {/* 1-Click Presets */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
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
                            ? "border-purple-400 bg-purple-50/70 shadow-xs"
                            : "border-slate-200 bg-slate-50/50 hover:border-purple-200 hover:bg-purple-50/30"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-0.5">
                          <span>{preset.name}</span>
                          <span className="text-[10px] uppercase font-mono font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                            {preset.stack}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{preset.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feature Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Tên Tính năng / Module nghiệp vụ: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={aiFeatureName}
                    onChange={(e) => setAiFeatureName(e.target.value)}
                    placeholder="Ví dụ: Docker Sandbox Code Runner, Socratic AI Tutor, AI Defense Room..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                {/* Dynamic Team Members Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
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
                        className="text-[11px] font-semibold text-purple-600 hover:underline"
                      >
                        {aiSelectedMemberIds.length === teamMembers.length ? "Bỏ chọn hết" : "Chọn tất cả"}
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setMemberModalOpen(true)}
                        className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
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
                          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                            isSelected
                              ? "border-purple-300 bg-purple-50 text-purple-900 shadow-2xs font-semibold"
                              : "border-slate-200 bg-slate-50 text-slate-500 opacity-60"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${m.color}`} />
                          <span>{m.name}</span>
                          <span className="text-[10px] text-slate-400">({m.role})</span>
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
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                {/* Tech Stack & Granularity */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
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
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
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
                    <label className="mb-1.5 block text-xs font-semibold text-purple-800">
                      Nhập công nghệ tùy chỉnh của Huynh:
                    </label>
                    <input
                      type="text"
                      value={aiCustomTech}
                      onChange={(e) => setAiCustomTech(e.target.value)}
                      placeholder="Ví dụ: FastAPI + Docker Sandbox + WebSocket + PostgreSQL..."
                      className="w-full rounded-xl border border-purple-300 bg-purple-50/30 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-hidden"
                    />
                  </div>
                )}

                {/* Constraints Checklist */}
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3 text-xs">
                  <span className="font-bold text-purple-900 block mb-1.5">
                    Các quy tắc kỹ nghệ tự động áp dụng:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aiIncludeH2}
                        onChange={(e) => setAiIncludeH2(e.target.checked)}
                        className="rounded border-slate-300 text-purple-600"
                      />
                      <span>Tự động liên kết Ràng buộc cứng H2</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked readOnly className="rounded border-slate-300 text-purple-600" />
                      <span>Chia đều cho các thành viên được chọn</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked readOnly className="rounded border-slate-300 text-purple-600" />
                      <span>Ước lượng thời gian nguyên tử (2 - 5 giờ)</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked readOnly className="rounded border-slate-300 text-purple-600" />
                      <span>Cho phép xem lại trước khi chốt nạp</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 2: PREVIEW & CUSTOMIZE BEFORE CONFIRMING */}
            {aiStage === "preview" && (
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600 bg-purple-50/70 p-2.5 rounded-xl border border-purple-200">
                  <span className="font-semibold text-purple-900">
                    AI đã phân rã thành công {aiPreviewTasks.length} task nguyên tử:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Huynh có thể đổi người làm hoặc số giờ trước khi nạp
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
                          <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
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
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-purple-500 focus:outline-hidden"
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
                                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${m.color}`}>
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
                    onClick={() => setAiModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Đóng
                  </button>
                  <button
                    disabled={aiGenerating || !aiFeatureName.trim() || aiSelectedMemberIds.length === 0}
                    onClick={handleGenerateWbs}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
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

      {/* ── TASK DETAIL MODAL (LINEAR / JIRA STYLE WITH SCRUM & SE SPECS) ────────────────────────── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  #{selectedTask.code}
                </span>
                <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${selectedTask.epicColor}`}>
                  {selectedTask.epic}
                </span>
                {selectedTask.moscow && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                      selectedTask.moscow === "must"
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : selectedTask.moscow === "should"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : selectedTask.moscow === "could"
                        ? "bg-sky-100 text-sky-800 border border-sky-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    MoSCoW: {selectedTask.moscow.toUpperCase()}
                  </span>
                )}
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-700">
                  {selectedTask.points} Story Points
                </span>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Tab Switcher inside Modal */}
            <div className="mb-3 flex border-b border-slate-100">
              <button
                onClick={() => setTaskDetailTab("general")}
                className={`pb-2 text-xs font-semibold transition border-b-2 mr-4 ${
                  taskDetailTab === "general"
                    ? "border-blue-600 text-blue-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Tổng quan & Checklist
              </button>
              <button
                onClick={() => setTaskDetailTab("engineering")}
                className={`pb-2 text-xs font-semibold transition border-b-2 flex items-center gap-1.5 ${
                  taskDetailTab === "engineering"
                    ? "border-indigo-600 text-indigo-600 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <GraduationCap size={14} />
                Quy chuẩn Kỹ nghệ Scrum (User Story, AC Gherkin, DoD)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {taskDetailTab === "general" ? (
                <>
                  {/* Title & Description */}
                  <div>
                    <h2 className="mb-1 text-base font-bold text-slate-900">{selectedTask.title}</h2>
                    <p className="text-xs leading-relaxed text-slate-600">{selectedTask.description}</p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Người phụ trách:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedTask.assignee.name} ({selectedTask.assignee.role})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Thời lượng ước tính:</span>
                      <span className="font-semibold text-slate-800">{selectedTask.estimateHours} giờ làm việc</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Trạng thái cột:</span>
                      <span className="font-bold uppercase text-blue-700">{selectedTask.column}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Hạn chót (Deadline):</span>
                      <span className="font-semibold text-slate-800">{selectedTask.dueDate}</span>
                    </div>
                  </div>

                  {/* Checklist */}
                  {selectedTask.checklist.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                        <ListChecks size={14} className="text-blue-600" />
                        Danh sách việc cần làm (Checklist):
                      </h4>
                      <div className="space-y-1.5 rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
                        {selectedTask.checklist.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => {
                                const updated = selectedTask.checklist.map((c) =>
                                  c.id === item.id ? { ...c, done: !c.done } : c
                                );
                                setSelectedTask({ ...selectedTask, checklist: updated });
                                setTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === selectedTask.id ? { ...t, checklist: updated } : t
                                  )
                                );
                              }}
                              className="rounded border-slate-300 text-blue-600"
                            />
                            <span className={item.done ? "line-through text-slate-400" : ""}>{item.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Move Column Selector */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs font-semibold text-slate-700">Chuyển sang cột:</span>
                    <div className="flex gap-1.5">
                      {columnsConfig.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            moveTask(selectedTask.id, c.id);
                            setSelectedTask((prev) => (prev ? { ...prev, column: c.id } : null));
                          }}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            selectedTask.column === c.id
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 bg-white text-slate-600 hover:border-blue-400"
                          }`}
                        >
                          {c.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3.5">
                  {/* User Story (INVEST Framework) */}
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <FileText size={14} className="text-blue-600" />
                        Cấu trúc User Story (Chuẩn INVEST - Rikkei SS03):
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">
                        Agile SS03
                      </span>
                    </div>
                    {selectedTask.userStory ? (
                      <div className="space-y-1 text-xs leading-relaxed text-slate-700">
                        <p>
                          <span className="font-bold text-slate-900">Là (Role): </span>
                          <span className="text-blue-700 font-semibold">{selectedTask.userStory.role}</span>
                        </p>
                        <p>
                          <span className="font-bold text-slate-900">Tôi muốn (Goal): </span>
                          <span>{selectedTask.userStory.want}</span>
                        </p>
                        <p>
                          <span className="font-bold text-slate-900">Để mang lại lợi ích (Benefit): </span>
                          <span className="text-emerald-700 font-medium">{selectedTask.userStory.benefit}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Chưa có User Story chi tiết.</p>
                    )}
                  </div>

                  {/* Acceptance Criteria (Gherkin Syntax) */}
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <ListChecks size={14} className="text-purple-600" />
                        Tiêu chí Nghiệm thu (Acceptance Criteria - Cú pháp Gherkin):
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">
                        Agile SS05
                      </span>
                    </div>
                    {selectedTask.acceptanceCriteria ? (
                      <div className="rounded-xl border border-purple-100 bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-800">
                        {selectedTask.acceptanceCriteria.split("\n").map((line, idx) => {
                          const isGiven = line.startsWith("Given");
                          const isWhen = line.startsWith("When");
                          const isThen = line.startsWith("Then");
                          return (
                            <div key={idx} className="py-0.5">
                              {isGiven && <span className="font-bold text-blue-600">GIVEN </span>}
                              {isWhen && <span className="font-bold text-amber-600">WHEN </span>}
                              {isThen && <span className="font-bold text-emerald-600">THEN </span>}
                              {!isGiven && !isWhen && !isThen && <span>{line}</span>}
                              {(isGiven || isWhen || isThen) && (
                                <span>{line.replace(/^(Given|When|Then)\s*/i, "")}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Chưa thiết lập cú pháp Gherkin.</p>
                    )}
                  </div>

                  {/* Definition of Done (DoD) Checklist */}
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        Tiêu chuẩn Hoàn thành Chung (Definition of Done - DoD):
                      </span>
                      <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">
                        4 Tiêu chuẩn Công nghiệp
                      </span>
                    </div>
                    <div className="space-y-2 rounded-xl border border-emerald-100 bg-white p-3">
                      {(selectedTask.definitionOfDone || defaultDoD(false)).map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => {
                              const currentDoD = selectedTask.definitionOfDone || defaultDoD(false);
                              const updated = currentDoD.map((d) =>
                                d.id === item.id ? { ...d, done: !d.done } : d
                              );
                              setSelectedTask({ ...selectedTask, definitionOfDone: updated });
                              setTasks((prev) =>
                                prev.map((t) =>
                                  t.id === selectedTask.id ? { ...t, definitionOfDone: updated } : t
                                )
                              );
                            }}
                            className="rounded border-slate-300 text-emerald-600"
                          />
                          <span className={item.done ? "font-semibold text-emerald-800 line-through opacity-80" : "text-slate-700"}>
                            {item.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-[11px] text-slate-400">
                Tuân thủ quy chuẩn IEEE 830, Rikkei Education & Ràng buộc H1-H4
              </span>
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ENGINEERING & AGILE SCRUM HANDBOOK MODAL (RIKKEI EDUCATION SYLLABUS) ────────── */}
      {handbookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 shadow-xs">
                  <GraduationCap size={22} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cẩm nang Kỹ nghệ Phần mềm & Agile Scrum
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đúc kết bộ bài giảng Phân tích thiết kế hệ thống & Scrum (Rikkei Education) cho Đề án CodeMind
                  </p>
                </div>
              </div>
              <button onClick={() => setHandbookOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="mb-4 flex rounded-2xl border border-slate-200 bg-slate-100/70 p-1">
              <button
                onClick={() => setHandbookTab("scrum")}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                  handbookTab === "scrum"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                1. Quy trình Agile / Scrum (SS02 - SS09)
              </button>
              <button
                onClick={() => setHandbookTab("pttk")}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                  handbookTab === "pttk"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                2. Phân tích Thiết kế Hệ thống & UML (SS01 - SS17)
              </button>
            </div>

            {/* Handbook Content Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs text-slate-700">
              {handbookTab === "scrum" ? (
                <>
                  {/* Pillar 1: 3 Trụ cột & 3 Vai trò */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">1</span>
                      3 Trụ cột Scrum & 3 Vai trò Cốt lõi (Session 02)
                    </h4>
                    <div className="grid grid-cols-3 gap-2.5 mb-2">
                      <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-2xs">
                        <p className="font-bold text-blue-700">Minh bạch (Transparency)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Mọi task, blocker H2 và story points đều hiển thị công khai trên Kanban.</p>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-2xs">
                        <p className="font-bold text-amber-700">Thanh tra (Inspection)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Thường xuyên kiểm tra tiến độ, burn-down velocity và chất lượng mã nguồn.</p>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-2xs">
                        <p className="font-bold text-emerald-700">Thích nghi (Adaptation)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Sẵn sàng điều chỉnh kế hoạch Sprint khi có góp ý từ Thầy Phước.</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      <strong>3 Vai trò:</strong> Product Owner (Định hướng sản phẩm), Scrum Master (Điều phối, gỡ bỏ blocker), Developers (Đội ngũ kỹ thuật).
                    </p>
                  </div>

                  {/* Pillar 2: D.E.E.P Backlog & INVEST User Story */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-[10px]">2</span>
                      Tiêu chuẩn D.E.E.P cho Product Backlog & INVEST cho User Story (Session 03)
                    </h4>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="rounded-xl bg-white p-2.5 border border-slate-200/60">
                        <p className="font-bold text-purple-700 mb-1">Tiêu chuẩn D.E.E.P Backlog:</p>
                        <ul className="space-y-0.5 text-[11px] list-disc list-inside text-slate-600">
                          <li><strong>D</strong>etailed appropriately: Task đỉnh chi tiết, đáy là Epic</li>
                          <li><strong>E</strong>stimated: Toàn bộ thẻ đều có điểm Fibonacci</li>
                          <li><strong>E</strong>mergent: Backlog liên tục tiến hóa theo Sprint</li>
                          <li><strong>P</strong>rioritized: Luôn ưu tiên theo mức độ quan trọng</li>
                        </ul>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border border-slate-200/60">
                        <p className="font-bold text-indigo-700 mb-1">Tiêu chuẩn INVEST User Story:</p>
                        <ul className="space-y-0.5 text-[11px] list-disc list-inside text-slate-600">
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
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">3</span>
                      Phân loại MoSCoW & Cú pháp Gherkin vs Definition of Done (Session 05)
                    </h4>
                    <div className="grid grid-cols-4 gap-2 mb-2 text-center text-[11px]">
                      <div className="rounded-xl bg-rose-50 border border-rose-200 p-2 text-rose-800 font-bold">
                        M - Must Have<br/><span className="text-[10px] font-normal text-rose-600">Bắt buộc hoàn thành</span>
                      </div>
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-2 text-amber-800 font-bold">
                        S - Should Have<br/><span className="text-[10px] font-normal text-amber-600">Nên có trong bản MVP</span>
                      </div>
                      <div className="rounded-xl bg-sky-50 border border-sky-200 p-2 text-sky-800 font-bold">
                        C - Could Have<br/><span className="text-[10px] font-normal text-sky-600">Gia tăng trải nghiệm</span>
                      </div>
                      <div className="rounded-xl bg-slate-100 border border-slate-200 p-2 text-slate-700 font-bold">
                        W - Won't Have<br/><span className="text-[10px] font-normal text-slate-500">Dời sang giai đoạn sau</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 text-[11px]">
                      <span className="font-bold text-slate-800">Phân biệt AC và DoD: </span>
                      <strong>AC (Acceptance Criteria)</strong> là tiêu chí nghiệm thu riêng cho từng Story (Given - When - Then). Còn <strong>DoD (Definition of Done)</strong> là tiêu chuẩn kỹ thuật chung bắt buộc cho MỌI task (100% test pass, Clean 3 tầng, Lint pass, Review PR).
                    </div>
                  </div>

                  {/* Pillar 4: Fibonacci & Retro 5 Bước */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">4</span>
                      Dãy Fibonacci (1, 2, 3, 5, 8) & Quy trình 5 Bước Retrospective (Session 07, 09)
                    </h4>
                    <p className="text-[11px] text-slate-600 mb-2">
                      Dãy số Fibonacci phản ánh độ bất định tăng phi tuyến tính. Task trên 8 Story Points bắt buộc phải chẻ nhỏ (WBS) để kiểm soát rủi ro.
                    </p>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-900">
                      <strong>5 Bước Retrospective (Văn hóa "No Blame Culture"):</strong>
                      <ol className="list-decimal list-inside space-y-0.5 mt-1">
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
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px]">1</span>
                      Tư duy Problem Solver vs Thợ gõ code (Fred Brooks - Session 01)
                    </h4>
                    <blockquote className="border-l-4 border-indigo-500 pl-3 italic text-[11px] text-indigo-950 mb-2">
                      "Phần khó nhất của việc xây dựng phần mềm là quyết định chính xác những gì cần phải xây dựng. Công nghệ chỉ là công cụ. Giá trị thực sự nằm ở việc giải quyết đúng bài toán trước khi viết dòng code đầu tiên."
                    </blockquote>
                    <p className="text-[11px] text-slate-600">
                      CodeMind Campus áp dụng triệt để nguyên lý này: Socratic AI Tutor không đưa code sẵn mà hướng dẫn sinh viên tìm nguyên nhân gốc rễ (Root Cause) của lỗi thuật toán.
                    </p>
                  </div>

                  {/* PTTK 2: Ma trận FR vs NFR */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-[10px]">2</span>
                      Phân định Yêu cầu Chức năng (FR) & Phi chức năng (NFR - Session 03)
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div className="rounded-xl bg-white p-2.5 border border-slate-200/60">
                        <p className="font-bold text-blue-700 mb-1">Functional Requirements (FR):</p>
                        <ul className="space-y-0.5 list-disc list-inside text-slate-600">
                          <li>LMS Lập trình & nộp bài qua Git / kéo thả</li>
                          <li>Sandbox chấm tự động 5 test cases Deque</li>
                          <li>Socratic AI Tutor gợi ý theo 3 nấc (Hint Ladder)</li>
                          <li>Bảng Kanban Ràng buộc H2 & Anti-Freerider</li>
                          <li>AI Defense Simulator giả lập Hội đồng phản biện</li>
                        </ul>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border border-slate-200/60">
                        <p className="font-bold text-purple-700 mb-1">Non-Functional Requirements (NFR):</p>
                        <ul className="space-y-0.5 list-disc list-inside text-slate-600">
                          <li><strong>Hiệu năng:</strong> Sandbox timeout &lt; 2000ms, API &lt; 300ms</li>
                          <li><strong>Bảo mật:</strong> Docker isolated process chống memory leak</li>
                          <li><strong>Chuẩn hóa dữ liệu:</strong> Timestamp chuẩn ISO-8601 UTC (H4)</li>
                          <li><strong>Độ sẵn sàng:</strong> Kiến trúc Layered độc lập chịu tải cao</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* PTTK 3: 4 Biểu đồ UML Cốt lõi */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-[10px]">3</span>
                      4 Biểu đồ UML Cốt lõi trong Thiết kế Hệ thống (Session 05, 07, 09)
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl bg-white p-2 border border-slate-200/60">
                        <p className="font-bold text-slate-800">1. Use Case Diagram (SS05)</p>
                        <p className="text-slate-500 mt-0.5">Mô hình hóa Actors (Sinh viên, Giảng viên, AI Mentor) cùng quan hệ &lt;&lt;include&gt;&gt; (Chấm bài include Sandbox) và &lt;&lt;extend&gt;&gt; (Hint AI).</p>
                      </div>
                      <div className="rounded-xl bg-white p-2 border border-slate-200/60">
                        <p className="font-bold text-slate-800">2. Activity Diagram (SS05)</p>
                        <p className="text-slate-500 mt-0.5">Biểu diễn luồng công việc chấm code, rẽ nhánh điều kiện Pass 5/5 sinh hash SHA-256 vs Fail mở Hint 1-3.</p>
                      </div>
                      <div className="rounded-xl bg-white p-2 border border-slate-200/60">
                        <p className="font-bold text-slate-800">3. Class Diagram (SS07)</p>
                        <p className="text-slate-500 mt-0.5">Cấu trúc OOP với thuộc tính, phương thức, Access Modifiers (+, -, #) và quan hệ Association / Composition giữa các Entity.</p>
                      </div>
                      <div className="rounded-xl bg-white p-2 border border-slate-200/60">
                        <p className="font-bold text-slate-800">4. Sequence Diagram (SS09)</p>
                        <p className="text-slate-500 mt-0.5">Trực quan hóa thông điệp đồng bộ/bất đồng bộ theo trục thời gian giữa React UI, FastAPI Router, Service, Docker và Database.</p>
                      </div>
                    </div>
                  </div>

                  {/* PTTK 4: Chuẩn hóa 3NF & Kiến trúc 3 Tầng */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">4</span>
                      Chuẩn hóa CSDL 3NF & Kiến trúc 3 Tầng Phân Tách (Session 15, 17)
                    </h4>
                    <div className="space-y-2 text-[11px]">
                      <div className="rounded-xl bg-white p-2.5 border border-slate-200/60">
                        <p className="font-bold text-emerald-800 mb-1">3 Cấp độ Chuẩn hóa CSDL (3NF):</p>
                        <p className="text-slate-600">
                          <strong>1NF:</strong> Mọi thuộc tính đều là giá trị nguyên tử (Atomic).<br/>
                          <strong>2NF:</strong> Đạt 1NF và loại bỏ phụ thuộc một phần vào khóa chính phức hợp.<br/>
                          <strong>3NF:</strong> Đạt 2NF và loại bỏ toàn bộ phụ thuộc bắc cầu (Transitive dependency) giữa Users, Submissions và TestCases.
                        </p>
                      </div>
                      <div className="rounded-xl bg-white p-2.5 border border-slate-200/60">
                        <p className="font-bold text-indigo-800 mb-1">Mô hình Kiến trúc 3 Tầng (3-Tier Clean Architecture):</p>
                        <p className="text-slate-600">
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
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-[11px] text-slate-400">
                Chương trình chuẩn Rikkei Education • Thầy Nguyễn Phước hướng dẫn
              </span>
              <button
                onClick={() => setHandbookOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Đã hiểu quy chuẩn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
