import {
  Award,
  BookOpen,
  Bot,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Compass,
  FolderKanban,
  GitFork,
  GraduationCap,
  History,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Moon,
  ServerCog,
  Shield,
  ShieldCheck,
  Sun,
  UserRound,
  Users,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import React, { useEffect, useLayoutEffect, useRef, useState, startTransition } from "react";
import gsap from "gsap";
import type { AvatarStyle, BadgeFrame, Role, Screen, Theme } from "../App";
import { fetchNavigationCountsApi, type NavigationCounts } from "../api";
import MarloFocusTimer from "./MarloFocusTimer";
import MarloThemeSwitch from "./MarloThemeSwitch";
import { animateMarloPill } from "../utils/marloAnimations";

interface Props {
  screen: Screen;
  role: Role;
  theme: Theme;
  avatarStyle: AvatarStyle;
  badgeFrame: BadgeFrame;
  onToggleTheme: (trigger?: any) => void;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
  onOpenCommandPalette?: () => void;
}

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  badge?: string;
  badgeDot?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  // ── ADMIN MANAGEMENT & SYSTEM (Visible for role="admin", placed top for Overview-first UX) ──
  {
    label: "Management",
    items: [
      { id: "admin", label: "Overview", icon: <LayoutGrid size={18} strokeWidth={1.85} />, roles: ["admin"] },
      { id: "admin-users", label: "Users & RBAC", icon: <Users size={18} strokeWidth={1.85} />, roles: ["admin"] },
      { id: "admin-classes", label: "Classes", icon: <GraduationCap size={18} strokeWidth={1.85} />, roles: ["admin"] },
    ],
  },
  {
    label: "System",
    items: [
      { id: "admin-ai", label: "AI & Sandbox", icon: <Bot size={18} strokeWidth={1.85} />, roles: ["admin"] },
      { id: "admin-sessions", label: "Security & JWT", icon: <ServerCog size={18} strokeWidth={1.85} />, roles: ["admin"] },
      { id: "admin-audit", label: "Audit Logs", icon: <History size={18} strokeWidth={1.85} />, roles: ["admin"] },
    ],
  },

  // ── WORKSPACE & STUDIO (Student & Instructor primary, plus shared inspect views for Admin) ──
  {
    label: "Workspace",
    items: [
      { id: "student-dashboard", label: "Overview", icon: <LayoutGrid size={18} strokeWidth={1.85} />, roles: ["student"] },
      { id: "instructor", label: "Overview", icon: <LayoutGrid size={18} strokeWidth={1.85} />, roles: ["instructor"] },
      { id: "workspace", label: "Tasks", icon: <BookOpen size={18} strokeWidth={1.85} />, roles: ["student"] },
      { id: "instructor-courses", label: "Courses", icon: <BookOpen size={18} strokeWidth={1.85} />, roles: ["instructor"] },
      { id: "instructor-grading", label: "Grading & AI", icon: <ShieldCheck size={18} strokeWidth={1.85} />, roles: ["instructor"] },
      { id: "instructor-students", label: "Students", icon: <Users size={18} strokeWidth={1.85} />, roles: ["instructor"] },
      { id: "projects", label: "Projects", icon: <FolderKanban size={18} strokeWidth={1.85} />, roles: ["student", "instructor", "admin"] },
      { id: "team", label: "Team", icon: <Users size={18} strokeWidth={1.85} />, roles: ["student", "instructor", "admin"] },
      { id: "kanban", label: "Kanban", icon: <Columns3 size={18} strokeWidth={1.85} />, roles: ["student", "instructor", "admin"] },
      { id: "schedule", label: "Calendar", icon: <CalendarDays size={18} strokeWidth={1.85} />, roles: ["student", "instructor", "admin"] },
    ],
  },
  {
    label: "Studio",
    items: [
      { id: "instructor-mindmap", label: "Master Map", icon: <Compass size={18} strokeWidth={1.85} />, roles: ["instructor"] },
      { id: "intro", label: "Roadmap", icon: <Compass size={18} strokeWidth={1.85} />, roles: ["student", "instructor"], badge: "Intro" },
      { id: "defense-room", label: "Bảo vệ Đồ án", icon: <ShieldCheck size={18} strokeWidth={1.85} />, roles: ["student", "instructor", "admin"] },
      { id: "github", label: "Git", icon: <GitFork size={18} strokeWidth={1.85} />, roles: ["student", "instructor", "admin"] },
      { id: "xp-shop", label: "Mốc XP", icon: <Award size={18} strokeWidth={1.85} />, roles: ["student"] },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "profile", label: "Profile", icon: <UserRound size={18} strokeWidth={1.85} />, roles: ["student"] },
      { id: "security", label: "Security", icon: <Shield size={18} strokeWidth={1.85} />, roles: ["student", "instructor", "admin"] },
    ],
  },
];

