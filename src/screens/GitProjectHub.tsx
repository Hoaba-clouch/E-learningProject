import { useState, useMemo } from "react";
import {
  GitBranch,
  GitFork,
  GitCommit,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Network,
  Calendar,
  Layers,
  BarChart3,
  UserCheck,
  Sparkles,
} from "lucide-react";

interface GitNode {
  id: string;
  shortSha: string;
  branch: string;
  lane: number; // 0: main, 1: develop, 2: feature/auth, 3: feature/erd, 4: feature/sandbox
  x: number; // coordinate for visual graph
  y: number;
  message: string;
  type: "feat" | "fix" | "docs" | "merge" | "init" | "chore";
  author: {
    name: string;
    role: string;
    avatarInitials: string;
    avatarColor: string;
  };
  timestamp: string;
  timeAgo: string;
  linkedTaskCode?: string;
  linkedTaskTitle?: string;
  parentIds: string[];
  isMergeCommit?: boolean;
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
    status: "clean" | "verified";
    cadenceRate: string;
    notes: string;
  };
  defenseQuestions: Array<{
    question: string;
    targetKnowledge: string;
    suggestedAnswerKey: string;
  }>;
}

// Full Topological Commit Tree with visual coordinates & parent-child branch connections
const TOPOLOGY_NODES: GitNode[] = [
  {
    id: "n-init",
    shortSha: "001a4fc",
    branch: "main",
    lane: 0,
    x: 60,
    y: 60,
    message: "chore: initial project repository structure & license",
    type: "init",
    author: { name: "Nguyễn Minh Anh", role: "Team Leader", avatarInitials: "MA", avatarColor: "bg-blue-600 text-white" },
    timestamp: "2026-10-28T08:00:00Z",
    timeAgo: "7 ngày trước",
    parentIds: [],
    linkedTaskCode: "TASK-08",
    linkedTaskTitle: "Khởi tạo Repo GitHub tổ chức, Branching Strategy & Git Flow",
    stats: { additions: 140, deletions: 0, filesCount: 4 },
    files: [
      { path: "README.md", status: "added", additions: 45, deletions: 0 },
      { path: ".gitignore", status: "added", additions: 35, deletions: 0 },
      { path: "package.json", status: "added", additions: 60, deletions: 0 },
    ],
    hygieneScore: 92,
    hygieneFeedback: "Khởi tạo repo chuẩn chỉ, có file .gitignore và README rõ ràng.",
    antiCheating: { status: "verified", cadenceRate: "Chuẩn xác", notes: "Khởi tạo ban đầu của nhóm 3 thành viên." },
    defenseQuestions: [
      {
        question: "Quy ước đặt tên branch và chiến lược Git Flow của nhóm được thống nhất ra sao?",
        targetKnowledge: "Git Branching Model & Workflow",
        suggestedAnswerKey: "Nhóm sử dụng Git Flow: main (production), develop (staging tích hợp), feature/* (phát triển ca sử dụng riêng) và fix/* (sửa lỗi nóng).",
      },
    ],
  },
  {
    id: "n-dev-branch",
    shortSha: "14b98c2",
    branch: "develop",
    lane: 1,
    x: 220,
    y: 160,
    message: "chore: branch out develop staging line from main",
    type: "chore",
    author: { name: "Nguyễn Minh Anh", role: "Team Leader", avatarInitials: "MA", avatarColor: "bg-blue-600 text-white" },
    timestamp: "2026-10-28T09:30:00Z",
    timeAgo: "7 ngày trước",
    parentIds: ["n-init"],
    linkedTaskCode: "TASK-09",
    linkedTaskTitle: "Cấu hình CI/CD Pipeline tự động kiểm tra Linting và TypeScript build",
    stats: { additions: 85, deletions: 2, filesCount: 2 },
    files: [{ path: ".github/workflows/ci.yml", status: "added", additions: 85, deletions: 2 }],
    hygieneScore: 94,
    hygieneFeedback: "Branching develop chuẩn theo kiến trúc phân tách môi trường.",
    antiCheating: { status: "verified", cadenceRate: "Chuẩn xác", notes: "Phân tách nhánh rẽ rõ ràng." },
    defenseQuestions: [
      {
        question: "Tại sao không commit trực tiếp lên main mà phải rẽ nhánh develop?",
        targetKnowledge: "Continuous Integration & Branch Protection",
        suggestedAnswerKey: "Để bảo vệ mã nguồn production; toàn bộ code mới phải kiểm thử tích hợp trên develop trước khi tạo Release PR vào main.",
      },
    ],
  },
  {
    id: "n-feat-auth-1",
    shortSha: "a89d12e",
    branch: "feature/auth-jwt-h4",
    lane: 2,
    x: 390,
    y: 260,
    message: "feat(auth): initialize bcrypt hashing & JWT token payload structure",
    type: "feat",
    author: { name: "Nguyễn Minh Anh", role: "Team Leader", avatarInitials: "MA", avatarColor: "bg-blue-600 text-white" },
    timestamp: "2026-10-30T14:20:00Z",
    timeAgo: "5 ngày trước",
    parentIds: ["n-dev-branch"],
    linkedTaskCode: "TASK-17",
    linkedTaskTitle: "Xây dựng Module Authentication JWT & Băm mật khẩu an toàn với bcrypt",
    stats: { additions: 195, deletions: 10, filesCount: 3 },
    files: [
      { path: "backend/app/core/security.py", status: "added", additions: 95, deletions: 0 },
      { path: "backend/app/schemas/token.py", status: "added", additions: 45, deletions: 0 },
      { path: "backend/app/api/v1/auth.py", status: "added", additions: 55, deletions: 10 },
    ],
    diffSnippet: `@@ -0,0 +1,18 @@
+from passlib.context import CryptContext
+from jose import jwt
+from datetime import datetime, timedelta, timezone
+
+pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
+
+def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
+    to_encode = data.copy()
+    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
+    to_encode.update({"exp": expire})
+    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)`,
    hygieneScore: 95,
    hygieneFeedback: "Tuân thủ chuẩn Conventional Commits (feat:), mã hóa mật khẩu an toàn.",
    antiCheating: { status: "verified", cadenceRate: "Đạt chuẩn", notes: "Nhịp độ commit rải đều, không đột biến." },
    defenseQuestions: [
      {
        question: "Tại sao nên lưu Refresh Token trong HttpOnly Cookie thay vì localStorage ở phía Client?",
        targetKnowledge: "Web Security & XSS Defense",
        suggestedAnswerKey: "Vì JavaScript độc hại (từ các lỗ hổng XSS) không thể đọc được HttpOnly Cookie, bảo vệ người dùng không bị đánh cắp phiên đăng nhập.",
      },
    ],
  },
  {
    id: "n-feat-erd-1",
    shortSha: "f84c1a9",
    branch: "feature/erd-database-h4",
    lane: 3,
    x: 480,
    y: 360,
    message: "feat(database): define 8-table SQLAlchemy models with UTC ISO-8601 timestamps",
    type: "feat",
    author: { name: "Lê Hoàng Long", role: "Frontend & Database Dev", avatarInitials: "HL", avatarColor: "bg-purple-600 text-white" },
    timestamp: "2026-11-01T10:15:00Z",
    timeAgo: "3 ngày trước",
    parentIds: ["n-dev-branch"],
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
 class TimeStampedModel(Base):
     __abstract__ = True
     created_at = Column(
         DateTime(timezone=True),
         default=lambda: datetime.now(timezone.utc),
         nullable=False
     )`,
    hygieneScore: 97,
    hygieneFeedback: "Tuân thủ chuẩn H4 của Thầy Phước: 100% trường thời gian đều có DateTime(timezone=True) và datetime.now(timezone.utc).",
    antiCheating: { status: "verified", cadenceRate: "Đều đặn", notes: "Lịch sử commit trải dài qua các buổi học, tỷ lệ thêm/sửa file phù hợp khối lượng thiết kế CSDL Sprint 2." },
    defenseQuestions: [
      {
        question: "Tại sao trong Python 3.12+ Thầy Phước yêu cầu không dùng datetime.utcnow() mà phải dùng datetime.now(timezone.utc)?",
        targetKnowledge: "Python Timezone Handling & Deprecation Notice",
        suggestedAnswerKey: "datetime.utcnow() sinh ra naive datetime object (không kèm thông tin offset), dễ gây lỗi lệch giờ khi serialize sang JSON ISO-8601. datetime.now(timezone.utc) tạo aware datetime chuẩn.",
      },
    ],
  },
  {
    id: "n-merge-auth",
    shortSha: "c45a701",
    branch: "develop",
    lane: 1,
    x: 640,
    y: 160,
    isMergeCommit: true,
    message: "merge: pull request #4 from feature/auth-jwt-h4 into develop",
    type: "merge",
    author: { name: "Nguyễn Minh Anh", role: "Team Leader", avatarInitials: "MA", avatarColor: "bg-blue-600 text-white" },
    timestamp: "2026-11-02T16:00:00Z",
    timeAgo: "2 ngày trước",
    parentIds: ["n-dev-branch", "n-feat-auth-1"],
    linkedTaskCode: "TASK-17",
    linkedTaskTitle: "Xây dựng Module Authentication JWT & Băm mật khẩu an toàn với bcrypt",
    stats: { additions: 195, deletions: 10, filesCount: 3 },
    files: [{ path: "backend/app/api/v1/auth.py", status: "modified", additions: 195, deletions: 10 }],
    hygieneScore: 98,
    hygieneFeedback: "Merge commit có PR review xác thực, 0 xung đột mã.",
    antiCheating: { status: "verified", cadenceRate: "Chuẩn xác", notes: "Quy trình hợp nhất code đạt chuẩn DoD." },
    defenseQuestions: [
      {
        question: "Quy trình review code của nhóm trước khi merge PR #4 diễn ra như thế nào?",
        targetKnowledge: "Peer Code Review & DoD Verification",
        suggestedAnswerKey: "Ít nhất 1 thành viên khác (Long hoặc Huy) kiểm tra code diff, xác nhận chạy pass unit test CI rồi Team Leader mới bấm Merge.",
      },
    ],
  },
  {
    id: "n-feat-sandbox-1",
    shortSha: "b223d17",
    branch: "feature/sandbox-runner",
    lane: 4,
    x: 760,
    y: 450,
    message: "feat(sandbox): simplify isolated runner interface and live stdout stream",
    type: "feat",
    author: { name: "Trần Quốc Huy", role: "Backend & Sandbox Dev", avatarInitials: "QH", avatarColor: "bg-emerald-600 text-white" },
    timestamp: "2026-11-04T10:48:00Z",
    timeAgo: "1 giờ trước",
    parentIds: ["n-merge-auth"],
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
    hygieneScore: 96,
    hygieneFeedback: "feat: rõ ràng, giải thích chi tiết các tham số cgroup và network cô lập.",
    antiCheating: { status: "verified", cadenceRate: "Đạt chuẩn", notes: "Code có cấu trúc bài bản, đúng chuẩn yêu cầu thực tập của Thầy Phước." },
    defenseQuestions: [
      {
        question: "Cờ --network none và --user sandboxuser đóng vai trò an toàn gì khi sinh viên gửi mã độc vào server?",
        targetKnowledge: "Docker Sandbox Security & RCE Prevention",
        suggestedAnswerKey: "--network none ngăn chặn container gửi request ra ngoài hoặc kết nối reverse shell; non-root user ngăn chặn việc leo thang đặc quyền escape container.",
      },
    ],
  },
  {
    id: "n-merge-erd",
    shortSha: "d91e843",
    branch: "develop",
    lane: 1,
    x: 880,
    y: 160,
    isMergeCommit: true,
    message: "merge: pull request #5 from feature/erd-database-h4 into develop",
    type: "merge",
    author: { name: "Nguyễn Minh Anh", role: "Team Leader", avatarInitials: "MA", avatarColor: "bg-blue-600 text-white" },
    timestamp: "2026-11-04T10:55:00Z",
    timeAgo: "45 phút trước",
    parentIds: ["n-merge-auth", "n-feat-erd-1"],
    linkedTaskCode: "TASK-15",
    linkedTaskTitle: "Hiện thực hóa Data Layer với SQLAlchemy & Quy chuẩn Timezone UTC ISO-8601 (H4)",
    stats: { additions: 245, deletions: 12, filesCount: 4 },
    files: [{ path: "backend/app/models/__init__.py", status: "modified", additions: 14, deletions: 2 }],
    hygieneScore: 97,
    hygieneFeedback: "Hợp nhất CSDL 8 bảng vào nhánh develop thành công.",
    antiCheating: { status: "verified", cadenceRate: "Đều đặn", notes: "Các bảng 1NF, 2NF, 3NF đầy đủ." },
    defenseQuestions: [
      {
        question: "Sau khi merge CSDL, cơ chế di trú (migrations) của nhóm sử dụng công cụ gì?",
        targetKnowledge: "Database Migration with Alembic",
        suggestedAnswerKey: "Nhóm sử dụng Alembic tự động generate revision version_001 và kiểm tra tính toàn vẹn của bảng.",
      },
    ],
  },
  {
    id: "n-main-release",
    shortSha: "62d902d",
    branch: "main",
    lane: 0,
    x: 1040,
    y: 60,
    isMergeCommit: true,
    message: "release(v1.2.0): merge develop to main, deploy live to Vercel production",
    type: "merge",
    author: { name: "Nguyễn Minh Anh", role: "Team Leader", avatarInitials: "MA", avatarColor: "bg-blue-600 text-white" },
    timestamp: "2026-11-04T11:05:00Z",
    timeAgo: "25 phút trước",
    parentIds: ["n-init", "n-merge-erd"],
    linkedTaskCode: "TASK-10",
    linkedTaskTitle: "Thiết lập dự án Vite React 19, Tailwind CSS v4 và cấu trúc thư mục chuẩn",
    stats: { additions: 30, deletions: 60, filesCount: 3 },
    files: [
      { path: "src/screens/LearningWorkspace.tsx", status: "modified", additions: 18, deletions: 48 },
      { path: "src/screens/KanbanBoard.tsx", status: "modified", additions: 4, deletions: 8 },
      { path: "src/screens/GitProjectHub.tsx", status: "added", additions: 480, deletions: 0 },
    ],
    hygieneScore: 99,
    hygieneFeedback: "Release PR chính thức, kiểm thử 0 lỗi typecheck trước khi deploy.",
    antiCheating: { status: "verified", cadenceRate: "Tuyệt hảo", notes: "Sản phẩm live ổn định trên Vercel." },
    defenseQuestions: [
      {
        question: "Hệ thống CI/CD trên GitHub Actions tự động kích hoạt những bước nào khi release vào main?",
        targetKnowledge: "CI/CD & Production Deployment",
        suggestedAnswerKey: "Chạy linting, tsc --noEmit kiểm tra type, vite build biên dịch gói dist, và tự động đồng bộ sang Vercel qua webhook.",
      },
    ],
  },
];

const LANE_CONFIG = [
  { lane: 0, name: "main (Production Release)", color: "#2563eb", strokeColor: "rgba(37, 99, 235, 0.4)", y: 60 },
  { lane: 1, name: "develop (Staging & Sprint 2)", color: "#059669", strokeColor: "rgba(5, 150, 105, 0.4)", y: 160 },
  { lane: 2, name: "feature/auth-jwt-h4", color: "#d97706", strokeColor: "rgba(217, 119, 6, 0.4)", y: 260 },
  { lane: 3, name: "feature/erd-database-h4", color: "#9333ea", strokeColor: "rgba(147, 51, 234, 0.4)", y: 360 },
  { lane: 4, name: "feature/sandbox-runner", color: "#e11d48", strokeColor: "rgba(225, 29, 72, 0.4)", y: 450 },
];

const DAILY_COMMIT_DATA = [
  { day: "T4 (28/10)", anh: 3, huy: 1, long: 1, total: 5 },
  { day: "T5 (29/10)", anh: 2, huy: 3, long: 2, total: 7 },
  { day: "T6 (30/10)", anh: 4, huy: 2, long: 3, total: 9 },
  { day: "T7 (31/10)", anh: 1, huy: 2, long: 2, total: 5 },
  { day: "CN (01/11)", anh: 2, huy: 1, long: 3, total: 6 },
  { day: "T2 (02/11)", anh: 3, huy: 4, long: 1, total: 8 },
  { day: "T3 (03/11)", anh: 2, huy: 3, long: 2, total: 7 },
  { day: "T4 (04/11)", anh: 3, huy: 2, long: 2, total: 7 },
];

const BRANCH_DISTRIBUTION = [
  { name: "develop", count: 20, percentage: 42, color: "bg-emerald-600", desc: "Trục tích hợp tính năng Sprint 2" },
  { name: "main", count: 12, percentage: 25, color: "bg-blue-600", desc: "Mã nguồn phát hành nghiệm thu" },
  { name: "feature/auth-jwt-h4", count: 8, percentage: 17, color: "bg-amber-600", desc: "Bảo mật & JWT token" },
  { name: "feature/erd-database-h4", count: 5, percentage: 10, color: "bg-purple-600", desc: "Mô hình hóa SQLAlchemy CSDL" },
  { name: "feature/sandbox-runner", count: 3, percentage: 6, color: "bg-rose-600", desc: "Docker sandbox cô lập an toàn" },
];

export default function GitProjectHub() {
  const [nodes] = useState<GitNode[]>(TOPOLOGY_NODES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("n-main-release");
  const [viewMode, setViewMode] = useState<"topology" | "analytics" | "gitflow">("topology");
  const [activeTab, setActiveTab] = useState<"diff" | "antiCheating" | "defense">("diff");
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [repoUrl, setRepoUrl] = useState<string>("https://github.com/Hoaba-clouch/E-learningProject");

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) ?? nodes[nodes.length - 1];
  }, [nodes, selectedNodeId]);

  // Helper to build smooth curved connection between two nodes
  const renderConnector = (source: GitNode, target: GitNode) => {
    const isHorizontal = source.lane === target.lane;
    const color = LANE_CONFIG.find((l) => l.lane === target.lane)?.color || "#94a3b8";

    if (isHorizontal) {
      return (
        <line
          key={`${source.id}-${target.id}`}
          x1={source.x}
          y1={source.y}
          x2={target.x}
          y2={target.y}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      );
    }

    // Bezier curve for branch out or merge back
    const midX = (source.x + target.x) / 2;
    const pathD = `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`;

    return (
      <path
        key={`${source.id}-${target.id}`}
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    );
  };

  return (
    <div className="min-h-full p-4 lg:p-6 space-y-5 bg-slate-50/60 text-slate-800">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 font-mono">
              <Network size={13} />
              Phân hệ 2 • Trực quan hóa Cấu trúc Nhánh & Đồ thị Git
            </span>
            <span className="text-xs text-slate-500 font-medium">Interactive Visual Git Graph</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Sơ đồ Mạng Nhánh & Biểu đồ Thống kê Git
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-3xl">
            Vẽ cây phân nhánh trực quan (Branch Topology), dòng chảy merge commits, biểu đồ nhịp độ đóng góp theo ngày và kiểm toán gian lận AI.
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
            Mở GitHub
          </a>
        </div>
      </header>

      {/* Main Mode Navigation Bar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewMode("topology")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              viewMode === "topology"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Network size={15} />
            Sơ đồ Cây Phân Nhánh (Branch Topology Graph)
          </button>
          <button
            onClick={() => setViewMode("analytics")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              viewMode === "analytics"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BarChart3 size={15} />
            Biểu đồ Thống kê Nhánh & Nhịp độ (Analytics)
          </button>
          <button
            onClick={() => setViewMode("gitflow")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              viewMode === "gitflow"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers size={15} />
            Quy trình Git Flow Chuẩn (Lifecycle Map)
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 pr-3 font-mono">
          <span>Tổng số commit: <strong className="text-slate-900">48</strong></span>
          <span>•</span>
          <span>5 Nhánh đang hoạt động</span>
        </div>
      </div>

      {/* MODE 1: VISUAL BRANCH TOPOLOGY GRAPH */}
      {viewMode === "topology" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Visual Graph Canvas (8 Cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-4 overflow-hidden flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GitBranch size={16} className="text-blue-600" />
                  Bản đồ Mạng Cây Nhánh Tương tác (Metro DAG Graph)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhấp vào từng nút tròn commit trên đường ray để xem chi tiết mã nguồn, task liên kết và câu hỏi vấn đáp.
                </p>
              </div>

              {/* Lane Color Badges */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                {LANE_CONFIG.map((lane) => (
                  <span
                    key={lane.lane}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border"
                    style={{
                      borderColor: `${lane.color}40`,
                      backgroundColor: `${lane.color}10`,
                      color: lane.color,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lane.color }} />
                    {lane.name.split(" ")[0]}
                  </span>
                ))}
              </div>
            </div>

            {/* Scrollable SVG Topology Canvas */}
            <div className="w-full overflow-x-auto bg-slate-950/95 rounded-xl p-4 border border-slate-900 shadow-inner min-h-[520px] relative">
              <svg width="1160" height="500" className="w-full">
                {/* Horizontal Guide Rails (Background swimlanes) */}
                {LANE_CONFIG.map((lane) => (
                  <g key={lane.lane}>
                    <line
                      x1="20"
                      y1={lane.y}
                      x2="1140"
                      y2={lane.y}
                      stroke={lane.strokeColor}
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <text
                      x="25"
                      y={lane.y - 10}
                      fill={lane.color}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                      opacity="0.9"
                    >
                      {lane.name}
                    </text>
                  </g>
                ))}

                {/* Curved Connection Lines between Parent and Child Commits */}
                {nodes.map((target) =>
                  target.parentIds.map((pId) => {
                    const source = nodes.find((n) => n.id === pId);
                    if (!source) return null;
                    return renderConnector(source, target);
                  }),
                )}

                {/* Commit Nodes (Circular badges) */}
                {nodes.map((node) => {
                  const isSelected = node.id === selectedNode.id;
                  const laneCfg = LANE_CONFIG.find((l) => l.lane === node.lane) || LANE_CONFIG[0];

                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className="cursor-pointer transition-transform hover:scale-110"
                      transform={`translate(${node.x}, ${node.y})`}
                    >
                      {/* Selection Ring Glow */}
                      {isSelected && (
                        <circle
                          r="18"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          opacity="0.9"
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        r="12"
                        fill={node.isMergeCommit ? "#0f172a" : laneCfg.color}
                        stroke="#ffffff"
                        strokeWidth={node.isMergeCommit ? "3" : "2"}
                      />

                      {/* Inner Merge Icon or Dot */}
                      {node.isMergeCommit ? (
                        <circle r="4" fill={laneCfg.color} />
                      ) : (
                        <circle r="3.5" fill="#ffffff" />
                      )}

                      {/* Commit Label Card Pill */}
                      <g transform="translate(16, -14)">
                        <rect
                          width="120"
                          height="28"
                          rx="6"
                          fill={isSelected ? "#1e293b" : "rgba(15, 23, 42, 0.85)"}
                          stroke={isSelected ? "#60a5fa" : "rgba(255, 255, 255, 0.15)"}
                          strokeWidth={isSelected ? "1.5" : "1"}
                        />
                        <text x="8" y="14" fill="#93c5fd" fontSize="9" fontWeight="bold" fontFamily="monospace">
                          {node.shortSha}
                        </text>
                        {node.linkedTaskCode && (
                          <text x="60" y="14" fill="#fde047" fontSize="8" fontWeight="bold" fontFamily="monospace">
                            {node.linkedTaskCode}
                          </text>
                        )}
                        <text
                          x="8"
                          y="24"
                          fill="#cbd5e1"
                          fontSize="7.5"
                          fontFamily="sans-serif"
                        >
                          {node.author.name.split(" ").slice(-1)[0]} • {node.type}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Bottom Timeline Helper */}
            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" />
                Thời gian: 28/10 (Khởi tạo dự án) ➔ 04/11 (Release Production Vercel)
              </span>
              <span className="text-blue-700 font-bold">
                100% tuân thủ mô hình Git Flow
              </span>
            </div>
          </div>

          {/* Right Inspector Panel (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
            {/* Header of Selected Commit */}
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  <GitCommit size={12} />
                  {selectedNode.shortSha}
                </span>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase font-mono">
                  {selectedNode.branch}
                </span>
              </div>

              <h3 className="mt-2 text-sm font-bold text-slate-900 leading-snug">
                {selectedNode.message}
              </h3>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${selectedNode.author.avatarColor}`}>
                    {selectedNode.author.avatarInitials}
                  </span>
                  <span className="font-semibold text-slate-800">{selectedNode.author.name}</span>
                </div>
                <span>{selectedNode.timeAgo}</span>
              </div>
            </div>

            {/* Linked Kanban Task */}
            {selectedNode.linkedTaskCode && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span className="flex items-center gap-1">
                    <BookOpen size={13} />
                    Nhiệm vụ Kanban liên kết
                  </span>
                  <span className="font-mono bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded text-[10px]">
                    {selectedNode.linkedTaskCode}
                  </span>
                </div>
                <div className="text-amber-950 font-medium">{selectedNode.linkedTaskTitle}</div>
              </div>
            )}

            {/* Tab switch between Diff, Anti-Cheating, Defense */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 text-xs font-semibold bg-slate-50">
              <button
                onClick={() => setActiveTab("diff")}
                className={`flex-1 py-1.5 text-center rounded-md transition ${
                  activeTab === "diff" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                File Diff
              </button>
              <button
                onClick={() => setActiveTab("antiCheating")}
                className={`flex-1 py-1.5 text-center rounded-md transition ${
                  activeTab === "antiCheating" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                AI Liêm chính
              </button>
              <button
                onClick={() => setActiveTab("defense")}
                className={`flex-1 py-1.5 text-center rounded-md transition ${
                  activeTab === "defense" ? "bg-white text-purple-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Vấn đáp Thầy
              </button>
            </div>

            {/* TAB CONTENT: DIFF */}
            {activeTab === "diff" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                  <span>Tệp tin ({selectedNode.files.length})</span>
                  <span className="font-mono text-[10px]">
                    <span className="text-emerald-600 font-bold">+{selectedNode.stats.additions}</span> /{" "}
                    <span className="text-rose-600 font-bold">-{selectedNode.stats.deletions}</span> dòng
                  </span>
                </div>
                <div className="space-y-1 max-h-[140px] overflow-y-auto">
                  {selectedNode.files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100 text-xs font-mono">
                      <span className="truncate pr-2 text-slate-700">{f.path}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">+{f.additions}</span>
                    </div>
                  ))}
                </div>

                {selectedNode.diffSnippet && (
                  <div className="rounded-lg bg-slate-950 p-3 font-mono text-[10px] text-slate-200 overflow-x-auto leading-relaxed border border-slate-800">
                    <pre className="whitespace-pre-wrap">{selectedNode.diffSnippet}</pre>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: ANTI-CHEATING */}
            {activeTab === "antiCheating" && (
              <div className="space-y-3 text-xs">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    Đánh giá nhịp độ: {selectedNode.antiCheating.cadenceRate}
                  </div>
                  <p className="text-[11px] leading-relaxed">{selectedNode.antiCheating.notes}</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Điểm Văn hóa Git:</span>
                    <span className="font-mono font-bold text-blue-700">{selectedNode.hygieneScore}/100</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${selectedNode.hygieneScore}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-500">{selectedNode.hygieneFeedback}</p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: DEFENSE QUESTIONS */}
            {activeTab === "defense" && (
              <div className="space-y-3">
                <div className="text-xs text-purple-900 font-semibold flex items-center gap-1">
                  <Sparkles size={14} className="text-purple-600" />
                  Câu hỏi phản biện cho Giảng viên:
                </div>
                {selectedNode.defenseQuestions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg space-y-1.5 text-xs">
                    <div className="font-bold text-purple-950">"{q.question}"</div>
                    <div className="text-[10px] text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200 inline-block font-medium">
                      Trọng tâm: {q.targetKnowledge}
                    </div>
                    <div className="text-[11px] text-slate-600 pt-1 border-t border-purple-100">
                      <strong>Ý chuẩn:</strong> {q.suggestedAnswerKey}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: VISUAL ANALYTICS & STATISTICAL CHARTS */}
      {viewMode === "analytics" && (
        <div className="space-y-5">
          {/* Daily Commit Activity Bar Chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 size={18} className="text-blue-600" />
                  Biểu đồ Nhịp độ Commit theo Ngày (Commit Activity Cadence)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Minh chứng cho Thầy Phước thấy nhịp độ làm việc trải đều 8 ngày qua của cả 3 thành viên, không có tình trạng dồn code phút chót.
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Minh Anh (Leader)
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  Quốc Huy (Backend)
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                  Hoàng Long (Frontend)
                </span>
              </div>
            </div>

            {/* Custom Visual Bar Chart */}
            <div className="grid grid-cols-8 gap-3 pt-4 items-end h-64 border-b border-slate-200 pb-2">
              {DAILY_COMMIT_DATA.map((col, idx) => {
                const maxTotal = 10;
                const anhHeight = (col.anh / maxTotal) * 100;
                const huyHeight = (col.huy / maxTotal) * 100;
                const longHeight = (col.long / maxTotal) * 100;

                return (
                  <div key={idx} className="flex flex-col items-center h-full justify-end group">
                    <span className="text-[11px] font-mono font-bold text-slate-700 mb-1.5 opacity-0 group-hover:opacity-100 transition">
                      {col.total} commits
                    </span>

                    {/* Stacked Bar */}
                    <div className="w-full max-w-[42px] bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end shadow-xs">
                      <div
                        className="bg-blue-600 hover:brightness-110 transition-all"
                        style={{ height: `${anhHeight}%` }}
                        title={`Minh Anh: ${col.anh} commits`}
                      />
                      <div
                        className="bg-emerald-600 hover:brightness-110 transition-all"
                        style={{ height: `${huyHeight}%` }}
                        title={`Quốc Huy: ${col.huy} commits`}
                      />
                      <div
                        className="bg-purple-600 hover:brightness-110 transition-all"
                        style={{ height: `${longHeight}%` }}
                        title={`Hoàng Long: ${col.long} commits`}
                      />
                    </div>

                    <span className="mt-2 text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {col.day}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Trung bình nhóm: <strong className="text-slate-800">6.0 commits/ngày</strong></span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 size={13} />
                Đạt chuẩn cam kết nhịp độ của Thầy Phước (Cadence Standard Verified)
              </span>
            </div>
          </div>

          {/* 2-Column: Branch Distribution & Member Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Branch Distribution Cards */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GitBranch size={16} className="text-purple-600" />
                Quy mô & Phân bổ Cam kết trên từng Nhánh
              </h3>

              <div className="space-y-3">
                {BRANCH_DISTRIBUTION.map((b, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold font-mono text-slate-900">{b.name}</span>
                      <span className="font-mono text-slate-600 font-bold">{b.count} commits ({b.percentage}%)</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.percentage}%` }} />
                    </div>

                    <div className="text-[11px] text-slate-500">{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Member Responsibility Matrix */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck size={16} className="text-emerald-600" />
                Đánh giá Đóng góp Thành viên (Peer Review Matrix)
              </h3>

              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/40 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">Nguyễn Minh Anh (Leader)</div>
                    <div className="text-[11px] text-slate-500">Kiến trúc hệ thống, Auth JWT, CI/CD</div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-blue-700 text-sm">36%</span>
                    <div className="text-[10px] text-slate-500">18 commits</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">Trần Quốc Huy (Backend Dev)</div>
                    <div className="text-[11px] text-slate-500">Docker Sandbox, AsyncIO runner, API schemas</div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-emerald-700 text-sm">34%</span>
                    <div className="text-[10px] text-slate-500">16 commits</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/40 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">Lê Hoàng Long (Frontend & DB)</div>
                    <div className="text-[11px] text-slate-500">ERD 8 bảng, SQLAlchemy models, UI Tailwind</div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-purple-700 text-sm">30%</span>
                    <div className="text-[10px] text-slate-500">14 commits</div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                Kết luận AI: Phân bổ khối lượng công việc cân bằng lý tưởng (36:34:30), không có hiện tượng một người gánh đồ án hoặc thành viên ma.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: GIT FLOW LIFECYCLE MAP */}
      {viewMode === "gitflow" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers size={20} className="text-blue-600" />
              Chu trình Vận hành Mã nguồn Chuẩn (CodeMind Git Flow Lifecycle)
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Quy trình 6 bước khép kín từ khi nhận Task Kanban đến khi deploy lên môi trường Production của nhóm 3 người.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: "01",
                title: "Nhận Task từ Kanban",
                desc: "Chọn task trên bảng Kanban (mã #TASK-xx), tạo branch riêng feature/<ten-task> rẽ ra từ develop.",
                tag: "Branching",
              },
              {
                step: "02",
                title: "Commit theo Chuẩn Conventional",
                desc: "Viết commit message có prefix rõ ràng: feat, fix, docs, refactor kèm mã task. Hệ thống chấm Git Hygiene.",
                tag: "Git Hygiene",
              },
              {
                step: "03",
                title: "Kiểm tra CI/CD Tự động",
                desc: "GitHub Actions tự động chạy tsc --noEmit kiểm tra type React 19 và chạy unit test trước khi tạo PR.",
                tag: "Automated Testing",
              },
              {
                step: "04",
                title: "Peer Review & AI Defense Prep",
                desc: "Thành viên trong nhóm review diff, AI tự sinh 3 câu hỏi vấn đáp cho Thầy Phước chấm điểm.",
                tag: "AI Questions",
              },
              {
                step: "05",
                title: "Hợp nhất vào Develop",
                desc: "Merge PR vào nhánh develop sau khi đủ 1 approve và 0 xung đột code. Cập nhật task sang Done.",
                tag: "Staging Merge",
              },
              {
                step: "06",
                title: "Release Production Vercel",
                desc: "Tổng kết Sprint, merge develop vào main, tự động deploy bản live và xuất báo cáo đóng góp nộp Thầy.",
                tag: "Production Live",
              },
            ].map((st, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 relative">
                <span className="text-2xl font-bold font-mono text-slate-300 absolute right-4 top-3">
                  {st.step}
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-200 uppercase font-mono">
                  {st.tag}
                </span>
                <h4 className="text-sm font-bold text-slate-900 pt-1">{st.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  Nhập link GitHub repository của nhóm để hệ thống tự động bóc tách nhánh và vẽ cây đồ thị.
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
                  <li>Vẽ sơ đồ cây phân nhánh trực quan (Metro DAG Graph).</li>
                  <li>Tự động gắn mã task (#TASK-...) với bảng Kanban của nhóm.</li>
                  <li>Chạy AI Anti-cheating kiểm tra nhịp độ đóng góp giữa 3 thành viên.</li>
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
                Xác nhận Đồng bộ & Vẽ Đồ Thị
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
