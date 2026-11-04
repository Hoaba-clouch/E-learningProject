import { useState, useMemo } from "react";
import {
  GitBranch,
  GitFork,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  FileCode2,
  Copy,
  Check,
  HelpCircle,
  UserCheck,
  BarChart3,
  BookOpen,
} from "lucide-react";

interface GitCommitItem {
  id: string;
  shortSha: string;
  branch: string;
  lane: number; // 0: main, 1: develop, 2: feature
  message: string;
  type: "feat" | "fix" | "docs" | "refactor" | "chore";
  author: {
    name: string;
    role: string;
    avatarInitials: string;
    avatarColor: string;
  };
  timestamp: string; // ISO-8601 UTC
  timeAgo: string;
  linkedTaskCode?: string;
  linkedTaskTitle?: string;
  stats: {
    additions: number;
    deletions: number;
    filesCount: number;
  };
  files: Array<{
    path: string;
    status: "added" | "modified" | "deleted";
    additions: number;
    deletions: number;
  }>;
  diffSnippet?: string;
  hygieneScore: number;
  hygieneFeedback: string;
  antiCheating: {
    status: "clean" | "warning" | "verified";
    cadenceRate: string;
    notes: string;
  };
  defenseQuestions: Array<{
    question: string;
    targetKnowledge: string;
    suggestedAnswerKey: string;
  }>;
}

