import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FolderGit2,
  FolderKanban,
  GitFork,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Unlock,
  Video,
  X,
} from "lucide-react";
import type { Role } from "../App";
import {
  bookScheduleApi,
  cancelScheduleBookingApi,
  createScheduleApi,
  deleteScheduleApi,
  fetchSchedulesBundleApi,
  updateBookingStatusApi,
  updateScheduleApi,
  type AcademicScheduleItem,
  type ScheduleBookingItem,
  type ScheduleCourseOption,
  type ScheduleInstructorOption,
  type ScheduleProjectOption,
} from "../api";
import MarloAgendaView, {
  AgendaBooking,
  AgendaDay,
  BookingKind,
  MARLO_ROOMS_VI,
  SCHEDULE_CATEGORY_META,
  addDaysToDateStr,
  formatScheduleDuration,
  formatScheduleHour,
  formatShortDateLabel,
  formatVietnameseDate,
  getLocalTodayDateStr,
  getNameInitials,
} from "../components/MarloAgendaView";
import MarloBookRoomModal from "../components/MarloBookRoomModal";
import MarloSegmentedControl from "../components/MarloSegmentedControl";
import MarloSessionDrawer from "../components/MarloSessionDrawer";
import MarloTitle from "../components/MarloTitle";
import MarloToast from "../components/MarloToast";
import {
  animateMarloCards,
  animateMarloPill,
  animateMarloRows,
  useMarloPageEntrance,
} from "../utils/marloAnimations";
import {
  isProjectFrozen,
  subscribeProjectLockChanges,
} from "../utils/projectFreeze";

export type ScheduleTab = "week" | "agenda" | "exams" | "mentoring";

export interface EngineeringScheduleRotaProps {
  role?: Role;
  onNavigate?: (screen: any) => void;
  onRoleChange?: (role: Role) => void;
  onOpenProjectDetail?: (projectId: string) => void;
  onOpenKanban?: (projectId: string) => void;
  onOpenGitHub?: (projectId: string) => void;
}

const TIMELINE_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const MIN_HOUR = 7;
const MAX_HOUR = 19;
const TOTAL_HOURS = MAX_HOUR - MIN_HOUR;

