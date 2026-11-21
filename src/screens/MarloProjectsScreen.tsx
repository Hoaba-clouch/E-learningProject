import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from "react";
import gsap from "gsap";
import {
  Plus,
  Pin,
  Check,
  Clock,
  ShieldCheck,
  ExternalLink,
  Award,
  FileSpreadsheet,
  Download,
  Lock,
  Unlock,
  Users,
  Settings,
  UserCheck,
  ShieldAlert,
  Sparkles,
  FolderGit2,
  GitFork,
  FolderKanban,
  Crown,
  User,
  Layers,
  Bell,
  X,
} from "lucide-react";
import ProjectGradingModal from "../components/ProjectGradingModal";
import MarloTitle from "../components/MarloTitle";
import MarloSegmentedControl from "../components/MarloSegmentedControl";
import { MarloNewProjectModal } from "../components/MarloProjectModals";
import MarloToast from "../components/MarloToast";
import {
  animateMarloPill,
  animateMarloCards,
} from "../utils/marloAnimations";
import {
  isGlobalSubmissionLocked,
  isProjectFrozen,
  setGlobalSubmissionLocked,
  setProjectFrozen,
  subscribeProjectLockChanges,
} from "../utils/projectFreeze";
import {
  fetchKanbanWorkspace,
  createWorkspaceProjectApi,
  updateWorkspaceProjectApi,
  fetchProjectInvitationsApi,
  acceptProjectInvitationApi,
  declineProjectInvitationApi,
  getStoredUser,
  type ProjectGitRepoSummary,
  type ProjectInvitationItem,
} from "../api";

export interface CNTTMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  bg: string;
  textColor: string;
}

export const CNTT_MEMBERS: Record<string, CNTTMember> = {
  hasib: { id: "usr-sv-02", name: "Nguyễn Văn A", initials: "NA", role: "Leader & Compiler Architect", bg: "#10b981", textColor: "#064e3b" },
  bhoa: { id: "bhoa", name: "Nguyễn Bá Hòa", initials: "BH", role: "Leader & Systems Architect", bg: "#C7D2FE", textColor: "#312E81" },
  vhuy: { id: "vhuy", name: "Võ Nhật Huy", initials: "VH", role: "Fullstack & AI Dev", bg: "#FCD34D", textColor: "#78350F" },
  dnghi: { id: "dnghi", name: "Phan Đình Nghị", initials: "PN", role: "Backend & Database", bg: "#FED7AA", textColor: "#7C2D12" },
  tuan: { id: "tuan", name: "Trần Minh Tuấn", initials: "TT", role: "Backend Lead", bg: "#A7F3D0", textColor: "#064E3B" },
  ha: { id: "ha", name: "Lê Thị Hà", initials: "LH", role: "DevOps & Cloud Engineer", bg: "#E9D5FF", textColor: "#581C87" },
  nam: { id: "nam", name: "Hoàng Trọng Nam", initials: "HN", role: "AI Research Lead", bg: "#CCFBF1", textColor: "#115E59" },
  linh: { id: "linh", name: "Đỗ Mỹ Linh", initials: "ML", role: "Data Scientist", bg: "#FFE4E6", textColor: "#9F1239" },
  nphuoc: { id: "nphuoc", name: "Thầy Nguyễn Phước", initials: "NP", role: "Cố vấn Kiến trúc", bg: "#E0E7FF", textColor: "#3730A3" },
  mquan: { id: "mquan", name: "Thầy Trần Minh Quân", initials: "MQ", role: "Cố vấn AI", bg: "#EDE9FE", textColor: "#5B21B6" },
  lananh: { id: "lananh", name: "Cô Lan Anh", initials: "LA", role: "Giảng viên Hướng dẫn", bg: "#FBCFE8", textColor: "#831843" },
};

export type CNTTProjectStatus = "planning" | "active" | "review" | "delivered";

export interface CNTTProjectItem {
  id: string;
  name: string;
  client: string;
  course: string;
  kind: string;
  status: CNTTProjectStatus;
  progress: number; // 0 to 1
  tasksDone: number;
  tasksTotal: number;
  dueText: string;
  storyPoints: number;
  pointsBurned: number;
  budgetStr?: string;
  lead?: string;
  instructor?: string;
  instructorAvatar?: string;
  finalScore?: number | null;
  totalXp?: number;
  members: CNTTMember[];
  fav?: boolean;
  colorHex?: string;
  // Timeline coordinates (exact replica of Marlo layout)
  tlStart: number; // percentage (0 to 100)
  tlWidth: number; // percentage (0 to 100)
  tlColor?: "amber" | "dark" | "done";
  gitRepo?: ProjectGitRepoSummary | null;
  isMyProject?: boolean;
  isLead?: boolean;
  leaderUserId?: string | null;
}

