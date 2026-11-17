import { useState, useRef, useMemo, useEffect, useLayoutEffect } from "react";
import { useMarloPageEntrance, animateMarloCards, animateMarloRows } from "../utils/marloAnimations";
import MarloTitle from "../components/MarloTitle";
import MarloSegmentedControl from "../components/MarloSegmentedControl";
import type { Screen } from "../App";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  GraduationCap,
  History,
  KeyRound,
  Laptop,
  LayoutDashboard,
  Lock,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Send,
  ServerCog,
  Shield,
  Smartphone,
  Sparkles,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";

type Tab = "overview" | "users" | "classes" | "ai" | "sessions" | "audit";
type UserStatus = "active" | "pending" | "suspended";

interface UserRow {
  name: string;
  role: "Giảng viên" | "Học viên";
  email: string;
  status: UserStatus;
  lastActive: string;
  device: string;
}

interface ClassItem {
  code: string;
  name: string;
  teacher: string;
  students: number;
  progress: number;
  review: number;
  health: "Tốt" | "Ổn định" | "Cần theo dõi";
  room?: string;
}

interface AuditLog {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  type: "user" | "security" | "ai" | "class";
}

const initialUsers: UserRow[] = [
  { name: "Trần Thị B", role: "Giảng viên", email: "ttb@edu.vn", status: "active", lastActive: "Vừa xong", device: "MacBook Pro" },
  { name: "Lê Văn C", role: "Học viên", email: "lvc@student.vn", status: "active", lastActive: "5 phút trước", device: "Windows 11" },
  { name: "Hoàng Ngọc D", role: "Học viên", email: "hnd@student.vn", status: "suspended", lastActive: "3 ngày trước", device: "iPhone 15" },
  { name: "Võ Thị E", role: "Giảng viên", email: "vte@edu.vn", status: "pending", lastActive: "Chưa kích hoạt", device: "Chưa đăng ký" },
  { name: "Nguyễn Minh Khôi", role: "Học viên", email: "nmk@student.vn", status: "active", lastActive: "15 phút trước", device: "Ubuntu Linux" },
  { name: "Đặng Thuỳ Dương", role: "Học viên", email: "dtd@student.vn", status: "active", lastActive: "1 giờ trước", device: "iPad Air" },
];

const initialClasses: ClassItem[] = [
  { code: "CM-OOP-2026-01", name: "Lập trình OOP & Cấu trúc dữ liệu - Nhóm 01", teacher: "Trần Thị B", students: 34, progress: 62, review: 12, health: "Ổn định", room: "Lab A3-201" },
  { code: "CM-OOP-2026-02", name: "Lập trình OOP & Cấu trúc dữ liệu - Nhóm 02", teacher: "Lê Văn C", students: 28, progress: 47, review: 19, health: "Cần theo dõi", room: "Lab A3-204" },
  { code: "CM-DSA-2026-01", name: "Cấu trúc dữ liệu nâng cao & Đồ thị", teacher: "Trần Thị B", students: 41, progress: 71, review: 7, health: "Tốt", room: "Hội trường C1" },
  { code: "CM-WEB-2026-01", name: "Kỹ thuật Web Frontend Hiện đại (React 19)", teacher: "Võ Thị E", students: 38, progress: 85, review: 5, health: "Tốt", room: "Lab B1-102" },
];

const initialAiUsage = [
  { id: "ai-mentor", name: "AI Mentor chat", value: "$128.40", usage: "42K lượt hỏi", requests: 42840, inputTokens: 12840000, outputTokens: 6240000, estimatedCost: 128.4, percent: 72, tone: "bg-blue-500", active: true },
  { id: "ai-review", name: "Review bài tập tự động", value: "$86.10", usage: "318 lượt review", requests: 318, inputTokens: 3720000, outputTokens: 1180000, estimatedCost: 86.1, percent: 58, tone: "bg-emerald-500", active: true },
  { id: "ai-audio", name: "Audio bài đọc (TTS)", value: "$54.30", usage: "1,204 phút đọc", requests: 1204, inputTokens: 940000, outputTokens: 2860000, estimatedCost: 54.3, percent: 36, tone: "bg-violet-500", active: true },
  { id: "ai-summary", name: "Tóm tắt giáo trình AI", value: "$32.15", usage: "860 tài liệu", requests: 860, inputTokens: 1420000, outputTokens: 780000, estimatedCost: 32.15, percent: 24, tone: "bg-amber-500", active: true },
];

