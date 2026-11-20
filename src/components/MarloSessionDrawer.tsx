import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import {
  X,
  Trash2,
  Check,
  Lock,
  Unlock,
  FolderKanban,
  GitFork,
  FolderGit2,
  ShieldAlert,
  Pencil,
  ExternalLink,
  CalendarPlus,
  Info,
} from "lucide-react";
import type { AcademicScheduleItem } from "../api";
import {
  KIND_META,
  SCHEDULE_CATEGORY_META,
  formatScheduleDuration,
  formatScheduleHour,
  formatVietnameseDate,
  getNameInitials,
} from "./MarloAgendaView";

export interface MarloSessionDrawerProps {
  schedule: AcademicScheduleItem | null;
  isOpen: boolean;
  role: "student" | "instructor" | "admin";
  isFrozen?: boolean;
  onClose: () => void;
  onBookForStudent?: (schedule: AcademicScheduleItem) => void;
  onCancelStudentBooking?: (bookingId: string) => Promise<void>;
  onEditSchedule?: (schedule: AcademicScheduleItem) => void;
  onToggleLock?: (schedule: AcademicScheduleItem) => Promise<void>;
  onDeleteSchedule?: (schedule: AcademicScheduleItem) => Promise<void>;
  onReviewBooking?: (
    bookingId: string,
    status: "confirmed" | "rejected" | "completed",
    instructorReply?: string,
    switchToOnline?: boolean
  ) => Promise<void>;
  onOpenProjectDetail?: (projectId: string) => void;
  onOpenKanban?: (projectId: string) => void;
  onOpenGitHub?: (projectId: string) => void;
  onOpenDefenseRoom?: () => void;
}

