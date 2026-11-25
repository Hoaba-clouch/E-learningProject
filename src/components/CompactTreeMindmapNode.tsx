import React from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  CheckCircle2,
  Clock,
  Lock,
  GitBranch,
  Terminal,
  ChevronRight,
  ChevronDown,
  BookOpen,
} from "lucide-react";

export interface CompactTreeNodeData extends Record<string, unknown> {
  title: string;
  badge?: string;
  summary?: string;
  status: "completed" | "in-progress" | "locked";
  progressPct: number;
  xp?: number;
  nodeType: "root" | "branch" | "leaf" | "subleaf";
  tone?: string;
  hasChildren?: boolean;
  isExpanded?: boolean;
  childrenCount?: number;
  onToggleExpand?: () => void;
}

function getNodeAnimationDelay(
  id?: string,
  nodeType?: "root" | "branch" | "leaf" | "subleaf"
): string {
  if (nodeType === "root" || id === "root" || !id) return "40ms";
  if (id.startsWith("b-")) {
    const num = parseInt(id.replace("b-", ""), 10) || 1;
    return `${60 + num * 30}ms`;
  }
  if (id.startsWith("l-")) {
    const parts = id.replace("l-", "").split("-");
    const branchNum = parseInt(parts[0], 10) || 1;
    const leafNum = parseInt(parts[1], 10) || 1;
    const order = (branchNum - 1) * 3 + leafNum;
    return `${120 + order * 20}ms`;
  }
  return "100ms";
}

/**
 * CompactTreeMindmapNode — Phẳng, Tối Giản, Chỉ Có 1 Chút Điểm Nhấn Tinh Tế (Non-AI Editorial Style)
 * - Tuyệt đối không dùng màu cầu vồng, không glow neon, không gradient loè loẹt.
 * - Điểm nhấn vừa đủ: Nút gốc tách nền rõ khối + vạch mảnh xanh lá (emerald) cho bài đã hoàn thành + nút mở nhánh tương phản trắng/đen.
 */
