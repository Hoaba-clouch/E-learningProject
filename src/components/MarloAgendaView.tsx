import React from "react";
import {
  Award,
  GraduationCap,
  MessageSquare,
  Sliders,
  Eye,
  Plus,
} from "lucide-react";

export type BookingKind = "exam" | "defense" | "mentor_1on1" | "lab_test" | "review";

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
  duration: string;
  kind: BookingKind;
  title: string;
  sub: string;
  who: AgendaMember[];
  room?: string;
  done?: boolean;
}

export interface AgendaDay {
  id: string;
  label: string;
  isToday?: boolean;
  canBook?: boolean;
  bookings: AgendaBooking[];
}

export const KIND_META: Record<
  BookingKind,
  { label: string; icon: React.FC<{ size?: number; className?: string }> }
> = {
  exam: {
    label: "Ca thi Năng lực / Giữa kỳ",
    icon: ({ size = 15, className }) => <Award size={size} className={className} strokeWidth={2.2} />,
  },
  defense: {
    label: "Hội đồng Bảo vệ Đồ án",
    icon: ({ size = 15, className }) => <GraduationCap size={size} className={className} strokeWidth={2.2} />,
  },
  mentor_1on1: {
    label: "Tư vấn 1-on-1 Giảng viên",
    icon: ({ size = 15, className }) => <MessageSquare size={size} className={className} strokeWidth={2.2} />,
  },
  lab_test: {
    label: "Thực hành Sandbox Lab",
    icon: ({ size = 15, className }) => <Sliders size={size} className={className} strokeWidth={2.2} />,
  },
  review: {
    label: "Duyệt Tiến độ Đồ án",
    icon: ({ size = 15, className }) => <Eye size={size} className={className} strokeWidth={2.2} />,
  },
};

// Giảng viên & Ban cố vấn chuyên môn Khoa CNTT
export const ACADEMIC_MEMBERS: Record<string, AgendaMember> = {
  tb: { id: "tb", initials: "TB", name: "Cô Trần Thị B", bg: "#FCD34D", textColor: "#78350F" },
  np: { id: "np", initials: "NP", name: "Thầy Nguyễn Phước", bg: "#C7D2FE", textColor: "#312E81" },
  mq: { id: "mq", initials: "MQ", name: "Thầy Trần Minh Quân", bg: "#FED7AA", textColor: "#7C2D12" },
  lhm: { id: "lhm", initials: "LM", name: "TS. Lê Hoàng Mai", bg: "#FBCFE8", textColor: "#831843" },
  bhoa: { id: "bhoa", initials: "BH", name: "Nguyễn Bá Hòa (Lead)", bg: "#A7F3D0", textColor: "#064E3B" },
  vhuy: { id: "vhuy", initials: "VH", name: "Võ Nhật Huy", bg: "#FEF08A", textColor: "#713F12" },
  admin: { id: "admin", initials: "AD", name: "Phòng Khảo thí & Học vụ", bg: "#E2E8F0", textColor: "#334155" },
};

