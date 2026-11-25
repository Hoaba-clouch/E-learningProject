import React, { useState, useMemo } from "react";
import {
  Check,
  Search,
  Plus,
  UserCheck,
  Lock,
} from "lucide-react";
import MarloSegmentedControl from "./MarloSegmentedControl";
import type { KanbanTask, TeamMember, ColumnId } from "../screens/KanbanBoard";

interface Props {
  tasks: KanbanTask[];
  currentUser: TeamMember;
  onSelectTask: (task: KanbanTask) => void;
  onToggleComplete: (task: KanbanTask, e?: React.MouseEvent) => void;
  onOpenAddTask?: () => void;
  isSprintLocked?: boolean;
}

// ── MARLO STATUS BADGE (100% VIETNAMESE LOCALIZED) ──
const getStatusBadge = (column: ColumnId) => {
  switch (column) {
    case "in-progress":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700 shadow-2xs whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
          Đang làm
        </span>
      );
    case "ready":
      return (
        <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs whitespace-nowrap shrink-0">
          Cần làm
        </span>
      );
    case "backlog":
      return (
        <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 shadow-2xs whitespace-nowrap shrink-0">
          Backlog
        </span>
      );
    case "done":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
          Chờ nghiệm thu
        </span>
      );
    case "verified":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
          Đã nghiệm thu
        </span>
      );
    case "fail":
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs whitespace-nowrap shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shrink-0" />
          Cần sửa lại
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs whitespace-nowrap shrink-0">
          Cần làm
        </span>
      );
  }
};

// ── MARLO RELATIVE DUE DATE (VIETNAMESE) ──
const getRelativeTime = (task: KanbanTask, isDoneSection = false) => {
  if (isDoneSection) return null;
  if (task.dueDate) {
    const parts = task.dueDate.split("/");
    if (parts.length >= 2) {
      const dueDay = parseInt(parts[0], 10);
      if (!isNaN(dueDay)) {
        const diff = dueDay - 10; // Sprint reference date: Nov 10
        if (diff === 0) return "Hôm nay";
        if (diff === 1) return "Ngày mai";
        if (diff > 1) return `Còn ${diff} ngày`;
        if (diff === -1) return "Hôm qua";
        if (diff < -1) return `Trễ ${Math.abs(diff)} ngày`;
      }
    }
  }
  if (task.column === "in-progress") return "Ngày mai";
  if (task.column === "ready") return "Còn 2 ngày";
  if (task.column === "backlog") return "Còn 3 ngày";
  return "Còn 2 ngày";
};

