import { useEffect, useRef } from "react";

interface HuddleShapesProps {
  isPasswordFocused: boolean;
  isPasswordShowing: boolean;
  activeRole?: string;
  className?: string;
}

export default function HuddleShapes({
  isPasswordFocused,
  isPasswordShowing,
  activeRole,
  className = "",
}: HuddleShapesProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const pupilsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Track cursor movement across window
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // If user is focused on password, don't follow mouse (follow shy behavior instead)
      if (isPasswordFocused) return;

      pupilsRef.current.forEach((pupil) => {
        if (!pupil) return;
        const rect = pupil.getBoundingClientRect();
        const px = rect.left + rect.width / 2;
        const py = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - py, e.clientX - px);
        // Max radius 4.5px
        const dist = Math.min(4.5, Math.hypot(e.clientX - px, e.clientY - py) / 35);
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        pupil.style.transform = `translate(${x}px, ${y}px)`;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isPasswordFocused]);

  // Determine state classes
  const isLookingAway = isPasswordFocused && !isPasswordShowing;
  const isTurnedBack = isPasswordShowing;

  return (
    <div
      ref={groupRef}
      className={`huddle-characters select-none relative flex items-end justify-center gap-3.5 transition-all duration-300 ${
        isTurnedBack ? "turned-back" : isLookingAway ? "looking-away" : ""
      } ${className}`}
    >
      {/* SHAPE 1: CIRCLE (Cam tươi - Vui vẻ) */}
      <div
        className="shape shape-circle relative flex items-center justify-center shrink-0 w-[66px] h-[66px] bg-[#f97316] rounded-full shadow-[0_8px_20px_rgba(249,115,22,0.35)] transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105"
        style={{
          transform: isTurnedBack
            ? "scaleY(0.9) rotate(-10deg)"
            : isLookingAway
            ? "translateY(-6px)"
            : "translateY(0)",
          filter: isTurnedBack ? "brightness(0.88)" : "none",
        }}
      >
        {/* Subtle highlight sheen */}
        <div className="absolute top-2 left-3 w-3 h-2 bg-white/35 rounded-full rotate-[-25deg] pointer-events-none" />

        {/* EYES */}
        <div
          className="eyes absolute top-[20px] flex gap-2 transition-all duration-300"
          style={{ opacity: isTurnedBack ? 0 : 1 }}
        >
          <div className="eye w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-xs overflow-hidden">
            <div
              ref={(el) => { pupilsRef.current[0] = el; }}
              className="pupil w-[7px] h-[7px] bg-[#0f172a] rounded-full transition-transform duration-100 ease-out"
              style={{
                transform: isLookingAway ? "translate(0px, -6px)" : undefined,
              }}
            />
          </div>
          <div className="eye w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-xs overflow-hidden">
            <div
              ref={(el) => { pupilsRef.current[1] = el; }}
              className="pupil w-[7px] h-[7px] bg-[#0f172a] rounded-full transition-transform duration-100 ease-out"
              style={{
                transform: isLookingAway ? "translate(0px, -6px)" : undefined,
              }}
            />
          </div>
        </div>

        {/* Tiny cute smile if not looking away */}
        {!isTurnedBack && !isLookingAway && (
          <div className="absolute bottom-3.5 w-2.5 h-1 border-b-2 border-white/80 rounded-full" />
        )}
      </div>

      {/* SHAPE 2: PILL / RECTANGLE (Xanh Indigo - Thân thiện, Cao nhất) */}
      <div
        className="shape shape-pill relative flex items-center justify-center shrink-0 w-[78px] h-[92px] bg-[#6366f1] rounded-t-[38px] rounded-b-[14px] shadow-[0_10px_25px_rgba(99,102,241,0.38)] transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105"
        style={{
          transform: isTurnedBack
            ? "scaleY(0.92) rotate(6deg)"
            : isLookingAway
            ? "translateY(-8px)"
            : "translateY(0)",
          filter: isTurnedBack ? "brightness(0.85)" : "none",
        }}
      >
        {/* Subtle highlight sheen */}
        <div className="absolute top-2.5 left-4 w-3.5 h-2 bg-white/30 rounded-full rotate-[-15deg] pointer-events-none" />

        {/* EYES */}
        <div
          className="eyes absolute top-[28px] flex gap-2.5 transition-all duration-300"
          style={{ opacity: isTurnedBack ? 0 : 1 }}
        >
          <div className="eye w-[17px] h-[17px] bg-white rounded-full flex items-center justify-center shadow-xs overflow-hidden">
            <div
              ref={(el) => { pupilsRef.current[2] = el; }}
              className="pupil w-[7.5px] h-[7.5px] bg-[#0f172a] rounded-full transition-transform duration-100 ease-out"
              style={{
                transform: isLookingAway ? "translate(0px, -6px)" : undefined,
              }}
            />
          </div>
          <div className="eye w-[17px] h-[17px] bg-white rounded-full flex items-center justify-center shadow-xs overflow-hidden">
            <div
              ref={(el) => { pupilsRef.current[3] = el; }}
              className="pupil w-[7.5px] h-[7.5px] bg-[#0f172a] rounded-full transition-transform duration-100 ease-out"
              style={{
                transform: isLookingAway ? "translate(0px, -6px)" : undefined,
              }}
            />
          </div>
        </div>

        {/* Role badge icon indicator on belly */}
        {!isTurnedBack && (
          <div className="absolute bottom-3 px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold text-white tracking-wider uppercase backdrop-blur-xs select-none">
            {activeRole === "admin" ? "ADMIN" : activeRole === "instructor" ? "TEACH" : "DEV"}
          </div>
        )}
      </div>

      {/* SHAPE 3: TRIANGLE / DOME (Xanh ngọc Emerald - Tinh nghịch) */}
      <div
        className="shape shape-triangle relative flex items-center justify-center shrink-0 w-[72px] h-[78px] bg-[#10b981] rounded-t-[28px] rounded-b-[12px] shadow-[0_8px_20px_rgba(16,185,129,0.32)] transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105"
        style={{
          transform: isTurnedBack
            ? "scaleY(0.9) rotate(12deg)"
            : isLookingAway
            ? "translateY(-5px)"
            : "translateY(0)",
          filter: isTurnedBack ? "brightness(0.85)" : "none",
        }}
      >
        {/* Subtle highlight sheen */}
        <div className="absolute top-2 right-4 w-3 h-2 bg-white/35 rounded-full rotate-[20deg] pointer-events-none" />

        {/* EYES */}
        <div
          className="eyes absolute top-[24px] flex gap-2 transition-all duration-300"
          style={{ opacity: isTurnedBack ? 0 : 1 }}
        >
          <div className="eye w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-xs overflow-hidden">
            <div
              ref={(el) => { pupilsRef.current[4] = el; }}
              className="pupil w-[7px] h-[7px] bg-[#0f172a] rounded-full transition-transform duration-100 ease-out"
              style={{
                transform: isLookingAway ? "translate(0px, -6px)" : undefined,
              }}
            />
          </div>
          <div className="eye w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-xs overflow-hidden">
            <div
              ref={(el) => { pupilsRef.current[5] = el; }}
              className="pupil w-[7px] h-[7px] bg-[#0f172a] rounded-full transition-transform duration-100 ease-out"
              style={{
                transform: isLookingAway ? "translate(0px, -6px)" : undefined,
              }}
            />
          </div>
        </div>

        {/* Little blush dots */}
        {!isTurnedBack && (
          <>
            <div className="absolute top-[32px] left-2 w-2 h-1 bg-emerald-700/30 rounded-full" />
            <div className="absolute top-[32px] right-2 w-2 h-1 bg-emerald-700/30 rounded-full" />
          </>
        )}
      </div>
    </div>
  );
}
