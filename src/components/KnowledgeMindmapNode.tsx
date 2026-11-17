import React from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  BookOpen,
  Lightbulb,
  Layers,
  HelpCircle,
  Terminal,
  Award,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
} from "lucide-react";
import type { MindmapNodeInfo } from "../data/mindmapData";

const categoryStyles: Record<
  MindmapNodeInfo["category"],
  {
    icon: React.ReactNode;
    headerBg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    accentColor: string;
  }
> = {
  theory: {
    icon: <BookOpen size={15} className="text-sky-600" />,
    headerBg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-800",
    badgeBg: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
    badgeText: "text-sky-700",
    accentColor: "from-sky-500 to-blue-600",
  },
  concept: {
    icon: <Lightbulb size={15} className="text-purple-600" />,
    headerBg: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-800",
    badgeBg: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
    badgeText: "text-purple-700",
    accentColor: "from-purple-500 to-indigo-600",
  },
  architecture: {
    icon: <Layers size={15} className="text-indigo-600" />,
    headerBg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-800",
    badgeBg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200",
    badgeText: "text-indigo-700",
    accentColor: "from-indigo-500 to-blue-600",
  },
  checkpoint: {
    icon: <HelpCircle size={15} className="text-amber-600" />,
    headerBg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
    badgeText: "text-amber-700",
    accentColor: "from-amber-500 to-orange-500",
  },
  practice: {
    icon: <Terminal size={15} className="text-emerald-600" />,
    headerBg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    badgeBg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
    badgeText: "text-emerald-700",
    accentColor: "from-emerald-500 to-teal-600",
  },
  review: {
    icon: <Award size={15} className="text-rose-600" />,
    headerBg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
    badgeBg: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
    badgeText: "text-rose-700",
    accentColor: "from-rose-500 to-pink-600",
  },
};

export function KnowledgeMindmapNode({ data }: NodeProps<Node<MindmapNodeInfo>>) {
  const style = categoryStyles[data.category] || categoryStyles.theory;
  const isCompleted = data.status === "completed";
  const isInProgress = data.status === "in-progress";

  return (
    <div
      className={`relative w-[280px] rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 shadow-sm hover:shadow-md ${
        isCompleted
          ? "border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-400/20"
          : isInProgress
          ? "border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20"
          : "border-slate-200 dark:border-slate-800 opacity-80"
      }`}
    >
      {/* Target Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white dark:!border-slate-900 shadow-sm"
      />

      {/* Header bar */}
      <div
        className={`flex items-center justify-between px-3.5 py-2.5 rounded-t-2xl border-b border-slate-100 dark:border-slate-800 ${style.headerBg}`}
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-white dark:bg-slate-800 shadow-2xs">
            {style.icon}
          </div>
          <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${style.badgeBg}`}>
            {data.tag}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-bold font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
          <Sparkles size={11} />
          +{data.xp} XP
        </div>
      </div>

      {/* Body content */}
      <div className="p-3.5 space-y-2">
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
            {data.title}
          </h4>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {data.subtitle}
          </p>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
          {data.desc}
        </p>

        {/* Progress Bar & Status Chip */}
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Tiến độ nắm vững:</span>
            <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
              {data.progressPct}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${style.accentColor}`}
              style={{ width: `${data.progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                Hoàn thành
              </span>
            ) : isInProgress ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 animate-pulse">
                <Clock size={12} />
                Đang học
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                <Lock size={12} />
                Chưa mở
              </span>
            )}
            <span className="text-[9px] text-slate-400 font-mono">#CodeMind</span>
          </div>
        </div>
      </div>

      {/* Source Handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white dark:!border-slate-900 shadow-sm"
      />
    </div>
  );
}
