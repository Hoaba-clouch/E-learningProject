import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GitBranch,
  MapPin,
  Sparkles,
  Lightbulb,
  RotateCcw,
  Maximize2,
  Minimize2,
  FolderOpen,
  FolderClosed,
  ChevronRight,
  Layers,
} from "lucide-react";
import { CompactTreeMindmapNode } from "./CompactTreeMindmapNode";
import {
  TREE_MINDMAP_DATA,
  type SubjectTreeData,
  type TreeMindmapNode,
} from "../data/mindmapData";
import type { MentorMascot } from "../App";

const nodeTypes = {
  compactTreeNode: CompactTreeMindmapNode,
};

interface LessonMindmapStudioProps {
  subjectId: string;
  mentorMascot: MentorMascot;
  onNavigateToTab?: (tab: "lecture" | "video" | "quiz") => void;
}

// Hàm đệ quy tính toán tọa độ cây lũy tiến (Progressive Tree Layout)
function placeSubtree(
  nodeId: string,
  currentY: number,
  depth: number,
  childrenMap: Map<string, string[]>,
  expandedNodeIds: Set<string>,
  nodeMap: Map<string, TreeMindmapNode>,
  positions: Map<string, { x: number; y: number }>
): { topY: number; bottomY: number; centerY: number } {
  const node = nodeMap.get(nodeId);
  const type = node?.data.nodeType || "leaf";
  const nodeHeight =
    type === "root" ? 120 : type === "branch" ? 100 : type === "leaf" ? 150 : 95;
  const gap = 38; // 🌟 Khoảng cách dọc giữa các thẻ thoáng hơn, tách biệt rõ ràng

  const xPositions = [40, 335, 650, 975]; // 🌟 Khoảng cách cột theo chiều ngang tách rộng rãi hơn
  const posX = depth < xPositions.length ? xPositions[depth] : 40 + depth * 320;

  const isExpanded = expandedNodeIds.has(nodeId);
  const children = (childrenMap.get(nodeId) || []).filter((cid) =>
    nodeMap.has(cid)
  );

  if (!isExpanded || children.length === 0) {
    const centerY = currentY + nodeHeight / 2;
    positions.set(nodeId, { x: posX, y: currentY });
    return { topY: currentY, bottomY: currentY + nodeHeight + gap, centerY };
  }

  // Node đang mở và có các nhánh con
  let childRunnerY = currentY;
  const childCenterYs: number[] = [];

  for (const childId of children) {
    const childRes = placeSubtree(
      childId,
      childRunnerY,
      depth + 1,
      childrenMap,
      expandedNodeIds,
      nodeMap,
      positions
    );
    childCenterYs.push(childRes.centerY);
    childRunnerY = childRes.bottomY;
  }

  const midChildrenCenter =
    (childCenterYs[0] + childCenterYs[childCenterYs.length - 1]) / 2;
  const parentY = Math.max(
    currentY,
    Math.round(midChildrenCenter - nodeHeight / 2)
  );
  positions.set(nodeId, { x: posX, y: parentY });

  const finalBottomY = Math.max(childRunnerY, parentY + nodeHeight + gap);
  return { topY: currentY, bottomY: finalBottomY, centerY: midChildrenCenter };
}

// Canvas bên trong ReactFlowProvider để có thể dùng useReactFlow
function MindmapCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  showMiniMap,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  showMiniMap: boolean;
}) {
  const { fitView } = useReactFlow();

  return (
    <div className="h-[600px] xl:h-[660px] w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 overflow-hidden relative shadow-2xs">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.25}
        maxZoom={1.6}
      >
        <Background color="#cbd5e1" gap={18} size={1} />
        <Controls
          position="top-left"
          className="!bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !shadow-xs !rounded-xl overflow-hidden"
        />
        {showMiniMap && (
          <MiniMap
            position="top-right"
            nodeStrokeWidth={2}
            className="!bg-white/90 dark:!bg-slate-900/90 !border !border-slate-200 dark:!border-slate-700 !rounded-xl !shadow-sm"
          />
        )}
      </ReactFlow>
    </div>
  );
}

