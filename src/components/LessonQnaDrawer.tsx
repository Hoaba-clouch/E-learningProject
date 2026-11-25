import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  CornerDownRight,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Pin,
  Play,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import type { Role } from "../App";
import {
  createLessonQnaCommentApi,
  deleteLessonQnaCommentApi,
  fetchLessonQnaThreadsApi,
  getStoredUser,
  toggleLessonQnaReactionApi,
  togglePinLessonQnaCommentApi,
  updateLessonQnaCommentApi,
  type QnaCommentDto,
  type QnaReactionType,
} from "../api";

interface LessonQnaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  subjectCode?: string;
  subjectName?: string;
  lessonId?: string;
  lessonTitle?: string;
  role?: Role;
  currentVideoTimestamp?: string;
  courseWideMode?: boolean;
  onJumpToTimestamp?: (timestampLabel: string) => void;
  onCommentCountChange?: (totalComments: number, unansweredCount: number) => void;
}

const AVATAR_PALETTE = [
  "bg-[#0866ff] text-white",
  "bg-[#f05123] text-white",
  "bg-[#10b981] text-white",
  "bg-[#7c3aed] text-white",
  "bg-[#0284c7] text-white",
  "bg-[#e11d48] text-white",
];

function getInitials(name: string): string {
  const parts = (name || "HV").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "HV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function formatRelativeTimeVi(iso: string): string {
  if (!iso) return "Vừa xong";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "Vừa xong";
  const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (diffSec < 45) return "Vừa xong";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "1 ngày";
  if (diffDay < 30) return `${diffDay} ngày`;
  const d = new Date(time);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

function renderInlineCodeText(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((seg, idx) => {
    if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 2) {
      return (
        <code
          key={idx}
          className="rounded-md bg-black/[0.07] dark:bg-white/[0.12] px-1.5 py-0.5 font-mono text-[12px] font-semibold text-[#d6336c] dark:text-[#ff85a1]"
        >
          {seg.slice(1, -1)}
        </code>
      );
    }
    return <span key={idx}>{seg}</span>;
  });
}

// ─── AUTHENTIC FACEBOOK VECTOR SVG REACTION ICONS ───────────────────────────
const FB_DOCK_REACTIONS: QnaReactionType[] = [
  "like",
  "love",
  "care",
  "haha",
  "wow",
  "sad",
];

const REACTION_META: Record<
  QnaReactionType,
  { label: string; activeCls: string }
> = {
  like: {
    label: "Thích",
    activeCls: "text-[#0866ff] dark:text-[#4599ff]",
  },
  love: {
    label: "Yêu thích",
    activeCls: "text-[#f33e58] dark:text-[#ff6b81]",
  },
  care: {
    label: "Thương thương",
    activeCls: "text-[#e99b0c] dark:text-[#f7b125]",
  },
  haha: {
    label: "Haha",
    activeCls: "text-[#e99b0c] dark:text-[#f7b125]",
  },
  wow: {
    label: "Wow",
    activeCls: "text-[#e99b0c] dark:text-[#f7b125]",
  },
  sad: {
    label: "Buồn",
    activeCls: "text-[#e99b0c] dark:text-[#f7b125]",
  },
  helpful: {
    label: "Thương thương",
    activeCls: "text-[#e99b0c] dark:text-[#f7b125]",
  },
};