const initialAuditLogs: AuditLog[] = [
  { id: "log-1", time: "10:42 Vừa xong", actor: "Admin ADM-01", action: "Duyệt yêu cầu tham gia lớp", target: "Nguyễn Minh Khôi (OOP - Nhóm 01)", type: "user" },
  { id: "log-2", time: "10:15 - 30m trước", actor: "Admin ADM-01", action: "Cập nhật ngân sách AI tối đa", target: "$550.00 / tháng (+10%)", type: "ai" },
  { id: "log-3", time: "09:30 - 1h trước", actor: "System Security", action: "Phát hiện đăng nhập thiết bị mới", target: "Trần Thị B (Windows 11 - Edge)", type: "security" },
  { id: "log-4", time: "Hôm qua 21:00", actor: "Admin ADM-01", action: "Khóa tạm thời tài khoản", target: "Hoàng Ngọc D (Vi phạm nội quy làm bài)", type: "user" },
  { id: "log-5", time: "Hôm qua 18:30", actor: "Admin ADM-01", action: "Tạo lớp học mới", target: "CM-WEB-2026-01 (Kỹ thuật Web Frontend)", type: "class" },
];

const statusStyle: Record<UserStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300",
  pending: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300",
  suspended: "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300",
};

const statusLabel: Record<UserStatus, string> = {
  active: "Hoạt động",
  pending: "Chờ kích hoạt",
  suspended: "Bị khóa",
};

const sectionToTab = (section?: Screen): Tab => {
  switch (section) {
    case "admin-users": return "users";
    case "admin-classes": return "classes";
    case "admin-ai": return "ai";
    case "admin-sessions": return "sessions";
    case "admin-audit": return "audit";
    default: return "overview";
  }
};

const tabToSection = (t: Tab): Screen => {
  switch (t) {
    case "users": return "admin-users";
    case "classes": return "admin-classes";
    case "ai": return "admin-ai";
    case "sessions": return "admin-sessions";
    case "audit": return "admin-audit";
    default: return "admin";
  }
};

interface AdminDashboardProps {
  currentSection?: Screen;
  onNavigateSection?: (s: Screen) => void;
}

