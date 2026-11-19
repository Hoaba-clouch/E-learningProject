import React, { useState, useEffect, useCallback } from "react";
import {
  Code2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Search,
  Check,
  X,
  Sparkles,
  Terminal,
  ShieldCheck,
  Clock,
  RotateCcw,
  BookOpen,
  ChevronDown,
  UserCheck,
} from "lucide-react";
import {
  fetchInstructorChapterSubmissions,
  gradeInstructorChapterSubmission,
  type ChapterSubmissionItem,
} from "../api";

interface InstructorChapterGradingViewProps {
  onNotify?: (msg: string) => void;
  classes?: Array<{ id: string; subjectId?: string; code?: string; name: string }>;
  defaultSubjectId?: string;
}

const COURSE_OPTIONS = [
  { id: "", label: "Tất cả 16 Môn học" },
  { id: "oop", label: "CS201 • Lập trình Hướng đối tượng C++20" },
  { id: "dsa", label: "CS202 • Cấu trúc Dữ liệu & Giải thuật" },
  { id: "network", label: "CS301 • Lập trình Mạng & Phân tán" },
  { id: "os", label: "CS304 • Hệ điều hành & Linux Kernel" },
  { id: "web", label: "CS305 • Kỹ thuật Web Fullstack & RESTful API" },
  { id: "ai-ml", label: "CS402 • Trí tuệ Nhân tạo & Học máy" },
  { id: "security", label: "CS405 • An toàn Thông tin & Mật mã" },
  { id: "capstone", label: "CS499 • Đồ án Khóa luận Tốt nghiệp" },
];

const STATUS_FILTERS = [
  { id: "all", label: "Tất cả bài nộp" },
  { id: "pending", label: "Chờ phê duyệt" },
  { id: "graded", label: "Đã chấm điểm" },
  { id: "revision_requested", label: "Yêu cầu sửa lại" },
  { id: "flagged", label: "Cảnh báo kiểm thử" },
];

