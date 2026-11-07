import { useState, useMemo, useCallback, useEffect } from "react";
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
  RotateCw,
  AlertTriangle,
  ArrowRight,
  Eye,
  Activity,
  Database,
  Zap,
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
    bgColor: string;
    borderColor: string;
    textColor: string;
    isDimmed?: boolean;
  };
  return (
    <div
      style={{
        width: c.width,
        height: c.height,
        animation: "archContainerFade 0.6s ease-out both",
      }}
      className={`rounded-3xl border-2 pointer-events-none select-none p-4 relative shadow-xs transition-all duration-300 ${c.bgColor} ${c.borderColor} ${
        c.isDimmed ? "opacity-35" : "opacity-100"
      }`}
    >
      <div className={`absolute top-3 right-5 text-sm font-bold font-mono tracking-wider ${c.textColor}`}>
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
            : "border-blue-400 bg-blue-50 text-blue-900 hover:border-blue-500 hover:scale-105"
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
            : "border-blue-500 bg-blue-50/90 text-blue-950 hover:bg-blue-100 hover:scale-[1.02]"
        }`}
      >
        <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-blue-600 !border-white" />
        <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-blue-600 !border-white" />
        <Handle type="target" position={Position.Right} className="!w-2.5 !h-2.5 !bg-blue-600 !border-white" />
        <div className="flex items-center justify-center gap-1.5">
          <Database size={14} className={nodeData.isSelected || nodeData.isFlowActive ? "text-blue-100 animate-pulse" : "text-blue-600"} />
          <div className="text-xs font-bold leading-tight">{nodeData.label}</div>
        </div>
        <div className={`text-[10px] font-mono mt-0.5 ${nodeData.isSelected || nodeData.isFlowActive ? "text-blue-100" : "text-blue-700 font-semibold"}`}>
          {nodeData.subLabel}
        </div>
        <div className={`text-[9px] mt-1 font-mono ${nodeData.isSelected || nodeData.isFlowActive ? "text-blue-200" : "text-slate-500"}`}>
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
      className={`relative w-[175px] rounded-xl border-2 p-2.5 shadow-sm transition-all duration-300 cursor-pointer bg-white ${
        nodeData.isDimmed ? "opacity-25 grayscale scale-95" : "opacity-100"
      } ${
        nodeData.isSelected
          ? "border-blue-600 ring-4 ring-blue-500/25 shadow-lg scale-[1.04] z-20"
          : nodeData.isFlowActive
          ? "border-emerald-500 ring-4 ring-emerald-500/20 shadow-md scale-[1.02] z-10"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md hover:scale-[1.02]"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-400 !border-white" />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-slate-400 !border-white" />

      <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
        <span
          className="text-[8.5px] font-bold px-1.5 py-0.2 rounded font-mono uppercase tracking-wider"
          style={{
            backgroundColor: `${nodeData.containerColor}15`,
            color: nodeData.containerColor,
          }}
        >
          {nodeData.container}
        </span>
        <span className="text-[9px] font-mono text-slate-400">{nodeData.tech}</span>
      </div>

      <div className="mt-1.5 space-y-0.5">
        <h4 className="text-[11px] font-bold text-slate-900 leading-tight truncate">
          {nodeData.label}
        </h4>
        {nodeData.subLabel && (
          <p className="text-[9.5px] font-mono text-blue-700 font-medium truncate">
            {nodeData.subLabel}
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[8.5px] text-slate-400 pt-1 border-t border-slate-100">
        <span className="truncate">{nodeData.badge}</span>
        <span className="text-blue-600 font-bold hover:underline shrink-0">Chi tiết →</span>
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
      description: "Bảng quản lý 72 tasks 4 Sprints, khóa phụ thuộc task cha-con và tính điểm chuẩn Thầy Phước.",
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
      description: "Trình import/export dữ liệu task chuẩn 8 cột theo mẫu file Excel của Thầy Phước.",
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
      defenseQA: "Tại sao dùng datetime.now(timezone.utc)? Đáp: Chuẩn H4 Thầy Phước, tránh lỗi naive datetime lệch giờ.",
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
      defenseQA: "Dữ liệu analytics phục vụ điều gì? Đáp: Cung cấp bằng chứng học tập cho Thầy Phước.",
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
  branch: "main" | "develop" | "feature/erd" | "feature/auth" | "feature/evaluator";
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
    timeAgo: "7 ngày trước",
    stats: { additions: 240, deletions: 0, files: 3 },
    filesChanged: ["backend/app/main.py", "docker-compose.yml", "README.md"],
    cx: 80,
    cy: 45,
  },
  {
    id: "c-2",
    sha: "14b98c2",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "H", color: "#2563eb" },
    branch: "develop",
    branchLabel: "develop",
    branchColor: "#9333ea",
    message: "TE9CA72: Tách nhánh develop từ main, cấu hình CI/CD và môi trường staging",
    date: "29/10/2026 10:30",
    timeAgo: "6 ngày trước",
    stats: { additions: 110, deletions: 5, files: 2 },
    filesChanged: [".github/workflows/ci.yml", "package.json"],
    cx: 200,
    cy: 110,
  },
  {
    id: "c-3",
    sha: "b579f87",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "H", color: "#2563eb" },
    branch: "feature/erd",
    branchLabel: "feature/erd",
    branchColor: "#16a34a",
    message: "TE14F82: Thiết kế ERD 8 bảng quan hệ 3NF và SQLAlchemy migration models",
    date: "31/10/2026 14:20",
    timeAgo: "4 ngày trước",
    stats: { additions: 342, deletions: 12, files: 4 },
    filesChanged: [
      "backend/app/models/user.py",
      "backend/app/models/course.py",
      "backend/app/models/submission.py",
      "backend/app/core/database.py",
    ],
    cx: 320,
    cy: 175,
  },
  {
    id: "c-4",
    sha: "c8e41a9",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "H", color: "#2563eb" },
    branch: "develop",
    branchLabel: "develop",
    branchColor: "#9333ea",
    message: "TE14F82: Merge branch 'feature/erd' vào develop (PR #04 hoàn thành Sprint 1)",
    date: "01/11/2026 16:45",
    timeAgo: "3 ngày trước",
    stats: { additions: 85, deletions: 2, files: 2 },
    filesChanged: ["backend/app/api/v1/router.py", "backend/app/core/database.py"],
    cx: 440,
    cy: 110,
  },
  {
    id: "c-5",
    sha: "5149fb7",
    author: { name: "Võ Nhật Huy", role: "Frontend / Fullstack", avatar: "H", color: "#16a34a" },
    branch: "feature/auth",
    branchLabel: "feature/auth",
    branchColor: "#d97706",
    message: "TE22C19: Xây dựng JWT authentication, hash Passlib Bcrypt 12 rounds và endpoint /login",
    date: "02/11/2026 11:10",
    timeAgo: "2 ngày trước",
    stats: { additions: 295, deletions: 8, files: 5 },
    filesChanged: [
      "backend/app/api/v1/endpoints/auth.py",
      "backend/app/core/security.py",
      "backend/app/api/deps.py",
      "src/screens/LoginScreen.tsx",
      "src/api.ts",
    ],
    cx: 560,
    cy: 240,
  },
  {
    id: "c-6",
    sha: "d4bdc7d",
    author: { name: "Võ Nhật Huy", role: "Frontend / Fullstack", avatar: "H", color: "#16a34a" },
    branch: "develop",
    branchLabel: "develop",
    branchColor: "#9333ea",
    message: "TE22C19: Merge branch 'feature/auth' vào develop (PR #07 hoàn thành Sprint 2)",
    date: "02/11/2026 17:30",
    timeAgo: "2 ngày trước",
    stats: { additions: 65, deletions: 4, files: 3 },
    filesChanged: ["src/api.ts", "backend/app/api/deps.py", "src/App.tsx"],
    cx: 680,
    cy: 110,
  },
  {
    id: "c-7",
    sha: "77817ef",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "H", color: "#2563eb" },
    branch: "main",
    branchLabel: "main",
    branchColor: "#2563eb",
    message: "TE9CA72: Release v1.0: nghiệm thu Sprint 2 và triển khai lên Production",
    date: "03/11/2026 09:00",
    timeAgo: "1 ngày trước",
    stats: { additions: 54, deletions: 10, files: 2 },
    filesChanged: ["dist/index.html", "vercel.json"],
    cx: 800,
    cy: 45,
  },
  {
    id: "c-8",
    sha: "2103bbf",
    author: { name: "Phan Đình Nghị", role: "Backend / Database", avatar: "N", color: "#9333ea" },
    branch: "feature/evaluator",
    branchLabel: "feature/evaluator",
    branchColor: "#0891b2",
    message: "TE35D77: Xây dựng sandbox Code Evaluator biên dịch C++ g++ và 5 test case ẩn",
    date: "03/11/2026 15:40",
    timeAgo: "1 ngày trước",
    stats: { additions: 215, deletions: 6, files: 3 },
    filesChanged: [
      "backend/app/services/code_evaluator.py",
      "backend/app/api/v1/endpoints/submissions.py",
      "backend/app/services/analytics.py",
    ],
    cx: 920,
    cy: 175,
  },
  {
    id: "c-9",
    sha: "7323c97",
    author: { name: "Phan Đình Nghị", role: "Backend / Database", avatar: "N", color: "#9333ea" },
    branch: "main",
    branchLabel: "main",
    branchColor: "#2563eb",
    message: "TE61A04: Release v1.2: chốt sơ đồ GitDiagram và triển khai toàn diện hệ thống",
    date: "04/11/2026 13:45",
    timeAgo: "Vừa xong",
    stats: { additions: 310, deletions: 15, files: 3 },
    filesChanged: ["src/screens/GitProjectHub.tsx", "src/App.tsx", "src/components/ErrorBoundary.tsx"],
    cx: 1040,
    cy: 45,
  },
];