export default function AdminDashboard({ currentSection, onNavigateSection }: AdminDashboardProps) {
  const adminRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>(() => sectionToTab(currentSection));

  // Sync tab when currentSection changes from Sidebar click
  useEffect(() => {
    if (currentSection) {
      setTab(sectionToTab(currentSection));
    }
  }, [currentSection]);

  const handleSelectTab = (newTab: Tab) => {
    setTab(newTab);
    onNavigateSection?.(tabToSection(newTab));
  };

  // Core Data States
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [classesList, setClassesList] = useState<ClassItem[]>(initialClasses);
  const [aiServices, setAiServices] = useState(initialAiUsage);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [budgetCap, setBudgetCap] = useState(500);

  // Filter States
  const [search, setSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "Giảng viên" | "Học viên" | "suspended">("all");
  const [classHealthFilter, setClassHealthFilter] = useState<"all" | "Tốt" | "Ổn định" | "Cần theo dõi">("all");

  // Security Toggles
  const [require2FA, setRequire2FA] = useState(true);
  const [blockConcurrentIP, setBlockConcurrentIP] = useState(true);
  const [autoLockFailedAttempts, setAutoLockFailedAttempts] = useState(true);

  // Active Toast Feedback
  const [toast, setToast] = useState("Hệ thống ổn định • 99.98% Uptime");

  // Pending Enrollments
  const [pending, setPending] = useState([
    { name: "Nguyễn Minh Khôi", id: "SV-2024-0341", className: "OOP - Nhóm 01", risk: "Hồ sơ hợp lệ" },
    { name: "Trần Thị Lan Anh", id: "SV-2024-0528", className: "OOP - Nhóm 02", risk: "Trùng email lớp cũ" },
    { name: "Phạm Văn Đức", id: "SV-2024-0719", className: "DSA - Nhóm 01", risk: "Chờ xác nhận mã SV" },
  ]);

  // Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"Giảng viên" | "Học viên">("Học viên");

  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassCode, setNewClassCode] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassTeacher, setNewClassTeacher] = useState("Trần Thị B");
  const [newClassStudents, setNewClassStudents] = useState("35");
  const [newClassRoom, setNewClassRoom] = useState("Lab A3-201");

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [activeBroadcast, setActiveBroadcast] = useState<string | null>(null);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch = `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (userRoleFilter === "all") return true;
      if (userRoleFilter === "suspended") return u.status === "suspended";
      return u.role === userRoleFilter;
    });
  }, [users, search, userRoleFilter]);

  // Filtered Classes
  const filteredClasses = useMemo(() => {
    return classesList.filter((c) => {
      if (classHealthFilter === "all") return true;
      return c.health === classHealthFilter;
    });
  }, [classesList, classHealthFilter]);

  const activeUsers = users.filter((user) => user.status === "active").length;
  const suspendedUsers = users.filter((user) => user.status === "suspended").length;
  const totalRequests = aiServices.reduce((sum, item) => sum + item.requests, 0);
  const totalInputTokens = aiServices.reduce((sum, item) => sum + item.inputTokens, 0);
  const totalOutputTokens = aiServices.reduce((sum, item) => sum + item.outputTokens, 0);
  const totalEstimatedCost = aiServices.reduce((sum, item) => sum + item.estimatedCost, 0);

  // Helper: Append Audit Log
  const logAction = (action: string, target: string, type: AuditLog["type"]) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      time: "Vừa xong",
      actor: "Admin ADM-01",
      action,
      target,
      type,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Actions
  const resolvePending = (index: number, action: "approved" | "rejected") => {
    const item = pending[index];
    setPending((list) => list.filter((_, i) => i !== index));
    const msg = action === "approved" ? `Đã duyệt học viên ${item.name}` : `Đã từ chối hồ sơ ${item.name}`;
    setToast(msg);
    logAction(action === "approved" ? "Duyệt tham gia lớp" : "Từ chối tham gia lớp", `${item.name} (${item.className})`, "user");
  };

  const toggleUserLock = (email: string) => {
    const targetUser = users.find((u) => u.email === email);
    const newStatus = targetUser?.status === "suspended" ? "active" : "suspended";
    setUsers((list) =>
      list.map((u) => (u.email === email ? { ...u, status: newStatus } : u))
    );
    const msg = newStatus === "suspended" ? `Đã khóa tài khoản ${targetUser?.name}` : `Đã mở khóa tài khoản ${targetUser?.name}`;
    setToast(msg);
    logAction(newStatus === "suspended" ? "Khóa tài khoản" : "Mở khóa tài khoản", targetUser?.name || email, "user");
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    const newUser: UserRow = {
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      status: "active",
      lastActive: "Vừa tạo",
      device: "Chưa đăng nhập",
    };
    setUsers((prev) => [newUser, ...prev]);
    setIsAddUserModalOpen(false);
    setNewUserName("");
    setNewUserEmail("");
    setToast(`Đã thêm tài khoản mới: ${newUser.name}`);
    logAction("Tạo tài khoản người dùng", `${newUser.name} (${newUser.role})`, "user");
  };

  const handleDeleteUser = (email: string) => {
    const userToDelete = users.find((u) => u.email === email);
    if (!userToDelete) return;
    setUsers((prev) => prev.filter((u) => u.email !== email));
    setToast(`Đã xóa tài khoản ${userToDelete.name}`);
    logAction("Xóa tài khoản người dùng", userToDelete.name, "user");
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassCode.trim() || !newClassName.trim()) return;
    const newClass: ClassItem = {
      code: newClassCode.trim().toUpperCase(),
      name: newClassName.trim(),
      teacher: newClassTeacher,
      students: Number(newClassStudents) || 30,
      progress: 0,
      review: 0,
      health: "Tốt",
      room: newClassRoom.trim() || "Lab A3-201",
    };
    setClassesList((prev) => [newClass, ...prev]);
    setIsAddClassModalOpen(false);
    setNewClassCode("");
    setNewClassName("");
    setToast(`Đã tạo lớp học mới: ${newClass.code}`);
    logAction("Tạo lớp học mới", `${newClass.code} (${newClass.name})`, "class");
  };

  const toggleAiService = (id: string) => {
    setAiServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextActive = !s.active;
          setToast(`${s.name}: ${nextActive ? "Đã bật hoạt động" : "Đã tạm dừng khẩn cấp"}`);
          logAction(nextActive ? "Bật dịch vụ AI" : "Tắt khẩn cấp dịch vụ AI", s.name, "ai");
          return { ...s, active: nextActive };
        }
        return s;
      })
    );
  };

  const handlePurgeCache = () => {
    setToast("Đã dọn dẹp 1.4GB Token Cache • Tiết kiệm ~$18.20 chi phí lưu trữ");
    logAction("Dọn dẹp Token Cache hệ thống", "1.4GB Cache Memory", "ai");
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setActiveBroadcast(`${broadcastTitle}: ${broadcastMessage}`);
    setIsBroadcastModalOpen(false);
    setToast(`Đã phát thông báo khẩn cấp tới toàn thể học viên & giảng viên`);
    logAction("Phát thông báo toàn hệ thống", broadcastTitle, "security");
    setBroadcastTitle("");
    setBroadcastMessage("");
  };

  const exportUsersCSV = () => {
    const headers = "Họ tên,Vai trò,Email,Trạng thái,Thiết bị,Hoạt động gần nhất\n";
    const rows = users.map((u) => `"${u.name}","${u.role}","${u.email}","${statusLabel[u.status]}","${u.device}","${u.lastActive}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `codemind_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast("Đã xuất danh sách người dùng thành công (CSV)");
    logAction("Xuất danh sách người dùng", `${users.length} tài khoản CSV`, "user");
  };

  // 🌟 Chuyển tab: Chỉ animate nội dung tab được chọn, Header và Tab bar ĐỨNG YÊN HOÀN TOÀN!
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const cards = contentRef.current.querySelectorAll(".marlo-card");
    if (cards.length > 0) {
      animateMarloCards(cards, { stagger: 0.05, y: 20 });
    }
    const rows = contentRef.current.querySelectorAll(".marlo-row, tr");
    if (rows.length > 0) {
      animateMarloRows(rows, { y: 12, stagger: 0.02, delay: 0.15 });
    }
  }, [tab, userRoleFilter, classHealthFilter]);

  return (
    <div ref={adminRef} className="min-h-full max-w-[1720px] mx-auto p-4 sm:p-6 space-y-4 lg:space-y-5">
      {/* Broadcast Banner (nếu có thông báo toàn hệ thống) */}
      {activeBroadcast && (
        <div className="marlo-card rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/95 dark:bg-amber-950/70 p-3.5 shadow-sm flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs font-semibold animate-pulse">
          <div className="flex items-center gap-2 min-w-0">
            <Radio size={16} className="text-amber-600 shrink-0" />
            <span className="truncate">📢 THÔNG BÁO HỆ THỐNG: {activeBroadcast}</span>
          </div>
          <button
            onClick={() => setActiveBroadcast(null)}
            className="text-amber-700 hover:text-amber-900 dark:hover:text-amber-100 p-1 shrink-0 cursor-pointer"
            title="Đóng thông báo"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 🏷️ CARD 1: STANDALONE FLOATING MODAL HEADER */}
      <header className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-xs p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 select-none">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            CODE-MIND Platform • Core Governance
          </div>
          <MarloTitle text="Trung tâm Điều hành & Quản trị Toàn diện" className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white" />
          <p className="mt-1 text-xs sm:text-sm text-[#62656b] dark:text-[#a0a3a9]">
            Điều phối học viên, giảng viên, lớp học, kiểm soát hạn mức token AI và giám sát an ninh phiên đăng nhập.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 px-3.5 py-2 text-xs font-mono text-slate-600 dark:text-slate-300 shadow-xs shrink-0 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">99.98% SLA</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>Ngân sách AI: ${totalEstimatedCost.toFixed(1)} / ${budgetCap}</span>
          </div>

          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="magnetic inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 shadow-2xs hover:bg-amber-100 transition cursor-pointer"
          >
            <Radio size={14} className="text-amber-600 shrink-0 animate-pulse" />
            <span>Phát thông báo</span>
          </button>

          <div className="flex items-center gap-2 rounded-full border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs shrink-0 whitespace-nowrap">
            <Shield size={14} className="text-blue-600 shrink-0" />
            <span>{toast}</span>
          </div>
        </div>
      </header>

      {/* ── CARD 2: STANDALONE FLOATING TAB BAR WITH LIQUID RUBBERBAND PILL ── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-1.5 sm:p-2 shadow-xs flex items-center justify-between flex-wrap gap-2">
        <MarloSegmentedControl
          value={tab}
          onChange={(val) => setTab(val as Tab)}
          options={[
            { id: "overview", label: "Tổng quan", icon: <LayoutDashboard size={15} /> },
            { id: "users", label: `Người dùng (${users.length})`, icon: <Users size={15} /> },
            { id: "classes", label: `Lớp học (${classesList.length})`, icon: <GraduationCap size={15} /> },
            { id: "ai", label: "AI & Token", icon: <Sparkles size={15} className="text-purple-500" /> },
            { id: "sessions", label: "Phiên đăng nhập", icon: <Shield size={15} /> },
            { id: "audit", label: "Nhật ký kiểm toán", icon: <Activity size={15} /> },
          ]}
          tone="dark"
        />
        <div className="hidden lg:flex items-center gap-2 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Hệ thống giám sát SLA hoạt động bình thường</span>
        </div>
      </div>

      <div ref={contentRef} key={tab} className="space-y-4 lg:space-y-5">
      {/* ─── TAB 1: OVERVIEW (TỔNG QUAN) ──────────────────────────────────── */}
      {tab === "overview" && (
        <div key="admin-overview" className="space-y-4 lg:space-y-5">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["Học viên hoạt động", "1,247", `${activeUsers} tài khoản online`, <Users size={18} />, "text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300"],
              ["Chờ duyệt lớp", pending.length.toString(), "yêu cầu gia nhập lớp mới", <Clock size={18} />, "text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300"],
              ["Lớp học đang vận hành", classesList.length.toString(), "lớp đang đào tạo chuẩn", <GraduationCap size={18} />, "text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300"],
              ["Cảnh báo vi phạm", suspendedUsers.toString(), "tài khoản đang tạm khóa", <AlertTriangle size={18} />, "text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300"],
            ].map(([label, value, delta, icon, tone]) => (
              <div key={label as string} className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className={`mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{value}</div>
                <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</div>
                <div className="mt-1.5 text-xs text-slate-400 font-medium">{delta}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4">
            {/* Pending Approvals */}
            <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Yêu cầu xét duyệt tham gia lớp</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Kiểm tra thông tin sinh viên và điều phối xếp lớp học tự động.</p>
                </div>
                <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                  {pending.length} đang chờ
                </span>
              </div>

              {pending.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  Tất cả yêu cầu đã được duyệt hoàn tất!
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map((item, index) => (
                    <div key={item.id} className="marlo-row flex items-center gap-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5 hover:border-slate-300 transition">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 font-bold text-blue-700 dark:text-blue-300 text-sm shrink-0">
                        {item.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.id} • {item.className}</div>
                        <div className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">● {item.risk}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => resolvePending(index, "approved")}
                          className="magnetic rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer transition"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => resolvePending(index, "rejected")}
                          className="magnetic rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-800 hover:bg-red-50 text-red-600 dark:text-red-400 px-3 py-1.5 text-xs font-bold shadow-xs cursor-pointer transition"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Cost Snapshot */}
            <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={17} className="text-violet-600 shrink-0" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">AI usage snapshot</h2>
                </div>
                <button
                  onClick={() => handleSelectTab("ai")}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Xem chi tiết →
                </button>
              </div>

              <div className="space-y-3">
                {aiServices.map((item) => (
                  <div key={item.name} className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{item.value}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.percent}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
                      <span>{item.usage}</span>
                      <span>{item.percent}% quota</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: USERS (QUẢN LÝ NGƯỜI DÙNG) ───────────────────────────── */}
      {tab === "users" && (
        <div key="admin-users" className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-xs overflow-hidden">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 text-sm shadow-2xs">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên, email hoặc vai trò..."
                  className="flex-1 bg-transparent text-xs sm:text-sm outline-none text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Role filter buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setUserRoleFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${userRoleFilter === "all" ? "bg-white dark:bg-slate-900 shadow-2xs text-blue-600 font-bold" : "text-slate-500"}`}
                >
                  Tất cả ({users.length})
                </button>
                <button
                  onClick={() => setUserRoleFilter("Giảng viên")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${userRoleFilter === "Giảng viên" ? "bg-white dark:bg-slate-900 shadow-2xs text-blue-600 font-bold" : "text-slate-500"}`}
                >
                  Giảng viên
                </button>
                <button
                  onClick={() => setUserRoleFilter("Học viên")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${userRoleFilter === "Học viên" ? "bg-white dark:bg-slate-900 shadow-2xs text-blue-600 font-bold" : "text-slate-500"}`}
                >
                  Học viên
                </button>
                <button
                  onClick={() => setUserRoleFilter("suspended")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${userRoleFilter === "suspended" ? "bg-white dark:bg-slate-900 shadow-2xs text-rose-600 font-bold" : "text-slate-500"}`}
                >
                  Bị khóa
                </button>
              </div>

              <button
                onClick={exportUsersCSV}
                className="magnetic inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-xs font-bold shadow-2xs cursor-pointer transition"
                title="Tải file CSV danh sách người dùng"
              >
                <Download size={14} />
                <span>Xuất CSV</span>
              </button>

              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="magnetic inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-xs cursor-pointer transition"
              >
                <UserPlus size={15} />
                <span>Thêm tài khoản</span>
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  {["Họ tên", "Vai trò", "Email", "Trạng thái", "Thiết bị", "Thao tác"].map((head) => (
                    <th key={head} className="px-4 py-3.5">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-xs text-slate-400">
                      Không tìm thấy người dùng phù hợp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.email} className="marlo-row text-xs sm:text-sm hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{user.lastActive}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                        <span className={`px-2 py-0.5 rounded-md text-xs ${user.role === "Giảng viên" ? "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 font-bold" : "text-slate-600 dark:text-slate-300"}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle[user.status]}`}>
                          {user.status === "active" ? <CheckCircle size={12} /> : user.status === "pending" ? <Clock size={12} /> : <XCircle size={12} />}
                          {statusLabel[user.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{user.device}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleUserLock(user.email)}
                            className="magnetic inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-300 hover:text-blue-700 cursor-pointer shadow-2xs"
                            title={user.status === "suspended" ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                          >
                            {user.status === "suspended" ? <Unlock size={12} /> : <Lock size={12} />}
                            {user.status === "suspended" ? "Mở khóa" : "Khóa"}
                          </button>
                          <button
                            onClick={() => setToast(`Đã cấp mã đặt lại mật khẩu cho ${user.name}`)}
                            className="magnetic inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 cursor-pointer shadow-2xs"
                            title="Reset mật khẩu"
                          >
                            <KeyRound size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.email)}
                            className="magnetic inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer shadow-2xs"
                            title="Xóa tài khoản"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: CLASSES (QUẢN LÝ LỚP HỌC) ────────────────────────────── */}
      {tab === "classes" && (
        <div key="admin-classes" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lọc trạng thái lớp:</span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                {(["all", "Tốt", "Ổn định", "Cần theo dõi"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setClassHealthFilter(filter)}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${classHealthFilter === filter ? "bg-white dark:bg-slate-900 shadow-2xs text-blue-600 font-bold" : "text-slate-500"}`}
                  >
                    {filter === "all" ? "Tất cả" : filter}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsAddClassModalOpen(true)}
              className="magnetic inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold shadow-xs cursor-pointer transition shrink-0"
            >
              <Plus size={15} />
              <span>Tạo lớp học mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map((item) => (
              <div key={item.code} className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                      {item.code}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${item.health === "Tốt" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : item.health === "Cần theo dõi" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                      {item.health}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white leading-snug">{item.name}</h3>
                  <div className="mt-1 text-xs text-slate-500">Giảng viên: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.teacher}</span></div>
                  {item.room && <div className="text-xs text-slate-400 mt-0.5">Phòng: {item.room}</div>}

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-100 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white text-base">{item.students}</div>
                      <div className="text-[11px] text-slate-400 font-sans">Học viên chính thức</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-100 dark:border-slate-800">
                      <div className="font-bold text-amber-600 text-base">{item.review}</div>
                      <div className="text-[11px] text-slate-400 font-sans">Bài tập chờ chấm</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                      <span>Tiến độ chương trình</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Kỳ học: Spring 2026</span>
                  <button
                    onClick={() => setToast(`Đã mở danh sách quản lý chi tiết lớp ${item.code}`)}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Xem chi tiết →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: AI USAGE & TOKEN BUDGET ──────────────────────────────── */}
      {tab === "ai" && (
        <div key="admin-ai" className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
          <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">AI Quota, Model Metrics & Cost Control</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Giám sát số lượng token, chi phí ước tính và điều chỉnh giới hạn ngân sách hàng tháng.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePurgeCache}
                  className="magnetic inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-xs font-bold shadow-2xs cursor-pointer transition"
                  title="Dọn dẹp cache token lặp lại"
                >
                  <RotateCcw size={14} />
                  <span>Xóa Token Cache</span>
                </button>
              </div>
            </div>

            {/* Metric Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ["Tổng Request", totalRequests.toLocaleString(), "lượt gọi API"],
                ["Input Tokens", totalInputTokens.toLocaleString(), "tokens bối cảnh"],
                ["Output Tokens", totalOutputTokens.toLocaleString(), "tokens sinh ra"],
                ["Chi phí tháng", `$${totalEstimatedCost.toFixed(2)}`, `Ngân sách: $${budgetCap}`],
              ].map(([label, value, desc]) => (
                <div key={label} className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">{label}</div>
                  <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white font-mono">{value}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{desc}</div>
                </div>
              ))}
            </div>

            {/* AI Services Table with Kill-switches */}
            <div className="overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950/40 text-left text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    {["Dịch vụ AI", "Lượt gọi", "Input Token", "Output Token", "Chi phí", "Hạn mức", "Bật/Tắt"].map((head) => (
                      <th key={head} className="px-4 py-3">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/60">
                  {aiServices.map((item) => (
                    <tr key={item.id} className="marlo-row text-xs sm:text-sm hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${item.active ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.usage}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{item.requests.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.inputTokens.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.outputTokens.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold font-mono text-slate-900 dark:text-white">${item.estimatedCost.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.percent}%` }} />
                          </div>
                          <span className="font-mono text-xs text-slate-400">{item.percent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleAiService(item.id)}
                          className={`magnetic text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition ${
                            item.active
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              : "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                          }`}
                        >
                          {item.active ? "Đang bật" : "Tạm dừng"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right AI Governance Box */}
          <aside className="space-y-4">
            <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Hạn mức ngân sách tháng</span>
                <span className="font-mono font-bold text-blue-600 text-sm">${budgetCap}</span>
              </div>
              <input
                type="range"
                min="200"
                max="1000"
                step="50"
                value={budgetCap}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBudgetCap(val);
                  setToast(`Đã điều chỉnh ngân sách tối đa lên $${val}/tháng`);
                  logAction("Cập nhật hạn mức ngân sách AI", `$${val}/tháng`, "ai");
                }}
                className="w-full mt-3 cursor-pointer accent-blue-600"
              />
              <div className="mt-2 flex justify-between text-[11px] text-slate-400 font-mono">
                <span>$200</span>
                <span>$500 (Mặc định)</span>
                <span>$1,000</span>
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Khi mức tiêu thụ đạt 85% hạn mức ($ {(budgetCap * 0.85).toFixed(0)}), hệ thống tự động cảnh báo và chuyển AI sang chế độ tiết kiệm token.
              </p>
            </div>

            <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 shadow-xs">
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Shield size={16} className="text-emerald-600" />
                <span>Chính sách Token Cache</span>
              </div>
              <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  ● Cache prompt Socratic Mentor cho các câu hỏi trùng lặp (giảm 60% token input).
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  ● Giới hạn 20 lượt hỏi/giờ cho mỗi sinh viên để chống spam script bot.
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ─── TAB 5: SECURITY & ACTIVE SESSIONS ───────────────────────────── */}
      {tab === "sessions" && (
        <div key="admin-sessions" className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Phiên đăng nhập đang hoạt động</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Giám sát các thiết bị đang kết nối, phát hiện đăng nhập bất thường và ngăn chặn chia sẻ tài khoản.</p>
              </div>

              <button
                onClick={() => {
                  setToast("Đã thu hồi tất cả các phiên lạ • Yêu cầu đăng nhập lại");
                  logAction("Thu hồi tất cả phiên đăng nhập lạ", "Security Force Logout", "security");
                }}
                className="magnetic inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-3.5 py-2 text-xs font-bold shadow-2xs cursor-pointer transition"
              >
                <XCircle size={14} />
                <span>Đăng xuất tất cả thiết bị lạ</span>
              </button>
            </div>

            <div className="space-y-3">
              {[
                { name: "Nguyễn Văn A (Học viên)", device: "MacBook Pro • Chrome 124", ip: "192.168.1.42 (Hà Nội)", state: "Ổn định", icon: <Laptop size={17} /> },
                { name: "Trần Thị B (Giảng viên)", device: "Windows 11 • Edge 122", ip: "10.0.0.15 (TP.HCM)", state: "Thiết bị mới", icon: <Laptop size={17} /> },
                { name: "Phạm Văn Đức (Học viên)", device: "iPhone 15 • Safari Mobile", ip: "172.16.0.8 (Đà Nẵng)", state: "Cần xác minh", icon: <Smartphone size={17} /> },
                { name: "Lê Văn C (Học viên)", device: "Ubuntu 24.04 • Firefox", ip: "113.190.22.8 (Cần Thơ)", state: "Ổn định", icon: <Laptop size={17} /> },
              ].map((s) => (
                <div key={s.name} className="marlo-row flex items-center gap-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-3.5 hover:border-slate-300 transition">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-blue-600 shadow-2xs shrink-0">
                    {s.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{s.device} • {s.ip}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold shrink-0 ${s.state === "Ổn định" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                    {s.state}
                  </span>
                  <button
                    onClick={() => {
                      setToast(`Đã reset phiên của ${s.name}`);
                      logAction("Buộc đăng xuất thiết bị", s.name, "security");
                    }}
                    className="magnetic rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-red-600 shadow-2xs cursor-pointer hover:bg-red-50 transition shrink-0"
                  >
                    Ngắt phiên
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Security Policy Settings */}
          <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield size={16} className="text-blue-600" />
              <span>Chính sách Bảo mật Nền tảng</span>
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Bắt buộc xác thực 2FA</div>
                  <div className="text-[11px] text-slate-400">Áp dụng cho Giảng viên & Admin</div>
                </div>
                <input
                  type="checkbox"
                  checked={require2FA}
                  onChange={(e) => {
                    setRequire2FA(e.target.checked);
                    setToast(`Chính sách 2FA: ${e.target.checked ? "Đã bật" : "Đã tắt"}`);
                    logAction("Thay đổi chính sách 2FA", e.target.checked ? "Bật 2FA" : "Tắt 2FA", "security");
                  }}
                  className="h-4 w-4 accent-blue-600 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Chống đăng nhập đồng thời</div>
                  <div className="text-[11px] text-slate-400">Ngăn chia sẻ tài khoản làm bài thi</div>
                </div>
                <input
                  type="checkbox"
                  checked={blockConcurrentIP}
                  onChange={(e) => {
                    setBlockConcurrentIP(e.target.checked);
                    setToast(`Chống chia sẻ tài khoản: ${e.target.checked ? "Đã bật" : "Đã tắt"}`);
                    logAction("Cấu hình chống share tài khoản", e.target.checked ? "Bật" : "Tắt", "security");
                  }}
                  className="h-4 w-4 accent-blue-600 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Khóa sau 5 lần sai mật khẩu</div>
                  <div className="text-[11px] text-slate-400">Chống tấn công Brute-force</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoLockFailedAttempts}
                  onChange={(e) => {
                    setAutoLockFailedAttempts(e.target.checked);
                    setToast(`Khóa tự động sai mật khẩu: ${e.target.checked ? "Đã bật" : "Đã tắt"}`);
                  }}
                  className="h-4 w-4 accent-blue-600 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: AUDIT LOGS (NHẬT KÝ HỆ THỐNG) ─────────────────────────── */}
      {tab === "audit" && (
        <div key="admin-audit" className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Audit Log • Nhật ký Thao tác Hệ thống</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Theo dõi chi tiết các hành động quản trị, bảo mật và thay đổi tài nguyên theo thời gian thực.</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{auditLogs.length} sự kiện gần nhất</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-950/40 text-left text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  {["Thời gian", "Tác nhân", "Hành động thực hiện", "Đối tượng mục tiêu", "Phân loại"].map((head) => (
                    <th key={head} className="px-4 py-3.5">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="marlo-row text-xs sm:text-sm hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.time}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{log.actor}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{log.target}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.type === "security"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : log.type === "ai"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : log.type === "class"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {log.type.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </div>

      {/* ─── MODAL 1: ADD USER MODAL ─────────────────────────────────────── */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="marlo-card w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-pop-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                <span>Thêm tài khoản mới</span>
              </h3>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn Hoàng"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email học viện / trường</label>
                <input
                  type="email"
                  required
                  placeholder="hoangnv@student.vn"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Vai trò hệ thống</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUserRole("Học viên")}
                    className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${newUserRole === "Học viên" ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
                  >
                    Học viên (Student)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserRole("Giảng viên")}
                    className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${newUserRole === "Giảng viên" ? "border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"}`}
                  >
                    Giảng viên (Instructor)
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ADD CLASS MODAL ────────────────────────────────────── */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="marlo-card w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-pop-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={18} className="text-blue-600" />
                <span>Tạo lớp học mới</span>
              </h3>
              <button onClick={() => setIsAddClassModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Mã lớp (Course Code)</label>
                <input
                  type="text"
                  required
                  placeholder="CM-REACT-2026-02"
                  value={newClassCode}
                  onChange={(e) => setNewClassCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-sm font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tên môn học & Lớp</label>
                <input
                  type="text"
                  required
                  placeholder="Lập trình React 19 & Next.js Fullstack"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Giảng viên phụ trách</label>
                  <select
                    value={newClassTeacher}
                    onChange={(e) => setNewClassTeacher(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                  >
                    <option value="Trần Thị B">Trần Thị B</option>
                    <option value="Lê Văn C">Lê Văn C</option>
                    <option value="Võ Thị E">Võ Thị E</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Chỉ tiêu học viên</label>
                  <input
                    type="number"
                    value={newClassStudents}
                    onChange={(e) => setNewClassStudents(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phòng học / Workspace</label>
                <input
                  type="text"
                  placeholder="Lab B2-302"
                  value={newClassRoom}
                  onChange={(e) => setNewClassRoom(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Tạo lớp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: BROADCAST MODAL ────────────────────────────────────── */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="marlo-card w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-pop-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio size={18} className="text-amber-600" />
                <span>Phát thông báo toàn hệ thống</span>
              </h3>
              <button onClick={() => setIsBroadcastModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBroadcast} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tiêu đề thông báo</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thông báo kiểm tra định kỳ Sprint 1"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nội dung chi tiết</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Nhập nội dung thông báo gửi đến toàn thể học viên và giảng viên..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>Gửi thông báo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
