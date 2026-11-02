import { useState, useMemo } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Columns3,
  ExternalLink,
  Filter,
  Flame,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Link2,
  Lock,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Unlock,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";

export type ColumnId = "backlog" | "ready" | "in-progress" | "review" | "done";

export type Priority = "low" | "medium" | "high";

export interface KanbanTask {
  id: string;
  code: string;
  title: string;
  description: string;
  column: ColumnId;
  priority: Priority;
  assignee: {
    name: string;
    avatar: string;
    role: string;
  };
  estimateHours: number;
  dueDate: string;
  epic: string;
  dependsOn?: string; // id of task that must be done first (Hard Constraint H2)
  deliverable?: {
    type: "pr" | "commit" | "test";
    label: string;
    link?: string;
  };
}

const initialTasks: KanbanTask[] = [
  {
    id: "task-1",
    code: "BE-01",
    title: "Thiết kế Database ERD & Quản lý Timezone UTC (H4)",
    description: "Đặc tả schema SQLite/PostgreSQL chuẩn ISO-8601 UTC theo yêu cầu Thầy Phước.",
    column: "done",
    priority: "high",
    assignee: { name: "Minh Anh", avatar: "MA", role: "Team Lead" },
    estimateHours: 4,
    dueDate: "28/10",
    epic: "Core Architecture",
    deliverable: { type: "commit", label: "commit #a8f3b2" },
  },
  {
    id: "task-2",
    code: "DOC-01",
    title: "Xây dựng SRS Master Blueprint v3.1 & Xuất file Word",
    description: "Đặc tả ràng buộc cứng H1-H4, kịch bản Socratic và Anti-Freerider cho Thầy.",
    column: "done",
    priority: "high",
    assignee: { name: "Minh Anh", avatar: "MA", role: "Team Lead" },
    estimateHours: 5,
    dueDate: "29/10",
    epic: "Documentation",
    deliverable: { type: "commit", label: "docs/Tai_Lieu_Khoi_Dong.docx" },
  },
  {
    id: "task-3",
    code: "BE-02",
    title: "Tái cấu trúc Backend Layered Architecture (Clean Code)",
    description: "Tách 650 dòng monolithic thành core, schemas, services, api v1.",
    column: "done",
    priority: "high",
    assignee: { name: "Minh Anh", avatar: "MA", role: "Team Lead" },
    estimateHours: 4,
    dueDate: "02/11",
    epic: "Backend Refactor",
    deliverable: { type: "pr", label: "PR #14: Layered Arch" },
  },
  {
    id: "task-4",
    code: "SAND-01",
    title: "Bộ Sandbox Test Runner độc lập (5 ca kiểm thử)",
    description: "Chạy đánh giá mã nguồn deque: maxlen, boundary, empty string an toàn.",
    column: "in-progress",
    priority: "high",
    assignee: { name: "Quốc Huy", avatar: "QH", role: "Backend Dev" },
    estimateHours: 3.5,
    dueDate: "04/11",
    epic: "Code Grader",
    dependsOn: "task-3",
  },
  {
    id: "task-5",
    code: "AI-01",
    title: "Socratic AI Tutor Hint Ladder (Thang gợi ý 3 nấc)",
    description: "Từ chối đưa đáp án trực tiếp; mở tuần tự Hint 1 -> Hint 2 -> Hint 3.",
    column: "review",
    priority: "high",
    assignee: { name: "Quốc Huy", avatar: "QH", role: "Backend Dev" },
    estimateHours: 4,
    dueDate: "05/11",
    epic: "AI Pedagogy",
    dependsOn: "task-4",
    deliverable: { type: "test", label: "Test passed: 14/14" },
  },
  {
    id: "task-6",
    code: "DEF-01",
    title: "AI Defense Simulator: Giả lập Hội đồng phản biện",
    description: "AI đóng vai hội đồng khó tính chất vấn sinh viên trước khi bảo vệ thật.",
    column: "ready",
    priority: "medium",
    assignee: { name: "Hoàng Long", avatar: "HL", role: "QA & AI Ops" },
    estimateHours: 5,
    dueDate: "08/11",
    epic: "Defense Room",
    dependsOn: "task-5",
  },
  {
    id: "task-7",
    code: "QA-01",
    title: "Bộ kiểm thử 50 Test Cases tự động chống hồi quy",
    description: "Đảm bảo sinh viên nộp bài không làm treo server hay bypass sandbox.",
    column: "backlog",
    priority: "medium",
    assignee: { name: "Hoàng Long", avatar: "HL", role: "QA & AI Ops" },
    estimateHours: 3,
    dueDate: "10/11",
    epic: "Testing",
    dependsOn: "task-4",
  },
  {
    id: "task-8",
    code: "FE-01",
    title: "Tích hợp Radar Skill Chart & Daily Heatmap Streak",
    description: "Trực quan hóa chỉ số kỹ năng dev: CleanCode, Debugging, Teamwork.",
    column: "in-progress",
    priority: "medium",
    assignee: { name: "Minh Anh", avatar: "MA", role: "Team Lead" },
    estimateHours: 3,
    dueDate: "06/11",
    epic: "Gamification",
  },
  {
    id: "task-9",
    code: "ANTI-01",
    title: "Thuật toán Anti-Freerider đo lường đóng góp nhóm",
    description: "Tính % đóng góp dựa trên số task Done, commit Git và test evidence thật.",
    column: "backlog",
    priority: "low",
    assignee: { name: "Quốc Huy", avatar: "QH", role: "Backend Dev" },
    estimateHours: 4,
    dueDate: "12/11",
    epic: "Team Analytics",
    dependsOn: "task-3",
  },
];

