import React, { useState } from "react";
import { ChevronLeft, Plus, RefreshCw, Mail, Check, Calendar, ExternalLink } from "lucide-react";
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

  return (
    <div className="marlo-scope min-h-screen bg-[#e6e7ea] dark:bg-[#111213] text-[#161718] dark:text-[#f0f0f1] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
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
                {stats.eightWeeks} h
              </b>
            </div>
            <div>
              <small className="text-xs text-slate-500 font-semibold block">Open work</small>
              <b className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {stats.openWork} h
              </b>
            </div>
          </div>

          {/* Action Row */}
          <div className="prof__actions col-span-full flex items-center justify-end gap-3 pt-3 border-t border-[#14161a14] dark:border-[#ffffff12]">
            <button
              type="button"
              onClick={handleCycleStatus}
              className="btn flex items-center gap-2"
              title="Đổi trạng thái làm việc"
            >
              <RefreshCw size={14} />
              <span>{MARLO_MEMBER_STATUS_LABEL[memberStatus]}</span>
            </button>
            <button
              type="button"
              className="btn btn--primary flex items-center gap-2"
              onClick={() => alert(`Giao việc mới cho ${member.name}`)}
            >
              <Plus size={16} />
              <span>Assign a task</span>
            </button>
          </div>
        </section>

        {/* Main Grid: Left Open Tasks vs Right Stack (Hours by week + Jobs) */}
        <div className="prof__grid grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
          {/* Left: Open Tasks */}
          <section className="card">
            <div className="chead mb-4">
              <div className="chead__text">
                <h2 className="text-lg font-bold">Open tasks</h2>
                <p className="text-xs text-slate-500">{openTasks.length} on their list</p>
              </div>
            </div>

            {openTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Check size={28} className="mx-auto mb-2 text-emerald-500" />
                <b className="block text-sm">All clear</b>
                <p className="text-xs">Nothing open for them right now.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[#14161a14] dark:divide-[#ffffff12]">
                {openTasks.map((task) => {
                  const prj = getMarloProject(task.projectId);
                  const statusTone =
                    task.status === "doing"
                      ? "accent"
                      : task.status === "review"
                      ? "info"
                      : "plain";
                  return (
                    <div
                      key={task.id}
                      className="prow py-3 flex items-center justify-between gap-4 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 rounded-xl px-2 transition"
                    >
                      <div className="cell__text min-w-0 flex-1">
                        <b className="text-sm font-semibold text-slate-900 dark:text-slate-100 block truncate">
                          {task.title}
                        </b>
                        <small className="text-xs text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                          {prj?.name || task.projectId} · due{" "}
                          {new Date(task.due).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </small>
                      </div>

                      <span className={`pill pill--${statusTone} text-xs flex-none`}>
                        {MARLO_TASK_STATUS[task.status] || task.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Right Stack: Hours by week & Jobs (1 person -> multiple projects) */}
          <div className="stack flex flex-col gap-6">
            {/* Hours by week chart */}
            <section className="card">
              <div className="chead mb-3">
                <div className="chead__text">
                  <h2 className="text-lg font-bold">Hours by week</h2>
                  <p className="text-xs text-slate-500">
                    Against {member.capacity} h a week
                  </p>
                </div>
              </div>

              <div className="bars h-[180px]">
                <div className="bars__cols h-[140px] flex items-end gap-2 pb-6 border-b border-slate-200 dark:border-slate-800">
                  {stats.labels.map((lbl, idx) => {
                    const val = stats.values[idx] || 0;
                    const heightPercent = (val / maxWeeklyHours) * 100;
                    const isLast = idx === stats.labels.length - 1;

                    return (
                      <div
                        key={lbl}
                        className={`bars__col flex-1 flex flex-col items-center justify-end h-full relative group ${
                          isLast ? "is-hi" : ""
                        }`}
                      >
                        <div className="bars__track w-full flex items-end justify-center h-full relative">
                          <div
                            className={`bars__bar w-full max-w-[28px] rounded-t-sm transition-all duration-500 ${
                              isLast
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
                            isLast ? "text-[#f29b23] font-bold" : "text-slate-400"
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

            {/* Jobs List (1 person has multiple projects) */}
            <section className="card">
              <div className="chead mb-3">
                <div className="chead__text">
                  <h2 className="text-lg font-bold">Jobs</h2>
                  <p className="text-xs text-slate-500">
                    {jobs.length} dự án {member.name} đang trực tiếp tham gia
                  </p>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-[#14161a14] dark:divide-[#ffffff12]">
                {jobs.map((p) => {
                  // Mock hours spent on this project
                  const prjHours = p.id === "kestrel" ? 24 : p.id === "harbour" ? 48 : 16;
                  return (
                    <div
                      key={p.id}
                      onClick={() => onNavigateToProject(p.id)}
                      className="prow py-3 flex items-center justify-between gap-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 rounded-xl px-2 transition cursor-pointer"
                      title={`Xem chi tiết đồ án ${p.name}`}
                    >
                      <span className={`projtag c--${p.c} flex items-center gap-2 font-semibold text-sm truncate`}>
                        <i />
                        <span className="truncate">{p.name}</span>
                      </span>

                      <div className="flex items-center gap-2 flex-none">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {prjHours} h
                        </span>
                        <ExternalLink size={13} className="text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
