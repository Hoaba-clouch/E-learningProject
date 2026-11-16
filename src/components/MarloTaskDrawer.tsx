import { useEffect, useState } from "react";
import {
  X,
  Check,
  CheckCheck,
  Trash2,
  GitPullRequest,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import MarloSegmentedControl from "./MarloSegmentedControl";
import type { KanbanTask, ColumnId, TeamMember } from "../screens/KanbanBoard";

interface Props {
  task: KanbanTask | null;
  teamMembers?: TeamMember[];
  onClose: () => void;
  onUpdateTask?: (updated: KanbanTask) => void;
  onDeleteTask?: (task: KanbanTask) => void;
  onMoveColumn?: (taskId: string, col: ColumnId) => void;
}

const DEFAULT_MEMBERS: TeamMember[] = [
  { id: "1", name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect", color: "#14161a" },
  { id: "2", name: "Võ Nhật Huy", avatar: "H", role: "Frontend & AI Dev", color: "#f59e0b" },
  { id: "3", name: "Phan Đình Nghị", avatar: "N", role: "Backend & Database", color: "#64748b" },
];

// 4-Step Marlo Pipeline matching the uploaded image (media_1794373665534_e3dd0e3c.jpg)
const MARLO_STEPS: { id: ColumnId; name: string; short: string }[] = [
  { id: "ready", name: "Up next", short: "Sẵn sàng" },
  { id: "in-progress", name: "In progress", short: "Đang làm" },
  { id: "verified", name: "In review", short: "Thẩm định" },
  { id: "done", name: "Done", short: "Hoàn thành" },
];

export default function MarloTaskDrawer({
  task,
  teamMembers,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onMoveColumn,
}: Props) {
  const [isClosing, setIsClosing] = useState(false);
  const [isAssigneePickerOpen, setIsAssigneePickerOpen] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 280);
  };

  // Close on ESC key
  useEffect(() => {
    if (!task) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [task, isClosing]);

  if (!task) return null;

  const currentColumn = task.column;
  const isDone = currentColumn === "done";
  const isVerified = currentColumn === "verified";
  const isCompleted = isDone || isVerified;

  // Compute current step index (0 to 3)
  const getStepIndex = (col: ColumnId) => {
    if (col === "backlog" || col === "ready") return 0;
    if (col === "in-progress") return 1;
    if (col === "verified") return 2;
    if (col === "done") return 3;
    return 0;
  };
  const activeStepIdx = getStepIndex(currentColumn);

  // Checks priority: task.checklist (from Kanban) or task.definitionOfDone
  const checks =
    task.checklist && task.checklist.length > 0
      ? task.checklist
      : task.definitionOfDone && task.definitionOfDone.length > 0
      ? task.definitionOfDone
      : [];

  const completedChecksCount = checks.filter((c) => c.done).length;

  // Toggle checklist item
  const toggleCheck = (id: string) => {
    const updateList = (list?: typeof task.checklist) =>
      list ? list.map((item) => (item.id === id ? { ...item, done: !item.done } : item)) : [];

    const updatedChecklist = updateList(task.checklist);
    const updatedDoD = updateList(task.definitionOfDone);

    const activeList = updatedChecklist.length > 0 ? updatedChecklist : updatedDoD;
    const allDone = activeList.length > 0 && activeList.every((item) => item.done);

    let newCol = task.column;
    if (allDone && (task.column === "in-progress" || task.column === "ready")) {
      newCol = "verified";
      onMoveColumn?.(task.id, "verified");
    }

    onUpdateTask?.({
      ...task,
      checklist: updatedChecklist,
      definitionOfDone: updatedDoD,
      column: newCol,
    });
  };

  const handleStepClick = (colId: ColumnId) => {
    onMoveColumn?.(task.id, colId);
  };

  const handleToggleMarkDone = () => {
    if (isCompleted) {
      onMoveColumn?.(task.id, "in-progress");
    } else {
      const markAll = (list?: typeof task.checklist) =>
        list ? list.map((c) => ({ ...c, done: true })) : [];
      const updatedChecklist = markAll(task.checklist);
      const updatedDoD = markAll(task.definitionOfDone);

      onUpdateTask?.({
        ...task,
        checklist: updatedChecklist,
        definitionOfDone: updatedDoD,
        column: "done",
      });
      onMoveColumn?.(task.id, "done");
    }
  };

  const assigneeName =
    typeof task.assignee === "object" ? task.assignee?.name : task.assignee || "Phan Đình Nghị";
  const assigneeAvatar =
    typeof task.assignee === "object" ? task.assignee?.avatar : "N";
  const assigneeRole =
    typeof task.assignee === "object" ? task.assignee?.role : "Backend & Database";

  const membersList = teamMembers && teamMembers.length > 0 ? teamMembers : DEFAULT_MEMBERS;
  const currentMember = membersList.find((m) => m.name === assigneeName);
  const currentMemberColor =
    (currentMember?.color?.startsWith("#") ? currentMember.color : undefined) ||
    (assigneeName.includes("Hòa") ? "#14161a" : assigneeName.includes("Huy") ? "#f59e0b" : "#64748b");

  const projectName = task.epic || "CS201 · Đồ án OOP";
  const dueText = task.dueDate || "06 Nov 2026";
  const estHours = task.estimateHours || (task.points ? task.points * 2 : 6);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* Scrim Backdrop */}
      <div
        className={`fixed inset-0 bg-black/45 backdrop-blur-xs pointer-events-auto ${
          isClosing ? "marlo-scrim-out" : "marlo-scrim"
        }`}
        onClick={handleClose}
      />

      {/* ─── FLOATING ROUNDED DRAWER (EXACT MARLO-APP REPLICA) ─── */}
      <div
        className={`fixed top-2.5 bottom-2.5 right-2.5 sm:top-3.5 sm:bottom-3.5 sm:right-3.5 w-[calc(100vw-20px)] sm:w-[540px] max-w-[calc(100vw-20px)] h-[calc(100dvh-20px)] sm:h-[calc(100dvh-28px)] max-h-[calc(100dvh-20px)] sm:max-h-[calc(100dvh-28px)] z-50 pointer-events-auto rounded-[28px] sm:rounded-[34px] bg-[#ffffff] dark:bg-[#12141a] border border-[#e2e8f0] dark:border-[#222838] shadow-[0_25px_80px_rgba(0,0,0,0.38)] flex flex-col overflow-hidden ${
          isClosing ? "marlo-drawer-out" : "marlo-drawer"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rubber Stamp Slam for Completed Task */}
        {isCompleted && (
          <div className="absolute right-14 top-16 pointer-events-none select-none z-30 rubber-stamp-slam">
            <div className="border-[3px] border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300 font-mono font-black text-sm tracking-[0.2em] px-3.5 py-1 rounded-xl uppercase shadow-md bg-emerald-50/95 dark:bg-emerald-950/90 backdrop-blur-xs flex items-center gap-1.5 -rotate-6">
              <CheckCheck size={16} className="stroke-[3]" />
              <span>DoD 100% • VERIFIED</span>
            </div>
          </div>
        )}

        {/* ─── DRAWER HEADER ─── */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 border-b border-[#f1f5f9] dark:border-[#1e2433] shrink-0 bg-inherit">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-black text-[#0f172a] dark:text-[#f8fafc] tracking-tight leading-tight">
              {task.title}
            </h2>
            <p className="text-xs text-[#94a3b8] font-medium mt-1 truncate">
              {projectName} — #{task.code} · {task.moscow ? `MoSCoW: ${task.moscow.toUpperCase()}` : "Sprint Backlog"}
            </p>
          </div>

          <button
            onClick={handleClose}
            title="Đóng (Esc)"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1e2433] transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── SCROLLABLE DRAWER BODY (STAGGERED CASCADE ENTRY) ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5 text-xs text-[#334155] dark:text-[#cbd5e1] marlo-drawer-body">
          {/* 1. MARLO STEPPER (4-Step Progress Track) */}
          <div className="pt-1 pb-2">
            <ul className="marlo-stepper">
              {MARLO_STEPS.map((step, idx) => {
                const isStepDone = activeStepIdx > idx;
                const isStepNow = activeStepIdx === idx;
                return (
                  <li
                    key={step.id}
                    className={`${isStepDone ? "is-done" : ""} ${isStepNow ? "is-now" : ""} cursor-pointer`}
                    onClick={() => handleStepClick(step.id)}
                    title={`Chuyển sang ${step.name}`}
                  >
                    <div className="flex items-center">
                      <div className="marlo-stepper-dot">
                        {isStepDone ? (
                          <Check size={13} className="stroke-[3] text-white" />
                        ) : null}
                      </div>
                      {idx < MARLO_STEPS.length - 1 && (
                        <div className="marlo-stepper-bar">
                          <div
                            className="marlo-stepper-fill"
                            style={{
                              transform: isStepDone ? "scaleX(1)" : "scaleX(0)",
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <small className="mt-1">{step.name}</small>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 2. AUTHENTIC MARLO SEGMENTED CONTROL WITH LIQUID BLACK SLIDING PILL */}
          <div className="pt-0.5">
            <MarloSegmentedControl<ColumnId>
              value={
                currentColumn === "backlog"
                  ? "ready"
                  : currentColumn === "fail"
                  ? "verified"
                  : currentColumn
              }
              options={MARLO_STEPS.map((step) => ({
                id: step.id,
                label: step.name,
              }))}
              onChange={(val) => handleStepClick(val)}
              tone="dark"
              size="md"
              className="w-full flex [&>button]:flex-1"
            />
          </div>

          {/* 3. TASK DESCRIPTION */}
          <div className="text-[13px] leading-relaxed text-[#475569] dark:text-[#94a3b8]">
            {task.description ||
              `Task ${task.code}: Triển khai và hoàn thiện module theo tài liệu đặc tả kiến trúc phần mềm, đảm bảo các tiêu chí nghiệm thu DoD.`}
          </div>

          {/* 4. METADATA KEY-VALUE TABLE (Exact Marlo Key-Value Layout) */}
          <div className="rounded-2xl border border-[#f1f5f9] dark:border-[#1e2433] bg-[#fafafa] dark:bg-[#141824]/60 p-4 space-y-3">
            {/* Project */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#64748b] dark:text-[#94a3b8] font-medium">Project</span>
              <span className="font-bold text-[#f97316] hover:underline cursor-pointer">
                {projectName}
              </span>
            </div>

            {/* Assignee - Interactive Selector */}
            <div className="flex items-center justify-between text-xs relative">
              <span className="text-[#64748b] dark:text-[#94a3b8] font-medium">Assignee</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAssigneePickerOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-[#1e2433] hover:bg-slate-50 dark:hover:bg-[#252d3f] border border-[#e2e8f0] dark:border-[#2e374d] hover:border-orange-300 dark:hover:border-orange-500/50 text-[#0f172a] dark:text-white font-semibold shadow-2xs transition-all cursor-pointer group"
                  title="Nhấn để chọn người phụ trách"
                >
                  <div
                    className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-black shrink-0 shadow-2xs"
                    style={{ backgroundColor: currentMemberColor }}
                  >
                    {assigneeAvatar}
                  </div>
                  <span>{assigneeName}</span>
                  {assigneeRole && (
                    <span className="text-[10px] text-slate-400 font-normal">({assigneeRole})</span>
                  )}
                  <ChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform duration-150 ${
                      isAssigneePickerOpen ? "rotate-180 text-[#f97316]" : "group-hover:text-slate-600 dark:group-hover:text-slate-300"
                    }`}
                  />
                </button>

                {/* Floating Assignee Picker Popover */}
                {isAssigneePickerOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsAssigneePickerOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-2xl bg-white dark:bg-[#181d29] border border-[#e2e8f0] dark:border-[#2a3245] shadow-[0_16px_40px_rgba(0,0,0,0.22)] p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Chọn người phụ trách
                      </div>
                      <div className="space-y-0.5 max-h-56 overflow-y-auto">
                        {membersList.map((m) => {
                          const isSelected = m.name === assigneeName;
                          return (
                            <button
                              key={m.id || m.name}
                              type="button"
                              onClick={() => {
                                onUpdateTask?.({
                                  ...task,
                                  assignee: {
                                    name: m.name,
                                    avatar: m.avatar || m.name.charAt(0).toUpperCase(),
                                    role: m.role || "Member",
                                  },
                                });
                                setIsAssigneePickerOpen(false);
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold border border-slate-200 dark:border-slate-700 shadow-2xs"
                                  : "hover:bg-slate-100 dark:hover:bg-[#222938] text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              <div
                                className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs"
                                style={{ backgroundColor: m.color || "#f97316" }}
                              >
                                {m.avatar || m.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] truncate">{m.name}</div>
                                {m.role && (
                                  <div className="text-[10px] text-slate-400 truncate">{m.role}</div>
                                )}
                              </div>
                              {isSelected && (
                                <Check size={14} className="text-slate-900 dark:text-white shrink-0 stroke-[2.5]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Due */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#64748b] dark:text-[#94a3b8] font-medium">Due</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
                {dueText} · <span className="font-bold">5 days ago</span>
              </span>
            </div>

            {/* Priority */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#64748b] dark:text-[#94a3b8] font-medium">Priority</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#f1f5f9] dark:bg-[#1e2433] text-[#475569] dark:text-[#cbd5e1] font-bold text-[11px]">
                {task.priority === "high" ? "High" : task.priority === "medium" ? "Medium" : "Low"}
              </span>
            </div>

            {/* Work */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#64748b] dark:text-[#94a3b8] font-medium">Work</span>
              <span className="font-bold text-[#0f172a] dark:text-white">
                {task.epic || "Module"} · {estHours} h estimated ({task.points} pts)
              </span>
            </div>
          </div>

          {/* 5. GITHUB INTEGRATION CARD */}
          {task.deliverable && (
            <div className="p-3.5 rounded-2xl bg-[#fafafa] dark:bg-[#141824]/60 border border-[#f1f5f9] dark:border-[#1e2433] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0f172a] dark:text-white flex items-center gap-1.5">
                  <GitPullRequest size={14} className="text-[#f97316]" />
                  <span>GitHub Integration</span>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                  Yêu cầu nộp: {task.deliverable.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#64748b]">
                <span>
                  Mã task: <strong className="font-mono text-blue-600 dark:text-blue-400">#{task.code}</strong>
                </span>
                <span className="font-mono text-[10px] text-slate-400">feature/{task.code.toLowerCase()}</span>
              </div>
            </div>
          )}

          {/* 6. USER STORY (SCRUM SPEC) */}
          {task.userStory && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1 leading-relaxed">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono mb-1">
                Scrum User Story:
              </div>
              <p>
                <strong className="text-blue-700 dark:text-blue-300">Là (Role):</strong> {task.userStory.role}
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Tôi muốn (Goal):</strong> {task.userStory.want}
              </p>
              <p>
                <strong className="text-emerald-700 dark:text-emerald-400">Để (Benefit):</strong> {task.userStory.benefit}
              </p>
            </div>
          )}

          {/* 7. AUTHENTIC MARLO CHECKLIST WITH ORANGE CHECKMARKS */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
                Checklist
              </h3>
              {checks.length > 0 && (
                <span className="text-[11px] font-mono font-bold text-[#f97316]">
                  {completedChecksCount}/{checks.length} hoàn thành
                </span>
              )}
            </div>

            {checks.length === 0 ? (
              <p className="text-xs text-[#94a3b8] italic p-2">Không có checklist cho task này.</p>
            ) : (
              <div className="space-y-1.5">
                {checks.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`marlo-check-card ${item.done ? "is-done" : ""}`}
                  >
                    {/* The authentic Marlo Orange Checkbox */}
                    <div
                      className="marlo-chk-box"
                      data-checked={item.done ? "true" : "false"}
                    >
                      {item.done && <Check size={13} className="stroke-[3]" />}
                    </div>

                    <span className="text-xs leading-snug flex-1 select-none font-medium">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── DRAWER FOOTER (FORMFOOT) ─── */}
        <div className="px-6 py-4 bg-[#ffffff] dark:bg-[#12141a] border-t border-[#f1f5f9] dark:border-[#1e2433] flex items-center justify-between shrink-0">
          {/* Left Delete button */}
          <button
            type="button"
            onClick={() => onDeleteTask?.(task)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>

          {/* Right Action: Mark Done / Reopen */}
          <button
            type="button"
            onClick={handleToggleMarkDone}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer ${
              isCompleted
                ? "bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] hover:opacity-90"
                : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            }`}
          >
            {isCompleted ? (
              <>
                <RotateCcw size={14} />
                <span>Reopen task</span>
              </>
            ) : (
              <>
                <Check size={14} className="stroke-[3]" />
                <span>Mark done</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
