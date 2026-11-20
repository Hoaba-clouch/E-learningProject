import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Check,
  CheckCheck,
  Trash2,
  GitPullRequest,
  GitCommit,
  GitFork,
  FolderGit2,
  ExternalLink,
  Link2,
  RotateCcw,
  ChevronDown,
  ShieldCheck,
  AlertCircle,
  Lock,
} from "lucide-react";
import MarloSegmentedControl from "./MarloSegmentedControl";
import type { KanbanTask, ColumnId, TeamMember } from "../screens/KanbanBoard";
import type { ProjectGitRepoSummary } from "../api";

interface Props {
  task: KanbanTask | null;
  teamMembers?: TeamMember[];
  projectGitRepo?: ProjectGitRepoSummary | null;
  role?: "student" | "instructor" | "admin";
  isSprintLocked?: boolean;
  onClose: () => void;
  onUpdateTask?: (updated: KanbanTask) => void;
  onSaveSubmissionUrl?: (task: KanbanTask, url: string) => Promise<string | null>;
  onOpenGitHub?: (tab?: "topology" | "prs") => void;
  onDeleteTask?: (task: KanbanTask) => void;
  onMoveColumn?: (taskId: string, col: ColumnId) => boolean | void;
  onReviewTask?: (taskId: string, decision: "approve" | "request_revision", feedback?: string) => void;
}

const DEFAULT_MEMBERS: TeamMember[] = [
  { id: "1", name: "Nguyễn Bá Hòa", avatar: "H", role: "Leader & Architect", color: "#14161a" },
  { id: "2", name: "Võ Nhật Huy", avatar: "H", role: "Frontend & AI Dev", color: "#f59e0b" },
  { id: "3", name: "Phan Đình Nghị", avatar: "N", role: "Backend & Database", color: "#64748b" },
];

// 4-Step Academic Pipeline: Cần làm -> Đang làm -> Hoàn thành (Chờ duyệt) -> Đã nghiệm thu
const MARLO_STEPS: { id: ColumnId; name: string; short: string }[] = [
  { id: "ready", name: "Cần làm", short: "Sẵn sàng" },
  { id: "in-progress", name: "Đang làm", short: "Thực thi" },
  { id: "done", name: "Hoàn thành", short: "Chờ duyệt" },
  { id: "verified", name: "Đã nghiệm thu", short: "Đạt DoD" },
];

function computeDueStatusLabel(dueDate?: string, column?: ColumnId): { text: string; isUrgent: boolean } {
  if (column === "verified") return { text: "Đã nghiệm thu DoD", isUrgent: false };
  if (column === "done") return { text: "Đang chờ GVHD nghiệm thu", isUrgent: false };
  if (column === "fail") return { text: "Cần chỉnh sửa theo góp ý", isUrgent: true };
  if (!dueDate) return { text: "Trong Sprint hiện tại", isUrgent: false };
  const parts = dueDate.split("/");
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (!isNaN(day) && !isNaN(month)) {
      if (month === 11 && day < 10) return { text: "Cần ưu tiên hoàn tất", isUrgent: true };
      if (month === 11 && day <= 12) return { text: "Sắp đến hạn", isUrgent: true };
      return { text: "Đúng tiến độ Sprint", isUrgent: false };
    }
  }
  return { text: "Đúng tiến độ Sprint", isUrgent: false };
}

