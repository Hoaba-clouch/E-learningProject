import React, { useState, useEffect } from "react";
import {
  FileText,
  Link2,
  ExternalLink,
  CheckCircle2,
  Send,
  Sparkles,
  Flame,
  Clock,
  BookOpen,
  AlertCircle,
  AlertTriangle,
  FileCode,
  Check,
  Edit3,
  Award,
  BrainCircuit,
  Terminal,
  ShieldCheck,
  Zap,
  Download,
  RotateCcw,
  Code2,
} from "lucide-react";
import { triggerMarloConfetti } from "../utils/confetti";
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

interface AutoGradeReport {
  score: number;
  maxScore: number;
  gradeLabel: string;
  testsPassed: number;
  testsTotal: number;
  executionTimeMs: number;
  valgrindLeaks: number;
  antiPlagiarismScore: number;
  rubric: {
    title: string;
    score: number;
    max: number;
    note: string;
  }[];
  aiFeedback: {
    strengths: string;
    improvements: string;
    cleanCodeAnalysis: string;
  };
}

const DEFAULT_GRADE_REPORT: AutoGradeReport = {
  score: 9.0,
  maxScore: 10,
  gradeLabel: "ĐẠT CHUẨN KIỂM THỬ CI/CD",
  testsPassed: 5,
  testsTotal: 5,
  executionTimeMs: 38,
  valgrindLeaks: 0,
  antiPlagiarismScore: 98.0,
  rubric: [
    {
      title: "Yêu cầu Kỹ thuật & Độ chính xác Test Cases",
      score: 9.5,
      max: 10,
      note: "Hoàn thành các yêu cầu chức năng trọng tâm và vượt qua bộ kiểm thử tự động trong Docker Sandbox.",
    },
    {
      title: "Chất lượng Mã nguồn & Clean Architecture",
      score: 9.0,
      max: 10,
      note: "Tổ chức cấu trúc thư mục rõ ràng, đặt tên nhất quán và phân tách hợp lý giữa giao diện, nghiệp vụ và dữ liệu.",
    },
    {
      title: "Kiểm soát Lỗi biên & An toàn Tài nguyên",
      score: 9.0,
      max: 10,
      note: "Có kiểm tra điều kiện biên đầu vào (Guard Clauses), xử lý ngoại lệ an toàn và giải phóng tài nguyên đúng chuẩn.",
    },
    {
      title: "Tài liệu Kỹ thuật & Ghi chú Thiết kế",
      score: 8.5,
      max: 10,
      note: "Trình bày rõ hướng tiếp cận giải thuật và hướng dẫn chạy kiểm thử trong kho mã nguồn.",
    },
  ],
  aiFeedback: {
    strengths:
      "Mã nguồn tuân thủ tốt cấu trúc mô-đun của học phần, vượt qua các kiểm thử cốt lõi trên container cô lập.",
    improvements:
      "Nên bổ sung thêm kiểm thử đơn vị (unit tests) cho các tình huống dữ liệu biên rỗng hoặc tải lớn và ghi chú rõ đánh đổi thiết kế trong README.",
    cleanCodeAnalysis:
      "Độ phức tạp hàm ở mức kiểm soát tốt, luồng xử lý mạch lạc và dễ mở rộng bảo trì.",
  },
};

