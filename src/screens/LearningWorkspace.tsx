import ServerQuizPanel from "../components/ServerQuizPanel";
import PythonLabPanel from "../components/PythonLabPanel";
import LessonQnaDrawer from "../components/LessonQnaDrawer";
import type { LearningActionTarget } from "../types/learningPlan";
import type { StudentQuizAttempt } from "../api";
import ChapterExerciseStudio from "../components/ChapterExerciseStudio";
import { getChapterExercise } from "../data/chapterExercises";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMarloPageEntrance, animateMarloCards, animateMarloRows } from "../utils/marloAnimations";
import MarloTitle from "../components/MarloTitle";
import MarloNumber from "../components/MarloNumber";
import MarloSegmentedControl from "../components/MarloSegmentedControl";
import MarloToast from "../components/MarloToast";
import {
  AlertCircle,
  ArrowLeft,
  Play,
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
  MessageCircle,
} from "lucide-react";
import {
  fetchStudentLearningOverview,
  completeStudentLessonApi,
  enrollStudentCourseApi,
  getStoredUser,
  saveStudentVideoProgressApi,
  type SocraticWorkspaceContext,
  type StudentLearningOverview,
  type StudentChapterSubmissionDto,
} from "../api";
import type { ChatSkin, MentorMascot, WorkspaceLaunchTarget } from "../App";
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
import {
  CourseClassEnrollModal,
  CourseSyllabusGate,
} from "../components/CourseEnrollmentStudio";
import { MultiChapterSidebar } from "../components/MultiChapterSidebar";
import LiquidCardConnector from "../components/LiquidCardConnector";
import MarloAiChatDrawer from "../components/MarloAiChatDrawer";
import { triggerMarloConfetti } from "../utils/confetti";
import {
  getLessonDisplayCode,
  stripDuplicateChapterPrefix,
  stripDuplicateLessonCode,
} from "../utils/lessonFormat";
import type { Assignment } from "../data/instructorData";
import type { AvatarStyle, BadgeFrame, Role, Screen, Theme } from "../App";

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length >= 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 dark:bg-slate-800/85 border border-slate-200/80 dark:border-slate-700/75 font-mono text-[0.88em] font-semibold text-slate-800 dark:text-slate-100"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length >= 4) {
      return (
        <strong key={i} className="font-bold text-slate-900 dark:text-white">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

function MarkdownLectureBody({ content }: { content: string }) {
  const blocks: React.ReactNode[] = [];
  const codeFenceRe = /```([\w+-]*)\n([\s\S]*?)```/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let keyCounter = 0;

  const pushTextBlocks = (chunk: string) => {
    const lines = chunk.split(/\r?\n/);
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }
      if (line.startsWith("### ")) {
        blocks.push(
          <h4 key={`b-${keyCounter++}`} className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white pt-3">
            <span className="h-3.5 w-1 rounded-full bg-amber-500 shrink-0" />
            <span>{renderInlineMarkdown(line.slice(4))}</span>
          </h4>
        );
        i++;
      } else if (line.startsWith("## ") || line.startsWith("# ")) {
        const clean = line.replace(/^#+\s*/, "");
        blocks.push(
          <h3 key={`b-${keyCounter++}`} className="flex items-center gap-2.5 text-lg font-extrabold text-slate-900 dark:text-white pt-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="h-5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>{renderInlineMarkdown(clean)}</span>
          </h3>
        );
        i++;
      } else if (line.startsWith("> ")) {
        blocks.push(
          <blockquote
            key={`b-${keyCounter++}`}
            className="border-l-[3px] border-amber-500 pl-4 pr-4 py-3 bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-r-xl text-sm text-slate-700 dark:text-slate-200 space-y-1"
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <Lightbulb size={12} />
              Ghi chú trọng tâm
            </span>
            <p className="leading-relaxed font-medium">{renderInlineMarkdown(line.slice(2))}</p>
          </blockquote>
        );
        i++;
      } else if (/^([-*•]|\d+\.)\s+/.test(line)) {
        const items: string[] = [];
        const isOrdered = /^\d+\.\s+/.test(line);
        while (i < lines.length && /^([-*•]|\d+\.)\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^([-*•]|\d+\.)\s+/, ""));
          i++;
        }
        const ListTag = isOrdered ? "ol" : "ul";
        blocks.push(
          <ListTag
            key={`b-${keyCounter++}`}
            className={`space-y-1.5 pl-5 text-sm text-slate-700 dark:text-slate-300 ${
              isOrdered ? "list-decimal" : "list-disc"
            }`}
          >
            {items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {renderInlineMarkdown(item)}
              </li>
            ))}
          </ListTag>
        );
      } else {
        const paraLines: string[] = [];
        while (
          i < lines.length &&
          lines[i].trim() !== "" &&
          !/^(#{1,3}\s+|>\s+|[-*•]\s+|\d+\.\s+)/.test(lines[i].trim())
        ) {
          paraLines.push(lines[i].trim());
          i++;
        }
        blocks.push(
          <p key={`b-${keyCounter++}`} className="text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed">
            {renderInlineMarkdown(paraLines.join(" "))}
          </p>
        );
      }
    }
  };

  while ((match = codeFenceRe.exec(content)) !== null) {
    if (match.index > lastIdx) {
      pushTextBlocks(content.slice(lastIdx, match.index));
    }
    const lang = match[1] || "code";
    const codeText = match[2].trimEnd();
    blocks.push(
      <div key={`b-${keyCounter++}`} className="rounded-xl border border-slate-800 bg-[#0d1117] overflow-hidden shadow-sm">
        <div className="px-3.5 py-2 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-600" />
              <span className="h-2 w-2 rounded-full bg-slate-600" />
              <span className="h-2 w-2 rounded-full bg-amber-500/80" />
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              {lang}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Code Example</span>
        </div>
        <pre className="p-4 text-xs sm:text-sm font-mono text-slate-100 overflow-x-auto leading-relaxed">
          {codeText}
        </pre>
      </div>
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < content.length) {
    pushTextBlocks(content.slice(lastIdx));
  }

  return <div className="space-y-3">{blocks}</div>;
}