function FbReactionIcon({
  type,
  size = 18,
  className = "",
}: {
  type: QnaReactionType;
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");

  if (type === "like") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        className={`shrink-0 select-none ${className}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`fbLike-${uid}`} x1="18" y1="0" x2="18" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#39A2FF" />
            <stop offset="100%" stopColor="#0866FF" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="18" fill={`url(#fbLike-${uid})`} />
        <path
          d="M11.6 16.4H9.5c-.77 0-1.4.63-1.4 1.4v8.4c0 .77.63 1.4 1.4 1.4h2.1c.55 0 1-.45 1-1v-9.2c0-.55-.45-1-1-1Zm14.95-.15h-5.32c.46-1.7.87-3.68.42-5.05-.34-1.05-1.22-1.7-2.22-1.7-.82 0-1.46.46-1.68 1.24-.3 1.07-.64 2.52-1.56 3.92-.7 1.06-1.58 1.72-2.09 2.02v9.44c1.18.42 2.86.98 5.26.98h4.59c1.45 0 2.66-.98 2.93-2.34l1.15-5.22c.33-1.64-.9-3.29-2.48-3.29Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  if (type === "love") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        className={`shrink-0 select-none ${className}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`fbLove-${uid}`} x1="18" y1="0" x2="18" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF748B" />
            <stop offset="100%" stopColor="#E41E3F" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="18" fill={`url(#fbLove-${uid})`} />
        <path
          d="M18 27.65c-.38 0-.75-.14-1.05-.4-3.95-3.4-8.45-7.43-8.45-11.88 0-3.25 2.48-5.67 5.62-5.67 1.78 0 3.12.84 3.88 1.98.76-1.14 2.1-1.98 3.88-1.98 3.14 0 5.62 2.42 5.62 5.67 0 4.45-4.5 8.48-8.45 11.88-.3.26-.67.4-1.05.4Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  if (type === "haha") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        className={`shrink-0 select-none ${className}`}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`fbHaha-${uid}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFEA88" />
            <stop offset="68%" stopColor="#FCCA3F" />
            <stop offset="100%" stopColor="#F59E0B" />
          </radialGradient>
        </defs>
        <circle cx="18" cy="18" r="18" fill={`url(#fbHaha-${uid})`} />
        <path
          d="M10.2 12.2l4.3 2.1-4.3 2.1M25.8 12.2l-4.3 2.1 4.3 2.1"
          stroke="#3B2308"
          strokeWidth="2.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.6 19.2c0 5.1 3.76 9.1 8.4 9.1s8.4-4 8.4-9.1H9.6Z"
          fill="#3B2308"
        />
        <path
          d="M13.1 25.3c1.3 1.25 3.02 2 4.9 2s3.6-.75 4.9-2c-.95-1.65-2.78-2.75-4.9-2.75s-3.95 1.1-4.9 2.75Z"
          fill="#F35369"
        />
      </svg>
    );
  }

  if (type === "wow") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        className={`shrink-0 select-none ${className}`}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`fbWow-${uid}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFEA88" />
            <stop offset="68%" stopColor="#FCCA3F" />
            <stop offset="100%" stopColor="#F59E0B" />
          </radialGradient>
        </defs>
        <circle cx="18" cy="18" r="18" fill={`url(#fbWow-${uid})`} />
        <path
          d="M10.5 9.8c1.1-1.2 2.9-1.2 4 0M21.5 9.8c1.1-1.2 2.9-1.2 4 0"
          stroke="#5B360C"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="12.6" cy="14.6" rx="2.1" ry="2.6" fill="#3B2308" />
        <ellipse cx="23.4" cy="14.6" rx="2.1" ry="2.6" fill="#3B2308" />
        <ellipse cx="18" cy="23.6" rx="3.9" ry="5.1" fill="#3B2308" />
      </svg>
    );
  }

  if (type === "sad") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        className={`shrink-0 select-none ${className}`}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`fbSad-${uid}`} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFEA88" />
            <stop offset="68%" stopColor="#FCCA3F" />
            <stop offset="100%" stopColor="#F59E0B" />
          </radialGradient>
        </defs>
        <circle cx="18" cy="18" r="18" fill={`url(#fbSad-${uid})`} />
        <path
          d="M9.8 12.2c1.2-.95 2.9-1.15 4.3-.5M26.2 12.2c-1.2-.95-2.9-1.15-4.3-.5"
          stroke="#5B360C"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <circle cx="12.6" cy="16" r="2.1" fill="#3B2308" />
        <circle cx="23.4" cy="16" r="2.1" fill="#3B2308" />
        <path
          d="M13.2 25.2c1.3-1.8 3-2.6 4.8-2.6s3.5.8 4.8 2.6"
          stroke="#3B2308"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M25.8 19.4c0 0 2.5 3.2 2.5 4.9a2.5 2.5 0 1 1-5 0c0-1.7 2.5-4.9 2.5-4.9Z"
          fill="#2AB0FF"
        />
      </svg>
    );
  }

  // "care" & backward-compatible "helpful" -> Facebook Care (Hugging Heart)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`fbCare-${uid}`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFEA88" />
          <stop offset="68%" stopColor="#FCCA3F" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
      <circle cx="18" cy="18" r="18" fill={`url(#fbCare-${uid})`} />
      <circle cx="12.5" cy="12.8" r="1.9" fill="#3B2308" />
      <circle cx="23.5" cy="12.8" r="1.9" fill="#3B2308" />
      <path
        d="M14.8 16.2c.9.95 2.05 1.4 3.2 1.4s2.3-.45 3.2-1.4"
        stroke="#3B2308"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 29.3c-.28 0-.55-.1-.77-.3-2.88-2.48-6.13-5.4-6.13-8.62 0-2.36 1.8-4.12 4.08-4.12 1.3 0 2.27.61 2.82 1.44.55-.83 1.52-1.44 2.82-1.44 2.28 0 4.08 1.76 4.08 4.12 0 3.22-3.25 6.14-6.13 8.62-.22.2-.49.3-.77.3Z"
        fill="#E41E3F"
      />
      <path
        d="M8.8 20.6c1.5-.8 3.6-.3 4.8 1.2M27.2 20.6c-1.5-.8-3.6-.3-4.8 1.2"
        stroke="#D97706"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Facebook Paper-Plane Send Icon
function FbSendIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={
        active
          ? "text-[#0866ff] dark:text-[#4599ff] transition-colors"
          : "text-[#bec3c9] dark:text-slate-600 transition-colors"
      }
      aria-hidden="true"
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

