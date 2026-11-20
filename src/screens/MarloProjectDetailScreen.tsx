import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Plus,
  ExternalLink,
  X,
  CheckCircle2,
  Crown,
  ShieldCheck,
  GraduationCap,
  Lock,
  Sparkles,
  GitFork,
  FolderGit2,
  GitCommit,
  GitPullRequest,
  FolderKanban,
} from "lucide-react";
import gsap from "gsap";
import {
  isProjectFrozen,
  subscribeProjectLockChanges,
} from "../utils/projectFreeze";
import {
  getMarloProject,
  getMarloMember,
  resolveMarloMemberByName,
  toWorkspaceProjectId,
  addMarloTask,
  updateMarloProjectStatus,
  MARLO_PROJECT_STATUS,
  MARLO_HUES,
} from "../marlo-engine/marloData";
import {
  fetchKanbanWorkspace,
  updateWorkspaceProjectApi,
  createWorkspaceTaskApi,
  type WorkspaceProjectDto,
} from "../api";
import "../marlo-engine/marloStyles.css";

interface Props {
  projectId?: string;
  role?: "student" | "instructor" | "admin";
  onNavigateBack: () => void;
  onNavigateToPerson: (personId: string) => void;
  onNavigateToKanban?: (projectId: string) => void;
  onNavigateToGitHub?: (projectId: string) => void;
}

const PROJECT_BRIEFS: Record<string, string> = {
  "prj-codemind":
    "Hệ thống LMS thông minh tích hợp Gia sư Socratic, giám sát liêm chính mã nguồn qua Docker Sandbox và phòng thi phản biện AI Council 3D.",
  "prj-compiler":
    "Xây dựng bộ phân tích từ vựng Lexer, cú pháp đệ quy xuống (Recursive Descent Parser), cây cú pháp trừu tượng AST và sinh mã trung gian C++.",
  "prj-devnet":
    "Nền tảng chia sẻ đoạn mã nguồn trực tuyến hỗ trợ cây phân nhánh Fork Tree, Monaco Editor tích hợp và bình luận theo từng dòng code.",
  "prj-ecommerce":
    "Hệ thống thương mại điện tử chịu tải cao, đảm bảo tính nhất quán dữ liệu phân tán với Saga Pattern, Redis Cache và Kafka Event Streaming.",
  "prj-faceattend":
    "Điểm danh tự động qua camera RTSP độ trễ thấp, lượng tử hóa MobileFaceNet INT8 chạy trực tiếp trên vi điều khiển nhúng Raspberry Pi 4.",
  "prj-medai":
    "Mô hình DenseNet-121 kết hợp Grad-CAM khoanh vùng tổn thương phổi trên ảnh X-quang và trợ lý truy xuất y văn chuẩn xác bằng RAG.",
  "prj-pintos":
    "Cài đặt thuật toán điều độ MLFQS, đồng bộ hóa Semaphore/Lock và hệ thống quản lý bộ nhớ ảo Virtual Memory trên kiến trúc x86.",
  "prj-security":
    "Công cụ Fuzzing SQLi, XSS, Command Injection tự động dò quét API backend trong môi trường cô lập, phát hiện lỗ hổng và xuất báo cáo CVE.",
};

const DETAIL_TASK_COLUMNS = [
  { id: "todo", label: "Cần làm" },
  { id: "doing", label: "Đang làm" },
  { id: "done", label: "Hoàn thành" },
  { id: "verified", label: "Đã nghiệm thu" },
] as const;

