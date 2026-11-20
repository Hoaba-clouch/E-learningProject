import { useState, useMemo, useRef, useEffect } from "react";
import {
  Check,
  Clock,
  FolderKanban,
  Layers,
  Pin,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
  Calendar,
  BookOpen,
  ChevronDown,
  FolderGit2,
} from "lucide-react";
import gsap from "gsap";
import type { Project } from "../data/kanbanProjects";

interface SlateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  currentProjectId: string;
  onSelectProject: (projectId: string) => void;
  onOpenNewProjectModal: () => void;
  onTogglePinProject: (projectId: string) => void;
  canCreateProject?: boolean;
}

export function MarloProjectSlateModal({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  onSelectProject,
  onOpenNewProjectModal,
  onTogglePinProject,
  canCreateProject = true,
}: SlateModalProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return projects
      .filter((p) => {
        if (filterStatus !== "all" && p.status !== filterStatus) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            p.course.toLowerCase().includes(q) ||
            p.kind.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => Number(b.fav || false) - Number(a.fav || false));
  }, [projects, filterStatus, search]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 sm:p-6 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141a] marlo-modal-shadow overflow-hidden select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
              <FolderKanban size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Danh Sách Dự Án Kỹ Nghệ (Projects Slate)
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  {projects.length} dự án
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lựa chọn không gian dự án để làm việc trên bảng Kanban và đồng bộ tiến độ Sprint
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canCreateProject && (
              <button
                onClick={() => {
                  onClose();
                  onOpenNewProjectModal();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-97"
              >
                <Plus size={14} />
                <span>Đăng ký đồ án mới</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toolbar: Search & Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
          <div className="flex items-center gap-1.5">
            {[
              { id: "all", label: "Tất cả" },
              { id: "in-progress", label: "Đang thực hiện" },
              { id: "planning", label: "Chuẩn bị" },
              { id: "review", label: "Chờ nghiệm thu" },
              { id: "delivered", label: "Đã hoàn thành" },
            ].map((tab) => {
              const active = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-3.5 py-1.5 text-xs rounded-full transition-all cursor-pointer font-semibold ${
                    active
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, mã, môn học..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Project Cards Grid (Authentic Marlo 1:1 replica) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((proj) => {
            const isCurrent = proj.id === currentProjectId;
            const pTasks = Array.isArray(proj.tasks) ? proj.tasks : [];
            const totalTasks = pTasks.length > 0 ? pTasks.length : 9;
            const doneTasks = pTasks.length > 0
              ? pTasks.filter((t) => t.column === "done" || t.column === "verified").length
              : (proj.status === "delivered" ? 9 : proj.status === "review" ? 7 : 4);
            const progress = Math.round((doneTasks / totalTasks) * 100);
            const isDone = proj.status === "delivered" || progress === 100;

            return (
              <div
                key={proj.id}
                onClick={() => {
                  onSelectProject(proj.id);
                  onClose();
                }}
                className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                  isCurrent
                    ? "border-amber-500 ring-2 ring-amber-500/20 dark:border-amber-500"
                    : "border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {/* Top: Kind tag & Pin button */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                      {proj.kind || "PROJECT"}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 font-semibold">
                      #{proj.code}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                        <Check size={11} strokeWidth={2.5} />
                        Đang chọn
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePinProject(proj.id);
                      }}
                      className={`p-1.5 rounded-md transition ${
                        proj.fav
                          ? "text-amber-500 hover:text-amber-600"
                          : "text-slate-300 dark:text-slate-600 hover:text-slate-500"
                      }`}
                      title={proj.fav ? "Bỏ ghim" : "Ghim dự án lên đầu"}
                    >
                      <Pin size={14} className={proj.fav ? "fill-amber-500" : ""} />
                    </button>
                  </div>
                </div>

                {/* Middle: Progress circle ring & Project Name */}
                <div className="flex items-center gap-4 mb-3.5">
                  {/* Circular Progress Ring (Authentic Marlo gauge) */}
                  <div className="relative flex items-center justify-center shrink-0 w-14 h-14">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="14.5"
                        fill="none"
                        className="stroke-slate-100 dark:stroke-slate-800"
                        strokeWidth="3.6"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14.5"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="3.6"
                        strokeDasharray="91.1"
                        strokeDashoffset={91.1 - (91.1 * progress) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <span className="absolute text-[12px] font-bold text-slate-900 dark:text-white">
                      {progress}%
                    </span>
                  </div>

                  {/* Name & Course */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1 leading-snug">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 font-medium">
                      {proj.course}
                    </p>
                  </div>
                </div>

                {/* Badges line: Delivered pill + Check tasks + Due text */}
                <div className="flex items-center gap-2.5 mb-3.5 text-xs flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    isDone
                      ? "bg-[#e4f5eb] text-[#1c7046] dark:bg-[#7fd6a2]/20 dark:text-[#7fd6a2]"
                      : proj.status === "review"
                      ? "bg-[#e0f2fe] text-[#285b91] dark:bg-[#9fc4ee]/20 dark:text-[#9fc4ee]"
                      : proj.status === "planning"
                      ? "bg-[#e1e2e5] text-[#393b3f] dark:bg-[#2c2d31] dark:text-[#d2d3d6]"
                      : "bg-[#fef3c7] text-[#8f5404] dark:bg-[#f4a43a]/20 dark:text-[#f6b95e]"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isDone
                        ? "bg-[#1c7046] dark:bg-[#7fd6a2]"
                        : proj.status === "review"
                        ? "bg-[#285b91] dark:bg-[#9fc4ee]"
                        : proj.status === "planning"
                        ? "bg-[#62656b] dark:bg-[#a0a3a9]"
                        : "bg-[#8f5404] dark:bg-[#f6b95e]"
                    }`} />
                    {isDone
                      ? "Đã hoàn thành"
                      : proj.status === "review"
                      ? "Chờ nghiệm thu"
                      : proj.status === "planning"
                      ? "Lên kế hoạch"
                      : "Đang phát triển"}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#62656b] dark:text-[#a0a3a9]">
                    <Check size={12} strokeWidth={2.5} className="text-[#62656b]" />
                    <span>{doneTasks}/{totalTasks} task</span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#62656b] dark:text-[#a0a3a9]">
                    <Clock size={12} className="text-[#62656b]" />
                    <span>{isDone ? "Đã bảo vệ" : proj.dueDate}</span>
                  </span>
                </div>

                {/* Tiến độ Story Points bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-[#62656b] dark:text-[#a0a3a9]">Tiến độ Story Points</span>
                    <span className="font-bold text-[#161718] dark:text-white font-mono">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#e1e2e5] dark:bg-[#2c2d31] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        progress >= 85
                          ? "bg-[#8a5208] dark:bg-[#f3c27a]"
                          : "bg-gradient-to-r from-[#f8bd57] via-[#f29b23] to-[#ee8420]"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer: Avatar stack + Story points value */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {proj.team.slice(0, 4).map((m, idx) => {
                      const pastelBg = idx === 0 ? "#D6E0EC" : idx === 1 ? "#FCDBC4" : idx === 2 ? "#FCEBBF" : "#F8D2BA";
                      const pastelText = idx === 0 ? "#2A4365" : idx === 1 ? "#9C4221" : idx === 2 ? "#744210" : "#7B341E";
                      return (
                        <div
                          key={idx}
                          style={{ backgroundColor: pastelBg, color: pastelText, zIndex: 10 - idx }}
                          className="relative inline-flex h-7 w-7 items-center justify-center rounded-full text-[10.5px] font-bold ring-2 ring-white dark:ring-slate-900"
                          title={`${m.name} (${m.role})`}
                        >
                          {m.avatar}
                        </div>
                      );
                    })}
                    {proj.team.length > 4 && (
                      <div className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-[#475569] bg-[#e2e8f0] dark:bg-slate-800 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900">
                        +{proj.team.length - 4}
                      </div>
                    )}
                  </div>

                  <span className="text-sm font-bold text-[#161718] dark:text-white font-mono">
                    {(proj as any).storyPoints ? `${(proj as any).storyPoints} SP` : `${Math.max(150, totalTasks * 60)} SP`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── CREATE NEW PROJECT MODAL (LOCALIZED ACADEMIC SOFTWARE ENGINEERING CAPSTONE) ──
const DEFAULT_TEAM_MEMBERS = [
  "Nguyễn Bá Hòa",
  "Võ Nhật Huy",
  "Phan Đình Nghị",
  "Lê Thị Hà",
  "Hoàng Trọng Nam",
  "Đỗ Mỹ Linh",
  "Trần Minh Tuấn",
  "Lê Quốc Bảo",
];

const KIND_OPTIONS = [
  "AI / Agent System",
  "Fullstack Web & Cloud",
  "Microservices & Distributed",
  "Compiler & Systems",
  "Edge AI & IoT",
  "Cybersecurity & DevSecOps",
  "Mobile & Cross-platform",
];

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: any) => void;
}

export function MarloNewProjectModal({ isOpen, onClose, onCreateProject }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [kind, setKind] = useState("AI / Agent System");
  const [budget, setBudget] = useState("600");
  const [deliveryDate, setDeliveryDate] = useState("15/12/2026");
  const [repoUrl, setRepoUrl] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string[]>(["Nguyễn Bá Hòa", "Võ Nhật Huy"]);
  const [isClosing, setIsClosing] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Entrance spring animation with GSAP
  useEffect(() => {
    if (isOpen && cardRef.current && backdropRef.current) {
      setIsClosing(false);
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.22, ease: "power2.out" }
      );
      gsap.fromTo(
        cardRef.current,
        { scale: 0.93, opacity: 0, y: 14 },
        { scale: 1, opacity: 1, y: 0, duration: 0.28, ease: "back.out(1.4)" }
      );
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isClosing) {
        handleAnimatedClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isClosing]);

  if (!isOpen) return null;

  const handleAnimatedClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    if (cardRef.current && backdropRef.current) {
      gsap.to(backdropRef.current, { opacity: 0, duration: 0.18, ease: "power2.in" });
      gsap.to(cardRef.current, {
        scale: 0.95,
        opacity: 0,
        y: 8,
        duration: 0.18,
        ease: "power2.in",
        onComplete: () => {
          onClose();
          setIsClosing(false);
        },
      });
    } else {
      onClose();
    }
  };

  const toggleTeamMember = (member: string) => {
    setSelectedTeam((prev) =>
      prev.includes(member) ? prev.filter((m) => m !== member) : [...prev, member]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || "Hệ thống Kiểm thử Tự động AI Sandbox";
    const finalClient = client.trim() || "CS499 · Đồ án Tốt nghiệp Kỹ sư CNTT";
    const spNum = Math.max(100, Number(budget.replace(/[^0-9]/g, "")) || 600);
    const finalTeam = selectedTeam.length > 0 ? selectedTeam : ["Nguyễn Bá Hòa"];

    onCreateProject({
      id: `prj-${Date.now()}`,
      code: `PRJ-${Math.floor(Math.random() * 900 + 100)}`,
      name: finalName,
      client: finalClient,
      course: finalClient,
      sprint: "Sprint 1 (Tuần 1 - 4)",
      kind,
      status: "planning",
      fav: true,
      dueDate: deliveryDate || "15/12/2026",
      budget: spNum,
      budgetStr: `${spNum.toLocaleString()} SP`,
      storyPoints: spNum,
      teamMembers: finalTeam,
      repoUrl: repoUrl.trim() || undefined,
    });
    setName("");
    setClient("");
    setRepoUrl("");
    handleAnimatedClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleAnimatedClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none"
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] rounded-[30px] border border-slate-200/90 dark:border-slate-800 bg-[#fcfbfa] dark:bg-[#1a1b1e] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] p-6 sm:p-7 select-none relative"
      >
        {/* Header: Title + Subtitle + Close 'X' button */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#16171a] dark:text-white font-sans">
              Đăng ký Đồ án Kỹ nghệ Mới
            </h2>
            <p className="text-xs sm:text-sm text-[#62656b] dark:text-[#a0a3a9] mt-0.5 font-normal">
              Khởi tạo không gian đồ án nhóm, học phần, quỹ Story Points và thành viên.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAnimatedClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer active:scale-95"
            title="Đóng modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Project name + Course */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tên đề tài đồ án *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: AI Sandbox Code Grader"
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#131417] text-sm font-normal text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[#EE8420] focus:ring-2 focus:ring-[#EE8420]/25 transition-all shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Học phần / Mã lớp
              </label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="VD: CS499 · Đồ án Tốt nghiệp"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#131417] text-sm font-normal text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[#EE8420] focus:ring-2 focus:ring-[#EE8420]/25 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Row 2: Kind + Story Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phân loại kỹ thuật
              </label>
              <div className="relative">
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#131417] text-sm font-normal text-slate-900 dark:text-white outline-none focus:border-[#EE8420] focus:ring-2 focus:ring-[#EE8420]/25 transition-all shadow-2xs pr-9 cursor-pointer"
                >
                  {KIND_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={15}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Quỹ điểm (Story Points)
              </label>
              <input
                type="number"
                min={100}
                max={5000}
                step={50}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="600"
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#131417] text-sm font-normal text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[#EE8420] focus:ring-2 focus:ring-[#EE8420]/25 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Row 3: Delivery date + Optional GitHub Repo URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Hạn nộp & Bảo vệ dự kiến (DD/MM/YYYY)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  placeholder="15/12/2026"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#131417] text-sm font-normal text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[#EE8420] focus:ring-2 focus:ring-[#EE8420]/25 transition-all shadow-2xs pr-10"
                />
                <Calendar
                  size={16}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Đường dẫn GitHub Repository (tùy chọn)
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/nhom-ban/ten-du-an"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#131417] text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[#EE8420] focus:ring-2 focus:ring-[#EE8420]/25 transition-all shadow-2xs pl-9"
                />
                <FolderGit2
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-1">
                Tự động đồng bộ sang Git Hub & kiểm chứng link nộp bài Kanban.
              </p>
            </div>
          </div>

          {/* Row 4: Team member selector pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Thành viên nhóm sinh viên ({selectedTeam.length} người)
              </label>
              <span className="text-[10.5px] text-slate-400">
                Người đầu tiên là Nhóm trưởng
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {DEFAULT_TEAM_MEMBERS.map((member) => {
                const isSelected = selectedTeam.includes(member);
                const isFirst = selectedTeam[0] === member;
                return (
                  <button
                    key={member}
                    type="button"
                    onClick={() => toggleTeamMember(member)}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-all duration-150 cursor-pointer active:scale-95 select-none ${
                      isSelected
                        ? "bg-[#14161a] text-white dark:bg-amber-500 dark:text-slate-950 font-semibold shadow-2xs"
                        : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {isFirst ? `★ ${member}` : member}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 5: Actions Cancel + Create project */}
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={handleAnimatedClose}
              className="px-4.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer active:scale-95 shadow-2xs"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#EE8420] hover:bg-[#d97316] rounded-2xl shadow-xs transition cursor-pointer active:scale-95"
            >
              Khởi tạo Đồ án
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
