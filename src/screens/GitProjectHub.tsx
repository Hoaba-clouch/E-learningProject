import { useState, useMemo, useCallback } from "react";
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
  Bot,
  Wand2,
  HelpCircle,
  Code2,
  AlertCircle,
  FileCheck,
  CheckCheck,
  Search,
} from "lucide-react";

// ─── Custom Group Container Node (for GitDiagram subsystems) ───────────────
function ContainerBoxNode({ data }: NodeProps) {
  const c = data as {
    label: string;
    width: number;
    height: number;
    bgColor: string;
    borderColor: string;
    textColor: string;
  };
  return (
    <div
      style={{ width: c.width, height: c.height }}
      className={`rounded-3xl border-2 pointer-events-none select-none p-4 relative shadow-xs transition-all ${c.bgColor} ${c.borderColor}`}
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
    isCylinder?: boolean;
    isCircle?: boolean;
  };

  if (nodeData.isCircle) {
    return (
      <div
        className={`w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center text-center p-1 shadow-md transition-all cursor-pointer ${
          nodeData.isSelected
            ? "border-blue-600 bg-blue-600 text-white ring-4 ring-blue-500/30 scale-105"
            : "border-blue-400 bg-blue-50 text-blue-900 hover:border-blue-500"
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
        className={`w-[230px] rounded-2xl border-2 px-4 py-3 text-center shadow-md transition-all cursor-pointer ${
          nodeData.isSelected
            ? "border-blue-700 bg-blue-600 text-white ring-4 ring-blue-500/30 scale-105"
            : "border-blue-500 bg-blue-50/90 text-blue-950 hover:bg-blue-100"
        }`}
      >
        <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-blue-600 !border-white" />
        <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-blue-600 !border-white" />
        <Handle type="target" position={Position.Right} className="!w-2.5 !h-2.5 !bg-blue-600 !border-white" />
        <div className="text-xs font-bold leading-tight">{nodeData.label}</div>
        <div className={`text-[10px] font-mono mt-0.5 ${nodeData.isSelected ? "text-blue-100" : "text-blue-700 font-semibold"}`}>
          {nodeData.subLabel}
        </div>
        <div className={`text-[9px] mt-1 font-mono ${nodeData.isSelected ? "text-blue-200" : "text-slate-500"}`}>
          {nodeData.tech}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-[175px] rounded-xl border-2 p-2.5 shadow-sm transition-all cursor-pointer bg-white ${
        nodeData.isSelected
          ? "border-blue-600 ring-4 ring-blue-500/20 shadow-md scale-[1.02]"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
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
    author: { name: "Minh Anh", role: "Leader / Architect", avatar: "MA", color: "#2563eb" },
    branch: "main",
    branchLabel: "main",
    branchColor: "#2563eb",
    message: "Khởi tạo repo cấu trúc 3-tier, Dockerfile & branching model",
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
    author: { name: "Minh Anh", role: "Leader / Architect", avatar: "MA", color: "#2563eb" },
    branch: "develop",
    branchLabel: "develop",
    branchColor: "#9333ea",
    message: "Tách nhánh develop từ main, cấu hình CI/CD và môi trường staging",
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
    author: { name: "Minh Anh", role: "Leader / Architect", avatar: "MA", color: "#2563eb" },
    branch: "feature/erd",
    branchLabel: "feature/erd",
    branchColor: "#16a34a",
    message: "Thiết kế ERD 8 bảng quan hệ 3NF và SQLAlchemy migration models",
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
    author: { name: "Minh Anh", role: "Leader / Architect", avatar: "MA", color: "#2563eb" },
    branch: "develop",
    branchLabel: "develop",
    branchColor: "#9333ea",
    message: "Merge branch 'feature/erd' vào develop (PR #04 hoàn thành Sprint 1)",
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
    author: { name: "Quốc Huy", role: "Fullstack Developer", avatar: "QH", color: "#16a34a" },
    branch: "feature/auth",
    branchLabel: "feature/auth",
    branchColor: "#d97706",
    message: "Xây dựng JWT authentication, hash Passlib Bcrypt 12 rounds và endpoint /login",
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
    author: { name: "Quốc Huy", role: "Fullstack Developer", avatar: "QH", color: "#16a34a" },
    branch: "develop",
    branchLabel: "develop",
    branchColor: "#9333ea",
    message: "Merge branch 'feature/auth' vào develop (PR #07 hoàn thành Sprint 2)",
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
    author: { name: "Minh Anh", role: "Leader / Architect", avatar: "MA", color: "#2563eb" },
    branch: "main",
    branchLabel: "main",
    branchColor: "#2563eb",
    message: "Release v1.0: nghiệm thu Sprint 2 và triển khai lên Production",
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
    author: { name: "Hoàng Long", role: "Backend / Tester", avatar: "HL", color: "#9333ea" },
    branch: "feature/evaluator",
    branchLabel: "feature/evaluator",
    branchColor: "#0891b2",
    message: "Xây dựng sandbox Code Evaluator biên dịch C++ g++ và 5 test case ẩn",
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
    author: { name: "Hoàng Long", role: "Backend / Tester", avatar: "HL", color: "#9333ea" },
    branch: "main",
    branchLabel: "main",
    branchColor: "#2563eb",
    message: "Release v1.2: chốt sơ đồ GitDiagram và triển khai toàn diện hệ thống",
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
    title: "feat(#TASK-14): Thiết kế CSDL 8 bảng 3NF & Ràng buộc Khóa ngoại SQLAlchemy",
    author: { name: "Hoàng Long", role: "Backend / Tester", avatar: "HL", color: "#9333ea" },
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
    title: "feat(#TASK-22): Tích hợp JWT Access Token, Bcrypt Hashing & Phân Quyền Giảng Viên",
    author: { name: "Quốc Huy", role: "Frontend / Fullstack", avatar: "QH", color: "#16a34a" },
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
    title: "feat(#TASK-35): Bộ Chấm Điểm Mã Nguồn Cách Ly Sandbox Docker & Giới Hạn Tài Nguyên",
    author: { name: "Minh Anh", role: "Team Leader / Architect", avatar: "MA", color: "#2563eb" },
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
    title: "feat(#TASK-48): Giao Diện Tech Reels Video Bài Giảng Ngắn & Tiến Trình Xem",
    author: { name: "Quốc Huy", role: "Frontend / Fullstack", avatar: "QH", color: "#16a34a" },
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
    title: "feat(#TASK-56): Cửa Hàng Đổi Thưởng XP Shop & Kiểm Soát Giao Dịch Điểm",
    author: { name: "Hoàng Long", role: "Backend / Tester", avatar: "HL", color: "#9333ea" },
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
    title: "fix(#TASK-62): Khắc Phục Lỗi Cache Lịch Sử Hội Thoại Gia Sư AI Khi Đổi Bài Học",
    author: { name: "Minh Anh", role: "Team Leader / Architect", avatar: "MA", color: "#2563eb" },
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

export default function GitProjectHub() {
  const [viewMode, setViewMode] = useState<"coderabbit" | "topology" | "gitdiagram" | "analytics" | "gitflow">("coderabbit");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("learning-ws");
  const [copiedMermaid, setCopiedMermaid] = useState<boolean>(false);

  // CodeRabbit Interactive State (Nhánh 2.1)
  const [selectedPrId, setSelectedPrId] = useState<string>("pr-04");
  const [prSubTab, setPrSubTab] = useState<"walkthrough" | "diff" | "defense">("diff");
  const [appliedFixes, setAppliedFixes] = useState<Record<string, boolean>>({});
  const [prStatusFilter, setPrStatusFilter] = useState<"all" | "open" | "approved" | "merged">("open");
  const [prMemberFilter, setPrMemberFilter] = useState<string>("all");
  const [prSearchQuery, setPrSearchQuery] = useState<string>("");

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

  const filteredCommits = useMemo(() => {
    return GIT_COMMITS.filter((c) => {
      const matchMember = memberFilter === "all" || c.author.name === memberFilter;
      const matchBranch = branchFilter === "all" || (branchFilter === "feature" ? c.branch.startsWith("feature") : c.branch === branchFilter);
      return matchMember && matchBranch;
    });
  }, [memberFilter, branchFilter]);

  // ReactFlow state
  const [archNodes, , onNodesChange] = useNodesState(INITIAL_ARCH_NODES);
  const [archEdges, , onEdgesChange] = useEdgesState(INITIAL_ARCH_EDGES);

  // Highlight selected card node
  const displayNodes = useMemo(() => {
    return archNodes.map((n) => {
      if (n.type === "containerBox") return n;
      return {
        ...n,
        data: {
          ...n.data,
          isSelected: n.id === selectedNodeId,
        },
      };
    });
  }, [archNodes, selectedNodeId]);

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
            href="https://gitdiagram.com/hoaba-clouch/e-learningproject"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition shadow-xs"
          >
            <ExternalLink size={14} />
            Mở trên GitDiagram.com
          </a>
          <a
            href="https://github.com/Lum1104/Understand-Anything"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            <FolderGit2 size={14} className="text-slate-600" />
            Repo Understand-Anything
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
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
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
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Bình thường
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Không phát hiện hành vi dump code AI gian lận.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Phân bổ Nhóm 3 người</span>
            <UserCheck size={16} className="text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-700 font-mono">36 : 34 : 30</span>
            <span className="text-xs font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
              Cân bằng
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Minh Anh (36%), Quốc Huy (34%), Hoàng Long (30%).</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Cấu trúc GitDiagram</span>
            <Boxes size={16} className="text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700 font-mono">22</span>
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
            onClick={() => setViewMode("coderabbit")}
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
            onClick={() => setViewMode("topology")}
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
            onClick={() => setViewMode("gitdiagram")}
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
            onClick={() => setViewMode("analytics")}
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
            onClick={() => setViewMode("gitflow")}
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

      {/* MODE 0: CODERABBIT AI CODE REVIEW & PR PORTAL (NHÁNH 2.1) - MASTER-DETAIL WORKSPACE */}
      {viewMode === "coderabbit" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* CỘT TRÁI (4 COLS): DANH SÁCH PULL REQUESTS */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3.5">
            {/* Header Danh Sách */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <GitPullRequest size={17} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Danh Sách PRs</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                  {filteredPRs.length}/{MOCK_PULL_REQUESTS.length}
                </span>
              </div>

              {/* Lọc Thành Viên */}
              <select
                value={prMemberFilter}
                onChange={(e) => setPrMemberFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Tất cả tác giả</option>
                <option value="Minh Anh">Minh Anh</option>
                <option value="Quốc Huy">Quốc Huy</option>
                <option value="Hoàng Long">Hoàng Long</option>
              </select>
            </div>

            {/* Ô Tìm Kiếm */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã task, PR, từ khóa..."
                value={prSearchQuery}
                onChange={(e) => setPrSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/60"
              />
              {prSearchQuery && (
                <button
                  onClick={() => setPrSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>

            {/* Tabs Lọc Trạng Thái Nhỏ Gọn */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg text-[11px] font-semibold text-slate-600">
              <button
                onClick={() => setPrStatusFilter("open")}
                className={`flex-1 py-1 rounded-md transition text-center ${
                  prStatusFilter === "open"
                    ? "bg-white text-amber-800 font-bold shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                Cần Duyệt ({MOCK_PULL_REQUESTS.filter((p) => p.status === "open").length})
              </button>
              <button
                onClick={() => setPrStatusFilter("approved")}
                className={`flex-1 py-1 rounded-md transition text-center ${
                  prStatusFilter === "approved"
                    ? "bg-white text-emerald-800 font-bold shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                Đã Duyệt ({MOCK_PULL_REQUESTS.filter((p) => p.status === "approved").length})
              </button>
              <button
                onClick={() => setPrStatusFilter("merged")}
                className={`flex-1 py-1 rounded-md transition text-center ${
                  prStatusFilter === "merged"
                    ? "bg-white text-purple-800 font-bold shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                Đã Merge ({MOCK_PULL_REQUESTS.filter((p) => p.status === "merged").length})
              </button>
              <button
                onClick={() => setPrStatusFilter("all")}
                className={`px-2 py-1 rounded-md transition text-center ${
                  prStatusFilter === "all"
                    ? "bg-white text-slate-900 font-bold shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                Tất cả
              </button>
            </div>

            {/* Danh Sách PR Cuộn Độc Lập */}
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredPRs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                  Không có PR nào khớp bộ lọc.
                </div>
              ) : (
                filteredPRs.map((pr) => {
                  const isSelected = pr.id === selectedPR.id;
                  const hasApplied = Object.keys(appliedFixes).some((id) =>
                    pr.files.some((f) => f.aiComment?.id === id)
                  );

                  return (
                    <button
                      key={pr.id}
                      onClick={() => setSelectedPrId(pr.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all relative flex flex-col gap-2 ${
                        isSelected
                          ? "bg-blue-50/70 border-blue-500 shadow-xs ring-1 ring-blue-500/30 border-l-4 border-l-blue-600"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded text-[11px]">
                            #{pr.prNumber}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {pr.sourceBranch}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            pr.status === "merged"
                              ? "bg-purple-100 text-purple-700"
                              : pr.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {pr.status === "merged" ? "Merged" : pr.status === "approved" ? "Approved" : "Reviewing"}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-relaxed">
                        {pr.title}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center shrink-0"
                            style={{ backgroundColor: pr.author.color }}
                          >
                            {pr.author.avatar}
                          </span>
                          <span className="font-medium text-slate-700">{pr.author.name}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <span className="text-emerald-600 font-bold">+{pr.summary.totalAdditions}</span>
                          <span className="text-rose-500 font-bold">-{pr.summary.totalDeletions}</span>
                        </div>
                      </div>

                      {hasApplied && (
                        <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 self-start">
                          <CheckCheck size={12} />
                          Đã sửa theo AI
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* CỘT PHẢI (8 COLS): WORKSPACE CHI TIẾT REVIEW */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* PR Header Tinh Tế & Hiện Đại (Sáng, Nhẹ, Không Bị Chói Đen) */}
            <div className="p-5 border-b border-slate-200 bg-gradient-to-b from-slate-50/80 to-white space-y-3.5">
              {/* Dòng 1: Tag & Metadata Badges */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-orange-100/70 text-orange-800">
                    <Bot size={13} className="text-orange-600" />
                    CodeRabbit Reviewer
                  </span>
                  <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedPR.sourceBranch} → {selectedPR.targetBranch}
                  </span>
                  <span className="text-xs text-slate-500">• {selectedPR.createdAt}</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                    {selectedPR.summary.filesCount} files
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                    +{selectedPR.summary.totalAdditions}
                  </span>
                  <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold">
                    -{selectedPR.summary.totalDeletions}
                  </span>
                </div>
              </div>

              {/* Dòng 2: Tiêu Đề PR */}
              <h2 className="text-base font-bold text-slate-900 tracking-tight leading-snug flex items-start gap-2">
                <GitPullRequest size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <span>PR #{selectedPR.prNumber}: {selectedPR.title}</span>
              </h2>

              {/* Dòng 3: Tác Giả & Rủi Ro */}
              <div className="flex items-center justify-between text-xs text-slate-600 pt-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                    style={{ backgroundColor: selectedPR.author.color }}
                  >
                    {selectedPR.author.avatar}
                  </span>
                  <span>
                    Tác giả: <strong className="text-slate-900">{selectedPR.author.name}</strong> ({selectedPR.author.role})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Đánh giá rủi ro:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      selectedPR.summary.riskLevel === "high"
                        ? "bg-rose-100 text-rose-800"
                        : selectedPR.summary.riskLevel === "medium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    Mức {selectedPR.summary.riskLevel.toUpperCase()}
                  </span>
                  <span className="text-slate-500">• AI duyệt: <strong>{selectedPR.summary.estimatedReviewTime}</strong></span>
                </div>
              </div>

              {/* Dòng 4: Segmented Sub-Tabs Bar (Chia Đều 3 Cột Hoàn Hảo) */}
              <div className="pt-2 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/60">
                  <button
                    onClick={() => setPrSubTab("diff")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      prSubTab === "diff"
                        ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    <Code2 size={14} className={prSubTab === "diff" ? "text-blue-600" : "text-slate-500"} />
                    <span>Soi Lỗi & 1-Click Fix</span>
                  </button>
                  <button
                    onClick={() => setPrSubTab("walkthrough")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      prSubTab === "walkthrough"
                        ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    <FileText size={14} className={prSubTab === "walkthrough" ? "text-blue-600" : "text-slate-500"} />
                    <span>Bản Tóm Tắt (Walkthrough)</span>
                  </button>
                  <button
                    onClick={() => setPrSubTab("defense")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                      prSubTab === "defense"
                        ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    <HelpCircle size={14} className={prSubTab === "defense" ? "text-blue-600" : "text-slate-500"} />
                    <span>Vấn Đáp Thầy Phước Q&A</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TAB CONTENT 1: LINE-BY-LINE DIFF & 1-CLICK FIX */}
            {prSubTab === "diff" && (
              <div className="p-5 space-y-5">
                {/* Thanh thông báo AST chuẩn căn chỉnh đều */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/90 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <Sparkles size={14} />
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      CodeRabbit quét cây cú pháp AST, tự động phát hiện lỗi logic / bảo mật và bình luận trực tiếp vào dòng mã.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 font-mono text-[11px] text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 whitespace-nowrap self-start sm:self-center shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Trạng thái: 1 phát hiện cần xử lý</span>
                  </div>
                </div>

                {selectedPR.files.map((file, fileIdx) => {
                  const comment = file.aiComment;
                  const isApplied = comment ? !!appliedFixes[comment.id] : false;

                  return (
                    <div key={fileIdx} className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      {/* File Header */}
                      <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-800">
                          <FileText size={15} className="text-slate-500" />
                          <span>{file.filename}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            {file.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="text-emerald-600 font-bold">+{file.additions}</span>
                          <span className="text-rose-600 font-bold">-{file.deletions}</span>
                        </div>
                      </div>

                      {/* Code Diff Lines */}
                      <div className="font-mono text-xs overflow-x-auto bg-[#0d1117] text-slate-200">
                        {file.lines.map((line, lineIdx) => {
                          const isDeletion = line.type === "deletion";
                          const isAddition = line.type === "addition";
                          const isCommentLine = comment && comment.line === line.newLineNumber && isAddition;

                          // If applied, show the fixed line instead of the bad addition
                          const displayedContent = isApplied && isCommentLine ? `    ${comment.suggestedFix.split("\n")[0]}` : line.content;

                          return (
                            <div key={lineIdx}>
                              <div
                                className={`flex items-stretch hover:bg-slate-800/50 transition-colors ${
                                  isDeletion
                                    ? "bg-rose-950/40 text-rose-300"
                                    : isAddition
                                    ? isApplied
                                      ? "bg-emerald-950/40 text-emerald-300"
                                      : "bg-emerald-950/20 text-emerald-200"
                                    : ""
                                }`}
                              >
                                <span className="w-12 py-1 px-2 text-right select-none text-slate-600 bg-slate-900/60 shrink-0 border-r border-slate-800">
                                  {line.oldLineNumber ?? ""}
                                </span>
                                <span className="w-12 py-1 px-2 text-right select-none text-slate-600 bg-slate-900/60 shrink-0 border-r border-slate-800">
                                  {line.newLineNumber ?? ""}
                                </span>
                                <span className="w-6 py-1 text-center select-none shrink-0 font-bold">
                                  {isDeletion ? "-" : isAddition ? "+" : " "}
                                </span>
                                <span className="py-1 px-3 whitespace-pre flex-1 font-mono">
                                  {displayedContent}
                                </span>
                              </div>

                              {/* INLINE CODERABBIT FEEDBACK BOX */}
                              {comment && line.newLineNumber === comment.line && isAddition && (
                                <div className="p-4 bg-slate-900 border-y-2 border-orange-500/80 my-1 mx-2 rounded-lg text-slate-800 font-sans shadow-lg">
                                  <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                                          <Bot size={16} />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-900">CodeRabbit AI</span>
                                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 font-bold">
                                              Senior Bot
                                            </span>
                                            <span
                                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                                comment.type === "security"
                                                  ? "bg-rose-100 text-rose-800"
                                                  : comment.type === "warning"
                                                  ? "bg-amber-100 text-amber-800"
                                                  : "bg-blue-100 text-blue-800"
                                              }`}
                                            >
                                              {comment.type === "security" ? "Lỗ hổng bảo mật" : comment.type === "warning" ? "Cảnh báo kiến trúc" : "Gợi ý Clean Code"}
                                            </span>
                                          </div>
                                          <h4 className="text-xs font-bold text-slate-900 mt-1">
                                            {comment.title}
                                          </h4>
                                        </div>
                                      </div>

                                      {isApplied ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg shadow-xs">
                                          <CheckCheck size={15} />
                                          Đã áp dụng bản sửa
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => handleApplyFix(comment.id)}
                                          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 px-3.5 py-1.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
                                        >
                                          <Wand2 size={14} />
                                          Áp dụng bản sửa (1-Click Fix)
                                        </button>
                                      )}
                                    </div>

                                    <p className="text-xs text-slate-700 leading-relaxed">
                                      {comment.message}
                                    </p>

                                    {/* 1-Click Suggested Code Block */}
                                    <div className="space-y-1.5 bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-200 border border-slate-700">
                                      <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-slate-800">
                                        <span className="flex items-center gap-1.5 text-orange-400 font-bold">
                                          <Code2 size={13} />
                                          Đề xuất thay đổi (Suggested Fix):
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">PEP8 / Clean Code</span>
                                      </div>
                                      <div className="text-emerald-400 whitespace-pre pt-1">
                                        {comment.suggestedFix}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                                      <span className="flex items-center gap-1">
                                        <ShieldCheck size={13} className="text-emerald-600" />
                                        {comment.explanation}
                                      </span>
                                      <span className="text-[10px] text-slate-400">Dòng {comment.line}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT 2: WALKTHROUGH & AUTO-SUMMARY */}
            {prSubTab === "walkthrough" && (
              <div className="p-6 space-y-6">
                <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileCheck size={18} className="text-blue-600" />
                    Tóm Tắt Tổng Quan Thay Đổi (CodeRabbit Walkthrough)
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {selectedPR.summary.overview}
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Các Điểm Sửa Đổi Trọng Yếu:
                  </h3>
                  <div className="space-y-2">
                    {selectedPR.summary.keyPoints.map((point, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-700"
                      >
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Đánh Giá Tác Động Hệ Thống</span>
                      <ShieldCheck size={16} className="text-emerald-600" />
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Không phá vỡ API hiện hữu (Non-breaking)
                    </div>
                    <p className="text-xs text-slate-600">
                      Các bảng CSDL mới độc lập, tương thích 100% với endpoint V1 router.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Khuyến Nghị Trước Khi Merge</span>
                      <AlertCircle size={16} className="text-amber-600" />
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Chạy Alembic Migration & pytest
                    </div>
                    <p className="text-xs text-slate-600">
                      Thực hiện lệnh <code className="bg-slate-100 px-1 rounded">alembic upgrade head</code> trên máy test trước khi gộp vào develop.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: TEACHER DEFENSE Q&A */}
            {prSubTab === "defense" && (
              <div className="p-6 space-y-6">
                <div className="bg-blue-50/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                    <HelpCircle size={16} className="text-blue-700" />
                    Công Cụ Giảng Viên: Bộ Câu Hỏi Chất Vấn Liêm Chính Kỹ Thuật (Thầy Phước)
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Hệ thống tự động phân tích diff của PR này và sinh ra các câu hỏi chuyên sâu. Giảng viên có thể dùng ngay các câu hỏi này khi bảo vệ Sprint để kiểm tra xem sinh viên tự viết mã hay nhờ người khác/AI gian lận.
                  </p>
                </div>

                <div className="space-y-4">
                  {selectedPR.defenseQA.map((qa, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          Q{idx + 1}
                        </span>
                        <div className="space-y-1.5 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 leading-relaxed">
                            {qa.question}
                          </h4>
                          <div className="bg-emerald-50/90 rounded-lg p-3 text-xs text-emerald-900 space-y-1">
                            <span className="font-bold block text-emerald-800">
                              Đáp án chuẩn mong đợi (Expected Answer):
                            </span>
                            <p className="leading-relaxed">{qa.expectedAnswer}</p>
                          </div>
                          <div className="text-[11px] text-slate-500 italic">
                            Tiêu chí chấm điểm: {qa.rubricHint}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 1: THE REAL INTERACTIVE GITDIAGRAM CANVAS */}
      {viewMode === "gitdiagram" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ReactFlow Interactive Graph Canvas (8 Cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Boxes size={18} className="text-blue-600" />
                  Sơ đồ Kiến trúc Phân tầng (GitDiagram ReactFlow Canvas)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cấu trúc chuẩn theo gitdiagram.com: 4 khối container subsystem, liên kết dòng chảy và CSDL trung tâm.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  Campus App
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Project Workspace
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                  API Platform
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                  Learning Services
                </span>
              </div>
            </div>

            {/* ReactFlow Canvas Window */}
            <div className="w-full h-[740px] rounded-xl border border-slate-200 overflow-hidden relative bg-slate-50/50">
              <ReactFlow
                nodes={displayNodes}
                edges={archEdges}
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
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-lg space-y-2 text-xs">
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
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

            {/* Member & Branch Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
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
                  onClick={() => setMemberFilter("Minh Anh")}
                  className={`px-2.5 py-1 rounded-md transition text-xs font-semibold ${
                    memberFilter === "Minh Anh" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Minh Anh (4)
                </button>
                <button
                  onClick={() => setMemberFilter("Quốc Huy")}
                  className={`px-2.5 py-1 rounded-md transition text-xs font-semibold ${
                    memberFilter === "Quốc Huy" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Quốc Huy (2)
                </button>
                <button
                  onClick={() => setMemberFilter("Hoàng Long")}
                  className={`px-2.5 py-1 rounded-md transition text-xs font-semibold ${
                    memberFilter === "Hoàng Long" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Hoàng Long (3)
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
              {/* Lane guides & Labels */}
              <line x1="50" y1="45" x2="1080" y2="45" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
              <text x="15" y="49" fill="#2563eb" fontSize="11" fontFamily="monospace" fontWeight="bold">main</text>

              <line x1="50" y1="110" x2="1080" y2="110" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
              <text x="15" y="114" fill="#9333ea" fontSize="11" fontFamily="monospace" fontWeight="bold">develop</text>

              <line x1="50" y1="175" x2="1080" y2="175" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
              <text x="15" y="179" fill="#16a34a" fontSize="11" fontFamily="monospace" fontWeight="bold">feature/erd</text>

              <line x1="50" y1="240" x2="1080" y2="240" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
              <text x="15" y="244" fill="#d97706" fontSize="11" fontFamily="monospace" fontWeight="bold">feature/auth</text>

              {/* Branch connecting lines (Smooth Bézier curves) */}
              {/* main trunk */}
              <path d="M 50 45 L 800 45 L 1080 45" fill="none" stroke="#2563eb" strokeWidth="3" />

              {/* develop branch split from main (001a4fc) & merge back into v1.0 */}
              <path
                d="M 80 45 C 130 45, 150 110, 200 110 L 680 110 C 730 110, 750 45, 800 45"
                fill="none"
                stroke="#9333ea"
                strokeWidth="3"
              />

              {/* develop continuation to v1.2 merge */}
              <path
                d="M 680 110 L 960 110 C 1000 110, 1010 45, 1040 45"
                fill="none"
                stroke="#9333ea"
                strokeWidth="3"
              />

              {/* feature/erd branch split from develop & merge back */}
              <path
                d="M 200 110 C 250 110, 270 175, 320 175 C 370 175, 390 110, 440 110"
                fill="none"
                stroke="#16a34a"
                strokeWidth="3"
              />

              {/* feature/auth branch split from develop & merge back */}
              <path
                d="M 440 110 C 490 110, 510 240, 560 240 C 610 240, 630 110, 680 110"
                fill="none"
                stroke="#d97706"
                strokeWidth="3"
              />

              {/* feature/evaluator branch split from develop & merge back */}
              <path
                d="M 680 110 C 730 110, 750 175, 920 175 C 960 175, 980 110, 960 110"
                fill="none"
                stroke="#0891b2"
                strokeWidth="3"
              />

              {/* Interactive Commit Dots */}
              {GIT_COMMITS.map((c) => {
                const isFiltered = filteredCommits.some((fc) => fc.id === c.id);
                const isSelected = selectedCommit?.id === c.id;
                const isHovered = hoveredCommit?.id === c.id;

                return (
                  <g
                    key={c.id}
                    className="cursor-pointer transition-all duration-150"
                    opacity={isFiltered ? 1 : 0.2}
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
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

      {/* MODE 3: MEMBER CONTRIBUTION ANALYTICS */}
      {viewMode === "analytics" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600" />
              Thống kê Đóng góp Nhóm & Tính Liêm chính Mã Nguồn
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân bổ số lượng commit, số dòng code đóng góp và kiểm định tính nguyên bản của 3 thành viên theo chuẩn Thầy Nguyễn Phước.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Minh Anh (Leader)</span>
                <span className="text-xs font-bold font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded">36%</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: "36%" }} />
              </div>
              <div className="text-[11px] text-slate-500 space-y-1 font-mono">
                <div>Commits: 28 commits</div>
                <div>Thêm dòng: +3,420 dòng</div>
                <div>Nhiệm vụ: Cấu trúc ERD, Router FastAPI, Quản lý Sprint</div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Quốc Huy (Fullstack)</span>
                <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">34%</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: "34%" }} />
              </div>
              <div className="text-[11px] text-slate-500 space-y-1 font-mono">
                <div>Commits: 26 commits</div>
                <div>Thêm dòng: +3,180 dòng</div>
                <div>Nhiệm vụ: Giao diện ReactFlow, Authentication, UI Theme</div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Hoàng Long (Backend/Tester)</span>
                <span className="text-xs font-bold font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded">30%</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full rounded-full" style={{ width: "30%" }} />
              </div>
              <div className="text-[11px] text-slate-500 space-y-1 font-mono">
                <div>Commits: 23 commits</div>
                <div>Thêm dòng: +2,850 dòng</div>
                <div>Nhiệm vụ: Code Evaluator Sandbox, Unit Tests, Analytics</div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
              <ShieldCheck size={18} className="text-emerald-600" />
              Báo cáo Xác thực Liêm chính & Chống Gian lận AI (AI Anti-Cheating)
            </div>
            <p className="text-xs text-emerald-950 leading-relaxed">
              Toàn bộ 77 commit trong repo đều có khoảng thời gian ngắt quãng tự nhiên (Cadence Variance: 4.8h), không có hiện tượng nạp hàng loạt file mã nguồn trong 1 giây (Bulk AI Dump). Tỷ lệ commit kèm mã task Kanban đạt 100%.
            </p>
          </div>
        </div>
      )}

      {/* MODE 4: GIT FLOW & REPO SUBMISSION STANDARDS */}
      {viewMode === "gitflow" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6">
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
    </div>
  );
}