const INITIAL_COMMITS: GitCommitItem[] = [
  {
    id: "c-1",
    shortSha: "62d902d",
    branch: "main",
    lane: 0,
    message: "fix(workspace): resolve ReferenceError on initial mount and align clean playground",
    type: "fix",
    author: {
      name: "Nguyễn Minh Anh",
      role: "Team Leader",
      avatarInitials: "MA",
      avatarColor: "bg-blue-600 text-white",
    },
    timestamp: "2026-11-04T11:05:00Z",
    timeAgo: "25 phút trước",
    linkedTaskCode: "TASK-10",
    linkedTaskTitle: "Thiết lập dự án Vite React 19, Tailwind CSS v4 và cấu trúc thư mục chuẩn",
    stats: { additions: 30, deletions: 60, filesCount: 3 },
    files: [
      { path: "src/screens/LearningWorkspace.tsx", status: "modified", additions: 18, deletions: 48 },
      { path: "src/screens/KanbanBoard.tsx", status: "modified", additions: 4, deletions: 8 },
      { path: "src/components/TaskCsvManagerModal.tsx", status: "modified", additions: 8, deletions: 4 },
    ],
    diffSnippet: `@@ -590,8 +590,6 @@ export default function LearningWorkspace() {
   const handleLanguageChange = (lang: "python" | "java" | "cpp") => {
     setSelectedLanguage(lang);
     setCodeValue(starterCodeSnippets[lang]);
-    setSubmissionResult(null);
-    setSelectedTestCaseId(5);
   };
@@ -642,3 +640,3 @@
-  }, [tab, codeValue, selectedLanguage, hasFailedBefore]);
+  }, [tab, codeValue, selectedLanguage]);`,
    hygieneScore: 98,
    hygieneFeedback: "Tuân thủ nghiêm ngặt Conventional Commits (fix:), có liên kết mã task và giải thích rõ phạm vi sửa đổi.",
    antiCheating: {
      status: "verified",
      cadenceRate: "Chuẩn xác",
      notes: "Diff tập trung xử lý dọn dẹp biến thừa, dung lượng vừa phải, tần suất phù hợp nhịp code thực tế.",
    },
    defenseQuestions: [
      {
        question: "Tại sao việc để biến chưa khai báo trong mảng dependencies của useEffect lại làm trắng toàn bộ trang thay vì chỉ một phần?",
        targetKnowledge: "Vòng đời React 19 & Error Boundary",
        suggestedAnswerKey: "Khi component mount, React đánh giá mảng deps; nếu gặp ReferenceError trong render phase mà không có Error Boundary bọc quanh, toàn bộ cây Fiber sẽ bị unmount.",
      },
    ],
  },
  {
    id: "c-2",
    shortSha: "b223d17",
    branch: "develop",
    lane: 1,
    message: "feat(sandbox): simplify isolated runner interface and live stdout stream",
    type: "feat",
    author: {
      name: "Trần Quốc Huy",
      role: "Backend & Sandbox Dev",
      avatarInitials: "QH",
      avatarColor: "bg-emerald-600 text-white",
    },
    timestamp: "2026-11-04T10:48:00Z",
    timeAgo: "42 phút trước",
    linkedTaskCode: "TASK-25",
    linkedTaskTitle: "Nghiên cứu & Xây dựng Docker Image Sandbox cô lập đa ngôn ngữ (C++ & Python)",
    stats: { additions: 112, deletions: 34, filesCount: 2 },
    files: [
      { path: "backend/app/services/sandbox_runner.py", status: "modified", additions: 84, deletions: 26 },
      { path: "backend/app/schemas/execution.py", status: "modified", additions: 28, deletions: 8 },
    ],
    diffSnippet: `@@ -45,12 +45,18 @@ async def execute_user_code(source: str, lang: str):
-    # Raw subprocess execution
-    proc = await asyncio.create_subprocess_shell(...)
+    # Isolated container execution with strict memory and CPU limits
+    cmd = ["docker", "run", "--rm", "--network", "none",
+           "--memory", "128m", "--cpus", "0.5",
+           "--user", "sandboxuser", f"sandbox-{lang}:latest"]
+    proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE)
+    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=2.5)`,
    hygieneScore: 95,
    hygieneFeedback: "Tiêu đề feat: rõ ràng. Mô tả chi tiết các tham số bảo mật container cô lập.",
    antiCheating: {
      status: "verified",
      cadenceRate: "Đạt chuẩn",
      notes: "Code có cấu trúc bài bản, sử dụng cgroup & network isolation đúng chuẩn yêu cầu thực tập của Thầy Phước.",
    },
    defenseQuestions: [
      {
        question: "Cờ --network none và --user sandboxuser đóng vai trò an toàn gì khi sinh viên gửi mã độc vào server?",
        targetKnowledge: "Docker Sandbox Security & RCE Prevention",
        suggestedAnswerKey: "--network none ngăn chặn container gửi request ra ngoài hoặc kết nối reverse shell; non-root user ngăn chặn việc leo thang đặc quyền escape container.",
      },
      {
        question: "Nếu sinh viên viết vòng lặp vô tận (while True), cơ chế nào đảm bảo server không bị treo vĩnh viễn?",
        targetKnowledge: "Timeout handling in AsyncIO",
        suggestedAnswerKey: "Sử dụng asyncio.wait_for với giới hạn timeout cứng (2.5 giây) để tự động terminate tiến trình và trả về TLE (Time Limit Exceeded).",
      },
    ],
  },
  {
    id: "c-3",
    shortSha: "f84c1a9",
    branch: "feature/erd-database-h4",
    lane: 2,
    message: "feat(database): define 8-table SQLAlchemy models with UTC ISO-8601 timestamps",
    type: "feat",
    author: {
      name: "Lê Hoàng Long",
      role: "Frontend & Database Dev",
      avatarInitials: "HL",
      avatarColor: "bg-purple-600 text-white",
    },
    timestamp: "2026-11-04T08:15:00Z",
    timeAgo: "3 giờ trước",
    linkedTaskCode: "TASK-15",
    linkedTaskTitle: "Hiện thực hóa Data Layer với SQLAlchemy & Quy chuẩn Timezone UTC ISO-8601 (H4)",
    stats: { additions: 245, deletions: 12, filesCount: 4 },
    files: [
      { path: "backend/app/models/user.py", status: "added", additions: 65, deletions: 0 },
      { path: "backend/app/models/course.py", status: "added", additions: 58, deletions: 0 },
      { path: "backend/app/models/submission.py", status: "added", additions: 74, deletions: 0 },
      { path: "backend/app/models/base.py", status: "modified", additions: 48, deletions: 12 },
    ],
    diffSnippet: `@@ -1,15 +1,24 @@
+from datetime import datetime, timezone
+from sqlalchemy import DateTime, Column, Integer, String
+
+class TimeStampedModel(Base):
+    __abstract__ = True
+    created_at = Column(
+        DateTime(timezone=True),
+        default=lambda: datetime.now(timezone.utc),
+        nullable=False
+    )`,
    hygieneScore: 96,
    hygieneFeedback: "Tuân thủ chuẩn H4 của Thầy Phước: 100% trường thời gian đều có DateTime(timezone=True) và datetime.now(timezone.utc).",
    antiCheating: {
      status: "verified",
      cadenceRate: "Đều đặn",
      notes: "Lịch sử commit trải dài qua các buổi học, tỷ lệ thêm/sửa file phù hợp khối lượng thiết kế CSDL Sprint 2.",
    },
    defenseQuestions: [
      {
        question: "Tại sao trong Python 3.12+ Thầy Phước yêu cầu không dùng datetime.utcnow() mà phải dùng datetime.now(timezone.utc)?",
        targetKnowledge: "Python Timezone Handling & Deprecation Notice",
        suggestedAnswerKey: "datetime.utcnow() sinh ra naive datetime object (không kèm thông tin offset), dễ gây lỗi lệch giờ khi serialize sang JSON ISO-8601. datetime.now(timezone.utc) tạo aware datetime chuẩn.",
      },
    ],
  },
  {
    id: "c-4",
    shortSha: "d3e7102",
    branch: "feature/auth-jwt-h4",
    lane: 3,
    message: "feat(auth): implement bcrypt password hashing and 15-min JWT token expiration",
    type: "feat",
    author: {
      name: "Nguyễn Minh Anh",
      role: "Team Leader",
      avatarInitials: "MA",
      avatarColor: "bg-blue-600 text-white",
    },
    timestamp: "2026-11-03T16:30:00Z",
    timeAgo: "1 ngày trước",
    linkedTaskCode: "TASK-17",
    linkedTaskTitle: "Xây dựng Module Authentication JWT & Băm mật khẩu an toàn với bcrypt",
    stats: { additions: 180, deletions: 15, filesCount: 3 },
    files: [
      { path: "backend/app/core/security.py", status: "added", additions: 82, deletions: 0 },
      { path: "backend/app/api/v1/auth.py", status: "added", additions: 78, deletions: 0 },
      { path: "backend/app/tests/test_auth.py", status: "added", additions: 20, deletions: 15 },
    ],
    hygieneScore: 92,
    hygieneFeedback: "Tốt. Có đầy đủ unit tests đi kèm xác thực token.",
    antiCheating: {
      status: "verified",
      cadenceRate: "Tốt",
      notes: "Code viết mạch lạc, tuân thủ Clean Architecture 3 tầng.",
    },
    defenseQuestions: [
      {
        question: "Khi Access Token hết hạn sau 15 phút, phía Client xử lý Refresh Token như thế nào mà người dùng không bị văng ra màn hình đăng nhập?",
        targetKnowledge: "Silent Token Refresh & Axios Interceptors",
        suggestedAnswerKey: "Sử dụng HTTP response interceptor (mã 401); tự động gọi endpoint /refresh với Refresh Token được lưu trong HttpOnly Cookie để lấy Access Token mới rồi gửi lại request cũ.",
      },
    ],
  },
  {
    id: "c-5",
    shortSha: "a1290bb",
    branch: "develop",
    lane: 1,
    message: "docs(uml): export high-resolution Class Diagram and Sequence Diagram for Sprint 1 DoD",
    type: "docs",
    author: {
      name: "Trần Quốc Huy",
      role: "Backend & Sandbox Dev",
      avatarInitials: "QH",
      avatarColor: "bg-emerald-600 text-white",
    },
    timestamp: "2026-11-03T10:15:00Z",
    timeAgo: "1 ngày trước",
    linkedTaskCode: "TASK-06",
    linkedTaskTitle: "Thiết kế Sơ đồ Lớp (Class Diagram - Session 07) & Thiết kế Hướng đối tượng",
    stats: { additions: 12, deletions: 4, filesCount: 2 },
    files: [
      { path: "docs/diagrams/class_diagram_v1.png", status: "added", additions: 6, deletions: 0 },
      { path: "docs/SRS_Module_2.md", status: "modified", additions: 6, deletions: 4 },
    ],
    hygieneScore: 90,
    hygieneFeedback: "Quy chuẩn docs: đạt yêu cầu, gắn mã task đầy đủ.",
    antiCheating: {
      status: "verified",
      cadenceRate: "Đạt chuẩn",
      notes: "File tài liệu cập nhật đúng tiến độ sprint review.",
    },
    defenseQuestions: [
      {
        question: "Trong Class Diagram của hệ thống, tại sao lớp SocraticHint lại có quan hệ Composition với Submission thay vì Aggregation?",
        targetKnowledge: "OOP Design: Composition vs Aggregation",
        suggestedAnswerKey: "Vì gợi ý Socratic gắn liền với một lần nộp cụ thể; nếu bản ghi Submission bị xóa, các gợi ý phát sinh trong phiên đó không thể tồn tại độc lập.",
      },
    ],
  },
];

