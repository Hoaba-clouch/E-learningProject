import React, { useState, useRef, useEffect } from "react";
import { Search, Check, Folder, Users } from "lucide-react";
import gsap from "gsap";
import {
  MARLO_MEMBERS,
  MARLO_PROJECTS,
  MARLO_TASKS,
  MARLO_SKILLS,
  MARLO_MEMBER_STATUS_LABEL,
  MARLO_MEMBER_STATUS_TONE,
  MARLO_HUES,
  getMemberLoadStats,
  MarloMember,
} from "../marlo-engine/marloData";
import "../marlo-engine/marloStyles.css";

interface Props {
  onSelectPerson: (personId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
}

export default function MarloTeamScreen({ onSelectPerson, onNavigateToProject }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"people" | "workload">("people");

  // In the studio count
  const inStudioCount = MARLO_MEMBERS.filter((m) => m.status === "in").length;

  // Filter members by search
  const filteredMembers = MARLO_MEMBERS.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const skillName = MARLO_SKILLS[m.skill]?.name || "";
    return (
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      skillName.toLowerCase().includes(q)
    );
  });

  // ─── AUTHENTIC MARLO GSAP ENTRANCE ANIMATION ───
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      // 1. Header & Controls
      gsap.fromTo(
        ".phead, .toolbar",
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: 0.06 }
      );

      // 2. Member Cards (Wave / Staggered Entrance)
      gsap.fromTo(
        ".people .person",
        { opacity: 0, y: 24, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: "back.out(1.2)",
          stagger: 0.045,
          delay: 0.1,
          clearProps: "transform,opacity",
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [activeTab, searchQuery]);

  return (
    <div
      ref={containerRef}
      className="marlo-scope min-h-screen bg-transparent text-[#161718] dark:text-[#f0f0f1] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200"
    >
      <div className="max-w-[1560px] mx-auto tm">
        {/* Page Title & Subtitle */}
        <div className="phead mb-4">
          <div className="phead__text">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Team
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              {MARLO_MEMBERS.length} people · {inStudioCount} in the studio today.
            </p>
          </div>
        </div>

        {/* Tab switch: People vs Workload */}
        <div className="flex items-center gap-2 mb-6 border-b border-[#14161a14] dark:border-[#ffffff12] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("people")}
            className={`px-4 py-2 text-sm font-bold transition-all relative ${
              activeTab === "people"
                ? "text-slate-950 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            People
            {activeTab === "people" && (
              <span className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-[#f29b23] rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("workload")}
            className={`px-4 py-2 text-sm font-bold transition-all relative ${
              activeTab === "workload"
                ? "text-slate-950 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Workload
            {activeTab === "workload" && (
              <span className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-[#f29b23] rounded-full" />
            )}
          </button>
        </div>

        {/* Toolbar: Search input */}
        <div className="toolbar mb-6">
          <div className="inwrap relative w-full max-w-[340px]">
            <Search size={16} className="ico" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find someone"
              className="input pl-9"
            />
          </div>
        </div>

        {/* Grid People (Matching Image 2) */}
        {filteredMembers.length === 0 ? (
          <section className="card text-center py-12">
            <Users size={32} className="mx-auto text-slate-400 mb-2" />
            <b className="text-base font-semibold block text-slate-700 dark:text-slate-300">
              No one matches “{searchQuery}”
            </b>
            <p className="text-xs text-slate-500 mt-1">Try another name, role, or discipline.</p>
          </section>
        ) : (
          <div className="people grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMembers.map((member) => {
              const stats = getMemberLoadStats(member.id);
              const openTasksCount = MARLO_TASKS.filter(
                (t) => t.who === member.id && t.status !== "done"
              ).length;
              const activeJobsCount = MARLO_PROJECTS.filter(
                (p) => p.team.includes(member.id) && p.status !== "delivered"
              ).length;

              const hue = MARLO_HUES[member.hue] || { bg: "#e6d6c4", text: "#161718" };
              const statusTone = MARLO_MEMBER_STATUS_TONE[member.status];
              const statusLabel = MARLO_MEMBER_STATUS_LABEL[member.status];
              const loadPercent = Math.min(100, (stats.last7Days / member.capacity) * 100);

              return (
                <div
                  key={member.id}
                  onClick={() => onSelectPerson(member.id)}
                  className="card person hover:translate-y-[-2px] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  title={`Bấm để xem chi tiết hồ sơ thành viên ${member.name}`}
                >
                  <div>
                    {/* Top: Avatar & Status Pill */}
                    <div className="person__top flex items-start justify-between mb-3">
                      <div className="relative">
                        <div
                          className="av av--lg font-bold shadow-2xs"
                          style={{ background: hue.bg, color: hue.text }}
                        >
                          {member.initials || member.name.slice(0, 2).toUpperCase()}
                        </div>
                        {member.status === "in" && (
                          <span
                            className="av__dot"
                            title="Đang có mặt tại Studio hôm nay"
                          />
                        )}
                      </div>

                      <span className={`pill pill--${statusTone} text-[11px]`}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Member Name */}
                    <b className="person__name text-base font-bold text-slate-900 dark:text-slate-100 block truncate">
                      {member.name}
                    </b>

                    {/* Member Role & Skill */}
                    <small className="person__role text-xs text-slate-500 dark:text-slate-400 font-medium block truncate mb-3">
                      {member.role} · {MARLO_SKILLS[member.skill]?.name}
                    </small>

                    {/* Last 7 days Load */}
                    <div className="person__load flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                      <span>Last 7 days</span>
                      <b className="text-slate-800 dark:text-slate-200">
                        {stats.last7Days} / {member.capacity} h
                      </b>
                    </div>

                    <div className="w-full bg-[#e1e2e5] dark:bg-[#2c2d31] h-1.5 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full rounded-full bg-[#f29b23] transition-all duration-500"
                        style={{ width: `${loadPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Foot: Open tasks & Jobs */}
                  <div className="person__foot flex items-center gap-4 pt-3 border-t border-[#14161a14] dark:border-[#ffffff12] text-xs text-slate-500 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Check size={13} strokeWidth={2.5} />
                      {openTasksCount} open
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Folder size={13} strokeWidth={2} />
                      {activeJobsCount} jobs
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