// 8 Real Software Engineering Capstone Projects (Synced with Kanban Board)
export const CNTT_PROJECTS: CNTTProjectItem[] = [
  {
    id: "prj-codemind",
    name: "CodeMind AI - Hệ thống Gia sư Lập trình Socratic",
    client: "Khóa luận Tốt nghiệp · Đề tài Cấp Khoa",
    course: "CNTT-2026 · Hệ thống Phân tán & AI Socratic",
    kind: "AI / AGENT SYSTEM",
    status: "active",
    progress: 0.78,
    tasksDone: 7,
    tasksTotal: 9,
    dueText: "in 9 days",
    storyPoints: 1200,
    totalXp: 1200,
    pointsBurned: 936,
    budgetStr: "1,200 SP",
    instructor: "Nguyễn Bá Hòa (Lead)",
    instructorAvatar: "BH",
    members: [CNTT_MEMBERS.bhoa, CNTT_MEMBERS.vhuy, CNTT_MEMBERS.dnghi],
    fav: true,
    colorHex: "#f29b23",
    tlStart: 7.2,
    tlWidth: 35.5,
    tlColor: "amber",
  },
  {
    id: "prj-ecommerce",
    name: "Hệ thống Microservices Thương mại Điện tử",
    client: "SE-402 · Kiến trúc Phần mềm Nâng cao",
    course: "SE-402 · Event-Driven Saga & Kafka Cluster",
    kind: "MICROSERVICES & CLOUD",
    status: "active",
    progress: 0.60,
    tasksDone: 3,
    tasksTotal: 5,
    dueText: "in 14 days",
    storyPoints: 950,
    totalXp: 950,
    pointsBurned: 570,
    budgetStr: "950 SP",
    instructor: "Trần Minh Tuấn (Lead)",
    instructorAvatar: "TT",
    members: [CNTT_MEMBERS.tuan, CNTT_MEMBERS.ha, CNTT_MEMBERS.bhoa],
    fav: true,
    colorHex: "#3b82f6",
    tlStart: 11.4,
    tlWidth: 40.6,
    tlColor: "amber",
  },
  {
    id: "prj-medai",
    name: "MedAI - Phân loại Ảnh X-Quang Phổi & RAG Y khoa",
    client: "AI-301 · Thị giác Máy tính & Học sâu",
    course: "AI-301 · Deep Learning DenseNet & Qdrant Vector DB",
    kind: "AI & COMPUTER VISION",
    status: "active",
    progress: 0.50,
    tasksDone: 2,
    tasksTotal: 4,
    dueText: "in 21 days",
    storyPoints: 850,
    totalXp: 850,
    pointsBurned: 425,
    budgetStr: "850 SP",
    instructor: "Hoàng Trọng Nam (Lead)",
    instructorAvatar: "HN",
    members: [CNTT_MEMBERS.nam, CNTT_MEMBERS.linh, CNTT_MEMBERS.bhoa],
    fav: false,
    colorHex: "#8b5cf6",
    tlStart: 18.0,
    tlWidth: 42.0,
    tlColor: "amber",
  },
  {
    id: "prj-compiler",
    name: "Trình biên dịch Mini C++ với AST Visualizer",
    client: "CS-308 · Nguyên lý Trình biên dịch",
    course: "CS-308 · Lexer DFA, Parser LR(1) & Sinh mã x86-64",
    kind: "COMPILER & RUNTIME",
    status: "delivered",
    progress: 1.0,
    tasksDone: 4,
    tasksTotal: 4,
    dueText: "Delivered",
    storyPoints: 750,
    totalXp: 750,
    pointsBurned: 750,
    budgetStr: "750 SP",
    lead: "Nguyễn Văn A",
    leaderUserId: "usr-sv-02",
    instructor: "Nguyễn Văn A (Lead)",
    instructorAvatar: "NA",
    members: [CNTT_MEMBERS.hasib, CNTT_MEMBERS.dnghi],
    fav: true,
    colorHex: "#10b981",
    tlStart: 5.0,
    tlWidth: 48.0,
    tlColor: "done",
    isMyProject: true,
    isLead: true,
  },
  {
    id: "prj-pintos",
    name: "Mô phỏng Hệ điều hành PintOS: Virtual Memory & Threads",
    client: "CS-204 · Hệ điều hành & Kernel C++",
    course: "CS-204 · Priority Scheduling & Page Table Eviction",
    kind: "OPERATING SYSTEM",
    status: "delivered",
    progress: 1.0,
    tasksDone: 2,
    tasksTotal: 2,
    dueText: "Delivered",
    storyPoints: 800,
    totalXp: 800,
    pointsBurned: 800,
    budgetStr: "800 SP",
    instructor: "Võ Nhật Huy (Lead)",
    instructorAvatar: "VH",
    members: [CNTT_MEMBERS.vhuy, CNTT_MEMBERS.dnghi],
    fav: false,
    colorHex: "#10b981",
    tlStart: 3.0,
    tlWidth: 45.0,
    tlColor: "done",
  },
  {
    id: "prj-security",
    name: "Công cụ DAST Quét Lỗ hổng Web Tự động (OWASP Top 10)",
    client: "SEC-305 · An toàn & An ninh Mạng Máy tính",
    course: "SEC-305 · SQLi Fuzzing & CVSS v3.1 Automated Scoring",
    kind: "CYBERSECURITY",
    status: "review",
    progress: 0.80,
    tasksDone: 4,
    tasksTotal: 5,
    dueText: "in 3 days",
    storyPoints: 720,
    totalXp: 720,
    pointsBurned: 576,
    budgetStr: "720 SP",
    instructor: "Nguyễn Bá Hòa (Lead)",
    instructorAvatar: "BH",
    members: [CNTT_MEMBERS.bhoa, CNTT_MEMBERS.dnghi],
    fav: false,
    colorHex: "#ef4444",
    tlStart: 25.0,
    tlWidth: 35.0,
    tlColor: "amber",
  },
  {
    id: "prj-faceattend",
    name: "FaceAttend AI - Điểm danh Khuôn mặt Edge AI trên Pi 4",
    client: "CS-315 · Ứng dụng Di động & IoT Thông minh",
    course: "CS-315 · MobileFaceNet INT8 Quantization & MQTT Sync",
    kind: "EDGE AI & IOT",
    status: "planning",
    progress: 0.25,
    tasksDone: 1,
    tasksTotal: 4,
    dueText: "in 28 days",
    storyPoints: 650,
    totalXp: 650,
    pointsBurned: 162,
    budgetStr: "650 SP",
    instructor: "Võ Nhật Huy (Lead)",
    instructorAvatar: "VH",
    members: [CNTT_MEMBERS.vhuy, CNTT_MEMBERS.bhoa],
    fav: false,
    colorHex: "#f59e0b",
    tlStart: 35.0,
    tlWidth: 42.0,
    tlColor: "amber",
  },
  {
    id: "prj-devnet",
    name: "DevNet - Mạng Xã hội Chia sẻ Code Snippet & Fork Tree",
    client: "SE-210 · Đồ án Phát triển Ứng dụng Web",
    course: "SE-210 · Monaco Editor & Fork Tree Database Schema",
    kind: "WEB PLATFORM",
    status: "planning",
    progress: 0.33,
    tasksDone: 1,
    tasksTotal: 3,
    dueText: "in 35 days",
    storyPoints: 580,
    totalXp: 580,
    pointsBurned: 191,
    budgetStr: "580 SP",
    instructor: "Võ Nhật Huy (Lead)",
    instructorAvatar: "VH",
    members: [CNTT_MEMBERS.vhuy, CNTT_MEMBERS.dnghi],
    fav: false,
    colorHex: "#06b6d4",
    tlStart: 42.0,
    tlWidth: 38.0,
    tlColor: "amber",
  },
];

// 16 Timeline Weeks Header matching Marlo 1:1
const SEMESTER_WEEKS = [
  { id: "w1", label: "7 Sept" },
  { id: "w2", label: "14 Sept" },
  { id: "w3", label: "21 Sept" },
  { id: "w4", label: "28 Sept" },
  { id: "w5", label: "5 Oct" },
  { id: "w6", label: "12 Oct" },
  { id: "w7", label: "19 Oct" },
  { id: "w8", label: "26 Oct" },
  { id: "w9", label: "2 Nov" },
  { id: "w10", label: "Today", isNow: true },
  { id: "w11", label: "16 Nov" },
  { id: "w12", label: "23 Nov" },
  { id: "w13", label: "30 Nov" },
  { id: "w14", label: "7 Dec" },
  { id: "w15", label: "14 Dec" },
  { id: "w16", label: "21 Dec" },
];

/**
 * 🏷️ Pure Marlo Circular Ring Component (Ported from marlo-app charts.jsx)
 */
