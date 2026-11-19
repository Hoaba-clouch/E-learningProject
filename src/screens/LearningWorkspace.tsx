import ChapterExerciseStudio from "../components/ChapterExerciseStudio";
import { getChapterExercise } from "../data/chapterExercises";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMarloPageEntrance, animateMarloCards, animateMarloRows } from "../utils/marloAnimations";
import MarloTitle from "../components/MarloTitle";
import MarloNumber from "../components/MarloNumber";
import MarloSegmentedControl from "../components/MarloSegmentedControl";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Code2,
  CornerDownLeft,
  ExternalLink,
  FileText,
  GitBranch,
  HelpCircle,
  Lock,
  Send,
  Sparkles,
  Video,
  X,
  Zap,
  Bot,
  RotateCcw,
  Clock,
  Star,
  PlayCircle,
  Award,
  Check,
  Copy,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Trash2,
  Loader2,
  Globe,
  Layers,
  Database,
  Lightbulb,
  Film,
  Maximize2,
  Minimize2,
  BookOpen,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import {
  askSocraticTutor,
  fetchStudentLearningOverview,
  completeStudentLessonApi,
  type StudentLearningOverview,
  type StudentChapterSubmissionDto,
} from "../api";
import type { ChatSkin, MentorMascot } from "../App";
import {
  SUBJECT_MODULES,
  type SubjectId,
} from "../data/learningCurriculum";
import {
  MULTI_CHAPTER_SUBJECTS,
  type SubjectModuleData,
  type LessonItem,
  type ChapterItem,
} from "../data/multiChapterCurriculum";
import { LessonMindmapStudio } from "../components/LessonMindmapStudio";
import { LessonVideoStudio } from "../components/LessonVideoStudio";
import { CourseCatalogHub } from "../components/CourseCatalogHub";
import { MultiChapterSidebar } from "../components/MultiChapterSidebar";
import LiquidCardConnector from "../components/LiquidCardConnector";
import { triggerMarloConfetti } from "../utils/confetti";
import { HeaderProfileDropdown } from "../components/HeaderProfileDropdown";
import type { AvatarStyle, BadgeFrame, Role, Screen, Theme } from "../App";

interface LearningWorkspaceProps {
  mentorMascot: MentorMascot;
  chatSkin: ChatSkin;
  theme?: Theme;
  onToggleTheme?: () => void;
  role?: Role;
  avatarStyle?: AvatarStyle;
  badgeFrame?: BadgeFrame;
  onNavigate?: (screen: Screen) => void;
  onLogout?: () => void;
  onOpenCommandPalette?: () => void;
}

type Tab = "lecture" | "video" | "quiz" | "exercise" | "mindmap";
type ReadingMode = "full" | "summary" | "resources";

const mentorConfig: Record<MentorMascot, { name: string; mark: string; mode: string; hint: string; emoji: string; color: string }> = {
  mino: { name: "Mino", mark: "MI", mode: "thân thiện", hint: "Mình đi chậm từng bước nhé.", emoji: "🦊", color: "bg-emerald-500" },
  nova: { name: "Nova", mark: "NV", mode: "nghiêm túc", hint: "Tập trung vào lỗi cốt lõi trước.", emoji: "⚡", color: "bg-purple-600" },
  byte: { name: "Byte", mark: "BY", mode: "vui tính", hint: "Bắt lỗi nhỏ trước, lên XP sau.", emoji: "🤖", color: "bg-orange-500" },
  sage: { name: "Sage", mark: "SG", mode: "Socratic", hint: "Mentor sẽ hỏi ngược để bạn tự tìm ra lỗi.", emoji: "🦉", color: "bg-indigo-600" },
  luna: { name: "Mecha-Luna", mark: "LN", mode: "logic / mecha", hint: "Luna đã tối ưu hóa logic này cho bạn.", emoji: "🚀", color: "bg-sky-500" },
  kuro: { name: "Kuro", mark: "KR", mode: "cute / ninja", hint: "Kuro phát hiện lỗi cú pháp rất nhanh nha!", emoji: "🥷", color: "bg-neutral-800" },
  ignis: { name: "Ignis", mark: "IG", mode: "cool / dragon", hint: "Bùng cháy năng lượng lập trình lên nào bạn ơi!", emoji: "🐉", color: "bg-rose-600" },
  sylph: { name: "Sylph", mark: "SP", mode: "kawaii / tiên", hint: "Dạ tiên gió nâng đỡ tư duy của bạn.", emoji: "🧚", color: "bg-teal-500" },
};