export default function MarloProjectDetailScreen({
  projectId = "prj-codemind",
  role = "student",
  onNavigateBack,
  onNavigateToPerson,
  onNavigateToKanban,
  onNavigateToGitHub,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressCircleRef = useRef<SVGCircleElement>(null);

  const fallbackProject = getMarloProject(projectId) || getMarloProject("codemind")!;
  const targetWsId = toWorkspaceProjectId(projectId);

  const [wsProject, setWsProject] = useState<WorkspaceProjectDto | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>(fallbackProject.status);

  const [isSprintLocked, setIsSprintLocked] = useState<boolean>(() =>
    isProjectFrozen(targetWsId)
  );

  useEffect(() => {
    setIsSprintLocked(isProjectFrozen(targetWsId));
    return subscribeProjectLockChanges(() => {
      setIsSprintLocked(isProjectFrozen(targetWsId));
    });
  }, [targetWsId]);

  const loadWorkspaceProject = async () => {
    const ws = await fetchKanbanWorkspace();
    if (!ws?.projects?.length) return;
    const matched =
      ws.projects.find((p) => p.id === projectId || p.id === targetWsId) ||
      ws.projects.find((p) => p.name.toLowerCase() === fallbackProject.name.toLowerCase()) ||
      ws.projects[0];
    if (matched) {
      setWsProject(matched);
      setCurrentStatus(matched.status || "active");
    }
  };

  useEffect(() => {
    void loadWorkspaceProject();
  }, [projectId, targetWsId]);

  // Unified display fields from live MySQL workspace (with safe fallback)
  const displayId = wsProject?.id || targetWsId;
  const displayName = wsProject?.name || fallbackProject.name;
  const displayCourse = wsProject?.course || fallbackProject.client;
  const displayKind = wsProject?.kind || fallbackProject.kind;
  const displaySprint = wsProject?.sprint || "Sprint 1 (Tuần 1 - 4)";
  const displayBrief =
    PROJECT_BRIEFS[displayId] ||
    fallbackProject.brief ||
    `Đồ án kỹ nghệ phần mềm thuộc học phần ${displayCourse}, phát triển theo quy trình Agile/Scrum và kiểm định Ràng buộc cứng H2.`;
  const displayMentor = wsProject?.instructor || "TS. Nguyễn Phước (GV Hướng dẫn)";
  const displayDueText =
    wsProject?.dueDate
      ? `Hạn nộp: ${wsProject.dueDate}`
      : wsProject?.dueText || "Hạn nộp: 15/12/2026";

  // Normalize team members (ONLY students of this project, never mixing council professors into student list)
  const projectStudents = useMemo(() => {
    if (wsProject?.team?.length) {
      return wsProject.team.map((m: any, idx: number) => {
        const resolved = resolveMarloMemberByName(m.name);
        return {
          id: resolved.id,
          rawId: m.id || resolved.id,
          name: m.name,
          role: m.role || resolved.role,
          initials:
            m.initials ||
            "".join?.call(
              (m.name || "SV")
                .trim()
                .split(/\s+/)
                .slice(-2)
                .map((w: string) => w[0]?.toUpperCase() || ""),
              ""
            ) ||
            resolved.initials ||
            "SV",
          avatar: m.avatar || (m.name || "S").trim().charAt(0).toUpperCase(),
          hue: resolved.hue || ((idx % 6) + 1),
          isLead: idx === 0,
        };
      });
    }
    return fallbackProject.team
      .map((memId) => getMarloMember(memId))
      .filter((m): m is NonNullable<typeof m> => Boolean(m) && m.skill !== "advisor")
      .map((m, idx) => ({
        id: m.id,
        rawId: m.id,
        name: m.name,
        role: m.role,
        initials: m.initials || m.name.slice(0, 2).toUpperCase(),
        avatar: m.name.charAt(0).toUpperCase(),
        hue: m.hue,
        isLead: idx === 0 || m.id === fallbackProject.lead,
      }));
  }, [wsProject, fallbackProject]);

  const leadStudent = projectStudents.find((s) => s.isLead) || projectStudents[0];

  // Normalize tasks from live MySQL project
  const normalizedTasks = useMemo(() => {
    if (wsProject?.tasks) {
      return wsProject.tasks.map((t: any) => {
        const col = String(t.column || "ready");
        let bucket: "todo" | "doing" | "done" | "verified" = "todo";
        if (col === "backlog" || col === "ready") bucket = "todo";
        else if (col === "in-progress" || col === "fail") bucket = "doing";
        else if (col === "done") bucket = "done";
        else if (col === "verified") bucket = "verified";

        const assigneeName =
          typeof t.assignee === "object"
            ? t.assignee?.name || leadStudent?.name || "Nguyễn Bá Hòa"
            : String(t.assignee || leadStudent?.name || "Nguyễn Bá Hòa");
        const resolvedMember = resolveMarloMemberByName(assigneeName);

        return {
          id: t.id,
          code: t.code ? (String(t.code).startsWith("#") ? String(t.code) : `#${t.code}`) : "#TSK",
          title: t.title,
          bucket,
          rawColumn: col,
          assigneeName,
          personId: resolvedMember.id,
          points: Number(t.points || 3),
          priority: t.priority === "high" ? "high" : t.priority === "low" ? "low" : "med",
        };
      });
    }
    return [];
  }, [wsProject, leadStudent]);

  const totalTasksCount = normalizedTasks.length;
  const doneTasksCount = normalizedTasks.filter(
    (t) => t.bucket === "done" || t.bucket === "verified"
  ).length;
  const verifiedTasksCount = normalizedTasks.filter((t) => t.bucket === "verified").length;
  const progressPercent =
    totalTasksCount > 0 ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0;

  const totalStoryPoints =
    wsProject?.storyPoints ||
    normalizedTasks.reduce((sum, t) => sum + t.points, 0) ||
    600;
  const completedStoryPoints =
    wsProject?.pointsBurned !== undefined
      ? wsProject.pointsBurned
      : Math.round((totalStoryPoints * progressPercent) / 100);

  // Calculate circular SVG progress
  const strokeWidth = 8;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const targetStrokeDashoffset =
    circumference - (progressPercent / 100) * circumference;

  // ─── Modal States ───
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssigneeName, setNewTaskAssigneeName] = useState("");
  const [newTaskPoints, setNewTaskPoints] = useState(5);
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("high");

  useEffect(() => {
    if (projectStudents.length > 0 && !newTaskAssigneeName) {
      setNewTaskAssigneeName(projectStudents[0].name);
    }
  }, [projectStudents, newTaskAssigneeName]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    if (isSprintLocked && role === "student") {
      showToast("🔒 Sprint hoặc Cổng nộp đang bị khóa bởi Ban Đào Tạo.");
      return;
    }

    const chosenStudent =
      projectStudents.find((s) => s.name === newTaskAssigneeName) ||
      projectStudents[0] || {
        id: "hoa",
        name: "Nguyễn Bá Hòa",
        role: "Leader & Architect",
        avatar: "H",
      };

    const codeSuffix = Math.floor(Math.random() * 899 + 100);
    const createdPayload = {
      code: `TSK-${codeSuffix}`,
      title: newTaskTitle.trim(),
      description: `${newTaskTitle.trim()} — Hạng mục kỹ thuật thuộc đồ án ${displayName}.`,
      column: "ready",
      priority: newTaskPriority,
      moscow: newTaskPriority === "high" ? "must" : "should",
      points: Math.max(1, Math.min(21, Number(newTaskPoints) || 5)),
      assignee: {
        name: chosenStudent.name,
        avatar: chosenStudent.avatar,
        role: chosenStudent.role,
      },
      estimateHours: Math.max(2, (Number(newTaskPoints) || 5) * 1.5),
      dueDate: wsProject?.dueDate || "15/12/2026",
      epic: displaySprint,
      epicColor: "bg-amber-50 text-amber-700 border-amber-200",
      checklist: [
        { id: `chk-1-${Date.now()}`, text: "Thiết kế & cài đặt mã nguồn sạch 3 tầng", done: false },
        { id: `chk-2-${Date.now()}`, text: "Vượt qua bộ kiểm thử tự động Docker Sandbox", done: false },
      ],
    };

    const savedTask = await createWorkspaceTaskApi(displayId, createdPayload);
    addMarloTask({
      title: newTaskTitle.trim(),
      projectId: displayId,
      who: chosenStudent.id,
      status: "todo",
      priority: newTaskPriority === "medium" ? "med" : newTaskPriority,
      kind: "architecture",
      est: Number(newTaskPoints) || 5,
      due: Date.now() + 3 * 86400000,
    });

    if (savedTask) {
      await loadWorkspaceProject();
    }
    setNewTaskTitle("");
    setIsAddTaskModalOpen(false);
    showToast(`✓ Đã thêm thẻ "${createdPayload.title}" và đồng bộ sang Bảng Kanban!`);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (role === "student" && newStatus === "delivered") {
      showToast("⚠️ Trạng thái 'Đã bảo vệ xong' chỉ do Giảng viên hoặc Hội đồng xác nhận sau khi chấm DoD.");
      return;
    }
    setCurrentStatus(newStatus);
    updateMarloProjectStatus(displayId, newStatus as any);
    await updateWorkspaceProjectApi(displayId, { status: newStatus });
    await loadWorkspaceProject();
    showToast(`✓ Đã đồng bộ trạng thái đồ án thành "${MARLO_PROJECT_STATUS[newStatus] || newStatus}"`);
  };

  // ─── AUTHENTIC MARLO GSAP ENTRANCE ANIMATION ───
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".backlink, .phead",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.06, clearProps: "transform,opacity" }
      );
      gsap.fromTo(
        ".pd__stat",
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.05,
          delay: 0.08,
          clearProps: "transform,opacity",
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [displayId]);

  return (
    <div
      ref={containerRef}
      className="marlo-scope min-h-screen bg-transparent text-[#161718] dark:text-[#f0f0f1] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200"
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold shadow-xl border border-slate-700 dark:border-slate-300 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#f29b23] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="max-w-[1560px] mx-auto pd">
        {/* Backlink */}
        <button
          type="button"
          onClick={onNavigateBack}
          className="backlink"
          title="Quay lại danh sách đồ án"
        >
          <ChevronLeft size={16} />
          <span>Danh sách đồ án</span>
        </button>

        {/* Page Header */}
        <div className="phead flex flex-wrap items-end justify-between gap-4 mb-6">
          <div className="phead__text flex-1 min-w-[280px]">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="eyebrow text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                {displayCourse} · {displayKind}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono">
                {displaySprint}
              </span>
              {wsProject?.finalScore != null && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  <span>Điểm Hội đồng DoD: {wsProject.finalScore}/10</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {displayName}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1.5 max-w-3xl leading-relaxed">
              {displayBrief}
            </p>
          </div>

          <div className="phead__actions flex items-center gap-2.5 flex-wrap">
            {onNavigateToKanban && (
              <button
                type="button"
                onClick={() => onNavigateToKanban(displayId)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
              >
                <FolderKanban size={14} className="text-amber-500" />
                <span>Mở Bảng Kanban ({totalTasksCount})</span>
              </button>
            )}
            {onNavigateToGitHub && (
              <button
                type="button"
                onClick={() => onNavigateToGitHub(displayId)}
                className="px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 text-xs font-bold text-blue-700 dark:text-blue-300 transition cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
              >
                <GitFork size={14} />
                <span>Mở Git Hub</span>
              </button>
            )}
            {role === "student" && (
              <button
                type="button"
                disabled={isSprintLocked}
                className={`btn btn--primary flex items-center justify-center gap-1.5 font-semibold text-xs px-4 ${
                  isSprintLocked ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => setIsAddTaskModalOpen(true)}
                title={
                  isSprintLocked
                    ? "Sprint đang bị khóa bởi Ban Đào Tạo"
                    : "Thêm công việc kỹ thuật mới đồng bộ sang Bảng Kanban"
                }
              >
                {isSprintLocked ? <Lock size={14} /> : <Plus size={14} />}
                <span>{isSprintLocked ? "Sprint Đã Khóa" : "Thêm việc"}</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Academic Stat Cards (100% Unified Story Points & DoD Progress) */}
        <div className="pd__stats grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Card 1: Progress Donut */}
          <section className="card pd__stat pd__stat--hero flex items-center gap-4">
            <div className="relative w-[88px] h-[88px] flex items-center justify-center flex-none">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="stroke-[#e1e2e5] dark:stroke-[#2c2d31]"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <circle
                  ref={progressCircleRef}
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#f29b23"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={targetStrokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <b className="text-xl font-bold">{progressPercent}%</b>
              </div>
            </div>
            <div className="flex flex-col">
              <small className="text-xs text-slate-500 font-semibold">Tiến độ Sprint & DoD</small>
              <b className="text-base font-bold text-slate-800 dark:text-slate-200">
                {doneTasksCount} / {totalTasksCount} hạng mục hoàn tất
              </b>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentStatus === "delivered"
                  ? "Đã bảo vệ & nghiệm thu"
                  : `${verifiedTasksCount} thẻ đã được GVHD nghiệm thu · ${displayDueText}`}
              </span>
            </div>
          </section>

          {/* Card 2: Story Points & Academic Effort (Replaced fake VNĐ Grant Disbursed) */}
          <section className="card pd__stat flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <small className="text-xs text-slate-500 font-semibold">
                Quỹ Điểm Kỹ Nghệ (Story Points)
              </small>
              <span className="text-[11px] font-mono font-bold text-[#f29b23] flex items-center gap-1">
                <Sparkles size={12} />
                <span>Chuẩn Scrum</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <b className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
                {completedStoryPoints.toLocaleString("en-US")} SP
              </b>
              <span className="text-xs font-semibold text-slate-400 font-mono">
                / {totalStoryPoints.toLocaleString("en-US")} SP
              </span>
            </div>
            <div>
              <div className="w-full bg-[#e1e2e5] dark:bg-[#2c2d31] h-2 rounded-full overflow-hidden mb-1.5">
                <div
                  className="bg-[#f29b23] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Tỷ lệ đốt điểm (Burned): {progressPercent}%</span>
                {wsProject?.finalScore != null ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Điểm DoD: {wsProject.finalScore}/10
                  </span>
                ) : (
                  <span>Ràng buộc cứng H2</span>
                )}
              </div>
            </div>
          </section>

          {/* Card 3: Status Dropdown & Lead */}
          <section className="card pd__stat flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <small className="text-xs text-slate-500 font-semibold">Trạng thái đồ án</small>
              {role === "student" && (
                <span className="text-[10px] text-slate-400">Đồng bộ Kanban</span>
              )}
            </div>
            <div className="my-1">
              <select
                value={currentStatus}
                disabled={isSprintLocked && role === "student"}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full h-10 px-3 bg-[#ecedef] dark:bg-[#222326] border border-[#14161a26] dark:border-[#ffffff24] rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#f29b23] cursor-pointer disabled:opacity-60"
              >
                {Object.keys(MARLO_PROJECT_STATUS).map((key) => (
                  <option
                    key={key}
                    value={key}
                    disabled={role === "student" && key === "delivered"}
                  >
                    {MARLO_PROJECT_STATUS[key]}
                    {role === "student" && key === "delivered" ? " (Do GVHD chốt)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {leadStudent && (
              <div
                onClick={() => onNavigateToPerson(leadStudent.id)}
                className="mt-1 pt-2 border-t border-[#14161a14] dark:border-[#ffffff12] flex items-center justify-between gap-2 cursor-pointer group"
                title={`Xem hồ sơ Nhóm trưởng: ${leadStudent.name}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <div
                      className="av av--xs font-bold shadow-2xs text-[10px]"
                      style={{
                        background: (MARLO_HUES[leadStudent.hue] || { bg: "#e6d6c4", text: "#161718" }).bg,
                        color: (MARLO_HUES[leadStudent.hue] || { bg: "#e6d6c4", text: "#161718" }).text,
                      }}
                    >
                      {leadStudent.initials}
                    </div>
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[7px] font-black shadow-xs">
                      ★
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <Crown size={10} className="text-amber-500 fill-amber-500 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                        Nhóm trưởng
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 transition truncate block">
                      {leadStudent.name}
                    </span>
                  </div>
                </div>
                <ExternalLink size={12} className="text-slate-400 group-hover:text-amber-500 shrink-0 transition" />
              </div>
            )}
          </section>
        </div>

        {/* Git Repository & Code Verification Summary Banner */}
        <section className="card mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start md:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FolderGit2 size={18} />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Git Repository &amp; Minh chứng Mã nguồn
                </span>
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 truncate max-w-[260px]">
                  {wsProject?.gitRepo?.repoSlug || "Chưa liên kết Repo"}
                </span>
                {wsProject?.gitRepo?.targetBranch && (
                  <span className="font-mono text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    nhánh: {wsProject.gitRepo.targetBranch}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 font-mono">
                  <GitCommit size={13} className="text-blue-500" />
                  <strong className="text-slate-800 dark:text-slate-200">{wsProject?.gitRepo?.commitsCount ?? 0}</strong> commits
                </span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <GitPullRequest size={13} className="text-emerald-500" />
                  <strong className="text-slate-800 dark:text-slate-200">{wsProject?.gitRepo?.mergedPrsCount ?? 0}</strong> PR đã merge
                  · <strong className="text-slate-800 dark:text-slate-200">{wsProject?.gitRepo?.openPrsCount ?? 0}</strong> PR đang mở
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {wsProject?.gitRepo?.repoUrl && (
              <a
                href={wsProject.gitRepo.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition"
              >
                <ExternalLink size={13} />
                <span>Xem trên GitHub</span>
              </a>
            )}
            {onNavigateToGitHub && (
              <button
                type="button"
                onClick={() => onNavigateToGitHub(displayId)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <GitFork size={13} />
                <span>Mở Git Project Hub →</span>
              </button>
            )}
          </div>
        </section>

        {/* Main Grid: Left Tasks Columns vs Right Mentor & Student Team Stack */}
        <div className="pd__grid grid grid-cols-1 xl:grid-cols-[1.65fr_1fr] gap-6 items-start">
          {/* Left: Tasks by where they stand */}
          <section className="card pd__tasks">
            <div className="chead flex items-center justify-between mb-4">
              <div className="chead__text">
                <h2 className="text-lg font-bold">Danh sách công việc kỹ thuật ({totalTasksCount})</h2>
                <p className="text-xs text-slate-500">
                  Đồng bộ trực tiếp với Bảng Kanban 6 cột và CSDL MySQL
                </p>
              </div>
              {onNavigateToKanban && (
                <button
                  type="button"
                  onClick={() => onNavigateToKanban(displayId)}
                  className="linkbtn flex items-center font-semibold text-sm cursor-pointer"
                  title="Mở bảng Kanban chi tiết"
                >
                  <span>Mở bảng Kanban →</span>
                </button>
              )}
            </div>

            {/* 4 Task Columns with full readable headers & cards */}
            <div className="pd__cols grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {DETAIL_TASK_COLUMNS.map((col) => {
                const colTasks = normalizedTasks.filter((t) => t.bucket === col.id);
                return (
                  <div key={col.id} className="pd__col flex flex-col gap-2 min-w-0">
                    <div className="pd__colhead flex items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="whitespace-nowrap">{col.label}</span>
                      <span className="badge text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2.5 mt-1 min-w-0">
                      {colTasks.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                          Chưa có thẻ
                        </div>
                      ) : (
                        colTasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3 rounded-xl bg-[#ecedef] hover:bg-[#e1e2e5] dark:bg-[#222326] dark:hover:bg-[#2c2d31] transition-all flex flex-col gap-2 cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-700 min-w-0"
                            onClick={() => {
                              if (onNavigateToKanban) {
                                onNavigateToKanban(displayId);
                              } else {
                                onNavigateToPerson(task.personId);
                              }
                            }}
                            title={`${task.code}: ${task.title} — Phụ trách: ${task.assigneeName}`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[10.5px] font-bold font-mono text-[#f29b23] bg-[#f29b23]/10 px-1.5 py-0.5 rounded">
                                {task.code}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {task.points} SP
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 break-words">
                              {task.title}
                            </p>

                            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1.5 border-t border-black/5 dark:border-white/5">
                              <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                                {task.assigneeName}
                              </span>
                              <span
                                className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  task.priority === "high"
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                    : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {task.priority === "high" ? "Cao" : task.priority === "low" ? "Thấp" : "Vừa"}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Stack: Official Advisor & Student Team List */}
          <div className="stack flex flex-col gap-5">
            {/* Faculty Advisor Card */}
            <section className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#f29b23] shrink-0">
                  <GraduationCap size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                    Giảng viên Hướng dẫn & Thẩm định DoD
                  </span>
                  <b className="text-sm font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                    {displayMentor}
                  </b>
                </div>
              </div>
            </section>

            {/* Student Team List (Single Clean Badge per Row) */}
            <section className="card">
              <div className="chead mb-3">
                <div className="chead__text">
                  <h2 className="text-lg font-bold">Thành viên nhóm sinh viên</h2>
                  <p className="text-xs text-slate-500">
                    {projectStudents.length} sinh viên trực tiếp thực hiện đồ án
                  </p>
                </div>
              </div>

              <div className="pd__team flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {projectStudents.map((m) => {
                  const hue = MARLO_HUES[m.hue] || { bg: "#e6d6c4", text: "#161718" };
                  const isLead = m.isLead;

                  return (
                    <div
                      key={m.rawId}
                      onClick={() => onNavigateToPerson(m.id)}
                      className={`pd__person py-3 px-2.5 flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition cursor-pointer ${
                        isLead ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                      }`}
                      title={`Xem chi tiết hồ sơ thành viên ${m.name}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div
                            className="av av--sm font-bold shadow-2xs"
                            style={{ background: hue.bg, color: hue.text }}
                          >
                            {m.initials}
                          </div>
                          {isLead && (
                            <span
                              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs"
                              title="Nhóm trưởng đồ án (Team Lead)"
                            >
                              <Crown size={9} className="fill-slate-950 text-slate-950" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <b className="text-sm font-bold text-slate-900 dark:text-slate-100 block truncate">
                            {m.name}
                          </b>
                          <small className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                            {m.role}
                          </small>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {isLead ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono inline-flex items-center gap-1">
                            <Crown size={10} className="fill-amber-500 text-amber-500" />
                            <span>Nhóm trưởng</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                            Thành viên
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ─── REAL MODAL: ADD TASK (SYNCED TO MYSQL & KANBAN) ─── */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1b1c1e] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Thêm Công Việc Mới Vào Đồ Án
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Đồng bộ trực tiếp sang cột Cần làm trên Bảng Kanban
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tiêu đề công việc kỹ thuật *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Thiết kế schema CSDL & cài đặt Redis Lock..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#f29b23]/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Sinh viên phụ trách (Thành viên nhóm)
                </label>
                <select
                  value={newTaskAssigneeName}
                  onChange={(e) => setNewTaskAssigneeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                >
                  {projectStudents.map((m) => (
                    <option key={m.rawId} value={m.name}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Độ phức tạp (Story Points)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={21}
                    value={newTaskPoints}
                    onChange={(e) => setNewTaskPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mức ưu tiên
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="high">Ưu tiên cao (P0)</option>
                    <option value="medium">Bình thường (P1)</option>
                    <option value="low">Thấp (P2)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#f29b23] hover:bg-[#d48419] text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  Xác Nhận Tạo Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
