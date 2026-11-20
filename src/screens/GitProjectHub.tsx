import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import MarloSegmentedControl from "../components/MarloSegmentedControl";
import { useMarloPageEntrance, animateMarloCards, animateMarloRows } from "../utils/marloAnimations";
import {
  isProjectFrozen,
  setProjectFrozen,
  subscribeProjectLockChanges,
} from "../utils/projectFreeze";
import OdometerNumber from "../components/OdometerNumber";
import MarloNumber from "../components/MarloNumber";
import {
  GitPrReviewPanel,
  GitNewCommitModal,
  GitNewPrModal,
} from "../components/GitPrReviewPanel";
import {
  applyPrAiFixApi,
  approvePrPeerReviewApi,
  createGitPullRequestApi,
  fetchGitHubWorkspaceApi,
  fetchProjectArchitectureApi,
  generateProjectArchitectureApi,
  mergeGitPullRequestApi,
  pushGitCommitApi,
  requestChangesPrApi,
  saveProjectArchitectureApi,
  syncGitHubLiveApi,
  updateGitHubRepoApi,
  type GitHubProjectSummary,
  type GitMemberAnalytics,
  type GitProjectTaskRef,
  type GitPullRequestRecord,
  type SessionRole,
} from "../api";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Plus,
  ExternalLink,
  Network,
  Layers,
  BarChart3,
  Sparkles,
  Boxes,
  Copy,
  Check,
  FolderGit2,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  GitBranch,
  Clock,
  GitCommit,
  FileText,
  User,
  GitPullRequest,
  GitFork,
  Bot,
  HelpCircle,
  Code2,
  CheckCheck,
  Search,
  Filter,
  RotateCw,
  AlertTriangle,
  ArrowRight,
  Eye,
  Activity,
  Database,
  Zap,
  Save,
  CloudDownload,
  Download,
  Lock,
  Unlock,
  X,
  FolderKanban,
} from "lucide-react";

// ─── Staggered Animation Timing Delays (Simulating organic branch tree growth) ──
const NODE_ANIM_DELAYS: Record<string, number> = {
  "user": 0.04,
  "app-shell": 0.16,
  "login": 0.28,
  "student-dash": 0.30,
  "learning-ws": 0.32,
  "tech-reels": 0.34,
  "profile": 0.36,
  "xp-shop": 0.38,
  "admin-dash": 0.40,
  "git-hub": 0.42,
  "kanban-board": 0.44,
  "instructor-panel": 0.46,
  "task-csv": 0.54,
  "api-client": 0.58,
  "instructor-apis": 0.62,
  "kanban-apis": 0.64,
  "api-startup": 0.68,
  "v1-router": 0.72,
  "auth": 0.76,
  "auth-deps": 0.80,
  "token-utils": 0.84,
  "learning-apis": 0.78,
  "submissions": 0.82,
  "ai-apis": 0.84,
  "code-evaluator": 0.90,
  "analytics": 0.94,
  "sqlite-db": 1.05,
};

export interface ArchFlowItem {
  id: string;
  label: string;
  color: string;
  summary: string;
  nodeIds: string[];
  edgeIds: string[];
}

const ARCH_FLOWS: ArchFlowItem[] = [
  {
    id: "all",
    label: "Toàn bộ Kiến trúc (22 Components)",
    color: "#2563eb",
    summary: "Hiển thị tổng thể 4 Subsystem Containers, 22 Components và các luồng liên kết dữ liệu trực quan theo chuẩn gitdiagram.com.",
    nodeIds: [],
    edgeIds: [],
  },
  {
    id: "flow-auth",
    label: "Luồng 1: Auth & JWT RBAC",
    color: "#e11d48",
    summary: "Luồng người dùng đăng nhập -> cấp Access Token 15p -> Dependency RBAC -> Bcrypt / Jose mã hóa bảo mật.",
    nodeIds: ["user", "app-shell", "login", "api-client", "api-startup", "v1-router", "auth", "auth-deps", "token-utils", "sqlite-db"],
    edgeIds: ["e-user-app", "e-app-login", "e-client-api", "e-api-router", "e-router-auth", "e-auth-deps", "e-deps-utils"],
  },
  {
    id: "flow-eval",
    label: "Luồng 2: Nộp bài & Docker Sandbox",
    color: "#059669",
    summary: "Luồng học viên nộp mã nguồn -> FastAPI nhận bài -> Sandbox cô lập biên dịch g++ C++ -> Chấm điểm 5 test case -> Ghi DB.",
    nodeIds: ["user", "app-shell", "learning-ws", "api-client", "api-startup", "v1-router", "submissions", "code-evaluator", "sqlite-db"],
    edgeIds: ["e-user-app", "e-app-ws", "e-ws-client", "e-client-api", "e-api-router", "e-router-sub", "e-sub-eval", "e-sub-db"],
  },
  {
    id: "flow-socratic",
    label: "Luồng 3: AI Socratic Tutor & Analytics",
    color: "#d97706",
    summary: "Luồng học viên hỏi trợ giảng -> AI phân tích thói quen gõ phím -> Trả lời gợi mở 3 bước không giải hộ -> Ghi nhận log Liêm chính.",
    nodeIds: ["user", "app-shell", "learning-ws", "api-client", "api-startup", "v1-router", "ai-apis", "analytics", "sqlite-db"],
    edgeIds: ["e-user-app", "e-app-ws", "e-ws-client", "e-client-api", "e-api-router", "e-router-ai", "e-ai-analytics-track", "e-ai-db", "e-analytics-db"],
  },
  {
    id: "flow-kanban",
    label: "Luồng 4: Sprint Kanban & Git Hub",
    color: "#16a34a",
    summary: "Luồng quản lý 72 tasks chuẩn 4 Sprint -> Khóa phụ thuộc task cha-con -> Xuất/nhập file Excel -> Đối sánh commit Git Kraken.",
    nodeIds: ["user", "app-shell", "git-hub", "kanban-board", "task-csv", "v1-router", "kanban-apis", "sqlite-db"],
    edgeIds: ["e-user-app", "e-app-hub", "e-app-kanban", "e-kanban-csv", "e-router-kanban", "e-kanban-db"],
  },
];

// ─── Custom Group Container Node (for GitDiagram subsystems) ───────────────
function ContainerBoxNode({ data }: NodeProps) {
  const c = data as {
    label: string;
    width: number;
    height: number;
    stroke?: string;
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    isDimmed?: boolean;
  };
  const hasStaticClasses = Boolean(c.bgColor && c.borderColor);
  const strokeHex = c.stroke || "#3b82f6";

  return (
    <div
      style={{
        width: c.width,
        height: c.height,
        animation: "archContainerFade 0.6s ease-out both",
        ...(hasStaticClasses
          ? {}
          : {
              borderColor: `${strokeHex}70`,
              backgroundColor: `${strokeHex}0a`,
            }),
      }}
      className={`rounded-3xl border-2 pointer-events-none select-none p-4 relative shadow-xs transition-all duration-300 ${
        hasStaticClasses
          ? `${c.bgColor} ${c.borderColor} dark:bg-slate-900/50 dark:border-slate-700`
          : ""
      } ${c.isDimmed ? "opacity-35" : "opacity-100"}`}
    >
      <div
        style={hasStaticClasses && c.textColor ? undefined : { color: strokeHex }}
        className={`absolute top-3 right-5 text-sm font-bold font-mono tracking-wider ${
          c.textColor ? `${c.textColor} dark:text-slate-300` : ""
        }`}
      >
        {c.label}
      </div>
    </div>
  );
}

