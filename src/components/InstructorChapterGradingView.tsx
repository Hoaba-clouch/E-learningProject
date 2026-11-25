import React, { useState, useEffect, useCallback } from "react";
import MarloSelect from "./MarloSelect";
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
  { id: "oop", label: "CS201 • Lập trình Hướng đối tượng & CTDL" },
  { id: "dsa", label: "CS202 • Giải thuật Nâng cao & CTDL Phức hợp" },
  { id: "network", label: "CS205 • Kiến trúc Máy tính, HĐH & Mạng" },
  { id: "frontend", label: "CS210 • Lập trình Web Frontend (React 19 & TS)" },
  { id: "realtime", label: "CS215 • Trạng thái, WebSockets & Web Vitals" },
  { id: "web", label: "CS304 • Phát triển Web Hiện đại & REST API" },
  { id: "mobile", label: "CS306 • Ứng dụng Di động (Flutter & Dart)" },
  { id: "system-design", label: "CS308 • Phân tích Thiết kế Hệ thống & CSDL" },
  { id: "security", label: "CS312 • An toàn Thông tin & OWASP Top 10" },
  { id: "distributed", label: "CS315 • Hệ thống Phân tán, Kafka & Redis" },
  { id: "scrum", label: "CS401 • Quản lý Dự án & Agile Scrum" },
  { id: "devops", label: "CS405 • DevOps, Docker & CI/CD Pipeline" },
  { id: "ai-ml", label: "CS410 • Trí tuệ Nhân tạo & Machine Learning" },
  { id: "cloud", label: "CS415 • Điện toán Đám mây & AWS Microservices" },
  { id: "ai-agent", label: "CS420 • AI-Native Web App, RAG & Agents" },
  { id: "capstone", label: "CS499 • Đồ án Tốt nghiệp Kỹ sư Enterprise" },
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

  // Filters (mặc định "" để thấy tất cả, hoặc đồng bộ khi defaultSubjectId đổi theo Header)
  const [selectedSubject, setSelectedSubject] = useState<string>(defaultSubjectId);
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    setSelectedSubject(defaultSubjectId);
  }, [defaultSubjectId]);

  const courseOptionsList =
    classes.length > 0
      ? [
          { id: "", label: `Tất cả ${classes.length} Lớp học phần` },
          ...classes.map((c) => ({
            id: c.id || c.subjectId || "",
            label: `${(c as any).sectionCode || c.code || ""} • ${c.name}`.trim(),
          })),
        ]
      : COURSE_OPTIONS;

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
      const matchedClass = classes.find((c) => c.id === selectedSubject);
      const res = await fetchInstructorChapterSubmissions(
        matchedClass ? matchedClass.subjectId : selectedSubject || undefined,
        chapterNum,
        selectedStatus,
        matchedClass ? matchedClass.id : undefined
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

  // activeSub phải lấy từ filteredList để tránh hiển thị nhầm bài khác khi search trả 0 kết quả
  const activeSub =
    filteredList.find((s) => s.id === activeSubId) || filteredList[0] || null;
  const officialGrades = submissions
    .filter((submission) => submission.status === "graded" && typeof submission.instructorGrade === "number" && Number.isFinite(submission.instructorGrade))
    .map((submission) => submission.instructorGrade as number);
  const officialAverage = officialGrades.length > 0
    ? officialGrades.reduce((sum, grade) => sum + grade, 0) / officialGrades.length : null;

  // Sync grading input with active submission
  useEffect(() => {
    if (activeSub) {
      const initialScore = activeSub.instructorGrade ?? (activeSub.metricsVerified === true ? activeSub.score : undefined);
      setGradeInput(initialScore !== null && initialScore !== undefined ? String(initialScore) : "");
      setFeedbackInput(activeSub.instructorFeedback || "");
    }
  }, [activeSubId, activeSub]);

  const handleAction = async (action: "approve" | "override" | "request_revision") => {
    if (!activeSub) return;
    if (action === "approve" && activeSub.metricsVerified !== true) {
      onNotify?.("Chưa có điểm tự động đã xác minh. Hãy nhập điểm thẩm định của giảng viên.");
      return;
    }
    if (action === "request_revision" && !feedbackInput.trim()) {
      onNotify?.("⚠️ Vui lòng nhập lời phê / hướng dẫn sửa lỗi trước khi gửi yêu cầu nộp lại.");
      return;
    }
    const parsedGrade = Number(gradeInput);
    if (action === "override" && (!gradeInput.trim() || !Number.isFinite(parsedGrade) || parsedGrade < 0 || parsedGrade > 10)) {
      onNotify?.("Vui lòng nhập điểm giảng viên từ 0 đến 10.");
      return;
    }
    setIsSubmitting(true);
    try {
      const gradeVal = action === "approve" ? activeSub.score : parsedGrade;
      const payload = {
        action,
        ...(action !== "request_revision" ? { instructor_grade: gradeVal } : {}),
        instructor_feedback: feedbackInput.trim(),
      };

      await gradeInstructorChapterSubmission(activeSub.id, payload);
      window.dispatchEvent(new CustomEvent("codemind-instructor-updated"));
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
            <span>Điểm trung bình giảng viên</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles size={14} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
            {officialAverage !== null ? officialAverage.toFixed(1) : "—"} <span className="text-xs text-slate-400 font-normal">/ 10</span>
          </div>
          <span className="text-[11px] text-slate-400">Chỉ các điểm đã được giảng viên công nhận</span>
        </div>
      </div>

      {/* ── THANH CÔNG CỤ LỌC & TÌM KIẾM ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Lọc Môn học */}
          <MarloSelect
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
          >
            {courseOptionsList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </MarloSelect>

          {/* Lọc Chương */}
          <MarloSelect
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
          >
            <option value="">Tất cả các chương</option>
            <option value="1">Chương 1</option>
            <option value="2">Chương 2</option>
            <option value="3">Chương 3</option>
            <option value="4">Chương 4</option>
            <option value="5">Chương 5</option>
          </MarloSelect>

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
              Kho mã nguồn • Thẩm định giảng viên
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
                    <th className="px-3 py-2.5 text-right">Điểm tự động / GV</th>
                    <th className="px-3 py-2.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredList.map((sub) => {
                    const isSelected = activeSub?.id === sub.id;
                    return (
                      <tr
                        key={sub.id}
                        onClick={() => setActiveSubId(sub.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-slate-100/90 dark:bg-slate-800/90 border-l-4 border-slate-900 dark:border-white"
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
                              className="px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {sub.metricsVerified === true ? `${sub.testsPassed}/${sub.testsTotal}` : "Chưa xác minh"}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {sub.metricsVerified === true ? `${sub.executionTimeMs}ms` : ""}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-right">
                          <div className="font-mono font-bold text-xs">
                            <span className="text-slate-600 dark:text-slate-300 font-bold">{sub.metricsVerified === true ? sub.score.toFixed(1) : "—"}</span>
                            <span className="text-slate-400 dark:text-slate-500 mx-1">/</span>
                            <span className={sub.instructorGrade !== null && sub.instructorGrade !== undefined ? "text-slate-900 dark:text-white font-extrabold" : "text-slate-400 font-normal"}>
                              {sub.instructorGrade !== null && sub.instructorGrade !== undefined ? sub.instructorGrade.toFixed(1) : "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === "graded"
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                : sub.status === "revision_requested"
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold"
                                : sub.status === "flagged"
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold"
                            }`}
                          >
                            {sub.status === "graded"
                              ? "Đã chấm"
                              : sub.status === "revision_requested"
                              ? "Sửa lại"
                              : sub.status === "flagged"
                              ? "Cảnh báo"
                              : "Chờ duyệt"}
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

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                <p><strong>Xác thực nguồn:</strong> {activeSub.evidence?.verification || "Bài nộp cũ chưa có chứng cứ xác thực nguồn."}</p>
                <p className="font-mono break-all"><strong>Commit đã ghi nhận:</strong> {activeSub.evidence?.commit_sha || "Chưa có SHA được xác minh"}</p>
                {activeSub.metricsVerified !== true && <p>Chưa có kết quả test, đo tài nguyên hay đối chiếu đạo văn đã xác minh. Điểm cũ do mô phỏng không được dùng để phê duyệt.</p>}
              </div>

              {/* Kết quả Docker Sandbox & Chống đạo văn */}
              {activeSub.metricsVerified === true && <div className="grid grid-cols-2 gap-2 text-center">
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
              </div>}

              {/* Gợi ý đánh giá của AI */}
              {activeSub.metricsVerified === true && activeSub.aiFeedback && (
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
                      placeholder="Chưa có"
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
                <div className={`grid ${activeSub.metricsVerified === true ? "grid-cols-3" : "grid-cols-2"} gap-2 pt-1`}>
                  {activeSub.metricsVerified === true && <button
                    type="button"
                    onClick={() => handleAction("approve")}
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Check size={14} />
                    <span>Duyệt điểm đã xác minh</span>
                  </button>}

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