export default function MarloTaskDrawer({
  task,
  teamMembers,
  projectGitRepo,
  role = "student",
  isSprintLocked = false,
  onClose,
  onUpdateTask,
  onSaveSubmissionUrl,
  onOpenGitHub,
  onDeleteTask,
  onMoveColumn,
  onReviewTask,
}: Props) {
  const [isClosing, setIsClosing] = useState(false);
  const [isAssigneePickerOpen, setIsAssigneePickerOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [submissionUrlDraft, setSubmissionUrlDraft] = useState(task?.submissionUrl || "");
  const [submissionUrlError, setSubmissionUrlError] = useState<string | null>(null);
  const [submissionUrlSuccess, setSubmissionUrlSuccess] = useState<string | null>(null);
  const [isSavingUrl, setIsSavingUrl] = useState(false);

  useEffect(() => {
    setSubmissionUrlDraft(task?.submissionUrl || "");
    setSubmissionUrlError(null);
    setSubmissionUrlSuccess(null);
  }, [task?.id, task?.submissionUrl]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setShowRevisionInput(false);
      setRevisionNote("");
    }, 260);
  };

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

  if (!task || typeof document === "undefined") return null;

  const currentColumn = task.column;
  const isDone = currentColumn === "done";
  const isVerified = currentColumn === "verified";
  const isCompleted = isDone || isVerified;
  const isReadOnlyForRole = isSprintLocked || role === "admin";

  // Compute current step index (0 to 3): ready (0) -> in-progress (1) -> done (2) -> verified (3)
  const getStepIndex = (col: ColumnId) => {
    if (col === "backlog" || col === "ready") return 0;
    if (col === "in-progress" || col === "fail") return 1;
    if (col === "done") return 2;
    if (col === "verified") return 3;
    return 0;
  };
  const activeStepIdx = getStepIndex(currentColumn);

  const checks =
    task.checklist && task.checklist.length > 0
      ? task.checklist
      : task.definitionOfDone && task.definitionOfDone.length > 0
      ? task.definitionOfDone
      : [];

  const completedChecksCount = checks.filter((c) => c.done).length;

  // Toggle checklist item (NEVER auto-jumps to "verified" behind Instructor's back!)
  const toggleCheck = (id: string) => {
    if (isSprintLocked) return;
    const updateList = (list?: typeof task.checklist) =>
      list ? list.map((item) => (item.id === id ? { ...item, done: !item.done } : item)) : [];

    const updatedChecklist = updateList(task.checklist);
    const updatedDoD = updateList(task.definitionOfDone);

    onUpdateTask?.({
      ...task,
      checklist: updatedChecklist,
      definitionOfDone: updatedDoD,
    });
  };

  const handleStepClick = (colId: ColumnId) => {
    if (isSprintLocked) return;
    if (role === "student" && colId === "verified") {
      onMoveColumn?.(task.id, "verified"); // Triggers KanbanBoard's student restriction notice
      return;
    }
    onMoveColumn?.(task.id, colId);
  };

  const handleToggleMarkDone = () => {
    if (isSprintLocked) return;
    if (isVerified && role === "student") {
      return; // Students cannot reopen an already instructor-verified task
    }
    if (isCompleted) {
      onMoveColumn?.(task.id, "in-progress");
    } else {
      const accepted = onMoveColumn?.(task.id, "done");
      if (accepted === false) {
        return;
      }
      const markAll = (list?: typeof task.checklist) =>
        list ? list.map((c) => ({ ...c, done: true })) : [];
      const updatedChecklist = markAll(task.checklist);
      const updatedDoD = markAll(task.definitionOfDone);

      onUpdateTask?.({
        ...task,
        checklist: updatedChecklist,
        definitionOfDone: updatedDoD,
      });
    }
  };

  const handleSaveLink = async () => {
    const clean = submissionUrlDraft.trim();
    if (!clean || !/^https?:\/\//i.test(clean)) {
      setSubmissionUrlError("Vui lòng nhập URL hợp lệ bắt đầu bằng https:// hoặc http://");
      return;
    }
    const slugLow = (projectGitRepo?.repoSlug || "").trim().toLowerCase();
    if (slugLow && !clean.toLowerCase().includes(`github.com/${slugLow}`)) {
      setSubmissionUrlError(
        `Link phải thuộc kho lưu trữ của dự án (${projectGitRepo?.repoSlug}). VD: https://github.com/${projectGitRepo?.repoSlug}/pull/1`
      );
      return;
    }
    setSubmissionUrlError(null);
    setSubmissionUrlSuccess(null);
    if (onSaveSubmissionUrl) {
      setIsSavingUrl(true);
      const errMsg = await onSaveSubmissionUrl(task, clean);
      setIsSavingUrl(false);
      if (errMsg) {
        setSubmissionUrlError(errMsg);
      } else {
        setSubmissionUrlSuccess("Đã lưu link minh chứng GitHub!");
      }
    } else {
      onUpdateTask?.({ ...task, submissionUrl: clean });
      setSubmissionUrlSuccess("Đã lưu link minh chứng!");
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

  const projectName = task.epic || "CS499 · Đồ án Kỹ nghệ";
  const dueText = task.dueDate || "15/11/2026";
  const dueMeta = computeDueStatusLabel(dueText, currentColumn);
  const estHours = task.estimateHours || (task.points ? task.points * 2 : 6);
  const reviewFeedback =
    (task as any).reviewFeedback ||
    task.auditLogs
      ?.slice()
      .reverse()
      .find((lg: any) => lg?.note)?.note;

  return createPortal(
    <div className="fixed inset-0 z-[9998] pointer-events-none select-none">
      {/* Scrim Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-xs pointer-events-auto ${
          isClosing ? "marlo-scrim-out" : "marlo-scrim"
        }`}
        onClick={handleClose}
      />

      {/* ─── FLOATING ROUNDED DRAWER (PORTALED TO DOCUMENT.BODY SO NEVER CLIPPED) ─── */}
      <div
        role="dialog"
        aria-modal="true"
        className={`fixed top-3 bottom-3 right-3 sm:top-4 sm:bottom-4 sm:right-4 w-[calc(100vw-24px)] sm:w-[540px] max-w-[calc(100vw-24px)] z-[9999] pointer-events-auto rounded-[28px] sm:rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_25px_80px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden ${
          isClosing ? "marlo-drawer-out" : "marlo-drawer"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rubber Stamp Slam for Verified Task */}
        {isVerified && (
          <div className="absolute right-14 top-16 pointer-events-none select-none z-30 rubber-stamp-slam">
            <div className="border-[3px] border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300 font-mono font-black text-xs tracking-[0.18em] px-3 py-1 rounded-xl uppercase shadow-md bg-emerald-50/95 dark:bg-emerald-950/90 backdrop-blur-xs flex items-center gap-1.5 -rotate-6">
              <CheckCheck size={15} className="stroke-[3]" />
              <span>ĐÃ NGHIỆM THU • +{task.points * 10} XP</span>
            </div>
          </div>
        )}

        {/* ─── DRAWER HEADER ─── */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px]">
                #{task.code}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold text-[11px]">
                {task.points} Story Points
              </span>
              {currentColumn === "fail" && (
                <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                  Cần sửa lại
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              {task.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
              {projectName} · {task.moscow ? `MoSCoW: ${task.moscow.toUpperCase()}` : "Sprint Backlog"}
            </p>
          </div>

          <button
            onClick={handleClose}
            title="Đóng (Esc)"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── SCROLLABLE DRAWER BODY ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5 text-xs text-slate-700 dark:text-slate-300 marlo-drawer-body bg-white dark:bg-slate-900">
          {/* Instructor Feedback Banner if present */}
          {reviewFeedback && (
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
                currentColumn === "fail"
                  ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200"
                  : "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200"
              }`}
            >
              {currentColumn === "fail" ? (
                <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed">
                <strong className="block font-bold mb-0.5">
                  {currentColumn === "fail" ? "Yêu cầu chỉnh sửa từ Giảng viên:" : "Nhận xét nghiệm thu của Giảng viên:"}
                </strong>
                <span>{reviewFeedback}</span>
              </div>
            </div>
          )}

          {/* 1. MARLO STEPPER (4-Step Progress Track: Cần làm -> Đang làm -> Hoàn thành -> Đã nghiệm thu) */}
          <div className="pt-1 pb-2">
            <ul className="marlo-stepper">
              {MARLO_STEPS.map((step, idx) => {
                const isStepDone = activeStepIdx > idx;
                const isStepNow = activeStepIdx === idx;
                return (
                  <li
                    key={step.id}
                    className={`${isStepDone ? "is-done" : ""} ${isStepNow ? "is-now" : ""} ${
                      isSprintLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                    }`}
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

          {/* 2. AUTHENTIC MARLO SEGMENTED CONTROL */}
          <div className="pt-0.5">
            <MarloSegmentedControl<ColumnId>
              value={
                currentColumn === "backlog"
                  ? "ready"
                  : currentColumn === "fail"
                  ? "in-progress"
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
          <div className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            {task.description ||
              `Task ${task.code}: Triển khai và hoàn thiện module theo tài liệu đặc tả kiến trúc phần mềm, đảm bảo các tiêu chí nghiệm thu DoD.`}
          </div>

          {/* 4. METADATA KEY-VALUE TABLE (100% Vietnamese Academic Terminology) */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-3">
            {/* Project / Module */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Phân hệ / Đồ án</span>
              <span className="font-bold text-[#f97316]">
                {projectName}
              </span>
            </div>

            {/* Assignee - Interactive Selector */}
            <div className="flex items-center justify-between text-xs relative">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Người phụ trách</span>
              <div className="relative">
                <button
                  type="button"
                  disabled={isReadOnlyForRole}
                  onClick={() => !isReadOnlyForRole && setIsAssigneePickerOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs transition-all cursor-pointer disabled:cursor-not-allowed group"
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
                  {!isReadOnlyForRole && (
                    <ChevronDown
                      size={13}
                      className={`text-slate-400 transition-transform duration-150 ${
                        isAssigneePickerOpen ? "rotate-180 text-[#f97316]" : ""
                      }`}
                    />
                  )}
                </button>

                {isAssigneePickerOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsAssigneePickerOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-1.5 space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Chọn thành viên phụ trách
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
                                    role: m.role || "Developer",
                                  },
                                });
                                setIsAssigneePickerOpen(false);
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                                  : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              <div
                                className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0"
                                style={{ backgroundColor: m.color?.startsWith("#") ? m.color : "#f97316" }}
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
                                <Check size={14} className="text-amber-500 shrink-0 stroke-[2.5]" />
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

            {/* Due Date (Dynamic status instead of hardcoded '5 days ago') */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Hạn hoàn thành</span>
              <span
                className={`font-semibold font-mono ${
                  dueMeta.isUrgent
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-800 dark:text-slate-200"
                }`}
              >
                {dueText} · <span className="font-sans font-bold">{dueMeta.text}</span>
              </span>
            </div>

            {/* Priority */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Độ ưu tiên</span>
              <span
                className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] ${
                  task.priority === "high"
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    : task.priority === "medium"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {task.priority === "high"
                  ? "Cao (P0)"
                  : task.priority === "medium"
                  ? "Trung bình (P1)"
                  : "Thấp (P2)"}
              </span>
            </div>

            {/* Work & Story Points */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Khối lượng ước tính</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {estHours} giờ thực hành · {task.points} Story Points
              </span>
            </div>
          </div>

          {/* 5. GITHUB INTEGRATION CARD (REAL COMMITS, PRS & REPO PROOF LINK) */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 min-w-0">
                <FolderGit2 size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white">
                  Liên kết GitHub &amp; Minh chứng
                </span>
                <strong className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                  #{task.code}
                </strong>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {task.deliverable && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                    {task.deliverable.label}
                  </span>
                )}
                {onOpenGitHub && (
                  <button
                    type="button"
                    onClick={() => onOpenGitHub("prs")}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 font-bold text-[10.5px] inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <GitFork size={11} />
                    <span>Mở Git Hub →</span>
                  </button>
                )}
              </div>
            </div>

            {projectGitRepo?.repoSlug && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-mono truncate">Repo: {projectGitRepo.repoSlug}</span>
                {task.gitActivity?.hasValidGitProof ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] shrink-0">
                    ✓ Đủ điều kiện minh chứng Git
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-[10px] shrink-0">
                    Chưa có Commit/PR
                  </span>
                )}
              </div>
            )}

            {/* Real Pull Requests linked to this task code */}
            {task.gitActivity && task.gitActivity.pullRequests.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Pull Requests gắn #{task.code} ({task.gitActivity.pullRequests.length})
                </div>
                {task.gitActivity.pullRequests.map((pr) => {
                  const stLow = (pr.status || "open").toLowerCase();
                  const badgeCls =
                    stLow === "merged"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : stLow === "approved"
                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                      : stLow === "changes_requested"
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-300";
                  const statusLabel =
                    stLow === "merged"
                      ? "Merged"
                      : stLow === "approved"
                      ? "Approved"
                      : stLow === "changes_requested"
                      ? "Cần sửa"
                      : "Open";
                  return (
                    <div
                      key={pr.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <GitPullRequest size={12} className="text-blue-500 shrink-0" />
                          <span className="font-mono font-bold text-[11px] text-slate-800 dark:text-slate-100">
                            PR #{String(pr.prNumber).padStart(2, "0")}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${badgeCls}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                          {pr.title}
                        </p>
                      </div>
                      <a
                        href={pr.prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                        title="Xem PR trên GitHub"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Real Commits linked to this task code */}
            {task.gitActivity && task.gitActivity.commits.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Commits gắn #{task.code} ({task.gitActivity.commitsCount})
                </div>
                {task.gitActivity.commits.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GitCommit size={12} className="text-emerald-500 shrink-0" />
                      <span className="font-mono text-[10.5px] font-bold text-slate-700 dark:text-slate-200 shrink-0">
                        {c.sha}
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        {c.message}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">{c.authorName}</span>
                  </div>
                ))}
              </div>
            )}

            {(!task.gitActivity ||
              (task.gitActivity.commitsCount === 0 && task.gitActivity.pullRequests.length === 0)) && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Chưa có Commit/PR gắn mã <strong className="font-mono">#{task.code}</strong> trên Git Hub — hãy tạo Commit/PR kèm mã task hoặc dán link trực tiếp thuộc{" "}
                <strong className="font-mono">{projectGitRepo?.repoSlug || "GitHub Repo dự án"}</strong> bên dưới.
              </p>
            )}

            {/* Submission Proof URL Input (Student editable) or Readonly Display */}
            <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Link2 size={11} />
                  <span>Link minh chứng GitHub (PR / Commit):</span>
                </span>
                {task.submissionUrl && (
                  <a
                    href={task.submissionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <span>Mở link</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              {role === "student" && !isSprintLocked && !isVerified ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      value={submissionUrlDraft}
                      onChange={(e) => {
                        setSubmissionUrlDraft(e.target.value);
                        if (submissionUrlError) setSubmissionUrlError(null);
                        if (submissionUrlSuccess) setSubmissionUrlSuccess(null);
                      }}
                      placeholder={`https://github.com/${projectGitRepo?.repoSlug || "owner/repo"}/pull/1`}
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      disabled={isSavingUrl}
                      onClick={() => void handleSaveLink()}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-[11px] shrink-0 transition cursor-pointer disabled:opacity-60"
                    >
                      {isSavingUrl ? "Đang lưu..." : "Lưu link"}
                    </button>
                  </div>
                  {submissionUrlError && (
                    <p className="text-[10.5px] font-medium text-rose-600 dark:text-rose-400">
                      {submissionUrlError}
                    </p>
                  )}
                  {submissionUrlSuccess && (
                    <p className="text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400">
                      {submissionUrlSuccess}
                    </p>
                  )}
                </>
              ) : (
                <div className="px-2.5 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 font-mono text-[10.5px] text-slate-600 dark:text-slate-300 truncate">
                  {task.submissionUrl || "Chưa gắn link minh chứng trực tiếp"}
                </div>
              )}
            </div>
          </div>

          {/* 6. USER STORY (SCRUM SPEC) */}
          {task.userStory && (
            <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1 leading-relaxed">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 font-mono mb-1">
                Đặc tả Scrum User Story:
              </div>
              <p>
                <strong className="text-amber-800 dark:text-amber-300">Là (Role):</strong> {task.userStory.role}
              </p>
              <p>
                <strong className="text-slate-900 dark:text-white">Tôi muốn (Goal):</strong> {task.userStory.want}
              </p>
              <p>
                <strong className="text-emerald-700 dark:text-emerald-400">Để (Benefit):</strong> {task.userStory.benefit}
              </p>
            </div>
          )}

          {/* 7. CHECKLIST & DOD */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Checklist & Tiêu chuẩn DoD
              </h3>
              {checks.length > 0 && (
                <span className="text-[11px] font-mono font-bold text-[#f97316]">
                  {completedChecksCount}/{checks.length} hoàn thành
                </span>
              )}
            </div>

            {checks.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-2">Không có checklist cho thẻ này.</p>
            ) : (
              <div className="space-y-1.5">
                {checks.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`marlo-check-card ${item.done ? "is-done" : ""} ${
                      isSprintLocked ? "pointer-events-none opacity-75" : ""
                    }`}
                  >
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

          {/* 8. INSTRUCTOR INLINE REVIEW BOX (When role === "instructor" and task is in "done") */}
          {role === "instructor" && onReviewTask && (isDone || currentColumn === "fail") && (
            <div className="p-4 rounded-2xl border border-amber-300/80 dark:border-amber-800/70 bg-amber-50/60 dark:bg-amber-950/25 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-amber-600" />
                  <span>Hội đồng / Giảng viên Thẩm định Task</span>
                </span>
                <span className="text-[10.5px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  +{task.points * 10} XP khi duyệt
                </span>
              </div>

              {showRevisionInput ? (
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    placeholder="Nhập nhận xét chi tiết yêu cầu sinh viên bổ sung hoặc sửa lại..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRevisionInput(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onReviewTask(
                          task.id,
                          "request_revision",
                          revisionNote.trim() || "Cần bổ sung test case biên và hoàn thiện tiêu chí DoD."
                        );
                        setShowRevisionInput(false);
                        setRevisionNote("");
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Gửi Yêu cầu sửa
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onReviewTask(task.id, "approve")}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Check size={14} strokeWidth={2.8} />
                    <span>Nghiệm thu (+{task.points * 10} XP)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRevisionInput(true)}
                    className="py-2 px-3 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Yêu cầu sửa</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── DRAWER FOOTER ─── */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          {/* Left Delete button (Only for Student on non-verified tasks when Sprint is unlocked) */}
          {role === "student" && !isVerified && !isSprintLocked ? (
            <button
              type="button"
              onClick={() => onDeleteTask?.(task)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Xóa thẻ</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              {isSprintLocked ? (
                <>
                  <Lock size={12} className="text-rose-500" />
                  <span>Sprint đang khóa kiểm toán</span>
                </>
              ) : isVerified ? (
                <>
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Thẻ đã được GVHD nghiệm thu</span>
                </>
              ) : (
                <span>Chế độ giám sát & thẩm định</span>
              )}
            </span>
          )}

          {/* Right Action: Mark Done / Reopen */}
          {!isSprintLocked && role !== "admin" && !(role === "student" && isVerified) && (
            <button
              type="button"
              onClick={handleToggleMarkDone}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer ${
                isCompleted
                  ? "bg-slate-800 dark:bg-slate-700 text-white hover:opacity-90"
                  : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              }`}
            >
              {isCompleted ? (
                <>
                  <RotateCcw size={14} />
                  <span>Mở lại công việc</span>
                </>
              ) : (
                <>
                  <Check size={14} className="stroke-[3]" />
                  <span>Đánh dấu Hoàn thành</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
