import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Search, Check, Folder, Users, Crown, GitCommit } from "lucide-react";
import gsap from "gsap";
import {
  animateMarloCards,
  animateMarloPill,
  initMarloMagnetic,
} from "../utils/marloAnimations";
import {
  MARLO_MEMBER_STATUS_LABEL,
  MARLO_MEMBER_STATUS_TONE,
  MARLO_HUES,
} from "../marlo-engine/marloData";
import { fetchTeamMembersApi, type TeamMemberRecord } from "../api";
import { DEFAULT_TEAM_MEMBER_RECORDS } from "../data/defaultTeamMembers";
import "../marlo-engine/marloStyles.css";

interface Props {
  role?: "student" | "instructor" | "admin";
  onSelectPerson: (personId: string) => void;
  onNavigateToProject?: (projectId: string) => void;
}

export default function MarloTeamScreen({ role = "student", onSelectPerson }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tabsNavRef = useRef<HTMLDivElement>(null);
  const tabLineRef = useRef<HTMLSpanElement>(null);
  const isFirstTabRender = useRef(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"people" | "leads">("people");
  const [members, setMembers] = useState<TeamMemberRecord[]>(DEFAULT_TEAM_MEMBER_RECORDS);
  const [inLabCount, setInLabCount] = useState(() =>
    DEFAULT_TEAM_MEMBER_RECORDS.filter((m) => m.status === "in").length
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Background sync from MySQL (non-blocking, keeps UI responsive and smooth)
  useEffect(() => {
    let active = true;
    const loadTeam = () => {
      fetchTeamMembersApi(role)
        .then((bundle) => {
          if (!active || !bundle) return;
          if (bundle.members && bundle.members.length > 0) {
            setMembers(bundle.members);
          }
          if (typeof bundle.inLabCount === "number") {
            setInLabCount(bundle.inLabCount);
          }
        })
        .catch(() => {});
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

  // ─── TAB SWITCH WITH AUTHENTIC MARLO EXIT & ENTER CASCADE ───
  const handleTabChange = (nextTab: "people" | "leads") => {
    if (nextTab === activeTab || isTransitioning) return;
    setIsTransitioning(true);

    const stage = stageRef.current;
    if (!stage) {
      setActiveTab(nextTab);
      setIsTransitioning(false);
      return;
    }

    const cards = stage.querySelectorAll(".person");
    if (cards.length === 0) {
      setActiveTab(nextTab);
      setIsTransitioning(false);
      return;
    }

    // Exit animation: gentle drop & fade
    gsap.to(cards, {
      opacity: 0,
      y: 8,
      duration: 0.18,
      stagger: 0.015,
      ease: "power2.in",
      onComplete: () => {
        setActiveTab(nextTab);
        setIsTransitioning(false);
      },
    });
  };

  // ─── AUTHENTIC MARLO STAGE ENTRANCE (SILKY SMOOTH EXPO.OUT) ───
  useLayoutEffect(() => {
    const stage = containerRef.current;
    if (!stage) return;

    const ctx = gsap.context(() => {
      // 1. Stage container slides in smoothly with expo.out (identical to MarloProjectsScreen)
      gsap.fromTo(
        stage,
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
      const personCards = stage.querySelectorAll(".people .person");
      if (personCards.length > 0) {
        animateMarloCards(personCards, { y: 22, stagger: 0.035, duration: 0.75 });
      }

      initMarloMagnetic(stage);
    }, stage);

    return () => ctx.revert();
  }, []);

  // ─── FILTER / SEARCH & TAB CHANGE CARD RE-STAGGER ───
  const prevSearchRef = useRef(searchQuery);
  const prevTabRef = useRef(activeTab);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    if (prevSearchRef.current !== searchQuery || prevTabRef.current !== activeTab) {
      const cards = stage.querySelectorAll(".people .person");
      if (cards.length > 0) {
        animateMarloCards(cards, { y: 16, stagger: 0.03, duration: 0.5 });
      }
      prevSearchRef.current = searchQuery;
      prevTabRef.current = activeTab;
    }
  }, [searchQuery, activeTab]);

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

        {/* Navigation Tabs with Marlo Sliding Underline (Identical to MarloProjectsScreen) */}
        <nav
          ref={tabsNavRef}
          className="tabs relative flex items-center gap-1 border-b border-[#14161a14] dark:border-[#ffffff12] mb-6 select-none"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "people"}
            aria-current={activeTab === "people" ? "page" : undefined}
            onClick={() => handleTabChange("people")}
            className={`tab px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
              activeTab === "people"
                ? "text-slate-900 dark:text-slate-100 font-bold"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Tất cả thành viên ({members.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "leads"}
            aria-current={activeTab === "leads" ? "page" : undefined}
            onClick={() => handleTabChange("leads")}
            className={`tab px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
              activeTab === "leads"
                ? "text-slate-900 dark:text-slate-100 font-bold"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Nhóm trưởng đồ án ({members.filter((m) => m.isLead).length})
          </button>
          <span
            ref={tabLineRef}
            className="tabs__line absolute bottom-0 h-[2.5px] bg-[#f29b23] transition-opacity duration-150 pointer-events-none rounded-full"
            style={{ opacity: 0 }}
          />
        </nav>

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

        {/* Grid People Container */}
        <div ref={stageRef}>
          {filteredMembers.length === 0 ? (
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
                    data-lift={true}
                    className="card person transition-all cursor-pointer flex flex-col justify-between"
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
    </div>
  );
}
