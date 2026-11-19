import React, { useState, useEffect, useRef, useLayoutEffect } from "react";

import gsap from "gsap";

import type { Role } from "../App";

import { fetchSchedulesApi, bookScheduleApi } from "../api";

import MarloTitle from "../components/MarloTitle";

import MarloToast from "../components/MarloToast";

import MarloSegmentedControl from "../components/MarloSegmentedControl";

import MarloAgendaView, { AgendaBooking } from "../components/MarloAgendaView";

import MarloSessionDrawer from "../components/MarloSessionDrawer";
import MarloBookRoomModal from "../components/MarloBookRoomModal";
import {
  MarloRoomSession,
  StudentMentoringRequest,
  INITIAL_ROOM_SESSIONS,
  INITIAL_MENTORING_REQUESTS,
  SESSION_KIND_META,
  MARLO_ROOMS,
} from "../marlo-engine/marloSessions";
import { DoorOpen, MapPin, ExternalLink, CalendarPlus, RefreshCw } from "lucide-react";

import { useMarloPageEntrance, animateMarloCards, animateMarloRows, animateMarloPill } from "../utils/marloAnimations";

import {

  Calendar,

  Clock,

  CheckCircle2,

  AlertCircle,

  ChevronRight,

  ChevronDown,

  Search,

  Plus,

  Award,

  Sparkles,

  X,

  Radio,

  Check,

  Send,

  GraduationCap,

  FileText,

  UserCheck,

  MessageSquare,

  ArrowRight,

  SlidersHorizontal,

  Info,

  CalendarCheck2,

  Trash2,

} from "lucide-react";



// ── Animated Number Counter Component (Smooth GSAP / Easing Style) ─────────

function AnimatedNumber({

  value,

  duration = 1800,

  trigger = true,

  decimals = 0,

  suffix = "",

}: {

  value: number;

  duration?: number;

  trigger?: boolean;

  decimals?: number;

  suffix?: string;

}) {

  const [displayValue, setDisplayValue] = useState(0);



  useEffect(() => {

    if (!trigger) {

      setDisplayValue(0);

      return;

    }

    let startTime: number | null = null;

    let animId: number;



    const step = (time: number) => {

      if (!startTime) startTime = time;

      const progress = Math.min((time - startTime) / duration, 1);

      const ease = 1 - Math.pow(1 - progress, 4);

      const current = ease * value;

      setDisplayValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));

      if (progress < 1) {

        animId = requestAnimationFrame(step);

      }

    };



    setDisplayValue(0);

    animId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animId);

  }, [value, duration, trigger, decimals]);



  return <>{decimals > 0 ? displayValue.toFixed(decimals) : displayValue.toLocaleString()}{suffix}</>;

}



// --- TYPES ---

export type ScheduleTab = "week" | "exams" | "mentoring" | "agenda";



interface ScheduleItem {

  id: string;

  code: string;

  instructorOrSubject: string;

  avatar: string;

  roleOrType: "exam_test" | "exam_oral" | "mentor_1on1" | "open_slot" | "postponed";

  colorKind?: "grade" | "review" | "edit" | "mix" | "call";

  startHour: number; // 7.0 = 07:00

  endHour: number;   // 15.0 = 15:00

  pillTitle: string; // Short & clean for inside the pill, e.g. "Code C++ / OOP (CS201)"

  fullTitle: string; // Full title for drawer inspector

  location: string;

  instructorName: string;

  breakHour?: number;

  note?: string;

}



interface ScheduleCategory {

  id: string;

  name: string;

  badgeColor: string;

  locationHeader: string;

  capacityByHour: Record<number, { current: number; max: number }>;

  items: ScheduleItem[];

}



interface NotificationTask {

  id: string;

  title: string;

  subtitle: string;

  type: "confirm_exam" | "accept_meeting" | "submit_doc";

  badge?: string;

  dueText: string;

}



export interface EngineeringScheduleRotaProps {
  role?: Role;
  onNavigate?: (screen: any) => void;
  onRoleChange?: (role: Role) => void;
}



