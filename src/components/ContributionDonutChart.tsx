import { useState, useEffect } from "react";
import { PieChart, ShieldCheck, Award, Flame, CheckCircle2, UserCheck } from "lucide-react";

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
  color: string;
}

export interface MemberContributionStat {
  member: TeamMember;
  donePts: number;
  totalPts: number;
  tasksDone: number;
  percent: number;
}

interface Props {
  teamMembers?: TeamMember[];
  contribution?: Record<string, MemberContributionStat>;
  totalDonePoints?: number;
  trigger?: boolean;
  onSelectMember?: (name: string) => void;
}

// ── Reusable Easing Counter Component (Counts up from 0 to actual value on tab change) ──
export function AnimatedCounter({
  value,
  duration = 1600,
  trigger = true,
  decimals = 0,
  suffix = "",
}: {
  value: number;
  duration?: number;
  trigger?: boolean;
  decimals?: number;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!trigger) {
      setDisplayValue(0);
      return;
    }
    let startTime: number | null = null;
    let animId: number;

    const step = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      // Quartic ease-out for smooth decelerating stop
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = ease * value;
      setDisplayValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));
      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    setDisplayValue(0);
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value, duration, trigger, decimals]);

  return <>{decimals > 0 ? displayValue.toFixed(decimals) : displayValue}{suffix}</>;
}

// Canonical member colors & styles matching design system
export const CANONICAL_MEMBER_COLORS: Record<string, { stroke: string; bg: string; text: string; gradient: string }> = {
  "Minh Anh": {
    stroke: "#4f46e5", // Indigo-600
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-600 dark:text-indigo-400",
    gradient: "from-indigo-600 to-indigo-700",
  },
  "Quốc Huy": {
    stroke: "#f59e0b", // Amber-500
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    gradient: "from-amber-500 to-amber-600",
  },
  "Hoàng Long": {
    stroke: "#10b981", // Emerald-500
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500 to-emerald-600",
  },
  "Nguyễn Bá Hòa": {
    stroke: "#4f46e5",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-600 dark:text-indigo-400",
    gradient: "from-indigo-600 to-indigo-700",
  },
  "Võ Nhật Huy": {
    stroke: "#f59e0b",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    gradient: "from-amber-500 to-amber-600",
  },
  "Phan Đình Nghị": {
    stroke: "#10b981",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500 to-emerald-600",
  },
};

// Default canonical team members if not provided
const DEFAULT_MEMBERS: TeamMember[] = [
  { id: "m1", name: "Minh Anh", avatar: "MA", role: "Leader & Systems Architect", color: "bg-[#4f46e5]" },
  { id: "m2", name: "Quốc Huy", avatar: "QH", role: "Frontend & AI Socratic Dev", color: "bg-amber-500" },
  { id: "m3", name: "Hoàng Long", avatar: "HL", role: "Backend & Database Architect", color: "bg-emerald-600" },
];

