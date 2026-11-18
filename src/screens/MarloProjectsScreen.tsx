import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
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
  fetchKanbanWorkspace,
  createWorkspaceProjectApi,
  updateWorkspaceProjectApi,
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
  instructor?: string;
  instructorAvatar?: string;
  totalXp?: number;
  members: CNTTMember[];
  fav?: boolean;
  colorHex?: string;
  // Timeline coordinates (exact replica of Marlo layout)
  tlStart: number; // percentage (0 to 100)
  tlWidth: number; // percentage (0 to 100)
  tlColor?: "amber" | "dark" | "done";
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
    instructor: "Phan Đình Nghị (Lead)",
    instructorAvatar: "PN",
    members: [CNTT_MEMBERS.dnghi, CNTT_MEMBERS.bhoa],
    fav: true,
    colorHex: "#10b981",
    tlStart: 5.0,
    tlWidth: 48.0,
    tlColor: "done",
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
  role?: Role;
}

export default function MarloProjectsScreen({
  onOpenProject,
  role = "student",
}: MarloProjectsScreenProps) {
  const [activeTab, setActiveTab] = useState<"slate" | "timeline">("slate");
  const [displayedTab, setDisplayedTab] = useState<"slate" | "timeline">("slate");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [projects, setProjects] = useState<CNTTProjectItem[]>(CNTT_PROJECTS);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [gradingProject, setGradingProject] = useState<CNTTProjectItem | null>(null);
  const [isSubmissionLocked, setIsSubmissionLocked] = useState(false);
  const [assignMentorProject, setAssignMentorProject] = useState<CNTTProjectItem | null>(null);
  const [selectedMentor, setSelectedMentor] = useState("Thầy Nguyễn Phước");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const tabsNavRef = useRef<HTMLElement>(null);
  const tabLineRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tlInnerRef = useRef<HTMLDivElement>(null);
  const isFirstTabRender = useRef(true);

  useEffect(() => {
    let active = true;
    fetchKanbanWorkspace().then((res) => {
      if (!active || !res?.projects?.length) return;
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
          dueText: p.dueText,
          storyPoints: p.storyPoints,
          pointsBurned: p.pointsBurned,
          budgetStr: p.budgetStr,
          instructor: p.instructor,
          instructorAvatar: p.instructorAvatar,
          totalXp: p.totalXp,
          members: p.members || [],
          fav: p.fav,
          colorHex: p.colorHex,
          tlStart: p.tlStart,
          tlWidth: p.tlWidth,
          tlColor: p.tlColor,
        }))
      );
    });
    return () => {
      active = false;
    };
  }, []);

  // Filtered projects for Slate view
  const filteredProjects = projects.filter((p) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "planning") return p.status === "planning";
    if (filterStatus === "active") return p.status === "active";
    if (filterStatus === "review") return p.status === "review";
    if (filterStatus === "delivered") return p.status === "delivered";
    return true;
  });

  // Dynamic stats
  const activeJobs = projects.filter((p) => p.status !== "delivered").length;
  const totalStoryPoints = projects.reduce((acc, p) => acc + p.storyPoints, 0);

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

    // 1. Stagger rows into view
    const rows = n.querySelectorAll(".tl__row");
    gsap.fromTo(
      rows,
      { opacity: 0, x: -10 },
      {
        opacity: 1,
        x: 0,
        duration: 0.55,
        ease: "power3.out",
        stagger: 0.03,
        delay: 0.15,
        clearProps: "transform,opacity",
      }
    );

    // 2. Bar scaleX expand (lo: scaleX: 0 -> 1 with transform-origin: 0, expo.out, duration: 1s)
    const bars = n.querySelectorAll(".tl__bar");
    gsap.fromTo(
      bars,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1,
        delay: 0.3,
        stagger: 0.06,
        ease: "expo.out",
        clearProps: "transform",
      }
    );

    // 3. Fill scaleX to project progress (fromTo { scaleX: 0 } -> { scaleX: progress })
    const fills = n.querySelectorAll<HTMLElement>(".tl__fill");
    fills.forEach((fill, idx) => {
      const targetProgress = projects[idx]?.progress || 0;
      gsap.fromTo(
        fill,
        { scaleX: 0 },
        {
          scaleX: targetProgress,
          duration: 1,
          delay: 0.8 + idx * 0.05,
          ease: "expo.out",
        }
      );
    });

    // 4. Today line drops down from top (scaleY: 0 -> 1, opacity: 0 -> 1, transformOrigin: 50% 0%)
    if (todayEl) {
      gsap.fromTo(
        todayEl,
        { scaleY: 0, opacity: 0 },
        {
          scaleY: 1,
          opacity: 1,
          duration: 0.7,
          delay: 1.1,
          ease: "expo.out",
          transformOrigin: "50% 0%",
          clearProps: "transform,opacity",
        }
      );
    }
  }, [displayedTab, projects]);

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
        }
      : {
          id: "prj-" + Date.now(),
          name: newP.name,
          client: newP.client || "Ferro Cycles",
          course: newP.course || newP.client || "CNTT-2026 · Đồ án Chuyên ngành",
          kind: (newP.kind || "COMMERCIAL").toUpperCase(),
          status: "active",
          progress: 0,
          tasksDone: 0,
          tasksTotal: 1,
          dueText: newP.dueDate ? `due ${newP.dueDate}` : "in 30 days",
          storyPoints: storyPts,
          pointsBurned: 0,
          budgetStr: newP.budgetStr || `£${budgetNum.toLocaleString()}`,
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
        };
    setProjects((prev) => [created, ...prev]);
    setIsNewProjectModalOpen(false);
    setToastMsg(`${created.name} created.`);
  };

  return (
    <div
      className="min-h-screen bg-transparent text-[#161718] dark:text-[#f0f0f1] p-4 sm:p-6 lg:p-8 font-sans select-none relative overflow-x-hidden transition-colors duration-200"
    >
      {/* ─── TOP HEADER (3-ROLE ADAPTIVE DESIGN: STUDENT vs INSTRUCTOR vs ADMIN) ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <MarloTitle
              text={
                role === "admin"
                  ? "Trung Tâm Quản Trị Đồ Án Toàn Khóa"
                  : role === "instructor"
                  ? "Hội Đồng Hướng Dẫn & Đánh Giá Đồ Án"
                  : "Không Gian Đồ Án Nhóm Của Tôi"
              }
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E1D1B] dark:text-white font-sans"
            />
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
                onClick={() => {
                  const next = !isSubmissionLocked;
                  setIsSubmissionLocked(next);
                  setToastMsg(next ? "🔒 Đã khóa cổng nộp đồ án cho toàn khóa." : "🔓 Đã mở lại cổng nộp đồ án.");
                }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer ${
                  isSubmissionLocked
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950"
                }`}
                title="Khóa cổng để đóng băng dữ liệu nộp của học viên khi đến hạn"
              >
                {isSubmissionLocked ? <Lock size={14} /> : <Unlock size={14} />}
                <span>{isSubmissionLocked ? "Đã Khóa Cổng Nộp" : "Khóa Cổng Nộp"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (projects.length > 0) setAssignMentorProject(projects[0]);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#EE8420] hover:bg-[#d97316] text-slate-950 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                title="Phân công Giảng viên hướng dẫn & Cố vấn kiến trúc cho các nhóm"
              >
                <Users size={14} />
                <span>Phân Công GVHD</span>
              </button>

              <button
                type="button"
                onClick={() => setToastMsg("Đã xuất Master Report toàn bộ đồ án sang Excel.")}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200/90 dark:border-slate-700/80 shadow-2xs transition cursor-pointer"
                title="Xuất dữ liệu toàn bộ nhóm đồ án sang bảng tính Excel"
              >
                <FileSpreadsheet size={14} />
                <span>Master Excel</span>
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
                title="Mở bảng thẩm định chấm điểm đồ án theo rubric 5 tiêu chí"
              >
                <ShieldCheck size={16} strokeWidth={2.5} />
                <span>Chấm Điểm Đồ Án (DoD)</span>
              </button>

              <button
                type="button"
                onClick={() => setToastMsg("Đã tạo báo cáo thẩm định tiến độ 4 nhóm đồ án.")}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200/90 dark:border-slate-700/80 shadow-2xs transition cursor-pointer"
                title="Xuất báo cáo tiến độ và mức độ đóng góp cá nhân của từng nhóm"
              >
                <Download size={14} />
                <span>Báo Cáo Tiến Độ</span>
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
              <Plus size={16} strokeWidth={2.5} />
              <span>{isSubmissionLocked ? "Cổng Đang Khóa" : "+ Đăng Ký Đồ Án"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── AUTHENTIC MARLO SUB-NAV TABS (Slate vs Timeline with sliding tabs__line) ─── */}
      <nav
        ref={tabsNavRef}
        className="tabs notranslate"
        translate="no"
        aria-label="Sections"
      >
        <button
          type="button"
          aria-current={activeTab === "slate" ? "page" : undefined}
          onClick={() => switchTab("slate")}
        >
          Slate
        </button>
        <button
          type="button"
          aria-current={activeTab === "timeline" ? "page" : undefined}
          onClick={() => switchTab("timeline")}
        >
          Timeline
        </button>
        <span ref={tabLineRef} className="tabs__line" />
      </nav>

      {/* ─── STAGE CONTAINER: ANIMATES ON VIEW SWITCH ─── */}
      <div ref={stageRef} className="w-full">
        {/* ─── TAB 1: MARLO SLATE GRID (EXACT 1:1 REPLICA OF MARLO PROJECTS.JSX) ─── */}
        {displayedTab === "slate" && (
          <div className="w-full">
            {/* Segmented Control Filter Bar (Exact Marlo: All | Planning | In post | Client review | Delivered) */}
            <div className="toolbar">
              <MarloSegmentedControl
                value={filterStatus}
                options={[
                  { id: "all", label: "All" },
                  { id: "planning", label: "Planning" },
                  { id: "active", label: "In post" },
                  { id: "review", label: "Client review" },
                  { id: "delivered", label: "Delivered" },
                ]}
                onChange={(val) => setFilterStatus(val)}
                tone="dark"
              />
            </div>

            {/* Cards Grid: 4 columns on desktop matching Marlo pgrid */}
            {filteredProjects.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3 border border-slate-200 dark:border-slate-700">
                  <Check size={20} />
                </div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Không có dự án nào trong mục này</h3>
                <p className="text-xs text-slate-400 mt-1">Chọn bộ lọc khác hoặc nhấn "New project" để thêm dự án</p>
              </div>
            ) : (
              <div className="pgrid">
                {filteredProjects.map((p) => {
                  const isDone = p.status === "delivered";

                  return (
                    <div
                      key={p.id}
                      onClick={() => onOpenProject?.(p)}
                      className="pcard"
                    >
                      {/* Top row: Kind + Pin Button */}
                      <div className="pcard__top">
                        <span
                          className="pcard__kind"
                          style={{ "--cc": p.colorHex || "#E5A023" } as React.CSSProperties}
                        >
                          {p.kind}
                        </span>
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
                            ? "Planning"
                            : p.status === "active"
                            ? "In post"
                            : p.status === "review"
                            ? "Client review"
                            : "Delivered"}
                        </span>

                        <span>
                          <Check size={13} strokeWidth={2.5} />
                          {p.tasksDone}/{p.tasksTotal}
                        </span>

                        <span>
                          <Clock size={13} />
                          {p.dueText}
                        </span>
                      </div>

                      {/* Budget used burn bar */}
                      <div className="pcard__burn">
                        <span>Budget used</span>
                        <b>{Math.round(p.progress * 100)}%</b>
                      </div>
                      <div className="pcard__progress">
                        <div
                          className={`pcard__progress-bar ${isDone ? "is-done" : ""}`}
                          style={{ width: `${Math.round(p.progress * 100)}%` }}
                        />
                      </div>

                      {/* Footer: Project lead/members + Story Points */}
                      <div className="pcard__foot">
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                          <div className="avstack">
                            {p.members?.slice(0, 3).map((m) => (
                              <span
                                key={m.id}
                                className="av av--sm font-bold shadow-2xs"
                                style={{ background: m.bg, color: m.textColor }}
                                title={`${m.name} (${m.role})`}
                              >
                                {m.initials}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate" title={`${p.instructor || p.client}`}>
                            {p.instructor || p.client}
                          </span>
                        </div>

                        <span className="pcard__budget font-bold" title={`Tổng Story Points: ${p.storyPoints} SP`}>
                          {p.storyPoints} SP
                        </span>
                      </div>

                      {/* ── Role-Adaptive Action Strip on Project Cards ── */}
                      {role === "admin" && (
                        <div
                          className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignMentorProject(p);
                              setSelectedMentor(p.instructor || "Thầy Nguyễn Phước");
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-97"
                            title="Phân công hoặc thay đổi Giảng viên hướng dẫn cho nhóm này"
                          >
                            <Users size={13} />
                            <span>Phân công GV</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenProject?.(p)}
                            className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                            title="Kiểm toán bảng Kanban và quy chuẩn DoD của nhóm"
                          >
                            <span>Kiểm toán</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      )}

                      {role === "instructor" && (
                        <div
                          className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGradingProject(p);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-97"
                            title="Mở bảng thẩm định chấm điểm 5 tiêu chí DoD"
                          >
                            <ShieldCheck size={13} />
                            <span>Chấm điểm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenProject?.(p)}
                            className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                            title="Mở Bảng Kanban để giám sát task nhóm"
                          >
                            <span>Kanban</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      )}

                      {role === "student" && (
                        <div
                          className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onOpenProject?.(p)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#EE8420] hover:bg-[#d97316] text-slate-950 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-97"
                            title="Vào không gian làm việc Bảng Kanban của nhóm"
                          >
                            <span>Vào Kanban Nhóm</span>
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: MARLO TIMELINE (EXACT 1:1 REPLICA OF MARLO PROJECTS.JSX) ─── */}
        {displayedTab === "timeline" && (
          <section className="card card--flush tl">
            {/* Header: Title + Legend */}
            <div className="chead">
              <div className="chead__text">
                <h2>The slate over time</h2>
                <p>Start to delivery, filled by tasks done</p>
              </div>
              <div className="legend">
                <span>
                  <i />
                  Done
                </span>
                <span>
                  <i className="is-ghost" />
                  To go
                </span>
              </div>
            </div>

            {/* Scrollable Gantt Chart Grid */}
            <div className="tl__scroll">
              <div className="tl__inner" ref={tlInnerRef}>
                {/* Timeline Header Row (Axis) */}
                <div className="tl__axis">
                  <span className="tl__namehead">Project</span>
                  <div className="tl__weeks">
                    {SEMESTER_WEEKS.map((w) => (
                      <span key={w.id} className={w.isNow ? "is-now" : ""}>
                        {w.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Timeline Body with Vertical Grid Lines & Projects */}
                <div className="tl__body">
                  {/* Vertical Orange Indicator for "Today" */}
                  <span
                    className="tl__today"
                    style={{
                      left: "calc(var(--namew) + (100% - var(--namew)) * 0.585)",
                    }}
                  >
                    <em>Today</em>
                  </span>

                  {/* Project Rows */}
                  {projects.map((p) => {
                    const isDone = p.status === "delivered";
                    const isAmber = p.tlColor === "amber" || p.status === "active" || p.status === "review";

                    return (
                      <div
                        key={p.id}
                        className="tl__row"
                        onClick={() => onOpenProject?.(p)}
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
                              left: `${p.tlStart}%`,
                              width: `${p.tlWidth}%`,
                            }}
                            title={`${p.name} (${Math.round(p.progress * 100)}%)`}
                          >
                            {/* Filling portion (scales horizontally from 0 to progress) */}
                            <i className="tl__fill" />
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

            {/* Footer matching Marlo design */}
            <p className="tl__foot muted">
              {projects.filter((p) => p.status !== "delivered").length} deliveries in the next two weeks.
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
            setToastMsg(`Đã lưu điểm Hội đồng ${score}/100 cho ${gradingProject.name}`);
            setGradingProject(null);
          }}
        />
      )}

      {/* ─── ADMIN ASSIGN MENTOR MODAL ─── */}
      {assignMentorProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0f1219] p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Phân Công Giảng Viên Hướng Dẫn
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gán Giảng viên phụ trách chấm điểm và hướng dẫn nhóm {assignMentorProject.name}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chọn Giảng viên hướng dẫn:
              </label>
              <select
                value={selectedMentor}
                onChange={(e) => setSelectedMentor(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value="Thầy Nguyễn Phước">Thầy Nguyễn Phước (Cố vấn Kiến trúc & OOP)</option>
                <option value="Thầy Trần Minh Quân">Thầy Trần Minh Quân (Cố vấn AI & RAG Engine)</option>
                <option value="Cô Lan Anh">Cô Lan Anh (Giảng viên Hướng dẫn Agile & Scrum)</option>
                <option value="Trần Minh Tuấn">Trần Minh Tuấn (Backend Lead & DevOps)</option>
              </select>
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
                onClick={() => {
                  const targetId = assignMentorProject.id;
                  setProjects((prev) =>
                    prev.map((p) => (p.id === targetId ? { ...p, instructor: selectedMentor } : p))
                  );
                  void updateWorkspaceProjectApi(targetId, { instructor: selectedMentor } as any);
                  setToastMsg(`Đã phân công ${selectedMentor} hướng dẫn nhóm ${assignMentorProject.name}`);
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
