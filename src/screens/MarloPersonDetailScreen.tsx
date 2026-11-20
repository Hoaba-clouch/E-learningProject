import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { ChevronLeft, Plus, RefreshCw, Mail, Check, ExternalLink, X, CheckCircle2, Crown, GitCommit } from "lucide-react";
import gsap from "gsap";
import {
  animateMarloCards,
  animateMarloRows,
  initMarloMagnetic,
} from "../utils/marloAnimations";
import {
  MARLO_MEMBER_STATUS_LABEL,
  MARLO_MEMBER_STATUS_TONE,
  MARLO_PROJECT_STATUS,
  MARLO_TASK_STATUS,
  MARLO_HUES,
} from "../marlo-engine/marloData";
import {
  createWorkspaceTaskApi,
  fetchTeamMembersApi,
  updateTeamMemberStatusApi,
  type TeamMemberRecord,
} from "../api";
import { DEFAULT_TEAM_MEMBER_RECORDS } from "../data/defaultTeamMembers";
import "../marlo-engine/marloStyles.css";

interface Props {
  personId?: string;
  role?: "student" | "instructor" | "admin";
  onNavigateBack: () => void;
  onNavigateToProject: (projectId: string) => void;
}

export default function MarloPersonDetailScreen({
  personId = "",
  role = "student",
  onNavigateBack,
  onNavigateToProject,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<TeamMemberRecord[]>(DEFAULT_TEAM_MEMBER_RECORDS);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignProjectId, setAssignProjectId] = useState("prj-codemind");
  const [assignEst, setAssignEst] = useState(8);
  const [assignPriority, setAssignPriority] = useState<"high" | "medium" | "low">("high");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const loadMembers = async () => {
    try {
      const bundle = await fetchTeamMembersApi(role);
      if (bundle?.members && bundle.members.length > 0) {
        setMembers(bundle.members);
      }
    } catch {}
  };

  // Background non-blocking sync
  useEffect(() => {
    let active = true;
    fetchTeamMembersApi(role)
      .then((bundle) => {
        if (!active || !bundle) return;
        if (bundle.members && bundle.members.length > 0) {
          setMembers(bundle.members);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [role]);

  const member =
    members.find(
      (m) =>
        m.id === personId ||
        m.email.toLowerCase() === personId.toLowerCase() ||
        m.name.toLowerCase().includes(personId.toLowerCase())
    ) ||
    DEFAULT_TEAM_MEMBER_RECORDS.find((m) => m.id === personId) ||
    members[0] ||
    DEFAULT_TEAM_MEMBER_RECORDS[0];

  useEffect(() => {
    if (member?.projects?.[0]?.id) {
      setAssignProjectId(member.projects[0].id);
    }
  }, [member?.id]);

  const handleCycleStatus = async () => {
    if (!member) return;
    if (member.isAdvisor && role === "student") {
      showToast("⚠️ Học viên không thể thay đổi trạng thái công tác của Giảng viên Hội đồng.");
      return;
    }
    const statuses: ("in" | "remote" | "off")[] = ["in", "remote", "off"];
    const nextStatus = statuses[(statuses.indexOf(member.status) + 1) % statuses.length];
    try {
      await updateTeamMemberStatusApi(member.id, nextStatus, role);
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, status: nextStatus } : m))
      );
      window.dispatchEvent(new Event("codemind-marlo-data-changed"));
      showToast(`✓ Đã lưu trạng thái ${member.name}: "${MARLO_MEMBER_STATUS_LABEL[nextStatus]}"`);
    } catch (err: any) {
      showToast(err?.message || "Không thể cập nhật trạng thái thành viên.");
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !assignTitle.trim()) return;
    if (member.isAdvisor) {
      showToast("⚠️ Không thể giao công việc sinh viên cho Giảng viên / Hội đồng Khảo thí.");
      return;
    }

    const res = await createWorkspaceTaskApi(assignProjectId, {
      code: `TSK-${Math.floor(Math.random() * 899 + 100)}`,
      title: assignTitle.trim(),
      description: `${assignTitle.trim()} — Giao trực tiếp cho ${member.name}.`,
      column: "ready",
      priority: assignPriority,
      moscow: assignPriority === "high" ? "must" : "should",
      points: Math.max(1, Math.min(21, Number(assignEst) || 5)),
      assignee: {
        name: member.name,
        avatar: member.name.charAt(0).toUpperCase(),
        role: member.role,
      },
      estimateHours: (Number(assignEst) || 5) * 2,
      dueDate: "15/12/2026",
      epic: "Sprint Goal",
    });

    if (res) {
      await loadMembers();
      window.dispatchEvent(new Event("codemind-nav-updated"));
      showToast(`✓ Đã giao công việc mới cho ${member.name} và lưu xuống MySQL!`);
    } else {
      showToast("Không thể giao việc mới lên server.");
    }
    setAssignTitle("");
    setIsAssignModalOpen(false);
  };

  // ─── AUTHENTIC MARLO STAGE ENTRANCE (SILKY SMOOTH EXPO.OUT) ───
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !member) return;
    const ctx = gsap.context(() => {
      // 1. Stage container slides in smoothly with expo.out (identical to MarloProjectsScreen)
      gsap.fromTo(
        el,
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.65,
          ease: "expo.out",
          clearProps: "transform,opacity",
        }
      );

      // 2. Cascade backlink
      gsap.fromTo(
        ".backlink",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.5, ease: "expo.out", clearProps: "transform,opacity" }
      );

      // 3. Stagger member cards with Marlo card physics
      const cards = el.querySelectorAll(".card, .prof__head");
      if (cards.length > 0) {
        animateMarloCards(cards, { y: 22, stagger: 0.04, duration: 0.75 });
      }

      // 4. Stagger task rows and project rows with Marlo row physics (identical to kit.jsx function co / projects.jsx)
      const rows = el.querySelectorAll(".prow");
      if (rows.length > 0) {
        animateMarloRows(rows, { y: 10, stagger: 0.03, delay: 0.25, duration: 0.55 });
      }

      initMarloMagnetic(el);
    }, el);
    return () => ctx.revert();
  }, [member?.id]);

  const hue = MARLO_HUES[member.hue] || { bg: "#f7d593", text: "#633806" };

  return (
    <div
      ref={containerRef}
      className="marlo-scope min-h-screen bg-transparent text-[#161718] dark:text-[#f0f0f1] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200"
    >
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold shadow-xl border border-slate-700 dark:border-slate-300 flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#f29b23]" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="max-w-[1560px] mx-auto prof">
        <button
          type="button"
          onClick={onNavigateBack}
          className="backlink cursor-pointer"
          title="Quay lại danh sách Team"
        >
          <ChevronLeft size={16} />
          <span>Danh sách Team & Chuyên gia</span>
        </button>

        <section className="card prof__head grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-6 mb-6">
          <div className="relative flex-none">
            <div
              className="av av--xl font-bold shadow-sm text-xl"
              style={{ background: hue.bg, color: hue.text }}
            >
              {member.initials}
            </div>
            {member.status === "in" && (
              <span className="av__dot w-3.5 h-3.5" title="Đang có mặt tại phòng Lab" />
            )}
          </div>

          <div className="prof__who min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {member.name}
              </h1>
              {member.isLead && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono text-xs font-bold shrink-0">
                  <Crown size={12} className="fill-amber-500 text-amber-500" />
                  <span>Nhóm trưởng</span>
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-1">
              {member.role} · Mã: {member.code}
            </p>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              <a
                href={`mailto:${member.email}`}
                className="linkbtn inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <Mail size={13} />
                <span>{member.email}</span>
              </a>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <GitCommit size={13} />
                <span>{member.commitsCount} commits thực tế</span>
              </span>
            </div>
          </div>

          <div className="prof__stats flex flex-wrap items-center gap-6 sm:gap-8 border-t md:border-t-0 md:border-l border-[#14161a14] dark:border-[#ffffff12] pt-4 md:pt-0 md:pl-8">
            <div>
              <small className="text-xs text-slate-500 font-semibold block">Đề tài tham gia</small>
              <b className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {member.projects.length} đồ án
              </b>
            </div>

            <div>
              <small className="text-xs text-slate-500 font-semibold block">Công việc đang mở</small>
              <b className="text-2xl font-bold text-[#f29b23]">
                {member.openTasks.length} task
              </b>
            </div>

            <div>
              <small className="text-xs text-slate-500 font-semibold block">Đã hoàn thành</small>
              <b className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {member.doneTasksCount} task
              </b>
            </div>
          </div>

          <div className="prof__actions col-span-full flex items-center justify-end gap-3 pt-3 border-t border-[#14161a14] dark:border-[#ffffff12]">
            <button
              type="button"
              onClick={() => void handleCycleStatus()}
              className="btn flex items-center gap-2 cursor-pointer"
              title="Nhấp để đổi trạng thái làm việc (Tại Lab / Làm từ xa / Nghỉ phép)"
            >
              <RefreshCw size={14} className="text-[#f29b23]" />
              <span className={`pill pill--${MARLO_MEMBER_STATUS_TONE[member.status]} text-xs`}>
                {MARLO_MEMBER_STATUS_LABEL[member.status]}
              </span>
            </button>

            {!member.isAdvisor && role !== "admin" && (
              <button
                type="button"
                className="btn btn--primary flex items-center gap-2 cursor-pointer"
                onClick={() => setIsAssignModalOpen(true)}
                title="Giao công việc mới cho thành viên này"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Giao việc kỹ thuật</span>
              </button>
            )}
          </div>
        </section>

        <div className="prof__grid grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
          <section className="card">
            <div className="chead flex items-center justify-between mb-4">
              <div className="chead__text">
                <h2 className="text-lg font-bold">Công việc đang phụ trách</h2>
                <p className="text-xs text-slate-500">
                  {member.openTasks.length} task đang mở ({member.totalEstimateHours}h ước tính)
                </p>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {member.openTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Không có công việc nào đang chờ xử lý.
                </div>
              ) : (
                member.openTasks.map((t) => {
                  const statusLbl = (MARLO_TASK_STATUS as any)[t.column] || t.column;
                  return (
                    <div
                      key={t.id}
                      onClick={() => onNavigateToProject(t.projectId)}
                      data-lift={true}
                      className="prow py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition cursor-pointer"
                    >
                      <div className="cell__text min-w-0 flex-1">
                        <b className="text-sm font-semibold text-slate-900 dark:text-slate-100 block truncate">
                          {t.code ? `${t.code}: ` : ""}{t.title}
                        </b>
                        <small className="text-xs text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                          {t.projectName} · Ưu tiên: {t.priority === "high" ? "Cao" : t.priority === "low" ? "Thấp" : "Trung bình"}
                        </small>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        <span
                          className={`pill ${
                            t.column === "review"
                              ? "pill--info"
                              : t.column === "in-progress"
                              ? "pill--warn"
                              : "pill--plain"
                          } text-[11px]`}
                        >
                          {statusLbl}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <div className="flex flex-col gap-6">
            <section className="card">
              <div className="chead mb-3">
                <div className="chead__text">
                  <h2 className="text-lg font-bold">Đồ án đang tham gia</h2>
                  <p className="text-xs text-slate-500">
                    {member.projects.length} đề tài {member.name} đang trực tiếp nghiên cứu
                  </p>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {member.projects.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 italic">
                    Chưa được gán vào đồ án nào.
                  </div>
                ) : (
                  member.projects.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => onNavigateToProject(job.id)}
                      data-lift={true}
                      className="prow py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition cursor-pointer"
                      title={`Mở chi tiết đồ án ${job.name}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f29b23] flex-none" />
                        <b className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {job.code} · {job.name}
                        </b>
                      </div>

                      <div className="flex items-center gap-1.5 flex-none text-xs text-slate-500 font-semibold">
                        <span>{(MARLO_PROJECT_STATUS as any)[job.status] || job.status}</span>
                        <ExternalLink size={12} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1b1c1e] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Giao Task Cho {member.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 cursor-pointer"
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
                  Đề án trực thuộc
                </label>
                <select
                  value={assignProjectId}
                  onChange={(e) => setAssignProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none"
                >
                  {member.projects.length > 0 ? (
                    member.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))
                  ) : (
                    <option value="prj-codemind">PRJ-CODEMIND — CodeMind AI</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Ước tính SP (Story Points)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="34"
                    value={assignEst}
                    onChange={(e) => setAssignEst(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Độ ưu tiên
                  </label>
                  <select
                    value={assignPriority}
                    onChange={(e) => setAssignPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="high">Cao (P1 - Block)</option>
                    <option value="medium">Trung bình (P2)</option>
                    <option value="low">Thấp (P3 - Nice to have)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn--primary text-xs font-bold px-4 py-2 cursor-pointer"
                >
                  Xác nhận giao việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
