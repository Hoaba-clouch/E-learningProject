import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import { animateMarloElasticPill } from "../utils/marloAnimations";
import {
  Code2,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle2,
  Play,
  FileText,
  HelpCircle,
  Video,
  Lock,
  Sparkles,
  Clock,
  Star,
  BookOpen,
  GitBranch,
} from "lucide-react";
import type { SubjectModuleData, ChapterItem, LessonItem } from "../data/multiChapterCurriculum";
import {
  getLessonDisplayCode,
  stripDuplicateChapterPrefix,
  stripDuplicateLessonCode,
} from "../utils/lessonFormat";

interface MultiChapterSidebarProps {
  subject: SubjectModuleData;
  activeLessonId: string;
  activeChapterId?: string;
  activeTab: "lecture" | "video" | "quiz" | "mindmap" | "exercise";
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectLesson: (lessonId: string, type?: "lecture" | "video" | "quiz") => void;
  onOpenMindmap: (chapterId?: string) => void;
  onOpenExercise: (chapterId?: string) => void;
}

interface ChapterLessonGroupProps {
  chapter: ChapterItem;
  activeLessonId: string;
  activeChapterId?: string;
  activeTab: "lecture" | "video" | "quiz" | "mindmap" | "exercise";
  ripples: Array<{ id: number; x: number; y: number; key: string }>;
  triggerWaterRipple: (e: React.MouseEvent<HTMLButtonElement>, key: string) => void;
  onSelectLesson: (lessonId: string, type?: "lecture" | "video" | "quiz") => void;
  onOpenMindmap: (chapterId?: string) => void;
  onOpenExercise: (chapterId: string) => void;
}