export default function LessonQnaDrawer({
  isOpen,
  onClose,
  subjectId,
  subjectCode,
  subjectName,
  lessonId = "1.1",
  lessonTitle = "",
  role = "student",
  currentVideoTimestamp,
  courseWideMode = false,
  onJumpToTimestamp,
  onCommentCountChange,
}: LessonQnaDrawerProps) {
  const isStaff = role === "instructor" || role === "admin";
  const storedMe = getStoredUser(role);
  const myName =
    storedMe?.full_name ||
    storedMe?.display_name ||
    storedMe?.name ||
    (role === "instructor" ? "Giảng viên" : "Học viên");
  const myAvatarUrl: string | undefined = storedMe?.avatar_url || undefined;

  // ─── KANBAN DRAWER ENTER / EXIT MOTION LIFECYCLE (1:1 MarloTaskDrawer) ───
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      closeTimeoutRef.current = window.setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
        closeTimeoutRef.current = null;
      }, 280);
    }
  }, [isOpen, shouldRender]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleRequestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
      closeTimeoutRef.current = null;
      onClose();
    }, 280);
  }, [isClosing, onClose]);

  const [scopeMode, setScopeMode] = useState<"lesson" | "course">(
    courseWideMode ? "course" : "lesson"
  );
  const [filterMode, setFilterMode] = useState<"all" | "unanswered" | "pinned">("all");
  const [threads, setThreads] = useState<QnaCommentDto[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Main Composer State
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [newCodeSnippet, setNewCodeSnippet] = useState("");
  const [attachVideoTime, setAttachVideoTime] = useState(false);
  const [videoTimeDraft, setVideoTimeDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reply State
  const [replyTarget, setReplyTarget] = useState<{
    rootId: string;
    replyToName: string;
    lessonId: string;
    lessonTitle: string;
  } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [showReplyCode, setShowReplyCode] = useState(false);
  const [replyCode, setReplyCode] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCode, setEditCode] = useState("");

  // Facebook Reaction Dock, Pop Burst, More Menu & Collapsed Replies
  const [hoveredReactId, setHoveredReactId] = useState<string | null>(null);
  const [hoveredDockReaction, setHoveredDockReaction] = useState<QnaReactionType | null>(null);
  const [burstCommentId, setBurstCommentId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const hoverReactTimerRef = useRef<number | null>(null);

  const openReactionDock = useCallback((commentId: string) => {
    if (hoverReactTimerRef.current) {
      window.clearTimeout(hoverReactTimerRef.current);
      hoverReactTimerRef.current = null;
    }
    hoverReactTimerRef.current = window.setTimeout(() => {
      setHoveredReactId(commentId);
    }, 90);
  }, []);

  const closeReactionDockDelayed = useCallback((commentId: string) => {
    if (hoverReactTimerRef.current) {
      window.clearTimeout(hoverReactTimerRef.current);
    }
    hoverReactTimerRef.current = window.setTimeout(() => {
      setHoveredReactId((prev) => (prev === commentId ? null : prev));
      setHoveredDockReaction(null);
    }, 210);
  }, []);

  useEffect(() => {
    setScopeMode(courseWideMode ? "course" : "lesson");
  }, [courseWideMode]);

  const effectiveLessonParam = useMemo(
    () => (scopeMode === "course" ? "all" : lessonId || "1.1"),
    [scopeMode, lessonId]
  );

  const loadThreads = useCallback(
    async (silent = false) => {
      if (!subjectId) return;
      if (!silent) setLoading(true);
      const res = await fetchLessonQnaThreadsApi(
        subjectId,
        effectiveLessonParam,
        filterMode,
        role
      );
      if (res) {
        setThreads(res.threads);
        setTotalComments(res.total_comments);
        setUnansweredCount(res.unanswered_count);
        onCommentCountChange?.(res.total_comments, res.unanswered_count);
      }
      if (!silent) setLoading(false);
    },
    [subjectId, effectiveLessonParam, filterMode, role, onCommentCountChange]
  );

  useEffect(() => {
    if (!isOpen) return;
    void loadThreads();
  }, [isOpen, loadThreads]);

  // Silent badge count sync on mount / lesson change
  useEffect(() => {
    if (!subjectId) return;
    let alive = true;
    fetchLessonQnaThreadsApi(
      subjectId,
      courseWideMode ? "all" : lessonId || "1.1",
      "all",
      role
    )
      .then((res) => {
        if (alive && res) {
          setTotalComments(res.total_comments);
          setUnansweredCount(res.unanswered_count);
          onCommentCountChange?.(res.total_comments, res.unanswered_count);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [subjectId, lessonId, courseWideMode, role, onCommentCountChange]);

  useEffect(() => {
    if (!shouldRender) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openMenuId) {
          setOpenMenuId(null);
          return;
        }
        handleRequestClose();
      }
    };
    const onDocClick = () => {
      setOpenMenuId(null);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onDocClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onDocClick);
    };
  }, [shouldRender, openMenuId, handleRequestClose]);

  const submitRootComment = async () => {
    if (newContent.trim().length < 2 || submitting) return;
    setSubmitting(true);
    const created = await createLessonQnaCommentApi(
      {
        subject_id: subjectId,
        lesson_id: lessonId || "1.1",
        lesson_title: lessonTitle,
        content: newContent.trim(),
        code_snippet: showCodeInput && newCodeSnippet.trim() ? newCodeSnippet.trim() : null,
        video_timestamp:
          attachVideoTime && (videoTimeDraft.trim() || currentVideoTimestamp)
            ? (videoTimeDraft.trim() || currentVideoTimestamp || "").slice(0, 12)
            : null,
      },
      role
    );
    setSubmitting(false);
    if (created) {
      setNewContent("");
      setNewCodeSnippet("");
      setShowCodeInput(false);
      setAttachVideoTime(false);
      setComposerExpanded(false);
      await loadThreads(true);
    }
  };

  const handlePostRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitRootComment();
  };

  const submitReplyComment = async () => {
    if (!replyTarget || replyContent.trim().length < 2 || submittingReply) return;
    setSubmittingReply(true);
    const created = await createLessonQnaCommentApi(
      {
        subject_id: subjectId,
        lesson_id: replyTarget.lessonId || lessonId || "1.1",
        lesson_title: replyTarget.lessonTitle || lessonTitle,
        parent_id: replyTarget.rootId,
        reply_to_name: replyTarget.replyToName,
        content: replyContent.trim(),
        code_snippet: showReplyCode && replyCode.trim() ? replyCode.trim() : null,
      },
      role
    );
    setSubmittingReply(false);
    if (created) {
      setExpandedThreads((prev) => ({ ...prev, [replyTarget.rootId]: true }));
      setReplyTarget(null);
      setReplyContent("");
      setReplyCode("");
      setShowReplyCode(false);
      await loadThreads(true);
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitReplyComment();
  };

  const handleToggleReaction = async (commentId: string, rtype: QnaReactionType) => {
    if (hoverReactTimerRef.current) {
      window.clearTimeout(hoverReactTimerRef.current);
      hoverReactTimerRef.current = null;
    }
    setHoveredReactId(null);
    setHoveredDockReaction(null);
    setBurstCommentId(commentId);
    window.setTimeout(() => {
      setBurstCommentId((prev) => (prev === commentId ? null : prev));
    }, 380);

    const res = await toggleLessonQnaReactionApi(commentId, rtype, role);
    if (!res) return;
    setThreads((prev) =>
      prev.map((root) => {
        const patchOne = (c: QnaCommentDto): QnaCommentDto =>
          c.id === commentId
            ? {
                ...c,
                my_reaction: res.my_reaction,
                reaction_counts: res.reaction_counts,
                total_reactions: res.total_reactions,
              }
            : c;
        return {
          ...patchOne(root),
          replies: (root.replies || []).map(patchOne),
        };
      })
    );
  };

  const handleSaveEdit = async (commentId: string) => {
    if (editContent.trim().length < 2) return;
    const ok = await updateLessonQnaCommentApi(
      commentId,
      { content: editContent.trim(), code_snippet: editCode.trim() || null },
      role
    );
    if (ok) {
      setEditingId(null);
      await loadThreads(true);
    }
  };

  const handleDelete = async (commentId: string) => {
    const ok = await deleteLessonQnaCommentApi(commentId, role);
    if (ok) {
      setConfirmDeleteId(null);
      setOpenMenuId(null);
      await loadThreads(true);
    }
  };

  const handleTogglePin = async (commentId: string) => {
    setOpenMenuId(null);
    const res = await togglePinLessonQnaCommentApi(commentId, role);
    if (res.ok) {
      await loadThreads(true);
    }
  };

  const renderAvatar = (
    name: string,
    avatarUrl?: string | null,
    sizeCls = "h-9 w-9 text-xs"
  ) => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className={`${sizeCls} relative z-10 shrink-0 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/15 bg-slate-200 dark:bg-slate-800`}
        />
      );
    }
    return (
      <div
        className={`${sizeCls} ${getAvatarTone(
          name
        )} relative z-10 shrink-0 rounded-full flex items-center justify-center font-bold select-none shadow-2xs ring-1 ring-black/5 dark:ring-white/10`}
      >
        {getInitials(name)}
      </div>
    );
  };

  const getTopReactionTypes = (counts: QnaCommentDto["reaction_counts"]): QnaReactionType[] => {
    const entries: Array<[QnaReactionType, number]> = [
      ["like", counts?.like || 0],
      ["love", counts?.love || 0],
      ["care", (counts?.care || 0) + (counts?.helpful || 0)],
      ["haha", counts?.haha || 0],
      ["wow", counts?.wow || 0],
      ["sad", counts?.sad || 0],
    ];
    return entries
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([rt]) => rt);
  };

  const renderSingleComment = (
    item: QnaCommentDto,
    rootId: string,
    rootLessonId: string,
    rootLessonTitle: string,
    isReply = false,
    hasVerticalTrunkBelow = false
  ) => {
    const isInstructorAuthor = item.author_role === "instructor";
    const isAdminAuthor = item.author_role === "admin";
    const myReactMeta = item.my_reaction ? REACTION_META[item.my_reaction] : null;
    const isEditing = editingId === item.id;
    const topReactions = getTopReactionTypes(item.reaction_counts);
    const hasReactions = item.total_reactions > 0 && topReactions.length > 0;
    const hasMoreActions = item.can_edit || item.can_delete || isStaff;
    const isMenuOpen = openMenuId === item.id;
    const isBursting = burstCommentId === item.id;

    return (
      <div key={item.id} className="group/cmt relative flex items-start gap-2.5">
        {/* Vertical Thread Spine under Root Comment Avatar (Authentic Facebook Branch Trunk) */}
        {!isReply && hasVerticalTrunkBelow && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[17px] top-9 bottom-[-14px] w-[2px] bg-[#cfd2d6] dark:bg-slate-700/90"
          />
        )}

        {renderAvatar(
          item.author_name,
          item.author_avatar_url,
          isReply ? "h-7 w-7 text-[10.5px]" : "h-9 w-9 text-xs"
        )}

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="rounded-[18px] border border-slate-300 dark:border-slate-700 bg-[#f0f2f5] dark:bg-[#222631] p-3 space-y-2">
              <textarea
                rows={3}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full resize-none bg-transparent text-[13.5px] text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              {(editCode || item.code_snippet) && (
                <textarea
                  rows={3}
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="Đoạn code đính kèm (để trống nếu muốn gỡ)..."
                  className="w-full resize-none rounded-xl bg-[#0d1117] p-2.5 font-mono text-xs text-slate-100 focus:outline-none"
                />
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Nhấn Esc để hủy
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveEdit(item.id)}
                    className="rounded-full bg-[#0866ff] hover:bg-[#0756d8] px-3.5 py-1 text-xs font-bold text-white cursor-pointer"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 max-w-full">
              {/* Facebook Comment Bubble + Overlapping Bottom-Right Reaction Summary Pill */}
              <div
                className={`relative inline-block max-w-full ${
                  hasReactions ? "min-w-[116px]" : ""
                }`}
              >
                <div
                  className={`rounded-[18px] px-3.5 py-2 transition-colors ${
                    item.is_pinned
                      ? "bg-[#eefbf5] dark:bg-[#162c25] border border-emerald-300/80 dark:border-emerald-700/60"
                      : "bg-[#f0f2f5] dark:bg-[#222631] border border-transparent dark:border-white/[0.04]"
                  }`}
                >
                  {/* Author Header Row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-bold leading-snug text-[#050505] dark:text-[#e4e6eb] hover:underline cursor-pointer">
                      {item.author_name}
                    </span>

                    {isInstructorAuthor && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-[#e7f3ff] dark:bg-[#1a3353] px-1.5 py-0.5 text-[10px] font-bold text-[#0866ff] dark:text-[#58a6ff]"
                        title="Giảng viên xác thực"
                      >
                        <CheckCircle2 size={10.5} />
                        <span>Giảng viên</span>
                      </span>
                    )}

                    {isAdminAuthor && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                        <ShieldCheck size={10.5} />
                        <span>Quản trị</span>
                      </span>
                    )}

                    {item.is_pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        <Pin size={9.5} />
                        <span>Câu trả lời chuẩn</span>
                      </span>
                    )}

                    {scopeMode === "course" && !isReply && (
                      <span className="rounded-md bg-black/[0.06] dark:bg-white/[0.09] px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        Bài {item.lesson_id}
                      </span>
                    )}

                    {item.video_timestamp && (
                      <button
                        type="button"
                        onClick={() => onJumpToTimestamp?.(item.video_timestamp!)}
                        className="inline-flex items-center gap-1 rounded-full bg-[#e7f3ff] dark:bg-[#1a3353] px-2 py-0.5 font-mono text-[10.5px] font-bold text-[#0866ff] dark:text-[#66b2ff] hover:underline cursor-pointer"
                        title="Tua tới mốc thời gian này trong video"
                      >
                        <Play size={8.5} fill="currentColor" />
                        <span>{item.video_timestamp}</span>
                      </button>
                    )}
                  </div>

                  {/* Comment Body */}
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px] leading-[1.45] text-[#050505] dark:text-[#e4e6eb]">
                    {item.reply_to_name && (
                      <span className="mr-1 font-semibold text-[#0866ff] dark:text-[#58a6ff]">
                        {item.reply_to_name}
                      </span>
                    )}
                    {renderInlineCodeText(item.content)}
                  </p>

                  {/* Attached Code Snippet Block */}
                  {item.code_snippet && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-slate-800 bg-[#0d1117] text-slate-100">
                      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3 py-1.5 text-[10.5px] font-mono text-slate-400">
                        <span>Đoạn mã đính kèm</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(item.code_snippet || "");
                            setCopiedCodeId(item.id);
                            setTimeout(() => setCopiedCodeId(null), 1600);
                          }}
                          className="inline-flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
                        >
                          {copiedCodeId === item.id ? (
                            <>
                              <Check size={11} className="text-emerald-400" />
                              <span>Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Chép code</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed">
                        <code>{item.code_snippet}</code>
                      </pre>
                    </div>
                  )}
                </div>

                {/* Overlapping Facebook Corner Reaction Summary Pill */}
                {hasReactions && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleToggleReaction(item.id, item.my_reaction || "like")
                    }
                    className={`absolute -bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-white dark:bg-[#2a2f3d] px-1.5 py-[2px] shadow-[0_2px_6px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.06] dark:ring-white/[0.1] cursor-pointer hover:brightness-95 transition ${
                      isBursting ? "fb-react-burst" : ""
                    }`}
                    title={`${item.total_reactions} lượt bày tỏ cảm xúc`}
                  >
                    <span className="flex items-center -space-x-1">
                      {topReactions.map((rt) => (
                        <span
                          key={rt}
                          className="inline-flex rounded-full ring-[1.5px] ring-white dark:ring-[#2a2f3d]"
                        >
                          <FbReactionIcon type={rt} size={15} />
                        </span>
                      ))}
                    </span>
                    {item.total_reactions > 1 && (
                      <span className="pr-0.5 text-[11px] font-medium leading-none text-[#65676b] dark:text-[#b0b3b8]">
                        {item.total_reactions}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Facebook Hover Three-Dot `•••` Button Next to Bubble */}
              {hasMoreActions && (
                <div
                  className="relative shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteId(null);
                      setOpenMenuId((prev) => (prev === item.id ? null : item.id));
                    }}
                    aria-label="Tùy chọn bình luận"
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[#65676b] dark:text-slate-400 hover:bg-[#f0f2f5] dark:hover:bg-slate-800 transition cursor-pointer ${
                      isMenuOpen
                        ? "opacity-100 bg-[#f0f2f5] dark:bg-slate-800"
                        : "opacity-0 group-hover/cmt:opacity-100 focus:opacity-100"
                    }`}
                  >
                    <MoreHorizontal size={15} />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-40 w-44 rounded-xl border border-slate-200 dark:border-slate-700/90 bg-white dark:bg-[#242526] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.35)] marlo-dropdown-in">
                      {isStaff && (
                        <button
                          type="button"
                          onClick={() => void handleTogglePin(item.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#f0f2f5] dark:hover:bg-white/[0.08] cursor-pointer"
                        >
                          <Pin size={13} className="text-emerald-500" />
                          <span>
                            {item.is_pinned ? "Bỏ ghim câu trả lời" : "Ghim câu trả lời chuẩn"}
                          </span>
                        </button>
                      )}

                      {item.can_edit && (
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setEditingId(item.id);
                            setEditContent(item.content);
                            setEditCode(item.code_snippet || "");
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#f0f2f5] dark:hover:bg-white/[0.08] cursor-pointer"
                        >
                          <Pencil size={13} />
                          <span>Chỉnh sửa</span>
                        </button>
                      )}

                      {item.can_delete &&
                        (confirmDeleteId === item.id ? (
                          <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 p-2 space-y-1.5">
                            <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                              Xóa bình luận này?
                            </p>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleDelete(item.id)}
                                className="rounded-md bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                              >
                                Xóa luôn
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-black/5 cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Xóa bình luận</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Authentic Facebook Action Bar Beneath Bubble: Thời gian · Thích · Phản hồi */}
          {!isEditing && (
            <div
              className={`flex flex-wrap items-center gap-3.5 pl-3 text-[12px] ${
                hasReactions ? "mt-2.5" : "mt-1"
              }`}
            >
              <span className="text-[#65676b] dark:text-slate-400 font-normal">
                {formatRelativeTimeVi(item.created_at)}
              </span>

              {/* Reaction Trigger + Hover Animated 6-Icon Facebook Dock */}
              <div
                className="relative"
                onMouseEnter={() => openReactionDock(item.id)}
                onMouseLeave={() => closeReactionDockDelayed(item.id)}
              >
                {hoveredReactId === item.id && (
                  <div className="absolute bottom-full left-0 pb-2 z-30">
                    <div className="fb-reaction-dock flex items-center gap-1.5 rounded-full bg-white dark:bg-[#242526] px-2.5 py-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.34)] ring-1 ring-black/[0.08] dark:ring-white/[0.12]">
                      {FB_DOCK_REACTIONS.map((rt, idx) => (
                        <button
                          key={rt}
                          type="button"
                          style={{ animationDelay: `${idx * 28}ms` }}
                          onMouseEnter={() => setHoveredDockReaction(rt)}
                          onMouseLeave={() => setHoveredDockReaction(null)}
                          onClick={() => void handleToggleReaction(item.id, rt)}
                          aria-label={REACTION_META[rt].label}
                          className="fb-reaction-item relative flex h-[34px] w-[34px] items-center justify-center rounded-full cursor-pointer focus:outline-none"
                        >
                          {hoveredDockReaction === rt && (
                            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/85 px-2 py-0.5 text-[10.5px] font-bold text-white shadow-sm">
                              {REACTION_META[rt].label}
                            </span>
                          )}
                          <FbReactionIcon type={rt} size={32} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    void handleToggleReaction(item.id, item.my_reaction || "like")
                  }
                  className={`font-bold hover:underline cursor-pointer transition-colors ${
                    isBursting ? "fb-react-burst inline-block" : ""
                  } ${
                    myReactMeta
                      ? myReactMeta.activeCls
                      : "text-[#65676b] dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {myReactMeta ? myReactMeta.label : "Thích"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setExpandedThreads((prev) => ({ ...prev, [rootId]: true }));
                  setReplyTarget({
                    rootId,
                    replyToName: item.author_name,
                    lessonId: rootLessonId,
                    lessonTitle: rootLessonTitle,
                  });
                  setReplyContent("");
                  setShowReplyCode(false);
                }}
                className="font-bold text-[#65676b] dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:underline cursor-pointer"
              >
                Phản hồi
              </button>

              {isStaff && (
                <button
                  type="button"
                  onClick={() => void handleTogglePin(item.id)}
                  className={`font-bold hover:underline cursor-pointer ${
                    item.is_pinned
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-[#65676b] dark:text-slate-400"
                  }`}
                >
                  {item.is_pinned ? "Đã ghim" : "Ghim chuẩn"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!shouldRender || typeof document === "undefined") return null;

  const badgeCode = (subjectCode || subjectId || "QNA").toUpperCase();
  const canSendRoot = !submitting && newContent.trim().length >= 2;
  const canSendReply = !submittingReply && replyContent.trim().length >= 2;

  return createPortal(
    <div className="fixed inset-0 z-[9998] pointer-events-none select-none">
      {/* ─── KANBAN SCRIM BACKDROP (marlo-scrim / marlo-scrim-out) ─── */}
      <div
        onClick={handleRequestClose}
        className={`fixed inset-0 bg-black/50 backdrop-blur-xs pointer-events-auto ${
          isClosing ? "marlo-scrim-out" : "marlo-scrim"
        }`}
      />

      {/* ─── KANBAN FLOATING ROUNDED DRAWER SHELL (1:1 MarloTaskDrawer) ─── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Hỏi đáp bài học"
        onClick={(e) => e.stopPropagation()}
        className={`fixed top-3 bottom-3 right-3 sm:top-4 sm:bottom-4 sm:right-4 w-[calc(100vw-24px)] sm:w-[580px] max-w-[calc(100vw-24px)] z-[9999] pointer-events-auto select-text rounded-[28px] sm:rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-[0_25px_80px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden ${
          isClosing ? "marlo-drawer-out" : "marlo-drawer"
        }`}
      >
        {/* ─── KANBAN DRAWER HEADER ─── */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px]">
                #{badgeCode}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 font-mono font-bold text-[11px]">
                {totalComments} bình luận
              </span>
              {unansweredCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{unansweredCount} chờ giải đáp</span>
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              {scopeMode === "course"
                ? "Hỏi đáp & Thảo luận toàn học phần"
                : `Hỏi đáp · Bài ${lessonId}${lessonTitle ? `: ${lessonTitle}` : ""}`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 truncate">
              {subjectName || badgeCode} · Trao đổi trực tiếp cùng Giảng viên &amp; Lớp học
            </p>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            title="Đóng (Esc)"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ─── KANBAN SEGMENTED FILTER BAR ─── */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200/70 dark:border-slate-800 p-1 gap-0.5">
            {(
              [
                { id: "all", label: "Tất cả" },
                { id: "unanswered", label: `Chưa đáp (${unansweredCount})` },
                { id: "pinned", label: "Câu trả lời chuẩn" },
              ] as const
            ).map((tabItem) => {
              const active = filterMode === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  type="button"
                  onClick={() => setFilterMode(tabItem.id)}
                  className={`rounded-full px-3 py-1 text-[11.5px] font-bold transition cursor-pointer ${
                    active
                      ? "bg-white text-slate-900 dark:bg-slate-100 dark:text-slate-950 shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tabItem.label}
                </button>
              );
            })}
          </div>

          {!courseWideMode && (
            <div className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200/70 dark:border-slate-800 p-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setScopeMode("lesson")}
                className={`rounded-full px-2.5 py-0.5 transition cursor-pointer ${
                  scopeMode === "lesson"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Bài này
              </button>
              <button
                type="button"
                onClick={() => setScopeMode("course")}
                className={`rounded-full px-2.5 py-0.5 transition cursor-pointer ${
                  scopeMode === "course"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Cả môn
              </button>
            </div>
          )}
        </div>

        {/* ─── SCROLLABLE FACEBOOK COMMENTS FEED ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5 bg-white dark:bg-slate-900 marlo-drawer-body">
          {/* Authentic Facebook Comment Composer Pill */}
          <form onSubmit={handlePostRootComment} className="flex items-start gap-2.5">
            {renderAvatar(myName, myAvatarUrl, "h-9 w-9 text-xs")}

            <div className="min-w-0 flex-1 rounded-[20px] bg-[#f0f2f5] dark:bg-[#222631] px-3.5 py-2.5 border border-transparent focus-within:border-slate-300 dark:focus-within:border-slate-700 transition">
              <textarea
                rows={composerExpanded || newContent ? 2 : 1}
                value={newContent}
                onFocus={() => setComposerExpanded(true)}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !showCodeInput) {
                    e.preventDefault();
                    void submitRootComment();
                  }
                }}
                placeholder={`Viết bình luận công khai dưới tên ${myName}...`}
                className="w-full resize-none bg-transparent text-[13.5px] leading-relaxed text-[#050505] dark:text-[#e4e6eb] placeholder:text-[#65676b] dark:placeholder:text-slate-400 focus:outline-none"
              />

              {showCodeInput && (
                <textarea
                  rows={3}
                  value={newCodeSnippet}
                  onChange={(e) => setNewCodeSnippet(e.target.value)}
                  placeholder="// Dán đoạn code cần hỏi hoặc giải pháp tại đây..."
                  spellCheck={false}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-800 bg-[#0d1117] p-3 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              )}

              {attachVideoTime && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#65676b] dark:text-slate-400">
                    Mốc phút:giây video:
                  </span>
                  <input
                    type="text"
                    value={videoTimeDraft}
                    onChange={(e) => setVideoTimeDraft(e.target.value)}
                    placeholder={currentVideoTimestamp || "04:15"}
                    className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}

              {/* Facebook Bottom Icon Toolbar Inside Bubble */}
              <div className="mt-1.5 flex items-center justify-between pt-1 border-t border-black/[0.05] dark:border-white/[0.06]">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setComposerExpanded(true);
                      setShowCodeInput((v) => !v);
                    }}
                    title="Đính kèm đoạn code"
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition cursor-pointer ${
                      showCodeInput
                        ? "bg-[#e7f3ff] text-[#0866ff] dark:bg-[#1a3353] dark:text-[#58a6ff]"
                        : "text-[#65676b] dark:text-slate-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                    }`}
                  >
                    <Code2 size={14} />
                    <span>Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setComposerExpanded(true);
                      setAttachVideoTime((v) => !v);
                      if (!videoTimeDraft && currentVideoTimestamp) {
                        setVideoTimeDraft(currentVideoTimestamp);
                      }
                    }}
                    title="Đính kèm mốc thời gian bài giảng"
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition cursor-pointer ${
                      attachVideoTime
                        ? "bg-[#e7f3ff] text-[#0866ff] dark:bg-[#1a3353] dark:text-[#58a6ff]"
                        : "text-[#65676b] dark:text-slate-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                    }`}
                  >
                    <Clock size={14} />
                    <span>Mốc giờ</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!canSendRoot}
                  title="Gửi bình luận (Enter)"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <FbSendIcon active={canSendRoot} />
                </button>
              </div>
            </div>
          </form>

          {/* Facebook Nested Comment Threads */}
          {loading ? (
            <div className="space-y-4 py-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex gap-2.5 animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <div className="h-18 flex-1 rounded-[18px] bg-slate-100 dark:bg-slate-800/70" />
                </div>
              ))}
            </div>
          ) : threads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
              <MessageCircle size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Chưa có bình luận nào ở mục này
              </p>
              <p className="mt-1 text-xs text-[#65676b] dark:text-slate-400">
                Hãy mở đầu cuộc thảo luận hoặc đặt câu hỏi ngay tại bài học này nhé!
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {threads.map((root) => {
                const allReplies = root.replies || [];
                const isReplyingHere = replyTarget?.rootId === root.id;
                const isExpanded = expandedThreads[root.id] ?? allReplies.length <= 3;
                const visibleReplies = isExpanded ? allReplies : allReplies.slice(0, 1);
                const hiddenReplyCount = allReplies.length - visibleReplies.length;
                const hasChildNodes =
                  visibleReplies.length > 0 || hiddenReplyCount > 0 || isReplyingHere;

                return (
                  <div key={root.id} className="space-y-2.5">
                    {renderSingleComment(
                      root,
                      root.id,
                      root.lesson_id,
                      root.lesson_title,
                      false,
                      hasChildNodes
                    )}

                    {/* Nested Replies + Curved Facebook L-Elbows */}
                    {hasChildNodes && (
                      <div className="space-y-2.5">
                        {visibleReplies.map((rep, idx) => {
                          const hasMoreBelow =
                            idx < visibleReplies.length - 1 ||
                            hiddenReplyCount > 0 ||
                            isReplyingHere;
                          return (
                            <div key={rep.id} className="relative pl-11">
                              {/* Continue vertical trunk if more replies/composer follow */}
                              {hasMoreBelow && (
                                <div
                                  aria-hidden="true"
                                  className="pointer-events-none absolute left-[17px] -top-3 bottom-[-12px] w-[2px] bg-[#cfd2d6] dark:bg-slate-700/90"
                                />
                              )}
                              {/* Curved Facebook L-Elbow pointing directly into Reply Avatar */}
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute left-[17px] -top-3 h-[27px] w-[22px] rounded-bl-[12px] border-b-2 border-l-2 border-[#cfd2d6] dark:border-slate-700/90"
                              />
                              {renderSingleComment(
                                rep,
                                root.id,
                                root.lesson_id,
                                root.lesson_title,
                                true,
                                false
                              )}
                            </div>
                          );
                        })}

                        {hiddenReplyCount > 0 && (
                          <div className="relative pl-11 pt-0.5">
                            {isReplyingHere && (
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute left-[17px] -top-3 bottom-[-12px] w-[2px] bg-[#cfd2d6] dark:bg-slate-700/90"
                              />
                            )}
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute left-[17px] -top-3 h-[22px] w-[22px] rounded-bl-[12px] border-b-2 border-l-2 border-[#cfd2d6] dark:border-slate-700/90"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedThreads((prev) => ({
                                  ...prev,
                                  [root.id]: true,
                                }))
                              }
                              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#65676b] dark:text-slate-300 hover:underline cursor-pointer"
                            >
                              <CornerDownRight size={13} />
                              <span>Xem thêm {hiddenReplyCount} phản hồi</span>
                            </button>
                          </div>
                        )}

                        {isReplyingHere && (
                          <div className="relative pl-11 pt-0.5">
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute left-[17px] -top-3 h-[27px] w-[22px] rounded-bl-[12px] border-b-2 border-l-2 border-[#cfd2d6] dark:border-slate-700/90"
                            />
                            <form
                              onSubmit={handlePostReply}
                              className="flex items-start gap-2"
                            >
                              {renderAvatar(
                                myName,
                                myAvatarUrl,
                                "h-7 w-7 text-[10.5px]"
                              )}
                              <div className="min-w-0 flex-1 rounded-[18px] bg-[#f0f2f5] dark:bg-[#222631] px-3 py-2 border border-slate-300/80 dark:border-slate-700">
                                <div className="mb-1 flex items-center justify-between text-[11px]">
                                  <span className="text-[#65676b] dark:text-slate-400">
                                    Đang phản hồi{" "}
                                    <b className="text-[#0866ff] dark:text-[#58a6ff]">
                                      {replyTarget.replyToName}
                                    </b>
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowReplyCode((v) => !v)}
                                      className="inline-flex items-center gap-1 font-semibold text-[#65676b] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                    >
                                      <Code2 size={11.5} />
                                      <span>{showReplyCode ? "Ẩn code" : "Code"}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setReplyTarget(null)}
                                      className="font-semibold text-[#65676b] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-end gap-1.5">
                                  <textarea
                                    rows={1}
                                    autoFocus
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (
                                        e.key === "Enter" &&
                                        !e.shiftKey &&
                                        !showReplyCode
                                      ) {
                                        e.preventDefault();
                                        void submitReplyComment();
                                      }
                                    }}
                                    placeholder={`Phản hồi ${replyTarget.replyToName}...`}
                                    className="w-full resize-none bg-transparent text-[13px] text-[#050505] dark:text-[#e4e6eb] focus:outline-none"
                                  />
                                  <button
                                    type="submit"
                                    disabled={!canSendReply}
                                    title="Gửi phản hồi (Enter)"
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08] disabled:opacity-45 cursor-pointer"
                                  >
                                    <FbSendIcon active={canSendReply} />
                                  </button>
                                </div>

                                {showReplyCode && (
                                  <textarea
                                    rows={3}
                                    value={replyCode}
                                    onChange={(e) => setReplyCode(e.target.value)}
                                    placeholder="// Đoạn code minh họa..."
                                    spellCheck={false}
                                    className="mt-2 w-full resize-none rounded-xl bg-[#0d1117] p-2.5 font-mono text-xs text-slate-100 focus:outline-none"
                                  />
                                )}
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
}