const MEMBER_ANALYTICS = [
  {
    name: "Nguyễn Minh Anh",
    role: "Team Leader / Architecture",
    avatar: "MA",
    color: "bg-blue-600",
    commitCount: 18,
    additions: 1240,
    deletions: 210,
    sharePercentage: 36,
    hygieneScore: 96,
    cadenceScore: "Rất đều",
    tasksCompleted: 8,
  },
  {
    name: "Trần Quốc Huy",
    role: "Backend & Docker Sandbox",
    avatar: "QH",
    color: "bg-emerald-600",
    commitCount: 16,
    additions: 1180,
    deletions: 195,
    sharePercentage: 34,
    hygieneScore: 93,
    cadenceScore: "Đều đặn",
    tasksCompleted: 7,
  },
  {
    name: "Lê Hoàng Long",
    role: "Frontend UI & Database",
    avatar: "HL",
    color: "bg-purple-600",
    commitCount: 14,
    additions: 980,
    deletions: 160,
    sharePercentage: 30,
    hygieneScore: 91,
    cadenceScore: "Đạt chuẩn",
    tasksCompleted: 6,
  },
];

const BRANCH_LIST = [
  { name: "all", label: "Tất cả các nhánh", count: 48 },
  { name: "main", label: "main (Production)", count: 12 },
  { name: "develop", label: "develop (Staging)", count: 20 },
  { name: "feature/auth-jwt-h4", label: "feature/auth-jwt-h4", count: 8 },
  { name: "feature/erd-database-h4", label: "feature/erd-database-h4", count: 5 },
  { name: "feature/sandbox-runner", label: "feature/sandbox-runner", count: 3 },
];

