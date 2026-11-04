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
      className={`rounded-2xl border-2 pointer-events-none select-none p-3.5 relative shadow-xs transition-all ${c.bgColor} ${c.borderColor}`}
    >
      <div className={`absolute top-2.5 right-4 text-xs font-bold font-mono tracking-wider ${c.textColor}`}>
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
        className={`w-18 h-18 rounded-full border-2 flex flex-col items-center justify-center text-center p-1 shadow-md transition-all cursor-pointer ${
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
        className={`min-w-[190px] rounded-2xl border-2 px-4 py-3 text-center shadow-md transition-all cursor-pointer ${
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
      className={`relative min-w-[155px] max-w-[170px] rounded-xl border-2 p-2.5 shadow-sm transition-all cursor-pointer bg-white ${
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

// ─── GitDiagram Nodes: 4 Containers + 22 Components ─────────────────────────
const INITIAL_ARCH_NODES: Node[] = [
  // 4 Background Containers matching GitDiagram Zones
  {
    id: "group-campus-app",
    type: "containerBox",
    position: { x: 230, y: 90 },
    zIndex: -1,
    selectable: false,
    draggable: false,
    data: {
      label: "Campus App",
      width: 1190,
      height: 295,
      bgColor: "bg-slate-50/70",
      borderColor: "border-slate-300",
      textColor: "text-slate-600",
    },
  },
  {
    id: "group-project-ws",
    type: "containerBox",
    position: { x: 40, y: 440 },
    zIndex: -1,
    selectable: false,
    draggable: false,
    data: {
      label: "Project Workspace",
      width: 850,
      height: 230,
      bgColor: "bg-emerald-50/40",
      borderColor: "border-emerald-300",
      textColor: "text-emerald-700",
    },
  },
  {
    id: "group-api-platform",
    type: "containerBox",
    position: { x: 930, y: 440 },
    zIndex: -1,
    selectable: false,
    draggable: false,
    data: {
      label: "API Platform",
      width: 240,
      height: 420,
      bgColor: "bg-rose-50/40",
      borderColor: "border-rose-300",
      textColor: "text-rose-700",
    },
  },
  {
    id: "group-learning-srv",
    type: "containerBox",
    position: { x: 900, y: 910 },
    zIndex: -1,
    selectable: false,
    draggable: false,
    data: {
      label: "Learning Services",
      width: 520,
      height: 220,
      bgColor: "bg-amber-50/40",
      borderColor: "border-amber-300",
      textColor: "text-amber-700",
    },
  },

  // 1. Actor (Top)
  {
    id: "user",
    type: "cardNode",
    position: { x: 800, y: 15 },
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
    position: { x: 745, y: 115 },
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
    position: { x: 250, y: 205 },
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
    position: { x: 420, y: 205 },
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
    position: { x: 590, y: 205 },
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
    position: { x: 590, y: 295 },
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
    position: { x: 760, y: 205 },
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
    position: { x: 930, y: 205 },
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
    position: { x: 1100, y: 205 },
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
    position: { x: 1270, y: 205 },
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
    position: { x: 60, y: 470 },
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
    position: { x: 230, y: 470 },
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
    position: { x: 230, y: 565 },
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
    position: { x: 400, y: 470 },
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
    position: { x: 570, y: 470 },
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
    position: { x: 740, y: 470 },
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

  // 4. API Platform Subgraph Components (Middle-Right)
  {
    id: "api-startup",
    type: "cardNode",
    position: { x: 965, y: 465 },
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
    position: { x: 965, y: 545 },
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
    position: { x: 965, y: 625 },
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
    position: { x: 965, y: 705 },
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
    position: { x: 965, y: 785 },
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

  // 5. Learning Services Subgraph Components (Bottom-Right)
  {
    id: "learning-apis",
    type: "cardNode",
    position: { x: 920, y: 935 },
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
    position: { x: 1080, y: 935 },
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
    position: { x: 1240, y: 935 },
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
    position: { x: 1000, y: 1025 },
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
    position: { x: 1160, y: 1025 },
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
    position: { x: 670, y: 1180 },
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
  { id: "e-ai-analytics-ref", source: "ai-apis", target: "analytics", type: "smoothstep", label: "references", style: { stroke: "#d97706" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-ai-analytics-track", source: "ai-apis", target: "analytics", type: "smoothstep", label: "tracks events", style: { stroke: "#d97706" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },

  // Backend APIs connecting to Database
  { id: "e-inst-db", source: "instructor-apis", target: "sqlite-db", type: "smoothstep", label: "accesses", style: { stroke: "#2563eb" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-kanban-db", source: "kanban-apis", target: "sqlite-db", type: "smoothstep", label: "accesses", style: { stroke: "#2563eb" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-lms-db", source: "learning-apis", target: "sqlite-db", type: "smoothstep", label: "queries", style: { stroke: "#2563eb" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-sub-db", source: "submissions", target: "sqlite-db", type: "smoothstep", label: "reads and writes", style: { stroke: "#2563eb", strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-ai-db", source: "ai-apis", target: "sqlite-db", type: "smoothstep", label: "accesses", style: { stroke: "#2563eb" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
  { id: "e-analytics-db", source: "analytics", target: "sqlite-db", type: "smoothstep", label: "accesses", style: { stroke: "#2563eb" }, markerEnd: { type: MarkerType.ArrowClosed }, ...edgeLabelOpts },
];

export default function GitProjectHub() {
  const [viewMode, setViewMode] = useState<"gitdiagram" | "topology" | "analytics" | "gitflow">("gitdiagram");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("learning-ws");
  const [copiedMermaid, setCopiedMermaid] = useState<boolean>(false);

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
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 font-mono">
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
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-xs"
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
          <p className="mt-1 text-[11px] text-slate-500">Không phát hiện hành vi dump code AI gian lận.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Phân bổ Nhóm 3 người</span>
            <UserCheck size={16} className="text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-700 font-mono">36 : 34 : 30</span>
            <span className="text-xs font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
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
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
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
            onClick={() => setViewMode("gitdiagram")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              viewMode === "gitdiagram"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Boxes size={15} />
            Sơ đồ Kiến trúc Dự án (GitDiagram Canvas)
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
            Cây Phân Nhánh (Branch Topology)
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
            Thống kê Nhánh & Nhịp độ
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
            <div className="w-full h-[660px] rounded-xl border border-slate-200 overflow-hidden relative bg-slate-50/50">
              <ReactFlow
                nodes={displayNodes}
                edges={archEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
                fitViewOptions={{ padding: 0.12 }}
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

      {/* MODE 2: VISUAL GIT BRANCH GRAPH (TOPOLOGY) */}
      {viewMode === "topology" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GitBranch size={18} className="text-blue-600" />
                Sơ đồ Nhánh Git (GitKraken / Git Graph DAG)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cây phân nhánh trực quan theo quy chuẩn Git Flow: main (production), develop (staging), feature/* (tính năng ca sử dụng).
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> main
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> develop
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> feature/*
              </span>
            </div>
          </div>

          {/* SVG Visual Metro Graph */}
          <div className="overflow-x-auto p-4 bg-slate-50 rounded-xl border border-slate-200">
            <svg className="w-[840px] h-[220px]" viewBox="0 0 840 220">
              {/* Lane guides */}
              <line x1="40" y1="40" x2="800" y2="40" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
              <text x="10" y="44" fill="#64748b" fontSize="10" fontFamily="monospace">main</text>

              <line x1="40" y1="100" x2="800" y2="100" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
              <text x="10" y="104" fill="#64748b" fontSize="10" fontFamily="monospace">develop</text>

              <line x1="40" y1="160" x2="800" y2="160" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
              <text x="10" y="164" fill="#64748b" fontSize="10" fontFamily="monospace">feature/*</text>

              {/* Branch connecting paths */}
              <path d="M 60 40 L 160 40 L 220 100 L 460 100 L 520 40 L 800 40" fill="none" stroke="#2563eb" strokeWidth="3" />
              <path d="M 220 100 L 300 160 L 400 160 L 460 100" fill="none" stroke="#16a34a" strokeWidth="3" />
              <path d="M 220 100 L 640 100 L 700 40" fill="none" stroke="#9333ea" strokeWidth="3" />

              {/* Commit Nodes on Main */}
              <circle cx="60" cy="40" r="7" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              <text x="45" y="25" fill="#1e293b" fontSize="10" fontWeight="bold">001a4fc</text>

              <circle cx="160" cy="40" r="7" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              <text x="145" y="25" fill="#1e293b" fontSize="10" fontWeight="bold">TASK-08</text>

              <circle cx="520" cy="40" r="7" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              <text x="500" y="25" fill="#1e293b" fontSize="10" fontWeight="bold">Merge v1.0</text>

              <circle cx="700" cy="40" r="7" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              <text x="680" y="25" fill="#1e293b" fontSize="10" fontWeight="bold">Release v1.2</text>

              {/* Commit Nodes on Develop */}
              <circle cx="220" cy="100" r="7" fill="#9333ea" stroke="#ffffff" strokeWidth="2" />
              <text x="205" y="85" fill="#1e293b" fontSize="10" fontWeight="bold">dev-init</text>

              <circle cx="460" cy="100" r="7" fill="#9333ea" stroke="#ffffff" strokeWidth="2" />
              <text x="440" y="85" fill="#1e293b" fontSize="10" fontWeight="bold">Sprint 2 Done</text>

              <circle cx="640" cy="100" r="7" fill="#9333ea" stroke="#ffffff" strokeWidth="2" />
              <text x="620" y="85" fill="#1e293b" fontSize="10" fontWeight="bold">Sprint 3 Done</text>

              {/* Commit Nodes on Feature */}
              <circle cx="300" cy="160" r="7" fill="#16a34a" stroke="#ffffff" strokeWidth="2" />
              <text x="280" y="185" fill="#1e293b" fontSize="10" fontWeight="bold">TASK-14 (ERD 8)</text>

              <circle cx="400" cy="160" r="7" fill="#16a34a" stroke="#ffffff" strokeWidth="2" />
              <text x="380" y="185" fill="#1e293b" fontSize="10" fontWeight="bold">TASK-22 (Auth)</text>
            </svg>
          </div>

          {/* Commit History Timeline Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-slate-600" />
              Lịch sử Commit Gắn Liền Với Mã Task Kanban
            </h3>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden text-xs">
              <div className="p-3 bg-white flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    #TASK-14
                  </span>
                  <span className="font-medium text-slate-900">Thiết kế ERD 8 bảng 3NF & Schema SQLAlchemy</span>
                  <span className="font-mono text-slate-400">b579f87</span>
                </div>
                <div className="flex items-center gap-4 text-slate-500 font-mono">
                  <span>Minh Anh (Leader)</span>
                  <span className="text-emerald-600">+340 / -12</span>
                </div>
              </div>

              <div className="p-3 bg-white flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    #TASK-22
                  </span>
                  <span className="font-medium text-slate-900">Tích hợp JWT Authentication & Security Passlib 12 rounds</span>
                  <span className="font-mono text-slate-400">5149fb7</span>
                </div>
                <div className="flex items-center gap-4 text-slate-500 font-mono">
                  <span>Quốc Huy</span>
                  <span className="text-emerald-600">+280 / -5</span>
                </div>
              </div>

              <div className="p-3 bg-white flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    #TASK-31
                  </span>
                  <span className="font-medium text-slate-900">Xây dựng Code Evaluator Sandbox & 5 Test Cases ẩn</span>
                  <span className="font-mono text-slate-400">d4bdc7d</span>
                </div>
                <div className="flex items-center gap-4 text-slate-500 font-mono">
                  <span>Hoàng Long</span>
                  <span className="text-emerald-600">+195 / -8</span>
                </div>
              </div>
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
