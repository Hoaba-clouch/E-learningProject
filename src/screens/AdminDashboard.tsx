import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Download,
  FolderKanban,
  GraduationCap,
  History,
  KeyRound,
  Laptop,
  Lock,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ServerCog,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Terminal,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type { Screen } from "../App";
import {
  FALLBACK_ADMIN_USERS,
  clearBroadcastApi,
  createAdminClass,
  createAdminUser,
  deleteAdminUserApi,
  ensureRoleSession,
  fetchAdminGovernanceBundle,
  fetchAdminUsers,
  patchAdminAiService,
  patchAdminClass,
  patchAdminUser,
  publishBroadcastApi,
  resolveAdminApproval,
  revokeJwtSessionApi,
  revokeUntrustedSessionsApi,
  saveAdminPolicies,
  triggerAdminResetDemo,
  type AdminUserRecord,
} from "../api";
import LiquidCardConnector from "../components/LiquidCardConnector";
import MarloActivityRing from "../components/MarloActivityRing";
import MarloCapacityBar from "../components/MarloCapacityBar";
import MarloSegmentedControl from "../components/MarloSegmentedControl";
import MarloTitle from "../components/MarloTitle";
import MarloToast from "../components/MarloToast";
import {
  INITIAL_ADMIN_CLASSES,
  INITIAL_ADMIN_SERVICES,
  INITIAL_AUDIT_LOGS,
  INITIAL_JWT_SESSIONS,
  INITIAL_PENDING_APPROVALS,
  type AdminAuditLog,
  type AdminClassRecord,
  type AdminJwtSession,
  type AdminServiceUnit,
  type PendingApprovalItem,
} from "../data/adminData";
import { CNTT_PROJECTS } from "./MarloProjectsScreen";
import {
  animateMarloCards,
  animateMarloRows,
  useMarloPageEntrance,
} from "../utils/marloAnimations";

export type AdminTab = "overview" | "users" | "classes" | "ai" | "sessions" | "audit";

interface AdminDashboardProps {
  currentSection?: Screen;
  onNavigateSection?: (s: Screen) => void;
}

function sectionToTab(section?: Screen): AdminTab {
  switch (section) {
    case "admin-users":
      return "users";
    case "admin-classes":
      return "classes";
    case "admin-ai":
      return "ai";
    case "admin-sessions":
      return "sessions";
    case "admin-audit":
      return "audit";
    case "admin":
    default:
      return "overview";
  }
}

function tabToSection(tab: AdminTab): Screen {
  switch (tab) {
    case "users":
      return "admin-users";
    case "classes":
      return "admin-classes";
    case "ai":
      return "admin-ai";
    case "sessions":
      return "admin-sessions";
    case "audit":
      return "admin-audit";
    case "overview":
    default:
      return "admin";
  }
}

const statusPillStyle: Record<AdminUserRecord["status"], string> = {
  active:
    "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  pending:
    "bg-amber-500/10 border-amber-500/20 text-[#8F5404] dark:text-amber-400",
  suspended:
    "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400",
};

const statusLabel: Record<AdminUserRecord["status"], string> = {
  active: "Hoạt động",
  pending: "Chờ kích hoạt",
  suspended: "Bị khóa",
};

const auditTypeLabel: Record<AdminAuditLog["type"], string> = {
  user: "RBAC · USER",
  ai: "AI · SANDBOX",
  class: "CLASS · LAB",
  security: "SECURITY · JWT",
};