const columnsConfig: Array<{ id: ColumnId; title: string; color: string; bg: string; dot: string; maxWip?: number }> = [
  { id: "backlog", title: "Backlog", color: "text-slate-600", bg: "bg-slate-100/70", dot: "bg-slate-400" },
  { id: "ready", title: "Ready", color: "text-blue-700", bg: "bg-blue-50/70", dot: "bg-blue-500" },
  { id: "in-progress", title: "In Progress", color: "text-amber-700", bg: "bg-amber-50/70", dot: "bg-amber-500", maxWip: 3 },
  { id: "review", title: "Review / PR", color: "text-purple-700", bg: "bg-purple-50/70", dot: "bg-purple-500" },
  { id: "done", title: "Done", color: "text-emerald-700", bg: "bg-emerald-50/70", dot: "bg-emerald-500" },
];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"team" | "my">("team");

  // H2 Violation Modal State
  const [h2Violation, setH2Violation] = useState<{
    task: KanbanTask;
    blockingTask: KanbanTask;
  } | null>(null);

  // AI WBS Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // New Task Modal State
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskEpic, setNewTaskEpic] = useState("Feature");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium");
  const [newTaskAssignee, setNewTaskAssignee] = useState("Minh Anh");
  const [newTaskCol, setNewTaskCol] = useState<ColumnId>("backlog");

  // Helper find task by ID
  const getTaskById = (id: string) => tasks.find((t) => t.id === id);

  // Move Task logic with Hard Constraint H2 check
  const handleMoveTask = (task: KanbanTask, targetColumn: ColumnId) => {
    if (task.column === targetColumn) return;

    // Hard Constraint H2: If moving to "done", all dependencies must already be "done"
    if (targetColumn === "done" && task.dependsOn) {
      const parent = getTaskById(task.dependsOn);
      if (parent && parent.column !== "done") {
        setH2Violation({ task, blockingTask: parent });
        return;
      }
    }

    // Soft WIP Check on "in-progress" (Max 3)
    if (targetColumn === "in-progress") {
      const currentInProg = tasks.filter((t) => t.column === "in-progress").length;
      if (currentInProg >= 3) {
        // Warning but allowed or soft notice
      }
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, column: targetColumn } : t))
    );
  };

  // Next / Prev column steps
  const columnOrder: ColumnId[] = ["backlog", "ready", "in-progress", "review", "done"];
  const moveNext = (task: KanbanTask) => {
    const idx = columnOrder.indexOf(task.column);
    if (idx < columnOrder.length - 1) {
      handleMoveTask(task, columnOrder[idx + 1]);
    }
  };
  const movePrev = (task: KanbanTask) => {
    const idx = columnOrder.indexOf(task.column);
    if (idx > 0) {
      handleMoveTask(task, columnOrder[idx - 1]);
    }
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (viewMode === "my" && t.assignee.name !== "Minh Anh") return false;
      if (filterAssignee !== "all" && t.assignee.name !== filterAssignee) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesCode = t.code.toLowerCase().includes(query);
        const matchesEpic = t.epic.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCode && !matchesEpic) return false;
      }
      return true;
    });
  }, [tasks, viewMode, filterAssignee, filterPriority, searchQuery]);

  // Anti-Freerider Contribution Calculation
  const contribution = useMemo(() => {
    const members: Record<string, { done: number; inProg: number; total: number; hours: number }> = {
      "Minh Anh": { done: 0, inProg: 0, total: 0, hours: 0 },
      "Quốc Huy": { done: 0, inProg: 0, total: 0, hours: 0 },
      "Hoàng Long": { done: 0, inProg: 0, total: 0, hours: 0 },
    };
    tasks.forEach((t) => {
      const name = t.assignee.name;
      if (members[name]) {
        members[name].total += 1;
        members[name].hours += t.estimateHours;
        if (t.column === "done") members[name].done += 1;
        if (t.column === "in-progress" || t.column === "review") members[name].inProg += 1;
      }
    });

    const totalHours = Object.values(members).reduce((s, m) => s + m.hours, 0) || 1;
    return {
      minhAnh: Math.round((members["Minh Anh"].hours / totalHours) * 100),
      quocHuy: Math.round((members["Quốc Huy"].hours / totalHours) * 100),
      hoangLong: Math.round((members["Hoàng Long"].hours / totalHours) * 100),
    };
  }, [tasks]);

  // Trigger AI WBS Generation
  const handleGenerateWbs = () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setTimeout(() => {
      const newItems: KanbanTask[] = [
        {
          id: `task-ai-${Date.now()}-1`,
          code: `AI-${Math.floor(Math.random() * 90 + 10)}`,
          title: `Thiết kế kiến trúc Module: ${aiPrompt}`,
          description: "Phân tích yêu cầu, vẽ sơ đồ Sequence và lập tài liệu kỹ thuật chi tiết.",
          column: "backlog",
          priority: "high",
          assignee: { name: "Minh Anh", avatar: "MA", role: "Team Lead" },
          estimateHours: 3,
          dueDate: "14/11",
          epic: "AI Decomposition",
        },
        {
          id: `task-ai-${Date.now()}-2`,
          code: `AI-${Math.floor(Math.random() * 90 + 10)}`,
          title: `Xây dựng Endpoint API & Sandbox: ${aiPrompt}`,
          description: "Viết logic FastAPI, kiểm tra ràng buộc H2/H3 và bảo mật sandbox.",
          column: "backlog",
          priority: "medium",
          assignee: { name: "Quốc Huy", avatar: "QH", role: "Backend Dev" },
          estimateHours: 4,
          dueDate: "16/11",
          epic: "AI Decomposition",
          dependsOn: `task-ai-${Date.now()}-1`,
        },
        {
          id: `task-ai-${Date.now()}-3`,
          code: `AI-${Math.floor(Math.random() * 90 + 10)}`,
          title: `Viết Unit Test & Kiểm thử Tích hợp: ${aiPrompt}`,
          description: "Viết 15 test cases tự động mô phỏng luồng người dùng thực tế.",
          column: "backlog",
          priority: "medium",
          assignee: { name: "Hoàng Long", avatar: "HL", role: "QA & AI Ops" },
          estimateHours: 3.5,
          dueDate: "18/11",
          epic: "AI Decomposition",
          dependsOn: `task-ai-${Date.now()}-2`,
        },
      ];
      setTasks((prev) => [...prev, ...newItems]);
      setAiGenerating(false);
      setAiModalOpen(false);
      setAiPrompt("");
    }, 1200);
  };

  // Add Custom Task
  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: KanbanTask = {
      id: `task-custom-${Date.now()}`,
      code: `CUST-${Math.floor(Math.random() * 900 + 100)}`,
      title: newTaskTitle.trim(),
      description: "Thẻ công việc nguyên tử phân rã trực tiếp từ Sprint Backlog.",
      column: newTaskCol,
      priority: newTaskPriority,
      assignee: {
        name: newTaskAssignee,
        avatar: newTaskAssignee === "Minh Anh" ? "MA" : newTaskAssignee === "Quốc Huy" ? "QH" : "HL",
        role: newTaskAssignee === "Minh Anh" ? "Team Lead" : newTaskAssignee === "Quốc Huy" ? "Backend Dev" : "QA & AI Ops",
      },
      estimateHours: 3,
      dueDate: "15/11",
      epic: newTaskEpic,
    };
    setTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle("");
    setNewTaskModalOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-slate-50/50 p-6">
      {/* ── TOP HEADER & CONTROLS ────────────────────────────────────── */}
      <header className="mb-6 flex flex-col gap-4">
        {/* Row 1: Title, Sprint & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                <Columns3 size={19} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    Bảng Kanban Dự Án Kỹ Thuật
                  </h1>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    Sprint 1: Core Architecture
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Dự án CodeMind Campus • Nhóm 3 người • Kiểm soát ràng buộc cứng H2 & chống Free-rider
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle: Team vs My Tasks */}
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setViewMode("team")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "team"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users size={14} />
                Toàn đội (3)
              </button>
              <button
                onClick={() => setViewMode("my")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "my"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <UserCheck size={14} />
                Task của tôi
              </button>
            </div>

            {/* AI WBS Generator Button */}
            <button
              onClick={() => setAiModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-3.5 py-2 text-xs font-semibold text-purple-700 shadow-sm transition hover:border-purple-300 hover:shadow"
            >
              <Sparkles size={15} className="text-purple-600 animate-pulse" />
              <span>AI Phân rã WBS</span>
            </button>

            {/* New Task Button */}
            <button
              onClick={() => setNewTaskModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition hover:bg-blue-700 hover:shadow"
            >
              <Plus size={15} />
              <span>Thêm Thẻ</span>
            </button>
          </div>
        </div>

        {/* Row 2: Anti-Freerider Contribution Metric & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
          {/* Contribution Progress */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
              <Flame size={14} className="text-amber-500" />
              Tỷ lệ đóng góp (Anti-Freerider):
            </span>
            <div className="flex h-3 w-48 overflow-hidden rounded-full bg-slate-100">
              <div
                style={{ width: `${contribution.minhAnh}%` }}
                className="bg-blue-600"
                title={`Minh Anh (Lead): ${contribution.minhAnh}%`}
              />
              <div
                style={{ width: `${contribution.quocHuy}%` }}
                className="bg-amber-500"
                title={`Quốc Huy: ${contribution.quocHuy}%`}
              />
              <div
                style={{ width: `${contribution.hoangLong}%` }}
                className="bg-emerald-500"
                title={`Hoàng Long: ${contribution.hoangLong}%`}
              />
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-600" /> Minh Anh ({contribution.minhAnh}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Quốc Huy ({contribution.quocHuy}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Hoàng Long ({contribution.hoangLong}%)
              </span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã task, tên..."
                className="w-44 rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-700 transition focus:border-blue-500 focus:bg-white focus:outline-hidden"
            >
              <option value="all">Mọi thành viên</option>
              <option value="Minh Anh">Minh Anh</option>
              <option value="Quốc Huy">Quốc Huy</option>
              <option value="Hoàng Long">Hoàng Long</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-700 transition focus:border-blue-500 focus:bg-white focus:outline-hidden"
            >
              <option value="all">Mọi ưu tiên</option>
              <option value="high">Ưu tiên Cao</option>
              <option value="medium">Ưu tiên Vừa</option>
              <option value="low">Ưu tiên Thấp</option>
            </select>
          </div>
        </div>
      </header>

      {/* ── 5 KANBAN COLUMNS (TRELLO / LINEAR STYLE) ────────────────── */}
      <div className="grid flex-1 grid-cols-5 gap-4 overflow-x-auto pb-4">
        {columnsConfig.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.column === col.id);
          const isWipExceeded = col.maxWip && colTasks.length > col.maxWip;

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-2xl border border-slate-200/80 ${col.bg} p-3 shadow-xs transition-colors`}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {col.title}
                  </h2>
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-slate-600 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>

                {col.maxWip && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      isWipExceeded
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100/80 text-amber-800"
                    }`}
                  >
                    WIP: {colTasks.length}/{col.maxWip}
                  </span>
                )}
              </div>

              {/* Tasks List */}
              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
                {colTasks.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300/80 p-4 text-center">
                    <p className="text-xs font-medium text-slate-400">Không có thẻ nào</p>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const parentTask = task.dependsOn ? getTaskById(task.dependsOn) : null;
                    const isParentDone = parentTask ? parentTask.column === "done" : true;
                    const isLocked = !isParentDone;

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`group relative flex cursor-pointer flex-col rounded-xl border bg-white p-3.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md ${
                          isLocked
                            ? "border-slate-200 bg-slate-50/70"
                            : "border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        {/* Header: Epic & Priority Chip */}
                        <div className="mb-2 flex items-center justify-between gap-1 text-[11px]">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                            #{task.code}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              task.priority === "high"
                                ? "border border-rose-200 bg-rose-50 text-rose-700"
                                : task.priority === "medium"
                                ? "border border-amber-200 bg-amber-50 text-amber-700"
                                : "border border-slate-200 bg-slate-100 text-slate-600"
                            }`}
                          >
                            {task.priority === "high" ? "Cao" : task.priority === "medium" ? "Vừa" : "Thấp"}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="mb-1 text-xs font-bold leading-relaxed text-slate-900 group-hover:text-blue-600">
                          {task.title}
                        </h3>

                        {/* Description Preview */}
                        <p className="mb-3 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                          {task.description}
                        </p>

                        {/* Hard Constraint H2 Badge */}
                        {task.dependsOn && parentTask && (
                          <div
                            className={`mb-3 flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium ${
                              isLocked
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                            <span className="truncate">
                              {isLocked ? "H2 Khóa: Đợi #" : "H2 Sẵn sàng: #"}{parentTask.code}
                            </span>
                          </div>
                        )}

                        {/* Deliverable Badge (PR / Commit) */}
                        {task.deliverable && (
                          <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/70 px-2 py-1 text-[10px] font-medium text-indigo-700">
                            {task.deliverable.type === "pr" ? (
                              <GitPullRequest size={12} />
                            ) : task.deliverable.type === "commit" ? (
                              <GitCommit size={12} />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            <span className="truncate">{task.deliverable.label}</span>
                          </div>
                        )}

                        {/* Footer: Assignee, Estimate & Move Controls */}
                        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white shadow-xs ${
                                task.assignee.name === "Minh Anh"
                                  ? "bg-blue-600"
                                  : task.assignee.name === "Quốc Huy"
                                  ? "bg-amber-500"
                                  : "bg-emerald-600"
                              }`}
                              title={`${task.assignee.name} (${task.assignee.role})`}
                            >
                              {task.assignee.avatar}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                              <Clock3 size={11} />
                              {task.estimateHours}h
                            </span>
                          </div>

                          {/* Quick Step Buttons */}
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {col.id !== "backlog" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  movePrev(task);
                                }}
                                title="Lùi lại cột trước"
                                className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
                              >
                                <ArrowLeft size={11} />
                              </button>
                            )}
                            {col.id !== "done" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveNext(task);
                                }}
                                title="Chuyển sang cột tiếp theo"
                                className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
                              >
                                <ArrowRight size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── HARD CONSTRAINT H2 VIOLATION ALERT MODAL ────────────────── */}
      {h2Violation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <ShieldAlert size={28} />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Vi phạm Ràng buộc Cứng H2!
                </h3>
                <p className="text-xs text-rose-600 font-semibold">
                  Task Dependency Constraint Blocked
                </p>
              </div>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-slate-600">
              Huynh không thể kéo thẻ <strong>"{h2Violation.task.title}"</strong> sang cột <strong>Done</strong> vì thẻ tiền đề sau đây chưa hoàn thành:
            </p>

            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50/70 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-900">
                <span>Thẻ phụ thuộc: #{h2Violation.blockingTask.code}</span>
                <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                  Cột hiện tại: {h2Violation.blockingTask.column}
                </span>
              </div>
              <p className="mt-1 text-xs text-rose-700 font-medium">
                {h2Violation.blockingTask.title}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Phụ trách: <strong>{h2Violation.blockingTask.assignee.name}</strong>
              </p>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setH2Violation(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Đã hiểu, tôi sẽ hoàn thành task tiền đề trước
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI TASK DECOMPOSITION (WBS GENERATOR) MODAL ──────────────── */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    AI Task Decomposition (WBS Generator)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tự động phân rã tính năng lớn thành các task nguyên tử (2-5h)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Nhập mục tiêu / Tính năng cần phân rã:
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                placeholder="Ví dụ: Xây dựng phòng phản biện bảo vệ ảo AI Defense Room với 3 hội đồng phản biện gay gắt..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:outline-hidden"
              />
            </div>

            <div className="mb-5 rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-purple-800 mb-1">Cơ chế phân rã thông minh:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                <li>Tự động chia thành 3 thẻ: Kiến trúc, Backend API, và Unit Tests.</li>
                <li>Tự động gắn quan hệ phụ thuộc (Hard Constraint H2) giữa các thẻ.</li>
                <li>Phân chia công việc cân bằng cho cả 3 thành viên trong nhóm.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setAiModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                disabled={aiGenerating || !aiPrompt.trim()}
                onClick={handleGenerateWbs}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {aiGenerating ? (
                  <>
                    <Sparkles size={14} className="animate-spin" />
                    <span>Đang phân rã WBS...</span>
                  </>
                ) : (
                  <>
                    <Bot size={14} />
                    <span>Phân rã vào Backlog</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE TASK MODAL ────────────────────────────────────────── */}
      {newTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Tạo Thẻ Công Việc Mới</h3>
              <button
                onClick={() => setNewTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 mb-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Tên thẻ:</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ví dụ: Thiết kế giao diện kéo thả Kanban..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Phụ trách:</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Minh Anh">Minh Anh (Lead)</option>
                    <option value="Quốc Huy">Quốc Huy (Backend)</option>
                    <option value="Hoàng Long">Hoàng Long (QA)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Ưu tiên:</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="high">Cao (P0)</option>
                    <option value="medium">Vừa (P1)</option>
                    <option value="low">Thấp (P2)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Module / Epic:</label>
                  <input
                    type="text"
                    value={newTaskEpic}
                    onChange={(e) => setNewTaskEpic(e.target.value)}
                    placeholder="VD: Frontend, Sandbox..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                  </input>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Cột ban đầu:</label>
                  <select
                    value={newTaskCol}
                    onChange={(e) => setNewTaskCol(e.target.value as ColumnId)}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="ready">Ready</option>
                    <option value="in-progress">In Progress</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setNewTaskModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTaskTitle.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Tạo Thẻ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TASK DETAIL MODAL ────────────────────────────────────────── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">
                  #{selectedTask.code}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {selectedTask.epic}
                </span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <h2 className="mb-2 text-base font-bold text-slate-900">
              {selectedTask.title}
            </h2>
            <p className="mb-4 text-xs leading-relaxed text-slate-600">
              {selectedTask.description}
            </p>

            <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Phụ trách:</span>
                <span className="font-semibold text-slate-800">
                  {selectedTask.assignee.name} ({selectedTask.assignee.role})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Thời lượng ước tính:</span>
                <span className="font-semibold text-slate-800">
                  {selectedTask.estimateHours} giờ làm việc
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Cột hiện tại:</span>
                <span className="font-semibold uppercase text-blue-700">
                  {selectedTask.column}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Hạn chót:</span>
                <span className="font-semibold text-slate-800">
                  {selectedTask.dueDate}
                </span>
              </div>
            </div>

            {/* Move to another column select */}
            <div className="mb-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold text-slate-700">Chuyển sang cột:</span>
              <div className="flex gap-1.5">
                {columnsConfig.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      handleMoveTask(selectedTask, c.id);
                      setSelectedTask((prev) => (prev ? { ...prev, column: c.id } : null));
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      selectedTask.column === c.id
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-blue-400"
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
