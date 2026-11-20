import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Search, Check, Folder, Users, Crown, GitCommit } from "lucide-react";
import gsap from "gsap";
import { animateMarloCards } from "../utils/marloAnimations";
import {
  MARLO_MEMBER_STATUS_LABEL,
  MARLO_MEMBER_STATUS_TONE,
  MARLO_HUES,
} from "../marlo-engine/marloData";
import { fetchTeamMembersApi, type TeamMemberRecord } from "../api";
import "../marlo-engine/marloStyles.css";

interface Props {
  role?: "student" | "instructor" | "admin";
  onSelectPerson: (personId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
}

export default function MarloTeamScreen({ role = "student", onSelectPerson }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"people" | "leads">("people");
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [inLabCount, setInLabCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadTeam = () => {
      setLoading(true);
      fetchTeamMembersApi(role)
        .then((bundle) => {
          if (!active || !bundle) return;
          setMembers(bundle.members || []);
          setInLabCount(bundle.inLabCount || 0);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    loadTeam();
    window.addEventListener("codemind-marlo-data-changed", loadTeam);
    return () => {
      active = false;
      window.removeEventListener("codemind-marlo-data-changed", loadTeam);
    };
  }, [role]);

  const filteredMembers = members.filter((m) => {
    if (activeTab === "leads" && !m.isLead) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  // ─── AUTHENTIC MARLO STAGE ENTRANCE (SILKY SMOOTH EXPO.OUT) ───
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || loading) return;

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

      // 2. Stagger member cards with Marlo authentic card physics
      const personCards = el.querySelectorAll(".people .person");
      if (personCards.length > 0) {
        animateMarloCards(personCards, { y: 22, stagger: 0.035, duration: 0.75 });
      }
    }, el);

    return () => ctx.revert();
  }, [activeTab, members.length, loading]);

  return (
    <div
      ref={containerRef}
      className="marlo-scope min-h-screen bg-transparent text-[#161718] dark:text-[#f0f0f1] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200"
    >
      <div className="max-w-[1560px] mx-auto tm">
        <div className="phead mb-4">
          <div className="phead__text">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Đội Ngũ Kỹ Thuật & Cố Vấn (Team)
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              {members.length} chuyên gia & học viên · {inLabCount} người đang có mặt tại phòng Lab.
            </p>
          </div>
        </div>

        {/* Tab switch: All Members vs Leads */}
        <div className="flex items-center gap-2 mb-6 border-b border-[#14161a14] dark:border-[#ffffff12] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("people")}
            className={`px-4 py-2 text-sm font-bold transition-all relative cursor-pointer ${
              activeTab === "people"
                ? "text-slate-950 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Tất cả thành viên ({members.length})
            {activeTab === "people" && (
              <span className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-[#f29b23] rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("leads")}
            className={`px-4 py-2 text-sm font-bold transition-all relative cursor-pointer ${
              activeTab === "leads"
                ? "text-slate-950 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Nhóm trưởng đồ án ({members.filter((m) => m.isLead).length})
            {activeTab === "leads" && (
              <span className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-[#f29b23] rounded-full" />
            )}
          </button>
        </div>

        {/* Toolbar: Search input */}
        <div className="toolbar mb-6">
          <div className="inwrap relative w-full max-w-[360px]">
            <Search size={16} className="ico" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, MSSV, email hoặc vai trò..."
              className="input pl-9"
            />
          </div>
        </div>

        {/* Grid People */}
        {loading && members.length === 0 ? (
          <section className="card text-center py-12 text-xs text-slate-500">
            Đang đồng bộ danh sách thành viên từ MySQL...
          </section>
        ) : filteredMembers.length === 0 ? (
          <section className="card text-center py-12">
            <Users size={32} className="mx-auto text-slate-400 mb-2" />
            <b className="text-base font-semibold block text-slate-700 dark:text-slate-300">
              Không tìm thấy thành viên nào khớp với “{searchQuery}”
            </b>
            <p className="text-xs text-slate-500 mt-1">Vui lòng thử tìm với từ khóa hoặc chuyên môn khác.</p>
          </section>
        ) : (
          <div className="people grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
            {filteredMembers.map((member) => {
              const hue = MARLO_HUES[member.hue] || { bg: "#e6d6c4", text: "#161718" };
              const statusTone = MARLO_MEMBER_STATUS_TONE[member.status];
              const statusLabel = MARLO_MEMBER_STATUS_LABEL[member.status];

              return (
                <div
                  key={member.id}
                  onClick={() => onSelectPerson(member.id)}
                  className="card person hover:translate-y-[-2px] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  title={`Bấm để xem chi tiết hồ sơ ${member.name}`}
                >
                  <div>
                    <div className="person__top flex items-start justify-between mb-3">
                      <div className="relative">
                        <div
                          className="av av--lg font-bold shadow-2xs text-sm"
                          style={{ background: hue.bg, color: hue.text }}
                        >
                          {member.initials}
                        </div>
                        {member.status === "in" && (
                          <span className="av__dot" title="Đang có mặt tại phòng Lab" />
                        )}
                      </div>

                      <span className={`pill pill--${statusTone} text-[11px]`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-0.5">
                      <b className="person__name text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {member.name}
                      </b>
                      {member.isLead && (
                        <span
                          className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold font-mono flex items-center gap-0.5 shrink-0"
                          title="Nhóm trưởng đề tài kỹ thuật (Team Lead)"
                        >
                          <Crown size={9} className="fill-amber-500 text-amber-500" />
                          Lead
                        </span>
                      )}
                    </div>

                    <small className="person__role text-xs text-slate-500 dark:text-slate-400 font-medium block truncate mb-3">
                      {member.role} · {member.code}
                    </small>

                    <div className="person__load flex items-center justify-between text-xs text-slate-500 font-semibold mb-3">
                      <span>Nhiệm vụ đảm nhiệm</span>
                      <b className="text-slate-800 dark:text-slate-200">
                        {member.openTasks.length} task mở
                      </b>
                    </div>
                  </div>

                  <div className="person__foot flex items-center gap-3.5 pt-3 border-t border-[#14161a14] dark:border-[#ffffff12] text-xs text-slate-500 font-semibold flex-wrap">
                    <span className="flex items-center gap-1">
                      <Check size={13} strokeWidth={2.5} />
                      {member.doneTasksCount} xong
                    </span>
                    <span className="flex items-center gap-1">
                      <Folder size={13} strokeWidth={2} />
                      {member.projects.length} đề tài
                    </span>
                    <span className="flex items-center gap-1">
                      <GitCommit size={13} strokeWidth={2} />
                      {member.commitsCount}
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
