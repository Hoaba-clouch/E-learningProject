import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Search, Check, Folder, Users, Crown, GitCommit } from "lucide-react";
import gsap from "gsap";
import {
  animateMarloCards,
  animateMarloPill,
  useMarloPageEntrance,
} from "../utils/marloAnimations";
import MarloTitle from "../components/MarloTitle";
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

type TeamTabKey = "all" | "teammates" | "mentees" | "advisors" | "leads" | "students";

export default function MarloTeamScreen({ role = "student", onSelectPerson }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tabsNavRef = useRef<HTMLDivElement>(null);
  const tabLineRef = useRef<HTMLSpanElement>(null);
  const isFirstTabRender = useRef(true);
  const hasAnimatedLoadRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TeamTabKey>("all");
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inLabCount, setInLabCount] = useState(0);
  const [scopedProjectsCount, setScopedProjectsCount] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Reset active tab when role changes
  useEffect(() => {
    setActiveTab("all");
    isFirstTabRender.current = true;
    hasAnimatedLoadRef.current = false;
  }, [role]);

  // Background sync from MySQL (accepts empty array when student has 0 projects)
  useEffect(() => {
    let active = true;
    setLoading(true);
    const loadTeam = () => {
      fetchTeamMembersApi(role)
        .then((bundle) => {
          if (!active) return;
          if (bundle && Array.isArray(bundle.members)) {
            setMembers(bundle.members);
            setInLabCount(
              typeof bundle.inLabCount === "number"
                ? bundle.inLabCount
                : bundle.members.filter((m) => m.status === "in").length
            );
            setScopedProjectsCount(
              typeof bundle.scopedProjectsCount === "number" ? bundle.scopedProjectsCount : null
            );
          } else if (bundle === null) {
            const fallback = DEFAULT_TEAM_MEMBER_RECORDS.filter((m) => m.id !== "usr-sv-06");
            setMembers(fallback);
            setInLabCount(fallback.filter((m) => m.status === "in").length);
            setScopedProjectsCount(null);
          }
        })
        .catch(() => {
          if (!active) return;
          const fallback = DEFAULT_TEAM_MEMBER_RECORDS.filter((m) => m.id !== "usr-sv-06");
          setMembers(fallback);
          setInLabCount(fallback.filter((m) => m.status === "in").length);
          setScopedProjectsCount(null);
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

  const tabConfigs: Array<{
    key: TeamTabKey;
    label: string;
    count: number;
    match: (m: TeamMemberRecord) => boolean;
  }> =
    role === "student"
      ? [
          { key: "all", label: "Tất cả", count: members.length, match: () => true },
          {
            key: "teammates",
            label: "Thành viên nhóm",
            count: members.filter((m) => !m.isAdvisor).length,
            match: (m) => !m.isAdvisor,
          },
          {
            key: "leads",
            label: "Nhóm trưởng",
            count: members.filter((m) => m.isLead && !m.isAdvisor).length,
            match: (m) => m.isLead && !m.isAdvisor,
          },
          {
            key: "advisors",
            label: "GVHD",
            count: members.filter((m) => m.isAdvisor).length,
            match: (m) => m.isAdvisor,
          },
        ]
      : role === "instructor"
      ? [
          { key: "all", label: "Tất cả", count: members.length, match: () => true },
          {
            key: "mentees",
            label: "Sinh viên hướng dẫn",
            count: members.filter((m) => !m.isAdvisor).length,
            match: (m) => !m.isAdvisor,
          },
          {
            key: "leads",
            label: "Nhóm trưởng",
            count: members.filter((m) => m.isLead && !m.isAdvisor).length,
            match: (m) => m.isLead && !m.isAdvisor,
          },
          {
            key: "advisors",
            label: "Giảng viên / Hội đồng",
            count: members.filter((m) => m.isAdvisor).length,
            match: (m) => m.isAdvisor,
          },
        ]
      : [
          { key: "all", label: "Tất cả", count: members.length, match: () => true },
          {
            key: "advisors",
            label: "Giảng viên",
            count: members.filter((m) => m.isAdvisor).length,
            match: (m) => m.isAdvisor,
          },
          {
            key: "leads",
            label: "Nhóm trưởng",
            count: members.filter((m) => m.isLead && !m.isAdvisor).length,
            match: (m) => m.isLead && !m.isAdvisor,
          },
          {
            key: "students",
            label: "Học viên",
            count: members.filter((m) => !m.isAdvisor).length,
            match: (m) => !m.isAdvisor,
          },
        ];

  const activeTabDef = tabConfigs.find((t) => t.key === activeTab) || tabConfigs[0];

  const filteredMembers = members.filter((m) => {
    if (!activeTabDef.match(m)) return false;
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
  }, [activeTab, role, members.length, loading]);

  // ─── TAB SWITCH WITH AUTHENTIC MARLO EXIT & ENTER CASCADE ───
  const handleTabChange = (nextTab: TeamTabKey) => {
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

  // ─── AUTHENTIC MARLO STAGE ENTRANCE (ZERO DOUBLE-OPACITY FADE) ───
  useMarloPageEntrance(
    containerRef,
    (el) => {
      const headAndControls = el.querySelectorAll(".phead, .tabs, .toolbar");
      if (headAndControls.length > 0) {
        animateMarloCards(headAndControls, { y: 18, stagger: 0.045, duration: 0.65 });
      }
    },
    [role]
  );

  // Animate member cards cleanly on initial async load & tab switch (marlo-app team.jsx parity)
  const prevTabRef = useRef(activeTab);
  useMarloPageEntrance(
    stageRef,
    (stage) => {
      if (loading) return;
      const cards = stage.querySelectorAll(".people .person, .card");
      if (!hasAnimatedLoadRef.current && cards.length > 0) {
        hasAnimatedLoadRef.current = true;
        animateMarloCards(cards, { y: 24, stagger: 0.05, duration: 0.72 });
        prevTabRef.current = activeTab;
        return;
      }

      if (prevTabRef.current !== activeTab) {
        if (cards.length > 0) {
          animateMarloCards(cards, { y: 18, stagger: 0.04, duration: 0.56 });
        }
        prevTabRef.current = activeTab;
      }
    },
    [activeTab, loading, members.length]
  );

  const studentCount = members.filter((m) => !m.isAdvisor).length;
  const advisorCount = members.filter((m) => m.isAdvisor).length;
  const headerTitle =
    role === "student"
      ? "Nhóm Đồ Án & GV Hướng Dẫn"
      : role === "instructor"
      ? "Sinh Viên Hướng Dẫn & Hội Đồng"
      : "Đội Ngũ Giảng Viên & Học Viên (Team)";
  const headerSubtitle = loading
    ? "Đang đồng bộ danh sách đội ngũ từ cơ sở dữ liệu..."
    : role === "student"
    ? `${studentCount} thành viên nhóm · ${advisorCount} GVHD · ${inLabCount} đang có mặt tại Lab.`
    : role === "instructor"
    ? `${studentCount} sinh viên hướng dẫn · ${advisorCount} giảng viên / hội đồng · ${inLabCount} đang có mặt tại Lab.`
    : `${advisorCount} giảng viên · ${studentCount} học viên đang hoạt động · ${inLabCount} đang có mặt tại Lab.`;

  return (
    <div
      ref={containerRef}
      className="marlo-scope min-h-screen bg-transparent text-[#161718] dark:text-[#f0f0f1] p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200"
    >
      <div className="max-w-[1560px] mx-auto tm">
        <div className="phead mb-4">
          <div className="phead__text">
            <MarloTitle
              text={headerTitle}
              staggerMs={12}
              className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
            />
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              {headerSubtitle}
            </p>
          </div>
        </div>

        {/* Navigation Tabs with Marlo Sliding Underline */}
        <nav
          ref={tabsNavRef}
          className="tabs relative flex items-center gap-1 flex-wrap border-b border-[#14161a14] dark:border-[#ffffff12] mb-6 select-none"
        >
          {tabConfigs.map((tab) => {
            const isCurrent = activeTabDef.key === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-current={isCurrent ? "page" : undefined}
                onClick={() => handleTabChange(tab.key)}
                className={`tab px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                  isCurrent
                    ? "text-slate-900 dark:text-slate-100 font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
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
          {loading && members.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="card h-44 animate-pulse bg-slate-100/80 dark:bg-slate-800/40"
                />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <section className="card text-center py-12">
              <Users size={32} className="mx-auto text-slate-400 mb-2" />
              <b className="text-base font-semibold block text-slate-700 dark:text-slate-300">
                {searchQuery.trim()
                  ? `Không tìm thấy thành viên nào khớp với “${searchQuery}”`
                  : members.length === 0
                  ? role === "student"
                    ? "Bạn chưa tham gia đồ án nào"
                    : role === "instructor"
                    ? "Chưa có dữ liệu nhóm hướng dẫn"
                    : "Chưa có dữ liệu thành viên đang hoạt động"
                  : `Không có thành viên nào trong mục “${activeTabDef.label}”`}
              </b>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery.trim()
                  ? "Vui lòng thử tìm với từ khóa hoặc chuyên môn khác."
                  : members.length === 0 && role === "student"
                  ? scopedProjectsCount === 0
                    ? "Hãy tạo mới hoặc nhận lời mời tham gia một đồ án để xem thành viên cùng nhóm và Giảng viên hướng dẫn."
                    : "Chưa có thành viên nào được gán vào đồ án của bạn."
                  : "Thử chuyển sang tab khác hoặc bỏ lọc tìm kiếm."}
              </p>
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
                    className="card person transition-[border-color,box-shadow] duration-200 cursor-pointer flex flex-col justify-between"
                    title={`Bấm để xem chi tiết hồ sơ ${member.name}`}
                  >
                    <div>
                      <div className="person__top flex items-start justify-between mb-3">
                        <div className="relative">
                          <div
                            className="av av--lg font-bold shadow-2xs text-sm overflow-hidden"
                            style={member.avatarUrl ? undefined : { background: hue.bg, color: hue.text }}
                          >
                            {member.avatarUrl ? (
                              <img
                                src={member.avatarUrl}
                                alt={member.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              member.initials
                            )}
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
                        {member.isLead && !member.isAdvisor && (
                          <span
                            className="px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-[10px] font-bold font-mono flex items-center gap-0.5 shrink-0"
                            title="Nhóm trưởng đề tài kỹ thuật (Team Lead)"
                          >
                            <Crown size={9} className="fill-amber-500 text-amber-500" />
                            Lead
                          </span>
                        )}
                        {member.isAdvisor && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-[10px] font-bold font-mono shrink-0"
                            title="Giảng viên hướng dẫn / Thành viên Hội đồng"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            <span>GVHD</span>
                          </span>
                        )}
                      </div>

                      <small className="person__role text-xs text-slate-500 dark:text-slate-400 font-medium block truncate mb-3">
                        {member.role} · {member.code}
                      </small>

                      {member.isAdvisor ? (
                        <div className="person__load flex items-center justify-between text-xs text-slate-500 font-semibold mb-3">
                          <span>Đồ án hướng dẫn</span>
                          <b className="text-slate-800 dark:text-slate-200">
                            {member.projects.length} đề tài
                          </b>
                        </div>
                      ) : (
                        <div className="person__load flex items-center justify-between text-xs text-slate-500 font-semibold mb-3">
                          <span>Nhiệm vụ đảm nhiệm</span>
                          <b className="text-slate-800 dark:text-slate-200">
                            {member.openTasks.length} task mở
                          </b>
                        </div>
                      )}
                    </div>

                    <div className="person__foot flex items-center gap-3.5 pt-3 border-t border-[#14161a14] dark:border-[#ffffff12] text-xs text-slate-500 font-semibold flex-wrap">
                      {member.isAdvisor ? (
                        <>
                          <span className="flex items-center gap-1">
                            <Folder size={13} strokeWidth={2} />
                            {member.projects.length} đồ án
                          </span>
                          <span className="ml-auto text-[11px] text-slate-400 truncate">
                            {member.lastActive}
                          </span>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
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
