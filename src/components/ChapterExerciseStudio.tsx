import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Link2,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Flame,
  Clock,
  BookOpen,
  AlertCircle,
  Check,
  Zap,
  RotateCcw,
} from "lucide-react";
import LiquidCardConnector from "./LiquidCardConnector";
import {
  submitStudentChapterExercise,
  type StudentChapterSubmissionDto,
} from "../api";
import type { ChapterExerciseData } from "../data/chapterExercises";
import type { Assignment } from "../data/instructorData";
import type { MentorMascot } from "../App";

const GITHUB_REPO_URL_RE = /^https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i;

interface ChapterExerciseStudioProps {
  subjectId?: string;
  exercise: ChapterExerciseData;
  dbAssignment?: Assignment | null;
  mentorMascot?: MentorMascot;
  savedSubmission?: StudentChapterSubmissionDto | null;
  onSubmissionSaved?: (submission: StudentChapterSubmissionDto, totalXp?: number) => void;
  onEarnXp?: (xp: number) => void;
  onBackToLecture?: () => void;
  onAskAiExercise?: (presetPrompt?: string) => void;
}

function formatSubmittedTime(iso?: string | null): string {
  if (!iso) return "Chưa có thời gian máy chủ";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")} - ${d.getDate().toString().padStart(2, "0")}/${(
    d.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
}

