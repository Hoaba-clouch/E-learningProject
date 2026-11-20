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
  MessageSquareText,
} from "lucide-react";
import {
  fetchStudentLearningOverview,
  completeStudentLessonApi,
  saveStudentVideoProgressApi,
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
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[0.9em] text-amber-700 dark:text-amber-300"
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
          <h4 key={`b-${keyCounter++}`} className="text-base font-bold text-slate-900 dark:text-white pt-2">
            {renderInlineMarkdown(line.slice(4))}
          </h4>
        );
        i++;
      } else if (line.startsWith("## ") || line.startsWith("# ")) {
        const clean = line.replace(/^#+\s*/, "");
        blocks.push(
          <h3 key={`b-${keyCounter++}`} className="text-lg font-extrabold text-slate-900 dark:text-white pt-3 border-b border-slate-100 dark:border-slate-800 pb-1.5">
            {renderInlineMarkdown(clean)}
          </h3>
        );
        i++;
      } else if (line.startsWith("> ")) {
        blocks.push(
          <blockquote
            key={`b-${keyCounter++}`}
            className="border-l-4 border-amber-500 pl-4 py-1.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-r-lg text-sm italic text-slate-700 dark:text-slate-300"
          >
            {renderInlineMarkdown(line.slice(2))}
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
      <div key={`b-${keyCounter++}`} className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xs">
        <div className="px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono font-bold text-slate-300 uppercase">
          {lang}
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
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  // Cuộn lên đỉnh mượt mà khi chuyển tab hoặc đổi bài học (không bị trôi vị trí hoặc che video)
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab, activeLessonId]);

  // Quiz state (tách biệt quizCorrectCount vs quizStreak)
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizStreak, setQuizStreak] = useState<number>(0);
  const [quizCorrectCount, setQuizCorrectCount] = useState<number>(0);
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
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((curr) => (curr === msg ? null : curr)), 3500);
  }, []);

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
              (titleCodeMatch ? baseLessons.find((b) => b.id === titleCodeMatch[1]) : undefined);
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
          id: dc.subjectId as SubjectId,
          code: dc.code,
          name: dc.name,
          semester: "Học kỳ 2026",
          category: "Học phần Bổ sung",
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
      setSelectedSubjectId(targetSubj.id);
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
      window.dispatchEvent(new CustomEvent("collapse-sidebar", { detail: { collapse: true } }));
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
    for (const ch of currentMultiSubject.chapters) {
      const found = (ch.lessons || []).find(
        (l: any) => l.id === activeLessonId || l.dbLessonId === activeLessonId
      );
      if (found) {
        activeChapter = ch as ChapterItem & { dbChapterRef?: any; dbAssignment?: Assignment };
        activeMultiLesson = found as LessonItem & { dbLessonId?: string };
        break;
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

  // Reset Quiz state whenever switching course or lesson
  useEffect(() => {
    setQuizIndex(0);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setQuizDone(false);
    setQuizStreak(0);
    setQuizCorrectCount(0);
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

  const handleQuizSubmit = () => {
    if (!selectedOption) return;
    setQuizSubmitted(true);
    const currQ = activeQuizQuestions[quizIndex];
    if (currQ && selectedOption === currQ.correct) {
      setQuizCorrectCount((c) => c + 1);
      setQuizStreak((s) => s + 1);
      triggerMarloConfetti(0.52, 0.45);
      window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "success" } }));
    } else {
      setQuizStreak(0);
      window.dispatchEvent(new CustomEvent("pet-state-change", { detail: { state: "error" } }));
    }
  };

  const handleMarkLessonDone = async () => {
    if (completingLesson) return;
    if (!isVideoCompleted && !isLessonDoneInDb) {
      showToast("⚠️ Bạn cần xem hết video bài giảng của bài học này trước khi được tính là hoàn thành bài học!");
      setTab("video");
      return;
    }
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
          setXpToastAmount(res.xp_awarded);
          setShowXpToast(true);
          setTimeout(() => setShowXpToast(false), 2600);
          showToast(`🎉 Hoàn thành bài học! Bạn nhận được +${res.xp_awarded} XP.`);
          triggerMarloConfetti(0.52, 0.45);
        } else {
          showToast("✓ Đã cập nhật trạng thái hoàn thành bài học.");
        }
      }
    } finally {
      setCompletingLesson(false);
    }
  };

  const handleNextQuiz = async () => {
    if (quizIndex + 1 >= activeQuizQuestions.length) {
      setQuizDone(true);
      const totalQ = Math.max(1, activeQuizQuestions.length);
      const passPct = Math.round((quizCorrectCount / totalQ) * 100);

      // Chặn vượt rào: Không cho phép Quiz hoàn thành bài thay Video hoặc khi dưới 60% điểm đạt
      if (!isVideoCompleted && !isLessonDoneInDb) {
        setLastQuizXpAwarded(0);
        showToast("⚠️ Bạn đã hoàn thành Quiz nhưng cần xem hết video bài giảng để bài học được tính hoàn thành & nhận XP!");
        return;
      }
      if (passPct < 60) {
        setLastQuizXpAwarded(0);
        showToast(`Bạn đạt ${quizCorrectCount}/${totalQ} (${passPct}%). Cần đạt tối thiểu 60% để hoàn thành bài!`);
        return;
      }

      const res = await completeStudentLessonApi({
        subject_id: selectedSubjectId,
        chapter_id: activeChapter.id,
        lesson_id: activeMultiLesson.id,
        xp: activeMultiLesson.xp || 50,
        quiz_score: quizCorrectCount,
        quiz_total: activeQuizQuestions.length,
      });
      if (res) {
        setTotalXpEarned(res.total_xp);
        setLastQuizXpAwarded(res.xp_awarded);
        if (res.xp_awarded > 0) {
          setXpToastAmount(res.xp_awarded);
          setShowXpToast(true);
          setTimeout(() => setShowXpToast(false), 2600);
          showToast(`🎉 Đạt ${passPct}% Quiz! Nhận +${res.xp_awarded} XP.`);
        }
        setLearningOverview((prev) => {
          if (!prev) return prev;
          const exists = prev.completed_lessons.some(
            (r) => r.subject_id === selectedSubjectId && r.lesson_id === activeMultiLesson.id
          );
          const nextCompleted = exists
            ? prev.completed_lessons.map((r) =>
                r.subject_id === selectedSubjectId && r.lesson_id === activeMultiLesson.id
                  ? { ...r, quiz_score: Math.max(r.quiz_score, quizCorrectCount), quiz_total: Math.max(r.quiz_total, activeQuizQuestions.length) }
                  : r
              )
            : [
                ...prev.completed_lessons,
                {
                  subject_id: selectedSubjectId,
                  chapter_id: activeChapter.id,
                  lesson_id: activeMultiLesson.id,
                  status: "done",
                  quiz_score: quizCorrectCount,
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
            onSelectLesson={(lessonId) => {
              setActiveLessonId(lessonId);
              setTab("video");
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

                  {/* Lesson Heading, Lead & Full Markdown Reading */}
                  <div
                    className="animate-cascade-item space-y-3 border-b border-slate-100 dark:border-slate-800 pb-5"
                    style={{ animationDelay: "220ms" }}
                  >
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {activeMultiLesson.title}
                    </h1>
                    {activeMultiLesson.lead && (
                      <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
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
                        {!isVideoCompleted && !isLessonDoneInDb && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                            <AlertCircle size={13} className="shrink-0" />
                            <span>Điều kiện hoàn thành: Phải xem hết video bài giảng trước khi được tính là hoàn thành bài học.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {!isVideoCompleted && !isLessonDoneInDb ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              showToast("⚠️ Bạn cần xem hết video bài giảng của bài học này trước khi được tính là hoàn thành bài đọc!");
                              setTab("video");
                            }}
                            className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer bg-slate-200/90 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:border-amber-500/60 hover:text-amber-600 dark:hover:text-amber-400 shadow-2xs"
                            title="Chưa đủ điều kiện: Cần xem hết video bài giảng trước"
                          >
                            <Lock size={15} />
                            <span>Chưa xem hết video bài giảng</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTab("video")}
                            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm shadow-rose-950/20"
                          >
                            <Play size={14} className="fill-white" />
                            <span>Xem Video ngay →</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleMarkLessonDone}
                          disabled={completingLesson || isLessonDoneInDb}
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer active:scale-95 shadow-2xs ${
                            isLessonDoneInDb
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-default"
                              : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
                          }`}
                        >
                          <CheckCircle2 size={15} />
                          <span>
                            {isLessonDoneInDb
                              ? "Đã hoàn thành bài học ✓"
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Môn: {currentMultiSubject.name} · Đúng: {quizCorrectCount}/{activeQuizQuestions.length}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {showXpToast && xpToastAmount > 0 && (
                    <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full shadow-xs animate-in fade-in duration-200">
                      +{xpToastAmount} XP
                    </span>
                  )}
                  <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full">
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
                      let btnCls =
                        "border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200";
                      if (quizSubmitted) {
                        if (isCorrect)
                          btnCls =
                            "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold";
                        else if (isSelected && !isCorrect)
                          btnCls =
                            "border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300";
                      } else if (isSelected) {
                        btnCls =
                          "border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 font-bold ring-1 ring-blue-500";
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
                        className={
                          selectedOption
                            ? "rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 text-xs transition cursor-pointer shadow-xs"
                            : "rounded-xl bg-slate-200 text-slate-600 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-bold px-5 py-2 text-xs transition cursor-not-allowed"
                        }
                      >
                        Kiểm tra đáp án
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuiz}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold px-5 py-2 text-xs transition cursor-pointer shadow-xs"
                      >
                        {quizIndex + 1 >= activeQuizQuestions.length ? "Hoàn thành Quiz" : "Câu tiếp theo →"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (() => {
                const totalQ = Math.max(1, activeQuizQuestions.length);
                const passPct = Math.round((quizCorrectCount / totalQ) * 100);
                const passedScore = passPct >= 60;
                const videoReady = isVideoCompleted || isLessonDoneInDb;
                return (
                  <div className="text-center py-8 space-y-3">
                    <div
                      className={`h-14 w-14 rounded-2xl flex items-center justify-center mx-auto ${
                        passedScore && videoReady
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      <Award size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {passedScore && videoReady
                        ? `Xuất sắc! Bạn đạt ${quizCorrectCount}/${totalQ} (${passPct}%)`
                        : !passedScore
                        ? `Bạn đạt ${quizCorrectCount}/${totalQ} (${passPct}%) — Cần ≥60% để đạt`
                        : `Đạt ${quizCorrectCount}/${totalQ} (${passPct}%) — Chưa xem hết Video`}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      {!videoReady
                        ? "Theo quy định học tập, bạn cần xem hết video bài giảng trước khi bài học được đánh dấu hoàn thành & cộng XP."
                        : !passedScore
                        ? "Hãy xem lại lý thuyết / giải thích kỹ thuật rồi luyện tập lại để đạt tối thiểu 60%."
                        : lastQuizXpAwarded > 0
                        ? `Đã cộng +${lastQuizXpAwarded} XP cho bài học này vào hồ sơ sinh viên.`
                        : "Bài học này đã được ghi nhận hoàn thành trước đó."}
                    </p>
                    <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
                      {!videoReady && (
                        <button
                          onClick={() => setTab("video")}
                          className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 text-xs font-bold transition cursor-pointer"
                        >
                          Xem Video ngay →
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setQuizIndex(0);
                          setSelectedOption(null);
                          setQuizSubmitted(false);
                          setQuizDone(false);
                          setQuizCorrectCount(0);
                          setQuizStreak(0);
                          setLastQuizXpAwarded(0);
                        }}
                        className="rounded-xl bg-[#14161a] hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-5 py-2 text-xs font-bold transition cursor-pointer"
                      >
                        Luyện tập lại
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── BÀI TẬP THỰC HÀNH & CODE LAB TỪNG CHƯƠNG ── */}
          {tab === "exercise" && (
            <div key={`exercise-${selectedSubjectId}-${activeChapter.id}`} className="animate-screen-enter flex-1 flex flex-col min-h-0">
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

      {/* ── NÚT MỞ AI SOCRATIC MENTOR & MARLO CHAT DRAWER TƯƠNG TÁC TRỰC TIẾP ── */}
      {!tutorOpen && (
        <button
          type="button"
          onClick={() => setTutorOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#141619] dark:bg-white text-white dark:text-[#141619] px-4 py-2.5 text-xs font-extrabold shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
          title="Hỏi đáp phản biện Socratic với AI Mentor"
        >
          <span className="text-sm">{mentor.emoji}</span>
          <MessageSquareText size={15} />
          <span>Hỏi AI Socratic ({mentor.name})</span>
        </button>
      )}

      {/* Marlo Authentic Chat Drawer - 1:1 replica từ D:\C++\quản lí dự án\marlo-app */}
      <MarloAiChatDrawer
        isOpen={tutorOpen}
        onClose={() => setTutorOpen(false)}
        mentor={mentor}
        activeTopic={activeMultiLesson.title}
        subjectId={selectedSubjectId}
        subjectName={currentMultiSubject?.name}
        currentUserName={learningOverview?.user?.name || "Minh Anh"}
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