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
} from "lucide-react";
import MarloSelect from "./MarloSelect";
import type { KanbanTask, TeamMember, Priority, ChecklistItem } from "../screens/KanbanBoard";

interface MarloNewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: KanbanTask) => void;
  teamMembers: TeamMember[];
  currentProjectName?: string;
  projects?: { id: string; name: string; team?: TeamMember[] }[];
  availableTasks?: KanbanTask[];
}

export default function MarloNewTaskModal({
  isOpen,
  onClose,
  onAddTask,
  teamMembers,
  currentProjectName = "CodeMind AI Campus",
  projects = [],
  availableTasks = [],
}: MarloNewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState(currentProjectName);
  const activeProjectMembers = (() => {
    const matchedProj = projects.find((p) => p.name === project);
    if (matchedProj?.team && matchedProj.team.length > 0) {
      return matchedProj.team;
    }
    return teamMembers;
  })();
  const [assigneeId, setAssigneeId] = useState(activeProjectMembers[0]?.id || "");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [points, setPoints] = useState(5);
  const [priority, setPriority] = useState<Priority>("medium");
  const [dependsOn, setDependsOn] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  // Sync default assignee if project or teamMembers changes
  useEffect(() => {
    if (activeProjectMembers.length > 0) {
      const exists = activeProjectMembers.some((m) => m.id === assigneeId);
      if (!exists) {
        setAssigneeId(activeProjectMembers[0].id);
      }
    }
  }, [activeProjectMembers, assigneeId]);

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
      activeProjectMembers.find((m) => m.id === assigneeId) ||
      activeProjectMembers[0] || {
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

    const parsedPoints = Math.max(1, Number(points) || 5);
    const newTask: KanbanTask = {
      id: `task-${Date.now()}`,
      code: `TE${randomHex}`,
      title: title.trim(),
      description: `${title.trim()} - Triển khai cho đề án ${project}.`,
      column: "ready", // Lands on board in Up next / Ready column
      priority: priority,
      points: parsedPoints,
      assignee: {
        name: selectedMember.name,
        avatar: selectedMember.avatar || selectedMember.name.charAt(0),
        role: selectedMember.role || "Member",
      },
      estimateHours: parsedPoints * 2,
      dueDate: formattedDue,
      epic: project,
      epicColor: "#f97316",
      ...(dependsOn ? { dependsOn } : {}),
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
    setDependsOn("");
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
              Tạo công việc kỹ thuật mới
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Thẻ sẽ được thêm trực tiếp vào cột Cần làm và danh sách cá nhân của thành viên.
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
          {/* Task Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Tên hạng mục công việc *
            </label>
            <input
              type="text"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Thiết kế API xác thực JWT & bộ kiểm thử tự động"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-400/30 dark:focus:ring-white/15 focus:bg-white dark:focus:bg-[#1c2230] transition shadow-2xs"
            />
          </div>

          {/* Project & Assignee (2 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Project */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Đồ án
              </label>
              <MarloSelect
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white transition cursor-pointer"
              >
                {projects.length > 0 ? (
                  projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))
                ) : (
                  <option value={project}>
                    {project}
                  </option>
                )}
              </MarloSelect>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Thành viên phụ trách
              </label>
              <MarloSelect
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white transition cursor-pointer"
              >
                {activeProjectMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </MarloSelect>
            </div>
          </div>

          {/* Due & Estimate SP (2 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Due */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hạn hoàn thành
                </label>
                <span className="text-[10px] text-slate-400">Gợi ý nhanh</span>
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-400/30 dark:focus:ring-white/15 transition"
                />
              </div>
              {/* Quick Due Date Presets */}
              <div className="flex items-center gap-1.5 mt-1.5">
                {[
                  { label: "+3 ngày", days: 3 },
                  { label: "+1 tuần", days: 7 },
                  { label: "+2 tuần", days: 14 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + item.days);
                      setDueDate(d.toISOString().slice(0, 10));
                    }}
                    className="flex-1 py-1 rounded-lg text-[10.5px] font-semibold bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50 transition cursor-pointer text-center"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimate SP (Story Points) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ước tính SP (Story Points)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">~{points * 2}h</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="34"
                  value={points}
                  onChange={(e) => setPoints(Math.max(1, Number(e.target.value) || 1))}
                  placeholder="5"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-400/30 dark:focus:ring-white/15 transition"
                />
              </div>
              {/* Quick Fibonacci SP Chips */}
              <div className="flex items-center gap-1 mt-1.5">
                {[1, 2, 3, 5, 8, 13].map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setPoints(sp)}
                    className={`flex-1 py-1 rounded-lg text-[10.5px] font-mono font-semibold transition cursor-pointer text-center ${
                      points === sp
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 shadow-2xs"
                        : "bg-slate-100/70 hover:bg-slate-200/70 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-400 border border-transparent"
                    }`}
                  >
                    {sp}p
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mức độ ưu tiên
            </label>
            <MarloSelect
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white transition cursor-pointer"
            >
              <option value="low">Thấp (P2)</option>
              <option value="medium">Trung bình (P1)</option>
              <option value="high">Cao (P0)</option>
            </MarloSelect>
          </div>

          {/* Task tiền đề (H2 Hard Constraint) */}
          {availableTasks.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Task tiền đề (Ràng buộc H2)
              </label>
              <MarloSelect
                value={dependsOn}
                onChange={(e) => setDependsOn(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white transition cursor-pointer"
              >
                <option value="">Không có ràng buộc H2</option>
                {availableTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.code} · {t.title}
                  </option>
                ))}
              </MarloSelect>
              <p className="mt-1 text-[10.5px] text-slate-400">
                Task mới chỉ có thể hoàn thành sau khi task tiền đề đã đạt Done.
              </p>
            </div>
          )}

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
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-[#181d28] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-400/30 dark:focus:ring-white/15 transition"
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
              Hủy
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-slate-950 font-bold text-xs shadow-xs active:scale-97 cursor-pointer transition flex items-center gap-1.5"
            >
              Thêm công việc
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