export default function ChapterExerciseStudio({
  subjectId = "oop",
  exercise,
  dbAssignment,
  mentorMascot = "mino",
  savedSubmission,
  onSubmissionSaved,
  onEarnXp,
  onBackToLecture,
  onAskAiExercise,
}: ChapterExerciseStudioProps) {
  const effectiveExerciseTitle = dbAssignment?.title?.trim() || exercise.title;
  const effectiveDescription =
    dbAssignment?.description?.trim() || exercise.problemStatement || exercise.objective;
  const effectiveXp = dbAssignment?.points ?? exercise.xp;
  const effectiveDockerImage = dbAssignment?.dockerImage?.trim() || "";
  const configuredTestCases = dbAssignment?.testCases || [];

  const [submissionLink, setSubmissionLink] = useState(savedSubmission?.repo_url || "");
  const [studentNote, setStudentNote] = useState(savedSubmission?.student_note || "");
  const [submittedLink, setSubmittedLink] = useState<string | null>(
    savedSubmission?.repo_url || null
  );
  const [submittedAt, setSubmittedAt] = useState<string | null>(
    savedSubmission ? formatSubmittedTime(savedSubmission.submitted_at) : null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [gradingPhase, setGradingPhase] = useState<"idle" | "grading" | "graded">(
    savedSubmission ? "graded" : "idle"
  );
  const [receipt, setReceipt] = useState<StudentChapterSubmissionDto | null>(savedSubmission || null);
  const submissionScope = `${subjectId}:${dbAssignment?.id || exercise.id}`;
  const activeSubmissionScope = useRef(submissionScope);
  activeSubmissionScope.current = submissionScope;

  useEffect(() => {
    setSubmitError(null);
    setIsEditing(false);
    if (savedSubmission) {
      setSubmittedLink(savedSubmission.repo_url);
      setSubmissionLink(savedSubmission.repo_url);
      setStudentNote(savedSubmission.student_note || "");
      setSubmittedAt(formatSubmittedTime(savedSubmission.submitted_at));
      setGradingPhase("graded");
      setReceipt(savedSubmission);
    } else {
      setSubmittedLink(null);
      setSubmissionLink("");
      setStudentNote("");
      setSubmittedAt(null);
      setGradingPhase("idle");
      setReceipt(null);
    }
  }, [exercise.id, savedSubmission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLink = submissionLink.trim();
    if (!cleanLink || gradingPhase === "grading") return;
    if (!GITHUB_REPO_URL_RE.test(cleanLink)) {
      setSubmitError("Vui lòng nhập đường dẫn GitHub Repository hợp lệ (ví dụ: https://github.com/owner/repo).");
      return;
    }
    setSubmitError(null);
    setGradingPhase("grading");
    try {
      const res = await submitStudentChapterExercise({
        subject_id: subjectId,
        chapter_number: exercise.chapterNumber,
        exercise_id: dbAssignment?.id || exercise.id,
        exercise_title: effectiveExerciseTitle,
        repo_url: cleanLink,
        student_note: studentNote.trim(),
        xp: effectiveXp,
      });
      if (activeSubmissionScope.current !== submissionScope) return;
      if (res.error || !res.submission) throw new Error(res.error || "Máy chủ chưa xác nhận nhận bài.");
      const saved = res.submission;
      setReceipt(saved);
      setSubmittedLink(saved.repo_url);
      setSubmittedAt(formatSubmittedTime(saved.submitted_at));
      setGradingPhase("graded");
      setIsEditing(false);
      onSubmissionSaved?.(saved, res.total_xp);
      if (!onSubmissionSaved && saved.xp_awarded > 0) onEarnXp?.(saved.xp_awarded);
    } catch (error) {
      if (activeSubmissionScope.current !== submissionScope) return;
      setGradingPhase(submittedLink ? "graded" : "idle");
      setSubmitError(error instanceof Error ? error.message : "Không thể gửi bài. Vui lòng thử lại.");
    }
  };

  const officialDisplayScore = receipt?.status === "graded" &&
    receipt.instructor_grade !== null && receipt.instructor_grade !== undefined
      ? receipt.instructor_grade : null;

  return (
    <div className="flex-1 flex flex-col font-sans select-none w-full pb-8">
      {/* ── TOP HEADER CỦA BÀI TẬP ──────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-black px-2.5 py-0.5 rounded-md bg-blue-600 text-white shadow-2xs">
                CHƯƠNG {exercise.chapterNumber}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Bài tập thực hành
              </span>
              {effectiveDockerImage && (
                <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {effectiveDockerImage}
                </span>
              )}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  exercise.difficulty === "Dễ"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400"
                    : exercise.difficulty === "Trung bình"
                    ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400"
                    : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-400"
                }`}
              >
                {exercise.difficulty}
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Clock size={12} /> Hạn nộp: Cuối tuần Sprint
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {effectiveExerciseTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {effectiveDescription}
            </p>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <Flame size={15} className="fill-amber-500 text-amber-500" />
              <span>XP theo kết quả được công nhận</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              {onAskAiExercise && (
                <button
                  type="button"
                  onClick={() =>
                    onAskAiExercise(
                      `Gợi ý giúp mình bước tiếp cận đầu tiên cho bài tập "${effectiveExerciseTitle}" nhé!`
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 transition cursor-pointer"
                >
                  <Sparkles size={12} className="text-amber-500" />
                  <span>Hỏi AI gợi ý</span>
                </button>
              )}
              {onBackToLecture && (
                <button
                  onClick={onBackToLecture}
                  className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <BookOpen size={13} />
                  <span>Xem lại lý thuyết</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🌊 DÒNG CHẤT LỎNG NỐI XUỐNG CARD YÊU CẦU */}
      <LiquidCardConnector />

      {/* ── CARD 1: ĐỀ BÀI CHI TIẾT, TEST CASES GIẢNG VIÊN & YÊU CẦU ────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText size={16} className="text-blue-600" />
          <span>Yêu cầu kỹ thuật & Docker Test Cases</span>
        </h2>

        {configuredTestCases.length > 0 && (
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
              <span>Bộ Test Cases kiểm thử tự động ({configuredTestCases.length} ca)</span>
              <span className="font-mono text-[10.5px] text-slate-400">Đồng bộ từ Giảng viên</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {configuredTestCases.map((tc, idx) => (
                <div
                  key={tc.id || idx}
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                      #{idx + 1}. {tc.title}
                    </span>
                    {tc.isEdgeCase && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[9.5px] font-bold shrink-0">
                        Edge Case
                      </span>
                    )}
                  </div>
                  {(tc.input || tc.expectedOutput) && (
                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 break-words whitespace-pre-wrap">
                      In: {tc.input || "—"} → Out: {tc.expectedOutput || "—"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {exercise.requirements.map((req, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300"
            >
              <CheckCircle2 size={15} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <span className="leading-relaxed">{req}</span>
            </div>
          ))}
        </div>

        {/* Khung hướng dẫn hình thức nộp */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
          <AlertCircle size={16} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold">Hình thức nộp bài chuẩn:</p>
            <p className="leading-relaxed">
              Vui lòng dán đường dẫn <strong>GitHub Repository</strong> công khai của bạn (định dạng <code className="font-mono">https://github.com/owner/repo</code>). Hệ thống xác thực repository, ghi nhận commit hiện tại khi xác minh được và chuyển bài để giảng viên thẩm định.
            </p>
          </div>
        </div>
      </div>

      {/* 🌊 DÒNG CHẤT LỎNG NỐI XUỐNG CARD NỘP BÀI */}
      <LiquidCardConnector />

      {/* ── CARD 2: KHU VỰC NỘP BÀI & BÁO CÁO CHẤM TỰ ĐỘNG ────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Link2 size={16} className="text-emerald-600" />
            <span>Nộp bài & Theo dõi thẩm định</span>
          </h2>

          {submittedLink && !isEditing && gradingPhase === "graded" && (
            <button
              type="button"
              onClick={() => {
                setSubmissionLink(submittedLink);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              <RotateCcw size={13} className="text-slate-500" />
              <span>Nộp lại bài</span>
            </button>
          )}
        </div>

        {/* Server-confirmed submission status */}
        {gradingPhase === "grading" && (
          <div role="status" aria-live="polite" className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
            <p className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200"><Clock size={16} className="animate-pulse" /> Đang gửi bài và chờ xác thực repository...</p>
            <p className="text-xs text-slate-500">Chờ phản hồi từ máy chủ. Chỉ thông tin xác thực được trả về mới được hiển thị.</p>
          </div>
        )}

        {submittedLink && receipt && !isEditing && gradingPhase === "graded" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><CheckCircle2 size={20} className="text-emerald-600" /> Đã tiếp nhận bài nộp</h3>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {receipt.status === "graded" ? "Giảng viên đã chấm" : receipt.status === "revision_requested" ? "Giảng viên yêu cầu sửa lại" : "Chờ giảng viên thẩm định"}
                </span>
              </div>
              <p className="text-xs text-slate-500">Nộp lúc: {submittedAt}</p>
              <a href={submittedLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"><ExternalLink size={14} className="shrink-0" />{submittedLink}</a>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2 text-xs">
                <p><strong>Xác thực nguồn:</strong> {receipt.evidence?.verification || "Bài nộp cũ chưa có chứng cứ xác thực nguồn."}</p>
                <p className="font-mono break-all"><strong>Commit đã ghi nhận:</strong> {receipt.evidence?.commit_sha || "Chưa có SHA được xác minh"}</p>
                <p className="text-slate-500 dark:text-slate-400">{receipt.metrics_verified === true ? "Có kết quả kiểm thử đã xác minh bên dưới." : "Repository đã được ghi nhận để thẩm định. Chưa có kết quả chạy test, đo bộ nhớ hoặc đối chiếu đạo văn được xác minh cho bài nộp này."}</p>
              </div>
              {officialDisplayScore !== null ? (
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">Điểm giảng viên: <span className="font-mono">{officialDisplayScore.toFixed(1)} / 10</span></p>
              ) : <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Điểm chính thức: Chưa có</p>}
            </div>
            {receipt.instructor_feedback && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Nhận xét của giảng viên</h4>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{receipt.instructor_feedback}</p>
                {receipt.graded_at && <p className="text-[11px] text-slate-400">{receipt.graded_at}{receipt.graded_by ? " · " + receipt.graded_by : ""}</p>}
              </div>
            )}
            {receipt.metrics_verified === true && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 text-xs">
                <h4 className="font-bold">Kết quả kiểm thử đã xác minh</h4>
                <p>Test: {receipt.testsPassed}/{receipt.testsTotal} · Thời gian: {receipt.executionTimeMs}ms</p>
                {receipt.rubric?.length > 0 && <div className="space-y-2">{receipt.rubric.map((item, index) => <p key={index}><strong>{item.title}: {item.score}/{item.max}</strong> · {item.note}</p>)}</div>}
              </div>
            )}
            {onAskAiExercise && (
              <button type="button" onClick={() => onAskAiExercise("Phân tích lỗi sai, test thực chạy chưa đạt và nhận xét giảng viên để đề xuất ôn lại và làm lại đo tiến bộ.")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"><Sparkles size={14} /> Ôn tập theo bằng chứng đã lưu</button>
            )}
          </div>
        )}

        {/* ── FORM NHẬP LINK NỘP BÀI (KHI CHƯA NỘP HOẶC ĐANG CHỈNH SỬA) ── */}
        {gradingPhase !== "grading" && (gradingPhase === "idle" || isEditing) && (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>Dán link GitHub Repository bài làm</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                  Xác thực nguồn & chờ giảng viên đánh giá
                </span>
              </label>

              <div className="relative">
                <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={submissionLink}
                  onChange={(e) => {
                    setSubmissionLink(e.target.value);
                    if (submitError) setSubmitError(null);
                  }}
                  placeholder={`https://github.com/owner/${subjectId}-ch${exercise.chapterNumber}-lab`}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs font-mono"
                />
              </div>

              {/* Sample Quick Links */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-slate-400">Định dạng mẫu chuẩn:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSubmissionLink(`https://github.com/Hoaba-clouch/E-learningProject`);
                    setSubmitError(null);
                  }}
                  className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
                >
                  https://github.com/Hoaba-clouch/E-learningProject
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Ghi chú thêm về giải thuật hoặc quyết định kiến trúc (nên ghi rõ trade-off)
              </label>
              <input
                type="text"
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                placeholder={`Mô tả kiến trúc & giải thuật bạn đã triển khai cho Chương ${exercise.chapterNumber}...`}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 transition shadow-2xs"
              />
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-marlo-secondary btn--secondary px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
              )}

              <button
                type="submit"
                disabled={!submissionLink.trim()}
                className="btn-marlo-primary btn--primary flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-black shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Zap size={15} className="text-[#1c1304] shrink-0" />
                <span>Gửi bài để thẩm định</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