// 7-day academic schedules & 1-on-1 bookings
export const INITIAL_AGENDA_DAYS: AgendaDay[] = [
  {
    id: "yesterday",
    label: "Hôm qua",
    bookings: [
      {
        id: "b1",
        time: "08:30",
        duration: "45 phút",
        kind: "lab_test",
        title: "Test thực hành C++20 Sandbox",
        sub: "Kiểm tra tự động · Lab-402 · CS201",
        who: [ACADEMIC_MEMBERS.tb, ACADEMIC_MEMBERS.bhoa],
        room: "Lab-402",
        done: true,
      },
      {
        id: "b2",
        time: "14:00",
        duration: "2 giờ",
        kind: "review",
        title: "Sơ duyệt Kiến trúc Microservices",
        sub: "Đồ án Capstone · Phòng Hội thảo 501",
        who: [ACADEMIC_MEMBERS.np, ACADEMIC_MEMBERS.vhuy],
        room: "Phòng Hội thảo 501",
        done: true,
      },
    ],
  },
  {
    id: "today",
    label: "Hôm nay",
    isToday: true,
    canBook: true,
    bookings: [
      {
        id: "b3",
        time: "09:00",
        duration: "90 phút",
        kind: "exam",
        title: "Thi trắc nghiệm Cấu trúc Dữ liệu & Giải thuật",
        sub: "Khảo thí tập trung · Phòng Máy A2-301 · CS202",
        who: [ACADEMIC_MEMBERS.mq, ACADEMIC_MEMBERS.admin],
        room: "Phòng Máy A2-301",
      },
      {
        id: "b4",
        time: "10:45",
        duration: "1.5 giờ",
        kind: "defense",
        title: "Hội đồng Bảo vệ Sơ duyệt Đồ án Capstone",
        sub: "Phản biện Vòng 1 · Phòng 501 · PRJ-CODEMIND",
        who: [ACADEMIC_MEMBERS.tb, ACADEMIC_MEMBERS.np, ACADEMIC_MEMBERS.bhoa],
        room: "Phòng 501",
      },
      {
        id: "b5",
        time: "14:00",
        duration: "2 giờ",
        kind: "mentor_1on1",
        title: "Tư vấn 1-on-1: Tối ưu Giải thuật Đồ thị & DP",
        sub: "Cố vấn chuyên sâu · Văn phòng Bộ môn · Thầy Quân",
        who: [ACADEMIC_MEMBERS.mq, ACADEMIC_MEMBERS.vhuy],
        room: "Văn phòng Bộ môn",
      },
      {
        id: "b6",
        time: "16:30",
        duration: "45 phút",
        kind: "mentor_1on1",
        title: "Hướng dẫn Kỹ thuật: Vector DB pgvector",
        sub: "Hỏi đáp trực tuyến · Google Meet · TS. Lê Hoàng Mai",
        who: [ACADEMIC_MEMBERS.lhm, ACADEMIC_MEMBERS.bhoa],
        room: "Google Meet",
      },
    ],
  },
  {
    id: "tomorrow",
    label: "Ngày mai",
    canBook: true,
    bookings: [
      {
        id: "b7",
        time: "08:30",
        duration: "3 giờ",
        kind: "exam",
        title: "Thi thực hành Giữa kỳ C++20 Sandbox",
        sub: "Chấm điểm tự động qua Docker · Lab C-302 · CS201",
        who: [ACADEMIC_MEMBERS.tb],
        room: "Lab C-302",
      },
      {
        id: "b8",
        time: "13:30",
        duration: "2 giờ",
        kind: "review",
        title: "Kiểm tra tiến độ Sprint 3 & Dockerfile",
        sub: "Nghiệm thu Kanban · Phòng Lab AI · Thầy Phước",
        who: [ACADEMIC_MEMBERS.np],
        room: "Phòng Lab AI",
      },
      {
        id: "b9",
        time: "15:30",
        duration: "1 giờ",
        kind: "mentor_1on1",
        title: "Tư vấn 1-on-1: Xử lý Race Condition & Deadlock",
        sub: "Hỗ trợ học vụ · Văn phòng Thầy Phước",
        who: [ACADEMIC_MEMBERS.np, ACADEMIC_MEMBERS.bhoa],
        room: "Văn phòng Thầy Phước",
      },
    ],
  },
  {
    id: "thu",
    label: "Thứ Năm (20/11)",
    canBook: true,
    bookings: [
      {
        id: "b10",
        time: "09:00",
        duration: "2.5 giờ",
        kind: "lab_test",
        title: "Thực hành Lập trình Hệ thống & Socket",
        sub: "Hệ điều hành & Phân tán · Lab-504 · CS304",
        who: [ACADEMIC_MEMBERS.np],
        room: "Lab-504",
      },
      {
        id: "b11",
        time: "14:00",
        duration: "1 giờ",
        kind: "mentor_1on1",
        title: "Tư vấn Đồ án: Triển khai Kubernetes & Ingress",
        sub: "Hỗ trợ Cloud DevOps · Lab AI · Cô Lan Anh",
        who: [ACADEMIC_MEMBERS.tb],
        room: "Lab AI",
      },
    ],
  },
  {
    id: "fri",
    label: "Thứ Sáu (21/11)",
    canBook: true,
    bookings: [
      {
        id: "b12",
        time: "08:30",
        duration: "4 giờ",
        kind: "defense",
        title: "Hội đồng Bảo vệ Khóa luận Tốt nghiệp Đợt 1",
        sub: "Hội đồng Đánh giá Cấp Viện · Hội trường A",
        who: [ACADEMIC_MEMBERS.np, ACADEMIC_MEMBERS.mq, ACADEMIC_MEMBERS.tb],
        room: "Hội trường A",
      },
      {
        id: "b13",
        time: "14:30",
        duration: "90 phút",
        kind: "exam",
        title: "Kiểm tra Đánh giá Năng lực Thuật toán AI",
        sub: "Học phần CS402 · Phòng Máy A2-302",
        who: [ACADEMIC_MEMBERS.lhm],
        room: "Phòng Máy A2-302",
      },
    ],
  },
  {
    id: "sat",
    label: "Thứ Bảy (22/11)",
    canBook: true,
    bookings: [
      {
        id: "b14",
        time: "09:00",
        duration: "3 giờ",
        kind: "mentor_1on1",
        title: "Open Office Hours: Cố vấn Nghiên cứu Khoa học",
        sub: "Mở tự do cho SV các đề tài Khoa học · Phòng B-101",
        who: [ACADEMIC_MEMBERS.lhm, ACADEMIC_MEMBERS.mq],
        room: "Phòng B-101",
      },
    ],
  },
  {
    id: "sun",
    label: "Chủ Nhật (23/11)",
    canBook: true,
    bookings: [],
  },
];

