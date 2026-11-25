import { useState } from "react";
import MarloNumber from "./MarloNumber";

export interface CapacityItem {
  id: string;
  label: string;
  count: number;
  color: string;
  textColor?: string;
}

interface Props {
  title?: string;
  subtitle?: string;
  items: CapacityItem[];
  totalLabel?: string;
  className?: string;
}

export default function MarloCapacityBar({
  title = "Năng lực Sprint & Phân bổ Tải công việc",
  subtitle = "Tổng cộng 37 Story Points trong Sprint hiện hành",
  items,
  totalLabel = "Story Points",
  className = "",
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const total = items.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <div className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{title}</span>
          </h4>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="text-right">
          <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
            <MarloNumber value={total} durationMs={750} delayMs={160} />
          </span>
          <span className="text-[10px] text-slate-400 ml-1 font-medium">{totalLabel}</span>
        </div>
      </div>

      {/* Stacked Capacity Bar */}
      <div className="relative h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex gap-0.5 p-0.5">
        {items.map((item, idx) => {
          const widthPercent = (item.count / total) * 100;
          if (widthPercent <= 0) return null;

          const isHovered = hoveredId === item.id;

          return (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                width: `${widthPercent}%`,
                animationDelay: `${0.1 + idx * 0.06}s`,
              }}
              className="cap__seg relative h-full rounded-lg cursor-pointer group"
            >
              <div
                className={`w-full h-full rounded-lg transition-[filter,box-shadow] duration-150 ${
                  isHovered ? "brightness-110 shadow-sm scale-y-110" : "hover:brightness-105"
                } ${item.color === "#14161a" ? "bg-[#14161a] dark:bg-white" : ""}`}
                style={item.color !== "#14161a" ? { backgroundColor: item.color } : undefined}
              />

              {/* Tooltip on hover */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                {item.label}: {item.count} ({Math.round(widthPercent)}%)
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] pt-1">
        {items.map((item) => {
          const pct = Math.round((item.count / total) * 100);
          return (
            <div
              key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="flex items-center gap-1.5 cursor-pointer group"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 transition-transform group-hover:scale-125 ${
                  item.color === "#14161a" ? "bg-[#14161a] dark:bg-white" : ""
                }`}
                style={item.color !== "#14161a" ? { backgroundColor: item.color } : undefined}
              />
              <span className="text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-white">
                {item.label}
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {item.count}
              </span>
              <span className="text-[10px] font-mono text-slate-400">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