// ─── CodeRabbit PR & AI Review Models (Nhánh 2.1) ───────────────────────────
export interface DiffLine {
  type: "context" | "addition" | "deletion";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface AiComment {
  id: string;
  type: "warning" | "security" | "suggestion";
  line: number;
  title: string;
  message: string;
  suggestedFix: string;
  explanation: string;
}

export interface PRFile {
  filename: string;
  status: "modified" | "added";
  additions: number;
  deletions: number;
  lines: DiffLine[];
  aiComment?: AiComment;
}

export interface PullRequestItem {
  id: string;
  prNumber: number;
  title: string;
  author: { name: string; role: string; avatar: string; color: string };
  sourceBranch: string;
  targetBranch: string;
  status: "open" | "approved" | "merged";
  createdAt: string;
  summary: {
    overview: string;
    keyPoints: string[];
    riskLevel: "low" | "medium" | "high";
    estimatedReviewTime: string;
    totalAdditions: number;
    totalDeletions: number;
    filesCount: number;
  };
  defenseQA: {
    question: string;
    expectedAnswer: string;
    rubricHint: string;
  }[];
  files: PRFile[];
}

export const MOCK_PULL_REQUESTS: PullRequestItem[] = [
  {
    id: "pr-04",
    prNumber: 4,
    title: "feat(#TE14F82): Thiết kế CSDL 8 bảng 3NF & Ràng buộc Khóa ngoại SQLAlchemy",
    author: { name: "Phan Đình Nghị", role: "Backend / Database", avatar: "ĐN", color: "#9333ea" },
    sourceBranch: "feature/erd",
    targetBranch: "develop",
    status: "open",
    createdAt: "04/11/2026 10:20",
    summary: {
      overview: "PR khởi tạo toàn bộ cấu trúc 8 bảng quan hệ chuẩn 3NF (Users, Tasks, Sprints, Submissions) và thiết lập quan hệ cascade delete giữa các thực thể cốt lõi.",
      keyPoints: [
        "Định nghĩa bảng Submissions với liên kết ForeignKey tới Users và Lessons.",
        "Thiết lập enum trạng thái bài nộp (PENDING, PASSED, FAILED).",
        "CodeRabbit phát hiện 1 cảnh báo hiệu năng & bảo mật truy vấn CSDL.",
      ],
      riskLevel: "medium",
      estimatedReviewTime: "3 phút",
      totalAdditions: 245,
      totalDeletions: 12,
      filesCount: 3,
    },
    defenseQA: [
      {
        question: "Tại sao cột user_id trong bảng Submissions bắt buộc phải có index=True?",
        expectedAnswer: "Vì các truy vấn thống kê lịch sử nộp bài của sinh viên và tính điểm Sprint của Thầy Phước luôn lọc theo user_id. Có index giúp truy vấn đạt O(log N) thay vì full-table scan O(N).",
        rubricHint: "Kiểm tra kiến thức tối ưu hóa truy vấn CSDL quan hệ.",
      },
      {
        question: "Khi xóa một tài khoản sinh viên thử nghiệm, các bài nộp cũ xử lý ra sao?",
        expectedAnswer: "Nhờ cấu hình ondelete='CASCADE', SQLAlchemy và SQLite sẽ tự động dọn dẹp các bản ghi con mồ côi, tránh vi phạm ràng buộc toàn vẹn dữ liệu.",
        rubricHint: "Kiểm tra kiến thức ràng buộc khóa ngoại (Referential Integrity).",
      },
    ],
    files: [
      {
        filename: "backend/app/models/submission.py",
        status: "modified",
        additions: 45,
        deletions: 4,
        lines: [
          { type: "context", oldLineNumber: 34, newLineNumber: 34, content: '    __tablename__ = "submissions"' },
          { type: "context", oldLineNumber: 35, newLineNumber: 35, content: "    id = Column(Integer, primary_key=True, index=True)" },
          { type: "deletion", oldLineNumber: 36, content: '    # Bản cũ: Không index, không ràng buộc ondelete' },
          { type: "deletion", oldLineNumber: 37, content: '    user_id = Column(Integer, ForeignKey("users.id"))' },
          { type: "addition", newLineNumber: 36, content: '    # Cảnh báo CodeRabbit: Thiếu Index & ondelete' },
          { type: "addition", newLineNumber: 37, content: '    user_id = Column(Integer, ForeignKey("users.id"))' },
          { type: "context", oldLineNumber: 38, newLineNumber: 38, content: "    lesson_id = Column(Integer, ForeignKey('lessons.id'))" },
          { type: "context", oldLineNumber: 39, newLineNumber: 39, content: "    code = Column(Text, nullable=False)" },
          { type: "context", oldLineNumber: 40, newLineNumber: 40, content: "    status = Column(String(20), default='PENDING')" },
        ],
        aiComment: {
          id: "cr-fix-pr4",
          type: "warning",
          line: 37,
          title: "Thiếu Index trên Foreign Key & Nguy cơ Treo Truy Vấn Khi Nộp Bài Đông",
          message: "Trường user_id là khóa ngoại thường xuyên được JOIN và WHERE trong báo cáo tiến độ Sprint của Giảng viên nhưng chưa được bật `index=True`. Ngoài ra thiếu `ondelete='CASCADE'` sẽ tạo bản ghi mồ côi khi sinh viên test bị xóa.",
          suggestedFix: 'user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)',
          explanation: "Bổ sung `index=True` giảm độ trễ truy vấn lọc theo sinh viên từ O(N) xuống O(log N) và `ondelete='CASCADE'` đảm bảo tính toàn vẹn 3NF.",
        },
      },
    ],
  },
  {
    id: "pr-07",
    prNumber: 7,
    title: "feat(#TE22C19): Tích hợp JWT Access Token, Bcrypt Hashing & Phân Quyền Giảng Viên",
    author: { name: "Võ Nhật Huy", role: "Frontend / Fullstack", avatar: "VH", color: "#16a34a" },
    sourceBranch: "feature/auth",
    targetBranch: "develop",
    status: "approved",
    createdAt: "04/11/2026 11:40",
    summary: {
      overview: "Triển khai cơ chế xác thực người dùng không trạng thái (Stateless Auth) sử dụng JSON Web Token với thuật toán mã hóa mật khẩu Bcrypt 12 rounds.",
      keyPoints: [
        "Hàm create_access_token tạo JWT kèm thời gian hết hạn ACCESS_TOKEN_EXPIRE_MINUTES.",
        "Middleware phân quyền kiểm tra role ('student' | 'instructor' | 'admin').",
        "CodeRabbit phát hiện 1 lỗ hổng bảo mật nghiêm trọng (Hardcoded Secret Key).",
      ],
      riskLevel: "high",
      estimatedReviewTime: "5 phút",
      totalAdditions: 185,
      totalDeletions: 8,
      filesCount: 2,
    },
    defenseQA: [
      {
        question: "Tại sao không nên lưu SECRET_KEY trực tiếp trong mã nguồn đẩy lên GitHub?",
        expectedAnswer: "Bất kỳ ai đọc được repo công khai đều có thể dùng SECRET_KEY để tự tạo token giả mạo danh tính Giảng viên hoặc Admin nhằm thay đổi điểm số.",
        rubricHint: "Đánh giá hiểu biết về bảo mật OWASP A02:2021 - Cryptographic Failures.",
      },
      {
        question: "Cơ chế bảo vệ JWT trước việc bị đánh cắp trong mạng trường học là gì?",
        expectedAnswer: "Luôn truyền qua kênh HTTPS, thiết lập thời gian hết hạn ngắn (60 phút), lưu token an toàn trong HttpOnly Cookie hoặc State bộ nhớ của Client.",
        rubricHint: "Kiểm tra kiến thức Stateless Session & XSS/CSRF Prevention.",
      },
    ],
    files: [
      {
        filename: "backend/app/core/security.py",
        status: "modified",
        additions: 60,
        deletions: 6,
        lines: [
          { type: "context", oldLineNumber: 48, newLineNumber: 48, content: "from datetime import datetime, timedelta" },
          { type: "context", oldLineNumber: 49, newLineNumber: 49, content: "from jose import jwt" },
          { type: "deletion", oldLineNumber: 50, content: '# Nguy hiểm: Hardcoded secret key' },
          { type: "deletion", oldLineNumber: 51, content: 'SECRET_KEY = "codemind-super-secret-key-12345"' },
          { type: "addition", newLineNumber: 50, content: '# Cảnh báo CodeRabbit: Nguy cơ lộ chữ ký JWT' },
          { type: "addition", newLineNumber: 51, content: 'SECRET_KEY = "codemind-super-secret-key-12345"' },
          { type: "context", oldLineNumber: 52, newLineNumber: 52, content: 'ALGORITHM = "HS256"' },
          { type: "context", oldLineNumber: 53, newLineNumber: 53, content: "ACCESS_TOKEN_EXPIRE_MINUTES = 60" },
        ],
        aiComment: {
          id: "cr-fix-pr7",
          type: "security",
          line: 51,
          title: "Lỗ Hổng Bảo Mật: Hardcoded SECRET_KEY Trong Mã Nguồn",
          message: "SECRET_KEY đang được gán cứng chuỗi text trực tiếp trong file. Khi đẩy lên GitHub công khai, kẻ tấn công có thể giả mạo chữ ký JWT để leo quyền Admin hoặc Instructor mà không cần mật khẩu.",
          suggestedFix: 'SECRET_KEY = os.getenv("JWT_SECRET_KEY") or secrets.token_hex(32)',
          explanation: "Đọc khóa bảo mật từ biến môi trường .env và tự động sinh chuỗi cryptographic 256-bit an toàn làm fallback.",
        },
      },
    ],
  },
  {
    id: "pr-12",
    prNumber: 12,
    title: "feat(#TE9CA72): Bộ Chấm Điểm Mã Nguồn Cách Ly Sandbox Docker & Giới Hạn Tài Nguyên",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "BH", color: "#2563eb" },
    sourceBranch: "feature/sandbox",
    targetBranch: "develop",
    status: "merged",
    createdAt: "04/11/2026 12:15",
    summary: {
      overview: "Xây dựng micro-service khởi tạo container Docker cách ly để chạy code sinh viên nộp, áp dụng cgroup giới hạn RAM 128MB, CPU 0.5 core và timeout 3.0s.",
      keyPoints: [
        "Container dùng 1 lần (ephemeral) tự hủy ngay sau khi trả kết quả.",
        "Khóa toàn bộ Network access ra ngoài Internet trong lúc chạy code test.",
        "CodeRabbit gợi ý 1 giải pháp bọc Context Manager ngăn rò rỉ bộ nhớ host.",
      ],
      riskLevel: "low",
      estimatedReviewTime: "4 phút",
      totalAdditions: 320,
      totalDeletions: 45,
      filesCount: 4,
    },
    defenseQA: [
      {
        question: "Làm thế nào để ngăn sinh viên viết mã độc fork-bomb làm sập máy chủ chấm bài?",
        expectedAnswer: "Sử dụng cgroup của Docker giới hạn tối đa 64 tiến trình (pids-limit=64) kết hợp CPU quota và timeout cứng 3.0 giây tiêu diệt tiến trình.",
        rubricHint: "Đánh giá độ am hiểu về an toàn thực thi mã không tin cậy (Untrusted Code Execution).",
      },
    ],
    files: [
      {
        filename: "backend/app/services/code_evaluator.py",
        status: "modified",
        additions: 80,
        deletions: 12,
        lines: [
          { type: "context", oldLineNumber: 70, newLineNumber: 70, content: "def execute_in_sandbox(user_code: str, test_cases: list):" },
          { type: "context", oldLineNumber: 71, newLineNumber: 71, content: "    container = client.containers.create(image='python:3.11-slim', mem_limit='128m')" },
          { type: "deletion", oldLineNumber: 72, content: "    container.start()" },
          { type: "deletion", oldLineNumber: 73, content: "    result = run_tests(container, test_cases)" },
          { type: "deletion", oldLineNumber: 74, content: "    container.remove(force=True)" },
          { type: "addition", newLineNumber: 72, content: "    container.start()" },
          { type: "addition", newLineNumber: 73, content: "    result = run_tests(container, test_cases)" },
          { type: "addition", newLineNumber: 74, content: "    container.remove(force=True)" },
          { type: "context", oldLineNumber: 75, newLineNumber: 75, content: "    return result" },
        ],
        aiComment: {
          id: "cr-fix-pr12",
          type: "suggestion",
          line: 74,
          title: "Đảm Bảo Thu Hồi Container Bằng Khối try...finally",
          message: "Lệnh `container.remove(force=True)` nằm ở cuối hàm có thể bị bỏ qua nếu `run_tests` ném ra ngoại lệ (ví dụ: TimeoutError hoặc OOMKilled), dẫn đến rò rỉ hàng trăm container zombie trên server.",
          suggestedFix: "try:\n        container.start()\n        return run_tests(container, test_cases)\n    finally:\n        container.remove(force=True)",
          explanation: "Khối finally đảm bảo container luôn được dọn dẹp sạch sẽ trong mọi kịch bản lỗi, giữ cho máy chủ luôn ổn định.",
        },
      },
    ],
  },
  {
    id: "pr-15",
    prNumber: 15,
    title: "feat(#TE48B10): Giao Diện Tech Reels Video Bài Giảng Ngắn & Tiến Trình Xem",
    author: { name: "Võ Nhật Huy", role: "Frontend / Fullstack", avatar: "VH", color: "#16a34a" },
    sourceBranch: "feature/reels",
    targetBranch: "develop",
    status: "open",
    createdAt: "04/11/2026 14:10",
    summary: {
      overview: "Màn hình lướt video ngắn Tech Reels dạng dọc với bộ đếm thời gian xem thực tế và tự động tích lũy điểm XP khi hoàn thành trên 80% thời lượng.",
      keyPoints: [
        "Tích hợp HTML5 Video API với cơ chế preload metadata tiết kiệm mạng.",
        "Gửi heartbeat tracking tiến độ xem về Learning Analytics Engine.",
        "CodeRabbit phát hiện nguy cơ rò rỉ bộ nhớ khi chuyển đổi video liên tục.",
      ],
      riskLevel: "low",
      estimatedReviewTime: "3 phút",
      totalAdditions: 210,
      totalDeletions: 15,
      filesCount: 2,
    },
    defenseQA: [
      {
        question: "Tại sao cần cleanup event listener timeupdate trong useEffect của React khi xem video?",
        expectedAnswer: "Tránh retain reference của DOM node trong closures, ngăn ngừa rò rỉ bộ nhớ (memory leak) khi người dùng lướt qua hàng chục video liên tục.",
        rubricHint: "Đánh giá hiểu biết về React Lifecycle & Resource Cleanup.",
      },
    ],
    files: [
      {
        filename: "src/screens/TechReels.tsx",
        status: "modified",
        additions: 55,
        deletions: 5,
        lines: [
          { type: "context", oldLineNumber: 40, newLineNumber: 40, content: "useEffect(() => {" },
          { type: "context", oldLineNumber: 41, newLineNumber: 41, content: "  const video = videoRef.current;" },
          { type: "deletion", oldLineNumber: 42, content: "  if (video) video.addEventListener('timeupdate', handleTimeUpdate);" },
          { type: "addition", newLineNumber: 42, content: "  if (video) video.addEventListener('timeupdate', handleTimeUpdate);" },
          { type: "context", oldLineNumber: 43, newLineNumber: 43, content: "}, [currentVideoIndex]);" },
        ],
        aiComment: {
          id: "cr-fix-pr15",
          type: "warning",
          line: 42,
          title: "Thiếu Hàm Cleanup Trong useEffect (Nguy cơ Memory Leak)",
          message: "Lắng nghe sự kiện 'timeupdate' được thêm vào video element nhưng không có hàm return cleanup trong useEffect. Khi sinh viên cuộn video nhanh, hàng chục listeners cũ sẽ tích tụ trong bộ nhớ.",
          suggestedFix: "return () => {\n    if (video) video.removeEventListener('timeupdate', handleTimeUpdate);\n  };",
          explanation: "Trả về hàm dọn dẹp để gỡ bỏ listener ngay khi component unmount hoặc dependency thay đổi.",
        },
      },
    ],
  },
  {
    id: "pr-18",
    prNumber: 18,
    title: "feat(#TE56E05): Cửa Hàng Đổi Thưởng XP Shop & Kiểm Soát Giao Dịch Điểm",
    author: { name: "Phan Đình Nghị", role: "Backend / Database", avatar: "ĐN", color: "#9333ea" },
    sourceBranch: "feature/gamification",
    targetBranch: "develop",
    status: "open",
    createdAt: "04/11/2026 15:30",
    summary: {
      overview: "API cho phép sinh viên dùng điểm kinh nghiệm (XP) đổi lấy các vật phẩm huy hiệu, khung avatar và mascot đồng hành trong hệ thống.",
      keyPoints: [
        "Kiểm tra số dư XP hiện tại của người dùng trước khi duyệt giao dịch.",
        "Ghi log vào bảng AuditLog phục vụ kiểm định minh bạch điểm thưởng.",
        "CodeRabbit phát hiện 1 nguy cơ Race Condition (Double-Spending XP).",
      ],
      riskLevel: "medium",
      estimatedReviewTime: "4 phút",
      totalAdditions: 175,
      totalDeletions: 20,
      filesCount: 3,
    },
    defenseQA: [
      {
        question: "Làm thế nào để ngăn chặn gian lận điểm thưởng khi sinh viên spam click nút đổi quà?",
        expectedAnswer: "Sử dụng Pessimistic Locking với query with_for_update() hoặc cập nhật có điều kiện atomic: UPDATE users SET xp = xp - cost WHERE xp >= cost.",
        rubricHint: "Kiểm tra kiến thức Transaction Concurrency & Race Condition Prevention.",
      },
    ],
    files: [
      {
        filename: "backend/app/api/v1/endpoints/shop.py",
        status: "modified",
        additions: 40,
        deletions: 6,
        lines: [
          { type: "context", oldLineNumber: 62, newLineNumber: 62, content: "def purchase_item(user_id: int, item_id: int, db: Session):" },
          { type: "deletion", oldLineNumber: 63, content: "    user = db.query(User).filter(User.id == user_id).first()" },
          { type: "addition", newLineNumber: 63, content: "    user = db.query(User).filter(User.id == user_id).first()" },
          { type: "context", oldLineNumber: 64, newLineNumber: 64, content: "    if user.xp < item.price: raise HTTPException(400, 'Không đủ điểm')" },
          { type: "context", oldLineNumber: 65, newLineNumber: 65, content: "    user.xp -= item.price" },
        ],
        aiComment: {
          id: "cr-fix-pr18",
          type: "security",
          line: 63,
          title: "Lỗ Hổng Race Condition: Thiếu Khóa Bi Quan (Double-Spending)",
          message: "Truy vấn đọc điểm không sử dụng khóa bi quan. Nếu sinh viên gửi 2 request song song trong vài mili-giây, cả 2 request đều thấy đủ điểm và trừ song song dẫn tới âm điểm hoặc mua đồ miễn phí.",
          suggestedFix: "user = db.query(User).filter(User.id == user_id).with_for_update().first()",
          explanation: "Khóa dòng người dùng với SELECT FOR UPDATE đảm bảo chỉ 1 giao dịch được thực hiện tại một thời điểm.",
        },
      },
    ],
  },
  {
    id: "pr-21",
    prNumber: 21,
    title: "fix(#TE62F11): Khắc Phục Lỗi Cache Lịch Sử Hội Thoại Gia Sư AI Khi Đổi Bài Học",
    author: { name: "Nguyễn Bá Hòa", role: "Leader / Architect", avatar: "BH", color: "#2563eb" },
    sourceBranch: "feature/ai-tutor",
    targetBranch: "develop",
    status: "approved",
    createdAt: "04/11/2026 16:00",
    summary: {
      overview: "Sửa lỗi panel gia sư AI giữ nguyên các tin nhắn của bài học trước khi học viên chuyển sang bài thực hành mới trên sơ đồ kỹ năng.",
      keyPoints: [
        "Khởi tạo lại trạng thái chat theo `lessonId` hiện hành.",
        "Bổ sung cache invalidation cho các đoạn mã gợi ý Socratic.",
      ],
      riskLevel: "low",
      estimatedReviewTime: "2 phút",
      totalAdditions: 35,
      totalDeletions: 5,
      filesCount: 1,
    },
    defenseQA: [
      {
        question: "Cách tối ưu nhất trong React để reset sạch sẽ state của component con khi ID thay đổi là gì?",
        expectedAnswer: "Sử dụng thuộc tính key={lesson.id} trên component con để React tự động unmount instance cũ và tạo mới một cách tự nhiên.",
        rubricHint: "Đánh giá sự hiểu biết về Reconciliation và Key Prop của React.",
      },
    ],
    files: [
      {
        filename: "src/screens/LearningWorkspace.tsx",
        status: "modified",
        additions: 15,
        deletions: 2,
        lines: [
          { type: "context", oldLineNumber: 110, newLineNumber: 110, content: "return (" },
          { type: "deletion", oldLineNumber: 111, content: "  <SocraticTutorChat lesson={activeLesson} />" },
          { type: "addition", newLineNumber: 111, content: "  <SocraticTutorChat key={activeLesson.id} lesson={activeLesson} />" },
          { type: "context", oldLineNumber: 112, newLineNumber: 112, content: ");" },
        ],
        aiComment: {
          id: "cr-fix-pr21",
          type: "suggestion",
          line: 111,
          title: "Sử Dụng key Prop Để Tự Động Re-mount Component",
          message: "Code đã áp dụng đúng chuẩn React Declarative: thêm key={activeLesson.id} giúp React tự động khởi tạo lại toàn bộ state của khung chat mà không cần viết các hàm useEffect xóa state thủ công.",
          suggestedFix: "<SocraticTutorChat key={activeLesson.id} lesson={activeLesson} />",
          explanation: "Tận dụng cơ chế Reconciliation của React để cô lập hoàn toàn state giữa các bài học khác nhau.",
        },
      },
    ],
  },
];

