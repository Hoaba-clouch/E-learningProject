import React, { useState, useRef, useEffect } from "react";
import { getStoredUser, fetchCurrentUser, ensureRoleSession } from "../api";
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
  Palette,
} from "lucide-react";
import type { AvatarStyle, BackgroundTheme, BadgeFrame, Role, Screen, Theme } from "../App";

export interface HeaderProfileDropdownProps {
  theme: Theme;
  onToggleTheme: (trigger?: any) => void;
  backgroundTheme?: BackgroundTheme;
  onApplyBackgroundTheme?: (bg: BackgroundTheme) => void;
  role?: Role;
  avatarStyle?: AvatarStyle;
  badgeFrame?: BadgeFrame;
  onNavigate?: (screen: Screen) => void;
  onLogout?: () => void;
  onOpenCommandPalette?: () => void;
}

const BACKGROUND_OPTIONS: { id: BackgroundTheme; label: string; dotCls: string }[] = [
  { id: "diagonal", label: "Sáng chuẩn", dotCls: "bg-stone-200 border-stone-400" },
  { id: "blueprint", label: "Blueprint", dotCls: "bg-sky-200 border-sky-500" },
  { id: "matrix", label: "Matrix", dotCls: "bg-emerald-200 border-emerald-600" },
  { id: "sunrise", label: "Sunrise", dotCls: "bg-orange-200 border-orange-500" },
  { id: "graphite", label: "Graphite", dotCls: "bg-indigo-200 border-indigo-600" },
];

const roleLabel: Record<Role, string> = {
  student: "Học viên",
  instructor: "Giảng viên",
  admin: "Quản trị viên",
};

export function HeaderProfileDropdown({
  theme,
  onToggleTheme,
  backgroundTheme = "diagonal",
  onApplyBackgroundTheme,
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

  const [currentUser, setCurrentUser] = useState<any>(() => getStoredUser(role));

  useEffect(() => {
    let active = true;
    const syncUser = () => {
      const cached = getStoredUser(role);
      if (cached) {
        setCurrentUser(cached);
        fetchCurrentUser(role, { skipAutoDemo: true }).then((u) => {
          if (active && u) setCurrentUser(u);
        }).catch(() => {});
        return;
      }
      ensureRoleSession(role).then(() => {
        if (!active) return;
        const freshCached = getStoredUser(role);
        if (freshCached) {
          setCurrentUser(freshCached);
          fetchCurrentUser(role, { skipAutoDemo: true }).then((u) => {
            if (active && u) setCurrentUser(u);
          }).catch(() => {});
        } else {
          fetchCurrentUser(role, { skipAutoDemo: true }).then((u) => {
            if (active && u) setCurrentUser(u);
          }).catch(() => {});
        }
      });
    };
    syncUser();

    const handleAuthUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail?.role || detail.role === role) {
        const updated = getStoredUser(role);
        if (active && updated) setCurrentUser(updated);
      }
    };
    window.addEventListener("codemind-auth-updated", handleAuthUpdated);
    return () => {
      active = false;
      window.removeEventListener("codemind-auth-updated", handleAuthUpdated);
    };
  }, [role]);

  const userName =
    currentUser?.name ||
    currentUser?.full_name ||
    (role === "student"
      ? "Học viên CodeMind"
      : role === "instructor"
      ? "Giảng viên CodeMind"
      : "Admin AIO");

  const userCode =
    currentUser?.code ||
    currentUser?.student_code ||
    (role === "student"
      ? "SV-2026-01"
      : role === "instructor"
      ? "GV-104"
      : "ADM-01");

  const userInitials = React.useMemo(() => {
    const cleaned = String(userName || "")
      .replace(/^(cô|thầy|ts\.?|ths\.?|pgs\.?)\s+/i, "")
      .trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return role === "student" ? "HV" : role === "instructor" ? "GV" : "AD";
  }, [userName, role]);

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
          {currentUser?.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={userName}
              className="h-9 w-9 rounded-full object-cover shadow-2xs ring-1 ring-slate-200/80 dark:ring-slate-700"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 shadow-2xs font-mono">
              {userInitials}
            </span>
          )}
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

          {onApplyBackgroundTheme && (
            <>
              <div className="h-px bg-slate-100 dark:bg-white/5 my-1 mx-1.5" />
              <div className="px-3 py-1.5">
                <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  <span className="inline-flex items-center gap-1">
                    <Palette size={11} />
                    Giao diện nền
                  </span>
                  <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-semibold normal-case">
                    Miễn phí
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {BACKGROUND_OPTIONS.map((opt) => {
                    const isSelected = backgroundTheme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onApplyBackgroundTheme(opt.id)}
                        title={`Chọn nền ${opt.label}`}
                        className={`h-7 rounded-lg border-2 flex items-center justify-center transition cursor-pointer ${opt.dotCls} ${
                          isSelected
                            ? "ring-2 ring-[#EE8420] ring-offset-1 dark:ring-offset-[#18191c] scale-105"
                            : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        {isSelected && <Check size={12} className="text-slate-900 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="h-px bg-slate-100 dark:bg-white/5 my-1 mx-1.5" />

          {/* 4. Profile */}
          <button
            type="button"
            role="menuitem"
            onClick={() => closeDropdown(() => onNavigate?.("profile"))}
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
