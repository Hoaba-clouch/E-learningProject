import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  Lock,
  MessageSquareWarning,
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
  SessionRole,
} from "../api";

interface GitPrReviewPanelProps {
  role?: SessionRole;
  isFrozen?: boolean;
  members?: GitMemberAnalytics[];
  pullRequests: GitPullRequestRecord[];
  selectedPr: GitPullRequestRecord | null;
  onSelectPr: (pr: GitPullRequestRecord) => void;
  onOpenNewPrModal: () => void;
  onAiFix: (prId: string) => Promise<void>;
  onPeerApprove: (prId: string, comment: string, reviewerName?: string) => Promise<void>;
  onRequestChanges?: (prId: string, comment: string, reviewerName?: string) => Promise<void>;
  onMerge: (prId: string, strategy: string) => Promise<void>;
  onOpenDefenseRoom?: () => void;
  actionLoading: string | null;
  actionError: string | null;
}

const STATUS_BADGE: Record<
  string,
  { label: string; cls: string }
> = {
  open: { label: "Chờ Review", cls: "pill pill--info pill--plain" },
  changes_requested: { label: "Yêu cầu sửa / AST", cls: "pill pill--bad pill--plain" },
  approved: { label: "Sẵn sàng Merge", cls: "pill pill--warn pill--plain" },
  merged: { label: "Đã Merge · DoD", cls: "pill pill--good pill--plain" },
};

const KANBAN_COLUMN_LABELS: Record<string, string> = {
  backlog: "Backlog",
  ready: "Cần làm",
  "in-progress": "Đang làm",
  done: "Hoàn thành",
  verified: "Đã nghiệm thu",
  fail: "Cần sửa lại",
};

function formatColumnLabel(col: string): string {
  return KANBAN_COLUMN_LABELS[(col || "").toLowerCase()] || col || "Cần làm";
}

function formatMergeStrategyLabel(strategy?: string): string {
  const s = (strategy || "squash").toLowerCase();
  if (s === "rebase") return "Rebase Merge";
  if (s === "merge") return "Merge Commit";
  return "Squash Merge";
}

