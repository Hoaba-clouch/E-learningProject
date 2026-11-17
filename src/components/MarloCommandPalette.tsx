import { useEffect, useState, useRef } from "react";
import {
  Search,
  LayoutDashboard,
  CalendarDays,
  Columns3,
  UserRound,
  BookOpen,
  Play,
  GitFork,
  ShoppingBag,
  GraduationCap,
  Shield,
  ShieldCheck,
  Moon,
  Sun,
  Timer,
  ExternalLink,
  Code2,
  Sparkles,
  Command,
  ArrowRight,
  CornerDownLeft,
} from "lucide-react";
import type { Screen, Theme } from "../App";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  onToggleTheme?: () => void;
  theme?: Theme;
  onStartTimer?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Điều hướng" | "Khóa học" | "Thao tác nhanh";
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export default function MarloCommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onToggleTheme,
  theme,
  onStartTimer,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setShouldRender(false);
      setIsClosing(false);
    }, 220);
  };

  // Command items definitions
  const commands: CommandItem[] = [
    // Navigation
    {
      id: "nav-dash",
      title: "Tổng quan Dashboard",
      subtitle: "Bảng điều khiển học tập, chuỗi ngày streak & XP",
      category: "Điều hướng",
      icon: <LayoutDashboard size={16} className="text-blue-500" />,
      action: () => { onNavigate("student-dashboard"); onClose(); },
    },
    {
      id: "nav-schedule",
      title: "Lịch thi & Hẹn gặp Giảng viên",
      subtitle: "Lịch thi thực hành máy, vấn đáp đồ án & ca hẹn 1-on-1",
      category: "Điều hướng",
      icon: <CalendarDays size={16} className="text-amber-500" />,
      action: () => { onNavigate("schedule"); onClose(); },
    },
    {
      id: "nav-kanban",
      title: "Dự án & Kanban Đồ án",
      subtitle: "Sprint backlog, MoSCoW, Story Points & Thẩm định DoD",
      category: "Điều hướng",
      icon: <Columns3 size={16} className="text-emerald-500" />,
      action: () => { onNavigate("kanban"); onClose(); },
    },
    {
      id: "nav-workspace",
      title: "Không gian học & Bài giảng",
      subtitle: "Lý thuyết OOP, Video tương tác F8 & Trắc nghiệm",
      category: "Điều hướng",
      icon: <BookOpen size={16} className="text-indigo-500" />,
      action: () => { onNavigate("workspace"); onClose(); },
    },
    {
      id: "nav-defense",
      title: "AI Defense Room - Hội đồng Phản biện AI 1:1",
      subtitle: "Phòng mô phỏng bảo vệ đồ án tốt nghiệp với 3 giám khảo AI Tech Lead",
      category: "Điều hướng",
      icon: <ShieldCheck size={16} className="text-amber-500" />,
      action: () => { onNavigate("defense-room"); onClose(); },
    },
    {
      id: "nav-git",
      title: "Git & Kho mã nguồn",
      subtitle: "Cây phân nhánh Git, Sơ đồ kiến trúc & Thống kê nhóm",
      category: "Điều hướng",
      icon: <GitFork size={16} className="text-purple-500" />,
      action: () => { onNavigate("github"); onClose(); },
    },
    {
      id: "nav-profile",
      title: "Hồ sơ cá nhân & Thành tích",
      subtitle: "Bảng nhiệt đóng góp, huy hiệu & VAK Learning Profile",
      category: "Điều hướng",
      icon: <UserRound size={16} className="text-pink-500" />,
      action: () => { onNavigate("profile"); onClose(); },
    },
    {
      id: "nav-reels",
      title: "Tech Reels (Video ngắn công nghệ)",
      subtitle: "Vi bài giảng 60s, mẹo debug & kiến trúc hệ thống",
      category: "Điều hướng",
      icon: <Play size={16} className="text-rose-500" />,
      action: () => { onNavigate("reels"); onClose(); },
    },
    {
      id: "nav-xpshop",
      title: "XP Shop - Đổi quà & Skins",
      subtitle: "Trang phục Mascot, khung avatar & hình nền phong cách",
      category: "Điều hướng",
      icon: <ShoppingBag size={16} className="text-yellow-600" />,
      action: () => { onNavigate("xp-shop"); onClose(); },
    },

    // Courses
    {
      id: "course-oop",
      title: "CS201 • Lập trình Hướng đối tượng C++ & OOP",
      subtitle: "Con trỏ, vtable, Virtual Methods & Dynamic Dispatch",
      category: "Khóa học",
      icon: <Code2 size={16} className="text-blue-600" />,
      action: () => { onNavigate("workspace"); onClose(); },
    },
    {
      id: "course-api",
      title: "CS304 • Kiến trúc Web API & Microservices",
      subtitle: "RESTful, SQLAlchemy, JWT Authentication & Docker",
      category: "Khóa học",
      icon: <Code2 size={16} className="text-emerald-600" />,
      action: () => { onNavigate("workspace"); onClose(); },
    },
    {
      id: "course-dsa",
      title: "CS102 • Cấu trúc dữ liệu & Giải thuật nâng cao",
      subtitle: "Đồ thị Dijkstra, DSU, Segment Tree & Big-O",
      category: "Khóa học",
      icon: <Code2 size={16} className="text-amber-600" />,
      action: () => { onNavigate("workspace"); onClose(); },
    },

    // Quick Actions
    {
      id: "act-theme",
      title: theme === "light" ? "Chuyển sang Giao diện Tối (Dark mode)" : "Chuyển sang Giao diện Sáng (Light mode)",
      subtitle: "Thay đổi bảng màu hệ thống theo phong cách Marlo",
      category: "Thao tác nhanh",
      icon: theme === "light" ? <Moon size={16} className="text-slate-700" /> : <Sun size={16} className="text-amber-400" />,
      action: () => { onToggleTheme?.(); onClose(); },
    },
    {
      id: "act-timer",
      title: "Bật đồng hồ tập trung Pomodoro (25 phút)",
      subtitle: "Khởi động phiên học tập trung không phân tâm",
      category: "Thao tác nhanh",
      icon: <Timer size={16} className="text-amber-500" />,
      shortcut: "P",
      action: () => { onStartTimer?.(); onClose(); },
    },
  ];

  // Filter commands
  const filtered = query.trim()
    ? commands.filter((c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/50 backdrop-blur-sm pointer-events-auto ${
        isClosing ? "marlo-scrim-out" : "marlo-scrim"
      }`}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#16171a] shadow-2xl overflow-hidden flex flex-col ${
          isClosing ? "marlo-modal-out" : "marlo-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm màn hình, môn học, tác vụ hoặc lệnh nhanh..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none font-medium"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Không tìm thấy lệnh hoặc khóa học nào khớp với "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  data-index={idx}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-1 ring-blue-300 dark:ring-blue-700/60"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="text-xs font-bold leading-tight truncate flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[9.5px] font-mono font-normal px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 text-slate-400">
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <CornerDownLeft size={13} className="text-blue-600 dark:text-blue-400 animate-in fade-in" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ để di chuyển</span>
            <span>↵ để chọn</span>
            <span>esc để thoát</span>
          </div>
          <span className="text-blue-600 dark:text-blue-400 font-semibold font-sans">
            CodeMind Campus Navigator
          </span>
        </div>
      </div>
    </div>
  );
}
