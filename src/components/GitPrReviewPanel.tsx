import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCheck,
  CheckCircle2,
  Code2,
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  HelpCircle,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wand2,
  X,
} from "lucide-react";
import type {
  GitMemberAnalytics,
  GitProjectTaskRef,
  GitPullRequestRecord,
} from "../api";

interface GitPrReviewPanelProps {
  pullRequests: GitPullRequestRecord[];
  selectedPr: GitPullRequestRecord | null;
  onSelectPr: (pr: GitPullRequestRecord) => void;
  onOpenNewPrModal: () => void;
  onAiFix: (prId: string) => Promise<void>;
  onPeerApprove: (prId: string, comment: string) => Promise<void>;
  onMerge: (prId: string, strategy: string) => Promise<void>;
  onOpenDefenseRoom?: () => void;
  actionLoading: string | null;
  actionError: string | null;
}

const STATUS_BADGE: Record<
  GitPullRequestRecord["status"],
  { label: string; cls: string }
> = {
  open: { label: "Chờ Review", cls: "pill pill--info pill--plain" },
  changes_requested: { label: "Cảnh báo AST", cls: "pill pill--bad pill--plain" },
  approved: { label: "Sẵn sàng Merge", cls: "pill pill--warn pill--plain" },
  merged: { label: "Đã Merge · DoD", cls: "pill pill--good pill--plain" },
};