export default function LearningWorkspace({
  mentorMascot,
  chatSkin,
  theme = "light",
  onToggleTheme = () => {},
  role = "student",
  avatarStyle = "initials",
  badgeFrame = "streak",
  onNavigate,
  onLogout,
  onOpenCommandPalette,
}: LearningWorkspaceProps) {
  // ── 2-Tier Architecture: "catalog" (F8 Course Hub) or "player" (Course Learning View) ──
  const [workspaceView, setWorkspaceView] = useState<"catalog" | "player">("catalog");
  const [selectedSubjectId, setSelectedSubjectId] = useState<SubjectId>("oop");
  const [activeLessonId, setActiveLessonId] = useState<string>("1.1");
  const [tab, setTab] = useState<Tab>("lecture");

  const workspaceRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const [readingMode, setReadingMode] = useState<ReadingMode>("full");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mentorCollapsed, setMentorCollapsed] = useState<boolean>(false);
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  // Cuộn lên đỉnh mượt mà khi chuyển tab hoặc đổi bài học (không bị trôi vị trí hoặc che video)
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab, activeLessonId]);



  // Quiz state
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizStreak, setQuizStreak] = useState<number>(0);
  const [totalXpEarned, setTotalXpEarned] = useState<number>(3240);
  const [learningOverview, setLearningOverview] = useState<StudentLearningOverview | null>(null);
  const [completingLesson, setCompletingLesson] = useState<boolean>(false);
  const [quizDone, setQuizDone] = useState<boolean>(false);
  const [showXpToast, setShowXpToast] = useState<boolean>(false);
  const quizConfettiRef = useRef<HTMLDivElement>(null);

  // Hydrate student learning overview (XP, completed lessons, chapter submissions, DB courses)
  useEffect(() => {
    let active = true;
    fetchStudentLearningOverview().then((data) => {
      if (!active || !data) return;
      setLearningOverview(data);
      if (typeof data.profile?.exp_points === "number") {
        setTotalXpEarned(data.profile.exp_points);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // AI Mentor Chat State
  const [chatInput, setChatInput] = useState<string>("");
  const [isAskingAi, setIsAskingAi] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<{ from: "mentor" | "user"; text: string }>>([
    {
      from: "mentor",
      text: "Chào bạn! Mình là trợ lý AI Socratic. Mình sẽ cùng bạn phản biện bản chất kỹ thuật của môn học này, gợi mở tư duy chứ tuyệt đối không mớm sẵn lời giải nhé!",
    },
  ]);

  // Merge SQLite courses, AIGC lessons, and completed lesson progress into MULTI_CHAPTER_SUBJECTS
  const resolvedSubjects: SubjectModuleData[] = useMemo(() => {
    const completedSet = new Set(
      (learningOverview?.completed_lessons || []).map((r) => `${r.subject_id}:${r.lesson_id}`)
    );
    const dbCourseMap = new Map(
      (learningOverview?.courses || []).map((c) => [c.subjectId, c])
    );

    return MULTI_CHAPTER_SUBJECTS.map((sub) => {
      const dbCourse = dbCourseMap.get(sub.id);
      const dbChapters: any[] = Array.isArray(dbCourse?.chapters) ? dbCourse.chapters : [];

      const mergedChapters: ChapterItem[] = sub.chapters.map((chap, chIdx) => {
        const dbChap = dbChapters[chIdx];
        const dbLessons: any[] = Array.isArray(dbChap?.lessons) ? dbChap.lessons : [];

        const updatedBaseLessons: LessonItem[] = chap.lessons.map((lesson, lIdx) => {
          const isDoneInDb = completedSet.has(`${sub.id}:${lesson.id}`);
          const dbL = dbLessons[lIdx];
          const dbReading =
            dbL?.isInstructorEdited && dbL?.status === "Đã phát hành" && dbL?.content?.reading
              ? String(dbL.content.reading)
              : null;
          return {
            ...lesson,
            status: isDoneInDb ? "done" : lesson.status,
            lead: dbReading || lesson.lead,
          };
        });

        const extraPublished: LessonItem[] = dbLessons
          .slice(chap.lessons.length)
          .filter((l: any) => l?.status === "Đã phát hành")
          .map((l: any, extraIdx: number) => {
            const extraId = `${chap.number}.${chap.lessons.length + extraIdx + 1}`;
            const isDone = completedSet.has(`${sub.id}:${extraId}`);
            return {
              id: extraId,
              title: l.title || `Bài bổ sung ${extraId}`,
              type: "lecture" as const,
              duration: l.duration || "12 phút",
              status: isDone ? "done" : "active",
              xp: 50,
              objective: l.title || "Nội dung bổ sung do Giảng viên phát hành",
              lead:
                l?.content?.reading ||
                "Nội dung bài giảng mới được Giảng viên biên soạn và phát hành trên SQLite.",
              keyTakeaways: [
                "Hoàn thành phần đọc lý thuyết và thực hành theo hướng dẫn giảng viên.",
              ],
            };
          });

        const allLessons = [...updatedBaseLessons, ...extraPublished];
        const doneCount = allLessons.filter((l) => l.status === "done").length;
        const progressPct =
          allLessons.length > 0 ? Math.round((doneCount / allLessons.length) * 100) : chap.progressPct;

        return {
          ...chap,
          lessons: allLessons,
          progressPct,
        };
      });

      const totalLessonsCount = mergedChapters.reduce((acc, c) => acc + c.lessons.length, 0);
      const totalDoneCount = mergedChapters.reduce(
        (acc, c) => acc + c.lessons.filter((l) => l.status === "done").length,
        0
      );
      const overallProgress =
        totalLessonsCount > 0 ? Math.round((totalDoneCount / totalLessonsCount) * 100) : sub.overallProgress;

      return {
        ...sub,
        instructor: dbCourse?.teacher || sub.instructor,
        chapters: mergedChapters,
        totalLessons: totalLessonsCount,
        overallProgress,
      };
    });
  }, [learningOverview]);

  // Resolve Multi-Chapter Data
  const currentMultiSubject: SubjectModuleData =
    resolvedSubjects.find((m) => m.id === selectedSubjectId) || resolvedSubjects[0];

  let activeChapter: ChapterItem = currentMultiSubject?.chapters?.[0] || {
    id: "default-ch1",
    number: 1,
    title: "Chương 1: Tổng quan",
    description: "Tổng quan học phần",
    duration: "45 phút",
    progressPct: 0,
    lessons: [],
  };
  let activeMultiLesson: LessonItem = activeChapter.lessons?.[0] || {
    id: "1.1",
    title: "Bài học 1.1",
    type: "lecture",
    duration: "15 phút",
    status: "active",
    xp: 50,
    lead: "Nội dung bài học chuẩn bị sẵn sàng.",
    keyTakeaways: ["Nắm vững nguyên lý nền tảng", "Thực hành bài tập", "Kiểm tra kiến thức"],
    resources: [["Tài liệu Tham khảo", "Đặc tả kỹ thuật chính thức.", "https://developer.mozilla.org"]],
  };

  if (currentMultiSubject?.chapters) {
    for (const ch of currentMultiSubject.chapters) {
      const found = (ch.lessons || []).find((l) => l.id === activeLessonId);
      if (found) {
        activeChapter = ch;
        activeMultiLesson = found;
        break;
      }
    }
  }

  const activeDbCourse = learningOverview?.courses.find((c) => c.subjectId === selectedSubjectId);
  const activeDbChapter =
    activeDbCourse?.chapters?.[activeChapter.number - 1] || activeDbCourse?.chapters?.[0];

  const currentChapterExercise = getChapterExercise(
    selectedSubjectId,
    activeChapter.number,
    activeChapter.title,
    currentMultiSubject.code,
    currentMultiSubject.name
  );

  const savedChapterSubmission: StudentChapterSubmissionDto | null = useMemo(() => {
    const subs = learningOverview?.chapter_submissions || [];
    return (
      subs.find(
        (s) =>
          s.subject_id === selectedSubjectId &&
          (s.exercise_id === currentChapterExercise.id || s.chapter_number === activeChapter.number)
      ) || null
    );
  }, [learningOverview, selectedSubjectId, currentChapterExercise.id, activeChapter.number]);

  // Fallback to legacy subject data for quiz questions and audio
  const currentSubject =
    SUBJECT_MODULES.find((m) => m.id === selectedSubjectId) || SUBJECT_MODULES[0];
  const fallbackQuiz = [
    {
      q: `Nguyên lý kiến trúc cốt lõi nào chi phối toàn bộ môn học ${currentMultiSubject?.name || "này"}?`,
      options: [
        { id: "a", text: "Trừu tượng hóa & Tách biệt mối quan tâm (Separation of Concerns)" },
        { id: "b", text: "Ghép nối cứng (Tight Coupling) toàn bộ logic trong một module" },
        { id: "c", text: "Bỏ qua các bước kiểm thử tự động và xử lý lỗi" },
        { id: "d", text: "Sử dụng biến toàn cục cho toàn bộ trạng thái hệ thống" },
      ],
      correct: "a",
      explanation: "Tách biệt mối quan tâm giúp giảm coupling và tăng khả năng bảo trì, mở rộng hệ thống phần mềm.",
    },
  ];
  const activeQuizQuestions = currentMultiSubject?.quizQuestions?.length
    ? currentMultiSubject.quizQuestions
    : (currentSubject?.quizQuestions?.length ? currentSubject.quizQuestions : fallbackQuiz);
  const legacyLesson = currentSubject?.lessons?.[0] || {
    objective: "Nắm vững nguyên lý và cấu trúc kiến trúc cốt lõi.",
    resources: [
      ["Tài liệu Tiêu chuẩn Kỹ thuật", "Tham khảo đặc tả chuẩn quốc tế cho chuyên đề này.", "https://developer.mozilla.org"],
    ],
  };
  const mentor = mentorConfig[mentorMascot];

  // Reset Quiz state whenever switching course or lesson
  useEffect(() => {
    setQuizIndex(0);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setQuizDone(false);
  }, [selectedSubjectId, activeLessonId]);

  // Escape key exits cinema mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCinemaMode) {
        setIsCinemaMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCinemaMode]);

  const handleCopyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const handleQuizSubmit = () => {
    if (!selectedOption) return;
    setQuizSubmitted(true);
    const currQ = activeQuizQuestions[quizIndex];
    if (currQ && selectedOption === currQ.correct) {
      setTotalXpEarned((x) => x + 25);
      setQuizStreak((s) => s + 1);
      setShowXpToast(true);
      setTimeout(() => setShowXpToast(false), 2200);
      triggerMarloConfetti(0.52, 0.45);
      window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "success" } }));
    } else {
      setQuizStreak(0);
      window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "error" } }));
    }
  };

  const handleMarkLessonDone = async () => {
    if (completingLesson) return;
    setCompletingLesson(true);
    try {
      const res = await completeStudentLessonApi({
        subject_id: selectedSubjectId,
        chapter_id: activeChapter.id,
        lesson_id: activeMultiLesson.id,
        xp: activeMultiLesson.xp || 50,
      });
      if (res) {
        setTotalXpEarned(res.total_xp);
        setLearningOverview((prev) => {
          if (!prev) return prev;
          const exists = prev.completed_lessons.some(
            (r) => r.subject_id === selectedSubjectId && r.lesson_id === activeMultiLesson.id
          );
          const nextCompleted = exists
            ? prev.completed_lessons
            : [
                ...prev.completed_lessons,
                {
                  subject_id: selectedSubjectId,
                  chapter_id: activeChapter.id,
                  lesson_id: activeMultiLesson.id,
                  status: "done",
                  quiz_score: 0,
                  quiz_total: 0,
                  xp_earned: res.xp_awarded,
                  completed_at: new Date().toISOString(),
                },
              ];
          return {
            ...prev,
            profile: { ...prev.profile, exp_points: res.total_xp },
            completed_lessons: nextCompleted,
          };
        });
        if (res.xp_awarded > 0) {
          setShowXpToast(true);
          setTimeout(() => setShowXpToast(false), 2200);
          triggerMarloConfetti(0.52, 0.45);
        }
      }
    } finally {
      setCompletingLesson(false);
    }
  };

  const handleNextQuiz = async () => {
    if (quizIndex + 1 >= activeQuizQuestions.length) {
      setQuizDone(true);
      const res = await completeStudentLessonApi({
        subject_id: selectedSubjectId,
        chapter_id: activeChapter.id,
        lesson_id: activeMultiLesson.id,
        xp: activeMultiLesson.xp || 50,
        quiz_score: quizStreak,
        quiz_total: activeQuizQuestions.length,
      });
      if (res) {
        setTotalXpEarned(res.total_xp);
        setLearningOverview((prev) => {
          if (!prev) return prev;
          const exists = prev.completed_lessons.some(
            (r) => r.subject_id === selectedSubjectId && r.lesson_id === activeMultiLesson.id
          );
          const nextCompleted = exists
            ? prev.completed_lessons
            : [
                ...prev.completed_lessons,
                {
                  subject_id: selectedSubjectId,
                  chapter_id: activeChapter.id,
                  lesson_id: activeMultiLesson.id,
                  status: "done",
                  quiz_score: quizStreak,
                  quiz_total: activeQuizQuestions.length,
                  xp_earned: res.xp_awarded,
                  completed_at: new Date().toISOString(),
                },
              ];
          return {
            ...prev,
            profile: { ...prev.profile, exp_points: res.total_xp },
            completed_lessons: nextCompleted,
          };
        });
      }
    } else {
      setQuizIndex((i) => i + 1);
      setSelectedOption(null);
      setQuizSubmitted(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages((prev) => [...prev, { from: "user", text: userMsg }]);
    setIsAskingAi(true);

    try {
      const response = await askSocraticTutor({
        subjectId: selectedSubjectId,
        question: userMsg,
        currentTopic: activeMultiLesson.title,
        chatSkin,
      });
      setMessages((prev) => [...prev, { from: "mentor", text: response.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          from: "mentor",
          text: `Câu hỏi rất hay! Trong môn ${currentMultiSubject.name}, theo bạn yếu tố nào đóng vai trò then chốt trong bài "${activeMultiLesson.title}"?`,
        },
      ]);
    } finally {
      setIsAskingAi(false);
    }
  };

  useMarloPageEntrance(
    workspaceRef,
    (el) => {
      // In player mode, animate initial entrance on mount / subject change
      if (workspaceView === "player") {
        const cards = el.querySelectorAll(".marlo-card, .course-card, .chapter-card, article");
        if (cards.length > 0) {
          animateMarloCards(cards, { stagger: 0.05, y: 22 });
        }
        const rows = el.querySelectorAll(".marlo-row, .lesson-row, .tab-item");
        if (rows.length > 0) {
          animateMarloRows(rows, { y: 12, stagger: 0.025, delay: 0.2 });
        }
      }
    },
    [workspaceView, selectedSubjectId]
  );

  // ═════════════════════════════════════════════════════════════════════════
  // TIER 1: F8 COURSE CATALOG HUB (DANH SÁCH MÔN HỌC BÊN NGOÀI)
  // ═════════════════════════════════════════════════════════════════════════
  if (workspaceView === "catalog") {
    return (
      <div ref={workspaceRef} className="flex h-full min-h-full w-full flex-col bg-transparent text-slate-800 dark:text-slate-100 overflow-hidden font-sans">


        {/* F8 Course Grid Catalog Component */}
        <CourseCatalogHub
          subjects={resolvedSubjects}
          onSelectCourse={(courseId) => {
            setSelectedSubjectId(courseId);
            setActiveLessonId("1.1");
            setWorkspaceView("player");
            window.dispatchEvent(
              new CustomEvent("collapse-sidebar", {
                detail: { collapse: true },
              })
            );
            window.dispatchEvent(
              new CustomEvent("pet-state-change", {
                detail: { state: "happy", text: `Đã mở môn học ${courseId.toUpperCase()}!` },
              })
            );
          }}
        />
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // TIER 2: F8 LEARNING WORKSPACE / PLAYER (TRANG HỌC CỦA MÔN)
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div ref={workspaceRef} className="flex h-full min-h-full w-full flex-col bg-transparent text-slate-800 dark:text-slate-100 p-2.5 sm:p-4 lg:p-4 overflow-hidden font-sans space-y-2.5">
      {/* ── TOP F8 CLEAN WORKSPACE HEADER (SEPARATE FLOATING CARD) ── */}
      <header className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 py-3 shrink-0 shadow-xs z-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Back button & Course identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setWorkspaceView("catalog");
                window.dispatchEvent(
                  new CustomEvent("collapse-sidebar", {
                    detail: { collapse: false },
                  })
                );
              }}
              className="group flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Quay lại danh sách môn học"
            >
              <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1" />
              <span>Danh sách môn học</span>
            </button>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            {/* Course Title Badge */}
            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 ${currentMultiSubject.badgeBg} ${currentMultiSubject.badgeText}`}>
                {currentMultiSubject.code}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                {currentMultiSubject.name}
              </span>
            </div>
          </div>

          {/* Right side: Overall Course Progress, XP, & Mascot */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Tiến độ khóa học</div>
                <div className="text-xs font-bold font-mono text-amber-500 dark:text-amber-400">
                  <MarloNumber value={currentMultiSubject.overallProgress} />% Hoàn thành
                </div>
              </div>
              <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700 relative"
                  style={{ width: `${currentMultiSubject.overallProgress}%` }}
                >
                  <div className="absolute inset-0 f8-shimmer" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono shadow-2xs">
              <Star size={13} className="text-amber-500 fill-amber-500" />
              <span>+<MarloNumber value={totalXpEarned} /> XP</span>
            </div>

            {/* Cinema Mode Focus Toggle (Hiệu ứng 9) */}
            <button
              onClick={() => setIsCinemaMode(!isCinemaMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isCinemaMode
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              title="Chế độ Rạp chiếu phim Focus: Thu gọn sidebar và mở rộng toàn màn hình"
            >
              {isCinemaMode ? <Minimize2 size={13} /> : <Film size={13} />}
              <span className="hidden sm:inline">
                {isCinemaMode ? "Thoát Rạp chiếu phim" : "Tập trung học"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── WORKSPACE BODY WITH DUAL VIEW ── */}
      <div className={`flex flex-1 min-h-0 gap-2.5 lg:gap-3 overflow-hidden transition-all duration-500 ${
        isCinemaMode
          ? "bg-[#161822] bg-[radial-gradient(ellipse_at_top,_rgba(40,49,70,0.55)_0%,_rgba(22,25,35,0.98)_65%,_rgba(18,20,28,1)_100%)] -m-3 sm:-m-5 lg:-m-6 p-4 sm:p-6 lg:p-8 fixed inset-0 z-50 overflow-y-auto"
          : ""
      }`}>
        {/* Minimalist Exit Cinema Mode Icon Button */}
        {isCinemaMode && (
          <button
            onClick={() => setIsCinemaMode(false)}
            className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600/70 text-slate-200 hover:text-white transition shadow-lg cursor-pointer backdrop-blur-md"
            title="Thoát chế độ Rạp chiếu phim (Esc)"
          >
            <Minimize2 size={16} />
          </button>
        )}

        {/* ── LEFT MULTI-CHAPTER ACCORDION SIDEBAR (HIDDEN IN CINEMA MODE) ── */}
        {!isCinemaMode && (
          <MultiChapterSidebar
            subject={currentMultiSubject}
            activeLessonId={activeLessonId}
            activeChapterId={activeChapter.id}
            activeTab={tab}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            onSelectLesson={(lessonId, lessonType) => {
              setActiveLessonId(lessonId);
              if (lessonType) {
                setTab(lessonType);
              }
            }}
            onOpenMindmap={(chapterId) => {
              if (chapterId) {
                const chap = currentMultiSubject.chapters.find((c) => c.id === chapterId);
                if (chap && chap.lessons.length > 0) {
                  setActiveLessonId(chap.lessons[0].id);
                }
              }
              setTab("mindmap");
            }}
            onOpenExercise={(chapterId) => {
              if (chapterId) {
                const chap = currentMultiSubject.chapters.find((c) => c.id === chapterId);
                if (chap && chap.lessons.length > 0) {
                  setActiveLessonId(chap.lessons[0].id);
                }
              }
              setTab("exercise");
            }}
          />
        )}

        {/* ── MAIN STAGE ── */}
        <main
          ref={mainRef}
          className={`flex flex-1 flex-col min-w-0 overflow-y-auto space-y-4 pr-1 relative transition-all duration-300 ${
            isCinemaMode ? "max-w-6xl mx-auto w-full pt-2" : ""
          }`}
        >
          {/* 🌊 Dải sáng chuyển cảnh lan nước khi đổi bài học */}
          <div
            className="pointer-events-none sticky top-0 left-0 right-0 h-[2.5px] -mt-4 -mx-4 lg:-mt-6 lg:-mx-6 z-40 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 opacity-60"
          />

          <div
            className="flex flex-col"
          >
            {/* ── CARD 1: SEPARATE LESSON INFO & BREADCRUMB ── */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3.5 sm:p-4 shadow-xs flex items-center justify-between flex-wrap gap-3 shrink-0 relative z-10">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Chương {activeChapter.number}: {activeChapter.title}
                </span>
                <span className="text-slate-300 dark:text-slate-700 font-bold">/</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  {tab === "exercise" ? (
                    <>
                      <span className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300">
                        <Code2 size={14} />
                      </span>
                      <span>Đề bài tập & Nộp bài Chương {activeChapter.number}</span>
                    </>
                  ) : tab === "mindmap" ? (
                    <>
                      <span className="p-1 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300">
                        <GitBranch size={14} />
                      </span>
                      <span>Sơ đồ Tư duy (Mindmap) Cuối Chương {activeChapter.number}</span>
                    </>
                  ) : (
                    <>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-mono font-bold">
                        {activeMultiLesson.id}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white transition-colors">{activeMultiLesson.title}</span>
                    </>
                  )}
                </span>
              </div>

              {tab === "mindmap" || tab === "exercise" ? (
                <button
                  onClick={() => setTab("lecture")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95 shadow-2xs"
                >
                  <ArrowLeft size={14} />
                  <span>Quay lại bài học ({activeMultiLesson.id})</span>
                </button>
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium">
                    <Clock size={13} /> {activeMultiLesson.duration}
                  </span>
                  <span className="text-xs font-mono text-amber-600 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-md flex items-center gap-1 font-bold">
                    <Star size={13} className="fill-amber-500 text-amber-500" /> +{activeMultiLesson.xp} XP
                  </span>
                </div>
              )}
            </div>

            {/* 🌊 DÒNG CHẤT LỎNG CHẢY TỪ CARD 1 XUỐNG CARD 2 */}
            <LiquidCardConnector />

            {/* ── CARD 2: STANDALONE FLOATING TAB BAR (FIXED TRÊN ĐẦU KHI XEM BÀI ĐỌC, KHÔNG CHE VIDEO) ── */}
            <div
              className={`w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-1.5 sm:p-2 shadow-xs flex items-center justify-between flex-wrap gap-2 shrink-0 transition-all duration-200 ${
                tab === "lecture"
                  ? "sticky top-1 z-30 backdrop-blur-md shadow-md"
                  : "relative z-10"
              }`}
            >
              <MarloSegmentedControl
                value={tab}
                options={[
                  { id: "lecture", label: "Bài đọc", icon: <FileText size={15} /> },
                  { id: "video", label: "Video bài giảng", icon: <Video size={15} /> },
                  { id: "quiz", label: `Quiz (${activeQuizQuestions.length} câu)`, icon: <HelpCircle size={15} /> },
                  { id: "exercise", label: `Bài tập C${activeChapter.number}`, icon: <Code2 size={15} /> },
                  { id: "mindmap", label: "Sơ đồ Tư duy", icon: <GitBranch size={15} /> },
                ]}
                onChange={(val) => setTab(val as Tab)}
                tone="dark"
              />

              {tab === "lecture" && (
                <MarloSegmentedControl
                  value={readingMode}
                  options={[
                    { id: "full", label: "Bài đọc đầy đủ" },
                    { id: "summary", label: "Ý chính cần nắm" },
                    { id: "resources", label: "Tài liệu đọc thêm" },
                  ]}
                  onChange={(val) => setReadingMode(val as ReadingMode)}
                  size="sm"
                  tone="dark"
                />
              )}
            </div>

            {/* 🌊 DÒNG CHẤT LỎNG CHẢY TỪ CARD 2 XUỐNG NỘI DUNG CHÍNH (CARD 3) */}
            <LiquidCardConnector />

          {/* ── TAB 1: BÀI ĐỌC (LECTURE - FULL UNIVERSITY DEPTH) ── */}
          {tab === "lecture" && (
            <article
              key={`lecture-${selectedSubjectId}-${activeLessonId}-${readingMode}`}
              className="animate-screen-enter rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 lg:p-8 shadow-xs space-y-6"
            >
              {readingMode === "full" && (
                <div className="space-y-6 w-full max-w-[1500px] mx-auto">
                  {/* Objective Box - Minimalist Clean Tech Style */}
                  <div
                    className="animate-cascade-item flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
                    style={{ animationDelay: "100ms" }}
                  >
                    <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                        MỤC TIÊU
                      </span>
                      <span>{activeMultiLesson.objective || legacyLesson.objective}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                      <span className="flex items-center gap-1"><Clock size={12} /> {activeMultiLesson.duration}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">+{activeMultiLesson.xp} XP</span>
                    </div>
                  </div>

                  {/* Lesson Heading & Lead */}
                  <div
                    className="animate-cascade-item space-y-2.5 border-b border-slate-100 dark:border-slate-800 pb-5"
                    style={{ animationDelay: "220ms" }}
                  >
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {activeMultiLesson.title}
                    </h1>
                    <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                      {activeMultiLesson.lead}
                    </p>
                  </div>

                  {/* Main Subsections with Code/Model Blocks */}
                  <div className="space-y-6">
                    {/* Code snippet block if present in lesson */}
                    {activeMultiLesson.codeSnippet && (
                      <div
                        className="animate-cascade-item rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-md"
                        style={{ animationDelay: "280ms" }}
                      >
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/90 text-slate-300 text-xs sm:text-sm font-mono">
                          <span className="font-bold text-slate-200 uppercase">{activeMultiLesson.codeSnippet.lang}</span>
                          <button
                            onClick={() => handleCopyCode(activeMultiLesson.codeSnippet!.code, 0)}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition cursor-pointer"
                          >
                            {copiedCodeIndex === 0 ? (
                              <>
                                <Check size={14} className="text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Đã sao chép</span>
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                <span>Sao chép mã</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-4 sm:p-5 text-sm font-mono text-slate-100 leading-relaxed overflow-x-auto">
                          {activeMultiLesson.codeSnippet.code}
                        </pre>
                        {activeMultiLesson.codeSnippet.caption && (
                          <div className="px-4 py-2 bg-slate-900/40 border-t border-slate-800/60 text-xs text-slate-300 italic">
                            {activeMultiLesson.codeSnippet.caption}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key takeaways list - Clean Tech Design */}
                    <div
                      className="animate-cascade-item rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                      style={{ animationDelay: activeMultiLesson.codeSnippet ? "340ms" : "280ms" }}
                    >
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Nguyên lý cốt lõi cần nhớ
                        </h4>
                        <span className="text-xs font-mono text-slate-500">
                          {(activeMultiLesson?.keyTakeaways?.length || 3)} điểm chính
                        </span>
                      </div>
                      <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {(activeMultiLesson?.keyTakeaways?.length ? activeMultiLesson.keyTakeaways : [
                          "Nắm vững nguyên lý và bố cục kiến trúc cốt lõi của bài học.",
                          "Thực hành triển khai code sạch và kiểm chứng trên Docker Sandbox.",
                          "Tối ưu hóa độ phức tạp thời gian/không gian theo chuẩn kỹ sư.",
                        ]).map((point, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-2.5">
                            <span className="font-mono text-xs font-bold text-slate-400 shrink-0 mt-0.5">0{pIdx + 1}.</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Architecture & Anti-Pattern Review - Clean Professional Split Grid */}
                  <div
                    className="animate-cascade-item rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-5 space-y-3.5"
                    style={{ animationDelay: activeMultiLesson.codeSnippet ? "400ms" : "340ms" }}
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Lưu ý kiến trúc & Cạm bẫy thiết kế
                      </span>
                      <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded">
                        Code Review Guidelines
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cột 1: Cạm bẫy / Sai lầm cần tránh */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span>Sai lầm thường gặp (Anti-Pattern)</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-3 border-l-2 border-slate-200 dark:border-slate-800">
                          {activeMultiLesson.antiPattern?.badDesc || legacyLesson?.full?.antiPattern?.badDesc || legacyLesson?.full?.antiPattern?.badTitle || "Lạm dụng thừa kế hoặc phá vỡ tính đóng gói trong các module."}
                        </p>
                      </div>

                      {/* Cột 2: Giải pháp khuyến nghị */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>Giải pháp khuyến nghị</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-3 border-l-2 border-slate-300 dark:border-slate-700">
                          {activeMultiLesson.antiPattern?.solution || legacyLesson?.full?.antiPattern?.solution || "Áp dụng Composition over Inheritance và tuân thủ các nguyên lý SOLID."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Callout Sơ đồ tư duy cuối chương - Neutral Minimalist */}
                  <div
                    className="animate-cascade-item p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between flex-wrap gap-4"
                    style={{ animationDelay: activeMultiLesson.codeSnippet ? "460ms" : "400ms" }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shrink-0">
                        <GitBranch size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Tổng kết kiến thức Chương {activeChapter.number}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Xem Sơ đồ Tư duy (Mindmap) cuối chương để hệ thống hóa kiến thức tóm gọn các nút then chốt.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleMarkLessonDone}
                        disabled={completingLesson || activeMultiLesson.status === "done"}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer active:scale-95 shadow-2xs ${
                          activeMultiLesson.status === "done"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-default"
                            : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                        }`}
                      >
                        <CheckCircle2 size={15} />
                        <span>
                          {activeMultiLesson.status === "done"
                            ? "Đã hoàn thành bài học ✓"
                            : completingLesson
                            ? "Đang lưu tiến độ..."
                            : `Hoàn thành bài học (+${activeMultiLesson.xp || 50} XP)`}
                        </span>
                      </button>

                      <button
                        onClick={() => setTab("mindmap")}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <span>Mở Mindmap Cuối Chương</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode Summary */}
              {readingMode === "summary" && (
                <div className="space-y-4 w-full max-w-[1500px] mx-auto">
                  <div
                    className="animate-cascade-item border-b border-slate-100 dark:border-slate-800 pb-3"
                    style={{ animationDelay: "80ms" }}
                  >
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ý chính cốt lõi (Core Key Takeaways)</h2>
                    <p className="text-xs text-slate-500">Tóm tắt ngắn gọn các nguyên lý then chốt cần ghi nhớ.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(activeMultiLesson?.keyTakeaways?.length ? activeMultiLesson.keyTakeaways : [
                      "Nắm vững nguyên lý và bố cục kiến trúc cốt lõi của bài học.",
                      "Thực hành triển khai code sạch và kiểm chứng trên Docker Sandbox.",
                      "Tối ưu hóa độ phức tạp thời gian/không gian theo chuẩn kỹ sư.",
                    ]).map((point, sIdx) => (
                      <div
                        key={sIdx}
                        className="animate-cascade-item rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2"
                        style={{ animationDelay: `${120 + sIdx * 70}ms` }}
                      >
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/80 px-2 py-0.5 rounded">
                          Điểm then chốt #{sIdx + 1}
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {point}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode Resources */}
              {readingMode === "resources" && (
                <div className="space-y-4 w-full max-w-[1500px] mx-auto">
                  <div
                    className="animate-cascade-item border-b border-slate-100 dark:border-slate-800 pb-3"
                    style={{ animationDelay: "80ms" }}
                  >
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tài liệu tham khảo chuyên ngành (Curated Resources)</h2>
                    <p className="text-xs text-slate-500">Các nguồn tài liệu chính thống RFC, IEEE/ACM và tài liệu chính thức từ hãng.</p>
                  </div>
                  <div className="space-y-3">
                    {(activeMultiLesson?.resources?.length ? activeMultiLesson.resources : (legacyLesson?.resources || [
                      ["Tài liệu Kỹ thuật Chính thống", "Tham khảo đặc tả chuẩn quốc tế cho chuyên đề này.", "https://developer.mozilla.org"],
                    ])).map(([title, desc, url], rIdx) => (
                      <a
                        key={rIdx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="animate-cascade-item flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-300 transition group cursor-pointer"
                        style={{ animationDelay: `${120 + rIdx * 60}ms` }}
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 flex items-center gap-1.5">
                            <span>{title}</span>
                            <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-600" />
                          </h4>
                          <p className="text-xs text-slate-500">{desc}</p>
                        </div>
                        <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 group-hover:underline">Truy cập →</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )}

          {/* ── TAB 2: VIDEO BÀI GIẢNG TƯƠNG TÁC (F8 STYLE) ── */}
          {tab === "video" && (
            <div key={`video-${selectedSubjectId}-${activeLessonId}`} className="animate-screen-enter flex flex-col space-y-4">
              <LessonVideoStudio
                subjectId={selectedSubjectId}
                lessonId={activeMultiLesson.id}
                lessonTitle={activeMultiLesson.title}
                mentorMascot={mentorMascot}
                onNavigateToTab={(targetTab) => {
                  if (targetTab !== "code") {
                    setTab(targetTab as Tab);
                  }
                }}
              />
            </div>
          )}

          {/* ── TAB 3: QUIZ TRẮC NGHIỆM THỰC CHIẾN ── */}
          {tab === "quiz" && (
            <div
              key={`quiz-${selectedSubjectId}-${quizIndex}`}
              className="animate-screen-enter rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs w-full space-y-5 relative"
              style={{ animationDelay: "60ms" }}
              ref={quizConfettiRef}
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Trắc nghiệm Tình huống Kỹ thuật ({quizIndex + 1}/{activeQuizQuestions.length})
                  </h2>
                  <p className="text-xs text-slate-500">Môn: {currentMultiSubject.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {showXpToast && (
                    <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full shadow-xs animate-in fade-in duration-200">
                      +25 XP
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    🔥 Streak: <MarloNumber value={quizStreak} />
                  </span>
                </div>
              </div>

              {!quizDone ? (
                <div className="space-y-4">
                  <p className="animate-cascade-item text-sm font-semibold text-slate-900 dark:text-white" style={{ animationDelay: "120ms" }}>
                    {activeQuizQuestions[quizIndex]?.q}
                  </p>
                  <div className="space-y-2">
                    {activeQuizQuestions[quizIndex]?.options.map((opt, optIdx) => {
                      const isSelected = selectedOption === opt.id;
                      const isCorrect = opt.id === activeQuizQuestions[quizIndex].correct;
                      let btnCls = "border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700";
                      if (quizSubmitted) {
                        if (isCorrect) btnCls = "border-emerald-500 bg-emerald-50 text-emerald-800 font-bold";
                        else if (isSelected && !isCorrect) btnCls = "border-rose-500 bg-rose-50 text-rose-800";
                      } else if (isSelected) {
                        btnCls = "border-blue-600 bg-blue-50 text-blue-800 font-bold ring-1 ring-blue-500";
                      }

                      return (
                        <button
                          key={opt.id}
                          disabled={quizSubmitted}
                          onClick={() => setSelectedOption(opt.id)}
                          className={`marlo-row marlo-item-interactive flex items-center w-full text-left p-3 rounded-xl border text-xs transition cursor-pointer ${btnCls}`}
                          style={{ animationDelay: `${160 + optIdx * 60}ms` }}
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-md font-mono text-[11px] font-bold border border-current mr-3 shrink-0">
                            {opt.id.toUpperCase()}
                          </span>
                          <span>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {quizSubmitted && (
                    <div
                      className="animate-cascade-item p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                      style={{ animationDelay: "380ms" }}
                    >
                      <strong className="text-slate-900 dark:text-white font-bold">Giải thích kỹ thuật:</strong>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {activeQuizQuestions[quizIndex]?.explanation}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-2">
                    {!quizSubmitted ? (
                      <button
                        onClick={handleQuizSubmit}
                        disabled={!selectedOption}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 text-xs transition disabled:opacity-40 cursor-pointer shadow-xs"
                      >
                        Kiểm tra đáp án
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuiz}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 text-xs transition cursor-pointer shadow-xs"
                      >
                        {quizIndex + 1 >= activeQuizQuestions.length ? "Hoàn thành Quiz" : "Câu tiếp theo →"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <Award size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Xuất sắc! Bạn đã hoàn thành bộ Quiz!</h3>
                  <p className="text-xs text-slate-500">Đã cộng +{totalXpEarned} XP vào hồ sơ sinh viên.</p>
                  <button
                    onClick={() => {
                      setQuizIndex(0);
                      setSelectedOption(null);
                      setQuizSubmitted(false);
                      setQuizDone(false);
                    }}
                    className="rounded-xl bg-[#14161a] hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-5 py-2 text-xs font-bold transition cursor-pointer"
                  >
                    Luyện tập lại
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── BÀI TẬP THỰC HÀNH & CODE LAB TỪNG CHƯƠNG ── */}
          {tab === "exercise" && (
            <div key={`exercise-${selectedSubjectId}-${activeChapter.id}`} className="animate-screen-enter flex-1 flex flex-col min-h-0">
              <ChapterExerciseStudio
                subjectId={selectedSubjectId}
                exercise={currentChapterExercise}
                mentorMascot={mentorMascot}
                savedSubmission={savedChapterSubmission}
                onSubmissionSaved={(saved, newTotalXp) => {
                  if (typeof newTotalXp === "number") {
                    setTotalXpEarned(newTotalXp);
                  }
                  setLearningOverview((prev) => {
                    if (!prev) return prev;
                    const filtered = prev.chapter_submissions.filter(
                      (s) => s.exercise_id !== saved.exercise_id
                    );
                    return {
                      ...prev,
                      profile: {
                        ...prev.profile,
                        exp_points:
                          typeof newTotalXp === "number" ? newTotalXp : prev.profile.exp_points,
                      },
                      chapter_submissions: [saved, ...filtered],
                    };
                  });
                }}
                onEarnXp={(xp) => setTotalXpEarned((prev) => prev + xp)}
                onBackToLecture={() => setTab("lecture")}
              />
            </div>
          )}

          {/* ── SƠ ĐỒ TƯ DUY & THỐNG KÊ TIẾN TRÌNH BÀI HỌC (MINDMAP CUỐI CHƯƠNG) ── */}
          {tab === "mindmap" && (
            <div key={`mindmap-${selectedSubjectId}-${activeLessonId}`} className="animate-screen-enter space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 shrink-0">
                    <GitBranch size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Sơ đồ Tư duy (Mindmap) Cuối Chương {activeChapter.number}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {currentMultiSubject.code}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Cây tri thức tóm gọn kiến thức: Càng về các nút nhánh phía sau càng giải thích cô đọng.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setTab("lecture")}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                >
                  <ArrowLeft size={13} />
                  <span>Quay lại bài học ({activeMultiLesson.id})</span>
                </button>
              </div>

              <LessonMindmapStudio
                subjectId={selectedSubjectId}
                mentorMascot={mentorMascot}
                instructorMindmapNodes={activeDbChapter?.mindmapNodes}
                instructorMindmapEdges={activeDbChapter?.mindmapEdges}
                onNavigateToTab={(targetTab) => setTab(targetTab)}
              />
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}