// ── SUB-COMPONENT: SINGLE MARLO TASK ROW ──
function MarloTaskRow({
  task,
  onSelectTask,
  onToggleComplete,
  isDoneSection = false,
  isSprintLocked = false,
}: {
  task: KanbanTask;
  onSelectTask: (task: KanbanTask) => void;
  onToggleComplete: (task: KanbanTask, e?: React.MouseEvent) => void;
  isDoneSection?: boolean;
  isSprintLocked?: boolean;
}) {
  const isDone = task.column === "done" || task.column === "verified";
  const isVerified = task.column === "verified";
  const isToggleDisabled = isSprintLocked || isVerified;
  const relativeTime = getRelativeTime(task, isDoneSection);

  // Subtitle format: Code · Epic Name · Story Points / Hours
  const subtitle = `#${task.code} · ${task.epic || "Hạng mục Đồ án"} · ${task.points} SP (${task.estimateHours ? `${task.estimateHours}h` : `${task.points * 2}h`})`;

  return (
    <div
      onClick={() => onSelectTask(task)}
      className={`group flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none border-t first:border-t-0 border-slate-100/90 dark:border-slate-800/70 ${
        isDone ? "bg-slate-50/20 dark:bg-slate-900/30" : ""
      }`}
    >
      {/* Left: Rounded Checkbox + Task Title + Subtitle */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
        <button
          type="button"
          disabled={isToggleDisabled}
          onClick={(e) => {
            e.stopPropagation();
            if (isToggleDisabled) return;
            onToggleComplete(task, e);
          }}
          className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-[5px] border transition-all duration-150 ${
            isToggleDisabled
              ? "cursor-not-allowed opacity-70 " +
                (isDone
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800")
              : isDone
              ? "cursor-pointer bg-[#EE8420] border-[#EE8420] text-white shadow-2xs"
              : "cursor-pointer border-slate-300 dark:border-slate-600 hover:border-[#EE8420] bg-white dark:bg-slate-800"
          }`}
          title={
            isVerified
              ? "Task đã được Giảng viên nghiệm thu (Verified), không thể tự bỏ tích"
              : isSprintLocked
              ? "Sprint đã khóa, không thể thay đổi trạng thái"
              : isDone
              ? "Đánh dấu chưa hoàn thành"
              : "Đánh dấu đã hoàn thành"
          }
        >
          {isDone ? (
            <Check size={13} strokeWidth={3.5} className="text-white" />
          ) : isSprintLocked ? (
            <Lock size={10} className="text-slate-400" />
          ) : null}
        </button>

        <div className="min-w-0 flex-1">
          <h4
            className={`text-[13.5px] font-medium leading-snug transition-colors truncate ${
              isDone
                ? "line-through text-slate-400 dark:text-slate-500"
                : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {task.title}
          </h4>
          <p className="text-[11.5px] text-slate-400 dark:text-slate-500 font-normal mt-0.5 truncate">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Status Pill + Due Date (only for non-done) */}
      <div className="flex items-center gap-3.5 shrink-0 ml-2">
        {getStatusBadge(task.column)}

        {!isDoneSection && relativeTime && (
          <span className="text-[11.5px] text-slate-400 dark:text-slate-500 font-normal min-w-[72px] sm:min-w-[82px] text-right whitespace-nowrap">
            {relativeTime}
          </span>
        )}
      </div>
    </div>
  );
}

export default function KanbanMyTasksView({
  tasks,
  currentUser,
  onSelectTask,
  onToggleComplete,
  onOpenAddTask,
  isSprintLocked = false,
}: Props) {
  const [filter, setFilter] = useState<"all" | "today" | "overdue" | "in-progress" | "done">("all");
  const [search, setSearch] = useState("");

  // Strictly show tasks assigned to currentUser (never dump other members' tasks)
  const myTasks = useMemo(() => {
    return tasks.filter((t) => t.assignee.name === currentUser.name);
  }, [tasks, currentUser.name]);

  // Derived buckets
  const doneTasks = useMemo(() => {
    return myTasks.filter((t) => t.column === "done" || t.column === "verified");
  }, [myTasks]);

  const openTasks = useMemo(() => {
    return myTasks.filter((t) => t.column !== "done" && t.column !== "verified");
  }, [myTasks]);

  // Later tasks: tasks due > 6 days away or in backlog
  const laterTasks = useMemo(() => {
    return openTasks.filter((t) => {
      if (t.column === "backlog") return true;
      if (t.dueDate) {
        const parts = t.dueDate.split("/");
        if (parts.length >= 2) {
          const diff = parseInt(parts[0], 10) - 10;
          if (diff > 6) return true;
        }
      }
      return false;
    });
  }, [openTasks]);

  // Active tasks: open tasks not in later
  const activeTasks = useMemo(() => {
    return openTasks.filter((t) => !laterTasks.includes(t));
  }, [openTasks, laterTasks]);

  const todayTasks = useMemo(() => {
    return myTasks.filter((t) => {
      if (t.column === "in-progress") return true;
      if (t.dueDate && (t.dueDate.includes("10/11") || t.dueDate.includes("11/11"))) return true;
      return false;
    });
  }, [myTasks]);

  const overdueTasks = useMemo(() => {
    return myTasks.filter((t) => {
      if (t.column === "done" || t.column === "verified") return false;
      if (!t.dueDate) return false;
      const parts = t.dueDate.split("/");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        return d < new Date("2026-11-10");
      }
      if (parts.length === 2) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        if (month < 11 || (month === 11 && day < 10)) return true;
      }
      return false;
    });
  }, [myTasks]);

  // Filtered task list when search or non-all filter is applied
  const filteredTasks = useMemo(() => {
    return myTasks.filter((t) => {
      if (filter === "today" && !todayTasks.includes(t)) return false;
      if (filter === "overdue" && !overdueTasks.includes(t)) return false;
      if (filter === "in-progress" && t.column !== "in-progress") return false;
      if (filter === "done" && t.column !== "done" && t.column !== "verified") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchCode = t.code.toLowerCase().includes(q);
        const matchEpic = t.epic?.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchEpic) return false;
      }
      return true;
    });
  }, [myTasks, filter, todayTasks, overdueTasks, search]);

  const isDefaultGroupView = filter === "all" && !search.trim();

  return (
    <div className="space-y-4 animate-screen-enter">
      {/* ─── 1. TOOLBAR: SEGMENTED CONTROLS & SEARCH ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <MarloSegmentedControl
          value={filter}
          options={[
            { id: "all", label: "Tất cả task", badge: myTasks.length },
            { id: "today", label: "Cần làm hôm nay", badge: todayTasks.length },
            { id: "overdue", label: "Quá hạn", badge: overdueTasks.length },
            { id: "in-progress", label: "Đang làm", badge: myTasks.filter((t) => t.column === "in-progress").length },
            { id: "done", label: "Đã hoàn thành", badge: doneTasks.length },
          ]}
          onChange={(val) => setFilter(val as any)}
          tone="dark"
        />

        {/* Search & Actions */}
        <div className="flex items-center gap-2 min-w-[260px] sm:min-w-[340px] flex-1 sm:flex-initial">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên task, mã hoặc module..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#EE8420] focus:border-[#EE8420] transition"
            />
          </div>

          {onOpenAddTask && !isSprintLocked && (
            <button
              onClick={onOpenAddTask}
              className="h-7.5 px-3 rounded-xl bg-[#EE8420] hover:bg-[#d97706] text-white text-xs font-semibold flex items-center gap-1 transition shadow-2xs shrink-0 cursor-pointer"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">Thêm task</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. DEFAULT 3-CARD VIEW (Đang thực hiện, Kế hoạch sắp tới, Đã hoàn thành gần đây) ─── */}
      {isDefaultGroupView ? (
        myTasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs p-12 text-center">
            <UserCheck size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-1" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Chưa có công việc nào được phân công cho {currentUser.name}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Bạn có thể tạo công việc mới hoặc chọn thành viên khác trên bộ lọc phía trên.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* CARD 1: ACTIVE / UPCOMING TASKS */}
            {activeTasks.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between px-4 sm:px-5 pt-3.5 pb-2.5">
                  <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                    Ưu tiên thực hiện trong Sprint ({currentUser.name})
                  </h3>
                  <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60 text-[11px] font-bold text-amber-800 dark:text-amber-300 font-mono">
                    {activeTasks.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-100/90 dark:divide-slate-800/70">
                  {activeTasks.map((task) => (
                    <MarloTaskRow
                      key={task.id}
                      task={task}
                      onSelectTask={onSelectTask}
                      onToggleComplete={onToggleComplete}
                      isDoneSection={false}
                      isSprintLocked={isSprintLocked}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* CARD 2: LATER TASKS */}
            {laterTasks.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between px-4 sm:px-5 pt-3.5 pb-2.5">
                  <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                    Kế hoạch sắp tới (Backlog & Dài hạn)
                  </h3>
                  <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 font-mono">
                    {laterTasks.length}
                  </span>
                </div>

                <div className="divide-y divide-slate-100/90 dark:divide-slate-800/70">
                  {laterTasks.map((task) => (
                    <MarloTaskRow
                      key={task.id}
                      task={task}
                      onSelectTask={onSelectTask}
                      onToggleComplete={onToggleComplete}
                      isDoneSection={false}
                      isSprintLocked={isSprintLocked}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* CARD 3: DONE LATELY */}
            {doneTasks.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between px-4 sm:px-5 pt-3.5 pb-2.5">
                  <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                    Đã hoàn thành & Nghiệm thu gần đây
                  </h3>
                  <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                    {doneTasks.length}
                  </span>
                </div>

                <div className="divide-y divide-slate-100/90 dark:divide-slate-800/70">
                  {doneTasks.map((task) => (
                    <MarloTaskRow
                      key={task.id}
                      task={task}
                      onSelectTask={onSelectTask}
                      onToggleComplete={onToggleComplete}
                      isDoneSection={true}
                      isSprintLocked={isSprintLocked}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* ─── 3. FILTERED OR SEARCH VIEW ─── */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <UserCheck size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-1" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Không tìm thấy task nào phù hợp
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {search ? `Không có task nào khớp với từ khóa "${search}"` : "Bạn đã hoàn thành hết mục này."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/90 dark:divide-slate-800/70">
              {filteredTasks.map((task) => (
                <MarloTaskRow
                  key={task.id}
                  task={task}
                  onSelectTask={onSelectTask}
                  onToggleComplete={onToggleComplete}
                  isDoneSection={task.column === "done" || task.column === "verified"}
                  isSprintLocked={isSprintLocked}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
