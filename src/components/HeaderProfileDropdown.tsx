import React, { useState, useRef, useEffect } from "react";
import {
  UserRound,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Check,
  Monitor,
  Settings,
  ShieldCheck,
  HelpCircle,
  LayoutGrid,
} from "lucide-react";
import type { AvatarStyle, BadgeFrame, Role, Screen, Theme } from "../App";

export interface HeaderProfileDropdownProps {
  theme: Theme;
  onToggleTheme: (trigger?: any) => void;
  role?: Role;
  avatarStyle?: AvatarStyle;
  badgeFrame?: BadgeFrame;
  onNavigate?: (screen: Screen) => void;
  onLogout?: () => void;
  onOpenCommandPalette?: () => void;
}

const roleLabel: Record<Role, string> = {
  student: "Học viên",
  instructor: "Giảng viên",
  admin: "Quản trị viên",
};

export function HeaderProfileDropdown({
  theme,
  onToggleTheme,
  role = "student",
  onNavigate,
  onLogout,
  onOpenCommandPalette,
}: HeaderProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown mượt mà với animation thoát
  const closeDropdown = (callback?: () => void) => {
    if (!isOpen || isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      callback?.();
    }, 180);
  };

  const toggleDropdown = () => {
    if (isOpen) {
      closeDropdown();
    } else {
      setIsClosing(false);
      setIsOpen(true);
    }
  };

  // Đóng dropdown khi nhấp ra ngoài hoặc bấm Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDropdown();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isClosing]);

  const userName =
    role === "student"
      ? "Nguyễn Văn A"
      : role === "instructor"
      ? "Cô Trần Thị B"
      : "Admin AIO";

  const userCode =
    role === "student"
      ? "2210842"
      : role === "instructor"
      ? "GV-104"
      : "ADM-01";

  return (
    <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
      {/* ─── 1. TRIGGER BUTTON (MARLO PILL HEAD) ─── */}
      <button
        type="button"
        onClick={toggleDropdown}
        className={`group flex items-center gap-2.5 h-11 sm:h-12 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#18191c] hover:bg-slate-50 dark:hover:bg-[#222326] px-3.5 py-1 text-left transition-all duration-150 cursor-pointer shadow-xs select-none active:scale-[0.98] shrink-0 whitespace-nowrap ${
          isOpen
            ? "ring-2 ring-sky-500/30 border-sky-400 dark:border-sky-500/50 bg-slate-50 dark:bg-[#222326]"
            : ""
        }`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${userName} - account`}
      >
        {/* User Avatar with status indicator */}
        <div className="relative shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 shadow-2xs font-mono">
            {role === "student" ? "NA" : role === "instructor" ? "TB" : "AD"}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1b1c1e]" />
        </div>

        {/* User Info (2 lines: Name + Role/Title, identical to Dara Whitfield / Head of post) */}
        <div className="hidden sm:block text-left min-w-0 pr-1 leading-tight">
          <div className="text-sm font-semibold text-slate-800 dark:text-[#f0f0f1] truncate block max-w-[130px]">
            {userName}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate block max-w-[130px]">
            {roleLabel[role]}
          </div>
        </div>

        {/* Dropdown Chevron */}
        <ChevronDown
          size={15}
          className={`text-slate-400 dark:text-[#a0a3a9] transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-sky-600 dark:text-sky-400" : "group-hover:text-slate-700 dark:group-hover:text-white"
          }`}
        />
      </button>

      {/* ─── 2. AUTHENTIC MARLO USER MENU DROPDOWN (1:1 VỚI HÌNH MẪU MARLO) ─── */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Account Menu"
          className={`absolute right-0 top-full mt-2 w-[240px] sm:w-[250px] rounded-2xl bg-white dark:bg-[#18191c] border border-slate-200/90 dark:border-white/10 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] p-1.5 z-[100] select-none ${
            isClosing ? "marlo-dropdown-out" : "marlo-dropdown-in"
          }`}
        >
          {/* Header: DARA WHITFIELD · HEAD OF POST */}
          <div className="px-3 py-2 text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none truncate">
            {userName} · {roleLabel[role]}
          </div>

          {/* 1. Light */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              if (theme !== "light") onToggleTheme(e.currentTarget);
            }}
            className="w-full h-[36px] px-3 rounded-xl flex items-center gap-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <Sun size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Light</span>
            {theme === "light" && (
              <Check size={14} className="ml-auto text-slate-800 dark:text-white stroke-[2.5]" />
            )}
          </button>

          {/* 2. Dark */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              if (theme !== "dark") onToggleTheme(e.currentTarget);
            }}
            className="w-full h-[36px] px-3 rounded-xl flex items-center gap-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <Moon size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Dark</span>
            {theme === "dark" && (
              <Check size={14} className="ml-auto text-slate-800 dark:text-white stroke-[2.5]" />
            )}
          </button>

          {/* 3. Match system */}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              const isSystemDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
              const targetTheme = isSystemDark ? "dark" : "light";
              if (theme !== targetTheme) onToggleTheme(e.currentTarget);
            }}
            className="w-full h-[36px] px-3 rounded-xl flex items-center gap-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <Monitor size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Match system</span>
          </button>

          {/* Divider */}
          <div className="h-px bg-slate-100 dark:bg-white/5 my-1 mx-1.5" />

          {/* 4. Profile */}
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              closeDropdown(() =>
                onNavigate?.(role === "instructor" ? "instructor" : role === "admin" ? "admin" : "profile")
              )
            }
            className="w-full h-[36px] px-3 rounded-xl flex items-center gap-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <UserRound size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Profile</span>
          </button>

          {/* 4b. Security & Devices */}
          <button
            type="button"
            role="menuitem"
            onClick={() => closeDropdown(() => onNavigate?.("security"))}
            className="w-full h-[36px] px-3 rounded-xl flex items-center gap-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <ShieldCheck size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Bảo mật &amp; Thiết bị</span>
          </button>

          {/* 5. Studio settings */}
          <button
            type="button"
            role="menuitem"
            onClick={() => closeDropdown(() => onNavigate?.("projects"))}
            className="w-full h-[36px] px-3 rounded-xl flex items-center gap-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <Settings size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Studio settings</span>
          </button>

          {/* 6. Help */}
          <button
            type="button"
            role="menuitem"
            onClick={() => closeDropdown(() => onNavigate?.("intro"))}
            className="w-full h-[36px] px-3 rounded-xl flex items-center gap-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <HelpCircle size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Help</span>
          </button>

          {/* 7. Keyboard shortcuts */}
          <button
            type="button"
            role="menuitem"
            onClick={() => closeDropdown(() => onOpenCommandPalette?.())}
            className="w-full h-[36px] px-3 rounded-xl flex items-center gap-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/90 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <LayoutGrid size={16} className="text-slate-400 dark:text-slate-400 shrink-0" />
            <span>Keyboard shortcuts</span>
            <span className="ml-auto w-5 h-5 flex items-center justify-center rounded-md text-[11px] font-bold font-mono text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
              ?
            </span>
          </button>

          {/* Divider */}
          <div className="h-px bg-slate-100 dark:bg-white/5 my-1 mx-1.5" />

          {/* 8. Sign out */}
          {onLogout && (
            <button
              type="button"
              role="menuitem"
              onClick={() => closeDropdown(() => onLogout())}
              className="w-full h-[36px] px-3 rounded-xl flex items-center gap-2.5 text-[13px] font-medium text-[#E06D53] dark:text-[#FF7A5C] hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer text-left"
            >
              <LogOut size={16} className="text-[#E06D53] dark:text-[#FF7A5C] shrink-0" />
              <span>Sign out</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
