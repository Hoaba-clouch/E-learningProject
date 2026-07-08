import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  GitFork,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Moon,
  Play,
  Shield,
  ShoppingBag,
  Sun,
  UserRound,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type { AvatarStyle, BadgeFrame, Role, Screen, Theme } from "../App";

interface Props {
  screen: Screen;
  role: Role;
  theme: Theme;
  avatarStyle: AvatarStyle;
  badgeFrame: BadgeFrame;
  onToggleTheme: () => void;
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
}

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
}

const items: NavItem[] = [
  { id: "student-dashboard", label: "Tổng quan", icon: <LayoutDashboard size={17} />, roles: ["student"] },
  { id: "profile", label: "Hồ sơ", icon: <UserRound size={17} />, roles: ["student"] },
  { id: "workspace", label: "Không gian học", icon: <BookOpen size={17} />, roles: ["student"] },
  { id: "reels", label: "Tech Reels", icon: <Play size={17} />, roles: ["student"] },
  { id: "github", label: "Review bài tập", icon: <GitFork size={17} />, roles: ["instructor"] },
  { id: "xp-shop", label: "XP Shop", icon: <ShoppingBag size={17} />, roles: ["student"] },
  { id: "instructor", label: "Giảng viên", icon: <GraduationCap size={17} />, roles: ["instructor"] },
  { id: "admin", label: "Quản trị", icon: <Shield size={17} />, roles: ["admin"] },
];

const roleLabel: Record<Role, string> = {
  student: "Học viên",
  instructor: "Giảng viên",
  admin: "Quản trị viên",
};

const avatarLabel: Record<AvatarStyle, string> = {
  initials: "A",
  pixel: "PX",
  coder: "</>",
  robot: "AI",
  silver: "Ag",
};

const badgeLabel: Record<BadgeFrame, string> = {
  streak: "14-day Streak",
  quiz: "Quiz Slayer",
  mindmap: "Mindmap Builder",
  rookie: "Code Lab Rookie",
  explorer: "OOP Explorer",
};

export default function Sidebar({ screen, role, theme, avatarStyle, badgeFrame, onToggleTheme, onNavigate, onLogout }: Props) {
  const visible = items.filter((item) => item.roles.includes(role));
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ${collapsed ? "w-[68px]" : "w-[218px]"}`}>
      <div className="border-b border-slate-200 px-4 py-4">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="theme-primary-bg flex h-8 w-8 items-center justify-center rounded-md text-white">
            <Zap size={16} fill="currentColor" />
          </div>
          {!collapsed && <div>
            <div className="font-semibold tracking-tight text-slate-950">CODE-MIND</div>
            <div className="text-xs text-slate-500">AI learning operating system</div>
          </div>}
        </div>
      </div>

      <div className={`px-3 py-3 ${collapsed ? "hidden" : ""}`}>
        <button
          onClick={() => role === "student" && onNavigate("profile")}
          className={`w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-left transition ${
            role === "student" ? "hover:border-blue-200 hover:bg-blue-50" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            {role === "student" && (
              <span className={`student-avatar student-avatar-${avatarStyle} flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black`}>
                {avatarLabel[avatarStyle]}
              </span>
            )}
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{roleLabel[role]}</div>
              <div className="mt-1 truncate text-sm font-medium text-slate-900">
                {role === "student" ? "Nguyễn Văn A" : role === "instructor" ? "Cô Trần Thị B" : "Admin AIO"}
              </div>
            </div>
          </div>
          {role === "student" && <div className="mt-2 truncate text-xs font-semibold text-amber-600">{badgeLabel[badgeFrame]}</div>}
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Đang hoạt động
          </div>
        </button>
      </div>

      <nav className={`flex flex-1 flex-col gap-1 px-3 ${collapsed ? "items-center" : ""}`}>
        <button
          onClick={() => setCollapsed((value) => !value)}
          className="sidebar-nav-item mb-1 flex h-9 w-full items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
          title={collapsed ? "Mở sidebar" : "Thu sidebar"}
        >
          {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
        </button>
        {visible.map((item) => {
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`sidebar-nav-item flex items-center rounded-lg text-left transition ${
                active ? "sidebar-nav-active theme-primary-soft" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              } ${collapsed ? "h-10 w-10 justify-center p-0" : "gap-2.5 px-2.5 py-2"}`}
            >
              <span className={active ? "theme-primary-text" : "text-slate-400"}>{item.icon}</span>
              {!collapsed && <span className="min-w-0 flex-1 text-sm font-medium">{item.label}</span>}
              {active && !collapsed && <ChevronRight size={15} />}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        {!collapsed && (
          <>
        <div className="mb-2.5 rounded-lg bg-slate-950 p-2.5 text-white">
          <div className="text-xs text-slate-300">Lớp hiện tại</div>
          <div className="mt-1 text-sm font-medium">OOP - Nhóm 01</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
            <div className="theme-primary-progress h-full w-[46%] rounded-full" />
          </div>
        </div>
          </>
        )}
        <button
          onClick={onToggleTheme}
          title={collapsed ? (theme === "light" ? "Dark mode" : "Light mode") : undefined}
          className={`theme-toggle-button mb-2 flex items-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 transition hover:bg-slate-50 ${
            collapsed ? "h-10 w-10 justify-center p-0" : "w-full gap-2 px-3 py-2"
          }`}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          {!collapsed && (theme === "light" ? "Dark mode" : "Light mode")}
        </button>
        <button
          onClick={onLogout}
          title={collapsed ? "Đăng xuất" : undefined}
          className={`sidebar-logout-button flex items-center rounded-lg text-sm text-slate-500 transition hover:bg-red-50 hover:text-red-600 ${
            collapsed ? "h-10 w-10 justify-center p-0" : "w-full gap-2 px-3 py-2"
          }`}
        >
          <LogOut size={16} />
          {!collapsed && "Đăng xuất"}
        </button>
      </div>
    </aside>
  );
}