// ─── Custom Card Node for ReactFlow ─────────────────────────────────────────
function GitDiagramCardNode({ data }: NodeProps) {
  const nodeData = data as {
    label: string;
    subLabel?: string;
    container: string;
    containerColor: string;
    filePath: string;
    tech: string;
    description: string;
    badge: string;
    isSelected?: boolean;
    isFlowActive?: boolean;
    isDimmed?: boolean;
    isCylinder?: boolean;
    isCircle?: boolean;
    animDelay?: number;
  };

  const delay = nodeData.animDelay ?? 0.35;

  if (nodeData.isCircle) {
    return (
      <div
        style={{
          animation: `archNodePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both`,
        }}
        className={`w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center text-center p-1 shadow-md transition-all duration-300 cursor-pointer ${
          nodeData.isDimmed ? "opacity-25 grayscale scale-95" : "opacity-100"
        } ${
          nodeData.isSelected || nodeData.isFlowActive
            ? "border-blue-600 bg-blue-600 text-white ring-4 ring-blue-500/30 scale-105 shadow-xl"
            : "border-blue-400 bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 hover:border-blue-500 hover:scale-105"
        }`}
      >
        <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-blue-600 !border-white" />
        <span className="text-[11px] font-bold leading-tight">{nodeData.label}</span>
      </div>
    );
  }

  if (nodeData.isCylinder) {
    return (
      <div
        style={{
          animation: `archNodePop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both`,
        }}
        className={`w-[240px] rounded-2xl border-2 px-4 py-3 text-center shadow-md transition-all duration-300 cursor-pointer ${
          nodeData.isDimmed ? "opacity-25 grayscale scale-95" : "opacity-100"
        } ${
          nodeData.isSelected || nodeData.isFlowActive
            ? "border-blue-700 bg-blue-600 text-white ring-4 ring-blue-500/30 scale-105 shadow-xl"
            : "border-blue-500 bg-blue-50/90 dark:bg-blue-950/70 text-blue-950 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/70 hover:scale-[1.02]"
        }`}
      >
        <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-blue-600 !border-white" />
        <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-blue-600 !border-white" />
        <Handle type="target" position={Position.Right} className="!w-2.5 !h-2.5 !bg-blue-600 !border-white" />
        <div className="flex items-center justify-center gap-1.5">
          <Database size={14} className={nodeData.isSelected || nodeData.isFlowActive ? "text-blue-100 animate-pulse" : "text-blue-600 dark:text-blue-400"} />
          <div className="text-xs font-bold leading-tight">{nodeData.label}</div>
        </div>
        <div className={`text-[10px] font-mono mt-0.5 ${nodeData.isSelected || nodeData.isFlowActive ? "text-blue-100" : "text-blue-700 dark:text-blue-300 font-semibold"}`}>
          {nodeData.subLabel}
        </div>
        <div className={`text-[9px] mt-1 font-mono ${nodeData.isSelected || nodeData.isFlowActive ? "text-blue-200" : "text-slate-500 dark:text-slate-400"}`}>
          {nodeData.tech}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        animation: `archNodePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both`,
      }}
      className={`relative w-[175px] rounded-xl border-2 p-2.5 shadow-sm transition-all duration-300 cursor-pointer bg-white dark:bg-slate-900 ${
        nodeData.isDimmed ? "opacity-25 grayscale scale-95" : "opacity-100"
      } ${
        nodeData.isSelected
          ? "border-blue-600 ring-4 ring-blue-500/25 shadow-lg scale-[1.04] z-20"
          : nodeData.isFlowActive
          ? "border-emerald-500 ring-4 ring-emerald-500/20 shadow-md scale-[1.02] z-10"
          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-md hover:scale-[1.02]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-400 !border-white" />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-slate-400 !border-white" />

      <div className="flex items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-1.5">
        <span
          className="text-[8.5px] font-bold px-1.5 py-0.2 rounded font-mono uppercase tracking-wider"
          style={{
            backgroundColor: `${nodeData.containerColor}15`,
            color: nodeData.containerColor,
          }}
        >
          {nodeData.container}
        </span>
        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">{nodeData.tech}</span>
      </div>

      <div className="mt-1.5 space-y-0.5">
        <h4 className="text-[11px] font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
          {nodeData.label}
        </h4>
        {nodeData.subLabel && (
          <p className="text-[9.5px] font-mono text-blue-700 dark:text-blue-400 font-medium truncate">
            {nodeData.subLabel}
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[8.5px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
        <span className="truncate">{nodeData.badge}</span>
        <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline shrink-0">Chi tiết →</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-600 !border-white" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-slate-600 !border-white" />
    </div>
  );
}

const nodeTypes = {
  cardNode: GitDiagramCardNode,
  containerBox: ContainerBoxNode,
};

// ─── GitDiagram Nodes: 4 Containers + 22 Components (Widely Spaced) ───────────
const INITIAL_ARCH_NODES: Node[] = [
  // 4 Background Containers matching GitDiagram Zones
  {
    id: "group-campus-app",
    type: "containerBox",
    position: { x: 80, y: 70 },
    zIndex: -1,
    selectable: false,
    draggable: false,
    data: {
      label: "Campus App",
      width: 1680,
      height: 420,
      bgColor: "bg-slate-50/70",
      borderColor: "border-slate-300",
      textColor: "text-slate-600",
    },
  },
  {
    id: "group-project-ws",
    type: "containerBox",
    position: { x: 80, y: 550 },
    zIndex: -1,
    selectable: false,
    draggable: false,
    data: {
      label: "Project Workspace",
      width: 1210,
      height: 320,
      bgColor: "bg-emerald-50/40",
      borderColor: "border-emerald-300",
      textColor: "text-emerald-700",
    },
  },
  {
    id: "group-api-platform",
    type: "containerBox",
    position: { x: 1330, y: 540 },
    zIndex: -1,
    selectable: false,
    draggable: false,
    data: {
      label: "API Platform",
      width: 280,
      height: 560,
      bgColor: "bg-rose-50/40",
      borderColor: "border-rose-300",
      textColor: "text-rose-700",
    },
  },
  {
    id: "group-learning-srv",
    type: "containerBox",
    position: { x: 770, y: 1120 },
    zIndex: -1,
    selectable: false,
    draggable: false,
    data: {
      label: "Learning Services",
      width: 820,
      height: 380,
      bgColor: "bg-amber-50/40",
      borderColor: "border-amber-300",
      textColor: "text-amber-700",
    },
  },

  // 1. Actor (Top)
  {
    id: "user",
    type: "cardNode",
    position: { x: 880, y: 15 },
    data: {
      label: "Campus user",
      container: "Actor",
      containerColor: "#2563eb",
      filePath: "Sinh viên / Giảng viên / Quản trị viên",
      tech: "End-user",
      description: "Người dùng đăng nhập và tương tác qua giao diện web browser.",
      badge: "Actor",
      isCircle: true,
      upstream: "None",
      downstream: "App shell [App.tsx]",
      defenseQA: "Hệ thống hỗ trợ những vai trò người dùng nào? Đáp: Student, Instructor, và Admin với cơ chế RBAC chặt chẽ.",
    },
  },

  // 2. Campus App Subgraph Components
  {
    id: "app-shell",
    type: "cardNode",
    position: { x: 835, y: 100 },
    data: {
      label: "App shell",
      subLabel: "[App.tsx]",
      container: "Campus App",
      containerColor: "#2563eb",
      filePath: "src/App.tsx",
      tech: "React 19",
      description: "Khung điều hướng trung tâm, phân phối layout, sidebar, theme và chuyển đổi vai trò.",
      badge: "Root Controller",
      upstream: "Campus user",
      downstream: "7 màn hình học tập và 3 màn hình đồ án",
      defenseQA: "Routing phía Client được bảo vệ thế nào? Đáp: State role và switch-case render màn hình tương ứng.",
    },
  },
  {
    id: "login",
    type: "cardNode",
    position: { x: 110, y: 220 },
    data: {
      label: "Login",
      subLabel: "[LoginScreen.tsx]",
      container: "Campus App",
      containerColor: "#2563eb",
      filePath: "src/screens/LoginScreen.tsx",
      tech: "Client UI",
      description: "Màn hình đăng nhập, validate form và chuyển đổi nhanh giữa 3 tài khoản demo.",
      badge: "Auth View",
      upstream: "App shell",
      downstream: "POST /auth/login",
      defenseQA: "Client lưu trữ mật khẩu thế nào? Đáp: Không lưu plain-text, gửi HTTPS lên server băm Bcrypt.",
    },
  },
  {
    id: "student-dash",
    type: "cardNode",
    position: { x: 340, y: 220 },
    data: {
      label: "Student dashboard",
      subLabel: "[StudentDashboard.tsx]",
      container: "Campus App",
      containerColor: "#2563eb",
      filePath: "src/screens/StudentDashboard.tsx",
      tech: "Client UI",
      description: "Bảng tiến độ tổng quan, chuỗi streak học tập và danh sách bài tập hôm nay.",
      badge: "Dashboard",
      upstream: "App shell",
      downstream: "GET /lms/progress",
      defenseQA: "Tiến độ học tập được tính ra sao? Đáp: Dựa trên tổng số bài học và bài tập đã hoàn thành.",
    },
  },
  {
    id: "learning-ws",
    type: "cardNode",
    position: { x: 570, y: 220 },
    data: {
      label: "Learning workspace",
      subLabel: "[LearningWorkspace.tsx]",
      container: "Campus App",
      containerColor: "#2563eb",
      filePath: "src/screens/LearningWorkspace.tsx",
      tech: "Monaco + @xyflow",
      description: "Không gian học tập tương tác: Sơ đồ tư duy Mindmap, bài đọc lý thuyết và Code Lab sân chơi.",
      badge: "Code Lab & Mindmap",
      upstream: "App shell",
      downstream: "API client [api.ts]",
      defenseQA: "Code Lab giao tiếp với server thế nào? Đáp: Thông qua API client gửi code lên Docker Sandbox.",
    },
  },
  {
    id: "api-client",
    type: "cardNode",
    position: { x: 570, y: 350 },
    data: {
      label: "API client",
      subLabel: "[api.ts]",
      container: "Campus App",
      containerColor: "#2563eb",
      filePath: "src/api.ts",
      tech: "Axios Client",
      description: "Module HTTP Client kết nối tới backend, cài đặt Interceptors tự động refresh token JWT.",
      badge: "HTTP Client",
      upstream: "Learning workspace",
      downstream: "API startup [main.py]",
      defenseQA: "Khi token hết hạn xử lý thế nào? Đáp: Interceptor bắt mã 401 tự động refresh token ngầm.",
    },
  },
  {
    id: "tech-reels",
    type: "cardNode",
    position: { x: 800, y: 220 },
    data: {
      label: "Tech reels",
      subLabel: "[TechReels.tsx]",
      container: "Campus App",
      containerColor: "#2563eb",
      filePath: "src/screens/TechReels.tsx",
      tech: "Client UI",
      description: "Video ngắn micro-learning tóm tắt kiến thức lập trình thực chiến.",
      badge: "Reels View",
      upstream: "App shell",
      downstream: "GET /reels",
      defenseQA: "Tính năng này giải quyết bài toán gì? Đáp: Giúp sinh viên nắm nhanh khái niệm cốt lõi trong 60 giây.",
    },
  },
  {
    id: "profile",
    type: "cardNode",
    position: { x: 1030, y: 220 },
    data: {
      label: "Student profile",
      subLabel: "[StudentProfile.tsx]",
      container: "Campus App",
      containerColor: "#2563eb",
      filePath: "src/screens/StudentProfile.tsx",
      tech: "Client UI",
      description: "Hồ sơ năng lực học viên, chứng nhận SHA-256 và khung huy hiệu thành tích.",
      badge: "Profile View",
      upstream: "App shell",
      downstream: "GET /profile",
      defenseQA: "Chứng nhận SHA-256 có ý nghĩa gì? Đáp: Bằng chứng mật mã hóa xác nhận sinh viên tự sửa bài tập.",
    },
  },
  {
    id: "xp-shop",
    type: "cardNode",
    position: { x: 1260, y: 220 },
    data: {
      label: "XP shop",
      subLabel: "[XPShop.tsx]",
      container: "Campus App",
      containerColor: "#2563eb",
      filePath: "src/screens/XPShop.tsx",
      tech: "Gamification",
      description: "Cửa hàng đổi điểm kinh nghiệm tích lũy lấy avatar, skin chat và mascot AI.",
      badge: "Shop View",
      upstream: "App shell",
      downstream: "POST /shop/buy",
      defenseQA: "Điểm XP được tính toán thế nào? Đáp: Cộng điểm khi hoàn thành bài tập và giữ streak học tập.",
    },
  },
  {
    id: "admin-dash",
    type: "cardNode",
    position: { x: 1490, y: 220 },
    data: {
      label: "Admin dashboard",
      subLabel: "[AdminDashboard.tsx]",
      container: "Campus App",
      containerColor: "#2563eb",
      filePath: "src/screens/AdminDashboard.tsx",
      tech: "Admin Portal",
      description: "Trang quản trị hệ thống, quản lý người dùng, cấu hình quy tắc hệ thống.",
      badge: "Admin View",
      upstream: "App shell",
      downstream: "GET /admin/stats",
      defenseQA: "Phân quyền admin được bảo vệ thế nào? Đáp: Kiểm tra role admin cả ở client lẫn backend API.",
    },
  },

  // 3. Project Workspace Subgraph Components (Left)
  {
    id: "git-hub",
    type: "cardNode",
    position: { x: 110, y: 590 },
    data: {
      label: "Git project hub",
      subLabel: "[GitProjectHub.tsx]",
      container: "Project Workspace",
      containerColor: "#16a34a",
      filePath: "src/screens/GitProjectHub.tsx",
      tech: "GitDiagram Canvas",
      description: "Trung tâm quản lý mã nguồn Git, cây nhánh Metro-line, sơ đồ kiến trúc GitDiagram và AI liêm chính.",
      badge: "Git & Arch Hub",
      upstream: "App shell [App.tsx]",
      downstream: "None",
      defenseQA: "Module này đem lại giá trị gì? Đáp: Trực quan hóa cây Git, phát hiện gian lận và sinh câu hỏi phản biện.",
    },
  },
  {
    id: "kanban-board",
    type: "cardNode",
    position: { x: 340, y: 590 },
    data: {
      label: "Kanban board",
      subLabel: "[KanbanBoard.tsx]",
      container: "Project Workspace",
      containerColor: "#16a34a",
      filePath: "src/screens/KanbanBoard.tsx",
      tech: "Kanban Engine",
      description: "Bảng quản lý 72 tasks 4 Sprints, khóa phụ thuộc task cha-con và tính điểm chuẩn Hội đồng Phản biện.",
      badge: "Sprint Matrix",
      upstream: "App shell [App.tsx]",
      downstream: "Task CSV manager",
      defenseQA: "Cơ chế khóa phụ thuộc hoạt động ra sao? Đáp: Task con bị disabled và hiện ổ khóa nếu task cha chưa Done.",
    },
  },
  {
    id: "task-csv",
    type: "cardNode",
    position: { x: 340, y: 730 },
    data: {
      label: "Task CSV manager",
      subLabel: "[TaskCsvModal.tsx]",
      container: "Project Workspace",
      containerColor: "#16a34a",
      filePath: "src/components/TaskCsvManagerModal.tsx",
      tech: "CSV Parser",
      description: "Trình import/export dữ liệu task chuẩn 8 cột theo mẫu file Excel của Hội đồng Phản biện.",
      badge: "CSV Tool",
      upstream: "Kanban board",
      downstream: "None",
      defenseQA: "Xử lý cột Sprint trống như thế nào? Đáp: Tự động tính = ceil(Ngày / ngày_mỗi_sprint).",
    },
  },
  {
    id: "instructor-panel",
    type: "cardNode",
    position: { x: 570, y: 590 },
    data: {
      label: "Instructor panel",
      subLabel: "[InstructorPanel.tsx]",
      container: "Project Workspace",
      containerColor: "#16a34a",
      filePath: "src/screens/InstructorPanel.tsx",
      tech: "Instructor View",
      description: "Bảng điều khiển dành riêng cho Giảng viên: nghiệm thu sprint và xem điểm sinh viên.",
      badge: "Teacher View",
      upstream: "App shell [App.tsx]",
      downstream: "None",
      defenseQA: "Giảng viên chấm điểm bằng cách nào? Đáp: Dựa trên rubric 4 tiêu chí và bộ câu hỏi vấn đáp AI.",
    },
  },
  {
    id: "instructor-apis",
    type: "cardNode",
    position: { x: 800, y: 590 },
    data: {
      label: "Instructor APIs",
      subLabel: "[instructor.py]",
      container: "Project Workspace",
      containerColor: "#16a34a",
      filePath: "backend/app/api/v1/endpoints/instructor.py",
      tech: "FastAPI Router",
      description: "Các API quản lý lớp học, phân công task và duyệt lịch review code 1-on-1.",
      badge: "Teacher Router",
      upstream: "V1 router [router.py]",
      downstream: "SQLite database [database.py]",
      defenseQA: "Phân quyền API này có gì đặc biệt? Đáp: Đòi hỏi role === 'instructor'.",
    },
  },
  {
    id: "kanban-apis",
    type: "cardNode",
    position: { x: 1030, y: 590 },
    data: {
      label: "Kanban APIs",
      subLabel: "[kanban.py]",
      container: "Project Workspace",
      containerColor: "#16a34a",
      filePath: "backend/app/api/v1/endpoints/kanban.py",
      tech: "FastAPI Router",
      description: "Các API CRUD task, cập nhật trạng thái kéo thả Kanban và tính điểm Sprint.",
      badge: "Kanban Router",
      upstream: "V1 router [router.py]",
      downstream: "SQLite database [database.py]",
      defenseQA: "Cập nhật kéo thả task đồng bộ thế nào? Đáp: PATCH /tasks/{id} cập nhật status và re-calculate sprint score.",
    },
  },

  // 4. API Platform Subgraph Components (Middle-Right Stack)
  {
    id: "api-startup",
    type: "cardNode",
    position: { x: 1380, y: 575 },
    data: {
      label: "API startup",
      subLabel: "[main.py]",
      container: "API Platform",
      containerColor: "#e11d48",
      filePath: "backend/app/main.py",
      tech: "FastAPI / ASGI",
      description: "Điểm khởi chạy ứng dụng FastAPI, cấu hình CORS, Timezone UTC middleware và mount v1 router.",
      badge: "FastAPI App",
      upstream: "API client [api.ts]",
      downstream: "V1 router [router.py]",
      defenseQA: "FastAPI có ưu điểm gì so với Flask? Đáp: Tốc độ cao với async/await, tự động sinh tài liệu Swagger /docs.",
    },
  },
  {
    id: "v1-router",
    type: "cardNode",
    position: { x: 1380, y: 680 },
    data: {
      label: "V1 router",
      subLabel: "[router.py]",
      container: "API Platform",
      containerColor: "#e11d48",
      filePath: "backend/app/api/v1/router.py",
      tech: "APIRouter",
      description: "Bộ điều phối router trung tâm v1, phân bổ các endpoint auth, kanban, lms, ai, submissions.",
      badge: "Master Router",
      upstream: "API startup [main.py]",
      downstream: "Auth, Kanban, LMS, AI, Submissions",
      defenseQA: "Quy chuẩn versioning API như thế nào? Đáp: Tiền tố /api/v1/ đảm bảo tính mở rộng và tương thích.",
    },
  },
  {
    id: "auth",
    type: "cardNode",
    position: { x: 1380, y: 785 },
    data: {
      label: "Authentication",
      subLabel: "[auth.py]",
      container: "API Platform",
      containerColor: "#e11d48",
      filePath: "backend/app/api/v1/endpoints/auth.py",
      tech: "OAuth2 / JWT",
      description: "Các endpoint xử lý /login, /refresh, /logout và cấp phát Access Token JWT.",
      badge: "Auth Router",
      upstream: "V1 router [router.py]",
      downstream: "Auth dependencies [deps.py]",
      defenseQA: "Access token hết hạn sau bao lâu? Đáp: 15 phút, kết hợp Refresh Token 7 ngày trong HttpOnly Cookie.",
    },
  },
  {
    id: "auth-deps",
    type: "cardNode",
    position: { x: 1380, y: 890 },
    data: {
      label: "Auth dependencies",
      subLabel: "[deps.py]",
      container: "API Platform",
      containerColor: "#e11d48",
      filePath: "backend/app/api/deps.py",
      tech: "FastAPI Depends",
      description: "Hàm dependency get_current_user giải mã token và kiểm tra quyền RBAC của người dùng.",
      badge: "Security DI",
      upstream: "Authentication [auth.py]",
      downstream: "Token utilities [security.py]",
      defenseQA: "Xử lý thế nào nếu token giả mạo? Đáp: Ném HTTPException(401 Unauthorized) từ chối truy cập.",
    },
  },
  {
    id: "token-utils",
    type: "cardNode",
    position: { x: 1380, y: 995 },
    data: {
      label: "Token utilities",
      subLabel: "[security.py]",
      container: "API Platform",
      containerColor: "#e11d48",
      filePath: "backend/app/core/security.py",
      tech: "Passlib + Jose",
      description: "Hàm băm mật khẩu Bcrypt 12 rounds và encode/decode JWT token với timestamp UTC ISO-8601.",
      badge: "Crypto Service",
      upstream: "Auth dependencies [deps.py]",
      downstream: "None (Leaf)",
      defenseQA: "Tại sao dùng datetime.now(timezone.utc)? Đáp: Chuẩn H4 Hội đồng Phản biện, tránh lỗi naive datetime lệch giờ.",
    },
  },

  // 5. Learning Services Subgraph Components (Spacious 65px horizontal & 75px vertical gaps)
  {
    id: "learning-apis",
    type: "cardNode",
    position: { x: 820, y: 1180 },
    data: {
      label: "Learning APIs",
      subLabel: "[lms.py]",
      container: "Learning Services",
      containerColor: "#d97706",
      filePath: "backend/app/api/v1/endpoints/lms.py",
      tech: "FastAPI Router",
      description: "API truy xuất nội dung bài giảng, danh mục khóa học và tiến độ bài học.",
      badge: "LMS Router",
      upstream: "V1 router [router.py]",
      downstream: "Code evaluator, SQLite database",
      defenseQA: "Dữ liệu bài giảng lưu ở đâu? Đáp: Lưu trong bảng courses và lessons trong SQLite/PostgreSQL.",
    },
  },
  {
    id: "submissions",
    type: "cardNode",
    position: { x: 1060, y: 1180 },
    data: {
      label: "Submissions",
      subLabel: "[submissions.py]",
      container: "Learning Services",
      containerColor: "#d97706",
      filePath: "backend/app/api/v1/endpoints/submissions.py",
      tech: "FastAPI Router",
      description: "API tiếp nhận bài nộp code, điều phối chấm kiểm thử và lưu lịch sử nộp.",
      badge: "Submission API",
      upstream: "V1 router [router.py]",
      downstream: "Code evaluator, SQLite database",
      defenseQA: "Lưu lịch sử nộp bài để làm gì? Đáp: Để tạo audit trail chứng minh sinh viên tự tiến bộ.",
    },
  },
  {
    id: "ai-apis",
    type: "cardNode",
    position: { x: 1300, y: 1180 },
    data: {
      label: "AI tutor APIs",
      subLabel: "[ai.py]",
      container: "Learning Services",
      containerColor: "#d97706",
      filePath: "backend/app/api/v1/endpoints/ai.py",
      tech: "FastAPI Router",
      description: "API gợi ý Socratic và trả lời câu hỏi hướng dẫn tư duy lập trình.",
      badge: "Socratic API",
      upstream: "V1 router [router.py]",
      downstream: "Event analytics, SQLite database",
      defenseQA: "AI có giải bài hộ không? Đáp: Tuyệt đối không, hệ thống giới hạn 3 hint gợi mở theo nguyên tắc Socratic.",
    },
  },
  {
    id: "code-evaluator",
    type: "cardNode",
    position: { x: 940, y: 1340 },
    data: {
      label: "Code evaluator",
      subLabel: "[code_evaluator.py]",
      container: "Learning Services",
      containerColor: "#d97706",
      filePath: "backend/app/services/code_evaluator.py",
      tech: "Evaluation Engine",
      description: "Module thẩm định mã nguồn: kiểm thử test cases biên dịch C++ (g++) và Python.",
      badge: "Compiler Service",
      upstream: "Learning APIs, Submissions",
      downstream: "SQLite database",
      defenseQA: "Kiểm thử code sinh viên như thế nào? Đáp: So sánh output stdout với 5 test case ẩn.",
    },
  },
  {
    id: "analytics",
    type: "cardNode",
    position: { x: 1180, y: 1340 },
    data: {
      label: "Event analytics",
      subLabel: "[analytics.py]",
      container: "Learning Services",
      containerColor: "#d97706",
      filePath: "backend/app/services/analytics.py",
      tech: "Analytics Service",
      description: "Phân tích sự kiện học tập: tần suất gõ code, số lần hỏi hint, và tỷ lệ vượt qua bài tập.",
      badge: "Analytics Engine",
      upstream: "AI tutor APIs",
      downstream: "SQLite database",
      defenseQA: "Dữ liệu analytics phục vụ điều gì? Đáp: Cung cấp bằng chứng học tập cho Hội đồng Phản biện.",
    },
  },

  // 6. SQLite Database Storage (Bottom Center)
  {
    id: "sqlite-db",
    type: "cardNode",
    position: { x: 500, y: 1560 },
    data: {
      label: "SQLite database",
      subLabel: "[database.py]",
      container: "Storage",
      containerColor: "#2563eb",
      filePath: "backend/app/core/database.py",
      tech: "SQLAlchemy ORM (8 Tables 3NF)",
      description: "CSDL quan hệ lưu trữ dữ liệu tập trung với 8 bảng 3NF: Users, Tasks, Sprints, Submissions.",
      badge: "Database",
      isCylinder: true,
      upstream: "All backend API routers",
      downstream: "None (Storage)",
      defenseQA: "Tại sao dùng SQLite cho dev? Đáp: Nhẹ, không cần cài server riêng, sẵn sàng chuyển Postgres qua biến môi trường.",
    },
  },
];

// ─── Edges matching exact connections & labels from GitDiagram ──────────────
const edgeLabelOpts = {
  labelStyle: { fill: "#475569", fontSize: 10, fontWeight: 600, fontFamily: "monospace" },
  labelBgStyle: { fill: "#ffffff", fillOpacity: 0.95, rx: 4, ry: 4 },
  labelBgPadding: [4, 2] as [number, number],
};

const INITIAL_ARCH_EDGES: Edge[] = [
  // user -> app_shell
  {
    id: "e-user-app",
    source: "user",
    target: "app-shell",
    type: "smoothstep",
    label: "uses",
    style: { stroke: "#64748b", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed },
    ...edgeLabelOpts,
  },

  // app_shell renders 7 frontend views
  { id: "e-app-login", source: "app-shell", target: "login", type: "smoothstep", label: "renders", style: { stroke: "#94a3b8" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-app-dash", source: "app-shell", target: "student-dash", type: "smoothstep", label: "renders", style: { stroke: "#94a3b8" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-app-ws", source: "app-shell", target: "learning-ws", type: "smoothstep", label: "renders", style: { stroke: "#2563eb", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-app-reels", source: "app-shell", target: "tech-reels", type: "smoothstep", label: "renders", style: { stroke: "#94a3b8" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-app-profile", source: "app-shell", target: "profile", type: "smoothstep", label: "renders", style: { stroke: "#94a3b8" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-app-shop", source: "app-shell", target: "xp-shop", type: "smoothstep", label: "renders", style: { stroke: "#94a3b8" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-app-admin", source: "app-shell", target: "admin-dash", type: "smoothstep", label: "renders", style: { stroke: "#94a3b8" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },

  // app_shell renders Project Workspace views (Left side)
  { id: "e-app-hub", source: "app-shell", target: "git-hub", type: "smoothstep", label: "renders", style: { stroke: "#16a34a" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-app-kanban", source: "app-shell", target: "kanban-board", type: "smoothstep", label: "renders", style: { stroke: "#16a34a", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-app-inst-panel", source: "app-shell", target: "instructor-panel", type: "smoothstep", label: "renders", style: { stroke: "#16a34a" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },

  // learning_ws imports api_client
  { id: "e-ws-client", source: "learning-ws", target: "api-client", type: "smoothstep", label: "imports", style: { stroke: "#2563eb", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },

  // api_client -> api_startup (HTTP API bridge)
  {
    id: "e-client-api",
    source: "api-client",
    target: "api-startup",
    type: "smoothstep",
    label: "HTTP API",
    animated: true,
    style: { stroke: "#e11d48", strokeWidth: 2.2 },
    markerEnd: { type: MarkerType.ArrowClosed },
    ...edgeLabelOpts,
  },

  // Inside API Platform (Vertical Stack)
  { id: "e-api-router", source: "api-startup", target: "v1-router", type: "smoothstep", label: "mounts", style: { stroke: "#e11d48", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-router-auth", source: "v1-router", target: "auth", type: "smoothstep", label: "registers", style: { stroke: "#e11d48", strokeWidth: 1.8 }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-auth-deps", source: "auth", target: "auth-deps", type: "smoothstep", label: "auth dependency", style: { stroke: "#e11d48" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-deps-utils", source: "auth-deps", target: "token-utils", type: "smoothstep", label: "checks tokens", style: { stroke: "#e11d48" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },

  // Inside Project Workspace
  { id: "e-kanban-csv", source: "kanban-board", target: "task-csv", type: "smoothstep", label: "renders", style: { stroke: "#16a34a" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },

  // v1_router registers Project Workspace APIs
  { id: "e-router-inst", source: "v1-router", target: "instructor-apis", type: "smoothstep", label: "registers", style: { stroke: "#16a34a" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-router-kanban", source: "v1-router", target: "kanban-apis", type: "smoothstep", label: "registers", style: { stroke: "#16a34a" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },

  // v1_router registers Learning Services APIs
  { id: "e-router-lms", source: "v1-router", target: "learning-apis", type: "smoothstep", label: "registers", style: { stroke: "#d97706" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-router-sub", source: "v1-router", target: "submissions", type: "smoothstep", label: "registers", style: { stroke: "#d97706", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-router-ai", source: "v1-router", target: "ai-apis", type: "smoothstep", label: "registers", style: { stroke: "#d97706" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },

  // Inside Learning Services
  { id: "e-lms-eval", source: "learning-apis", target: "code-evaluator", type: "smoothstep", label: "references", style: { stroke: "#d97706" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-sub-eval", source: "submissions", target: "code-evaluator", type: "smoothstep", label: "evaluates code", style: { stroke: "#d97706", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-sub-analytics", source: "submissions", target: "analytics", type: "smoothstep", label: "references", style: { stroke: "#d97706" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-ai-analytics-track", source: "ai-apis", target: "analytics", type: "smoothstep", label: "tracks events", style: { stroke: "#d97706" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },

  // Backend APIs connecting to Database
  { id: "e-inst-db", source: "instructor-apis", target: "sqlite-db", type: "smoothstep", label: "accesses", style: { stroke: "#2563eb" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-kanban-db", source: "kanban-apis", target: "sqlite-db", type: "smoothstep", label: "accesses", style: { stroke: "#2563eb" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-lms-db", source: "learning-apis", target: "sqlite-db", type: "smoothstep", label: "queries", style: { stroke: "#2563eb" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-sub-db", source: "submissions", target: "sqlite-db", type: "smoothstep", label: "reads and writes", style: { stroke: "#2563eb", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-ai-db", source: "ai-apis", target: "sqlite-db", type: "smoothstep", label: "accesses", style: { stroke: "#2563eb" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-analytics-db", source: "analytics", target: "sqlite-db", type: "smoothstep", label: "accesses", style: { stroke: "#2563eb" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
];

// ─── Git Commit Data Model for Interactive Graph ────────────────────────────
export interface GitCommitItem {
  id: string;
  sha: string;
  author: {
    name: string;
    role: string;
    avatar: string;
    color: string;
  };
  branch: string;
  branchLabel: string;
  branchColor: string;
  message: string;
  date: string;
  timeAgo: string;
  stats: {
    additions: number;
    deletions: number;
    files: number;
  };
  filesChanged: string[];
  cx: number;
  cy: number;
}

const GIT_COMMITS: GitCommitItem[] = [
  {
    id: "c-1",
    sha: "001a4fc",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "H", color: "#2563eb" },
    branch: "main",
    branchLabel: "main",
    branchColor: "#2563eb",
    message: "TE9CA72: Khởi tạo repo cấu trúc 3-tier, Dockerfile & branching model",
    date: "28/10/2026 09:15",
    timeAgo: "10 ngày trước",
    stats: { additions: 240, deletions: 0, files: 3 },
    filesChanged: ["backend/app/main.py", "docker-compose.yml", "README.md"],
    cx: 70,
    cy: 45,
  },
  {
    id: "c-2",
    sha: "14b98c2",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "H", color: "#2563eb" },
    branch: "feature/ci-cd-pipeline",
    branchLabel: "feature/ci-cd-pipeline",
    branchColor: "#8b5cf6",
    message: "TE9CA72: Tách nhánh feature/ci-cd-pipeline từ main, cấu hình CI/CD và môi trường staging",
    date: "29/10/2026 10:30",
    timeAgo: "21 ngày trước",
    stats: { additions: 110, deletions: 5, files: 2 },
    filesChanged: [".github/workflows/ci.yml", "package.json"],
    cx: 170,
    cy: 105,
  },
  {
    id: "c-3",
    sha: "b579f87",
    author: { name: "Võ Nhật Huy", role: "Frontend / Fullstack", avatar: "H", color: "#16a34a" },
    branch: "TE9CA7A-JWT",
    branchLabel: "TE9CA7A-JWT",
    branchColor: "#f59e0b",
    message: "TE22C19: Khởi tạo module Auth, schemas User và bảng cơ sở dữ liệu users",
    date: "30/10/2026 14:20",
    timeAgo: "20 ngày trước",
    stats: { additions: 185, deletions: 4, files: 3 },
    filesChanged: ["backend/app/models/user.py", "backend/app/schemas/auth.py", "backend/app/core/security.py"],
    cx: 260,
    cy: 165,
  },
  {
    id: "c-4",
    sha: "89f3a12",
    author: { name: "Phan Đình Nghị", role: "Backend / Database", avatar: "N", color: "#9333ea" },
    branch: "feature/te9ca74-kien-truc-3-tang",
    branchLabel: "feature/te9ca74-kien-truc-3-tang",
    branchColor: "#06b6d4",
    message: "TE35D77: Xây dựng cấu trúc kiến trúc 3-tier FastAPI + React",
    date: "31/10/2026 11:00",
    timeAgo: "19 ngày trước",
    stats: { additions: 230, deletions: 12, files: 4 },
    filesChanged: ["backend/app/services/evaluator.py", "docker/sandbox.Dockerfile", "backend/app/core/config.py"],
    cx: 340,
    cy: 225,
  },
  {
    id: "c-5",
    sha: "5149fb7",
    author: { name: "Võ Nhật Huy", role: "Frontend / Fullstack", avatar: "H", color: "#16a34a" },
    branch: "TE9CA7A-JWT",
    branchLabel: "TE9CA7A-JWT",
    branchColor: "#f59e0b",
    message: "TE22C19: Xây dựng JWT authentication, hash Passlib Bcrypt 12 rounds và endpoint /login",
    date: "01/11/2026 16:40",
    timeAgo: "18 ngày trước",
    stats: { additions: 295, deletions: 8, files: 5 },
    filesChanged: ["backend/app/api/v1/endpoints/auth.py", "backend/app/core/security.py", "src/screens/LoginScreen.tsx"],
    cx: 420,
    cy: 165,
  },
  {
    id: "c-6",
    sha: "9c23b81",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "H", color: "#2563eb" },
    branch: "feature/te9ca79-khoi-tao-Backend-FastAPI",
    branchLabel: "feature/te9ca79-khoi-tao-Backend-FastAPI",
    branchColor: "#10b981",
    message: "TE14F82: Cấu hình Redis Cache connection pool và Logger middleware trên backend",
    date: "02/11/2026 09:30",
    timeAgo: "17 ngày trước",
    stats: { additions: 74, deletions: 3, files: 2 },
    filesChanged: ["backend/app/core/redis.py", "backend/app/middlewares/logging.py"],
    cx: 490,
    cy: 285,
  },
  {
    id: "c-7",
    sha: "3a78c10",
    author: { name: "Phan Đình Nghị", role: "Backend / Database", avatar: "N", color: "#9333ea" },
    branch: "feature/te9ca74-kien-truc-3-tang",
    branchLabel: "feature/te9ca74-kien-truc-3-tang",
    branchColor: "#06b6d4",
    message: "TE35D77: Thiết lập giới hạn cgroups v2 (RAM 256MB, CPU 1 core) và 5 test cases ẩn",
    date: "02/11/2026 15:15",
    timeAgo: "17 ngày trước",
    stats: { additions: 145, deletions: 6, files: 3 },
    filesChanged: ["backend/app/services/evaluator.py", "backend/app/models/testcases.py"],
    cx: 560,
    cy: 225,
  },
  {
    id: "c-8",
    sha: "c8e41a9",
    author: { name: "Võ Nhật Huy", role: "Frontend / Fullstack", avatar: "H", color: "#16a34a" },
    branch: "feature/ci-cd-pipeline",
    branchLabel: "feature/ci-cd-pipeline",
    branchColor: "#8b5cf6",
    message: "TE22C19: Merge PR #04 'TE9CA7A-JWT' vào pipeline sau khi vượt qua CI audit",
    date: "03/11/2026 11:20",
    timeAgo: "16 ngày trước",
    stats: { additions: 85, deletions: 2, files: 2 },
    filesChanged: ["backend/app/api/v1/router.py", "backend/app/core/database.py"],
    cx: 640,
    cy: 105,
  },
  {
    id: "c-9",
    sha: "d4bdc7d",
    author: { name: "Phan Đình Nghị", role: "Backend / Database", avatar: "N", color: "#9333ea" },
    branch: "feature/ci-cd-pipeline",
    branchLabel: "feature/ci-cd-pipeline",
    branchColor: "#8b5cf6",
    message: "TE35D77: Merge PR #05 vào feature/ci-cd-pipeline (Đạt 100% test coverage)",
    date: "03/11/2026 18:00",
    timeAgo: "16 ngày trước",
    stats: { additions: 92, deletions: 5, files: 3 },
    filesChanged: ["backend/app/api/v1/router.py", "backend/app/services/analytics.py"],
    cx: 720,
    cy: 105,
  },
  {
    id: "c-10",
    sha: "77817ef",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "H", color: "#2563eb" },
    branch: "main",
    branchLabel: "main",
    branchColor: "#2563eb",
    message: "TE9CA72: Release v1.0.0: Nghiệm thu Sprint 1 & 2 lên Production Staging",
    date: "04/11/2026 09:00",
    timeAgo: "15 ngày trước",
    stats: { additions: 140, deletions: 10, files: 4 },
    filesChanged: ["dist/index.html", "vercel.json", "docker-compose.prod.yml"],
    cx: 810,
    cy: 45,
  },
  {
    id: "c-11",
    sha: "a41b782",
    author: { name: "Võ Nhật Huy", role: "Frontend / Fullstack", avatar: "H", color: "#16a34a" },
    branch: "huy",
    branchLabel: "huy",
    branchColor: "#ec4899",
    message: "HOTFIX-01: Vá lỗ hổng bảo mật CVE-2026-8812 SQL parameter escape tại tầng repository",
    date: "04/11/2026 14:15",
    timeAgo: "15 ngày trước",
    stats: { additions: 28, deletions: 6, files: 2 },
    filesChanged: ["backend/app/core/database.py", "backend/app/api/deps.py"],
    cx: 890,
    cy: 345,
  },
  {
    id: "c-12",
    sha: "e812d33",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "H", color: "#2563eb" },
    branch: "main",
    branchLabel: "main",
    branchColor: "#2563eb",
    message: "HOTFIX-01: Merge bản vá vào main (Đóng gói phát hành khẩn cấp Tag v1.0.1)",
    date: "04/11/2026 16:30",
    timeAgo: "15 ngày trước",
    stats: { additions: 35, deletions: 4, files: 2 },
    filesChanged: ["CHANGELOG.md", "backend/app/core/database.py"],
    cx: 970,
    cy: 45,
  },
  {
    id: "c-13",
    sha: "3d91cf4",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "H", color: "#2563eb" },
    branch: "feature/ci-cd-pipeline",
    branchLabel: "feature/ci-cd-pipeline",
    branchColor: "#8b5cf6",
    message: "HOTFIX-01: Đồng bộ bản vá về feature/ci-cd-pipeline",
    date: "04/11/2026 17:00",
    timeAgo: "15 ngày trước",
    stats: { additions: 22, deletions: 2, files: 2 },
    filesChanged: ["backend/app/core/database.py", "tests/test_sql_injection.py"],
    cx: 1030,
    cy: 105,
  },
  {
    id: "c-14",
    sha: "2103bbf",
    author: { name: "Phan Đình Nghị", role: "Backend / Database", avatar: "N", color: "#9333ea" },
    branch: "feature/ci-cd-pipeline",
    branchLabel: "feature/ci-cd-pipeline",
    branchColor: "#8b5cf6",
    message: "TE61A04: Cắt nhánh chuẩn bị đóng gói nghiệm thu Sprint 3 trên pipeline",
    date: "05/11/2026 10:45",
    timeAgo: "14 ngày trước",
    stats: { additions: 180, deletions: 14, files: 5 },
    filesChanged: ["backend/app/version.py", "package.json", "docs/release_notes.md"],
    cx: 1110,
    cy: 105,
  },
  {
    id: "c-15",
    sha: "62e08ab",
    author: { name: "Võ Nhật Huy", role: "Frontend / Fullstack", avatar: "H", color: "#16a34a" },
    branch: "huy",
    branchLabel: "huy",
    branchColor: "#ec4899",
    message: "TE61A04: Tinh chỉnh UI, cập nhật manifest và chạy trọn bộ 48 ca kiểm thử E2E Cypress",
    date: "05/11/2026 16:30",
    timeAgo: "14 ngày trước",
    stats: { additions: 115, deletions: 8, files: 4 },
    filesChanged: ["cypress/e2e/auth.cy.ts", "cypress/e2e/editor.cy.ts", "src/App.tsx"],
    cx: 1200,
    cy: 345,
  },
  {
    id: "c-16",
    sha: "7323c97",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "H", color: "#2563eb" },
    branch: "main",
    branchLabel: "main",
    branchColor: "#2563eb",
    message: "TE61A04: Release v1.2.0: Nghiệm thu toàn diện đồ án và bàn giao Production",
    date: "06/11/2026 14:00",
    timeAgo: "Hôm qua",
    stats: { additions: 310, deletions: 15, files: 6 },
    filesChanged: ["src/screens/GitProjectHub.tsx", "src/App.tsx", "backend/app/version.py"],
    cx: 1300,
    cy: 45,
  },
];

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
      // Easing: easeOutExpo for crisp high-end motion
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
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

  return <span className="marlo-num font-mono">{decimals > 0 ? displayValue.toFixed(decimals) : displayValue.toLocaleString()}{suffix}</span>;
}

interface GitProjectHubProps {
  role?: SessionRole;
  initialProjectId?: string;
  initialViewMode?: "topology" | "prs" | "gitdiagram" | "analytics" | "gitflow";
  onSelectProject?: (projectId: string) => void;
  onNavigate?: (screen: any) => void;
}

const TOPO_SVG_STYLES = `
  @keyframes topoDrawPath {
    0% { stroke-dashoffset: 1600; opacity: 0.3; }
    20% { opacity: 1; }
    100% { stroke-dashoffset: 0; opacity: 1; }
  }
  @keyframes topoPopNode {
    0% { transform: scale(0); opacity: 0; }
    65% { transform: scale(1.28); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes topoFadeIn {
    0% { opacity: 0; transform: translateY(-4px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .topo-path-main {
    stroke-dasharray: 1600;
    stroke-dashoffset: 1600;
    animation: topoDrawPath 1.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  .topo-path-develop1 {
    stroke-dasharray: 1600;
    stroke-dashoffset: 1600;
    animation: topoDrawPath 1.5s cubic-bezier(0.4, 0, 0.2, 1) 0.15s forwards;
  }
  .topo-path-develop2 {
    stroke-dasharray: 1600;
    stroke-dashoffset: 1600;
    animation: topoDrawPath 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.75s forwards;
  }
  .topo-path-auth {
    stroke-dasharray: 1600;
    stroke-dashoffset: 1600;
    animation: topoDrawPath 1.3s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards;
  }
  .topo-path-evaluator {
    stroke-dasharray: 1600;
    stroke-dashoffset: 1600;
    animation: topoDrawPath 1.3s cubic-bezier(0.4, 0, 0.2, 1) 0.4s forwards;
  }
  .topo-path-hotfix {
    stroke-dasharray: 1600;
    stroke-dashoffset: 1600;
    animation: topoDrawPath 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.6s forwards;
  }
  .topo-path-hotfix-dev {
    stroke-dasharray: 1600;
    stroke-dashoffset: 1600;
    animation: topoDrawPath 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.7s forwards;
  }
  .topo-path-release {
    stroke-dasharray: 1600;
    stroke-dashoffset: 1600;
    animation: topoDrawPath 1.3s cubic-bezier(0.4, 0, 0.2, 1) 0.8s forwards;
  }
`;

/** Formats raw ISO timestamps into a compact single-line local string (HH:mm · dd/MM/yyyy). */
function formatSyncTimestamp(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  const dt = new Date(trimmed);
  if (Number.isNaN(dt.getTime())) return trimmed;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(dt.getHours())}:${pad(dt.getMinutes())} · ${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

interface GitRepoConfigModalProps {
  isOpen: boolean;
  isClosing: boolean;
  initialRepoUrl: string;
  initialTargetBranch: string;
  initialMergeStrategy: string;
  lastSyncedAt: string;
  isSyncingLive: boolean;
  onClose: () => void;
  onSave: (
    nextRepoUrl: string,
    nextTargetBranch: string,
    nextMergeStrategy: string
  ) => Promise<void> | void;
}

const PRESET_TARGET_BRANCHES = [
  { value: "main", label: "main (Production Release)" },
  { value: "develop", label: "develop (Integration Branch)" },
  { value: "feature/erd", label: "feature/erd (Database Design)" },
  { value: "feature/auth", label: "feature/auth (Authentication)" },
  { value: "feature/sandbox", label: "feature/sandbox (Docker Runner)" },
];

/** Isolated modal holding draft form state so keystrokes never re-render the heavy SVG/ReactFlow graph. */
const GitRepoConfigModal = memo(function GitRepoConfigModal({
  isOpen,
  isClosing,
  initialRepoUrl,
  initialTargetBranch,
  initialMergeStrategy,
  lastSyncedAt,
  isSyncingLive,
  onClose,
  onSave,
}: GitRepoConfigModalProps) {
  const [draftRepoUrl, setDraftRepoUrl] = useState(initialRepoUrl);
  const [draftTargetBranch, setDraftTargetBranch] = useState(initialTargetBranch);
  const [draftMergeStrategy, setDraftMergeStrategy] = useState(initialMergeStrategy);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftRepoUrl(initialRepoUrl);
      setDraftTargetBranch(initialTargetBranch);
      setDraftMergeStrategy(initialMergeStrategy);
      setValidationError(null);
    }
  }, [isOpen, initialRepoUrl, initialTargetBranch, initialMergeStrategy]);

  const formattedSyncedAt = useMemo(
    () => formatSyncTimestamp(lastSyncedAt),
    [lastSyncedAt]
  );

  if (!isOpen || typeof document === "undefined") return null;

  const cleanDraft = draftRepoUrl.trim();
  const cleanInitial = initialRepoUrl.trim();
  const isConnectedExact = cleanDraft.length > 0 && cleanDraft === cleanInitial;
  const validPreviewUrl = /^https?:\/\//i.test(cleanDraft)
    ? cleanDraft
    : /^https?:\/\//i.test(cleanInitial)
    ? cleanInitial
    : "";

  const hasCustomBranch =
    Boolean(draftTargetBranch) &&
    !PRESET_TARGET_BRANCHES.some((opt) => opt.value === draftTargetBranch);

  const handleSubmit = async () => {
    if (!cleanDraft || !/^https?:\/\//i.test(cleanDraft)) {
      setValidationError("Vui lòng nhập URL GitHub hợp lệ bắt đầu bằng https:// hoặc http://");
      inputRef.current?.focus();
      return;
    }
    setValidationError(null);
    try {
      await onSave(cleanDraft, draftTargetBranch, draftMergeStrategy);
    } catch (err: any) {
      setValidationError(err?.message || "Không thể lưu cấu hình Repo, vui lòng thử lại.");
    }
  };

  return createPortal(
    <div
      onClick={() => {
        if (!isSyncingLive) onClose();
      }}
      className={`fixed inset-0 z-[9998] bg-slate-950/60 flex items-center justify-center p-4 ${
        isClosing ? "marlo-scrim-out" : "marlo-scrim"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 ${
          isClosing ? "marlo-modal-out" : "marlo-modal"
        }`}
      >
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitFork size={18} className="text-blue-600 dark:text-blue-400" />
              Liên Kết & Đồng Bộ Repo GitHub
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Quản lý kho mã nguồn, nhánh nộp bài chính và chiến lược Merge mặc định của dự án.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncingLive}
            aria-label="Đóng hộp thoại"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1 cursor-pointer disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label
              htmlFor="git-repo-url-input"
              className="font-semibold text-slate-700 dark:text-slate-300 block mb-1"
            >
              Đường dẫn Kho lưu trữ (GitHub Repository URL):
            </label>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg transition-colors ${
                validationError
                  ? "border-rose-400 dark:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500"
                  : "border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500"
              }`}
            >
              <input
                id="git-repo-url-input"
                ref={inputRef}
                type="text"
                value={draftRepoUrl}
                onChange={(e) => {
                  setDraftRepoUrl(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSyncingLive) {
                    e.preventDefault();
                    void handleSubmit();
                  }
                }}
                placeholder="https://github.com/owner/repository"
                className="flex-1 min-w-0 bg-transparent font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none py-0.5"
              />
              {draftRepoUrl.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftRepoUrl("");
                    setValidationError(null);
                    inputRef.current?.focus();
                  }}
                  aria-label="Xóa đường dẫn URL"
                  title="Xóa nhanh URL"
                  className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
              {cleanDraft.length > 0 &&
                (isConnectedExact ? (
                  <span className="shrink-0 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded whitespace-nowrap">
                    Đã Kết Nối
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-2 py-0.5 rounded whitespace-nowrap">
                    Chưa lưu
                  </span>
                ))}
            </div>
            {validationError && (
              <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                {validationError}
              </p>
            )}

            <details className="mt-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-2.5 py-1.5">
              <summary className="text-[11px] font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                Thử nghiệm nhanh với Repo mẫu công khai (tùy chọn)
              </summary>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setDraftRepoUrl("https://github.com/Hoaba-clouch/E-learningProject");
                    setValidationError(null);
                  }}
                  className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[11px] font-semibold hover:bg-purple-100 cursor-pointer"
                >
                  CodeMind Gốc
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftRepoUrl("https://github.com/facebook/react");
                    setValidationError(null);
                  }}
                  className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold hover:bg-blue-100 cursor-pointer"
                >
                  React
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftRepoUrl("https://github.com/fastapi/fastapi");
                    setValidationError(null);
                  }}
                  className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-100 cursor-pointer"
                >
                  FastAPI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftRepoUrl("https://github.com/torvalds/linux");
                    setValidationError(null);
                  }}
                  className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-semibold hover:bg-amber-100 cursor-pointer"
                >
                  Linux
                </button>
              </div>
            </details>
          </div>

          <div>
            <label
              htmlFor="git-target-branch-select"
              className="font-semibold text-slate-700 dark:text-slate-300 block mb-1"
            >
              Nhánh nộp bài & đồng bộ chính (Target Branch):
            </label>
            <select
              id="git-target-branch-select"
              value={draftTargetBranch}
              onChange={(e) => setDraftTargetBranch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {hasCustomBranch && (
                <option value={draftTargetBranch}>
                  {draftTargetBranch} (Nhánh hiện tại của Repo)
                </option>
              )}
              {PRESET_TARGET_BRANCHES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="git-merge-strategy-select"
              className="font-semibold text-slate-700 dark:text-slate-300 block mb-1"
            >
              Chiến lược Merge mặc định (Default Merge Strategy):
            </label>
            <select
              id="git-merge-strategy-select"
              value={draftMergeStrategy}
              onChange={(e) => setDraftMergeStrategy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="squash">squash (Squash and Merge — Chuẩn Sprint)</option>
              <option value="rebase">rebase (Rebase and Merge — Tuyến tính)</option>
              <option value="merge">merge (Merge Commit --no-ff)</option>
            </select>
          </div>

          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/60 rounded-lg text-blue-900 dark:text-blue-200 space-y-1.5 text-xs">
            <div className="font-bold flex items-center justify-between gap-2 text-blue-800 dark:text-blue-300">
              <span className="flex items-center gap-1.5 shrink-0">
                <ShieldCheck size={14} />
                Trạng thái liên kết tự động:
              </span>
              {formattedSyncedAt && (
                <span className="text-[10.5px] font-mono font-normal text-blue-700 dark:text-blue-400 whitespace-nowrap shrink-0">
                  Đồng bộ: {formattedSyncedAt}
                </span>
              )}
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-blue-800 dark:text-blue-300">
              <li>Tự động lấy commit history và ánh xạ sang <strong>Cây phân nhánh DAG</strong>.</li>
              <li>Tự động quét Pull Request qua <strong>CodeMind AI AST Reviewer</strong>.</li>
              <li>Kiểm định liêm chính AI và phân bổ đóng góp giữa các thành viên nhóm.</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          {validPreviewUrl ? (
            <a
              href={validPreviewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              <FolderGit2 size={13} />
              Xem trên GitHub
            </a>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1 cursor-not-allowed">
              <FolderGit2 size={13} />
              Xem trên GitHub
            </span>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncingLive}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSyncingLive}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RotateCw size={13} className={isSyncingLive ? "animate-spin" : ""} />
              <span>{isSyncingLive ? "Đang đồng bộ..." : "Lưu & Đồng Bộ Ngay"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default function GitProjectHub({
  role = "student",
  initialProjectId = "prj-codemind",
  initialViewMode,
  onSelectProject,
  onNavigate,
}: GitProjectHubProps = {}) {
  const isStudent = role === "student";
  const isInstructor = role === "instructor";
  const isAdmin = role === "admin";

  const gitHubRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"topology" | "prs" | "gitdiagram" | "analytics" | "gitflow">(
    initialViewMode || "topology"
  );
  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);
  const [activeProjectId, setActiveProjectId] = useState<string>(initialProjectId);
  const [projectsList, setProjectsList] = useState<GitHubProjectSummary[]>([]);
  const [repoSlug, setRepoSlug] = useState<string>("hoaba-clouch/e-learningproject");
  const [mergeStrategy, setMergeStrategy] = useState<string>("squash");
  const [webhookActive, setWebhookActive] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");
  const [commits, setCommits] = useState<GitCommitItem[]>(GIT_COMMITS);
  const [pullRequests, setPullRequests] = useState<GitPullRequestRecord[]>([]);
  const [selectedPr, setSelectedPr] = useState<GitPullRequestRecord | null>(null);
  const [memberAnalytics, setMemberAnalytics] = useState<GitMemberAnalytics[]>([]);
  const [projectTasks, setProjectTasks] = useState<GitProjectTaskRef[]>([]);
  const [metricsState, setMetricsState] = useState({
    gitCultureScore: 94.8,
    taskLinkedPct: 100,
    aiIntegrityPct: 100,
    cadenceVarianceHours: 4.8,
    totalCommits: 16,
    openPrsCount: 3,
    mergedPrsCount: 1,
    memberShares: [36, 34, 30],
    balanceStatus: "Cân bằng",
  });
  const [isRepoFrozen, setIsRepoFrozen] = useState<boolean>(() =>
    isProjectFrozen(initialProjectId)
  );
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [prActionLoading, setPrActionLoading] = useState<string | null>(null);
  const [showNewCommitModal, setShowNewCommitModal] = useState(false);
  const [showNewPrModal, setShowNewPrModal] = useState(false);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  useEffect(() => {
    setIsRepoFrozen(isProjectFrozen(activeProjectId));
    return subscribeProjectLockChanges(() => {
      setIsRepoFrozen(isProjectFrozen(activeProjectId));
    });
  }, [activeProjectId]);

  const handleToggleRepoFreeze = () => {
    if (!isAdmin) return;
    const nextLocked = !isRepoFrozen;
    setProjectFrozen(activeProjectId, nextLocked);
    setIsRepoFrozen(nextLocked);
    showToast(
      nextLocked
        ? `Đã đóng băng Repository & khóa Sprint Kanban của dự án ${activeProjectId} — Sinh viên không thể Commit / PR / Merge.`
        : `Đã mở khóa Repository & Sprint Kanban dự án ${activeProjectId} — Sinh viên có thể tiếp tục nộp bài.`
    );
  };

  const handleExportGitCsv = () => {
    const csvCell = (val: unknown) => {
      const s = String(val ?? "").replace(/"/g, '""');
      return `"${s}"`;
    };
    const lines: string[] = [];
    lines.push("BAO CAO KIEM DINH GIT PROJECT HUB");
    lines.push(`Du an,${csvCell(activeProjectId)},Repo,${csvCell(repoSlug)},Diem Van hoa Git,${metricsState.gitCultureScore}`);
    lines.push("");
    lines.push("PHAN BO DONG GOP THANH VIEN (50% SP / 30% Commit / 20% DoD)");
    lines.push("Thanh vien,Vai tro,Ty trong (%),So Commit,Story Points,Them dong,Xoa dong,Xep hang");
    memberAnalytics.forEach((m) => {
      lines.push(
        [m.name, m.role, m.sharePct, m.commitsCount, m.storyPointsDone, m.additions, m.deletions, m.grade]
          .map(csvCell)
          .join(",")
      );
    });
    lines.push("");
    lines.push("DANH SACH PULL REQUEST & CON DAU DOD");
    lines.push("PR #,Tieu de,Tac gia,Nhanh nguon,Nhanh dich,Task,AI Score,Trang thai,Peer Reviewer,DoD SHA-256");
    pullRequests.forEach((pr) => {
      lines.push(
        [
          `#${String(pr.prNumber).padStart(2, "0")}`,
          pr.title,
          pr.author.name,
          pr.sourceBranch,
          pr.targetBranch,
          pr.taskCode || "",
          pr.aiReviewScore,
          pr.status,
          pr.peerReviewer || "",
          pr.dodSha256 || "",
        ]
          .map(csvCell)
          .join(",")
      );
    });

    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `git_audit_${activeProjectId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Đã xuất báo cáo kiểm định Git (${activeProjectId}.csv)!`);
  };

  const [selectedNodeId, setSelectedNodeId] = useState<string>("learning-ws");
  const [archDrawerOpen, setArchDrawerOpen] = useState(false);
  const [isArchDrawerClosing, setIsArchDrawerClosing] = useState(false);
  const [drawerToast, setDrawerToast] = useState<string | null>(null);
  const [copiedMermaid, setCopiedMermaid] = useState<boolean>(false);

  // Dynamic Architecture & ReactFlow States (Stored in MySQL project_architectures)
  const [archNodes, setArchNodes, onNodesChange] = useNodesState(INITIAL_ARCH_NODES);
  const [archEdges, setArchEdges, onEdgesChange] = useEdgesState(INITIAL_ARCH_EDGES);
  const [diagramAnimKey, setDiagramAnimKey] = useState<number>(0);
  const [activeArchFlow, setActiveArchFlow] = useState<string>("all");
  const [dynamicArchTitle, setDynamicArchTitle] = useState<string>("CodeMind AI - Hệ thống Gia sư Lập trình Socratic & Docker Sandbox");
  const [dynamicTechStack, setDynamicTechStack] = useState<string>("React 18 + Tailwind CSS + FastAPI + Docker Seccomp + MySQL 8.0");
  const [dynamicFlows, setDynamicFlows] = useState<ArchFlowItem[]>(ARCH_FLOWS);
  const [dynamicSubsystems, setDynamicSubsystems] = useState<any[]>([]);
  const [isSyncingLive, setIsSyncingLive] = useState<boolean>(false);
  const [isSavingArch, setIsSavingArch] = useState<boolean>(false);
  const [isGeneratingArch, setIsGeneratingArch] = useState<boolean>(false);
  const [archLastUpdated, setArchLastUpdated] = useState<string>("");

  const loadArchitecture = useCallback(async (pid: string) => {
    const data = await fetchProjectArchitectureApi(pid, role);
    if (!data) return;
    if (Array.isArray(data.nodes) && data.nodes.length > 0) {
      setArchNodes(data.nodes);
    }
    if (Array.isArray(data.edges) && data.edges.length > 0) {
      setArchEdges(data.edges);
    }
    if (Array.isArray(data.flows) && data.flows.length > 0) {
      setDynamicFlows(data.flows);
      if (!data.flows.some((f: any) => f.id === activeArchFlow)) {
        setActiveArchFlow("all");
      }
    }
    if (Array.isArray(data.subsystems)) {
      setDynamicSubsystems(data.subsystems);
    }
    if (data.title) setDynamicArchTitle(data.title);
    if (data.techStack) setDynamicTechStack(data.techStack);
    if (data.updatedAt) setArchLastUpdated(data.updatedAt);
    setDiagramAnimKey((k) => k + 1);
  }, [activeArchFlow, role, setArchNodes, setArchEdges]);

  // GitHub Repo Connection State
  const [showRepoModal, setShowRepoModal] = useState<boolean>(false);
  const [isRepoModalClosing, setIsRepoModalClosing] = useState(false);

  const handleCloseArchDrawer = () => {
    if (isArchDrawerClosing) return;
    setIsArchDrawerClosing(true);
    setTimeout(() => {
      setArchDrawerOpen(false);
      setIsArchDrawerClosing(false);
    }, 280);
  };

  const handleCloseRepoModal = useCallback(() => {
    if (isRepoModalClosing) return;
    setIsRepoModalClosing(true);
    setTimeout(() => {
      setShowRepoModal(false);
      setIsRepoModalClosing(false);
    }, 220);
  }, [isRepoModalClosing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (archDrawerOpen) handleCloseArchDrawer();
        if (showRepoModal && !isSyncingLive) handleCloseRepoModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [archDrawerOpen, showRepoModal, isArchDrawerClosing, isRepoModalClosing, isSyncingLive, handleCloseRepoModal]);
  const [repoUrl, setRepoUrl] = useState<string>("https://github.com/Hoaba-clouch/E-learningProject");
  const [targetBranch, setTargetBranch] = useState<string>("main");
  const [topoAnimKey, setTopoAnimKey] = useState<number>(0);
  const [statAnimKey, setStatAnimKey] = useState<number>(0);

  const handleSetViewMode = (mode: "topology" | "prs" | "gitdiagram" | "analytics" | "gitflow") => {
    setViewMode(mode);
    setActionError(null);
    setStatAnimKey((k) => k + 1);
    if (mode === "topology") setTopoAnimKey((k) => k + 1);
    if (mode === "gitdiagram") setDiagramAnimKey((k) => k + 1);
  };

  // Topology Interactive State
  const [selectedCommit, setSelectedCommit] = useState<GitCommitItem>(GIT_COMMITS[8] || GIT_COMMITS[0]);
  const [hoveredCommit, setHoveredCommit] = useState<GitCommitItem | null>(null);
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const loadGitWorkspace = useCallback(async (pid: string, preserveSelectedPrId?: string) => {
    const data = await fetchGitHubWorkspaceApi(pid, role);
    if (!data) return;
    setProjectsList(data.projects || []);
    setRepoUrl(data.repository.repoUrl);
    setRepoSlug(data.repository.repoSlug);
    setTargetBranch(data.repository.targetBranch);
    setMergeStrategy(data.repository.defaultMergeStrategy || "squash");
    setWebhookActive(Boolean(data.repository.webhookActive));
    setLastSyncedAt(data.repository.lastSyncedAt || "");
    setMetricsState(data.metrics);
    setProjectTasks(data.projectTasks || []);
    setMemberAnalytics(data.memberAnalytics || []);
    if (Array.isArray(data.commits) && data.commits.length > 0) {
      setCommits(data.commits as GitCommitItem[]);
      setSelectedCommit((prev) => {
        const match = data.commits.find((c) => c.id === prev?.id);
        return (match || data.commits[data.commits.length - 1] || data.commits[0]) as GitCommitItem;
      });
    } else {
      setCommits([]);
    }
    const prs = data.pullRequests || [];
    setPullRequests(prs);
    setSelectedPr((prev) => {
      const targetId = preserveSelectedPrId || prev?.id;
      return prs.find((p) => p.id === targetId) || prs[0] || null;
    });
    void loadArchitecture(pid);
  }, [loadArchitecture, role]);

  const handleApplyRepoUrl = async (targetUrl: string) => {
    if (isRepoFrozen && isStudent) {
      showToast("Repository đang bị đóng băng (Freeze), không thể đồng bộ mới.");
      return;
    }
    const cleanUrl = targetUrl.trim();
    if (!cleanUrl || !cleanUrl.startsWith("http")) {
      showToast("Vui lòng nhập URL GitHub hợp lệ (https://...)");
      return;
    }
    setIsSyncingLive(true);
    setActionError(null);
    try {
      setRepoUrl(cleanUrl);
      const res = await syncGitHubLiveApi(activeProjectId, cleanUrl, role);
      if (res.error) {
        showToast(res.error);
      } else {
        const modeLabel = res.isRemoteLive ? "Live GitHub API" : "Đồng bộ cục bộ";
        showToast(
          `[${modeLabel}] Repo ${res.repoSlug || cleanUrl}: ${res.commitsSynced || 0} commits & Sơ đồ kiến trúc đã cập nhật!`
        );
      }
      await loadGitWorkspace(activeProjectId, selectedPr?.id);
      setTopoAnimKey((k) => k + 1);
      setDiagramAnimKey((k) => k + 1);
      setStatAnimKey((k) => k + 1);
    } catch (err: any) {
      showToast("Lỗi đồng bộ repo: " + (err?.message || "Kiểm tra kết nối"));
    } finally {
      setIsSyncingLive(false);
    }
  };

  const handleSaveArchitecture = async () => {
    if (isRepoFrozen && isStudent) {
      showToast("Repository đang bị đóng băng, không thể lưu sửa đổi kiến trúc.");
      return;
    }
    setIsSavingArch(true);
    try {
      const payload = {
        title: dynamicArchTitle,
        techStack: dynamicTechStack,
        subsystems: dynamicSubsystems.length > 0 ? dynamicSubsystems : [
          { id: "group-campus-app", label: "Client UI Layer" },
          { id: "group-project-ws", label: "Project Workspace" },
          { id: "group-api-core", label: "API Core & Socratic Engine" },
          { id: "group-infra-data", label: "Execution Sandbox & MySQL 8.0" },
        ],
        flows: dynamicFlows,
        nodes: archNodes,
        edges: archEdges,
        repoUrl,
      };
      const res = await saveProjectArchitectureApi(activeProjectId, payload, role);
      if (res.error) {
        showToast(res.error);
      } else {
        showToast("Đã lưu sơ đồ kiến trúc động thành công vào CSDL MySQL!");
      }
    } finally {
      setIsSavingArch(false);
    }
  };

  const handleGenerateArchitecture = async () => {
    if (isRepoFrozen && isStudent) {
      showToast("Repository đang bị đóng băng, không thể quét lại kiến trúc.");
      return;
    }
    setIsGeneratingArch(true);
    try {
      const res = await generateProjectArchitectureApi(activeProjectId, repoUrl, role);
      if (res.error) {
        showToast(res.error);
      } else if (res) {
        if (Array.isArray(res.nodes)) setArchNodes(res.nodes);
        if (Array.isArray(res.edges)) setArchEdges(res.edges);
        if (Array.isArray(res.flows)) setDynamicFlows(res.flows);
        if (Array.isArray(res.subsystems)) setDynamicSubsystems(res.subsystems);
        if (res.title) setDynamicArchTitle(res.title);
        if (res.techStack) setDynamicTechStack(res.techStack);
        setDiagramAnimKey((k) => k + 1);
        showToast("AI đã quét và tái cấu trúc sơ đồ kiến trúc từ Repo thành công!");
      }
    } finally {
      setIsGeneratingArch(false);
    }
  };

  useEffect(() => {
    setActiveProjectId(initialProjectId || "prj-codemind");
  }, [initialProjectId]);

  useEffect(() => {
    setMemberFilter("all");
    setBranchFilter("all");
    void loadGitWorkspace(activeProjectId);
  }, [activeProjectId, loadGitWorkspace]);

  const handleSaveRepoSync = async (
    nextRepoUrl: string,
    nextTargetBranch: string,
    nextMergeStrategy: string
  ) => {
    const cleanUrl = nextRepoUrl.trim();
    if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
      showToast("Vui lòng nhập URL GitHub hợp lệ (https://...)");
      return;
    }
    const res = await updateGitHubRepoApi(
      activeProjectId,
      {
        repo_url: cleanUrl,
        target_branch: nextTargetBranch,
        default_merge_strategy: nextMergeStrategy,
      },
      role
    );
    if (res.error) {
      setActionError(res.error);
      showToast(res.error);
      throw new Error(res.error);
    }
    if (res.repository) {
      setRepoUrl(res.repository.repoUrl || cleanUrl);
      setRepoSlug(res.repository.repoSlug);
      setTargetBranch(res.repository.targetBranch || nextTargetBranch);
      setMergeStrategy(res.repository.defaultMergeStrategy || nextMergeStrategy);
    } else {
      setRepoUrl(cleanUrl);
      setTargetBranch(nextTargetBranch);
      setMergeStrategy(nextMergeStrategy);
    }
    handleCloseRepoModal();
    await handleApplyRepoUrl(cleanUrl);
  };

  const handlePushNewCommit = async (payload: {
    branch: string;
    message: string;
    task_code?: string;
    author_name?: string;
    files_changed: string[];
    additions?: number;
    deletions?: number;
  }) => {
    const res = await pushGitCommitApi(activeProjectId, payload, role);
    if (res.error) {
      showToast(res.error);
      return;
    }
    if (res.commit) {
      await loadGitWorkspace(activeProjectId, selectedPr?.id);
      setSelectedCommit(res.commit as GitCommitItem);
      setTopoAnimKey((k) => k + 1);
      const taskHint = res.linkedTaskUpdated
        ? ` · Tự động chuyển Task #${res.linkedTaskUpdated} sang Đang làm trên Kanban`
        : "";
      showToast(
        `Đã ghi nhận commit ${res.commit.sha}${
          (res.xp_awarded || 0) > 0 ? ` (+${res.xp_awarded} XP)` : ""
        }${taskHint}`
      );
    }
  };

  const handleCreateNewPr = async (payload: {
    title: string;
    description: string;
    source_branch: string;
    target_branch: string;
    task_code?: string;
    code_snippet: string;
  }) => {
    setActionError(null);
    const res = await createGitPullRequestApi(activeProjectId, payload, role);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    if (res.pullRequest) {
      await loadGitWorkspace(activeProjectId, res.pullRequest.id);
      setViewMode("prs");
      const taskHint = res.linkedTaskUpdated
        ? ` · Tự động chuyển Task #${res.linkedTaskUpdated} sang Đang làm trên Kanban`
        : "";
      showToast(`Đã tạo PR #${String(res.pullRequest.prNumber).padStart(2, "0")} & chạy AST Scanner${taskHint}`);
    }
  };

  const handleAiFixPr = async (prId: string) => {
    setActionError(null);
    setPrActionLoading("ai-fix");
    try {
      const res = await applyPrAiFixApi(prId, role);
      if (res.error) {
        setActionError(res.error);
        return;
      }
      await loadGitWorkspace(activeProjectId, prId);
      showToast("Đã áp dụng bản vá bảo mật 1-Click từ CodeMind AI!");
    } finally {
      setPrActionLoading(null);
    }
  };

  const handlePeerApprovePr = async (prId: string, comment: string, reviewerName?: string) => {
    setActionError(null);
    setPrActionLoading("peer-approve");
    try {
      const res = await approvePrPeerReviewApi(
        prId,
        { comment, reviewer_name: reviewerName },
        role
      );
      if (res.error) {
        setActionError(res.error);
        return;
      }
      await loadGitWorkspace(activeProjectId, prId);
      showToast(
        isInstructor
          ? "Giảng viên đã ký phê duyệt DoD cho Pull Request!"
          : "Đã ký Peer Review Approve cho Pull Request!"
      );
    } finally {
      setPrActionLoading(null);
    }
  };

  const handleRequestChangesPr = async (prId: string, comment: string, reviewerName?: string) => {
    setActionError(null);
    setPrActionLoading("request-changes");
    try {
      const res = await requestChangesPrApi(
        prId,
        { comment, reviewer_name: reviewerName },
        role
      );
      if (res.error) {
        setActionError(res.error);
        return;
      }
      await loadGitWorkspace(activeProjectId, prId);
      showToast("Đã gửi yêu cầu chỉnh sửa (Request Changes) cho Pull Request!");
    } finally {
      setPrActionLoading(null);
    }
  };

  const handleMergePr = async (prId: string, strategy: string) => {
    setActionError(null);
    setPrActionLoading("merge");
    try {
      const res = await mergeGitPullRequestApi(prId, strategy, role);
      if (res.error) {
        setActionError(res.error);
        return;
      }
      await loadGitWorkspace(activeProjectId, prId);
      const stratLabel =
        strategy === "rebase"
          ? "Rebase Merge"
          : strategy === "merge"
          ? "Merge Commit"
          : "Squash Merge";
      showToast(
        `Đã ${stratLabel} & đóng dấu SHA-256 DoD${
          res.updatedTaskCode ? ` (Task #${res.updatedTaskCode} → Hoàn thành)` : ""
        }${(res.xp_awarded || 0) > 0 ? ` • +${res.xp_awarded} XP` : ""}`
      );
    } finally {
      setPrActionLoading(null);
    }
  };

  const uniqueAuthors = useMemo(() => {
    const counts = new Map<string, number>();
    commits.forEach((c) => counts.set(c.author.name, (counts.get(c.author.name) || 0) + 1));
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [commits]);

  const uniqueBranches = useMemo(() => {
    const map = new Map<string, { name: string; color: string; cy: number; count: number }>();
    commits.forEach((c) => {
      const bName = c.branch || "main";
      const existing = map.get(bName);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(bName, {
          name: bName,
          color: c.branchColor || "#2563eb",
          cy: c.cy || 105,
          count: 1,
        });
      }
    });
    if (map.size === 0) {
      return [
        { name: "main", color: "#2563eb", cy: 45, count: 0 },
        { name: "develop", color: "#10b981", cy: 105, count: 0 },
      ];
    }
    return Array.from(map.values()).sort((a, b) => a.cy - b.cy);
  }, [commits]);

  const dynamicTopoEdges = useMemo(() => {
    if (commits.length === 0) return [];
    const edges: Array<{
      key: string;
      d: string;
      color: string;
      dashed?: boolean;
      width?: number;
    }> = [];

    const lastCommitByBranch = new Map<string, GitCommitItem>();
    const firstBranchSeen = new Set<string>();

    for (let i = 0; i < commits.length; i++) {
      const c = commits[i];
      const b = c.branch || "main";
      const msgLow = (c.message || "").toLowerCase();

      if (!firstBranchSeen.has(b)) {
        firstBranchSeen.add(b);
        if (b !== "main" && b !== "master") {
          let parentCommit: GitCommitItem | undefined;
          for (let j = i - 1; j >= 0; j--) {
            const pb = commits[j].branch || "main";
            if (pb === "develop" && b !== "develop") {
              parentCommit = commits[j];
              break;
            }
            if (pb === "main" || pb === "master") {
              parentCommit = commits[j];
              break;
            }
          }
          if (!parentCommit && i > 0) parentCommit = commits[0];
          if (parentCommit) {
            const midX = (parentCommit.cx + c.cx) / 2;
            edges.push({
              key: `branch-out-${c.id}`,
              d: `M ${parentCommit.cx} ${parentCommit.cy} C ${midX} ${parentCommit.cy}, ${midX} ${c.cy}, ${c.cx} ${c.cy}`,
              color: c.branchColor || "#6366f1",
              width: 3,
            });
          }
        }
      } else {
        const prevSame = lastCommitByBranch.get(b);
        if (prevSame) {
          edges.push({
            key: `intra-${c.id}`,
            d: `M ${prevSame.cx} ${prevSame.cy} L ${c.cx} ${c.cy}`,
            color: c.branchColor || prevSame.branchColor || "#2563eb",
            width: 3,
          });
        }
      }

      if ((b === "main" || b === "master" || b === "develop") && i > 0) {
        const isMergeMsg =
          msgLow.includes("merge") ||
          msgLow.includes("pr #") ||
          msgLow.includes("pull request") ||
          msgLow.includes("release");
        if (isMergeMsg) {
          let sourceCommit: GitCommitItem | undefined;
          for (let j = i - 1; j >= 0; j--) {
            const candidate = commits[j];
            const cb = (candidate.branch || "").toLowerCase();
            if (cb !== b.toLowerCase() && msgLow.includes(cb)) {
              sourceCommit = candidate;
              break;
            }
          }
          if (!sourceCommit && commits[i - 1].branch !== b) {
            sourceCommit = commits[i - 1];
          }
          if (sourceCommit) {
            const midX = (sourceCommit.cx + c.cx) / 2;
            edges.push({
              key: `merge-in-${c.id}`,
              d: `M ${sourceCommit.cx} ${sourceCommit.cy} C ${midX} ${sourceCommit.cy}, ${midX} ${c.cy}, ${c.cx} ${c.cy}`,
              color: sourceCommit.branchColor || "#a855f7",
              dashed: true,
              width: 2.5,
            });
          }
        }
      }

      lastCommitByBranch.set(b, c);
    }

    return edges;
  }, [commits]);

  const filteredCommits = useMemo(() => {
    return commits.filter((c) => {
      const matchMember = memberFilter === "all" || c.author.name === memberFilter;
      const bLow = (c.branch || "").toLowerCase();
      const matchBranch =
        branchFilter === "all" ||
        (branchFilter === "pipeline"
          ? bLow.includes("pipeline") || bLow.includes("ci")
          : branchFilter === "jwt"
          ? bLow.includes("jwt") || bLow.includes("auth")
          : branchFilter === "te9ca74"
          ? bLow.includes("te9ca74") || bLow.includes("kien-truc") || bLow.includes("3-tang")
          : branchFilter === "te9ca79"
          ? bLow.includes("te9ca79") || bLow.includes("backend") || bLow.includes("fastapi")
          : branchFilter === "huy"
          ? bLow === "huy"
          : c.branch === branchFilter || bLow === branchFilter.toLowerCase());
      return matchMember && matchBranch;
    });
  }, [commits, memberFilter, branchFilter]);

  const filteredCommitIds = useMemo(
    () => new Set(filteredCommits.map((c) => c.id)),
    [filteredCommits]
  );

  const svgWidth = useMemo(() => {
    const maxCx = commits.reduce((acc, c) => Math.max(acc, c.cx || 70), 1300);
    return Math.max(1420, maxCx + 110);
  }, [commits]);

  // ─── Mouse Drag-to-Scroll (Pan) for Visual Git Branch Graph (Matches Kanban feel) ───
  const gitGraphScrollRef = useRef<HTMLDivElement>(null);
  const [isGraphPanning, setIsGraphPanning] = useState(false);
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
  const hasJustPannedRef = useRef(false);
  const panMomentumIdRef = useRef<number | null>(null);

  const handleGraphPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Support Left Click (0) and Middle Click (1)
    if (e.button !== 0 && e.button !== 1) return;

    // Ignore interactive targets (buttons, links, inputs, popovers)
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("[data-no-pan]")
    ) {
      return;
    }

    const scrollEl = gitGraphScrollRef.current;
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

      const scrollEl = gitGraphScrollRef.current;
      if (!scrollEl) return;

      const deltaX = e.clientX - tracker.startX;
      const deltaY = e.clientY - tracker.startY;

      // Threshold to distinguish click from drag (5px)
      if (!tracker.hasDragged && Math.hypot(deltaX, deltaY) > 5) {
        tracker.hasDragged = true;
        setIsGraphPanning(true);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }

      if (tracker.hasDragged) {
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
      if (!tracker.isPanning) return;

      tracker.isPanning = false;
      if (tracker.hasDragged) {
        setIsGraphPanning(false);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";

        hasJustPannedRef.current = true;
        setTimeout(() => {
          hasJustPannedRef.current = false;
        }, 80);

        // Apply silky smooth momentum glide
        const scrollEl = gitGraphScrollRef.current;
        if (scrollEl && Math.abs(tracker.velocity) > 0.15) {
          let vel = tracker.velocity * 16;
          const momentumStep = () => {
            if (Math.abs(vel) < 0.4) {
              panMomentumIdRef.current = null;
              return;
            }
            if (gitGraphScrollRef.current) {
              gitGraphScrollRef.current.scrollLeft -= vel;
              vel *= 0.92; // smooth friction
              panMomentumIdRef.current = requestAnimationFrame(momentumStep);
            }
          };
          panMomentumIdRef.current = requestAnimationFrame(momentumStep);
        }
      } else {
        setIsGraphPanning(false);
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, []);

  const handleSelectMemberFilter = (authorName: string) => {
    if (authorName === "all" || authorName === memberFilter) {
      setMemberFilter("all");
      showToast(`Đã hiển thị toàn bộ commit (${commits.length} commits)`);
      return;
    }
    setMemberFilter(authorName);
    const authorCommits = commits.filter((c) => c.author.name === authorName);
    if (authorCommits.length > 0) {
      const latest = authorCommits[authorCommits.length - 1];
      setSelectedCommit(latest);
      if (gitGraphScrollRef.current && typeof latest.cx === "number") {
        const containerWidth = gitGraphScrollRef.current.clientWidth || 900;
        const targetScroll = Math.max(0, latest.cx - containerWidth / 2);
        gitGraphScrollRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
      }
      showToast(`Đang lọc ${authorCommits.length} commit của ${authorName}`);
    } else {
      showToast(`Không tìm thấy commit nào của ${authorName}`);
    }
  };

  const handleSelectBranchFilter = (branchName: string) => {
    if (branchName === "all" || branchName === branchFilter) {
      setBranchFilter("all");
      showToast(`Đã hiển thị toàn bộ các nhánh (${commits.length} commits)`);
      return;
    }
    setBranchFilter(branchName);
    const bLow = branchName.toLowerCase();
    const branchCommits = commits.filter((c) => {
      const cb = (c.branch || "").toLowerCase();
      return (
        cb === bLow ||
        (bLow === "pipeline" && (cb.includes("pipeline") || cb.includes("ci-cd"))) ||
        (bLow === "jwt" && (cb.includes("jwt") || cb.includes("auth"))) ||
        (bLow === "te9ca74" && (cb.includes("te9ca74") || cb.includes("ai-core"))) ||
        (bLow === "te9ca79" && (cb.includes("te9ca79") || cb.includes("sandbox"))) ||
        (bLow === "huy" && (cb.includes("huy") || cb.includes("client-portal"))) ||
        cb.includes(bLow)
      );
    });
    if (branchCommits.length > 0) {
      const latest = branchCommits[branchCommits.length - 1];
      setSelectedCommit(latest);
      if (gitGraphScrollRef.current && typeof latest.cx === "number") {
        const containerWidth = gitGraphScrollRef.current.clientWidth || 900;
        const targetScroll = Math.max(0, latest.cx - containerWidth / 2);
        gitGraphScrollRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
      }
      showToast(`Đang lọc ${branchCommits.length} commit nhánh ${branchName}`);
    }
  };

  const currentFlow = useMemo(() => {
    return dynamicFlows.find((f) => f.id === activeArchFlow) || dynamicFlows[0] || ARCH_FLOWS[0];
  }, [dynamicFlows, activeArchFlow]);

  // Compute display nodes with spring pop delay & flow filtering
  const displayNodes = useMemo(() => {
    const isFlowMode = activeArchFlow !== "all";
    const flowNodeSet = new Set(currentFlow.nodeIds);

    return archNodes.map((n) => {
      const animDelay = NODE_ANIM_DELAYS[n.id] ?? 0.4;
      if (n.type === "containerBox") {
        return {
          ...n,
          data: {
            ...n.data,
            isDimmed: isFlowMode,
          },
        };
      }

      const isSelected = n.id === selectedNodeId;
      const isFlowActive = isFlowMode && flowNodeSet.has(n.id);
      const isDimmed = isFlowMode && !flowNodeSet.has(n.id);

      return {
        ...n,
        data: {
          ...n.data,
          animDelay,
          isSelected,
          isFlowActive,
          isDimmed,
        },
      };
    });
  }, [archNodes, selectedNodeId, activeArchFlow, currentFlow]);

  // Compute display edges with branch-like animated pulses & flow highlights
  const displayEdges = useMemo(() => {
    const isFlowMode = activeArchFlow !== "all";
    const flowEdgeSet = new Set(currentFlow.edgeIds);

    return archEdges.map((edge) => {
      const isConnectedToSelected = edge.source === selectedNodeId || edge.target === selectedNodeId;

      if (isFlowMode) {
        const inFlow = flowEdgeSet.has(edge.id);
        return {
          ...edge,
          animated: inFlow,
          className: inFlow ? "arch-edge-active arch-edge-draw" : "arch-edge-dimmed arch-edge-draw",
          style: {
            ...edge.style,
            stroke: inFlow ? currentFlow.color : "#cbd5e1",
            strokeWidth: inFlow ? 3.5 : 1,
          },
        };
      }

      if (selectedNodeId && isConnectedToSelected) {
        return {
          ...edge,
          animated: true,
          className: "arch-edge-active arch-edge-draw",
          style: {
            ...edge.style,
            stroke: "#2563eb",
            strokeWidth: 3.5,
          },
        };
      }

      return {
        ...edge,
        animated: edge.animated || false,
        className: "arch-edge-draw",
      };
    });
  }, [archEdges, activeArchFlow, currentFlow, selectedNodeId]);

  const selectedNode = useMemo(() => {
    return (
      archNodes.find((n) => n.id === selectedNodeId) ??
      archNodes.find((n) => n.type !== "containerBox") ??
      archNodes[0]
    );
  }, [archNodes, selectedNodeId]);

  const archComponentCount = useMemo(
    () => archNodes.filter((n) => n.type !== "containerBox").length,
    [archNodes]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "containerBox") return;
    setSelectedNodeId(node.id);
    setArchDrawerOpen(true);
  }, []);

  const copyMermaidCode = () => {
    const sanitizeId = (raw: string) => raw.replace(/[^a-zA-Z0-9_]/g, "_");
    const escLabel = (raw: string) =>
      (raw || "").replace(/"/g, "'").replace(/\r?\n/g, " ");
    const containers = archNodes.filter((n) => n.type === "containerBox");
    const childNodes = archNodes.filter((n) => n.type !== "containerBox");
    const grouped = new Map<string, Node[]>();
    const standalone: Node[] = [];

    const labelToBoxId = new Map<string, string>();
    for (const box of containers) {
      const lbl = String(((box.data || {}) as Record<string, any>).label || "").trim().toLowerCase();
      if (lbl) labelToBoxId.set(lbl, box.id);
    }

    for (const n of childNodes) {
      const d = (n.data || {}) as Record<string, any>;
      const parentId =
        ((n as any).parentId as string | undefined) ||
        labelToBoxId.get(String(d.container || "").trim().toLowerCase());
      if (parentId) {
        const bucket = grouped.get(parentId) || [];
        bucket.push(n);
        grouped.set(parentId, bucket);
      } else {
        standalone.push(n);
      }
    }

    const lines: string[] = [
      "flowchart TD",
      `    %% ${escLabel(dynamicArchTitle)} (${repoSlug})`,
    ];

    for (const box of containers) {
      const bd = (box.data || {}) as Record<string, any>;
      const members = grouped.get(box.id) || [];
      if (members.length === 0) continue;
      lines.push(`    subgraph ${sanitizeId(box.id)} ["${escLabel(bd.label || box.id)}"]`);
      for (const n of members) {
        const d = (n.data || {}) as Record<string, any>;
        const sub = d.subLabel ? `\\n${escLabel(d.subLabel)}` : "";
        lines.push(`        ${sanitizeId(n.id)}["${escLabel(d.label || n.id)}${sub}"]`);
      }
      lines.push("    end");
    }

    for (const n of standalone) {
      const d = (n.data || {}) as Record<string, any>;
      const nid = sanitizeId(n.id);
      const lbl = escLabel(d.label || n.id);
      const sub = d.subLabel ? `\\n${escLabel(d.subLabel)}` : "";
      if (d.isCylinder) lines.push(`    ${nid}[("${lbl}${sub}")]`);
      else if (d.isCircle) lines.push(`    ${nid}(("${lbl}"))`);
      else lines.push(`    ${nid}["${lbl}${sub}"]`);
    }

    for (const e of archEdges) {
      const src = sanitizeId(e.source);
      const tgt = sanitizeId(e.target);
      const elbl = escLabel(String(e.label || ""));
      if (elbl) lines.push(`    ${src} -->|${elbl}| ${tgt}`);
      else lines.push(`    ${src} --> ${tgt}`);
    }

    const rawMermaid = lines.join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(rawMermaid);
      setCopiedMermaid(true);
      setTimeout(() => setCopiedMermaid(false), 2000);
    }
  };

  useMarloPageEntrance(
    gitHubRef,
    (el) => {
      const cards = el.querySelectorAll(".marlo-card");
      if (cards.length > 0) animateMarloCards(cards, { stagger: 0.05, y: 20 });
      const rows = el.querySelectorAll(".marlo-row");
      if (rows.length > 0) animateMarloRows(rows, { y: 10, stagger: 0.03, delay: 0.2 });
    },
    [viewMode, activeProjectId]
  );

  return (
    <div ref={gitHubRef} className="min-h-full p-4 lg:p-6 space-y-5 text-slate-900 dark:text-slate-100">
      {actionToast && (
        <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md flex items-center justify-between animate-fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            {actionToast}
          </span>
          <button onClick={() => setActionToast(null)} className="opacity-80 hover:opacity-100 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/90 dark:border-slate-800 pb-5 animate-cascade-1">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill pill--info font-mono text-[11px] font-bold">
              <Network size={13} />
              Phân hệ 3 • Git Project Hub & Kiến trúc
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
              {repoSlug} ({targetBranch})
            </span>
            <span
              className={`pill pill--plain font-mono text-[10.5px] font-bold flex items-center gap-1 ${
                webhookActive ? "pill--good" : "pill--warn"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  webhookActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              {webhookActive ? "Webhook Tự động" : "Webhook Tạm dừng"}
            </span>
            {isRepoFrozen && (
              <span className="pill pill--bad pill--plain font-mono text-[10.5px] font-bold flex items-center gap-1">
                <Lock size={11} />
                Đang đóng băng nhánh
              </span>
            )}
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Sơ đồ Kiến trúc Hệ thống & Git Project Hub
          </h1>
          <p className="mt-1 text-sm text-[#62656b] dark:text-[#a0a3a9] max-w-4xl">
            Cây phân nhánh Git Graph đồng bộ thời gian thực, CodeMind AI AST Reviewer 2 lớp, Sơ đồ Kiến trúc phân tầng & Thẩm định DoD SHA-256.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {projectsList.length > 0 && (
            <select
              aria-label="Chọn dự án GitHub"
              value={activeProjectId}
              onChange={(e) => {
                const nextId = e.target.value;
                setActiveProjectId(nextId);
                onSelectProject?.(nextId);
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </select>
          )}
          {onNavigate && (
            <>
              <button
                type="button"
                onClick={() => onNavigate("project-detail")}
                className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-1.5"
                title="Xem trang Chi tiết Đồ án hiện tại"
              >
                <FileText size={14} className="text-slate-600 dark:text-slate-300 shrink-0" />
                <span>Chi tiết Dự án</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("kanban")}
                className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-1.5"
                title="Chuyển sang Bảng Kanban của dự án"
              >
                <FolderKanban size={14} className="text-amber-500 shrink-0" />
                <span>Bảng Kanban</span>
              </button>
            </>
          )}
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-marlo-secondary btn--secondary magnetic flex items-center gap-1.5"
          >
            <FolderGit2 size={15} className="text-slate-600 dark:text-slate-300 shrink-0" />
            <span>Mở Repo GitHub</span>
          </a>
          {(isStudent || isAdmin) && (
            <button
              onClick={() => setShowRepoModal(true)}
              disabled={isStudent && isRepoFrozen}
              title={isStudent && isRepoFrozen ? "Repository đang bị đóng băng (Freeze)" : "Liên kết URL Repo, chọn nhánh chính & chiến lược Merge"}
              className="btn-marlo-primary btn--primary magnetic flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GitFork size={15} className="text-[#1c1304] shrink-0" />
              <span>Liên Kết & Đồng Bộ Repo</span>
            </button>
          )}
        </div>
      </header>

      {/* Role-Specific Control Banners */}
      {isInstructor && (
        <section className="marlo-card rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/25 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-blue-600 dark:text-blue-400" />
              Giảng viên • Thẩm định Mã nguồn, Duyệt PR & Đánh giá Chống Ăn Theo
            </div>
            <p className="text-xs text-blue-800/80 dark:text-blue-300/80">
              Bạn có thể phê duyệt DoD hoặc gửi yêu cầu chỉnh sửa trên từng Pull Request, theo dõi tỷ lệ đóng góp 50/30/20 và xuất báo cáo kiểm định.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportGitCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
            >
              <Download size={13} />
              <span>Xuất Báo Cáo Git (CSV)</span>
            </button>
            {onNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate("kanban")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <span>Bảng Kanban →</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("defense-room")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-blue-700 cursor-pointer"
                >
                  <span>Phòng Bảo vệ AI →</span>
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="marlo-card rounded-2xl border border-slate-300/90 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/50 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
              Quản trị viên • Kiểm toán Tuân thủ Git & Đóng băng Nhánh Nộp bài
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Kiểm soát trạng thái bảo vệ nhánh trước giờ bảo vệ đồ án. Khi bật Đóng băng, sinh viên chỉ được xem dữ liệu và không thể đẩy Commit hay Merge PR mới.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleRepoFreeze}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer shadow-2xs transition ${
                isRepoFrozen
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                  : "bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-700 text-white"
              }`}
            >
              {isRepoFrozen ? <Unlock size={13} /> : <Lock size={13} />}
              <span>{isRepoFrozen ? "Mở khóa Đóng băng Repo" : "Đóng băng Repo Nộp bài"}</span>
            </button>
            <button
              type="button"
              onClick={handleExportGitCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Download size={13} />
              <span>Xuất Nhật Ký Kiểm Toán (CSV)</span>
            </button>
          </div>
        </section>
      )}

      {isStudent && isRepoFrozen && (
        <section className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <Lock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Chế độ Đóng băng (Freeze):</strong> Quản trị viên đã khóa quyền ghi trên Repository dự án này để phục vụ bảo vệ đồ án. Các nút tạo Commit, PR, Đồng bộ và Merge tạm thời bị khóa.
          </span>
        </section>
      )}

      {/* 4 Metric Summary Cards with Staggered Cascade & Animated Numbers */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div key="metric-git-score" className="marlo-card rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Điểm Văn hóa Git</span>
            <ShieldCheck size={16} className="text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              <AnimatedNumber value={metricsState.gitCultureScore} decimals={1} key={`score-${statAnimKey}-${activeProjectId}`} />
            </span>
            <span className="pill pill--plain text-[10.5px] font-bold">
              {metricsState.gitCultureScore >= 90 ? "Hạng A+ (Chuẩn)" : "Đạt chuẩn"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {metricsState.taskLinkedPct}% commit gắn mã Task Kanban ({metricsState.totalCommits} commits).
          </p>
        </div>

        <div key="metric-ai-integrity" className="marlo-card rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Kiểm định Liêm chính AI</span>
            <CheckCircle2 size={16} className="text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              <AnimatedNumber value={metricsState.aiIntegrityPct} suffix="%" key={`integ-${statAnimKey}-${activeProjectId}`} />
            </span>
            <span className="pill pill--plain text-[10.5px] font-bold">
              {metricsState.aiIntegrityPct >= 90
                ? "Liêm chính cao"
                : metricsState.aiIntegrityPct >= 75
                ? "Cần lưu ý"
                : "Cảnh báo AST/AI"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Cadence Variance {metricsState.cadenceVarianceHours}h — theo dõi nhịp độ & cảnh báo AST.
          </p>
        </div>

        <div key="metric-team-split" className="marlo-card rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Phân bổ Nhóm ({memberAnalytics.length || 3} người)</span>
            <UserCheck size={16} className="text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {(metricsState.memberShares.length > 0 ? metricsState.memberShares : [36, 34, 30]).join(" : ")}
            </span>
            <span className="pill pill--plain text-[10.5px] font-bold">
              {metricsState.balanceStatus}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {memberAnalytics.length > 0
              ? memberAnalytics.map((m) => `${m.name} (${m.sharePct}%)`).join(", ")
              : "Chưa có dữ liệu thành viên."}
          </p>
        </div>

        <div key="metric-diagram" className="marlo-card rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Pull Requests & AST</span>
            <Boxes size={16} className="text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
              <AnimatedNumber value={pullRequests.length} key={`prs-${statAnimKey}-${activeProjectId}`} />
            </span>
            <span className="pill pill--plain text-[10.5px] font-bold">
              {metricsState.mergedPrsCount} Merged · {metricsState.openPrsCount} Mở
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Kiến trúc {archComponentCount} Components + Quét bảo mật AST 2 lớp.
          </p>
        </div>
      </section>

      {/* Main Mode Navigation Bar with Marlo Liquid Elastic Pill */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 shadow-sm overflow-x-auto animate-cascade-6">
        <MarloSegmentedControl
          value={viewMode}
          options={[
            { id: "topology", label: "Cây nhánh Git", icon: <Network size={15} /> },
            {
              id: "prs",
              label: "Pull Requests & AST",
              icon: <GitPullRequest size={15} />,
              badge: pullRequests.filter((p) => p.status !== "merged").length || undefined,
            },
            { id: "gitdiagram", label: "Sơ đồ Kiến trúc", icon: <Boxes size={15} /> },
            { id: "analytics", label: "Phân tích Đội ngũ", icon: <BarChart3 size={15} /> },
            { id: "gitflow", label: "Quy trình Git Flow", icon: <Layers size={15} /> },
          ]}
          onChange={(val) => handleSetViewMode(val as any)}
          tone="dark"
        />

        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pr-3 font-mono shrink-0">
          <button
            onClick={copyMermaidCode}
            className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-sans font-medium text-xs bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            {copiedMermaid ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copiedMermaid ? "Đã copy Mermaid.js" : "Sao chép mã Mermaid.js"}
          </button>
        </div>
      </div>

      {/* MODE 0: PULL REQUESTS & CODEMIND AI 2-TIER REVIEW */}
      {viewMode === "prs" && (
        <GitPrReviewPanel
          role={role}
          isFrozen={isRepoFrozen}
          members={memberAnalytics}
          pullRequests={pullRequests}
          selectedPr={selectedPr}
          onSelectPr={(pr) => {
            setActionError(null);
            setSelectedPr(pr);
          }}
          onOpenNewPrModal={() => setShowNewPrModal(true)}
          onAiFix={handleAiFixPr}
          onPeerApprove={handlePeerApprovePr}
          onRequestChanges={handleRequestChangesPr}
          onMerge={handleMergePr}
          onOpenDefenseRoom={onNavigate ? () => onNavigate("defense-room") : undefined}
          actionLoading={prActionLoading}
          actionError={actionError}
        />
      )}

      {/* MODE 1: THE REAL INTERACTIVE GITDIAGRAM CANVAS (FULL-WIDTH 100% EXPANSIVE VIEW) */}
      {viewMode === "gitdiagram" && (
        <div key={`mode-gitdiagram-${diagramAnimKey}`} className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5 space-y-4 flex flex-col relative animate-fade-in">
          {/* Top Dynamic Toolbar: Dynamic Project Title + MySQL Badge + Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Boxes size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {dynamicArchTitle}
                </h2>
                <span className="pill pill--good pill--plain text-[10px] font-mono font-bold flex items-center gap-1">
                  <Database size={11} className="text-emerald-500" />
                  MySQL 8.0: project_architectures
                </span>
                {archLastUpdated && (
                  <span className="text-[10px] text-slate-400 font-mono hidden xl:inline-block">
                    (Cập nhật: {archLastUpdated})
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Công nghệ:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{dynamicTechStack || "Fullstack Architecture"}</span>
                <span>• {archNodes.filter(n => n.type !== "containerBox").length} Components & {archEdges.length} Connections</span>
              </p>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {!isAdmin && (
                <>
                  <button
                    onClick={handleGenerateArchitecture}
                    disabled={isGeneratingArch || (isStudent && isRepoFrozen)}
                    title="AI quét mã nguồn Repo và tự động sinh sơ đồ kiến trúc phân tầng động"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-100/80 hover:bg-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-900/80 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-0 outline-none ring-0 shadow-none"
                  >
                    <Sparkles size={13} className={isGeneratingArch ? "animate-spin text-purple-600" : "text-purple-500"} />
                    {isGeneratingArch ? "AI đang quét..." : "AI Trích xuất Kiến trúc"}
                  </button>

                  <button
                    onClick={handleSaveArchitecture}
                    disabled={isSavingArch || (isStudent && isRepoFrozen)}
                    title="Lưu vị trí component và cấu hình sơ đồ vào CSDL MySQL"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-0 outline-none ring-0 shadow-none"
                  >
                    <Save size={13} className="text-slate-600 dark:text-slate-400" />
                    {isSavingArch ? "Đang lưu..." : "Lưu vào CSDL"}
                  </button>
                </>
              )}

              <button
                onClick={() => setDiagramAnimKey((k) => k + 1)}
                title="Kích hoạt lại animation pop-in"
                className="p-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
              >
                <RotateCw size={13} />
              </button>
            </div>
          </div>

          {/* ReactFlow Canvas Window */}
          <div className="w-full h-[760px] rounded-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden relative bg-slate-50/50 dark:bg-slate-950/70 shadow-inner">
            <ReactFlow
              key={`rf-canvas-${diagramAnimKey}-${activeArchFlow}`}
              nodes={displayNodes}
              edges={displayEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.2}
              maxZoom={1.6}
            >
              <Background color="#cbd5e1" className="dark:opacity-20" gap={20} size={1} />
              <Controls showInteractive={false} className="!bg-white dark:!bg-slate-800 !shadow-sm !border !border-slate-200 dark:!border-slate-700 dark:!text-slate-200" />
              <MiniMap
                nodeColor={(n) => {
                  if (n.type === "containerBox") return "#f1f5f9";
                  if (n.id === "user") return "#3b82f6";
                  if (n.id === "sqlite-db") return "#2563eb";
                  return "#64748b";
                }}
                className="!border !border-slate-200 dark:!border-slate-700 !rounded-lg dark:!bg-slate-800"
                zoomable
                pannable
              />
            </ReactFlow>

            {/* Watermark badge on canvas */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs text-xs font-mono text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sơ đồ Kiến trúc Động • {repoSlug}</span>
            </div>

            {/* Helper hint pill floating on bottom-right of canvas */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/80 dark:bg-slate-800/90 text-white backdrop-blur-xs px-3 py-1.5 rounded-lg text-xs font-medium shadow-md pointer-events-none">
              <Eye size={13} className="text-blue-400" />
              <span>Nhấp vào 1 component để xem mã nguồn & vấn đáp</span>
            </div>
          </div>

          {/* Interactive Architecture Flow Selector (Branch Filters - Placed below canvas) */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1 font-mono">
              <Network size={12} className="text-blue-600 dark:text-blue-400" />
              Mô phỏng luồng ({dynamicFlows.length}):
            </span>
            {dynamicFlows.map((flow) => {
              const isActive = activeArchFlow === flow.id;
              return (
                <button
                  key={flow.id}
                  onClick={() => {
                    setActiveArchFlow(flow.id);
                    setDiagramAnimKey((k) => k + 1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold ring-1 ring-slate-200 dark:ring-slate-600"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: flow.color }}
                  />
                  {flow.label}
                </button>
              );
            })}
          </div>

          {/* Active Flow Explanation Banner */}
          {activeArchFlow !== "all" && (
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs text-slate-800 dark:text-slate-200 animate-fade-in">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-blue-600 dark:text-blue-400 shrink-0 animate-pulse" />
                <span className="font-semibold">{currentFlow.label}:</span>
                <span className="text-slate-600 dark:text-slate-400">{currentFlow.summary}</span>
              </div>
              <button
                onClick={() => {
                  setActiveArchFlow("all");
                  setDiagramAnimKey((k) => k + 1);
                }}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline shrink-0 ml-3 cursor-pointer"
              >
                Xem tất cả luồng →
              </button>
            </div>
          )}

          {/* Bottom Subsystems Badges & Guide Bar */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 font-mono gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mr-1">Phân tầng:</span>
              {dynamicSubsystems.length > 0 ? (
                dynamicSubsystems.map((sub: any, idx: number) => (
                  <span
                    key={sub.id || idx}
                    className="pill pill--plain text-[10px] font-mono font-semibold"
                    style={{ color: sub.stroke || "#2563eb", borderColor: `${sub.stroke || "#2563eb"}40` }}
                  >
                    {sub.label || sub.title || sub.id}
                  </span>
                ))
              ) : (
                <>
                  <span className="pill pill--info pill--plain text-[10px] font-mono font-semibold">Client UI</span>
                  <span className="pill pill--good pill--plain text-[10px] font-mono font-semibold">Workspace</span>
                  <span className="pill pill--bad pill--plain text-[10px] font-mono font-semibold">API Gateway</span>
                  <span className="pill pill--warn pill--plain text-[10px] font-mono font-semibold">Persistence</span>
                </>
              )}
            </div>
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              github.com/{repoSlug}
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Slide-over Component Inspector Drawer */}
          {archDrawerOpen && selectedNode && (
            typeof document !== "undefined" ? (
              createPortal(
                <div className={`fixed inset-0 z-[9998] flex justify-end bg-slate-950/50 backdrop-blur-xs ${isArchDrawerClosing ? "marlo-scrim-out" : "marlo-scrim"}`}>
                  <div className="flex-1" onClick={handleCloseArchDrawer} />
                  <div className={`w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto p-6 space-y-5 relative ${isArchDrawerClosing ? "marlo-drawer-out" : "marlo-drawer"}`}>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border font-mono"
                          style={{
                            backgroundColor: `${(selectedNode.data as Record<string, string>).containerColor || "#2563eb"}15`,
                            borderColor: `${(selectedNode.data as Record<string, string>).containerColor || "#2563eb"}40`,
                            color: (selectedNode.data as Record<string, string>).containerColor || "#2563eb",
                          }}
                        >
                          {(selectedNode.data as Record<string, string>).container || "Component"}
                        </span>
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                          {(selectedNode.data as Record<string, string>).tech}
                        </span>
                      </div>

                      <button
                        onClick={handleCloseArchDrawer}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Đóng bảng điều khiển"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {(selectedNode.data as Record<string, string>).label} {(selectedNode.data as Record<string, string>).subLabel || ""}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {(selectedNode.data as Record<string, string>).description}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-xl space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                        Đường dẫn tệp tin mã nguồn:
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 truncate">
                          {(selectedNode.data as Record<string, string>).filePath}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText((selectedNode.data as Record<string, string>).filePath || "");
                            setDrawerToast("Đã sao chép đường dẫn file!");
                            setTimeout(() => setDrawerToast(null), 2000);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition shrink-0 cursor-pointer"
                          title="Sao chép đường dẫn file"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs bg-slate-50/70 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/70">
                      <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                        <span>Luồng gọi đến (Upstream):</span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          {(selectedNode.data as Record<string, string>).upstream}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                        <span>Luồng gọi đi (Downstream):</span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          {(selectedNode.data as Record<string, string>).downstream}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-400 text-[11px] uppercase tracking-wider font-mono">
                        <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                        Vấn Đáp Phản Biện (Understand Anything)
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-xs">
                        {(selectedNode.data as Record<string, string>).defenseQA}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <span>Mã Mermaid.js (Sao chép cho Báo cáo):</span>
                        <button
                          onClick={() => {
                            copyMermaidCode();
                            setDrawerToast("Đã sao chép mã Mermaid!");
                            setTimeout(() => setDrawerToast(null), 2000);
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <Copy size={12} />
                          {copiedMermaid ? "Đã copy!" : "Copy Mermaid"}
                        </button>
                      </div>
                      <div className="rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-[140px] leading-relaxed border border-slate-800 shadow-inner">
                        <pre>{`${selectedNode.id}["${(selectedNode.data as Record<string, string>).label}"]`}</pre>
                      </div>
                    </div>

                    {drawerToast && (
                      <div className="p-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg text-center animate-fade-in shadow-sm">
                        ✓ {drawerToast}
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )
            ) : null
          )}
        </div>
      )}

      {/* MODE 2: VISUAL GIT BRANCH GRAPH (TOPOLOGY & COMMIT INSPECTOR) */}
      {viewMode === "topology" && (
        <div key={`topo-${topoAnimKey}`} className="animate-screen-enter bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5 space-y-6">
          {/* Header & Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitBranch size={18} className="text-blue-600 dark:text-blue-400" />
                Cây Phân Nhánh Git & Giám Sát Commit Trực Quan (GitKraken / Git Graph)
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hệ thống tự động ghi nhận commit từ git push &amp; Webhook và liên kết mã Task Kanban. Rê chuột vào từng điểm commit để xem chi tiết.
                </p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-xs">✋</span>
                  <span>Kéo chuột ngang để lướt cây nhánh (như Kanban)</span>
                </span>
              </div>
            </div>

            {/* Member & Branch Filter Controls + Push Commit + Replay Animation */}
            <div className="flex flex-wrap items-center gap-2">
              {isStudent && (
                <button
                  onClick={() => setShowNewCommitModal(true)}
                  disabled={isRepoFrozen}
                  title={isRepoFrozen ? "Repository đang bị đóng băng (Freeze)" : "Ghi nhận Commit mới lên Git Graph"}
                  className="btn-marlo-primary btn--primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3 shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                  <span>Ghi nhận Commit (+10 XP)</span>
                </button>
              )}

              <button
                onClick={() => setTopoAnimKey((k) => k + 1)}
                title="Kích hoạt lại chuyển động vẽ nhánh Git"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
              >
                <RotateCw size={13} className="text-slate-600 dark:text-slate-400" />
                Phát Lại Chuyển Động
              </button>

              <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
                  <User size={12} />
                  Thành viên:
                </span>
                <button
                  onClick={() => handleSelectMemberFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition text-xs font-semibold cursor-pointer ${
                    memberFilter === "all"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Tất cả ({commits.length})
                </button>
                {uniqueAuthors.map((au, idx) => {
                  const activeCls =
                    idx % 3 === 0
                      ? "bg-blue-600 text-white shadow-xs"
                      : idx % 3 === 1
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-purple-600 text-white shadow-xs";
                  return (
                    <button
                      key={au.name}
                      onClick={() => handleSelectMemberFilter(au.name)}
                      className={`px-2.5 py-1 rounded-md transition text-xs font-semibold cursor-pointer ${
                        memberFilter === au.name
                          ? activeCls
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {au.name} ({au.count})
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium flex-wrap">
                <span className="text-[11px] text-slate-500 px-2 flex items-center gap-1">
                  <GitPullRequest size={12} />
                  Nhánh:
                </span>
                <button
                  onClick={() => handleSelectBranchFilter("all")}
                  className={`px-2 py-1 rounded-md transition text-xs font-semibold cursor-pointer ${
                    branchFilter === "all"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Tất cả ({commits.length})
                </button>
                {uniqueBranches.map((b) => {
                  const isActive = branchFilter === b.name;
                  return (
                    <button
                      key={b.name}
                      onClick={() => handleSelectBranchFilter(b.name)}
                      className={`px-2 py-1 rounded-md transition text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? "bg-white dark:bg-slate-900 shadow-xs font-bold"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      style={{ color: isActive ? b.color : undefined }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: b.color }}
                      />
                      <span>{b.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">({b.count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Filter Feedback Banner */}
          {(memberFilter !== "all" || branchFilter !== "all") && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/70 text-xs text-blue-950 dark:text-blue-100 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
                  <Filter size={13} />
                </span>
                <span className="font-medium">
                  Đang lọc:{" "}
                  {memberFilter !== "all" && (
                    <span className="font-bold text-blue-700 dark:text-blue-300">
                      Thành viên {memberFilter}
                    </span>
                  )}
                  {memberFilter !== "all" && branchFilter !== "all" && " • "}
                  {branchFilter !== "all" && (
                    <span className="font-bold text-blue-700 dark:text-blue-300">
                      Nhánh {branchFilter}
                    </span>
                  )}
                  <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                    (Hiển thị {filteredCommits.length} / {commits.length} commits)
                  </span>
                </span>
              </div>
              <button
                onClick={() => {
                  setMemberFilter("all");
                  setBranchFilter("all");
                  showToast(`Đã xóa bộ lọc, hiển thị toàn bộ ${commits.length} commit`);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 shadow-2xs transition cursor-pointer"
              >
                <X size={12} />
                Bỏ lọc ({commits.length} commits)
              </button>
            </div>
          )}

          {/* Interactive SVG Visual Git Graph with Floating Popover */}
          <div
            ref={gitGraphScrollRef}
            onPointerDown={handleGraphPointerDown}
            className={`relative overflow-x-auto p-4 bg-slate-50/70 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors select-none ${
              isGraphPanning ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <svg style={{ width: `${svgWidth}px`, height: "390px" }} viewBox={`0 0 ${svgWidth} 390`}>
              <style>{TOPO_SVG_STYLES}</style>

              {/* Dynamic Lane Guides & Branch Labels - Khớp 100% với Nhánh Thật của Repository */}
              {uniqueBranches.map((b) => (
                <g key={`branch-lane-${b.name}`}>
                  <line
                    x1="50"
                    y1={b.cy}
                    x2={svgWidth - 40}
                    y2={b.cy}
                    stroke="#cbd5e1"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x="10"
                    y={b.cy + 4}
                    fill={b.color}
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {b.name.length > 22 ? b.name.slice(0, 20) + "…" : b.name}
                  </text>
                </g>
              ))}

              {/* Main Trunk */}
              <path
                id="topo-main-path"
                className="topo-path-main"
                d={`M 50 45 L ${svgWidth - 40} 45`}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
              />
              {!showRepoModal && !showNewCommitModal && !showNewPrModal && !archDrawerOpen && (
                <g>
                  <circle r="8" fill="#38bdf8" opacity="0.28">
                    <animateMotion path={`M 50 45 L ${svgWidth - 40} 45`} dur="4.2s" repeatCount="indefinite" begin="0.3s" />
                  </circle>
                  <circle r="4.5" fill="#38bdf8">
                    <animateMotion path={`M 50 45 L ${svgWidth - 40} 45`} dur="4.2s" repeatCount="indefinite" begin="0.3s" />
                  </circle>
                </g>
              )}

              {/* Dynamic DAG Branch Split, Intra-Branch & Merge Curves */}
              {dynamicTopoEdges.map((edge) => (
                <path
                  key={edge.key}
                  d={edge.d}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth={edge.width || 2.8}
                  strokeDasharray={edge.dashed ? "5 3" : undefined}
                  opacity={(memberFilter !== "all" || branchFilter !== "all") ? 0.35 : 0.88}
                />
              ))}

              {/* Interactive Commit Dots */}
              {commits.map((c, idx) => {
                const isAnyFilterActive = memberFilter !== "all" || branchFilter !== "all";
                const isFiltered = filteredCommitIds.has(c.id);
                const isSelected = selectedCommit?.id === c.id;
                const isHovered = hoveredCommit?.id === c.id;

                return (
                  <g
                    key={c.id}
                    className="cursor-pointer transition-all duration-150"
                    opacity={isFiltered ? 1 : 0.12}
                    style={{
                      transformOrigin: `${c.cx}px ${c.cy}px`,
                      animation: `topoPopNode 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.05 + Math.min(idx * 0.04, 1.2)}s both`,
                    }}
                    onMouseEnter={() => {
                      if (!isGraphPanning) setHoveredCommit(c);
                    }}
                    onMouseLeave={() => setHoveredCommit(null)}
                    onClick={() => {
                      if (hasJustPannedRef.current) return;
                      setSelectedCommit(c);
                    }}
                  >
                    {/* Invisible generous hit-box for ultra-smooth hover */}
                    <circle
                      cx={c.cx}
                      cy={c.cy}
                      r={22}
                      fill="transparent"
                      className="cursor-pointer"
                      pointerEvents="all"
                    />

                    {/* Outer glowing halo when member or branch filter matches */}
                    {isAnyFilterActive && isFiltered && !isSelected && (
                      <circle
                        cx={c.cx}
                        cy={c.cy}
                        r={13}
                        fill="none"
                        stroke={c.branchColor}
                        strokeWidth={2}
                        opacity={0.65}
                        strokeDasharray="3 2"
                      />
                    )}

                    {/* Pulsing ring on hover or selected */}
                    {(isSelected || isHovered) && (
                      <circle
                        cx={c.cx}
                        cy={c.cy}
                        r={13}
                        fill="none"
                        stroke={c.branchColor}
                        strokeWidth={2.5}
                        opacity={0.6}
                        className="animate-pulse"
                      />
                    )}

                    {/* Outer Circle matching branch color */}
                    <circle
                      cx={c.cx}
                      cy={c.cy}
                      r={isSelected ? 9.5 : isHovered ? 9 : (isAnyFilterActive && isFiltered ? 8.5 : 7.5)}
                      fill={c.branchColor}
                      stroke="#ffffff"
                      strokeWidth={2.5}
                    />

                    {/* Inner core dot */}
                    <circle cx={c.cx} cy={c.cy} r={2.5} fill="#ffffff" />

                    {/* Crisp Short SHA Pill / Halo - hidden on non-matching commits when filtered so matching commits pop */}
                    {(!isAnyFilterActive || isFiltered) && (
                      <>
                        <rect
                          x={c.cx - 24}
                          y={idx % 2 === 0 ? c.cy - 24 : c.cy + 12}
                          width={48}
                          height={15}
                          rx={4}
                          fill="#ffffff"
                          opacity={0.94}
                          className="dark:fill-slate-900 pointer-events-none"
                        />
                        <text
                          x={c.cx}
                          y={idx % 2 === 0 ? c.cy - 13 : c.cy + 23}
                          textAnchor="middle"
                          fontSize={10}
                          fontFamily="monospace"
                          fontWeight={isSelected ? "bold" : "600"}
                          fill={isSelected ? "#0f172a" : "#475569"}
                          className="dark:fill-slate-200 dark:stroke-slate-900 pointer-events-none select-none"
                          paintOrder="stroke"
                          stroke="#ffffff"
                          strokeWidth={2}
                          strokeLinejoin="round"
                        >
                          {c.sha}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Interactive Floating Hover Popover Tooltip */}
            {hoveredCommit && !isGraphPanning && (() => {
              const popoverWidth = 320;
              const popoverLeft = Math.max(12, Math.min(hoveredCommit.cx - popoverWidth / 2, svgWidth - popoverWidth - 16));
              const isAbove = hoveredCommit.cy > 180;
              const popoverTop = isAbove ? Math.max(10, hoveredCommit.cy - 150) : hoveredCommit.cy + 20;
              const caretLeft = Math.max(16, Math.min(hoveredCommit.cx - popoverLeft - 6, popoverWidth - 28));

              return (
                <div
                  key={`commit-popover-${hoveredCommit.id}`}
                  className="absolute z-50 pointer-events-none bg-slate-950/95 dark:bg-slate-900/98 text-white backdrop-blur-md p-3.5 rounded-xl shadow-2xl border border-slate-700 w-[320px] text-xs space-y-2.5 ring-1 ring-white/10 transition-all duration-75"
                  style={{
                    left: `${popoverLeft}px`,
                    top: `${popoverTop}px`,
                  }}
                >
                  {/* Pointer caret arrow pointing up or down to the commit node */}
                  {isAbove ? (
                    <div
                      className="absolute -bottom-1.5 w-3 h-3 bg-slate-950 dark:bg-slate-900 border-b border-r border-slate-700 rotate-45 pointer-events-none"
                      style={{ left: `${caretLeft}px` }}
                    />
                  ) : (
                    <div
                      className="absolute -top-1.5 w-3 h-3 bg-slate-950 dark:bg-slate-900 border-t border-l border-slate-700 rotate-45 pointer-events-none"
                      style={{ left: `${caretLeft}px` }}
                    />
                  )}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: hoveredCommit.author.color }}
                      >
                        {hoveredCommit.author.avatar}
                      </span>
                      <div>
                        <div className="font-bold text-slate-100 leading-tight">{hoveredCommit.author.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{hoveredCommit.author.role}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                      {hoveredCommit.sha}
                    </span>
                  </div>

                  <p className="text-slate-200 text-xs font-medium leading-relaxed">
                    {hoveredCommit.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80 font-mono">
                    <span
                      className="px-2 py-0.5 rounded text-white font-semibold text-[9.5px]"
                      style={{ backgroundColor: hoveredCommit.branchColor }}
                    >
                      {hoveredCommit.branch}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      +{hoveredCommit.stats.additions} / -{hoveredCommit.stats.deletions} ({hoveredCommit.stats.files} tệp)
                    </span>
                    <span>{hoveredCommit.timeAgo}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Selected Commit Detail Inspector Card */}
          {selectedCommit && (
            <div key={`commit-card-${selectedCommit.id}`} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0"
                    style={{ backgroundColor: selectedCommit.author.color }}
                  >
                    {selectedCommit.author.avatar}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedCommit.author.name}</span>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {selectedCommit.author.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                      <span>{selectedCommit.date}</span>
                      <span>•</span>
                      <span>{selectedCommit.timeAgo}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-mono font-bold text-white px-2.5 py-1 rounded-md"
                    style={{ backgroundColor: selectedCommit.branchColor }}
                  >
                    {selectedCommit.branch}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                    commit {selectedCommit.sha}
                  </span>
                </div>
              </div>

              <div className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                {selectedCommit.message}
              </div>

              {/* Modified Files Breakdown */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-500 dark:text-slate-400" />
                    Các tệp tin mã nguồn được chỉnh sửa ({selectedCommit.filesChanged.length} tệp):
                  </span>
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    +{selectedCommit.stats.additions} dòng / -{selectedCommit.stats.deletions} dòng
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  {selectedCommit.filesChanged.map((file: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                      <GitCommit size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">{file}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Commit History Timeline Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-600 dark:text-slate-400" />
                {memberFilter !== "all" ? (
                  <span>
                    Nhật Ký Commit của <span className="text-blue-600 dark:text-blue-400 font-bold">{memberFilter}</span>{" "}
                    <span className="text-xs font-normal text-slate-500">({filteredCommits.length} commits)</span>
                  </span>
                ) : branchFilter !== "all" ? (
                  <span>
                    Nhật Ký Commit nhánh <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{branchFilter}</span>{" "}
                    <span className="text-xs font-normal text-slate-500">({filteredCommits.length} commits)</span>
                  </span>
                ) : (
                  <span>Nhật Ký Commit Theo Dòng Thời Gian ({commits.length} commits)</span>
                )}
              </div>
              {(memberFilter !== "all" || branchFilter !== "all") && (
                <button
                  onClick={() => {
                    setMemberFilter("all");
                    setBranchFilter("all");
                    showToast(`Đã xóa bộ lọc, hiển thị toàn bộ ${commits.length} commit`);
                  }}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Xem tất cả ({commits.length})
                </button>
              )}
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
              {filteredCommits.map((c, cIdx) => {
                const isSelected = selectedCommit?.id === c.id;
                return (
                  <div
                    key={c.id}
                    style={{ animationDelay: `${0.05 + Math.min(cIdx, 8) * 0.04}s` }}
                    onClick={() => {
                      setSelectedCommit(c);
                      if (gitGraphScrollRef.current && typeof c.cx === "number") {
                        const containerWidth = gitGraphScrollRef.current.clientWidth || 900;
                        const targetScroll = Math.max(0, c.cx - containerWidth / 2);
                        gitGraphScrollRef.current.scrollTo({ left: targetScroll, behavior: "smooth" });
                      }
                    }}
                    className={`animate-cascade-item p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/70 dark:bg-blue-950/35 border-l-4 border-l-blue-600 dark:border-l-blue-400"
                        : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                        {c.sha}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[380px]">{c.message}</span>
                      <span
                        className="font-mono text-[10px] text-white px-2 py-0.5 rounded font-semibold shrink-0"
                        style={{ backgroundColor: c.branchColor }}
                      >
                        {c.branch}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-mono shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8.5px] text-white"
                          style={{ backgroundColor: c.author.color }}
                        >
                          {c.author.avatar}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300">{c.author.name}</span>
                      </div>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{c.stats.additions} / -{c.stats.deletions}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500 text-[11px]">{c.timeAgo}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: MEMBER CONTRIBUTION ANALYTICS */}
      {viewMode === "analytics" && (
        <div key={`mode-analytics-${statAnimKey}-${activeProjectId}`} className="animate-screen-enter bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5 space-y-6">
          {/* Header Title & Subtitle */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 animate-box-stagger-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600 dark:text-blue-400" />
              Thống kê Đóng góp Nhóm & Tính Liêm chính Mã Nguồn (Anti-Freerider 50/30/20)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tính toán tự động từ CSDL MySQL: 50% Story Points hoàn thành + 30% Commit/PR + 20% DoD Review của {memberAnalytics.length || 3} thành viên.
            </p>
          </div>

          {/* Dynamic Member Contribution Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {memberAnalytics.map((m, idx) => (
              <div
                key={m.name}
                className={`p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 shadow-xs hover:shadow-md transition-all hover:bg-white dark:hover:bg-slate-800/70 animate-box-stagger-${Math.min(idx + 2, 5)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {m.name}
                    </span>
                    <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      {m.role} • Hạng {m.grade}
                    </span>
                  </div>
                  <span className={`pill ${m.pillClass} pill--plain text-xs font-bold font-mono`}>
                    <OdometerNumber value={m.sharePct} suffix="%" />
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`${m.barClass} h-full rounded-full animate-bar-grow`}
                    style={{ width: `${m.sharePct}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 font-mono">
                  <div>
                    Commits: <span className="font-bold text-slate-700 dark:text-slate-200"><OdometerNumber value={m.commitsCount} /></span> commits • SP Done: <span className="font-bold text-blue-600 dark:text-blue-400">{m.storyPointsDone} SP</span>
                  </div>
                  <div>
                    Thêm dòng: <span className="font-bold text-emerald-600 dark:text-emerald-400">+<OdometerNumber value={m.additions} /></span> / -{m.deletions} dòng
                  </div>
                  <div className="truncate font-sans">Nhiệm vụ: {m.tasksSummary}</div>
                </div>
              </div>
            ))}
          </div>

          {/* AI Anti-Cheating Banner */}
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 space-y-2 animate-box-stagger-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-sm">
                <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span>Báo cáo Xác thực Liêm chính & Chống Gian lận AI (AI Anti-Cheating)</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-slate-200 dark:border-slate-800 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                NHỊP ĐỘ HỢP LỆ
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Toàn bộ <span className="font-bold font-mono text-slate-900 dark:text-white"><OdometerNumber value={metricsState.totalCommits} /></span> commit trong repo đều có khoảng thời gian ngắt quãng tự nhiên (Cadence Variance: <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400"><AnimatedNumber value={metricsState.cadenceVarianceHours} decimals={1} suffix="h" key={`cv-${statAnimKey}-${activeProjectId}`} /></span>), không có hiện tượng nạp hàng loạt file mã nguồn trong 1 giây (Bulk AI Dump). Tỷ lệ commit kèm mã task Kanban đạt <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400"><AnimatedNumber value={metricsState.taskLinkedPct} suffix="%" key={`cr-${statAnimKey}-${activeProjectId}`} /></span>.
            </p>
          </div>
        </div>
      )}

      {/* MODE 4: GIT FLOW & REPO SUBMISSION STANDARDS */}
      {viewMode === "gitflow" && (
        <div key="mode-gitflow" className="animate-screen-enter bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 space-y-8">
          {/* Header Title */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Layers size={20} />
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Quy Chuẩn Chu Trình Vận Hành Git Flow & Thẩm Định Nộp Bài
                </h2>
              </div>
              <p className="text-xs text-[#62656b] dark:text-[#a0a3a9] mt-1 max-w-3xl leading-relaxed">
                Chu trình 6 bước khép kín từ nhận task Kanban, tách nhánh chuẩn hóa, commit có mã task, kiểm thử sandbox tự động, quy trình Review 2 lớp (AI Bot + Peer Review), chiến lược Merge phù hợp, đến nghiệm thu thẩm định liêm chính.
              </p>
            </div>
          </div>

          {/* SƠ ĐỒ ĐƯỜNG NHÁNH METRO GIT FLOW ĐỘNG */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-slate-700 dark:text-slate-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Sơ Đồ Phân Nhánh Metro Git Flow (Branch Lifecycle)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">
                Mô hình nhánh hiện tại ({repoSlug || "hoaba-clouch/e-learningproject"})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {uniqueBranches.slice(0, 4).map((b, bIdx) => {
                const isMain = b.name === "main" || b.name === "master";
                const isDevelop = b.name === "develop" || b.name.includes("pipeline");
                const tagLabel = isMain
                  ? "BẢO VỆ"
                  : isDevelop
                  ? "TÍCH HỢP"
                  : bIdx % 2 === 0
                  ? "TÍNH NĂNG"
                  : "HOẠT ĐỘNG";
                const desc = isMain
                  ? "Nhánh phát hành & bảo vệ đồ án chính thức. Chỉ tiếp nhận PR đã vượt qua 2 lớp Review & AST."
                  : isDevelop
                  ? "Trục tích hợp các nhánh tính năng, chạy kiểm thử tự động CI/CD trước khi chốt bản phát hành."
                  : `Nhánh phát triển tính năng (${b.count} commits đã ghi nhận), tự động ánh xạ sang cây Metro Git Graph.`;

                return (
                  <div
                    key={b.name}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 space-y-2 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                        <span className="truncate font-mono">{b.name}</span>
                      </span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                        {tagLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHI TIẾT 6 BƯỚC KHÉP KÍN TOÀN DIỆN */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Quy Trình 6 Bước Thực Thi Chi Tiết (Actionable SOP)
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Tuân thủ nghiêm ngặt chuẩn DoD (Definition of Done)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Bước 1 */}
              <div
                className="marlo-card marlo-item-interactive p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-2xs hover:shadow-md transition-all duration-300 space-y-3 flex flex-col justify-between"
                style={{ animationDelay: "0.14s" }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                      1
                    </span>
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-700 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                      Lập kế hoạch & Khóa H2
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Nhận Task & Thẩm Định Tiên Quyết H2
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Sinh viên nhận task trên Kanban. Kiểm tra <strong className="text-slate-800 dark:text-white">Ràng buộc Tiên quyết H2</strong>: Task cha phụ thuộc phải đạt trạng thái <strong className="text-emerald-600 dark:text-emerald-400">Hoàn thành</strong> hoặc <strong className="text-emerald-600 dark:text-emerald-400">Đã nghiệm thu</strong> trước khi Task con chuyển sang <strong className="text-blue-600 dark:text-blue-400">Hoàn thành</strong> và trước khi Merge PR tự động đóng thẻ.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold">Quy tắc bắt buộc:</div>
                  <div className="text-slate-600 dark:text-slate-300">
                    • Ghi nhận đúng mã Task ID duy nhất (Ví dụ: <span className="font-bold text-blue-600 dark:text-blue-400">#{projectTasks[0]?.code || "TE35D77"}</span>).
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">• Không nhận cùng lúc quá 2 task đang làm.</div>
                </div>
              </div>

              {/* Bước 2 */}
              <div
                className="marlo-card marlo-item-interactive p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-2xs hover:shadow-md transition-all duration-300 space-y-3 flex flex-col justify-between"
                style={{ animationDelay: "0.19s" }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                      2
                    </span>
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-400 border border-slate-200 dark:border-slate-700">
                      Tách nhánh
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tách Nhánh Feature Từ {targetBranch || "develop"}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Cập nhật code mới nhất từ <code className="text-blue-600 dark:text-blue-400 font-mono">{targetBranch || "develop"}</code> rồi tách nhánh làm việc cá nhân. Tên nhánh chứa mã Task ID để hệ thống tự liên kết thẻ Kanban.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 dark:bg-slate-950 text-[11px] font-mono text-slate-200 space-y-1 overflow-x-auto shadow-inner border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Lệnh Terminal mẫu:</div>
                  <div className="text-emerald-400 font-semibold">$ git checkout {targetBranch || "develop"}</div>
                  <div className="text-emerald-400 font-semibold">$ git pull origin {targetBranch || "develop"}</div>
                  <div className="text-amber-300 font-semibold">$ git checkout -b feature/{projectTasks[0]?.code || "TE35D77"}_module</div>
                </div>
              </div>

              {/* Bước 3 */}
              <div
                className="marlo-card marlo-item-interactive p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-2xs hover:shadow-md transition-all duration-300 space-y-3 flex flex-col justify-between"
                style={{ animationDelay: "0.24s" }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                      3
                    </span>
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-slate-200 dark:border-slate-700">
                      Chuẩn Commit
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Lập Trình & Commit Kèm Mã Task
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Tuân thủ quy chuẩn <strong className="text-slate-800 dark:text-white">Conventional Commits</strong>. Mỗi commit mang tiền tố rõ ràng (<code className="text-slate-700 dark:text-blue-300">feat</code>, <code className="text-slate-700 dark:text-blue-300">fix</code>, <code className="text-slate-700 dark:text-blue-300">test</code>) kèm mã task để tích lũy lịch sử.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 dark:bg-slate-950 text-[11px] font-mono text-slate-200 space-y-1 overflow-x-auto shadow-inner border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Cú pháp Commit mẫu:</div>
                  <div className="text-emerald-400 font-semibold">$ git add .</div>
                  <div className="text-amber-300 font-semibold">$ git commit -m "feat(#{projectTasks[0]?.code || "TE35D77"}): implement module"</div>
                  <div className="text-slate-400 text-[10px] mt-1">• Nhịp độ tự nhiên (Variance ~{metricsState.cadenceVarianceHours}h)</div>
                </div>
              </div>

              {/* Bước 4 */}
              <div
                className="marlo-card marlo-item-interactive p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-2xs hover:shadow-md transition-all duration-300 space-y-3 flex flex-col justify-between"
                style={{ animationDelay: "0.29s" }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                      4
                    </span>
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
                      CI & Kiểm thử
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Kiểm Thử Nội Bộ & Docker Sandbox
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Chạy toàn bộ unit test local và kiểm thử trên môi trường Docker Sandbox. Hệ thống kiểm tra test cases ẩn đảm bảo không rò rỉ bộ nhớ, timeout hay crash trước khi mở PR.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 dark:bg-slate-950 text-[11px] font-mono text-slate-200 space-y-1 overflow-x-auto shadow-inner border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Lệnh Push nhánh lên GitHub:</div>
                  <div className="text-emerald-400 font-semibold">$ npm test (hoặc pytest tests/)</div>
                  <div className="text-amber-300 font-semibold">$ git push -u origin feature/{projectTasks[0]?.code || "TE35D77"}_module</div>
                  <div className="text-slate-400 text-[10px]">• Tiêu chí: Memory &lt;= 128MB, TLE &lt; 2.0s</div>
                </div>
              </div>

              {/* Bước 5 */}
              <div
                className="marlo-card marlo-item-interactive p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 shadow-xs hover:shadow-md transition-all duration-300 space-y-3 flex flex-col justify-between"
                style={{ animationDelay: "0.34s" }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                      5
                    </span>
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-slate-200 dark:border-slate-700">
                      Review 2 Lớp & Merge
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Mở Pull Request, Review 2 Lớp & Merge
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Mở PR từ nhánh feature vào <code className="text-blue-600 dark:text-blue-400 font-mono font-bold">{targetBranch || "develop"}</code>. Kích hoạt chu trình duyệt mã 2 tầng bảo mật nghiêm ngặt trước khi hợp nhất.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 space-y-1.5 shadow-2xs">
                  <div className="text-blue-900 dark:text-blue-400 font-bold text-[10px] uppercase">Quy trình Review & Merge chi tiết:</div>
                  <div className="text-slate-600 dark:text-slate-400">
                    • <strong className="text-slate-800 dark:text-slate-200">Lớp 1 (CodeMind AI Bot):</strong> Tự động quét CVE lỗ hổng, AST complexity, AST blast radius.
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    • <strong className="text-slate-800 dark:text-slate-200">Lớp 2 (Peer Review chéo):</strong> Tối thiểu 1 thành viên khác ({memberAnalytics.length > 0 ? memberAnalytics.map((m) => m.name.split(" ").slice(-1)[0]).join(" / ") : "Thành viên nhóm"}) hoặc Giảng viên duyệt diff và Approve.
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    • <strong className="text-purple-700 dark:text-purple-400 font-bold">Chiến lược Merge:</strong> Khuyến nghị <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-1 rounded font-bold">Squash and Merge</span> giữ lịch sử sạch.
                  </div>
                </div>
              </div>

              {/* Bước 6 */}
              <div
                className="marlo-card marlo-item-interactive p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 shadow-xs hover:shadow-md transition-all duration-300 space-y-3 flex flex-col justify-between"
                style={{ animationDelay: "0.39s" }}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                      6
                    </span>
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-slate-200 dark:border-slate-700">
                      Nghiệm thu & DoD
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Nộp Bài, Thẩm Định Liêm Chính & Vấn Đáp AI
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Merge PR trên CodeMind Campus để đối chiếu commit cadence, băm con dấu SHA-256 DoD và đồng bộ hồ sơ sang Phòng Bảo vệ & Chấm Kép của Giảng viên.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-emerald-950 dark:text-emerald-300 space-y-1.5 shadow-2xs">
                  <div className="text-emerald-900 dark:text-emerald-400 font-bold text-[10px] uppercase">Kết quả thẩm định:</div>
                  <div className="text-emerald-800 dark:text-emerald-400 font-bold">✓ Đóng dấu [ ĐÃ NGHIỆM THU - DoD 100% ]</div>
                  <div className="text-slate-600 dark:text-slate-400">• Tự động cộng Story Points vào Sprint Burndown.</div>
                  <div className="text-slate-600 dark:text-slate-400">• Tự sinh câu hỏi vấn đáp phản biện từ Diff PR.</div>
                  <button
                    onClick={() => handleSetViewMode("prs")}
                    className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <GitPullRequest size={13} />
                    <span>Mở Trình Duyệt PR & Thẩm Định DoD Ngay</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BẢNG SO SÁNH CHIẾN LƯỢC MERGE & GIẢI QUYẾT XUNG ĐỘT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
            {/* Cột trái: So sánh Chiến lược Merge */}
            <div
              className="marlo-card lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 bg-slate-50/40 dark:bg-slate-800/30"
              style={{ animationDelay: "0.43s" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitCommit size={16} className="text-purple-600 dark:text-purple-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                    Ma Trận Lựa Chọn Chiến Lược Merge
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full font-mono">
                  KHUYÊN DÙNG
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Option 1 */}
                <div
                  className="marlo-row marlo-item-interactive p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-1.5 hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-200"
                  style={{ animationDelay: "0.46s" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      1. Squash and Merge (Chuẩn đồ án Sprint)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                      ƯU TIÊN SỐ 1
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Gộp toàn bộ commit thử nghiệm trên nhánh feature thành <strong className="dark:text-white">đúng 1 commit duy nhất</strong> khi merge vào <code className="text-blue-600 dark:text-blue-400 font-mono">develop</code>. Lịch sử Git gọn gàng và dễ rollback.
                  </p>
                </div>

                {/* Option 2 */}
                <div
                  className="marlo-row marlo-item-interactive p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200"
                  style={{ animationDelay: "0.49s" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      2. Rebase and Merge (Lịch sử tuyến tính)
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Tùy chọn</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Dời gốc commit của feature lên đầu nhánh develop, tạo lịch sử thẳng hàng. Phù hợp với những PR lớn có nhiều commit logic độc lập.
                  </p>
                </div>

                {/* Option 3 */}
                <div
                  className="marlo-row marlo-item-interactive p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1 hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-200"
                  style={{ animationDelay: "0.52s" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      3. Merge Commit (--no-ff)
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Dùng cho Release</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Tạo 1 commit merge chuyên biệt giữ nguyên cấu trúc phân nhánh. Thường dùng khi chốt Sprint đóng gói từ <code className="text-blue-600 dark:text-blue-400 font-mono">develop</code> vào <code className="text-purple-600 dark:text-purple-400 font-mono">main</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* Cột phải: Hướng dẫn Xử lý Merge Conflict */}
            <div
              className="marlo-card lg:col-span-5 rounded-2xl border border-slate-700/60 p-5 space-y-3 bg-slate-900 text-white shadow-md flex flex-col justify-between"
              style={{ animationDelay: "0.47s" }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                    Quy Trình Xử Lý Xung Đột (Merge Conflict)
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Khi 2 thành viên cùng sửa chung 1 file và PR báo xung đột (<strong className="text-rose-400">Can't automatically merge</strong>), sinh viên xử lý tại local theo 4 bước chuẩn:
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-2 text-slate-300">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Các bước thực hiện Terminal:</div>
                <div><span className="text-slate-500"># 1. Đứng tại nhánh feature cá nhân</span><br /><span className="text-emerald-400 font-semibold">$ git checkout feature/TE35D77_module</span></div>
                <div><span className="text-slate-500"># 2. Kéo code develop mới nhất về trộn</span><br /><span className="text-amber-300 font-semibold">$ git pull origin develop</span></div>
                <div><span className="text-slate-500"># 3. Mở VS Code chọn Accept Current / Incoming</span><br /><span className="text-emerald-400 font-semibold">$ git add . && git commit -m "chore: resolve conflicts"</span></div>
                <div><span className="text-slate-500"># 4. Đẩy ngược lại lên PR</span><br /><span className="text-emerald-400 font-semibold">$ git push origin feature/TE35D77_module</span></div>
              </div>

              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5 pt-1 border-t border-slate-800">
                <CheckCheck size={13} />
                <span>Tuyệt đối không force push (-f) lên nhánh dùng chung.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cấu hình & Đồng Bộ GitHub Repo (Isolated Draft State) */}
      <GitRepoConfigModal
        isOpen={showRepoModal}
        isClosing={isRepoModalClosing}
        initialRepoUrl={repoUrl}
        initialTargetBranch={targetBranch}
        initialMergeStrategy={mergeStrategy}
        lastSyncedAt={lastSyncedAt}
        isSyncingLive={isSyncingLive}
        onClose={handleCloseRepoModal}
        onSave={handleSaveRepoSync}
      />

      <GitNewCommitModal
        isOpen={showNewCommitModal}
        onClose={() => setShowNewCommitModal(false)}
        onSubmit={handlePushNewCommit}
        members={memberAnalytics}
        tasks={projectTasks}
        existingBranches={uniqueBranches.map((b) => b.name)}
      />

      <GitNewPrModal
        isOpen={showNewPrModal}
        onClose={() => setShowNewPrModal(false)}
        onSubmit={handleCreateNewPr}
        tasks={projectTasks}
        defaultTargetBranch={targetBranch}
        existingBranches={uniqueBranches.map((b) => b.name)}
      />
    </div>
  );
}