function MarloRing({
  value,
  size = 64,
  stroke = 7,
  isDone = false,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  isDone?: boolean;
  children?: React.ReactNode;
}) {
  const arcRef = useRef<SVGCircleElement>(null);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const animRef = useRef({ v: 0 });

  useLayoutEffect(() => {
    const target = Math.max(0, Math.min(1, value));
    gsap.to(animRef.current, {
      v: target,
      duration: 1.1,
      ease: "expo.out",
      delay: 0.2,
      onUpdate: () => {
        arcRef.current?.setAttribute(
          "stroke-dashoffset",
          String(circumference * (1 - animRef.current.v))
        );
      },
    });
  }, [value, circumference]);

  return (
    <span className={`marlo-ring ${isDone ? "is-done" : ""}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="ring__track" />
        <circle
          ref={arcRef}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          className="ring__arc"
        />
      </svg>
      <span className="ring__in">{children}</span>
    </span>
  );
}

import type { Role } from "../App";

interface MarloProjectsScreenProps {
  onOpenProject?: (project: CNTTProjectItem) => void;
  onOpenProjectDetail?: (projectId: string) => void;
  onOpenGitHub?: (projectId: string) => void;
  role?: Role;
}

export function computeIsMyProject(project: CNTTProjectItem, user: any): boolean {
  if (!user) return true;
  const role = String(user.role || "").toLowerCase();
  if (role === "admin" || role === "instructor") return true;
  const uid = String(user.id || "").trim();
  const email = String(user.email || "").trim().toLowerCase();
  const name = String(user.full_name || user.display_name || user.name || "").trim().toLowerCase();

  if (project.leaderUserId && (project.leaderUserId === uid || project.leaderUserId === `usr-${uid}`)) return true;
  if (project.lead && name && (project.lead.toLowerCase().includes(name) || name.includes(project.lead.toLowerCase()))) return true;

  if (Array.isArray(project.members)) {
    for (const m of project.members) {
      const mId = String(m.id || "").trim();
      const mEmail = String((m as any).email || "").trim().toLowerCase();
      const mName = String(m.name || "").trim().toLowerCase();
      if (mId && (mId === uid || mId === `usr-${uid}`)) return true;
      if (mEmail && mEmail === email) return true;
      if (mName && name && (mName.includes(name) || name.includes(mName))) return true;
    }
  }
  return false;
}

export default function MarloProjectsScreen({
  onOpenProject,
  onOpenProjectDetail,
  onOpenGitHub,
  role = "student",
}: MarloProjectsScreenProps) {
  const currentUser = useMemo(() => getStoredUser(role), [role]);
  const isStudent = role === "student";
  const [projectScope, setProjectScope] = useState<"my" | "all">(() => (isStudent ? "my" : "all"));

  const [activeTab, setActiveTab] = useState<"slate" | "timeline">("slate");
  const [displayedTab, setDisplayedTab] = useState<"slate" | "timeline">("slate");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [projects, setProjects] = useState<CNTTProjectItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [gradingProject, setGradingProject] = useState<CNTTProjectItem | null>(null);
  const [isSubmissionLocked, setIsSubmissionLocked] = useState<boolean>(() =>
    isGlobalSubmissionLocked()
  );
  const [lockVersion, setLockVersion] = useState(0);

  useEffect(() => {
    return subscribeProjectLockChanges(() => {
      setIsSubmissionLocked(isGlobalSubmissionLocked());
      setLockVersion((v) => v + 1);
    });
  }, []);

  const frozenProjectIds = useMemo(
    () => projects.filter((p) => isProjectFrozen(p.id)).map((p) => p.id),
    [projects, lockVersion, isSubmissionLocked]
  );
  const anyFrozen = isSubmissionLocked || frozenProjectIds.length > 0;
  const [assignMentorProject, setAssignMentorProject] = useState<CNTTProjectItem | null>(null);
  const [selectedMentor, setSelectedMentor] = useState("TS. Nguyễn Phước (GV Hướng dẫn)");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const tabsNavRef = useRef<HTMLElement>(null);
  const tabLineRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tlInnerRef = useRef<HTMLDivElement>(null);
  const isFirstTabRender = useRef(true);

  // ─── GitHub-style Collaborator Invitations ───
  const [pendingInvitations, setPendingInvitations] = useState<ProjectInvitationItem[]>([]);

  const loadInvitations = async () => {
    try {
      const res = await fetchProjectInvitationsApi();
      if (res?.pending) {
        setPendingInvitations(res.pending);
      }
    } catch {
      setPendingInvitations([]);
    }
  };

  useEffect(() => {
    void loadInvitations();
  }, []);

  const handleAcceptInvite = async (invId: string, projName: string) => {
    const res = await acceptProjectInvitationApi(invId);
    if (res.success) {
      setToastMsg(`✓ Bạn đã đồng ý gia nhập đồ án "${projName}" thành công!`);
      void loadInvitations();
      void loadProjectsFromApi();
    } else {
      setToastMsg(`✕ ${res.message}`);
    }
  };

  const handleDeclineInvite = async (invId: string) => {
    const res = await declineProjectInvitationApi(invId);
    if (res.success) {
      setToastMsg("Đã từ chối lời mời tham gia đồ án.");
      void loadInvitations();
    } else {
      setToastMsg(`✕ ${res.message}`);
    }
  };

  const loadProjectsFromApi = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetchKanbanWorkspace(isStudent ? "my" : "all");
      if (res?.projects) {
        res.projects.forEach((p) => {
          if (typeof p.isFrozen === "boolean") {
            setProjectFrozen(p.id, p.isFrozen);
          }
        });
        setProjects(
          res.projects.map((p) => ({
            id: p.id,
            name: p.name,
            client: p.client,
            course: p.course,
            kind: p.kind,
            status: p.status,
            progress: p.progress,
            tasksDone: p.tasksDone,
            tasksTotal: p.tasksTotal,
            dueText:
              p.status === "delivered"
                ? "Đã hoàn thành"
                : (p.dueText || "").replace(/^in (\d+) days$/i, "Còn $1 ngày").replace(/^Delivered$/i, "Đã hoàn thành") ||
                  `Hạn ${p.dueDate}`,
            storyPoints: p.storyPoints,
            pointsBurned: p.pointsBurned,
            budgetStr: p.budgetStr,
            lead: p.lead || p.members?.[0]?.name || "Nhóm trưởng",
            instructor: p.instructor || "TS. Nguyễn Phước (GV Hướng dẫn)",
            instructorAvatar: p.instructorAvatar,
            finalScore: p.finalScore ?? null,
            totalXp: p.totalXp,
            members: p.members || [],
            fav: p.fav,
            colorHex: p.colorHex,
            tlStart: p.tlStart,
            tlWidth: p.tlWidth,
            tlColor: p.tlColor,
            gitRepo: p.gitRepo ?? null,
            isMyProject: p.isMyProject ?? computeIsMyProject(p as any, currentUser),
            isLead: p.isLead,
            leaderUserId: p.leaderUserId,
          }))
        );
      }
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    void loadProjectsFromApi();
  }, [isStudent]);

  const handleToggleSubmissionLock = async () => {
    const next = !anyFrozen;
    setIsSubmissionLocked(next);
    setGlobalSubmissionLocked(next);
    setLockVersion((v) => v + 1);
    await Promise.all(
      projects.map((p) => updateWorkspaceProjectApi(p.id, { is_frozen: next }))
    );
    setToastMsg(
      next
        ? "🔒 Đã khóa cổng đăng ký & đóng băng nộp bài toàn khóa (đồng bộ MySQL · Dự án · Kanban · Git Hub)."
        : "🔓 Đã mở lại cổng đăng ký & gỡ đóng băng cho toàn bộ đồ án (đồng bộ MySQL · Dự án · Kanban · Git Hub)."
    );
  };

  const handleExportProjectsCsv = (mode: "admin" | "instructor") => {
    const headers = [
      "Mã Đồ Án",
      "Tên Đề Tài",
      "Học Phần",
      "Phân Loại Kỹ Thuật",
      "Trạng Thái",
      "Tiến Độ (%)",
      "Tasks Hoàn Thành",
      "Tổng Tasks",
      "Story Points Đã Đốt",
      "Quỹ Story Points",
      "Nhóm Trưởng",
      "Giảng Viên Hướng Dẫn",
      "Điểm Hội Đồng DoD",
      "Hạn Nộp",
    ];
    const statusLabelMap: Record<string, string> = {
      planning: "Lên kế hoạch",
      active: "Đang phát triển",
      review: "Chờ nghiệm thu",
      delivered: "Đã hoàn thành",
    };
    const rows = projects.map((p) => {
      const leadName = p.lead || p.members?.[0]?.name || "Nguyễn Bá Hòa";
      const mentorName = p.instructor || "TS. Nguyễn Phước (GV Hướng dẫn)";
      return [
        p.id.toUpperCase(),
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${(p.course || p.client || "").replace(/"/g, '""')}"`,
        `"${(p.kind || "").replace(/"/g, '""')}"`,
        statusLabelMap[p.status] || p.status,
        Math.round(p.progress * 100),
        p.tasksDone,
        p.tasksTotal,
        p.pointsBurned,
        p.storyPoints,
        `"${leadName.replace(/"/g, '""')}"`,
        `"${mentorName.replace(/"/g, '""')}"`,
        p.finalScore != null ? `${p.finalScore}/10` : "Chưa chấm",
        `"${(p.dueText || "").replace(/"/g, '""')}"`,
      ];
    });
    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const prefix = mode === "admin" ? "codemind-master-projects" : "codemind-progress-report";
    link.setAttribute("download", `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToastMsg(
      mode === "admin"
        ? `✓ Đã xuất file Master Report CSV cho toàn bộ ${projects.length} đồ án.`
        : `✓ Đã xuất file Báo cáo thẩm định tiến độ CSV cho ${projects.length} nhóm đồ án.`
    );
  };

  // Scoped projects based on user participation (Strict student scoping)
  const scopedProjects = useMemo(() => {
    if (isStudent) {
      return projects.filter((p) => p.isMyProject ?? computeIsMyProject(p, currentUser));
    }
    if (projectScope === "all") return projects;
    return projects.filter((p) => p.isMyProject ?? computeIsMyProject(p, currentUser));
  }, [projects, projectScope, currentUser, isStudent]);

  // Filtered projects for Slate view
  const filteredProjects = useMemo(() => {
    return scopedProjects.filter((p) => {
      if (filterStatus === "all") return true;
      if (filterStatus === "planning") return p.status === "planning";
      if (filterStatus === "active") return p.status === "active";
      if (filterStatus === "review") return p.status === "review";
      if (filterStatus === "delivered") return p.status === "delivered";
      return true;
    });
  }, [scopedProjects, filterStatus]);

  // Dynamic stats
  const activeJobs = scopedProjects.filter((p) => p.status !== "delivered").length;
  const totalStoryPoints = scopedProjects.reduce((acc, p) => acc + p.storyPoints, 0);

  // Toggle favorite / pin
  const handleToggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const target = projects.find((p) => p.id === id);
    if (!target) return;
    const nextFav = !target.fav;
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, fav: nextFav } : p)));
    setToastMsg(nextFav ? `${target.name} pinned.` : `${target.name} unpinned.`);
    void updateWorkspaceProjectApi(id, { fav: nextFav });
  };

  // ─── MARLO SLIDING UNDERLINE (tabs__line) ───
  useLayoutEffect(() => {
    if (!tabsNavRef.current || !tabLineRef.current) return;
    const activeBtn = tabsNavRef.current.querySelector<HTMLElement>('[aria-current="page"]');
    if (activeBtn) {
      animateMarloPill(tabLineRef.current, activeBtn, {
        animate: !isFirstTabRender.current,
        radius: 2,
        line: true,
      });
      isFirstTabRender.current = false;
    }
  }, [activeTab]);

  // Keep line aligned on resize / font load
  useEffect(() => {
    const recompute = () => {
      if (!tabsNavRef.current || !tabLineRef.current) return;
      const activeBtn = tabsNavRef.current.querySelector<HTMLElement>('[aria-current="page"]');
      if (activeBtn) {
        animateMarloPill(tabLineRef.current, activeBtn, {
          animate: false,
          radius: 2,
          line: true,
        });
      }
    };

    const ro = new ResizeObserver(recompute);
    if (tabsNavRef.current) {
      ro.observe(tabsNavRef.current);
      Array.from(tabsNavRef.current.children).forEach((ch) => ro.observe(ch));
    }
    document.fonts?.ready.then(recompute);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, []);

  // ─── SWITCH TAB WITH AUTHENTIC MARLO VIEW TRANSITION ───
  const switchTab = (nextTab: "slate" | "timeline") => {
    if (nextTab === activeTab || isTransitioning) return;

    const dir = nextTab === "timeline" ? 1 : -1;
    setActiveTab(nextTab);
    setIsTransitioning(true);

    const stage = stageRef.current;
    if (!stage) {
      setDisplayedTab(nextTab);
      setIsTransitioning(false);
      return;
    }

    // Exit animation: items drop slightly and scale down, stage slides left/right
    const exitItems = stage.querySelectorAll(".pcard, .pgrid, .tl, .tl__row, .toolbar");
    const exitTl = gsap.timeline({
      onComplete: () => {
        setDisplayedTab(nextTab);
        setIsTransitioning(false);
      },
    });

    if (exitItems.length > 0) {
      exitTl.to(
        exitItems,
        {
          opacity: 0,
          y: 8,
          scale: 0.985,
          duration: 0.2,
          ease: "power2.in",
          stagger: 0.008,
          overwrite: true,
        },
        0
      );
    }

    exitTl.to(
      stage,
      {
        x: -dir * 18,
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
        overwrite: true,
      },
      0
    );
  };

  // ─── ENTER ANIMATION WHEN DISPLAYED TAB CHANGES ───
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const dir = displayedTab === "timeline" ? 1 : -1;

    // View container slides in with expo.out
    gsap.fromTo(
      stage,
      { x: dir * 24, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.65,
        ease: "expo.out",
        clearProps: "transform,opacity",
      }
    );

    // Stagger child elements
    if (displayedTab === "slate") {
      const cards = stage.querySelectorAll(".pcard");
      animateMarloCards(cards, { y: 22, stagger: 0.035, duration: 0.75 });
    }
  }, [displayedTab]);

  // ─── TIMELINE EXACT MARLO ANIMATION ───
  useLayoutEffect(() => {
    if (displayedTab !== "timeline" || !tlInnerRef.current) return;
    const n = tlInnerRef.current;
    const r = n.parentElement;
    const todayEl = n.querySelector<HTMLElement>(".tl__today");

    if (r && r.scrollWidth > r.clientWidth && todayEl) {
      r.scrollLeft = Math.max(0, todayEl.offsetLeft - r.clientWidth * 0.55);
    }

    // 1. Stagger rows into view quickly
    const rows = n.querySelectorAll(".tl__row");
    gsap.fromTo(
      rows,
      { opacity: 0, x: -8 },
      {
        opacity: 1,
        x: 0,
        duration: 0.35,
        ease: "power3.out",
        stagger: 0.02,
        clearProps: "transform,opacity",
      }
    );

    // 2. Bar scaleX expand immediately
    const bars = n.querySelectorAll(".tl__bar");
    gsap.fromTo(
      bars,
      { scaleX: 0.15 },
      {
        scaleX: 1,
        duration: 0.45,
        stagger: 0.03,
        ease: "expo.out",
        clearProps: "transform",
      }
    );

    // 3. Fill scaleX to project progress
    const fills = n.querySelectorAll<HTMLElement>(".tl__fill");
    fills.forEach((fill, idx) => {
      const targetProgress = Math.max(0.06, filteredProjects[idx]?.progress ?? projects[idx]?.progress ?? 0);
      gsap.fromTo(
        fill,
        { scaleX: 0 },
        {
          scaleX: targetProgress,
          duration: 0.55,
          delay: 0.08 + idx * 0.03,
          ease: "expo.out",
        }
      );
    });

    // 4. Today line drops down from top
    if (todayEl) {
      gsap.fromTo(
        todayEl,
        { scaleY: 0, opacity: 0 },
        {
          scaleY: 1,
          opacity: 1,
          duration: 0.45,
          delay: 0.15,
          ease: "expo.out",
          transformOrigin: "50% 0%",
          clearProps: "transform,opacity",
        }
      );
    }
  }, [displayedTab, projects, filterStatus]);

  // Animate cards when filter status changes in Slate view
  const prevFilterRef = useRef(filterStatus);
  useLayoutEffect(() => {
    if (displayedTab !== "slate" || !stageRef.current) return;
    if (prevFilterRef.current !== filterStatus) {
      const cards = stageRef.current.querySelectorAll(".pcard");
      animateMarloCards(cards, { y: 16, stagger: 0.03, duration: 0.5 });
      prevFilterRef.current = filterStatus;
    }
  }, [filterStatus, displayedTab]);

  // Handle create project
  const handleCreateProject = async (newP: any) => {
    const budgetNum = newP.budget ? Number(newP.budget) : 18000;
    const storyPts = newP.storyPoints || Math.round(budgetNum / 100);
    const saved = await createWorkspaceProjectApi({
      name: newP.name,
      client: newP.client || "CodeMind Campus",
      course: newP.course || newP.client || "CNTT-2026 · Đồ án Chuyên ngành",
      kind: (newP.kind || "AI / FULLSTACK").toUpperCase(),
      status: "active",
      fav: true,
      due_date: newP.dueDate || "15/12/2026",
      due_text: newP.dueDate ? `due ${newP.dueDate}` : "in 30 days",
      story_points: storyPts,
      team_members: Array.isArray(newP.teamMembers) ? newP.teamMembers : [],
      invited_user_ids: newP.invited_user_ids,
      member_roles: newP.member_roles,
      repo_url: newP.repoUrl,
    });

    const created: CNTTProjectItem = saved
      ? {
          id: saved.id,
          name: saved.name,
          client: saved.client,
          course: saved.course,
          kind: saved.kind,
          status: saved.status,
          progress: saved.progress,
          tasksDone: saved.tasksDone,
          tasksTotal: saved.tasksTotal,
          dueText: saved.dueText,
          storyPoints: saved.storyPoints,
          pointsBurned: saved.pointsBurned,
          budgetStr: saved.budgetStr,
          instructor: saved.instructor,
          instructorAvatar: saved.instructorAvatar,
          totalXp: saved.totalXp,
          members: saved.members || [],
          fav: saved.fav,
          colorHex: saved.colorHex,
          tlStart: saved.tlStart,
          tlWidth: saved.tlWidth,
          tlColor: saved.tlColor,
          gitRepo: saved.gitRepo ?? null,
          isMyProject: true,
          isLead: true,
        }
      : {
          id: "prj-" + Date.now(),
          name: newP.name,
          client: newP.client || "CodeMind Campus",
          course: newP.course || newP.client || "CNTT-2026 · Đồ án Chuyên ngành",
          kind: (newP.kind || "COMMERCIAL").toUpperCase(),
          status: "active",
          progress: 0,
          tasksDone: 0,
          tasksTotal: 1,
          dueText: newP.dueDate ? `due ${newP.dueDate}` : "in 30 days",
          storyPoints: storyPts,
          pointsBurned: 0,
          budgetStr: newP.budgetStr || `${storyPts} SP`,
          members:
            newP.teamMembers && newP.teamMembers.length > 0
              ? newP.teamMembers.map((mName: string, idx: number) => ({
                  id: `tm-${idx}-${Date.now()}`,
                  name: mName,
                  initials: mName.slice(0, 2).toUpperCase(),
                  role: "Team Member",
                  bg: ["#C7D2FE", "#FCD34D", "#FED7AA", "#A7F3D0", "#E9D5FF", "#CCFBF1"][idx % 6],
                  textColor: ["#312E81", "#78350F", "#7C2D12", "#064E3B", "#581C87", "#115E59"][idx % 6],
                }))
              : [CNTT_MEMBERS.vhuy, CNTT_MEMBERS.dnghi],
          colorHex: "#f29b23",
          tlStart: 45,
          tlWidth: 28,
          tlColor: "amber",
          isMyProject: true,
          isLead: true,
        };
    setProjects((prev) => [created, ...prev]);
    setIsNewProjectModalOpen(false);
    setToastMsg(`✓ Đã khởi tạo đồ án "${created.name}" thành công!`);
    void loadProjectsFromApi();
    void loadInvitations();
  };

  return (
    <div
      className="min-h-screen bg-transparent text-[#161718] dark:text-[#f0f0f1] p-4 sm:p-6 lg:p-8 font-sans select-none relative overflow-x-hidden transition-colors duration-200"
    >
      {/* ─── TOP HEADER (3-ROLE ADAPTIVE DESIGN: STUDENT vs INSTRUCTOR vs ADMIN) ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E1D1B] dark:text-white font-sans">
              {role === "admin"
                ? "Trung Tâm Quản Trị Đồ Án Toàn Khóa"
                : role === "instructor"
                ? "Hội Đồng Hướng Dẫn & Đánh Giá Đồ Án"
                : "Không Gian Đồ Án Nhóm Của Tôi"}
            </h1>
            {role === "admin" && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-slate-200/80 dark:border-slate-800">
                Quản trị viên / Đào tạo
              </span>
            )}
            {role === "instructor" && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-slate-200/80 dark:border-slate-800">
                Góc nhìn Giảng viên
              </span>
            )}
            {role === "student" && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-slate-200/80 dark:border-slate-800">
                Học viên thực hiện
              </span>
            )}
            {anyFrozen && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-600 text-white inline-flex items-center gap-1">
                <Lock size={11} />
                <span>
                  {isSubmissionLocked
                    ? "Cổng nộp đã khóa (FROZEN)"
                    : `Đang đóng băng ${frozenProjectIds.length} đồ án (FROZEN)`}
                </span>
              </span>
            )}
          </div>
          <p className="text-sm text-[#62656b] dark:text-[#a0a3a9] mt-1 font-normal max-w-3xl leading-relaxed">
            {role === "admin"
              ? `Quản lý toàn bộ ${projects.length} đồ án Capstone, phân công Giảng viên hướng dẫn & Hội đồng bảo vệ, kiểm soát cổng nộp bài và xuất dữ liệu báo cáo.`
              : role === "instructor"
              ? `Giám sát tiến độ ${projects.length} nhóm đồ án Capstone, thẩm định Definition of Done (DoD) và thực hiện đánh giá Hội đồng.`
              : `Theo dõi tiến độ Sprint của nhóm bạn, phân bổ Story Points (${totalStoryPoints} SP), hoàn thành tiêu chí DoD và chuẩn bị nghiệm thu.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {role === "admin" ? (
            <>
              <button
                type="button"
                onClick={handleToggleSubmissionLock}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer ${
                  anyFrozen
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950"
                }`}
                title="Khóa cổng để đóng băng dữ liệu đăng ký và nộp đồ án của học viên (đồng bộ Dự án · Kanban · Git Hub)"
              >
                {anyFrozen ? <Lock size={14} /> : <Unlock size={14} />}
                <span>
                  {isSubmissionLocked
                    ? "Mở Khóa Cổng Nộp"
                    : anyFrozen
                    ? `Mở Khóa (${frozenProjectIds.length} đóng băng)`
                    : "Khóa Cổng Nộp"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (projects.length > 0) {
                    setAssignMentorProject(projects[0]);
                    setSelectedMentor(projects[0].instructor || "TS. Nguyễn Phước (GV Hướng dẫn)");
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#EE8420] hover:bg-[#d97316] text-slate-950 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                title="Phân công Giảng viên hướng dẫn & Cố vấn kiến trúc cho từng đồ án"
              >
                <Users size={14} />
                <span>Phân Công GVHD</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportProjectsCsv("admin")}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200/90 dark:border-slate-700/80 shadow-2xs transition cursor-pointer"
                title="Xuất dữ liệu toàn bộ 8+ nhóm đồ án sang bảng tính CSV/Excel"
              >
                <FileSpreadsheet size={14} />
                <span>Master Excel ({projects.length})</span>
              </button>
            </>
          ) : role === "instructor" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (projects.length > 0) {
                    setGradingProject(projects[0]);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-[#EE8420] hover:from-amber-600 hover:to-[#d97316] text-white font-bold text-sm shadow-xs transition active:scale-95 cursor-pointer"
                title="Mở bảng thẩm định chấm điểm đồ án theo rubric Anti-Freerider"
              >
                <ShieldCheck size={16} strokeWidth={2.5} />
                <span>Chấm Điểm Đồ Án (DoD)</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportProjectsCsv("instructor")}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200/90 dark:border-slate-700/80 shadow-2xs transition cursor-pointer"
                title="Xuất file CSV báo cáo tiến độ và mức độ đóng góp của toàn bộ các nhóm"
              >
                <Download size={14} />
                <span>Báo Cáo Tiến Độ ({projects.length})</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              disabled={isSubmissionLocked}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-2xl font-bold text-sm shadow-xs transition active:scale-95 cursor-pointer ${
                isSubmissionLocked
                  ? "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                  : "bg-[#EE8420] hover:bg-[#d97316] text-slate-950"
              }`}
              title={isSubmissionLocked ? "Cổng nộp đề tài đang tạm khóa bởi Quản trị viên" : "Đăng ký đề tài đồ án mới"}
            >
              {isSubmissionLocked ? <Lock size={15} /> : <Plus size={16} strokeWidth={2.5} />}
              <span>{isSubmissionLocked ? "Cổng Đang Khóa" : "Đăng Ký Đồ Án"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── PENDING PROJECT INVITATIONS BANNER (GITHUB COLLABORATOR STYLE) ─── */}
      {pendingInvitations.length > 0 && (
        <div className="mb-6 space-y-3">
          {pendingInvitations.map((inv) => (
            <div
              key={inv.id}
              className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <Bell size={20} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Lời mời tham gia đồ án</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-200/60 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-mono text-[10px]">
                      GitHub Collaborator
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {inv.inviter_name}
                    </span>{" "}
                    đã mời bạn gia nhập đồ án{" "}
                    <span className="font-bold underline decoration-amber-500 decoration-2">
                      {inv.project_name}
                    </span>{" "}
                    với vai trò{" "}
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                      {inv.role_title}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleAcceptInvite(inv.id, inv.project_name)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer active:scale-95 shadow-xs flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Đồng ý tham gia</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeclineInvite(inv.id)}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer active:scale-95 flex items-center gap-1"
                >
                  <X size={14} />
                  <span>Từ chối</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── AUTHENTIC MARLO SUB-NAV TABS & SCOPE TOGGLE ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <nav
          ref={tabsNavRef}
          className="tabs notranslate mb-0"
          translate="no"
          aria-label="Sections"
        >
          <button
            type="button"
            aria-current={activeTab === "slate" ? "page" : undefined}
            onClick={() => switchTab("slate")}
          >
            Lưới Đồ Án ({filteredProjects.length})
          </button>
          <button
            type="button"
            aria-current={activeTab === "timeline" ? "page" : undefined}
            onClick={() => switchTab("timeline")}
          >
            Lộ Trình Học Kỳ ({scopedProjects.length} Đồ Án)
          </button>
          <span ref={tabLineRef} className="tabs__line" />
        </nav>

        {/* User Scope Toggle: Đồ án của tôi vs Tất cả đề tài */}
        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          <button
            type="button"
            onClick={() => setProjectScope("my")}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              projectScope === "my"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
            }`}
          >
            <User size={13} />
            <span>Đồ án của tôi</span>
            <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-bold">
              {projects.filter((p) => p.isMyProject ?? computeIsMyProject(p, currentUser)).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setProjectScope("all")}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              projectScope === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
            }`}
          >
            <Layers size={13} />
            <span>Tất cả đề tài</span>
            <span className="ml-0.5 px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-bold">
              {projects.length}
            </span>
          </button>
        </div>
      </div>

      {/* ─── STAGE CONTAINER: ANIMATES ON VIEW SWITCH ─── */}
      <div ref={stageRef} className="w-full">
        {/* ─── TAB 1: MARLO SLATE GRID ─── */}
        {displayedTab === "slate" && (
          <div className="w-full">
            {/* Segmented Control Filter Bar */}
            <div className="toolbar">
              <MarloSegmentedControl
                value={filterStatus}
                options={[
                  { id: "all", label: "Tất cả", badge: scopedProjects.length },
                  { id: "planning", label: "Lên kế hoạch", badge: scopedProjects.filter((p) => p.status === "planning").length },
                  { id: "active", label: "Đang phát triển", badge: scopedProjects.filter((p) => p.status === "active").length },
                  { id: "review", label: "Chờ nghiệm thu", badge: scopedProjects.filter((p) => p.status === "review").length },
                  { id: "delivered", label: "Đã hoàn thành", badge: scopedProjects.filter((p) => p.status === "delivered").length },
                ]}
                onChange={(val) => setFilterStatus(val)}
                tone="dark"
              />
            </div>

            {/* Cards Grid: 3 columns on desktop matching Marlo pgrid */}
            {loadingProjects ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-3" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Đang tải danh sách đồ án thực tế từ hệ thống...
                </p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 border border-slate-200 dark:border-slate-700">
                  <FolderKanban size={20} />
                </div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {projects.length === 0 ? "Bạn chưa tham gia đồ án nào" : "Không có đồ án nào trong mục này"}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  {projects.length === 0
                    ? "Hãy nhấn \"Đăng Ký Đồ Án\" để khởi tạo đề tài mới với vai trò Nhóm trưởng, hoặc kiểm tra lời mời tham gia ở trên."
                    : "Chọn bộ lọc khác hoặc nhấn \"Đăng Ký Đồ Án\" để thêm đề tài mới."}
                </p>
                {role === "student" && (
                  <button
                    type="button"
                    onClick={() => setIsNewProjectModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EE8420] hover:bg-[#d97316] text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Đăng Ký Đồ Án Mới</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="pgrid">
                {filteredProjects.map((p) => {
                  const isDone = p.status === "delivered";
                  const isCardFrozen = isProjectFrozen(p.id);
                  const leadName = p.lead || p.members?.[0]?.name || "Nguyễn Bá Hòa";
                  const mentorName = p.instructor || "TS. Nguyễn Phước (GVHD)";

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (onOpenProjectDetail) {
                          onOpenProjectDetail(p.id);
                        } else {
                          onOpenProject?.(p);
                        }
                      }}
                      className={`pcard cursor-pointer group ${isCardFrozen ? "ring-1 ring-rose-300 dark:ring-rose-800/70" : ""}`}
                      title="Nhấn để xem trang Chi Tiết Đồ Án"
                    >
                      {/* Top row: Kind + DoD Score / Role Quick Action + Pin Button */}
                      <div className="pcard__top">
                        <span
                          className="pcard__kind"
                          style={{ "--cc": p.colorHex || "#E5A023" } as React.CSSProperties}
                        >
                          {p.kind}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {p.isMyProject && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              title="Đồ án bạn đang trực tiếp tham gia"
                            >
                              <UserCheck size={10} />
                              <span>{p.isLead ? "Trưởng nhóm" : "Của bạn"}</span>
                            </span>
                          )}
                          {isCardFrozen && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              title="Đồ án đang bị đóng băng (Dự án · Kanban · Git Hub)"
                            >
                              <Lock size={10} />
                              <span>Đóng băng</span>
                            </span>
                          )}
                          {p.finalScore != null && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono"
                              title="Điểm Hội đồng Chấm Đồ án (DoD)"
                            >
                              {p.finalScore}/10
                            </span>
                          )}
                          {role === "instructor" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGradingProject(p);
                              }}
                              className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 transition cursor-pointer"
                              title={`Chấm điểm DoD cho đồ án ${p.name}`}
                            >
                              Chấm DoD
                            </button>
                          )}
                          {role === "admin" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssignMentorProject(p);
                                setSelectedMentor(p.instructor || "TS. Nguyễn Phước (GV Hướng dẫn)");
                              }}
                              className="px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                              title={`Đổi GVHD cho đồ án ${p.name}`}
                            >
                              Đổi GVHD
                            </button>
                          )}
                          <button
                            type="button"
                            className={`pcard__pin ${p.fav ? "is-on" : ""}`}
                            aria-pressed={p.fav}
                            aria-label={p.fav ? "Bỏ ghim" : "Ghim"}
                            onClick={(e) => handleToggleFav(p.id, e)}
                          >
                            <Pin size={14} className={p.fav ? "fill-current text-[#E5A023]" : "text-slate-400 hover:text-slate-600"} />
                          </button>
                        </div>
                      </div>

                      {/* Middle: Ring progress + Project name & client */}
                      <div className="pcard__mid">
                        <MarloRing
                          value={p.progress}
                          size={64}
                          stroke={7}
                          isDone={isDone}
                        >
                          <b>{Math.round(p.progress * 100)}%</b>
                        </MarloRing>
                        <div className="pcard__name">
                          <b>{p.name}</b>
                          <small>{p.client}</small>
                        </div>
                      </div>

                      {/* Meta: Status pill + Check tasks + Due text */}
                      <div className="pcard__meta">
                        <span
                          className={`pill ${
                            isDone
                              ? "pill--good tone-green"
                              : p.status === "review"
                              ? "pill--info tone-blue"
                              : p.status === "active"
                              ? "pill--accent tone-warm"
                              : "pill--plain tone-gray"
                          }`}
                        >
                          {p.status === "planning"
                            ? "Lên kế hoạch"
                            : p.status === "active"
                            ? "Đang phát triển"
                            : p.status === "review"
                            ? "Chờ nghiệm thu"
                            : "Đã hoàn thành"}
                        </span>

                        <span>
                          <Check size={13} strokeWidth={2.5} />
                          {p.tasksDone}/{p.tasksTotal} task
                        </span>

                        <span>
                          <Clock size={13} />
                          {p.dueText}
                        </span>
                      </div>

                      {/* Tiến độ Story Points burn bar */}
                      <div className="pcard__burn">
                        <span>Tiến độ Story Points</span>
                        <b>{Math.round(p.progress * 100)}%</b>
                      </div>
                      <div className="pcard__progress">
                        <div
                          className={`pcard__progress-bar ${isDone ? "is-done" : ""}`}
                          style={{ width: `${Math.round(p.progress * 100)}%` }}
                        />
                      </div>

                      {/* Git Repo & Quick 3-Way Navigation Row */}
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0 text-slate-500 dark:text-slate-400">
                          <FolderGit2 size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="font-mono truncate max-w-[140px]" title={p.gitRepo?.repoUrl || "Chưa gắn repo"}>
                            {p.gitRepo?.repoSlug || "Chưa gắn repo"}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400 font-mono">
                            · {p.gitRepo?.commitsCount ?? 0}c / {p.gitRepo?.totalPrsCount ?? 0} PR
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {onOpenProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenProject(p);
                              }}
                              className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold text-[10.5px] inline-flex items-center gap-1 transition cursor-pointer"
                              title={`Mở Bảng Kanban cho ${p.name}`}
                            >
                              <FolderKanban size={10} />
                              <span>Kanban</span>
                            </button>
                          )}
                          {onOpenGitHub && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenGitHub(p.id);
                              }}
                              className="px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10.5px] inline-flex items-center gap-1 transition cursor-pointer"
                              title={`Mở Git Project Hub cho ${p.name}`}
                            >
                              <GitFork size={10} />
                              <span>Git Hub</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Footer: Student Team Lead + Mentor & Story Points (Never overlaps or mislabels GVHD as Lead) */}
                      <div className="pcard__foot">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                          <div className="avstack">
                            {p.members?.slice(0, 3).map((m, mIdx) => (
                              <span
                                key={m.id}
                                className="av av--sm font-bold shadow-2xs relative"
                                style={{
                                  background: m.bg,
                                  color: m.textColor,
                                  zIndex: 10 - mIdx,
                                }}
                                title={`${m.name} (${m.role})`}
                              >
                                {m.initials}
                                {mIdx === 0 && (
                                  <span
                                    className="absolute -top-1 -right-1 z-20 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-[7px] text-slate-950 font-black shadow-xs ring-1 ring-white dark:ring-slate-900"
                                    title="Nhóm trưởng (Team Lead)"
                                  >
                                    ★
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                          <div className="min-w-0 flex flex-col justify-center">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1" title={`Nhóm trưởng: ${leadName}`}>
                              <Crown size={11} className="text-amber-500 fill-amber-500 shrink-0" />
                              <span className="truncate">{leadName.replace(/\(Lead\)/gi, "").trim()}</span>
                            </span>
                            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate" title={`Giảng viên hướng dẫn: ${mentorName}`}>
                              GVHD: {mentorName.replace(/\(GV Hướng dẫn\)|\(GVHD\)/gi, "").trim()}
                            </span>
                          </div>
                        </div>

                        <span className="pcard__budget font-bold shrink-0" title={`Tổng Story Points: ${p.storyPoints} SP`}>
                          {p.storyPoints} SP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: MARLO TIMELINE (16-WEEK ACADEMIC GANTT) ─── */}
        {displayedTab === "timeline" && (
          <section className="card card--flush tl">
            {/* Header: Title + Legend */}
            <div className="chead">
              <div className="chead__text">
                <h2>Lộ trình Triển khai Đồ án qua 16 Tuần Học kỳ</h2>
                <p>Tiến độ thực tế từ tuần khởi tạo đề tài đến kỳ bảo vệ Hội đồng</p>
              </div>
              <div className="legend">
                <span>
                  <i />
                  Đã hoàn thành
                </span>
                <span>
                  <i className="is-ghost" />
                  Còn lại
                </span>
              </div>
            </div>

            {/* Scrollable Gantt Chart Grid */}
            <div className="tl__scroll">
              <div className="tl__inner" ref={tlInnerRef}>
                {/* Timeline Header Row (Axis) */}
                <div className="tl__axis">
                  <span className="tl__namehead">Đồ án & Học phần</span>
                  <div className="tl__weeks">
                    {SEMESTER_WEEKS.map((w) => (
                      <span key={w.id} className={w.isNow ? "is-now" : ""}>
                        {w.isNow ? "Hôm nay" : w.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Timeline Body with Vertical Grid Lines & Projects */}
                <div className="tl__body">
                  {/* Vertical Orange Indicator for "Hôm nay" */}
                  <span
                    className="tl__today"
                    style={{
                      left: "calc(var(--namew) + (100% - var(--namew)) * 0.585)",
                    }}
                  >
                    <em>Hôm nay</em>
                  </span>

                  {/* Project Rows */}
                  {filteredProjects.map((p) => {
                    const isDone = p.status === "delivered";
                    const isAmber = p.tlColor === "amber" || p.status === "active" || p.status === "review";
                    const fillScale = Math.max(0.06, Math.min(1, p.progress || 0));

                    return (
                      <div
                        key={p.id}
                        className="tl__row"
                        onClick={() => {
                          if (onOpenProjectDetail) {
                            onOpenProjectDetail(p.id);
                          } else {
                            onOpenProject?.(p);
                          }
                        }}
                      >
                        {/* Left: Project Name & Client */}
                        <div className="tl__name">
                          <b>{p.name}</b>
                          <small>{p.client}</small>
                        </div>

                        {/* Right: Gantt Lane & Animated Bar */}
                        <div className="tl__lane">
                          <span
                            className={`tl__bar ${
                              isDone
                                ? "is-done"
                                : isAmber
                                ? "c--amber"
                                : ""
                            }`}
                            style={{
                              left: `${p.tlStart ?? 15}%`,
                              width: `${p.tlWidth ?? 35}%`,
                            }}
                            title={`${p.name} (${Math.round(p.progress * 100)}%)`}
                          >
                            {/* Filling portion (always visible via inline transform + GSAP polish) */}
                            <i
                              className="tl__fill"
                              style={{ transform: `scaleX(${fillScale})` }}
                            />
                            {/* Floating percentage label pill */}
                            <span className="tl__label">
                              {Math.round(p.progress * 100)}%
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <p className="tl__foot muted">
              {projects.filter((p) => p.status !== "delivered").length} đồ án đang trong giai đoạn phát triển & chờ nghiệm thu Hội đồng.
            </p>
          </section>
        )}
      </div>

      {/* ─── NEW PROJECT MODAL ─── */}
      <MarloNewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMsg && (
        <MarloToast
          message={toastMsg}
          showUndo={false}
        />
      )}

      {/* ─── INSTRUCTOR PROJECT GRADING MODAL ─── */}
      {gradingProject && (
        <ProjectGradingModal
          isOpen={Boolean(gradingProject)}
          onClose={() => setGradingProject(null)}
          projectId={gradingProject.id}
          projectName={gradingProject.name}
          projectCode={gradingProject.id.toUpperCase()}
          courseName={gradingProject.course}
          onGradingSuccess={(score) => {
            setToastMsg(`✓ Đã chốt điểm Hội đồng ${score}/10 cho đồ án ${gradingProject.name}`);
            setGradingProject(null);
            void loadProjectsFromApi();
          }}
        />
      )}

      {/* ─── ADMIN ASSIGN MENTOR MODAL (MULTI-PROJECT SUPPORT + PERSISTENT MYSQL SAVE) ─── */}
      {assignMentorProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0f1219] p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Phân Công Giảng Viên Hướng Dẫn (GVHD)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chọn đồ án và gán Giảng viên phụ trách thẩm định DoD & hướng dẫn nhóm
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  1. Chọn Đồ án cần phân công ({projects.length} đồ án):
                </label>
                <select
                  value={assignMentorProject.id}
                  onChange={(e) => {
                    const found = projects.find((proj) => proj.id === e.target.value);
                    if (found) {
                      setAssignMentorProject(found);
                      setSelectedMentor(found.instructor || "TS. Nguyễn Phước (GV Hướng dẫn)");
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
                >
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} — Nhóm trưởng: {(proj.lead || proj.members?.[0]?.name || "Nguyễn Bá Hòa").replace(/\(Lead\)/gi, "").trim()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  2. Chọn Giảng viên hướng dẫn:
                </label>
                <select
                  value={selectedMentor}
                  onChange={(e) => setSelectedMentor(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
                >
                  <option value="TS. Nguyễn Phước (GV Hướng dẫn)">TS. Nguyễn Phước (Chủ tịch Hội đồng & Cố vấn Kiến trúc)</option>
                  <option value="TS. Lê Hoàng Mai (GV Hướng dẫn)">TS. Lê Hoàng Mai (Cố vấn AI, Thị giác Máy tính & RAG)</option>
                  <option value="ThS. Trần Minh Quân (GV Hướng dẫn)">ThS. Trần Minh Quân (Cố vấn Hệ điều hành & Trình biên dịch)</option>
                  <option value="TS. Đặng Quốc Bảo (GV Hướng dẫn)">TS. Đặng Quốc Bảo (Cố vấn An toàn Thông tin & DevSecOps)</option>
                  <option value="Cô Trần Thị B (GV Hướng dẫn)">Cô Trần Thị B (Giảng viên Hướng dẫn Kỹ nghệ Phần mềm & Scrum)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignMentorProject(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = assignMentorProject.id;
                  setProjects((prev) =>
                    prev.map((p) => (p.id === targetId ? { ...p, instructor: selectedMentor } : p))
                  );
                  await updateWorkspaceProjectApi(targetId, { instructor: selectedMentor });
                  setToastMsg(`✓ Đã phân công ${selectedMentor} hướng dẫn đề tài "${assignMentorProject.name}"`);
                  setAssignMentorProject(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                Lưu Phân Công
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
