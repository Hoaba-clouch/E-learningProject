import React from "react";
import {
  Award,
  GraduationCap,
  MessageSquare,
  Sliders,
  Eye,
  Plus,
  Lock,
} from "lucide-react";
import type { AcademicScheduleItem } from "../api";

export const MARLO_ROOMS_VI = [
  "Phòng Khảo thí & Hội đồng 402",
  "Phòng Lab AI & Sandbox 301",
  "Phòng Cố vấn Mentor Studio P302",
  "Phòng Hội đồng Bảo vệ P101",
  "Lab A3-201",
  "Văn phòng Bộ môn B2-204",
  "Google Meet Trực Tuyến",
] as const;

export type BookingKind = "exam" | "defense" | "mentor_1on1" | "lab_test" | "review";

export const SCHEDULE_CATEGORY_META: Record<
  string,
  {
    label: string;
    kind: BookingKind;
    badgeCls: string;
  }
> = {
  exam: {
    label: "Ca thi định kỳ",
    kind: "exam",
    badgeCls: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  defense: {
    label: "Hội đồng bảo vệ",
    kind: "defense",
    badgeCls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  office_hours: {
    label: "Cố vấn 1-1",
    kind: "mentor_1on1",
    badgeCls: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
  review: {
    label: "Review đồ án",
    kind: "review",
    badgeCls: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  lab: {
    label: "Thực hành Lab",
    kind: "lab_test",
    badgeCls: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
};

const VI_WEEKDAYS = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

export function formatScheduleHour(hour: number): string {
  const total = Math.max(0, Math.round(hour * 60));
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function timeInputToHour(timeStr: string): number {
  const [hStr, mStr] = (timeStr || "09:00").split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h)) return 9;
  return h + (Number.isNaN(m) ? 0 : m) / 60;
}

export function formatScheduleDuration(startHour: number, endHour: number): string {
  const mins = Math.max(0, Math.round((endHour - startHour) * 60));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} phút`;
  if (m === 0) return `${h} giờ`;
  return `${h}g ${m}p`;
}

export function getLocalTodayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function parseLocalDate(dateStr: string): Date {
  const parts = (dateStr || "").split("-").map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDaysToDateStr(dateStr: string, offsetDays: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function formatVietnameseDate(dateStr: string, withRelativeTag = true): string {
  const d = parseLocalDate(dateStr);
  const wd = VI_WEEKDAYS[d.getDay()] || "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const base = `${wd}, ${dd}/${mm}/${yyyy}`;
  if (!withRelativeTag) return base;
  const today = getLocalTodayDateStr();
  if (dateStr === today) return `Hôm nay · ${base}`;
  if (dateStr === addDaysToDateStr(today, 1)) return `Ngày mai · ${base}`;
  if (dateStr === addDaysToDateStr(today, -1)) return `Hôm qua · ${base}`;
  return base;
}

export function formatShortDateLabel(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const wd = VI_WEEKDAYS[d.getDay()] || "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const today = getLocalTodayDateStr();
  if (dateStr === today) return `Hôm nay · ${wd} (${dd}/${mm})`;
  if (dateStr === addDaysToDateStr(today, 1)) return `Ngày mai · ${wd} (${dd}/${mm})`;
  if (dateStr === addDaysToDateStr(today, -1)) return `Hôm qua · ${wd} (${dd}/${mm})`;
  return `${wd} (${dd}/${mm})`;
}

export function isOnlineRoomLocation(room: string): boolean {
  return /(meet|zoom|teams|trực tuyến|online)/i.test(room || "");
}

export function findScheduleRoomConflict(
  schedules: AcademicScheduleItem[],
  room: string,
  dateStr: string,
  startHour: number,
  endHour: number,
  excludeId?: string
): AcademicScheduleItem | null {
  const normalized = (room || "").trim().toLowerCase();
  if (!normalized || isOnlineRoomLocation(normalized)) return null;
  return (
    schedules.find(
      (s) =>
        s.id !== excludeId &&
        s.status !== "cancelled" &&
        s.schedule_date === dateStr &&
        (s.room_or_link || "").trim().toLowerCase() === normalized &&
        s.start_hour < endHour &&
        s.end_hour > startHour
    ) || null
  );
}

export function getNameInitials(name: string): string {
  const clean = (name || "")
    .replace(/^(Thầy|Cô|TS\.|PGS\.|GS\.)\s+/i, "")
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[words.length - 2][0] + words[words.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || "GV";
}

export interface AgendaMember {
  id: string;
  initials: string;
  name: string;
  bg: string;
  textColor: string;
}

export interface AgendaBooking {
  id: string;
  time: string;
  endTime?: string;
  duration: string;
  dateLabel?: string;
  kind: BookingKind;
  colorToken?: "grade" | "delivery" | "edit" | "mix" | "review";
  title: string;
  sub: string;
  who: AgendaMember[];
  room?: string;
  done?: boolean;
  capacityText?: string;
  isLocked?: boolean;
  bookingStatus?: string;
  schedule?: AcademicScheduleItem;
}

export interface AgendaDay {
  id: string;
  label: string;
  dateStr?: string;
  isToday?: boolean;
  canBook?: boolean;
  bookings: AgendaBooking[];
}

export const KIND_META: Record<
  BookingKind,
  {
    label: string;
    colorToken: "grade" | "delivery" | "edit" | "mix" | "review";
    icon: React.FC<{ size?: number; className?: string }>;
  }
> = {
  exam: {
    label: "Ca thi Năng lực / Giữa kỳ",
    colorToken: "grade",
    icon: ({ size = 15, className }) => <Award size={size} className={className} strokeWidth={2.2} />,
  },
  defense: {
    label: "Hội đồng Bảo vệ Đồ án",
    colorToken: "delivery",
    icon: ({ size = 15, className }) => <GraduationCap size={size} className={className} strokeWidth={2.2} />,
  },
  mentor_1on1: {
    label: "Tư vấn 1-on-1 Giảng viên",
    colorToken: "edit",
    icon: ({ size = 15, className }) => <MessageSquare size={size} className={className} strokeWidth={2.2} />,
  },
  lab_test: {
    label: "Thực hành Sandbox Lab",
    colorToken: "mix",
    icon: ({ size = 15, className }) => <Sliders size={size} className={className} strokeWidth={2.2} />,
  },
  review: {
    label: "Review Tiến độ Đồ án",
    colorToken: "review",
    icon: ({ size = 15, className }) => <Eye size={size} className={className} strokeWidth={2.2} />,
  },
};

export const ACADEMIC_MEMBERS: Record<string, AgendaMember> = {
  tb: { id: "tb", initials: "TB", name: "Cô Trần Thị B", bg: "#FCD34D", textColor: "#78350F" },
  np: { id: "np", initials: "NP", name: "Thầy Nguyễn Phước", bg: "#C7D2FE", textColor: "#312E81" },
  mq: { id: "mq", initials: "MQ", name: "Thầy Trần Minh Quân", bg: "#FED7AA", textColor: "#7C2D12" },
  lhm: { id: "lhm", initials: "LM", name: "TS. Lê Hoàng Mai", bg: "#FBCFE8", textColor: "#831843" },
  bhoa: { id: "bhoa", initials: "BH", name: "Nguyễn Bá Hòa", bg: "#A7F3D0", textColor: "#064E3B" },
  vhuy: { id: "vhuy", initials: "VH", name: "Võ Nhật Huy", bg: "#FEF08A", textColor: "#713F12" },
  admin: { id: "admin", initials: "AD", name: "Phòng Khảo thí & Học vụ", bg: "#E2E8F0", textColor: "#334155" },
};

interface MarloAgendaViewProps {
  days?: AgendaDay[];
  role?: "student" | "instructor" | "admin";
  onSelectBooking?: (booking: AgendaBooking) => void;
  onAddBooking?: (dayId: string, dateStr?: string) => void;
}

function getBookingStatusBadge(status?: string): { text: string; cls: string } | null {
  switch (status) {
    case "pending":
      return {
        text: "Chờ duyệt",
        cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
      };
    case "confirmed":
      return {
        text: "Đã xác nhận",
        cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
      };
    case "rejected":
      return {
        text: "Từ chối",
        cls: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
      };
    case "completed":
      return {
        text: "Hoàn thành",
        cls: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
      };
    default:
      return null;
  }
}

export default function MarloAgendaView({
  days = [],
  role = "student",
  onSelectBooking,
  onAddBooking,
}: MarloAgendaViewProps) {
  const isStaff = role === "instructor" || role === "admin";

  return (
    <div className="w-full">
      <div className="agenda">
        {days.map((day) => {
          const isToday = day.isToday;
          const hasBookings = day.bookings.length > 0;

          return (
            <section
              key={day.id}
              className={`card agenda__day${isToday ? " is-today" : ""}`}
            >
              <div className="chead">
                <div className="chead__text">
                  <h2>{day.label}</h2>
                  <p>
                    {hasBookings
                      ? `${day.bookings.length} ca lịch học vụ`
                      : "Trống lịch học vụ"}
                  </p>
                </div>

                {day.canBook && onAddBooking && (
                  <button
                    type="button"
                    className="ibtn ibtn--sm cursor-pointer"
                    aria-label={isStaff ? `Mở ca lịch vào ${day.label}` : `Đặt lịch hẹn vào ${day.label}`}
                    onClick={() => onAddBooking(day.id, day.dateStr)}
                    title={isStaff ? `Mở ca lịch mới vào ${day.label}` : `Đặt lịch hẹn cố vấn vào ${day.label}`}
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {hasBookings ? (
                day.bookings.map((b) => {
                  const meta = KIND_META[b.kind] || KIND_META.mentor_1on1;
                  const IconComponent = meta.icon;
                  const colorToken = b.colorToken || meta.colorToken;
                  const statusBadge = getBookingStatusBadge(b.bookingStatus);

                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`agenda__row cursor-pointer${b.done ? " is-done" : ""}`}
                      onClick={() => onSelectBooking?.(b)}
                    >
                      <span className="agenda__time shrink-0">
                        <b>{b.time}</b>
                        <small>{b.duration}</small>
                      </span>

                      <span className={`agenda__ico k--${colorToken}`}>
                        <IconComponent size={15} />
                      </span>

                      <span className="cell__text min-w-0">
                        <b className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{b.title}</span>
                          {b.isLocked && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[9.5px] font-bold shrink-0">
                              <Lock size={9} />
                              <span>Khóa</span>
                            </span>
                          )}
                          {statusBadge && (
                            <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold shrink-0 ${statusBadge.cls}`}>
                              {statusBadge.text}
                            </span>
                          )}
                        </b>
                        <small className="block truncate">{b.sub}</small>
                        {b.capacityText && (
                          <small className="block font-mono text-[10px] opacity-80">
                            Sĩ số: {b.capacityText}
                          </small>
                        )}
                      </span>

                      <span className="avstack shrink-0">
                        {b.who.slice(0, 3).map((m, idx) => (
                          <span
                            key={idx}
                            title={m.name}
                            style={{ backgroundColor: m.bg, color: m.textColor }}
                            className="av av--sm"
                          >
                            {m.initials}
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-[#62656b] dark:text-[#a0a3a9] italic">
                  Không có ca thi hoặc lịch hẹn nào trong ngày này
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