export default function Sidebar({
  screen,
  role,
  theme,
  avatarStyle,
  badgeFrame,
  onToggleTheme,
  onNavigate,
  onLogout,
  onOpenCommandPalette,
}: Props) {
  const [navCounts, setNavCounts] = useState<NavigationCounts | null>(null);

  useEffect(() => {
    let active = true;
    const loadCounts = () => {
      fetchNavigationCountsApi(role).then((c) => {
        if (active && c) setNavCounts(c);
      });
    };
    loadCounts();
    window.addEventListener("codemind-courses-updated", loadCounts);
    window.addEventListener("codemind-instructor-updated", loadCounts);
    window.addEventListener("codemind-xp-updated", loadCounts);
    window.addEventListener("codemind-nav-updated", loadCounts);
    return () => {
      active = false;
      window.removeEventListener("codemind-courses-updated", loadCounts);
      window.removeEventListener("codemind-instructor-updated", loadCounts);
      window.removeEventListener("codemind-xp-updated", loadCounts);
      window.removeEventListener("codemind-nav-updated", loadCounts);
    };
  }, [role]);

  const resolveBadge = (item: NavItem): { badge?: string; badgeDot?: boolean } => {
    if (item.badge) return { badge: item.badge, badgeDot: item.badgeDot };
    if (!navCounts) return {};
    switch (item.id) {
      case "admin-users":
        return navCounts.users > 0 ? { badge: String(navCounts.users) } : {};
      case "admin-classes":
      case "instructor-courses":
        return navCounts.courses > 0 ? { badge: String(navCounts.courses) } : {};
      case "admin-ai":
        return navCounts.ai_services > 0 ? { badge: String(navCounts.ai_services) } : {};
      case "instructor-grading":
        return { badgeDot: navCounts.pending_dual_reviews > 0 };
      case "workspace":
        return navCounts.courses > 0 ? { badge: String(navCounts.courses) } : {};
      case "team":
        return navCounts.team_members > 0 ? { badge: String(navCounts.team_members) } : {};
      case "kanban":
        return navCounts.kanban_open_tasks > 0 ? { badge: String(navCounts.kanban_open_tasks) } : {};
      case "schedule":
        return navCounts.schedules > 0 ? { badge: String(navCounts.schedules) } : {};
      default:
        return {};
    }
  };

  const visibleGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items
        .filter((item) => item.roles.includes(role))
        .map((item) => ({ ...item, ...resolveBadge(item) })),
    }))
    .filter((g) => g.items.length > 0);
  const visible = visibleGroups.flatMap((g) => g.items);
  const [collapsed, setCollapsed] = useState(screen === "workspace");

  // Tự động thu gọn thanh điều hướng (navbar) khi vào phần học để không gian bài học hiển thị tối đa
  useEffect(() => {
    if (screen === "workspace") {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [screen]);

  // Lắng nghe sự kiện tuỳ biến collapse-sidebar (ví dụ khi vào / ra player học tập trong LearningWorkspace)
  useEffect(() => {
    const handleCollapseEvent = (e: CustomEvent<{ collapse: boolean }>) => {
      if (typeof e.detail?.collapse === "boolean") {
        setCollapsed(e.detail.collapse);
      }
    };
    window.addEventListener("collapse-sidebar" as any, handleCollapseEvent as any);
    return () => window.removeEventListener("collapse-sidebar" as any, handleCollapseEvent as any);
  }, []);

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 🏷️ Authentic Marlo Rail Tooltip State
  const [hoveredTip, setHoveredTip] = useState<{
    label: string;
    badge?: string;
    x: number;
    y: number;
  } | null>(null);

  const handleItemClick = (_e: React.MouseEvent<HTMLButtonElement>, id: Screen) => {
    hideTip();
    onNavigate(id);
  };

  const showTip = (label: string, e: React.MouseEvent<HTMLElement>, badge?: string) => {
    if (!collapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTip({
      label,
      badge,
      x: rect.right + 12,
      y: rect.top + rect.height / 2,
    });
  };

  const hideTip = () => {
    setHoveredTip(null);
  };

  useEffect(() => {
    setHoveredTip(null);
  }, [collapsed]);

  // 🏷️ Marlo Liquid Rubberband Pill ("Hiệu ứng bị kéo theo")
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const getActiveItem = () =>
    navRef.current?.querySelector<HTMLElement>(`.sidebar-nav-item[data-id="${screen}"]`);

  useLayoutEffect(() => {
    animateMarloPill(pillRef.current, getActiveItem(), {
      animate: !isFirstRender.current,
      radius: 14,
    });
    isFirstRender.current = false;
  }, [screen, collapsed, visible.length]);

  useEffect(() => {
    const reposition = () => {
      animateMarloPill(pillRef.current, getActiveItem(), {
        animate: false,
        radius: 14,
      });
    };
    const ro = new ResizeObserver(reposition);
    if (navRef.current) ro.observe(navRef.current);
    document.fonts?.ready?.then(reposition);
    return () => ro.disconnect();
  }, [screen, collapsed]);

  return (
    <aside
      className={`app-sidebar relative flex shrink-0 flex-col p-2 sm:p-2.5 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none bg-transparent ${
        collapsed ? "w-[92px]" : "w-[248px]"
      }`}
    >
      {/* ─── 🌟 BOX 1: TOP MAIN NAVIGATION CAPSULE (MARLO FLOATING CARD) ─── */}
      <div className={`flex-1 min-h-0 flex flex-col rounded-[28px] bg-white dark:bg-[#14161F] border border-black/[0.06] dark:border-white/[0.08] shadow-[0_1px_2px_rgba(20,22,26,0.04),0_14px_32px_-22px_rgba(20,22,26,0.28)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden ${collapsed ? "w-[72px] items-center py-3.5 px-2" : "w-full"}`}>
        {/* Brand Header */}
        <div className={`shrink-0 ${collapsed ? "flex flex-col items-center px-1" : "px-4 pt-3.5 pb-2"}`}>
          <div className={`flex items-center ${collapsed ? "flex-col gap-2.5 justify-center" : "justify-between"}`}>
            {/* Logo & Brand title */}
            <div
              onClick={() => onNavigate(role === "admin" ? "admin" : role === "instructor" ? "instructor" : "student-dashboard")}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
              title="CodeMind AI • Learning OS"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#F8BD57] via-[#F29B23] to-[#EE8420] text-[#1C1304] shadow-xs shrink-0 select-none group-hover:scale-105 transition-transform">
                <Zap size={20} className="fill-[#1C1304] text-[#1C1304]" />
              </div>
              {!collapsed && (
                <div className="min-w-0 transition-opacity duration-200">
                  <div className="font-extrabold text-[14.5px] tracking-tight text-[#161718] dark:text-[#F0F0F1] truncate flex items-center gap-1.5">
                    <span>CodeMind</span>
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-md bg-[#EE8420]/15 text-[#EE8420] border border-[#EE8420]/30 leading-tight">
                      AI
                    </span>
                  </div>
                  <div className="text-[11px] text-[#62656B] dark:text-[#A0A3A9] font-medium truncate">
                    Learning OS
                  </div>
                </div>
              )}
            </div>

            {/* Collapse Toggle Button - circle button matching Marlo side__fold */}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="w-9 h-9 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center text-[#62656B] dark:text-[#A0A3A9] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#161718] dark:hover:text-[#F0F0F1] transition cursor-pointer shrink-0"
              title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
        </div>

        {/* Divider in collapsed mode */}
        {collapsed && <div className="h-px w-8 bg-black/10 dark:bg-white/10 my-2.5 mx-auto shrink-0" />}

      {/* ─── 3. NAVIGATION LIST (MARLO PILL & RAIL ICONS) ─── */}
      <nav
        ref={navRef}
        className={`relative flex flex-1 min-h-0 overflow-y-auto flex-col [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          collapsed ? "items-center px-1 py-1 gap-2.5" : "px-2.5 py-1.5 gap-0.5"
        }`}
      >
        {/* 🏷️ Marlo Liquid Rubberband Active Pill - EXACT 1:1 WITH MARLO */}
        <div
          ref={pillRef}
          aria-hidden="true"
          className="snav__pill pointer-events-none absolute top-0 left-0 w-full h-full bg-[#141619] dark:bg-[#F4F4F6] shadow-[0_8px_18px_-10px_rgba(0,0,0,0.45)] z-0 rounded-[14px]"
        />

        {visibleGroups.map((group, gIdx) => (
          <div key={group.label} className={`flex flex-col ${collapsed ? "items-center gap-2" : "gap-0.5"}`}>
            {/* Section Header / Marlo Rail Divider */}
            {collapsed ? (
              gIdx > 0 && <div className="h-px w-8 bg-black/10 dark:bg-white/10 my-2 mx-auto shrink-0" />
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#526071] dark:text-[#94A3B8] px-3.5 pt-3.5 pb-1 select-none">
                {group.label}
              </span>
            )}

            {group.items.map((item) => {
              const active = screen === item.id;

              return (
                <button
                  key={item.id}
                  data-id={item.id}
                  data-active={active ? "true" : undefined}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => handleItemClick(e, item.id)}
                  onMouseEnter={(e) => showTip(item.label, e, item.badge)}
                  onMouseLeave={hideTip}
                  className={`sidebar-nav-item relative z-10 overflow-hidden flex items-center cursor-pointer outline-none focus:outline-none select-none transition-colors duration-200 active:scale-[0.98] ${
                    collapsed
                      ? `h-[42px] w-[46px] justify-center p-0 rounded-[14px] mx-auto ${
                          active
                            ? "text-white dark:text-[#141619] font-bold"
                            : "text-[#555E6D] dark:text-[#A4ACB9] font-semibold hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#141619] dark:hover:text-white"
                        }`
                      : `w-full h-[42px] px-3.5 rounded-[14px] border-0 justify-start text-left gap-3 ${
                          active
                            ? "text-white dark:text-[#141619] font-bold"
                            : "text-[#3B404D] dark:text-[#C4C7D0] font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#141619] dark:hover:text-white"
                        }`
                  }`}
                >
                  {/* Icon */}
                  <span
                    className={`shrink-0 flex items-center justify-center w-[18px] h-[18px] transition-colors duration-150 ${
                      active
                        ? "text-white dark:text-[#141619]"
                        : "text-[#4B5262] dark:text-[#9DA4B2]"
                    }`}
                  >
                    {item.icon}
                  </span>

                  {/* Expanded Label & Badges */}
                  {!collapsed && (
                    <>
                      <span className={`flex-1 min-w-0 text-left text-[13.5px] leading-tight truncate ${active ? "font-bold text-white dark:text-[#141619]" : "font-medium"}`}>
                        {item.label}
                      </span>

                      {/* Right side container: Badges */}
                      {(item.badge || item.badgeDot) && (
                        <div className="ml-auto flex items-center gap-1.5 shrink-0 pl-1">
                          {/* Number / Text Badge */}
                          {item.badge && (
                            <span
                              className={`min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full text-[11px] font-semibold font-sans transition-colors duration-150 leading-none ${
                                active
                                  ? "bg-white/20 dark:bg-black/15 text-white dark:text-[#141619] font-bold"
                                  : "bg-[#E5E7EB] dark:bg-[#282B37] text-[#555E6D] dark:text-[#A4ACB9]"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}

                          {/* Dot Badge */}
                          {item.badgeDot && (
                            <span className="w-2 h-2 rounded-full bg-[#EE8420] animate-pulse" />
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Collapsed notification badge dot */}
                  {collapsed && (item.badgeDot || item.badge) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EE8420] ring-2 ring-white dark:ring-[#14161F] shadow-2xs" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      </div>

      {/* ─── 🌟 BOX 2: BOTTOM POMODORO TIMER CAPSULE (MARLO FLOATING CARD) ─── */}
      {role === "student" && !screen.startsWith("admin") && !screen.startsWith("instructor") && (
        <div className="shrink-0 mt-2">
          <MarloFocusTimer collapsed={collapsed} />
        </div>
      )}

      {/* ─── 5. AUTHENTIC MARLO RAIL TOOLTIP (Exact Replica from media_1794374799784_099e152f.png) ─── */}
      {collapsed && hoveredTip && (
        <div
          className="fixed z-[100] pointer-events-none px-3.5 py-1.5 rounded-[10px] bg-[#161718] text-white text-[13px] font-bold tracking-tight shadow-[0_6px_20px_rgba(0,0,0,0.38)] border border-white/10 flex items-center gap-2 animate-marlo-tip select-none whitespace-nowrap"
          style={{
            left: `${hoveredTip.x}px`,
            top: `${hoveredTip.y}px`,
          }}
        >
          <span>{hoveredTip.label}</span>
          {hoveredTip.badge && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono bg-orange-500 text-white">
              {hoveredTip.badge}
            </span>
          )}
        </div>
      )}
    </aside>
  );
}
