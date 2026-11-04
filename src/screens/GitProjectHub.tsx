import { useState, useMemo } from "react";
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
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";

interface GitDiagramNodeItem {
  id: string;
  label: string;
  subLabel?: string;
  container: "Campus App" | "API Platform" | "Project Workspace" | "Learning Services" | "Storage" | "Actor";
  containerColor: string;
  x: number;
  y: number;
  width: number;
  height: number;
  filePath: string;
  description: string;
  tech: string;
  upstream: string[];
  downstream: string[];
  defenseQA: string;
  isCylinder?: boolean;
  isCircle?: boolean;
}

const EXACT_GITDIAGRAM_NODES: GitDiagramNodeItem[] = [
  // 1. Actor
  {
    id: "user",
    label: "Campus user",
    container: "Actor",
    containerColor: "#2563eb",
    x: 375,
    y: 35,
    width: 65,
    height: 65,
    isCircle: true,
    filePath: "End-user Actor (Sinh viên / Giảng viên / Admin)",
    description: "Người dùng hệ thống truy cập nền tảng qua trình duyệt web.",
    tech: "End-user",
    upstream: [],
    downstream: ["app-shell"],
    defenseQA: "Hệ thống hỗ trợ những vai trò người dùng nào? Đáp: Student, Instructor, và Admin với RBAC.",
  },

  // 2. Campus App (Frontend UI)
  {
    id: "app-shell",
    label: "App shell",
    subLabel: "[App.tsx]",
    container: "Campus App",
    containerColor: "#2563eb",
    x: 335,
    y: 125,
    width: 100,
    height: 44,
    filePath: "src/App.tsx",
    description: "Khung ứng dụng gốc, điều phối routing giữa các màn hình, theme nền và session vai trò.",
    tech: "React 19 Core",
    upstream: ["user"],
    downstream: ["login", "student-dash", "learning-ws", "tech-reels", "profile", "xp-shop", "admin-dash", "git-hub", "kanban-board", "instructor-panel"],
    defenseQA: "Kiến trúc SPA này xử lý phân quyền phía client ra sao? Đáp: renderScreen() switch-case dựa trên state role và screen hiện tại.",
  },
  {
    id: "login",
    label: "Login",
    subLabel: "[LoginScreen.tsx]",
    container: "Campus App",
    containerColor: "#2563eb",
    x: 195,
    y: 205,
    width: 85,
    height: 38,
    filePath: "src/screens/LoginScreen.tsx",
    description: "Màn hình đăng nhập bảo mật, chuyển đổi nhanh giữa 3 tài khoản demo.",
    tech: "React Component",
    upstream: ["app-shell"],
    downstream: [],
    defenseQA: "Mật khẩu người dùng được truyền qua kênh nào? Đáp: HTTPS POST payload kèm băm Bcrypt trên server.",
  },
  {
    id: "student-dash",
    label: "Student dashboard",
    subLabel: "[StudentDashboard.tsx]",
    container: "Campus App",
    containerColor: "#2563eb",
    x: 295,
    y: 205,
    width: 95,
    height: 38,
    filePath: "src/screens/StudentDashboard.tsx",
    description: "Bảng tổng quan tiến độ học viên, chuỗi streak học tập và nhiệm vụ cần nộp.",
    tech: "React Component",
    upstream: ["app-shell"],
    downstream: [],
    defenseQA: "Dữ liệu tiến độ được đồng bộ từ đâu? Đáp: Tổng hợp từ CSDL submissions và task hoàn thành.",
  },
  {
    id: "learning-ws",
    label: "Learning workspace",
    subLabel: "[LearningWorkspace.tsx]",
    container: "Campus App",
    containerColor: "#2563eb",
    x: 405,
    y: 205,
    width: 100,
    height: 38,
    filePath: "src/screens/LearningWorkspace.tsx",
    description: "Không gian học tập tương tác: Bài đọc, Mindmap @xyflow, và Code Lab thực thi cô lập.",
    tech: "Monaco + @xyflow",
    upstream: ["app-shell"],
    downstream: ["api-client"],
    defenseQA: "Code Lab thực thi mã như thế nào? Đáp: Gửi payload code qua API client để container Docker chạy cô lập.",
  },
  {
    id: "api-client",
    label: "API client",
    subLabel: "[api.ts]",
    container: "Campus App",
    containerColor: "#2563eb",
    x: 405,
    y: 275,
    width: 100,
    height: 36,
    filePath: "src/api.ts",
    description: "Module HTTP Client (Axios/Fetch) giao tiếp với API Platform qua REST API chuẩn UTC ISO-8601.",
    tech: "TypeScript API Client",
    upstream: ["learning-ws"],
    downstream: ["api-startup"],
    defenseQA: "Khi token hết hạn xử lý ra sao? Đáp: Axios interceptor bắt mã 401 tự động refresh token trong HttpOnly cookie.",
  },
  {
    id: "tech-reels",
    label: "Tech reels",
    subLabel: "[TechReels.tsx]",
    container: "Campus App",
    containerColor: "#2563eb",
    x: 520,
    y: 205,
    width: 80,
    height: 38,
    filePath: "src/screens/TechReels.tsx",
    description: "Video ngắn tóm tắt kiến thức lập trình thực chiến.",
    tech: "React Component",
    upstream: ["app-shell"],
    downstream: [],
    defenseQA: "Tính năng này đóng vai trò gì trong đồ án? Đáp: Microlearning tăng hứng thú học tập cho sinh viên.",
  },
  {
    id: "profile",
    label: "Student profile",
    subLabel: "[StudentProfile.tsx]",
    container: "Campus App",
    containerColor: "#2563eb",
    x: 615,
    y: 205,
    width: 90,
    height: 38,
    filePath: "src/screens/StudentProfile.tsx",
    description: "Hồ sơ cá nhân sinh viên, chứng nhận SHA-256 và khung badge vinh danh.",
    tech: "React Component",
    upstream: ["app-shell"],
    downstream: [],
    defenseQA: "Chứng nhận tự sửa lỗi SHA-256 lưu trữ gì? Đáp: Mã băm phiên tự sửa test case không cần giải hộ.",
  },
  {
    id: "xp-shop",
    label: "XP shop",
    subLabel: "[XPShop.tsx]",
    container: "Campus App",
    containerColor: "#2563eb",
    x: 720,
    y: 205,
    width: 75,
    height: 38,
    filePath: "src/screens/XPShop.tsx",
    description: "Cửa hàng đổi điểm kinh nghiệm lấy giao diện, mascot AI và skin chat.",
    tech: "Gamification",
    upstream: ["app-shell"],
    downstream: [],
    defenseQA: "Điểm XP được tính như thế nào? Đáp: Dựa trên điểm hoàn thành bài tập và độ dài streak.",
  },
  {
    id: "admin-dash",
    label: "Admin dashboard",
    subLabel: "[AdminDashboard.tsx]",
    container: "Campus App",
    containerColor: "#2563eb",
    x: 810,
    y: 205,
    width: 95,
    height: 38,
    filePath: "src/screens/AdminDashboard.tsx",
    description: "Trang quản trị hệ thống, giám sát tài nguyên và phân quyền người dùng.",
    tech: "Admin Portal",
    upstream: ["app-shell"],
    downstream: [],
    defenseQA: "Phân quyền admin được bảo vệ thế nào? Đáp: Middleware get_current_active_admin xác thực vai trò admin.",
  },

  // 3. API Platform (Backend FastAPI)
  {
    id: "api-startup",
    label: "API startup",
    subLabel: "[main.py]",
    container: "API Platform",
    containerColor: "#f43f5e",
    x: 585,
    y: 385,
    width: 95,
    height: 38,
    filePath: "backend/app/main.py",
    description: "Điểm khởi chạy ứng dụng FastAPI, cấu hình CORS, middleware thời gian UTC và mount router.",
    tech: "FastAPI Engine",
    upstream: ["api-client"],
    downstream: ["v1-router"],
    defenseQA: "Tại sao chọn FastAPI? Đáp: Tốc độ cao với ASGI uvloop, tự động sinh Swagger docs và hỗ trợ AsyncIO.",
  },
  {
    id: "v1-router",
    label: "V1 router",
    subLabel: "[router.py]",
    container: "API Platform",
    containerColor: "#f43f5e",
    x: 615,
    y: 450,
    width: 90,
    height: 38,
    filePath: "backend/app/api/v1/router.py",
    description: "Bộ điều phối router trung tâm v1, phân bổ các endpoint auth, kanban, lms, ai, submissions.",
    tech: "APIRouter",
    upstream: ["api-startup"],
    downstream: ["auth", "instructor-apis", "kanban-apis", "learning-apis", "submissions", "ai-apis"],
    defenseQA: "Quy chuẩn versioning API như thế nào? Đáp: Tiền tố /api/v1/ đảm bảo tính tương thích ngược.",
  },
  {
    id: "auth",
    label: "Authentication",
    subLabel: "[auth.py]",
    container: "API Platform",
    containerColor: "#f43f5e",
    x: 645,
    y: 520,
    width: 95,
    height: 38,
    filePath: "backend/app/api/v1/endpoints/auth.py",
    description: "Endpoints xử lý /login, /refresh, /logout và cấp phát Access Token JWT.",
    tech: "OAuth2 / JWT",
    upstream: ["v1-router"],
    downstream: ["auth-deps"],
    defenseQA: "Access token hết hạn sau bao lâu? Đáp: 15 phút, kết hợp Refresh Token 7 ngày trong HttpOnly Cookie.",
  },
  {
    id: "auth-deps",
    label: "Auth dependencies",
    subLabel: "[deps.py]",
    container: "API Platform",
    containerColor: "#f43f5e",
    x: 645,
    y: 585,
    width: 105,
    height: 38,
    filePath: "backend/app/api/deps.py",
    description: "Dependency injection get_current_user giải mã token và kiểm tra quyền RBAC.",
    tech: "FastAPI Depends",
    upstream: ["auth"],
    downstream: ["token-utils"],
    defenseQA: "Hàm get_current_user xử lý lỗi gì nếu token giả mạo? Đáp: Ném HTTPException(401 Unauthorized).",
  },
  {
    id: "token-utils",
    label: "Token utilities",
    subLabel: "[security.py]",
    container: "API Platform",
    containerColor: "#f43f5e",
    x: 650,
    y: 650,
    width: 95,
    height: 38,
    filePath: "backend/app/core/security.py",
    description: "Hàm băm mật khẩu Bcrypt và encode/decode JWT token với timestamp UTC ISO-8601.",
    tech: "Passlib + Python-Jose",
    upstream: ["auth-deps"],
    downstream: [],
    defenseQA: "Tại sao dùng datetime.now(timezone.utc)? Đáp: Chuẩn H4 Thầy Phước, tránh lỗi naive datetime.",
  },

  // 4. Project Workspace
  {
    id: "git-hub",
    label: "Git project hub",
    subLabel: "[GitProjectHub.tsx]",
    container: "Project Workspace",
    containerColor: "#16a34a",
    x: 35,
    y: 785,
    width: 85,
    height: 38,
    filePath: "src/screens/GitProjectHub.tsx",
    description: "Trung tâm quản lý mã nguồn Git, cây nhánh Metro-line, GitDiagram và kiểm toán liêm chính AI.",
    tech: "GitGraph + Diagram",
    upstream: ["app-shell"],
    downstream: [],
    defenseQA: "Module này đem lại giá trị gì? Đáp: Trực quan hóa cây Git, phát hiện gian lận và sinh câu hỏi phản biện.",
  },
  {
    id: "kanban-board",
    label: "Kanban board",
    subLabel: "[KanbanBoard.tsx]",
    container: "Project Workspace",
    containerColor: "#16a34a",
    x: 135,
    y: 785,
    width: 85,
    height: 38,
    filePath: "src/screens/KanbanBoard.tsx",
    description: "Bảng quản lý tiến độ 72 tasks 4 Sprints, khóa phụ thuộc task cha-con và tính điểm DoD.",
    tech: "Kanban Board",
    upstream: ["app-shell"],
    downstream: ["task-csv"],
    defenseQA: "Cơ chế khóa phụ thuộc hoạt động ra sao? Đáp: Task con bị disabled và hiện ổ khóa nếu task cha chưa Done.",
  },
  {
    id: "task-csv",
    label: "Task CSV manager",
    subLabel: "[TaskCsvModal.tsx]",
    container: "Project Workspace",
    containerColor: "#16a34a",
    x: 135,
    y: 845,
    width: 90,
    height: 32,
    filePath: "src/components/TaskCsvManagerModal.tsx",
    description: "Trình import/export dữ liệu task chuẩn 8 cột theo mẫu file Excel của Thầy Phước.",
    tech: "CSV / Excel Parser",
    upstream: ["kanban-board"],
    downstream: [],
    defenseQA: "Xử lý cột Sprint trống như thế nào? Đáp: Tự động tính = ceil(Ngày / ngày_mỗi_sprint).",
  },
  {
    id: "instructor-panel",
    label: "Instructor panel",
    subLabel: "[InstructorPanel.tsx]",
    container: "Project Workspace",
    containerColor: "#16a34a",
    x: 235,
    y: 785,
    width: 75,
    height: 38,
    filePath: "src/screens/InstructorPanel.tsx",
    description: "Bảng điều khiển dành riêng cho Giảng viên: nghiệm thu sprint và xem điểm sinh viên.",
    tech: "Instructor Portal",
    upstream: ["app-shell"],
    downstream: [],
    defenseQA: "Giảng viên chấm điểm bằng cách nào? Đáp: Dựa trên rubric 4 tiêu chí và bộ câu hỏi vấn đáp AI.",
  },
  {
    id: "instructor-apis",
    label: "Instructor APIs",
    subLabel: "[instructor.py]",
    container: "Project Workspace",
    containerColor: "#16a34a",
    x: 320,
    y: 785,
    width: 80,
    height: 38,
    filePath: "backend/app/api/v1/endpoints/instructor.py",
    description: "Các API quản lý lớp học, phân công task và duyệt lịch review code 1-on-1.",
    tech: "FastAPI Router",
    upstream: ["v1-router"],
    downstream: ["sqlite-db"],
    defenseQA: "Phân quyền API này có gì đặc biệt? Đáp: Đòi hỏi role === 'instructor'.",
  },
  {
    id: "kanban-apis",
    label: "Kanban APIs",
    subLabel: "[kanban.py]",
    container: "Project Workspace",
    containerColor: "#16a34a",
    x: 410,
    y: 785,
    width: 75,
    height: 38,
    filePath: "backend/app/api/v1/endpoints/kanban.py",
    description: "Các API CRUD task, cập nhật trạng thái kéo thả Kanban và tính điểm Sprint.",
    tech: "FastAPI Router",
    upstream: ["v1-router"],
    downstream: ["sqlite-db"],
    defenseQA: "Cập nhật kéo thả task đồng bộ thế nào? Đáp: PATCH /tasks/{id} cập nhật status và re-calculate sprint score.",
  },

  // 5. Learning Services
  {
    id: "learning-apis",
    label: "Learning APIs",
    subLabel: "[lms.py]",
    container: "Learning Services",
    containerColor: "#d97706",
    x: 535,
    y: 775,
    width: 80,
    height: 38,
    filePath: "backend/app/api/v1/endpoints/lms.py",
    description: "API truy xuất nội dung bài giảng, danh mục khóa học và tiến độ bài học.",
    tech: "FastAPI Router",
    upstream: ["v1-router"],
    downstream: ["code-evaluator", "sqlite-db"],
    defenseQA: "Dữ liệu bài giảng lưu ở đâu? Đáp: Lưu trong bảng courses và lessons trong SQLite/PostgreSQL.",
  },
  {
    id: "submissions",
    label: "Submissions",
    subLabel: "[submissions.py]",
    container: "Learning Services",
    containerColor: "#d97706",
    x: 630,
    y: 775,
    width: 85,
    height: 38,
    filePath: "backend/app/api/v1/endpoints/submissions.py",
    description: "API tiếp nhận bài nộp code, điều phối chấm kiểm thử và lưu lịch sử nộp.",
    tech: "FastAPI Router",
    upstream: ["v1-router"],
    downstream: ["code-evaluator", "sqlite-db"],
    defenseQA: "Lưu lịch sử nộp bài để làm gì? Đáp: Để tạo audit trail chứng minh sinh viên tự tiến bộ.",
  },
  {
    id: "ai-apis",
    label: "AI tutor APIs",
    subLabel: "[ai.py]",
    container: "Learning Services",
    containerColor: "#d97706",
    x: 745,
    y: 775,
    width: 80,
    height: 38,
    filePath: "backend/app/api/v1/endpoints/ai.py",
    description: "API gợi ý Socratic và trả lời câu hỏi hướng dẫn tư duy lập trình.",
    tech: "FastAPI + AI",
    upstream: ["v1-router"],
    downstream: ["analytics", "sqlite-db"],
    defenseQA: "AI có giải bài hộ không? Đáp: Tuyệt đối không, hệ thống giới hạn 3 hint gợi mở theo nguyên tắc Socratic.",
  },
  {
    id: "code-evaluator",
    label: "Code evaluator",
    subLabel: "[code_evaluator.py]",
    container: "Learning Services",
    containerColor: "#d97706",
    x: 625,
    y: 845,
    width: 85,
    height: 38,
    filePath: "backend/app/services/code_evaluator.py",
    description: "Module thẩm định mã nguồn: kiểm thử test cases biên dịch C++ (g++) và Python.",
    tech: "Evaluation Service",
    upstream: ["learning-apis", "submissions"],
    downstream: ["sqlite-db"],
    defenseQA: "Kiểm thử code sinh viên như thế nào? Đáp: So sánh output stdout với 5 test case ẩn.",
  },
  {
    id: "analytics",
    label: "Event analytics",
    subLabel: "[analytics.py]",
    container: "Learning Services",
    containerColor: "#d97706",
    x: 735,
    y: 845,
    width: 85,
    height: 38,
    filePath: "backend/app/services/analytics.py",
    description: "Phân tích sự kiện học tập: tần suất gõ code, số lần hỏi hint, và tỷ lệ vượt qua bài tập.",
    tech: "Analytics Service",
    upstream: ["ai-apis"],
    downstream: ["sqlite-db"],
    defenseQA: "Dữ liệu analytics phục vụ điều gì? Đáp: Cung cấp bằng chứng học tập cho Thầy Phước.",
  },

  // 6. Database Storage
  {
    id: "sqlite-db",
    label: "SQLite database",
    subLabel: "[database.py]",
    container: "Storage",
    containerColor: "#2563eb",
    x: 435,
    y: 955,
    width: 95,
    height: 48,
    isCylinder: true,
    filePath: "backend/app/core/database.py",
    description: "CSDL quan hệ lưu trữ dữ liệu tập trung với 8 bảng 3NF: Users, Tasks, Sprints, Submissions.",
    tech: "SQLAlchemy ORM",
    upstream: ["instructor-apis", "kanban-apis", "learning-apis", "submissions", "ai-apis", "code-evaluator", "analytics"],
    downstream: [],
    defenseQA: "Tại sao dùng SQLite cho dev? Đáp: Nhẹ, không cần cài server riêng, sẵn sàng chuyển Postgres qua biến môi trường.",
  },
];