interface MarloAgendaViewProps {
  days?: AgendaDay[];
  onSelectBooking?: (booking: AgendaBooking) => void;
  onAddBooking?: (dayId: string) => void;
}

export default function MarloAgendaView({
  days = INITIAL_AGENDA_DAYS,
  onSelectBooking,
  onAddBooking,
}: MarloAgendaViewProps) {
  return (
    <div className="w-full">
      {/* ─── EXACT MARLO AGENDA GRID ─── */}
      <div className="agenda">
        {days.map((day) => {
          const isToday = day.isToday;
          const hasBookings = day.bookings.length > 0;

          return (
            <section
              key={day.id}
              className={`card agenda__day${isToday ? " is-today" : ""}`}
            >
              {/* Header: Title + Subtitle + Add Button */}
              <div className="chead">
                <div className="chead__text">
                  <h2>{day.label}</h2>
                  <p>
                    {hasBookings
                      ? `${day.bookings.length} ca lịch / lịch hẹn`
                      : "Trống lịch học vụ"}
                  </p>
                </div>

                {day.canBook && (
                  <button
                    type="button"
                    className="ibtn ibtn--sm"
                    aria-label={`Đặt lịch vào ${day.label}`}
                    onClick={() => onAddBooking?.(day.id)}
                    title={`Đặt lịch hẹn vào ${day.label}`}
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {/* Booking Rows */}
              {hasBookings ? (
                day.bookings.map((b) => {
                  const meta = KIND_META[b.kind] || KIND_META.mentor_1on1;
                  const IconComponent = meta.icon;

                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`agenda__row${b.done ? " is-done" : ""}`}
                      onClick={() => onSelectBooking?.(b)}
                    >
                      {/* Time & Duration */}
                      <span className="agenda__time">
                        <b>{b.time}</b>
                        <small>{b.duration}</small>
                      </span>

                      {/* Icon */}
                      <span className={`agenda__ico k--${b.kind}`}>
                        <IconComponent size={15} />
                      </span>

                      {/* Text */}
                      <span className="cell__text">
                        <b>{b.title}</b>
                        <small>{b.sub}</small>
                      </span>

                      {/* Member Avatars */}
                      <span className="avstack">
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
                  Không có ca thi hoặc lịch hẹn nào
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
