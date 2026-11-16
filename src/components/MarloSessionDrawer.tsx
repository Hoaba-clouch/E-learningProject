import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { X, Trash2, Check } from "lucide-react";
import { AgendaBooking, KIND_META } from "./MarloAgendaView";

interface MarloSessionDrawerProps {
  booking: AgendaBooking | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleDone?: (id: string) => void;
  onCancelBooking?: (id: string) => void;
}

export default function MarloSessionDrawer({
  booking,
  isOpen,
  onClose,
  onToggleDone,
  onCancelBooking,
}: MarloSessionDrawerProps) {
  const scrimRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen || !drawerRef.current || !scrimRef.current) return;

    // Slide in from right with expo.out
    gsap.fromTo(
      drawerRef.current,
      { x: "100%" },
      { x: "0%", duration: 0.35, ease: "expo.out" }
    );
    gsap.fromTo(
      scrimRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: "power2.out" }
    );

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const handleClose = () => {
    if (!drawerRef.current || !scrimRef.current) {
      onClose();
      return;
    }
    gsap.to(drawerRef.current, {
      x: "100%",
      duration: 0.25,
      ease: "power2.in",
      onComplete: onClose,
    });
    gsap.to(scrimRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
    });
  };

  if (!isOpen || !booking) return null;

  const meta = KIND_META[booking.kind] || KIND_META.call;
  const IconComponent = meta.icon;

  return (
    <div className="fixed inset-0 z-60 pointer-events-auto select-none">
      {/* Backdrop Scrim */}
      <div
        ref={scrimRef}
        onClick={handleClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        ref={drawerRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={booking.title}
      >
        {/* Header */}
        <div className="drawer__head">
          <div className="drawer__head-text">
            <h2>{booking.title}</h2>
            <p>
              {meta.label} · Mon 9 Nov
            </p>
          </div>
          <button
            type="button"
            className="drawer__close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2.3} />
          </button>
        </div>

        {/* Body (sdraw) */}
        <div className="drawer__body sdraw">
          {/* Hero Block */}
          <div className={`sdraw__hero k--${booking.kind}`}>
            <IconComponent size={24} />
            <div className="sdraw__hero-text">
              <b>{booking.time} – {booking.time.startsWith("9:") ? "9:50" : booking.time.startsWith("10:") ? "11:15" : booking.time.startsWith("11:") ? "13:00" : booking.time.startsWith("13:") ? "15:00" : booking.time.startsWith("14:") ? "17:00" : "17:00"}</b>
              <small>
                {booking.duration} · {booking.room || "Suite B"}
              </small>
            </div>
          </div>

          {/* Details DL List */}
          <dl className="dl-marlo">
            <dt>Project</dt>
            <dd>
              <span className="text-[#1E1D1B] dark:text-white font-semibold">
                Studio
              </span>
            </dd>

            <dt>Room</dt>
            <dd>
              <span className="px-3 py-1 bg-[#F3F1EC] dark:bg-[#2A2B30] rounded-lg text-xs font-semibold text-[#1E1D1B] dark:text-white border border-[#E5E2DA] dark:border-white/10">
                {booking.room || "Suite B"}
              </span>
            </dd>

            <dt>Status</dt>
            <dd>
              <span className={booking.done ? "text-[#10B981] font-bold" : "text-[#1E1D1B] dark:text-white font-semibold"}>
                {booking.done ? "Done" : "Not done"}
              </span>
            </dd>
          </dl>

          {/* Who's in */}
          <h3 className="sdraw-section-label">WHO’S IN</h3>
          <div className="sdraw__who">
            {booking.who.map((m, idx) => (
              <div className="cell" key={idx}>
                <span
                  style={{ backgroundColor: m.bg, color: m.textColor }}
                  className="av av--sm"
                >
                  {m.initials}
                </span>
                <span>{m.name}</span>
              </div>
            ))}
          </div>

          {/* Foot Actions */}
          <div className="sdraw-foot">
            <button
              type="button"
              onClick={() => {
                onCancelBooking?.(booking.id);
                handleClose();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Cancel booking</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleDone?.(booking.id)}
              className="btn-marlo-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold cursor-pointer"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>{booking.done ? "Not done" : "Mark done"}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
