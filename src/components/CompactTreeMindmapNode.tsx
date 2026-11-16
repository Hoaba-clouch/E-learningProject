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
  if (nodeType === "root" || id === "root" || !id) return "60ms";
  if (id.startsWith("b-")) {
    const num = parseInt(id.replace("b-", ""), 10) || 1;
    return `${100 + num * 50}ms`;
  }
  if (id.startsWith("l-")) {
    const parts = id.replace("l-", "").split("-");
    const branchNum = parseInt(parts[0], 10) || 1;
    const leafNum = parseInt(parts[1], 10) || 1;
    const order = (branchNum - 1) * 3 + leafNum;
    return `${200 + order * 30}ms`;
  }
  if (id.startsWith("sub-")) {
    return "350ms";
  }
  return "150ms";
}

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

  // 1. ROOT NODE (ĐƠN SẮC - SANG TRỌNG - SLATE CHARCOAL ARCHITECTURAL CARD)
  if (isRoot) {
    return (
      <div
        onClick={() => data.hasChildren && data.onToggleExpand?.()}
        className={`animate-mindmap-node relative min-w-[220px] max-w-[240px] rounded-xl bg-slate-900 text-white dark:bg-[#111215] p-4 shadow-sm border border-slate-700 dark:border-slate-700/80 select-none ${
          data.hasChildren ? "cursor-pointer hover:border-slate-500 hover:shadow-lg transition-all" : ""
        }`}
        style={{ animationDelay: animDelay }}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-slate-800/90 border border-slate-700/70 flex items-center justify-center text-slate-200 shrink-0">
            <GitBranch size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-bold leading-tight text-white tracking-tight">{data.title}</h4>
            <span className="text-[10px] font-normal text-slate-400 block mt-0.5">Sơ đồ tư duy kiến trúc</span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-300 font-semibold">{data.progressPct}% Nắm vững</span>
          {data.xp && (
            <span className="font-semibold text-slate-200 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700/70 text-[10px]">
              +{data.xp} XP
            </span>
          )}
        </div>
        {data.hasChildren && (
          <div className="mt-1 flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onToggleExpand?.();
              }}
              className="inline-flex items-center justify-center gap-0.5 h-3.5 px-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-mono text-[9px] font-semibold border border-slate-700 transition cursor-pointer active:scale-95"
            >
              {data.isExpanded ? (
                <>
                  <ChevronDown size={8} strokeWidth={2.2} />
                  <span>−</span>
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
          className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-slate-900 shadow-xs"
        />
      </div>
    );
  }

  // 2. BRANCH NODE (CÀNH CHÍNH - ĐƠN SẮC MONOCHROME MINIMALIST PILL)
  if (isBranch) {
    return (
      <div
        onClick={() => data.hasChildren && data.onToggleExpand?.()}
        className={`animate-mindmap-node relative min-w-[205px] max-w-[235px] rounded-xl border px-3.5 py-3 shadow-xs hover:shadow-sm transition-all bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 select-none ${
          data.hasChildren ? "cursor-pointer hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-xs" : ""
        } ${!isCompleted && !isInProgress ? "opacity-70" : ""}`}
        style={{ animationDelay: animDelay }}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-[#16171a]"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-slate-900 dark:bg-slate-100 shrink-0" />
            <span className="text-[13px] font-bold tracking-tight truncate text-slate-900 dark:text-slate-100">
              {data.title}
            </span>
          </div>
          {isCompleted ? (
            <CheckCircle2 size={14} className="text-slate-800 dark:text-slate-200 shrink-0" />
          ) : isInProgress ? (
            <Clock size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
          ) : (
            <Lock size={13} className="text-slate-400 shrink-0" />
          )}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{data.progressPct}%</span>
          {data.badge && (
            <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/70">
              {data.badge}
            </span>
          )}
        </div>

        {/* Nút Mở rộng / Thu gọn: Đơn sắc tinh tế */}
        {data.hasChildren && (
          <div className="mt-1 flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onToggleExpand?.();
              }}
              title={data.isExpanded ? "Thu gọn nhánh" : `Mở rộng ${data.childrenCount} nhánh`}
              className="inline-flex items-center justify-center gap-0.5 h-3.5 px-1.5 rounded-full text-[9px] font-mono font-medium transition cursor-pointer bg-slate-100/90 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 active:scale-95"
            >
              {data.isExpanded ? (
                <>
                  <ChevronDown size={8} strokeWidth={2.2} />
                  <span>−</span>
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
          className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-[#16171a]"
        />
      </div>
    );
  }

  // 3. SUBLEAF NODE (CÀNH NHỎ CHUYÊN SÂU - ĐƠN SẮC)
  if (isSubleaf) {
    return (
      <div
        className="animate-mindmap-node relative min-w-[195px] max-w-[225px] rounded-xl border border-slate-300 dark:border-slate-700 p-2.5 shadow-xs transition-all bg-slate-50/90 dark:bg-slate-900/90 hover:border-slate-400 dark:hover:border-slate-600"
        style={{ animationDelay: animDelay }}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border !border-white dark:!border-[#141517]"
        />
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Terminal size={12} className="text-slate-600 dark:text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
              {data.title}
            </span>
          </div>
          {data.badge && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium shrink-0">
              {data.badge}
            </span>
          )}
        </div>
        {data.summary && (
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono leading-relaxed bg-white dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200/70 dark:border-slate-800/80">
            {data.summary}
          </p>
        )}
      </div>
    );
  }

  // 4. LEAF NODE (CÁC NÚT KHÁI NIỆM - ĐƠN SẮC)
  return (
    <div
      onClick={() => data.hasChildren && data.onToggleExpand?.()}
      className={`animate-mindmap-node relative min-w-[220px] max-w-[250px] rounded-xl border border-slate-300 dark:border-slate-700 p-3 shadow-xs hover:shadow-sm transition-all bg-white dark:bg-slate-900 select-none ${
        data.hasChildren ? "cursor-pointer hover:border-slate-400 hover:shadow-xs" : ""
      } ${!isCompleted && !isInProgress ? "opacity-75" : ""}`}
      style={{ animationDelay: animDelay }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-500 !border-2 !border-white dark:!border-[#16171a]"
      />
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1.5">
        <span className="text-[12.5px] font-bold text-slate-900 dark:text-white leading-tight">
          {data.title}
        </span>
        {isCompleted ? (
          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 font-mono shrink-0">
            ✓ Nắm vững
          </span>
        ) : (
          <span className="text-[10px] font-medium text-slate-500 font-mono shrink-0">
            {data.progressPct}%
          </span>
        )}
      </div>

      {data.summary && (
        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
          {data.summary}
        </p>
      )}

      {data.badge && (
        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span className="text-slate-600 dark:text-slate-300 font-medium">{data.badge}</span>
          <span>{data.xp ? `+${data.xp} XP` : ""}</span>
        </div>
      )}

      {data.hasChildren && (
        <div className="mt-1 flex items-center justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleExpand?.();
            }}
            title={data.isExpanded ? "Thu gọn chi tiết" : `Mở rộng ${data.childrenCount} chi tiết`}
            className="inline-flex items-center justify-center gap-0.5 h-3.5 px-1.5 rounded-full text-[9px] font-mono font-medium transition cursor-pointer bg-slate-100/90 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 active:scale-95"
          >
            {data.isExpanded ? (
              <>
                <ChevronDown size={8} strokeWidth={2.2} />
                <span>−</span>
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
        className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border !border-white dark:!border-[#16171a]"
      />
    </div>
  );
}
