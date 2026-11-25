import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import MarloNumber from "./MarloNumber";

export interface RingSegment {
  id: string;
  label: string;
  value: number;
  count?: number;
  color: string;
}

interface Props {
  title?: string;
  subtitle?: string;
  actionText?: string;
  onAction?: () => void;
  size?: number;
  segments?: RingSegment[];
  centerValue?: number;
  centerFormat?: (val: number) => string;
  centerLabel?: string;
  className?: string;
}

export default function MarloActivityRing({
  title = "Tiến độ Học kỳ 1",
  subtitle = "Mục tiêu tuần & đồ án",
  actionText = "Bảng Kanban",
  onAction,
  size = 130,
  segments = [
    { id: "upnext", label: "Chờ làm", value: 12, count: 3, color: "#cbd5e1" },
    { id: "prog", label: "Đang làm", value: 20, count: 5, color: "#f97316" },
    { id: "review", label: "Cần review", value: 12, count: 3, color: "#64748b" },
    { id: "done", label: "Đã hoàn thành", value: 56, count: 14, color: "#1e293b" },
  ],
  centerValue = 56,
  centerFormat = (val) => `${Math.round(val)}%`,
  centerLabel = "hoàn thành",
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevArcLensRef = useRef<number[]>([]);

  const total = segments.reduce((sum, s) => sum + s.value, 0) || 100;
  // Radius 52 in 140x140 viewBox matches Marlo's exact proportions (strokeWidth 18)
  const r = 52;
  const circumference = 2 * Math.PI * r;

  // Compute segment arcs matching Marlo's math in overview.jsx
  let currentOffset = 0;
  const computedArcs = segments.map((seg) => {
    const segLength = (seg.value / total) * circumference;
    const item = {
      ...seg,
      len: Math.max(0, segLength - 5), // 5px gap with rounded stroke ends
      off: currentOffset,
    };
    currentOffset += segLength;
    return item;
  });

  // Authentic Marlo GSAP entrance & project-switch morph for donut arcs
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const arcs = containerRef.current.querySelectorAll<SVGCircleElement>(".marlo-donut-arc");
    if (arcs.length === 0) return;

    const isInitialDraw = prevArcLensRef.current.length === 0;
    const ctx = gsap.context(() => {
      arcs.forEach((arc, i) => {
        const targetLen = computedArcs[i]?.len || 0;
        const fromLen = isInitialDraw ? 0 : (prevArcLensRef.current[i] ?? 0);
        gsap.fromTo(
          arc,
          { strokeDasharray: `${fromLen} ${circumference}` },
          {
            strokeDasharray: `${targetLen} ${circumference}`,
            duration: isInitialDraw ? 0.65 : 0.45,
            delay: isInitialDraw ? 0.08 + i * 0.05 : 0,
            ease: "power3.out",
          }
        );
      });
    }, containerRef);

    prevArcLensRef.current = computedArcs.map((a) => a.len);
    return () => ctx.revert();
  }, [segments.map((s) => s.value).join(",")]);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs select-none ${className}`}
    >
      {/* ── CARD HEADER (TITLE, SUBTITLE & ACTION LINK) ── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {actionText}
          </button>
        )}
      </div>

      {/* ── MARLO STAND BODY: DONUT ON LEFT, VERTICAL PILL LIST ON RIGHT ── */}
      <div className="flex items-center gap-4 sm:gap-5 justify-between">
        {/* Left: Donut Chart with center % and label */}
        <div
          className="relative shrink-0 flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <svg
            viewBox="0 0 140 140"
            width={size}
            height={size}
            className="w-full h-full pointer-events-none"
          >
            {/* Background Track Circle */}
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="18"
              className="text-slate-100 dark:text-slate-800"
            />
            {/* Segment Arcs */}
            {computedArcs.map((arc) => (
              <circle
                key={arc.id}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={arc.color}
                strokeWidth="18"
                strokeDasharray={`0 ${circumference}`}
                strokeLinecap="round"
                transform={`rotate(${-90 + (arc.off / circumference) * 360} 70 70)`}
                className="marlo-donut-arc"
              />
            ))}
          </svg>

          {/* Center text: "56% / done" or "68% / hoàn thành" */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none leading-none">
            <span className="text-[25px] font-black text-slate-900 dark:text-white font-sans tracking-tight">
              <MarloNumber value={centerValue} />
              {centerFormat ? centerFormat(centerValue).replace(`${centerValue}`, "") : "%"}
            </span>
            {centerLabel && (
              <span className="text-[11.5px] font-semibold text-slate-400 lowercase mt-1">
                {centerLabel}
              </span>
            )}
          </div>
        </div>

        {/* Right: Vertical List of Status Pills (Exact Marlo .stand__list li) */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/75 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {/* Rounded square dot matching Marlo .stand__list li i */}
              <span
                className="w-2.5 h-2.5 rounded-[3.5px] shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              {/* Status Label */}
              <span className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 flex-1 truncate">
                {seg.label}
              </span>
              {/* Optional Count / Percentage */}
              {seg.count !== undefined && (
                <span className="text-[11.5px] font-mono font-bold text-slate-900 dark:text-white shrink-0 ml-auto">
                  {seg.count}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
