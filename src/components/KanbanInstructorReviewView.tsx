import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  GitCommit,
  User,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowRight,
  Filter,
  AlertCircle,
  Clock,
  Award,
} from "lucide-react";
import type { KanbanTask, TeamMember } from "../screens/KanbanBoard";

interface Props {
  tasks: KanbanTask[];
  teamMembers: TeamMember[];
  onReviewTask: (taskId: string, decision: "approve" | "request_revision", feedback?: string) => Promise<void>;
  onSelectTask: (task: KanbanTask) => void;
  onGoToBoard: () => void;
}

export default function KanbanInstructorReviewView({
  tasks,
  teamMembers,
  onReviewTask,
  onSelectTask,
  onGoToBoard,
}: Props) {
  const [filterView, setFilterView] = useState<"pending" | "verified" | "all">("pending");
  const [revisionTaskId, setRevisionTaskId] = useState<string | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter tasks based on review status
  const pendingTasks = tasks.filter((t) => t.column === "done");
  const verifiedTasks = tasks.filter((t) => t.column === "verified");

  const displayedTasks = tasks.filter((t) => {
    if (filterView === "pending") return t.column === "done";
    if (filterView === "verified") return t.column === "verified";
    return t.column === "done" || t.column === "verified";
  });

  const totalPendingPoints = pendingTasks.reduce((acc, t) => acc + (t.points || 0), 0);
  const totalVerifiedPoints = verifiedTasks.reduce((acc, t) => acc + (t.points || 0), 0);
  const uniqueStudentsPending = Array.from(new Set(pendingTasks.map((t) => t.assignee?.name))).filter(Boolean);

  const handleApprove = async (taskId: string) => {
    setIsSubmitting(true);
    try {
      await onReviewTask(taskId, "approve");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRevisionModal = (taskId: string) => {
    setRevisionTaskId(taskId);
    setRevisionFeedback("Cần bổ sung kiểm thử biên (edge-case test) và giải trình mã nguồn theo chuẩn DoD.");
  };

  const handleConfirmRevision = async () => {
    if (!revisionTaskId) return;
    setIsSubmitting(true);
    try {
      await onReviewTask(revisionTaskId, "request_revision", revisionFeedback);
      setRevisionTaskId(null);
      setRevisionFeedback("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 animate-fadeIn pb-10">
      {/* ─── Top Stats & Guidance Banner ─── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0f1219] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <ShieldCheck size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Khu Vực Thẩm Định & Nghiệm Thu Đồ Án
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-slate-200/80 dark:border-slate-800">
                  Dành riêng Giảng viên
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Kiểm tra sản phẩm do sinh viên nộp tại cột Hoàn thành. Xác thực commit Git, tiêu chí hoàn thành Definition of Done (DoD) trước khi phê duyệt cấp chứng nhận và điểm kinh nghiệm XP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onGoToBoard}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
            >
              <span>Xem trên Bảng Kanban</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* ─── Metric Pills ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Chờ nghiệm thu</div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
              <span>{pendingTasks.length}</span>
              <span className="text-xs font-normal text-slate-400">công việc</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Story Points chờ duyệt</div>
            <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{totalPendingPoints}</span>
              <span className="text-xs font-normal text-slate-400">SP</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Sinh viên đã nộp</div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
              <span>{uniqueStudentsPending.length}</span>
              <span className="text-xs font-normal text-slate-400">thành viên</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Đã nghiệm thu (Đạt DoD)</div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-baseline gap-1.5">
              <span>{verifiedTasks.length}</span>
              <span className="text-xs font-normal text-emerald-700 dark:text-emerald-300">+{totalVerifiedPoints * 10} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filter Pills ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setFilterView("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              filterView === "pending"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Cần thẩm định ngay</span>
            <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
              {pendingTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterView("verified")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              filterView === "verified"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Đã nghiệm thu (Verified)</span>
            <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
              {verifiedTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterView("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterView === "all"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Tất cả ({pendingTasks.length + verifiedTasks.length})
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Hiển thị {displayedTasks.length} mục
        </div>
      </div>

      {/* ─── Task List for Review ─── */}
      {displayedTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0f1219] p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 mb-3 border border-slate-200/70 dark:border-slate-800">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {filterView === "pending"
              ? "Không có công việc nào đang chờ nghiệm thu"
              : "Chưa có công việc nào trong danh mục này"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            {filterView === "pending"
              ? "Toàn bộ công việc do sinh viên nộp đã được Giảng viên thẩm định xong hoặc nhóm đang trong quá trình lập trình Sprint."
              : "Hãy kiểm tra lại bộ lọc hoặc chuyển sang góc nhìn Bảng Kanban để xem toàn cảnh các Sprint."}
          </p>
          <button
            type="button"
            onClick={onGoToBoard}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Quay lại Bảng Kanban
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {displayedTasks.map((task) => {
            const isVerified = task.column === "verified";
            const memberObj = teamMembers.find((m) => m.name === task.assignee?.name);

            return (
              <div
                key={task.id}
                className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0f1219] p-4 sm:p-5 shadow-2xs hover:shadow-xs transition relative"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Task Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700/80">
                        {task.code || task.id}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md">
                        {task.points} Story Points
                      </span>
                      {task.priority && (
                        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {task.priority}
                        </span>
                      )}
                      {isVerified ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-slate-200/80 dark:border-slate-800 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>Đã Nghiệm Thu (+{task.points * 10} XP)</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-slate-200/80 dark:border-slate-800 flex items-center gap-1">
                          <Clock size={12} />
                          <span>Chờ Giảng viên duyệt</span>
                        </span>
                      )}
                    </div>

                    <h4
                      onClick={() => onSelectTask(task)}
                      className="text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer"
                    >
                      {task.title}
                    </h4>

                    {task.userStory?.want && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                        "{task.userStory.role ? `Là ${task.userStory.role}, ` : ""}tôi muốn {task.userStory.want}
                        {task.userStory.benefit ? ` để ${task.userStory.benefit}` : ""}."
                      </p>
                    )}

                    {/* Commit & DoD evidence */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 flex-wrap">
                      <span className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        <GitCommit size={13} className="text-slate-500" />
                        <span>Commit: {task.deliverable?.label || "877ac67"}</span>
                      </span>
                      {task.checklist && task.checklist.length > 0 && (
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          DoD: {task.checklist.filter((c) => c.done).length}/{task.checklist.length} tiêu chí đạt
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Student Assignee */}
                  <div className="shrink-0 flex items-center gap-3 lg:border-l lg:pl-5 border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white dark:bg-slate-700 flex items-center justify-center font-bold text-sm shadow-2xs">
                      {task.assignee?.avatar || "S"}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {task.assignee?.name || "Chưa phân công"}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {memberObj?.role || task.assignee?.role || "Sinh viên thực hiện"}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Instructor Direct Actions */}
                  <div className="shrink-0 flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    {!isVerified ? (
                      <>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleApprove(task.id)}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Nghiệm thu công việc và cấp điểm XP cho sinh viên"
                        >
                          <CheckCircle2 size={14} className="stroke-[2.5]" />
                          <span>Nghiệm thu (+XP)</span>
                        </button>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleOpenRevisionModal(task.id)}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer disabled:opacity-50"
                          title="Yêu cầu nhóm bổ sung hoặc sửa đổi mã nguồn"
                        >
                          <RotateCcw size={13} />
                          <span>Yêu cầu sửa</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          <span>Đã đóng dấu hoàn thành</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenRevisionModal(task.id)}
                          className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs transition"
                          title="Đổi ý và yêu cầu sửa đổi lại"
                        >
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectTask(task)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                      title="Xem chi tiết thẻ công việc"
                    >
                      <ExternalLink size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Modal for Requesting Revision ─── */}
      {revisionTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0f1219] p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                <RotateCcw size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Yêu Cầu Sửa Đổi & Bổ Sung
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Công việc sẽ được trả về trạng thái Đang làm để sinh viên hoàn thiện.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ý kiến đóng góp & Lý do yêu cầu sửa:
              </label>
              <textarea
                rows={4}
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                className="w-full rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-slate-400 resize-none"
                placeholder="Ví dụ: Cần bổ sung test case biên, giải trình kiến trúc hoặc khắc phục cảnh báo bảo mật..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevisionTaskId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSubmitting || !revisionFeedback.trim()}
                onClick={handleConfirmRevision}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu sửa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