export function GitPrReviewPanel({
  pullRequests,
  selectedPr,
  onSelectPr,
  onOpenNewPrModal,
  onAiFix,
  onPeerApprove,
  onMerge,
  onOpenDefenseRoom,
  actionLoading,
  actionError,
}: GitPrReviewPanelProps) {
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "merged">("all");
  const [peerComment, setPeerComment] = useState(
    "LGTM — Đã kiểm tra kiến trúc 3 tầng & unit tests."
  );
  const [mergeStrategy, setMergeStrategy] = useState<"squash" | "rebase" | "merge">(
    "squash"
  );

  const visiblePrs = pullRequests.filter((pr) => {
    if (filterStatus === "open") return pr.status !== "merged";
    if (filterStatus === "merged") return pr.status === "merged";
    return true;
  });

  const unresolvedFindings =
    selectedPr?.aiFindings.filter((f) => !f.resolved) ?? [];
  const unresolvedCritical = unresolvedFindings.some(
    (f) => f.severity === "critical"
  );
  const isMerged = selectedPr?.status === "merged";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-screen-enter">
      {/* Left Column: PR Queue */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitPullRequest size={16} className="text-blue-600 dark:text-blue-400" />
              Danh sách Pull Request
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Quy trình duyệt 2 lớp: AI AST Scanner + Peer Review
            </p>
          </div>
          <button
            onClick={onOpenNewPrModal}
            className="btn-marlo-primary btn--primary flex items-center gap-1 text-xs py-1.5 px-2.5 shrink-0 cursor-pointer"
          >
            <Plus size={14} />
            <span>Tạo PR</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
          {[
            { id: "all", label: `Tất cả (${pullRequests.length})` },
            {
              id: "open",
              label: `Đang mở (${
                pullRequests.filter((p) => p.status !== "merged").length
              })`,
            },
            {
              id: "merged",
              label: `Đã Merge (${
                pullRequests.filter((p) => p.status === "merged").length
              })`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition text-[11px] cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-0.5">
          {visiblePrs.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500">
              Chưa có Pull Request nào trong bộ lọc này.
            </div>
          ) : (
            visiblePrs.map((pr) => {
              const isSelected = selectedPr?.id === pr.id;
              const badge = STATUS_BADGE[pr.status] || STATUS_BADGE.open;
              return (
                <button
                  key={pr.id}
                  onClick={() => onSelectPr(pr)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 shadow-xs"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      PR #{String(pr.prNumber).padStart(2, "0")}
                    </span>
                    <span className={`${badge.cls} text-[10px] font-bold`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                    {pr.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {pr.sourceBranch} → {pr.targetBranch}
                    </span>
                    {pr.taskCode && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold">
                        #{pr.taskCode}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      {pr.author.name}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        pr.aiReviewScore >= 90
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      AI {pr.aiReviewScore}/100
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Selected PR Inspector & 2-Tier Review */}
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-5 space-y-5">
        {!selectedPr ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Chọn một Pull Request ở cột trái để kiểm tra bảo mật AST và thực hiện Merge.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    PR #{String(selectedPr.prNumber).padStart(2, "0")}
                  </span>
                  <span
                    className={`${
                      (STATUS_BADGE[selectedPr.status] || STATUS_BADGE.open).cls
                    } text-[11px] font-bold`}
                  >
                    {(STATUS_BADGE[selectedPr.status] || STATUS_BADGE.open).label}
                  </span>
                  {selectedPr.taskCode && (
                    <span className="pill pill--warn pill--plain font-mono text-[11px] font-bold">
                      Task #{selectedPr.taskCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <GitBranch size={13} className="text-blue-600 dark:text-blue-400" />
                  <span>{selectedPr.sourceBranch}</span>
                  <span>→</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedPr.targetBranch}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-950 dark:text-white leading-snug">
                {selectedPr.title}
              </h3>
              {selectedPr.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {selectedPr.description}
                </p>
              )}
            </div>

            {/* Guardrail Error Alert */}
            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
                <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Rào chắn Quy trình 2-Tier Review</div>
                  <div className="mt-0.5">{actionError}</div>
                </div>
              </div>
            )}

            {/* SHA-256 DoD Seal Banner if Merged */}
            {isMerged && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/70 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-300 dark:border-emerald-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Đã Squash Merge & Đóng Dấu Nghiệm Thu SHA-256 DoD</span>
                  </div>
                  <span className="pill pill--good pill--plain font-mono text-[10.5px] font-bold">
                    +30 XP AWARDED
                  </span>
                </div>
                <div className="text-[11px] font-mono text-emerald-900/90 dark:text-emerald-300 break-all bg-white/70 dark:bg-slate-950/50 px-3 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60">
                  SHA-256 DoD Seal: {selectedPr.dodSha256}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <span>
                    ✓ Đã đồng bộ trạng thái <strong>Hoàn thành</strong> trên Kanban{" "}
                    {selectedPr.taskCode ? `(#${selectedPr.taskCode})` : ""} và gửi hồ sơ sang Dual Grading Giảng viên.
                  </span>
                  {onOpenDefenseRoom && (
                    <button
                      onClick={onOpenDefenseRoom}
                      className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Vào Phòng Bảo vệ AI →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tier 1: CodeMind AI Senior Reviewer & AST Security Scanner */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <Bot size={16} />
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Lớp 1 • CodeMind AI Senior Reviewer & AST Security Scanner
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Blast Radius: {selectedPr.aiBlastRadius} • {selectedPr.aiSummary}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${
                      selectedPr.aiReviewScore >= 90
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                    }`}
                  >
                    AI Score: {selectedPr.aiReviewScore}/100
                  </span>
                  {!isMerged && unresolvedFindings.length > 0 && (
                    <button
                      onClick={() => onAiFix(selectedPr.id)}
                      disabled={actionLoading !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition cursor-pointer disabled:opacity-60"
                    >
                      <Wand2 size={13} />
                      <span>
                        {actionLoading === "ai-fix"
                          ? "Đang vá AST..."
                          : "Sửa nhanh 1-Click bằng AI"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {selectedPr.aiFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className={`p-3 rounded-lg border text-xs space-y-1 ${
                      finding.resolved
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                        : finding.severity === "critical"
                        ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800"
                        : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        {finding.resolved ? (
                          <CheckCircle2 size={14} className="text-emerald-600" />
                        ) : (
                          <AlertTriangle
                            size={14}
                            className={
                              finding.severity === "critical"
                                ? "text-rose-600"
                                : "text-amber-600"
                            }
                          />
                        )}
                        {finding.rule}
                      </span>
                      <span className="font-mono text-[10.5px] text-slate-500 dark:text-slate-400">
                        {finding.file}:{finding.line}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{finding.message}</p>
                    <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                      Khuyến nghị: {finding.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier 2: Peer Review & Squash Merge Controls */}
            {!isMerged && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <UserCheck size={16} className="text-purple-600 dark:text-purple-400" />
                    <span>Lớp 2 • Peer Review Chéo & Cổng Squash Merge</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        !unresolvedCritical
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {!unresolvedCritical ? "✓ AI Security Gate Pass" : "✕ Còn lỗi AST Critical"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        selectedPr.peerApproved
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {selectedPr.peerApproved
                        ? `✓ ${selectedPr.peerReviewer || "Peer"} Approved`
                        : "Chờ Peer Approve"}
                    </span>
                  </div>
                </div>

                {selectedPr.peerApproved ? (
                  <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <span>
                      <strong>{selectedPr.peerReviewer}:</strong> {selectedPr.peerComment}
                    </span>
                    <CheckCheck size={15} className="text-emerald-600 shrink-0" />
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={peerComment}
                      onChange={(e) => setPeerComment(e.target.value)}
                      placeholder="Nhập nhận xét Peer Review..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      onClick={() => onPeerApprove(selectedPr.id, peerComment)}
                      disabled={actionLoading !== null}
                      className="btn-marlo-secondary btn--secondary flex items-center justify-center gap-1.5 text-xs py-1.5 px-3 cursor-pointer"
                    >
                      <UserCheck size={14} className="text-purple-600" />
                      <span>
                        {actionLoading === "peer-approve" ? "Đang duyệt..." : "Peer Approve"}
                      </span>
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      Chiến lược Merge:
                    </span>
                    <select
                      value={mergeStrategy}
                      onChange={(e) => setMergeStrategy(e.target.value as any)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                    >
                      <option value="squash">Squash and Merge (Khuyên dùng)</option>
                      <option value="rebase">Rebase and Merge</option>
                      <option value="merge">Merge Commit (--no-ff)</option>
                    </select>
                  </div>
                  <button
                    onClick={() => onMerge(selectedPr.id, mergeStrategy)}
                    disabled={actionLoading !== null}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer ${
                      !unresolvedCritical && selectedPr.peerApproved
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    <GitMerge size={14} />
                    <span>
                      {actionLoading === "merge"
                        ? "Đang Squash Merge..."
                        : "Squash & Merge (+30 XP)"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Diff Hunks + Defense Questions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Code2 size={14} className="text-blue-600" />
                  <span>Mã nguồn Diff nổi bật</span>
                </div>
                <div className="rounded-xl bg-slate-950 p-3 font-mono text-[11px] space-y-1.5 overflow-x-auto border border-slate-800">
                  {selectedPr.diffPreview.map((d, i) => (
                    <div
                      key={i}
                      className={
                        d.type === "removed"
                          ? "text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded"
                          : "text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded"
                      }
                    >
                      <span className="text-slate-500 mr-2">
                        {d.file}:{d.line}
                      </span>
                      <span>{d.code}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-purple-600" />
                  <span>Câu hỏi Vấn đáp Hội đồng AI (tự sinh từ PR)</span>
                </div>
                <div className="space-y-2">
                  {selectedPr.defenseQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 text-xs space-y-0.5"
                    >
                      <div className="font-mono text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Sparkles size={11} />
                        {q.persona}
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 leading-snug">
                        {q.question}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function GitNewCommitModal({
  isOpen,
  onClose,
  onSubmit,
  members,
  tasks,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    branch: string;
    message: string;
    task_code?: string;
    author_name?: string;
    files_changed: string[];
  }) => Promise<void>;
  members: GitMemberAnalytics[];
  tasks: GitProjectTaskRef[];
}) {
  const [branch, setBranch] = useState("feature/auth");
  const [taskCode, setTaskCode] = useState(tasks[0]?.code || "TE35D77");
  const [authorName, setAuthorName] = useState(members[0]?.name || "Nguyễn Bá Hòa");
  const [message, setMessage] = useState(
    `feat(#${tasks[0]?.code || "TE35D77"}): Tối ưu hóa xử lý bất đồng bộ & kiểm thử đơn vị`
  );
  const [filesText, setFilesText] = useState(
    "backend/app/api/v1/git_hub.py, tests/test_git_hub.py"
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        branch,
        task_code: taskCode || undefined,
        author_name: authorName || undefined,
        message: message.trim(),
        files_changed: filesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 marlo-scrim"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-5 space-y-4 marlo-modal"
      >
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitCommit size={18} className="text-blue-600" />
              Ghi Nhận & Push Commit Mới (+10 XP)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Commit mới sẽ vẽ trực tiếp lên Cây phân nhánh Git & liên kết Task Kanban.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nhánh Git (Branch)
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
              >
                <option value="feature/auth">feature/auth</option>
                <option value="feature/evaluator">feature/evaluator</option>
                <option value="develop">develop</option>
                <option value="release/v1.2">release/v1.2</option>
                <option value="hotfix/cve">hotfix/cve</option>
                <option value="main">main</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Thành viên thực hiện
              </label>
              <select
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                {members.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Liên kết Task Kanban
            </label>
            <select
              value={taskCode}
              onChange={(e) => {
                const next = e.target.value;
                setTaskCode(next);
                if (next && !message.includes(next)) {
                  setMessage(`feat(#${next}): Cập nhật xử lý module và unit tests`);
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.code}>
                  #{t.code} — {t.title} ({t.column})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Thông điệp Commit (Conventional Commits)
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Danh sách tệp thay đổi (cách nhau dấu phẩy)
            </label>
            <input
              type="text"
              value={filesText}
              onChange={(e) => setFilesText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 rounded-lg cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="btn-marlo-primary btn--primary text-xs px-4 py-1.5 cursor-pointer"
          >
            {submitting ? "Đang Push..." : "Push Commit Lên Graph"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function GitNewPrModal({
  isOpen,
  onClose,
  onSubmit,
  tasks,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description: string;
    source_branch: string;
    target_branch: string;
    task_code?: string;
    code_snippet: string;
  }) => Promise<void>;
  tasks: GitProjectTaskRef[];
}) {
  const [taskCode, setTaskCode] = useState(tasks[2]?.code || tasks[0]?.code || "TE22C19");
  const [title, setTitle] = useState(
    `feat(module): Hoàn thiện kiểm thử tích hợp #${tasks[2]?.code || tasks[0]?.code || "TE22C19"}`
  );
  const [sourceBranch, setSourceBranch] = useState("feature/auth");
  const [targetBranch, setTargetBranch] = useState("develop");
  const [description, setDescription] = useState(
    "Chuẩn hóa kiến trúc 3 tầng Router -> Service -> DB, bổ sung test coverage."
  );
  const [codeSnippet, setCodeSnippet] = useState(
    "def verify_rbac_guard(user):\n    return user.role in ('student', 'instructor')"
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        source_branch: sourceBranch,
        target_branch: targetBranch,
        task_code: taskCode || undefined,
        code_snippet: codeSnippet,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 marlo-scrim"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-5 space-y-4 marlo-modal"
      >
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitPullRequest size={18} className="text-blue-600" />
              Mở Pull Request & Quét CodeMind AI AST
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống tự động quét lỗ hổng bảo mật (shell=True, SQLi) và sinh câu hỏi Vấn đáp AI.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Tiêu đề Pull Request
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nhánh nguồn
              </label>
              <input
                type="text"
                value={sourceBranch}
                onChange={(e) => setSourceBranch(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nhánh đích
              </label>
              <select
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
              >
                <option value="develop">develop</option>
                <option value="main">main</option>
                <option value="release/v1.2">release/v1.2</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Mã Task Kanban
              </label>
              <select
                value={taskCode}
                onChange={(e) => setTaskCode(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.code}>
                    #{t.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Mô tả thay đổi
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Đoạn mã Diff cần AI AST kiểm tra
            </label>
            <textarea
              rows={3}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 text-emerald-400 border border-slate-700 rounded-lg font-mono text-[11px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 rounded-lg cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="btn-marlo-primary btn--primary flex items-center gap-1.5 text-xs px-4 py-1.5 cursor-pointer"
          >
            <ShieldCheck size={14} />
            <span>{submitting ? "Đang chạy AI AST..." : "Mở PR & Quét AST"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