interface LearningWorkspaceProps {
  mentorMascot: MentorMascot;
  chatSkin: ChatSkin;
  theme?: Theme;
  onToggleTheme?: () => void;
  role?: Role;
  avatarStyle?: AvatarStyle;
  badgeFrame?: BadgeFrame;
  onNavigate?: (screen: Screen) => void;
  launchTarget?: WorkspaceLaunchTarget | null;
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
  launchTarget,
  onLogout,
  onOpenCommandPalette,
}: LearningWorkspaceProps) {
  // ── 2-Tier Architecture: "catalog" (F8 Course Hub) or "player" (Course Learning View) ──
  const [workspaceView, setWorkspaceView] = useState<"catalog" | "player">("catalog");
  const [selectedSubjectId, setSelectedSubjectId] = useState<SubjectId>("oop");
  const [activeLessonId, setActiveLessonId] = useState<string>("1.1");
  const [tab, setTab] = useState<Tab>("video");

  const workspaceRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const [readingMode, setReadingMode] = useState<ReadingMode>("full");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [tutorOpen, setTutorOpen] = useState<boolean>(false);
  const [pendingTutorPrompt, setPendingTutorPrompt] = useState<string | null>(null);
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  // Cuộn lên đỉnh mượt mà khi chuyển tab hoặc đổi bài học (không bị trôi vị trí hoặc che video)
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab, activeLessonId]);

  const [serverQuizAttempt, setServerQuizAttempt] = useState<StudentQuizAttempt | null>(null);
  const [quizRestartKey, setQuizRestartKey] = useState(0);
  const [quizForceRestart, setQuizForceRestart] = useState(false);
  const handleQuizContext = useCallback((attempt: StudentQuizAttempt | null, index: number) => {
    setServerQuizAttempt(attempt);
    setQuizIndex(index);
    const result = attempt?.results.find(r => r.question_id === attempt.questions[index]?.id);
    setQuizSubmitted(Boolean(result));
    setSelectedOption(result?.selected_option || null);
    setQuizCorrectCount(attempt?.score || 0);
  }, []);
  // Quiz state (tách biệt quizCorrectCount vs quizStreak)
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizStreak, setQuizStreak] = useState<number>(0);
  const [quizCorrectCount, setQuizCorrectCount] = useState<number>(0);
  const [quizHistory, setQuizHistory] = useState<Record<number, "correct" | "wrong">>({});
  const [lastQuizXpAwarded, setLastQuizXpAwarded] = useState<number>(0);
  const [totalXpEarned, setTotalXpEarned] = useState<number>(0);
  const [learningOverview, setLearningOverview] = useState<StudentLearningOverview | null>(null);
  const [completingLesson, setCompletingLesson] = useState<boolean>(false);
  const [quizDone, setQuizDone] = useState<boolean>(false);
  const [showXpToast, setShowXpToast] = useState<boolean>(false);
  const [xpToastAmount, setXpToastAmount] = useState<number>(0);
  const quizConfettiRef = useRef<HTMLDivElement>(null);

  const currentUserId = learningOverview?.user?.id || "student-demo";
  const watchedStorageKey = `codemind_watched_video_lessons_${currentUserId}`;

  // Track watched videos per lesson (key: `${subjectId}_${lessonId}`)
  const [watchedVideoLessonKeys, setWatchedVideoLessonKeys] = useState<Set<string>>(new Set<string>());
  const [videoWatchedSecMap, setVideoWatchedSecMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const nextKeys = new Set<string>();
    const nextSecs: Record<string, number> = {};
    try {
      const raw = localStorage.getItem(watchedStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) parsed.forEach((k) => nextKeys.add(String(k)));
      }
    } catch {
      // Ignore localStorage parse error
    }
    (learningOverview?.video_progress || []).forEach((vp) => {
      const k = `${vp.subject_id}_${vp.lesson_id}`;
      nextSecs[k] = vp.watched_seconds || 0;
      if (vp.completed) {
        nextKeys.add(k);
      }
    });
    setWatchedVideoLessonKeys(nextKeys);
    setVideoWatchedSecMap(nextSecs);
  }, [watchedStorageKey, learningOverview]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [qnaOpen, setQnaOpen] = useState(false);
  const [qnaTotalCount, setQnaTotalCount] = useState(0);
  const handleQnaCountChange = useCallback((total: number) => {
    setQnaTotalCount(total);
  }, []);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((curr) => (curr === msg ? null : curr)), 3500);
  }, []);

  const [enrollModalState, setEnrollModalState] = useState<{
    isOpen: boolean;
    mode: "sections" | "code";
    subject: SubjectModuleData | null;
  }>({
    isOpen: false,
    mode: "sections",
    subject: null,
  });

  const handleEnrolledSuccess = useCallback(
    async (res: { subjectId?: string; sectionCode?: string; message?: string }) => {
      const ov = await fetchStudentLearningOverview();
      if (ov) setLearningOverview(ov);
      showToast(res.message || "✓ Đã đăng ký lớp học phần thành công! Mở khóa toàn bộ bài học.");
      triggerMarloConfetti(0.5, 0.35);
      if (res.subjectId) {
        const targetId = res.subjectId as SubjectId;
        setSelectedSubjectId(targetId);
        const staticSubj = MULTI_CHAPTER_SUBJECTS.find((s) => s.id === targetId);
        const firstLesson = staticSubj?.chapters?.[0]?.lessons?.[0];
        setActiveLessonId(firstLesson?.id || "1.1");
        setTab("video");
        setWorkspaceView("player");
      }
    },
    [showToast]
  );

  const handleVideoCompleted = useCallback((lessonId: string) => {
    const key = `${selectedSubjectId}_${lessonId}`;
    setWatchedVideoLessonKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      try {
        localStorage.setItem(watchedStorageKey, JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error("Failed to persist watched video", e);
      }
      return next;
    });
    showToast("🎉 Đã hoàn tất video bài giảng! Bây giờ bạn có thể hoàn thành bài học / Quiz để nhận XP.");
    triggerMarloConfetti(0.5, 0.4);
  }, [selectedSubjectId, watchedStorageKey, showToast]);

  const handleVideoProgressPersist = useCallback(
    (lessonId: string, watchedSec: number, durationSec: number, completed: boolean) => {
      const key = `${selectedSubjectId}_${lessonId}`;
      setVideoWatchedSecMap((prev) => ({
        ...prev,
        [key]: Math.max(prev[key] || 0, watchedSec),
      }));
      void saveStudentVideoProgressApi({
        subject_id: selectedSubjectId,
        lesson_id: lessonId,
        watched_seconds: watchedSec,
        duration_seconds: durationSec,
        completed,
      });
    },
    [selectedSubjectId]
  );

  // Hydrate student learning overview (XP, completed lessons, video progress, chapter submissions, DB courses)
  useEffect(() => {
    let active = true;
    const hydrateOverview = () => {
      fetchStudentLearningOverview().then((data) => {
        if (!active || !data) return;
        setLearningOverview(data);
        if (typeof data.profile?.exp_points === "number") {
          setTotalXpEarned(data.profile.exp_points);
        }
      });
    };

    hydrateOverview();

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === "codemind-courses-sync-ts") {
        hydrateOverview();
      }
    };

    window.addEventListener("codemind-courses-updated", hydrateOverview);
    window.addEventListener("storage", handleStorageSync);

    return () => {
      active = false;
      window.removeEventListener("codemind-courses-updated", hydrateOverview);
      window.removeEventListener("storage", handleStorageSync);
    };
  }, []);

  // Helper trích xuất mã YouTube Video từ URL hoặc ID
  const extractYoutubeId = (url?: string): string | undefined => {
    if (!url) return undefined;
    const clean = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : undefined;
  };

  // Merge 1-1 từ MySQL courses, AIGC lessons, và tiến độ bài học thực tế
  const resolvedSubjects: SubjectModuleData[] = useMemo(() => {
    const completedSet = new Set(
      (learningOverview?.completed_lessons || []).map((r) => `${r.subject_id}:${r.lesson_id}`)
    );
    const dbCourses = learningOverview?.courses || [];
    const dbCourseMap = new Map(dbCourses.map((c) => [c.subjectId, c]));
    const staticIds = new Set(MULTI_CHAPTER_SUBJECTS.map((s) => s.id));

    const mapDbLesson = (
      subId: string,
      dbL: any,
      fallbackLesson: LessonItem | undefined,
      fallbackId: string
    ): LessonItem & { dbLessonId?: string } => {
      const lessonId = fallbackLesson?.id || dbL?.id || fallbackId;
      const isDoneInDb =
        completedSet.has(`${subId}:${lessonId}`) ||
        (dbL?.id ? completedSet.has(`${subId}:${dbL.id}`) : false);
      const dbContent = dbL?.content || {};
      const readingText = dbContent?.reading ? String(dbContent.reading) : (fallbackLesson?.reading || "");
      const objective = dbContent?.objective ? String(dbContent.objective) : (fallbackLesson?.objective || dbL?.title || "Nội dung bài học");
      const lead = dbContent?.lead ? String(dbContent.lead) : (fallbackLesson?.lead || "");
      const codeSnippet = dbContent?.codeSnippet || fallbackLesson?.codeSnippet;
      const keyTakeaways =
        Array.isArray(dbContent?.keyTakeaways) && dbContent.keyTakeaways.length > 0
          ? dbContent.keyTakeaways
          : fallbackLesson?.keyTakeaways || ["Nắm vững kiến thức trọng tâm của bài học."];
      const antiPattern = dbContent?.antiPattern || fallbackLesson?.antiPattern;
      const youtubeId =
        extractYoutubeId(dbContent?.youtubeUrl) ||
        dbContent?.youtubeId ||
        dbL?.youtubeId ||
        fallbackLesson?.youtubeId;
      const youtubeUrl = dbContent?.youtubeUrl || fallbackLesson?.youtubeUrl;
      const quizzes =
        Array.isArray(dbContent?.quizzes) && dbContent.quizzes.length > 0
          ? dbContent.quizzes
          : fallbackLesson?.quizzes;
      const videoScenes =
        Array.isArray(dbContent?.videoScenes) && dbContent.videoScenes.length > 0
          ? dbContent.videoScenes
          : fallbackLesson?.videoScenes;
      const documents = Array.isArray(dbL?.documents) ? dbL.documents : fallbackLesson?.documents;

      return {
        ...(fallbackLesson || {
          id: lessonId,
          title: dbL?.title || `Bài ${lessonId}`,
          type: "lecture" as const,
          duration: "15 phút",
          status: "active" as const,
          xp: 60,
          objective,
          lead: lead || objective,
          keyTakeaways,
        }),
        id: lessonId,
        dbLessonId: dbL?.id,
        title: dbL?.title || fallbackLesson?.title || `Bài ${lessonId}`,
        duration: dbL?.duration || fallbackLesson?.duration || "15 phút",
        xp: typeof dbL?.xp === "number" ? dbL.xp : (fallbackLesson?.xp || 60),
        status: isDoneInDb ? "done" : "active",
        reading: readingText,
        objective,
        lead,
        codeSnippet,
        keyTakeaways,
        antiPattern,
        youtubeId,
        youtubeUrl,
        quizzes,
        videoScenes,
        documents,
      };
    };

    const mergeSubject = (sub: SubjectModuleData): SubjectModuleData => {
      const dbCourse = dbCourseMap.get(sub.id);
      const allDbChapters: any[] = Array.isArray(dbCourse?.chapters) ? dbCourse.chapters : [];

      let mergedChapters: (ChapterItem & { dbChapterRef?: any; dbAssignment?: Assignment })[];
      if (allDbChapters.length > 0) {
        const publishedDbChapters = allDbChapters.filter((ch) => ch?.status !== "Bản nháp");
        mergedChapters = publishedDbChapters.map((dbChap, chIdx) => {
          const baseChap =
            sub.chapters.find((c) => c.id === dbChap.id) ||
            sub.chapters[chIdx];
          const publishedDbLessons: any[] = (Array.isArray(dbChap?.lessons) ? dbChap.lessons : []).filter(
            (ls: any) => ls?.status !== "Bản nháp"
          );

          const baseLessons = baseChap?.lessons || [];
          const mappedLessons = publishedDbLessons.map((dbL, lIdx) => {
            const titleCodeMatch = String(dbL?.title || "").match(/^(\d+\.\d+)/);
            const matchedBase =
              baseLessons.find((b) => b.id === dbL.id) ||
              (titleCodeMatch ? baseLessons.find((b) => b.id === titleCodeMatch[1]) : undefined) ||
              (lIdx < baseLessons.length ? baseLessons[lIdx] : undefined);
            const fallbackId = `${chIdx + 1}.${lIdx + 1}`;
            return mapDbLesson(sub.id, dbL, matchedBase, fallbackId);
          });

          const doneCount = mappedLessons.filter((l) => l.status === "done").length;
          const progressPct =
            mappedLessons.length > 0 ? Math.round((doneCount / mappedLessons.length) * 100) : 0;

          return {
            id: dbChap.id || baseChap?.id || `${sub.id}-c${chIdx + 1}`,
            number: chIdx + 1,
            title: dbChap.title || baseChap?.title || `Chương ${chIdx + 1}`,
            description: baseChap?.description || `Nội dung Chương ${chIdx + 1} · ${sub.name}`,
            duration: baseChap?.duration || `${Math.max(15, mappedLessons.length * 15)} phút`,
            progressPct,
            lessons: mappedLessons,
            dbChapterRef: dbChap,
            dbAssignment: Array.isArray(dbChap.assignments) ? dbChap.assignments[0] : undefined,
          };
        });
      } else {
        mergedChapters = sub.chapters.map((chap) => {
          const lessonsWithStatus = chap.lessons.map((lesson) => ({
            ...lesson,
            status: (completedSet.has(`${sub.id}:${lesson.id}`) ? "done" : "active") as "done" | "active",
          }));
          const doneCount = lessonsWithStatus.filter((l) => l.status === "done").length;
          const progressPct =
            lessonsWithStatus.length > 0 ? Math.round((doneCount / lessonsWithStatus.length) * 100) : 0;
          return {
            ...chap,
            lessons: lessonsWithStatus,
            progressPct,
          };
        });
      }

      const totalLessonsCount = mergedChapters.reduce((acc, c) => acc + c.lessons.length, 0);
      const totalDoneCount = mergedChapters.reduce(
        (acc, c) => acc + c.lessons.filter((l) => l.status === "done").length,
        0
      );
      const overallProgress =
        totalLessonsCount > 0 ? Math.round((totalDoneCount / totalLessonsCount) * 100) : 0;

      return {
        ...sub,
        instructor: dbCourse?.teacher || sub.instructor,
        semester: dbCourse?.semester || sub.semester,
        stageNumber: dbCourse?.stageNumber ?? sub.stageNumber,
        stageTitle: dbCourse?.stageTitle ?? sub.stageTitle,
        credits: dbCourse?.credits ?? sub.credits,
        enrolled: dbCourses.length > 0 ? Boolean(dbCourse?.enrolled) : Boolean(sub.enrolled),
        sectionId: dbCourse?.sectionId ?? sub.sectionId,
        sectionCode: dbCourse?.sectionCode ?? sub.sectionCode,
        teacher: dbCourse?.teacher || sub.instructor,
        room: dbCourse?.room ?? sub.room,
        chapters: mergedChapters,
        totalChapters: mergedChapters.length,
        totalLessons: totalLessonsCount,
        overallProgress,
      };
    };

    const primaryList = MULTI_CHAPTER_SUBJECTS.map(mergeSubject);

    // Bổ sung bất kỳ khóa học mới nào trong DB mà chưa có trong file tĩnh
    const extraCourses: SubjectModuleData[] = dbCourses
      .filter((dc) => !staticIds.has(dc.subjectId as SubjectId))
      .map((dc) =>
        mergeSubject({
          id: dc.subjectId,
          code: dc.code,
          name: dc.name,
          semester: dc.semester || "Học kỳ 1 / 2026",
          stageNumber: dc.stageNumber ?? 1,
          stageTitle: dc.stageTitle || "Cơ sở cốt lõi",
          credits: dc.credits ?? 3,
          enrolled: dc.enrolled ?? false,
          sectionId: dc.sectionId || dc.id,
          sectionCode: dc.sectionCode || `${dc.code}-N01`,
          teacher: dc.teacher || "Giảng viên Phụ trách",
          room: dc.room || "Lab A3-201",
          category: dc.stageTitle || "Học phần Bổ sung",
          instructor: dc.teacher || "Giảng viên Phụ trách",
          instructorRole: "Giảng viên Học phần",
          instructorAvatar: "",
          bannerGradient: "from-slate-700 via-slate-800 to-slate-900",
          badgeBg: "bg-slate-100 dark:bg-slate-800",
          badgeText: "text-slate-700 dark:text-slate-200",
          totalChapters: dc.chapters?.length || 0,
          totalLessons: 0,
          totalDuration: "Đang cập nhật",
          overallProgress: 0,
          totalXp: 300,
          description: `Khóa học ${dc.name} được đồng bộ trực tiếp từ hệ thống Giảng viên.`,
          chapters: [],
          quizQuestions: [],
        })
      );

    return [...primaryList, ...extraCourses];
  }, [learningOverview]);

  // Xử lý Deep-link từ launchTarget hoặc URL (?course=...&lesson=...&tab=...&tutor=1)
  const lastLaunchNonceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!launchTarget) return;
    if (lastLaunchNonceRef.current === launchTarget.nonce) return;
    lastLaunchNonceRef.current = launchTarget.nonce;

    const targetSubj =
      resolvedSubjects.find((s) => s.id === launchTarget.subjectId) || resolvedSubjects[0];
    if (targetSubj) {
      setSelectedSubjectId(targetSubj.id as SubjectId);
      const allLessons = targetSubj.chapters.flatMap((c) => c.lessons || []) as Array<
        LessonItem & { dbLessonId?: string }
      >;
      const matchedLesson = launchTarget.lessonId
        ? allLessons.find(
            (l) => l.id === launchTarget.lessonId || l.dbLessonId === launchTarget.lessonId
          )
        : allLessons.find((l) => l.status !== "done") || allLessons[0];
      if (matchedLesson) {
        setActiveLessonId(matchedLesson.id);
      }
      setTab(launchTarget.tab || "video");
      if (launchTarget.openTutor) {
        setTutorOpen(true);
      }
      setWorkspaceView("player");
    }
  }, [launchTarget, resolvedSubjects]);

  // Lưu lại môn và bài học gần nhất theo user để tiện resume
  useEffect(() => {
    if (workspaceView !== "player") return;
    try {
      window.localStorage.setItem("codemind-last-subject", selectedSubjectId);
      window.localStorage.setItem(
        `codemind-last-lesson-${currentUserId}-${selectedSubjectId}`,
        activeLessonId
      );
    } catch {
      // Ignore storage errors
    }
  }, [workspaceView, selectedSubjectId, activeLessonId, currentUserId]);

  const [explicitChapterId, setExplicitChapterId] = useState<string | null>(null);

  // Resolve Multi-Chapter Data
  const currentMultiSubject: SubjectModuleData =
    resolvedSubjects.find((m) => m.id === selectedSubjectId) || resolvedSubjects[0];

  let activeChapter: ChapterItem & { dbChapterRef?: any; dbAssignment?: Assignment } =
    (currentMultiSubject?.chapters?.[0] as ChapterItem & {
      dbChapterRef?: any;
      dbAssignment?: Assignment;
    }) || {
      id: "default-ch1",
      number: 1,
      title: "Chương 1: Tổng quan",
      description: "Tổng quan học phần",
      duration: "45 phút",
      progressPct: 0,
      lessons: [],
    };
  let activeMultiLesson: LessonItem & { dbLessonId?: string } = activeChapter.lessons?.[0] || {
    id: "1.1",
    title: "Bài học 1.1",
    type: "lecture",
    duration: "15 phút",
    status: "active",
    xp: 50,
    objective: "Nội dung bài học chuẩn bị sẵn sàng.",
    lead: "Nội dung bài học chuẩn bị sẵn sàng.",
    keyTakeaways: ["Nắm vững nguyên lý nền tảng", "Thực hành bài tập", "Kiểm tra kiến thức"],
    resources: [["Tài liệu Tham khảo", "Đặc tả kỹ thuật chính thức.", "https://developer.mozilla.org"]],
  };

  if (currentMultiSubject?.chapters) {
    let resolvedByLesson = false;
    for (const ch of currentMultiSubject.chapters) {
      const found = (ch.lessons || []).find(
        (l: any) => l.id === activeLessonId || l.dbLessonId === activeLessonId
      );
      if (found) {
        activeChapter = ch as ChapterItem & { dbChapterRef?: any; dbAssignment?: Assignment };
        activeMultiLesson = found as LessonItem & { dbLessonId?: string };
        resolvedByLesson = true;
        break;
      }
    }
    if (explicitChapterId) {
      const explicitCh = currentMultiSubject.chapters.find((c) => c.id === explicitChapterId);
      if (explicitCh && (!resolvedByLesson || explicitCh.lessons.length === 0 || tab === "mindmap" || tab === "exercise")) {
        activeChapter = explicitCh as ChapterItem & { dbChapterRef?: any; dbAssignment?: Assignment };
        if (explicitCh.lessons?.[0]) {
          activeMultiLesson = explicitCh.lessons[0] as LessonItem & { dbLessonId?: string };
        }
      }
    }
  }

  const activeLessonIdx = Math.max(
    0,
    (activeChapter.lessons || []).findIndex((l) => l.id === activeMultiLesson.id)
  );
  const activeDisplayCode = getLessonDisplayCode(
    activeMultiLesson.id,
    activeMultiLesson.title,
    activeChapter.number,
    activeLessonIdx
  );
  const activeCleanLessonTitle = stripDuplicateLessonCode(
    activeMultiLesson.title,
    activeDisplayCode
  );
  const activeCleanChapterTitle = stripDuplicateChapterPrefix(
    activeChapter.title,
    activeChapter.number
  );

  const isLessonDoneInDb = activeMultiLesson.status === "done";
  const videoKey = `${selectedSubjectId}_${activeMultiLesson.id}`;
  const isVideoCompleted = isLessonDoneInDb || watchedVideoLessonKeys.has(videoKey);
  const initialWatchedSeconds = videoWatchedSecMap[videoKey] || 0;

  const activeDbChapter = activeChapter.dbChapterRef;

  const completedSubjectLessonIds = useMemo(() => {
    const ids = new Set<string>();
    (learningOverview?.completed_lessons || []).forEach((r) => {
      if (r.subject_id === selectedSubjectId) ids.add(r.lesson_id);
    });
    return ids;
  }, [learningOverview, selectedSubjectId]);

  const currentChapterExercise = getChapterExercise(
    selectedSubjectId,
    activeChapter.number,
    activeChapter.title,
    currentMultiSubject.code,
    currentMultiSubject.name
  );

  const savedChapterSubmission: StudentChapterSubmissionDto | null = useMemo(() => {
    const subs = learningOverview?.chapter_submissions || [];
    const dbAsgId = activeChapter.dbAssignment?.id;
    return (
      subs.find(
        (s) =>
          s.subject_id === selectedSubjectId &&
          (s.exercise_id === currentChapterExercise.id ||
            (Boolean(dbAsgId) && s.exercise_id === dbAsgId) ||
            s.chapter_number === activeChapter.number)
      ) || null
    );
  }, [learningOverview, selectedSubjectId, currentChapterExercise.id, activeChapter.dbAssignment?.id, activeChapter.number]);

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
  const activeQuizQuestions = useMemo<
    { q: string; options: { id: string; text: string }[]; correct: string; explanation: string }[]
  >(() => {
    if (activeMultiLesson?.quizzes && activeMultiLesson.quizzes.length > 0) {
      const optionLetters = ["a", "b", "c", "d"];
      return activeMultiLesson.quizzes.map((q: any, qIdx: number) => {
        const rawOpts: string[] =
          Array.isArray(q.options) && q.options.length > 0
            ? q.options
            : ["Phương án A", "Phương án B", "Phương án C", "Phương án D"];
        const mappedOpts: { id: string; text: string }[] = rawOpts.map((text: string, oIdx: number) => ({
          id: optionLetters[oIdx] || `opt-${oIdx}`,
          text: String(text),
        }));

        let correctId = "a";
        if (q.correct && ["a", "b", "c", "d"].includes(String(q.correct).toLowerCase())) {
          correctId = String(q.correct).toLowerCase();
        } else if (typeof q.correctIndex === "number" && optionLetters[q.correctIndex]) {
          correctId = optionLetters[q.correctIndex];
        } else if (q.answer) {
          const matchIdx = rawOpts.findIndex(
            (optStr: string) => optStr.trim().toLowerCase() === String(q.answer).trim().toLowerCase()
          );
          if (matchIdx !== -1) {
            correctId = optionLetters[matchIdx];
          }
        }

        return {
          q: q.question || q.q || `Câu hỏi ${qIdx + 1}`,
          options: mappedOpts,
          correct: correctId,
          explanation: q.explanation || "Giải thích chi tiết: Tuân thủ quy chuẩn kiến trúc và bộ nhớ C++.",
        };
      });
    }

    return currentMultiSubject?.quizQuestions?.length
      ? currentMultiSubject.quizQuestions
      : (currentSubject?.quizQuestions?.length ? currentSubject.quizQuestions : fallbackQuiz);
  }, [activeMultiLesson, currentMultiSubject, currentSubject]);
  const legacyLesson = currentSubject?.lessons?.[0] || {
    objective: "Nắm vững nguyên lý và cấu trúc kiến trúc cốt lõi.",
    resources: [
      ["Tài liệu Tiêu chuẩn Kỹ thuật", "Tham khảo đặc tả chuẩn quốc tế cho chuyên đề này.", "https://developer.mozilla.org"],
    ],
  };
  const mentor = mentorConfig[mentorMascot];

  const aiWorkspaceContext = useMemo<SocraticWorkspaceContext>(() => {
    const dbAssign = activeChapter.dbAssignment;
    const activeTestCasesRaw =
      (dbAssign?.testCases && dbAssign.testCases.length > 0
        ? dbAssign.testCases.map((tc) =>
            `${tc.title}${tc.input || tc.expectedOutput ? ` (In: ${tc.input || "—"} -> Out: ${tc.expectedOutput || "—"})` : ""}`
          )
        : (currentChapterExercise.testCases || []).map(
            (tc) => `${tc.title} (In: ${tc.input || "—"} -> Out: ${tc.expected || "—"})`
          )) || [];
    const currentQ = serverQuizAttempt?.questions[quizIndex];
    const currentFeedback = serverQuizAttempt?.results.find(r => r.question_id === currentQ?.id);
    const submissionStatus = savedChapterSubmission
      ? `Đã nộp (${savedChapterSubmission.repo_url}) · ${savedChapterSubmission.instructor_grade != null ? `Điểm giảng viên ${savedChapterSubmission.instructor_grade}/10` : "Chờ giảng viên kiểm tra"}`
      : "Chưa nộp bài";

    return {
      view_mode: workspaceView === "catalog" ? "catalog" : tab,
      subject_id: selectedSubjectId,
      subject_code: currentMultiSubject?.code,
      subject_name: currentMultiSubject?.name,
      chapter_number: activeChapter.number,
      chapter_title: activeCleanChapterTitle,
      lesson_id: activeMultiLesson.dbLessonId || activeMultiLesson.id,
      quiz_attempt_id: serverQuizAttempt?.id,
      lesson_code: activeDisplayCode,
      lesson_title: activeCleanLessonTitle,
      lesson_summary: activeMultiLesson.lead || activeMultiLesson.reading?.slice(0, 450) || "",
      lesson_takeaways: activeMultiLesson.keyTakeaways || [],
      lesson_code_snippet: activeMultiLesson.codeSnippet?.code || "",
      exercise_id: dbAssign?.id || currentChapterExercise.id,
      exercise_title: dbAssign?.title?.trim() || currentChapterExercise.title,
      exercise_language: currentChapterExercise.language,
      exercise_objective: currentChapterExercise.objective,
      exercise_problem:
        dbAssign?.description?.trim() ||
        currentChapterExercise.problemStatement ||
        currentChapterExercise.objective,
      exercise_requirements: currentChapterExercise.requirements || [],
      exercise_hints: currentChapterExercise.hints || [],
      exercise_test_cases: activeTestCasesRaw,
      exercise_submission_status: submissionStatus,
      quiz_index: activeQuizQuestions.length > 0 ? quizIndex + 1 : undefined,
      quiz_total: activeQuizQuestions.length > 0 ? activeQuizQuestions.length : undefined,
      quiz_question: currentQ?.question,
      quiz_options: (currentQ?.options || []).map((opt) => `${opt.id.toUpperCase()}. ${opt.text}`),
      quiz_selected_option: selectedOption ? selectedOption.toUpperCase() : undefined,
      quiz_submitted: quizSubmitted,
      quiz_explanation: currentFeedback?.explanation,
    };
  }, [
    workspaceView,
    tab,
    selectedSubjectId,
    currentMultiSubject,
    activeChapter,
    activeCleanChapterTitle,
    activeDisplayCode,
    activeCleanLessonTitle,
    activeMultiLesson,
    currentChapterExercise,
    savedChapterSubmission,
    activeQuizQuestions,
    serverQuizAttempt,
    quizIndex,
    selectedOption,
    quizSubmitted,
  ]);

  // Reset Quiz state whenever switching course or lesson
  useEffect(() => {
    setServerQuizAttempt(null);
    setQuizIndex(0);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setQuizDone(false);
    setQuizStreak(0);
    setQuizCorrectCount(0);
    setQuizHistory({});
    setLastQuizXpAwarded(0);
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

  const handleMarkLessonDone = async () => {
    if (completingLesson) return;
    setCompletingLesson(true);
    try {
      const result = await completeStudentLessonApi({ subject_id: selectedSubjectId,
        chapter_id: activeChapter.id, lesson_id: activeMultiLesson.dbLessonId || activeMultiLesson.id,
        quiz_attempt_id: serverQuizAttempt?.id });
      if (!result) {
        setTab("quiz");
        showToast("Hoàn thành Quiz được chấm trên server để ghi nhận tiến độ. Nếu chưa có đề, vui lòng liên hệ giảng viên.");
        return;
      }
      setTotalXpEarned(result.total_xp);
      showToast(`Đã ghi nhận hoàn thành bài học. +${result.xp_awarded} XP.`);
      const overview = await fetchStudentLearningOverview();
      if (overview) setLearningOverview(overview);
    } finally { setCompletingLesson(false); }
  };

  const handleLearningAction = (target: LearningActionTarget) => {
    setWorkspaceView("player");
    setSelectedSubjectId(target.subject_id as SubjectId);
    const subject = resolvedSubjects.find(s => s.id === target.subject_id);
    const lesson = subject?.chapters.flatMap(c => c.lessons as (LessonItem & { dbLessonId?: string })[])
      .find(l => l.id === target.lesson_id || l.dbLessonId === target.lesson_id || l.id === target.lesson_code);
    if (lesson) setActiveLessonId(lesson.id);
    else if (target.lesson_code) setActiveLessonId(target.lesson_code);
    else if (target.chapter_number) {
      const first = subject?.chapters.find(c => c.number === target.chapter_number)?.lessons[0];
      if (first) setActiveLessonId(first.id);
    }
    const next = target.view_mode;
    if (["lecture", "quiz", "exercise", "video", "mindmap"].includes(next)) setTab(next as Tab);
    if (next === "quiz") { setServerQuizAttempt(null); setQuizForceRestart(true); setQuizRestartKey(k => k + 1); }
    setTutorOpen(false);
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
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-4 py-2 text-xs font-bold shadow-lg toast-slide-up">
            {toastMessage}
          </div>
        )}
        <CourseCatalogHub
          subjects={resolvedSubjects}
          splitByEnrollment={role === "student"}
          onEnrollCourse={
            role === "student"
              ? (sub) =>
                  setEnrollModalState({
                    isOpen: true,
                    mode: "sections",
                    subject: sub,
                  })
              : undefined
          }
          onOpenJoinByCode={
            role === "student"
              ? () =>
                  setEnrollModalState({
                    isOpen: true,
                    mode: "code",
                    subject: null,
                  })
              : undefined
          }
          onSelectCourse={(courseId) => {
            setSelectedSubjectId(courseId);
            const subj = resolvedSubjects.find((s) => s.id === courseId);
            const allLessons = (subj?.chapters || []).flatMap((c) => c.lessons || []);
            const savedLastId =
              typeof window !== "undefined"
                ? window.localStorage.getItem(`codemind-last-lesson-${currentUserId}-${courseId}`)
                : null;
            const resumeLesson =
              (savedLastId && allLessons.find((l) => l.id === savedLastId)) ||
              allLessons.find((l) => l.status !== "done") ||
              allLessons[0];
            setActiveLessonId(resumeLesson?.id || "1.1");
            setTab("video");
            setWorkspaceView("player");
            window.dispatchEvent(
              new CustomEvent("pet-state-change", {
                detail: { state: "happy", text: `Đã mở môn học ${courseId.toUpperCase()}!` },
              })
            );
          }}
        />
        <CourseClassEnrollModal
          isOpen={enrollModalState.isOpen}
          initialMode={enrollModalState.mode}
          subject={enrollModalState.subject}
          onClose={() =>
            setEnrollModalState((prev) => ({ ...prev, isOpen: false }))
          }
          onEnrolledSuccess={handleEnrolledSuccess}
        />
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // CHẶN HỌC CHÙA: NẾU HỌC VIÊN CHƯA ĐĂNG KÝ -> CHỈ HIỆN TRANG ĐỀ CƯƠNG BỊ KHÓA 🔒
  // ═════════════════════════════════════════════════════════════════════════
  if (role === "student" && currentMultiSubject.enrolled === false) {
    return (
      <div ref={workspaceRef} className="flex h-full min-h-full w-full flex-col bg-transparent text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-4 py-2 text-xs font-bold shadow-lg toast-slide-up">
            {toastMessage}
          </div>
        )}
        <CourseSyllabusGate
          subject={currentMultiSubject}
          onBackToCatalog={() => setWorkspaceView("catalog")}
          onOpenEnrollModal={(mode) =>
            setEnrollModalState({
              isOpen: true,
              mode,
              subject: currentMultiSubject,
            })
          }
        />
        <CourseClassEnrollModal
          isOpen={enrollModalState.isOpen}
          initialMode={enrollModalState.mode}
          subject={enrollModalState.subject || currentMultiSubject}
          onClose={() =>
            setEnrollModalState((prev) => ({ ...prev, isOpen: false }))
          }
          onEnrolledSuccess={handleEnrolledSuccess}
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
            onSelectLesson={(lessonId) => {
              setExplicitChapterId(null);
              setActiveLessonId(lessonId);
              setTab("video");
            }}
            onOpenMindmap={(chapterId) => {
              if (chapterId) {
                setExplicitChapterId(chapterId);
                const chap = currentMultiSubject.chapters.find((c) => c.id === chapterId);
                if (chap && chap.lessons.length > 0) {
                  setActiveLessonId(chap.lessons[0].id);
                }
              }
              setTab("mindmap");
            }}
            onOpenExercise={(chapterId) => {
              if (chapterId) {
                setExplicitChapterId(chapterId);
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
          className={`flex flex-1 flex-col min-w-0 overflow-y-auto space-y-4 pr-1 pb-24 relative transition-all duration-300 ${
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
                  Chương {activeChapter.number}: {activeCleanChapterTitle}
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
                      <span className="inline-flex min-w-[28px] h-5 px-2 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[11px] font-mono font-bold">
                        {activeDisplayCode}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white transition-colors">
                        {activeCleanLessonTitle}
                      </span>
                    </>
                  )}
                </span>
              </div>

              {tab === "mindmap" || tab === "exercise" ? (
                <button
                  onClick={() => setTab("video")}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95 shadow-2xs"
                >
                  <ArrowLeft size={14} />
                  <span>Quay lại bài học ({activeDisplayCode})</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQnaOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#fff3ee] hover:bg-[#ffe5db] dark:bg-[#332019] dark:hover:bg-[#42281f] border border-[#f8c7b6] dark:border-[#6e3a28] px-3 py-1 text-xs font-bold text-[#f05123] dark:text-[#ff8563] transition cursor-pointer"
                  >
                    <MessageCircle size={13} />
                    <span>Hỏi đáp</span>
                    {qnaTotalCount > 0 && (
                      <span className="rounded-full bg-[#f05123] px-1.5 py-0.2 text-[10px] font-extrabold text-white">
                        {qnaTotalCount}
                      </span>
                    )}
                  </button>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium">
                    <Clock size={13} /> {activeMultiLesson.duration}
                  </span>
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/70 px-2.5 py-1 rounded-md flex items-center gap-1 font-bold">
                    <Star size={13} className="text-slate-500 dark:text-slate-300" /> +{activeMultiLesson.xp} XP
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
              <div className="max-w-full overflow-x-auto no-scrollbar">
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
              </div>

              {tab === "lecture" && (
                <div className="max-w-full overflow-x-auto no-scrollbar">
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
                </div>
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
                  {/* Objective Box - Editorial Accent Callout */}
                  <div
                    className="animate-cascade-item flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 border-l-[3px] border-l-amber-500 shadow-2xs"
                    style={{ animationDelay: "100ms" }}
                  >
                    <div className="flex items-start gap-3 text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#14161a] dark:bg-white text-white dark:text-[#14161a] border border-transparent shrink-0 mt-0.5 uppercase tracking-wider">
                        Mục tiêu
                      </span>
                      <span className="font-medium">{activeMultiLesson.objective || legacyLesson.objective}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <Clock size={12} /> {activeMultiLesson.duration}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200">
                        <Star size={11} className="text-slate-500 dark:text-slate-400" /> +{activeMultiLesson.xp} XP
                      </span>
                    </div>
                  </div>

                  {/* Lesson Heading, Lead & Full Markdown Reading */}
                  <div
                    className="animate-cascade-item space-y-4 border-b border-slate-100 dark:border-slate-800 pb-6"
                    style={{ animationDelay: "220ms" }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#14161a] dark:bg-white text-white dark:text-slate-950 font-mono text-[11px] font-bold">
                        {currentMultiSubject.code} · {activeDisplayCode}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                        Chương {activeChapter.number}: {activeCleanChapterTitle}
                      </span>
                    </div>

                    <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                      {activeCleanLessonTitle}
                    </h1>
                    {activeMultiLesson.lead && (
                      <p className="text-[15px] sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal pl-4 border-l-2 border-amber-400/85">
                        {activeMultiLesson.lead}
                      </p>
                    )}
                    {activeMultiLesson.reading &&
                      activeMultiLesson.reading.trim() !== (activeMultiLesson.lead || "").trim() && (
                        <div className="pt-2">
                          <MarkdownLectureBody content={activeMultiLesson.reading} />
                        </div>
                      )}
                  </div>

                  {/* Attached Documents from Instructor */}
                  {activeMultiLesson.documents && activeMultiLesson.documents.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-2.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <FileText size={13} className="text-blue-500" />
                        <span>Tài liệu bài giảng Giảng viên đính kèm ({activeMultiLesson.documents.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeMultiLesson.documents.map((doc, dIdx) => (
                          <div
                            key={`${doc.name}-${dIdx}`}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={14} className="text-blue-600 shrink-0" />
                              <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                {doc.name}
                              </span>
                            </div>
                            <span className="font-mono text-[10.5px] text-slate-400 shrink-0">
                              {doc.size || "PDF/DOC"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main Subsections with Code/Model Blocks */}
                  <div className="space-y-6">
                    {/* Code snippet block if present in lesson */}
                    {activeMultiLesson.codeSnippet && (
                      <div
                        className="animate-cascade-item rounded-xl border border-slate-800 bg-[#0d1117] overflow-hidden shadow-md"
                        style={{ animationDelay: "280ms" }}
                      >
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/95 text-slate-300 text-xs sm:text-sm font-mono">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center gap-1">
                              <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                              <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                            </span>
                            <span className="font-bold text-amber-400 uppercase tracking-wider text-xs">
                              {activeMultiLesson.codeSnippet.lang}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopyCode(activeMultiLesson.codeSnippet!.code, 0)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs transition cursor-pointer"
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
                          <div className="px-4 py-2.5 bg-slate-900/60 border-t border-slate-800/80 text-xs text-slate-300 flex items-center gap-2">
                            <Terminal size={13} className="text-amber-400 shrink-0" />
                            <span>{activeMultiLesson.codeSnippet.caption}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key takeaways list - Editorial Numbered Cards */}
                    <div
                      className="animate-cascade-item rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-5 space-y-3.5"
                      style={{ animationDelay: activeMultiLesson.codeSnippet ? "340ms" : "280ms" }}
                    >
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-1 rounded-full bg-amber-500" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            Nguyên lý cốt lõi cần nhớ
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-0.5 rounded-full">
                          {(activeMultiLesson?.keyTakeaways?.length || 3)} điểm chính
                        </span>
                      </div>
                      <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {(activeMultiLesson?.keyTakeaways?.length ? activeMultiLesson.keyTakeaways : [
                          "Nắm vững nguyên lý và bố cục kiến trúc cốt lõi của bài học.",
                          "Thực hành triển khai code sạch và kiểm chứng trên Docker Sandbox.",
                          "Tối ưu hóa độ phức tạp thời gian/không gian theo chuẩn kỹ sư.",
                        ]).map((point, pIdx) => (
                          <li
                            key={pIdx}
                            className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                          >
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 font-mono text-[11px] font-bold shrink-0 mt-0.5">
                              {String(pIdx + 1).padStart(2, "0")}
                            </span>
                            <span className="pt-0.5">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Architecture & Anti-Pattern Review - Editorial Split Grid */}
                  <div
                    className="animate-cascade-item rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-5 space-y-3.5"
                    style={{ animationDelay: activeMultiLesson.codeSnippet ? "400ms" : "340ms" }}
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-1 rounded-full bg-amber-500" />
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          Lưu ý kiến trúc & Cạm bẫy thiết kế
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-0.5 rounded-full">
                        Code Review Guidelines
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cột 1: Cạm bẫy / Sai lầm cần tránh */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 border-t-[3px] border-t-rose-500 bg-white dark:bg-slate-900 p-4 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 shrink-0">
                              <AlertCircle size={13} />
                            </span>
                            <span>Sai lầm thường gặp</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                            Anti-Pattern
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {activeMultiLesson.antiPattern?.badDesc || legacyLesson?.full?.antiPattern?.badDesc || legacyLesson?.full?.antiPattern?.badTitle || "Lạm dụng thừa kế hoặc phá vỡ tính đóng gói trong các module."}
                        </p>
                      </div>

                      {/* Cột 2: Giải pháp khuyến nghị */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 border-t-[3px] border-t-emerald-500 bg-white dark:bg-slate-900 p-4 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 shrink-0">
                              <CheckCircle2 size={13} />
                            </span>
                            <span>Giải pháp khuyến nghị</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Best Practice
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {activeMultiLesson.antiPattern?.solution || legacyLesson?.full?.antiPattern?.solution || "Áp dụng Composition over Inheritance và tuân thủ các nguyên lý SOLID."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Callout Sơ đồ tư duy cuối chương - Neutral Minimalist */}
                  <div
                    className="animate-cascade-item p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    style={{ animationDelay: activeMultiLesson.codeSnippet ? "460ms" : "400ms" }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shrink-0 mt-0.5">
                        <GitBranch size={18} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Tổng kết kiến thức Chương {activeChapter.number}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Xem Sơ đồ Tư duy (Mindmap) cuối chương để hệ thống hóa kiến thức tóm gọn các nút then chốt.
                        </p>
                        {!isLessonDoneInDb && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                            <AlertCircle size={13} className="shrink-0" />
                            <span>Bài có Quiz cần đạt tối thiểu 60% theo kết quả chấm trên server; tiến độ xem video được theo dõi riêng.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {(
                        <button
                          type="button"
                          onClick={handleMarkLessonDone}
                          disabled={completingLesson || isLessonDoneInDb}
                          className={`px-4 py-2.5 font-bold text-xs sm:text-sm flex items-center gap-2 transition ${
                            isLessonDoneInDb
                              ? "rounded-full bg-slate-100 dark:bg-white/[0.07] text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-white/[0.12] cursor-default"
                              : "rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
                          }`}
                        >
                          {isLessonDoneInDb ? (
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                          <span>
                            {isLessonDoneInDb
                              ? "Đã hoàn thành bài học"
                              : completingLesson
                              ? "Đang lưu tiến độ..."
                              : `Hoàn thành bài học (+${activeMultiLesson.xp || 50} XP)`}
                          </span>
                        </button>
                      )}

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
                    className="animate-cascade-item flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3"
                    style={{ animationDelay: "80ms" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-5 w-1.5 rounded-full bg-amber-500" />
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ý chính cốt lõi (Core Key Takeaways)</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Tóm tắt ngắn gọn các nguyên lý then chốt cần ghi nhớ.</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(activeMultiLesson?.keyTakeaways?.length ? activeMultiLesson.keyTakeaways : [
                      "Nắm vững nguyên lý và bố cục kiến trúc cốt lõi của bài học.",
                      "Thực hành triển khai code sạch và kiểm chứng trên Docker Sandbox.",
                      "Tối ưu hóa độ phức tạp thời gian/không gian theo chuẩn kỹ sư.",
                    ]).map((point, sIdx) => (
                      <div
                        key={sIdx}
                        className="animate-cascade-item rounded-xl border border-slate-200 dark:border-slate-800 border-l-[3px] border-l-slate-900 dark:border-l-slate-300 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                        style={{ animationDelay: `${120 + sIdx * 70}ms` }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-0.5 rounded-md">
                            Điểm then chốt {String(sIdx + 1).padStart(2, "0")}
                          </span>
                          <Zap size={13} className="text-slate-400" />
                        </div>
                        <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
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
                    className="animate-cascade-item flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3"
                    style={{ animationDelay: "80ms" }}
                  >
                    <span className="h-5 w-1.5 rounded-full bg-slate-900 dark:bg-slate-200" />
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tài liệu tham khảo chuyên ngành (Curated Resources)</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Các nguồn tài liệu chính thống RFC, IEEE/ACM và tài liệu chính thức từ hãng.</p>
                    </div>
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
                        className="animate-cascade-item flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition group cursor-pointer shadow-2xs"
                        style={{ animationDelay: `${120 + rIdx * 60}ms` }}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-mono text-[11px] font-bold shrink-0 mt-0.5">
                            {String(rIdx + 1).padStart(2, "0")}
                          </span>
                          <div className="space-y-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 transition-colors">
                              <span>{title}</span>
                              <ExternalLink size={12} className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0" />
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-950 transition shrink-0">
                          Truy cập →
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </article>
          )}

          {/* ── TAB 2: VIDEO BÀI GIẢNG TƯƠNG TÁC (F8 STYLE) ── */}
          {tab === "video" && (
            <div key={`video-${selectedSubjectId}-${activeLessonId}`} className="flex flex-col space-y-4 w-full">
              <LessonVideoStudio
                subjectId={selectedSubjectId}
                userId={currentUserId}
                lessonId={activeMultiLesson.id}
                lessonTitle={activeMultiLesson.title}
                instructorName={currentMultiSubject.instructor}
                lessonDescription={activeMultiLesson.lead || activeMultiLesson.objective}
                lessonDocuments={activeMultiLesson.documents}
                quizCount={activeQuizQuestions.length}
                initialWatchedSeconds={initialWatchedSeconds}
                mentorMascot={mentorMascot}
                customYoutubeId={activeMultiLesson.youtubeId}
                customScenes={activeMultiLesson.videoScenes}
                isVideoCompleted={isVideoCompleted}
                onVideoCompleted={handleVideoCompleted}
                onVideoProgressChange={(watchedSec, durationSec, completed) =>
                  handleVideoProgressPersist(activeMultiLesson.id, watchedSec, durationSec, completed)
                }
                onNavigateToTab={(targetTab) => {
                  if (targetTab !== "code") {
                    setTab(targetTab as Tab);
                  }
                }}
              />
            </div>
          )}

          {tab === "quiz" && (
            <ServerQuizPanel
              key={`${selectedSubjectId}:${activeMultiLesson.dbLessonId || activeMultiLesson.id}:${quizRestartKey}`}
              subjectId={selectedSubjectId}
              lessonId={activeMultiLesson.dbLessonId || activeMultiLesson.id}
              initialRestart={quizForceRestart}
              onRestartConsumed={() => setQuizForceRestart(false)}
              onContext={handleQuizContext}
              onCompleted={() => {
                void fetchStudentLearningOverview().then(data => {
                  if (data) { setLearningOverview(data); setTotalXpEarned(data.profile.exp_points); }
                });
              }}
              onAskTutor={() => { setPendingTutorPrompt("Giúp tôi ôn lại phần còn sai dựa trên kết quả Quiz đã lưu, rồi gợi ý việc cần làm tiếp theo."); setTutorOpen(true); }}
            />
          )}

          {/* ── BÀI TẬP THỰC HÀNH & CODE LAB TỪNG CHƯƠNG ── */}
          {tab === "exercise" && (
            <div key={`exercise-${selectedSubjectId}-${activeChapter.id}`} className="animate-screen-enter flex-1 flex flex-col min-h-0">
              {currentChapterExercise.language === "python" && (
                <PythonLabPanel
                  key={`${selectedSubjectId}:${activeChapter.id}`}
                  exerciseId={activeChapter.dbAssignment?.id || currentChapterExercise.id}
                  initialCode={currentChapterExercise.initialCode}
                  onAskTutor={() => { setPendingTutorPrompt("Phân tích các test đã chạy chưa đạt của bài tập hiện tại và gợi ý từng bước để tôi tự sửa."); setTutorOpen(true); }}
                />
              )}
              <ChapterExerciseStudio
                subjectId={selectedSubjectId}
                exercise={currentChapterExercise}
                dbAssignment={activeChapter.dbAssignment}
                mentorMascot={mentorMascot}
                savedSubmission={savedChapterSubmission}
                onSubmissionSaved={(saved, newTotalXp) => {
                  if (typeof newTotalXp === "number") {
                    setTotalXpEarned(newTotalXp);
                  }
                  setLearningOverview((prev) => {
                    if (!prev) return prev;
                    const filtered = prev.chapter_submissions.filter(
                      (s) => !(s.subject_id === selectedSubjectId && s.chapter_number === saved.chapter_number)
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
                onAskAiExercise={(prompt) => {
                  setPendingTutorPrompt(
                    prompt || "Gợi ý giúp mình các bước tiếp cận bài tập này nhé!"
                  );
                  setTutorOpen(true);
                }}
              />
            </div>
          )}

          {/* ── SƠ ĐỒ TƯ DUY & THỐNG KÊ TIẾN TRÌNH BÀI HỌC (MINDMAP CUỐI CHƯƠNG) ── */}
          {tab === "mindmap" && (
            <div key={`mindmap-${selectedSubjectId}-${activeChapter.id}`} className="animate-screen-enter space-y-4">
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
                  onClick={() => setTab("video")}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                >
                  <ArrowLeft size={13} />
                  <span>Quay lại bài học ({activeDisplayCode})</span>
                </button>
              </div>

              <LessonMindmapStudio
                subjectId={selectedSubjectId}
                chapterTitle={activeChapter.title}
                chapterLessonIds={activeChapter.lessons.map((l, lIdx) =>
                  getLessonDisplayCode(l.id, l.title, activeChapter.number, lIdx)
                )}
                mentorMascot={mentorMascot}
                instructorMindmapNodes={activeDbChapter?.mindmapNodes}
                instructorMindmapEdges={activeDbChapter?.mindmapEdges}
                completedLessonIds={completedSubjectLessonIds}
                onNavigateToTab={(targetTab) => setTab(targetTab)}
              />
            </div>
          )}
          </div>
        </main>
      </div>

      {/* ── NÚT HỎI ĐÁP CỘNG ĐỒNG KIỂU F8 + NÚT AI SOCRATIC MENTOR ── */}
      {!tutorOpen && !qnaOpen && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setQnaOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-slate-50 dark:bg-[#22242a] dark:hover:bg-[#2a2d35] border border-slate-200/95 dark:border-slate-700 px-4 py-2.5 text-[13px] font-bold text-[#f05123] dark:text-[#ff7b54] shadow-lg transition cursor-pointer"
            title="Hỏi đáp & bình luận bài học cùng lớp và Giảng viên"
          >
            <MessageCircle size={17} className="fill-[#f05123]/15" />
            <span>Hỏi đáp</span>
            {qnaTotalCount > 0 && (
              <span className="rounded-full bg-[#f05123] px-1.5 py-0.5 text-[10.5px] font-extrabold leading-none text-white">
                {qnaTotalCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTutorOpen(true)}
            className="marlo-ai-launcher group inline-flex items-center gap-2.5 rounded-full pl-1.5 pr-3 py-1.5 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            aria-label={`Hỏi ${mentor.name} · Socratic AI`}
            title="Hỏi đáp phản biện Socratic với AI Mentor"
          >
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#16171a] dark:bg-[#f2f3f5] text-[#f5b041] dark:text-[#d97706] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              <Sparkles size={15} strokeWidth={2.1} />
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#181a1f]"
              />
            </span>
            <span className="flex flex-col items-start text-left leading-none">
              <span className="text-[12.5px] font-bold tracking-[-0.015em] text-[#16171a] dark:text-[#f4f4f6]">
                Hỏi {mentor.name}
              </span>
              <span className="mt-0.5 text-[10.5px] font-medium text-[#666b74] dark:text-[#989da6]">
                Socratic AI
              </span>
            </span>
            <span
              aria-hidden="true"
              className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/[0.045] dark:bg-white/[0.08] text-[#555a64] dark:text-[#b4b9c2] transition-transform duration-200 group-hover:translate-x-0.5"
            >
              <ArrowRight size={12} strokeWidth={2.2} />
            </span>
          </button>
        </div>
      )}

      {/* F8-Style Facebook Comment Thread Q&A Drawer */}
      <LessonQnaDrawer
        isOpen={qnaOpen}
        onClose={() => setQnaOpen(false)}
        subjectId={selectedSubjectId}
        subjectCode={currentMultiSubject?.code}
        subjectName={currentMultiSubject?.name}
        lessonId={activeDisplayCode}
        lessonTitle={activeCleanLessonTitle}
        role={role}
        onJumpToTimestamp={() => {
          setQnaOpen(false);
          setTab("video");
        }}
        onCommentCountChange={handleQnaCountChange}
      />

      {/* Marlo Authentic Chat Drawer - 1:1 replica từ D:\C++\quản lí dự án\marlo-app */}
      <MarloAiChatDrawer
        onLearningAction={handleLearningAction}
        isOpen={tutorOpen}
        onClose={() => setTutorOpen(false)}
        mentor={mentor}
        activeTopic={activeMultiLesson.title}
        subjectId={selectedSubjectId}
        subjectName={currentMultiSubject?.name}
        workspaceContext={aiWorkspaceContext}
        initialPrompt={pendingTutorPrompt}
        onInitialPromptConsumed={() => setPendingTutorPrompt(null)}
        currentUserName={
          learningOverview?.user?.name ||
          getStoredUser("student")?.full_name ||
          "Học viên"
        }
      />

      {toastMessage && (
        <MarloToast
          message={toastMessage}
          showUndo={false}
        />
      )}
    </div>
  );
}
