import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Calendar,
  Clock,
  Trash2,
  CheckSquare,
  ListTodo,
  Check,
  ChevronDown,
} from "lucide-react";
import type { KanbanTask, TeamMember, Priority, ChecklistItem } from "../screens/KanbanBoard";

interface MarloNewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: KanbanTask) => void;
  teamMembers: TeamMember[];
  currentProjectName?: string;
  projects?: { id: string; name: string }[];
}

export default function MarloNewTaskModal({
  isOpen,
  onClose,
  onAddTask,
  teamMembers,
  currentProjectName = "CodeMind AI Campus",
  projects = [],
}: MarloNewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(currentProjectName);
  const [assigneeId, setAssigneeId] = useState(teamMembers[0]?.id || "");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [estimateHours, setEstimateHours] = useState(4);
  const [priority, setPriority] = useState<Priority>("medium");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  // Sync default assignee if teamMembers changes
  useEffect(() => {
    if (teamMembers.length > 0 && !assigneeId) {
      setAssigneeId(teamMembers[0].id);
    }
  }, [teamMembers, assigneeId]);

  useEffect(() => {
    if (currentProjectName) {
      setProject(currentProjectName);
    }
  }, [currentProjectName]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklist((prev) => [
      ...prev,
      {
        id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: newChecklistText.trim(),
        done: false,
      },
    ]);
    setNewChecklistText("");
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedMember =
      teamMembers.find((m) => m.id === assigneeId) ||
      teamMembers[0] || {
        name: "Nguyễn Bá Hòa",
        avatar: "H",
        role: "Leader & Architect",
      };

    // Format dueDate to DD/MM/YYYY for display consistency
    let formattedDue = dueDate;
    try {
      const parts = dueDate.split("-");
      if (parts.length === 3) {
        formattedDue = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch {
      // keep original
    }

    const randomHex = Math.floor(Math.random() * 0xfffff)
      .toString(16)
      .toUpperCase()
      .padStart(5, "0");

    const newTask: KanbanTask = {
      id: `task-${Date.now()}`,
      code: `TE${randomHex}`,
      title: title.trim(),
      description: `${title.trim()} - Triển khai cho đề án ${project}.`,
      column: "ready", // Lands on board in Up next / Ready column
      priority: priority,
      points: Math.max(1, Math.round(estimateHours / 2)),
      assignee: {
        name: selectedMember.name,
        avatar: selectedMember.avatar || selectedMember.name.charAt(0),
        role: selectedMember.role || "Member",
      },
      estimateHours: Number(estimateHours) || 4,
      dueDate: formattedDue,
      epic: project,
      epicColor: "#f97316",
      checklist: checklist,
      definitionOfDone: [
        { id: `dod-1-${Date.now()}`, text: "Clean code 3 tầng phân tách & Lint pass", done: false },
        { id: `dod-2-${Date.now()}`, text: "Test cases & API response pass", done: false },
      ],
      commentsCount: 0,
      attachmentsCount: 0,
    };

    onAddTask(newTask);
    setTitle("");
    setChecklist([]);
    setNewChecklistText("");
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 ${
        isClosing ? "marlo-scrim-out" : "marlo-scrim"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg max-h-[92vh] flex flex-col rounded-[28px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#121620] shadow-[0_25px_70px_rgba(0,0,0,0.35)] overflow-hidden transition-all ${
          isClosing ? "marlo-modal-out" : "marlo-modal"
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              New task
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              It lands on the board and in the assignee's list.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-3 space-y-4 text-xs">
          {/* Task Name */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Task</label>
            <input
              type="text"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Trim the 15s cut-down"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f59e0b] focus:bg-white dark:focus:bg-[#1c2230] transition shadow-2xs"
            />
          </div>

          {/* Project & Assignee (2 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Project */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Project</label>
              <div className="relative">
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b] transition cursor-pointer"
                >
                  {projects.length > 0 ? (
                    projects.map((p) => (
                      <option key={p.id} value={p.name} className="dark:bg-[#181d28]">
                        {p.name}
                      </option>
                    ))
                  ) : (
                    <option value={project} className="dark:bg-[#181d28]">
                      {project}
                    </option>
                  )}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-slate-400" />
              </div>
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Assignee</label>
              <div className="relative">
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b] transition cursor-pointer"
                >
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id} className="dark:bg-[#181d28]">
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Due & Estimate (hours) (2 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Due */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Due</label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b] transition"
                />
              </div>
            </div>

            {/* Estimate (hours) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Estimate (hours)</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={estimateHours}
                  onChange={(e) => setEstimateHours(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b] transition"
                />
              </div>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Priority</label>
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b] transition cursor-pointer"
              >
                <option value="low" className="dark:bg-[#181d28]">Low</option>
                <option value="medium" className="dark:bg-[#181d28]">Medium</option>
                <option value="high" className="dark:bg-[#181d28]">High</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-slate-400" />
            </div>
          </div>

          {/* 🌟 USER-REQUESTED ENHANCEMENT: CHECKLIST SECTION */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ListTodo size={14} className="text-[#f59e0b]" />
                <span>Checklist công việc ({checklist.length})</span>
              </label>
              <span className="text-[10px] text-slate-400">Tự động gắn vào Task Drawer</span>
            </div>

            {/* Input to add checklist item */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder="Thêm mục việc cần làm (nhấn Enter)..."
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f59e0b] transition"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <Plus size={13} />
                <span>Thêm</span>
              </button>
            </div>

            {/* Checklist items list */}
            {checklist.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#181d28] border border-slate-200/80 dark:border-slate-700/60 group"
                  >
                    <div
                      onClick={() => handleToggleChecklistItem(item.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                    >
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                          item.done
                            ? "bg-[#f59e0b] border-[#f59e0b] text-white"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-[#121620]"
                        }`}
                      >
                        {item.done && <Check size={11} className="stroke-[3]" />}
                      </div>
                      <span
                        className={`text-xs truncate ${
                          item.done
                            ? "line-through text-slate-400 dark:text-slate-500"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="text-slate-400 hover:text-rose-500 transition opacity-0 group-hover:opacity-100 p-0.5 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#181d28] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer transition shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-slate-950 font-bold text-xs shadow-xs active:scale-97 cursor-pointer transition flex items-center gap-1.5"
            >
              Add task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
