import React, { useState, useRef, useEffect } from "react";
import {
  Clock,
  BookmarkPlus,
  Trash2,
  ExternalLink,
  BookOpen,
  FileText,
  GitBranch,
  Share2,
  Check,
  CheckCircle2,
  UserCheck,
  ChevronRight,
  ListOrdered,
  Play,
  ShieldAlert,
} from "lucide-react";
import {
  getF8VideoLecture,
  type VideoLectureInfo,
  type VideoNote,
  type VideoChapter,
} from "../data/videoLectureData";
import {
  fetchStudentVideoNotes,
  createStudentVideoNote,
  deleteStudentVideoNote,
} from "../api";
import type { MentorMascot } from "../App";
import LiquidCardConnector from "./LiquidCardConnector";

interface LessonVideoStudioProps {
  subjectId: string;
  userId?: string;
  lessonId?: string;
  lessonTitle?: string;
  instructorName?: string;
  lessonDescription?: string;
  lessonDocuments?: { name: string; size?: string; uploadedAt?: string; url?: string }[];
  quizCount?: number;
  initialWatchedSeconds?: number;
  mentorMascot: MentorMascot;
  onNavigateToTab?: (tab: "lecture" | "quiz" | "code" | "mindmap") => void;
  customYoutubeId?: string;
  customScenes?: { id?: string; title: string; text?: string; script?: string; time?: string }[];
  isVideoCompleted?: boolean;
  onVideoCompleted?: (lessonId: string) => void;
  onVideoProgressChange?: (watchedSec: number, durationSec: number, completed: boolean) => void;
}

function parseTimeLabelToSeconds(label?: string, fallbackSec = 0): number {
  if (!label) return fallbackSec;
  const parts = label
    .trim()
    .split(":")
    .map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return fallbackSec;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return fallbackSec;
}