function matchesSearch(s: AcademicScheduleItem, q: string): boolean {
  const kw = q.trim().toLowerCase();
  if (!kw) return true;
  const hay = [
    s.title,
    s.room_or_link,
    s.instructor_name,
    s.note,
    s.project_name,
    s.project_code,
    s.course_code,
    SCHEDULE_CATEGORY_META[s.category]?.label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (hay.includes(kw)) return true;
  return (s.bookings || []).some(
    (b) =>
      (b.student_name || "").toLowerCase().includes(kw) ||
      (b.topic || "").toLowerCase().includes(kw)
  );
}

function getCategoryBarStyle(category: string, isLocked: boolean): string {
  if (isLocked) {
    return "bg-rose-50/90 dark:bg-rose-950/50 text-rose-950 dark:text-rose-100 border border-rose-200 dark:border-rose-800 border-l-[3.5px] border-l-rose-500 shadow-2xs";
  }
  switch (category) {
    case "exam":
      return "bg-[#F7EBD9] dark:bg-amber-950/50 text-[#2B2419] dark:text-amber-100 border border-[#EBD0A8] dark:border-amber-800/80 border-l-[3.5px] border-l-[#F29B23] shadow-2xs";
    case "defense":
      return "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-800/80 border-l-[3.5px] border-l-emerald-600 shadow-2xs";
    case "review":
      return "bg-blue-50 dark:bg-blue-950/50 text-blue-950 dark:text-blue-100 border border-blue-200 dark:border-blue-800/80 border-l-[3.5px] border-l-blue-600 shadow-2xs";
    case "lab":
      return "bg-purple-50 dark:bg-purple-950/50 text-purple-950 dark:text-purple-100 border border-purple-200 dark:border-purple-800/80 border-l-[3.5px] border-l-purple-600 shadow-2xs";
    default:
      return "bg-[#FCE4D6] dark:bg-orange-950/50 text-[#2D2320] dark:text-orange-100 border border-[#F3C4B0] dark:border-orange-800/80 border-l-[3.5px] border-l-[#E8712A] shadow-2xs";
  }
}

function safeHttpUrl(url?: string | null): string | null {
  const clean = (url || "").trim();
  return /^https?:\/\//i.test(clean) ? clean : null;
}

function getBookingStatusChip(status: string): { label: string; cls: string } {
  switch (status) {
    case "pending":
      return {
        label: "Chờ GV duyệt",
        cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      };
    case "confirmed":
      return {
        label: "Đã xác nhận",
        cls: "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-bold",
      };
    case "rejected":
      return {
        label: "Đã từ chối",
        cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      };
    case "completed":
      return {
        label: "Đã hoàn thành",
        cls: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 font-bold",
      };
    default:
      return {
        label: status,
        cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      };
  }
}

export default function EngineeringScheduleRota({
  role = "student",
  onNavigate,
  onOpenProjectDetail,
  onOpenKanban,
  onOpenGitHub,
}: EngineeringScheduleRotaProps) {
  const isStaff = role === "instructor" || role === "admin";
  const todayStr = getLocalTodayDateStr();

  const [activeTab, setActiveTab] = useState<ScheduleTab>("week");
  const [displayedTab, setDisplayedTab] = useState<ScheduleTab>("week");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [schedules, setSchedules] = useState<AcademicScheduleItem[]>([]);
  const [projects, setProjects] = useState<ScheduleProjectOption[]>([]);
  const [courses, setCourses] = useState<ScheduleCourseOption[]>([]);
  const [instructors, setInstructors] = useState<ScheduleInstructorOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lockTick, setLockTick] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [timelineFilter, setTimelineFilter] = useState<
    "all" | "exam_defense" | "office_hours" | "lab_review"
  >("all");
  const [examCatFilter, setExamCatFilter] = useState<"all" | "exam" | "defense">("all");
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>("all");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "rejected" | "completed"
  >("all");

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    exam_defense: true,
    office_hours: true,
    lab_review: true,
  });

  // Live real clock
  const [nowClock, setNowClock] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNowClock(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);
  const nowHour = nowClock.getHours() + nowClock.getMinutes() / 60;
  const nowClockStr = formatScheduleHour(nowHour);

  // Selected drawer ID (always resolved live from schedules)
  const [drawerScheduleId, setDrawerScheduleId] = useState<string | null>(null);

  // Staff modal (Create / Edit schedule)
  const [roomModalState, setRoomModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    editing: AcademicScheduleItem | null;
    initialDate?: string;
    initialCategory?: string;
  }>({
    isOpen: false,
    mode: "create",
    editing: null,
  });

  // Student booking modal state
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [bookingScheduleId, setBookingScheduleId] = useState("");
  const [bookingProjectId, setBookingProjectId] = useState("");
  const [bookingRepoUrl, setBookingRepoUrl] = useState("");
  const [bookingTopic, setBookingTopic] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  // Inline states for Exam delete confirm & Instructor booking replies
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<(() => void) | null>(null);

  const showToast = (msg: string, undo?: () => void) => {
    setToastMessage(msg);
    setUndoAction(undo ? () => undo : null);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 4500);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    return subscribeProjectLockChanges(() => setLockTick((v) => v + 1));
  }, []);

  const loadSchedules = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const bundle = await fetchSchedulesBundleApi(undefined, role);
      setSchedules(bundle.schedules);
      setProjects(bundle.projects);
      setCourses(bundle.courses);
      setInstructors(bundle.instructors);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedules();
  }, [role]);

  // Keep student out of staff-only "exams" tab
  useEffect(() => {
    if (!isStaff && (activeTab === "exams" || displayedTab === "exams")) {
      setActiveTab("week");
      setDisplayedTab("week");
    }
  }, [isStaff, activeTab, displayedTab]);

  // Marlo tabs underline + stage entrance
  const tabsNavRef = useRef<HTMLElement>(null);
  const tabLineRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rotaRef = useRef<HTMLDivElement>(null);
  const isFirstTabRender = useRef(true);

  useMarloPageEntrance(
    rotaRef,
    (el) => {
      const cards = el.querySelectorAll(".marlo-card");
      if (cards.length > 0) animateMarloCards(cards, { stagger: 0.045, y: 18 });
    },
    []
  );

  useLayoutEffect(() => {
    if (!tabsNavRef.current || !tabLineRef.current) return;
    const activeBtn = tabsNavRef.current.querySelector<HTMLElement>('[aria-current="page"]');
    if (activeBtn) {
      animateMarloPill(tabLineRef.current, activeBtn, {
        animate: !isFirstTabRender.current,
        radius: 2,
        line: true,
      });
      isFirstTabRender.current = false;
    }
  }, [activeTab, role, schedules.length]);

  useEffect(() => {
    const recompute = () => {
      if (!tabsNavRef.current || !tabLineRef.current) return;
      const activeBtn = tabsNavRef.current.querySelector<HTMLElement>('[aria-current="page"]');
      if (activeBtn) {
        animateMarloPill(tabLineRef.current, activeBtn, {
          animate: false,
          radius: 2,
          line: true,
        });
      }
    };
    const ro = new ResizeObserver(recompute);
    if (tabsNavRef.current) {
      ro.observe(tabsNavRef.current);
      Array.from(tabsNavRef.current.children).forEach((ch) => ro.observe(ch));
    }
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, []);

  const switchTab = (nextTab: ScheduleTab) => {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    setDisplayedTab(nextTab);
  };

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    gsap.killTweensOf(stage);
    gsap.fromTo(
      stage,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.28, ease: "power2.out", clearProps: "all" }
    );
    const dayCards = stage.querySelectorAll<HTMLElement>(".agenda__day");
    if (displayedTab === "agenda" && dayCards.length > 0) {
      animateMarloCards(dayCards, { y: 14, stagger: 0.03, duration: 0.4 });
    }
  }, [displayedTab]);

  // ESC key closes Student Booking Modal
  useEffect(() => {
    if (!studentModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStudentModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [studentModalOpen]);

  // Drag & resize engine for staff timeline bars
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const didDragMoveRef = useRef(false);
  const [dragging, setDragging] = useState<{
    itemId: string;
    mode: "move" | "resize-left" | "resize-right";
    startX: number;
    initialStart: number;
    initialEnd: number;
    currentStart: number;
    currentEnd: number;
  } | null>(null);

  const handleBarPointerDown = (
    e: React.PointerEvent,
    sch: AcademicScheduleItem,
    mode: "move" | "resize-left" | "resize-right"
  ) => {
    if (!isStaff || Boolean(sch.is_locked)) return;
    e.stopPropagation();
    didDragMoveRef.current = false;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDragging({
      itemId: sch.id,
      mode,
      startX: e.clientX,
      initialStart: sch.start_hour,
      initialEnd: sch.end_hour,
      currentStart: sch.start_hour,
      currentEnd: sch.end_hour,
    });
  };

  const handleStagePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !timelineTrackRef.current) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    if (!rect.width) return;
    const pxDelta = e.clientX - dragging.startX;
    if (Math.abs(pxDelta) > 4) didDragMoveRef.current = true;
    const hrDelta = (pxDelta / rect.width) * TOTAL_HOURS;
    const snap15 = (v: number) => Math.round(v * 4) / 4;

    if (dragging.mode === "move") {
      const dur = dragging.initialEnd - dragging.initialStart;
      let nextStart = snap15(dragging.initialStart + hrDelta);
      nextStart = Math.max(MIN_HOUR, Math.min(MAX_HOUR - dur, nextStart));
      setDragging((p) =>
        p ? { ...p, currentStart: nextStart, currentEnd: snap15(nextStart + dur) } : null
      );
    } else if (dragging.mode === "resize-left") {
      const nextStart = Math.max(
        MIN_HOUR,
        Math.min(dragging.currentEnd - 0.5, snap15(dragging.initialStart + hrDelta))
      );
      setDragging((p) => (p ? { ...p, currentStart: nextStart } : null));
    } else {
      const nextEnd = Math.min(
        MAX_HOUR,
        Math.max(dragging.currentStart + 0.5, snap15(dragging.initialEnd + hrDelta))
      );
      setDragging((p) => (p ? { ...p, currentEnd: nextEnd } : null));
    }
  };

  const handleStagePointerUp = async (e: React.PointerEvent) => {
    if (!dragging) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const { itemId, initialStart, initialEnd, currentStart, currentEnd } = dragging;
    setDragging(null);

    if (Math.abs(initialStart - currentStart) < 1e-4 && Math.abs(initialEnd - currentEnd) < 1e-4) {
      return;
    }

    // Optimistic update then persist to DB
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === itemId ? { ...s, start_hour: currentStart, end_hour: currentEnd } : s
      )
    );

    try {
      await updateScheduleApi(
        itemId,
        { start_hour: currentStart, end_hour: currentEnd },
        role
      );
      showToast(
        `✓ Đã dời lịch sang ${formatScheduleHour(currentStart)} – ${formatScheduleHour(
          currentEnd
        )}`,
        () => {
          void updateScheduleApi(
            itemId,
            { start_hour: initialStart, end_hour: initialEnd },
            role
          )
            .then(() => loadSchedules(true))
            .then(() => showToast("↩ Đã hoàn tác khung giờ ban đầu."));
        }
      );
      await loadSchedules(true);
    } catch (err: any) {
      // Rollback on 409 / validation error
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === itemId ? { ...s, start_hour: initialStart, end_hour: initialEnd } : s
        )
      );
      showToast(err?.message || "Không thể dời lịch do trùng phòng hoặc lỗi dữ liệu.");
    }
  };

  // Filtered base schedules by search query
  const searchedSchedules = useMemo(
    () => schedules.filter((s) => matchesSearch(s, searchQuery)),
    [schedules, searchQuery]
  );

  // Active dates chips from real schedules
  const availableDateChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of searchedSchedules) {
      counts.set(s.schedule_date, (counts.get(s.schedule_date) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  }, [searchedSchedules]);

  // Daily timeline groups on selectedDate
  const dailySchedules = useMemo(
    () => searchedSchedules.filter((s) => s.schedule_date === selectedDate),
    [searchedSchedules, selectedDate]
  );

  const timelineGroups = useMemo(() => {
    const allGroups = [
      {
        id: "exam_defense",
        name: "Khảo thí & Hội đồng Bảo vệ",
        badgeColor: "bg-[#F29B23]",
        subtitle: "Ca thi định kỳ & Phản biện đồ án AI Council",
        items: dailySchedules.filter(
          (s) => s.category === "exam" || s.category === "defense"
        ),
      },
      {
        id: "office_hours",
        name: "Cố vấn Học tập 1-on-1",
        badgeColor: "bg-[#E8712A]",
        subtitle: "Khung giờ hỏi đáp chuyên môn & Review code trực tiếp",
        items: dailySchedules.filter((s) => s.category === "office_hours"),
      },
      {
        id: "lab_review",
        name: "Thực hành Lab & Review Sprint",
        badgeColor: "bg-[#7c3aed]",
        subtitle: "Sandbox CI/CD, bảo mật & Nghiệm thu tiến độ",
        items: dailySchedules.filter(
          (s) => s.category === "lab" || s.category === "review"
        ),
      },
    ];
    return timelineFilter === "all"
      ? allGroups
      : allGroups.filter((g) => g.id === timelineFilter);
  }, [dailySchedules, timelineFilter]);

  // 7-day real Agenda centered from selectedDate
  const agendaDays: AgendaDay[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const dateStr = addDaysToDateStr(selectedDate, i);
      const dayItems = searchedSchedules
        .filter((s) => s.schedule_date === dateStr)
        .sort((a, b) => a.start_hour - b.start_hour);

      const bookings: AgendaBooking[] = dayItems.map((s) => {
        const meta =
          SCHEDULE_CATEGORY_META[s.category] || SCHEDULE_CATEGORY_META.office_hours;
        const kind: BookingKind = meta.kind;
        const colorToken =
          s.category === "exam"
            ? "grade"
            : s.category === "defense"
            ? "delivery"
            : s.category === "review"
            ? "review"
            : s.category === "lab"
            ? "mix"
            : "edit";
        const initials = getNameInitials(s.instructor_name);
        return {
          id: s.id,
          time: formatScheduleHour(s.start_hour),
          endTime: formatScheduleHour(s.end_hour),
          duration: formatScheduleDuration(s.start_hour, s.end_hour),
          dateLabel: formatVietnameseDate(s.schedule_date, false),
          kind,
          colorToken,
          title: s.title,
          sub: `${meta.label} · ${s.room_or_link}${
            s.project_code ? ` · ${s.project_code}` : ""
          }`,
          who: [
            {
              id: s.instructor_id,
              initials,
              name: s.instructor_name,
              bg: "#FDE68A",
              textColor: "#78350F",
            },
          ],
          room: s.room_or_link,
          done: s.status === "completed",
          capacityText: `${s.current_booked}/${s.max_capacity}`,
          isLocked: Boolean(s.is_locked),
          bookingStatus: role === "student" ? s.my_booking?.booking_status : undefined,
          schedule: s,
        };
      });

      return {
        id: dateStr,
        dateStr,
        label: formatShortDateLabel(dateStr),
        isToday: dateStr === todayStr,
        canBook: true,
        bookings,
      };
    });
  }, [selectedDate, todayStr, searchedSchedules, role]);

  // Exam & Defense list + real dynamic KPIs
  const examDefenseSchedules = useMemo(
    () =>
      searchedSchedules.filter(
        (s) => s.category === "exam" || s.category === "defense"
      ),
    [searchedSchedules]
  );

  const filteredExamSchedules = useMemo(
    () =>
      examDefenseSchedules.filter(
        (s) =>
          (examCatFilter === "all" || s.category === examCatFilter) &&
          (selectedRoomFilter === "all" || s.room_or_link === selectedRoomFilter)
      ),
    [examDefenseSchedules, examCatFilter, selectedRoomFilter]
  );

  const uniqueExamRooms = useMemo(
    () => Array.from(new Set(examDefenseSchedules.map((s) => s.room_or_link).filter(Boolean))),
    [examDefenseSchedules]
  );

  const liveExamCount = useMemo(
    () =>
      examDefenseSchedules.filter(
        (s) =>
          s.schedule_date === todayStr &&
          s.start_hour <= nowHour &&
          nowHour < s.end_hour &&
          s.status !== "cancelled"
      ).length,
    [examDefenseSchedules, todayStr, nowHour]
  );

  const lockedExamCount = useMemo(
    () => examDefenseSchedules.filter((s) => Boolean(s.is_locked)).length,
    [examDefenseSchedules]
  );

  // Student personal bookings + open slots
  const myStudentBookedSchedules = useMemo(
    () =>
      searchedSchedules.filter((s) => Boolean(s.my_booking)),
    [searchedSchedules]
  );

  const openStudentBookableSlots = useMemo(
    () =>
      searchedSchedules
        .filter(
          (s) =>
            !s.is_locked &&
            s.status !== "completed" &&
            s.status !== "cancelled" &&
            (s.current_booked || 0) < (s.max_capacity || 1) &&
            (!s.my_booking || s.my_booking.booking_status === "rejected")
        )
        .sort((a, b) => {
          const ao = a.category === "office_hours" ? 0 : 1;
          const bo = b.category === "office_hours" ? 0 : 1;
          if (ao !== bo) return ao - bo;
          return a.schedule_date !== b.schedule_date
            ? a.schedule_date.localeCompare(b.schedule_date)
            : a.start_hour - b.start_hour;
        }),
    [searchedSchedules]
  );

  // Staff booking queue flattened across all schedules
  const staffBookingsQueue = useMemo(() => {
    const items: Array<{ schedule: AcademicScheduleItem; booking: ScheduleBookingItem }> = [];
    for (const s of searchedSchedules) {
      for (const b of s.bookings || []) {
        if (bookingStatusFilter === "all" || b.booking_status === bookingStatusFilter) {
          items.push({ schedule: s, booking: b });
        }
      }
    }
    return items.sort((a, b) => {
      const order: Record<string, number> = {
        pending: 0,
        confirmed: 1,
        completed: 2,
        rejected: 3,
      };
      const ao = order[a.booking.booking_status] ?? 9;
      const bo = order[b.booking.booking_status] ?? 9;
      if (ao !== bo) return ao - bo;
      return (b.booking.created_at || "").localeCompare(a.booking.created_at || "");
    });
  }, [searchedSchedules, bookingStatusFilter]);

  const pendingQueueCount = useMemo(
    () =>
      schedules.reduce(
        (sum, s) =>
          sum +
          (s.bookings || []).filter((b) => b.booking_status === "pending").length,
        0
      ),
    [schedules]
  );

  const studentActiveBookingsCount = useMemo(
    () =>
      schedules.filter(
        (s) => s.my_booking && s.my_booking.booking_status !== "rejected"
      ).length,
    [schedules]
  );

  const drawerSchedule = useMemo(
    () => schedules.find((s) => s.id === drawerScheduleId) || null,
    [schedules, drawerScheduleId]
  );

  // Handlers
  const openStudentBookingModal = (preferredSchedule?: AcademicScheduleItem, preferredDate?: string) => {
    const candidates = openStudentBookableSlots;
    const matchByDate = preferredDate
      ? candidates.find((c) => c.schedule_date === preferredDate)
      : undefined;
    const chosen = preferredSchedule || matchByDate || candidates[0];
    setBookingScheduleId(chosen?.id || "");
    const projId = chosen?.project_id || "";
    setBookingProjectId(projId);
    const matchedProj = projects.find((p) => p.id === projId);
    setBookingRepoUrl(matchedProj?.repo_url || chosen?.project_repo_url || "");
    setBookingTopic("");
    setBookingNote("");
    setBookingError(null);
    setStudentModalOpen(true);
  };

  const handleSubmitStudentBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    if (!bookingScheduleId) {
      setBookingError("Hiện không có ca lịch mở nào để đăng ký.");
      return;
    }
    if (!bookingTopic.trim()) {
      setBookingError("Vui lòng nhập chủ đề hoặc nội dung cần trao đổi.");
      return;
    }
    setIsBookingSubmitting(true);
    try {
      const res = await bookScheduleApi(
        bookingScheduleId,
        {
          topic: bookingTopic.trim(),
          repo_or_doc_url: bookingRepoUrl.trim(),
          student_note: bookingNote.trim(),
        },
        role
      );
      setStudentModalOpen(false);
      await loadSchedules(true);
      showToast(
        res?.status === "pending"
          ? "✓ Đã gửi yêu cầu hẹn 1-1! Chờ Giảng viên phê duyệt."
          : "✓ Đã giữ chỗ tham gia ca lịch thành công!"
      );
    } catch (err: any) {
      setBookingError(err?.message || "Không thể đăng ký ca lịch.");
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const handleCancelStudentBooking = async (bookingId: string) => {
    try {
      await cancelScheduleBookingApi(bookingId, role);
      await loadSchedules(true);
      showToast("✓ Đã hủy đăng ký ca lịch và trả lại sĩ số.");
    } catch (err: any) {
      showToast(err?.message || "Không thể hủy đăng ký.");
    }
  };

  const handleSaveRoomModal = async (payload: Record<string, any>, editId?: string) => {
    if (editId) {
      await updateScheduleApi(editId, payload, role);
      showToast("✓ Đã cập nhật thông tin & phòng ca lịch.");
    } else {
      await createScheduleApi(payload, role);
      if (payload.schedule_date) setSelectedDate(payload.schedule_date);
      showToast("✓ Đã mở ca lịch mới và gửi thông báo tới học viên.");
    }
    await loadSchedules(true);
  };

  const handleToggleLockSchedule = async (sch: AcademicScheduleItem) => {
    const nextLocked = !sch.is_locked;
    try {
      await updateScheduleApi(sch.id, { is_locked: nextLocked }, role);
      await loadSchedules(true);
      showToast(
        nextLocked
          ? `🔒 Đã khóa ca "${sch.title}" (không nhận thêm đăng ký).`
          : `🔓 Đã mở khóa ca "${sch.title}".`
      );
    } catch (err: any) {
      showToast(err?.message || "Không thể thay đổi trạng thái khóa ca lịch.");
    }
  };

  const handleDeleteSchedule = async (sch: AcademicScheduleItem) => {
    try {
      await deleteScheduleApi(sch.id, role);
      setConfirmDeleteId(null);
      await loadSchedules(true);
      showToast(`✓ Đã xóa ca lịch "${sch.title}".`);
    } catch (err: any) {
      showToast(err?.message || "Không thể xóa ca lịch.");
    }
  };

  const handleReviewBooking = async (
    bookingId: string,
    nextStatus: "confirmed" | "rejected" | "completed",
    reply?: string,
    switchToOnline = false
  ) => {
    const finalReply = (reply ?? replyDrafts[bookingId] ?? "").trim();
    try {
      await updateBookingStatusApi(
        bookingId,
        {
          status: nextStatus,
          instructor_reply: finalReply,
          switch_to_online: switchToOnline,
        },
        role
      );
      await loadSchedules(true);
      const label =
        nextStatus === "confirmed"
          ? switchToOnline
            ? "✓ Đã duyệt lịch hẹn & cấp link Google Meet!"
            : "✓ Đã chấp thuận lịch hẹn!"
          : nextStatus === "completed"
          ? "✓ Đã đánh dấu hoàn thành buổi tư vấn."
          : "✓ Đã từ chối lịch hẹn và hoàn trả chỗ trống.";
      showToast(label);
    } catch (err: any) {
      showToast(err?.message || "Không thể cập nhật trạng thái lịch hẹn.");
    }
  };

  const handleExportSchedulesCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "Mã Ca",
      "Ngày",
      "Giờ",
      "Phân loại",
      "Tiêu đề",
      "Phòng / Link",
      "Giảng viên",
      "Đồ án",
      "Sĩ số",
      "Khóa",
    ];
    const rows = searchedSchedules.map((s) => [
      s.id,
      s.schedule_date,
      `${formatScheduleHour(s.start_hour)} - ${formatScheduleHour(s.end_hour)}`,
      SCHEDULE_CATEGORY_META[s.category]?.label || s.category,
      s.title,
      s.room_or_link,
      s.instructor_name,
      s.project_name || s.course_code || "",
      `${s.current_booked}/${s.max_capacity}`,
      s.is_locked ? "Đã khóa" : "Đang mở",
    ]);
    const csv =
      "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `codemind-lich-hoc-vu-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✓ Đã xuất ${rows.length} ca lịch ra file CSV.`);
  };

  const headerConfig =
    role === "admin"
      ? {
          title: "Điều Phối Lịch Khảo Thí & Học Vụ",
          badge: "Quản trị viên / Khảo thí",
          badgeCls:
            "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/70",
          sub: "Quản lý toàn bộ ca thi, hội đồng phản biện, khóa sổ đăng ký theo phòng và giám sát yêu cầu cố vấn toàn khóa.",
        }
      : role === "instructor"
      ? {
          title: "Lịch Giảng Dạy & Hội Đồng Đồ Án",
          badge: "Góc nhìn Giảng viên",
          badgeCls:
            "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/70",
          sub: "Quản lý ca thi phòng Lab, hội đồng chấm bảo vệ AI, kéo chỉnh giờ linh hoạt và phê duyệt lịch hẹn 1-1.",
        }
      : {
          title: "Lịch Học Vụ & Cố Vấn Học Tập",
          badge: "Học viên thực hiện",
          badgeCls:
            "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/70",
          sub: "Theo dõi lịch thi định kỳ, hội đồng phản biện đồ án và đăng ký khung giờ cố vấn 1-1 với Giảng viên.",
        };

  const getLeftPct = (h: number) =>
    `${((Math.max(MIN_HOUR, Math.min(MAX_HOUR, h)) - MIN_HOUR) / TOTAL_HOURS) * 100}%`;
  const getWidthPct = (start: number, end: number) =>
    `${(Math.max(0.25, end - start) / TOTAL_HOURS) * 100}%`;

  const renderProjectQuickPills = (sch: AcademicScheduleItem) => {
    if (!sch.project_id) return null;
    const frozen = isProjectFrozen(sch.project_id);
    return (
      <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10.5px] font-mono font-bold">
          <FolderGit2 size={10} className="text-blue-600 dark:text-blue-400" />
          <span>{sch.project_code || sch.project_id}</span>
        </span>
        {frozen && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
            <Lock size={9} />
            <span>Đóng băng</span>
          </span>
        )}
        {onOpenProjectDetail && (
          <button
            type="button"
            onClick={() => onOpenProjectDetail(sch.project_id!)}
            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10.5px] font-bold transition cursor-pointer"
          >
            Dự án
          </button>
        )}
        {onOpenKanban && (
          <button
            type="button"
            onClick={() => onOpenKanban(sch.project_id!)}
            className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10.5px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
          >
            <FolderKanban size={10} />
            <span>Kanban</span>
          </button>
        )}
        {onOpenGitHub && (
          <button
            type="button"
            onClick={() => onOpenGitHub(sch.project_id!)}
            className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10.5px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
          >
            <GitFork size={10} />
            <span>Git Hub</span>
          </button>
        )}
      </div>
    );
  };

  // Void lockTick dependency warning
  void lockTick;

  return (
    <div
      ref={rotaRef}
      onPointerMove={handleStagePointerMove}
      onPointerUp={handleStagePointerUp}
      className="min-h-screen bg-transparent text-[#1E1D1B] dark:text-slate-100 p-4 sm:p-6 lg:p-8 font-sans select-none relative overflow-x-hidden transition-colors duration-200"
    >
      {/* ─── TOP HEADER ─── */}
      <div className="marlo-card flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <MarloTitle
              text={headerConfig.title}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E1D1B] dark:text-white font-sans"
            />
            <span
              className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${headerConfig.badgeCls}`}
            >
              {headerConfig.badge}
            </span>
          </div>
          <p className="text-sm text-[#62656b] dark:text-[#a0a3a9] mt-1 font-normal max-w-3xl leading-relaxed">
            {headerConfig.sub}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9B94] dark:text-slate-400"
            />
            <input
              type="text"
              placeholder={
                isStaff
                  ? "Tìm ca thi, phòng, môn học, sinh viên..."
                  : "Tìm môn học, phòng, giảng viên..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 py-2 bg-white dark:bg-slate-900 border border-[#EBE8E2] dark:border-slate-800 rounded-xl text-xs w-60 sm:w-64 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E5A023]/30 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => void loadSchedules()}
            title="Đồng bộ lại dữ liệu lịch từ máy chủ"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-[#EBE8E2] dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          </button>

          {role === "admin" && (
            <button
              type="button"
              onClick={handleExportSchedulesCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#EBE8E2] dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs shadow-2xs transition cursor-pointer"
            >
              <Download size={14} />
              <span>Xuất Lịch CSV</span>
            </button>
          )}

          {isStaff ? (
            <button
              type="button"
              onClick={() =>
                setRoomModalState({
                  isOpen: true,
                  mode: "create",
                  editing: null,
                  initialDate: selectedDate,
                })
              }
              className="btn-marlo-primary btn--primary magnetic flex items-center gap-1.5 shadow-md px-4 py-2 font-bold text-xs cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Mở Ca Thi / Hội Đồng</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openStudentBookingModal(undefined, selectedDate)}
              className="btn-marlo-primary btn--primary magnetic flex items-center gap-1.5 shadow-md px-4 py-2 font-bold text-xs cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Đặt Lịch Cố Vấn 1-1</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── SUB-NAV TABS (NO CLIPPING AT 871px) ─── */}
      <nav
        ref={tabsNavRef}
        className="tabs notranslate overflow-x-auto whitespace-nowrap"
        translate="no"
        aria-label="Phân mục Lịch"
      >
        <button
          type="button"
          aria-current={activeTab === "week" ? "page" : undefined}
          onClick={() => switchTab("week")}
          className="shrink-0"
        >
          Lịch Ngày
        </button>
        <button
          type="button"
          aria-current={activeTab === "agenda" ? "page" : undefined}
          onClick={() => switchTab("agenda")}
          className="shrink-0"
        >
          Lịch 7 Ngày
        </button>
        {isStaff && (
          <button
            type="button"
            aria-current={activeTab === "exams" ? "page" : undefined}
            onClick={() => switchTab("exams")}
            className="flex items-center gap-1.5 shrink-0"
          >
            <span>Ca Thi & Hội Đồng</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-[10px] font-bold">
              {examDefenseSchedules.length}
            </span>
          </button>
        )}
        <button
          type="button"
          aria-current={activeTab === "mentoring" ? "page" : undefined}
          onClick={() => switchTab("mentoring")}
          className="flex items-center gap-1.5 shrink-0"
        >
          <span>{isStaff ? "Yêu Cầu Cố Vấn" : "Lịch Cố Vấn Của Tôi"}</span>
          {(isStaff ? pendingQueueCount : studentActiveBookingsCount) > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
              {isStaff ? pendingQueueCount : studentActiveBookingsCount}
            </span>
          )}
        </button>
        <span ref={tabLineRef} className="tabs__line" />
      </nav>

      {/* ─── MAIN STAGE ─── */}
      <div ref={stageRef} className="w-full">
        {displayedTab === "exams" && isStaff ? (
          /* ─── TAB 3: CA THI & HỘI ĐỒNG (DYNAMIC KPI + FULL CRUD) ─── */
          <div className="w-full space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  Tổng ca thi & hội đồng
                </span>
                <b className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                  {examDefenseSchedules.length} ca lịch
                </b>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
                  {examDefenseSchedules.filter((s) => s.category === "exam").length} ca thi ·{" "}
                  {examDefenseSchedules.filter((s) => s.category === "defense").length} hội đồng
                </span>
              </div>

              <div className="card p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  Đang diễn ra lúc {nowClockStr}
                </span>
                <b className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-2">
                  {liveExamCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  )}
                  {liveExamCount} ca trực tiếp
                </b>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                  {formatVietnameseDate(todayStr, false)}
                </span>
              </div>

              <div className="card p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  Tình trạng nhận đăng ký
                </span>
                <b className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                  {examDefenseSchedules.length - lockedExamCount} ca đang mở
                </b>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                  {lockedExamCount} ca đã khóa danh sách
                </span>
              </div>

              <div className="card p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                  Phòng tổ chức thực tế
                </span>
                <b className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                  {uniqueExamRooms.length} phòng
                </b>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block truncate">
                  {uniqueExamRooms.slice(0, 2).join(", ") || "Chưa xếp phòng"}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center flex-wrap gap-2.5">
                <MarloSegmentedControl
                  value={examCatFilter}
                  options={[
                    { id: "all", label: "Tất cả" },
                    { id: "exam", label: "Ca thi" },
                    { id: "defense", label: "Hội đồng bảo vệ" },
                  ]}
                  onChange={(v) => setExamCatFilter(v as any)}
                  tone="dark"
                />

                <select
                  value={selectedRoomFilter}
                  onChange={(e) => setSelectedRoomFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="all">Tất cả phòng ({uniqueExamRooms.length})</option>
                  {uniqueExamRooms.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRoomModalState({
                    isOpen: true,
                    mode: "create",
                    editing: null,
                    initialDate: selectedDate,
                    initialCategory: "exam",
                  })
                }
                className="btn-marlo-primary btn--primary text-xs px-4 py-2 font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Book Phòng Thi Mới</span>
              </button>
            </div>

            <div className="space-y-3">
              {filteredExamSchedules.length === 0 ? (
                <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                  Không có ca thi hoặc hội đồng nào khớp bộ lọc hiện tại.
                </div>
              ) : (
                filteredExamSchedules.map((sch) => {
                  const isLive =
                    sch.schedule_date === todayStr &&
                    sch.start_hour <= nowHour &&
                    nowHour < sch.end_hour;
                  const isLocked = Boolean(sch.is_locked);
                  const catMeta =
                    SCHEDULE_CATEGORY_META[sch.category] || SCHEDULE_CATEGORY_META.exam;

                  return (
                    <div
                      key={sch.id}
                      className={`card p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all ${
                        isLive
                          ? "border-emerald-500/80 ring-1 ring-emerald-500/20 shadow-md"
                          : "border-slate-200/80 dark:border-slate-800 shadow-xs"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="text-center min-w-[92px] py-2 px-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl flex-none">
                            <b className="text-sm font-bold font-mono block text-slate-900 dark:text-white">
                              {formatScheduleHour(sch.start_hour)} –{" "}
                              {formatScheduleHour(sch.end_hour)}
                            </b>
                            <small className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">
                              {sch.schedule_date.split("-").reverse().slice(0, 2).join("/")} ·{" "}
                              {formatScheduleDuration(sch.start_hour, sch.end_hour)}
                            </small>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${catMeta.badgeCls}`}
                              >
                                {catMeta.label}
                              </span>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {sch.room_or_link}
                              </span>
                              {isLocked && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                  <Lock size={10} />
                                  <span>Đã khóa</span>
                                </span>
                              )}
                              {isLive && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Đang diễn ra</span>
                                </span>
                              )}
                            </div>
                            <h3
                              onClick={() => setDrawerScheduleId(sch.id)}
                              className="text-base font-bold text-slate-900 dark:text-white hover:text-[#EE8420] cursor-pointer transition-colors"
                            >
                              {sch.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Phụ trách: <b className="text-slate-700 dark:text-slate-200">{sch.instructor_name}</b> · Đã đăng ký:{" "}
                              <b className="font-mono text-slate-800 dark:text-white">
                                {sch.current_booked}/{sch.max_capacity}
                              </b>
                            </p>
                            {renderProjectQuickPills(sch)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                          {onNavigate && (
                            <button
                              type="button"
                              onClick={() => onNavigate("defense-room")}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                            >
                              <span>Vào chấm thi</span>
                              <ExternalLink size={12} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void handleToggleLockSchedule(sch)}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            {isLocked ? <Unlock size={12} /> : <Lock size={12} />}
                            <span>{isLocked ? "Mở khóa" : "Khóa"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setRoomModalState({
                                isOpen: true,
                                mode: "edit",
                                editing: sch,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            <Pencil size={12} />
                            <span>Sửa / Đổi phòng</span>
                          </button>

                          {confirmDeleteId === sch.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleDeleteSchedule(sch)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                              >
                                Xác nhận xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                              >
                                Thôi
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(sch.id)}
                              className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Xóa ca lịch này"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : displayedTab === "mentoring" ? (
          /* ─── TAB 4: STUDENT MY BOOKINGS VS STAFF BOOKINGS QUEUE ─── */
          isStaff ? (
            <div className="w-full space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <b className="text-sm font-bold text-amber-900 dark:text-amber-200 block">
                    Danh Sách Đăng Ký & Yêu Cầu Cố Vấn 1-1 Toàn Khóa
                  </b>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                    Phê duyệt, chuyển sang phòng Meet trực tuyến, từ chối hoàn chỗ hoặc đánh dấu hoàn thành trực tiếp vào MySQL.
                  </p>
                </div>

                <MarloSegmentedControl
                  value={bookingStatusFilter}
                  options={[
                    { id: "all", label: "Tất cả" },
                    { id: "pending", label: "Chờ duyệt", badge: pendingQueueCount },
                    { id: "confirmed", label: "Đã duyệt" },
                    { id: "rejected", label: "Từ chối" },
                    { id: "completed", label: "Hoàn thành" },
                  ]}
                  onChange={(v) => setBookingStatusFilter(v as any)}
                  tone="dark"
                />
              </div>

              <div className="space-y-3">
                {staffBookingsQueue.length === 0 ? (
                  <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                    Không có yêu cầu đăng ký lịch hẹn nào ở trạng thái này.
                  </div>
                ) : (
                  staffBookingsQueue.map(({ schedule: sch, booking: bk }) => {
                    const chip = getBookingStatusChip(bk.booking_status);
                    const repoLink = safeHttpUrl(bk.repo_or_doc_url);
                    return (
                      <div
                        key={bk.id}
                        className="card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 font-bold flex items-center justify-center text-xs shrink-0">
                              {getNameInitials(bk.student_name)}
                            </div>
                            <div className="min-w-0">
                              <b className="text-sm font-bold text-slate-900 dark:text-white block">
                                {bk.student_name}
                              </b>
                              <small className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                                Ca: {sch.title} · {formatVietnameseDate(sch.schedule_date, false)} (
                                {formatScheduleHour(sch.start_hour)} –{" "}
                                {formatScheduleHour(sch.end_hour)})
                              </small>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${chip.cls}`}>
                              {chip.label}
                            </span>
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                              {sch.room_or_link}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 text-xs space-y-1.5">
                          <div>
                            <b className="text-amber-700 dark:text-amber-400">Chủ đề trao đổi:</b>{" "}
                            <span className="text-slate-800 dark:text-slate-100 font-medium">
                              {bk.topic}
                            </span>
                          </div>
                          {bk.student_note && (
                            <div className="text-slate-600 dark:text-slate-300">
                              <b>Ghi chú SV:</b> {bk.student_note}
                            </div>
                          )}
                          {repoLink && (
                            <div>
                              <a
                                href={repoLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-mono break-all"
                              >
                                <GitFork size={12} />
                                <span>{repoLink}</span>
                                <ExternalLink size={11} />
                              </a>
                            </div>
                          )}
                          {bk.instructor_reply && (
                            <div className="text-emerald-700 dark:text-emerald-300 pt-1">
                              <b>Phản hồi đã gửi:</b> {bk.instructor_reply}
                            </div>
                          )}
                          {renderProjectQuickPills(sch)}
                        </div>

                        {bk.booking_status !== "completed" && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={replyDrafts[bk.id] ?? bk.instructor_reply ?? ""}
                              onChange={(e) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [bk.id]: e.target.value,
                                }))
                              }
                              placeholder="Nhập lời nhắn phản hồi cho học viên (tùy chọn)..."
                              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#f29b23]"
                            />
                            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                              {bk.booking_status !== "confirmed" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleReviewBooking(bk.id, "confirmed")
                                  }
                                  className="px-3.5 py-2 rounded-xl bg-[#f29b23] hover:bg-[#ee8420] text-slate-950 text-xs font-bold cursor-pointer transition"
                                >
                                  Duyệt lịch
                                </button>
                              )}
                              {bk.booking_status === "pending" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleReviewBooking(
                                      bk.id,
                                      "confirmed",
                                      undefined,
                                      true
                                    )
                                  }
                                  className="px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition"
                                >
                                  <Video size={12} />
                                  <span>Duyệt & Meet</span>
                                </button>
                              )}
                              {bk.booking_status === "confirmed" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleReviewBooking(bk.id, "completed")
                                  }
                                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition"
                                >
                                  Hoàn thành
                                </button>
                              )}
                              {bk.booking_status !== "rejected" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleReviewBooking(
                                      bk.id,
                                      "rejected",
                                      (replyDrafts[bk.id] || "").trim() ||
                                        "Vui lòng đăng ký khung giờ khác phù hợp hơn."
                                    )
                                  }
                                  className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold cursor-pointer transition"
                                >
                                  Từ chối
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="w-full space-y-6">
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl">
                <b className="text-sm font-bold text-slate-900 dark:text-white block">
                  Lịch Đăng Ký & Cố Vấn 1-1 Của Bạn ({myStudentBookedSchedules.length})
                </b>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chỉ hiển thị các ca thi, hội đồng và lịch hẹn cố vấn do chính tài khoản của bạn đăng ký trong hệ thống.
                </p>
              </div>

              {myStudentBookedSchedules.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    Bạn chưa đăng ký ca lịch hoặc buổi cố vấn 1-1 nào
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chọn một khung giờ trống ở danh sách bên dưới hoặc nhấn nút "Đặt Lịch Cố Vấn 1-1" ở góc trên để đặt lịch.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myStudentBookedSchedules.map((sch) => {
                    const bk = sch.my_booking!;
                    const chip = getBookingStatusChip(bk.booking_status);
                    const repoLink = safeHttpUrl(bk.repo_or_doc_url);
                    return (
                      <div
                        key={bk.id}
                        className="card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${chip.cls}`}
                              >
                                {chip.label}
                              </span>
                              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                {formatVietnameseDate(sch.schedule_date, false)} ·{" "}
                                {formatScheduleHour(sch.start_hour)} –{" "}
                                {formatScheduleHour(sch.end_hour)}
                              </span>
                            </div>
                            <b
                              onClick={() => setDrawerScheduleId(sch.id)}
                              className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#EE8420] cursor-pointer block"
                            >
                              {sch.title}
                            </b>
                            <small className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                              {sch.instructor_name} · {sch.room_or_link}
                            </small>
                          </div>

                          {bk.booking_status !== "completed" &&
                            bk.booking_status !== "rejected" && (
                              <button
                                type="button"
                                onClick={() => void handleCancelStudentBooking(bk.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold cursor-pointer self-start sm:self-center"
                              >
                                <Trash2 size={13} />
                                <span>Hủy đăng ký</span>
                              </button>
                            )}
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1.5">
                          <div>
                            <b className="text-amber-700 dark:text-amber-400">Nội dung đăng ký:</b>{" "}
                            <span className="text-slate-800 dark:text-slate-100">{bk.topic}</span>
                          </div>
                          {bk.student_note && (
                            <div className="text-slate-600 dark:text-slate-300">
                              <b>Ghi chú:</b> {bk.student_note}
                            </div>
                          )}
                          {repoLink && (
                            <a
                              href={repoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-mono break-all"
                            >
                              <GitFork size={12} />
                              <span>{repoLink}</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                          {bk.instructor_reply && (
                            <div className="p-2.5 mt-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200">
                              <b>Phản hồi của Giảng viên:</b> {bk.instructor_reply}
                            </div>
                          )}
                          {renderProjectQuickPills(sch)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Open Slots Ready to Book */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Khung giờ & Ca lịch đang mở chỗ ({openStudentBookableSlots.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {openStudentBookableSlots.map((slot) => {
                    const catMeta =
                      SCHEDULE_CATEGORY_META[slot.category] ||
                      SCHEDULE_CATEGORY_META.office_hours;
                    const remain = Math.max(
                      0,
                      (slot.max_capacity || 1) - (slot.current_booked || 0)
                    );
                    return (
                      <div
                        key={slot.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catMeta.badgeCls}`}
                            >
                              {catMeta.label}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              Còn {remain}/{slot.max_capacity} chỗ
                            </span>
                          </div>
                          <b className="text-xs font-bold text-slate-900 dark:text-white block">
                            {slot.title}
                          </b>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {formatVietnameseDate(slot.schedule_date, false)} ·{" "}
                            {formatScheduleHour(slot.start_hour)} –{" "}
                            {formatScheduleHour(slot.end_hour)} · {slot.room_or_link}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                            {slot.instructor_name}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openStudentBookingModal(slot)}
                          className="w-full py-2.5 rounded-xl bg-[#141619] dark:bg-white text-white dark:text-[#141619] hover:opacity-90 text-xs font-bold cursor-pointer transition shadow-2xs"
                        >
                          Đăng ký ca này
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )
        ) : displayedTab === "agenda" ? (
          /* ─── TAB 2: REAL 7-DAY AGENDA ─── */
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-slate-600 dark:text-slate-400">
              <span>
                Hiển thị lịch thực tế 7 ngày liên tiếp từ{" "}
                <b className="text-slate-900 dark:text-white">
                  {formatVietnameseDate(selectedDate, false)}
                </b>
              </span>
              {selectedDate !== todayStr && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold cursor-pointer"
                >
                  Về hôm nay ({todayStr.split("-").reverse().slice(0, 2).join("/")})
                </button>
              )}
            </div>

            <MarloAgendaView
              days={agendaDays}
              role={role}
              onSelectBooking={(b) => {
                if (b.schedule) setDrawerScheduleId(b.schedule.id);
              }}
              onAddBooking={(_dayId, dStr) => {
                if (isStaff) {
                  setRoomModalState({
                    isOpen: true,
                    mode: "create",
                    editing: null,
                    initialDate: dStr || selectedDate,
                  });
                } else {
                  openStudentBookingModal(undefined, dStr);
                }
              }}
            />
          </div>
        ) : (
          /* ─── TAB 1: INTERACTIVE DAILY TIMELINE (LỊCH NGÀY) ─── */
          <div className="w-full space-y-4">
            {/* Date Navigator & Quick Date Chips */}
            <div className="marlo-card flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 bg-white dark:bg-slate-900/90 border border-[#EBE8E2] dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedDate(addDaysToDateStr(selectedDate, -1))}
                  aria-label="Ngày trước"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <ChevronLeft size={15} />
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
                  <Calendar size={14} className="text-[#EE8420]" />
                  <span>{formatVietnameseDate(selectedDate)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(addDaysToDateStr(selectedDate, 1))}
                  aria-label="Ngày sau"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <ChevronRight size={15} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  aria-label="Chọn ngày xem lịch"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none"
                />
                {selectedDate !== todayStr && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs font-bold cursor-pointer"
                  >
                    Hôm nay
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {availableDateChips.slice(0, 5).map((chip) => {
                  const active = chip.date === selectedDate;
                  const shortD = chip.date.split("-").reverse().slice(0, 2).join("/");
                  return (
                    <button
                      key={chip.date}
                      type="button"
                      onClick={() => setSelectedDate(chip.date)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                        active
                          ? "bg-[#EE8420] text-slate-950 shadow-2xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {chip.date === todayStr ? `Hôm nay (${shortD})` : shortD} · {chip.count}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Summary & Filter Pills */}
            <div className="marlo-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center flex-wrap gap-2 text-xs text-[#62656b] dark:text-[#a0a3a9]">
                <span className="flex items-center gap-1.5 font-bold text-[#1E1D1B] dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                  {dailySchedules.length} ca lịch trong ngày
                </span>
                <span>•</span>
                <span>
                  {isStaff
                    ? "Bấm thanh lịch để xem chi tiết / duyệt; kéo thanh chưa khóa để dời giờ"
                    : "Bấm vào thanh ca lịch để xem phòng, dự án liên kết và đăng ký"}
                </span>
              </div>

              <MarloSegmentedControl
                value={timelineFilter}
                options={[
                  { id: "all", label: "Tất cả" },
                  { id: "exam_defense", label: "Khảo thí & Bảo vệ" },
                  { id: "office_hours", label: "Cố vấn 1-1" },
                  { id: "lab_review", label: "Lab & Review" },
                ]}
                onChange={(val) => setTimelineFilter(val as any)}
                tone="dark"
              />
            </div>

            {/* Main Timeline Table */}
            <div className="marlo-card bg-white dark:bg-slate-900/90 rounded-xl border border-[#EBE8E2] dark:border-slate-800 p-5 shadow-xs">
              <div className="overflow-x-auto pt-4">
                <div className="min-w-[840px]">
                  {/* Table Header: Hours */}
                  <div className="grid grid-cols-12 gap-0 text-center border-b border-[#EBE8E2] dark:border-slate-800 pb-2.5 text-xs font-semibold text-[#9E9B94] dark:text-slate-400 relative">
                    <div className="col-span-3 text-left pl-3 text-[#62656b] dark:text-[#a0a3a9] font-bold uppercase tracking-wider text-[11px]">
                      Nhóm Ca Lịch & Phụ Trách
                    </div>

                    <div ref={timelineTrackRef} className="col-span-9 grid grid-cols-12 gap-0 relative">
                      {TIMELINE_HOURS.map((h) => (
                        <div key={h} className="text-center font-mono text-xs text-[#9E9B94] dark:text-slate-400">
                          {h < 10 ? `0${h}` : h}
                        </div>
                      ))}

                      {/* Clock beacon positioned ABOVE ruler so it never obscures hours */}
                      {selectedDate === todayStr &&
                        nowHour >= MIN_HOUR &&
                        nowHour <= MAX_HOUR && (
                          <div
                            className="absolute -top-5 z-30 pointer-events-none -translate-x-1/2"
                            style={{ left: getLeftPct(nowHour) }}
                          >
                            <div className="flex items-center gap-1 bg-gradient-to-r from-[#F8BD57] to-[#EE8420] text-[#1C1304] text-[10px] font-mono px-2 py-0.5 rounded-full shadow-sm font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1C1304]" />
                              <span>{nowClockStr}</span>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Tracks & Schedule Bars */}
                  <div className="divide-y divide-[#F2EFE9] dark:divide-slate-800/80 relative mt-2.5">
                    {selectedDate === todayStr &&
                      nowHour >= MIN_HOUR &&
                      nowHour <= MAX_HOUR && (
                        <div
                          className="absolute top-0 bottom-0 w-[2px] bg-[#EE8420] z-20 pointer-events-none opacity-80"
                          style={{
                            left: `calc(25% + (75% * ${(nowHour - MIN_HOUR) / TOTAL_HOURS}))`,
                          }}
                        />
                      )}

                    {timelineGroups.map((group) => {
                      const isExpanded = expandedGroups[group.id] ?? true;

                      return (
                        <div key={group.id} className="py-2.5">
                          <div
                            onClick={() =>
                              setExpandedGroups((prev) => ({
                                ...prev,
                                [group.id]: !isExpanded,
                              }))
                            }
                            className="grid grid-cols-12 gap-0 items-center py-2 px-3 bg-[#FAF9F6] dark:bg-slate-800/80 rounded-xl hover:bg-[#F4F2ED] dark:hover:bg-slate-700/80 transition-colors cursor-pointer mb-2.5 border border-[#EBE8E2]/70 dark:border-slate-700/60"
                          >
                            <div className="col-span-3 flex items-center gap-2 pr-2">
                              <ChevronDown
                                size={14}
                                className={`text-[#62656b] dark:text-[#a0a3a9] transition-transform duration-200 ${
                                  isExpanded ? "rotate-0" : "-rotate-90"
                                }`}
                              />
                              <span className={`w-2 h-2 rounded-full ${group.badgeColor} shrink-0`} />
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-[#1E1D1B] dark:text-slate-100 block truncate">
                                  {group.name} ({group.items.length})
                                </span>
                                <span className="text-[10px] text-[#62656b] dark:text-[#a0a3a9] block truncate">
                                  {group.subtitle}
                                </span>
                              </div>
                            </div>

                            {/* Live booked/capacity chips by hour */}
                            <div className="col-span-9 grid grid-cols-12 gap-1 text-[10px]">
                              {TIMELINE_HOURS.map((h) => {
                                const overlapping = group.items.filter(
                                  (it) => it.start_hour < h + 1 && it.end_hour > h
                                );
                                const totalMax = overlapping.reduce(
                                  (acc, it) => acc + (it.max_capacity || 0),
                                  0
                                );
                                const totalBooked = overlapping.reduce(
                                  (acc, it) => acc + (it.current_booked || 0),
                                  0
                                );
                                if (overlapping.length === 0) {
                                  return (
                                    <div
                                      key={h}
                                      className="py-0.5 text-center font-mono rounded-md text-slate-400 dark:text-slate-600 bg-slate-100/60 dark:bg-slate-900/40"
                                    >
                                      —
                                    </div>
                                  );
                                }
                                const isFullHour = totalBooked >= totalMax;
                                return (
                                  <div
                                    key={h}
                                    title={`Khung ${h}:00 · ${totalBooked}/${totalMax} chỗ đã đặt`}
                                    className={`py-0.5 text-center font-mono rounded-md font-semibold ${
                                      isFullHour
                                        ? "bg-[#FCE8E6] text-[#8C2C23] border border-[#F8D2CD] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60"
                                        : "bg-[#E5F4E9] text-[#226337] border border-[#CEEAD4] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60"
                                    }`}
                                  >
                                    {totalBooked}/{totalMax}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="space-y-2 pl-2 pr-1">
                              {group.items.length === 0 ? (
                                <div className="py-3 px-4 rounded-lg bg-slate-50/70 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                  <span>Chưa có ca lịch nào trong nhóm này vào ngày {selectedDate.split("-").reverse().join("/")}.</span>
                                  {isStaff && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRoomModalState({
                                          isOpen: true,
                                          mode: "create",
                                          editing: null,
                                          initialDate: selectedDate,
                                          initialCategory:
                                            group.id === "office_hours"
                                              ? "office_hours"
                                              : group.id === "lab_review"
                                              ? "lab"
                                              : "exam",
                                        })
                                      }
                                      className="text-xs font-bold text-[#EE8420] hover:underline cursor-pointer"
                                    >
                                      + Mở ca mới
                                    </button>
                                  )}
                                </div>
                              ) : (
                                group.items.map((sch) => {
                                  const isDraggingThis = dragging?.itemId === sch.id;
                                  const activeStart = isDraggingThis
                                    ? dragging.currentStart
                                    : sch.start_hour;
                                  const activeEnd = isDraggingThis
                                    ? dragging.currentEnd
                                    : sch.end_hour;
                                  const isLocked = Boolean(sch.is_locked);
                                  const myStatus =
                                    role === "student" ? sch.my_booking?.booking_status : undefined;

                                  return (
                                    <div
                                      key={sch.id}
                                      className="grid grid-cols-12 gap-0 items-center py-1 group/row"
                                    >
                                      <div className="col-span-3 flex items-center gap-2.5 pr-3 min-w-0">
                                        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-[11px] font-bold shrink-0">
                                          {getNameInitials(sch.instructor_name)}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-[#1E1D1B] dark:text-slate-100 truncate">
                                            {sch.instructor_name}
                                          </p>
                                          <p className="text-[11px] text-[#7A7873] dark:text-slate-400 truncate">
                                            {sch.room_or_link}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="col-span-9 h-12 relative rounded-lg bg-[#FAF9F6]/50 dark:bg-slate-900/50 border border-dashed border-[#EBE8E2] dark:border-slate-800">
                                        <div
                                          style={{
                                            left: getLeftPct(activeStart),
                                            width: getWidthPct(activeStart, activeEnd),
                                          }}
                                          onClick={() => {
                                            if (didDragMoveRef.current) {
                                              didDragMoveRef.current = false;
                                              return;
                                            }
                                            setDrawerScheduleId(sch.id);
                                          }}
                                          onPointerDown={(e) => handleBarPointerDown(e, sch, "move")}
                                          className={`absolute top-0.5 bottom-0.5 rounded-xl px-3 flex items-center justify-between text-xs transition-all touch-none group/bar ${
                                            isDraggingThis
                                              ? "z-40 shadow-2xl ring-2 ring-[#EE8420] cursor-grabbing"
                                              : isStaff && !isLocked
                                              ? "cursor-grab hover:shadow-md hover:z-20"
                                              : "cursor-pointer hover:shadow-md hover:z-20"
                                          } ${getCategoryBarStyle(sch.category, isLocked)}`}
                                        >
                                          {/* Resize left handle */}
                                          {isStaff && !isLocked && (
                                            <div
                                              onPointerDown={(e) =>
                                                handleBarPointerDown(e, sch, "resize-left")
                                              }
                                              className="absolute -left-1 top-0 bottom-0 w-2.5 cursor-ew-resize z-30"
                                              title="Kéo chỉnh giờ bắt đầu"
                                            />
                                          )}

                                          <div className="flex flex-col justify-center min-w-0 pr-2 pointer-events-none">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-bold text-[10.5px] font-mono leading-none">
                                                {formatScheduleHour(activeStart)} –{" "}
                                                {formatScheduleHour(activeEnd)}
                                              </span>
                                              <span className="text-[10px] font-mono opacity-80">
                                                ({sch.current_booked}/{sch.max_capacity})
                                              </span>
                                              {isLocked && <Lock size={10} className="text-rose-600 dark:text-rose-400" />}
                                              {myStatus && (
                                                <span className="px-1.5 py-0.2 rounded bg-white/80 dark:bg-black/40 text-[9.5px] font-bold">
                                                  {getBookingStatusChip(myStatus).label}
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-[11px] font-semibold truncate leading-tight mt-0.5">
                                              {sch.title}
                                            </span>
                                          </div>

                                          {isStaff && !isLocked && (
                                            <div
                                              onPointerDown={(e) =>
                                                handleBarPointerDown(e, sch, "resize-right")
                                              }
                                              className="absolute -right-1 top-0 bottom-0 w-2.5 cursor-ew-resize z-30"
                                              title="Kéo chỉnh giờ kết thúc"
                                            />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Tip Card (Fixed Light + Dark Contrast) */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-[#EBE8E2] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FDF6E8] dark:bg-amber-950/60 text-[#E5A023] flex items-center justify-center font-bold border border-[#F5E6CC] dark:border-amber-800/70 shrink-0">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1E1D1B] dark:text-slate-100">
                    {isStaff
                      ? "Điều phối Khảo thí, Chống trùng phòng & Duyệt lịch 1-1"
                      : "Quy định Tham gia Ca thi & Đặt lịch Cố vấn 1-on-1"}
                  </h4>
                  <p className="text-[11px] text-[#7A7873] dark:text-slate-400 mt-0.5">
                    {isStaff
                      ? "Mọi thay đổi giờ, khóa ca hoặc duyệt sinh viên được lưu trực tiếp vào MySQL và kiểm tra trùng phòng theo thời gian thực."
                      : "Bấm trực tiếp vào từng thanh ca lịch để xem chi tiết phòng, đồ án liên kết hoặc đăng ký/hủy lịch hẹn cá nhân."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── UNIFIED SESSION INSPECTOR DRAWER ─── */}
      <MarloSessionDrawer
        schedule={drawerSchedule}
        isOpen={!!drawerSchedule}
        role={role}
        isFrozen={
          drawerSchedule?.project_id ? isProjectFrozen(drawerSchedule.project_id) : false
        }
        onClose={() => setDrawerScheduleId(null)}
        onBookForStudent={(sch) => {
          setDrawerScheduleId(null);
          openStudentBookingModal(sch);
        }}
        onCancelStudentBooking={handleCancelStudentBooking}
        onEditSchedule={(sch) =>
          setRoomModalState({ isOpen: true, mode: "edit", editing: sch })
        }
        onToggleLock={handleToggleLockSchedule}
        onDeleteSchedule={handleDeleteSchedule}
        onReviewBooking={(bId, st, rep, online) =>
          handleReviewBooking(bId, st, rep, online)
        }
        onOpenProjectDetail={onOpenProjectDetail}
        onOpenKanban={onOpenKanban}
        onOpenGitHub={onOpenGitHub}
        onOpenDefenseRoom={() => onNavigate?.("defense-room")}
      />

      {/* ─── STUDENT BOOKING MODAL (PORTALED + DARK MODE FIXED) ─── */}
      {studentModalOpen &&
        createPortal(
          <div
            onClick={() => setStudentModalOpen(false)}
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs marlo-scrim"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Đặt lịch hẹn cố vấn 1-on-1"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white dark:bg-[#181922] text-slate-900 dark:text-slate-100 rounded-[24px] border border-[#EBE8E2] dark:border-slate-800 p-6 shadow-2xl space-y-4 overflow-hidden marlo-modal"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Đăng Ký Ca Lịch & Đặt Hẹn Cố Vấn 1-on-1
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hệ thống tự động kiểm tra sĩ số, trạng thái khóa và trùng lịch cá nhân
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  aria-label="Đóng"
                  className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitStudentBooking} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                    Chọn ca lịch / khung giờ Giảng viên đang mở:
                  </label>
                  <select
                    value={bookingScheduleId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setBookingScheduleId(nextId);
                      setBookingError(null);
                      const found = openStudentBookableSlots.find(
                        (s) => s.id === nextId
                      );
                      if (found?.project_id) {
                        setBookingProjectId(found.project_id);
                        const mp = projects.find((p) => p.id === found.project_id);
                        if (mp?.repo_url) setBookingRepoUrl(mp.repo_url);
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E5A023]/30"
                  >
                    {openStudentBookableSlots.length === 0 ? (
                      <option value="">Hiện không có ca nào mở đăng ký</option>
                    ) : (
                      openStudentBookableSlots.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          [{SCHEDULE_CATEGORY_META[slot.category]?.label || slot.category}]{" "}
                          {slot.schedule_date.split("-").reverse().slice(0, 2).join("/")} (
                          {formatScheduleHour(slot.start_hour)}–
                          {formatScheduleHour(slot.end_hour)}) · {slot.instructor_name} · Còn{" "}
                          {Math.max(0, slot.max_capacity - slot.current_booked)} chỗ —{" "}
                          {slot.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                    Gắn Đồ án & Link GitHub đính kèm (tùy chọn):
                  </label>
                  <select
                    value={bookingProjectId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setBookingProjectId(pid);
                      const found = projects.find((p) => p.id === pid);
                      setBookingRepoUrl(found?.repo_url || "");
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E5A023]/30 mb-2"
                  >
                    <option value="">Không gắn đồ án cụ thể</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} · {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="url"
                    value={bookingRepoUrl}
                    onChange={(e) => setBookingRepoUrl(e.target.value)}
                    placeholder="https://github.com/nhom-ban/ten-repo (tự điền khi chọn đồ án)"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E5A023]/30"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                    Chủ đề / Nội dung cần trao đổi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bookingTopic}
                    onChange={(e) => {
                      setBookingTopic(e.target.value);
                      setBookingError(null);
                    }}
                    placeholder="VD: Nhờ thầy review PR #TE14F82 và tối ưu truy vấn MySQL"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E5A023]/30"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                    Ghi chú thêm cho Giảng viên:
                  </label>
                  <textarea
                    rows={2}
                    value={bookingNote}
                    onChange={(e) => setBookingNote(e.target.value)}
                    placeholder="Mô tả ngắn lỗi đang gặp hoặc yêu cầu chuẩn bị trước..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E5A023]/30 resize-none"
                  />
                </div>

                {bookingError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                    {bookingError}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setStudentModalOpen(false)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={!bookingScheduleId || isBookingSubmitting}
                    className="px-5 py-2 bg-[#E5A023] hover:bg-[#D49118] text-slate-950 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isBookingSubmitting ? "Đang gửi..." : "Xác nhận Đăng Ký"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ─── STAFF BOOK / EDIT ROOM MODAL ─── */}
      <MarloBookRoomModal
        isOpen={roomModalState.isOpen}
        mode={roomModalState.mode}
        editingSchedule={roomModalState.editing}
        existingSchedules={schedules}
        projects={projects}
        courses={courses}
        instructors={instructors}
        role={role}
        initialDate={roomModalState.initialDate}
        initialCategory={roomModalState.initialCategory}
        onClose={() =>
          setRoomModalState((prev) => ({ ...prev, isOpen: false, editing: null }))
        }
        onSubmit={handleSaveRoomModal}
      />

      {/* ─── FLOATING TOAST WITH UNDO ─── */}
      {toastMessage && (
        <MarloToast
          message={toastMessage}
          onUndo={
            undoAction
              ? () => {
                  undoAction();
                  setToastMessage(null);
                }
              : undefined
          }
          showUndo={!!undoAction}
        />
      )}
    </div>
  );
}