// Nút điều khiển căn giữa (gọi hook fitView bên trong Provider)
function FitViewButton() {
  const { fitView } = useReactFlow();
  return (
    <button
      onClick={() => fitView({ duration: 450, padding: 0.15 })}
      className="p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
      title="Căn giữa toàn bộ cây"
    >
      <RotateCcw size={13} />
      <span className="hidden sm:inline text-[11px]">Căn giữa</span>
    </button>
  );
}

export function LessonMindmapStudio({
  subjectId,
  mentorMascot,
  onNavigateToTab,
}: LessonMindmapStudioProps) {
  const [showMiniMap, setShowMiniMap] = useState(false);

  // Mặc định ban đầu chỉ mở root -> Chỉ hiện các nốt chính (Bài 1.1, Bài 1.2...)
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set(["root"])
  );

  const currentData: SubjectTreeData =
    TREE_MINDMAP_DATA[subjectId] || TREE_MINDMAP_DATA.oop;

  // Khi đổi môn học, reset về trạng thái chỉ mở root
  useEffect(() => {
    setExpandedNodeIds(new Set(["root"]));
  }, [subjectId]);

  // Xây dựng bản đồ quan hệ cha - con
  const { childrenMap, parentMap, nodeMap, rootNodeId } = useMemo(() => {
    const cMap = new Map<string, string[]>();
    const pMap = new Map<string, string>();
    const nMap = new Map<string, TreeMindmapNode>();

    for (const n of currentData.nodes) {
      nMap.set(n.id, n);
    }

    for (const e of currentData.edges) {
      if (!cMap.has(e.source)) cMap.set(e.source, []);
      cMap.get(e.source)!.push(e.target);
      pMap.set(e.target, e.source);
    }

    let rId = "root";
    const foundRoot = currentData.nodes.find(
      (n) => n.data.nodeType === "root" || !pMap.has(n.id)
    );
    if (foundRoot) rId = foundRoot.id;

    return {
      childrenMap: cMap,
      parentMap: pMap,
      nodeMap: nMap,
      rootNodeId: rId,
    };
  }, [currentData]);

  // Toggle mở rộng / thu gọn 1 node
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Thu gọn về mặc định (Chỉ hiện các bài chính)
  const handleCollapseToMain = useCallback(() => {
    setExpandedNodeIds(new Set(["root"]));
  }, []);

  // Mở rộng tất cả các nhánh
  const handleExpandAll = useCallback(() => {
    const allParentIds = new Set<string>();
    currentData.nodes.forEach((n) => {
      const children = childrenMap.get(n.id) || [];
      if (children.length > 0) {
        allParentIds.add(n.id);
      }
    });
    setExpandedNodeIds(allParentIds);
  }, [currentData, childrenMap]);

  // Tính toán layout và danh sách nodes / edges hiển thị
  const { computedNodes, computedEdges, visibleCount, totalCount } = useMemo(() => {
    // 1. Thu thập danh sách nodes hiển thị
    const visibleIds = new Set<string>();
    function collect(id: string) {
      visibleIds.add(id);
      if (expandedNodeIds.has(id)) {
        const children = childrenMap.get(id) || [];
        for (const cid of children) {
          collect(cid);
        }
      }
    }
    collect(rootNodeId);

    // 2. Tính toán vị trí theo thuật toán cây phân cấp
    const positions = new Map<string, { x: number; y: number }>();
    placeSubtree(rootNodeId, 40, 0, childrenMap, expandedNodeIds, nodeMap, positions);

    // 3. Xây dựng danh sách Nodes ReactFlow
    const cNodes: Node[] = [];
    for (const rawNode of currentData.nodes) {
      if (!visibleIds.has(rawNode.id)) continue;
      const pos = positions.get(rawNode.id) || rawNode.position;
      const children = (childrenMap.get(rawNode.id) || []).filter((cid) =>
        nodeMap.has(cid)
      );
      const hasChildren = children.length > 0;
      const isExpanded = expandedNodeIds.has(rawNode.id);

      cNodes.push({
        id: rawNode.id,
        type: "compactTreeNode",
        position: pos,
        data: {
          ...rawNode.data,
          hasChildren,
          isExpanded,
          childrenCount: children.length,
          onToggleExpand: () => toggleNode(rawNode.id),
        },
      });
    }

    // 4. Xây dựng danh sách Edges ReactFlow
    const cEdges: Edge[] = [];
    for (const rawEdge of currentData.edges) {
      if (visibleIds.has(rawEdge.source) && visibleIds.has(rawEdge.target)) {
        cEdges.push({
          id: rawEdge.id,
          source: rawEdge.source,
          target: rawEdge.target,
          animated: true,
          type: "smoothstep",
          style: {
            stroke: "#64748b",
            strokeWidth: 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#64748b",
            width: 10,
            height: 10,
          },
        });
      }
    }

    return {
      computedNodes: cNodes,
      computedEdges: cEdges,
      visibleCount: cNodes.length,
      totalCount: currentData.nodes.length,
    };
  }, [currentData, rootNodeId, childrenMap, nodeMap, expandedNodeIds, toggleNode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges);

  useEffect(() => {
    setNodes(computedNodes);
    setEdges(computedEdges);
  }, [computedNodes, computedEdges, setNodes, setEdges]);

  return (
    <ReactFlowProvider>
      <div key={`mindmap-studio-${subjectId}`} className="space-y-3">
        {/* Animated Bezier Pulse CSS */}
        <style>{`
          .react-flow__edge-path {
            stroke-dasharray: 6 4 !important;
            animation: treePulseFlow 1.4s linear infinite !important;
          }
          @keyframes treePulseFlow {
            0% { stroke-dashoffset: 20; }
            100% { stroke-dashoffset: 0; }
          }
        `}</style>

        {/* ─── HEADER & METRICS BAR (COMPACT & INTERACTIVE) ──────────────── */}
        <div
          className="animate-cascade-item rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs"
          style={{ animationDelay: "40ms" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  {currentData.subjectCode}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <GitBranch size={16} className="text-blue-600" />
                  <span>{currentData.title}</span>
                </h3>
              </div>
              <p className="text-[11px] text-[#62656b] dark:text-[#a0a3a9] mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Cây tri thức mở rộng lũy tiến: Ban đầu thu gọn ở các bài học chính.</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Nhấp vào bài học hoặc nút [+] để sổ ra các nhánh khái niệm chi tiết.
                </span>
              </p>
            </div>

            {/* Quick Metrics & Dynamic Drilldown Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Counter Pill */}
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Hiển thị: {visibleCount} / {totalCount} nút
              </span>

              {/* Collapse to Main Branches */}
              <button
                type="button"
                onClick={handleCollapseToMain}
                className="px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                title="Thu gọn về các bài chính"
              >
                <FolderClosed size={12} className="text-slate-500" />
                <span className="text-[11px]">Chỉ bài chính</span>
              </button>

              {/* Expand All */}
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300"
                title="Mở rộng toàn bộ cây"
              >
                <FolderOpen size={12} className="text-blue-600" />
                <span className="text-[11px]">Mở tất cả</span>
              </button>

              {/* Fit view button */}
              <FitViewButton />

              {/* MiniMap Toggle */}
              <button
                onClick={() => setShowMiniMap((v) => !v)}
                className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                  showMiniMap
                    ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700"
                }`}
                title="Bản đồ thu nhỏ"
              >
                <MapPin size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── KNOWLEDGE TREE CANVAS (CLEAN, PROGRESSIVE DRILLDOWN) ─────── */}
        <MindmapCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          showMiniMap={showMiniMap}
        />

        {/* ─── QUICK FOOTER: 3 BULLET TAKEAWAYS (SIÊU GỌN) ─────────────── */}
        <div
          className="animate-cascade-item rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
          style={{ animationDelay: "760ms" }}
        >
          <div className="flex items-center gap-2 text-slate-500">
            <Lightbulb size={14} className="text-amber-500 shrink-0" />
            <span className="font-bold text-slate-700 dark:text-slate-300">Ghi nhớ vàng:</span>
            <span className="text-slate-600 dark:text-slate-400 truncate max-w-xl">
              {currentData.quickSummary[0]}
            </span>
          </div>
          <button
            onClick={() => onNavigateToTab?.("quiz")}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-auto"
          >
            Kiểm tra Quiz ngay →
          </button>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
