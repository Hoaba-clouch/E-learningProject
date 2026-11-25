import { useEffect, useState, useMemo, useRef } from "react";
import gsap from "gsap";
import {
  animateMarloCards,
  animateMarloRows,
  useMarloPageEntrance,
} from "../utils/marloAnimations";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Clock3,
  Columns3,
  ExternalLink,
  Eye,
  Flame,
  Folder,
  FolderKanban,
  GitFork,
  GraduationCap,
  Layers,
  MessageSquareText,
  Pin,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import type { Screen, AvatarStyle, BadgeFrame, SkillMapSkin, Role, Theme, WorkspaceLaunchTarget } from "../App";
import MarloTitle from "../components/MarloTitle";
import MarloNumber from "../components/MarloNumber";
import MarloActivityRing from "../components/MarloActivityRing";
import MarloCapacityBar from "../components/MarloCapacityBar";
import MarloToast from "../components/MarloToast";
import type { CNTTProjectItem } from "./MarloProjectsScreen";
import {
  fetchKanbanWorkspace,
  fetchSchedulesApi,
  fetchStudentLearningOverview,
  getStoredUser,
  type AcademicScheduleItem,
  type StudentLearningOverview,
} from "../api";
import { MULTI_CHAPTER_SUBJECTS as SUBJECTS } from "../data/multiChapterCurriculum";
import {
  extractNumericLessonCode,
  getLessonDisplayCode,
  stripDuplicateLessonCode,
} from "../utils/lessonFormat";

interface Props {
  avatarStyle: AvatarStyle;
  skillMapSkin?: SkillMapSkin;
  badgeFrame: BadgeFrame;
  onNavigate: (s: Screen) => void;
  onOpenWorkspace?: (opts: Omit<WorkspaceLaunchTarget, "nonce">) => void;
  theme?: Theme;
  onToggleTheme?: (trigger?: any) => void;
  role?: Role;
  onLogout?: () => void;
  onOpenCommandPalette?: () => void;
}

const badgeLabel: Record<BadgeFrame, string> = {
  streak: "14-day Streak",
  quiz: "Quiz Slayer",
  mindmap: "Mindmap Builder",
  rookie: "Code Lab Rookie",
  explorer: "OOP Explorer",
};

interface OverviewSnapshotCache {
  userKey: string;
  studentName: string;
  totalXp: number;
  streakDays: number;
  learningOverview: StudentLearningOverview | null;
  projectsList: CNTTProjectItem[];
  selectedProjectId: string;
  upcomingSchedules: AcademicScheduleItem[];
}

let overviewSnapshotCache: OverviewSnapshotCache | null = null;

function mapWorkspaceProjects(rows: any[]): CNTTProjectItem[] {
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    client: p.client,
    course: p.course,
    kind: p.kind,
    status: p.status,
    progress: p.progress,
    tasksDone: p.tasksDone,
    tasksTotal: p.tasksTotal,
    dueText: p.dueText,
    storyPoints: p.storyPoints,
    pointsBurned: p.pointsBurned,
    budgetStr: p.budgetStr,
    instructor: p.instructor,
    instructorAvatar: p.instructorAvatar,
    totalXp: p.totalXp,
    members: p.members || [],
    fav: p.fav,
    colorHex: p.colorHex,
    tlStart: p.tlStart,
    tlWidth: p.tlWidth,
    tlColor: p.tlColor,
    isMyProject: p.isMyProject,
    isLead: p.isLead,
    leaderUserId: p.leaderUserId,
  }));
}