function ChapterLessonGroup({
  chapter,
  activeLessonId,
  activeChapterId,
  activeTab,
  ripples,
  triggerWaterRipple,
  onSelectLesson,
  onOpenMindmap,
  onOpenExercise,
}: ChapterLessonGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const isCurrentChapter = activeChapterId
    ? chapter.id === activeChapterId
    : chapter.lessons.some((l) => l.id === activeLessonId);

  const activeKey = !isCurrentChapter
    ? null
    : activeTab === "mindmap"
    ? `mindmap-${chapter.id}`
    : activeTab === "exercise"
    ? `exercise-${chapter.id}`
    : activeLessonId;

  const getActiveElement = () => {
    if (!activeKey) return null;
    return containerRef.current?.querySelector<HTMLElement>(`[data-lesson-key="${activeKey}"]`);
  };

  useLayoutEffect(() => {
    const activeEl = getActiveElement();
    animateMarloElasticPill(pillRef.current, activeEl, {
      animate: !isFirstRender.current,
    });
    isFirstRender.current = false;
  }, [activeKey]);

  useEffect(() => {
    const handleResize = () => {
      animateMarloElasticPill(pillRef.current, getActiveElement(), { animate: false });
    };
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    document.fonts?.ready?.then(handleResize);
    const rafId = requestAnimationFrame(handleResize);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [activeKey]);

  return (
    <div
      ref={containerRef}
      className="relative animate-accordion-expand bg-slate-50/70 dark:bg-slate-950/40 p-2 flex flex-col gap-1.5 rounded-xl"
    >
      {/* 🏷️ Marlo Elastic Active Pill */}
      <div
        ref={pillRef}
        aria-hidden="true"
        className="pointer-events-none opacity-0 absolute z-0 rounded-[14px] bg-[#141619] dark:bg-[#F4F4F6] shadow-[0_4px_16px_rgba(0,0,0,0.14)]"
      />

      {chapter.lessons.map((lesson, lIdx) => {
        const isActive = activeKey === lesson.id;
        const displayCode = getLessonDisplayCode(
          lesson.id,
          lesson.title,
          chapter.number,
          lIdx
        );
        const cleanTitle = stripDuplicateLessonCode(lesson.title, displayCode);

        return (
          <button
            key={lesson.id}
            data-lesson-key={lesson.id}
            onClick={(e) => {
              triggerWaterRipple(e, lesson.id);
              onSelectLesson(lesson.id, lesson.type);
            }}
            className={`lesson-nav-item outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 select-none relative z-10 overflow-hidden w-full flex items-center justify-between p-2.5 rounded-[14px] text-left cursor-pointer transition-colors duration-150 active:scale-[0.98] ${
              isActive
                ? "text-white dark:text-[#141619] font-bold"
                : "text-[#3B404D] dark:text-[#C4C7D0] font-medium hover:bg-[#F0F1F3] dark:hover:bg-[#1E202B] hover:text-[#141619] dark:hover:text-white"
            }`}
          >
            {/* 🌊 Hiệu ứng lan nước khi click (Water Ripple & Crest Ring) */}
            {ripples
              .filter((r) => r.key === lesson.id)
              .map((r) => (
                <React.Fragment key={r.id}>
                  <span
                    className="pointer-events-none absolute rounded-full animate-water-ripple"
                    style={{
                      left: r.x,
                      top: r.y,
                      width: "300px",
                      height: "300px",
                    }}
                  />
                  <span
                    className="pointer-events-none absolute rounded-full animate-water-ring"
                    style={{
                      left: r.x,
                      top: r.y,
                      width: "240px",
                      height: "240px",
                    }}
                  />
                </React.Fragment>
              ))}

            <div className="relative z-10 flex items-center gap-2.5 min-w-0 pr-2 pl-0.5">
              {/* Step Type Icon */}
              <div
                className={`p-1.5 rounded-lg shrink-0 transition-all duration-200 ${
                  isActive
                    ? "bg-white/20 dark:bg-black/15 text-white dark:text-[#141619]"
                    : lesson.status === "done"
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {lesson.type === "video" ? (
                  <Video size={14} />
                ) : lesson.type === "quiz" ? (
                  <HelpCircle size={14} />
                ) : (
                  <FileText size={14} />
                )}
              </div>

              <div className="min-w-0">
                <span
                  className={`text-sm leading-snug block truncate transition-colors duration-150 ${
                    isActive
                      ? "text-white dark:text-[#141619] font-bold"
                      : "text-slate-900 dark:text-slate-100 font-semibold"
                  }`}
                >
                  {displayCode} · {cleanTitle}
                </span>
                <div
                  className={`flex items-center gap-2.5 text-xs mt-1 transition-colors duration-150 ${
                    isActive
                      ? "text-white/70 dark:text-slate-600"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <span className="font-mono whitespace-nowrap">{lesson.duration}</span>
                  <span
                    className={`font-bold whitespace-nowrap transition-colors duration-150 ${
                      isActive
                        ? "text-amber-300 dark:text-amber-700 font-mono"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    +{lesson.xp} XP
                  </span>
                </div>
              </div>
            </div>

            {/* Status Check / Icon */}
            <div className="relative z-10 shrink-0">
              {lesson.status === "done" ? (
                <CheckCircle2
                  size={16}
                  className={`transition-colors duration-150 ${
                    isActive
                      ? "text-emerald-300 dark:text-emerald-700"
                      : "text-emerald-500"
                  }`}
                />
              ) : isActive ? (
                <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              ) : (
                <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
              )}
            </div>
          </button>
        );
      })}

      {/* 💻 Bài tập Thực hành (Code Lab) của CHƯƠNG */}
      <button
        data-lesson-key={`exercise-${chapter.id}`}
        onClick={(e) => {
          triggerWaterRipple(e, `exercise-${chapter.id}`);
          onOpenExercise?.(chapter.id);
        }}
        className={`lesson-nav-item outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 select-none relative z-10 overflow-hidden w-full flex items-center justify-between p-2.5 rounded-[14px] text-left cursor-pointer transition-colors duration-150 active:scale-[0.98] ${
          activeKey === `exercise-${chapter.id}`
            ? "text-white dark:text-[#141619] font-bold"
            : "text-[#3B404D] dark:text-[#C4C7D0] font-medium hover:bg-[#F0F1F3] dark:hover:bg-[#1E202B] hover:text-[#141619] dark:hover:text-white"
        }`}
      >
        {ripples
          .filter((r) => r.key === `exercise-${chapter.id}`)
          .map((r) => (
            <span
              key={r.id}
              className="pointer-events-none absolute rounded-full animate-water-ripple"
              style={{
                left: r.x,
                top: r.y,
                width: "90px",
                height: "90px",
              }}
            />
          ))}

        <div className="relative z-10 flex items-center gap-2.5 min-w-0 pr-1 pl-0.5">
          <div
            className={`p-1.5 rounded-lg shrink-0 transition-colors duration-200 ${
              activeKey === `exercise-${chapter.id}`
                ? "bg-white/20 dark:bg-black/15 text-white dark:text-[#141619]"
                : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            <Code2 size={14} />
          </div>
          <div className="min-w-0">
            <span
              className={`text-xs leading-tight block truncate ${
                activeKey === `exercise-${chapter.id}`
                  ? "text-white dark:text-[#141619] font-bold"
                  : "text-slate-900 dark:text-slate-100 font-semibold"
              }`}
            >
              Bài tập Thực hành Chương {chapter.number}
            </span>
            <span
              className={`text-[11px] font-medium block truncate mt-0.5 ${
                activeKey === `exercise-${chapter.id}`
                  ? "text-white/70 dark:text-slate-600"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Đề bài & Link nộp bài
            </span>
          </div>
        </div>
        <span
          className={`relative z-10 text-xs font-bold font-mono px-2 py-0.5 rounded-md shrink-0 transition-colors duration-150 border-0 outline-none ring-0 ${
            activeKey === `exercise-${chapter.id}`
              ? "bg-[#EE8420] text-white"
              : "bg-amber-100/70 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
          }`}
        >
          +100 XP
        </span>
      </button>

      {/* 🌿 Sơ đồ tư duy (Mindmap) Nằm ở CUỐI CHƯƠNG */}
      <button
        data-lesson-key={`mindmap-${chapter.id}`}
        onClick={(e) => {
          triggerWaterRipple(e, `mindmap-${chapter.id}`);
          onOpenMindmap(chapter.id);
        }}
        className={`lesson-nav-item outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 select-none relative z-10 overflow-hidden w-full flex items-center justify-between p-2.5 rounded-[14px] text-left cursor-pointer transition-colors duration-150 active:scale-[0.98] ${
          activeKey === `mindmap-${chapter.id}`
            ? "text-white dark:text-[#141619] font-bold"
            : "text-[#3B404D] dark:text-[#C4C7D0] font-medium hover:bg-[#F0F1F3] dark:hover:bg-[#1E202B] hover:text-[#141619] dark:hover:text-white"
        }`}
      >
        {ripples
          .filter((r) => r.key === `mindmap-${chapter.id}`)
          .map((r) => (
            <span
              key={r.id}
              className="pointer-events-none absolute rounded-full animate-water-ripple"
              style={{
                left: r.x,
                top: r.y,
                width: "90px",
                height: "90px",
              }}
            />
          ))}

        <div className="relative z-10 flex items-center gap-2.5 min-w-0 pr-1 pl-0.5">
          <div
            className={`p-1.5 rounded-lg shrink-0 transition-colors duration-200 ${
              activeKey === `mindmap-${chapter.id}`
                ? "bg-white/20 dark:bg-black/15 text-white dark:text-[#141619]"
                : "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400"
            }`}
          >
            <GitBranch size={14} />
          </div>
          <div className="min-w-0">
            <span
              className={`text-xs leading-tight block truncate ${
                activeKey === `mindmap-${chapter.id}`
                  ? "text-white dark:text-[#141619] font-bold"
                  : "text-slate-900 dark:text-slate-100 font-semibold"
              }`}
            >
              Sơ đồ Tư duy (Mindmap Canvas)
            </span>
            <span
              className={`text-[11px] font-medium block truncate mt-0.5 ${
                activeKey === `mindmap-${chapter.id}`
                  ? "text-white/70 dark:text-slate-600"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Hệ thống hóa kiến thức Chương {chapter.number}
            </span>
          </div>
        </div>
        <span
          className={`relative z-10 text-xs font-bold font-mono px-2 py-0.5 rounded-md shrink-0 transition-colors duration-150 border-0 outline-none ring-0 ${
            activeKey === `mindmap-${chapter.id}`
              ? "bg-[#EE8420] text-white"
              : "bg-purple-100/70 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
          }`}
        >
          Toàn chương
        </span>
      </button>
    </div>
  );
}

export function MultiChapterSidebar({
  subject,
  activeLessonId,
  activeChapterId,
  activeTab,
  collapsed,
  onToggleCollapse,
  onSelectLesson,
  onOpenMindmap,
  onOpenExercise,
}: MultiChapterSidebarProps) {
  // Determine initially open chapters (open chapter containing active lesson)
  const initialOpenChapters = subject.chapters.reduce<Record<string, boolean>>((acc, chap) => {
    const hasActive = (chap.lessons || []).some((l) => l.id === activeLessonId);
    acc[chap.id] = hasActive || chap.number === 1;
    return acc;
  }, {});

  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(initialOpenChapters);

  useEffect(() => {
    const targetChap =
      (activeChapterId && subject.chapters.find((c) => c.id === activeChapterId)) ||
      subject.chapters.find((c) => (c.lessons || []).some((l) => l.id === activeLessonId));
    if (targetChap) {
      setOpenChapters((prev) => (prev[targetChap.id] ? prev : { ...prev, [targetChap.id]: true }));
    }
  }, [activeLessonId, activeChapterId, subject.chapters]);

  // 🌊 Lan nước khi bấm chuyển bài học
  const [ripples, setRipples] = useState<
    Array<{ id: number; x: number; y: number; key: string }>
  >([]);

  const triggerWaterRipple = (e: React.MouseEvent<HTMLButtonElement>, key: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newRipple = { id: Date.now() + Math.random(), x, y, key };
    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 700);
  };

  const toggleChapter = (chapterId: string) => {
    setOpenChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  if (collapsed) {
    return (
      <aside className="w-16 rounded-[26px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#14161F] py-3.5 flex flex-col items-center gap-2 shrink-0 shadow-xs overflow-hidden h-full select-none">
        <button
          onClick={onToggleCollapse}
          className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
          title="Mở rộng mục lục bài học"
        >
          <PanelLeftOpen size={16} />
        </button>

        <div className="h-px w-8 bg-slate-200/80 dark:bg-slate-800 my-1" />

        {/* Chapter numbers rail */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center gap-2 w-full px-2 py-1">
          {subject.chapters.map((chapter) => {
            const isChapterActive = (chapter.lessons || []).some((l) => l.id === activeLessonId);
            const isDone = chapter.progressPct === 100;
            return (
              <button
                key={chapter.id}
                onClick={() => {
                  onToggleCollapse();
                  setOpenChapters((prev) => ({ ...prev, [chapter.id]: true }));
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-all cursor-pointer relative ${
                  isChapterActive
                    ? "bg-[#f59e0b] text-slate-950 font-black shadow-xs ring-2 ring-[#f59e0b]/30"
                    : isDone
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                title={`Chương ${chapter.number}: ${stripDuplicateChapterPrefix(chapter.title, chapter.number)} (${chapter.progressPct}% hoàn thành)`}
              >
                {chapter.number.toString().padStart(2, "0")}
                {isDone && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 xl:w-[340px] rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex flex-col shrink-0 shadow-xs select-none overflow-hidden h-full">
      {/* ─── SIDEBAR HEADER: SUBJECT & OVERALL PROGRESS ───────────── */}
      <div className="border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
            {subject.code} · {subject.semester}
          </span>
          <button
            onClick={onToggleCollapse}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs active:scale-95"
            title="Thu nhỏ mục lục"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        <h2 className="mt-2 text-base font-bold text-slate-900 dark:text-white leading-tight">
          Nội dung khóa học
        </h2>

        {/* Overall Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            <span>Tiến độ toàn môn:</span>
            <span className="text-amber-500 dark:text-amber-400 font-bold font-mono text-sm">
              {subject.overallProgress}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700"
              style={{ width: `${subject.overallProgress}%` }}
            />
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-medium font-mono">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {(() => {
              const allLessons = subject.chapters.flatMap((c) => c.lessons || []);
              const earnedXp = allLessons
                .filter((l) => l.status === "done")
                .reduce((sum, l) => sum + (Number(l.xp) || 0), 0);
              const totalXp = allLessons.reduce((sum, l) => sum + (Number(l.xp) || 0), 0);
              return `${earnedXp}/${totalXp} XP môn học`;
            })()}
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <Clock size={13} />
            {subject.totalDuration}
          </span>
        </div>
      </div>

      {/* ─── MULTI-CHAPTER ACCORDION LIST (CHUẨN F8) ──────────────── */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
        {subject.chapters.map((chapter, cIdx) => {
          const isOpen = openChapters[chapter.id] ?? false;

          return (
            <div key={chapter.id} className="transition-colors">
              {/* Chapter Accordion Header */}
              <button
                onClick={() => toggleChapter(chapter.id)}
                className="marlo-card marlo-item-interactive outline-none focus:outline-none select-none w-full flex items-start justify-between p-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                style={{ animationDelay: `${cIdx * 0.05}s` }}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Chương {chapter.number}
                    </span>
                    {chapter.progressPct === 100 && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Hoàn thành
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition leading-snug mt-1">
                    {stripDuplicateChapterPrefix(chapter.title, chapter.number)}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-mono">
                    <span>{(chapter.lessons?.length || 0)} bài học</span>
                    <span>•</span>
                    <span>{chapter.duration}</span>
                  </div>
                </div>

                <div className="pt-1 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition">
                  {isOpen ? (
                    <ChevronDown size={18} className="text-blue-600 transition-transform" />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                </div>
              </button>

              {/* Chapter Lessons List (Expandable with Elastic Rubberband Nav Pill) */}
              {isOpen && (
                <ChapterLessonGroup
                  chapter={chapter}
                  activeLessonId={activeLessonId}
                  activeChapterId={activeChapterId}
                  activeTab={activeTab}
                  ripples={ripples}
                  triggerWaterRipple={triggerWaterRipple}
                  onSelectLesson={onSelectLesson}
                  onOpenMindmap={onOpenMindmap}
                  onOpenExercise={onOpenExercise}
                />
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