export default function GitProjectHub() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("learning-ws");
  const [viewMode, setViewMode] = useState<"gitdiagram" | "topology" | "analytics" | "gitflow">("gitdiagram");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copiedMermaid, setCopiedMermaid] = useState<boolean>(false);

  const selectedNode = useMemo(() => {
    return EXACT_GITDIAGRAM_NODES.find((n) => n.id === selectedNodeId) ?? EXACT_GITDIAGRAM_NODES[4];
  }, [selectedNodeId]);

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
        ai_apis -->|tracks events| analytics["Event analytics\\n[analytics.py]"]
    end

    db[("SQLite database\\n[database.py]")]
    inst_apis -->|accesses| db
    kanban_apis -->|accesses| db
    learning_apis -->|accesses| db
    submissions -->|accesses| db
    ai_apis -->|queries| db
    code_evaluator -->|accesses| db
    analytics -->|reads and writes| db`;

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
              Phân hệ 2 • Sơ đồ Kiến trúc Chuẩn GitDiagram.com
            </span>
            <span className="text-xs text-slate-500 font-medium">hoaba-clouch/e-learningproject</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Sơ đồ Kiến trúc Hệ thống (GitDiagram)
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-4xl">
            Tái hiện trực quan 100% sơ đồ cấu trúc phân tầng từ <strong>gitdiagram.com/hoaba-clouch/e-learningproject</strong>: Campus App, API Platform, Project Workspace, Learning Services và SQLite Database.
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
            Sơ đồ Chuẩn GitDiagram (System Map)
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

      {/* MODE 1: EXACT GITDIAGRAM INTERACTIVE SVG CANVAS */}
      {viewMode === "gitdiagram" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Visual SVG Diagram Canvas (8 Cols) */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Boxes size={18} className="text-blue-600" />
                  Sơ đồ Kiến trúc Trực quan (gitdiagram.com Layout)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhấp vào từng thành phần để xem mã nguồn chi tiết, các luồng kết nối và câu hỏi phản biện Thầy Phước.
                </p>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-slate-600">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                  className="p-1.5 hover:bg-white rounded transition"
                  title="Phóng to"
                >
                  <ZoomIn size={14} />
                </button>
                <span className="text-[11px] font-mono px-1 font-semibold">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
                  className="p-1.5 hover:bg-white rounded transition"
                  title="Thu nhỏ"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 hover:bg-white rounded transition text-blue-600"
                  title="Về ban đầu"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Scrollable Diagram Canvas */}
            <div className="w-full h-[620px] rounded-xl border border-slate-200 overflow-auto bg-[#faf8ff] p-4 relative shadow-inner">
              <div
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "top left",
                  transition: "transform 0.15s ease-out",
                  width: "980px",
                  height: "1050px",
                }}
                className="relative select-none"
              >
                <svg width="980" height="1050" className="absolute inset-0 pointer-events-none">
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                    </marker>
                  </defs>

                  {/* 1. Arrow: user -> app_shell */}
                  <line x1="407" y1="100" x2="385" y2="125" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <text x="398" y="115" fontSize="9" fill="#475569" fontWeight="bold">uses</text>

                  {/* 2. Arrows: app_shell -> 7 frontend views */}
                  <path d="M 350 169 L 237 205" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="270" y="185" fontSize="8" fill="#64748b">renders</text>

                  <path d="M 370 169 L 342 205" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="345" y="188" fontSize="8" fill="#64748b">renders</text>

                  <path d="M 390 169 L 440 205" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="420" y="188" fontSize="8" fill="#64748b">renders</text>

                  <path d="M 410 169 L 550 205" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="495" y="188" fontSize="8" fill="#64748b">renders</text>

                  <path d="M 425 169 L 650 205" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="590" y="188" fontSize="8" fill="#64748b">renders</text>

                  <path d="M 435 160 L 750 205" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="690" y="188" fontSize="8" fill="#64748b">renders</text>

                  <path d="M 435 150 L 845 205" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="790" y="188" fontSize="8" fill="#64748b">renders</text>

                  {/* 3. Arrow: learning_ws -> api_client */}
                  <line x1="455" y1="243" x2="455" y2="275" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <text x="460" y="262" fontSize="8" fill="#64748b">imports</text>

                  {/* 4. Arrow: api_client -> API startup (HTTP API) */}
                  <path d="M 505 293 C 580 293, 620 330, 625 385" stroke="#2563eb" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow)" fill="none" />
                  <text x="580" y="325" fontSize="9" fill="#2563eb" fontWeight="bold">HTTP API</text>

                  {/* 5. Arrows inside API Platform */}
                  <line x1="632" y1="423" x2="655" y2="450" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <text x="646" y="440" fontSize="8" fill="#64748b">mounts</text>

                  <line x1="660" y1="488" x2="685" y2="520" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <text x="675" y="508" fontSize="8" fill="#64748b">registers</text>

                  <line x1="692" y1="558" x2="692" y2="585" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <text x="696" y="574" fontSize="8" fill="#64748b">auth dependency</text>

                  <line x1="697" y1="623" x2="697" y2="650" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <text x="702" y="639" fontSize="8" fill="#64748b">checks tokens</text>

                  {/* 6. Long Branch Lines: app_shell -> Project Workspace */}
                  <path d="M 335 145 C 180 145, 120 280, 115 500 L 115 720 C 115 750, 75 760, 75 785" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="90" y="520" fontSize="8" fill="#64748b" transform="rotate(-90 90 520)">renders</text>

                  <path d="M 115 650 C 115 740, 175 750, 175 785" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="145" y="740" fontSize="8" fill="#64748b">renders</text>

                  <path d="M 115 700 C 115 750, 260 760, 265 785" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="215" y="755" fontSize="8" fill="#64748b">renders</text>

                  <line x1="175" y1="823" x2="175" y2="845" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <text x="180" y="836" fontSize="8" fill="#64748b">renders</text>

                  {/* 7. v1_router registers Project Workspace APIs */}
                  <path d="M 615 470 C 450 470, 360 650, 360 785" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="365" y="680" fontSize="8" fill="#64748b">registers</text>

                  <path d="M 615 480 C 490 480, 445 650, 445 785" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="450" y="680" fontSize="8" fill="#64748b">registers</text>

                  {/* 8. v1_router registers Learning Services APIs */}
                  <path d="M 660 488 C 660 580, 575 680, 575 775" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="580" y="695" fontSize="8" fill="#64748b">registers</text>

                  <path d="M 670 488 C 670 600, 672 700, 672 775" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="677" y="695" fontSize="8" fill="#64748b">registers</text>

                  <path d="M 680 488 C 680 580, 785 680, 785 775" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="790" y="695" fontSize="8" fill="#64748b">registers</text>

                  {/* 9. Connections inside Learning Services */}
                  <line x1="575" y1="813" x2="640" y2="845" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <text x="585" y="830" fontSize="8" fill="#64748b">references</text>

                  <line x1="672" y1="813" x2="668" y2="845" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <text x="675" y="830" fontSize="8" fill="#64748b">evaluates code</text>

                  <line x1="785" y1="813" x2="775" y2="845" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  <text x="780" y="830" fontSize="8" fill="#64748b">tracks events</text>

                  {/* 10. Connections down to SQLite Database */}
                  <path d="M 360 823 C 360 900, 450 920, 460 955" stroke="#2563eb" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="375" y="910" fontSize="8" fill="#2563eb">accesses</text>

                  <path d="M 445 823 C 445 890, 470 920, 475 955" stroke="#2563eb" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="448" y="890" fontSize="8" fill="#2563eb">accesses</text>

                  <path d="M 575 813 C 575 890, 490 920, 485 955" stroke="#2563eb" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="540" y="890" fontSize="8" fill="#2563eb">accesses</text>

                  <path d="M 668 883 C 668 930, 520 940, 505 955" stroke="#2563eb" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="620" y="930" fontSize="8" fill="#2563eb">accesses</text>

                  <path d="M 775 883 C 775 940, 530 960, 525 970" stroke="#2563eb" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  <text x="730" y="930" fontSize="8" fill="#2563eb">reads and writes</text>
                </svg>

                {/* SUBGRAPH BOX 1: Campus App */}
                <div
                  className="absolute rounded-xl border border-dashed border-slate-300 bg-white/70 p-3 shadow-xs"
                  style={{ left: "160px", top: "85px", width: "770px", height: "245px" }}
                >
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    Campus App
                  </span>
                </div>

                {/* SUBGRAPH BOX 2: API Platform */}
                <div
                  className="absolute rounded-xl border border-rose-200 bg-rose-50/50 p-3 shadow-xs"
                  style={{ left: "560px", top: "355px", width: "230px", height: "350px" }}
                >
                  <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider font-mono">
                    API Platform
                  </span>
                </div>

                {/* SUBGRAPH BOX 3: Project Workspace */}
                <div
                  className="absolute rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 shadow-xs"
                  style={{ left: "20px", top: "745px", width: "475px", height: "145px" }}
                >
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider font-mono">
                    Project Workspace
                  </span>
                </div>

                {/* SUBGRAPH BOX 4: Learning Services */}
                <div
                  className="absolute rounded-xl border border-amber-200 bg-amber-50/40 p-3 shadow-xs"
                  style={{ left: "515px", top: "745px", width: "330px", height: "145px" }}
                >
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider font-mono">
                    Learning Services
                  </span>
                </div>

                {/* INTERACTIVE NODES */}
                {EXACT_GITDIAGRAM_NODES.map((node) => {
                  const isSelected = node.id === selectedNode.id;

                  if (node.isCircle) {
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`absolute rounded-full flex flex-col items-center justify-center text-center cursor-pointer transition shadow-sm ${
                          isSelected
                            ? "bg-blue-600 text-white ring-4 ring-blue-300 scale-105"
                            : "bg-blue-100 text-blue-900 border-2 border-blue-400 hover:bg-blue-200"
                        }`}
                        style={{
                          left: `${node.x}px`,
                          top: `${node.y}px`,
                          width: `${node.width}px`,
                          height: `${node.height}px`,
                        }}
                      >
                        <span className="text-[10px] font-bold leading-tight">{node.label}</span>
                      </div>
                    );
                  }

                  if (node.isCylinder) {
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`absolute rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition shadow-md border-2 ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-800 ring-4 ring-blue-300 scale-105"
                            : "bg-blue-100/90 text-blue-950 border-blue-500 hover:bg-blue-200"
                        }`}
                        style={{
                          left: `${node.x}px`,
                          top: `${node.y}px`,
                          width: `${node.width}px`,
                          height: `${node.height}px`,
                        }}
                      >
                        <span className="text-[11px] font-bold leading-tight">{node.label}</span>
                        <span className={`text-[9px] font-mono ${isSelected ? "text-blue-100" : "text-blue-700"}`}>
                          {node.subLabel}
                        </span>
                      </div>
                    );
                  }

                  // Default Rect Node
                  const containerStyles: Record<string, string> = {
                    "Campus App": isSelected
                      ? "bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400"
                      : "bg-blue-100 text-blue-950 border-blue-400 hover:bg-blue-200/80",
                    "API Platform": isSelected
                      ? "bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400"
                      : "bg-rose-100 text-rose-950 border-rose-300 hover:bg-rose-200/80",
                    "Project Workspace": isSelected
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400"
                      : "bg-emerald-100 text-emerald-950 border-emerald-300 hover:bg-emerald-200/80",
                    "Learning Services": isSelected
                      ? "bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400"
                      : "bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200/80",
                  };

                  const styleClass = containerStyles[node.container] || "bg-white text-slate-800 border-slate-300";

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`absolute rounded-lg border flex flex-col items-center justify-center text-center px-1 py-0.5 cursor-pointer transition select-none ${styleClass}`}
                      style={{
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        width: `${node.width}px`,
                        height: `${node.height}px`,
                      }}
                    >
                      <span className="text-[10px] font-bold leading-tight truncate w-full px-1">
                        {node.label}
                      </span>
                      {node.subLabel && (
                        <span className="text-[8.5px] font-mono opacity-80 truncate w-full px-1">
                          {node.subLabel}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Gitdiagram Watermark pill at bottom right */}
                <div className="absolute right-4 bottom-3 text-[10px] font-mono text-slate-400 bg-white/80 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                  gitdiagram.com/hoaba-clouch/e-learningproject
                </div>
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="font-medium text-slate-700">
                Sơ đồ phân giải 22 components kết nối qua 5 tầng nghiệp vụ.
              </span>
              <a
                href="https://gitdiagram.com/hoaba-clouch/e-learningproject"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline font-semibold flex items-center gap-1 font-mono text-[11px]"
              >
                https://gitdiagram.com/hoaba-clouch/e-learningproject
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Right Inspector Panel (4 Cols) */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700">
                  {selectedNode.container}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {selectedNode.tech}
                </span>
              </div>

              <h3 className="mt-2 text-base font-bold text-slate-900 leading-snug">
                {selectedNode.label} {selectedNode.subLabel}
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {selectedNode.description}
              </p>
            </div>

            {/* Source Code File Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Tệp tin mã nguồn thực tế:
              </div>
              <div className="font-mono text-xs font-bold text-blue-700 truncate">
                {selectedNode.filePath}
              </div>
            </div>

            {/* Downstream & Upstream Connections */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span>Luồng gọi đến (Upstream):</span>
                <span className="font-mono text-[11px] text-slate-500">
                  {selectedNode.upstream.length > 0 ? selectedNode.upstream.join(", ") : "None (Root)"}
                </span>
              </div>
              <div className="flex items-center justify-between font-semibold text-slate-700">
                <span>Luồng gọi đi (Downstream):</span>
                <span className="font-mono text-[11px] text-slate-500 truncate max-w-[200px]">
                  {selectedNode.downstream.length > 0 ? selectedNode.downstream.join(", ") : "Terminal Node"}
                </span>
              </div>
            </div>

            {/* Understand Anything Q&A Box */}
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-purple-900">
                <Sparkles size={14} className="text-purple-600" />
                Vấn đáp Thầy Phước (Understand Anything)
              </div>
              <div className="text-purple-950 font-medium">
                {selectedNode.defenseQA}
              </div>
            </div>

            {/* Raw Mermaid Snippet */}
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
                <pre>{`${selectedNode.id}["${selectedNode.label}"]`}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: TOPOLOGY, ANALYTICS, GITFLOW (Retained) */}
      {viewMode === "topology" && (
        <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-3">
          <Network size={32} className="mx-auto text-blue-600" />
          <h3 className="text-base font-bold text-slate-900">Cây Phân Nhánh Metro DAG</h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Xem dòng chảy rẽ nhánh và merge commit giữa main, develop, feature/auth và feature/erd.
          </p>
        </div>
      )}

      {viewMode === "analytics" && (
        <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-3">
          <BarChart3 size={32} className="mx-auto text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">Thống kê Nhịp độ Commit</h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Nhịp độ commit rải đều 8 ngày qua của cả 3 thành viên: Minh Anh (36%), Quốc Huy (34%), Hoàng Long (30%).
          </p>
        </div>
      )}

      {viewMode === "gitflow" && (
        <div className="p-8 bg-white rounded-xl border border-slate-200 text-center space-y-3">
          <Layers size={32} className="mx-auto text-purple-600" />
          <h3 className="text-base font-bold text-slate-900">Chu trình Vận hành Git Flow</h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Quy trình 6 bước khép kín từ lúc nhận Task trên Kanban cho đến khi Release Vercel Production.
          </p>
        </div>
      )}
    </div>
  );
}