export default function AdminDashboard({
  currentSection = "admin",
  onNavigateSection,
}: AdminDashboardProps) {
  const adminRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<AdminTab>(() => sectionToTab(currentSection));

  useEffect(() => {
    if (currentSection) {
      setTab(sectionToTab(currentSection));
    }
  }, [currentSection]);

  const handleSelectTab = (nextTab: AdminTab) => {
    setTab(nextTab);
    onNavigateSection?.(tabToSection(nextTab));
  };

  // Core Governance States (pre-populated with zero-flicker synced fallback)
  const [users, setUsers] = useState<AdminUserRecord[]>(FALLBACK_ADMIN_USERS);
  const [usersLoading, setUsersLoading] = useState(false);
  const [classesList, setClassesList] = useState<AdminClassRecord[]>(INITIAL_ADMIN_CLASSES);
  const [aiServices, setAiServices] = useState<AdminServiceUnit[]>(INITIAL_ADMIN_SERVICES);
  const [jwtSessions, setJwtSessions] = useState<AdminJwtSession[]>(INITIAL_JWT_SESSIONS);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalItem[]>(
    INITIAL_PENDING_APPROVALS
  );
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(INITIAL_AUDIT_LOGS);

  // Filters & Search
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<
    "all" | "Quản trị viên" | "Giảng viên" | "Học viên" | "suspended"
  >("all");
  const [classHealthFilter, setClassHealthFilter] = useState<
    "all" | "Tốt" | "Ổn định" | "Cần theo dõi"
  >("all");
  const [auditTypeFilter, setAuditTypeFilter] = useState<
    "all" | "user" | "ai" | "class" | "security"
  >("all");
  const [auditSearch, setAuditSearch] = useState("");

  // Governance & Guardrail Policies
  const [budgetCap, setBudgetCap] = useState(500);
  const [guardrailRefuseAnswer, setGuardrailRefuseAnswer] = useState(true);
  const [rateLimit20PerHour, setRateLimit20PerHour] = useState(true);
  const [dockerNetworkNone, setDockerNetworkNone] = useState(true);

  const [require2FA, setRequire2FA] = useState(true);
  const [blockConcurrentIP, setBlockConcurrentIP] = useState(true);
  const [autoLockFailedAttempts, setAutoLockFailedAttempts] = useState(true);

  // Reset Demo Confirmation
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);

  // System Broadcast Banner
  const [activeBroadcast, setActiveBroadcast] = useState<string | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");

  // Add User Modal
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserCode, setNewUserCode] = useState("");
  const [newUserRole, setNewUserRole] = useState<AdminUserRecord["role"]>("Học viên");

  // Add / Inspect Class Modals
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassCode, setNewClassCode] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassTeacher, setNewClassTeacher] = useState("Cô Trần Thị B");
  const [newClassStudents, setNewClassStudents] = useState("40");
  const [newClassRoom, setNewClassRoom] = useState("Lab A3-201");
  const [newClassImage, setNewClassImage] = useState("codemind/cpp20-sandbox:valgrind-1.4");
  const [editingClass, setEditingClass] = useState<AdminClassRecord | null>(null);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const notify = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), 3400);
  };

  useMarloPageEntrance(adminRef);

  const loadBackendUsers = async (showNotice = false) => {
    setUsersLoading(true);
    await ensureRoleSession("admin");
    const bundle = await fetchAdminGovernanceBundle();
    if (bundle) {
      if (bundle.users.length > 0) setUsers(bundle.users);
      if (bundle.classes.length > 0) setClassesList(bundle.classes);
      if (bundle.aiServices.length > 0) setAiServices(bundle.aiServices);
      setJwtSessions(bundle.jwtSessions);
      setPendingApprovals(bundle.pendingApprovals);
      if (bundle.auditLogs.length > 0) setAuditLogs(bundle.auditLogs);
      if (bundle.policies) {
        setBudgetCap(bundle.policies.budgetCap);
        setGuardrailRefuseAnswer(bundle.policies.guardrailRefuseAnswer);
        setRateLimit20PerHour(bundle.policies.rateLimit20PerHour);
        setDockerNetworkNone(bundle.policies.dockerNetworkNone);
        setRequire2FA(bundle.policies.require2FA);
        setBlockConcurrentIP(bundle.policies.blockConcurrentIP);
        setAutoLockFailedAttempts(bundle.policies.autoLockFailedAttempts);
      }
      setActiveBroadcast(bundle.broadcast);
      setUsersLoading(false);
      if (showNotice) {
        notify(`Đã đồng bộ ${bundle.users.length} tài khoản RBAC & 6 học phần từ FastAPI.`);
      }
      return;
    }
    const data = await fetchAdminUsers();
    setUsers(data);
    setUsersLoading(false);
    if (showNotice) {
      notify(`Đã đồng bộ ${data.length} tài khoản RBAC.`);
    }
  };

  useEffect(() => {
    void loadBackendUsers(false);
  }, []);

  const syncPolicies = (overrides: Partial<{
    budgetCap: number;
    guardrailRefuseAnswer: boolean;
    rateLimit20PerHour: boolean;
    dockerNetworkNone: boolean;
    require2FA: boolean;
    blockConcurrentIP: boolean;
    autoLockFailedAttempts: boolean;
  }> = {}) => {
    void saveAdminPolicies({
      budgetCap,
      guardrailRefuseAnswer,
      rateLimit20PerHour,
      dockerNetworkNone,
      require2FA,
      blockConcurrentIP,
      autoLockFailedAttempts,
      ...overrides,
    });
  };

  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const cards = contentRef.current.querySelectorAll(".marlo-card");
    if (cards.length > 0) {
      animateMarloCards(cards, { stagger: 0.04, y: 16 });
    }
    const rows = contentRef.current.querySelectorAll(".marlo-row");
    if (rows.length > 0) {
      animateMarloRows(rows, { y: 10, stagger: 0.02, delay: 0.12 });
    }
  }, [tab, userRoleFilter, classHealthFilter, auditTypeFilter]);

  const logAction = (
    action: string,
    target: string,
    type: AdminAuditLog["type"]
  ) => {
    const newEntry: AdminAuditLog = {
      id: `aud-${Date.now()}`,
      time: "Vừa xong",
      actor: "Admin AIO (ADM-01)",
      action,
      target,
      type,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // Aggregates
  const stats = useMemo(() => {
    const activeCount = users.filter((u) => u.status === "active").length;
    const suspendedCount = users.filter((u) => u.status === "suspended").length;
    const instructorCount = users.filter((u) => u.role === "Giảng viên").length;
    const totalStudentsEnrolled = classesList.reduce((sum, c) => sum + c.students, 0);
    const avgClassProgress = Math.round(
      classesList.reduce((sum, c) => sum + c.progressPct, 0) / Math.max(1, classesList.length)
    );
    const sandboxReadyCount = classesList.filter((c) => c.sandboxEnabled).length;
    const aiDefenseCount = classesList.filter((c) => c.aiDefenseEnabled).length;
    const totalRequests = aiServices.reduce((sum, s) => sum + s.requests, 0);
    const totalInputTokens = aiServices.reduce((sum, s) => sum + s.inputTokens, 0);
    const totalOutputTokens = aiServices.reduce((sum, s) => sum + s.outputTokens, 0);
    const totalEstimatedCost = aiServices.reduce((sum, s) => sum + s.estimatedCost, 0);
    const untrustedSessions = jwtSessions.filter((s) => s.isUntrusted).length;

    return {
      activeCount,
      suspendedCount,
      instructorCount,
      totalStudentsEnrolled,
      avgClassProgress,
      sandboxReadyCount,
      aiDefenseCount,
      totalRequests,
      totalInputTokens,
      totalOutputTokens,
      totalEstimatedCost,
      untrustedSessions,
    };
  }, [users, classesList, aiServices, jwtSessions]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      const matchQuery =
        !q || `${u.name} ${u.code} ${u.email} ${u.role}`.toLowerCase().includes(q);
      if (!matchQuery) return false;
      if (userRoleFilter === "all") return true;
      if (userRoleFilter === "suspended") return u.status === "suspended";
      return u.role === userRoleFilter;
    });
  }, [users, userSearch, userRoleFilter]);

  const filteredClasses = useMemo(() => {
    if (classHealthFilter === "all") return classesList;
    return classesList.filter((c) => c.health === classHealthFilter);
  }, [classesList, classHealthFilter]);

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditLogs.filter((log) => {
      const matchType = auditTypeFilter === "all" || log.type === auditTypeFilter;
      const matchText =
        !q || `${log.actor} ${log.action} ${log.target}`.toLowerCase().includes(q);
      return matchType && matchText;
    });
  }, [auditLogs, auditTypeFilter, auditSearch]);

  // --- ACTIONS ---
  const handleResolvePending = async (item: PendingApprovalItem, decision: "approved" | "rejected") => {
    setPendingApprovals((prev) => prev.filter((p) => p.id !== item.id));
    await resolveAdminApproval(item.id, decision);
    if (decision === "approved") {
      setUsers((prev) => {
        const exists = prev.some((u) => u.email.toLowerCase() === item.email.toLowerCase());
        if (exists) {
          return prev.map((u) =>
            u.email.toLowerCase() === item.email.toLowerCase()
              ? { ...u, status: "active", role: item.requestedRole, lastActive: "Vừa duyệt" }
              : u
          );
        }
        return [
          {
            id: `usr-${Date.now()}`,
            name: item.name,
            code: item.studentCode,
            email: item.email,
            role: item.requestedRole,
            status: "active",
            lastActive: "Vừa duyệt",
            device: "Web Session",
            classesCount: 1,
          },
          ...prev,
        ];
      });
      notify(`Đã phê duyệt ${item.name} (${item.requestedRole}) vào ${item.classCode}.`);
      logAction(`Phê duyệt ${item.requestedRole}`, `${item.name} → ${item.classCode}`, "user");
    } else {
      notify(`Đã từ chối yêu cầu của ${item.name}.`);
      logAction("Từ chối yêu cầu ghi danh", `${item.name} (${item.classCode})`, "user");
    }
  };

  const handleChangeUserRole = async (userId: string, nextRole: AdminUserRecord["role"]) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)));
    await patchAdminUser(userId, { role: nextRole });
    notify(`Đã cập nhật quyền RBAC của ${target.name} thành ${nextRole}.`);
    logAction("Đổi vai trò RBAC", `${target.name} → ${nextRole}`, "user");
  };

  const handleToggleUserLock = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const nextStatus: AdminUserRecord["status"] =
      target.status === "suspended" ? "active" : "suspended";
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u)));
    await patchAdminUser(userId, { status: nextStatus });
    notify(
      nextStatus === "suspended"
        ? `Đã khóa tài khoản ${target.name}.`
        : `Đã mở khóa tài khoản ${target.name}.`
    );
    logAction(
      nextStatus === "suspended" ? "Khóa tài khoản" : "Mở khóa tài khoản",
      `${target.name} (${target.code})`,
      "user"
    );
  };

  const handleDeleteUser = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    await deleteAdminUserApi(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    notify(`Đã xóa tài khoản ${target.name}.`);
    logAction("Xóa tài khoản RBAC", `${target.name} (${target.email})`, "user");
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    const apiCreated = await createAdminUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      code: newUserCode.trim(),
      role: newUserRole,
    });
    const created: AdminUserRecord = apiCreated || {
      id: `usr-${Date.now()}`,
      name: newUserName.trim(),
      code:
        newUserCode.trim() ||
        (newUserRole === "Quản trị viên"
          ? `ADM-${Math.floor(10 + Math.random() * 89)}`
          : newUserRole === "Giảng viên"
          ? `GV-${Math.floor(100 + Math.random() * 899)}`
          : `2210${Math.floor(100 + Math.random() * 899)}`),
      email: newUserEmail.trim(),
      role: newUserRole,
      status: "active",
      lastActive: "Vừa tạo",
      device: "Chưa đăng nhập",
      classesCount: newUserRole === "Học viên" ? 1 : 2,
    };
    setUsers((prev) => [created, ...prev]);
    setIsAddUserModalOpen(false);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserCode("");
    notify(`Đã tạo tài khoản ${created.role}: ${created.name}.`);
    logAction("Tạo tài khoản RBAC", `${created.name} (${created.role})`, "user");
  };

  const handleToggleClassFlag = async (
    classId: string,
    field: "sandboxEnabled" | "aiDefenseEnabled"
  ) => {
    const target = classesList.find((c) => c.id === classId);
    if (!target) return;
    const nextVal = !target[field];
    setClassesList((prev) =>
      prev.map((c) => (c.id === classId ? { ...c, [field]: nextVal } : c))
    );
    await patchAdminClass(classId, { [field]: nextVal });
    const featureLabel = field === "sandboxEnabled" ? "Docker Sandbox" : "Phòng Phản biện 3D";
    notify(`${target.code}: ${nextVal ? "Đã bật" : "Đã tắt"} ${featureLabel}.`);
    logAction(`${nextVal ? "Bật" : "Tắt"} ${featureLabel}`, `${target.code} — ${target.name}`, "class");
  };

  const handleAddClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassCode.trim() || !newClassName.trim()) return;
    const apiCreated = await createAdminClass({
      code: newClassCode.trim().toUpperCase(),
      name: newClassName.trim(),
      teacher: newClassTeacher,
      students: Number(newClassStudents) || 35,
      room: newClassRoom.trim() || "Lab A3-201",
      dockerImage: newClassImage.trim() || "codemind/cpp20-sandbox:latest",
    });
    const created: AdminClassRecord = apiCreated || {
      id: `adm-cls-${Date.now()}`,
      code: newClassCode.trim().toUpperCase(),
      name: newClassName.trim(),
      teacher: newClassTeacher,
      students: Number(newClassStudents) || 35,
      progressPct: 0,
      pendingDualReviews: 0,
      health: "Tốt",
      room: newClassRoom.trim() || "Lab A3-201",
      dockerImage: newClassImage.trim() || "codemind/cpp20-sandbox:latest",
      sandboxEnabled: true,
      aiDefenseEnabled: true,
    };
    setClassesList((prev) => [created, ...prev]);
    setIsAddClassModalOpen(false);
    setNewClassCode("");
    setNewClassName("");
    notify(`Đã khởi tạo học phần ${created.code}.`);
    logAction("Tạo lớp học phần", `${created.code} (${created.teacher})`, "class");
  };

  const handleSaveClassEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    setClassesList((prev) =>
      prev.map((c) => (c.id === editingClass.id ? editingClass : c))
    );
    await patchAdminClass(editingClass.id, {
      teacher: editingClass.teacher,
      students: editingClass.students,
      room: editingClass.room,
      dockerImage: editingClass.dockerImage,
      health: editingClass.health,
    });
    notify(`Đã cập nhật điều phối lớp ${editingClass.code}.`);
    logAction(
      "Điều phối giảng viên & runner",
      `${editingClass.code} → ${editingClass.teacher}`,
      "class"
    );
    setEditingClass(null);
  };

  const handleRevokeJwtSession = async (sessionId: string) => {
    const target = jwtSessions.find((s) => s.id === sessionId);
    if (!target) return;
    setJwtSessions((prev) => prev.filter((s) => s.id !== sessionId));
    await revokeJwtSessionApi(sessionId);
    notify(`Đã thu hồi JWT & ngắt phiên của ${target.userName}.`);
    logAction("Thu hồi phiên JWT", `${target.userName} (${target.device})`, "security");
  };

  const handleRevokeAllUntrusted = async () => {
    const count = jwtSessions.filter((s) => s.isUntrusted).length;
    if (count === 0) {
      notify("Không có thiết bị lạ hoặc phiên trùng IP nào cần thu hồi.");
      return;
    }
    setJwtSessions((prev) => prev.filter((s) => !s.isUntrusted));
    await revokeUntrustedSessionsApi();
    notify(`Đã cưỡng chế đăng xuất ${count} thiết bị lạ / phiên nghi vấn.`);
    logAction("Thu hồi toàn bộ phiên bất thường", `${count} phiên JWT bị hủy`, "security");
  };

  const handleConfirmResetDemo = async () => {
    setIsResettingDemo(true);
    const res = await triggerAdminResetDemo();
    const refreshed = await fetchAdminGovernanceBundle();
    if (refreshed) {
      setUsers(refreshed.users);
      setClassesList(refreshed.classes);
      setAiServices(refreshed.aiServices);
      setJwtSessions(refreshed.jwtSessions);
      setPendingApprovals(refreshed.pendingApprovals);
      setAuditLogs(refreshed.auditLogs);
      setActiveBroadcast(refreshed.broadcast);
    } else {
      setPendingApprovals(INITIAL_PENDING_APPROVALS);
      setJwtSessions(INITIAL_JWT_SESSIONS);
      setClassesList(INITIAL_ADMIN_CLASSES);
      setAiServices(INITIAL_ADMIN_SERVICES);
      setUsers(FALLBACK_ADMIN_USERS);
    }
    setConfirmResetOpen(false);
    setIsResettingDemo(false);
    notify(res.message);
    logAction("Khôi phục dữ liệu Demo Hệ thống", "POST /v1/admin/reset-demo", "security");
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setActiveBroadcast(`${broadcastTitle.trim()}: ${broadcastMessage.trim()}`);
    setIsBroadcastModalOpen(false);
    await publishBroadcastApi(broadcastTitle.trim(), broadcastMessage.trim());
    notify("Đã phát thông báo tới toàn bộ Học viên & Giảng viên.");
    logAction("Phát thông báo toàn trường", broadcastTitle.trim(), "security");
    setBroadcastTitle("");
    setBroadcastMessage("");
  };

  const exportCsv = (
    filename: string,
    headerLine: string,
    bodyLines: string[],
    logTitle: string
  ) => {
    const blob = new Blob([`${headerLine}\n${bodyLines.join("\n")}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify(`Đã xuất tệp ${filename}.`);
    logAction(logTitle, `${bodyLines.length} bản ghi CSV`, "user");
  };

  return (
    <div
      ref={adminRef}
      className="min-h-full max-w-[1720px] mx-auto p-4 sm:p-6 lg:p-7 pb-20 relative flex flex-col select-none"
    >
      {/* Floating Marlo Toast */}
      {toastMsg && <MarloToast message={toastMsg} showUndo={false} />}

      {/* Optional System Broadcast Banner */}
      {activeBroadcast && (
        <div className="marlo-card mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-3 text-xs font-semibold text-[#8F5404] dark:text-amber-300">
          <div className="flex items-center gap-2 min-w-0">
            <Radio size={15} className="text-[#EE8420] shrink-0" />
            <span className="truncate">THÔNG BÁO HỆ THỐNG: {activeBroadcast}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveBroadcast(null);
              void clearBroadcastApi();
            }}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 shrink-0 cursor-pointer"
            title="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── CARD 1: UNIFIED ADMIN GOVERNANCE HEADER ────────────────────────── */}
      <header className="marlo-card relative z-10 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              CodeMind Platform · Core Governance
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              99.98% SLA · ${stats.totalEstimatedCost.toFixed(0)} / ${budgetCap}
            </span>
          </div>
          <MarloTitle
            text="Trung tâm Điều hành & Quản trị Hệ thống"
            className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white leading-tight"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Điều phối tài khoản RBAC, 6 học phần CNTT, hạn mức AI Socratic, cụm Docker Sandbox và giám sát phiên JWT toàn trường.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateSection?.("instructor")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer shadow-2xs"
          >
            <GraduationCap size={14} className="text-slate-500 dark:text-slate-400" />
            <span>Giao diện Giảng viên</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection?.("defense-room")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 transition cursor-pointer shadow-2xs"
          >
            <ShieldCheck size={14} className="text-[#EE8420]" />
            <span>Phòng Phản biện 3D</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBroadcastModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] dark:hover:bg-white px-3.5 py-2 text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Radio size={14} />
            <span>Phát thông báo</span>
          </button>
        </div>
      </header>

      {/* Seamless Connector 1 */}
      <LiquidCardConnector />

      {/* ─── CARD 2: FLOATING SEGMENTED TAB BAR (TWO-WAY SYNCED WITH SIDEBAR) ── */}
      <div className="relative z-10 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-2 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <MarloSegmentedControl<AdminTab>
          value={tab}
          onChange={handleSelectTab}
          options={[
            { id: "overview", label: "Tổng quan", icon: <Activity size={14} /> },
            { id: "users", label: "Người dùng & RBAC", icon: <Users size={14} />, badge: users.length },
            { id: "classes", label: "Học phần & Sandbox", icon: <GraduationCap size={14} />, badge: classesList.length },
            { id: "ai", label: "AI & Docker Quota", icon: <Bot size={14} /> },
            { id: "sessions", label: "An ninh & Phiên JWT", icon: <Shield size={14} />, badge: jwtSessions.length },
            { id: "audit", label: "Nhật ký Kiểm toán", icon: <History size={14} />, badge: auditLogs.length },
          ]}
        />

        <div className="hidden xl:flex items-center gap-2 px-3 text-xs font-mono text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{stats.sandboxReadyCount}/{classesList.length} Sandbox · {stats.untrustedSessions} Phiên cần chú ý</span>
        </div>
      </div>

      {/* Seamless Connector 2 */}
      <LiquidCardConnector />

      {/* ─── TAB CONTENT BODY ───────────────────────────────────────────────── */}
      <div ref={contentRef} key={tab} className="relative z-10 space-y-5">
        {/* ====================================================================
            TAB 1: ADMIN OVERVIEW (MIRRORS StudentDashboard & InstructorPanel)
           ==================================================================== */}
        {tab === "overview" && (
          <div className="animate-screen-enter space-y-5">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Left: MarloActivityRing */}
              <div className="xl:col-span-5">
                <MarloActivityRing
                  title="Chỉ số Vận hành Học viện & Hạ tầng"
                  subtitle="Tổng hợp tiến độ 6 học phần, Docker Runners & Phản biện AI 3D"
                  actionText="Mở Lớp & Sandbox"
                  onAction={() => handleSelectTab("classes")}
                  centerValue={stats.avgClassProgress}
                  centerLabel="đạt tiến độ"
                  segments={[
                    { id: "pending", label: "Hồ sơ chờ duyệt", value: Math.max(8, pendingApprovals.length * 4), count: pendingApprovals.length, color: "#cbd5e1" },
                    { id: "defense", label: "Lớp bật Phản biện 3D", value: stats.aiDefenseCount * 5, count: stats.aiDefenseCount, color: "#64748b" },
                    { id: "sandbox", label: "Sandbox CI/CD Active", value: stats.sandboxReadyCount * 6, count: stats.sandboxReadyCount, color: "#f97316" },
                    { id: "prog", label: "Tiến độ đào tạo TB", value: stats.avgClassProgress, count: stats.totalStudentsEnrolled, color: "#1e293b" },
                  ]}
                  className="marlo-card h-full rounded-[24px] dark:bg-[#14161F]"
                />
              </div>

              {/* Right: Where the platform stands */}
              <div className="xl:col-span-7 marlo-card rounded-[24px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      Trạng thái Hệ thống & Quản trị Học vụ
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Nhấp từng dòng để điều hướng nhanh tới module quản trị tương ứng.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-[3px] bg-[#14161a] dark:bg-white" />
                      Hoạt động tốt
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-[3px] bg-[#EE8420]" />
                      Đang xử lý / Cảnh báo
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      id: "adm-row-classes",
                      icon: <GraduationCap size={15} className="text-slate-500" />,
                      label: "6 Học phần & Cụm Sandbox",
                      primaryMetric: stats.sandboxReadyCount,
                      totalMetric: classesList.length,
                      warnMetric: classesList.filter((c) => c.health === "Cần theo dõi").length,
                      onClick: () => handleSelectTab("classes"),
                    },
                    {
                      id: "adm-row-ai",
                      icon: <Bot size={15} className="text-slate-500" />,
                      label: "Cụm AI Socratic & Docker Runners",
                      primaryMetric: aiServices.filter((s) => s.active).length,
                      totalMetric: aiServices.length,
                      warnMetric: aiServices.filter((s) => !s.active).length,
                      onClick: () => handleSelectTab("ai"),
                    },
                    {
                      id: "adm-row-rbac",
                      icon: <ShieldCheck size={15} className="text-slate-500" />,
                      label: "Tài khoản RBAC & Phiên bảo mật",
                      primaryMetric: stats.activeCount,
                      totalMetric: users.length,
                      warnMetric: stats.suspendedCount + stats.untrustedSessions,
                      onClick: () => handleSelectTab("users"),
                    },
                  ].map((row) => {
                    const tot = Math.max(1, row.totalMetric);
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={row.onClick}
                        className="marlo-row w-full flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 px-4 py-3 text-left transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-[205px]">
                          {row.icon}
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {row.label}
                          </span>
                        </div>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden flex">
                          <div
                            className="h-full bg-[#14161a] dark:bg-white"
                            style={{ width: `${(row.primaryMetric / tot) * 100}%` }}
                          />
                          {row.warnMetric > 0 && (
                            <div
                              className="h-full bg-[#EE8420]"
                              style={{ width: `${Math.min(35, (row.warnMetric / tot) * 100)}%` }}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {row.primaryMetric}/{row.totalMetric}
                          </span>
                          <ChevronRight
                            size={14}
                            className="text-slate-400 group-hover:translate-x-0.5 transition-transform"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Budget Capacity Bar */}
                <MarloCapacityBar
                  title="Phân bổ Ngân sách AI & Compute Tháng hiện hành"
                  subtitle={`Tổng chi ước tính $${stats.totalEstimatedCost.toFixed(1)} trên hạn mức $${budgetCap}.0`}
                  totalLabel="USD / tháng"
                  className="bg-slate-50/40 dark:bg-slate-900/40 border-slate-200/70"
                  items={aiServices.map((s) => ({
                    id: s.id,
                    label: s.name.split(" & ")[0],
                    count: Math.round(s.estimatedCost),
                    color: s.barColor,
                  }))}
                />
              </div>
            </div>

            {/* Bottom Grid: Pending RBAC / Class Approvals + Docker & Capstone Cluster */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: Pending Approvals */}
              <div className="marlo-card rounded-[24px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Clock size={15} className="text-[#EE8420]" />
                      Xét duyệt Ghi danh & Cấp quyền RBAC
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Phê duyệt sinh viên gia nhập lớp hoặc cấp quyền Giảng viên mới.
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200">
                    {pendingApprovals.length} chờ duyệt
                  </span>
                </div>

                {pendingApprovals.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400">
                    Đã xử lý toàn bộ hồ sơ chờ duyệt!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingApprovals.map((item) => (
                      <div
                        key={item.id}
                        className="marlo-row flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3.5"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </span>
                            <span className="text-[10.5px] font-mono text-slate-400">
                              {item.studentCode}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {item.requestedRole}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                            {item.classCode} — {item.className}
                          </div>
                          <div className="text-[10.5px] text-[#8F5404] dark:text-amber-400 mt-0.5 font-medium">
                            ● {item.riskNote}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleResolvePending(item, "approved")}
                            className="rounded-lg bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] px-3 py-1.5 text-[11px] font-bold transition cursor-pointer"
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolvePending(item, "rejected")}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 px-3 py-1.5 text-[11px] font-bold transition cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Docker Sandbox & Capstone Infrastructure Health */}
              <div className="marlo-card rounded-[24px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Terminal size={15} className="text-slate-500" />
                      Cụm Docker Sandbox & Đồ án Capstone
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Hạ tầng chấm code cô lập Seccomp (--network=none) và theo dõi 8 đồ án CNTT.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateSection?.("projects")}
                    className="shrink-0 whitespace-nowrap text-xs font-bold text-slate-700 dark:text-slate-200 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xem 8 Đồ án</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3">
                    <div className="text-[10.5px] font-bold uppercase text-slate-400">
                      Runner Containers
                    </div>
                    <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                      12 Nodes
                    </div>
                    <div className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Seccomp Active
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3">
                    <div className="text-[10.5px] font-bold uppercase text-slate-400">
                      Lượt chấm CI/CD
                    </div>
                    <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                      2,890
                    </div>
                    <div className="text-[10.5px] text-slate-500">Trung bình 41ms/test</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 col-span-2 sm:col-span-1">
                    <div className="text-[10.5px] font-bold uppercase text-slate-400">
                      Đồ án Capstone
                    </div>
                    <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                      {CNTT_PROJECTS.length} Dự án
                    </div>
                    <div className="text-[10.5px] text-slate-500">
                      {CNTT_PROJECTS.filter((p) => p.status === "delivered").length} đã nghiệm thu
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {CNTT_PROJECTS.slice(0, 2).map((prj) => {
                    const pct = Math.round(prj.progress * 100);
                    return (
                      <div
                        key={prj.id}
                        className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {prj.name}
                          </span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-200 shrink-0">
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#14161a] dark:bg-white"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 2: RBAC USER MANAGEMENT (SYNCED WITH /v1/admin/users)
           ==================================================================== */}
        {tab === "users" && (
          <div className="animate-screen-enter marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tìm theo tên, mã số, email hoặc vai trò..."
                  className="flex-1 bg-transparent text-xs outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <MarloSegmentedControl<"all" | "Quản trị viên" | "Giảng viên" | "Học viên" | "suspended">
                  size="sm"
                  value={userRoleFilter}
                  onChange={setUserRoleFilter}
                  options={[
                    { id: "all", label: `Tất cả (${users.length})` },
                    { id: "Quản trị viên", label: "Admin" },
                    { id: "Giảng viên", label: "Giảng viên" },
                    { id: "Học viên", label: "Học viên" },
                    { id: "suspended", label: "Bị khóa" },
                  ]}
                />

                <button
                  type="button"
                  onClick={() => void loadBackendUsers(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <RefreshCw size={13} className={usersLoading ? "animate-spin" : ""} />
                  <span>Đồng bộ API</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    exportCsv(
                      `codemind_rbac_users_${Date.now()}.csv`,
                      "HoTen,MaSo,VaiTro,Email,TrangThai,ThietBi",
                      users.map(
                        (u) =>
                          `"${u.name}","${u.code}","${u.role}","${u.email}","${statusLabel[u.status]}","${u.device}"`
                      ),
                      "Xuất danh sách RBAC CSV"
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Xuất CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] px-3.5 py-2 text-xs font-bold cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span>Thêm tài khoản</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tài khoản</th>
                    <th className="px-4 py-3">Vai trò RBAC</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Thiết bị</th>
                    <th className="px-4 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                        Không có tài khoản nào khớp bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="marlo-row text-xs hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition"
                      >
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                          <div className="text-[10.5px] font-mono text-slate-400">
                            {user.code} · {user.lastActive}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`Vai trò của ${user.name}`}
                            value={user.role}
                            onChange={(e) =>
                              handleChangeUserRole(
                                user.id,
                                e.target.value as AdminUserRecord["role"]
                              )
                            }
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                          >
                            <option value="Học viên">Học viên</option>
                            <option value="Giảng viên">Giảng viên</option>
                            <option value="Quản trị viên">Quản trị viên</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                              statusPillStyle[user.status]
                            }`}
                          >
                            {user.status === "active" ? (
                              <CheckCircle2 size={11} />
                            ) : user.status === "pending" ? (
                              <Clock size={11} />
                            ) : (
                              <XCircle size={11} />
                            )}
                            {statusLabel[user.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          {user.device}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleUserLock(user.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              {user.status === "suspended" ? <Unlock size={12} /> : <Lock size={12} />}
                              <span>{user.status === "suspended" ? "Mở" : "Khóa"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                notify(`Đã gửi liên kết đặt lại mật khẩu tới ${user.email}.`);
                                logAction("Cấp reset mật khẩu", user.email, "user");
                              }}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                              title="Reset mật khẩu"
                            >
                              <KeyRound size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-rose-500 hover:bg-rose-50 cursor-pointer"
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

        {/* ====================================================================
            TAB 3: 6 CNTT COURSES, INSTRUCTOR ASSIGNMENT & SANDBOX/3D TOGGLES
           ==================================================================== */}
        {tab === "classes" && (
          <div className="animate-screen-enter space-y-4">
            <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Sức khỏe lớp:
                </span>
                <MarloSegmentedControl<"all" | "Tốt" | "Ổn định" | "Cần theo dõi">
                  size="sm"
                  value={classHealthFilter}
                  onChange={setClassHealthFilter}
                  options={[
                    { id: "all", label: "Tất cả" },
                    { id: "Tốt", label: "Tốt" },
                    { id: "Ổn định", label: "Ổn định" },
                    { id: "Cần theo dõi", label: "Cần theo dõi" },
                  ]}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] px-4 py-2 text-xs font-bold cursor-pointer"
              >
                <Plus size={14} />
                <span>Tạo lớp học phần</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-lg">
                        {cls.code}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${
                          cls.health === "Cần theo dõi"
                            ? "bg-amber-500/10 border-amber-500/20 text-[#8F5404] dark:text-amber-400"
                            : "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {cls.health}
                      </span>
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-slate-950 dark:text-white leading-snug">
                      {cls.name}
                    </h3>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Giảng viên:{" "}
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {cls.teacher}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                      {cls.room} · {cls.dockerImage}
                    </div>

                    <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 p-2.5">
                        <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                          {cls.students}
                        </div>
                        <div className="text-[10.5px] text-slate-500">Học viên</div>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 p-2.5">
                        <div className="text-base font-black font-mono text-[#EE8420]">
                          {cls.pendingDualReviews}
                        </div>
                        <div className="text-[10.5px] text-slate-500">Bài chờ duyệt</div>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        <span>Tiến độ chương trình</span>
                        <span className="font-mono font-bold">{cls.progressPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            cls.health === "Cần theo dõi"
                              ? "bg-[#EE8420]"
                              : "bg-[#14161a] dark:bg-white"
                          }`}
                          style={{ width: `${cls.progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Inline Sandbox & 3D AI Toggles */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleToggleClassFlag(cls.id, "sandboxEnabled")}
                        className={`flex-1 rounded-lg border px-2 py-1.5 font-bold transition cursor-pointer ${
                          cls.sandboxEnabled
                            ? "border-[#141619] bg-[#141619] text-white dark:border-white dark:bg-white dark:text-[#141619]"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400"
                        }`}
                      >
                        Docker: {cls.sandboxEnabled ? "BẬT" : "TẮT"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleClassFlag(cls.id, "aiDefenseEnabled")}
                        className={`flex-1 rounded-lg border px-2 py-1.5 font-bold transition cursor-pointer ${
                          cls.aiDefenseEnabled
                            ? "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400"
                        }`}
                      >
                        AI 3D: {cls.aiDefenseEnabled ? "BẬT" : "TẮT"}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">Học kỳ 1 / 2026</span>
                    <button
                      type="button"
                      onClick={() => setEditingClass({ ...cls })}
                      className="text-xs font-bold text-slate-900 dark:text-white hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Chi tiết & Điều phối</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 4: AI GUARDRAILS, TOKEN BUDGET & DOCKER RUNNER GOVERNANCE
           ==================================================================== */}
        {tab === "ai" && (
          <div className="animate-screen-enter grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-8 marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    Kiểm soát Hạn mức AI Socratic & Cụm Docker Runners
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Quản trị 4 dịch vụ lõi: Gia sư Socratic, Hội đồng AI 3D, AIGC Studio và Docker Sandbox.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    notify("Đã dọn dẹp 1.4 GB Prompt & AST Cache · Giảm ~18% chi phí token.");
                    logAction("Xóa Token Cache hệ thống", "1.4 GB Prompt Cache", "ai");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Xóa Token Cache</span>
                </button>
              </div>

              {/* 4 KPI Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Tổng Requests", val: stats.totalRequests.toLocaleString(), sub: "lượt gọi & chấm" },
                  { label: "Input Tokens", val: stats.totalInputTokens.toLocaleString(), sub: "bối cảnh RAG & code" },
                  { label: "Output Tokens", val: stats.totalOutputTokens.toLocaleString(), sub: "gợi ý & transcript" },
                  {
                    label: "Chi phí tháng",
                    val: `$${stats.totalEstimatedCost.toFixed(2)}`,
                    sub: `Hạn mức $${budgetCap}`,
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3"
                  >
                    <div className="text-[10.5px] font-bold uppercase text-slate-400">{kpi.label}</div>
                    <div className="mt-1 text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white">
                      {kpi.val}
                    </div>
                    <div className="text-[10.5px] text-slate-500">{kpi.sub}</div>
                  </div>
                ))}
              </div>

              {/* 4 Core Engines Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Dịch vụ Hệ thống</th>
                      <th className="px-4 py-3">Lưu lượng</th>
                      <th className="px-4 py-3">Chi phí</th>
                      <th className="px-4 py-3">Mức dùng</th>
                      <th className="px-4 py-3">Công tắc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {aiServices.map((svc) => (
                      <tr key={svc.id} className="marlo-row text-xs hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                svc.active ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            <span>{svc.name}</span>
                          </div>
                          <div className="text-[10.5px] font-mono text-slate-400 mt-0.5">
                            {svc.engine} · {svc.usage}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                          {svc.requests.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          ${svc.estimatedCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${svc.quotaPct}%`, backgroundColor: svc.barColor }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-slate-500">{svc.quotaPct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              const nextActive = !svc.active;
                              setAiServices((prev) =>
                                prev.map((item) =>
                                  item.id === svc.id ? { ...item, active: nextActive } : item
                                )
                              );
                              void patchAdminAiService(svc.id, { active: nextActive });
                              notify(`${svc.name}: ${nextActive ? "Đã bật" : "Đã tạm dừng"}.`);
                              logAction(
                                nextActive ? "Bật dịch vụ AI/Compute" : "Tạm dừng dịch vụ AI/Compute",
                                svc.name,
                                "ai"
                              );
                            }}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer transition ${
                              svc.active
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
                            }`}
                          >
                            {svc.active ? "Đang bật" : "Tạm dừng"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Governance Sidebar */}
            <aside className="lg:col-span-4 space-y-4">
              <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">Ngân sách AI hàng tháng</span>
                  <span className="font-mono font-black text-sm text-slate-950 dark:text-white">
                    ${budgetCap}
                  </span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={1000}
                  step={50}
                  value={budgetCap}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBudgetCap(val);
                    syncPolicies({ budgetCap: val });
                    notify(`Đã điều chỉnh trần ngân sách AI lên $${val}/tháng.`);
                    logAction("Cập nhật ngân sách AI", `$${val}/tháng`, "ai");
                  }}
                  className="w-full accent-[#141619] cursor-pointer"
                />
                <div className="flex justify-between text-[10.5px] font-mono text-slate-400">
                  <span>$200</span>
                  <span>$500 (Chuẩn)</span>
                  <span>$1,000</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Đạt 85% (${Math.round(budgetCap * 0.85)}) sẽ tự động ưu tiên Prompt Cache cho câu hỏi Socratic.
                </p>
              </div>

              <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-3">
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#EE8420]" />
                  <span>Chính sách Guardrail Toàn trường</span>
                </div>
                {[
                  {
                    label: "Chặn tuyệt đối lộ code giải sẵn (refuse_answer)",
                    desc: "Ép AI Socratic luôn phản hồi bằng câu hỏi gợi mở",
                    checked: guardrailRefuseAnswer,
                    onChange: (v: boolean) => {
                      setGuardrailRefuseAnswer(v);
                      syncPolicies({ guardrailRefuseAnswer: v });
                      notify(`Guardrail refuse_answer: ${v ? "Đã bật" : "Đã tắt"}.`);
                      logAction("Cập nhật Guardrail refuse_answer", v ? "Bật" : "Tắt", "ai");
                    },
                  },
                  {
                    label: "Giới hạn 20 lượt hỏi Socratic/giờ/SV",
                    desc: "Ngăn spam API tự động hóa",
                    checked: rateLimit20PerHour,
                    onChange: (v: boolean) => {
                      setRateLimit20PerHour(v);
                      syncPolicies({ rateLimit20PerHour: v });
                      notify(`Rate limit 20 câu/giờ: ${v ? "Đã bật" : "Đã tắt"}.`);
                      logAction("Cập nhật Rate limit Socratic", v ? "20/giờ" : "Không giới hạn", "ai");
                    },
                  },
                  {
                    label: "Cô lập mạng Docker (--network=none)",
                    desc: "Chặn toàn bộ kết nối ra ngoài khi chạy bài nộp sinh viên",
                    checked: dockerNetworkNone,
                    onChange: (v: boolean) => {
                      setDockerNetworkNone(v);
                      syncPolicies({ dockerNetworkNone: v });
                      notify(`Docker network isolation: ${v ? "Đã bật" : "Đã tắt"}.`);
                      logAction("Cập nhật Docker Sandbox Network", v ? "--network=none" : "Bridge", "ai");
                    },
                  },
                ].map((policy) => (
                  <label
                    key={policy.label}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3 cursor-pointer text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100">{policy.label}</div>
                      <div className="text-[10.5px] text-slate-500 mt-0.5">{policy.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={policy.checked}
                      onChange={(e) => policy.onChange(e.target.checked)}
                      className="mt-1 accent-[#141619] cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </aside>
          </div>
        )}

        {/* ====================================================================
            TAB 5: SECURITY, JWT SESSIONS & DEMO RESET (/v1/admin/reset-demo)
           ==================================================================== */}
        {tab === "sessions" && (
          <div className="animate-screen-enter grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-8 marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">
                    Phiên JWT & Thiết bị Đang Kết Nối ({jwtSessions.length})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Phát hiện thiết bị lạ hoặc đăng nhập trùng IP trong ca thi Phản biện AI 3D.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRevokeAllUntrusted}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 cursor-pointer transition"
                >
                  <XCircle size={14} />
                  <span>Đăng xuất tất cả thiết bị lạ</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {jwtSessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400">
                    Không còn phiên kết nối nào đang hoạt động.
                  </div>
                ) : (
                  jwtSessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="marlo-row flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                          {sess.device.includes("iPhone") ? <Smartphone size={17} /> : <Laptop size={17} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {sess.userName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {sess.role}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                            {sess.device} · {sess.ipLocation} · {sess.issuedAt}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold ${
                            sess.isUntrusted
                              ? "bg-amber-500/10 border-amber-500/20 text-[#8F5404] dark:text-amber-400"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {sess.state}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRevokeJwtSession(sess.id)}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-600 dark:text-rose-400 px-2.5 py-1.5 text-[11px] font-bold cursor-pointer"
                        >
                          Ngắt phiên
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <aside className="lg:col-span-4 space-y-4">
              <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-3">
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield size={16} className="text-slate-600 dark:text-slate-300" />
                  <span>Chính sách Bảo mật RBAC & Thi cử</span>
                </div>
                {[
                  {
                    label: "Bắt buộc 2FA Giảng viên & Admin",
                    desc: "Yêu cầu mã OTP khi đăng nhập từ IP mới",
                    checked: require2FA,
                    onChange: (v: boolean) => {
                      setRequire2FA(v);
                      syncPolicies({ require2FA: v });
                      notify(`Bắt buộc 2FA: ${v ? "Đã bật" : "Đã tắt"}.`);
                      logAction("Cập nhật chính sách 2FA", v ? "Bật" : "Tắt", "security");
                    },
                  },
                  {
                    label: "Chống đăng nhập đồng thời khi Phản biện 3D",
                    desc: "Tự ngắt phiên cũ nếu phát hiện mở 2 trình duyệt",
                    checked: blockConcurrentIP,
                    onChange: (v: boolean) => {
                      setBlockConcurrentIP(v);
                      syncPolicies({ blockConcurrentIP: v });
                      notify(`Chống đăng nhập đồng thời: ${v ? "Đã bật" : "Đã tắt"}.`);
                      logAction("Cập nhật chống share phiên", v ? "Bật" : "Tắt", "security");
                    },
                  },
                  {
                    label: "Tự khóa sau 5 lần sai mật khẩu",
                    desc: "Bảo vệ tài khoản trước brute-force",
                    checked: autoLockFailedAttempts,
                    onChange: (v: boolean) => {
                      setAutoLockFailedAttempts(v);
                      syncPolicies({ autoLockFailedAttempts: v });
                      notify(`Khóa 5 lần sai mật khẩu: ${v ? "Đã bật" : "Đã tắt"}.`);
                      logAction("Cập nhật chống brute-force", v ? "Bật" : "Tắt", "security");
                    },
                  },
                ].map((item) => (
                  <label
                    key={item.label}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-3 cursor-pointer text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100">{item.label}</div>
                      <div className="text-[10.5px] text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.onChange(e.target.checked)}
                      className="mt-1 accent-[#141619] cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              {/* POST /v1/admin/reset-demo */}
              <div className="marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-3">
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ServerCog size={16} className="text-[#EE8420]" />
                  <span>Khôi phục Dữ liệu Demo Hệ thống</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Gọi API <code className="font-mono">POST /v1/admin/reset-demo</code> để đưa toàn bộ phiên học, bằng chứng và kiểm thử về trạng thái sạch chuẩn bị bảo vệ đồ án.
                </p>

                {!confirmResetOpen ? (
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(true)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-900 dark:text-white transition cursor-pointer"
                  >
                    Reset Dữ liệu Demo...
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isResettingDemo}
                      onClick={() => void handleConfirmResetDemo()}
                      className="flex-1 rounded-xl bg-[#141619] hover:bg-black text-white dark:bg-[#F4F4F6] dark:text-[#141619] py-2 text-xs font-bold cursor-pointer"
                    >
                      {isResettingDemo ? "Đang khôi phục..." : "Xác nhận Reset"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetOpen(false)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* ====================================================================
            TAB 6: REAL-TIME FILTERABLE AUDIT LOGS
           ==================================================================== */}
        {tab === "audit" && (
          <div className="animate-screen-enter marlo-card rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Tìm tác nhân, hành động hoặc đối tượng trong Audit Log..."
                  className="flex-1 bg-transparent text-xs outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <MarloSegmentedControl<"all" | "user" | "ai" | "class" | "security">
                  size="sm"
                  value={auditTypeFilter}
                  onChange={setAuditTypeFilter}
                  options={[
                    { id: "all", label: "Tất cả" },
                    { id: "user", label: "RBAC" },
                    { id: "ai", label: "AI & Sandbox" },
                    { id: "class", label: "Lớp học" },
                    { id: "security", label: "An ninh" },
                  ]}
                />

                <button
                  type="button"
                  onClick={() =>
                    exportCsv(
                      `codemind_audit_log_${Date.now()}.csv`,
                      "ThoiGian,TacNhan,HanhDong,DoiTuong,PhanLoai",
                      filteredAuditLogs.map(
                        (l) => `"${l.time}","${l.actor}","${l.action}","${l.target}","${l.type}"`
                      ),
                      "Xuất Nhật ký Kiểm toán CSV"
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Xuất Nhật ký</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">Tác nhân</th>
                    <th className="px-4 py-3">Hành động thực hiện</th>
                    <th className="px-4 py-3">Đối tượng mục tiêu</th>
                    <th className="px-4 py-3">Phân loại</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="marlo-row text-xs hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                      <td className="px-4 py-3 font-mono text-slate-500">{log.time}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{log.actor}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{log.action}</td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{log.target}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold ${
                            log.type === "security"
                              ? "bg-amber-500/10 border-amber-500/20 text-[#8F5404] dark:text-amber-400"
                              : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {auditTypeLabel[log.type]}
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

      {/* ====================================================================
          MODAL 1: ADD USER (MONOCHROME RBAC)
         ==================================================================== */}
      {isAddUserModalOpen && (
        <div
          onClick={() => setIsAddUserModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Thêm tài khoản RBAC mới
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ví dụ: Lê Minh Quân"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mã số SV / GV
                  </label>
                  <input
                    type="text"
                    value={newUserCode}
                    onChange={(e) => setNewUserCode(e.target.value)}
                    placeholder="2210890"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Email trường
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="quan.lm@edu.vn"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Vai trò phân quyền (RBAC)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Học viên", "Giảng viên", "Quản trị viên"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewUserRole(r)}
                      className={`rounded-xl border py-2 px-2 font-bold transition cursor-pointer ${
                        newUserRole === r
                          ? "border-[#141619] bg-[#141619] text-white dark:border-white dark:bg-white dark:text-[#141619]"
                          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-4 py-2 font-bold cursor-pointer"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: ADD CLASS MODAL
         ==================================================================== */}
      {isAddClassModalOpen && (
        <div
          onClick={() => setIsAddClassModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tạo lớp học phần & Docker Sandbox
              </h3>
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddClassSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Mã học phần</label>
                  <input
                    type="text"
                    required
                    value={newClassCode}
                    onChange={(e) => setNewClassCode(e.target.value)}
                    placeholder="CS315"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Phòng / Lab</label>
                  <input
                    type="text"
                    value={newClassRoom}
                    onChange={(e) => setNewClassRoom(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Tên học phần</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Hệ thống Phân tán & Kafka Cache"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Giảng viên phụ trách</label>
                  <select
                    value={newClassTeacher}
                    onChange={(e) => setNewClassTeacher(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-2 font-semibold outline-none"
                  >
                    <option value="Cô Trần Thị B">Cô Trần Thị B</option>
                    <option value="Thầy Nguyễn Phước">Thầy Nguyễn Phước</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Chỉ tiêu HV</label>
                  <input
                    type="number"
                    value={newClassStudents}
                    onChange={(e) => setNewClassStudents(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Docker Runner Image</label>
                <input
                  type="text"
                  value={newClassImage}
                  onChange={(e) => setNewClassImage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-4 py-2 font-bold cursor-pointer"
                >
                  Tạo học phần
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: CLASS COORDINATION / EDIT MODAL
         ==================================================================== */}
      {editingClass && (
        <div
          onClick={() => setEditingClass(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="text-[10.5px] font-mono font-bold text-slate-400">
                  {editingClass.code}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Điều phối Lớp & Hạ tầng Sandbox
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveClassEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Giảng viên phụ trách</label>
                <select
                  value={editingClass.teacher}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, teacher: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-semibold outline-none"
                >
                  <option value="Cô Trần Thị B">Cô Trần Thị B</option>
                  <option value="Thầy Nguyễn Phước">Thầy Nguyễn Phước</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">Phòng học</label>
                  <input
                    type="text"
                    value={editingClass.room}
                    onChange={(e) =>
                      setEditingClass({ ...editingClass, room: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Trạng thái lớp</label>
                  <select
                    value={editingClass.health}
                    onChange={(e) =>
                      setEditingClass({
                        ...editingClass,
                        health: e.target.value as AdminClassRecord["health"],
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-semibold outline-none"
                  >
                    <option value="Tốt">Tốt</option>
                    <option value="Ổn định">Ổn định</option>
                    <option value="Cần theo dõi">Cần theo dõi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Docker Sandbox Image</label>
                <input
                  type="text"
                  value={editingClass.dockerImage}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, dockerImage: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 font-mono outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingClass(null);
                    onNavigateSection?.("instructor-courses");
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <span>Xem Giáo trình Giảng viên</span>
                  <ArrowUpRight size={13} />
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-4 py-2 font-bold cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 4: SYSTEM BROADCAST MODAL
         ==================================================================== */}
      {isBroadcastModalOpen && (
        <div
          onClick={() => setIsBroadcastModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Radio size={16} className="text-[#EE8420]" />
                <span>Phát thông báo toàn hệ thống</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Tiêu đề thông báo</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Ví dụ: Lịch bảo vệ Đồ án & Đóng cổng nộp Sprint 1"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Nội dung gửi toàn trường</label>
                <textarea
                  rows={3}
                  required
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Nội dung sẽ xuất hiện trên bảng thông báo của Học viên & Giảng viên..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#141619] text-white dark:bg-white dark:text-[#141619] px-4 py-2 font-bold cursor-pointer"
                >
                  <Send size={13} />
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
