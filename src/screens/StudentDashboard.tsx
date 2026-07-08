import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Eye,
  Flame,
  GitFork,
  Headphones,
  Lock,
  Crown,
  Shield,
  MessageSquareText,
  MousePointer2,
  PlayCircle,
  Star,
  Target,
  Trophy,
  X,
} from "lucide-react";
import type { Screen } from "../App";
import type { AvatarStyle, BadgeFrame, SkillMapSkin } from "../App";

interface Props {
  avatarStyle: AvatarStyle;
  skillMapSkin: SkillMapSkin;
  badgeFrame: BadgeFrame;
  onNavigate: (s: Screen) => void;
}

const nodes = [
  { id: 1, level: "Lv.1", label: "OOP căn bản", caption: "2 bài", xp: "+120 XP", status: "done", x: 50, y: 16 },
  { id: 2, level: "Lv.2", label: "Kế thừa", caption: "đã mở", xp: "+80 XP", status: "done", x: 27, y: 36 },
  { id: 3, level: "Lv.3", label: "Đa hình", caption: "đang học", xp: "+150 XP", status: "active", x: 66, y: 36 },
  { id: 4, level: "Lv.4", label: "Interface", caption: "kế tiếp", xp: "+90 XP", status: "next", x: 42, y: 61 },
  { id: 5, level: "Boss", label: "Abstract class", caption: "cần quiz", xp: "+100 XP", status: "locked", x: 76, y: 61 },
  { id: 6, level: "Gate", label: "SOLID", caption: "cuối chương", xp: "+180 XP", status: "locked", x: 56, y: 82 },
];

const edges = [
  [1, 2, "done"],
  [1, 3, "done"],
  [2, 4, "done"],
  [4, 3, "next"],
  [3, 5, "locked"],
  [4, 6, "locked"],
  [6, 5, "locked"],
];

const nodeStyle: Record<string, string> = {
  done: "skill-node-done",
  active: "skill-node-active",
  next: "skill-node-next",
  locked: "skill-node-locked",
};

