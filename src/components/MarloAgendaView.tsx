import React from "react";
import {
  Eye,
  Droplets,
  Sliders,
  Film,
  Phone,
  Upload,
  Plus,
} from "lucide-react";

export type BookingKind = "review" | "grade" | "mix" | "edit" | "call" | "delivery";

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
  review: {
    label: "Client review",
    icon: ({ size = 15, className }) => <Eye size={size} className={className} strokeWidth={2.2} />,
  },
  grade: {
    label: "Grade",
    icon: ({ size = 15, className }) => <Droplets size={size} className={className} strokeWidth={2.2} />,
  },
  mix: {
    label: "Mix",
    icon: ({ size = 15, className }) => <Sliders size={size} className={className} strokeWidth={2.2} />,
  },
  edit: {
    label: "Edit session",
    icon: ({ size = 15, className }) => <Film size={size} className={className} strokeWidth={2.2} />,
  },
  call: {
    label: "Call",
    icon: ({ size = 15, className }) => <Phone size={size} className={className} strokeWidth={2.2} />,
  },
  delivery: {
    label: "Delivery",
    icon: ({ size = 15, className }) => <Upload size={size} className={className} strokeWidth={2.2} />,
  },
};

// Members with authentic Marlo avatar hues
export const MARLO_MEMBERS: Record<string, AgendaMember> = {
  dw: { id: "dw", initials: "DW", name: "Dara Whitfield", bg: "#FCD34D", textColor: "#78350F" },
  ab: { id: "ab", initials: "AB", name: "Alex Bright", bg: "#E2E8F0", textColor: "#334155" },
  ka: { id: "ka", initials: "KA", name: "Kester Ainsley", bg: "#CBD5E1", textColor: "#1E293B" },
  th: { id: "th", initials: "TH", name: "Tariq Hameed", bg: "#FED7AA", textColor: "#7C2D12" },
  im: { id: "im", initials: "IM", name: "Iona Macleod", bg: "#FBCFE8", textColor: "#831843" },
  yt: { id: "yt", initials: "YT", name: "Yuki Tanaka", bg: "#FDE68A", textColor: "#78350F" },
  lh: { id: "lh", initials: "LH", name: "Lewis Hunter", bg: "#FEF08A", textColor: "#713F12" },
  rn: { id: "rn", initials: "RN", name: "Rory Nairn", bg: "#BAE6FD", textColor: "#0369A1" },
};