// ─── Animated Number Counter Component (Smooth GSAP / Easing Style) ─────────
function AnimatedNumber({
  value,
  duration = 850,
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

  return <>{decimals > 0 ? displayValue.toFixed(decimals) : displayValue.toLocaleString()}{suffix}</>;
}

export default function GitProjectHub() {
  const [viewMode, setViewMode] = useState<"coderabbit" | "topology" | "gitdiagram" | "analytics" | "gitflow">("coderabbit");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("learning-ws");
  const [copiedMermaid, setCopiedMermaid] = useState<boolean>(false);

  // GitHub Repo Connection State
  const [showRepoModal, setShowRepoModal] = useState<boolean>(false);
  const [repoUrl, setRepoUrl] = useState<string>("https://github.com/Hoaba-clouch/E-learningProject");
  const [targetBranch, setTargetBranch] = useState<string>("main");

  // CodeRabbit Interactive State (Nhánh 2.1)
  const [selectedPrId, setSelectedPrId] = useState<string>("pr-04");
  const [prSubTab, setPrSubTab] = useState<"walkthrough" | "diff" | "defense">("diff");
  const [appliedFixes, setAppliedFixes] = useState<Record<string, boolean>>({});
  const [prStatusFilter, setPrStatusFilter] = useState<"all" | "open" | "approved" | "merged">("open");
  const [prMemberFilter, setPrMemberFilter] = useState<string>("all");
  const [prSearchQuery, setPrSearchQuery] = useState<string>("");

  // CodeRabbit 2.0 - 4 Pillars States (Review, Prioritize, Impact, Security)
  const [crPillar, setCrPillar] = useState<"review" | "prioritize" | "impact" | "security">("review");
  const [statAnimKey, setStatAnimKey] = useState<number>(0);

  const handleSetViewMode = (mode: "coderabbit" | "topology" | "gitdiagram" | "analytics" | "gitflow") => {
    setViewMode(mode);
    setStatAnimKey((k) => k + 1);
    if (mode === "topology") setTopoAnimKey((k) => k + 1);
    if (mode === "gitdiagram") setDiagramAnimKey((k) => k + 1);
  };

  const handleSetCrPillar = (pillar: "review" | "prioritize" | "impact" | "security") => {
    setCrPillar(pillar);
    setStatAnimKey((k) => k + 1);
  };
  const [selectedImpactTab, setSelectedImpactTab] = useState<"overview" | "security" | "architecture" | "verify">("architecture");
  const [impactViewMode, setImpactViewMode] = useState<"layers" | "files">("layers");
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(1);
  const [fixedVulns, setFixedVulns] = useState<Record<string, boolean>>({});
  const [selectedVulnDot, setSelectedVulnDot] = useState<number>(42);
  const [committableSuggestionApplied, setCommittableSuggestionApplied] = useState<boolean>(false);

  const filteredPRs = useMemo(() => {
    return MOCK_PULL_REQUESTS.filter((pr) => {
      const matchStatus = prStatusFilter === "all" || pr.status === prStatusFilter;
      const matchMember = prMemberFilter === "all" || pr.author.name === prMemberFilter;
      const q = prSearchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        pr.title.toLowerCase().includes(q) ||
        pr.author.name.toLowerCase().includes(q) ||
        pr.sourceBranch.toLowerCase().includes(q) ||
        `pr #${pr.prNumber}`.includes(q);
      return matchStatus && matchMember && matchQuery;
    });
  }, [prStatusFilter, prMemberFilter, prSearchQuery]);

  const selectedPR = useMemo(() => {
    const foundInFiltered = filteredPRs.find((pr) => pr.id === selectedPrId);
    if (foundInFiltered) return foundInFiltered;
    if (filteredPRs.length > 0) return filteredPRs[0];
    return MOCK_PULL_REQUESTS.find((pr) => pr.id === selectedPrId) || MOCK_PULL_REQUESTS[0];
  }, [selectedPrId, filteredPRs]);

  const handleApplyFix = (commentId: string) => {
    setAppliedFixes((prev) => ({ ...prev, [commentId]: true }));
  };

  // Topology Interactive State
  const [selectedCommit, setSelectedCommit] = useState<GitCommitItem>(GIT_COMMITS[8]);
  const [hoveredCommit, setHoveredCommit] = useState<GitCommitItem | null>(null);
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [topoAnimKey, setTopoAnimKey] = useState<number>(0);

  const filteredCommits = useMemo(() => {
    return GIT_COMMITS.filter((c) => {
      const matchMember = memberFilter === "all" || c.author.name === memberFilter;
      const matchBranch = branchFilter === "all" || (branchFilter === "feature" ? c.branch.startsWith("feature") : c.branch === branchFilter);
      return matchMember && matchBranch;
    });
  }, [memberFilter, branchFilter]);

  // ReactFlow state & Branch-Tree Flow Simulation
  const [archNodes, , onNodesChange] = useNodesState(INITIAL_ARCH_NODES);
  const [archEdges, , onEdgesChange] = useEdgesState(INITIAL_ARCH_EDGES);
  const [diagramAnimKey, setDiagramAnimKey] = useState<number>(0);
  const [activeArchFlow, setActiveArchFlow] = useState<string>("all");

  const currentFlow = useMemo(() => {
    return ARCH_FLOWS.find((f) => f.id === activeArchFlow) || ARCH_FLOWS[0];
  }, [activeArchFlow]);

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
    return archNodes.find((n) => n.id === selectedNodeId) ?? archNodes[5];
  }, [archNodes, selectedNodeId]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "containerBox") return;
    setSelectedNodeId(node.id);
  }, []);

  const copyMermaidCode = () => {
    const rawMermaid = `flowchart TD
    user(("Campus user")) -->|uses| app_shell["App shell\\n[App.tsx]"]

    subgraph CampusApp ["Campus App"]
        app_shell -->|renders| login["Login\\n[LoginScreen.tsx]"]
        app_shell -->|renders| student_dash["Student dashboard"]
        app_shell -->|renders| learning_ws["Learning workspace"]
        app_shell -->|renders| tech_reels["Tech reels\\n[TechReels.tsx]"]
        app_shell -->|renders| profile["Student profile\\n[StudentProfile.tsx]"]
        app_shell -->|renders| xp_shop["XP shop\\n[XPShop.tsx]"]
        app_shell -->|renders| admin_dash["Admin dashboard\\n[AdminDashboard.tsx]"]
        learning_ws -->|imports| api_client["API client\\n[api.ts]"]
    end

    api_client -->|HTTP API| api_startup["API startup\\n[main.py]"]

    subgraph APIPlatform ["API Platform"]
        api_startup -->|mounts| v1_router["V1 router\\n[router.py]"]
        v1_router -->|registers| auth["Authentication\\n[auth.py]"]
        auth -->|auth dependency| auth_deps["Auth dependencies\\n[deps.py]"]
        auth_deps -->|checks tokens| token_utils["Token utilities\\n[security.py]"]
    end

    subgraph ProjectWorkspace ["Project Workspace"]
        app_shell -->|renders| git_hub["Git project hub\\n[GitProjectHub.tsx]"]
        app_shell -->|renders| kanban["Kanban board\\n[KanbanBoard.tsx]"]
        app_shell -->|renders| inst_panel["Instructor panel"]
        kanban -->|renders| task_csv["Task CSV manager"]
        v1_router -->|registers| inst_apis["Instructor APIs\\n[instructor.py]"]
        v1_router -->|registers| kanban_apis["Kanban APIs\\n[kanban.py]"]
    end

    subgraph LearningServices ["Learning Services"]
        v1_router -->|registers| learning_apis["Learning APIs\\n[lms.py]"]
        v1_router -->|registers| submissions["Submissions\\n[submissions.py]"]
        v1_router -->|registers| ai_apis["AI tutor APIs\\n[ai.py]"]
        learning_apis -->|references| code_evaluator["Code evaluator\\n[code_evaluator.py]"]
        submissions -->|evaluates code| code_evaluator
        submissions -->|references| analytics["Event analytics\\n[analytics.py]"]
        ai_apis -->|references| analytics
        ai_apis -->|tracks events| analytics
    end

    db[("SQLite database\\n[database.py]")]
    inst_apis -->|accesses| db
    kanban_apis -->|accesses| db
    learning_apis -->|queries| db
    submissions -->|reads and writes| db
    ai_apis -->|accesses| db
    analytics -->|accesses| db`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(rawMermaid);
      setCopiedMermaid(true);
      setTimeout(() => setCopiedMermaid(false), 2000);
    }
  };

  return (
    <div className="min-h-full p-4 lg:p-6 space-y-5 bg-slate-50/60 text-slate-800">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 font-mono">
              <Network size={13} />
              Phân hệ 2 • Sơ đồ Kiến trúc Chuẩn GitDiagram & Understand Anything
            </span>
            <span className="text-xs text-slate-500 font-medium">hoaba-clouch/e-learningproject</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Sơ đồ Kiến trúc Hệ thống (GitDiagram) & Git Hub
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-4xl">
            Cấu trúc phân tầng chuẩn 100% từ GitDiagram: Campus App (Frontend), API Platform (FastAPI), Project Workspace, Learning Services và SQLite Database.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href={repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            <FolderGit2 size={14} className="text-slate-600" />
            Mở Repo GitHub
          </a>
          <button
            onClick={() => setShowRepoModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            <GitFork size={14} />
            Liên Kết & Đồng Bộ Repo
          </button>
        </div>
      </header>

      {/* 4 Metric Summary Cards with Staggered Cascade & Animated Numbers */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div key={`m1-${statAnimKey}`} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm animate-cascade-1 hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Điểm Văn hóa Git</span>
            <ShieldCheck size={16} className="text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              <AnimatedNumber value={94.8} decimals={1} key={`score-${statAnimKey}`} />
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              Hạng A+ (Chuẩn)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">100% commit có mã Task và format feat/fix.</p>
        </div>

        <div key={`m2-${statAnimKey}`} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm animate-cascade-2 hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Kiểm định Liêm chính AI</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 font-mono">
              <AnimatedNumber value={100} suffix="%" key={`integ-${statAnimKey}`} />
            </span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Bình thường
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Không phát hiện hành vi dump code AI gian lận.</p>
        </div>

        <div key={`m3-${statAnimKey}`} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm animate-cascade-3 hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Phân bổ Nhóm 3 người</span>
            <UserCheck size={16} className="text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-700 font-mono">
              <AnimatedNumber value={36} key={`h-${statAnimKey}`} /> : <AnimatedNumber value={34} key={`v-${statAnimKey}`} /> : <AnimatedNumber value={30} key={`n-${statAnimKey}`} />
            </span>
            <span className="text-xs font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
              Cân bằng
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Nguyễn Bá Hòa (36%), Võ Nhật Huy (34%), Phan Đình Nghị (30%).</p>
        </div>

        <div key={`m4-${statAnimKey}`} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm animate-cascade-4 hover:shadow-md transition">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Cấu trúc GitDiagram</span>
            <Boxes size={16} className="text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700 font-mono">
              <AnimatedNumber value={22} key={`diag-${statAnimKey}`} />
            </span>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
              5 Phân tầng
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Khớp 100% sơ đồ gitdiagram.com repo của nhóm.</p>
        </div>
      </section>

      {/* Main Mode Navigation Bar */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleSetViewMode("coderabbit")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              viewMode === "coderabbit"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Bot size={15} />
            Nhánh 2.1 • AI Review (CodeRabbit PR)
          </button>
          <button
            onClick={() => handleSetViewMode("topology")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              viewMode === "topology"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Network size={15} />
            Nhánh 2.2 • Cây Phân Nhánh (GitKraken)
          </button>
          <button
            onClick={() => handleSetViewMode("gitdiagram")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              viewMode === "gitdiagram"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Boxes size={15} />
            Nhánh 2.3 • Sơ đồ Kiến trúc (GitDiagram)
          </button>
          <button
            onClick={() => handleSetViewMode("analytics")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              viewMode === "analytics"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <BarChart3 size={15} />
            Thống kê Nhóm
          </button>
          <button
            onClick={() => handleSetViewMode("gitflow")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              viewMode === "gitflow"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Layers size={15} />
            Chu trình Git Flow
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 pr-3 font-mono shrink-0">
          <button
            onClick={copyMermaidCode}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 font-sans font-medium text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200"
          >
            {copiedMermaid ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copiedMermaid ? "Đã copy Mermaid.js" : "Sao chép mã Mermaid.js"}
          </button>
        </div>
      </div>

      {/* MODE 0: CODERABBIT 2.0 AI CODE REVIEW & PR PORTAL (NHÁNH 2.1) - TRỌN BỘ 4 TÍNH NĂNG */}
      {viewMode === "coderabbit" && (
        <div key={`mode-coderabbit-${statAnimKey}`} className="space-y-4 animate-tab-slide-down">
          {/* ── CODERABBIT 2.0 PILLARS NAVIGATION BAR (Khớp 4 Trụ Cột) ───────── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-md">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-[#ff5722]/15 border border-[#ff5722]/30 px-3 py-1.5 rounded-xl">
                <span className="text-base">🐰</span>
                <div>
                  <span className="font-bold text-xs text-white tracking-wide">CodeRabbit 2.0</span>
                  <span className="hidden sm:inline-block text-[10px] text-[#ff8a65] font-mono ml-2">PR Intelligence</span>
                </div>
              </div>

              {/* 4 Pillar Segmented Buttons */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold gap-1 flex-wrap">
                <button
                  onClick={() => handleSetCrPillar("review")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    crPillar === "review"
                      ? "bg-[#ff5722] text-white font-bold shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-80">01</span>
                  <span>Review Tự Động</span>
                </button>

                <button
                  onClick={() => handleSetCrPillar("prioritize")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    crPillar === "prioritize"
                      ? "bg-[#ff5722] text-white font-bold shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-80">02</span>
                  <span>Prioritize (Now/Next)</span>
                </button>

                <button
                  onClick={() => handleSetCrPillar("impact")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    crPillar === "impact"
                      ? "bg-[#ff5722] text-white font-bold shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-80">03</span>
                  <span>Tác Động (Layers & Blast)</span>
                </button>

                <button
                  onClick={() => handleSetCrPillar("security")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    crPillar === "security"
                      ? "bg-[#ff5722] text-white font-bold shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-80">04</span>
                  <span>An Ninh (Health & Matrix)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-radar-dot" />
              <span className="text-[11px] text-slate-300">Scanning PRs in real-time</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* PILLAR 01: REVIEW EVERY PR AUTOMATICALLY (Khớp Ảnh 1 & Master-Detail)  */}
          {crPillar === "review" && (
            <div key={`pillar-review-${statAnimKey}`} className="space-y-4 animate-tab-slide-down">
              {/* Highlight Banner: Exact Image 1 Committable Review Card with Staggered Cascading Elements */}
              <div className="bg-[#0f141c] text-white rounded-2xl border border-slate-700/80 p-5 space-y-4 shadow-xl relative overflow-hidden">
                {/* Rubber Stamp Slam (solvik.mp4 t=30s) */}
                {committableSuggestionApplied && (
                  <div className="absolute right-4 sm:right-6 top-14 pointer-events-none rubber-stamp-slam z-20">
                    <div className="border-2 sm:border-3 border-emerald-400 text-emerald-300 font-black font-mono tracking-wider text-xs sm:text-sm px-3.5 py-1.5 rounded-lg bg-emerald-950/90 shadow-2xl backdrop-blur-xs flex items-center gap-1.5 uppercase shadow-emerald-900/40">
                      <CheckCheck size={16} className="stroke-[3] text-emerald-400" />
                      <span>COMMITTED • 881A4FC</span>
                    </div>
                  </div>
                )}
                {/* 1. Header Row (Bot Avatar & Review Change Stack button) */}
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3 animate-cascade-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#ff5722] text-white flex items-center justify-center font-bold text-sm shadow-sm animate-cascade-2">
                      🐰
                    </div>
                    <div className="flex items-center gap-2 animate-cascade-2">
                      <span className="font-bold text-slate-100">coderabbitai</span>
                      <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-mono">bot</span>
                      <span className="text-slate-400 text-[11px]">commented 2 minutes ago</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSetCrPillar("impact")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff5722]/15 hover:bg-[#ff5722]/25 text-[#ff5722] text-xs font-bold transition border border-[#ff5722]/30 cursor-pointer animate-cascade-2"
                  >
                    <span>Review Change Stack</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* 2. Warning Alert & Detailed Explanation */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs animate-cascade-3">
                    <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <AlertTriangle size={13} />
                      Potential issue
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                      Major
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white tracking-tight animate-cascade-4">
                    Reject expired refresh tokens before issuing a session.
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed animate-cascade-5">
                    Check the token expiry before creating a new authenticated session to prevent session replay attacks.
                  </p>
                </div>

                {/* 3. Code Diff Box with Granular Cascading Lines (Chuẩn 100% Ảnh 1) */}
                <div className="rounded-xl overflow-hidden border border-slate-800 font-mono text-xs bg-[#0b0f14] diff-scan-shimmer animate-cascade-6">
                  <div className="bg-slate-900/90 px-3 py-1.5 text-[11px] text-slate-400 border-b border-slate-800 flex items-center justify-between">
                    <span>@@ -42,2 +42,3 @@ export async function createSession</span>
                    <span className="text-[10px] text-slate-500 font-sans">src/server/auth/session.ts</span>
                  </div>
                  <div className="p-3 space-y-1">
                    <div className="bg-rose-950/40 text-rose-300 px-2 py-1 rounded flex items-center gap-2 animate-cascade-7">
                      <span className="select-none text-rose-500 font-bold">-</span>
                      <span>return issueSession(payload.userId);</span>
                    </div>
                    <div className="bg-emerald-950/40 text-emerald-300 px-2 py-1 rounded flex items-center gap-2 animate-cascade-8">
                      <span className="select-none text-emerald-500 font-bold">+</span>
                      <span>if (payload.expiresAt &lt;= Date.now()) return null;</span>
                    </div>
                    <div className="bg-emerald-950/40 text-emerald-300 px-2 py-1 rounded flex items-center gap-2 animate-cascade-9">
                      <span className="select-none text-emerald-500 font-bold">+</span>
                      <span>return issueSession(payload.userId);</span>
                    </div>
                  </div>
                </div>

                {/* 4. Committable Action Button & Subtext */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 animate-cascade-10">
                  <button
                    onClick={() => setCommittableSuggestionApplied(true)}
                    disabled={committableSuggestionApplied}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
                      committableSuggestionApplied
                        ? "bg-emerald-600 text-white"
                        : "bg-[#ff5722] hover:bg-[#f4511e] text-white"
                    }`}
                  >
                    {committableSuggestionApplied ? (
                      <>
                        <CheckCheck size={15} />
                        <span>✓ Đã tự động commit bản sửa vào PR #{selectedPR.prNumber}</span>
                      </>
                    ) : (
                      <>
                        <span>▶</span>
                        <span>Committable suggestion (1-Click Commit vào Repo)</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono animate-cascade-11">
                    {committableSuggestionApplied
                      ? "Commit sha: 881a4fc • Áp dụng trực tiếp vào GitHub repo"
                      : "Tự động sinh commit message chuẩn Conventional Commits"}
                  </span>
                </div>
              </div>

              {/* Master-Detail PR Viewer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* CỘT TRÁI (4 COLS): DANH SÁCH PULL REQUESTS */}
                <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <GitPullRequest size={17} className="text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-900">Danh Sách PRs</h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                        {filteredPRs.length}/{MOCK_PULL_REQUESTS.length}
                      </span>
                    </div>

                    <select
                      value={prMemberFilter}
                      onChange={(e) => setPrMemberFilter(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">Tất cả tác giả</option>
                      <option value="Nguyễn Bá Hòa">Nguyễn Bá Hòa</option>
                      <option value="Võ Nhật Huy">Võ Nhật Huy</option>
                      <option value="Phan Đình Nghị">Phan Đình Nghị</option>
                    </select>
                  </div>

                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm mã task, PR, từ khóa..."
                      value={prSearchQuery}
                      onChange={(e) => setPrSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/60"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg text-[11px] font-semibold text-slate-600">
                    <button
                      onClick={() => setPrStatusFilter("open")}
                      className={`flex-1 py-1 rounded-md transition text-center ${
                        prStatusFilter === "open" ? "bg-white text-amber-800 font-bold shadow-xs" : "hover:text-slate-900"
                      }`}
                    >
                      Cần Duyệt ({MOCK_PULL_REQUESTS.filter((p) => p.status === "open").length})
                    </button>
                    <button
                      onClick={() => setPrStatusFilter("approved")}
                      className={`flex-1 py-1 rounded-md transition text-center ${
                        prStatusFilter === "approved" ? "bg-white text-emerald-800 font-bold shadow-xs" : "hover:text-slate-900"
                      }`}
                    >
                      Đã Duyệt ({MOCK_PULL_REQUESTS.filter((p) => p.status === "approved").length})
                    </button>
                    <button
                      onClick={() => setPrStatusFilter("merged")}
                      className={`flex-1 py-1 rounded-md transition text-center ${
                        prStatusFilter === "merged" ? "bg-white text-purple-800 font-bold shadow-xs" : "hover:text-slate-900"
                      }`}
                    >
                      Đã Merge ({MOCK_PULL_REQUESTS.filter((p) => p.status === "merged").length})
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                    {filteredPRs.map((pr, prIdx) => {
                      const isSelected = pr.id === selectedPR.id;
                      return (
                        <button
                          key={pr.id}
                          onClick={() => setSelectedPrId(pr.id)}
                          style={{ animationDelay: `${Math.min(prIdx, 8) * 45}ms` }}
                          className={`w-full text-left p-3 rounded-xl border transition-all relative flex flex-col gap-2 animate-cascade-item ${
                            isSelected
                              ? "bg-blue-50/70 border-blue-500 shadow-xs ring-1 ring-blue-500/30 border-l-4 border-l-blue-600"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded text-[11px]">
                              #{pr.prNumber} • {pr.sourceBranch}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                pr.status === "merged"
                                  ? "bg-purple-100 text-purple-700"
                                  : pr.status === "approved"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {pr.status}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-relaxed">
                            {pr.title}
                          </h4>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            <span className="font-medium text-slate-700">{pr.author.name}</span>
                            <span className="font-mono text-[10px] text-emerald-600 font-bold">+{pr.summary.totalAdditions} -{pr.summary.totalDeletions}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CỘT PHẢI (8 COLS): WORKSPACE CHI TIẾT REVIEW */}
                <div key={`pr-detail-${selectedPR.id}`} className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-tab-slide-down">
                  <div className="p-5 border-b border-slate-200 bg-gradient-to-b from-slate-50/80 to-white space-y-3.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-orange-100/70 text-orange-800">
                          <Bot size={13} className="text-orange-600" />
                          CodeRabbit Reviewer
                        </span>
                        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {selectedPR.sourceBranch} → {selectedPR.targetBranch}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                          <AnimatedNumber value={selectedPR.summary.filesCount} key={`pfc-${selectedPR.id}`} /> files
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                          +<AnimatedNumber value={selectedPR.summary.totalAdditions} key={`pta-${selectedPR.id}`} />
                        </span>
                        <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold">
                          -<AnimatedNumber value={selectedPR.summary.totalDeletions} key={`ptd-${selectedPR.id}`} />
                        </span>
                      </div>
                    </div>

                    <h2 className="text-base font-bold text-slate-900 tracking-tight leading-snug flex items-start gap-2">
                      <GitPullRequest size={18} className="text-blue-600 shrink-0 mt-0.5" />
                      <span>PR #{selectedPR.prNumber}: {selectedPR.title}</span>
                    </h2>

                    <div className="pt-2 border-t border-slate-200">
                      <div className="grid grid-cols-3 gap-2 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/60">
                        <button
                          onClick={() => setPrSubTab("diff")}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition ${
                            prSubTab === "diff" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Code2 size={14} />
                          <span>Soi Lỗi & 1-Click Fix</span>
                        </button>
                        <button
                          onClick={() => setPrSubTab("walkthrough")}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition ${
                            prSubTab === "walkthrough" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <FileText size={14} />
                          <span>Tóm Tắt Walkthrough</span>
                        </button>
                        <button
                          onClick={() => setPrSubTab("defense")}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition ${
                            prSubTab === "defense" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <HelpCircle size={14} />
                          <span>Vấn Đáp Thầy Phước</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Diff Content */}
                  {prSubTab === "diff" && (
                    <div key="subtab-diff" className="p-5 space-y-4 animate-tab-slide-down">
                      {selectedPR.files.map((file, fileIdx) => {
                        const comment = file.aiComment;
                        const isApplied = comment ? !!appliedFixes[comment.id] : false;
                        return (
                          <div key={fileIdx} className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-mono font-bold text-slate-800">
                              <span>{file.filename}</span>
                              <span className="text-emerald-600">+{file.additions} -{file.deletions}</span>
                            </div>
                            <div className="font-mono text-xs overflow-x-auto bg-[#0d1117] text-slate-200 p-2 space-y-0.5">
                              {file.lines.map((line, lineIdx) => (
                                <div key={lineIdx} className={`flex items-stretch px-2 py-0.5 ${line.type === "addition" ? "bg-emerald-950/30 text-emerald-300" : line.type === "deletion" ? "bg-rose-950/40 text-rose-300" : ""}`}>
                                  <span className="w-8 select-none opacity-40 text-right mr-3">{line.newLineNumber || line.oldLineNumber}</span>
                                  <span className="w-4 select-none font-bold">{line.type === "addition" ? "+" : line.type === "deletion" ? "-" : " "}</span>
                                  <span className="whitespace-pre">{line.content}</span>
                                </div>
                              ))}
                            </div>
                            {comment && (
                              <div className="p-3.5 bg-orange-50/90 border-t border-orange-200 flex items-start justify-between gap-3 text-xs">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-1.5 font-bold text-orange-900">
                                    <Sparkles size={14} className="text-orange-600" />
                                    <span>CodeRabbit: {comment.title}</span>
                                  </div>
                                  <p className="text-orange-800 leading-relaxed">{comment.message}</p>
                                </div>
                                <button
                                  onClick={() => handleApplyFix(comment.id)}
                                  className="shrink-0 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold transition text-xs shadow-xs"
                                >
                                  {isApplied ? "✓ Đã áp dụng" : "1-Click Fix"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {prSubTab === "walkthrough" && (
                    <div key="subtab-walkthrough" className="p-6 space-y-4 text-xs text-slate-700 leading-relaxed animate-tab-slide-down">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                        <h4 className="font-bold text-sm text-slate-900">Mục đích PR #{selectedPR.prNumber}</h4>
                        <p>{selectedPR.summary.overview}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-900">Các thay đổi chính:</h4>
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                          {selectedPR.summary.keyPoints.map((c: string, i: number) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {prSubTab === "defense" && (
                    <div key="subtab-defense" className="p-6 space-y-4 animate-tab-slide-down">
                      {selectedPR.defenseQA.map((qa, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                          <h4 className="font-bold text-slate-900">Q{idx+1}: {qa.question}</h4>
                          <p className="text-emerald-800 bg-emerald-50 p-2.5 rounded-lg"><strong>Đáp án kỳ vọng:</strong> {qa.expectedAnswer}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* PILLAR 02: PRIORITIZE ACROSS ALL PRS (Khớp Chuẩn 100% Ảnh 2)           */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          {crPillar === "prioritize" && (
            <div key={`pillar-prioritize-${statAnimKey}`} className="space-y-4 animate-tab-slide-down">
              <div className="bg-[#0f141c] text-white p-5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="font-mono text-[#ff5722]">02</span>
                    <span>Prioritize across all PRs</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    AI tự động ước lượng khối lượng review trong ngày (Daily Capacity), gắn nhãn P0/P1/P2 kèm lý do kiến trúc.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">P0: Cực kỳ cấp thiết</span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">P1: Tiêu chuẩn</span>
                  <span className="px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold">P2: Tạm hoãn</span>
                </div>
              </div>

              {/* 2-Column Triage Board (Now vs Next) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                {/* CỘT 1: NOW (Trong giới hạn công suất ngày) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Now</h4>
                      <p className="text-[11px] text-slate-500">Within each person's daily capacity</p>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white"><AnimatedNumber value={14} key={`now-cnt-${statAnimKey}`} /></span>
                  </div>

                  {/* Card 1: P0 */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#0f141c] text-white space-y-3 hover:border-slate-600 transition shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        P0
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">lop #21102</span>
                    </div>

                    <h5 className="text-xs font-bold text-slate-100">
                      Skip bot-authored comment review tasks
                    </h5>

                    {/* AI Reasoning Box (Pink Border) */}
                    <div className="p-2.5 rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-200 text-[11px] leading-relaxed">
                      Review this early because it can resolve assumptions that may affect nearby PRs and reduce rework.
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Low security risk</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Maintenance</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Deep review</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-[9px] font-bold text-white flex items-center justify-center">E</span>
                        <span>@ezrapike[bot]</span>
                      </div>
                      <span className="text-[10px] text-slate-500">2h ago</span>
                    </div>
                  </div>

                  {/* Card 2: P0 (Team's Auth PR) */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#0f141c] text-white space-y-3 hover:border-slate-600 transition shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        P0 (Cốt lõi Nhóm 4)
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">CodeMind #07</span>
                    </div>

                    <h5 className="text-xs font-bold text-slate-100">
                      feat(#TE22C19): Tích hợp JWT Access Token, Bcrypt Hashing & Phân Quyền
                    </h5>

                    {/* AI Reasoning Box */}
                    <div className="p-2.5 rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-200 text-[11px] leading-relaxed">
                      Phải review gấp vì module Auth là tiền đề cứng H2 cho các phân hệ Code Lab, AI Socratic và Phòng phản biện.
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">High security impact</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Auth & RBAC</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Deep review</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-[9px] font-bold text-white flex items-center justify-center">VH</span>
                        <span>Võ Nhật Huy</span>
                      </div>
                      <span className="text-[10px] text-emerald-400">Ready to Merge</span>
                    </div>
                  </div>

                  {/* Card 3: P1 */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#0f141c] text-white space-y-3 hover:border-slate-600 transition shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        P1
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">rex #21194</span>
                    </div>

                    <h5 className="text-xs font-bold text-slate-100">
                      feat(agents): extend per-run prompt_cache_key to cbe/context
                    </h5>

                    <div className="p-2.5 rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-200 text-[11px] leading-relaxed">
                      Review this early because it can resolve assumptions that may affect nearby PRs and reduce rework.
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Low security risk</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Feature</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Deep review</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-purple-600 text-[9px] font-bold text-white flex items-center justify-center">A</span>
                        <span>@arlopike</span>
                      </div>
                      <span className="text-[10px] text-slate-500">4h ago</span>
                    </div>
                  </div>
                </div>

                {/* CỘT 2: NEXT (All remaining reviews) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Next</h4>
                      <p className="text-[11px] text-slate-500">All remaining reviews</p>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"><AnimatedNumber value={66} key={`next-cnt-${statAnimKey}`} /></span>
                  </div>

                  {/* Card 1: P1 Next */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#0f141c] text-white space-y-3 hover:border-slate-600 transition shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        P1
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">havana #21189</span>
                    </div>

                    <h5 className="text-xs font-bold text-slate-100">
                      fix(dashboard): scope PR details authors by org
                    </h5>

                    <div className="p-2.5 rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-200 text-[11px] leading-relaxed">
                      Keep this visible for async review because it is useful work without an immediate interruption signal.
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Low security risk</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Bug fix</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Standard review</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center">E</span>
                        <span>@ezrapike[bot]</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Yesterday</span>
                    </div>
                  </div>

                  {/* Card 2: P2 Next (Draft / Conflict) */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-[#0f141c] text-white space-y-3 hover:border-slate-600 transition shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        P2
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">silver #21153</span>
                    </div>

                    <h5 className="text-xs font-bold text-slate-100">
                      [codex] Lean path instruction metrics insert
                    </h5>

                    <div className="p-2.5 rounded-lg border border-yellow-400/40 bg-yellow-500/10 text-yellow-200 text-[11px] leading-relaxed">
                      Hold this behind refresh work because draft, conflict, or drift signals would make reviewer attention premature.
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Needs author action</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Low security risk</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-yellow-400">Draft</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center">M</span>
                        <span>@miravale</span>
                      </div>
                      <span className="text-[10px] text-yellow-400 font-bold">Chờ Tác Giả</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* PILLAR 03: UNDERSTAND EACH PR'S IMPACT (Khớp Chuẩn 100% Ảnh 3)         */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          {crPillar === "impact" && (
            <div key={`pillar-impact-${statAnimKey}`} className="space-y-4 animate-tab-slide-down">
              <div className="bg-[#0f141c] text-white p-5 rounded-2xl border border-slate-800 shadow-md">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-[#ff5722]">03</span>
                      <span>Understand each PR's impact</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Bóc tách PR theo tầng nghiệp vụ (Stacks & Layers) và đo bán kính ảnh hưởng an ninh thay vì xem file phẳng lộn xộn.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Open
                    </span>
                    <span className="text-slate-300 font-bold">Add teammate invitations with roles</span>
                    <span className="text-slate-500">| acme/web-app #482 · 9 files · Stacks</span>
                  </div>
                </div>
              </div>

              {/* Main Split Inspector: Layers Sidebar + File Diff Viewer */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* CỘT TRÁI (4 COLS): LAYERS & BLAST RADIUS NAVIGATOR */}
                <div className="lg:col-span-4 bg-[#0f141c] text-white rounded-2xl border border-slate-800 p-4 space-y-4 shadow-md">
                  {/* Mode Switch: Layers vs Files */}
                  <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                    <button
                      onClick={() => setImpactViewMode("layers")}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        impactViewMode === "layers" ? "bg-slate-800 text-white font-bold shadow-xs" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Layers size={14} />
                      <span>Layers</span>
                    </button>
                    <button
                      onClick={() => setImpactViewMode("files")}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        impactViewMode === "files" ? "bg-slate-800 text-white font-bold shadow-xs" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <FileText size={14} />
                      <span>Files</span>
                    </button>
                  </div>

                  {/* Sub-Inspectors Navigation */}
                  <div className="space-y-1 text-xs">
                    <button
                      onClick={() => setSelectedImpactTab("overview")}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition ${
                        selectedImpactTab === "overview" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Eye size={14} />
                        <span>Overview</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">Open</span>
                    </button>

                    <button
                      onClick={() => setSelectedImpactTab("security")}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition ${
                        selectedImpactTab === "security" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Activity size={14} className="text-amber-400" />
                        <span>Security blast radius</span>
                      </span>
                      <span className="text-[10px] text-amber-400 font-mono">3 services</span>
                    </button>

                    <button
                      onClick={() => setSelectedImpactTab("architecture")}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition ${
                        selectedImpactTab === "architecture" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Boxes size={14} className="text-blue-400" />
                        <span>Architecture impact</span>
                      </span>
                      <span className="text-[10px] text-blue-400 font-mono">3-Tier OK</span>
                    </button>

                    <button
                      onClick={() => setSelectedImpactTab("verify")}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition ${
                        selectedImpactTab === "verify" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <span>CodeRabbit Verify</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">Passed</span>
                    </button>
                  </div>

                  {/* Stacks Layered Steps */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Các tầng nghiệp vụ (Stacks):
                    </span>

                    <button
                      onClick={() => setSelectedLayerIndex(0)}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        selectedLayerIndex === 0
                          ? "bg-slate-800 border-[#ff5722] text-white"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-white">
                        <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center font-mono">1</span>
                        <span>Add the invitation data model</span>
                      </div>
                      <span className="text-[11px] text-slate-400 ml-7 block mt-0.5">2 files touched</span>
                    </button>

                    <button
                      onClick={() => setSelectedLayerIndex(1)}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        selectedLayerIndex === 1
                          ? "bg-slate-800 border-[#ff5722] text-white"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-white">
                        <span className="w-5 h-5 rounded-full bg-[#ff5722] text-white text-[10px] flex items-center justify-center font-mono">2</span>
                        <span>Add the invitation API and emails</span>
                      </div>
                      <span className="text-[11px] text-slate-400 ml-7 block mt-0.5">3 files touched</span>
                    </button>

                    <button
                      onClick={() => setSelectedLayerIndex(2)}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        selectedLayerIndex === 2
                          ? "bg-slate-800 border-[#ff5722] text-white"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-white">
                        <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center font-mono">3</span>
                        <span>Add UI invitation modal & guards</span>
                      </div>
                      <span className="text-[11px] text-slate-400 ml-7 block mt-0.5">4 files touched</span>
                    </button>
                  </div>
                </div>

                {/* CỘT PHẢI (8 COLS): FILE DIFF VIEWER (Chuẩn 100% Ảnh 3) */}
                <div key={`impact-panel-${selectedLayerIndex}-${selectedImpactTab}`} className="lg:col-span-8 bg-[#0f141c] text-white rounded-2xl border border-slate-800 overflow-hidden shadow-md space-y-4 p-5 animate-tab-slide-down">
                  <div className="border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-white">
                      Add the invitation API and emails
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Endpoints to create, list invitations; token generation; the invitation email; and the admin-only permissions.
                    </p>
                  </div>

                  {/* File Path Header */}
                  <div className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-mono">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">TS</span>
                      <span>src/server/auth/permissions.ts</span>
                    </div>
                    <span className="text-emerald-400 font-bold">+12 -3</span>
                  </div>

                  {/* Code Diff Display (Exact lines from image 3) */}
                  <div className="rounded-xl overflow-hidden border border-slate-800 font-mono text-xs bg-[#0b0f14] p-3 space-y-1">
                    <div className="text-slate-500 text-[11px] py-0.5">20 unmodified lines</div>
                    <div className="text-slate-400 px-2 py-0.5">
                      <span className="text-slate-600 mr-4">21</span>
                      <span className="text-purple-400">return</span> member.role === <span className="text-emerald-300">"ADMIN"</span>
                    </div>
                    <div className="text-slate-400 px-2 py-0.5">
                      <span className="text-slate-600 mr-4">22</span>
                      <span>{"}"}</span>
                    </div>
                    <div className="text-slate-400 px-2 py-0.5">
                      <span className="text-slate-600 mr-4">23</span>
                    </div>
                    <div className="bg-rose-950/40 text-rose-300 px-2 py-0.5 rounded">
                      <span className="text-rose-500 mr-4 font-bold">- 24</span>
                      <span className="text-purple-400">export function</span> <span className="text-blue-300">canRemoveMember</span>(member) {"{"}
                    </div>
                    <div className="bg-rose-950/40 text-rose-300 px-2 py-0.5 rounded">
                      <span className="text-rose-500 mr-4 font-bold">- 25</span>
                      <span className="text-purple-400">  return</span> member.role === <span className="text-emerald-300">"ADMIN"</span>
                    </div>
                    <div className="bg-rose-950/40 text-rose-300 px-2 py-0.5 rounded">
                      <span className="text-rose-500 mr-4 font-bold">- 26</span>
                      <span>{"}"}</span>
                    </div>
                    <div className="bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded">
                      <span className="text-emerald-500 mr-4 font-bold">+ 24</span>
                      <span className="text-purple-400">export function</span> <span className="text-blue-300">canRemoveMember</span>(member, target) {"{"}
                    </div>
                    <div className="bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded">
                      <span className="text-emerald-500 mr-4 font-bold">+ 25</span>
                      <span className="text-purple-400">  if</span> (target.isOwner) <span className="text-purple-400">return</span> <span className="text-amber-300">false</span>;
                    </div>
                    <div className="bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded">
                      <span className="text-emerald-500 mr-4 font-bold">+ 26</span>
                      <span className="text-purple-400">  return</span> member.role === <span className="text-emerald-300">"ADMIN"</span>;
                    </div>
                    <div className="bg-emerald-950/40 text-emerald-300 px-2 py-0.5 rounded">
                      <span className="text-emerald-500 mr-4 font-bold">+ 27</span>
                      <span>{"}"}</span>
                    </div>
                  </div>

                  {/* Impact Insight Card */}
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity size={13} />
                      Security Blast Radius Insight:
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      Thay đổi trong hàm <code className="text-emerald-400 font-mono">canRemoveMember</code> ngăn chặn hành vi Admin xóa Owner của Workspace. Không làm ảnh hưởng tới các router ngoài auth. Bán kính ảnh hưởng bảo mật an toàn (Low Risk).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* PILLAR 04: SECURE YOUR CODEBASE CONTINUALLY (Khớp Chuẩn 100% Ảnh 4)    */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          {crPillar === "security" && (
            <div key={`pillar-security-${statAnimKey}`} className="space-y-4 animate-tab-slide-down">
              {/* Real-Time Health Header Card */}
              <div className="bg-[#0f141c] text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                      REAL-TIME CODEBASE HEALTH
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">
                      Mostly healthy
                    </h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-radar-dot" />
                      Scanning every PR
                    </span>
                    <span>Last scan now</span>
                    <span className="text-slate-300 font-bold">0 critical</span>
                  </div>
                </div>

                {/* Tri-color Health Bar (Green 46% | Amber 12% | Gray 40%) */}
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full w-[46%]" title="Healthy: 46%" />
                  <div className="bg-amber-400 h-full w-[12%]" title="High: 12%" />
                  <div className="bg-rose-500 h-full w-[2%]" title="Critical: 2%" />
                  <div className="bg-slate-700 h-full w-[40%]" title="Unscanned: 40%" />
                </div>
              </div>

              {/* Main Grid: Interactive Dot Heatmap + Severity Donut Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* CỘT TRÁI (8 COLS): MA TRẬN ĐIỂM SÁNG (HEATMAP DOT MATRIX) */}
                <div className="lg:col-span-8 bg-[#0f141c] text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Codebase Vulnerability Heatmap (Ma Trận Điểm Sáng)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mỗi điểm sáng đại diện cho 1 gói thư viện / module. Nhấp vào điểm vàng để xem chi tiết lỗ hổng CVE.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-400">224 modules</span>
                  </div>

                  {/* 8 Rows x 28 Cols Dot Matrix */}
                  <div className="bg-[#0b0f14] p-4 rounded-xl border border-slate-800/80 overflow-x-auto">
                    <div className="grid grid-cols-28 gap-2 min-w-[500px]">
                      {Array.from({ length: 196 }).map((_, idx) => {
                        const isAxiosDot = idx === 42;
                        const isPyjwtDot = idx === 88;
                        const isCriticalDot = idx === 150;
                        const isFixed = isAxiosDot ? !!fixedVulns["axios"] : isPyjwtDot ? !!fixedVulns["pyjwt"] : false;

                        let colorClass = "bg-emerald-500/80 hover:bg-emerald-400";
                        if (isAxiosDot || isPyjwtDot) {
                          colorClass = isFixed ? "bg-emerald-500/80" : "bg-amber-400 ring-2 ring-amber-400/50 animate-pulse";
                        } else if (isCriticalDot) {
                          colorClass = "bg-rose-500 ring-2 ring-rose-500/50";
                        } else if (idx % 7 === 0) {
                          colorClass = "bg-slate-700/60";
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedVulnDot(idx)}
                            className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${colorClass} ${
                              selectedVulnDot === idx ? "scale-150 ring-2 ring-white" : ""
                            }`}
                            title={`Module #${idx+1}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Vulnerability Tooltip Card (Chuẩn 100% Ảnh 4) */}
                  <div className="bg-[#141b24] p-4 rounded-xl border border-amber-500/30 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                        <span className="text-xs font-bold text-white">Dependency vulnerability</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          High
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">Detected on PR #482</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm font-bold text-white">
                          axios • GHSA-4w2v-q235-vp99
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Cross-Site Request Forgery (CSRF) header leakage during redirects.
                        </p>
                      </div>

                      <button
                        onClick={() => setFixedVulns((prev) => ({ ...prev, axios: true }))}
                        disabled={fixedVulns["axios"]}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs ${
                          fixedVulns["axios"]
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40"
                        }`}
                      >
                        {fixedVulns["axios"] ? "✓ Fix ready (axios@1.7.9)" : "Fix ready (1-Click Patch)"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* CỘT PHẢI (4 COLS): SEVERITY DISTRIBUTION DONUT (Chuẩn 100% Ảnh 4) */}
                <div className="lg:col-span-4 bg-[#0f141c] text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Severity distribution
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      AI Deep Scan and Dependencies
                    </p>
                  </div>

                  {/* Donut Chart SVG */}
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="relative w-44 h-44 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        {/* Circle circumference = 2 * PI * 38 = ~238.76 */}
                        {/* Unscanned: 40% (stroke-dasharray="95.5 238.76") */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#334155" strokeWidth="12" strokeDasharray="95.5 238.76" strokeDashoffset="0" />
                        {/* Healthy: 46% (stroke-dasharray="109.8 238.76") */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#10b981" strokeWidth="12" strokeDasharray="109.8 238.76" strokeDashoffset="-95.5" />
                        {/* High: 12% (stroke-dasharray="28.6 238.76") */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#fbbf24" strokeWidth="12" strokeDasharray="28.6 238.76" strokeDashoffset="-205.3" />
                        {/* Critical: 2% (stroke-dasharray="4.8 238.76") */}
                        <circle cx="50" cy="50" r="38" fill="transparent" stroke="#ef4444" strokeWidth="12" strokeDasharray="4.8 238.76" strokeDashoffset="-233.9" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-bold font-mono text-white">
                          <AnimatedNumber value={1999} key={`findings-${statAnimKey}`} />
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">findings</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend matching Image 4 with Animated Numbers */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-slate-400">Critical</span>
                      <span className="text-white font-bold ml-auto"><AnimatedNumber value={2} suffix="%" key={`c-${statAnimKey}`} /></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-slate-400">High</span>
                      <span className="text-white font-bold ml-auto"><AnimatedNumber value={12} suffix="%" key={`h-${statAnimKey}`} /></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <span className="text-slate-400">Unscanned</span>
                      <span className="text-white font-bold ml-auto"><AnimatedNumber value={40} suffix="%" key={`u-${statAnimKey}`} /></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-400">Healthy</span>
                      <span className="text-white font-bold ml-auto"><AnimatedNumber value={46} suffix="%" key={`hl-${statAnimKey}`} /></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 1: THE REAL INTERACTIVE GITDIAGRAM CANVAS (WITH BRANCH-TREE FLOW ANIMATIONS) */}
      {viewMode === "gitdiagram" && (
        <div key={`mode-gitdiagram-${diagramAnimKey}`} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-tab-slide-down">
          {/* ReactFlow Interactive Graph Canvas (8 Cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 flex flex-col">
            {/* Top Toolbar: Header + Replay Animation Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Boxes size={18} className="text-blue-600" />
                  Sơ đồ Kiến trúc Phân tầng (GitDiagram ReactFlow Canvas)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mô phỏng hiệu ứng phân nhánh sống động: đường ống tự vẽ, node nảy đàn hồi và xung năng lượng truyền dữ liệu.
                </p>
              </div>

              {/* Replay Branch Animation & Subsystem Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setDiagramAnimKey((k) => k + 1)}
                  title="Kích hoạt lại chuyển động vẽ nhánh sơ đồ kiến trúc"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition shadow-2xs cursor-pointer"
                >
                  <RotateCw size={13} className="text-slate-600" />
                  Phát Lại Mô Phỏng Luồng
                </button>

                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                    Campus App
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                    Project WS
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
                    API Platform
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
                    Learning
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Architecture Flow Selector (Branch Filters) */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1 font-mono">
                <Network size={12} className="text-blue-600" />
                Mô phỏng luồng:
              </span>
              {ARCH_FLOWS.map((flow) => {
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
                        ? "bg-white text-slate-900 shadow-xs font-bold ring-1 ring-slate-200"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
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
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 text-xs text-blue-950 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-blue-600 shrink-0 animate-pulse" />
                  <span className="font-semibold">{currentFlow.label}:</span>
                  <span className="text-blue-800">{currentFlow.summary}</span>
                </div>
                <button
                  onClick={() => {
                    setActiveArchFlow("all");
                    setDiagramAnimKey((k) => k + 1);
                  }}
                  className="text-xs font-bold text-blue-700 hover:underline shrink-0 ml-3 cursor-pointer"
                >
                  Xem tất cả luồng →
                </button>
              </div>
            )}

            {/* ReactFlow Canvas Window */}
            <div className="w-full h-[740px] rounded-xl border border-slate-200 overflow-hidden relative bg-slate-50/50">
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
                <Background color="#cbd5e1" gap={20} size={1} />
                <Controls showInteractive={false} className="!bg-white !shadow-sm !border !border-slate-200" />
                <MiniMap
                  nodeColor={(n) => {
                    if (n.type === "containerBox") return "#f1f5f9";
                    if (n.id === "user") return "#3b82f6";
                    if (n.id === "sqlite-db") return "#2563eb";
                    return "#64748b";
                  }}
                  className="!border !border-slate-200 !rounded-lg"
                  zoomable
                  pannable
                />
              </ReactFlow>

              {/* Watermark badge on canvas */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs text-xs font-mono text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>gitdiagram.com/hoaba-clouch/e-learningproject</span>
              </div>
            </div>

            {/* Bottom Guide Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
              <span>Đầy đủ 22 components và 4 subsystem container được định vị chính xác theo cấu trúc GitDiagram.</span>
              <a
                href="https://gitdiagram.com/hoaba-clouch/e-learningproject"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
              >
                gitdiagram.com/hoaba-clouch/e-learningproject
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Right Inspector Panel (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: `${(selectedNode.data as Record<string, string>).containerColor || "#2563eb"}15`,
                    borderColor: `${(selectedNode.data as Record<string, string>).containerColor || "#2563eb"}40`,
                    color: (selectedNode.data as Record<string, string>).containerColor || "#2563eb",
                  }}
                >
                  {(selectedNode.data as Record<string, string>).container || "Component"}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {(selectedNode.data as Record<string, string>).tech}
                </span>
              </div>

              <h3 className="mt-2 text-base font-bold text-slate-900 leading-snug">
                {(selectedNode.data as Record<string, string>).label} {(selectedNode.data as Record<string, string>).subLabel || ""}
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {(selectedNode.data as Record<string, string>).description}
              </p>
            </div>

            {/* File Path Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Đường dẫn tệp tin mã nguồn:
              </div>
              <div className="font-mono text-xs font-bold text-blue-700 truncate">
                {(selectedNode.data as Record<string, string>).filePath}
              </div>
            </div>

            {/* Upstream & Downstream Dependencies */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span>Luồng gọi đến (Upstream):</span>
                <span className="font-mono text-[11px] text-slate-500 truncate max-w-[190px]">
                  {(selectedNode.data as Record<string, string>).upstream}
                </span>
              </div>
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span>Luồng gọi đi (Downstream):</span>
                <span className="font-mono text-[11px] text-slate-500 truncate max-w-[190px]">
                  {(selectedNode.data as Record<string, string>).downstream}
                </span>
              </div>
            </div>

            {/* Understand Anything Q&A Box */}
            <div className="p-3.5 bg-purple-50/70 rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-purple-900">
                <Sparkles size={14} className="text-purple-600" />
                Vấn đáp Thầy Phước (Understand Anything)
              </div>
              <p className="text-purple-950 leading-relaxed">
                {(selectedNode.data as Record<string, string>).defenseQA}
              </p>
            </div>

            {/* Mermaid Preview Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Mã Mermaid.js (Sao chép cho Báo cáo):</span>
                <button
                  onClick={copyMermaidCode}
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Copy size={11} />
                  Copy
                </button>
              </div>
              <div className="rounded-lg bg-slate-950 p-2.5 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-[120px] leading-relaxed border border-slate-800">
                <pre>{`${selectedNode.id}["${(selectedNode.data as Record<string, string>).label}"]`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: VISUAL GIT BRANCH GRAPH (TOPOLOGY & COMMIT INSPECTOR) */}
      {viewMode === "topology" && (
        <div key={`topo-${topoAnimKey}`} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6 animate-tab-slide-down">
          {/* Header & Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GitBranch size={18} className="text-blue-600" />
                Cây Phân Nhánh Git & Giám Sát Commit Trực Quan (GitKraken / Git Graph)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rê chuột (hover) vào từng điểm commit để xem ai commit, commit nội dung gì và số dòng code thay đổi.
              </p>
            </div>

            {/* Member & Branch Filter Controls + Replay Animation */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setTopoAnimKey((k) => k + 1)}
                title="Kích hoạt lại chuyển động vẽ nhánh Git"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition shadow-2xs cursor-pointer"
              >
                <RotateCw size={13} className="text-slate-600" />
                Phát Lại Chuyển Động
              </button>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                <span className="text-[11px] text-slate-500 px-2 flex items-center gap-1">
                  <User size={12} />
                  Thành viên:
                </span>
                <button
                  onClick={() => setMemberFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition text-xs font-semibold ${
                    memberFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tất cả (9)
                </button>
                <button
                  onClick={() => setMemberFilter("Nguyễn Bá Hòa")}
                  className={`px-2.5 py-1 rounded-md transition text-xs font-semibold ${
                    memberFilter === "Nguyễn Bá Hòa" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Nguyễn Bá Hòa (4)
                </button>
                <button
                  onClick={() => setMemberFilter("Võ Nhật Huy")}
                  className={`px-2.5 py-1 rounded-md transition text-xs font-semibold ${
                    memberFilter === "Võ Nhật Huy" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Võ Nhật Huy (2)
                </button>
                <button
                  onClick={() => setMemberFilter("Phan Đình Nghị")}
                  className={`px-2.5 py-1 rounded-md transition text-xs font-semibold ${
                    memberFilter === "Phan Đình Nghị" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Phan Đình Nghị (3)
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                <span className="text-[11px] text-slate-500 px-2 flex items-center gap-1">
                  <GitPullRequest size={12} />
                  Nhánh:
                </span>
                <button
                  onClick={() => setBranchFilter("all")}
                  className={`px-2 py-1 rounded-md transition text-xs ${
                    branchFilter === "all" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setBranchFilter("main")}
                  className={`px-2 py-1 rounded-md transition text-xs ${
                    branchFilter === "main" ? "bg-blue-100 text-blue-800 font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  main
                </button>
                <button
                  onClick={() => setBranchFilter("develop")}
                  className={`px-2 py-1 rounded-md transition text-xs ${
                    branchFilter === "develop" ? "bg-purple-100 text-purple-800 font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  develop
                </button>
                <button
                  onClick={() => setBranchFilter("feature")}
                  className={`px-2 py-1 rounded-md transition text-xs ${
                    branchFilter === "feature" ? "bg-emerald-100 text-emerald-800 font-bold" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  feature/*
                </button>
              </div>
            </div>
          </div>

          {/* Interactive SVG Visual Git Graph with Floating Popover */}
          <div className="relative overflow-x-auto p-4 bg-slate-50/70 rounded-xl border border-slate-200">
            <svg className="w-[1100px] h-[300px]" viewBox="0 0 1100 300">
              <defs>
                <filter id="topoGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <style>{`
                @keyframes topoDrawPath {
                  0% { stroke-dashoffset: 1400; opacity: 0.3; }
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
                  stroke-dasharray: 1400;
                  stroke-dashoffset: 1400;
                  animation: topoDrawPath 1.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }
                .topo-path-develop1 {
                  stroke-dasharray: 1400;
                  stroke-dashoffset: 1400;
                  animation: topoDrawPath 1.5s cubic-bezier(0.4, 0, 0.2, 1) 0.15s forwards;
                }
                .topo-path-develop2 {
                  stroke-dasharray: 1400;
                  stroke-dashoffset: 1400;
                  animation: topoDrawPath 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.75s forwards;
                }
                .topo-path-erd {
                  stroke-dasharray: 1400;
                  stroke-dashoffset: 1400;
                  animation: topoDrawPath 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards;
                }
                .topo-path-auth {
                  stroke-dasharray: 1400;
                  stroke-dashoffset: 1400;
                  animation: topoDrawPath 1.3s cubic-bezier(0.4, 0, 0.2, 1) 0.5s forwards;
                }
                .topo-path-evaluator {
                  stroke-dasharray: 1400;
                  stroke-dashoffset: 1400;
                  animation: topoDrawPath 1.2s cubic-bezier(0.4, 0, 0.2, 1) 0.7s forwards;
                }
              `}</style>

              {/* Lane guides & Labels */}
              <line x1="50" y1="45" x2="1080" y2="45" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
              <text x="15" y="49" fill="#2563eb" fontSize="11" fontFamily="monospace" fontWeight="bold">main</text>

              <line x1="50" y1="110" x2="1080" y2="110" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
              <text x="15" y="114" fill="#9333ea" fontSize="11" fontFamily="monospace" fontWeight="bold">develop</text>

              <line x1="50" y1="175" x2="1080" y2="175" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
              <text x="15" y="179" fill="#16a34a" fontSize="11" fontFamily="monospace" fontWeight="bold">feature/erd</text>

              <line x1="50" y1="240" x2="1080" y2="240" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
              <text x="15" y="244" fill="#d97706" fontSize="11" fontFamily="monospace" fontWeight="bold">feature/auth</text>

              {/* Branch connecting lines (Smooth Bézier curves with drawing animations) */}
              {/* main trunk */}
              <path
                id="topo-main-path"
                className="topo-path-main"
                d="M 50 45 L 800 45 L 1080 45"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
              />

              {/* develop branch split from main (001a4fc) & merge back into v1.0 */}
              <path
                id="topo-dev1-path"
                className="topo-path-develop1"
                d="M 80 45 C 130 45, 150 110, 200 110 L 680 110 C 730 110, 750 45, 800 45"
                fill="none"
                stroke="#9333ea"
                strokeWidth="3"
              />

              {/* develop continuation to v1.2 merge */}
              <path
                id="topo-dev2-path"
                className="topo-path-develop2"
                d="M 680 110 L 960 110 C 1000 110, 1010 45, 1040 45"
                fill="none"
                stroke="#9333ea"
                strokeWidth="3"
              />

              {/* feature/erd branch split from develop & merge back */}
              <path
                id="topo-erd-path"
                className="topo-path-erd"
                d="M 200 110 C 250 110, 270 175, 320 175 C 370 175, 390 110, 440 110"
                fill="none"
                stroke="#16a34a"
                strokeWidth="3"
              />

              {/* feature/auth branch split from develop & merge back */}
              <path
                id="topo-auth-path"
                className="topo-path-auth"
                d="M 440 110 C 490 110, 510 240, 560 240 C 610 240, 630 110, 680 110"
                fill="none"
                stroke="#d97706"
                strokeWidth="3"
              />

              {/* feature/evaluator branch split from develop & merge back */}
              <path
                id="topo-eval-path"
                className="topo-path-evaluator"
                d="M 680 110 C 730 110, 750 175, 920 175 C 960 175, 980 110, 960 110"
                fill="none"
                stroke="#0891b2"
                strokeWidth="3"
              />

              {/* Living Data Pulses (Traveling along Git paths) */}
              <circle r="4" fill="#60a5fa" filter="url(#topoGlow)">
                <animateMotion
                  path="M 50 45 L 800 45 L 1080 45"
                  dur="3.8s"
                  repeatCount="indefinite"
                  begin="1s"
                />
              </circle>
              <circle r="3.5" fill="#c084fc" filter="url(#topoGlow)">
                <animateMotion
                  path="M 80 45 C 130 45, 150 110, 200 110 L 680 110 C 730 110, 750 45, 800 45"
                  dur="4.2s"
                  repeatCount="indefinite"
                  begin="1.2s"
                />
              </circle>
              <circle r="3.5" fill="#4ade80" filter="url(#topoGlow)">
                <animateMotion
                  path="M 200 110 C 250 110, 270 175, 320 175 C 370 175, 390 110, 440 110"
                  dur="3s"
                  repeatCount="indefinite"
                  begin="1.5s"
                />
              </circle>
              <circle r="3.5" fill="#fbbf24" filter="url(#topoGlow)">
                <animateMotion
                  path="M 440 110 C 490 110, 510 240, 560 240 C 610 240, 630 110, 680 110"
                  dur="3.4s"
                  repeatCount="indefinite"
                  begin="1.8s"
                />
              </circle>

              {/* Interactive Commit Dots */}
              {GIT_COMMITS.map((c, idx) => {
                const isFiltered = filteredCommits.some((fc) => fc.id === c.id);
                const isSelected = selectedCommit?.id === c.id;
                const isHovered = hoveredCommit?.id === c.id;

                return (
                  <g
                    key={c.id}
                    className="cursor-pointer transition-all duration-150"
                    opacity={isFiltered ? 1 : 0.2}
                    style={{
                      transformOrigin: `${c.cx}px ${c.cy}px`,
                      animation: `topoPopNode 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.15 + idx * 0.12}s both`,
                    }}
                    onMouseEnter={() => setHoveredCommit(c)}
                    onMouseLeave={() => setHoveredCommit(null)}
                    onClick={() => setSelectedCommit(c)}
                  >
                    {/* Pulsing ring on hover or selected */}
                    {(isSelected || isHovered) && (
                      <circle
                        cx={c.cx}
                        cy={c.cy}
                        r={15}
                        fill="none"
                        stroke={c.branchColor}
                        strokeWidth={3}
                        opacity={0.4}
                        className="animate-pulse"
                      />
                    )}

                    {/* Outer Circle matching branch color */}
                    <circle
                      cx={c.cx}
                      cy={c.cy}
                      r={isSelected ? 9.5 : isHovered ? 9 : 7.5}
                      fill={c.branchColor}
                      stroke="#ffffff"
                      strokeWidth={2.5}
                    />

                    {/* Inner core dot */}
                    <circle cx={c.cx} cy={c.cy} r={2.5} fill="#ffffff" />

                    {/* Clean Short SHA label above dot */}
                    <text
                      x={c.cx}
                      y={c.cy - 12}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="monospace"
                      fontWeight={isSelected ? "bold" : "600"}
                      fill={isSelected ? "#0f172a" : "#475569"}
                      style={{
                        animation: `topoFadeIn 0.35s ease-out ${0.25 + idx * 0.12}s both`,
                      }}
                    >
                      {c.sha}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Interactive Floating Hover Popover Tooltip */}
            {hoveredCommit && (
              <div
                className="absolute z-30 pointer-events-none bg-slate-950/95 text-white backdrop-blur-md p-3.5 rounded-xl shadow-2xl border border-slate-700 w-[320px] text-xs space-y-2.5 animate-fade-in"
                style={{
                  left: Math.min(Math.max(hoveredCommit.cx - 150, 15), 760),
                  top: Math.min(hoveredCommit.cy + 20, 170),
                }}
              >
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
            )}
          </div>

          {/* Selected Commit Detail Inspector Card */}
          {selectedCommit && (
            <div key={`commit-card-${selectedCommit.id}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 animate-tab-slide-down">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-sm shrink-0"
                    style={{ backgroundColor: selectedCommit.author.color }}
                  >
                    {selectedCommit.author.avatar}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{selectedCommit.author.name}</span>
                      <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {selectedCommit.author.role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 font-mono">
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
                  <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    commit {selectedCommit.sha}
                  </span>
                </div>
              </div>

              <div className="text-sm font-semibold text-slate-900 leading-snug">
                {selectedCommit.message}
              </div>

              {/* Modified Files Breakdown */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-500" />
                    Các tệp tin mã nguồn được chỉnh sửa ({selectedCommit.filesChanged.length} files):
                  </span>
                  <span className="font-mono text-[11px] text-emerald-600 font-bold">
                    +{selectedCommit.stats.additions} dòng / -{selectedCommit.stats.deletions} dòng
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  {selectedCommit.filesChanged.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-slate-700">
                      <GitCommit size={13} className="text-blue-600 shrink-0" />
                      <span className="truncate">{file}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Commit History Timeline Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-slate-600" />
              Nhật Ký Commit Theo Dòng Thời Gian (Nhấp chuột để xem vị trí trên cây)
            </h3>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden text-xs">
              {filteredCommits.map((c) => {
                const isSelected = selectedCommit?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCommit(c)}
                    className={`p-3 flex items-center justify-between transition cursor-pointer ${
                      isSelected ? "bg-blue-50/70 border-l-4 border-l-blue-600" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {c.sha}
                      </span>
                      <span className="font-medium text-slate-900 truncate max-w-[380px]">{c.message}</span>
                      <span
                        className="font-mono text-[10px] text-white px-2 py-0.2 rounded font-semibold shrink-0"
                        style={{ backgroundColor: c.branchColor }}
                      >
                        {c.branch}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500 font-mono shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8.5px] text-white"
                          style={{ backgroundColor: c.author.color }}
                        >
                          {c.author.avatar}
                        </span>
                        <span>{c.author.name}</span>
                      </div>
                      <span className="text-emerald-600 font-semibold">
                        +{c.stats.additions} / -{c.stats.deletions}
                      </span>
                      <span className="text-slate-400 text-[11px]">{c.timeAgo}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: MEMBER CONTRIBUTION ANALYTICS (Khớp Chuẩn 100% Ảnh 2 với Hiệu Ứng Thác Nước & Nhảy Số) */}
      {viewMode === "analytics" && (
        <div key={`mode-analytics-${statAnimKey}`} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6 animate-tab-slide-down">
          {/* Header Title & Subtitle */}
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 animate-cascade-1">
              <BarChart3 size={18} className="text-blue-600" />
              Thống kê Đóng góp Nhóm & Tính Liêm chính Mã Nguồn
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 animate-cascade-2">
              Phân bổ số lượng commit, số dòng code đóng góp và kiểm định tính nguyên bản của 3 thành viên theo chuẩn Thầy Nguyễn Phước.
            </p>
          </div>

          {/* 3 Member Contribution Cards (Xuất hiện lần lượt từng card từ trái qua phải) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Nguyễn Bá Hòa (Leader) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 animate-cascade-3 shadow-xs hover:shadow-md transition-all hover:bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Nguyễn Bá Hòa (Leader)</span>
                <span className="text-xs font-bold font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  <AnimatedNumber value={36} suffix="%" key={`hoa-pct-${statAnimKey}`} />
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full animate-bar-grow" style={{ width: "36%" }} />
              </div>
              <div className="text-[11px] text-slate-500 space-y-1 font-mono">
                <div>Commits: <span className="font-bold text-slate-700"><AnimatedNumber value={28} key={`hoa-c-${statAnimKey}`} /></span> commits</div>
                <div>Thêm dòng: <span className="font-bold text-emerald-600">+<AnimatedNumber value={3420} key={`hoa-l-${statAnimKey}`} /></span> dòng</div>
                <div>Nhiệm vụ: Cấu trúc ERD, Router FastAPI, Quản lý Sprint</div>
              </div>
            </div>

            {/* Card 2: Võ Nhật Huy (Frontend/AI) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 animate-cascade-4 shadow-xs hover:shadow-md transition-all hover:bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Võ Nhật Huy (Frontend/AI)</span>
                <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  <AnimatedNumber value={34} suffix="%" key={`huy-pct-${statAnimKey}`} />
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full animate-bar-grow" style={{ width: "34%" }} />
              </div>
              <div className="text-[11px] text-slate-500 space-y-1 font-mono">
                <div>Commits: <span className="font-bold text-slate-700"><AnimatedNumber value={26} key={`huy-c-${statAnimKey}`} /></span> commits</div>
                <div>Thêm dòng: <span className="font-bold text-emerald-600">+<AnimatedNumber value={3180} key={`huy-l-${statAnimKey}`} /></span> dòng</div>
                <div>Nhiệm vụ: Giao diện ReactFlow, Authentication, UI Theme</div>
              </div>
            </div>

            {/* Card 3: Phan Đình Nghị (Backend/DB) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 animate-cascade-5 shadow-xs hover:shadow-md transition-all hover:bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Phan Đình Nghị (Backend/DB)</span>
                <span className="text-xs font-bold font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  <AnimatedNumber value={30} suffix="%" key={`nghi-pct-${statAnimKey}`} />
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full animate-bar-grow" style={{ width: "30%" }} />
              </div>
              <div className="text-[11px] text-slate-500 space-y-1 font-mono">
                <div>Commits: <span className="font-bold text-slate-700"><AnimatedNumber value={23} key={`nghi-c-${statAnimKey}`} /></span> commits</div>
                <div>Thêm dòng: <span className="font-bold text-emerald-600">+<AnimatedNumber value={2850} key={`nghi-l-${statAnimKey}`} /></span> dòng</div>
                <div>Nhiệm vụ: Code Evaluator Sandbox, Unit Tests, Analytics</div>
              </div>
            </div>
          </div>

          {/* AI Anti-Cheating Banner (Xuất hiện sau cùng với các số liệu nhảy thống kê) */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-emerald-50/80 border border-emerald-300/80 space-y-2 animate-cascade-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm animate-cascade-7">
                <ShieldCheck size={18} className="text-emerald-600" />
                <span>Báo cáo Xác thực Liêm chính & Chống Gian lận AI (AI Anti-Cheating)</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-radar-dot" />
                CADENCE ACTIVE
              </span>
            </div>
            <p className="text-xs text-emerald-950 leading-relaxed animate-cascade-8">
              Toàn bộ <span className="font-bold font-mono text-emerald-800"><AnimatedNumber value={77} key={`c77-${statAnimKey}`} /></span> commit trong repo đều có khoảng thời gian ngắt quãng tự nhiên (Cadence Variance: <span className="font-bold font-mono text-emerald-800"><AnimatedNumber value={4.8} decimals={1} suffix="h" key={`cv-${statAnimKey}`} /></span>), không có hiện tượng nạp hàng loạt file mã nguồn trong 1 giây (Bulk AI Dump). Tỷ lệ commit kèm mã task Kanban đạt <span className="font-bold font-mono text-emerald-800"><AnimatedNumber value={100} suffix="%" key={`cr-${statAnimKey}`} /></span>.
            </p>
          </div>
        </div>
      )}

      {/* MODE 4: GIT FLOW & REPO SUBMISSION STANDARDS */}
      {viewMode === "gitflow" && (
        <div key="mode-gitflow" className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6 animate-tab-slide-down">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers size={18} className="text-blue-600" />
              Quy chuẩn Chu trình Vận hành Git Flow & Nộp Bài
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chu trình 6 bước khép kín từ nhận task Kanban đến khi sinh viên nộp bài qua URL GitHub cho Giảng viên review.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
                Nhận Task trên Kanban
              </div>
              <p className="text-xs text-slate-600">
                Sinh viên chọn task từ cột To Do, kiểm tra task cha đã Done để mở khóa phụ thuộc.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                Tạo Nhánh feature/*
              </div>
              <p className="text-xs text-slate-600">
                Tách nhánh từ develop theo cú pháp: <code className="bg-slate-200 px-1 rounded">feature/TASK-ID_ten-task</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">3</span>
                Commit Kèm Mã Task
              </div>
              <p className="text-xs text-slate-600">
                Mỗi commit tuân thủ định dạng: <code className="bg-slate-200 px-1 rounded">feat(#TASK-XX): mo ta chi tiet</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">4</span>
                Chạy Kiểm thử Tự động
              </div>
              <p className="text-xs text-slate-600">
                Code Evaluator Sandbox chạy 5 test cases ẩn và kiểm tra không có lỗi biên dịch trước khi push.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">5</span>
                Tạo Pull Request
              </div>
              <p className="text-xs text-slate-600">
                Mở PR hợp nhất vào nhánh develop, yêu cầu tối thiểu 1 thành viên review và approve.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">6</span>
                Nộp Bài & Thẩm định AI
              </div>
              <p className="text-xs text-slate-600">
                Dán URL GitHub vào hệ thống, tự động phân tích commit cadence và sinh bộ câu hỏi vấn đáp cho Giảng viên.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Liên Kết & Đồng Bộ GitHub Repo */}
      {showRepoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GitFork size={18} className="text-blue-600" />
                  Liên Kết & Đồng Bộ Repo GitHub
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý kho mã nguồn và cấu hình nhánh đồng bộ trực tiếp cho dự án CodeMind.
                </p>
              </div>
              <button
                onClick={() => setShowRepoModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Đường dẫn Kho lưu trữ (GitHub Repository URL):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Đã Kết Nối
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nhánh nộp bài & đồng bộ chính (Target Branch):
                </label>
                <select
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="main">main (Production Release - Sprint 4)</option>
                  <option value="develop">develop (Integration Branch - Sprint 2)</option>
                  <option value="feature/erd">feature/erd (Sprint 1 Database 8 Tables)</option>
                  <option value="feature/auth">feature/auth (Sprint 2 JWT Authentication)</option>
                  <option value="feature/sandbox">feature/sandbox (Sprint 3 Docker Runner)</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-lg text-blue-900 space-y-1.5 text-xs">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <ShieldCheck size={14} />
                  Trạng thái liên kết tự động:
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-blue-800">
                  <li>Tự động lấy commit history và ánh xạ sang <strong>Cây phân nhánh DAG (GitKraken)</strong>.</li>
                  <li>Tự động quét Pull Request qua <strong>CodeRabbit AI Senior Reviewer</strong>.</li>
                  <li>Tự động kiểm định liêm chính AI và nhịp độ đóng góp giữa 3 thành viên nhóm.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
              >
                <FolderGit2 size={13} />
                Xem trên GitHub
              </a>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRepoModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={() => setShowRepoModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-xs cursor-pointer"
                >
                  Lưu & Đồng Bộ Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