export function CompactTreeMindmapNode({
  id,
  data,
}: NodeProps<Node<CompactTreeNodeData>>) {
  const isRoot = data.nodeType === "root";
  const isBranch = data.nodeType === "branch";
  const isSubleaf = data.nodeType === "subleaf";

  const isCompleted = data.status === "completed";
  const isInProgress = data.status === "in-progress";
  const animDelay = getNodeAnimationDelay(id, data.nodeType);

  // ─── 1. ROOT NODE (TÁCH KHỐI SẮC NÉT, KHÔNG GRADIENT LOÈ LOẸT) ───
  if (isRoot) {
    return (
      <div
        onClick={() => data.hasChildren && data.onToggleExpand?.()}
        className={`animate-mindmap-node relative min-w-[228px] max-w-[252px] rounded-2xl p-4 select-none transition-all duration-150 ${
          data.hasChildren ? "cursor-pointer hover:border-slate-500 active:scale-[0.99]" : ""
        } bg-[#181a20] text-white dark:bg-[#1e222c] border border-slate-700/90 dark:border-slate-600/85 shadow-md`}
        style={{ animationDelay: animDelay }}
      >
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-white dark:bg-white text-slate-950 dark:text-slate-950 flex items-center justify-center font-bold shrink-0 select-none shadow-2xs">
            <GitBranch size={15} strokeWidth={2.3} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-bold leading-snug text-white tracking-tight">
              {data.title}
            </h4>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              Tổng kết kiến thức chương
            </span>
          </div>
        </div>

        {/* Progress Bar gọn sạch */}
        <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-200 font-bold">{data.progressPct}% nắm vững</span>
            {data.xp && (
              <span className="font-semibold text-slate-300 bg-white/[0.07] px-2 py-0.5 rounded border border-white/10 text-[10px]">
                +{data.xp} XP
              </span>
            )}
          </div>
          <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted || data.progressPct >= 100 ? "bg-emerald-500" : "bg-amber-400"
              }`}
              style={{ width: `${Math.max(6, data.progressPct)}%` }}
            />
          </div>
        </div>

        {data.hasChildren && (
          <div className="mt-2.5 flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onToggleExpand?.();
              }}
              className="inline-flex items-center justify-center gap-1 h-5 px-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 font-mono text-[9.5px] font-semibold border border-white/10 transition cursor-pointer active:scale-95"
            >
              {data.isExpanded ? (
                <>
                  <ChevronDown size={9.5} strokeWidth={2.2} />
                  <span>Thu gọn</span>
                </>
              ) : (
                <>
                  <ChevronRight size={9.5} strokeWidth={2.2} />
                  <span>+{data.childrenCount}</span>
                </>
              )}
            </button>
          </div>
        )}

        <Handle
          type="source"
          position={Position.Right}
          className="!w-2.5 !h-2.5 !rounded-full !bg-white !border-2 !border-[#181a20]"
        />
      </div>
    );
  }

  // ─── 2. BRANCH NODE (CÀNH BÀI HỌC: PHẲNG SẠCH + VẠCH NHẤN MẢNH BÊN TRÁI) ───
  if (isBranch) {
    const leftAccentCls = isCompleted
      ? "border-l-[3px] border-l-emerald-500"
      : data.isExpanded
      ? "border-l-[3px] border-l-slate-900 dark:border-l-white"
      : "border-l-[3px] border-l-slate-300 dark:border-l-slate-600";

    return (
      <div
        onClick={() => data.hasChildren && data.onToggleExpand?.()}
        className={`animate-mindmap-node relative min-w-[218px] max-w-[248px] rounded-xl border border-slate-200/95 dark:border-slate-700/90 ${leftAccentCls} px-3.5 py-3 select-none transition-all duration-150 bg-white dark:bg-[#171a22] shadow-xs hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm ${
          data.hasChildren ? "cursor-pointer active:scale-[0.99]" : ""
        } ${!isCompleted && !isInProgress ? "opacity-75" : ""}`}
        style={{ animationDelay: animDelay }}
      >
        <Handle
          type="target"
          position={Position.Left}
          className={`!w-2.5 !h-2.5 !rounded-full ${
            isCompleted ? "!bg-emerald-500" : "!bg-slate-400 dark:!bg-slate-500"
          } !border-2 !border-white dark:!border-[#171a22]`}
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                isCompleted
                  ? "bg-emerald-500"
                  : data.isExpanded
                  ? "bg-slate-900 dark:bg-white"
                  : "bg-slate-400 dark:bg-slate-500"
              }`}
            />
            <h5 className="text-[12.5px] font-bold tracking-tight truncate text-slate-900 dark:text-white">
              {data.title}
            </h5>
          </div>

          {isCompleted ? (
            <div
              className="flex items-center justify-center text-emerald-500 shrink-0"
              title="Đã hoàn thành"
            >
              <CheckCircle2 size={14} strokeWidth={2.2} />
            </div>
          ) : isInProgress ? (
            <div
              className="flex items-center justify-center text-slate-400 shrink-0"
              title="Đang học"
            >
              <Clock size={13} strokeWidth={2} />
            </div>
          ) : (
            <Lock size={12} className="text-slate-400 shrink-0" />
          )}
        </div>

        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[10.5px] font-mono">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {data.progressPct}%
            </span>
            {data.badge && (
              <span className="font-mono text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70">
                {data.badge}
              </span>
            )}
          </div>
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted ? "bg-emerald-500" : "bg-slate-800 dark:bg-slate-300"
              }`}
              style={{ width: `${data.progressPct}%` }}
            />
          </div>
        </div>

        {data.hasChildren && (
          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {data.childrenCount} khái niệm
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onToggleExpand?.();
              }}
              title={
                data.isExpanded
                  ? "Thu gọn nhánh"
                  : `Mở rộng ${data.childrenCount} nhánh`
              }
              className={`inline-flex items-center justify-center gap-0.5 h-4.5 px-2 rounded-full text-[9.5px] font-mono font-bold transition cursor-pointer border active:scale-95 ${
                data.isExpanded
                  ? "bg-slate-900 text-white dark:text-white border-slate-900 dark:bg-white dark:!text-slate-950 dark:border-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700"
              }`}
            >
              {data.isExpanded ? (
                <>
                  <ChevronDown size={9} strokeWidth={2.2} />
                  <span>Thu gọn</span>
                </>
              ) : (
                <>
                  <ChevronRight size={9} strokeWidth={2.2} />
                  <span>+{data.childrenCount}</span>
                </>
              )}
            </button>
          </div>
        )}

        <Handle
          type="source"
          position={Position.Right}
          className={`!w-2.5 !h-2.5 !rounded-full ${
            data.isExpanded
              ? "!bg-slate-900 dark:!bg-white"
              : "!bg-slate-400 dark:!bg-slate-500"
          } !border-2 !border-white dark:!border-[#171a22]`}
        />
      </div>
    );
  }

  // ─── 3. SUBLEAF NODE (CODE / GHI CHÚ NGẮN) ───
  if (isSubleaf) {
    return (
      <div
        className="animate-mindmap-node relative min-w-[200px] max-w-[232px] rounded-xl border border-slate-200/90 dark:border-slate-700/80 p-2.5 select-none transition-all shadow-2xs bg-slate-50/95 dark:bg-[#14171f] hover:border-slate-300 dark:hover:border-slate-600"
        style={{ animationDelay: animDelay }}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2 !h-2 !rounded-full !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-[#14171f]"
        />
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Terminal size={12} className="text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
              {data.title}
            </span>
          </div>
          {data.badge && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700 shrink-0">
              {data.badge}
            </span>
          )}
        </div>
        {data.summary && (
          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-mono leading-relaxed bg-white dark:bg-[#0d1016] p-2 rounded-lg border border-slate-200/70 dark:border-slate-800">
            {data.summary}
          </p>
        )}
      </div>
    );
  }

  // ─── 4. LEAF NODE (KHÁI NIỆM CHI TIẾT) ───
  return (
    <div
      onClick={() => data.hasChildren && data.onToggleExpand?.()}
      className={`animate-mindmap-node relative min-w-[215px] max-w-[246px] rounded-xl border border-slate-200/90 dark:border-slate-700/85 p-3 select-none transition-all duration-150 shadow-2xs bg-white dark:bg-[#171a22] hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs ${
        data.hasChildren ? "cursor-pointer active:scale-[0.99]" : ""
      } ${!isCompleted && !isInProgress ? "opacity-75" : ""}`}
      style={{ animationDelay: animDelay }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !rounded-full !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-[#171a22]"
      />

      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <BookOpen size={12} className="text-slate-400 shrink-0" />
          <span className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight truncate">
            {data.title}
          </span>
        </div>
        {isCompleted ? (
          <span className="text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono shrink-0 flex items-center gap-0.5">
            <CheckCircle2 size={11} /> Đã học
          </span>
        ) : (
          <span className="text-[9.5px] font-semibold text-slate-400 font-mono shrink-0">
            {data.progressPct}%
          </span>
        )}
      </div>

      {data.summary && (
        <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
          {data.summary}
        </p>
      )}

      {data.badge && (
        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[9.5px] font-mono">
          <span className="font-medium text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60">
            {data.badge}
          </span>
          {data.xp && (
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              +{data.xp} XP
            </span>
          )}
        </div>
      )}

      {data.hasChildren && (
        <div className="mt-1.5 flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleExpand?.();
            }}
            title={
              data.isExpanded
                ? "Thu gọn chi tiết"
                : `Mở rộng ${data.childrenCount} chi tiết`
            }
            className={`inline-flex items-center justify-center gap-0.5 h-4 px-2 rounded-full text-[9px] font-mono font-semibold transition cursor-pointer border active:scale-95 ${
              data.isExpanded
                ? "bg-slate-900 text-white dark:bg-white dark:!text-slate-950 border-slate-900 dark:border-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
            }`}
          >
            {data.isExpanded ? (
              <>
                <ChevronDown size={8} strokeWidth={2.2} />
                <span>Thu gọn</span>
              </>
            ) : (
              <>
                <ChevronRight size={8} strokeWidth={2.2} />
                <span>+{data.childrenCount}</span>
              </>
            )}
          </button>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !rounded-full !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-[#171a22]"
      />
    </div>
  );
}
