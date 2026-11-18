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
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs flex items-start gap-2.5">
                <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-700 dark:text-rose-400">Rào chắn Quy trình 2-Tier Review</div>
                  <div className="mt-0.5 text-slate-600 dark:text-slate-300">{actionError}</div>
                </div>
              </div>
            )}

            {/* SHA-256 DoD Seal Banner if Merged */}
            {isMerged && (
              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-sm">
                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Đã Squash Merge & Đóng Dấu Nghiệm Thu SHA-256 DoD</span>
                  </div>
                  <span className="pill pill--plain font-mono text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    +30 XP AWARDED
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all bg-white dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  SHA-256 DoD Seal: {selectedPr.dodSha256}
                </div>
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
                    className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1.5"
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
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>
                      <strong className="text-slate-900 dark:text-white">{selectedPr.peerReviewer}:</strong> {selectedPr.peerComment}
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
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1 shadow-2xs"
                    >
                      <div className="font-mono text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400 flex items-center gap-1">
                        <Sparkles size={11} className="text-purple-500" />
                        {q.persona}
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 leading-snug">
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

const BRANCH_COLOR_MAP: Record<string, string> = {
  "main": "#2563eb",
  "develop": "#6366f1",
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
  const [commitType, setCommitType] = useState("feat");
  const [branch, setBranch] = useState("feature/auth");
  const [taskCode, setTaskCode] = useState(tasks[0]?.code || "TE35D77");
  const [authorName, setAuthorName] = useState(members[0]?.name || "Nguyễn Bá Hòa");
  const [message, setMessage] = useState(
    `feat(#${tasks[0]?.code || "TE35D77"}): Tối ưu hóa xử lý bất đồng bộ & kiểm thử đơn vị`
  );
  const [filesList, setFilesList] = useState<string[]>([
    "backend/app/api/v1/git_hub.py",
    "tests/test_git_hub.py",
  ]);
  const [newFileInput, setNewFileInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Tự động nhận diện và điền form khi chọn Task Kanban
  const handleTaskChange = (code: string) => {
    setTaskCode(code);
    const found = tasks.find((t) => t.code === code);
    if (!found) return;

    // 1. Tự động đề xuất nhánh thông minh
    const titleLow = (found.title || "").toLowerCase();
    let nextBranch = "develop";
    if (titleLow.includes("auth") || titleLow.includes("login") || titleLow.includes("jwt") || titleLow.includes("user")) {
      nextBranch = "feature/auth";
    } else if (titleLow.includes("eval") || titleLow.includes("sandbox") || titleLow.includes("docker") || titleLow.includes("runner")) {
      nextBranch = "feature/evaluator";
    } else if (titleLow.includes("fix") || titleLow.includes("bug") || titleLow.includes("lỗ hổng") || titleLow.includes("cve")) {
      nextBranch = "hotfix/cve";
    } else if (titleLow.includes("release") || titleLow.includes("ci") || titleLow.includes("deploy")) {
      nextBranch = "release/v1.2";
    }
    setBranch(nextBranch);

    // 2. Tự động sinh message
    setMessage(`${commitType}(#${code}): ${found.title}`);

    // 3. Tự động đề xuất tệp phù hợp
    if (nextBranch === "feature/auth") {
      setFilesList(["backend/app/api/v1/auth.py", "backend/app/core/security.py"]);
    } else if (nextBranch === "feature/evaluator") {
      setFilesList(["backend/app/services/evaluator.py", "docker/sandbox.Dockerfile"]);
    } else if (nextBranch === "hotfix/cve") {
      setFilesList(["backend/app/core/database.py", "tests/test_security.py"]);
    } else {
      setFilesList(["backend/app/main.py", "src/screens/GitProjectHub.tsx"]);
    }
  };

  // Đổi loại commit (feat, fix, refactor...)
  const handleCommitTypeChange = (type: string) => {
    setCommitType(type);
    const regex = /^(feat|fix|refactor|test|docs)(\(#[^)]+\)|:|\s)/;
    if (regex.test(message)) {
      setMessage(message.replace(regex, `${type}$2`));
    } else {
      setMessage(`${type}(#${taskCode}): ${message}`);
    }
    if (type === "fix") {
      setBranch("hotfix/cve");
    }
  };

  // AI Gợi ý nội dung Commit Message chuẩn kỹ nghệ
  const handleAiSuggestMessage = () => {
    const curTask = tasks.find((t) => t.code === taskCode);
    const title = curTask?.title || "Tối ưu hóa kiến trúc module";
    const suggestions = [
      `${commitType}(#${taskCode}): Hoàn thiện tiêu chuẩn DoD & 100% test cases cho ${title}`,
      `${commitType}(#${taskCode}): Chuẩn hóa xử lý ngoại lệ và luồng dữ liệu của ${title}`,
      `${commitType}(#${taskCode}): Tối ưu hóa hiệu năng và đóng gói sandbox cho ${title}`,
    ];
    setMessage(suggestions[Math.floor(Math.random() * suggestions.length)]);
  };

  // Thêm tệp vào danh sách
  const handleAddFile = (fileName: string) => {
    const clean = fileName.trim();
    if (!clean || filesList.includes(clean)) return;
    setFilesList((prev) => [...prev, clean]);
    setNewFileInput("");
  };

  // Xóa tệp khỏi danh sách
  const handleRemoveFile = (fileName: string) => {
    setFilesList((prev) => prev.filter((f) => f !== fileName));
  };

  const handleSave = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        branch,
        task_code: taskCode || undefined,
        author_name: authorName || undefined,
        message: message.trim(),
        files_changed: filesList.length > 0 ? filesList : ["backend/app/main.py"],
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const currentBranchColor = BRANCH_COLOR_MAP[branch] || "#6366f1";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 marlo-scrim"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 space-y-4 marlo-modal"
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
          {/* 1. LIÊN KẾT TASK KANBAN (TRUNG TÂM TỰ ĐỘNG HÓA) */}
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
              {tasks.map((t) => (
                <option key={t.id} value={t.code}>
                  #{t.code} — {t.title} ({t.column})
                </option>
              ))}
            </select>
          </div>

          {/* 2. CHỌN NHANH LOẠI COMMIT (CONVENTIONAL COMMITS) */}
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
                      ? `${ct.color} font-bold shadow-2xs scale-102`
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. NHÁNH GIT VÀ THÀNH VIÊN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nhánh Git (Branch)
              </label>
              <div className="relative">
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs cursor-pointer"
                >
                  <option value="feature/auth">feature/auth (Cam)</option>
                  <option value="feature/evaluator">feature/evaluator (Lục)</option>
                  <option value="develop">develop (Chàm)</option>
                  <option value="release/v1.2">release/v1.2 (Tím)</option>
                  <option value="hotfix/cve">hotfix/cve (Đỏ)</option>
                  <option value="main">main (Lam)</option>
                </select>
                <span
                  className="absolute left-2.5 top-3 w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentBranchColor }}
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Thành viên thực hiện
              </label>
              <select
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer"
              >
                {members.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. THÔNG ĐIỆP COMMIT + NÚT AI GỢI Ý */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Thông điệp Commit
              </label>
              <button
                type="button"
                onClick={handleAiSuggestMessage}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:underline cursor-pointer"
                title="AI tự động tạo thông điệp chuẩn chỉ theo task"
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
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 5. DANH SÁCH TỆP THAY ĐỔI (CHỌN QUA TAGS THAY VÌ GÕ TAY) */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block">
              Danh sách tệp thay đổi ({filesList.length} tệp)
            </label>

            {/* Các tệp đã chọn */}
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

            {/* Click chọn nhanh tệp dự án mẫu */}
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
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {f.split("/").pop()}
                  </button>
                );
              })}
            </div>

            {/* Ô nhập thêm file tùy biến */}
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
                className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px]"
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

          {/* 6. XEM TRƯỚC COMMIT NODE TRÊN GRAPH (LIVE PREVIEW) */}
          <div className="p-2.5 rounded-xl bg-slate-950 text-white border border-slate-800 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: currentBranchColor }} />
                <span>Xem trước Commit Node trên Graph:</span>
              </span>
              <span className="text-emerald-400 font-bold">+{filesList.length * 15} / -2 dòng ({filesList.length} tệp)</span>
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
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-xs transition active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <GitCommit size={14} />
              <span>{submitting ? "Đang Push Commit..." : "Push Commit Lên Graph (+10 XP)"}</span>
            </button>
          </div>
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