// Exact 7-day bookings from Marlo's screenshot (media_1794693473670_3f753964.png)
export const INITIAL_AGENDA_DAYS: AgendaDay[] = [
  {
    id: "yesterday",
    label: "Yesterday",
    bookings: [
      {
        id: "b1",
        time: "9:30",
        duration: "20 min",
        kind: "call",
        title: "Team stand-up",
        sub: "Call · Suite B",
        who: [MARLO_MEMBERS.dw, MARLO_MEMBERS.ab, MARLO_MEMBERS.ka],
      },
      {
        id: "b2",
        time: "13:00",
        duration: "2 h",
        kind: "grade",
        title: "Long Field look session",
        sub: "Grade · Grade room · Screen Scotland",
        who: [MARLO_MEMBERS.im, MARLO_MEMBERS.th],
      },
    ],
  },
  {
    id: "today",
    label: "Today",
    isToday: true,
    canBook: true,
    bookings: [
      {
        id: "b3",
        time: "10:30",
        duration: "45 min",
        kind: "review",
        title: "Kestrel cut-down review",
        sub: "Client review · Online · Kestrel Outdoor",
        who: [MARLO_MEMBERS.ab, MARLO_MEMBERS.ka, MARLO_MEMBERS.dw],
      },
      {
        id: "b4",
        time: "11:30",
        duration: "1.5 h",
        kind: "edit",
        title: "Saltmarsh online check",
        sub: "Edit session · Suite A · Northlight TV",
        who: [MARLO_MEMBERS.ka, MARLO_MEMBERS.th],
      },
      {
        id: "b5",
        time: "14:00",
        duration: "3 h",
        kind: "mix",
        title: "Mossgiel narration mix",
        sub: "Mix · Mix room · Mossgiel Distillery",
        who: [MARLO_MEMBERS.yt, MARLO_MEMBERS.dw],
      },
      {
        id: "b6",
        time: "16:30",
        duration: "30 min",
        kind: "call",
        title: "Brightwell weekly call",
        sub: "Call · Online · Brightwell Bank",
        who: [MARLO_MEMBERS.ab, MARLO_MEMBERS.dw],
      },
    ],
  },
  {
    id: "tomorrow",
    label: "Tomorrow",
    canBook: true,
    bookings: [
      {
        id: "b7",
        time: "9:30",
        duration: "4 h",
        kind: "grade",
        title: "Harbour Lights reel 3 grade",
        sub: "Grade · Grade room · Tidewater Films",
        who: [MARLO_MEMBERS.im],
      },
      {
        id: "b8",
        time: "10:00",
        duration: "3 h",
        kind: "edit",
        title: "Long Field conform",
        sub: "Edit session · Suite B · Screen Scotland",
        who: [MARLO_MEMBERS.th],
      },
      {
        id: "b9",
        time: "15:00",
        duration: "1 h",
        kind: "call",
        title: "Ferro kick-off",
        sub: "Call · Online · Ferro Cycles",
        who: [MARLO_MEMBERS.lh, MARLO_MEMBERS.rn, MARLO_MEMBERS.yt],
      },
    ],
  },
  {
    id: "thu",
    label: "Thu 12 Nov",
    canBook: true,
    bookings: [
      {
        id: "b10",
        time: "10:00",
        duration: "4 h",
        kind: "mix",
        title: "Saltmarsh pre-mix",
        sub: "Mix · Mix room · Northlight TV",
        who: [MARLO_MEMBERS.yt],
      },
      {
        id: "b11",
        time: "12:00",
        duration: "30 min",
        kind: "delivery",
        title: "Kestrel final delivery",
        sub: "Delivery · Online · Kestrel Outdoor",
        who: [MARLO_MEMBERS.ab],
      },
      {
        id: "b12",
        time: "14:30",
        duration: "1 h",
        kind: "review",
        title: "Brightwell VFX review",
        sub: "Client review · Suite A · Brightwell Bank",
        who: [MARLO_MEMBERS.rn, MARLO_MEMBERS.ab, MARLO_MEMBERS.ka],
      },
    ],
  },
  {
    id: "fri",
    label: "Fri 13 Nov",
    canBook: true,
    bookings: [
      {
        id: "b13",
        time: "9:00",
        duration: "5 h",
        kind: "edit",
        title: "Harbour Lights picture lock",
        sub: "Edit session · Suite A · Tidewater Films",
        who: [MARLO_MEMBERS.ka, MARLO_MEMBERS.th],
      },
      {
        id: "b14",
        time: "9:30",
        duration: "20 min",
        kind: "call",
        title: "Team stand-up",
        sub: "Call · Suite B",
        who: [MARLO_MEMBERS.dw, MARLO_MEMBERS.ab, MARLO_MEMBERS.ka],
      },
      {
        id: "b15",
        time: "11:00",
        duration: "1 h",
        kind: "review",
        title: "Mossgiel client screening",
        sub: "Client review · Grade room · Mossgiel Distillery",
        who: [MARLO_MEMBERS.dw, MARLO_MEMBERS.th, MARLO_MEMBERS.im],
      },
    ],
  },
  {
    id: "sat",
    label: "Sat 14 Nov",
    canBook: true,
    bookings: [],
  },
  {
    id: "sun",
    label: "Sun 15 Nov",
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
      {/* ─── EXACT MARLO AGENDA GRID (calendar.jsx line 256) ─── */}
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
                      ? `${day.bookings.length} booking${day.bookings.length > 1 ? "s" : ""}`
                      : "Nothing booked"}
                  </p>
                </div>

                {day.canBook && (
                  <button
                    type="button"
                    className="ibtn ibtn--sm"
                    aria-label={`Book on ${day.label}`}
                    onClick={() => onAddBooking?.(day.id)}
                    title={`Book on ${day.label}`}
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {/* Booking Rows */}
              {hasBookings ? (
                day.bookings.map((b) => {
                  const meta = KIND_META[b.kind] || KIND_META.call;
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
                  Nothing booked
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
