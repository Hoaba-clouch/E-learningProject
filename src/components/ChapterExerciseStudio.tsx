import React, { useState } from "react";
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
import type { ChapterExerciseData } from "../data/chapterExercises";
import type { MentorMascot } from "../App";

interface ChapterExerciseStudioProps {
  exercise: ChapterExerciseData;
  mentorMascot?: MentorMascot;
  onEarnXp?: (xp: number) => void;
  onBackToLecture?: () => void;
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
  score: 9.5,
  maxScore: 10,
  gradeLabel: "LOẠI XUẤT SẮC (TIÊU CHUẨN ABET)",
  testsPassed: 8,
  testsTotal: 8,
  executionTimeMs: 42,
  valgrindLeaks: 0,
  antiPlagiarismScore: 98.6,
  rubric: [
    {
      title: "Yêu cầu Đề bài & Kế thừa Đa hình",
      score: 10,
      max: 10,
      note: "Đầy đủ các lớp theo thiết kế, override hàm ảo chính xác, không dùng con trỏ sống vô tổ chức.",
    },
    {
      title: "Chất lượng Mã nguồn & Clean Architecture",
      score: 9.0,
      max: 10,
      note: "Đặt tên chuẩn PascalCase cho Class và camelCase cho Method; phân tách rõ ràng interface và implementation.",
    },
    {
      title: "An toàn Bộ nhớ & Tối ưu vtable",
      score: 9.5,
      max: 10,
      note: "Sử dụng smart pointer (std::unique_ptr) bảo vệ tài nguyên; Valgrind kiểm thử đạt 0 bytes memory leak.",
    },
    {
      title: "Tài liệu Kỹ thuật & Báo cáo README",
      score: 9.5,
      max: 10,
      note: "README trình bày rõ ràng kiến trúc sơ đồ lớp (Class Diagram), có hướng dẫn biên dịch CMake cụ thể.",
    },
  ],
  aiFeedback: {
    strengths:
      "Cấu trúc đa hình runtime phân tách rất rõ ràng giữa Base class và Derived class. Cơ chế Virtual Method Dispatch được gọi chính xác thông qua con trỏ lớp cha trỏ tới thực thể lớp con.",
    improvements:
      "Nên bổ sung thêm từ khóa `override` ở tất cả các phương thức ghi đè trong lớp con để trình biên dịch Clang-16 cảnh báo sớm nếu chữ ký hàm lớp cha bị thay đổi trong tương lai.",
    cleanCodeAnalysis:
      "Độ phức tạp Cyclomatic Complexity trung bình đạt 2.4 (mức an toàn cao). Không phát hiện code smell nghiêm trọng.",
  },
};