export default function EngineeringScheduleRota({ role = "student", onNavigate, onRoleChange }: EngineeringScheduleRotaProps) {

  const [activeTab, setActiveTab] = useState<ScheduleTab>(role === "instructor" ? "exams" : "week");
  const [displayedTab, setDisplayedTab] = useState<ScheduleTab>(role === "instructor" ? "exams" : "week");

  // Keep tab synced if role changes (students cannot access exams tab)
  useEffect(() => {
    if (role === "student" && (activeTab === "exams" || displayedTab === "exams")) {
      setActiveTab("week");
      setDisplayedTab("week");
    }
  }, [role, activeTab, displayedTab]);
  const [roomSessions, setRoomSessions] = useState<MarloRoomSession[]>(INITIAL_ROOM_SESSIONS);
  const [mentoringRequests, setMentoringRequests] = useState<StudentMentoringRequest[]>(INITIAL_MENTORING_REQUESTS);
  const [isBookRoomModalOpen, setIsBookRoomModalOpen] = useState(false);
  const [bookRoomInitialValues, setBookRoomInitialValues] = useState<any>(null);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>("all");

  const handleBookNewRoomSession = (newSession: MarloRoomSession) => {
    setRoomSessions((prev) => [newSession, ...prev]);
    if (newSession.kind === "mentor" && newSession.studentName) {
      setMentoringRequests((prev) =>
        prev.map((req) =>
          newSession.studentName?.includes(req.studentName) ? { ...req, status: "approved" } : req
        )
      );
    }
    showToast(`✓ Đã book thành công ${newSession.room} cho "${newSession.title}"!`);
  };

  const [selectedBooking, setSelectedBooking] = useState<AgendaBooking | null>(null);


  const [isTransitioning, setIsTransitioning] = useState(false);



  const tabsNavRef = useRef<HTMLElement>(null);

  const tabLineRef = useRef<HTMLSpanElement>(null);

  const stageRef = useRef<HTMLDivElement>(null);

  const isFirstTabRender = useRef(true);



  // ─── MARLO SLIDING UNDERLINE (tabs__line) ───

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

  }, [activeTab]);



  // Keep line aligned on resize / font load

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

    document.fonts?.ready.then(recompute);

    window.addEventListener("resize", recompute);

    return () => {

      ro.disconnect();

      window.removeEventListener("resize", recompute);

    };

  }, []);



  // ─── SWITCH TAB WITH AUTHENTIC MARLO VIEW TRANSITION ───

  const switchTab = (nextTab: ScheduleTab) => {

    if (nextTab === activeTab) return;

    setActiveTab(nextTab);

    setDisplayedTab(nextTab);

  };



  // ─── ENTER ANIMATION WHEN DISPLAYED TAB CHANGES ───

  useLayoutEffect(() => {

    const stage = stageRef.current;

    if (!stage) return;



    gsap.killTweensOf(stage);

    const dayCards = stage.querySelectorAll<HTMLElement>(".agenda__day");

    const rows = stage.querySelectorAll<HTMLElement>(".agenda__row");

    const cards = stage.querySelectorAll<HTMLElement>(".marlo-card");

    gsap.killTweensOf(dayCards);

    gsap.killTweensOf(rows);

    gsap.killTweensOf(cards);



    if (displayedTab === "agenda") {

      gsap.fromTo(

        stage,

        { opacity: 0, y: 10 },

        {

          opacity: 1,

          y: 0,

          duration: 0.35,

          ease: "power2.out",

          clearProps: "all",

        }

      );

      if (dayCards.length > 0) {

        animateMarloCards(dayCards, { y: 16, stagger: 0.035, duration: 0.5 });

      }

      if (rows.length > 0) {

        animateMarloRows(rows, { y: 8, stagger: 0.02, delay: 0.1 });

      }

    } else {

      gsap.fromTo(

        stage,

        { opacity: 0, y: 10 },

        {

          opacity: 1,

          y: 0,

          duration: 0.35,

          ease: "power2.out",

          clearProps: "all",

        }

      );

      if (cards.length > 0) {

        animateMarloCards(cards, { y: 16, stagger: 0.04, duration: 0.5 });

      }

    }

  }, [displayedTab]);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedFilter, setSelectedFilter] = useState<"all" | "exam" | "software" | "ai">("all");



  // Selected Item for Slide-Over Inspector Drawer (from Image 1 Reference)

  const [selectedDetailItem, setSelectedDetailItem] = useState<ScheduleItem | null>(null);

  const [isDetailDrawerClosing, setIsDetailDrawerClosing] = useState(false);



  const [showBookingModal, setShowBookingModal] = useState(false);

  const [isBookingModalClosing, setIsBookingModalClosing] = useState(false);



  // Smooth Drawer Close with Marlo Exit Slide Animation

  const handleCloseDetailDrawer = () => {

    if (isDetailDrawerClosing || !selectedDetailItem) return;

    setIsDetailDrawerClosing(true);

    setTimeout(() => {

      setSelectedDetailItem(null);

      setIsDetailDrawerClosing(false);

    }, 280);

  };



  // Smooth Modal Close with Marlo Exit Scale/Fade Animation

  const handleCloseBookingModal = () => {

    if (isBookingModalClosing || !showBookingModal) return;

    setIsBookingModalClosing(true);

    setTimeout(() => {

      setShowBookingModal(false);

      setIsBookingModalClosing(false);

    }, 220);

  };



  // Close with animations on ESC key

  useEffect(() => {

    const handleKeyDown = (e: KeyboardEvent) => {

      if (e.key === "Escape") {

        if (selectedDetailItem) {

          handleCloseDetailDrawer();

        } else if (showBookingModal) {

          handleCloseBookingModal();

        }

      }

    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [selectedDetailItem, showBookingModal, isDetailDrawerClosing, isBookingModalClosing]);



  // 🏷️ Marlo Confirmed Rubber Stamp State (from marlo.mp4)

  const [confirmedItemIds, setConfirmedItemIds] = useState<Record<string, boolean>>({

    "rot-3": false, // Initially unconfirmed

  });

  const [isStamping, setIsStamping] = useState(false);



  const handleTriggerPaidStamp = (itemId: string) => {

    setIsStamping(true);

    setTimeout(() => {

      setConfirmedItemIds((prev) => ({ ...prev, [itemId]: true }));

      setIsStamping(false);

      showToast(role === "student" ? "✓ Đã xác nhận tham gia ca thi / lịch hẹn thành công!" : "✓ Đã phê duyệt và đóng dấu xác nhận ca!");

    }, 460);

  };



  const handleResetPaidStamp = (itemId: string) => {

    setConfirmedItemIds((prev) => {

      const copy = { ...prev };

      delete copy[itemId];

      return copy;

    });

    showToast("Đã hoàn tác xác nhận ca");

  };



  // Floating Undo Toast State

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [undoAction, setUndoAction] = useState<(() => void) | null>(null);



  // Modal Đặt Lịch Hẹn Giảng Viên Mới

  const [selectedInstructor, setSelectedInstructor] = useState("Thầy Nguyễn Phước");

  const [bookingTopic, setBookingTopic] = useState("");

  const [bookingTime, setBookingTime] = useState("14:00 - 15:30");



  // Expanded Categories

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({

    exam_center: true,

    mentor_software: true,

    mentor_ai: true,

  });



  // Timeline Hours: 07:00 to 18:00 (minHour: 7, maxHour: 19 => 12 hours)

  const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  const minHour = 7;

  const maxHour = 19;

  const totalHours = maxHour - minHour;

  const currentTime = 13.7; // ~13:42



  // Drag & Drop / Resize Engine

  const [dragging, setDragging] = useState<{

    itemId: string;

    catId: string;

    mode: "move" | "resize-left" | "resize-right";

    startX: number;

    initialStartHour: number;

    initialEndHour: number;

    currentStartHour: number;

    currentEndHour: number;

  } | null>(null);



  const timelineTrackRef = useRef<HTMLDivElement>(null);



  // Toast Auto-dismiss

  useEffect(() => {

    if (!toastMessage) return;

    const timer = setTimeout(() => {

      setToastMessage(null);

    }, 4500);

    return () => clearTimeout(timer);

  }, [toastMessage]);



  const showToast = (msg: string, undo?: () => void) => {

    setToastMessage(msg);

    setUndoAction(undo ? () => undo : null);

  };



  // Schedule Categories Data (Exact Marlo Color Palette & Non-Truncated Typography)

  const [categories, setCategories] = useState<ScheduleCategory[]>([

    {

      id: "exam_center",

      name: "Khảo thí & Đánh giá Năng lực Cuối khóa",

      badgeColor: "bg-[#F29B23]",

      locationHeader: "Khu vực thi tập trung · Lab A201 & B102",

      capacityByHour: {

        7: { current: 2, max: 2 },

        8: { current: 2, max: 2 },

        9: { current: 2, max: 2 },

        10: { current: 2, max: 2 },

        11: { current: 4, max: 4 },

        12: { current: 4, max: 4 },

        13: { current: 4, max: 4 },

        14: { current: 3, max: 3 },

        15: { current: 2, max: 2 },

        16: { current: 2, max: 2 },

        17: { current: 1, max: 1 },

        18: { current: 1, max: 1 },

      },

      items: [

        {

          id: "ex_1",

          code: "CS201",

          instructorOrSubject: "Thi kết thúc môn OOP",

          avatar: "NP",

          roleOrType: "exam_test",

          colorKind: "grade",

          startHour: 7.0,

          endHour: 10.5,

          pillTitle: "Code C++ & OOP (CS201)",

          fullTitle: "Thi Thực hành Code C++ & Trắc nghiệm Kiến trúc OOP (CS201)",

          location: "Lab Máy A201 · 60 máy",

          instructorName: "Thầy Nguyễn Phước",

          breakHour: 8.75,

          note: "Sinh viên có mặt trước 15 phút, xuất trình thẻ SV. Thời gian làm bài 180 phút.",

        },

        {

          id: "ex_2",

          code: "CS304",

          instructorOrSubject: "Vấn đáp Đồ án Web API",

          avatar: "MQ",

          roleOrType: "exam_oral",

          colorKind: "review",

          startHour: 11.0,

          endHour: 16.5,

          pillTitle: "Vấn đáp Đồ án Web API (CS304)",

          fullTitle: "Hội đồng Phản biện Đồ án RESTful API & CSDL Nâng cao (CS304)",

          location: "Phòng B102 · Hội đồng 02",

          instructorName: "Thầy Trần Minh Quân & Cô Trần Thị B",

          breakHour: 13.5,

          note: "Trình bày slide và demo live kiến trúc microservice trong 25 phút/nhóm.",

        },

      ],

    },

    {

      id: "mentor_software",

      name: "Cố vấn 1-on-1: Kỹ thuật Phần mềm",

      badgeColor: "bg-[#E8712A]",

      locationHeader: "Văn phòng Bộ môn Khoa CNTT · Tầng 3 Tòa Alpha",

      capacityByHour: {

        7: { current: 2, max: 2 },

        8: { current: 2, max: 2 },

        9: { current: 2, max: 2 },

        10: { current: 3, max: 3 },

        11: { current: 3, max: 4 },

        12: { current: 2, max: 3 },

        13: { current: 1, max: 2 },

        14: { current: 1, max: 2 },

        15: { current: 1, max: 2 },

        16: { current: 1, max: 1 },

        17: { current: 1, max: 1 },

        18: { current: 1, max: 1 },

      },

      items: [

        {

          id: "men_1",

          code: "OFFICE",

          instructorOrSubject: "Thầy Nguyễn Phước",

          avatar: "NP",

          roleOrType: "mentor_1on1",

          colorKind: "edit",

          startHour: 7.5,

          endHour: 11.5,

          pillTitle: "Tư vấn vtable & Lớp OOP",

          fullTitle: "Hẹn hỏi bài 1-on-1: Giải đáp con trỏ C++, vtable & thiết kế lớp OOP",

          location: "Văn phòng P302 · Thầy Nguyễn Phước",

          instructorName: "Thầy Nguyễn Phước",

          breakHour: 9.5,

          note: "Mang theo source code đồ án đã push lên GitHub để thầy review trực tiếp.",

        },

        {

          id: "men_2",

          code: "OFFICE",

          instructorOrSubject: "Cô Trần Thị B",

          avatar: "TB",

          roleOrType: "mentor_1on1",

          colorKind: "review",

          startHour: 9.0,

          endHour: 14.0,

          pillTitle: "Review Schema 3NF & API",

          fullTitle: "Review kiến trúc: Chuẩn hóa Schema 3NF & Xác thực JWT API",

          location: "Văn phòng P305 · Cô Trần Thị B",

          instructorName: "Cô Trần Thị B",

          breakHour: 11.5,

          note: "Hỗ trợ tối ưu hóa câu truy vấn SQL và phân quyền RBAC.",

        },

        {

          id: "men_open_1",

          code: "SLOT",

          instructorOrSubject: "Khung giờ hẹn trống",

          avatar: "+",

          roleOrType: "open_slot",

          startHour: 14.0,

          endHour: 17.5,

          pillTitle: "+ Khung hẹn trống (Thầy Phước)",

          fullTitle: "Khung giờ hẹn trống với Thầy Nguyễn Phước (Tự do đăng ký)",

          location: "Văn phòng P302 · Bấm để đặt lịch",

          instructorName: "Thầy Nguyễn Phước",

          note: "Khung giờ mở tự do cho mọi sinh viên cần giải đáp thắc mắc trước kỳ thi.",

        },

      ],

    },

    {

      id: "mentor_ai",

      name: "Cố vấn 1-on-1: Trí tuệ Nhân tạo & Thuật toán",

      badgeColor: "bg-[#B4581D]",

      locationHeader: "Phòng Nghiên cứu AI Lab · Tòa Beta P104",

      capacityByHour: {

        7: { current: 1, max: 1 },

        8: { current: 3, max: 3 },

        9: { current: 3, max: 3 },

        10: { current: 3, max: 3 },

        11: { current: 4, max: 4 },

        12: { current: 4, max: 4 },

        13: { current: 3, max: 3 },

        14: { current: 3, max: 3 },

        15: { current: 3, max: 3 },

        16: { current: 1, max: 1 },

        17: { current: 1, max: 1 },

        18: { current: 1, max: 1 },

      },

      items: [

        {

          id: "men_3",

          code: "AI-LAB",

          instructorOrSubject: "Thầy Trần Minh Quân",

          avatar: "MQ",

          roleOrType: "mentor_1on1",

          colorKind: "mix",

          startHour: 7.0,

          endHour: 12.0,

          pillTitle: "Hỏi Thuật toán Graph & DSU",

          fullTitle: "Hẹn hỏi bài: Thuật toán Graph Dijkstra, DSU & Tối ưu hóa Big-O",

          location: "Phòng Nghiên cứu P104",

          instructorName: "Thầy Trần Minh Quân",

          breakHour: 9.5,

          note: "Hướng dẫn kỹ thuật giải bài tập độ phức tạp O(E log V).",

        },

        {

          id: "men_busy_1",

          code: "NOTICE",

          instructorOrSubject: "Giảng viên bận họp",

          avatar: "⚠️",

          roleOrType: "postponed",

          colorKind: "call",

          startHour: 12.0,

          endHour: 14.5,

          pillTitle: "Bận họp Hội đồng Khoa học",

          fullTitle: "Giảng viên bận họp Hội đồng Khoa học Ban Giám hiệu (Tạm hoãn tiếp SV)",

          location: "Phòng họp Ban Giám hiệu",

          instructorName: "Thầy Trần Minh Quân",

          note: "Ca tư vấn tạm dời sang 14:30 chiều.",

        },

        {

          id: "men_open_2",

          code: "SLOT",

          instructorOrSubject: "Khung giờ hẹn trống",

          avatar: "+",

          roleOrType: "open_slot",

          startHour: 14.5,

          endHour: 18.0,

          pillTitle: "+ Khung hẹn trống (Thầy Quân)",

          fullTitle: "Khung giờ hẹn trống: Hướng dẫn RAG & Gemini API chuyên sâu",

          location: "Phòng Nghiên cứu P104 · Bấm để đặt lịch",

          instructorName: "Thầy Trần Minh Quân",

          note: "Tư vấn thiết kế pipeline Retrieval-Augmented Generation.",

        },

      ],

    },

  ]);







  // Helper Percentages

  const getLeftPercent = (hour: number) => {

    const clamped = Math.max(minHour, Math.min(maxHour, hour));

    return `${((clamped - minHour) / totalHours) * 100}%`;

  };



  const getWidthPercent = (startHour: number, endHour: number) => {

    const duration = Math.max(0.25, endHour - startHour);

    return `${(duration / totalHours) * 100}%`;

  };



  const formatHourString = (hourNum: number) => {

    const h = Math.floor(hourNum);

    const m = Math.round((hourNum - h) * 60);

    return `${h < 10 ? `0${h}` : h}:${m === 0 ? "00" : m < 10 ? `0${m}` : m}`;

  };



  const formatDurationString = (start: number, end: number) => {

    const totalMinutes = Math.round((end - start) * 60);

    const hours = Math.floor(totalMinutes / 60);

    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes}m`;

    if (minutes === 0) return `${hours}h`;

    return `${hours}h ${minutes}m`;

  };



  // Drag & Drop / Resize Handlers

  const handlePointerDown = (

    e: React.PointerEvent,

    item: ScheduleItem,

    catId: string,

    mode: "move" | "resize-left" | "resize-right"

  ) => {

    e.stopPropagation();

    (e.target as HTMLElement).setPointerCapture(e.pointerId);



    setDragging({

      itemId: item.id,

      catId,

      mode,

      startX: e.clientX,

      initialStartHour: item.startHour,

      initialEndHour: item.endHour,

      currentStartHour: item.startHour,

      currentEndHour: item.endHour,

    });

  };



  const handlePointerMove = (e: React.PointerEvent) => {

    if (!dragging || !timelineTrackRef.current) return;



    const trackRect = timelineTrackRef.current.getBoundingClientRect();

    const pixelDelta = e.clientX - dragging.startX;

    const hourDelta = (pixelDelta / trackRect.width) * totalHours;



    // Snap to 15-minute intervals (0.25 hour)

    const snap15m = (val: number) => Math.round(val * 4) / 4;



    if (dragging.mode === "move") {

      const duration = dragging.initialEndHour - dragging.initialStartHour;

      let newStart = snap15m(dragging.initialStartHour + hourDelta);

      newStart = Math.max(minHour, Math.min(maxHour - duration, newStart));

      const newEnd = snap15m(newStart + duration);



      setDragging((prev) => (prev ? { ...prev, currentStartHour: newStart, currentEndHour: newEnd } : null));

    } else if (dragging.mode === "resize-left") {

      let newStart = snap15m(dragging.initialStartHour + hourDelta);

      newStart = Math.max(minHour, Math.min(dragging.currentEndHour - 0.5, newStart));

      setDragging((prev) => (prev ? { ...prev, currentStartHour: newStart } : null));

    } else if (dragging.mode === "resize-right") {

      let newEnd = snap15m(dragging.initialEndHour + hourDelta);

      newEnd = Math.max(dragging.currentStartHour + 0.5, Math.min(maxHour, newEnd));

      setDragging((prev) => (prev ? { ...prev, currentEndHour: newEnd } : null));

    }

  };



  const handlePointerUp = (e: React.PointerEvent) => {

    if (!dragging) return;

    try {

      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    } catch {

      // Ignored

    }



    const { itemId, catId, initialStartHour, initialEndHour, currentStartHour, currentEndHour } = dragging;

    setDragging(null);



    if (initialStartHour === currentStartHour && initialEndHour === currentEndHour) {

      return;

    }



    // Apply update to state

    setCategories((prev) =>

      prev.map((cat) => {

        if (cat.id !== catId) return cat;

        return {

          ...cat,

          items: cat.items.map((item) => {

            if (item.id !== itemId) return item;

            return {

              ...item,

              startHour: currentStartHour,

              endHour: currentEndHour,

            };

          }),

        };

      })

    );



    // Show toast with Undo capability

    showToast(

      `✓ Đã dời lịch sang ${formatHourString(currentStartHour)} - ${formatHourString(currentEndHour)}`,

      () => {

        setCategories((rollbackPrev) =>

          rollbackPrev.map((cat) => {

            if (cat.id !== catId) return cat;

            return {

              ...cat,

              items: cat.items.map((item) => {

                if (item.id !== itemId) return item;

                return {

                  ...item,

                  startHour: initialStartHour,

                  endHour: initialEndHour,

                };

              }),

            };

          })

        );

        showToast("↩ Đã hoàn tác vị trí lịch ban đầu.");

      }

    );

  };



  // Open slot click

  const handleBookSlot = (item: ScheduleItem, catId: string) => {

    setSelectedInstructor(item.instructorName);

    setBookingTime(`${formatHourString(item.startHour)} - ${formatHourString(item.endHour)}`);

    setShowBookingModal(true);

  };



  const handleConfirmNewAppointment = () => {

    if (!bookingTopic.trim()) {

      showToast("Vui lòng nhập chủ đề bạn muốn hỏi Thầy Cô!");

      return;

    }



    const newItem: ScheduleItem = {

      id: `men_custom_${Date.now()}`,

      code: "1-ON-1",

      instructorOrSubject: selectedInstructor,

      avatar: selectedInstructor.includes("Phước") ? "NP" : "MQ",

      roleOrType: "mentor_1on1",

      startHour: 14.5,

      endHour: 16.5,

      pillTitle: `Hỏi bài: ${bookingTopic.slice(0, 18)}...`,

      fullTitle: `Hẹn gặp 1-on-1: ${bookingTopic}`,

      location: "Văn phòng P302 · Đã xác nhận",

      instructorName: selectedInstructor,

      note: bookingTopic,

    };



    setCategories((prev) =>

      prev.map((c) => (c.id === "mentor_software" ? { ...c, items: [...c.items, newItem] } : c))

    );



    // Đồng bộ vào MySQL backend

    bookScheduleApi("sch-office-cs202", {

      topic: bookingTopic,

      student_note: `Đăng ký tư vấn chuyên môn cùng ${selectedInstructor}`,

    }).catch(() => {});



    setShowBookingModal(false);

    setBookingTopic("");

    showToast(`✓ Đã đăng ký thành công buổi hẹn với ${selectedInstructor}!`);

  };







  // Filter Categories

  const filteredCategories = categories.filter((cat) => {

    if (selectedFilter === "exam") return cat.id === "exam_center";

    if (selectedFilter === "software") return cat.id === "mentor_software";

    if (selectedFilter === "ai") return cat.id === "mentor_ai";

    return true;

  });



  const rotaRef = useRef<HTMLDivElement>(null);



  useMarloPageEntrance(

    rotaRef,

    (el) => {

      const cards = el.querySelectorAll(".marlo-card");

      if (cards.length > 0) {

        animateMarloCards(cards, { stagger: 0.055, y: 24 });

      }

      const rows = el.querySelectorAll(".marlo-row");

      if (rows.length > 0) {

        animateMarloRows(rows, { y: 12, stagger: 0.03, delay: 0.22 });

      }

    },

    []);



  return (

    <div

      ref={rotaRef}

      onPointerMove={handlePointerMove}

      onPointerUp={handlePointerUp}

      className="min-h-screen bg-transparent text-[#1E1D1B] dark:text-slate-100 p-4 sm:p-6 lg:p-8 font-sans select-none relative overflow-x-hidden transition-colors duration-200"

    >

      {/* ─── TOP HEADER (EXACT CODE_AND_CHILL / LEVENA REFERENCE STYLE) ─── */}

      <div className="marlo-card flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-7">

        <div>

          <div className="flex items-center gap-2.5">
            <MarloTitle
              text={role === "instructor" ? "Lịch Giảng Dạy & Hội Đồng Đồ Án" : "Lịch Học Vụ & Cố Vấn Học Tập"}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E1D1B] dark:text-white font-sans"
            />
            {role === "instructor" && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-slate-200/80 dark:border-slate-800">
                Góc nhìn Giảng viên
              </span>
            )}
          </div>

          <p className="text-sm text-[#62656b] dark:text-[#a0a3a9] mt-1 font-normal max-w-3xl leading-relaxed">

            {role === "instructor"
              ? "Quản lý ca trực phòng Lab, lịch hội đồng chấm thi vấn đáp AI Council và phê duyệt lịch hẹn 1-1 với các nhóm sinh viên."
              : "Xem thời khóa biểu học vụ, theo dõi lịch trình sprint và đặt lịch hẹn cố vấn 1-1 với Thầy Cô / Mentor."}

          </p>

        </div>



        <div className="flex items-center gap-2.5 flex-wrap">

          {/* Search Bar */}

          <div className="relative">

            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9E9B94] dark:text-slate-400" />

            <input

              type="text"

              placeholder={role === "instructor" ? "Tìm ca thi, môn học, giảng viên..." : "Tìm môn học, lịch hẹn, giảng viên..."}

              value={searchQuery}

              onChange={(e) => setSearchQuery(e.target.value)}

              className="pl-8 pr-10 py-2 bg-white dark:bg-slate-900 border border-[#EBE8E2] dark:border-slate-800 rounded-xl text-xs w-60 sm:w-64 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E5A023]/30 transition-all shadow-xs"

            />

            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#9E9B94] dark:text-slate-400 bg-[#F2EFE9] dark:bg-slate-800 px-1 py-0.5 rounded font-mono border border-[#E5E2DA] dark:border-slate-700">

              ⌘K

            </span>

          </div>

          {/* Strictly Role-Based Primary Action */}
          {role === "instructor" ? (
            <button
              type="button"
              onClick={() => {
                setBookRoomInitialValues(null);
                setIsBookRoomModalOpen(true);
              }}
              className="btn-marlo-primary btn--primary magnetic flex items-center shadow-md px-4 py-2 font-bold text-xs"
              title="Book Phòng Hội Đồng, Phòng Khảo Thí hoặc Phòng Cố Vấn"
            >
              <span>Book Phòng Hội Đồng / Thi</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowBookingModal(true)}
              className="btn-marlo-primary btn--primary magnetic flex items-center shadow-md px-4 py-2 font-bold text-xs"
              title="Đặt lịch hẹn cố vấn học tập 1-1 với Thầy Cô / Mentor"
            >
              <span>Book Cố Vấn Học Tập</span>
            </button>
          )}

        </div>

      </div>



      {/* ─── AUTHENTIC MARLO SUB-NAV TABS (WEEK vs AGENDA with sliding tabs__line) ─── */}

      <nav
        ref={tabsNavRef}
        className="tabs notranslate"
        translate="no"
        aria-label="Sections"
      >
        {role === "instructor" ? (
          <>
            <button
              type="button"
              aria-current={activeTab === "exams" ? "page" : undefined}
              onClick={() => switchTab("exams")}
              className="flex items-center gap-1.5"
            >
              <span>Lịch Thi Định Kỳ Trực Tiếp</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-[10px] font-bold">
                {roomSessions.filter((s) => s.kind === "exam").length}
              </span>
            </button>
            <button
              type="button"
              aria-current={activeTab === "mentoring" ? "page" : undefined}
              onClick={() => switchTab("mentoring")}
              className="flex items-center gap-1.5"
            >
              <span>Học Viên Nhờ Cố Vấn</span>
              {mentoringRequests.filter((r) => r.status === "pending").length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                  {mentoringRequests.filter((r) => r.status === "pending").length}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-current={activeTab === "week" ? "page" : undefined}
              onClick={() => switchTab("week")}
            >
              Lịch Tuần & Phòng Thi
            </button>
            <button
              type="button"
              aria-current={activeTab === "agenda" ? "page" : undefined}
              onClick={() => switchTab("agenda")}
            >
              Agenda
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-current={activeTab === "week" ? "page" : undefined}
              onClick={() => switchTab("week")}
            >
              Lịch Tuần
            </button>
            <button
              type="button"
              aria-current={activeTab === "agenda" ? "page" : undefined}
              onClick={() => switchTab("agenda")}
            >
              Agenda
            </button>
            <button
              type="button"
              aria-current={activeTab === "mentoring" ? "page" : undefined}
              onClick={() => switchTab("mentoring")}
              className="flex items-center gap-1.5"
            >
              <span>Lịch Cố Vấn</span>
              {mentoringRequests.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                  {mentoringRequests.length}
                </span>
              )}
            </button>
          </>
        )}
        <span ref={tabLineRef} className="tabs__line" />
      </nav>



      {/* ─── STAGE CONTAINER: ANIMATES ON VIEW SWITCH ─── */}

      <div ref={stageRef} className="w-full">

        {displayedTab === "exams" ? (
          /* ─── TAB 1: QUẢN LÝ LỊCH THI ĐỊNH KỲ TRỰC TIẾP CỦA HỌC VIÊN ─── */
          <div className="w-full space-y-6">
            {/* 4 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold block">Tổng ca thi định kỳ tuần này</span>
                <b className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                  {roomSessions.filter((s) => s.kind === "exam").length} ca thi
                </b>
                <span className="text-xs text-emerald-600 font-medium mt-1 block">100% đã được xếp phòng</span>
              </div>
              <div className="card p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold block">Đang thi trực tiếp</span>
                <b className="text-2xl font-bold text-emerald-600 mt-1 block flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  1 ca phòng máy
                </b>
                <span className="text-xs text-slate-400 mt-1 block">Phòng Khảo thí 402</span>
              </div>
              <div className="card p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold block">Ca thi sắp diễn ra</span>
                <b className="text-2xl font-bold text-amber-600 mt-1 block">
                  {roomSessions.filter((s) => s.kind === "exam" && !s.done && s.id !== "ses-1").length} ca thi
                </b>
                <span className="text-xs text-slate-400 mt-1 block">Hôm nay & Ngày mai</span>
              </div>
              <div className="card p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold block">Phòng thi đang phục vụ</span>
                <b className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                  3 phòng hội đồng
                </b>
                <span className="text-xs text-slate-400 mt-1 block">P402, P101, Lab AI 301</span>
              </div>
            </div>

            {/* Toolbar for Exam Rota */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lọc theo phòng:</span>
                <select
                  value={selectedRoomFilter}
                  onChange={(e) => setSelectedRoomFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="all">Tất cả phòng thi & hội đồng</option>
                  {MARLO_ROOMS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBookRoomInitialValues({ kind: "exam", title: "Thi Vấn đáp & Thực hành Đồ án Định kỳ" });
                  setIsBookRoomModalOpen(true);
                }}
                className="btn-marlo-primary btn--primary magnetic flex items-center text-xs px-4 py-2 font-bold"
              >
                <span>Book Phòng Thi Mới</span>
              </button>
            </div>

            {/* List of Scheduled Exams */}
            <div className="space-y-3">
              {roomSessions
                .filter((s) => s.kind === "exam" && (selectedRoomFilter === "all" || s.room === selectedRoomFilter))
                .map((session) => {
                  const isLive = session.id === "ses-1";
                  const isDone = session.done;
                  return (
                    <div
                      key={session.id}
                      className={`card p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all ${
                        isLive
                          ? "border-emerald-500/80 ring-1 ring-emerald-500/20 shadow-md"
                          : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Time & Room */}
                        <div className="flex items-start gap-4 min-w-[280px]">
                          <div className="text-center min-w-[70px] py-1.5 px-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex-none">
                            <b className="text-base font-bold block text-slate-900 dark:text-white">
                              {new Date(session.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                            </b>
                            <small className="text-[11px] text-slate-500 block font-semibold">{session.mins} phút</small>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                Lịch Thi Định Kỳ
                              </span>
                              <span className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                <MapPin size={12} className="text-amber-500" />
                                {session.room}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              {session.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {session.projectName || "Đồ án Kỹ nghệ Phần mềm"}
                            </p>
                          </div>
                        </div>

                        {/* Middle: Student & Examiner info */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                          <div>
                            <span className="text-slate-400 block font-semibold">Học viên / Nhóm thi:</span>
                            <b className="text-slate-900 dark:text-white font-bold">{session.studentName}</b>
                          </div>
                          <div className="border-l border-slate-200 dark:border-slate-700 pl-4">
                            <span className="text-slate-400 block font-semibold">Hội đồng / Giám khảo:</span>
                            <span className="font-semibold">{session.examinerOrMentor}</span>
                          </div>
                        </div>

                        {/* Right: Status badge & Actions */}
                        <div className="flex items-center gap-2.5 flex-wrap justify-end">
                          {isLive ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1.5 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Đang thi trực tiếp
                            </span>
                          ) : isDone ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Đã hoàn thành
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              Sắp diễn ra
                            </span>
                          )}

                          {onNavigate && (
                            <button
                              type="button"
                              onClick={() => onNavigate("defense-room")}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                              title="Mở phòng chấm thi AI Council 3D"
                            >
                              <span>Vào chấm thi</span>
                              <ExternalLink size={12} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setBookRoomInitialValues({
                                title: session.title,
                                kind: "exam",
                                room: session.room,
                                studentName: session.studentName,
                              });
                              setIsBookRoomModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
                          >
                            Đổi phòng
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : displayedTab === "mentoring" ? (
          /* ─── TAB 2: HỌC VIÊN NHỜ MENTOR CỐ VẤN 1-1 ─── */
          <div className="w-full space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <b className="text-sm font-bold text-amber-900 dark:text-amber-200 block">
                  {role === "instructor" ? "Danh Sách Học Viên Nhờ Giảng Viên Cố Vấn 1-1" : "Lịch Hẹn Cố Vấn 1-1 Của Bạn"}
                </b>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  {role === "instructor"
                    ? "Sinh viên gửi câu hỏi kỹ thuật và yêu cầu khung giờ hẹn. Giảng viên có thể duyệt và xếp phòng cố vấn."
                    : "Theo dõi tiến độ duyệt và trạng thái xếp phòng các buổi hẹn nhờ Thầy Cô cố vấn đồ án."}
                </p>
              </div>

              {role === "instructor" ? (
                <button
                  type="button"
                  onClick={() => {
                    setBookRoomInitialValues({ kind: "mentor", title: "Cố vấn Kỹ thuật 1-1 với Học viên" });
                    setIsBookRoomModalOpen(true);
                  }}
                  className="btn-marlo-primary btn--primary magnetic flex items-center text-xs px-4 py-2 flex-none font-bold"
                >
                  <span>Tạo Phiên Cố Vấn Mới</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowBookingModal(true)}
                  className="btn-marlo-primary btn--primary magnetic flex items-center text-xs px-4 py-2 flex-none font-bold shadow-xs"
                >
                  <span>Book Cố Vấn Học Tập</span>
                </button>
              )}
            </div>

            {/* List of Mentoring Requests */}
            <div className="space-y-4">
              {mentoringRequests.map((req) => {
                const isApproved = req.status === "approved";
                return (
                  <div
                    key={req.id}
                    className="card p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs flex-none shadow-2xs">
                          {req.studentAvatar}
                        </div>
                        <div>
                          <b className="text-sm font-bold text-slate-900 dark:text-white block">
                            {req.studentName}
                          </b>
                          <small className="text-xs text-slate-500 dark:text-slate-400 block">
                            {req.project}
                          </small>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">Khung giờ hẹn mong muốn:</span>
                        <b className="text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          {req.requestedDate} · {req.preferredTime}
                        </b>
                      </div>
                    </div>

                    {/* Question / Topic */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                      <b className="text-amber-600 dark:text-amber-400 font-bold block mb-1">Vấn đề cần Thầy Cô cố vấn:</b>
                      {req.topic}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                      <div>
                        {isApproved ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center">
                            Đã duyệt & Đã xếp phòng
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Chờ Giảng viên duyệt & xếp phòng
                          </span>
                        )}
                      </div>

                      {role === "instructor" && (
                        <div className="flex items-center gap-2">
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => {
                                setBookRoomInitialValues({
                                  title: `Cố vấn 1-1: ${req.studentName} (${req.project.split(" - ")[0]})`,
                                  kind: "mentor",
                                  studentName: req.studentName,
                                  room: "Phòng Cố vấn Mentor Studio",
                                  duration: req.durationMins,
                                });
                                setIsBookRoomModalOpen(true);
                              }}
                              className="px-4 py-2 rounded-xl bg-[#f29b23] hover:bg-[#ee8420] text-slate-950 text-xs font-bold transition shadow-xs flex items-center cursor-pointer"
                            >
                              <span>Duyệt & Book Phòng Ngay</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const newSes: MarloRoomSession = {
                                id: `ses-${Date.now()}`,
                                title: `Cố vấn Online: ${req.studentName}`,
                                kind: "mentor",
                                at: Date.now() + 3600000 * 2,
                                mins: req.durationMins,
                                projectName: req.project,
                                who: [req.studentId],
                                studentName: req.studentName,
                                examinerOrMentor: "Thầy Nguyễn Phước",
                                room: "Google Meet Trực Tuyến",
                                done: false,
                                notes: req.topic,
                                statusText: "Đã duyệt Online",
                              };
                              handleBookNewRoomSession(newSes);
                            }}
                            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition"
                          >
                            Chuyển Online (Meet)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : displayedTab === "agenda" ? (

        <div className="w-full space-y-4">

          <MarloAgendaView

            onSelectBooking={(b) => {

              setSelectedBooking(b);

            }}

            onAddBooking={() => setShowBookingModal(true)}

          />

        </div>

      ) : (

        <>

          {/* ─── FILTER ROW & LIVE STATUS (EXACT LEVENA PILL BAR) ─── */}

          <div className="marlo-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">

            <div className="flex items-center gap-2.5 text-xs text-[#62656b] dark:text-[#a0a3a9]">

              <span className="flex items-center gap-1.5 font-bold text-[#1E1D1B] dark:text-white">

                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />

                Đang diễn ra · Thứ Tư 04/11

              </span>

              <span>•</span>

              <span className="text-[#62656b] dark:text-[#a0a3a9]">2 ca thi · 4 giảng viên đang trực văn phòng · kéo thanh để dời giờ</span>

            </div>



            {/* Filter Pills with Authentic Marlo Segmented Liquid Pill */}

            <MarloSegmentedControl

              value={selectedFilter}

              options={[

                { id: "all", label: "Tất cả bộ môn" },

                { id: "exam", label: "Lịch khảo thí" },

                { id: "software", label: "Kỹ thuật PM" },

                { id: "ai", label: "Trí tuệ Nhân tạo" },

              ]}

              onChange={(val) => setSelectedFilter(val as any)}

              tone="dark"

            />

          </div>



          {/* ─── MAIN STAGE: FULL WIDTH SCHEDULE TIMELINE TABLE ─── */}

          <div className="w-full space-y-4 animate-enter-stagger-3">

              <div className="marlo-card bg-white dark:bg-slate-900/90 rounded-xl border border-[#EBE8E2] dark:border-slate-800 p-5 shadow-xs">

            {/* TIMELINE TABLE */}

            <div className="overflow-x-auto">

              <div className="min-w-[840px]">

                {/* Table Header: Hours */}

                <div className="grid grid-cols-12 gap-0 text-center border-b border-[#EBE8E2] dark:border-slate-800 pb-2.5 text-xs font-semibold text-[#9E9B94] dark:text-slate-400">

                  <div className="col-span-3 text-left pl-3 text-[#62656b] dark:text-[#a0a3a9] font-bold uppercase tracking-wider text-[11px]">

                    Hội đồng & Giảng viên

                  </div>

                  <div ref={timelineTrackRef} className="col-span-9 grid grid-cols-12 gap-0 relative">

                    {hours.map((h) => (

                      <div key={h} className="text-center font-mono text-xs text-[#9E9B94] dark:text-slate-400">

                        {h < 10 ? `0${h}` : h}

                      </div>

                    ))}



                    {/* LIVE TIME MARKER IN HEADER (Authentic Marlo Warm Amber Beacon) */}

                    <div

                      className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center -ml-4"

                      style={{ left: getLeftPercent(currentTime) }}

                    >

                      <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#F8BD57] via-[#F29B23] to-[#EE8420] text-[#1C1304] text-[10px] font-mono px-2.5 py-0.5 rounded-full shadow-md font-bold tracking-tight">

                        <span className="relative flex h-1.5 w-1.5">

                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1C1304] opacity-70" />

                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#1C1304]" />

                        </span>

                        <span>13:47</span>

                      </div>

                    </div>

                  </div>

                </div>



                {/* CATEGORIES & ITEMS */}

                <div className="divide-y divide-[#F2EFE9] dark:divide-slate-800/80 relative mt-2.5">

                  {/* LIVE TIME VERTICAL INDICATOR LINE (Glowing Warm Amber Line) */}

                  <div

                    className="absolute top-0 bottom-0 w-[2px] bg-[#EE8420] z-20 pointer-events-none opacity-90 shadow-[0_0_8px_rgba(238,132,32,0.6)]"

                    style={{ left: `calc(25% + (75% * ${(currentTime - minHour) / totalHours}))` }}

                  />



                  {filteredCategories.map((cat, catIdx) => {

                    const isExpanded = expandedCategories[cat.id] ?? true;

                    return (

                      <div key={cat.id} className="py-2.5 transition-all">

                        {/* Group Category Header Row (Exact Levena Style) */}

                        <div

                          className="grid grid-cols-12 gap-0 items-center py-2 px-3 bg-[#FAF9F6] dark:bg-slate-800/80 rounded-xl hover:bg-[#F4F2ED] dark:hover:bg-slate-700/80 transition-colors cursor-pointer mb-2.5 border border-[#EBE8E2]/70 dark:border-slate-700/60"

                          onClick={() =>

                            setExpandedCategories((prev) => ({

                              ...prev,

                              [cat.id]: !isExpanded,

                            }))

                          }

                        >

                          <div className="col-span-3 flex items-center gap-2 pr-2">

                            <ChevronDown

                              size={14}

                              className={`text-[#62656b] dark:text-[#a0a3a9] transition-transform duration-200 ${

                                isExpanded ? "rotate-0" : "-rotate-90"

                              }`}

                            />

                            <span className={`w-2 h-2 rounded-full ${cat.badgeColor} shrink-0`} />

                            <div className="truncate min-w-0">

                              <span className="text-xs font-bold text-[#1E1D1B] dark:text-slate-100 block truncate">

                                {cat.name}

                              </span>

                              <span className="text-[10px] text-[#62656b] dark:text-[#a0a3a9] font-normal block truncate">

                                {cat.locationHeader}

                              </span>

                            </div>

                          </div>



                          {/* Capacity chips across 12 hours */}

                          <div className="col-span-9 grid grid-cols-12 gap-1 text-[10px]">

                            {hours.map((h) => {

                              const cap = cat.capacityByHour[h] || { current: 2, max: 2 };

                              const isAlert = cap.current < cap.max;

                              return (

                                <div

                                  key={h}

                                  className={`py-0.5 text-center font-mono rounded-md font-semibold transition-all hover:scale-105 hover:shadow-2xs ${

                                    isAlert

                                      ? "bg-[#FCE8E6] text-[#8C2C23] border border-[#F8D2CD] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60"

                                      : "bg-[#E5F4E9] text-[#226337] border border-[#CEEAD4] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60"

                                  }`}

                                  title={`Khung ${h}:00 - Sĩ số: ${cap.current}/${cap.max}`}

                                >

                                  {cap.current}/{cap.max}

                                </div>

                              );

                            })}

                          </div>

                        </div>



                        {/* Items Rows */}

                        {isExpanded && (

                          <div className="space-y-2 pl-2 pr-1">

                            {cat.items.map((item, itemIdx) => {

                              const isBeingDragged = dragging?.itemId === item.id;

                              const activeStart = isBeingDragged ? dragging.currentStartHour : item.startHour;

                              const activeEnd = isBeingDragged ? dragging.currentEndHour : item.endHour;



                              return (

                                <div

                                  key={item.id}

                                  className="grid grid-cols-12 gap-0 items-center py-1 group/row"

                                >

                                  {/* Left: Avatar & Teacher Name */}

                                  <div className="col-span-3 flex items-center gap-2.5 pr-3">

                                    <div

                                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-200 group-hover/row:scale-110 group-hover/row:shadow-xs ${

                                        item.roleOrType === "open_slot"

                                          ? "bg-[#FDF6E8] text-[#8A5A1C] border border-dashed border-[#E5A023] dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700"

                                          : item.roleOrType === "postponed"

                                          ? "bg-[#FCE8E6] text-[#8C2C23] border border-[#F8D2CD] dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"

                                          : item.roleOrType === "exam_test"

                                          ? "bg-[#CBE1F8] text-[#1E3A5F] border border-[#B3D4F5] dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"

                                          : item.roleOrType === "exam_oral"

                                          ? "bg-[#FAD9D3] text-[#5F2B23] border border-[#F5C4BC] dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800"

                                          : "bg-[#D1EBD9] text-[#1D4A2B] border border-[#BDE0C8] dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"

                                      }`}

                                    >

                                      {item.avatar}

                                    </div>

                                    <div className="min-w-0">

                                      <p className="text-xs font-bold text-[#1E1D1B] dark:text-slate-100 truncate leading-tight group-hover/row:text-[#E5A023] transition-colors">

                                        {item.instructorOrSubject}

                                      </p>

                                      <p className="text-[11px] text-[#7A7873] dark:text-slate-400 truncate leading-tight mt-0.5">

                                        {item.location}

                                      </p>

                                    </div>

                                  </div>



                                  {/* Right: Bar pill (Exact Pastel Colors & 2-Line Non-Truncated Typography) */}

                                  <div className="col-span-9 h-11 relative rounded-lg bg-[#FAF9F6]/40 dark:bg-slate-900/50 border border-dashed border-[#EBE8E2] dark:border-slate-800 group-hover/row:border-stone-300 dark:group-hover/row:border-slate-700 transition-colors">

                                    <div className="absolute inset-0 grid grid-cols-12 pointer-events-none opacity-20 divide-x divide-[#D9D5CC] dark:divide-slate-800" />



                                    <div

                                      key={item.id}

                                      style={{

                                        left: getLeftPercent(activeStart),

                                        width: getWidthPercent(activeStart, activeEnd),

                                        animationDelay: `${catIdx * 120 + itemIdx * 80 + 50}ms`,

                                      }}

                                      onClick={() => {

                                        if (item.roleOrType === "open_slot") {

                                          handleBookSlot(item, cat.id);

                                        } else {

                                          setSelectedDetailItem(item);

                                        }

                                      }}

                                      onPointerDown={(e) => {

                                        if (role !== "student" && item.roleOrType !== "open_slot" && item.roleOrType !== "postponed") {

                                          handlePointerDown(e, item, cat.id, "move");

                                        }

                                      }}

                                      className={`absolute top-0.5 bottom-0.5 rounded-xl px-3 flex items-center justify-between text-xs transition-all touch-none group/bar ${

                                        isBeingDragged

                                          ? "!animate-none z-40 shadow-2xl ring-2 ring-[#EE8420] cursor-grabbing brightness-95 scale-[1.01]"

                                          : item.roleOrType === "open_slot"

                                          ? "animate-timeline-bar cursor-pointer hover:brightness-95 hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] animate-striped-slot"

                                          : "animate-timeline-bar cursor-grab hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.012] hover:z-20 transition-transform duration-150"

                                      } ${

                                        item.roleOrType === "open_slot"

                                          ? "bg-[repeating-linear-gradient(45deg,#FAF8F5,#FAF8F5_8px,#F7F1E6_8px,#F7F1E6_16px)] text-[#8F5404] border border-dashed border-[#DE9B35] border-l-[3.5px] border-l-[#DE9B35]"

                                          : (item.colorKind === "grade" || item.roleOrType === "exam_test")

                                          ? "bg-[#F7EBD9] text-[#2B2419] border border-[#EBD0A8] border-l-[3.5px] border-l-[#F29B23] shadow-2xs"

                                          : (item.colorKind === "review" || item.roleOrType === "exam_oral")

                                          ? "bg-[#FCE4D6] text-[#2D2320] border border-[#F3C4B0] border-l-[3.5px] border-l-[#E8712A] shadow-2xs"

                                          : (item.colorKind === "mix")

                                          ? "bg-[#E8D1C5] text-[#241814] border border-[#D9B5A3] border-l-[3.5px] border-l-[#B4581D] shadow-2xs"

                                          : (item.colorKind === "edit" || item.roleOrType === "mentor_1on1")

                                          ? "bg-[#F2EADC] text-[#2B2620] border border-[#DFD1BD] border-l-[3.5px] border-l-[#D6AD6E] shadow-2xs"

                                          : "bg-[#E2E5EA] text-[#1F2937] border border-[#CBD1D8] border-l-[3.5px] border-l-[#9A9DA3] shadow-2xs"

                                      }`}

                                    >

                                      {/* Floating Hover Info Pill */}

                                      {!isBeingDragged && (

                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#18181B] text-white text-[10px] font-sans px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover/bar:opacity-100 -translate-y-1 group-hover/bar:-translate-y-2 transition-all duration-150 pointer-events-none z-50 flex items-center gap-1.5 border border-white/10">

                                          <span className="font-bold font-mono text-[#EE8420]">

                                            {formatHourString(activeStart)} - {formatHourString(activeEnd)}

                                          </span>

                                          <span>•</span>

                                          <span className="font-medium">{item.pillTitle}</span>

                                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#18181B] rotate-45" />

                                        </div>

                                      )}

                                      {/* Left Resize Handle */}

                                      {role !== "student" && item.roleOrType !== "open_slot" && item.roleOrType !== "postponed" && (

                                        <div

                                          onPointerDown={(e) => handlePointerDown(e, item, cat.id, "resize-left")}

                                          className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-50"

                                          title="Kéo chỉnh giờ bắt đầu"

                                        >

                                          <div className="w-1.5 h-4 rounded-full bg-black/30 shadow-xs" />

                                        </div>

                                      )}



                                      {/* Two-Line Clean Text inside Bar (No Truncation) */}

                                      <div

                                        className="flex flex-col justify-center min-w-0 pr-2 pointer-events-none animate-timeline-text"

                                        style={{ animationDelay: `${catIdx * 120 + itemIdx * 80 + 120}ms` }}

                                      >

                                        <div className="flex items-center gap-1.5">

                                          <span className="font-bold text-[11px] font-mono leading-none tracking-tight">

                                            {formatHourString(activeStart)} - {formatHourString(activeEnd)}

                                          </span>

                                          {confirmedItemIds[item.id] && (

                                            <span className="px-1.5 py-0.5 rounded font-mono text-[8.5px] font-black uppercase bg-emerald-700 text-white tracking-wider shadow-2xs animate-in zoom-in-75">ĐÃ DUYỆT</span>

                                          )}

                                        </div>

                                        <span className="text-[11px] font-semibold truncate leading-tight mt-0.5">

                                          {item.pillTitle}

                                        </span>

                                      </div>



                                      {/* Mid-session notch tick */}

                                      {item.breakHour && !isBeingDragged && (

                                        <div

                                          className="absolute top-1.5 bottom-1.5 w-[1.5px] bg-black/20 rounded-full"

                                          style={{

                                            left: `${((item.breakHour - activeStart) / (activeEnd - activeStart)) * 100}%`,

                                          }}

                                          title={`Nghỉ giải lao: ${formatHourString(item.breakHour)}`}

                                        />

                                      )}



                                      {/* Right Resize Handle */}

                                      {role !== "student" && item.roleOrType !== "open_slot" && item.roleOrType !== "postponed" && (

                                        <div

                                          onPointerDown={(e) => handlePointerDown(e, item, cat.id, "resize-right")}

                                          className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-50"

                                          title="Kéo chỉnh giờ kết thúc"

                                        >

                                          <div className="w-1.5 h-4 rounded-full bg-black/30 shadow-xs" />

                                        </div>

                                      )}



                                      {/* Floating duration tooltip when dragging */}

                                      {isBeingDragged && (

                                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1E1D1B] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow-lg whitespace-nowrap border border-white/20 pointer-events-none">

                                          {formatHourString(activeStart)} - {formatHourString(activeEnd)} ({formatDurationString(activeStart, activeEnd)})

                                        </div>

                                      )}

                                    </div>

                                  </div>

                                </div>

                              );

                            })}

                          </div>

                        )}

                      </div>

                    );

                  })}

                </div>

              </div>

            </div>

          </div>



          {/* Bottom Academic Tip Card */}

          <div className="p-4 bg-white border border-[#EBE8E2] rounded-xl flex items-center justify-between shadow-xs">

            <div className="flex items-center gap-3">

              <div className="w-8 h-8 rounded-lg bg-[#FDF6E8] text-[#E5A023] flex items-center justify-center font-bold border border-[#F5E6CC] shrink-0">

                <Sparkles size={16} />

              </div>

              <div>

                <h4 className="text-xs font-bold text-[#1E1D1B]">

                  Quy định Khảo thí & Hẹn gặp Giảng viên 1-on-1

                </h4>

                <p className="text-[11px] text-[#7A7873] mt-0.5">

                  Bấm trực tiếp vào từng thanh ca thi để mở bảng chi tiết hội đồng và ghi chú đồ án. Có thể kéo dời ca tự do nếu chưa khóa danh sách thi.

                </p>

              </div>

            </div>

          </div>



      </div>

      </>

      )}

      </div>



      {/* ─── SLIDE-OVER INSPECTOR DRAWER (EXACT MARLO-APP REPLICA) ─── */}

      {selectedDetailItem && (() => {

        const isConfirmed = !!confirmedItemIds[selectedDetailItem.id];



        return (

          <div className="fixed inset-0 z-50 pointer-events-none select-none">

            {/* Backdrop */}

            <div

              onClick={handleCloseDetailDrawer}

              className={`fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity pointer-events-auto ${

                isDetailDrawerClosing ? "marlo-scrim-out" : "marlo-scrim"

              }`}

            />



            {/* Floating Rounded Drawer Card (Ported 1:1 from Marlo kit.jsx drawer) */}

            <div

              className={`fixed top-5 bottom-5 right-3.5 sm:top-6 sm:bottom-6 sm:right-6 w-[calc(100vw-28px)] sm:w-[460px] max-w-[calc(100vw-28px)] max-h-[calc(100dvh-48px)] z-[70] pointer-events-auto flex flex-col rounded-[24px] sm:rounded-[28px] bg-[#FAF9F6] dark:bg-[#151515] shadow-[0_25px_80px_rgba(0,0,0,0.36)] border border-[#EBE8E2] dark:border-[#2C2B28] overflow-hidden ${

                isDetailDrawerClosing ? "marlo-drawer-out" : "marlo-drawer"

              }`}

            >

              {/* 1. DRAWER TOP HEADER (Fixed at top) */}

              <div className="flex items-center justify-between px-6 pt-5 pb-3.5 border-b border-[#EBE8E2] dark:border-[#2C2B28] shrink-0 bg-white/60 dark:bg-[#151515]/60 backdrop-blur-xs">

                <div>

                  <div className="text-sm font-bold text-[#1E1D1B] dark:text-[#F2EFE9] flex items-center gap-2">

                    <span>{selectedDetailItem.code}</span>

                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700/80">

                      {selectedDetailItem.roleOrType === "exam_oral" ? "Khảo thí Hội đồng" : "Kiểm tra năng lực"}

                    </span>

                  </div>

                  <div className="text-xs text-[#7A7873] dark:text-[#A3A099] mt-0.5">

                    Phiếu xác nhận ca thi & Hẹn gặp Giảng viên

                  </div>

                </div>

                <button

                  onClick={handleCloseDetailDrawer}

                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#9E9B94] hover:text-[#1E1D1B] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"

                  title="Đóng (Esc)"

                >

                  <X size={18} />

                </button>

              </div>



              {/* 2. SCROLLABLE DRAWER BODY (Staggered Cascade Entry Animation) */}

              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4 marlo-drawer-body">

                {/* 🏷️ HERO TIME & ROOM BOX (Marlo sdraw__hero authentic layout) */}

                <div className={`relative bg-[#23201D] dark:bg-[#1a1714] text-white p-4 sm:p-5 rounded-2xl flex items-center gap-4 shadow-sm border border-[#3d372f]/50 overflow-hidden transition-all duration-300 ${isStamping ? "animate-paper-jolt" : ""}`}>

                  {/* Droplet / Clock Icon */}

                  <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">

                    <Clock size={22} className="stroke-[2.2]" />

                  </div>



                  <div className="min-w-0 flex-1">

                    <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white leading-tight">

                      {formatHourString(selectedDetailItem.startHour)} – {formatHourString(selectedDetailItem.endHour)}

                    </div>

                    <div className="text-xs text-[#a8a49c] font-medium mt-1 flex items-center gap-1.5 truncate">

                      <span>{formatDurationString(selectedDetailItem.startHour, selectedDetailItem.endHour)}</span>

                      <span>·</span>

                      <span className="truncate">{selectedDetailItem.location}</span>

                    </div>

                  </div>



                  {/* Visual PAID Rubber Stamp (from marlo.mp4) */}

                  {(isConfirmed || isStamping) && (

                    <div className="absolute right-3.5 top-3.5 pointer-events-none select-none z-30">

                      <div

                        className={`border-[3px] border-emerald-500 text-emerald-400 font-mono font-black text-xl tracking-[0.2em] px-3.5 py-1 rounded-xl uppercase shadow-md bg-emerald-950/85 backdrop-blur-xs flex items-center gap-1.5 -rotate-6 ${

                          isStamping ? "animate-stamp-slam" : ""

                        }`}

                      >ĐÃ DUYỆT</div>

                    </div>

                  )}

                </div>



                {/* 🏷️ METADATA KEY-VALUE TABLE (Marlo dl) */}

                <div className="rounded-2xl border border-[#EBE8E2] dark:border-[#2C2B28] bg-white dark:bg-[#1c1a17] p-4 space-y-3 shadow-2xs">

                  {/* Project */}

                  <div className="flex items-center justify-between text-xs">

                    <span className="text-[#7A7873] dark:text-[#A3A099] font-medium">Project</span>

                    <span className="font-bold text-[#E5A023] hover:underline cursor-pointer">

                      CodeMind Campus · Ban Khảo thí

                    </span>

                  </div>



                  {/* Assignee / Student */}

                  <div className="flex items-center justify-between text-xs">

                    <span className="text-[#7A7873] dark:text-[#A3A099] font-medium">Học viên</span>

                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FAF9F6] dark:bg-[#252320] border border-[#EBE8E2] dark:border-[#38342e] text-[#1E1D1B] dark:text-white font-bold text-[11px] shadow-2xs">

                      <div className="w-4 h-4 rounded-full bg-[#E5A023] text-white flex items-center justify-center text-[9px] font-black">

                        A

                      </div>

                      <span>Nguyễn Văn A (2210842)</span>

                    </div>

                  </div>



                  {/* Subject / Exam */}

                  <div className="flex items-center justify-between text-xs">

                    <span className="text-[#7A7873] dark:text-[#A3A099] font-medium">Học phần</span>

                    <span className="font-semibold text-[#1E1D1B] dark:text-[#F2EFE9] text-right truncate max-w-[240px]">

                      {selectedDetailItem.fullTitle}

                    </span>

                  </div>



                  {/* Due */}

                  <div className="flex items-center justify-between text-xs">

                    <span className="text-[#7A7873] dark:text-[#A3A099] font-medium">Due</span>

                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">

                      04 Nov 2026 · <span className="font-semibold text-slate-500">5 days ago</span>

                    </span>

                  </div>



                  {/* Room */}

                  <div className="flex items-center justify-between text-xs">

                    <span className="text-[#7A7873] dark:text-[#A3A099] font-medium">Room</span>

                    <span className="px-2.5 py-0.5 rounded-lg bg-[#FAF9F6] dark:bg-[#252320] text-[#1E1D1B] dark:text-white font-bold text-[11px] border border-[#EBE8E2] dark:border-[#38342e]">

                      {selectedDetailItem.location}

                    </span>

                  </div>



                  {/* Status */}

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F0EDE8] dark:border-[#2C2B28]">

                    <span className="text-[#7A7873] dark:text-[#A3A099] font-medium">Status</span>

                    {isConfirmed ? (

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">

                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />

                        Booked · Đã đóng dấu

                      </span>

                    ) : (

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">

                        <span className="w-1.5 h-1.5 rounded-full bg-[#EE8420]" />

                        Chờ đóng dấu

                      </span>

                    )}

                  </div>

                </div>



                {/* 🏷️ ADVISORY NOTE */}

                {selectedDetailItem.note && (

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-xs leading-relaxed">

                    <div className="font-semibold text-[11px] text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">

                      <Info size={13} className="text-blue-500 dark:text-blue-400" />

                      <span>Lưu ý học vụ từ Giảng viên:</span>

                    </div>

                    {selectedDetailItem.note}

                  </div>

                )}



                {/* 🏷️ WHO'S IN / GIẢNG VIÊN HỘI ĐỒNG */}

                <div className="space-y-2 pt-1">

                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#7A7873] dark:text-[#A3A099]">

                    Who's in · Hội đồng phụ trách

                  </h4>

                  <div className="space-y-2">

                    {[

                      { name: "Thầy Nguyễn Phước", role: "Trưởng ban Chấm thi & OOP", tag: "Chính" },

                      { name: "Thầy Trần Minh Quân", role: "Hội đồng Phản biện Đồ án", tag: "Phản biện" },

                      { name: "Cô Trần Thị B", role: "Cố vấn Kiến trúc Dữ liệu", tag: "Hội đồng" },

                    ].map((prof, pIdx) => (

                      <div

                        key={pIdx}

                        className="p-3 rounded-2xl bg-white dark:bg-[#1c1a17] border border-[#EBE8E2] dark:border-[#2C2B28] hover:border-slate-400 dark:hover:border-slate-600 flex items-center justify-between transition-all shadow-2xs"

                      >

                        <div className="flex items-center gap-3">

                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">

                            {prof.name.slice(prof.name.lastIndexOf(" ") + 1, prof.name.lastIndexOf(" ") + 3)}

                          </div>

                          <div>

                            <div className="text-xs font-bold text-[#1E1D1B] dark:text-white">{prof.name}</div>

                            <div className="text-[11px] text-[#7A7873] dark:text-[#A3A099]">{prof.role}</div>

                          </div>

                        </div>

                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700/80">

                          {prof.tag}

                        </span>

                      </div>

                    ))}

                  </div>

                </div>

              </div>



              {/* 3. DRAWER STICKY FOOTER (Authentic Marlo formfoot) */}

              <div className="px-6 py-4 bg-white dark:bg-[#151515] border-t border-[#EBE8E2] dark:border-[#2C2B28] flex items-center justify-between shrink-0">

                {/* Left Action */}

                {isConfirmed ? (

                  <button

                    type="button"

                    onClick={() => handleResetPaidStamp(selectedDetailItem.id)}

                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"

                    title="Bấm để hoàn tác đóng dấu"

                  >

                    <Trash2 size={15} />

                    <span>Hủy dấu</span>

                  </button>

                ) : (

                  <button

                    type="button"

                    onClick={handleCloseDetailDrawer}

                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"

                  >

                    <Trash2 size={15} />

                    <span>Đóng / Hủy lịch</span>

                  </button>

                )}



                {/* Right Action Button */}

                {isConfirmed ? (

                  <div className="flex items-center gap-2">

                    <span className="text-[11px] text-emerald-600 font-bold hidden sm:inline">

                      +15,280 Điểm RL

                    </span>

                    <button

                      type="button"

                      onClick={handleCloseDetailDrawer}

                      className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#1E1D1B] hover:bg-black text-white text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"

                    >

                      <Check size={14} className="stroke-[3]" />

                      <span>Đã xác nhận ca</span>

                    </button>

                  </div>

                ) : (

                  <button

                    type="button"

                    onClick={() => handleTriggerPaidStamp(selectedDetailItem.id)}

                    disabled={isStamping}

                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#E5A023] to-[#D49118] hover:from-[#d9951c] hover:to-[#c58412] text-white text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"

                  >

                    <Check size={14} className="stroke-[3]" />

                    <span>{role === "student" ? "Xác nhận tham gia" : "Phê duyệt ca thi"}</span>

                  </button>

                )}

              </div>

            </div>

          </div>

        );

      })()}



      {/* ─── MODAL ĐẶT LỊCH HẸN TRƯỚC GIẢNG VIÊN ─── */}

      {showBookingModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div

            onClick={handleCloseBookingModal}

            className={`fixed inset-0 bg-black/40 backdrop-blur-xs ${

              isBookingModalClosing ? "marlo-scrim-out" : "marlo-scrim"

            }`}

          />

          <div

            className={`relative w-full max-w-lg bg-white dark:bg-[#151515] rounded-[28px] border border-[#EBE8E2] dark:border-[#2C2B28] p-6 marlo-modal-shadow z-50 space-y-4 overflow-hidden ${

              isBookingModalClosing ? "marlo-modal-out" : "marlo-modal"

            }`}

          >

            <div className="flex items-center justify-between pb-3 border-b border-[#F0EDE8] dark:border-[#2C2B28]">

              <div>

                <h3 className="text-base font-bold text-[#1E1D1B] dark:text-white">

                  {role === "instructor" ? "Mở Khung Giờ Tư Vấn & Hướng Dẫn 1-1" : "Đặt lịch hẹn trước với Giảng viên 1-on-1"}

                </h3>

                <p className="text-xs text-[#7A7873] dark:text-[#A3A099] mt-0.5">

                  {role === "instructor" ? "Mở thêm slot tiếp sinh viên giải đáp kiến trúc, debug và nghiệm thu Sprint" : "Hỏi bài, giải đáp code hoặc review đồ án môn học"}

                </p>

              </div>

              <button

                onClick={handleCloseBookingModal}

                className="p-1 text-[#9E9B94] hover:text-[#1E1D1B] rounded-lg transition"

              >

                <X size={18} />

              </button>

            </div>



            <div className="space-y-3 text-xs">

              <div>

                <label className="font-bold text-[#1E1D1B] block mb-1">Chọn Giảng viên cố vấn:</label>

                <select

                  value={selectedInstructor}

                  onChange={(e) => setSelectedInstructor(e.target.value)}

                  className="w-full p-2.5 bg-[#FAF9F6] border border-[#EBE8E2] rounded-xl text-xs font-semibold text-[#1E1D1B] focus:outline-none focus:ring-2 focus:ring-[#E5A023]/30"

                >

                  <option value="Thầy Nguyễn Phước">Thầy Nguyễn Phước (OOP, C++, Memory Management)</option>

                  <option value="Thầy Trần Minh Quân">Thầy Trần Minh Quân (Graph, DSU, AI & RAG)</option>

                  <option value="Cô Trần Thị B">Cô Trần Thị B (Database 3NF, RESTful API)</option>

                </select>

              </div>



              <div>

                <label className="font-bold text-[#1E1D1B] block mb-1">Khung giờ hẹn mong muốn:</label>

                <input

                  type="text"

                  value={bookingTime}

                  onChange={(e) => setBookingTime(e.target.value)}

                  className="w-full p-2.5 bg-[#FAF9F6] border border-[#EBE8E2] rounded-xl text-xs font-mono text-[#1E1D1B] focus:outline-none focus:ring-2 focus:ring-[#E5A023]/30"

                />

              </div>



              <div>

                <label className="font-bold text-[#1E1D1B] block mb-1">Nội dung / Chủ đề cần hỏi:</label>

                <textarea

                  rows={3}

                  placeholder="Ví dụ: Thưa thầy, em muốn hỏi về cơ chế giải phóng bộ nhớ của con trỏ ảo vtable trong bài tập lớn..."

                  value={bookingTopic}

                  onChange={(e) => setBookingTopic(e.target.value)}

                  className="w-full p-2.5 bg-[#FAF9F6] border border-[#EBE8E2] rounded-xl text-xs text-[#1E1D1B] focus:outline-none focus:ring-2 focus:ring-[#E5A023]/30 resize-none leading-relaxed"

                />

              </div>

            </div>



            <div className="pt-3 border-t border-[#F0EDE8] flex justify-end gap-2">

              <button

                onClick={handleCloseBookingModal}

                className="px-4 py-2 bg-white hover:bg-[#F4F2ED] border border-[#EBE8E2] text-[#4A4843] rounded-xl text-xs font-semibold transition"

              >

                Hủy bỏ

              </button>

              <button

                onClick={handleConfirmNewAppointment}

                className="px-5 py-2 bg-[#E5A023] hover:bg-[#D49118] text-white rounded-xl text-xs font-bold transition shadow-xs"

              >

                {role === "instructor" ? "Mở Khung Giờ Hướng Dẫn" : "Gửi yêu cầu hẹn"}

              </button>

            </div>

          </div>

        </div>

      )}



            {/* ─── MARLO SLIDE-OVER INSPECTOR DRAWER (Exact Replica of calendar.jsx) ─── */}

      <MarloSessionDrawer

        booking={selectedBooking}

        isOpen={!!selectedBooking}

        onClose={() => setSelectedBooking(null)}

        onToggleDone={(id) => {

          showToast(selectedBooking?.done ? "Marked not done." : "Marked done.");

          setSelectedBooking((prev) => (prev ? { ...prev, done: !prev.done } : null));

        }}

        onCancelBooking={(id) => {

          showToast("Booking cancelled.");

          setSelectedBooking(null);

        }}

      />



      {/* ─── FLOATING TOAST WITH UNDO (PORTAL TO DOCUMENT.BODY) ─── */}

      {toastMessage && (

        <MarloToast

          message={toastMessage}

          onUndo={undoAction ? () => { undoAction(); setToastMessage(null); } : undefined}

          showUndo={!!undoAction}

        />

      )}

    
      {/* ─── MODAL BOOK PHÒNG HỘI ĐỒNG & PHÒNG THI (MARLO APP 1:1) ─── */}
      <MarloBookRoomModal
        isOpen={isBookRoomModalOpen}
        onClose={() => setIsBookRoomModalOpen(false)}
        onBookSession={handleBookNewRoomSession}
        existingSessions={roomSessions}
        initialValues={bookRoomInitialValues}
      />
    </div>

  );

}

