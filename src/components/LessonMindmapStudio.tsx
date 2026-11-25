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
  Lightbulb,
  RotateCcw,
  FolderOpen,
  FolderClosed,
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
  chapterTitle?: string;
  chapterLessonIds?: string[];
  mentorMascot: MentorMascot;
  instructorMindmapNodes?: any[];
  instructorMindmapEdges?: any[];
  completedLessonIds?: Set<string>;
  onNavigateToTab?: (tab: "lecture" | "video" | "quiz") => void;
}

// Hàm đệ quy tính toán tọa độ cây lũy tiến (có chống vòng lặp cycle bằng visited set)
function placeSubtree(
  nodeId: string,
  currentY: number,
  depth: number,
  childrenMap: Map<string, string[]>,
  expandedNodeIds: Set<string>,
  nodeMap: Map<string, TreeMindmapNode>,
  positions: Map<string, { x: number; y: number }>,
  visited: Set<string>
): { topY: number; bottomY: number; centerY: number } {
  if (visited.has(nodeId)) {
    return { topY: currentY, bottomY: currentY, centerY: currentY };
  }
  visited.add(nodeId);

  const node = nodeMap.get(nodeId);
  const type = node?.data.nodeType || "leaf";
  const nodeHeight =
    type === "root" ? 120 : type === "branch" ? 100 : type === "leaf" ? 150 : 95;
  const gap = 38;

  const xPositions = [40, 335, 650, 975];
  const posX = depth < xPositions.length ? xPositions[depth] : 40 + depth * 320;

  const isExpanded = expandedNodeIds.has(nodeId);
  const children = (childrenMap.get(nodeId) || []).filter(
    (cid) => nodeMap.has(cid) && !visited.has(cid)
  );

  if (!isExpanded || children.length === 0) {
    const centerY = currentY + nodeHeight / 2;
    positions.set(nodeId, { x: posX, y: currentY });
    return { topY: currentY, bottomY: currentY + nodeHeight + gap, centerY };
  }

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
      positions,
      visited
    );
    childCenterYs.push(childRes.centerY);
    childRunnerY = Math.max(childRunnerY, childRes.bottomY);
  }

  const midChildrenCenter =
    childCenterYs.length > 0
      ? (childCenterYs[0] + childCenterYs[childCenterYs.length - 1]) / 2
      : currentY + nodeHeight / 2;
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
    <div className="h-[600px] xl:h-[680px] w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-[#f8fafc] dark:bg-[#10131a] overflow-hidden relative shadow-2xs">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        minZoom={0.25}
        maxZoom={1.6}
      >
        <Background color="#64748b" gap={22} size={1.15} className="opacity-35 dark:opacity-30" />
        <Controls
          position="top-left"
          className="!bg-white/95 dark:!bg-slate-900/95 !border-slate-200 dark:!border-slate-700 !shadow-sm !rounded-xl overflow-hidden"
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
  chapterTitle,
  chapterLessonIds,
  mentorMascot,
  instructorMindmapNodes,
  instructorMindmapEdges,
  completedLessonIds,
  onNavigateToTab,
}: LessonMindmapStudioProps) {
  const [showMiniMap, setShowMiniMap] = useState(false);
  const hasInstructorMap = Boolean(instructorMindmapNodes && instructorMindmapNodes.length > 0);
  const [mindmapSource, setMindmapSource] = useState<"standard" | "instructor">(
    hasInstructorMap ? "instructor" : "standard"
  );

  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    () => new Set([instructorMindmapNodes?.[0]?.id || "root"])
  );

  const baseData: SubjectTreeData =
    TREE_MINDMAP_DATA[subjectId] || TREE_MINDMAP_DATA.oop;

  const isNodeCompletedForStudent = useCallback(
    (
      title: string,
      nodeId: string,
      tag?: string,
      explicitLessonId?: string,
      branchIndex?: number
    ) => {
      if (!completedLessonIds || completedLessonIds.size === 0) {
        return false;
      }
      if (completedLessonIds.has(nodeId)) return true;
      if (explicitLessonId && completedLessonIds.has(explicitLessonId)) return true;
      const m = title.match(/^\s*(\d+\.\d+)/);
      if (m && completedLessonIds.has(m[1])) return true;
      if (tag && chapterLessonIds && chapterLessonIds.length > 0) {
        const mTag = tag.match(/bài\s*(\d+)/i);
        if (mTag) {
          const lessonKey = chapterLessonIds[Number(mTag[1]) - 1];
          if (lessonKey && completedLessonIds.has(lessonKey)) return true;
        }
      }
      if (
        typeof branchIndex === "number" &&
        chapterLessonIds &&
        chapterLessonIds[branchIndex] &&
        completedLessonIds.has(chapterLessonIds[branchIndex])
      ) {
        return true;
      }
      return false;
    },
    [completedLessonIds, chapterLessonIds]
  );

  const currentData: SubjectTreeData = useMemo(() => {
    const chapterDoneRatio =
      chapterLessonIds && chapterLessonIds.length > 0 && completedLessonIds
        ? Math.round(
            (chapterLessonIds.filter((lid) => completedLessonIds.has(lid)).length /
              chapterLessonIds.length) *
              100
          )
        : null;

    if (mindmapSource !== "instructor" || !hasInstructorMap) {
      const stdParentMap = new Map<string, string>();
      for (const e of baseData.edges) {
        stdParentMap.set(e.target, e.source);
      }
      const stdBranchDone = new Map<string, boolean>();
      let bIdx = 0;
      for (const n of baseData.nodes) {
        if (n.data.nodeType === "branch") {
          const done = isNodeCompletedForStudent(
            n.data.title,
            n.id,
            n.data.badge,
            undefined,
            bIdx
          );
          stdBranchDone.set(n.id, done);
          bIdx += 1;
        }
      }
      const branchValues = Array.from(stdBranchDone.values());
      const rootPct =
        chapterDoneRatio !== null
          ? chapterDoneRatio
          : branchValues.length > 0
          ? Math.round((branchValues.filter(Boolean).length / branchValues.length) * 100)
          : 0;

      return {
        ...baseData,
        title: chapterTitle ? `${baseData.title} · ${chapterTitle}` : baseData.title,
        nodes: baseData.nodes.map((n) => {
          if (n.data.nodeType === "root") {
            const rootDone = rootPct >= 100;
            return {
              ...n,
              data: {
                ...n.data,
                status: rootDone ? ("completed" as const) : ("in-progress" as const),
                progressPct: rootPct,
              },
            };
          }
          if (n.data.nodeType === "branch") {
            const isDone = Boolean(stdBranchDone.get(n.id));
            return {
              ...n,
              data: {
                ...n.data,
                status: isDone ? ("completed" as const) : ("in-progress" as const),
                progressPct: isDone ? 100 : 0,
              },
            };
          }
          const pid = stdParentMap.get(n.id);
          const leafDone =
            isNodeCompletedForStudent(n.data.title, n.id, n.data.badge) ||
            Boolean(pid && stdBranchDone.get(pid));
          return {
            ...n,
            data: {
              ...n.data,
              status: leafDone ? ("completed" as const) : ("in-progress" as const),
              progressPct: leafDone ? 100 : 0,
            },
          };
        }),
      };
    }

    const mappedEdges = (instructorMindmapEdges || []).map((e: any, idx: number) => ({
      id: String(e.id || `inst-e-${idx}`),
      source: String(e.source),
      target: String(e.target),
    }));
    const instParentMap = new Map<string, string>();
    for (const e of mappedEdges) {
      instParentMap.set(e.target, e.source);
    }

    const instBranchDone = new Map<string, boolean>();
    let instBranchIdx = 0;
    (instructorMindmapNodes || []).forEach((n: any, idx: number) => {
      const nType =
        n.data?.nodeType === "root"
          ? "root"
          : n.data?.nodeType === "leaf"
          ? "leaf"
          : "branch";
      if (nType === "branch") {
        const nid = String(n.id || `inst-n-${idx}`);
        const done = isNodeCompletedForStudent(
          String(n.data?.title || ""),
          nid,
          String(n.data?.tag || ""),
          n.data?.lessonId ? String(n.data.lessonId) : undefined,
          instBranchIdx
        );
        instBranchDone.set(nid, done);
        instBranchIdx += 1;
      }
    });

    const instBranchVals = Array.from(instBranchDone.values());
    const instRootPct =
      chapterDoneRatio !== null
        ? chapterDoneRatio
        : instBranchVals.length > 0
        ? Math.round((instBranchVals.filter(Boolean).length / instBranchVals.length) * 100)
        : 0;

    const BRANCH_PALETTE = ["blue", "purple", "emerald", "cyan", "rose"];
    const instBranchTone = new Map<string, string>();
    let toneBranchCounter = 0;
    (instructorMindmapNodes || []).forEach((n: any, idx: number) => {
      const nType =
        n.data?.nodeType === "root"
          ? "root"
          : n.data?.nodeType === "leaf"
          ? "leaf"
          : "branch";
      if (nType === "branch") {
        const nid = String(n.id || `inst-n-${idx}`);
        instBranchTone.set(
          nid,
          n.data?.tone || BRANCH_PALETTE[toneBranchCounter % BRANCH_PALETTE.length]
        );
        toneBranchCounter += 1;
      }
    });

    const mappedNodes = (instructorMindmapNodes || []).map((n: any, idx: number) => {
      const nid = String(n.id || `inst-n-${idx}`);
      const title = n.data?.title || "Khái niệm Giảng viên";
      const nType = (
        n.data?.nodeType === "root"
          ? "root"
          : n.data?.nodeType === "leaf"
          ? "leaf"
          : "branch"
      ) as "root" | "branch" | "leaf";

      let personalPct = 0;
      let isDone = false;
      if (nType === "root") {
        personalPct = instRootPct;
        isDone = instRootPct >= 100;
      } else if (nType === "branch") {
        isDone = Boolean(instBranchDone.get(nid));
        personalPct = isDone ? 100 : 0;
      } else {
        const pid = instParentMap.get(nid);
        isDone =
          isNodeCompletedForStudent(title, nid, String(n.data?.tag || "")) ||
          Boolean(pid && instBranchDone.get(pid));
        personalPct = isDone ? 100 : 0;
      }

      const inheritedTone =
        nType === "branch"
          ? instBranchTone.get(nid) || "blue"
          : instBranchTone.get(instParentMap.get(nid) || "") || n.data?.tone || "blue";

      return {
        id: nid,
        type: "compactTreeNode" as const,
        position: n.position || { x: 40 + idx * 240, y: 120 },
        data: {
          title,
          badge: n.data?.tag || "Master Map",
          summary: n.data?.summary || "",
          status: (isDone ? "completed" : "in-progress") as "completed" | "in-progress",
          progressPct: personalPct,
          xp: n.data?.xp ? Number(n.data.xp) : undefined,
          nodeType: nType,
          tone: inheritedTone,
        },
      };
    });

    const dynamicTakeaways = mappedNodes
      .filter((n) => n.data.summary && n.data.summary.trim().length > 10)
      .map((n) => `${n.data.title}: ${n.data.summary.trim()}`);

    return {
      ...baseData,
      title: `Master Mindmap Giảng viên · ${chapterTitle || baseData.subjectCode}`,
      nodes: mappedNodes,
      edges: mappedEdges,
      quickSummary:
        dynamicTakeaways.length > 0 ? dynamicTakeaways : baseData.quickSummary,
    };
  }, [
    baseData,
    chapterLessonIds,
    chapterTitle,
    completedLessonIds,
    hasInstructorMap,
    instructorMindmapEdges,
    instructorMindmapNodes,
    isNodeCompletedForStudent,
    mindmapSource,
  ]);

  useEffect(() => {
    if (hasInstructorMap) {
      setMindmapSource("instructor");
    } else {
      setMindmapSource("standard");
    }
  }, [hasInstructorMap, subjectId, chapterTitle]);

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

  // Khi đổi môn học hoặc rootNodeId thay đổi, mở root + nhánh đầu tiên để cây hiển thị có chiều sâu ngay lập tức
  useEffect(() => {
    if (rootNodeId) {
      const firstBranch = (childrenMap.get(rootNodeId) || [])[0];
      const nextInitial = new Set<string>([rootNodeId]);
      if (firstBranch) nextInitial.add(firstBranch);
      setExpandedNodeIds(nextInitial);
    }
  }, [rootNodeId, subjectId, childrenMap]);

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
    setExpandedNodeIds(new Set([rootNodeId]));
  }, [rootNodeId]);

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
    // 1. Thu thập danh sách nodes hiển thị từ root (chống cycle bằng visited)
    const visibleIds = new Set<string>();
    const collectVisited = new Set<string>();
    function collect(id: string) {
      if (collectVisited.has(id) || !nodeMap.has(id)) return;
      collectVisited.add(id);
      visibleIds.add(id);
      if (expandedNodeIds.has(id)) {
        const children = childrenMap.get(id) || [];
        for (const cid of children) {
          collect(cid);
        }
      }
    }
    if (rootNodeId && nodeMap.has(rootNodeId)) {
      collect(rootNodeId);
    }

    // 2. Tính toán vị trí theo thuật toán cây phân cấp (chống cycle bằng placeVisited)
    const positions = new Map<string, { x: number; y: number }>();
    const placeVisited = new Set<string>();
    let nextFreeY = 40;
    if (rootNodeId && nodeMap.has(rootNodeId)) {
      const rootRes = placeSubtree(
        rootNodeId,
        40,
        0,
        childrenMap,
        expandedNodeIds,
        nodeMap,
        positions,
        placeVisited
      );
      nextFreeY = Math.max(nextFreeY, rootRes.bottomY + 20);
    }

    // Bảo đảm chỉ hiển thị các node thực sự không thể đi tới từ root (không ép các nhánh đang chủ động thu gọn phải hiện lại)
    const reachableFromRoot = new Set<string>();
    if (rootNodeId && nodeMap.has(rootNodeId)) {
      const stack = [rootNodeId];
      while (stack.length > 0) {
        const curr = stack.pop()!;
        if (reachableFromRoot.has(curr)) continue;
        reachableFromRoot.add(curr);
        const children = childrenMap.get(curr) || [];
        for (const cid of children) {
          if (nodeMap.has(cid) && !reachableFromRoot.has(cid)) {
            stack.push(cid);
          }
        }
      }
    }
    const orphanNodes = currentData.nodes.filter((n) => !reachableFromRoot.has(n.id));
    if (orphanNodes.length > 0) {
      let orphanX = 40;
      let orphanY = nextFreeY;
      orphanNodes.forEach((n, oIdx) => {
        visibleIds.add(n.id);
        if (!positions.has(n.id)) {
          positions.set(n.id, { x: orphanX, y: orphanY });
          if ((oIdx + 1) % 3 === 0) {
            orphanX = 40;
            orphanY += 170;
          } else {
            orphanX += 310;
          }
        }
      });
    }

    // 3. Xây dựng danh sách Nodes ReactFlow (giữ nguyên tọa độ Giảng viên kéo thả nếu không chồng lấp)
    const visibleRawNodes = currentData.nodes.filter((n) => visibleIds.has(n.id));
    let useSavedInstructorPositions = mindmapSource === "instructor" && visibleRawNodes.length > 0;
    if (useSavedInstructorPositions) {
      for (let i = 0; i < visibleRawNodes.length; i++) {
        const pi = visibleRawNodes[i].position;
        if (!pi || !Number.isFinite(pi.x) || !Number.isFinite(pi.y)) {
          useSavedInstructorPositions = false;
          break;
        }
        for (let j = i + 1; j < visibleRawNodes.length; j++) {
          const pj = visibleRawNodes[j].position;
          if (!pj || (Math.abs(pi.x - pj.x) < 120 && Math.abs(pi.y - pj.y) < 75)) {
            useSavedInstructorPositions = false;
            break;
          }
        }
        if (!useSavedInstructorPositions) break;
      }
    }

    const resolvedToneByNode = new Map<string, string>();
    const FALLBACK_TONES = ["blue", "purple", "emerald", "cyan", "rose"];
    let fallbackIdx = 0;

    const cNodes: Node[] = [];
    for (const rawNode of visibleRawNodes) {
      const pos = useSavedInstructorPositions
        ? rawNode.position
        : positions.get(rawNode.id) || rawNode.position;
      const children = (childrenMap.get(rawNode.id) || []).filter((cid) =>
        nodeMap.has(cid)
      );
      const hasChildren = children.length > 0;
      const isExpanded = expandedNodeIds.has(rawNode.id);

      // Kế thừa Tone màu chủ đề từ cành cha nếu là leaf/subleaf
      let effectiveTone = rawNode.data.tone;
      if (!effectiveTone) {
        let currId = rawNode.id;
        while (parentMap.has(currId)) {
          const pid = parentMap.get(currId)!;
          const pNode = nodeMap.get(pid);
          if (pNode?.data.tone || resolvedToneByNode.has(pid)) {
            effectiveTone = pNode?.data.tone || resolvedToneByNode.get(pid);
            break;
          }
          currId = pid;
        }
      }
      if (!effectiveTone && rawNode.data.nodeType === "branch") {
        effectiveTone = FALLBACK_TONES[fallbackIdx % FALLBACK_TONES.length];
        fallbackIdx += 1;
      }
      resolvedToneByNode.set(rawNode.id, effectiveTone || "blue");

      cNodes.push({
        id: rawNode.id,
        type: "compactTreeNode",
        position: pos,
        data: {
          ...rawNode.data,
          tone: effectiveTone || "blue",
          hasChildren,
          isExpanded,
          childrenCount: children.length,
          onToggleExpand: () => toggleNode(rawNode.id),
        },
      });
    }

    // 4. Xây dựng danh sách Edges ReactFlow: Nét liền thanh mảnh, nhấn nhẹ nhánh đang mở / hoàn thành
    const cEdges: Edge[] = [];
    for (const rawEdge of currentData.edges) {
      if (visibleIds.has(rawEdge.source) && visibleIds.has(rawEdge.target)) {
        const isFromRoot = rawEdge.source === rootNodeId;
        const targetNode = nodeMap.get(rawEdge.target);
        const isTargetCompleted = targetNode?.data.status === "completed";
        const isTargetExpanded = expandedNodeIds.has(rawEdge.target);

        const strokeColor = isTargetCompleted
          ? "#10b981"
          : isTargetExpanded || isFromRoot
          ? "#64748b"
          : "#94a3b8";

        cEdges.push({
          id: rawEdge.id,
          source: rawEdge.source,
          target: rawEdge.target,
          animated: false,
          type: "default",
          style: {
            stroke: strokeColor,
            strokeWidth: isFromRoot ? 1.85 : 1.4,
            opacity: isTargetCompleted ? 0.72 : isFromRoot ? 0.85 : 0.55,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 9,
            height: 9,
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
  }, [currentData, rootNodeId, childrenMap, parentMap, nodeMap, expandedNodeIds, toggleNode, mindmapSource]);

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges);

  useEffect(() => {
    setNodes(computedNodes);
    setEdges(computedEdges);
  }, [computedNodes, computedEdges, setNodes, setEdges]);

  return (
    <ReactFlowProvider>
      <div key={`mindmap-studio-${subjectId}`} className="space-y-3">
        {/* Subtle Clean Edge Hover */}
        <style>{`
          .react-flow__edge:hover .react-flow__edge-path {
            stroke-width: 2.2px !important;
            opacity: 1 !important;
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
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                  {currentData.subjectCode}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <GitBranch size={15} className="text-slate-500 dark:text-slate-400" />
                  <span>{currentData.title}</span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Cây tri thức mở rộng lũy tiến — nhấp vào bài học hoặc nút <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">[+]</span> để mở chi tiết từng nhánh.
              </p>
            </div>

            {/* Quick Metrics & Dynamic Drilldown Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Chọn nguồn Mindmap rõ ràng: Sơ đồ Giảng viên vs Cây chuẩn */}
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 p-0.5">
                {hasInstructorMap && (
                  <button
                    type="button"
                    onClick={() => {
                      setMindmapSource("instructor");
                      setExpandedNodeIds(
                        new Set([String(instructorMindmapNodes?.[0]?.id || "root")])
                      );
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      mindmapSource === "instructor"
                        ? "bg-[#141619] text-white dark:bg-white dark:text-[#141619] shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Sơ đồ Giảng viên
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMindmapSource("standard");
                    setExpandedNodeIds(new Set(["root"]));
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    mindmapSource === "standard" || !hasInstructorMap
                      ? "bg-[#141619] text-white dark:bg-white dark:text-[#141619] shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Cây chuẩn
                </button>
              </div>

              {/* Counter Pill */}
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Hiển thị: {visibleCount} / {totalCount} nút
              </span>

              {/* Collapse to Main Branches */}
              {(() => {
                const isMainCollapsed =
                  Boolean(rootNodeId) &&
                  expandedNodeIds.size === 1 &&
                  expandedNodeIds.has(rootNodeId);
                const isAllExpanded =
                  currentData.nodes.length > 0 &&
                  currentData.nodes.every((n) => {
                    const children = childrenMap.get(n.id) || [];
                    return children.length === 0 || expandedNodeIds.has(n.id);
                  });
                return (
                  <>
                    <button
                      type="button"
                      onClick={handleCollapseToMain}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                        isMainCollapsed
                          ? "bg-[#141619] border-[#141619] text-white dark:bg-white dark:border-white dark:text-[#141619] shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                      }`}
                      title="Thu gọn về các bài chính"
                    >
                      <FolderClosed size={12} />
                      <span className="text-[11px]">Chỉ bài chính</span>
                    </button>

                    {/* Expand All */}
                    <button
                      type="button"
                      onClick={handleExpandAll}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                        isAllExpanded && !isMainCollapsed
                          ? "bg-[#141619] border-[#141619] text-white dark:bg-white dark:border-white dark:text-[#141619] shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                      }`}
                      title="Mở rộng toàn bộ cây"
                    >
                      <FolderOpen size={12} />
                      <span className="text-[11px]">Mở tất cả</span>
                    </button>
                  </>
                );
              })()}

              {/* Fit view button */}
              <FitViewButton />

              {/* MiniMap Toggle */}
              <button
                onClick={() => setShowMiniMap((v) => !v)}
                className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                  showMiniMap
                    ? "bg-[#141619] border-[#141619] text-white dark:bg-white dark:border-white dark:text-[#141619]"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
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