const edgeStyle: Record<string, string> = {
  done: "skill-edge-done",
  next: "skill-edge-next",
  locked: "skill-edge-locked",
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

const vakProfile = [
  { label: "Visual", value: 72, icon: <Eye size={15} />, desc: "nhìn sơ đồ trước" },
  { label: "Auditory", value: 38, icon: <Headphones size={15} />, desc: "nghe nhắc lại ngắn" },
  { label: "Kinesthetic", value: 64, icon: <MousePointer2 size={15} />, desc: "làm quiz/code ngay" },
];

const personalTasks = [
  "Xem lại flow override bằng sơ đồ 3 node",
  "Làm 5 câu quiz Đa hình trước khi mở bài mới",
  "Vẽ thêm quan hệ Animal -> Dog -> speak()",
];

const vakDetails: Record<string, { title: string; explanation: string; action: string }> = {
  Visual: {
    title: "Phóng đại hình ảnh (Visual Learner)",
    explanation: "Bạn ghi nhớ thông tin tốt nhất khi được tổ chức trực quan. AI Mentor khuyên bạn nên sử dụng tab 'Mindmap Canvas' để liên kết các khái niệm OOP trước khi viết code.",
    action: "Hãy vẽ 3 node mindmap hôm nay để nhận +30 XP!",
  },
  Auditory: {
    title: "Trải nghiệm âm thanh (Auditory Learner)",
    explanation: "Bạn học hiệu quả nhất thông qua giọng đọc và diễn giải âm thanh. AI Mentor đã tạo sẵn giọng nói thuyết minh bài đọc đầy đủ có thể kéo tua và chọn tốc độ đọc.",
    action: "Nghe thuyết minh bài 1.3 và hoàn thành mục tiêu hôm nay nhé!",
  },
  Kinesthetic: {
    title: "Thực hành thực tế (Kinesthetic Learner)",
    explanation: "Bạn tiếp thu nhanh nhất khi trực tiếp tương tác, viết thử code và làm quiz kiểm tra ngay lập tức. Hãy sử dụng tab 'Code Lab' chia đôi màn hình có AI Review.",
    action: "Hãy chạy thử code Java và làm Quiz trắc nghiệm đạt trên 70% nhé!",
  },
};

export default function StudentDashboard({ avatarStyle, skillMapSkin, badgeFrame, onNavigate }: Props) {
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });

  const [totalXp, setTotalXp] = useState(3240);
  const [tasks, setTasks] = useState([
    { id: 1, label: "Làm quiz Đa hình", xp: 50, done: false },
    { id: 2, label: "Xem 1 Tech Reel", xp: 10, done: false },
    { id: 3, label: "Cập nhật bài theo review", xp: 80, done: false },
    { id: 4, label: "Ôn lại super()", xp: 0, done: true },
  ]);
  const [selectedVak, setSelectedVak] = useState<string | null>(null);

  const toggleTask = (id: number) => {
    setTasks((current) =>
      current.map((task) => {
        if (task.id === id) {
          const nextDone = !task.done;
          if (nextDone) {
            setTotalXp((xp) => xp + task.xp);
          } else {
            setTotalXp((xp) => xp - task.xp);
          }
          return { ...task, done: nextDone };
        }
        return task;
      })
    );
  };

  useEffect(() => {
    const viewport = mapViewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = 90;
    viewport.scrollTop = 26;
  }, []);

  const handleMapPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const viewport = mapViewportRef.current;
    if (!viewport) return;
    isPanningRef.current = true;
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
    viewport.setPointerCapture(event.pointerId);
  };

  const handleMapPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return;
    const viewport = mapViewportRef.current;
    if (!viewport) return;
    viewport.scrollLeft = panStartRef.current.left - (event.clientX - panStartRef.current.x);
    viewport.scrollTop = panStartRef.current.top - (event.clientY - panStartRef.current.y);
  };

  const stopMapPan = (event: PointerEvent<HTMLDivElement>) => {
    isPanningRef.current = false;
    if (mapViewportRef.current?.hasPointerCapture(event.pointerId)) {
      mapViewportRef.current.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="min-h-full p-5 relative">
      <header className="mb-6 flex min-w-0 items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span className={`student-avatar student-avatar-${avatarStyle} flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-black border-2 border-white dark:border-slate-800 shadow-md`}>
            {avatarLabel[avatarStyle]}
          </span>
          <div className="min-w-0">
            <div className="theme-primary-text truncate text-xs font-bold uppercase tracking-wider">Lập trình hướng đối tượng - Nhóm 01</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white leading-tight">Chào trở lại, Nguyễn Văn A</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <p className="min-w-0 text-sm text-slate-500 dark:text-slate-400">Hôm nay nên hoàn thành quiz Đa hình và phác thảo mindmap chương 1.</p>
              <span className="rounded-full border border-amber-200 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">{badgeLabel[badgeFrame]}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {[
            { icon: <Flame size={15} />, value: "14", label: "ngày streak", tone: "text-amber-755 bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60" },
            { icon: <Star size={15} />, value: totalXp.toLocaleString(), label: "XP tích lũy", tone: "text-teal-700 bg-teal-50/60 dark:bg-emerald-950/20 border-teal-200 dark:border-emerald-900/60" },
            { icon: <Trophy size={15} />, value: "Bạc", label: "Hạng giải", tone: "theme-primary-soft theme-primary-border border" },
          ].map((item) => (
            <div key={item.label} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 ${item.tone} shadow-sm`}>
              {item.icon}
              <div>
                <div className="text-sm font-black leading-none">{item.value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-80">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-4">
        <section className="space-y-4">
          <div className="surface rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">Bài học đang theo học</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">1.3 Đa hình và ghi đè phương thức (Polymorphism)</p>
              </div>
              <button
                onClick={() => onNavigate("workspace")}
                className="theme-primary-bg flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition shadow-md hover:opacity-90 active:scale-[0.98]"
              >
                Tiếp tục học
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { icon: <BookOpen size={15} />, label: "Bài đọc lý thuyết", status: "Đã đọc xong", done: true },
                { icon: <PlayCircle size={15} />, label: "Video tóm tắt", status: "4:32 phút", done: true },
                { icon: <MessageSquareText size={15} />, label: "Quiz nhanh", status: "Cần đạt >= 70%", done: false },
                { icon: <GitFork size={15} />, label: "Bài tập code", status: "Chờ review", done: false },
              ].map((step) => (
                <div key={step.label} className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3.5 hover:shadow-md transition duration-200">
                  <div className="flex justify-between items-start">
                    <div className={`p-1.5 rounded-lg ${
                      step.done
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450"
                        : "bg-slate-150 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400"
                    }`}>
                      {step.icon}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      step.done
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-450"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-450 dark:text-slate-500"
                    }`}>
                      {step.done ? "Đã xong" : "Chưa làm"}
                    </span>
                  </div>
                  <div className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">{step.label}</div>
                  <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{step.status}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="personal-plan surface overflow-hidden rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="theme-primary-bg flex h-8 w-8 items-center justify-center rounded-xl text-white">
                  <BrainCircuit size={17} />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-950 dark:text-white">Lộ trình cá nhân hoá AI</h2>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Học máy ưu tiên Visual + Kinesthetic cho Nguyễn Văn A.</p>
                </div>
              </div>
              <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-400">
                VAK Profile
              </span>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_320px] gap-4">
              <div className="grid grid-cols-3 gap-2.5">
                {vakProfile.map((item, index) => {
                  const colors = [
                    { bar: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" },
                    { bar: "bg-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400" },
                    { bar: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" }
                  ][index];
                  return (
                    <button
                      key={item.label}
                      onClick={() => setSelectedVak(item.label)}
                      className="vak-card text-left w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3.5 hover:border-blue-300 dark:hover:border-blue-700 transition hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${colors.bg}`}>{item.icon}</span>
                          {item.label}
                        </span>
                        <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300">{item.value}%</span>
                      </div>
                      <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${item.value}%` }} />
                      </div>
                      <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 leading-tight">{item.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 text-white shadow-xl">
                <div className="mb-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Target size={15} className="text-emerald-400" />
                    Nhiệm vụ hợp gu
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-300">hôm nay</span>
                </div>
                <div className="space-y-2">
                  {personalTasks.map((task, index) => (
                    <div key={task} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-3 hover:bg-white/10 transition">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[10px] font-black text-slate-950 shadow-md shadow-emerald-500/20">
                        {index + 1}
                      </span>
                      <span className="text-xs leading-5 text-slate-350">{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="surface rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950 dark:text-white">Bản đồ kỹ năng OOP</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Mở khóa bài mới bằng quiz, không chặn tiến độ vì bài tập lớn.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">2/6 hoàn thành</span>
            </div>
            <div className={`skill-map skill-map-${skillMapSkin} relative h-[460px] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800`}>
              <div
                ref={mapViewportRef}
                onPointerDown={handleMapPointerDown}
                onPointerMove={handleMapPointerMove}
                onPointerUp={stopMapPan}
                onPointerCancel={stopMapPan}
                onPointerLeave={stopMapPan}
                className="skill-map-viewport absolute inset-0 overflow-scroll"
              >
                <div className={`skill-map-world pc-canvas-bg skill-map-world-${skillMapSkin}`}>
                  <div className="skill-reward absolute left-[47%] top-[73%] z-[3]">
                    <Star size={14} />
                    +180 XP
                  </div>
<svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <marker id="skill-arrow-done" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 z" fill="#10b981" />
                      </marker>
                      <marker id="skill-arrow-next" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 z" fill="#cbd5e1" />
                      </marker>
                      <marker id="skill-arrow-locked" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                        <path d="M0,0 L8,4 L0,8 z" fill="#94a3b8" />
                      </marker>
                    </defs>
                     {edges.map(([from, to, status], index) => {
                      const start = nodes.find((node) => node.id === from)!;
                      const end = nodes.find((node) => node.id === to)!;
                      const curve = index % 2 === 0 ? -8 : 8;
                      const midX = (start.x + end.x) / 2;
                      const midY = (start.y + end.y) / 2 + curve;
                      return (
                        <g key={index}>
                          {/* Static background path */}
                          <path
                            d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
                            className={`skill-edge ${edgeStyle[status as string]}`}
                            markerEnd={`url(#skill-arrow-${status})`}
                          />
                          {/* Animated flow path for active connections - made thin and delicate */}
                          {status === "done" && (
                            <path
                              d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="1.2"
                              strokeDasharray="3, 8"
                              strokeLinecap="round"
                              className="animate-flow-dash opacity-50"
                            />
                          )}
                          {status === "next" && (
                            <path
                              d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
                              fill="none"
                              stroke="#3b82f6"
                              strokeWidth="1.2"
                              strokeDasharray="3, 8"
                              strokeLinecap="round"
                              className="animate-flow-dash opacity-50"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                  {nodes.map((node) => {
                    const isBoss = node.level === "Boss";
                    const isGate = node.level === "Gate";
                    const isDone = node.status === "done";
                    const isActive = node.status === "active";
                    const isNext = node.status === "next";
                    const isLocked = node.status === "locked";

                    return (
                      <button
                        key={node.id}
                        onClick={() => {
                          if (node.status !== "locked") {
                            onNavigate("workspace");
                          }
                        }}
                        className={`skill-node absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center outline-none focus:outline-none transition-all duration-300 ${nodeStyle[node.status]}`}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                      >
                        {/* Level badge with gamified icons */}
                        <span className={`skill-node-level flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border transition shadow-sm ${
                          isBoss
                            ? "bg-gradient-to-r from-red-650 to-amber-600 text-white border-red-400/30 shadow-red-500/20"
                            : isGate
                            ? "bg-gradient-to-r from-indigo-600 to-purple-650 text-white border-indigo-400/30 shadow-indigo-500/20"
                            : isDone
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-450"
                            : isActive
                            ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20"
                            : "bg-slate-900/80 text-slate-350 border-slate-750"
                        }`}>
                          {isBoss && <Crown size={10} className="animate-bounce" />}
                          {isGate && <Shield size={10} />}
                          {node.level}
                        </span>

                        {/* Tech multi-layered node orb */}
                        <div className={`relative p-1.5 rounded-full transition-all duration-300 ${
                          isBoss
                            ? isLocked ? "border-slate-800 bg-slate-900/60 scale-100" : "border-red-500/40 bg-red-950/20 scale-110 shadow-lg shadow-red-500/20"
                            : isActive
                            ? "border-blue-500/30 bg-blue-500/5 shadow-md shadow-blue-500/10"
                            : isDone
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-transparent bg-transparent"
                        }`}>
                          {/* Rotating outer tech ring */}
                          <span className={`absolute inset-0 rounded-full border border-dashed pointer-events-none opacity-50 ${
                            isActive ? "border-blue-400 animate-[spin_10s_linear_infinite]" :
                            isBoss && !isLocked ? "border-red-500 animate-[spin_8s_linear_infinite]" :
                            isDone ? "border-emerald-400" : "border-transparent"
                          }`} />

                          {/* Inner Orb Core with glossy gradients */}
                          <div className={`relative flex items-center justify-center rounded-full transition-all duration-300 shadow-md overflow-hidden ${
                            isBoss
                              ? isLocked
                                ? "h-16 w-16 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-slate-500"
                                : "h-16 w-16 bg-gradient-to-br from-red-600 via-red-750 to-rose-900 border-2 border-red-400 text-white shadow-lg shadow-red-500/30 scale-105"
                              : isActive
                              ? "h-14 w-14 bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-750 border-2 border-blue-300 text-white shadow-lg shadow-blue-500/35 scale-105"
                              : isDone
                              ? "h-14 w-14 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 border border-emerald-300 text-white shadow-sm"
                              : isNext
                              ? "h-14 w-14 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-blue-400"
                              : "h-14 w-14 bg-gradient-to-br from-slate-900 via-slate-950 to-black border border-slate-800 text-slate-600"
                          }`}>
                            {isDone ? (
                              <CheckCircle2 size={20} className="text-white drop-shadow" />
                            ) : isLocked ? (
                              <Lock size={17} />
                            ) : isBoss ? (
                              <Crown size={22} className="text-white animate-pulse" />
                            ) : (
                              <BookOpen size={18} />
                            )}

                            {/* Floating glossy glass reflection overlay */}
                            <span className="absolute top-0.5 left-2 right-2 h-2.5 bg-white/20 rounded-full filter blur-[0.5px] pointer-events-none" />
                          </div>

                          {/* Pulse wave for active node */}
                          {isActive && (
                            <span className="absolute -inset-0.5 rounded-full border-2 border-blue-400/40 animate-ping opacity-75 pointer-events-none" />
                          )}
                          {/* Fiery particles/rings for boss node (if unlocked) */}
                          {isBoss && !isLocked && (
                            <span className="absolute -inset-1 rounded-full border border-red-500 animate-pulse opacity-85 pointer-events-none" />
                          )}
                        </div>

                        {/* Label */}
                        <span className={`skill-node-label font-black tracking-tight mt-2 text-center text-xs ${
                          isBoss
                            ? "text-red-500 dark:text-red-400 text-sm font-black uppercase tracking-wider text-shadow-md"
                            : "text-slate-800 dark:text-white"
                        }`}>
                          {node.label}
                        </span>
                        
                        <span className="skill-node-caption">{node.caption}</span>
                        <span className="skill-node-xp">{node.xp}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="absolute inset-x-5 bottom-4 z-[3]">
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span>46%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
                  <div className="theme-primary-progress h-full w-[46%] rounded-full" />
                </div>
              </div>
              <div className="pointer-events-none absolute left-4 top-4 z-[3] rounded-full border border-emerald-300/30 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-emerald-100 backdrop-blur">
                Campaign 01 · OOP Trail
              </div>
              <div className="pointer-events-none absolute right-4 top-4 z-[3] rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100 shadow-lg backdrop-blur">
                Boss khóa: Abstract class
              </div>
              <div className="pointer-events-none absolute right-4 bottom-12 z-[3] rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-[11px] font-semibold text-slate-300 backdrop-blur">
                Kéo nền để xem map
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="surface rounded-xl p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">Việc hôm nay</h2>
              <Clock3 size={15} className="text-slate-400" />
            </div>
            {/* Interactive checklist */}
            <div className="mt-3 space-y-2">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center gap-3 text-left w-full hover:bg-slate-50 dark:hover:bg-slate-800/40 p-1.5 rounded-lg transition"
                >
                  <span className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                    task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white dark:bg-slate-800"
                  }`}>
                    {task.done && <CheckCircle2 size={10} className="stroke-[3]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-medium ${task.done ? "text-slate-450 dark:text-slate-500 line-through animate-pulse" : "text-slate-800 dark:text-slate-200"}`}>
                      {task.label}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                      {task.done ? "đã xong" : `+${task.xp} XP`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="surface rounded-xl p-4">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">Gợi ý từ AI mentor</h2>
            <div className="mt-3 rounded-xl bg-slate-950 p-3.5 text-white">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Theo hồ sơ Visual/Kinetic</div>
                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">cá nhân</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Bài quiz gần nhất sai ở nhóm `super()` và override. Nên mở workspace, xem sơ đồ Animal/Dog rồi tự kéo thêm một node quan hệ kế thừa trước khi làm quiz.
              </p>
            </div>
          </div>

          <div className="surface rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">Bảng Bạc</h2>
              <span className="text-xs text-slate-400">Tuần 28</span>
            </div>
            <div className="space-y-2">
              {[
                ["Trần Thị B", "1,240 XP", false],
                ["Lê Văn C", "980 XP", false],
                ["Nguyễn Văn A", "840 XP", true],
                ["Phạm Thị D", "720 XP", false],
              ].map(([name, xp, me], index) => (
                <div key={name as string} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${me ? "theme-primary-soft" : "bg-slate-50 dark:bg-slate-900/40"}`}>
                  <span className={`w-5 text-sm font-semibold ${index < 2 ? "text-amber-600" : "text-slate-400"}`}>{index + 1}</span>
                  {me && <span className={`student-avatar student-avatar-${avatarStyle} flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-black`}>{avatarLabel[avatarStyle]}</span>}
                  <span className={`flex-1 text-sm ${me ? "theme-primary-text font-semibold" : "text-slate-750 dark:text-slate-300"}`}>{name}</span>
                  <span className="text-xs text-slate-500">{xp}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ── VAK EXPLANATION MODAL ── */}
      {selectedVak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl animate-in scale-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BrainCircuit size={16} className="text-blue-500 shrink-0" />
                {vakDetails[selectedVak].title}
              </h3>
              <button
                onClick={() => setSelectedVak(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={15} />
              </button>
            </div>
            
            <div className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-400 space-y-3">
              <p>{vakDetails[selectedVak].explanation}</p>
              <div className="rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-2.5 text-blue-700 dark:text-blue-300 font-semibold">
                🎯 {vakDetails[selectedVak].action}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedVak(null)}
                className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-355 hover:bg-slate-200 transition"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