export function GitPrReviewPanel({
  role = "student",
  isFrozen = false,
  members = [],
  pullRequests,
  selectedPr,
  onSelectPr,
  onOpenNewPrModal,
  onAiFix,
  onPeerApprove,
  onRequestChanges,
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
  const [selectedReviewer, setSelectedReviewer] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);

  const isStudent = role === "student";
  const isInstructor = role === "instructor";
  const isAdmin = role === "admin";

  const eligibleReviewers = useMemo(() => {
    const authorLow = (selectedPr?.author?.name || "").trim().toLowerCase();
    return members.filter(
      (m) => m.name && m.name.trim().toLowerCase() !== authorLow
    );
  }, [members, selectedPr?.author?.name]);

  useEffect(() => {
    setLocalError(null);
    if (isInstructor) {
      setSelectedReviewer("TS. Nguyễn Lan Anh");
      setPeerComment("Giảng viên đã thẩm định DoD, mã nguồn & kiến trúc — Đạt yêu cầu.");
    } else {
      setSelectedReviewer(eligibleReviewers[0]?.name || "");
      setPeerComment("LGTM — Đã kiểm tra kiến trúc 3 tầng & unit tests.");
    }
    if (selectedPr?.mergeStrategy) {
      const st = selectedPr.mergeStrategy.toLowerCase();
      if (st === "rebase" || st === "merge" || st === "squash") {
        setMergeStrategy(st);
      }
    }
  }, [selectedPr?.id, selectedPr?.mergeStrategy, eligibleReviewers, isInstructor]);

  const visiblePrs = pullRequests.filter((pr) => {
    if (filterStatus === "open") return pr.status !== "merged";
    if (filterStatus === "merged") return pr.status === "merged";
    return true;
  });

  const safeFindings = Array.isArray(selectedPr?.aiFindings) ? selectedPr.aiFindings : [];
  const unresolvedFindings = safeFindings.filter((f: any) => !f?.resolved);
  const unresolvedCritical = unresolvedFindings.some(
    (f: any) => String(f?.severity || "").toLowerCase() === "critical"
  );
  const isMerged = selectedPr?.status === "merged";

  const mergeButtonLabel =
    actionLoading === "merge"
      ? `Đang ${formatMergeStrategyLabel(mergeStrategy)}...`
      : mergeStrategy === "rebase"
      ? "Rebase & Merge (+30 XP)"
      : mergeStrategy === "merge"
      ? "Merge Commit (+30 XP)"
      : "Squash & Merge (+30 XP)";

  const mergeBlockedReason = isFrozen
    ? "Repository đang bị Quản trị viên đóng băng (Freeze). Không thể Merge."
    : unresolvedCritical
    ? "Còn cảnh báo bảo mật AST mức Critical chưa xử lý."
    : !selectedPr?.peerApproved
    ? "Cần ít nhất 1 thành viên hoặc Giảng viên Peer Approve trước khi Merge."
    : "";

  const handleApproveClick = async () => {
    if (!selectedPr) return;
    setLocalError(null);
    if (isStudent && !selectedReviewer.trim()) {
      setLocalError("Cần ít nhất 1 thành viên khác trong nhóm (khác tác giả PR) để thực hiện Peer Review.");
      return;
    }
    await onPeerApprove(
      selectedPr.id,
      peerComment.trim() || "LGTM — Đạt chuẩn Clean Code & Kiến trúc 3 tầng.",
      selectedReviewer.trim() || undefined
    );
  };

  const handleRequestChangesClick = async () => {
    if (!selectedPr || !onRequestChanges) return;
    setLocalError(null);
    if (isStudent && !selectedReviewer.trim()) {
      setLocalError("Cần chọn thành viên Reviewer khác tác giả PR trước khi gửi yêu cầu sửa.");
      return;
    }
    const cleanComment = peerComment.trim();
    if (cleanComment.length < 4) {
      setLocalError("Vui lòng nhập lý do/góp ý chỉnh sửa tối thiểu 4 ký tự.");
      return;
    }
    await onRequestChanges(
      selectedPr.id,
      cleanComment,
      selectedReviewer.trim() || undefined
    );
  };

  const displayedError = actionError || localError;

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
          {isStudent && (
            <button
              onClick={onOpenNewPrModal}
              disabled={isFrozen}
              title={isFrozen ? "Repository đang bị đóng băng (Freeze)" : "Mở Pull Request mới"}
              className="btn-marlo-primary btn--primary flex items-center gap-1 text-xs py-1.5 px-2.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              <span>Tạo PR</span>
            </button>
          )}
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
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-0.5">
          {visiblePrs.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
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
                      ? "bg-slate-100/90 dark:bg-slate-800/90 border-slate-400 dark:border-slate-600 shadow-xs"
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
          <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
            Chọn một Pull Request ở cột trái để kiểm tra bảo mật AST và thực hiện Merge.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
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
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  Tác giả: <strong className="text-slate-800 dark:text-slate-200">{selectedPr.author.name}</strong> ({selectedPr.author.role})
                </span>
                {selectedPr.description && (
                  <>
                    <span>•</span>
                    <span className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {selectedPr.description}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Frozen Repo Alert for Students */}
            {isFrozen && isStudent && !isMerged && (
              <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 text-xs flex items-start gap-2.5">
                <Lock size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-800 dark:text-amber-300">
                    Repository đang bị đóng băng (Freeze)
                  </div>
                  <div className="mt-0.5 text-amber-700 dark:text-amber-400/90">
                    Quản trị viên đã bật khóa đóng băng nhánh nộp bài. Các thao tác tạo PR, vá AI, duyệt và Merge đang tạm khóa.
                  </div>
                </div>
              </div>
            )}

            {/* Guardrail Error Alert */}
            {displayedError && (
              <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/70 text-slate-800 dark:text-slate-200 text-xs flex items-start gap-2.5">
                <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-700 dark:text-rose-400">Rào chắn Quy trình 2-Tier Review</div>
                  <div className="mt-0.5 text-slate-700 dark:text-slate-300">{displayedError}</div>
                </div>
              </div>
            )}

            {/* SHA-256 DoD Seal Banner if Merged */}
            {isMerged && (
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-800/70 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-sm">
                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <span>
                      Đã {formatMergeStrategyLabel(selectedPr.mergeStrategy)} & Đóng Dấu Nghiệm Thu SHA-256 DoD
                    </span>
                  </div>
                  <span className="pill pill--plain font-mono text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-800">
                    +30 XP đã cộng
                  </span>
                </div>
                {selectedPr.dodSha256 && (
                  <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all bg-white dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    SHA-256 DoD Seal: {selectedPr.dodSha256}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span>
                    ✓ Đã đồng bộ trạng thái <strong className="text-slate-800 dark:text-slate-200">Hoàn thành</strong> trên Kanban{" "}
                    {selectedPr.taskCode ? `(#${selectedPr.taskCode})` : ""} và gửi hồ sơ sang Dual Grading Giảng viên.
                  </span>
                  {onOpenDefenseRoom && (
                    <button
                      onClick={onOpenDefenseRoom}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer"
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
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedPr.aiReviewScore >= 90 ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <span>AI Score:</span>
                    <span
                      className={
                        selectedPr.aiReviewScore >= 90
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {selectedPr.aiReviewScore}/100
                    </span>
                  </span>
                  {isStudent && !isMerged && unresolvedFindings.length > 0 && (
                    <button
                      onClick={() => onAiFix(selectedPr.id)}
                      disabled={actionLoading !== null || isFrozen}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                {safeFindings.length === 0 ? (
                  <div className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400">
                    Chưa có phát hiện cảnh báo nào từ bộ quét AST.
                  </div>
                ) : (
                  safeFindings.map((rawFinding: any, idx: number) => {
                    const fResolved =
                      typeof rawFinding?.resolved === "boolean"
                        ? rawFinding.resolved
                        : rawFinding?.status === "pass";
                    const fSeverity = String(rawFinding?.severity || (fResolved ? "info" : "warning")).toLowerCase();
                    const fRule = rawFinding?.rule || "AST Security Check";
                    const fFile = rawFinding?.file || "src/App.tsx";
                    const fLine = rawFinding?.line ?? 1;
                    const fMessage =
                      rawFinding?.message ||
                      (fResolved
                        ? "Đã vượt qua kiểm tra tĩnh & chuẩn kiến trúc 3 tầng."
                        : "Cần rà soát lại đoạn mã tại vị trí này.");
                    const fSuggestion =
                      rawFinding?.suggestion || "Giữ cấu trúc phân tầng sạch và bổ sung unit test.";
                    return (
                      <div
                        key={rawFinding?.id || `${selectedPr.id}-f-${idx}`}
                        className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            {fResolved ? (
                              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <AlertTriangle
                                size={14}
                                className={
                                  fSeverity === "critical"
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-amber-600 dark:text-amber-400"
                                }
                              />
                            )}
                            {fRule}
                          </span>
                          <span className="font-mono text-[10.5px] text-slate-500 dark:text-slate-400">
                            {fFile}:{fLine}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{fMessage}</p>
                        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                          Khuyến nghị: {fSuggestion}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Tier 2: Peer Review & Merge Controls */}
            {!isMerged && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <UserCheck size={16} className="text-purple-600 dark:text-purple-400" />
                    <span>
                      {isInstructor
                        ? "Lớp 2 • Thẩm định DoD & Phản hồi của Giảng viên"
                        : "Lớp 2 • Peer Review Chéo & Cổng Merge"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        !unresolvedCritical
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300"
                      }`}
                    >
                      {!unresolvedCritical ? "✓ AI Security Gate Pass" : "✕ Còn lỗi AST Critical"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        selectedPr.peerApproved
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                          : selectedPr.status === "changes_requested"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {selectedPr.peerApproved
                        ? `✓ ${selectedPr.peerReviewer || "Reviewer"} Approved`
                        : selectedPr.status === "changes_requested"
                        ? "↺ Đã yêu cầu chỉnh sửa"
                        : "Chờ Peer Approve"}
                    </span>
                  </div>
                </div>

                {/* Current Review Status Banner */}
                {(selectedPr.peerApproved || (selectedPr.status === "changes_requested" && selectedPr.peerComment)) && (
                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                      selectedPr.peerApproved
                        ? "bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-800/70 text-slate-800 dark:text-slate-200"
                        : "bg-amber-50/60 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-800/70 text-amber-900 dark:text-amber-200"
                    }`}
                  >
                    <span>
                      <strong className="text-slate-900 dark:text-white">
                        {selectedPr.peerReviewer || "Reviewer"}:
                      </strong>{" "}
                      {selectedPr.peerComment || "Đã ghi nhận đánh giá."}
                    </span>
                    {selectedPr.peerApproved ? (
                      <CheckCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <MessageSquareWarning size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    )}
                  </div>
                )}

                {/* Role-based Review Form */}
                {isAdmin ? (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span>Chế độ Kiểm toán Admin — Chỉ xem nhật ký và kiểm tra tuân thủ nhánh PR.</span>
                    {onOpenDefenseRoom && (
                      <button
                        onClick={onOpenDefenseRoom}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Mở Phòng Bảo vệ AI →
                      </button>
                    )}
                  </div>
                ) : (
                  (!selectedPr.peerApproved || isInstructor) && (
                    <div className="space-y-2.5">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {isStudent && (
                          <div className="sm:w-52 shrink-0">
                            <select
                              value={selectedReviewer}
                              onChange={(e) => setSelectedReviewer(e.target.value)}
                              disabled={isFrozen || actionLoading !== null || eligibleReviewers.length === 0}
                              aria-label="Chọn thành viên Peer Reviewer"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-medium cursor-pointer disabled:opacity-50"
                            >
                              {eligibleReviewers.length === 0 ? (
                                <option value="">Chưa có teammate khác</option>
                              ) : (
                                eligibleReviewers.map((m) => (
                                  <option key={m.name} value={m.name}>
                                    Reviewer: {m.name}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>
                        )}
                        <input
                          type="text"
                          value={peerComment}
                          onChange={(e) => setPeerComment(e.target.value)}
                          disabled={isFrozen && isStudent}
                          placeholder={
                            isInstructor
                              ? "Nhập nhận xét thẩm định của Giảng viên..."
                              : "Nhập nhận xét Peer Review..."
                          }
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {onRequestChanges && (
                          <button
                            onClick={handleRequestChangesClick}
                            disabled={
                              actionLoading !== null ||
                              (isStudent && (isFrozen || !selectedReviewer))
                            }
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/80 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <MessageSquareWarning size={14} />
                            <span>
                              {actionLoading === "request-changes"
                                ? "Đang gửi..."
                                : "Yêu cầu sửa lại"}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={handleApproveClick}
                          disabled={
                            actionLoading !== null ||
                            (isStudent && (isFrozen || !selectedReviewer)) ||
                            unresolvedCritical
                          }
                          title={
                            unresolvedCritical
                              ? "Cần xử lý lỗi AST Critical trước khi Approve"
                              : isInstructor
                              ? "Giảng viên ký duyệt DoD cho Pull Request"
                              : "Ký xác nhận Peer Review bởi thành viên khác trong nhóm"
                          }
                          className="btn-marlo-secondary btn--secondary flex items-center justify-center gap-1.5 text-xs py-1.5 px-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <UserCheck size={14} className="text-purple-600 dark:text-purple-400" />
                          <span>
                            {actionLoading === "peer-approve"
                              ? "Đang duyệt..."
                              : isInstructor
                              ? "Giảng viên Phê duyệt DoD"
                              : "Peer Approve"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                )}

                {/* Merge Strategy & Merge CTA (Student Only) */}
                {isStudent && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        Chiến lược Merge:
                      </span>
                      <select
                        value={mergeStrategy}
                        onChange={(e) => setMergeStrategy(e.target.value as any)}
                        disabled={isFrozen || actionLoading !== null}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-100"
                      >
                        <option value="squash">Squash and Merge (Khuyên dùng)</option>
                        <option value="rebase">Rebase and Merge</option>
                        <option value="merge">Merge Commit (--no-ff)</option>
                      </select>
                    </div>
                    <button
                      onClick={() => onMerge(selectedPr.id, mergeStrategy)}
                      disabled={
                        actionLoading !== null ||
                        isFrozen ||
                        unresolvedCritical ||
                        !selectedPr.peerApproved
                      }
                      title={mergeBlockedReason || "Thực hiện Merge và nhận +30 XP"}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition ${
                        !isFrozen && !unresolvedCritical && selectedPr.peerApproved
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <GitMerge size={14} />
                      <span>{mergeButtonLabel}</span>
                    </button>
                  </div>
                )}

                {/* Quick Instructor Link to AI Defense Room */}
                {isInstructor && onOpenDefenseRoom && (
                  <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={onOpenDefenseRoom}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Chuyển sang Phòng Bảo vệ & Chấm Kép AI →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Diff Hunks + Defense Questions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Code2 size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>Mã nguồn Diff nổi bật</span>
                </div>
                <div className="rounded-xl bg-slate-950 p-3 font-mono text-[11px] space-y-1.5 overflow-x-auto border border-slate-800">
                  {(selectedPr.diffPreview || []).map((d: any, i: number) => (
                    <div
                      key={i}
                      className={
                        d?.type === "removed"
                          ? "text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded"
                          : "text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded"
                      }
                    >
                      <span className="text-slate-500 mr-2">
                        {d?.file || "src/App.tsx"}:{d?.line ?? i + 1}
                      </span>
                      <span>{d?.code || d?.diff || "+ Updated hunk"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-purple-600 dark:text-purple-400" />
                  <span>Câu hỏi Vấn đáp Hội đồng AI (tự sinh từ PR)</span>
                </div>
                <div className="space-y-2">
                  {(selectedPr.defenseQuestions || []).map((q: any, i: number) => (
                    <div
                      key={q?.id || `${selectedPr.id}-dq-${i}`}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1 shadow-2xs"
                    >
                      <div className="font-mono text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400 flex items-center gap-1">
                        <Sparkles size={11} className="text-purple-500" />
                        {q?.persona || "Hội đồng AI"}
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 leading-snug">
                        {q?.question || "Trình bày thiết kế và kiểm thử của Pull Request này."}
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

const COMMIT_TYPES = [
  { id: "feat", label: "feat: Tính năng", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  { id: "fix", label: "fix: Sửa lỗi", color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" },
  { id: "refactor", label: "refactor: Tối ưu", color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" },
  { id: "test", label: "test: Kiểm thử", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  { id: "docs", label: "docs: Tài liệu", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
];

const SUGGESTED_PROJECT_FILES = [
  "backend/app/main.py",
  "backend/app/api/v1/git_hub.py",
  "backend/app/services/evaluator.py",
  "backend/app/core/security.py",
  "src/screens/GitProjectHub.tsx",
  "src/components/GitPrReviewPanel.tsx",
  "tests/test_api_endpoints.py",
  "docker-compose.yml",
];

const DEFAULT_GITFLOW_BRANCHES = [
  "feature/auth",
  "feature/evaluator",
  "develop",
  "release/v1.2",
  "hotfix/cve",
  "main",
];

const BRANCH_COLOR_MAP: Record<string, string> = {
  main: "#2563eb",
  develop: "#6366f1",
  "feature/auth": "#f59e0b",
  "feature/evaluator": "#10b981",
  "hotfix/cve": "#f43f5e",
  "release/v1.2": "#a855f7",
};

export function GitNewCommitModal({
  isOpen,
  onClose,
  onSubmit,
  members,
  tasks,
  existingBranches = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    branch: string;
    message: string;
    task_code?: string;
    author_name?: string;
    files_changed: string[];
    additions?: number;
    deletions?: number;
  }) => Promise<void>;
  members: GitMemberAnalytics[];
  tasks: GitProjectTaskRef[];
  existingBranches?: string[];
}) {
  const branchOptions = useMemo(() => {
    const merged = [...existingBranches, ...DEFAULT_GITFLOW_BRANCHES]
      .map((b) => (b || "").trim())
      .filter(Boolean);
    return Array.from(new Set(merged));
  }, [existingBranches]);

  const [commitType, setCommitType] = useState("feat");
  const [branch, setBranch] = useState(branchOptions[0] || "feature/auth");
  const [taskCode, setTaskCode] = useState(tasks[0]?.code || "");
  const [authorName, setAuthorName] = useState(members[0]?.name || "Nguyễn Bá Hòa");
  const [message, setMessage] = useState("");
  const [filesList, setFilesList] = useState<string[]>([
    "backend/app/api/v1/git_hub.py",
    "tests/test_git_hub.py",
  ]);
  const [newFileInput, setNewFileInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const initialCode = tasks[0]?.code || "";
    const initialTitle = tasks[0]?.title || "Tối ưu hóa xử lý bất đồng bộ & kiểm thử đơn vị";
    const preferredBranch =
      branchOptions.find((b) => b !== "main" && b !== "master") ||
      branchOptions[0] ||
      "feature/auth";
    setCommitType("feat");
    setBranch(preferredBranch);
    setTaskCode(initialCode);
    setAuthorName(members[0]?.name || "Nguyễn Bá Hòa");
    setMessage(
      initialCode
        ? `feat(#${initialCode}): ${initialTitle}`
        : `feat: ${initialTitle}`
    );
    setFilesList(["backend/app/api/v1/git_hub.py", "tests/test_git_hub.py"]);
    setNewFileInput("");
  }, [isOpen, tasks, members, branchOptions]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTaskChange = (code: string) => {
    setTaskCode(code);
    const found = tasks.find((t) => t.code === code);
    if (!found) return;

    const titleLow = (found.title || "").toLowerCase();
    let nextBranch = branchOptions.find((b) => b === "develop") || branchOptions[0] || "develop";
    if (titleLow.includes("auth") || titleLow.includes("login") || titleLow.includes("jwt") || titleLow.includes("user")) {
      nextBranch = branchOptions.find((b) => b.toLowerCase().includes("auth") || b.toLowerCase().includes("jwt")) || "feature/auth";
    } else if (titleLow.includes("eval") || titleLow.includes("sandbox") || titleLow.includes("docker") || titleLow.includes("runner")) {
      nextBranch = branchOptions.find((b) => b.toLowerCase().includes("eval") || b.toLowerCase().includes("ci")) || "feature/evaluator";
    } else if (titleLow.includes("fix") || titleLow.includes("bug") || titleLow.includes("lỗ hổng") || titleLow.includes("cve")) {
      nextBranch = branchOptions.find((b) => b.toLowerCase().includes("fix") || b.toLowerCase().includes("hotfix")) || "hotfix/cve";
    } else if (titleLow.includes("release") || titleLow.includes("ci") || titleLow.includes("deploy")) {
      nextBranch = branchOptions.find((b) => b.toLowerCase().includes("release") || b.toLowerCase().includes("ci")) || "release/v1.2";
    }
    setBranch(nextBranch);
    setMessage(`${commitType}(#${code}): ${found.title}`);

    if (nextBranch.includes("auth") || nextBranch.includes("JWT")) {
      setFilesList(["backend/app/api/v1/auth.py", "backend/app/core/security.py"]);
    } else if (nextBranch.includes("eval")) {
      setFilesList(["backend/app/services/evaluator.py", "docker/sandbox.Dockerfile"]);
    } else if (nextBranch.includes("fix") || nextBranch.includes("hotfix")) {
      setFilesList(["backend/app/core/database.py", "tests/test_security.py"]);
    } else {
      setFilesList(["backend/app/main.py", "src/screens/GitProjectHub.tsx"]);
    }
  };

  const handleCommitTypeChange = (type: string) => {
    setCommitType(type);
    const regex = /^(feat|fix|refactor|test|docs)(\(#[^)]+\)|:|\s)/;
    if (regex.test(message)) {
      setMessage(message.replace(regex, `${type}$2`));
    } else {
      setMessage(taskCode ? `${type}(#${taskCode}): ${message}` : `${type}: ${message}`);
    }
    if (type === "fix") {
      setBranch(branchOptions.find((b) => b.includes("fix")) || "hotfix/cve");
    }
  };

  const handleAiSuggestMessage = () => {
    const curTask = tasks.find((t) => t.code === taskCode);
    const title = curTask?.title || "Tối ưu hóa kiến trúc module";
    const prefix = taskCode ? `${commitType}(#${taskCode})` : commitType;
    const suggestions = [
      `${prefix}: Hoàn thiện tiêu chuẩn DoD & 100% test cases cho ${title}`,
      `${prefix}: Chuẩn hóa xử lý ngoại lệ và luồng dữ liệu của ${title}`,
      `${prefix}: Tối ưu hóa hiệu năng và đóng gói sandbox cho ${title}`,
    ];
    setMessage(suggestions[Math.floor(Math.random() * suggestions.length)]);
  };

  const handleAddFile = (fileName: string) => {
    const clean = fileName.trim();
    if (!clean || filesList.includes(clean)) return;
    setFilesList((prev) => [...prev, clean]);
    setNewFileInput("");
  };

  const handleRemoveFile = (fileName: string) => {
    setFilesList((prev) => prev.filter((f) => f !== fileName));
  };

  const finalFiles = filesList.length > 0 ? filesList : ["backend/app/main.py"];
  const estAdditions = Math.max(15, finalFiles.length * 15);
  const estDeletions = Math.max(2, finalFiles.length * 2);

  const handleSave = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        branch,
        task_code: taskCode || undefined,
        author_name: authorName || undefined,
        message: message.trim(),
        files_changed: finalFiles,
        additions: estAdditions,
        deletions: estDeletions,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const currentBranchColor = BRANCH_COLOR_MAP[branch] || "#6366f1";
  const isPushingToMain = branch === "main" || branch === "master";

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9998] bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 marlo-scrim"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 marlo-modal"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <GitCommit size={16} strokeWidth={2.5} />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Ghi Nhận & Push Commit Mới
              </h3>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-0">
                +10 XP
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hệ thống tự động vẽ commit lên Cây phân nhánh Git và đồng bộ mã Task Kanban.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="space-y-3.5 text-xs">
          {/* 1. LIÊN KẾT TASK KANBAN */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-blue-600 dark:text-blue-400" />
                <span>Liên kết Task Kanban (Tự động điền)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-sans">Đổi task = tự động cập nhật form</span>
            </div>
            <select
              value={taskCode}
              onChange={(e) => handleTaskChange(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 cursor-pointer shadow-2xs"
            >
              {tasks.length === 0 ? (
                <option value="">Chưa có Task Kanban trong dự án</option>
              ) : (
                tasks.map((t) => (
                  <option key={t.id} value={t.code}>
                    #{t.code} — {t.title} ({formatColumnLabel(t.column)})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 2. LOẠI COMMIT */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
              Loại Commit (Chuẩn Conventional Commits)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMIT_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => handleCommitTypeChange(ct.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer border-0 outline-none ring-0 ${
                    commitType === ct.id
                      ? `${ct.color} font-bold shadow-2xs`
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. NHÁNH GIT VÀ THÀNH VIÊN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nhánh Git (Branch)
              </label>
              <div className="relative">
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <span
                  className="absolute left-2.5 top-3 w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentBranchColor }}
                />
              </div>
              {isPushingToMain && (
                <p className="mt-1 text-[10.5px] text-amber-600 dark:text-amber-400 font-medium">
                  ⚠ Khuyến nghị tạo nhánh `feature/` thay vì commit trực tiếp lên `{branch}`.
                </p>
              )}
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Thành viên thực hiện
              </label>
              <select
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                {members.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. THÔNG ĐIỆP COMMIT */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Thông điệp Commit
              </label>
              <button
                type="button"
                onClick={handleAiSuggestMessage}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:underline cursor-pointer"
              >
                <Sparkles size={12} />
                <span>AI Gợi ý thông điệp</span>
              </button>
            </div>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="feat(#TE...): Mô tả công việc đã hoàn thành"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 5. DANH SÁCH TỆP THAY ĐỔI */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
              Danh sách tệp thay đổi ({filesList.length} tệp)
            </label>
            <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
              {filesList.map((file) => (
                <span
                  key={file}
                  className="inline-flex items-center gap-1 font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                >
                  <Code2 size={11} className="text-slate-500" />
                  <span>{file}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file)}
                    className="text-slate-400 hover:text-rose-500 ml-0.5 cursor-pointer"
                    title="Xóa tệp"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              {filesList.length === 0 && (
                <span className="text-slate-400 text-xs italic">Chưa chọn tệp nào (click bên dưới để chọn nhanh)</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1 pt-1">
              <span className="text-[10px] text-slate-400 font-sans mr-1">Gợi ý tệp nhanh:</span>
              {SUGGESTED_PROJECT_FILES.slice(0, 5).map((f) => {
                const isSelected = filesList.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => (isSelected ? handleRemoveFile(f) : handleAddFile(f))}
                    className={`font-mono text-[10px] px-2 py-0.5 rounded transition cursor-pointer border-0 outline-none ring-0 ${
                      isSelected
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {f.split("/").pop()}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-1.5 pt-1">
              <input
                type="text"
                value={newFileInput}
                onChange={(e) => setNewFileInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddFile(newFileInput);
                  }
                }}
                placeholder="Gõ đường dẫn tệp khác và nhấn Enter..."
                className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px] text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => handleAddFile(newFileInput)}
                disabled={!newFileInput.trim()}
                className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40"
              >
                + Thêm
              </button>
            </div>
          </div>

          {/* 6. LIVE PREVIEW */}
          <div className="p-2.5 rounded-xl bg-slate-950 text-white border border-slate-800 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentBranchColor }} />
                <span>Xem trước Commit Node trên Graph:</span>
              </span>
              <span className="text-emerald-400 font-bold">
                +{estAdditions} / -{estDeletions} dòng ({finalFiles.length} tệp)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold text-white font-mono"
                style={{ backgroundColor: currentBranchColor }}
              >
                {branch}
              </span>
              <span className="text-slate-300 font-mono text-xs truncate flex-1">
                {message || "Chưa nhập thông điệp"}
              </span>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                bởi {authorName.split(" ").slice(-1)[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] text-slate-400">
            Nhấn <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">Esc</kbd> để hủy
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting || !message.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <GitCommit size={14} />
              <span>{submitting ? "Đang Push Commit..." : "Push Commit Lên Graph (+10 XP)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}

export function GitNewPrModal({
  isOpen,
  onClose,
  onSubmit,
  tasks,
  defaultTargetBranch = "develop",
  existingBranches = [],
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
  defaultTargetBranch?: string;
  existingBranches?: string[];
}) {
  const targetOptions = useMemo(() => {
    const merged = [defaultTargetBranch, "develop", "main", "release/v1.2"]
      .map((b) => (b || "").trim())
      .filter(Boolean);
    return Array.from(new Set(merged));
  }, [defaultTargetBranch]);

  const sourceSuggestions = useMemo(() => {
    const merged = [
      ...existingBranches.filter((b) => b !== "main" && b !== "master"),
      "feature/auth",
      "feature/evaluator",
      "fix/patch-runner",
    ].filter(Boolean);
    return Array.from(new Set(merged));
  }, [existingBranches]);

  const [taskCode, setTaskCode] = useState(tasks[0]?.code || "");
  const [title, setTitle] = useState("");
  const [sourceBranch, setSourceBranch] = useState(sourceSuggestions[0] || "feature/auth");
  const [targetBranch, setTargetBranch] = useState(defaultTargetBranch || "develop");
  const [description, setDescription] = useState(
    "Chuẩn hóa kiến trúc 3 tầng Router -> Service -> DB, bổ sung test coverage."
  );
  const [codeSnippet, setCodeSnippet] = useState(
    "def verify_rbac_guard(user):\n    return user.role in ('student', 'instructor')"
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const picked = tasks[2] || tasks[0];
    const code = picked?.code || "";
    const shortTitle = picked?.title || "Hoàn thiện kiểm thử tích hợp";
    const defTarget = defaultTargetBranch || "develop";
    const defSource =
      sourceSuggestions.find((b) => b !== defTarget) || "feature/auth";

    setTaskCode(code);
    setTitle(code ? `feat(#${code}): ${shortTitle}` : `feat(module): ${shortTitle}`);
    setTargetBranch(defTarget);
    setSourceBranch(defSource);
  }, [isOpen, tasks, defaultTargetBranch, sourceSuggestions]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrTaskChange = (code: string) => {
    setTaskCode(code);
    const found = tasks.find((t) => t.code === code);
    if (found) {
      setTitle(`feat(#${found.code}): ${found.title}`);
    }
  };

  const sameBranchError =
    sourceBranch.trim().toLowerCase() === targetBranch.trim().toLowerCase();

  const handleCreate = async () => {
    if (!title.trim() || sameBranchError || !sourceBranch.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        source_branch: sourceBranch.trim(),
        target_branch: targetBranch.trim(),
        task_code: taskCode || undefined,
        code_snippet: codeSnippet,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9998] bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 marlo-scrim"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 marlo-modal"
      >
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitPullRequest size={18} className="text-blue-600 dark:text-blue-400" />
              Mở Pull Request & Quét CodeMind AI AST
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hệ thống tự động quét lỗ hổng bảo mật (shell=True, SQLi) và sinh câu hỏi Vấn đáp AI.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
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
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nhánh nguồn
              </label>
              <input
                type="text"
                list="git-pr-source-branches"
                value={sourceBranch}
                onChange={(e) => setSourceBranch(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100"
              />
              <datalist id="git-pr-source-branches">
                {sourceSuggestions.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nhánh đích
              </label>
              <select
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100"
              >
                {targetOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Mã Task Kanban
              </label>
              <select
                value={taskCode}
                onChange={(e) => handlePrTaskChange(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs text-slate-900 dark:text-slate-100"
              >
                {tasks.length === 0 ? (
                  <option value="">Không gắn Task</option>
                ) : (
                  tasks.map((t) => (
                    <option key={t.id} value={t.code}>
                      #{t.code} ({formatColumnLabel(t.column)})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {sameBranchError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-medium">
              Nhánh nguồn (`{sourceBranch}`) và nhánh đích (`{targetBranch}`) không được trùng nhau.
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Mô tả thay đổi
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
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

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] text-slate-400">
            Nhấn <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">Esc</kbd> để hủy
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting || !title.trim() || !sourceBranch.trim() || sameBranchError}
              className="btn-marlo-primary btn--primary flex items-center gap-1.5 text-xs px-4 py-1.5 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck size={14} />
              <span>{submitting ? "Đang chạy AI AST..." : "Mở PR & Quét AST"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