export default function StudentDashboard({
  avatarStyle,
  skillMapSkin,
  badgeFrame,
  onNavigate,
  onOpenWorkspace,
  theme = "light",
  onToggleTheme,
  role = "student",
  onLogout,
  onOpenCommandPalette,
}: Props) {
  const initialStoredUser = getStoredUser("student");
  const currentUserCacheKey = String(initialStoredUser?.id || initialStoredUser?.user_code || "guest");
  const cachedSnap =
    overviewSnapshotCache && overviewSnapshotCache.userKey === currentUserCacheKey
      ? overviewSnapshotCache
      : null;

  const [totalXp, setTotalXp] = useState(cachedSnap?.totalXp ?? 0);
  const [streakDays, setStreakDays] = useState(cachedSnap?.streakDays ?? 0);
  const [studentName, setStudentName] = useState(
    () => cachedSnap?.studentName || initialStoredUser?.name || initialStoredUser?.full_name || "Học viên"
  );
  const [learningOverview, setLearningOverview] = useState<StudentLearningOverview | null>(
    cachedSnap?.learningOverview ?? null
  );
  const [projectsList, setProjectsList] = useState<CNTTProjectItem[]>(cachedSnap?.projectsList ?? []);
  const [projectsLoaded, setProjectsLoaded] = useState(Boolean(cachedSnap));
  const [upcomingSchedules, setUpcomingSchedules] = useState<AcademicScheduleItem[]>(
    cachedSnap?.upcomingSchedules ?? []
  );
  const [schedulesLoaded, setSchedulesLoaded] = useState(Boolean(cachedSnap));

  useEffect(() => {
    let active = true;

    const processSchedules = (items: AcademicScheduleItem[] | null | undefined) => {
      if (!Array.isArray(items)) return [];
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const sorted = [...items].sort((a, b) =>
        a.schedule_date !== b.schedule_date
          ? a.schedule_date.localeCompare(b.schedule_date)
          : a.start_hour - b.start_hour
      );
      const upcoming = sorted.filter((s) => s.schedule_date >= todayKey && s.status !== "cancelled");
      return (upcoming.length > 0 ? upcoming : sorted).slice(0, 3);
    };

    const loadAllOverviewData = async () => {
      const [ovRes, wsRes, schRes] = await Promise.allSettled([
        fetchStudentLearningOverview(),
        fetchKanbanWorkspace(),
        fetchSchedulesApi(undefined, "student"),
      ]);
      if (!active) return;

      const ovData = ovRes.status === "fulfilled" ? ovRes.value : null;
      const wsData = wsRes.status === "fulfilled" ? wsRes.value : null;
      const schData = schRes.status === "fulfilled" ? schRes.value : null;

      let nextXp = overviewSnapshotCache?.totalXp ?? 0;
      let nextStreak = overviewSnapshotCache?.streakDays ?? 0;
      let nextName = initialStoredUser?.name || initialStoredUser?.full_name || "Học viên";

      if (ovData) {
        setLearningOverview(ovData);
        if (typeof ovData.profile?.exp_points === "number") {
          nextXp = ovData.profile.exp_points;
          setTotalXp(nextXp);
        }
        if (typeof ovData.profile?.current_streak === "number") {
          nextStreak = ovData.profile.current_streak;
          setStreakDays(nextStreak);
        }
        if (ovData.user?.name) {
          nextName = ovData.user.name;
          setStudentName(nextName);
        }
      }

      let nextProjects = overviewSnapshotCache?.projectsList ?? [];
      let nextSelectedProjectId = overviewSnapshotCache?.selectedProjectId ?? "";
      if (wsData) {
        const rows = Array.isArray(wsData.projects) ? wsData.projects : [];
        nextProjects = mapWorkspaceProjects(rows);
        setProjectsList(nextProjects);
        nextSelectedProjectId =
          nextSelectedProjectId && nextProjects.some((p) => p.id === nextSelectedProjectId)
            ? nextSelectedProjectId
            : nextProjects[0]?.id || "";
        setSelectedProjectId((prev) =>
          prev && nextProjects.some((p) => p.id === prev) ? prev : nextProjects[0]?.id || ""
        );
      }
      setProjectsLoaded(true);

      let nextSchedules = overviewSnapshotCache?.upcomingSchedules ?? [];
      if (Array.isArray(schData)) {
        nextSchedules = processSchedules(schData);
        setUpcomingSchedules(nextSchedules);
      }
      setSchedulesLoaded(true);

      overviewSnapshotCache = {
        userKey: currentUserCacheKey,
        studentName: nextName,
        totalXp: nextXp,
        streakDays: nextStreak,
        learningOverview: ovData ?? overviewSnapshotCache?.learningOverview ?? null,
        projectsList: nextProjects,
        selectedProjectId: nextSelectedProjectId,
        upcomingSchedules: nextSchedules,
      };
    };

    const loadOverviewOnly = () => {
      fetchStudentLearningOverview().then((data) => {
        if (!active || !data) return;
        setLearningOverview(data);
        if (typeof data.profile?.exp_points === "number") setTotalXp(data.profile.exp_points);
        if (typeof data.profile?.current_streak === "number") setStreakDays(data.profile.current_streak);
        if (data.user?.name) setStudentName(data.user.name);
      });
    };

    void loadAllOverviewData();
    window.addEventListener("codemind-xp-updated", loadOverviewOnly);
    window.addEventListener("codemind-courses-updated", loadOverviewOnly);

    return () => {
      active = false;
      window.removeEventListener("codemind-xp-updated", loadOverviewOnly);
      window.removeEventListener("codemind-courses-updated", loadOverviewOnly);
    };
  }, []);

  // ─── TÍNH DỮ LIỆU HỌC THỰC TẾ ĐỂ NỐI DEEP-LINK VÀO CODE LAB / MINDMAP / AI TUTOR ───
  const focusLearning = useMemo(() => {
    const lastSubj =
      typeof window !== "undefined" ? window.localStorage.getItem("codemind-last-subject") : null;
    const completedRows = learningOverview?.completed_lessons || [];
    const subRows = learningOverview?.chapter_submissions || [];
    const activeSubjId =
      lastSubj ||
      completedRows[completedRows.length - 1]?.subject_id ||
      "oop";
    const fallbackSubject = SUBJECTS.find((s) => s.id === activeSubjId) || SUBJECTS[0];
    const dbCourse = learningOverview?.courses?.find((c) => c.subjectId === fallbackSubject.id);

    const chaptersRaw =
      dbCourse?.chapters && dbCourse.chapters.length > 0
        ? dbCourse.chapters.filter((ch: any) => ch.status !== "Bản nháp")
        : fallbackSubject.chapters.map((ch) => ({
            id: ch.id,
            title: ch.title,
            lessons: ch.lessons.map((l) => ({
              id: l.id,
              title: l.title,
              duration: l.duration,
              xp: l.xp,
              content: { lead: l.lead, objective: l.objective },
            })),
          }));

    const doneIds = new Set(
      completedRows
        .filter((r) => r.subject_id === fallbackSubject.id)
        .map((r) => r.lesson_id)
    );

    const flatLessons: Array<{
      id: string;
      rawId: string;
      displayCode: string;
      normCode: string | null;
      title: string;
      cleanTitle: string;
      duration: string;
      xp: number;
      lead: string;
      chapterNumber: number;
      chapterTitle: string;
      done: boolean;
    }> = [];

    chaptersRaw.forEach((ch: any, chIdx: number) => {
      const baseChap =
        fallbackSubject.chapters.find((c) => c.id === ch.id) ||
        fallbackSubject.chapters[chIdx];
      const baseLessons = baseChap?.lessons || [];
      const pubLessons = (ch.lessons || []).filter((ls: any) => ls.status !== "Bản nháp");
      pubLessons.forEach((ls: any, lIdx: number) => {
        const normCode = extractNumericLessonCode(ls.id, ls.title);
        const displayCode = getLessonDisplayCode(ls.id, ls.title, chIdx + 1, lIdx);
        const baseLesson =
          baseLessons.find((b) => b.id === ls.id) ||
          (normCode ? baseLessons.find((b) => b.id === normCode) : undefined);
        const effectiveId = baseLesson?.id || ls.id;
        const isDone =
          doneIds.has(ls.id) ||
          doneIds.has(effectiveId) ||
          (normCode ? doneIds.has(normCode) : false) ||
          doneIds.has(displayCode);
        const resolvedXp =
          typeof ls.xp === "number" && ls.xp > 0
            ? ls.xp
            : baseLesson?.xp || 60;

        flatLessons.push({
          id: effectiveId,
          rawId: ls.id,
          displayCode,
          normCode,
          title: ls.title,
          cleanTitle: stripDuplicateLessonCode(ls.title, displayCode),
          duration: ls.duration || baseLesson?.duration || "~20 phút",
          xp: resolvedXp,
          lead:
            ls.content?.objective ||
            baseLesson?.objective ||
            ls.content?.lead ||
            baseLesson?.lead ||
            fallbackSubject.description,
          chapterNumber: chIdx + 1,
          chapterTitle: ch.title || `Chương ${chIdx + 1}`,
          done: isDone,
        });
      });
    });

    const userId = learningOverview?.user?.id || "student-demo";
    const lastLessonSaved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(`codemind-last-lesson-${userId}-${fallbackSubject.id}`)
        : null;

    const resumeLesson =
      (lastLessonSaved &&
        flatLessons.find(
          (l) =>
            l.id === lastLessonSaved ||
            l.rawId === lastLessonSaved ||
            l.displayCode === lastLessonSaved
        )) ||
      flatLessons.find((l) => !l.done) ||
      flatLessons[0] || {
        id: "1.1",
        rawId: "1.1",
        displayCode: "1.1",
        normCode: "1.1",
        title: fallbackSubject.name,
        cleanTitle: fallbackSubject.name,
        duration: "~20 phút",
        xp: 60,
        lead: fallbackSubject.description,
        chapterNumber: 1,
        chapterTitle: "Chương 1",
        done: false,
      };

    const totalLessons = flatLessons.length;
    const doneCount = flatLessons.filter((l) => l.done).length;
    const pct = totalLessons > 0 ? Math.round((doneCount / totalLessons) * 100) : 0;

    const totalChapters = Math.max(1, chaptersRaw.length);
    const submittedChapters = new Set(
      subRows.filter((s) => s.subject_id === fallbackSubject.id).map((s) => s.chapter_number)
    ).size;

    const publishedKeys = new Set<string>();
    flatLessons.forEach((l) => {
      publishedKeys.add(l.id);
      publishedKeys.add(l.rawId);
      publishedKeys.add(l.displayCode);
      if (l.normCode) publishedKeys.add(l.normCode);
    });

    const quizRecords =
      doneCount > 0
        ? completedRows.filter(
            (r) =>
              r.subject_id === fallbackSubject.id &&
              r.quiz_total > 0 &&
              publishedKeys.has(r.lesson_id)
          )
        : [];
    const quizAvgPct =
      quizRecords.length > 0
        ? Math.round(
            quizRecords.reduce((acc, r) => acc + (r.quiz_score / r.quiz_total) * 100, 0) /
              quizRecords.length
          )
        : 0;

    return {
      subjectId: fallbackSubject.id,
      courseCode: dbCourse?.code || fallbackSubject.code,
      courseName: dbCourse?.name || fallbackSubject.name,
      resumeLesson,
      totalLessons,
      doneCount,
      pct,
      submittedChapters,
      totalChapters,
      quizAvgPct,
    };
  }, [learningOverview]);

  // ─── ACTIVE FOCUSED PROJECT (Giải quyết triệt để: Biết chính xác tiến độ của dự án nào) ───
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    () => cachedSnap?.selectedProjectId ?? ""
  );
  const [workScope, setWorkScope] = useState<"project" | "all">("project");
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  const selectedProject = useMemo(() => {
    return projectsList.find((p) => p.id === selectedProjectId) || projectsList[0] || null;
  }, [projectsList, selectedProjectId]);

  const selectedProgressPct = selectedProject ? Math.round(selectedProject.progress * 100) : 0;

  // Dynamic calculations for Where the work stands:
  const workStats = useMemo(() => {
    if (workScope === "project") {
      const p = selectedProject;
      if (!p) {
        return {
          subtitle: "Bạn chưa tham gia đồ án nào — hãy tạo đồ án hoặc kiểm tra lời mời",
          row1: {
            label: "Tasks",
            icon: "check" as const,
            total: 0,
            done: 0,
            moving: 0,
            waiting: 0,
            navigate: () => onNavigate("projects"),
            navTitle: "Mở trang Đồ án",
          },
          row2: {
            label: "Story Points",
            icon: "points" as const,
            total: 0,
            done: 0,
            moving: 0,
            waiting: 0,
            navigate: () => onNavigate("projects"),
            navTitle: "Mở trang Đồ án",
          },
          row3: {
            label: "Reviews & PRs",
            icon: "eye" as const,
            total: 0,
            done: 0,
            moving: 0,
            waiting: 0,
            navigate: () => onNavigate("github"),
            navTitle: "Mở Git Project Hub",
          },
        };
      }
      const tasksTotal = p.tasksTotal;
      const tasksDone = p.tasksDone;
      const tasksMoving = Math.max(0, Math.round((tasksTotal - tasksDone) * 0.7));
      const tasksWaiting = Math.max(0, tasksTotal - tasksDone - tasksMoving);

      const spTotal = p.storyPoints;
      const spDone = p.pointsBurned;
      const spMoving = Math.max(0, Math.round((spTotal - spDone) * 0.75));
      const spWaiting = Math.max(0, spTotal - spDone - spMoving);

      const reviewsTotal = Math.max(2, Math.round(tasksTotal * 0.6));
      const reviewsDone = Math.max(1, Math.min(reviewsTotal, Math.round(tasksDone * 0.55)));
      const reviewsMoving = Math.max(0, reviewsTotal - reviewsDone);

      return {
        subtitle: `Done, moving & waiting cho đồ án: ${p.name.split(" - ")[0]}`,
        row1: {
          label: "Tasks",
          icon: "check" as const,
          total: tasksTotal,
          done: tasksDone,
          moving: tasksMoving,
          waiting: tasksWaiting,
          navigate: () => onNavigate("kanban"),
          navTitle: `Xem nhiệm vụ của ${p.name}`,
        },
        row2: {
          label: "Story Points",
          icon: "points" as const,
          total: spTotal,
          done: spDone,
          moving: spMoving,
          waiting: spWaiting,
          navigate: () => onNavigate("projects"),
          navTitle: `Xem tiến độ Story Points của ${p.name}`,
        },
        row3: {
          label: "Reviews & PRs",
          icon: "eye" as const,
          total: reviewsTotal,
          done: reviewsDone,
          moving: reviewsMoving,
          waiting: 0,
          navigate: () => onNavigate("github"),
          navTitle: `Xem code reviews & PRs của ${p.name}`,
        },
      };
    } else {
      // Aggregated for all projects
      const totalTasks = projectsList.reduce((sum, p) => sum + p.tasksTotal, 0);
      const doneTasks = projectsList.reduce((sum, p) => sum + p.tasksDone, 0);
      const movingTasks = Math.round((totalTasks - doneTasks) * 0.6);
      const waitingTasks = Math.max(0, totalTasks - doneTasks - movingTasks);

      const deliveredProjects = projectsList.filter((p) => p.status === "delivered").length;
      const movingProjects = projectsList.filter((p) => p.status === "active" || p.status === "review").length;
      const waitingProjects = projectsList.filter((p) => p.status === "planning").length;

      return {
        subtitle: "Done, moving and waiting, across every live job",
        row1: {
          label: "Tasks",
          icon: "check" as const,
          total: totalTasks,
          done: doneTasks,
          moving: movingTasks,
          waiting: waitingTasks,
          navigate: () => onNavigate("kanban"),
          navTitle: "Xem toàn bộ nhiệm vụ",
        },
        row2: {
          label: "Projects",
          icon: "folder" as const,
          total: projectsList.length,
          done: deliveredProjects,
          moving: movingProjects,
          waiting: waitingProjects,
          navigate: () => onNavigate("projects"),
          navTitle: `Mở danh sách ${projectsList.length} đồ án`,
        },
        row3: {
          label: "Reviews",
          icon: "eye" as const,
          total: 27,
          done: 23,
          moving: 4,
          waiting: 0,
          navigate: () => onNavigate("github"),
          navTitle: "Xem danh sách review",
        },
      };
    }
  }, [workScope, selectedProject, projectsList, onNavigate]);

  // ─── NEXT UP TASKS (Từng task có nhãn Dự án cụ thể) ───
  const [tasks, setTasks] = useState([
    {
      id: 1,
      label: "Làm quiz Đa hình (Polymorphism) & vtable lookup đạt >= 70%",
      projectId: "prj-codemind",
      projectName: "CodeMind AI",
      code: "OOP-12",
      xp: 50,
      points: 3,
      done: false,
      epic: "Sprint 2: Core Engine",
      duration: "2 h",
      status: "in-progress",
      due: "Hôm nay",
    },
    {
      id: 2,
      label: "Thiết kế Sơ đồ Luồng Kafka Saga & Outbox Pattern",
      projectId: "prj-ecommerce",
      projectName: "Microservices",
      code: "SE-402",
      xp: 60,
      points: 4,
      done: false,
      epic: "Sprint 1: Event Cluster",
      duration: "3 h",
      status: "in-progress",
      due: "Ngày mai",
    },
    {
      id: 3,
      label: "Tạo Pull Request tích hợp AST Visualizer & Lexer LR(1)",
      projectId: "prj-compiler",
      projectName: "Mini C++ Compiler",
      code: "CS-308",
      xp: 80,
      points: 5,
      done: false,
      epic: "Sprint 3: Parser Core",
      duration: "2.5 h",
      status: "ready",
      due: "Còn 3 ngày",
    },
    {
      id: 4,
      label: "Chạy DAST Fuzzing kiểm tra lỗ hổng SQLi trên Gateway",
      projectId: "prj-security",
      projectName: "Security DAST",
      code: "SEC-305",
      xp: 70,
      points: 4,
      done: false,
      epic: "Sprint 2: Vulnerability Scan",
      duration: "1.5 h",
      status: "ready",
      due: "Còn 4 ngày",
    },
    {
      id: 5,
      label: "Nghiệm thu Đồ án Kernel PintOS: Priority Scheduling",
      projectId: "prj-pintos",
      projectName: "PintOS Kernel",
      code: "CS-204",
      xp: 100,
      points: 8,
      done: true,
      epic: "Nghiệm thu Đồ án",
      duration: "6 h",
      status: "done",
      due: "Đã hoàn thành",
    },
    {
      id: 6,
      label: "Tối ưu hóa mô hình MobileFaceNet INT8 trên Raspberry Pi 4",
      projectId: "prj-faceattend",
      projectName: "FaceAttend AI",
      code: "CS-315",
      xp: 50,
      points: 3,
      done: true,
      epic: "Sprint 1: Edge Quantization",
      duration: "4 h",
      status: "done",
      due: "Đã hoàn thành",
    },
  ]);

  // Dynamic Time Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  }, []);

  // Floating Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastToggledTaskId, setLastToggledTaskId] = useState<number | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleTask = (id: number) => {
    setTasks((current) =>
      current.map((task) => {
        if (task.id === id) {
          const nextDone = !task.done;
          setLastToggledTaskId(id);
          setToastMessage(nextDone ? "Đã đánh dấu hoàn thành mục kế hoạch." : "Đã bỏ đánh dấu hoàn thành.");
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => {
            setToastMessage(null);
          }, 4500);
          return { ...task, done: nextDone };
        }
        return task;
      })
    );
  };

  const handleUndoTask = () => {
    if (lastToggledTaskId === null) return;
    const targetId = lastToggledTaskId;
    setLastToggledTaskId(null);
    setTasks((current) =>
      current.map((task) => {
        if (task.id === targetId) {
          return { ...task, done: !task.done };
        }
        return task;
      })
    );
    setToastMessage("Đã hoàn tác thao tác.");
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const dashboardRef = useRef<HTMLDivElement>(null);
  const asideProjectRef = useRef<HTMLDivElement>(null);
  const scheduleListRef = useRef<HTMLDivElement>(null);
  const workStandsRef = useRef<HTMLDivElement>(null);

  useMarloPageEntrance(dashboardRef, (el) => {
    const cards = el.querySelectorAll(".marlo-card");
    if (cards.length > 0) {
      animateMarloCards(cards, { y: 24, stagger: 0.055, duration: 0.72 });
    }
    const capRows = el.querySelectorAll(".cap__row");
    if (capRows.length > 0) {
      animateMarloRows(capRows, { x: -12, y: 0, stagger: 0.06, delay: 0.2, duration: 0.55 });
    }
    const listRows = el.querySelectorAll(".marlo-row:not(.cap__row), .marlo-schedule-row");
    if (listRows.length > 0) {
      animateMarloRows(listRows, { y: 10, stagger: 0.035, delay: 0.3, duration: 0.5 });
    }
  });

  return (
    <div ref={dashboardRef} className="min-h-full p-4 sm:p-6 lg:p-7 relative select-none">
      {/* ─── 1. TOP HEADER (MARLO PAGE HEAD) ─── */}
      <header className="marlo-card mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200/90 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <div className="marlo-eyebrow theme-primary-text text-xs font-bold uppercase tracking-wider flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>CodeMind Campus</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>Khoa Công nghệ Thông tin & AI</span>
          </div>
          <MarloTitle
            key="greeting-title"
            text={`${greeting}, ${studentName}`}
            staggerMs={12}
            className="mt-0.5 text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white leading-tight"
          />
          <div className="marlo-hero-lead mt-1 flex flex-wrap items-center gap-2">
            <p className="min-w-0 text-xs text-[#62656b] dark:text-[#a0a3a9]">
              Lộ trình kỹ sư công nghệ C++20, AI Socratic Mentor & tiến độ học tập hôm nay.
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 text-[11px] font-semibold">
              <Flame size={12} className="text-amber-500 fill-amber-500" />
              <span>{badgeLabel[badgeFrame]}</span>
            </span>
          </div>
        </div>

        {/* Stats Chips & Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="marlo-stat-chip flex items-center gap-2.5 rounded-xl px-3 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 text-slate-900 dark:text-white shadow-2xs">
              <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500 shrink-0">
                <Flame size={14} className="fill-amber-500" />
              </div>
              <div>
                <div className="text-xs font-black leading-none text-slate-900 dark:text-white">
                  <MarloNumber value={streakDays} durationMs={900} />
                </div>
                <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">ngày streak</div>
              </div>
            </div>

            <div className="marlo-stat-chip flex items-center gap-2.5 rounded-xl px-3 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 text-slate-900 dark:text-white shadow-2xs">
              <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
                <Star size={14} className="fill-teal-500" />
              </div>
              <div>
                <div className="text-xs font-black leading-none text-slate-900 dark:text-white">
                  <MarloNumber value={totalXp} durationMs={900} />
                </div>
                <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">XP tích lũy</div>
              </div>
            </div>

            <div className="marlo-stat-chip flex items-center gap-2.5 rounded-xl px-3 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 text-slate-900 dark:text-white shadow-2xs">
              <div className="p-1.5 rounded-lg bg-[#f29b23]/15 text-[#f29b23] shrink-0">
                <Trophy size={14} />
              </div>
              <div>
                <div className="text-xs font-black leading-none text-slate-900 dark:text-white">Hạng Bạc</div>
                <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">BXH Sprint</div>
              </div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden md:block" />

          {/* Quick Primary Actions */}
          <button
            onClick={() => onNavigate("defense-room")}
            className="marlo-stat-chip magnetic inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 active:scale-95 transition-colors duration-150 cursor-pointer shadow-2xs"
            title="Mở phòng mô phỏng bảo vệ đồ án 1:1 với Hội đồng AI Tech Lead"
          >
            <ShieldCheck size={15} className="text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Phòng Phản Biện AI</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            onClick={() => onNavigate("kanban")}
            className="marlo-stat-chip btn-marlo-primary btn--primary magnetic flex items-center gap-2"
          >
            <Columns3 size={15} className="text-[#1c1304] shrink-0" />
            <span>Bảng Kanban</span>
            <ArrowRight size={14} className="text-[#1c1304] shrink-0" />
          </button>
        </div>
      </header>

      {/* ─── 2. TWO-COLUMN MARLO OVERVIEW GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        {/* ═══ LEFT MAIN STACK ═══ */}
        <section className="space-y-5 min-w-0">
          
          {/* 🌟 A. TIẾP TỤC HỌC TẬP (CONTINUE LEARNING HERO - NỀN TẢNG HỌC LẬP TRÌNH CODEMIND AI) */}
          <div className="marlo-card rounded-[28px] sm:rounded-[32px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-7 shadow-xs relative overflow-hidden">
            {/* Top Bar: Course Category & Progress Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="marlo-hero-chip w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <BookOpen size={17} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {focusLearning.courseCode} · Khóa học đang theo dõi
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="truncate">{focusLearning.courseName}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  </div>
                </div>
              </div>

              {/* Progress Chip */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="marlo-hero-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Đã hoàn thành <MarloNumber value={focusLearning.pct} suffix="%" durationMs={550} /></span>
                </span>
                <span className="marlo-hero-chip text-xs font-semibold text-slate-400 dark:text-slate-500 font-mono">
                  {focusLearning.doneCount}/{focusLearning.totalLessons} bài
                </span>
              </div>
            </div>

            {/* Main Lesson Focus Card */}
            <div className="pt-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="marlo-hero-chip pill pill--accent font-mono text-[10.5px] font-bold tracking-wide">
                      CHƯƠNG {focusLearning.resumeLesson.chapterNumber} · BÀI {focusLearning.resumeLesson.displayCode}
                    </span>
                    <span className="marlo-hero-chip inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{focusLearning.resumeLesson.done ? "Đã hoàn thành" : "Đang học"}</span>
                    </span>
                    <span className="marlo-hero-chip text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                      <Clock size={12} />
                      <span>{focusLearning.resumeLesson.duration}</span>
                    </span>
                    <span className="marlo-hero-chip text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-500" />
                      <span>+{focusLearning.resumeLesson.xp} XP</span>
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mt-2.5 leading-snug tracking-tight">
                    {focusLearning.resumeLesson.cleanTitle}
                  </h2>
                  <p className="marlo-hero-lead text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed max-w-xl line-clamp-2">
                    {focusLearning.resumeLesson.lead}
                  </p>

                  {/* Quick CTAs */}
                  <div className="mt-5 flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() =>
                        onOpenWorkspace
                          ? onOpenWorkspace({
                              subjectId: focusLearning.subjectId,
                              lessonId: focusLearning.resumeLesson.id,
                              tab: "video",
                            })
                          : onNavigate("workspace")
                      }
                      className="marlo-hero-cta magnetic inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black text-[#1C1304] bg-gradient-to-r from-[#F8BD57] via-[#F29B23] to-[#EE8420] hover:brightness-105 active:scale-95 shadow-md shadow-amber-500/20 transition-[filter,background-color] duration-150 cursor-pointer"
                    >
                      <PlayCircle size={16} strokeWidth={2.4} />
                      <span>Vào Code Lab & Học tiếp ngay</span>
                      <ArrowRight size={14} strokeWidth={2.4} />
                    </button>

                    <button
                      onClick={() => onNavigate("defense-room")}
                      className="marlo-hero-cta inline-flex items-center justify-center rounded-2xl w-10 h-10 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#EE8420] hover:border-[#EE8420]/50 transition-colors duration-150 cursor-pointer shadow-2xs active:scale-95"
                      title="Phòng Phản Biện AI (Live)"
                    >
                      <ShieldCheck size={18} />
                    </button>

                    <button
                      onClick={() =>
                        onOpenWorkspace
                          ? onOpenWorkspace({
                              subjectId: focusLearning.subjectId,
                              lessonId: focusLearning.resumeLesson.id,
                              tab: "mindmap",
                            })
                          : onNavigate("workspace")
                      }
                      className="marlo-hero-cta inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-150 cursor-pointer shadow-2xs"
                    >
                      <Layers size={14} className="text-[#EE8420]" />
                      <span>Xem Mindmap chương</span>
                    </button>

                    <button
                      onClick={() =>
                        onOpenWorkspace
                          ? onOpenWorkspace({
                              subjectId: focusLearning.subjectId,
                              lessonId: focusLearning.resumeLesson.id,
                              tab: "lecture",
                              openTutor: true,
                            })
                          : onNavigate("workspace")
                      }
                      className="marlo-hero-cta inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-150 cursor-pointer shadow-2xs"
                    >
                      <MessageSquareText size={14} className="text-amber-500" />
                      <span>Hỏi AI Socratic Mentor</span>
                    </button>
                  </div>
                </div>

                {/* Progress Visual Box */}
                <div className="marlo-progress-box w-full md:w-56 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 shrink-0">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">Tiến độ môn học</span>
                    <span className="text-slate-900 dark:text-white font-mono">
                      <MarloNumber value={focusLearning.pct} suffix="%" durationMs={850} delayMs={220} />
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      key={`focus-bar-${focusLearning.subjectId}`}
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#EE8420] transition-[width] duration-500 ease-out"
                      style={{ width: `${focusLearning.pct}%` }}
                    />
                  </div>
                  <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Bài học hoàn thành:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {focusLearning.doneCount}/{focusLearning.totalLessons}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bài tập chương đã nộp:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {focusLearning.submittedChapters}/{focusLearning.totalChapters}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Điểm Quiz trung bình:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {focusLearning.quizAvgPct > 0 ? `${focusLearning.quizAvgPct}%` : "Chưa làm"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Learning Roadmap Milestone Cards */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Lộ trình 4 chặng kỹ năng chuyên sâu
                  </h4>
                  <button
                    onClick={() =>
                      onOpenWorkspace
                        ? onOpenWorkspace({
                            subjectId: focusLearning.subjectId,
                            lessonId: focusLearning.resumeLesson.id,
                            tab: "lecture",
                          })
                        : onNavigate("workspace")
                    }
                    className="text-xs font-bold text-[#EE8420] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Xem toàn bộ giáo trình</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3">
                  {[
                    {
                      step: "Chặng 1",
                      subjectId: "oop",
                      title: "C++20 & Hướng đối tượng",
                      desc: "vtable, Con trỏ thông minh, RAII",
                      status: focusLearning.subjectId === "oop" ? `Tiến độ ${focusLearning.pct}%` : "Sẵn sàng học",
                      done: focusLearning.subjectId === "oop" && focusLearning.pct === 100,
                      active: focusLearning.subjectId === "oop" && focusLearning.pct < 100,
                    },
                    {
                      step: "Chặng 2",
                      subjectId: "dsa",
                      title: "Cấu trúc Dữ liệu & Giải thuật",
                      desc: "Graph, Tree, Quy hoạch động",
                      status: "Nền tảng cốt lõi",
                    },
                    {
                      step: "Chặng 3",
                      subjectId: "distributed",
                      title: "Hệ thống Phân tán & Cloud",
                      desc: "Kafka, Redis, Docker CI/CD",
                      status: "Nâng cao hệ thống",
                    },
                    {
                      step: "Chặng 4",
                      subjectId: "capstone",
                      title: "Kiến trúc & Đồ án AI",
                      desc: "AI Agents & CodeMind Capstone",
                      status: "Mục tiêu tốt nghiệp",
                    },
                  ].map((m) => (
                    <div
                      key={m.step}
                      onClick={() =>
                        onOpenWorkspace
                          ? onOpenWorkspace({ subjectId: m.subjectId, tab: "video" })
                          : onNavigate("workspace")
                      }
                      className={`marlo-milestone relative rounded-2xl border p-3.5 transition-[border-color,background-color,box-shadow] duration-150 cursor-pointer hover:shadow-md ${
                        m.active
                          ? "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 shadow-xs"
                          : "border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold font-mono uppercase text-slate-400">
                          {m.step}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[9.5px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0">
                          {(m.done || m.active) && (
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.done ? "bg-emerald-500" : "bg-amber-500"}`} />
                          )}
                          <span>{m.status}</span>
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {m.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {m.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 🌟 C. WHERE THE WORK STANDS HERO SECTION (Strictly Black, Amber, Grey - Marlo Authentic & Reactive to Selected Project) */}
          <div ref={workStandsRef} className="marlo-card rounded-[28px] sm:rounded-[32px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] p-5 sm:p-7 shadow-xs select-none">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Where the work stands
                  </h3>

                  {/* Interactive Project Dropdown Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setWorkScope("project");
                        setProjectMenuOpen(!projectMenuOpen);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                      title="Bấm để chọn đồ án khác"
                    >
                      <FolderKanban size={13} className="text-amber-500" />
                      <span>
                        {workScope === "project"
                          ? selectedProject
                            ? selectedProject.name.split(" - ")[0]
                            : "Chưa có đồ án"
                          : `Tất cả ${projectsList.length} đồ án`}
                      </span>
                      <ChevronDown size={13} className={`transition-transform duration-200 ${projectMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {projectMenuOpen && (
                      <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl bg-white dark:bg-[#1A1D28] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 p-2 space-y-1">
                        <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                          Chọn 1 trong {projectsList.length} Đồ án:
                        </div>
                        {projectsList.map((p) => {
                          const isCur = p.id === selectedProjectId && workScope === "project";
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProjectId(p.id);
                                if (overviewSnapshotCache) overviewSnapshotCache.selectedProjectId = p.id;
                                setWorkScope("project");
                                setProjectMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition cursor-pointer ${
                                isCur
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-bold border border-slate-200 dark:border-slate-700"
                                  : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="truncate font-bold">{p.name.split(" - ")[0]}</div>
                                <div className="text-[10px] text-slate-400 truncate">{p.client}</div>
                              </div>
                              <span className="font-mono text-xs font-bold shrink-0">{Math.round(p.progress * 100)}%</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#62656b] dark:text-[#a0a3a9] mt-0.5 font-medium">
                  {workStats.subtitle}
                </p>
              </div>

              {/* Scope Switcher + Legend */}
              <div className="flex flex-wrap items-center gap-4">
                {/* 2-pill toggle: Dự án đang chọn vs Tất cả 8 đồ án */}
                <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setWorkScope("project")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      workScope === "project"
                        ? "bg-white dark:bg-[#14161a] text-slate-950 dark:text-white shadow-xs font-bold"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Dự án đang chọn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWorkScope("all");
                      setProjectMenuOpen(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      workScope === "all"
                        ? "bg-white dark:bg-[#14161a] text-slate-950 dark:text-white shadow-xs font-bold"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Tất cả ({projectsList.length})
                  </button>
                </div>

                {/* Legend: Black (Done), Amber (Moving), Light Grey (Waiting) */}
                <div className="flex items-center gap-3.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[3px] bg-[#14161a] dark:bg-white" />
                    <span>Done</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: "linear-gradient(to right, #f59e0b, #fbbf24)" }} />
                    <span>Moving</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[3px] bg-[#e5e7eb] dark:bg-[#2d313d]" />
                    <span>Waiting</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Project Switcher Horizontal Pills Bar */}
            {workScope === "project" && (
              <div className="mb-5 pb-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none pt-0.5 min-h-[44px]">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <FolderKanban size={13} />
                  <span>Chọn đồ án:</span>
                </span>
                {!projectsLoaded && projectsList.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    <div className="h-7 w-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  </div>
                ) : (
                  projectsList.map((p) => {
                    const isActive = p.id === selectedProjectId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProjectId(p.id);
                          setWorkScope("project");
                        }}
                        className={`marlo-proj-pill px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                          isActive
                            ? "bg-[#141619] dark:bg-white text-white dark:text-slate-950 shadow-2xs"
                            : "bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span>{p.name.split(" - ")[0]}</span>
                        <span className={`text-[10px] font-mono font-semibold ${isActive ? "text-amber-400 dark:text-amber-600" : "text-slate-400"}`}>
                          {Math.round(p.progress * 100)}%
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Rows: Tasks, Projects/Story Points, Reviews */}
            <div key={`caps-${workScope}`} className="space-y-3 sm:space-y-4">
              {/* 1. Tasks Row */}
              <div className="marlo-row cap__row group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-2 px-2.5 -mx-2.5 rounded-2xl hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-150">
                <div className="flex items-center gap-3 w-36 shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 group-hover:bg-amber-500/10 group-hover:text-amber-500 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 transition-colors">
                    <Check size={16} strokeWidth={2.4} />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{workStats.row1.label}</span>
                </div>

                <div className="w-20 shrink-0">
                  <div className="text-lg font-bold text-slate-950 dark:text-white leading-tight font-mono tabular-nums">
                    <MarloNumber value={workStats.row1.total} durationMs={380} />
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                    <MarloNumber value={workStats.row1.done} durationMs={380} /> done
                  </div>
                </div>

                {/* Progress Capsules Bar */}
                <div className="flex-1 flex items-center gap-2 sm:gap-2.5 h-10 min-w-0">
                  {workStats.row1.done > 0 && (
                    <div
                      style={{ flex: Math.max(1, workStats.row1.done) }}
                      className="cap__seg h-10 rounded-full bg-[#14161a] dark:bg-white text-white dark:text-slate-950 flex items-center justify-end px-4 font-bold text-xs shadow-2xs min-w-[36px] cursor-pointer transition-[flex-grow] duration-300"
                      title={`Done: ${workStats.row1.done}`}
                    >
                      <span className="tabular-nums"><MarloNumber value={workStats.row1.done} durationMs={380} /></span>
                    </div>
                  )}
                  {workStats.row1.moving > 0 && (
                    <div
                      style={{ flex: Math.max(1, workStats.row1.moving), background: "linear-gradient(to right, #f59e0b, #fbbf24)" }}
                      className="cap__seg h-10 rounded-full text-slate-950 flex items-center justify-end px-4 font-bold text-xs shadow-2xs min-w-[36px] cursor-pointer transition-[flex-grow] duration-300"
                      title={`Moving: ${workStats.row1.moving}`}
                    >
                      <span className="tabular-nums"><MarloNumber value={workStats.row1.moving} durationMs={380} /></span>
                    </div>
                  )}
                  {workStats.row1.waiting > 0 && (
                    <div
                      style={{ flex: Math.max(1, workStats.row1.waiting) }}
                      className="cap__seg h-10 rounded-full bg-[#e5e7eb] dark:bg-[#232733] text-slate-700 dark:text-slate-300 flex items-center justify-end px-3.5 font-bold text-xs min-w-[32px] cursor-pointer transition-[flex-grow] duration-300"
                      title={`Waiting: ${workStats.row1.waiting}`}
                    >
                      <span className="tabular-nums"><MarloNumber value={workStats.row1.waiting} durationMs={380} /></span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={workStats.row1.navigate}
                  className="cap__go w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors duration-150 cursor-pointer shadow-2xs shrink-0 active:scale-95 ml-auto sm:ml-0"
                  title={workStats.row1.navTitle}
                >
                  <ArrowUpRight size={15} />
                </button>
              </div>

              {/* 2. Projects or Story Points Row */}
              <div className="marlo-row cap__row group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-2 px-2.5 -mx-2.5 rounded-2xl hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-150">
                <div className="flex items-center gap-3 w-36 shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 group-hover:bg-amber-500/10 group-hover:text-amber-500 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 transition-colors">
                    {workStats.row2.icon === "points" ? (
                      <Flame size={16} strokeWidth={2} />
                    ) : (
                      <Folder size={16} strokeWidth={2} />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{workStats.row2.label}</span>
                </div>

                <div className="w-20 shrink-0">
                  <div className="text-lg font-bold text-slate-950 dark:text-white leading-tight font-mono tabular-nums">
                    <MarloNumber value={workStats.row2.total} durationMs={380} delayMs={30} />
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                    <MarloNumber value={workStats.row2.done} durationMs={380} delayMs={30} /> done
                  </div>
                </div>

                {/* Progress Capsules Bar */}
                <div className="flex-1 flex items-center gap-2 sm:gap-2.5 h-10 min-w-0">
                  {workStats.row2.done > 0 && (
                    <div
                      style={{ flex: Math.max(1, workStats.row2.done) }}
                      className="cap__seg h-10 rounded-full bg-[#14161a] dark:bg-white text-white dark:text-slate-950 flex items-center justify-end px-4 font-bold text-xs shadow-2xs min-w-[36px] cursor-pointer transition-[flex-grow] duration-300"
                      title={`Done: ${workStats.row2.done}`}
                    >
                      <span className="tabular-nums"><MarloNumber value={workStats.row2.done} durationMs={380} delayMs={30} /></span>
                    </div>
                  )}
                  {workStats.row2.moving > 0 && (
                    <div
                      style={{ flex: Math.max(1, workStats.row2.moving), background: "linear-gradient(to right, #f59e0b, #fbbf24)" }}
                      className="cap__seg h-10 rounded-full text-slate-950 flex items-center justify-end px-4 font-bold text-xs shadow-2xs min-w-[36px] cursor-pointer transition-[flex-grow] duration-300"
                      title={`Moving: ${workStats.row2.moving}`}
                    >
                      <span className="tabular-nums"><MarloNumber value={workStats.row2.moving} durationMs={380} delayMs={30} /></span>
                    </div>
                  )}
                  {workStats.row2.waiting > 0 && (
                    <div
                      style={{ flex: Math.max(1, workStats.row2.waiting) }}
                      className="cap__seg h-10 rounded-full bg-[#e5e7eb] dark:bg-[#232733] text-slate-700 dark:text-slate-300 flex items-center justify-end px-3.5 font-bold text-xs min-w-[32px] cursor-pointer transition-[flex-grow] duration-300"
                      title={`Waiting: ${workStats.row2.waiting}`}
                    >
                      <span className="tabular-nums"><MarloNumber value={workStats.row2.waiting} durationMs={380} delayMs={30} /></span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={workStats.row2.navigate}
                  className="cap__go w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors duration-150 cursor-pointer shadow-2xs shrink-0 active:scale-95 ml-auto sm:ml-0"
                  title={workStats.row2.navTitle}
                >
                  <ArrowUpRight size={15} />
                </button>
              </div>

              {/* 3. Reviews Row */}
              <div className="marlo-row cap__row group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-2 px-2.5 -mx-2.5 rounded-2xl hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors duration-150">
                <div className="flex items-center gap-3 w-36 shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 group-hover:bg-amber-500/10 group-hover:text-amber-500 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 transition-colors">
                    <Eye size={16} strokeWidth={2} />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{workStats.row3.label}</span>
                </div>

                <div className="w-20 shrink-0">
                  <div className="text-lg font-bold text-slate-950 dark:text-white leading-tight font-mono tabular-nums">
                    <MarloNumber value={workStats.row3.total} durationMs={380} delayMs={60} />
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                    <MarloNumber value={workStats.row3.done} durationMs={380} delayMs={60} /> done
                  </div>
                </div>

                {/* Progress Capsules Bar */}
                <div className="flex-1 flex items-center gap-2 sm:gap-2.5 h-10 min-w-0">
                  {workStats.row3.done > 0 && (
                    <div
                      style={{ flex: Math.max(1, workStats.row3.done) }}
                      className="cap__seg h-10 rounded-full bg-[#14161a] dark:bg-white text-white dark:text-slate-950 flex items-center justify-end px-4 font-bold text-xs shadow-2xs min-w-[36px] cursor-pointer transition-[flex-grow] duration-300"
                      title={`Done: ${workStats.row3.done}`}
                    >
                      <span className="tabular-nums"><MarloNumber value={workStats.row3.done} durationMs={380} delayMs={60} /></span>
                    </div>
                  )}
                  {workStats.row3.moving > 0 && (
                    <div
                      style={{ flex: Math.max(1, workStats.row3.moving), background: "linear-gradient(to right, #f59e0b, #fbbf24)" }}
                      className="cap__seg h-10 rounded-full text-slate-950 flex items-center justify-end px-4 font-bold text-xs shadow-2xs min-w-[36px] cursor-pointer transition-[flex-grow] duration-300"
                      title={`Moving: ${workStats.row3.moving}`}
                    >
                      <span className="tabular-nums"><MarloNumber value={workStats.row3.moving} durationMs={380} delayMs={60} /></span>
                    </div>
                  )}
                  {workStats.row3.waiting > 0 && (
                    <div
                      style={{ flex: Math.max(1, workStats.row3.waiting) }}
                      className="cap__seg h-10 rounded-full bg-[#e5e7eb] dark:bg-[#232733] text-slate-700 dark:text-slate-300 flex items-center justify-end px-3.5 font-bold text-xs min-w-[32px] cursor-pointer transition-[flex-grow] duration-300"
                      title={`Waiting: ${workStats.row3.waiting}`}
                    >
                      <span className="tabular-nums"><MarloNumber value={workStats.row3.waiting} durationMs={380} delayMs={60} /></span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={workStats.row3.navigate}
                  className="cap__go w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors duration-150 cursor-pointer shadow-2xs shrink-0 active:scale-95 ml-auto sm:ml-0"
                  title={workStats.row3.navTitle}
                >
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* 🌟 D. VIỆC CẦN LÀM HÔM NAY (NEXT UP TASKS VỚI NHÃN DỰ ÁN RÕ RÀNG) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Clock3 size={16} className="text-[#EE8420]" />
                <h3 className="text-base font-bold text-slate-950 dark:text-white">
                  Việc cần làm hôm nay (Next up)
                </h3>
              </div>

              <button
                onClick={() => onNavigate("kanban")}
                className="text-xs font-bold text-[#8F5404] dark:text-amber-400 hover:text-[#EE8420] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Xem bảng Kanban</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* CARD 1: ACTIVE TASKS (In progress & Up next) */}
            {tasks.filter((t) => !t.done).length > 0 && (
              <div className="marlo-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="divide-y divide-slate-100/90 dark:divide-slate-800/70">
                  {tasks
                    .filter((t) => !t.done)
                    .map((task) => (
                      <div
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className="marlo-row group flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none"
                      >
                        {/* Checkbox + Title + Subtitle */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTask(task.id);
                            }}
                            className="shrink-0 flex h-5 w-5 items-center justify-center rounded-[5px] border border-slate-300 dark:border-slate-600 hover:border-[#EE8420] bg-white dark:bg-slate-800 transition-colors cursor-pointer"
                            title="Đánh dấu đã hoàn thành"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                {task.projectName}
                              </span>
                              <h4 className="text-[13.5px] font-medium leading-snug text-slate-900 dark:text-slate-100 transition-colors truncate">
                                {task.label}
                              </h4>
                            </div>
                            <p className="text-[11.5px] text-slate-400 dark:text-slate-500 font-normal mt-0.5 truncate">
                              {task.epic} · {task.duration}
                            </p>
                          </div>
                        </div>

                        {/* Status + Due date */}
                        <div className="flex items-center gap-3.5 shrink-0 ml-2">
                          {task.status === "in-progress" ? (
                            <span className="pill pill--warn text-[11px] font-medium">
                              In progress
                            </span>
                          ) : (
                            <span className="pill pill--plain text-[11px] font-medium">
                              Up next
                            </span>
                          )}

                          <span className="text-[11.5px] text-slate-400 dark:text-slate-500 font-normal min-w-[65px] sm:min-w-[75px] text-right whitespace-nowrap">
                            {task.due}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* CARD 2: DONE LATELY */}
            {tasks.filter((t) => t.done).length > 0 && (
              <div className="marlo-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between px-4 sm:px-5 pt-3.5 pb-2.5">
                  <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                    Done lately
                  </h3>
                  <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 font-mono">
                    {tasks.filter((t) => t.done).length}
                  </span>
                </div>

                <div className="divide-y divide-slate-100/90 dark:divide-slate-800/70">
                  {tasks
                    .filter((t) => t.done)
                    .map((task) => (
                      <div
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className="marlo-row group flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none bg-slate-50/20 dark:bg-slate-900/30"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTask(task.id);
                            }}
                            className="shrink-0 flex h-5 w-5 items-center justify-center rounded-[5px] bg-[#EE8420] border border-[#EE8420] text-white shadow-2xs transition-colors cursor-pointer"
                            title="Đánh dấu chưa hoàn thành"
                          >
                            <Check size={13} strokeWidth={3.5} className="text-white" />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {task.projectName}
                              </span>
                              <h4 className="text-[13.5px] font-medium leading-snug line-through text-slate-400 dark:text-slate-500 truncate">
                                {task.label}
                              </h4>
                            </div>
                            <p className="text-[11.5px] text-slate-400 dark:text-slate-500 font-normal mt-0.5 truncate">
                              {task.epic} · {task.duration}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3.5 shrink-0 ml-2">
                          <span className="pill pill--good text-[11px] font-medium">
                            Done
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═══ RIGHT ASIDE STACK (MARLO METRICS & ROTAS LIÊN KẾT TRỰC TIẾP DỰ ÁN) ═══ */}
        <aside className="space-y-5">
          <div ref={asideProjectRef} className="space-y-5">
            {selectedProject ? (
              <>
                {/* 1. MARLO TASK STATUS DONUT (Gắn trực tiếp với dự án đang chọn) */}
                <MarloActivityRing
                  className="marlo-aside-card"
                  size={128}
                  centerValue={selectedProgressPct}
                  centerLabel="tiến độ"
                  title={selectedProject.name.split(" - ")[0]}
                  subtitle={`Sprint · ${selectedProject.tasksDone}/${selectedProject.tasksTotal} task`}
                  actionText="Bảng Kanban"
                  onAction={() => onNavigate("kanban")}
                  segments={[
                    {
                      id: "upnext",
                      label: "Chờ làm",
                      value: Math.max(10, Math.round(((selectedProject.tasksTotal - selectedProject.tasksDone) * 0.4) / Math.max(1, selectedProject.tasksTotal) * 100)),
                      count: Math.max(0, Math.round((selectedProject.tasksTotal - selectedProject.tasksDone) * 0.4)),
                      color: "#cbd5e1"
                    },
                    {
                      id: "prog",
                      label: "Đang làm",
                      value: Math.max(15, Math.round(((selectedProject.tasksTotal - selectedProject.tasksDone) * 0.6) / Math.max(1, selectedProject.tasksTotal) * 100)),
                      count: Math.max(0, Math.round((selectedProject.tasksTotal - selectedProject.tasksDone) * 0.6)),
                      color: "#f97316"
                    },
                    {
                      id: "review",
                      label: "Cần review",
                      value: 15,
                      count: 0,
                      color: "#64748b"
                    },
                    {
                      id: "done",
                      label: "Đã hoàn thành",
                      value: selectedProgressPct,
                      count: selectedProject.tasksDone,
                      color: "#1e293b"
                    },
                  ]}
                />

                {/* 2. MARLO SPRINT CAPACITY BAR (Gắn với số Story Points của dự án đang chọn) */}
                <div className="marlo-aside-card">
                  <MarloCapacityBar
                    title={`Năng lực: ${selectedProject.name.split(" - ")[0]}`}
                    subtitle={`Phân bổ ${selectedProject.storyPoints} Story Points`}
                    items={[
                      { id: "done", label: "Đã xong", count: selectedProject.pointsBurned, color: "#14161a" },
                      { id: "prog", label: "Đang làm", count: Math.round((selectedProject.storyPoints - selectedProject.pointsBurned) * 0.6), color: "#f59e0b" },
                      { id: "review", label: "Review", count: Math.round((selectedProject.storyPoints - selectedProject.pointsBurned) * 0.25), color: "#fbbf24" },
                      { id: "backlog", label: "Tồn đọng", count: Math.max(0, selectedProject.storyPoints - selectedProject.pointsBurned - Math.round((selectedProject.storyPoints - selectedProject.pointsBurned) * 0.85)), color: "#94a3b8" },
                    ]}
                  />
                </div>
              </>
            ) : !projectsLoaded ? (
              <>
                <div className="marlo-card surface rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 animate-pulse min-h-[252px]">
                  <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-36 rounded-xl bg-slate-100 dark:bg-slate-800/60" />
                </div>
                <div className="marlo-card surface rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5 animate-pulse min-h-[144px]">
                  <div className="h-3.5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-8 rounded-xl bg-slate-100 dark:bg-slate-800/60" />
                  <div className="h-4 w-56 rounded bg-slate-100 dark:bg-slate-800/60" />
                </div>
              </>
            ) : (
              <div className="marlo-aside-card surface rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 text-center">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <FolderKanban size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Chưa tham gia đồ án nào
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Tạo đồ án đầu tiên hoặc đồng ý lời mời từ Nhóm trưởng để theo dõi Sprint &amp; Story Points.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate("projects")}
                  className="w-full py-2 px-3 rounded-xl bg-[#EE8420] hover:bg-[#d97316] text-slate-950 text-xs font-bold transition cursor-pointer"
                >
                  Tạo / Xem Đồ Án →
                </button>
              </div>
            )}
          </div>

          {/* 3. CA THI & HẸN GẶP HÔM NAY (TODAY'S BOOKED SESSIONS) */}
          <div className="marlo-card surface rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-[#EE8420]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Lịch bảo vệ & Ca hẹn hôm nay
                </h4>
              </div>
              <button
                onClick={() => onNavigate("schedule")}
                className="text-[11px] font-bold text-[#EE8420] hover:underline cursor-pointer"
              >
                Mở Calendar ↗
              </button>
            </div>

            {/* Live Academic Schedules & Appointments */}
            <div ref={scheduleListRef} className="space-y-2.5 min-h-[152px]">
              {!schedulesLoaded && upcomingSchedules.length === 0 ? (
                <div className="space-y-2.5">
                  <div className="h-[68px] rounded-xl bg-slate-100/80 dark:bg-slate-800/60 animate-pulse" />
                  <div className="h-[68px] rounded-xl bg-slate-100/80 dark:bg-slate-800/60 animate-pulse" />
                </div>
              ) : upcomingSchedules.length === 0 ? (
                <div
                  onClick={() => onNavigate("schedule")}
                  className="marlo-schedule-row p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 hover:border-[#EE8420] transition-[border-color,background-color] duration-150 cursor-pointer text-xs text-slate-500 dark:text-slate-400"
                >
                  Chưa có ca thi hoặc lịch hẹn sắp tới. Bấm để xem toàn bộ lịch học vụ.
                </div>
              ) : (
                upcomingSchedules.map((sch) => {
                  const fmtH = (h: number) => {
                    const total = Math.max(0, Math.round(h * 60));
                    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
                  };
                  const parts = (sch.schedule_date || "").split("-");
                  const dateShort = parts.length === 3 ? `${parts[2]}/${parts[1]}` : sch.schedule_date;
                  const bStatus = sch.my_booking?.booking_status;
                  const badge = bStatus === "confirmed"
                    ? { label: "Đã xác nhận", dot: "bg-emerald-500" }
                    : bStatus === "pending"
                    ? { label: "Chờ GV duyệt", dot: "bg-amber-500" }
                    : sch.is_locked
                    ? { label: "Đã khóa", dot: "bg-rose-500" }
                    : { label: "Đang mở", dot: "bg-sky-500" };

                  return (
                    <div
                      key={sch.id}
                      onClick={() => onNavigate("schedule")}
                      className="marlo-schedule-row p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-[border-color,background-color] duration-150 cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {sch.title}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-[10px] shrink-0">
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          <span>{badge.label}</span>
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <Clock size={12} className="text-[#EE8420] shrink-0" />
                        <span>
                          {dateShort} · {fmtH(sch.start_hour)} – {fmtH(sch.end_hour)}
                        </span>
                        <span>·</span>
                        <span className="truncate font-sans">{sch.room_or_link}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ── FLOATING TOAST NOTIFICATION WITH UNDO PILL ── */}
      {toastMessage && (
        <MarloToast
          message={toastMessage}
          onUndo={lastToggledTaskId !== null ? handleUndoTask : undefined}
        />
      )}
    </div>
  );
}
