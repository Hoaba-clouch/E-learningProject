import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, Plus, Clock, ExternalLink, X, CheckCircle2 } from "lucide-react";
import gsap from "gsap";
import {
  getMarloProject,
  getMarloMember,
  getMarloMembers,
  getProjectTasks,
  getProjectHoursStats,
  addMarloTask,
  logMarloHours,
  updateMarloProjectStatus,
  updateMarloTaskStatus,
  MARLO_PROJECT_STATUS,
  MARLO_TASK_COLS,
  MARLO_HUES,
  formatCurrency,
  formatFullCurrency,
  MarloTask,
} from "../marlo-engine/marloData";
import "../marlo-engine/marloStyles.css";

interface Props {
  projectId?: string;
  onNavigateBack: () => void;
  onNavigateToPerson: (personId: string) => void;
  onNavigateToKanban?: (projectId: string) => void;
}

export default function MarloProjectDetailScreen({
  projectId = "codemind",
  onNavigateBack,
  onNavigateToPerson,
  onNavigateToKanban,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressCircleRef = useRef<SVGCircleElement>(null);

  // Sync state with dynamic store
  const [dataVersion, setDataVersion] = useState(0);

  const project = getMarloProject(projectId) || getMarloProject("codemind")!;
  const [currentStatus, setCurrentStatus] = useState(project.status);
  const tasks = getProjectTasks(project.id);
  const stats = getProjectHoursStats(project.id);
  const allMembers = getMarloMembers();

  // Listen for storage changes across tabs & components
  useEffect(() => {
    const handleDataChanged = () => setDataVersion((v) => v + 1);
    window.addEventListener("codemind-marlo-data-changed", handleDataChanged);
    return () => window.removeEventListener("codemind-marlo-data-changed", handleDataChanged);
  }, []);

  const doneTasksCount = tasks.filter((t) => t.status === "done").length;
  const progressPercent = tasks.length > 0 ? Math.round((doneTasksCount / tasks.length) * 100) : 0;
  const leadMember = getMarloMember(project.lead);

  // Calculate circular SVG progress
  const strokeWidth = 8;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const targetStrokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Max value for hours by week bar chart
  const maxBarValue = Math.max(...stats.values, 45);

  // ─── Modal States ───
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskWho, setNewTaskWho] = useState(project.lead);
  const [newTaskEst, setNewTaskEst] = useState(8);
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "med" | "low">("high");

  const [isLogTimeModalOpen, setIsLogTimeModalOpen] = useState(false);
  const [logHours, setLogHours] = useState(4);
  const [logWho, setLogWho] = useState(project.lead);
  const [logNote, setLogNote] = useState("");

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addMarloTask({
      title: newTaskTitle.trim(),
      projectId: project.id,
      who: newTaskWho,
      status: "todo",
      priority: newTaskPriority,
      kind: "architecture",
      est: Number(newTaskEst) || 8,
      due: Date.now() + 3 * 86400000,
    });

    setNewTaskTitle("");
    setIsAddTaskModalOpen(false);
    showToast(`✓ Đã thêm công việc kỹ thuật mới vào đồ án ${project.name}!`);
  };

  const handleLogHours = (e: React.FormEvent) => {
    e.preventDefault();
    const h = Number(logHours);
    if (!h || h <= 0) return;

    logMarloHours({
      projectId: project.id,
      who: logWho,
      hours: h,
      kind: "architecture",
      note: logNote.trim() || "Ghi nhận tiến độ kỹ thuật đồ án",
    });

    setIsLogTimeModalOpen(false);
    setLogNote("");
    showToast(`✓ Đã ghi nhận ${h} giờ làm việc thực tế vào đồ án!`);
  };

  const handleStatusChange = (newStatus: any) => {
    setCurrentStatus(newStatus);
    updateMarloProjectStatus(project.id, newStatus);
    showToast(`✓ Đã cập nhật trạng thái đồ án thành "${MARLO_PROJECT_STATUS[newStatus]}"`);
  };

  // ─── AUTHENTIC MARLO GSAP ENTRANCE ANIMATION ───
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".backlink, .phead",
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: 0.08 }
      );

      gsap.fromTo(
        ".pd__stat",
        { opacity: 0, y: 22, scale: 0.97 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: "back.out(1.2)",
          stagger: 0.06,
          delay: 0.1,
          clearProps: "transform,opacity",
        }
      );

      gsap.fromTo(
        ".pd__tasks, .stack > section",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power3.out",
          stagger: 0.08,
          delay: 0.25,
          clearProps: "transform,opacity",
        }
      );

      gsap.fromTo(
        ".bars__bar",
        { scaleY: 0, transformOrigin: "bottom center" },
        {
          scaleY: 1,
          duration: 0.7,
          ease: "back.out(1.4)",
          stagger: 0.035,
          delay: 0.35,
          clearProps: "transform",
        }
      );

      if (progressCircleRef.current) {
        gsap.fromTo(
          progressCircleRef.current,
          { strokeDashoffset: circumference },
          {
            strokeDashoffset: targetStrokeDashoffset,
            duration: 1.1,
            ease: "power2.out",
            delay: 0.2,
          }
        );
      }

      gsap.fromTo(
        ".pd__task",
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.02,
          delay: 0.4,
          clearProps: "transform,opacity",
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [project.id]);

  return (
    <div
      ref={containerRef}
      className="marlo-scope min-h-screen bg-transparent text-[#161718] dark:text-[#f0f0f1] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200"
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold shadow-xl border border-slate-700 dark:border-slate-300 flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-[#f29b23]" />
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
          <span>Danh sách đồ án (The slate)</span>
        </button>

        {/* Page Header */}
        <div className="phead flex flex-wrap items-end justify-between gap-4 mb-6">
          <div className="phead__text flex-1 min-w-[280px]">
            <span className="eyebrow text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1 block">
              {project.client} · {project.kind}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {project.name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1.5 max-w-3xl leading-relaxed">
              {project.brief}
            </p>
          </div>

          <div className="phead__actions flex items-center gap-3">
            <button
              type="button"
              className="btn flex items-center gap-2"
              onClick={() => setIsLogTimeModalOpen(true)}
              title="Ghi nhận giờ làm việc thực tế"
            >
              <Clock size={16} className="text-[#f29b23]" />
              <span>Ghi nhận giờ (Log time)</span>
            </button>
            <button
              type="button"
              className="btn btn--primary flex items-center gap-2"
              onClick={() => setIsAddTaskModalOpen(true)}
              title="Thêm công việc kỹ thuật mới"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Thêm việc (+ Add task)</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="pd__stats grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              <small className="text-xs text-slate-500 font-semibold">Tiến độ Sprint</small>
              <b className="text-base font-bold text-slate-800 dark:text-slate-200">
                {doneTasksCount} / {tasks.length} tasks xong
              </b>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {project.status === "delivered" ? "Đã nghiệm thu xong" : "Hạn nộp: Còn 5 ngày"}
              </span>
            </div>
          </section>

          {/* Card 2: Hours Logged */}
          <section className="card pd__stat flex flex-col justify-between">
            <small className="text-xs text-slate-500 font-semibold">Tổng giờ công kỹ thuật</small>
            <b className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 my-1">
              {stats.totalHours} giờ
            </b>
            <span className="text-xs text-emerald-600 font-semibold">
              +{stats.thisWeekHours} giờ trong tuần này
            </span>
          </section>

          {/* Card 3: Budget Used */}
          <section className="card pd__stat flex flex-col justify-between">
            <small className="text-xs text-slate-500 font-semibold">Kinh phí nghiên cứu đã giải ngân</small>
            <b className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 my-1">
              {formatCurrency(stats.budgetUsed)}
            </b>
            <div>
              <div className="w-full bg-[#e1e2e5] dark:bg-[#2c2d31] h-2 rounded-full overflow-hidden mb-1">
                <div
                  className="bg-[#f29b23] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (stats.budgetUsed / project.budget) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Hạn mức tài trợ: {formatFullCurrency(project.budget)}
              </span>
            </div>
          </section>

          {/* Card 4: Status Dropdown & Lead */}
          <section className="card pd__stat flex flex-col justify-between">
            <small className="text-xs text-slate-500 font-semibold">Trạng thái đồ án</small>
            <div className="my-1">
              <select
                value={currentStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full h-10 px-3 bg-[#ecedef] dark:bg-[#222326] border border-[#14161a26] dark:border-[#ffffff24] rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-[#f29b23] cursor-pointer"
              >
                {Object.keys(MARLO_PROJECT_STATUS).map((key) => (
                  <option key={key} value={key}>
                    {MARLO_PROJECT_STATUS[key]}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Trưởng dự án: {leadMember?.name || "Nguyễn Bá Hòa"}
            </span>
          </section>
        </div>

        {/* Main Grid: Left Tasks Columns vs Right Hours & Team Stack */}
        <div className="pd__grid grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
          {/* Left: Tasks by where they stand */}
          <section className="card pd__tasks">
            <div className="chead flex items-center justify-between mb-4">
              <div className="chead__text">
                <h2 className="text-lg font-bold">Danh sách công việc kỹ thuật</h2>
                <p className="text-xs text-slate-500">Phân loại theo giai đoạn Sprint</p>
              </div>
              {onNavigateToKanban && (
                <button
                  type="button"
                  onClick={() => onNavigateToKanban(project.id)}
                  className="linkbtn flex items-center gap-1.5 font-semibold text-sm"
                  title="Mở bảng Kanban chi tiết"
                >
                  <span>Mở bảng Kanban</span>
                  <ExternalLink size={13} />
                </button>
              )}
            </div>

            {/* 4 Task Columns */}
            <div className="pd__cols grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {MARLO_TASK_COLS.map((col) => {
                const colTasks = tasks.filter((t) => t.status === col.id);
                return (
                  <div key={col.id} className="pd__col flex flex-col gap-2 min-w-0">
                    <div className="pd__colhead flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 pb-1.5 border-b border-slate-200 dark:border-slate-800">
                      <span className="flex items-center gap-1.5 truncate">
                        <i className={`st--${col.id}`} />
                        {col.label}
                      </span>
                      <span className="badge text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 mt-1">
                      {colTasks.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-2 text-center">Trống</div>
                      ) : (
                        colTasks.map((task) => {
                          const whoMember = getMarloMember(task.who);
                          const hue = whoMember
                            ? MARLO_HUES[whoMember.hue] || { bg: "#e6d6c4", text: "#161718" }
                            : { bg: "#e6d6c4", text: "#161718" };
                          return (
                            <div
                              key={task.id}
                              className="pd__task p-2.5 rounded-xl bg-[#ecedef] hover:bg-[#e1e2e5] dark:bg-[#222326] dark:hover:bg-[#2c2d31] transition-all flex flex-col gap-1.5 cursor-pointer border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                              onClick={() => {
                                if (whoMember) onNavigateToPerson(whoMember.id);
                              }}
                              title={`${task.title} - Phụ trách: ${whoMember?.name || "Chưa giao"}`}
                            >
                              <div className="flex items-center gap-2">
                                {whoMember && (
                                  <div
                                    className="av av--sm font-bold flex-none text-[10px]"
                                    style={{ background: hue.bg, color: hue.text }}
                                  >
                                    {whoMember.initials || whoMember.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex-1">
                                  {task.code ? `${task.code}: ` : ""}{task.title}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                                <span>{task.est}h công</span>
                                <span className={task.priority === "high" ? "text-rose-600 font-bold" : ""}>
                                  {task.priority === "high" ? "Ưu tiên cao" : "Bình thường"}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Right Stack: Hours by week chart & Team */}
          <div className="stack flex flex-col gap-6">
            {/* Hours by week bar chart */}
            <section className="card">
              <div className="chead mb-3">
                <div className="chead__text">
                  <h2 className="text-lg font-bold">Giờ cống hiến theo tuần</h2>
                  <p className="text-xs text-slate-500">8 tuần nghiên cứu gần nhất</p>
                </div>
              </div>

              <div className="bars h-[180px]">
                <div className="bars__cols h-[140px] flex items-end gap-2 pb-6 border-b border-slate-200 dark:border-slate-800">
                  {stats.labels.map((lbl, idx) => {
                    const val = stats.values[idx] || 0;
                    const heightPercent = (val / maxBarValue) * 100;
                    const isCurrentWeek = idx === stats.labels.length - 1;

                    return (
                      <div
                        key={lbl}
                        className={`bars__col flex-1 flex flex-col items-center justify-end h-full relative group ${
                          isCurrentWeek ? "is-hi" : ""
                        }`}
                      >
                        <div className="bars__track w-full flex items-end justify-center h-full relative">
                          <div
                            className={`bars__bar w-full max-w-[28px] rounded-t-sm transition-all duration-500 ${
                              isCurrentWeek
                                ? "bg-[#f29b23]"
                                : val > 0
                                ? "bg-[#161718] dark:bg-[#f0f0f1]"
                                : "bg-transparent"
                            }`}
                            style={{ height: `${Math.max(4, heightPercent)}%` }}
                            title={`${lbl}: ${val} giờ`}
                          />
                        </div>
                        <span
                          className={`bars__label text-[10px] font-semibold mt-2 whitespace-nowrap ${
                            isCurrentWeek ? "text-[#f29b23] font-bold" : "text-slate-400"
                          }`}
                        >
                          {lbl}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Team List */}
            <section className="card">
              <div className="chead mb-3">
                <div className="chead__text">
                  <h2 className="text-lg font-bold">Thành viên thực hiện</h2>
                  <p className="text-xs text-slate-500">
                    {project.team.length} nhân sự tham gia đồ án này
                  </p>
                </div>
              </div>

              <div className="pd__team flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {project.team.map((memId) => {
                  const m = getMarloMember(memId);
                  if (!m) return null;
                  const hue = MARLO_HUES[m.hue] || { bg: "#e6d6c4", text: "#161718" };

                  return (
                    <div
                      key={m.id}
                      onClick={() => onNavigateToPerson(m.id)}
                      className="pd__person py-2.5 px-1.5 flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition cursor-pointer"
                      title={`Xem chi tiết hồ sơ thành viên ${m.name}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="av av--sm font-bold flex-none shadow-2xs"
                          style={{ background: hue.bg, color: hue.text }}
                        >
                          {m.initials}
                        </div>
                        <div className="min-w-0">
                          <b className="text-sm font-semibold text-slate-900 dark:text-slate-100 block truncate">
                            {m.name}
                          </b>
                          <small className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                            {m.role}
                          </small>
                        </div>
                      </div>

                      <div className="text-right flex-none">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                          {m.capacity} h/tuần
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ─── REAL MODAL: ADD TASK ─── */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1b1c1e] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Thêm Công Việc Mới Vào Đồ Án
              </h3>
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
                  placeholder="VD: Cài đặt module phân tán Redis Lock..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#f29b23]/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Người chịu trách nhiệm
                </label>
                <select
                  value={newTaskWho}
                  onChange={(e) => setNewTaskWho(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none"
                >
                  {allMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Ước lượng (giờ)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={newTaskEst}
                    onChange={(e) => setNewTaskEst(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mức ưu tiên
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="high">Ưu tiên cao</option>
                    <option value="med">Bình thường</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#f29b23] hover:bg-[#d48419] text-white rounded-xl shadow-xs transition"
                >
                  Xác Nhận Tạo Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── REAL MODAL: LOG TIME ─── */}
      {isLogTimeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1b1c1e] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ghi Nhận Giờ Nghiên Cứu / Code
              </h3>
              <button
                type="button"
                onClick={() => setIsLogTimeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogHours} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Số giờ thực hiện hôm nay *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  required
                  value={logHours}
                  onChange={(e) => setLogHours(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#f29b23]/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nhân sự ghi nhận
                </label>
                <select
                  value={logWho}
                  onChange={(e) => setLogWho(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none"
                >
                  {allMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ghi chú công việc đã làm
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Viết test case, debug lỗi WebSocket, tinh chỉnh prompt Socratic..."
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLogTimeModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#f29b23] hover:bg-[#d48419] text-white rounded-xl shadow-xs transition"
                >
                  Ghi Nhận Vào Hệ Thống
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
