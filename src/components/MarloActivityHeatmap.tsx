import { useState, useMemo } from "react";

export interface HeatmapCellInput {
  date: string;
  weekIndex: number;
  dayIndex: number;
  commits: number;
  activities: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface HeatmapDay {
  dayIndex: number; // 0 = Mon, 6 = Sun
  weekIndex: number; // 0 to 15 (16 weeks)
  level: 0 | 1 | 2 | 3 | 4;
  commits: number;
  activities: number;
  dateStr: string;
}

interface Props {
  title?: string;
  subtitle?: string;
  className?: string;
  cells?: HeatmapCellInput[];
}

export default function MarloActivityHeatmap({
  title = "Bảng Nhiệt Hoạt Động & Đóng Góp (16 Tuần)",
  subtitle,
  className = "",
  cells,
}: Props) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapDay | null>(null);

  const daysLabel = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const weeksCount = 16;

  // Build exact 7x16 matrix exclusively from real API / database cells (zero fake seeded math)
  const matrix: HeatmapDay[][] = useMemo(() => {
    const byCoord: Record<string, HeatmapCellInput> = {};
    if (Array.isArray(cells)) {
      for (const c of cells) {
        byCoord[`${c.dayIndex}-${c.weekIndex}`] = c;
      }
    }

    const result: HeatmapDay[][] = [];
    for (let day = 0; day < 7; day++) {
      const row: HeatmapDay[] = [];
      for (let week = 0; week < weeksCount; week++) {
        const hit = byCoord[`${day}-${week}`];
        row.push({
          dayIndex: day,
          weekIndex: week,
          level: hit ? hit.level : 0,
          commits: hit ? hit.commits : 0,
          activities: hit ? hit.activities : 0,
          dateStr: hit ? hit.date : `Thứ ${day === 6 ? "CN" : day + 2}, Tuần ${week + 1}`,
        });
      }
      result.push(row);
    }
    return result;
  }, [cells]);

  const resolvedSubtitle =
    subtitle ||
    (Array.isArray(cells) && cells.length > 0
      ? `16 tuần học kỳ • ${cells.reduce((acc, c) => acc + c.commits, 0)} commits • ${cells.reduce((acc, c) => acc + c.activities, 0)} hoạt động thực tế`
      : "Chưa ghi nhận hoạt động trong 16 tuần qua");

  // Marlo warm amber / signature color shades
  const levelColors = [
    "bg-slate-100 dark:bg-slate-800/80 border-slate-200/50 dark:border-slate-800", // 0
    "bg-amber-100 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/40", // 1
    "bg-amber-300 dark:bg-amber-800/70 border-amber-400 dark:border-amber-700", // 2
    "bg-amber-500 dark:bg-amber-600 border-amber-600 dark:border-amber-500", // 3
    "bg-amber-600 dark:bg-amber-500 border-amber-700 dark:border-amber-400", // 4
  ];

  return (
    <div className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 ${className}`}>
      {/* Header Row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{title}</span>
          </h4>
          {resolvedSubtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5">{resolvedSubtitle}</p>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
          <span>Ít</span>
          {levelColors.map((cls, idx) => (
            <span
              key={idx}
              className={`w-2.5 h-2.5 rounded-xs border ${cls}`}
            />
          ))}
          <span>Nhiều</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[620px] flex gap-2">
          {/* Day Labels Column */}
          <div className="flex flex-col justify-between py-0.5 text-[10px] font-mono text-slate-400 select-none">
            {daysLabel.map((label, idx) => (
              <span key={idx} className="h-4 flex items-center leading-none">
                {idx % 2 === 0 ? label : ""}
              </span>
            ))}
          </div>

          {/* Weeks Grid */}
          <div className="flex-1 flex flex-col gap-1">
            {/* Week Headers */}
            <div className="grid grid-cols-16 gap-1 text-[9.5px] font-mono text-slate-400 text-center select-none mb-0.5">
              {Array.from({ length: weeksCount }, (_, i) => (
                <span key={i} className="truncate">
                  {i === 0 || i === 7 || i === 15 ? `W${i + 1}` : ""}
                </span>
              ))}
            </div>

            {/* Matrix of Days */}
            {matrix.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-16 gap-1 h-4">
                {row.map((cell) => {
                  return (
                    <div
                      key={cell.weekIndex}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-full rounded-xs border cursor-pointer heat-cell relative ${levelColors[cell.level]}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover Info Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between min-h-[28px]">
        {hoveredCell ? (
          <div className="flex items-center gap-3 animate-in fade-in">
            <span className="font-bold text-slate-900 dark:text-white">
              {hoveredCell.dateStr}
            </span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              {hoveredCell.commits} commits
            </span>
            <span>•</span>
            <span>{hoveredCell.activities} hoạt động học tập</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[10.5px]">
            Di chuột vào từng ô vuông để xem chi tiết số commit & hoạt động
          </span>
        )}
        <span className="text-[10px] text-slate-400">MySQL Activity Sync</span>
      </div>
    </div>
  );
}