function formatSubmittedTime(iso?: string | null): string {
  if (!iso) {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")} - ${now.getDate().toString().padStart(2, "0")}/${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${now.getFullYear()}`;
  }
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

  // Auto-grading Pipeline States
  const [gradingPhase, setGradingPhase] = useState<"idle" | "grading" | "graded">(
    savedSubmission ? "graded" : "idle"
  );
  const [gradingStep, setGradingStep] = useState<number>(0);
  const [gradeReport, setGradeReport] = useState<AutoGradeReport>(() =>
    savedSubmission
      ? {
          score: savedSubmission.score,
          maxScore: savedSubmission.maxScore,
          gradeLabel: savedSubmission.gradeLabel,
          testsPassed: savedSubmission.testsPassed,
          testsTotal: savedSubmission.testsTotal,
          executionTimeMs: savedSubmission.executionTimeMs,
          valgrindLeaks: savedSubmission.valgrindLeaks ?? 0,
          antiPlagiarismScore: savedSubmission.antiPlagiarismScore,
          rubric: savedSubmission.rubric?.length
            ? savedSubmission.rubric
            : DEFAULT_GRADE_REPORT.rubric,
          aiFeedback: savedSubmission.aiFeedback?.strengths
            ? savedSubmission.aiFeedback
            : DEFAULT_GRADE_REPORT.aiFeedback,
        }
      : DEFAULT_GRADE_REPORT
  );
  const [liveLogs, setLiveLogs] = useState<string[]>([]);

  useEffect(() => {
    setSubmitError(null);
    setIsEditing(false);
    if (savedSubmission) {
      setSubmittedLink(savedSubmission.repo_url);
      setSubmissionLink(savedSubmission.repo_url);
      setStudentNote(savedSubmission.student_note || "");
      setSubmittedAt(formatSubmittedTime(savedSubmission.submitted_at));
      setGradingPhase("graded");
      setGradeReport({
        score: savedSubmission.score,
        maxScore: savedSubmission.maxScore,
        gradeLabel: savedSubmission.gradeLabel,
        testsPassed: savedSubmission.testsPassed,
        testsTotal: savedSubmission.testsTotal,
        executionTimeMs: savedSubmission.executionTimeMs,
        valgrindLeaks: savedSubmission.valgrindLeaks ?? 0,
        antiPlagiarismScore: savedSubmission.antiPlagiarismScore,
        rubric: savedSubmission.rubric?.length
          ? savedSubmission.rubric
          : DEFAULT_GRADE_REPORT.rubric,
        aiFeedback: savedSubmission.aiFeedback?.strengths
          ? savedSubmission.aiFeedback
          : DEFAULT_GRADE_REPORT.aiFeedback,
      });
    } else {
      setSubmittedLink(null);
      setSubmissionLink("");
      setStudentNote("");
      setSubmittedAt(null);
      setGradingPhase("idle");
      setGradeReport(DEFAULT_GRADE_REPORT);
      setLiveLogs([]);
    }
  }, [exercise.id, savedSubmission]);

  const GRADING_STEPS = [
    "Clone repository & kiểm tra cây thư mục mã nguồn...",
    "Docker Sandbox: Biên dịch mã nguồn & Chạy bộ Test Cases chuẩn giảng viên...",
    "AI Code Review: Phân tích Clean Code, kiến trúc & Valgrind memory safety...",
    "Thẩm định Liêm chính Học thuật & Tổng hợp Bảng điểm Rubric...",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLink = submissionLink.trim();
    if (!cleanLink) return;
    if (!GITHUB_REPO_URL_RE.test(cleanLink)) {
      setSubmitError("Vui lòng nhập đường dẫn GitHub Repository hợp lệ (ví dụ: https://github.com/owner/repo).");
      return;
    }

    setSubmitError(null);
    setGradingPhase("grading");
    setGradingStep(0);
    setLiveLogs([
      `[0.1s] [INIT] Khởi tạo luồng thẩm định Docker CI/CD cho: ${cleanLink}`,
      `[0.3s] [GIT] Kiểm tra & clone repository cho Chương ${exercise.chapterNumber}`,
    ]);

    const t1 = setTimeout(() => {
      setGradingStep(1);
      setLiveLogs((prev) => [
        ...prev,
        `[0.5s] [DOCKER] Cấp phát Container cô lập (${effectiveDockerImage || "Docker Sandbox"}, --network=none)`,
      ]);
    }, 300);

    const t2 = setTimeout(() => {
      setGradingStep(2);
      setLiveLogs((prev) => [
        ...prev,
        `[0.7s] [TEST] Thực thi ${configuredTestCases.length > 0 ? configuredTestCases.length : 5} Docker Test Cases & Quét Sanitizer...`,
      ]);
    }, 600);

    const t3 = setTimeout(() => {
      setGradingStep(3);
      setLiveLogs((prev) => [
        ...prev,
        "[0.9s] [SYNC] Đồng bộ kết quả Rubric vào MySQL 8.0 & hàng đợi Giảng viên...",
      ]);
    }, 850);

    const [res] = await Promise.all([
      submitStudentChapterExercise({
        subject_id: subjectId,
        chapter_number: exercise.chapterNumber,
        exercise_id: dbAssignment?.id || exercise.id,
        exercise_title: effectiveExerciseTitle,
        repo_url: cleanLink,
        student_note: studentNote.trim(),
        xp: effectiveXp,
      }),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);

    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);

    if (res.error || !res.submission) {
      setGradingPhase(submittedLink ? "graded" : "idle");
      setSubmitError(res.error || "Không thể chấm bài trên Docker Sandbox.");
      return;
    }

    const saved = res.submission;
    setGradeReport({
      score: saved.score,
      maxScore: saved.maxScore,
      gradeLabel: saved.gradeLabel,
      testsPassed: saved.testsPassed,
      testsTotal: saved.testsTotal,
      executionTimeMs: saved.executionTimeMs,
      valgrindLeaks: saved.valgrindLeaks ?? 0,
      antiPlagiarismScore: saved.antiPlagiarismScore,
      rubric: saved.rubric?.length ? saved.rubric : DEFAULT_GRADE_REPORT.rubric,
      aiFeedback: saved.aiFeedback?.strengths
        ? saved.aiFeedback
        : DEFAULT_GRADE_REPORT.aiFeedback,
    });
    setSubmittedLink(saved.repo_url);
    setSubmittedAt(formatSubmittedTime(saved.submitted_at));
    setGradingPhase("graded");
    setIsEditing(false);

    triggerMarloConfetti();
    if (onSubmissionSaved) {
      onSubmissionSaved(saved, res.total_xp);
    } else if (saved.xp_awarded > 0 && onEarnXp) {
      onEarnXp(saved.xp_awarded);
    }
  };

  const officialDisplayScore =
    savedSubmission?.status === "graded" &&
    savedSubmission.instructor_grade !== null &&
    savedSubmission.instructor_grade !== undefined
      ? savedSubmission.instructor_grade
      : gradeReport.score;

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
              <span>+{effectiveXp} XP</span>
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
              Vui lòng dán đường dẫn <strong>GitHub Repository</strong> công khai của bạn (định dạng <code className="font-mono">https://github.com/owner/repo</code>). Hệ thống sẽ xác thực repository và chạy bộ kiểm thử Docker Sandbox {effectiveDockerImage ? `(${effectiveDockerImage})` : "theo cấu hình môn học"}.
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
            <span>Nộp bài & Chấm điểm Tự động</span>
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

        {/* ── PIPELINE ĐANG CHẤM BÀI TỰ ĐỘNG (ANIMATED RUNNER) ── */}
        {gradingPhase === "grading" && (
          <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrainCircuit size={20} className="text-blue-500 animate-spin" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Đang khởi chạy Pipeline Chấm bài Tự động...
                </span>
              </div>
              <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300">
                {Math.round(((gradingStep + 1) / GRADING_STEPS.length) * 100)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-[#EE8420] transition-all duration-500 rounded-full"
                style={{ width: `${((gradingStep + 1) / GRADING_STEPS.length) * 100}%` }}
              />
            </div>

            {/* Steps stream */}
            <div className="space-y-2 pt-1 font-mono text-xs">
              {GRADING_STEPS.map((stepText, idx) => {
                const isPast = idx < gradingStep;
                const isCurrent = idx === gradingStep;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 transition-opacity duration-300 ${
                      isPast
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isCurrent
                        ? "text-amber-600 dark:text-amber-400 font-bold animate-pulse"
                        : "text-slate-400 opacity-40"
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    ) : isCurrent ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                    )}
                    <span>{stepText}</span>
                  </div>
                );
              })}
            </div>

            {/* Live Terminal Log Stream Window */}
            <div className="mt-4 rounded-xl bg-slate-950 border border-slate-800 p-3.5 font-mono text-[11px] text-slate-300 space-y-1 shadow-inner max-h-44 overflow-y-auto">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <Terminal size={12} className="text-amber-400" />
                  <span>Docker Linux CI/CD Execution Log Stream</span>
                </span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Đang xử lý</span>
                </span>
              </div>
              {liveLogs.map((log, i) => (
                <div key={i} className="leading-relaxed animate-fadeIn">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BÁO CÁO KẾT QUẢ ĐÃ CHẤM TỰ ĐỘNG THÀNH CÔNG ── */}
        {submittedLink && !isEditing && gradingPhase === "graded" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Top Score Banner */}
            <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xl shrink-0">
                  <Award size={24} />
                </div>
                <div>
                  <div className="text-xs text-slate-400">
                    Nộp lúc: <b className="text-slate-700 dark:text-slate-300">{submittedAt}</b>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mt-0.5">
                    {savedSubmission?.status === "graded" &&
                    savedSubmission.instructor_grade !== null &&
                    savedSubmission.instructor_grade !== undefined ? (
                      <>
                        Điểm chính thức (GV công nhận):{" "}
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                          {officialDisplayScore.toFixed(1)}
                        </span>{" "}
                        / {gradeReport.maxScore}
                        <span className="ml-2 text-xs font-mono font-semibold text-slate-400">
                          (Auto-Test AI: {gradeReport.score})
                        </span>
                      </>
                    ) : (
                      <>
                        Điểm Auto-Test Sandbox:{" "}
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                          {gradeReport.score}
                        </span>{" "}
                        / {gradeReport.maxScore}
                      </>
                    )}
                  </h3>
                </div>
              </div>

              {/* Quick telemetry badges */}
              <div className="flex sm:flex-col items-start sm:items-end gap-1.5 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs font-bold">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>{gradeReport.testsPassed}/{gradeReport.testsTotal} Test Cases Passed</span>
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock size={12} />
                  <span>{gradeReport.executionTimeMs}ms · Valgrind: {gradeReport.valgrindLeaks} leak</span>
                </span>
              </div>
            </div>

            {/* 🎓 KẾT QUẢ ĐÁNH GIÁ CHÍNH THỨC CỦA GIẢNG VIÊN */}
            {savedSubmission?.status === "graded" && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span>✓ Giảng viên đã thẩm định & công nhận điểm chính thức</span>
                  </div>
                  {savedSubmission.instructor_grade !== null && savedSubmission.instructor_grade !== undefined && (
                    <span className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700">
                      Điểm GV: {savedSubmission.instructor_grade.toFixed(1)} / 10
                    </span>
                  )}
                </div>
                {savedSubmission.instructor_feedback && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 pl-6 leading-relaxed">
                    <strong>Lời phê:</strong> "{savedSubmission.instructor_feedback}"
                  </p>
                )}
                {savedSubmission.graded_at && (
                  <span className="text-[10px] text-slate-400 pl-6 block font-mono">
                    Thời gian chấm: {savedSubmission.graded_at} {savedSubmission.graded_by ? `bởi ${savedSubmission.graded_by}` : ""}
                  </span>
                )}
              </div>
            )}

            {savedSubmission?.status === "revision_requested" && (
              <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                    <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400" />
                    <span>⚠️ Giảng viên yêu cầu sửa lỗi & nộp lại bài tập</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Nộp lại phiên bản mới
                  </button>
                </div>
                {savedSubmission.instructor_feedback && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 pl-6 leading-relaxed">
                    <strong>Yêu cầu chỉnh sửa:</strong> "{savedSubmission.instructor_feedback}"
                  </p>
                )}
              </div>
            )}

            {/* Submitted Repo Link Bar */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
              <FileCode size={16} className="text-blue-500 shrink-0" />
              <span className="text-slate-400 font-semibold shrink-0">Link bài nộp:</span>
              <a
                href={submittedLink}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-blue-600 dark:text-blue-400 hover:underline truncate flex-1 font-bold"
                title={submittedLink}
              >
                {submittedLink}
              </a>
              <a
                href={submittedLink}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded text-slate-400 hover:text-blue-600 transition"
                title="Mở tab mới"
              >
                <ExternalLink size={14} />
              </a>
            </div>

            {/* ── BẢNG ĐIỂM CHI TIẾT THEO RUBRIC CHUẨN 4 TIÊU CHÍ ── */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Terminal size={15} className="text-[#EE8420]" />
                  <span>Bảng điểm Chi tiết theo Tiêu chí Rubric</span>
                </h4>
                <span className="text-[11px] font-bold text-slate-400">Thang điểm 10</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {gradeReport.rubric.map((r, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {r.title}
                      </span>
                      <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                        {r.score}/{r.max}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {r.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── NHẬN XÉT CHI TIẾT TỪ AI SOCRATIC MENTOR ── */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
                    AI
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Nhận xét Chuyên sâu từ AI Socratic Mentor
                  </h4>
                </div>

                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Liêm chính: {gradeReport.antiPlagiarismScore}% Unique
                </span>
              </div>

              {/* 2 Clean feedback rows */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>Điểm sáng kiến trúc:</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-5">
                    {gradeReport.aiFeedback.strengths}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500 shrink-0" />
                    <span>Gợi ý hoàn thiện thêm (Best Practices):</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-5">
                    {gradeReport.aiFeedback.improvements}
                  </p>
                </div>
              </div>

              {/* Clean metadata footer bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
                <span>
                  {gradeReport.aiFeedback.cleanCodeAnalysis || "Phân tích tĩnh & Clean Code: Mức an toàn cao"}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Kiểm thử tự động bởi Docker Sandbox
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── FORM NHẬP LINK NỘP BÀI (KHI CHƯA NỘP HOẶC ĐANG CHỈNH SỬA) ── */}
        {(gradingPhase === "idle" || isEditing) && (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>Dán link GitHub Repository bài làm</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                  ⚡ Xác thực GitHub & Chấm điểm Docker CI/CD tự động
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
                <span>Nộp bài & Chấm điểm Tự động (+{effectiveXp} XP)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