export function InstructorChapterGradingView({
  onNotify,
  classes = [],
  defaultSubjectId = "",
}: InstructorChapterGradingViewProps) {
  const [submissions, setSubmissions] = useState<ChapterSubmissionItem[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    pendingCount: 0,
    gradedCount: 0,
    flaggedCount: 0,
    avgScore: 0,
  });
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState<string>(defaultSubjectId);
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Selected for Detail / Action
  const [activeSubId, setActiveSubId] = useState<string | null>(null);

  // Grading Form State
  const [gradeInput, setGradeInput] = useState<string>("");
  const [feedbackInput, setFeedbackInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const chapterNum = selectedChapter ? parseInt(selectedChapter, 10) : undefined;
      const res = await fetchInstructorChapterSubmissions(
        selectedSubject || undefined,
        chapterNum,
        selectedStatus
      );
      setSubmissions(res.submissions || []);
      setSummary(res.summary || {
        total: 0,
        pendingCount: 0,
        gradedCount: 0,
        flaggedCount: 0,
        avgScore: 0,
      });
      if (res.submissions?.length > 0) {
        setActiveSubId((prev) => {
          const exists = res.submissions.some((s) => s.id === prev);
          return exists ? prev : res.submissions[0].id;
        });
      } else {
        setActiveSubId(null);
      }
    } catch {
      onNotify?.("Không thể tải danh sách bài tập chương.");
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, selectedChapter, selectedStatus, onNotify]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeSub = submissions.find((s) => s.id === activeSubId) || submissions[0] || null;

  // Sync grading input with active submission
  useEffect(() => {
    if (activeSub) {
      const initialScore = activeSub.instructorGrade ?? activeSub.score;
      setGradeInput(initialScore !== null && initialScore !== undefined ? String(initialScore) : "9.0");
      setFeedbackInput(activeSub.instructorFeedback || "");
    }
  }, [activeSubId, activeSub]);

  // Filtered submissions by search query
  const filteredList = submissions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.studentCode.toLowerCase().includes(q) ||
      s.exerciseTitle.toLowerCase().includes(q) ||
      s.repoUrl.toLowerCase().includes(q)
    );
  });

  const handleAction = async (action: "approve" | "override" | "request_revision") => {
    if (!activeSub) return;
    setIsSubmitting(true);
    try {
      const parsedGrade = parseFloat(gradeInput);
      const gradeVal = isNaN(parsedGrade) ? activeSub.score : Math.max(0, Math.min(10, parsedGrade));
      const payload = {
        action,
        instructor_grade: action === "approve" ? activeSub.score : gradeVal,
        instructor_feedback: feedbackInput.trim() || (action === "approve" ? "Đã phê duyệt nghiệm thu theo kết quả Docker Sandbox." : ""),
      };

      await gradeInstructorChapterSubmission(activeSub.id, payload);
      onNotify?.(
        action === "approve"
          ? `✓ Đã phê duyệt bài tập của ${activeSub.studentName} (${activeSub.score}/10)!`
          : action === "override"
          ? `✓ Đã ghi đè điểm chính thức: ${gradeVal}/10 cho ${activeSub.studentName}!`
          : `✓ Đã gửi yêu cầu nộp lại bài tập tới học viên ${activeSub.studentName}!`
      );
      await loadData();
    } catch (err: any) {
      onNotify?.(err.message || "Thao tác chấm điểm thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 4 STAT CARDS TỔNG QUAN ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Tổng bài nộp</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Code2 size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {summary.total}
          </div>
          <span className="text-[11px] text-slate-400">16 môn học liên khóa</span>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-medium">
            <span>Chờ phê duyệt</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {summary.pendingCount}
          </div>
          <span className="text-[11px] text-slate-400">Cần thẩm định điểm</span>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Đã hoàn tất chấm</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {summary.gradedCount}
          </div>
          <span className="text-[11px] text-slate-400">Đã cập nhật học bạ</span>
        </div>

        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-medium">
            <span>Điểm trung bình AI</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {summary.avgScore.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 10</span>
          </div>
          <span className="text-[11px] text-slate-400">Chấm qua Docker Sandbox</span>
        </div>
      </div>

      {/* ── THANH CÔNG CỤ LỌC & TÌM KIẾM ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Lọc Môn học */}
          <div className="relative">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              {COURSE_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Lọc Chương */}
          <div className="relative">
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
            >
              <option value="">Tất cả các chương</option>
              <option value="1">Chương 1</option>
              <option value="2">Chương 2</option>
              <option value="3">Chương 3</option>
              <option value="4">Chương 4</option>
              <option value="5">Chương 5</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Lọc Trạng thái */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedStatus(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedStatus === f.id
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative min-w-[220px]">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên SV, MSSV, bài tập..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      {/* ── BẢNG MASTER - DETAIL WORKSPACE ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* CỘT TRÁI (7 COLS): DANH SÁCH BÀI NỘP CỦA HỌC VIÊN */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Danh sách Bài tập Chương ({filteredList.length})
              </span>
              {loading && <RefreshCw size={13} className="animate-spin text-emerald-500" />}
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Docker Sandbox Runner • Valgrind Leak Check
            </span>
          </div>

          <div className="overflow-x-auto">
            {filteredList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Không tìm thấy bài nộp nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-100 dark:border-slate-800 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3.5 py-2.5">Học viên</th>
                    <th className="px-3 py-2.5">Chương / Đề bài</th>
                    <th className="px-3 py-2.5">Test Sandbox</th>
                    <th className="px-3 py-2.5 text-right">Điểm AI / GV</th>
                    <th className="px-3 py-2.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredList.map((sub) => {
                    const isSelected = activeSub?.id === sub.id;
                    const isPassAll = sub.testsPassed === sub.testsTotal;
                    return (
                      <tr
                        key={sub.id}
                        onClick={() => setActiveSubId(sub.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-emerald-50/90 dark:bg-slate-800/90 border-l-4 border-emerald-500"
                            : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white dark:bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                              {sub.studentName.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {sub.studentName}
                              </p>
                              <p className="text-[10px] font-mono text-slate-400">
                                {sub.studentCode}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                            Ch.{sub.chapterNumber}: {sub.exerciseTitle}
                          </p>
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                            {sub.subjectId}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold ${
                                isPassAll
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                  : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                              }`}
                            >
                              {sub.testsPassed}/{sub.testsTotal}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {sub.executionTimeMs}ms
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-right">
                          <div className="font-mono font-bold text-xs">
                            <span className="text-slate-600 dark:text-slate-300 font-bold">{sub.score.toFixed(1)}</span>
                            <span className="text-slate-400 dark:text-slate-500 mx-1">/</span>
                            <span className={sub.instructorGrade !== null && sub.instructorGrade !== undefined ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-amber-500 font-normal"}>
                              {sub.instructorGrade !== null && sub.instructorGrade !== undefined ? sub.instructorGrade.toFixed(1) : "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === "graded"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : sub.status === "revision_requested"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                : sub.status === "flagged"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                            }`}
                          >
                            {sub.status === "graded"
                              ? "✓ Đã chấm"
                              : sub.status === "revision_requested"
                              ? "↺ Sửa lại"
                              : sub.status === "flagged"
                              ? "⚠ Cảnh báo"
                              : "● Chờ duyệt"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (5 COLS): CHI TIẾT BÀI NỘP & BẢNG THẨM ĐỊNH CỦA GIẢNG VIÊN */}
        <div className="lg:col-span-5 space-y-4">
          {activeSub ? (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 shadow-xs space-y-4">
              {/* Header bài nộp */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{activeSub.studentName}</span>
                    <span className="text-xs font-mono font-normal text-slate-400">
                      ({activeSub.studentCode})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Môn {activeSub.subjectId.toUpperCase()} • Chương {activeSub.chapterNumber}: {activeSub.exerciseTitle}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {activeSub.submittedAt}
                </span>
              </div>

              {/* GitHub Repo Link */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Kho lưu trữ mã nguồn nộp bài:
                  </span>
                  <a
                    href={activeSub.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-[11px]"
                  >
                    <span>Mở GitHub</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
                <p className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all select-all">
                  {activeSub.repoUrl}
                </p>
                {activeSub.studentNote && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    "{activeSub.studentNote}"
                  </p>
                )}
              </div>

              {/* Kết quả Docker Sandbox & Chống đạo văn */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Test Sandbox</span>
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {activeSub.testsPassed}/{activeSub.testsTotal}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Thời gian chạy</span>
                  <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                    {activeSub.executionTimeMs}ms
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Code Integrity</span>
                  <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                    {activeSub.antiPlagiarismScore.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Gợi ý đánh giá của AI */}
              {activeSub.aiFeedback && (
                <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                    <Sparkles size={13} />
                    <span>Nhận xét tự động từ Docker Sandbox:</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    {activeSub.aiFeedback.strengths}
                  </p>
                  {activeSub.aiFeedback.improvements && (
                    <p className="text-slate-500 dark:text-slate-400 text-[10.5px]">
                      💡 Lưu ý: {activeSub.aiFeedback.improvements}
                    </p>
                  )}
                </div>
              )}

              {/* ── FORM CHẤM ĐIỂM & PHÊ DUYỆT CỦA GIẢNG VIÊN ───────────────── */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UserCheck size={14} className="text-emerald-500" />
                    <span>Điểm Giảng viên công nhận (thang 10):</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      className="w-18 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-right font-mono font-bold text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-400">/ 10</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Lời phê chuyên môn & Hướng dẫn sửa chữa:
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    placeholder="Nhập nhận xét kỹ thuật, lý do trừ điểm hoặc chỉ dẫn cụ thể cho học viên..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* 3 Nút Hành Động Nghiệp Vụ */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAction("approve")}
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Check size={14} />
                    <span>Duyệt điểm AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction("override")}
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <span>Lưu điểm GV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction("request_revision")}
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    <span>Báo nộp lại</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-8 text-center text-xs text-slate-400">
              Chọn một bài tập ở danh sách bên trái để tiến hành thẩm định và chấm điểm.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default InstructorChapterGradingView;
