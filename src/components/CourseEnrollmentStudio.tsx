import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  FileText,
  GitBranch,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Lock,
  MapPin,
  ShieldCheck,
  UserCheck,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  enrollStudentCourseApi,
  fetchCourseOpenSectionsApi,
  joinClassByCodeApi,
  type OpenCourseSectionDto,
} from "../api";
import type { SubjectModuleData } from "../data/multiChapterCurriculum";
import {
  getLessonDisplayCode,
  stripDuplicateChapterPrefix,
  stripDuplicateLessonCode,
} from "../utils/lessonFormat";

interface CourseClassEnrollModalProps {
  isOpen: boolean;
  initialMode?: "sections" | "code";
  subject: SubjectModuleData | null;
  onClose: () => void;
  onEnrolledSuccess: (res: {
    subjectId?: string;
    sectionCode?: string;
    message?: string;
  }) => void | Promise<void>;
}

export function CourseClassEnrollModal({
  isOpen,
  initialMode = "sections",
  subject,
  onClose,
  onEnrolledSuccess,
}: CourseClassEnrollModalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const [mode, setMode] = useState<"sections" | "code">(
    subject ? initialMode : "code"
  );
  const [sections, setSections] = useState<OpenCourseSectionDto[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [loadingSections, setLoadingSections] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setShouldRender(true);
      setIsClosing(false);
      setErrorText(null);
      setJoinCodeInput("");
      setMode(subject ? initialMode : "code");
    } else if (shouldRender) {
      setIsClosing(true);
      closeTimerRef.current = window.setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        closeTimerRef.current = null;
      }, 220);
    }
  }, [isOpen, initialMode, subject, shouldRender]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleRequestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
      closeTimerRef.current = null;
      onClose();
    }, 220);
  }, [isClosing, onClose]);

  useEffect(() => {
    if (!isOpen || !subject) {
      setSections([]);
      setSelectedSectionId("");
      return;
    }
    let alive = true;
    setLoadingSections(true);
    fetchCourseOpenSectionsApi(subject.id)
      .then((res) => {
        if (!alive) return;
        const list = res?.sections || [];
        setSections(list);
        const firstAvailable = list.find((s) => !s.isFull) || list[0];
        setSelectedSectionId(firstAvailable ? firstAvailable.id : "");
      })
      .finally(() => {
        if (alive) setLoadingSections(false);
      });
    return () => {
      alive = false;
    };
  }, [isOpen, subject]);

  useEffect(() => {
    if (!shouldRender) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleRequestClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [shouldRender, handleRequestClose]);

  const handleConfirmSectionEnroll = async () => {
    if (!subject || submitting) return;
    const targetId = selectedSectionId || subject.sectionId || subject.id;
    setSubmitting(true);
    setErrorText(null);
    const res = await enrollStudentCourseApi(targetId);
    setSubmitting(false);
    if (res.error) {
      setErrorText(res.error);
      return;
    }
    await onEnrolledSuccess({
      subjectId: subject.id,
      sectionCode: res.sectionCode,
      message: res.message,
    });
    handleRequestClose();
  };

  const handleConfirmCodeJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim();
    if (clean.length < 2 || submitting) return;
    setSubmitting(true);
    setErrorText(null);
    const res = await joinClassByCodeApi(clean, subject?.id);
    setSubmitting(false);
    if (res.error) {
      setErrorText(res.error);
      return;
    }
    await onEnrolledSuccess({
      subjectId: res.subjectId || subject?.id,
      sectionCode: res.sectionCode,
      message: res.message,
    });
    handleRequestClose();
  };

  if (!shouldRender || typeof document === "undefined") return null;

  const selectedSec = sections.find((s) => s.id === selectedSectionId) || null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 select-none">
      {/* Scrim Backdrop */}
      <div
        onClick={handleRequestClose}
        className={`fixed inset-0 bg-black/55 backdrop-blur-xs ${
          isClosing ? "marlo-scrim-out" : "marlo-scrim"
        }`}
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Đăng ký lớp học phần"
        onClick={(e) => e.stopPropagation()}
        className={`relative z-[9999] w-full max-w-[540px] rounded-[26px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_24px_70px_rgba(0,0,0,0.45)] overflow-hidden select-text ${
          isClosing ? "marlo-modal-out" : "marlo-modal"
        }`}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px]">
                {subject ? subject.code : "CLASS CODE"}
              </span>
              {subject && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono font-semibold text-[11px]">
                  {subject.credits || 3} tín chỉ · {subject.semester}
                </span>
              )}
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
              {subject ? `Đăng ký học phần · ${subject.name}` : "Tham gia lớp học bằng Mã lớp"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subject
                ? "Chọn lớp học phần đang mở phù hợp lịch học hoặc nhập mã lớp từ Giảng viên."
                : "Nhập mã lớp học phần do Giảng viên hoặc Phòng Đào tạo cung cấp để vào thẳng lớp."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Đóng (Esc)"
          >
            <X size={17} />
          </button>
        </div>

        {/* Mode Switcher (when a course is selected) */}
        {subject && (
          <div className="px-6 pt-3.5 pb-1">
            <div className="inline-flex w-full rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200/70 dark:border-slate-800 p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  setMode("sections");
                  setErrorText(null);
                }}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                  mode === "sections"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Users size={13.5} />
                <span>Chọn lớp đang mở ({sections.length || 1})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("code");
                  setErrorText(null);
                }}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer ${
                  mode === "code"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <KeyRound size={13.5} />
                <span>Nhập mã tham gia lớp</span>
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4 max-h-[62vh] overflow-y-auto space-y-3">
          {errorText && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
              {errorText}
            </div>
          )}

          {mode === "sections" && subject ? (
            loadingSections ? (
              <div className="space-y-2.5 py-2">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/70 animate-pulse"
                  />
                ))}
              </div>
            ) : sections.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-xs text-slate-600 dark:text-slate-300">
                Hiện môn học đang mở đăng ký theo lớp tiêu chuẩn của học kỳ ({subject.instructor}). Bấm xác nhận bên dưới để tham gia ngay.
              </div>
            ) : (
              <div className="space-y-2.5">
                {sections.map((sec) => {
                  const isSelected = sec.id === selectedSectionId;
                  const fillPct = Math.min(
                    100,
                    Math.round((sec.enrolledCount / Math.max(1, sec.maxStudents)) * 100)
                  );
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      disabled={sec.isFull}
                      onClick={() => setSelectedSectionId(sec.id)}
                      className={`w-full text-left rounded-2xl border p-4 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isSelected
                          ? "border-slate-900 dark:border-white bg-slate-50/90 dark:bg-slate-800/80 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {sec.groupLabel}
                            </span>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              · {sec.teacherName}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={12} />
                              <span>{sec.scheduleLabel}</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} />
                              <span>{sec.room}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border transition ${
                              isSelected
                                ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </span>
                          <span
                            className={`font-mono text-[11px] font-bold ${
                              sec.isFull
                                ? "text-rose-500"
                                : "text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            Sĩ số {sec.enrolledCount}/{sec.maxStudents}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2.5 h-1 w-full rounded-full bg-slate-200/80 dark:bg-slate-700/70 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            sec.isFull ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.max(4, fillPct)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <form id="join-by-code-form" onSubmit={handleConfirmCodeJoin} className="space-y-3 py-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Mã tham gia lớp học phần
                </label>
                <input
                  type="text"
                  autoFocus
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder={
                    subject ? `VD: ${subject.code}-N01 hoặc ${subject.code}-N02` : "VD: CS205-N01"
                  }
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 font-mono text-sm font-bold tracking-wider text-slate-900 dark:text-white placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-slate-900 dark:focus:border-white focus:outline-none"
                />
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 p-3 text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Giảng viên phụ trách hoặc Quản trị viên Đào tạo sẽ cung cấp mã lớp (dạng{" "}
                <code className="font-mono font-bold text-slate-700 dark:text-slate-200">
                  {subject ? `${subject.code}-N01` : "CS205-N01"}
                </code>
                ) trên lớp để bạn tham gia đúng nhóm đồ án &amp; bảng điểm.
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleRequestClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Hủy
          </button>

          {mode === "sections" && subject ? (
            <button
              type="button"
              disabled={submitting || Boolean(selectedSec?.isFull)}
              onClick={() => void handleConfirmSectionEnroll()}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {submitting
                ? "Đang ghi danh..."
                : selectedSec
                ? `Xác nhận đăng ký · ${selectedSec.groupLabel}`
                : "Xác nhận đăng ký học"}
            </button>
          ) : (
            <button
              type="submit"
              form="join-by-code-form"
              disabled={submitting || joinCodeInput.trim().length < 2}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold transition cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {submitting ? "Đang kiểm tra mã..." : "Tham gia lớp học"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TRANG GIỚI THIỆU & ĐỀ CƯƠNG MÔN HỌC BỊ KHÓA 🔒 (CHO MÔN CHƯA ĐĂNG KÝ)
// ═════════════════════════════════════════════════════════════════════════════
interface CourseSyllabusGateProps {
  subject: SubjectModuleData;
  onBackToCatalog: () => void;
  onOpenEnrollModal: (mode: "sections" | "code") => void;
}

export function CourseSyllabusGate({
  subject,
  onBackToCatalog,
  onOpenEnrollModal,
}: CourseSyllabusGateProps) {
  const [openChapterIds, setOpenChapterIds] = useState<Record<string, boolean>>(() => {
    const first = subject.chapters[0]?.id;
    return first ? { [first]: true } : {};
  });

  const totalLessons = subject.chapters.reduce((acc, c) => acc + (c.lessons?.length || 0), 0);
  const totalLabs = subject.chapters.length;
  const totalCourseXp =
    subject.chapters.reduce(
      (acc, c) =>
        acc + (c.lessons || []).reduce((s, l) => s + (Number(l.xp) || 0), 0) + 100,
      0
    ) || subject.totalXp;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1280px] mx-auto space-y-6">
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToCatalog}
            className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={15} />
            <span>Quay lại Danh sách khóa học</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Lock size={13} />
            <span>Chưa đăng ký học phần · Chế độ xem đề cương</span>
          </div>
        </div>

        {/* Main 2-Column Syllabus Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Columns: Course Introduction + Locked Chapters & Lessons */}
          <div className="lg:col-span-8 space-y-5">
            {/* Course Hero Card */}
            <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-5 shadow-2xs">
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-mono text-xs font-bold">
                    {subject.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {subject.credits || 3} tín chỉ
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {subject.semester}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                  {subject.name}
                </h1>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {subject.description}
                </p>
              </div>

              {/* Instructor Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {subject.instructor}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Giảng viên điều phối học phần · Chấm bài Lab &amp; Hội đồng đồ án
                    </div>
                  </div>
                </div>

                <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                  {subject.stageTitle || subject.category}
                </span>
              </div>

              {/* Learning Outcomes */}
              <div className="space-y-2.5 pt-1">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Bạn sẽ đạt được gì sau khi đăng ký học
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700 dark:text-slate-200">
                  {[
                    "Truy cập toàn bộ bài đọc chuyên sâu, video bài giảng & ghi chú theo mốc thời gian.",
                    "Thực hành Code Lab cô lập trên Docker Sandbox & chấm test tự động.",
                    "Trao đổi hỏi đáp trực tiếp cùng Giảng viên và các thành viên trong lớp học phần.",
                    "Mở khóa bài kiểm tra Checkpoint Quiz, Sơ đồ tư duy & tích lũy điểm kinh nghiệm XP.",
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3 leading-relaxed"
                    >
                      <CheckCircle2
                        size={14}
                        className="text-emerald-500 shrink-0 mt-0.5"
                      />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Locked Curriculum Chapters & Lessons */}
            <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Nội dung đề cương môn học
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {subject.chapters.length} chương · {totalLessons} bài giảng ·{" "}
                    {totalLabs} bài tập thực hành (Đăng ký học phần để mở khóa toàn bộ)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const allOpen = subject.chapters.every((c) => openChapterIds[c.id]);
                    if (allOpen) {
                      setOpenChapterIds({});
                    } else {
                      const next: Record<string, boolean> = {};
                      subject.chapters.forEach((c) => {
                        next[c.id] = true;
                      });
                      setOpenChapterIds(next);
                    }
                  }}
                  className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer"
                >
                  {subject.chapters.every((c) => openChapterIds[c.id])
                    ? "Thu gọn tất cả"
                    : "Mở rộng tất cả chương"}
                </button>
              </div>

              {subject.chapters.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                  Đề cương chi tiết đang được Giảng viên cập nhật cho học kỳ này.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {subject.chapters.map((chapter) => {
                    const isOpen = Boolean(openChapterIds[chapter.id]);
                    return (
                      <div
                        key={chapter.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenChapterIds((prev) => ({
                              ...prev,
                              [chapter.id]: !prev[chapter.id],
                            }))
                          }
                          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-left transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isOpen ? (
                              <ChevronDown size={16} className="text-slate-500 shrink-0" />
                            ) : (
                              <ChevronRight size={16} className="text-slate-500 shrink-0" />
                            )}
                            <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                              Chương {chapter.number}:
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {stripDuplicateChapterPrefix(chapter.title, chapter.number)}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                            {chapter.lessons.length} bài · {chapter.duration}
                          </span>
                        </button>

                        {isOpen && (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                            {chapter.lessons.map((lesson, lIdx) => {
                              const code = getLessonDisplayCode(
                                lesson.id,
                                lesson.title,
                                chapter.number,
                                lIdx
                              );
                              const cleanTitle = stripDuplicateLessonCode(
                                lesson.title,
                                code
                              );
                              return (
                                <button
                                  key={lesson.id}
                                  type="button"
                                  onClick={() => onOpenEnrollModal("sections")}
                                  title="Đăng ký học phần để mở khóa bài học này"
                                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                                      {lesson.type === "video" ? (
                                        <Video size={13.5} />
                                      ) : lesson.type === "quiz" ? (
                                        <HelpCircle size={13.5} />
                                      ) : (
                                        <FileText size={13.5} />
                                      )}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                                        {code} · {cleanTitle}
                                      </div>
                                      <div className="text-[11px] font-mono text-slate-400">
                                        {lesson.duration} · +{lesson.xp} XP
                                      </div>
                                    </div>
                                  </div>

                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white shrink-0">
                                    <Lock size={12} />
                                    <span className="hidden sm:inline">Đã khóa</span>
                                  </span>
                                </button>
                              );
                            })}

                            {/* Locked Chapter Lab */}
                            <button
                              type="button"
                              onClick={() => onOpenEnrollModal("sections")}
                              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                                  <Code2 size={13.5} />
                                </span>
                                <span className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                                  Bài tập Thực hành Chương {chapter.number} (Docker Code Lab)
                                </span>
                              </div>
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                <Lock size={12} />
                                <span className="hidden sm:inline">Đã khóa</span>
                              </span>
                            </button>

                            {/* Locked Chapter Mindmap */}
                            <button
                              type="button"
                              onClick={() => onOpenEnrollModal("sections")}
                              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                                  <GitBranch size={13.5} />
                                </span>
                                <span className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                                  Sơ đồ Tư duy Tổng kết Chương {chapter.number}
                                </span>
                              </div>
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                                <Lock size={12} />
                                <span className="hidden sm:inline">Đã khóa</span>
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right 4 Columns: Sticky Enrollment CTA Card */}
          <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-4">
            <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-sm">
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  ĐĂNG KÝ HỌC PHẦN
                </span>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Mở khóa toàn bộ bài học
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Chọn lớp học phần đang mở hoặc nhập mã lớp từ Giảng viên để bắt đầu học và nộp bài ngay.
                </p>
              </div>

              <div className="space-y-2.5 border-y border-slate-100 dark:border-slate-800 py-4 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <BookOpen size={14} />
                    <span>Khối lượng bài giảng</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {subject.chapters.length} chương · {totalLessons} bài
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Clock size={14} />
                    <span>Tổng thời lượng</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {subject.totalDuration}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <ShieldCheck size={14} />
                    <span>Điểm kinh nghiệm tích lũy</span>
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    +{totalCourseXp} XP
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onOpenEnrollModal("sections")}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  <GraduationCap size={17} />
                  <span>Đăng ký học môn này</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenEnrollModal("code")}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <KeyRound size={14} />
                  <span>Có mã tham gia lớp? Nhập mã ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
