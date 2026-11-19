import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, Plus, RefreshCw, Mail, Check, Calendar, ExternalLink, X, CheckCircle2, Phone } from "lucide-react";
import gsap from "gsap";
import {
  getMarloMember,
  getMarloProject,
  getMarloProjects,
  getMemberOpenTasks,
  getMemberProjects,
  getMemberLoadStats,
  updateMarloMemberStatus,
  addMarloTask,
  MARLO_MEMBERS,
  MARLO_SKILLS,
  MARLO_MEMBER_STATUS_LABEL,
  MARLO_MEMBER_STATUS_TONE,
  MARLO_PROJECT_STATUS,
  MARLO_TASK_STATUS,
  MARLO_HUES,
  MarloTask,
} from "../marlo-engine/marloData";
import "../marlo-engine/marloStyles.css";

interface Props {
  personId?: string;
  onNavigateBack: () => void;
  onNavigateToProject: (projectId: string) => void;
}

export default function MarloPersonDetailScreen({
  personId = "hoa",
  onNavigateBack,
  onNavigateToProject,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const member = getMarloMember(personId) || MARLO_MEMBERS[0];
  const [memberStatus, setMemberStatus] = useState(member.status);

  useEffect(() => {
    setMemberStatus(member.status);
  }, [member.id, member.status]);

  // Listen for storage changes across components
  useEffect(() => {
    const handleDataChanged = () => setDataVersion((v) => v + 1);
    window.addEventListener("codemind-marlo-data-changed", handleDataChanged);
    return () => window.removeEventListener("codemind-marlo-data-changed", handleDataChanged);
  }, []);

  const stats = getMemberLoadStats(member.id);
  const openTasks = getMemberOpenTasks(member.id);
  const jobs = getMemberProjects(member.id); // 1 Person has multiple Projects!
  const allProjects = getMarloProjects();

  const hue = MARLO_HUES[member.hue] || { bg: "#f7d593", text: "#633806" };
  const maxWeeklyHours = Math.max(...stats.values, member.capacity, 40);

  // ─── Modal States ───
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignProjectId, setAssignProjectId] = useState(jobs[0]?.id || "codemind");
  const [assignEst, setAssignEst] = useState(8);
  const [assignPriority, setAssignPriority] = useState<"high" | "med" | "low">("high");

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Toggle status cycle
  const handleCycleStatus = () => {
    const statuses: ("in" | "remote" | "off")[] = ["in", "remote", "off"];
    const nextIdx = (statuses.indexOf(memberStatus) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];
    setMemberStatus(nextStatus);
    updateMarloMemberStatus(member.id, nextStatus);
    showToast(`✓ Đã đổi trạng thái ${member.name} thành "${MARLO_MEMBER_STATUS_LABEL[nextStatus]}"`);
  };

  const handleAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle.trim()) return;

    addMarloTask({
      title: assignTitle.trim(),
      projectId: assignProjectId,
      who: member.id,
      status: "doing",
      priority: assignPriority,
      kind: member.skill,
      est: Number(assignEst) || 8,
      due: Date.now() + 4 * 86400000,
    });

    setAssignTitle("");
    setIsAssignModalOpen(false);
    showToast(`✓ Đã giao công việc mới cho ${member.name}!`);
  };

  // ─── AUTHENTIC MARLO GSAP ENTRANCE ANIMATION ───
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".backlink",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );

      gsap.fromTo(
        ".prof__head",
        { opacity: 0, y: 20, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: "back.out(1.2)",
          delay: 0.08,
          clearProps: "transform,opacity",
        }
      );

      gsap.fromTo(
        ".prof__grid > section",
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power3.out",
          stagger: 0.08,
          delay: 0.2,
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

      gsap.fromTo(
        ".prow",
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.025,
          delay: 0.3,
          clearProps: "transform,opacity",
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [member.id]);

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

      <div className="max-w-[1560px] mx-auto prof">
        {/* Backlink */}
        <button
          type="button"
          onClick={onNavigateBack}
          className="backlink"
          title="Quay lại danh sách Team"
        >
          <ChevronLeft size={16} />
          <span>Danh sách Team & Chuyên gia</span>
        </button>

        {/* Hero Card: Member Profile Head */}
        <section className="card prof__head grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-6 mb-6">
          {/* Avatar XL */}
          <div className="relative flex-none">
            <div
              className="av av--xl font-bold shadow-sm text-xl"
              style={{ background: hue.bg, color: hue.text }}
            >
              {member.initials || member.name.slice(0, 2).toUpperCase()}
            </div>
            {memberStatus === "in" && (
              <span className="av__dot w-3.5 h-3.5" title="Đang có mặt tại phòng Lab hôm nay" />
            )}
          </div>

          {/* Name & Role & Email */}
          <div className="prof__who min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
              {member.name}
            </h1>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">
              {member.role} · {MARLO_SKILLS[member.skill]?.name}
            </p>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              <a
                href={`mailto:${member.email}`}
                className="linkbtn inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <Mail size={13} />
                <span>{member.email}</span>
              </a>
              {member.phone && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <Phone size={12} />
                  <span>{member.phone}</span>
                </span>
              )}
            </div>
          </div>

          {/* 3 Stats: Last 7 days, 8 weeks, Open work */}
          <div className="prof__stats flex flex-wrap items-center gap-6 sm:gap-8 border-t md:border-t-0 md:border-l border-[#14161a14] dark:border-[#ffffff12] pt-4 md:pt-0 md:pl-8">
            <div>
              <small className="text-xs text-slate-500 font-semibold block">7 ngày qua</small>
              <b className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.last7Days} h
              </b>
            </div>

            <div>
              <small className="text-xs text-slate-500 font-semibold block">8 tuần gần đây</small>
              <b className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.eightWeeksTotal} h
              </b>
            </div>

            <div>
              <small className="text-xs text-slate-500 font-semibold block">Công việc đang mở</small>
              <b className="text-2xl font-bold text-[#f29b23]">
                {openTasks.length} task
              </b>
            </div>
          </div>

          {/* Profile Actions: Status Pill & Assign task */}
          <div className="prof__actions col-span-full flex items-center justify-end gap-3 pt-3 border-t border-[#14161a14] dark:border-[#ffffff12]">
            <button
              type="button"
              onClick={handleCycleStatus}
              className="btn flex items-center gap-2"
              title="Nhấp để đổi trạng thái làm việc (Tại Lab / Làm từ xa / Nghỉ phép)"
            >
              <RefreshCw size={14} className="text-[#f29b23]" />
              <span className={`pill pill--${MARLO_MEMBER_STATUS_TONE[memberStatus]} text-xs`}>
                {MARLO_MEMBER_STATUS_LABEL[memberStatus]}
              </span>
            </button>

            <button
              type="button"
              className="btn btn--primary flex items-center gap-2"
              onClick={() => setIsAssignModalOpen(true)}
              title="Giao công việc mới cho nhân sự này"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Giao việc (Assign task)</span>
            </button>
          </div>
        </section>

        {/* 2-Column Grid: Left Open Tasks vs Right Hours & Jobs */}
        <div className="prof__grid grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
          {/* Left: Open Tasks */}
          <section className="card">
            <div className="chead flex items-center justify-between mb-4">
              <div className="chead__text">
                <h2 className="text-lg font-bold">Công việc đang phụ trách</h2>
                <p className="text-xs text-slate-500">{openTasks.length} task trong danh sách xử lý</p>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {openTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Không có công việc nào đang chờ xử lý.
                </div>
              ) : (
                openTasks.map((t) => {
                  const p = getMarloProject(t.projectId);
                  return (
                    <div
                      key={t.id}
                      className="prow py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition"
                    >
                      <div className="cell__text min-w-0 flex-1">
                        <b className="text-sm font-semibold text-slate-900 dark:text-slate-100 block truncate">
                          {t.code ? `${t.code}: ` : ""}{t.title}
                        </b>
                        <small className="text-xs text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                          {p?.name || "Đồ án"} · {t.est}h dự kiến
                        </small>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        <span
                          className={`pill ${
                            t.status === "review"
                              ? "pill--info"
                              : t.status === "doing"
                              ? "pill--warn"
                              : "pill--plain"
                          } text-[11px]`}
                        >
                          {MARLO_TASK_STATUS[t.status]}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Right Stack: Hours by week & Jobs */}
          <div className="flex flex-col gap-6">
            {/* Hours by week chart */}
            <section className="card">
              <div className="chead mb-3">
                <div className="chead__text">
                  <h2 className="text-lg font-bold">Giờ cống hiến theo tuần</h2>
                  <p className="text-xs text-slate-500">Định mức quy định: {member.capacity} giờ / tuần</p>
                </div>
              </div>

              <div className="bars h-[180px]">
                <div className="bars__cols h-[140px] flex items-end gap-2 pb-6 border-b border-slate-200 dark:border-slate-800">
                  {stats.labels.map((lbl, idx) => {
                    const val = stats.values[idx] || 0;
                    const heightPercent = (val / maxWeeklyHours) * 100;
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

            {/* Jobs List (Projects member is assigned to) */}
            <section className="card">
              <div className="chead mb-3">
                <div className="chead__text">
                  <h2 className="text-lg font-bold">Đồ án đang tham gia</h2>
                  <p className="text-xs text-slate-500">
                    {jobs.length} đề tài {member.name} đang trực tiếp nghiên cứu
                  </p>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onNavigateToProject(job.id)}
                    className="prow py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition cursor-pointer"
                    title={`Mở chi tiết đồ án ${job.name}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f29b23] flex-none" />
                      <b className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {job.name}
                      </b>
                    </div>

                    <div className="flex items-center gap-1.5 flex-none text-xs text-slate-500 font-semibold">
                      <span>{MARLO_PROJECT_STATUS[job.status]}</span>
                      <ExternalLink size={12} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ─── REAL MODAL: ASSIGN TASK ─── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1b1c1e] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Giao Task Cho {member.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tiêu đề công việc giao phó *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cấu hình Reverse Proxy Nginx & SSL cert..."
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#f29b23]/30"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Thuộc đồ án nào
                </label>
                <select
                  value={assignProjectId}
                  onChange={(e) => setAssignProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none"
                >
                  {allProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Thời lượng dự kiến (giờ)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={assignEst}
                    onChange={(e) => setAssignEst(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={assignPriority}
                    onChange={(e) => setAssignPriority(e.target.value as any)}
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
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[#f29b23] hover:bg-[#d48419] text-white rounded-xl shadow-xs transition"
                >
                  Giao Task Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