export default function GitProjectHub() {
  const [commits, setCommits] = useState<GitCommitItem[]>(INITIAL_COMMITS);
  const [selectedCommitId, setSelectedCommitId] = useState<string>(INITIAL_COMMITS[0].id);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"diff" | "antiCheating" | "defense" | "members">("diff");
  const [copiedSha, setCopiedSha] = useState<boolean>(false);
  const [repoUrl, setRepoUrl] = useState<string>("https://github.com/Hoaba-clouch/E-learningProject");
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [customQuestionInput, setCustomQuestionInput] = useState<string>("");

  const filteredCommits = useMemo(() => {
    return commits.filter((c) => {
      const matchBranch = selectedBranch === "all" || c.branch === selectedBranch;
      const matchKeyword =
        searchKeyword.trim() === "" ||
        c.message.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.shortSha.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.author.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (c.linkedTaskCode && c.linkedTaskCode.toLowerCase().includes(searchKeyword.toLowerCase()));
      return matchBranch && matchKeyword;
    });
  }, [commits, selectedBranch, searchKeyword]);

  const selectedCommit = useMemo(() => {
    return commits.find((c) => c.id === selectedCommitId) ?? commits[0];
  }, [commits, selectedCommitId]);

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const handleAddDefenseQuestion = () => {
    if (!customQuestionInput.trim()) return;
    setCommits((prev) =>
      prev.map((c) => {
        if (c.id === selectedCommit.id) {
          return {
            ...c,
            defenseQuestions: [
              ...c.defenseQuestions,
              {
                question: customQuestionInput.trim(),
                targetKnowledge: "Câu hỏi vấn đáp bổ sung từ Giảng viên",
                suggestedAnswerKey: "Sinh viên cần giải thích trực tiếp theo mã nguồn đã commit.",
              },
            ],
          };
        }
        return c;
      }),
    );
    setCustomQuestionInput("");
  };

  return (
    <div className="min-h-full p-4 lg:p-6 space-y-5 bg-slate-50/60 text-slate-800">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 font-mono">
              <GitFork size={13} />
              Phân hệ 2 • Quản lý Mã nguồn & Kiểm soát Liêm chính
            </span>
            <span className="text-xs text-slate-500 font-medium">Git & Project Hub</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Visual Git Graph & Timeline Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            Sơ đồ cây nhánh Metro-line trực quan, liên kết 2 chiều với Task Kanban, kiểm soát nhịp độ commit (AI Anti-cheating) và sinh câu hỏi vấn đáp bảo vệ đồ án.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm"
          >
            <GitFork size={14} className="text-slate-500" />
            Đồng bộ Repo GitHub
          </button>
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition shadow-sm"
          >
            <ExternalLink size={14} />
            Mở trên GitHub
          </a>
        </div>
      </header>

      {/* 4 Metric Summary Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Điểm Văn hóa Git</span>
            <ShieldCheck size={16} className="text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">94.8</span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              Hạng A+ (Chuẩn)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">100% commit có mã Task và format feat/fix.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Kiểm định Liêm chính AI</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 font-mono">100%</span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Bình thường
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Không có dấu hiệu dồn code hoặc gánh team cực đoan.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Phân bổ Nhóm (3 TV)</span>
            <UserCheck size={16} className="text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">36:34:30</span>
            <span className="text-xs font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
              Cân bằng
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Minh Anh, Quốc Huy, Hoàng Long đều có commit.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tổng Commit & Nhánh</span>
            <GitBranch size={16} className="text-slate-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">48</span>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              5 Branches
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Branching Model: Git Flow (main, dev, feature/*).</p>
        </div>
      </section>

      {/* Main Workspace: 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Metro-line Git Graph & Timeline (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Controls: Search & Branch Filter */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm commit, mã task (#TASK-...), tác giả..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-slate-500" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {BRANCH_LIST.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Metro Branch Legend */}
          <div className="px-4 py-2 border-b border-slate-100 bg-white flex items-center gap-4 text-[11px] text-slate-500 overflow-x-auto">
            <span className="font-semibold text-slate-700 shrink-0">Các làn nhánh:</span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              main (lane 0)
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              develop (lane 1)
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
              feature/erd (lane 2)
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
              feature/auth (lane 3)
            </span>
          </div>

          {/* Commit List with Visual Rails */}
          <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {filteredCommits.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Không tìm thấy commit nào phù hợp với bộ lọc.
              </div>
            ) : (
              filteredCommits.map((item) => {
                const isSelected = item.id === selectedCommit.id;
                const laneColors = ["#2563eb", "#059669", "#9333ea", "#d97706"];
                const laneColor = laneColors[item.lane % laneColors.length];

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedCommitId(item.id)}
                    className={`p-3.5 transition flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/70 border-l-4 border-l-blue-600"
                        : "hover:bg-slate-50/80 border-l-4 border-l-transparent"
                    }`}
                  >
                    {/* SVG Metro Rail Column */}
                    <div className="relative w-8 shrink-0 flex flex-col items-center pt-1 self-stretch">
                      {/* Vertical lane line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5"
                        style={{ backgroundColor: laneColor, opacity: 0.4 }}
                      />
                      {/* Node point */}
                      <div
                        className="relative z-10 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                        style={{ backgroundColor: laneColor }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      </div>
                    </div>

                    {/* Commit Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.shortSha}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase font-mono"
                            style={{
                              backgroundColor: `${laneColor}15`,
                              color: laneColor,
                              border: `1px solid ${laneColor}40`,
                            }}
                          >
                            {item.branch}
                          </span>
                          {item.linkedTaskCode && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                              <BookOpen size={10} />
                              {item.linkedTaskCode}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {item.timeAgo}
                        </span>
                      </div>

                      {/* Commit Message */}
                      <p className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">
                        {item.message}
                      </p>

                      {/* Author & Stats Footer */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ${item.author.avatarColor}`}
                          >
                            {item.author.avatarInitials}
                          </span>
                          <span className="font-medium text-slate-700">{item.author.name}</span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="text-emerald-600 font-semibold">+{item.stats.additions}</span>
                          <span className="text-rose-600 font-semibold">-{item.stats.deletions}</span>
                          <span className="text-slate-400">{item.stats.filesCount} file(s)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Commit Inspector & 4 Distinct Features (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Tab Navigation */}
          <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm flex items-center text-xs font-semibold">
            <button
              onClick={() => setActiveTab("diff")}
              className={`flex-1 py-1.5 text-center rounded-lg transition ${
                activeTab === "diff"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              File Diff & Task
            </button>
            <button
              onClick={() => setActiveTab("antiCheating")}
              className={`flex-1 py-1.5 text-center rounded-lg transition ${
                activeTab === "antiCheating"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              AI Liêm chính
            </button>
            <button
              onClick={() => setActiveTab("defense")}
              className={`flex-1 py-1.5 text-center rounded-lg transition ${
                activeTab === "defense"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Vấn đáp Thầy Phước
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 py-1.5 text-center rounded-lg transition ${
                activeTab === "members"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Đóng góp
            </button>
          </div>

          {/* TAB 1: FILE DIFF & TASK LINKING */}
          {activeTab === "diff" && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      commit {selectedCommit.shortSha}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedCommit.shortSha)}
                      className="text-slate-400 hover:text-slate-600"
                      title="Copy SHA"
                    >
                      {copiedSha ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-900 leading-snug">
                    {selectedCommit.message}
                  </h3>
                  <div className="mt-1 text-xs text-slate-500">
                    Bởi <strong className="text-slate-700">{selectedCommit.author.name}</strong> • {selectedCommit.timestamp} (UTC ISO-8601)
                  </div>
                </div>
              </div>

              {/* Linked Kanban Task Box */}
              {selectedCommit.linkedTaskCode && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={14} className="text-blue-700" />
                      Nhiệm vụ Kanban liên kết
                    </span>
                    <span className="font-mono bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded text-[10px]">
                      {selectedCommit.linkedTaskCode}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-blue-950 font-medium leading-relaxed">
                    {selectedCommit.linkedTaskTitle}
                  </p>
                  <p className="mt-1 text-[11px] text-blue-700">
                    Traceability 2 chiều: Commit này được xác nhận hoàn thành cho tiêu chí nghiệm thu của Task.
                  </p>
                </div>
              )}

              {/* Modified Files List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Tệp tin thay đổi ({selectedCommit.files.length})</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    +{selectedCommit.stats.additions} / -{selectedCommit.stats.deletions} dòng
                  </span>
                </div>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                  {selectedCommit.files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-md border border-slate-100 bg-slate-50 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileCode2 size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate text-slate-800">{file.path}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                        <span className="text-emerald-600 font-semibold">+{file.additions}</span>
                        <span className="text-rose-600 font-semibold">-{file.deletions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diff Code Snippet Preview */}
              {selectedCommit.diffSnippet && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Trích xuất Code Diff</span>
                    <span className="text-[10px] text-slate-400 font-mono">Unified format</span>
                  </div>
                  <div className="rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed border border-slate-800">
                    <pre className="whitespace-pre-wrap">{selectedCommit.diffSnippet}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI ANTI-CHEATING & AUDIT NHỊP ĐỘ COMMIT */}
          {activeTab === "antiCheating" && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Kiểm toán Liêm chính & Nhịp độ Commit</h3>
                    <p className="text-xs text-slate-500">Phát hiện sao chép code phút chót và gánh team bất thường.</p>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={15} />
                  Trạng thái: Hoàn toàn bình thường ({selectedCommit.antiCheating.cadenceRate})
                </div>
                <p className="mt-1 text-xs text-emerald-900 leading-relaxed">
                  {selectedCommit.antiCheating.notes}
                </p>
              </div>

              {/* Git Hygiene Scorer */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Chấm điểm Văn hóa Git (Git Hygiene)</span>
                  <span className="font-mono font-bold text-blue-700">{selectedCommit.hygieneScore}/100</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${selectedCommit.hygieneScore}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  {selectedCommit.hygieneFeedback}
                </p>
              </div>

              {/* Cadence Check Rules Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-700">Tiêu chí phát hiện gian lận tự động</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between p-2 rounded border border-slate-100 bg-white">
                    <span className="text-slate-600">Đột biến LOC bất thường (&gt;2000 dòng/commit):</span>
                    <span className="font-bold text-emerald-600 text-[11px]">Không phát hiện</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border border-slate-100 bg-white">
                    <span className="text-slate-600">Dồn commit trước hạn nộp (&lt;24 giờ):</span>
                    <span className="font-bold text-emerald-600 text-[11px]">Không vi phạm</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border border-slate-100 bg-white">
                    <span className="text-slate-600">Tác giả email lạ (Ghost Contributor):</span>
                    <span className="font-bold text-emerald-600 text-[11px]">100% khớp danh sách nhóm</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI DEFENSE QUESTION GENERATOR */}
          {activeTab === "defense" && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                    <Sparkles size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Bộ câu hỏi Vấn đáp cho Giảng viên</h3>
                    <p className="text-xs text-slate-500">
                      AI phân tích diff của <strong>{selectedCommit.author.name}</strong> để sinh câu hỏi phản biện.
                    </p>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                {selectedCommit.defenseQuestions.map((q, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-900 flex items-center gap-1.5">
                        <HelpCircle size={14} className="text-purple-600" />
                        Câu hỏi vấn đáp #{idx + 1}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {q.targetKnowledge}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                      "{q.question}"
                    </p>

                    <div className="border-t border-slate-200/80 pt-2 text-[11px] text-slate-600">
                      <strong className="text-slate-700">Ý trả lời chuẩn:</strong> {q.suggestedAnswerKey}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Question Form */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="text-xs font-semibold text-slate-700">
                  Thầy Phước thêm ghi chú / câu hỏi phản biện riêng:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập câu hỏi vấn đáp cho sinh viên..."
                    value={customQuestionInput}
                    onChange={(e) => setCustomQuestionInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleAddDefenseQuestion}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-700 rounded-md hover:bg-purple-800 transition"
                  >
                    Thêm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MEMBER CONTRIBUTION ANALYTICS */}
          {activeTab === "members" && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                    <BarChart3 size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Phân tích Đóng góp Thành viên</h3>
                    <p className="text-xs text-slate-500">Đánh giá công bằng dựa trên commit, LOC và số task hoàn thành.</p>
                  </div>
                </div>
              </div>

              {/* Contribution Bars */}
              <div className="space-y-3.5">
                {MEMBER_ANALYTICS.map((member, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${member.color}`}>
                          {member.avatar}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900">{member.name}</div>
                          <div className="text-[10px] text-slate-400">{member.role}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {member.sharePercentage}%
                        </span>
                        <div className="text-[10px] text-slate-500">{member.commitCount} commits</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${member.color}`}
                        style={{ width: `${member.sharePercentage}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>LOC: +{member.additions} / -{member.deletions}</span>
                      <span>Task: {member.tasksCompleted} xong</span>
                      <span className="text-emerald-700 font-semibold">{member.cadenceScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GitHub Repo Submission / Sync Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GitFork size={18} className="text-blue-600" />
                  Đồng bộ & Nộp bài qua GitHub Repo
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhập link GitHub repository của nhóm để hệ thống tự động bóc tách nhánh và commit history.
                </p>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Đường dẫn Kho lưu trữ (GitHub Repository URL):
                </label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nhánh nộp bài chính (Target Branch):
                </label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono">
                  <option value="main">main (Production Release)</option>
                  <option value="develop">develop (Sprint 2 Submission)</option>
                  <option value="feature/erd-database-h4">feature/erd-database-h4</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 space-y-1">
                <div className="font-semibold">Quy trình tự động của CodeMind:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-blue-800">
                  <li>Phân tích tự động Git Graph và timeline từng nhánh.</li>
                  <li>Đối chiếu mã task (#TASK-...) với bảng Kanban của nhóm.</li>
                  <li>Chạy AI Anti-cheating kiểm tra nhịp độ đóng góp giữa các thành viên.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Xác nhận Đồng bộ & Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
