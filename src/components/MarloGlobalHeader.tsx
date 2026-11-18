import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  Flame,
  Zap,
  CheckCircle2,
  Calendar,
  Sparkles,
  BookOpen,
  FolderKanban,
  FileCode,
  Check,
  ShieldCheck,
  X,
} from "lucide-react";
import type { AvatarStyle, BadgeFrame, Role, Screen, Theme } from "../App";
import { HeaderProfileDropdown } from "./HeaderProfileDropdown";
import MarloThemeSwitch from "./MarloThemeSwitch";
import { fetchStudentLearningOverview } from "../api";

export interface MarloGlobalHeaderProps {
  screen: Screen;
  theme: Theme;
  onToggleTheme: (trigger?: any) => void;
  role: Role;
  avatarStyle?: AvatarStyle;
  badgeFrame?: BadgeFrame;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  onOpenCommandPalette: () => void;
}

export default function MarloGlobalHeader({
  screen,
  theme,
  onToggleTheme,
  role = "student",
  avatarStyle = "initials",
  badgeFrame = "streak",
  onNavigate,
  onLogout,
  onOpenCommandPalette,
}: MarloGlobalHeaderProps) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [streakDays, setStreakDays] = useState<number>(14);
  const [xpPoints, setXpPoints] = useState<number>(3240);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (role !== "student" || screen.startsWith("admin") || screen.startsWith("instructor")) {
      return;
    }
    let active = true;
    const loadStats = () => {
      fetchStudentLearningOverview().then((data) => {
        if (!active || !data?.profile) return;
        if (typeof data.profile.current_streak === "number") {
          setStreakDays(data.profile.current_streak);
        }
        if (typeof data.profile.exp_points === "number") {
          setXpPoints(data.profile.exp_points);
        }
      });
    };
    loadStats();
    window.addEventListener("codemind-xp-updated", loadStats);
    return () => {
      active = false;
      window.removeEventListener("codemind-xp-updated", loadStats);
    };
  }, [role, screen]);

  // Close notification popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    if (isNotifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotifOpen]);

  // Current formatted date in Vietnamese / Marlo style
  const todayFormatted = React.useMemo(() => {
    try {
      const now = new Date();
      const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const dayName = days[now.getDay()];
      const dayNum = now.getDate();
      const monthNum = now.getMonth() + 1;
      return `${dayName}, ${dayNum}/${monthNum}`;
    } catch {
      return "Thứ Tư, 11/11";
    }
  }, []);

  const notifications = [
    {
      id: "n1",
      title: "Sprint 1 đã chính thức khởi động",
      desc: "Nhóm 3 thành viên • Ràng buộc H2 và WBS 8 bảng",
      time: "10m trước",
      type: "sprint",
    },
    {
      id: "n2",
      title: "AI Mentor Socratic đã duyệt code Bài 1.2",
      desc: "+90 XP đã được cộng vào tài khoản của bạn",
      time: "1h trước",
      type: "xp",
    },
    {
      id: "n3",
      title: "Hạn nộp PR #TE35D77 sắp tới",
      desc: "Docker Image Sandbox cô lập (H2) cần nộp trước 08/11",
      time: "3h trước",
      type: "task",
    },
  ];

  return (
    <header className="w-full flex items-center justify-between py-3.5 px-6 sm:px-8 bg-transparent border-0 transition-all shrink-0 relative z-30">
      {/* ── LEFT: Pill Search Bar (Marlo Style with ⌘K Shortcut) ────────── */}
      <div className="flex items-center gap-3 min-w-0 flex-1 max-w-[420px] shrink">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="group flex h-11 sm:h-12 w-full items-center justify-between rounded-full border border-slate-200/90 bg-white dark:bg-[#18191c] px-4.5 text-sm text-slate-500 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200 cursor-pointer"
          title="Mở bảng lệnh nhanh (Ctrl+K / ⌘K)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search size={16} className="text-slate-400 transition group-hover:text-[#EE8420] dark:text-slate-500 dark:group-hover:text-[#F29B23] shrink-0" />
            <span className="truncate font-normal">Tìm kiếm task, bài học, dự án...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-slate-400 shadow-2xs group-hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── RIGHT: Merged Marlo Shell Controls + CodeMind Student Stats ─── */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Date & Sprint Status Indicator */}
        <div className="hidden lg:flex h-11 sm:h-12 items-center gap-2.5 rounded-full border border-slate-200/90 bg-white dark:bg-[#18191c] px-4 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200 shadow-xs shrink-0 whitespace-nowrap">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
          </span>
          <span className="font-semibold whitespace-nowrap">{todayFormatted}</span>
          <span className="text-slate-300 dark:text-slate-700 shrink-0">•</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap shrink-0">
            {role === "student" && !screen.startsWith("admin") && !screen.startsWith("instructor")
              ? "Sprint 1"
              : role === "instructor" || screen.startsWith("instructor")
              ? "Học kỳ 1 / 2026"
              : "Core System"}
          </span>
        </div>

        {/* CodeMind Exclusive: Streak & XP Counter Pills (Chỉ hiện cho Học viên) */}
        {role === "student" && !screen.startsWith("admin") && !screen.startsWith("instructor") && (
          <div className="hidden xl:flex items-center gap-1.5 shrink-0">
            <span
              className="inline-flex h-11 sm:h-12 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white dark:bg-[#18191c] px-3.5 text-xs font-bold font-mono text-amber-700 dark:border-slate-800 dark:text-amber-400 shadow-xs shrink-0 whitespace-nowrap"
              title={`Chuỗi học liên tục: ${streakDays} ngày`}
            >
              <Flame size={15} className="text-amber-500 fill-amber-500 shrink-0" />
              <span className="whitespace-nowrap">{streakDays} ngày</span>
            </span>
            <span
              className="inline-flex h-11 sm:h-12 items-center gap-1.5 rounded-full border border-[#F5E6CC]/80 bg-white dark:bg-[#18191c] px-3.5 text-xs font-bold font-mono text-[#8F5404] dark:border-slate-800 dark:text-amber-400 shadow-xs shrink-0 whitespace-nowrap"
              title={`XP tích lũy hiện tại: ${xpPoints.toLocaleString("en-US")} XP`}
            >
              <Zap size={15} className="text-[#EE8420] fill-[#EE8420] shrink-0" />
              <span className="whitespace-nowrap">{xpPoints.toLocaleString("en-US")} XP</span>
            </span>
          </div>
        )}

        {/* Instructor Status Pills (Mirrors Student pills in clean monochrome + subtle amber) */}
        {(role === "instructor" || screen.startsWith("instructor")) && !screen.startsWith("admin") && (
          <div className="hidden xl:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate("instructor-courses")}
              className="inline-flex h-11 sm:h-12 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white dark:bg-[#18191c] px-3.5 text-xs font-bold font-mono text-slate-700 dark:border-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs shrink-0 whitespace-nowrap transition cursor-pointer"
              title="Quản lý 6 Học phần CNTT"
            >
              <BookOpen size={15} className="text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="whitespace-nowrap">6 Học phần</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("instructor-grading")}
              className="inline-flex h-11 sm:h-12 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white dark:bg-[#18191c] px-3.5 text-xs font-bold font-mono text-slate-900 dark:border-slate-800 dark:text-white hover:border-slate-300 dark:hover:border-slate-700 shadow-xs shrink-0 whitespace-nowrap transition cursor-pointer"
              title="5 bài nộp CI/CD & Phản biện AI đang chờ duyệt"
            >
              <span className="w-2 h-2 rounded-full bg-[#EE8420] shrink-0" />
              <span className="whitespace-nowrap">5 Chờ duyệt</span>
            </button>
          </div>
        )}

        {/* Admin Governance Status Pills */}
        {(role === "admin" || screen.startsWith("admin")) && !screen.startsWith("instructor") && (
          <div className="hidden xl:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate("admin-ai")}
              className="inline-flex h-11 sm:h-12 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white dark:bg-[#18191c] px-3.5 text-xs font-bold font-mono text-slate-700 dark:border-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs shrink-0 whitespace-nowrap transition cursor-pointer"
              title="Giám sát SLA, Token Guardrails & Docker Sandbox"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="whitespace-nowrap">99.98% SLA</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("admin-sessions")}
              className="inline-flex h-11 sm:h-12 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white dark:bg-[#18191c] px-3.5 text-xs font-bold font-mono text-slate-900 dark:border-slate-800 dark:text-white hover:border-slate-300 dark:hover:border-slate-700 shadow-xs shrink-0 whitespace-nowrap transition cursor-pointer"
              title="Quản lý An ninh Phiên JWT & RBAC"
            >
              <ShieldCheck size={15} className="text-[#EE8420] shrink-0" />
              <span className="whitespace-nowrap">RBAC · JWT Active</span>
            </button>
          </div>
        )}

        {/* Quick Action Button: + Tạo mới / + New */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex h-11 sm:h-12 items-center gap-2 rounded-full border border-slate-200/90 bg-white dark:bg-[#18191c] px-4 sm:px-5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 active:scale-95 dark:border-slate-800 cursor-pointer shrink-0 whitespace-nowrap"
          title="Tạo task mới hoặc hành động nhanh"
        >
          <Plus size={15} className="stroke-[2.5] text-slate-600 dark:text-slate-300 shrink-0" />
          <span className="whitespace-nowrap">Tạo mới</span>
        </button>

        {/* Marlo Authentic Dual Sun/Moon Capsule Switcher (.themesw with sliding spring knob) */}
        <MarloThemeSwitch theme={theme} onToggleTheme={onToggleTheme} />

        {/* Notification Bell with Badge */}
        <div className="relative shrink-0" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setIsNotifOpen((prev) => !prev);
              if (unreadCount > 0) setUnreadCount(0);
            }}
            className="relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-slate-200/90 bg-white dark:bg-[#18191c] text-slate-600 dark:text-slate-300 shadow-xs transition hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 dark:border-slate-800 cursor-pointer"
            title="Thông báo hệ thống"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-xs animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Bell size={14} className="text-amber-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Thông báo mới</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={12} />
                </button>
              </div>

              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex flex-col gap-0.5 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{n.title}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{n.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[11px] font-semibold text-[#8F5404] dark:text-amber-400 hover:text-[#EE8420] hover:underline cursor-pointer">
                  Đánh dấu tất cả đã đọc
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown Pill (Integrated Marlo Profile Trigger) */}
        <HeaderProfileDropdown
          theme={theme}
          onToggleTheme={onToggleTheme}
          role={role}
          avatarStyle={avatarStyle}
          badgeFrame={badgeFrame}
          onNavigate={onNavigate}
          onLogout={onLogout}
          onOpenCommandPalette={onOpenCommandPalette}
        />
      </div>

      {/* 🌊 Dải sáng chuyển cảnh lan nước lướt nhẹ khi đổi trang (gắn liền đáy header sticky) */}
      <div
        key={`trans-beam-${screen}`}
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] z-50 bg-gradient-to-r from-[#f29b23] via-[#ee8420] to-[#d97706] animate-water-transition-bar"
      />
    </header>
  );
}