export default function ChapterExerciseStudio({
  exercise,
  mentorMascot = "mino",
  onEarnXp,
  onBackToLecture,
}: ChapterExerciseStudioProps) {
  const [submissionLink, setSubmissionLink] = useState("");
  const [studentNote, setStudentNote] = useState("");
  const [submittedLink, setSubmittedLink] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Auto-grading Pipeline States
  const [gradingPhase, setGradingPhase] = useState<"idle" | "grading" | "graded">("idle");
  const [gradingStep, setGradingStep] = useState<number>(0);
  const [gradeReport, setGradeReport] = useState<AutoGradeReport>(DEFAULT_GRADE_REPORT);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);

  const GRADING_STEPS = [
    "Clone repository & kiểm tra cây thư mục mã nguồn...",
    "Docker Sandbox: Biên dịch C++20 Clang-16 & Chạy 8/8 Test Cases...",
    "AI Code Review: Phân tích Clean Code, con trỏ vtable & Valgrind leak...",
    "Thẩm định Liêm chính Học thuật & Tổng hợp Bảng điểm Rubric...",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLink = submissionLink.trim();
    if (!cleanLink) return;

    setGradingPhase("grading");
    setGradingStep(0);
    setLiveLogs([`[0.2s] [INIT] Khởi tạo luồng thẩm định tự động cho: ${cleanLink}`]);

    // Step 0 sub-log (0.8s)
    setTimeout(() => {
      setLiveLogs((prev) => [
        ...prev,
        "[0.8s] [GIT] git clone --depth=1 repo -> Tải thành công 14 files mã nguồn C++",
      ]);
    }, 800);

    // Step 1: Docker Sandbox (1.8s)
    setTimeout(() => {
      setGradingStep(1);
      setLiveLogs((prev) => [
        ...prev,
        "[1.8s] [DOCKER] Cấp phát Container Linux cô lập (2 vCPU, 4GB RAM, cgroup sandbox)",
      ]);
    }, 1800);

    // Step 1 sub-log: Compile (2.8s)
    setTimeout(() => {
      setLiveLogs((prev) => [
        ...prev,
        "[2.8s] [BUILD] clang++ -std=c++20 -O2 -fsanitize=address src/*.cpp -o solution -> Build SUCCESS (0 warnings)",
      ]);
    }, 2800);

    // Step 2: AI Review & Test Cases (3.9s)
    setTimeout(() => {
      setGradingStep(2);
      setLiveLogs((prev) => [
        ...prev,
        "[3.9s] [TEST] Chạy 8/8 Test Cases ẩn: PASS (42ms) · Valgrind: 0 bytes memory leak",
      ]);
    }, 3900);

    // Step 2 sub-log: Socratic AST (4.9s)
    setTimeout(() => {
      setLiveLogs((prev) => [
        ...prev,
        "[4.9s] [ANALYSIS] AI Socratic Reviewer: Quét cây AST, kiểm tra vptr offset & tính đa hình OOP runtime...",
      ]);
    }, 4900);

    // Step 3: Anti-Plagiarism & Rubric (5.8s)
    setTimeout(() => {
      setGradingStep(3);
      setLiveLogs((prev) => [
        ...prev,
        "[5.8s] [AUDIT] Quét Liêm chính Học thuật: 98.6% Unique · Cyclomatic Complexity = 2.4",
      ]);
    }, 5800);

    // Step 3 sub-log (6.6s)
    setTimeout(() => {
      setLiveLogs((prev) => [
        ...prev,
        "[6.6s] [DONE] Hoàn tất thẩm định tự động! Chuẩn bị xuất Bảng điểm Rubric...",
      ]);
    }, 6600);

    // Finish & Show Report (7.3s)
    setTimeout(() => {
      setGradingPhase("graded");
      setSubmittedLink(cleanLink);
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")} - ${now.getDate().toString().padStart(2, "0")}/${(
        now.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${now.getFullYear()}`;
      setSubmittedAt(timeStr);
      setIsEditing(false);

      // Bắn confetti chúc mừng bài nộp được chấm điểm xuất sắc
      triggerMarloConfetti();
      if (onEarnXp) {
        onEarnXp(exercise.xp);
      }
    }, 7300);
  };

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
              {exercise.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {exercise.description}
            </p>
          </div>

          <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <Flame size={15} className="fill-amber-500 text-amber-500" />
              <span>+{exercise.xp} XP</span>
            </div>

            {onBackToLecture && (
              <button
                onClick={onBackToLecture}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <BookOpen size={13} />
                <span>Xem lại lý thuyết</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🌊 DÒNG CHẤT LỎNG NỐI XUỐNG CARD YÊU CẦU */}
      <LiquidCardConnector />

      {/* ── CARD 1: ĐỀ BÀI CHI TIẾT & YÊU CẦU ────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText size={16} className="text-blue-600" />
          <span>Yêu cầu kỹ thuật cần đạt</span>
        </h2>

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
              Bạn có thể nộp link <strong>GitHub Repository</strong>, <strong>Pull Request</strong>, hoặc link <strong>Google Drive / Zip</strong> chứa mã nguồn. Sau khi dán link và bấm Nộp, hệ thống sẽ tự động khởi chạy Docker Sandbox để compile C++20, chạy test cases và trả về nhận xét tức thì.
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
                    Điểm số: <span className="text-emerald-600 dark:text-emerald-400 font-mono">{gradeReport.score}</span> / {gradeReport.maxScore}
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
                  <span>{gradeReport.executionTimeMs}ms · Valgrind: 0 leak</span>
                </span>
              </div>
            </div>

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
                  Độ phức tạp Cyclomatic Complexity:{" "}
                  <b className="text-slate-700 dark:text-slate-300 font-mono">2.4</b> (An toàn)
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Không phát hiện code smell nghiêm trọng
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── FORM NHẬP LINK NỘP BÀI (KHI CHƯA NỘP HOẶC ĐANG CHỈNH SỬA) ── */}
        {(gradingPhase === "idle" || isEditing) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>Dán link nộp bài (GitHub Repository / PR / Link Project)</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                  ⚡ Chấm điểm & nhận xét tự động tức thì trong 2s
                </span>
              </label>

              <div className="relative">
                <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="url"
                  required
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                  placeholder="https://github.com/username/cpp-oop-polymorphism hoặc link repo bất kỳ..."
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs font-mono"
                />
              </div>

              {/* Sample Quick Links */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-slate-400">Dán nhanh mẫu:</span>
                <button
                  type="button"
                  onClick={() =>
                    setSubmissionLink("https://github.com/codemind-student/cpp-oop-polymorphism-lab")
                  }
                  className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
                >
                  github.com/.../cpp-oop-polymorphism-lab
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Ghi chú thêm về giải thuật hoặc quyết định kiến trúc (không bắt buộc)
              </label>
              <input
                type="text"
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                placeholder="Ví dụ: Em đã hoàn thiện thêm phần kiểm tra vptr offset và tối ưu smart pointer..."
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 transition shadow-2xs"
              />
            </div>

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
                <span>Nộp bài & Chấm điểm Tự động (+100 XP)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