function getBookingStatusStyle(status: string): { label: string; cls: string } {
  switch (status) {
    case "pending":
      return {
        label: "Chờ GV duyệt",
        cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      };
    case "confirmed":
      return {
        label: "Đã xác nhận",
        cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
    case "rejected":
      return {
        label: "Đã từ chối",
        cls: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      };
    case "completed":
      return {
        label: "Hoàn thành",
        cls: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      };
    default:
      return {
        label: status,
        cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      };
  }
}

function safeExternalUrl(url?: string | null): string | null {
  const val = (url || "").trim();
  return /^https?:\/\//i.test(val) ? val : null;
}

export default function MarloSessionDrawer({
  schedule,
  isOpen,
  role,
  isFrozen = false,
  onClose,
  onBookForStudent,
  onCancelStudentBooking,
  onEditSchedule,
  onToggleLock,
  onDeleteSchedule,
  onReviewBooking,
  onOpenProjectDetail,
  onOpenKanban,
  onOpenGitHub,
  onOpenDefenseRoom,
}: MarloSessionDrawerProps) {
  const scrimRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Cache schedule so that during the smooth exit animation, the drawer still displays the content cleanly
  const cachedScheduleRef = useRef<AcademicScheduleItem | null>(schedule);
  if (schedule) cachedScheduleRef.current = schedule;

  // Track rendered state to allow smooth exit animations (Marlo 1:1)
  const [isRendered, setIsRendered] = useState(isOpen && Boolean(schedule));
  const isClosingRef = useRef(false);

  useEffect(() => {
    setConfirmDelete(false);
    setBusyKey(null);
  }, [schedule?.id, isOpen]);

  // ─── AUTHENTIC MARLO EXIT ANIMATION (ẨN MODAL BÊN PHẢI/HÔNG) ───
  const handleAnimatedClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (!drawerRef.current || !scrimRef.current) {
      setIsRendered(false);
      isClosingRef.current = false;
      onClose();
      return;
    }

    gsap.killTweensOf([drawerRef.current, scrimRef.current]);

    gsap.to(scrimRef.current, {
      opacity: 0,
      duration: 0.22,
      ease: "power2.in",
    });

    gsap.to(drawerRef.current, {
      x: "104%",
      duration: 0.35,
      ease: "power3.in",
      onComplete: () => {
        setIsRendered(false);
        isClosingRef.current = false;
        onClose();
      },
    });
  };

  // Sync external isOpen/schedule changes with local rendered & exit state
  useEffect(() => {
    if (isOpen && schedule) {
      setIsRendered(true);
      isClosingRef.current = false;
    } else if (isRendered && !isClosingRef.current) {
      handleAnimatedClose();
    }
  }, [isOpen, schedule]);

  // ─── AUTHENTIC MARLO ENTRANCE ANIMATION (HIỆN MODAL BÊN PHẢI/HÔNG) ───
  useEffect(() => {
    if (!isRendered || isClosingRef.current || !drawerRef.current || !scrimRef.current) return;

    gsap.killTweensOf([drawerRef.current, scrimRef.current]);

    // 1. Scrim fade in
    gsap.fromTo(
      scrimRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: "power2.out" }
    );

    // 2. Drawer slide in from right with authentic Marlo expo.out (0.55s)
    gsap.fromTo(
      drawerRef.current,
      { x: "104%" },
      {
        x: "0%",
        duration: 0.55,
        ease: "expo.out",
        clearProps: "transform",
      }
    );

    // 3. Stagger inner sections cascading (hero, metadata, attendees, footer)
    const bodyItems = drawerRef.current.querySelectorAll(".drawer-cascade-item");
    if (bodyItems.length > 0) {
      gsap.fromTo(
        bodyItems,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          delay: 0.1,
          stagger: 0.035,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      );
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleAnimatedClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRendered]);

  const activeSchedule = schedule || cachedScheduleRef.current;
  if (!isRendered || !activeSchedule) return null;

  const catMeta =
    SCHEDULE_CATEGORY_META[schedule.category] || SCHEDULE_CATEGORY_META.office_hours;
  const kindMeta = KIND_META[catMeta.kind];
  const IconComponent = kindMeta.icon;
  const isStaff = role === "instructor" || role === "admin";
  const isLocked = Boolean(schedule.is_locked);
  const isFull = (schedule.current_booked || 0) >= (schedule.max_capacity || 1);
  const capacityPct = Math.min(
    100,
    Math.round(((schedule.current_booked || 0) / Math.max(1, schedule.max_capacity)) * 100)
  );
  const myBooking = schedule.my_booking || null;
  const hasActiveStudentBooking = Boolean(
    myBooking && myBooking.booking_status !== "rejected"
  );
  const bookings = schedule.bookings || [];
  const canJoinDefense =
    (schedule.category === "exam" || schedule.category === "defense") &&
    Boolean(onOpenDefenseRoom);

  const runAsync = async (key: string, fn?: () => Promise<void>) => {
    if (!fn || busyKey) return;
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey(null);
    }
  };

  const drawerNode = (
    <div className="fixed inset-0 z-[9998] pointer-events-auto select-none">
      <div
        ref={scrimRef}
        onClick={handleAnimatedClose}
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px]"
      />

      <aside
        ref={drawerRef}
        className="fixed top-4 bottom-4 right-3 sm:top-5 sm:bottom-5 sm:right-5 w-[calc(100vw-24px)] sm:w-[460px] max-w-[calc(100vw-24px)] z-[9999] flex flex-col rounded-[24px] bg-[#FAF9F6] dark:bg-[#16171f] text-slate-900 dark:text-slate-100 shadow-2xl border border-[#EBE8E2] dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={schedule.title}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[#EBE8E2] dark:border-slate-800 bg-white/80 dark:bg-[#1a1b24]/90 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catMeta.badgeCls}`}
              >
                {catMeta.label}
              </span>
              {schedule.course_code && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10.5px] font-bold">
                  {schedule.course_code}
                </span>
              )}
              {isLocked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-[10.5px] font-bold">
                  <Lock size={10} />
                  <span>Đã khóa</span>
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
              {schedule.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {formatVietnameseDate(schedule.schedule_date)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAnimatedClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
          >
            <X size={17} strokeWidth={2.3} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
          {/* Hero block */}
          <div className="drawer-cascade-item bg-[#23201D] dark:bg-[#1f222e] text-white p-4 rounded-2xl flex items-center gap-4 border border-slate-700/40">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <IconComponent size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <b className="text-xl font-bold font-mono tracking-tight block">
                {formatScheduleHour(schedule.start_hour)} –{" "}
                {formatScheduleHour(schedule.end_hour)}
              </b>
              <small className="text-xs text-slate-300 font-medium block truncate mt-0.5">
                {formatScheduleDuration(schedule.start_hour, schedule.end_hour)} ·{" "}
                {schedule.room_or_link}
              </small>
            </div>
          </div>

          {isFrozen && (
            <div className="drawer-cascade-item p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200 font-semibold">
              <ShieldAlert size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <span>
                Đồ án liên kết hiện đang bị đóng băng nộp bài (Dự án · Kanban · Git Hub).
              </span>
            </div>
          )}

          {/* Metadata Card */}
          <div className="drawer-cascade-item rounded-2xl border border-[#EBE8E2] dark:border-slate-800 bg-white dark:bg-[#1e202b] p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Giảng viên phụ trách
              </span>
              <span className="font-bold text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-bold inline-flex items-center justify-center">
                  {getNameInitials(schedule.instructor_name)}
                </span>
                {schedule.instructor_name}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Phòng / Link
              </span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-right break-all">
                {schedule.room_or_link}
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Sĩ số đăng ký
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {schedule.current_booked}/{schedule.max_capacity} ({capacityPct}%)
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isFull ? "bg-rose-500" : "bg-[#EE8420]"
                  }`}
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cross-Module Project Linkage Card */}
          {schedule.project_id && (
            <div className="drawer-cascade-item rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e202b] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderGit2 size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                      Đồ án liên kết · {schedule.project_code || schedule.project_id}
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {schedule.project_name || schedule.project_id}
                    </div>
                  </div>
                </div>
                {safeExternalUrl(schedule.project_repo_url) && (
                  <a
                    href={safeExternalUrl(schedule.project_repo_url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    <span>Repo</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>

              <div className="flex items-center flex-wrap gap-1.5 pt-1">
                {onOpenProjectDetail && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAnimatedClose();
                      onOpenProjectDetail(schedule.project_id!);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-[11px] font-bold transition cursor-pointer"
                  >
                    Chi tiết Dự án
                  </button>
                )}
                {onOpenKanban && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAnimatedClose();
                      onOpenKanban(schedule.project_id!);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <FolderKanban size={11} />
                    <span>Bảng Kanban</span>
                  </button>
                )}
                {onOpenGitHub && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAnimatedClose();
                      onOpenGitHub(schedule.project_id!);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <GitFork size={11} />
                    <span>Git Hub</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Note */}
          {schedule.note && (
            <div className="drawer-cascade-item p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="font-bold text-[11px] text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <Info size={13} className="text-blue-500" />
                <span>Lưu ý học vụ</span>
              </div>
              {schedule.note}
            </div>
          )}

          {/* Student Booking Section */}
          {role === "student" && myBooking && (
            <div className="drawer-cascade-item rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e202b] p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  Trạng thái đăng ký của bạn
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10.5px] font-bold ${
                    getBookingStatusStyle(myBooking.booking_status).cls
                  }`}
                >
                  {getBookingStatusStyle(myBooking.booking_status).label}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 font-medium">
                Chủ đề: {myBooking.topic}
              </p>
              {safeExternalUrl(myBooking.repo_or_doc_url) && (
                <a
                  href={safeExternalUrl(myBooking.repo_or_doc_url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-mono break-all"
                >
                  <span>{myBooking.repo_or_doc_url}</span>
                  <ExternalLink size={11} />
                </a>
              )}
              {myBooking.instructor_reply && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200">
                  <b>Phản hồi của Giảng viên:</b> {myBooking.instructor_reply}
                </div>
              )}
            </div>
          )}

          {/* Instructor/Admin Bookings List */}
          {isStaff && (
            <div className="drawer-cascade-item space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Danh sách học viên đăng ký ({bookings.length})
                </h3>
              </div>
              {bookings.length === 0 ? (
                <div className="p-3 rounded-xl bg-white dark:bg-[#1e202b] border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 italic">
                  Chưa có học viên nào đăng ký vào ca này.
                </div>
              ) : (
                bookings.map((bk) => {
                  const st = getBookingStatusStyle(bk.booking_status);
                  return (
                    <div
                      key={bk.id}
                      className="p-3 rounded-xl bg-white dark:bg-[#1e202b] border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {bk.student_name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">{bk.topic}</div>
                      {onReviewBooking && bk.booking_status !== "completed" && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {bk.booking_status !== "confirmed" && (
                            <button
                              type="button"
                              disabled={busyKey === `rev-${bk.id}`}
                              onClick={() =>
                                runAsync(`rev-${bk.id}`, () =>
                                  onReviewBooking(bk.id, "confirmed")
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                            >
                              Duyệt
                            </button>
                          )}
                          {bk.booking_status !== "rejected" && (
                            <button
                              type="button"
                              disabled={busyKey === `rev-${bk.id}`}
                              onClick={() =>
                                runAsync(`rev-${bk.id}`, () =>
                                  onReviewBooking(bk.id, "rejected", "Vui lòng chọn khung giờ khác.")
                                )
                              }
                              className="px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                          )}
                          {bk.booking_status === "confirmed" && (
                            <button
                              type="button"
                              disabled={busyKey === `rev-${bk.id}`}
                              onClick={() =>
                                runAsync(`rev-${bk.id}`, () =>
                                  onReviewBooking(bk.id, "completed")
                                )
                              }
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                            >
                              Hoàn thành
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="drawer-cascade-item px-6 py-4 bg-white dark:bg-[#1a1b24] border-t border-[#EBE8E2] dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap shrink-0">
          {role === "student" ? (
            <>
              <div className="flex items-center gap-2">
                {hasActiveStudentBooking &&
                  myBooking &&
                  myBooking.booking_status !== "completed" &&
                  onCancelStudentBooking && (
                    <button
                      type="button"
                      disabled={busyKey === "cancel-bk"}
                      onClick={() =>
                        runAsync("cancel-bk", async () => {
                          await onCancelStudentBooking(myBooking.id);
                          handleAnimatedClose();
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      <span>Hủy đăng ký</span>
                    </button>
                  )}
                {canJoinDefense && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAnimatedClose();
                      onOpenDefenseRoom?.();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-black text-xs font-bold transition cursor-pointer"
                  >
                    <span>Vào phòng AI 3D</span>
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>

              {!hasActiveStudentBooking && onBookForStudent && (
                <button
                  type="button"
                  disabled={isLocked || isFull || schedule.status === "completed"}
                  onClick={() => {
                    handleAnimatedClose();
                    onBookForStudent(schedule);
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                    isLocked || isFull || schedule.status === "completed"
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      : "bg-[#EE8420] hover:bg-[#d97316] text-slate-950 cursor-pointer shadow-xs"
                  }`}
                >
                  <CalendarPlus size={14} />
                  <span>
                    {isLocked
                      ? "Ca đã khóa"
                      : isFull
                      ? "Đã đủ sĩ số"
                      : "Đăng ký ca này"}
                  </span>
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {onToggleLock && (
                  <button
                    type="button"
                    disabled={busyKey === "lock"}
                    onClick={() => runAsync("lock", () => onToggleLock(schedule))}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer disabled:opacity-50 ${
                      isLocked
                        ? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                    <span>{isLocked ? "Mở khóa" : "Khóa ca"}</span>
                  </button>
                )}
                {onDeleteSchedule &&
                  (confirmDelete ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={busyKey === "del"}
                        onClick={() =>
                          runAsync("del", async () => {
                            await onDeleteSchedule(schedule);
                            handleAnimatedClose();
                          })
                        }
                        className="px-2.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Xác nhận hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-2 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                      >
                        Thôi
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Hủy ca</span>
                    </button>
                  ))}
              </div>

              <div className="flex items-center gap-2">
                {canJoinDefense && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAnimatedClose();
                      onOpenDefenseRoom?.();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white hover:bg-black text-xs font-bold transition cursor-pointer"
                  >
                    <span>Vào chấm thi</span>
                    <ExternalLink size={12} />
                  </button>
                )}
                {onEditSchedule && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAnimatedClose();
                      onEditSchedule(schedule);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#EE8420] hover:bg-[#d97316] text-slate-950 text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    <Pencil size={13} />
                    <span>Sửa / Đổi phòng</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(drawerNode, document.body)
    : drawerNode;
}
