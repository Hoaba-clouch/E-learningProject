import { useEffect, useRef, type PointerEvent } from "react";
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
  MessageSquareText,
  MousePointer2,
  PlayCircle,
  Star,
  Target,
  Trophy,
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

export default function StudentDashboard({ avatarStyle, skillMapSkin, badgeFrame, onNavigate }: Props) {
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });

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
    <div className="min-h-full p-5">
      <header className="mb-5 flex min-w-0 items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`student-avatar student-avatar-${avatarStyle} flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-black`}>
            {avatarLabel[avatarStyle]}
          </span>
          <div className="min-w-0">
            <div className="theme-primary-text truncate text-sm font-medium">Lập trình hướng đối tượng - Nhóm 01</div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Chào trở lại, Nguyễn Văn A</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="min-w-0 text-sm text-slate-500">Hôm nay nên hoàn thành quiz Đa hình và phác thảo mindmap chương 1.</p>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{badgeLabel[badgeFrame]}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {[
            { icon: <Flame size={15} />, value: "14", label: "ngày streak", tone: "text-amber-700 bg-amber-50 border-amber-200" },
            { icon: <Star size={15} />, value: "3,240", label: "XP", tone: "text-teal-700 bg-teal-50 border-teal-200" },
            { icon: <Trophy size={15} />, value: "Bạc", label: "league", tone: "theme-primary-soft theme-primary-border border" },
          ].map((item) => (
            <div key={item.label} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${item.tone}`}>
              {item.icon}
              <div>
                <div className="text-sm font-semibold leading-none">{item.value}</div>
                <div className="mt-0.5 text-[11px] opacity-75">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-4">
        <section className="space-y-4">
          <div className="surface rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Bài đang học</h2>
                <p className="mt-1 text-sm text-slate-500">1.3 Đa hình và ghi đè phương thức</p>
              </div>
              <button
                onClick={() => onNavigate("workspace")}
                className="theme-primary-bg flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition"
              >
                Tiếp tục học
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2.5">
              {[
                { icon: <BookOpen size={15} />, label: "Bài đọc", status: "Đã đọc", done: true },
                { icon: <PlayCircle size={15} />, label: "Video", status: "4:32 phút", done: true },
                { icon: <MessageSquareText size={15} />, label: "Quiz", status: "Cần đạt 70%", done: false },
                { icon: <GitFork size={15} />, label: "Bài tập", status: "Đang chờ review", done: false },
              ].map((step) => (
                <div key={step.label} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                  <div className={step.done ? "text-emerald-600" : "text-slate-400"}>{step.icon}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-800">{step.label}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{step.status}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="personal-plan surface overflow-hidden rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="theme-primary-bg flex h-8 w-8 items-center justify-center rounded-lg text-white">
                    <BrainCircuit size={17} />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Lộ trình cá nhân hoá</h2>
                    <p className="mt-0.5 text-sm text-slate-500">AI đang ưu tiên học bằng hình ảnh + thao tác cho Nguyễn Văn A.</p>
                  </div>
                </div>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                VAK profile
              </span>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_320px] gap-4">
              <div className="grid grid-cols-3 gap-2.5">
                {vakProfile.map((item) => (
                  <div key={item.label} className="vak-card rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <span className="theme-primary-soft flex h-7 w-7 items-center justify-center rounded-md">{item.icon}</span>
                        {item.label}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-500">{item.value}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="theme-primary-progress h-full rounded-full" style={{ width: `${item.value}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{item.desc}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-950 p-3 text-white">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Target size={15} className="text-emerald-300" />
                    Nhiệm vụ hợp gu
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-300">hôm nay</span>
                </div>
                <div className="space-y-2">
                  {personalTasks.map((task, index) => (
                    <div key={task} className="flex items-start gap-2 rounded-md bg-white/5 p-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-400/15 text-[11px] font-bold text-emerald-200">
                        {index + 1}
                      </span>
                      <span className="text-xs leading-5 text-slate-300">{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="surface rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Bản đồ kỹ năng OOP</h2>
                <p className="mt-1 text-sm text-slate-500">Mở khóa bài mới bằng quiz, không chặn tiến độ vì bài tập lớn.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">2/6 hoàn thành</span>
            </div>
            <div className={`skill-map skill-map-${skillMapSkin} relative h-[460px] overflow-hidden rounded-xl border border-slate-200`}>
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
                      <path
                        key={index}
                        d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
                        className={`skill-edge ${edgeStyle[status as string]}`}
                        markerEnd={`url(#skill-arrow-${status})`}
                      />
                    );
                  })}
                </svg>
                {nodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => node.status !== "locked" && onNavigate("workspace")}
                    className={`skill-node absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${nodeStyle[node.status]}`}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  >
                    <span className="skill-node-level">{node.level}</span>
                    <span className="skill-node-orb">
                      {node.status === "done" ? <CheckCircle2 size={21} /> : node.status === "locked" ? <Lock size={19} /> : <BookOpen size={20} />}
                    </span>
                    <span className="skill-node-label">{node.label}</span>
                    <span className="skill-node-caption">{node.caption}</span>
                    <span className="skill-node-xp">{node.xp}</span>
                  </button>
                ))}
                </div>
              </div>
              <div className="absolute inset-x-5 bottom-4 z-[3]">
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span>Chapter mastery</span>
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
              <h2 className="text-base font-semibold text-slate-950">Việc hôm nay</h2>
              <Clock3 size={15} className="text-slate-400" />
            </div>
            <div className="mt-3 space-y-2.5">
              {[
                ["Làm quiz Đa hình", "+50 XP", false],
                ["Xem 1 Tech Reel", "+10 XP", false],
                ["Cập nhật bài theo review", "+80 XP", false],
                ["Ôn lại super()", "đã xong", true],
              ].map(([label, xp, done]) => (
                <div key={label as string} className="flex items-center gap-3">
                  <span className={`h-4 w-4 rounded-full border ${done ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>{label}</div>
                    <div className="text-xs text-slate-400">{xp}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface rounded-xl p-4">
            <h2 className="text-base font-semibold text-slate-950">Gợi ý từ AI mentor</h2>
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
              <h2 className="text-base font-semibold text-slate-950">Bảng Bạc</h2>
              <span className="text-xs text-slate-400">Tuần 28</span>
            </div>
            <div className="space-y-2">
              {[
                ["Trần Thị B", "1,240 XP", false],
                ["Lê Văn C", "980 XP", false],
                ["Nguyễn Văn A", "840 XP", true],
                ["Phạm Thị D", "720 XP", false],
              ].map(([name, xp, me], index) => (
                <div key={name as string} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${me ? "theme-primary-soft" : "bg-slate-50"}`}>
                  <span className={`w-5 text-sm font-semibold ${index < 2 ? "text-amber-600" : "text-slate-400"}`}>{index + 1}</span>
                  {me && <span className={`student-avatar student-avatar-${avatarStyle} flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-black`}>{avatarLabel[avatarStyle]}</span>}
                  <span className={`flex-1 text-sm ${me ? "theme-primary-text font-semibold" : "text-slate-700"}`}>{name}</span>
                  <span className="text-xs text-slate-500">{xp}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
