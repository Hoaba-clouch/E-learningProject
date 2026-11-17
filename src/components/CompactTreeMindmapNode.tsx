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
  Sparkles,
  BookOpen,
} from "lucide-react";

export interface CompactTreeNodeData {
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

function getNodeAnimationDelay(id?: string, nodeType?: "root" | "branch" | "leaf" | "subleaf"): string {
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
 * 🌳 CompactTreeMindmapNode (Bản Tinh Tế, Đơn Sắc Chuẩn Kỹ Sư Công Nghệ)
 * - Loại bỏ toàn bộ viền màu cầu vồng (xanh, tím, vàng, lục) và hiệu ứng phát sáng chói mắt (glow/halo).
 * - Sử dụng 1 bảng màu chủ đạo kỹ thuật sạch sẽ: Thẻ trắng/than chì tối giản, viền mảnh sắc nét, bóng mờ chuẩn Linear/Figma.
 * - Nhận diện rõ ràng cấp bậc: Root (Dark Hub) -> Branch (Clean Lesson Card) -> Leaf (Sub-concept).
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

  // ─── 1. ROOT NODE (MASTER CORE HUB - CHARCOAL SLATE ARCHITECTURAL CARD) ───
  if (isRoot) {
    return (
      <div
        onClick={() => data.hasChildren && data.onToggleExpand?.()}
        className={`animate-mindmap-node relative min-w-[220px] max-w-[245px] rounded-xl p-4 select-none transition-all duration-200 ${
          data.hasChildren ? "cursor-pointer hover:border-slate-600 active:scale-[0.99]" : ""
        } bg-slate-900 text-white dark:bg-[#12141a] border border-slate-700/80 dark:border-slate-800 shadow-sm`}
        style={{ animationDelay: animDelay }}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-slate-800 text-slate-200 border border-slate-700/70 flex items-center justify-center font-bold shrink-0 select-none">
            <GitBranch size={16} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-bold leading-tight text-white tracking-tight">
              {data.title}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-400 font-mono">Sơ đồ tư duy kiến trúc</span>
            </div>
          </div>
        </div>

        {/* Progress Info */}
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-300 font-bold">{data.progressPct}% Nắm vững</span>
          {data.xp && (
            <span className="font-semibold text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700/70 text-[10px]">
              +{data.xp} XP
            </span>
          )}
        </div>

        {/* Toggle Button */}
        {data.hasChildren && (
          <div className="mt-2 flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onToggleExpand?.();
              }}
              className="inline-flex items-center justify-center gap-1 h-4.5 px-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[9px] font-semibold border border-slate-700 transition cursor-pointer active:scale-95"
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
          className="!w-2.5 !h-2.5 !rounded-full !bg-slate-400 !border-2 !border-slate-900"
        />
      </div>
    );
  }

  // ─── 2. BRANCH NODE (CÀNH BÀI HỌC CHÍNH - CLEAN WHITE / SLATE CARD) ──────
  if (isBranch) {
    return (
      <div
        onClick={() => data.hasChildren && data.onToggleExpand?.()}
        className={`animate-mindmap-node relative min-w-[215px] max-w-[245px] rounded-xl border px-3.5 py-3 select-none transition-all duration-150 bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm ${
          data.hasChildren ? "cursor-pointer active:scale-[0.99]" : ""
        } ${!isCompleted && !isInProgress ? "opacity-75" : ""}`}
        style={{ animationDelay: animDelay }}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !rounded-full !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900"
        />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Neutral Dot */}
            <span className="h-2 w-2 rounded-full shrink-0 bg-slate-700 dark:bg-slate-300" />
            <h5 className="text-[12.5px] font-bold tracking-tight truncate text-slate-900 dark:text-white">
              {data.title}
            </h5>
          </div>

          {/* Status Badge */}
          {isCompleted ? (
            <div className="flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0" title="Đã hoàn thành">
              <CheckCircle2 size={14} strokeWidth={2.2} />
            </div>
          ) : isInProgress ? (
            <div className="flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0" title="Đang học">
              <Clock size={13} strokeWidth={2} />
            </div>
          ) : (
            <Lock size={12} className="text-slate-400 shrink-0" />
          )}
        </div>

        {/* Progress & Badge */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[10.5px] font-mono">
            <span className="font-bold text-slate-700 dark:text-slate-300">{data.progressPct}%</span>
            {data.badge && (
              <span className="font-mono text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/60">
                {data.badge}
              </span>
            )}
          </div>
          {/* Subtle Progress Bar */}
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${data.progressPct}%` }}
            />
          </div>
        </div>

        {/* Nút Mở rộng / Thu gọn chi tiết */}
        {data.hasChildren && (
          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {data.childrenCount} khái niệm
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onToggleExpand?.();
              }}
              title={data.isExpanded ? "Thu gọn nhánh" : `Mở rộng ${data.childrenCount} nhánh`}
              className="inline-flex items-center justify-center gap-0.5 h-4 px-1.5 rounded text-[9.5px] font-mono font-medium transition cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 active:scale-95"
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
          className="!w-2.5 !h-2.5 !rounded-full !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900"
        />
      </div>
    );
  }

  // ─── 3. SUBLEAF NODE (CÀNH NHỎ CHUYÊN SÂU - CODE TERMINAL CARD) ─────────
  if (isSubleaf) {
    return (
      <div
        className="animate-mindmap-node relative min-w-[200px] max-w-[230px] rounded-xl border border-slate-200/90 dark:border-slate-800 p-2.5 select-none transition-all shadow-xs bg-slate-50/90 dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700"
        style={{ animationDelay: animDelay }}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2 !h-2 !rounded-full !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900"
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
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono leading-relaxed bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-200/70 dark:border-slate-800/80">
            {data.summary}
          </p>
        )}
      </div>
    );
  }

  // ─── 4. LEAF NODE (CÁC NÚT KHÁI NIỆM - KNOWLEDGE CARD SẮC NÉT) ─────────
  return (
    <div
      onClick={() => data.hasChildren && data.onToggleExpand?.()}
      className={`animate-mindmap-node relative min-w-[215px] max-w-[245px] rounded-xl border border-slate-200/90 dark:border-slate-800 p-3 select-none transition-all duration-150 shadow-xs bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm ${
        data.hasChildren ? "cursor-pointer active:scale-[0.99]" : ""
      } ${!isCompleted && !isInProgress ? "opacity-75" : ""}`}
      style={{ animationDelay: animDelay }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !rounded-full !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900"
      />

      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <BookOpen size={12} className="text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight truncate">
            {data.title}
          </span>
        </div>
        {isCompleted ? (
          <span className="text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono shrink-0 flex items-center gap-0.5">
            <CheckCircle2 size={11} /> Nắm vững
          </span>
        ) : (
          <span className="text-[9.5px] font-semibold text-slate-500 font-mono shrink-0">
            {data.progressPct}%
          </span>
        )}
      </div>

      {data.summary && (
        <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
          {data.summary}
        </p>
      )}

      {data.badge && (
        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[9.5px] font-mono">
          <span className="font-medium text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60">
            {data.badge}
          </span>
          {data.xp && (
            <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
              <Sparkles size={8} /> +{data.xp} XP
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
            title={data.isExpanded ? "Thu gọn chi tiết" : `Mở rộng ${data.childrenCount} chi tiết`}
            className="inline-flex items-center justify-center gap-0.5 h-4 px-1.5 rounded text-[9px] font-mono font-medium transition cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 active:scale-95"
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
        className="!w-2 !h-2 !rounded-full !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-slate-900"
      />
    </div>
  );
}
