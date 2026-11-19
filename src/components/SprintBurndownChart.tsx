import { useState, useId } from "react";
import { TrendingDown, Activity, Sparkles, CheckCircle2, Flame, AlertCircle } from "lucide-react";
import { AnimatedCounter } from "./ContributionDonutChart";

export interface BurndownDayPoint {
  dayLabel: string;
  dateStr: string;
  actualPoints: number | null; // null if day is in future
  idealPoints: number;
  burnedPoints: number;
  highlight?: boolean;
  notes?: string;
}

interface Props {
  totalSprintPoints?: number;
  currentRemainingPoints?: number;
  trigger?: boolean;
}

export default function SprintBurndownChart({
  totalSprintPoints = 47,
  currentRemainingPoints = 12,
  trigger = true,
}: Props) {
  const gradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Exact 7-day schedule for Sprint 1
  const daysData: BurndownDayPoint[] = [
    {
      dayLabel: "N1 (25/10)",
      dateStr: "25/10/2026",
      actualPoints: 47,
      idealPoints: 47.0,
      burnedPoints: 0,
      notes: "Sprint Planning: Cam kết 47 Story Points",
    },
    {
      dayLabel: "N2 (27/10)",
      dateStr: "27/10/2026",
      actualPoints: 44,
      idealPoints: 39.2,
      burnedPoints: 3,
      notes: "Minh Anh hoàn thành đặc tả SRS & 12 Use Cases",
    },
    {
      dayLabel: "N3 (29/10)",
      dateStr: "29/10/2026",
      actualPoints: 38,
      idealPoints: 31.3,
      burnedPoints: 9,
      notes: "Hoàng Long chốt schema ERD & Docker sandbox",
    },
    {
      dayLabel: "N4 (31/10)",
      dateStr: "31/10/2026",
      actualPoints: 28,
      idealPoints: 23.5,
      burnedPoints: 19,
      notes: "Quốc Huy hoàn thành JWT Auth & AI Hint Ladder",
    },
    {
      dayLabel: "N5 (02/11)",
      dateStr: "02/11/2026",
      actualPoints: 18,
      idealPoints: 15.7,
      burnedPoints: 29,
      notes: "Chạy thử sandbox 500 bài nộp & tích hợp CI/CD",
    },
    {
      dayLabel: "N6 (Hôm nay)",
      dateStr: "04/11/2026",
      actualPoints: currentRemainingPoints,
      idealPoints: 7.8,
      burnedPoints: totalSprintPoints - currentRemainingPoints,
      highlight: true,
      notes: "Đang đóng gói và hoàn tất tài liệu nghiệm thu",
    },
    {
      dayLabel: "N7 (Cuối)",
      dateStr: "07/11/2026",
      actualPoints: null, // Future target
      idealPoints: 0.0,
      burnedPoints: 47,
      notes: "Sprint Review & Báo cáo Hội đồng Phản biện",
    },
  ];

  // SVG Coordinate mapping:
  // Width: 520, Height: 230
  // Chart Area: X from 55 to 485 (width = 430), Y from 30 (max 47 pts) to 190 (0 pts) (height = 160)
  const chartXStart = 55;
  const chartXEnd = 485;
  const chartYTop = 30; // represents 47 pts
  const chartYBottom = 190; // represents 0 pts
  const totalDays = daysData.length; // 7

  const getX = (index: number) => {
    return chartXStart + (index / (totalDays - 1)) * (chartXEnd - chartXStart);
  };

  const getY = (points: number) => {
    const clamped = Math.max(0, Math.min(points, totalSprintPoints));
    return chartYBottom - (clamped / totalSprintPoints) * (chartYBottom - chartYTop);
  };

  // Ideal line points
  const idealStart = { x: getX(0), y: getY(totalSprintPoints) };
  const idealEnd = { x: getX(totalDays - 1), y: getY(0) };

  // Actual points up to Day 6 (index 5)
  const actualDays = daysData.filter((d) => d.actualPoints !== null);
  const actualCoords = actualDays.map((d, i) => ({
    x: getX(i),
    y: getY(d.actualPoints!),
    point: d,
    index: i,
  }));

  const actualPolylinePoints = actualCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  // Polygon for area fill
  const areaPolygonPoints = `${actualCoords[0].x},${chartYBottom} ` +
    actualCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ") +
    ` ${actualCoords[actualCoords.length - 1].x},${chartYBottom}`;

  const burnedSoFar = totalSprintPoints - currentRemainingPoints;
  const percentBurned = Math.round((burnedSoFar / totalSprintPoints) * 100);

  return (
    <div className="w-full flex flex-col justify-between space-y-3">
      {/* ── Top Header & Legend ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <TrendingDown size={16} className="text-rose-600" />
            <span>Biểu đồ Sprint Burndown Chart (Đường Cháy việc)</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Đường lý tưởng dốc từ <strong>{totalSprintPoints} pts</strong> về <strong>0 pts</strong>; đường đỏ phản ánh tiến độ đốt cháy task thực tế.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-b-2 border-dashed border-slate-400" />
            <span className="text-slate-500 dark:text-slate-400">Lý tưởng (47p → 0p)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-rose-500 shadow-2xs" />
            <span className="font-bold text-rose-600 dark:text-rose-400">Thực tế (Red Line)</span>
          </div>
        </div>
      </div>

      {/* ── SVG Chart Viewport ── */}
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-50/70 dark:bg-slate-900/60 p-3 border border-slate-200/80 dark:border-slate-800">
        <svg viewBox="0 0 520 225" className="w-full h-56 overflow-visible select-none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.00" />
            </linearGradient>
            <filter id="badgeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* Horizontal Grid lines with point labels */}
          {[
            { val: 47, label: "47p (Max)", dashed: false, bold: true },
            { val: 40, label: "40p", dashed: true },
            { val: 30, label: "30p", dashed: true },
            { val: 20, label: "20p", dashed: true },
            { val: 10, label: "10p", dashed: true },
            { val: 0, label: "0p (Done)", dashed: false, bold: true },
          ].map((grid, i) => {
            const y = getY(grid.val);
            return (
              <g key={i}>
                <line
                  x1={chartXStart}
                  y1={y}
                  x2={chartXEnd}
                  y2={y}
                  stroke={grid.bold ? "#cbd5e1" : "#e2e8f0"}
                  strokeWidth={grid.bold ? 1.25 : 1}
                  strokeDasharray={grid.dashed ? "3 3" : undefined}
                  className="dark:stroke-slate-800"
                />
                <text
                  x={chartXStart - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9.5"
                  fill={grid.bold ? "#475569" : "#94a3b8"}
                  fontFamily="ui-monospace, monospace"
                  fontWeight={grid.bold ? "bold" : "normal"}
                >
                  {grid.label}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid lines & X-axis Day labels */}
          {daysData.map((d, i) => {
            const x = getX(i);
            const isHovered = hoveredIndex === i;
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={chartYTop}
                  x2={x}
                  y2={chartYBottom}
                  stroke={d.highlight ? "#fda4af" : "#f1f5f9"}
                  strokeWidth={d.highlight ? 1.5 : 1}
                  strokeDasharray={d.highlight ? "2 2" : undefined}
                  className="dark:stroke-slate-800"
                />
                <text
                  x={x}
                  y={chartYBottom + 18}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill={d.highlight ? "#0f172a" : isHovered ? "#3b82f6" : "#64748b"}
                  className="dark:fill-slate-300"
                  fontWeight={d.highlight || isHovered ? "bold" : "normal"}
                >
                  {d.dayLabel}
                </text>
              </g>
            );
          })}

          {/* IDEAL LINE (Grey Dashed: 47 pts down to 0 pts) */}
          <line
            x1={idealStart.x}
            y1={idealStart.y}
            x2={idealEnd.x}
            y2={idealEnd.y}
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="5 5"
            className="opacity-80"
          />

          {/* ACTUAL RED LINE GRADIENT AREA FILL */}
          <polygon
            points={areaPolygonPoints}
            fill={`url(#${gradientId})`}
            style={{
              opacity: trigger ? 1 : 0,
              transition: "opacity 1.2s ease-in-out",
            }}
          />

          {/* ACTUAL RED LINE (Vẽ động từ 0 đến điểm hiện tại khi chuyển tab) */}
          <polyline
            fill="none"
            stroke="#ef4444"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={actualPolylinePoints}
            strokeDasharray="900"
            strokeDashoffset={trigger ? "0" : "900"}
            style={{
              transition: "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />

          {/* Interactive Nodes with Micro-Pill Badges */}
          {actualCoords.map((c) => {
            const isHovered = hoveredIndex === c.index;
            const isToday = c.point.highlight;

            return (
              <g
                key={c.index}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(c.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Active radar ping beacon for Today */}
                {isToday && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="11"
                    fill="#ef4444"
                    opacity="0.3"
                    className="animate-ping"
                  />
                )}

                {/* White Center Node with Red Ring */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? "6" : isToday ? "5" : "4"}
                  fill="#ffffff"
                  stroke="#ef4444"
                  strokeWidth={isHovered ? "3.5" : "2.75"}
                  className="transition-all duration-200"
                />

                {/* Micro-Pill Badge Floating Above Point */}
                <g
                  transform={`translate(${c.x - 15}, ${c.y - 21})`}
                  className="transition-transform duration-200"
                  style={{
                    transform: isHovered
                      ? `translate(${c.x - 17}px, ${c.y - 25}px) scale(1.1)`
                      : undefined,
                  }}
                >
                  <rect
                    width="30"
                    height="16"
                    rx="8"
                    fill={isToday ? "#ef4444" : isHovered ? "#2563eb" : "#1e293b"}
                    stroke={isToday || isHovered ? "#ffffff" : "transparent"}
                    strokeWidth="1"
                    filter="url(#badgeGlow)"
                  />
                  <text
                    x="15"
                    y="11.5"
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#ffffff"
                    fontWeight="bold"
                    fontFamily="ui-monospace, monospace"
                  >
                    {c.point.actualPoints}p
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* ── Interactive Floating Tooltip on Hover ── */}
        {hoveredIndex !== null && daysData[hoveredIndex] && (
          <div
            className="absolute z-20 pointer-events-none rounded-xl bg-slate-900/95 text-white p-3 shadow-xl backdrop-blur-xs border border-slate-700 text-xs animate-scale-in"
            style={{
              left: `${Math.min(380, Math.max(20, getX(hoveredIndex) - 90))}px`,
              top: `${Math.max(10, getY(daysData[hoveredIndex].actualPoints || daysData[hoveredIndex].idealPoints) - 75)}px`,
            }}
          >
            <div className="font-bold flex items-center gap-1.5 text-slate-200 mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{daysData[hoveredIndex].dayLabel} · {daysData[hoveredIndex].dateStr}</span>
            </div>
            <div className="space-y-0.5 text-[11px] text-slate-300">
              <div>
                Điểm còn lại: <strong className="text-white font-mono">{daysData[hoveredIndex].actualPoints ?? "--"} pts</strong>
              </div>
              <div>
                Đã giải phóng: <strong className="text-emerald-400 font-mono">{daysData[hoveredIndex].burnedPoints} pts</strong>
              </div>
              {daysData[hoveredIndex].notes && (
                <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800 mt-1">
                  {daysData[hoveredIndex].notes}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Sprint Health & Evaluation Ribbon ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-4 py-2.5">
        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-2xs shrink-0 animate-pulse" />
          <span className="text-[11px]">
            <strong className="text-slate-900 dark:text-white">Đánh giá Sprint:</strong> Đường đỏ thực tế dốc đúng quỹ đạo, đã đốt cháy{" "}
            <strong className="text-emerald-600 font-mono">
              <AnimatedCounter value={burnedSoFar} trigger={trigger} suffix=" pts" />
            </strong>{" "}
            ({percentBurned}%). Còn{" "}
            <strong className="text-rose-600 font-mono">
              <AnimatedCounter value={currentRemainingPoints} trigger={trigger} suffix=" pts" />
            </strong>{" "}
            cần hoàn tất.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Vượt tiến độ +1.5 ngày
          </span>
          <span className="font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full text-[11px]">
            Hiệu suất 96.5%
          </span>
        </div>
      </div>
    </div>
  );
}