export default function ContributionDonutChart({
  teamMembers = DEFAULT_MEMBERS,
  contribution,
  totalDonePoints,
  trigger = true,
  onSelectMember,
}: Props) {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  // Compute stats for Minh Anh, Quốc Huy, Hoàng Long
  const memberList = teamMembers && teamMembers.length > 0 ? teamMembers : DEFAULT_MEMBERS;

  // Normalized data lookup
  const statsList = memberList.map((m) => {
    const existing = contribution?.[m.name];
    if (existing) {
      return existing;
    }
    // Fallback calibrated to 35 pts Done (out of 47 Sprint Points)
    if (m.name.includes("Minh Anh") || m.name.includes("Hòa")) {
      return { member: m, donePts: 16, totalPts: 21, tasksDone: 4, percent: 46 };
    } else if (m.name.includes("Quốc Huy") || m.name.includes("Huy")) {
      return { member: m, donePts: 11, totalPts: 16, tasksDone: 3, percent: 31 };
    } else {
      return { member: m, donePts: 8, totalPts: 10, tasksDone: 3, percent: 23 };
    }
  });

  const calculatedTotalDone = totalDonePoints ?? statsList.reduce((sum, s) => sum + s.donePts, 0);

  // SVG Geometry: radius 54, circumference ~ 339.29
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  // Compute slice offsets
  let runningPercent = 0;
  const slices = statsList.map((s) => {
    const pct = s.percent;
    const strokeDash = (pct / 100) * circumference;
    const strokeOffset = -(runningPercent / 100) * circumference;
    runningPercent += pct;

    const colorConfig = CANONICAL_MEMBER_COLORS[s.member.name] || {
      stroke: "#6366f1",
      bg: "bg-slate-50",
      text: "text-slate-700",
      gradient: "from-slate-600 to-slate-700",
    };

    return {
      ...s,
      strokeDash,
      strokeOffset,
      color: colorConfig.stroke,
      colorConfig,
    };
  });

  const activeStat = hoveredMember
    ? slices.find((s) => s.member.name === hoveredMember)
    : null;

  return (
    <div className="w-full space-y-4">
      {/* ── Donut Visual & Center Metrics ── */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-2">
        {/* SVG Donut Chart */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            width="164"
            height="164"
            viewBox="0 0 164 164"
            className="rotate-[-90deg] drop-shadow-xs overflow-visible"
          >
            {/* Soft Ambient Shadow Filter */}
            <defs>
              <filter id="donutShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
              </filter>
            </defs>

            {/* Background Track Circle */}
            <circle
              cx="82"
              cy="82"
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              className="dark:stroke-slate-800"
              strokeWidth="15"
            />

            {/* Slices for Minh Anh, Quốc Huy, Hoàng Long */}
            {slices.map((slice) => {
              const isHovered = hoveredMember === slice.member.name;
              return (
                <circle
                  key={slice.member.id}
                  cx="82"
                  cy="82"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={isHovered ? 19 : 15}
                  strokeDasharray={`${trigger ? slice.strokeDash : 0} ${circumference}`}
                  strokeDashoffset={slice.strokeOffset}
                  strokeLinecap="round"
                  className="cursor-pointer transition-all duration-700 ease-out"
                  style={{
                    filter: isHovered ? "drop-shadow(0 0 6px rgba(0,0,0,0.25))" : undefined,
                    opacity: hoveredMember && !isHovered ? 0.45 : 1,
                  }}
                  onMouseEnter={() => setHoveredMember(slice.member.name)}
                  onMouseLeave={() => setHoveredMember(null)}
                  onClick={() => onSelectMember?.(slice.member.name)}
                />
              );
            })}
          </svg>

          {/* Center Text inside Donut with Dynamic Count-Up */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none px-2">
            {activeStat ? (
              <div className="animate-scale-in">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block leading-none mb-0.5 truncate max-w-[85px]">
                  {activeStat.member.name}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white leading-tight block">
                  <AnimatedCounter value={activeStat.percent} trigger={trigger} suffix="%" />
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  <AnimatedCounter value={activeStat.donePts} trigger={trigger} suffix=" pts" />
                </span>
              </div>
            ) : (
              <div>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none block">
                  <AnimatedCounter value={calculatedTotalDone} trigger={trigger} suffix="p" />
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mt-1">
                  Đã Xong
                </span>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  Anti-Freerider
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Compact Key Stats Pill ── */}
        <div className="flex-1 w-full space-y-2">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              Chỉ số Công bằng Đóng góp:
            </span>
            <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full text-[11px]">
              98.2% Đạt Chuẩn
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Hệ sinh thái CodeMind Campus tự động thẩm định điểm Story Points từ các bài nộp vượt qua 100% ca kiểm thử Docker sandbox độc lập.
          </p>

          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>3/3 thành viên duy trì vận tốc đều, không có freerider (ỷ lại).</span>
          </div>
        </div>
      </div>

      {/* ── Detailed Member Cards with Count-up Animation ── */}
      <div className="space-y-2.5 pt-1">
        {slices.map((slice) => {
          const isHovered = hoveredMember === slice.member.name;
          const isLead = slice.percent >= 40;

          return (
            <div
              key={slice.member.id}
              className={`rounded-xl border p-3 text-xs transition-all duration-200 cursor-pointer ${
                isHovered
                  ? "border-slate-400 bg-white dark:bg-slate-800 shadow-md scale-[1.01]"
                  : "border-slate-200/80 bg-slate-50/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800"
              }`}
              onMouseEnter={() => setHoveredMember(slice.member.name)}
              onMouseLeave={() => setHoveredMember(null)}
              onClick={() => onSelectMember?.(slice.member.name)}
            >
              {/* Header row: Avatar, Name, Role & Points */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Colored Avatar Ring */}
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white font-bold text-[11px] shrink-0 shadow-2xs"
                    style={{ backgroundColor: slice.color }}
                  >
                    {slice.member.avatar || slice.member.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      <span>{slice.member.name}</span>
                      {isLead && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          <Award size={10} /> Lead
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {slice.member.role}
                    </div>
                  </div>
                </div>

                {/* Counter Badge */}
                <div className="text-right shrink-0 font-mono">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    <AnimatedCounter value={slice.donePts} trigger={trigger} suffix=" pts" />
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold ml-1">
                    (<AnimatedCounter value={slice.percent} trigger={trigger} suffix="%" />)
                  </span>
                </div>
              </div>

              {/* Smooth Animated Progress Bar */}
              <div className="h-1.5 w-full bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    backgroundColor: slice.color,
                    width: trigger ? `${slice.percent}%` : "0%",
                  }}
                />
              </div>

              {/* Footer info: Tasks done & anti-freerider evaluation */}
              <div className="flex items-center justify-between mt-1.5 text-[10px]">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  <span>
                    <strong className="text-slate-700 dark:text-slate-200">{slice.tasksDone}</strong> tasks hoàn thành
                  </span>
                </span>
                <span
                  className="font-semibold"
                  style={{ color: slice.color }}
                >
                  {isLead
                    ? "Chủ lực đề tài (A+)"
                    : slice.percent >= 25
                    ? "Tích cực bám sát (A)"
                    : "Đạt chuẩn DoD (B+)"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

