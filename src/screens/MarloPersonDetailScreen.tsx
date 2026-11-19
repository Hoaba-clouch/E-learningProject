import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, Plus, RefreshCw, Mail, Check, Calendar, ExternalLink } from "lucide-react";
import gsap from "gsap";
import {
  getMarloMember,
  getMarloProject,
  getMemberOpenTasks,
  getMemberProjects,
  getMemberLoadStats,
  MARLO_MEMBERS,
  MARLO_SKILLS,
  MARLO_MEMBER_STATUS_LABEL,
  MARLO_MEMBER_STATUS_TONE,
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
  personId = "dara",
  onNavigateBack,
  onNavigateToProject,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const member = getMarloMember(personId) || MARLO_MEMBERS[0];
  const [memberStatus, setMemberStatus] = useState(member.status);

  const stats = getMemberLoadStats(member.id);
  const openTasks = getMemberOpenTasks(member.id);
  const jobs = getMemberProjects(member.id); // 1 Person has multiple Projects!

  const hue = MARLO_HUES[member.hue] || { bg: "#f7d593", text: "#633806" };
  const maxWeeklyHours = Math.max(...stats.values, member.capacity, 40);

  // Toggle status cycle
  const handleCycleStatus = () => {
    const statuses: ("in" | "remote" | "off")[] = ["in", "remote", "off"];
    const nextIdx = (statuses.indexOf(memberStatus) + 1) % statuses.length;
    setMemberStatus(statuses[nextIdx]);
  };

  // ─── AUTHENTIC MARLO GSAP ENTRANCE ANIMATION ───
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      // 1. Backlink
      gsap.fromTo(
        ".backlink",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );

      // 2. Member Hero Header Card
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

      // 3. Grid Sections (Left Tasks & Right Charts/Jobs)
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

      // 4. Bar Chart Growing Upwards
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

      // 5. Open Task Rows Stagger
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
  }, [personId]);

  return (
    <div
      ref={containerRef}
      className="marlo-scope min-h-screen bg-transparent text-[#161718] dark:text-[#f0f0f1] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200"
    >
      <div className="max-w-[1560px] mx-auto prof">
        {/* Backlink */}
        <button
          type="button"
          onClick={onNavigateBack}
          className="backlink"
          title="Quay lại danh sách Team"
        >
          <ChevronLeft size={16} />
          <span>The team</span>
        </button>

        {/* Hero Card: Member Profile Head */}
        <section className="card prof__head grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-6 mb-6">
          {/* Avatar XL */}
          <div className="relative flex-none">
            <div
              className="av av--xl font-bold shadow-sm"
              style={{ background: hue.bg, color: hue.text }}
            >
              {member.initials || member.name.slice(0, 2).toUpperCase()}
            </div>
            {memberStatus === "in" && (
              <span className="av__dot w-3.5 h-3.5" title="In the studio today" />
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
            <a
              href={`mailto:${member.email}`}
              className="linkbtn inline-flex items-center gap-1.5 text-xs font-semibold mt-1"
            >
              <Mail size={13} />
              <span>{member.email}</span>
            </a>
          </div>

          {/* 3 Stats: Last 7 days, 8 weeks, Open work */}
          <div className="prof__stats flex flex-wrap items-center gap-6 sm:gap-8 border-t md:border-t-0 md:border-l border-[#14161a14] dark:border-[#ffffff12] pt-4 md:pt-0 md:pl-8">
            <div>
              <small className="text-xs text-slate-500 font-semibold block">Last 7 days</small>
              <b className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.last7Days} h
              </b>
            </div>

            <div>
              <small className="text-xs text-slate-500 font-semibold block">8 weeks</small>
              <b className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.eightWeeksTotal} h
              </b>
            </div>

            <div>
              <small className="text-xs text-slate-500 font-semibold block">Open work</small>
              <b className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {openTasks.length * 2.5} h
              </b>
            </div>
          </div>

          {/* Profile Actions: Status Pill & Assign task */}
          <div className="prof__actions col-span-full flex items-center justify-end gap-3 pt-3 border-t border-[#14161a14] dark:border-[#ffffff12]">
            <button
              type="button"
              onClick={handleCycleStatus}
              className="btn flex items-center gap-2"
              title="Nhấp để đổi trạng thái làm việc (In studio / Remote / On leave)"
            >
              <RefreshCw size={14} className="text-[#f29b23]" />
              <span className={`pill pill--${MARLO_MEMBER_STATUS_TONE[memberStatus]} text-xs`}>
                {MARLO_MEMBER_STATUS_LABEL[memberStatus]}
              </span>
            </button>

            <button
              type="button"
              className="btn btn--primary flex items-center gap-2"
              onClick={() => alert(`Giao task mới cho ${member.name}`)}
            >
              <Plus size={16} />
              <span>Assign a task</span>
            </button>
          </div>
        </section>

        {/* 2-Column Grid: Left Open Tasks vs Right Hours & Jobs */}
        <div className="prof__grid grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
          {/* Left: Open Tasks */}
          <section className="card">
            <div className="chead flex items-center justify-between mb-4">
              <div className="chead__text">
                <h2 className="text-lg font-bold">Open tasks</h2>
                <p className="text-xs text-slate-500">{openTasks.length} on their list</p>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {openTasks.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Không có công việc mở nào đang chờ xử lý.
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
                          {t.title}
                        </b>
                        <small className="text-xs text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                          {p?.name || "Dự án"} · {t.dueText}
                        </small>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        <span
                          className={`pill ${
                            t.status === "in-review"
                              ? "pill--info"
                              : t.status === "in-progress"
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
                  <h2 className="text-lg font-bold">Hours by week</h2>
                  <p className="text-xs text-slate-500">Against {member.capacity} h a week</p>
                </div>
              </div>

              <div className="bars h-[180px]">
                <div className="bars__cols h-[140px] flex items-end gap-2 pb-6 border-b border-slate-200 dark:border-slate-800">
                  {stats.labels.map((lbl, idx) => {
                    const val = stats.values[idx] || 0;
                    const heightPercent = (val / maxWeeklyHours) * 100;
                    const isCurrentWeek = idx === stats.labels.length - 1; // 9 Nov amber

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
                            title={`${lbl}: ${val} h`}
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
                  <h2 className="text-lg font-bold">Jobs</h2>
                  <p className="text-xs text-slate-500">
                    {jobs.length} dự án {member.name} đang trực tiếp thực hiện
                  </p>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onNavigateToProject(job.id)}
                    className="prow py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition cursor-pointer"
                    title={`Mở chi tiết dự án ${job.name}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f29b23] flex-none" />
                      <b className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {job.name}
                      </b>
                    </div>

                    <div className="flex items-center gap-1.5 flex-none text-xs text-slate-500">
                      <span>48 h</span>
                      <ExternalLink size={12} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
