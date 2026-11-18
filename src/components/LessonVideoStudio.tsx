import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Clock,
  BookmarkPlus,
  Trash2,
  ExternalLink,
  BookOpen,
  FileText,
  GitBranch,
  Sparkles,
  Bot,
  Send,
  CornerDownLeft,
  Share2,
  Check,
  RotateCcw,
  UserCheck,
  ChevronRight,
  ListOrdered,
  Layers,
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
  lessonId?: string;
  lessonTitle?: string;
  mentorMascot: MentorMascot;
  onNavigateToTab?: (tab: "lecture" | "quiz" | "code" | "mindmap") => void;
}

export function LessonVideoStudio({
  subjectId,
  lessonId,
  lessonTitle,
  mentorMascot,
  onNavigateToTab,
}: LessonVideoStudioProps) {
  const currentVideo: VideoLectureInfo = getF8VideoLecture(subjectId, lessonId, lessonTitle);
  const resolvedLessonId = lessonId || currentVideo.lessonId || "1.1";

  const [activeTab, setActiveTab] = useState<"chapters" | "notes" | "resources">("chapters");
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [currentSeconds, setCurrentSeconds] = useState<number>(0);
  const [notes, setNotes] = useState<VideoNote[]>(currentVideo.defaultNotes);
  const [newNoteText, setNewNoteText] = useState<string>("");
  const [isAddingNote, setIsAddingNote] = useState<boolean>(false);
  const [videoTimestamp, setVideoTimestamp] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

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
  }, [activeTab, currentVideo.chapters.length, notes.length, currentVideo.resources.length]);

  useEffect(() => {
    let active = true;
    setCurrentSeconds(0);
    setVideoTimestamp(0);
    setIsAddingNote(false);
    setNotes(currentVideo.defaultNotes);

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
        ...currentVideo.defaultNotes.filter((n) => !seenIds.has(n.id)),
      ];
      setNotes(merged);
    });

    return () => {
      active = false;
    };
  }, [subjectId, resolvedLessonId]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSeek = (secs: number) => {
    setCurrentSeconds(secs);
    setVideoTimestamp(secs);
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
    if (!noteId.startsWith("note-local-") && !noteId.endsWith("-note-1") && !noteId.endsWith("-note-2")) {
      await deleteStudentVideoNote(noteId);
    }
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div key={`video-studio-${subjectId}`} className="flex flex-col w-full">
      {/* ─── VIDEO PLAYER CONTAINER (16:9 F8 STYLE) ─────────────────── */}
      <div
        key={`video-screen-${currentVideo.subjectCode}-${currentVideo.youtubeId}`}
        className="animate-fade-in rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-950 overflow-hidden shadow-sm h-auto"
      >
        {/* Top bar of video */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 text-[11px]">
              {currentVideo.subjectCode}
            </span>
            <span className="font-semibold truncate max-w-md text-white text-xs">
              {currentVideo.title}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span className="flex items-center gap-1 font-mono">
              <Clock size={12} />
              {currentVideo.duration}
            </span>
            <span className="hidden sm:inline">• Cập nhật: {currentVideo.updatedAt}</span>
          </div>
        </div>

        {/* Video Screen */}
        <div className="relative aspect-video w-full max-h-[500px] bg-black">
          <iframe
            key={`${currentVideo.youtubeId}-${videoTimestamp}`}
            src={`https://www.youtube-nocookie.com/embed/${currentVideo.youtubeId}?autoplay=${videoTimestamp > 0 ? 1 : 0}&start=${videoTimestamp}&rel=0&modestbranding=1`}
            title={currentVideo.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
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
            <span className="text-[11px] text-slate-400 hidden md:inline">
              (Lưu lại kiến thức quan trọng kèm mốc thời gian bài giảng)
            </span>
          </div>

          <div className="flex items-center gap-2">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Col 1 & 2: Video Info, Chapters, Notes, Resources */}
        <div
          className="animate-cascade-item lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-2xs"
          style={{ animationDelay: "120ms" }}
        >
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {currentVideo.title}
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
                {currentVideo.instructor}
              </span>
              <span className="text-xs text-slate-500">Giảng viên / Ban cố vấn Chuyên môn Đồ án</span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Nội dung trọng tâm bài giảng:
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {currentVideo.overview}
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
                  label: `Mục lục Video (${currentVideo.chapters.length})`,
                  icon: ListOrdered,
                },
                {
                  id: "notes" as const,
                  label: `Ghi chú cá nhân (${notes.length})`,
                  icon: BookmarkPlus,
                },
                {
                  id: "resources" as const,
                  label: `Tài liệu đính kèm (${currentVideo.resources.length})`,
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
                  {currentVideo.chapters.map((chap, idx) => (
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
                  {currentVideo.resources.map((res, idx) => (
                    <a
                      key={idx}
                      href={res.url}
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
                  ))}
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
              Vượt qua 3 câu hỏi tình huống thực tế để củng cố kiến thức vừa học trong video.
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