export function LessonVideoStudio({
  subjectId,
  userId = "student-demo",
  lessonId,
  lessonTitle,
  instructorName,
  lessonDescription,
  lessonDocuments,
  quizCount,
  initialWatchedSeconds = 0,
  mentorMascot,
  onNavigateToTab,
  customYoutubeId,
  customScenes,
  isVideoCompleted = false,
  onVideoCompleted,
  onVideoProgressChange,
}: LessonVideoStudioProps) {
  const currentVideo: VideoLectureInfo = getF8VideoLecture(subjectId, lessonId, lessonTitle);
  const resolvedLessonId = lessonId || currentVideo.lessonId || "1.1";
  const effectiveYoutubeId = (customYoutubeId && customYoutubeId.trim()) ? customYoutubeId.trim() : currentVideo.youtubeId;
  const effectiveTitle = (lessonTitle && lessonTitle.trim()) ? lessonTitle.trim() : currentVideo.title;
  const effectiveInstructor = (instructorName && instructorName.trim()) ? instructorName.trim() : currentVideo.instructor;
  const effectiveOverview = (lessonDescription && lessonDescription.trim()) ? lessonDescription.trim() : currentVideo.overview;
  const effectiveQuizCount = typeof quizCount === "number" && quizCount > 0 ? quizCount : 3;

  const effectiveChapters: VideoChapter[] = (customScenes && customScenes.length > 0)
    ? customScenes.map((s, idx) => ({
        timeSec: parseTimeLabelToSeconds(s.time, idx * 180),
        timestamp: s.time || `${String(idx * 3).padStart(2, "0")}:00`,
        title: s.title || `Phân cảnh ${idx + 1}`,
        description: s.text || s.script || "",
      }))
    : currentVideo.chapters;

  const effectiveResources = [
    ...(lessonDocuments || []).map((doc) => ({
      title: `${doc.name}${doc.size ? ` (${doc.size})` : ""}`,
      url: doc.url && doc.url.startsWith("http") ? doc.url : `#doc-${encodeURIComponent(doc.name)}`,
      type: "slide" as const,
      isExternal: Boolean(doc.url && doc.url.startsWith("http")),
    })),
    ...currentVideo.resources.map((r) => ({ ...r, isExternal: true })),
  ];

  const [activeTab, setActiveTab] = useState<"chapters" | "notes" | "resources">("chapters");
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [currentSeconds, setCurrentSeconds] = useState<number>(initialWatchedSeconds || 0);
  const [realWatchedSec, setRealWatchedSec] = useState<number>(initialWatchedSeconds || 0);
  const [videoDurationSec, setVideoDurationSec] = useState<number>(
    parseTimeLabelToSeconds(currentVideo.duration, 300)
  );
  const [playerState, setPlayerState] = useState<number>(-1); // 1 = playing, 2 = paused, 0 = ended
  const [hasInteractedWithPlayer, setHasInteractedWithPlayer] = useState<boolean>(false);
  const [notes, setNotes] = useState<VideoNote[]>(currentVideo.defaultNotes);
  const [newNoteText, setNewNoteText] = useState<string>("");
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);
  const [videoTimestamp, setVideoTimestamp] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [localWatched, setLocalWatched] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerIdRef = useRef<string>(`yt-${subjectId}-${resolvedLessonId}-${Math.random().toString(36).slice(2, 7)}`);
  const lastReportedSecRef = useRef<number>(0);

  const isEffectiveCompleted = isVideoCompleted || localWatched;
  const watchProgressPct = isEffectiveCompleted
    ? 100
    : videoDurationSec > 0
    ? Math.min(99, Math.round((realWatchedSec / videoDurationSec) * 100))
    : 0;
  const canConfirmWatch = watchProgressPct >= 80 || (playerState === 0 && realWatchedSec >= 5) || (hasInteractedWithPlayer && realWatchedSec >= 15);

  const sendYoutubeHandshake = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({ event: "listening", id: playerIdRef.current, channel: "widget" }),
        "*"
      );
      win.postMessage(
        JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
        "*"
      );
    } catch {
      // Ignore postMessage blocked errors
    }
  };

  // Lắng nghe dữ liệu thời gian thực & trạng thái từ YouTube IFrame JS API
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (
        typeof e.origin === "string" &&
        e.origin &&
        !e.origin.includes("youtube.com") &&
        !e.origin.includes("youtube-nocookie.com")
      ) {
        return;
      }
      try {
        let payload = e.data;
        if (typeof payload === "string") {
          payload = JSON.parse(payload);
        }
        if (!payload) return;

        if (payload.event === "onReady") {
          sendYoutubeHandshake();
        }
        const info = payload.info;
        if (typeof info === "number") {
          setPlayerState(info);
          if (info === 1) setHasInteractedWithPlayer(true);
          if (info === 0 && realWatchedSec >= 5 && !isEffectiveCompleted) {
            setLocalWatched(true);
            onVideoProgressChange?.(realWatchedSec, videoDurationSec, true);
            onVideoCompleted?.(resolvedLessonId);
          }
        } else if (info && typeof info === "object") {
          if (typeof info.currentTime === "number" && info.currentTime >= 0) {
            setCurrentSeconds(Math.floor(info.currentTime));
          }
          if (typeof info.duration === "number" && info.duration > 1) {
            setVideoDurationSec(Math.round(info.duration));
          }
          if (typeof info.playerState === "number") {
            setPlayerState(info.playerState);
            if (info.playerState === 1) setHasInteractedWithPlayer(true);
            if (info.playerState === 0 && realWatchedSec >= 5 && !isEffectiveCompleted) {
              setLocalWatched(true);
              onVideoProgressChange?.(
                Math.round(info.duration || realWatchedSec),
                Math.round(info.duration || videoDurationSec),
                true
              );
              onVideoCompleted?.(resolvedLessonId);
            }
          }
        }
      } catch {
        // Ignored non-json messages
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [resolvedLessonId, onVideoCompleted, onVideoProgressChange, realWatchedSec, videoDurationSec, isEffectiveCompleted]);

  // Bộ đếm thời gian xem THỰC TẾ (chỉ tăng khi player đang phát thực hoặc fallback sau khi đã bấm vào video)
  useEffect(() => {
    if (isEffectiveCompleted) return;
    const isActivelyWatching =
      playerState === 1 || (hasInteractedWithPlayer && playerState === -1 && document.visibilityState === "visible");
    if (!isActivelyWatching) return;

    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setRealWatchedSec((prev) => {
        const next = prev + 1;
        if (playerState !== 1) {
          setCurrentSeconds((cs) => cs + 1);
        }
        const pct = videoDurationSec > 0 ? (next / videoDurationSec) * 100 : 0;
        if (next - lastReportedSecRef.current >= 10) {
          lastReportedSecRef.current = next;
          onVideoProgressChange?.(next, videoDurationSec, pct >= 80);
        }
        if (pct >= 80 && !isEffectiveCompleted) {
          setLocalWatched(true);
          onVideoProgressChange?.(next, videoDurationSec, true);
          onVideoCompleted?.(resolvedLessonId);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [playerState, hasInteractedWithPlayer, isEffectiveCompleted, videoDurationSec, resolvedLessonId, onVideoCompleted, onVideoProgressChange]);

  const handleMarkVideoFinished = () => {
    if (!canConfirmWatch || isEffectiveCompleted) return;
    setLocalWatched(true);
    onVideoProgressChange?.(Math.max(realWatchedSec, Math.round(videoDurationSec * 0.85)), videoDurationSec, true);
    onVideoCompleted?.(resolvedLessonId);
  };

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = tabRefs.current[activeTab];
      if (activeEl) {
        setIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1,
        });
      }
    };
    updateIndicator();
    const timer = setTimeout(updateIndicator, 50);
    window.addEventListener("resize", updateIndicator);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeTab, effectiveChapters.length, notes.length, currentVideo.resources.length]);

  const dismissedNotesKey = `codemind-dismissed-notes-${userId}-${subjectId}-${resolvedLessonId}`;
  const readDismissedNoteIds = (): Set<string> => {
    try {
      const raw = window.localStorage.getItem(dismissedNotesKey);
      return raw ? new Set(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  };

  useEffect(() => {
    let active = true;
    const initSec = initialWatchedSeconds || 0;
    setCurrentSeconds(initSec);
    setRealWatchedSec(initSec);
    setVideoDurationSec(parseTimeLabelToSeconds(currentVideo.duration, 300));
    setPlayerState(-1);
    setHasInteractedWithPlayer(false);
    setVideoTimestamp(0);
    setIsAddingNote(false);
    setLocalWatched(false);
    lastReportedSecRef.current = initSec;

    const dismissed = readDismissedNoteIds();
    const visibleDefaults = currentVideo.defaultNotes.filter((n) => !dismissed.has(n.id));
    setNotes(visibleDefaults);

    fetchStudentVideoNotes(subjectId, resolvedLessonId).then((dbNotes) => {
      if (!active || !dbNotes) return;
      const seenIds = new Set(dbNotes.map((n) => n.id));
      const merged = [
        ...dbNotes.map((n) => ({
          id: n.id,
          timeSec: n.timeSec,
          timestamp: n.timestamp,
          content: n.content,
          createdAt: n.createdAt,
        })),
        ...visibleDefaults.filter((n) => !seenIds.has(n.id)),
      ];
      setNotes(merged);
    });

    return () => {
      active = false;
    };
  }, [subjectId, resolvedLessonId]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSeek = (secs: number) => {
    setCurrentSeconds(secs);
    setVideoTimestamp(secs);
    setHasInteractedWithPlayer(true);
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "seekTo", args: [secs, true] }),
        "*"
      );
    } catch {
      // Fallback relies on key update / start query param
    }
  };

  const handleAddNote = async () => {
    const clean = newNoteText.trim();
    if (!clean) return;
    const timestamp = formatTime(currentSeconds);
    const saved = await createStudentVideoNote({
      subject_id: subjectId,
      lesson_id: resolvedLessonId,
      time_sec: currentSeconds,
      timestamp,
      content: clean,
    });
    const newNote: VideoNote = saved
      ? {
          id: saved.id,
          timeSec: saved.timeSec,
          timestamp: saved.timestamp,
          content: saved.content,
          createdAt: saved.createdAt,
        }
      : {
          id: `note-local-${Date.now()}`,
          timeSec: currentSeconds,
          timestamp,
          content: clean,
          createdAt: "Vừa xong",
        };
    setNotes((prev) => [newNote, ...prev]);
    setNewNoteText("");
    setIsAddingNote(false);
    setActiveTab("notes");
  };

  const handleDeleteNote = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (noteId.endsWith("-note-1") || noteId.endsWith("-note-2")) {
      try {
        const dismissed = readDismissedNoteIds();
        dismissed.add(noteId);
        window.localStorage.setItem(dismissedNotesKey, JSON.stringify(Array.from(dismissed)));
      } catch {
        // Ignore storage error
      }
    } else if (!noteId.startsWith("note-local-")) {
      await deleteStudentVideoNote(noteId);
    }
  };

  const handleCopyShare = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?screen=workspace&course=${encodeURIComponent(subjectId)}&lesson=${encodeURIComponent(resolvedLessonId)}&tab=video`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const originParam = typeof window !== "undefined" ? `&origin=${encodeURIComponent(window.location.origin)}` : "";

  return (
    <div key={`video-studio-${subjectId}`} className="flex flex-col w-full">
      {/* ─── VIDEO PLAYER CONTAINER (16:9 F8 STYLE) ─────────────────── */}
      <div
        key={`video-screen-${currentVideo.subjectCode}-${effectiveYoutubeId}`}
        className="animate-fade-in rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-950 overflow-hidden shadow-sm h-auto"
      >
        {/* Top bar of video */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[11px] shrink-0">
              {currentVideo.subjectCode}
            </span>
            <span className="font-semibold truncate max-w-md text-white text-xs">
              {effectiveTitle}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-[11px] shrink-0">
            <span className="flex items-center gap-1 font-mono">
              <Clock size={12} />
              {formatTime(currentSeconds)} / {formatTime(videoDurationSec)}
            </span>
            <span className="hidden sm:inline font-mono text-amber-400">
              Tiến độ xem: {watchProgressPct}%
            </span>
          </div>
        </div>

        {/* Video Screen */}
        <div
          className="relative aspect-video w-full max-h-[500px] bg-black"
          onMouseDown={() => setHasInteractedWithPlayer(true)}
          onClick={() => setHasInteractedWithPlayer(true)}
        >
          <iframe
            ref={iframeRef}
            key={`${effectiveYoutubeId}-${videoTimestamp}`}
            onLoad={() => {
              sendYoutubeHandshake();
              setTimeout(sendYoutubeHandshake, 800);
            }}
            src={`https://www.youtube-nocookie.com/embed/${effectiveYoutubeId}?enablejsapi=1${originParam}&autoplay=${videoTimestamp > 0 ? 1 : 0}&start=${videoTimestamp}&rel=0&modestbranding=1`}
            title={effectiveTitle}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Real Watch Progress Bar (Chống ăn gian bấm ngay tại 00:00) */}
        <div className="px-4 py-2 bg-slate-900 border-t border-slate-800/80 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isEffectiveCompleted ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${watchProgressPct}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-300 shrink-0">
            {isEffectiveCompleted
              ? "100% Đã hoàn thành video"
              : `Đã xem thực tế ${watchProgressPct}% (${formatTime(realWatchedSec)} · cần ≥80% hoặc hết video)`}
          </span>
        </div>

        {/* Bottom Control / Quick Note Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsAddingNote(true);
                setActiveTab("notes");
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium flex items-center gap-1.5 transition cursor-pointer border border-slate-700 text-xs"
            >
              <BookmarkPlus size={13} />
              <span>Thêm ghi chú tại {formatTime(currentSeconds)}</span>
            </button>
            {!hasInteractedWithPlayer && !isEffectiveCompleted && (
              <span className="text-[11px] text-amber-300/90 hidden md:inline-flex items-center gap-1">
                <Play size={11} /> Bấm phát video ở trên để hệ thống ghi nhận thời lượng xem thực
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 🎬 Nút xác nhận xem video (chỉ mở khóa khi xem đủ điều kiện, không thể bấm ăn gian ở 00:00) */}
            {isEffectiveCompleted ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs select-none shadow-xs">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <span>Đã xem hết video bài giảng ✓</span>
              </div>
            ) : canConfirmWatch ? (
              <button
                type="button"
                onClick={handleMarkVideoFinished}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold transition cursor-pointer flex items-center gap-1.5 text-xs active:scale-95 shadow-md shadow-amber-500/20"
              >
                <CheckCircle2 size={13} className="text-slate-950" />
                <span>Xác nhận hoàn thành xem video</span>
              </button>
            ) : (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-400 font-semibold text-xs select-none"
                title="Cần phát video thực tế trên trang tối thiểu 80% thời lượng hoặc hết video"
              >
                <ShieldAlert size={13} className="text-amber-400 shrink-0" />
                <span>Đang ghi nhận xem ({watchProgressPct}%/80%)</span>
              </div>
            )}

            {isEffectiveCompleted && (
              <button
                type="button"
                onClick={() => onNavigateToTab?.("lecture")}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition cursor-pointer flex items-center gap-1.5 text-xs shadow-2xs active:scale-95"
                title="Quay lại Bài đọc để bấm hoàn thành bài học và nhận điểm XP"
              >
                <FileText size={13} />
                <span>Đến Bài đọc nhận XP →</span>
              </button>
            )}

            <button
              onClick={handleCopyShare}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex items-center gap-1.5 text-xs border border-slate-700"
              title="Sao chép liên kết bài giảng"
            >
              {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
              <span className="hidden sm:inline">{copiedLink ? "Đã chép" : "Chia sẻ"}</span>
            </button>
            <button
              onClick={() => onNavigateToTab?.("quiz")}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold transition cursor-pointer flex items-center gap-1.5 text-xs shadow-2xs"
            >
              <span>Làm Quiz kiểm tra</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── ADD NOTE INLINE FORM ─────────────────────────────────────── */}
      {isAddingNote && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 p-4 space-y-3 transition-all animate-in fade-in slide-in-from-top-2 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-bold bg-blue-600 text-white">
                {formatTime(currentSeconds)}
              </span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Ghi chú bài giảng cá nhân
              </h4>
            </div>
            <button
              onClick={() => setIsAddingNote(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Hủy
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
              placeholder="Nhập nội dung ghi chú bạn muốn lưu tại mốc này..."
              autoFocus
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddNote}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Lưu ghi chú
            </button>
          </div>
        </div>
      )}

      {/* 🌊 DÒNG CHẤT LỎNG CHẢY TỪ VIDEO PLAYER XUỐNG KHỐI NỘI DUNG DƯỚI */}
      <LiquidCardConnector />

      {/* ─── VIDEO DETAILS & INTERACTIVE TABS (F8 LAYOUT) ─────────────── */}
      {/* ─── VIDEO METADATA & SIDEBAR (CLEAN ENGINEERING GRADE) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-2.5">
        {/* Col 1 & 2: Video Info, Chapters, Notes, Resources */}
        <div
          className="animate-cascade-item lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4 shadow-2xs"
          style={{ animationDelay: "120ms" }}
        >
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {effectiveTitle}
            </h2>
            <p className="text-sm text-[#62656b] dark:text-[#a0a3a9] mt-1.5 font-normal">
              {currentVideo.subtitle}
            </p>
          </div>

          {/* Instructor Line - Clean Minimal */}
          <div className="flex items-center gap-3.5 py-2.5 px-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
            <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-sm shrink-0">
              <UserCheck size={18} />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                {effectiveInstructor}
              </span>
              <span className="text-xs text-slate-500">Giảng viên Phụ trách Học phần</span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Nội dung trọng tâm bài giảng:
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {effectiveOverview}
            </p>
          </div>

          {/* Quick Tabs: Chapters vs Notes vs Resources with Smooth Sliding Capsule Indicator */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="relative flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3 overflow-x-auto no-scrollbar">
              {/* 🌟 Authentic Animated Gliding Capsule Indicator */}
              <div
                style={{
                  transform: `translateX(${indicatorStyle.left}px)`,
                  width: `${indicatorStyle.width}px`,
                  opacity: indicatorStyle.opacity,
                }}
                className="absolute top-0 h-[36px] rounded-2xl bg-[#14161a] dark:bg-white shadow-xs transition-all duration-300 ease-[cubic-bezier(0.2,0.85,0.32,1.2)] pointer-events-none"
              />

              {[
                {
                  id: "chapters" as const,
                  label: `Mục lục Video (${effectiveChapters.length})`,
                  icon: ListOrdered,
                },
                {
                  id: "notes" as const,
                  label: `Ghi chú cá nhân (${notes.length})`,
                  icon: BookmarkPlus,
                },
                {
                  id: "resources" as const,
                  label: `Tài liệu đính kèm (${effectiveResources.length})`,
                  icon: FileText,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[tab.id] = el;
                    }}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative z-10 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 select-none active:scale-95 shrink-0 ${
                      isActive
                        ? "text-white dark:text-slate-950 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon size={15} className={`transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
                    <span className="text-xs font-bold">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content with Smooth Fade-in & Slide Entrance */}
            <div key={activeTab} className="animate-in fade-in duration-300 slide-in-from-bottom-2">
              {/* Tab 1: Chapters */}
              {activeTab === "chapters" && (
                <div className="pt-3 space-y-2">
                  {effectiveChapters.map((chap, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSeek(chap.timeSec)}
                      className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer flex items-start gap-3.5 group"
                    >
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
                        {chap.timestamp}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-400 transition leading-snug">
                          {chap.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {chap.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 2: Notes */}
              {activeTab === "notes" && (
                <div className="pt-3 space-y-2">
                  {notes.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Chưa có ghi chú nào. Hãy bấm "Thêm ghi chú tại {formatTime(currentSeconds)}" để lưu kiến thức quan trọng!
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <button
                            onClick={() => handleSeek(note.timeSec)}
                            className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 shrink-0 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition cursor-pointer"
                            title="Tua tới mốc này"
                          >
                            {note.timestamp}
                          </button>
                          <div>
                            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                              {note.content}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {note.createdAt}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition cursor-pointer"
                          title="Xóa ghi chú"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Resources */}
              {activeTab === "resources" && (
                <div className="pt-3 space-y-2">
                  {effectiveResources.map((res, idx) =>
                    res.isExternal ? (
                      <a
                        key={idx}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 transition flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 group cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {res.type === "slide" ? (
                            <FileText size={14} className="text-slate-400" />
                          ) : res.type === "git" ? (
                            <GitBranch size={14} className="text-slate-400" />
                          ) : (
                            <BookOpen size={14} className="text-slate-400" />
                          )}
                          <span className="font-medium group-hover:text-amber-500 dark:group-hover:text-amber-400 transition">
                            {res.title}
                          </span>
                        </div>
                        <ExternalLink size={12} className="text-slate-400 group-hover:text-amber-500 transition" />
                      </a>
                    ) : (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-blue-500" />
                          <span className="font-medium">{res.title}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">Giáo trình đính kèm</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Col 3: Next Lesson & Socratic Quick Prompt - Clean Professional Cards */}
        <div
          className="animate-cascade-item space-y-4"
          style={{ animationDelay: "200ms" }}
        >
          {/* Card 1: Chặng tiếp theo */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3.5 shadow-2xs">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Chặng tiếp theo
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Kiểm tra Năng lực với Quiz
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Vượt qua {effectiveQuizCount} câu hỏi tình huống thực tế để củng cố kiến thức vừa học trong video.
            </p>
            <div className="pt-1 flex flex-col gap-2.5">
              <button
                onClick={() => onNavigateToTab?.("quiz")}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
              >
                <span>Làm Checkpoint Quiz</span>
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => onNavigateToTab?.("mindmap")}
                className="w-full py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
              >
                <span>Xem Cây Tri Thức</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
